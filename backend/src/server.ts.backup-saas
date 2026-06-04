import { attachAuthContext } from "./saas/auth-context";
import { organizationsRouter } from "./saas/organizations.routes";
import { auditsRouter } from "./saas/audits.routes";
import "dotenv/config";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import jwt from "jsonwebtoken";
import argon2 from "argon2";
import { z } from "zod";
import * as prismaPkg from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const { PrismaClient, Role } = prismaPkg;
const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });


const DEV_BYPASS_AUTH = process.env.DEV_BYPASS_AUTH === "1";

let devCached: { userId: string; orgId: string } | null = null;

async function ensureDevContext() {
  if (devCached) return devCached;

  const email = "dev@local";
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const passwordHash = await argon2.hash("devpassword123");
    user = await prisma.user.create({ data: { email, passwordHash } });
  }

  // On crée (ou récupère) une orga dev
  let org = await prisma.organization.findFirst({ where: { name: "Dev org" } });
  if (!org) {
    org = await prisma.organization.create({ data: { name: "Dev org" } });
  }

  // Membership (upsert grâce à @@unique([userId, orgId]))
  await prisma.membership.upsert({
    where: { userId_orgId: { userId: user.id, orgId: org.id } },
    update: {},
    create: { userId: user.id, orgId: org.id, role: Role.OWNER },
  });

  devCached = { userId: user.id, orgId: org.id };
  return devCached;
}




const app = Fastify({ logger: true });

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

type JwtPayload = { uid: string };

function sign(uid: string) {
  return jwt.sign({ uid } satisfies JwtPayload, JWT_SECRET, { expiresIn: "7d" });
}

async function authGuard(req: any, reply: any) {
  // DEV : bypass auth + user/org auto
  if (DEV_BYPASS_AUTH) {
    const dev = await ensureDevContext();
    req.userId = dev.userId;
    return;
  }

  // PROD : cookie obligatoire
  const token = req.cookies?.session;
  if (!token) return reply.code(401).send({ error: "UNAUTHENTICATED" });

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.userId = payload.uid;
  } catch {
    return reply.code(401).send({ error: "UNAUTHENTICATED" });
  }
}


app.register(cors, { origin: CORS_ORIGIN, credentials: true });
app.register(cookie, { secret: JWT_SECRET });

app.get("/api/health", async () => ({ ok: true }));

// AUTH
app.post("/api/auth/register", async (req, reply) => {
  const body = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    orgName: z.string().min(1).optional(),
  }).parse(req.body);

  const email = body.email.toLowerCase();

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return reply.code(409).send({ error: "EMAIL_EXISTS" });

  const passwordHash = await argon2.hash(body.password);

  const user = await prisma.user.create({ data: { email, passwordHash } });

  const org = await prisma.organization.create({
    data: { name: body.orgName?.trim() || "Mon organisation" },
  });

  await prisma.membership.create({
    data: { userId: user.id, orgId: org.id, role: Role.OWNER },
  });

  return reply
    .setCookie("session", sign(user.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })
    .send({ ok: true });
});

app.post("/api/auth/login", async (req, reply) => {
  const body = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }).parse(req.body);

  const email = body.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return reply.code(401).send({ error: "BAD_CREDENTIALS" });

  const ok = await argon2.verify(user.passwordHash, body.password);
  if (!ok) return reply.code(401).send({ error: "BAD_CREDENTIALS" });

  return reply
    .setCookie("session", sign(user.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })
    .send({ ok: true });
});

app.post("/api/auth/logout", async (_req, reply) => {
  return reply.clearCookie("session", { path: "/" }).send({ ok: true });
});

app.get("/api/me", { preHandler: authGuard }, async (req: any) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, createdAt: true },
  });
  return { user };
});

// ORGS
app.get("/api/orgs", { preHandler: authGuard }, async (req: any) => {
  const memberships = await prisma.membership.findMany({
    where: { userId: req.userId },
    include: { org: true },
    orderBy: { createdAt: "asc" },
  });

  return {
    orgs: memberships.map(m => ({ id: m.org.id, name: m.org.name, role: m.role })),
  };
});

// AUDITS
app.get("/api/orgs/:orgId/audits", { preHandler: authGuard }, async (req: any, reply) => {
  const orgId = String(req.params.orgId);

  const mem = await prisma.membership.findUnique({
    where: { userId_orgId: { userId: req.userId, orgId } },
  });
  if (!mem) return reply.code(403).send({ error: "FORBIDDEN" });

  const audits = await prisma.audit.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });

  return { audits };
});

app.post("/api/orgs/:orgId/audits", { preHandler: authGuard }, async (req: any, reply) => {
  const orgId = String(req.params.orgId);
  const body = z.object({ name: z.string().min(1) }).parse(req.body);

  const mem = await prisma.membership.findUnique({
    where: { userId_orgId: { userId: req.userId, orgId } },
  });
  if (!mem) return reply.code(403).send({ error: "FORBIDDEN" });

  const audit = await prisma.audit.create({
    data: { orgId, name: body.name.trim(), state: null },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });

  return { audit };
});

app.get("/api/audits/:auditId", { preHandler: authGuard }, async (req: any, reply) => {
  const auditId = String(req.params.auditId);

  const audit = await prisma.audit.findUnique({ where: { id: auditId } });
  if (!audit) return reply.code(404).send({ error: "NOT_FOUND" });

  const mem = await prisma.membership.findUnique({
    where: { userId_orgId: { userId: req.userId, orgId: audit.orgId } },
  });
  if (!mem) return reply.code(403).send({ error: "FORBIDDEN" });

  return { audit };
});

app.put("/api/audits/:auditId/state", { preHandler: authGuard }, async (req: any, reply) => {
  const auditId = String(req.params.auditId);
  const body = z.object({ state: z.any() }).parse(req.body);

  const audit = await prisma.audit.findUnique({ where: { id: auditId } });
  if (!audit) return reply.code(404).send({ error: "NOT_FOUND" });

  const mem = await prisma.membership.findUnique({
    where: { userId_orgId: { userId: req.userId, orgId: audit.orgId } },
  });
  if (!mem) return reply.code(403).send({ error: "FORBIDDEN" });

  await prisma.audit.update({ where: { id: auditId }, data: { state: body.state } });
  return { ok: true };
});

app.listen({ port: 3001, host: "0.0.0.0" }).catch((e) => {
  app.log.error(e);
  process.exit(1);
});

// À placer après la création de app Express

app.use(attachAuthContext);
app.use("/api", organizationsRouter);
app.use("/api", auditsRouter);

