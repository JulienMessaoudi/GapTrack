async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    credentials: "include",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  register: (email: string, password: string, orgName?: string) =>
    http("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, orgName }),
    }),

  login: (email: string, password: string) =>
    http("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () => http("/api/auth/logout", { method: "POST" }),

  me: () => http<{ user: { id: string; email: string } }>("/api/me"),

  orgs: () => http<{ orgs: { id: string; name: string; role: string }[] }>("/api/orgs"),

  listAudits: (orgId: string) =>
    http<{ audits: { id: string; name: string; createdAt: string; updatedAt: string }[] }>(
      `/api/orgs/${orgId}/audits`
    ),

  createAudit: (orgId: string, name: string) =>
    http<{ audit: { id: string; name: string; createdAt: string; updatedAt: string } }>(
      `/api/orgs/${orgId}/audits`,
      { method: "POST", body: JSON.stringify({ name }) }
    ),

  getAudit: (auditId: string) =>
    http<{ audit: { id: string; name: string; createdAt: string; updatedAt: string; state: any } }>(
      `/api/audits/${auditId}`
    ),

  saveAuditState: (auditId: string, state: any) =>
    http(`/api/audits/${auditId}/state`, {
      method: "PUT",
      body: JSON.stringify({ state }),
    }),
};
