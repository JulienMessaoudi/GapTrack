import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "./components/ui/select";
import { Badge } from "./components/ui/badge";
import { toast } from "sonner";
import {Filter, Redo2, Search, Undo2, ArrowUp, Paperclip, Download, Plus, Copy, X, Trash2, AlertTriangle, Shield, ShieldCheck, Lightbulb, Info, Loader2, CheckCircle2, AlertCircle, Pencil, BarChart3, ListChecks, ListTodo, Users, LogOut, UserPlus, History, FileCheck2, Clock3, Mail, Settings} from "lucide-react";
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip } from "recharts";
import { LoginAccessPage } from "./components/LoginAccessPage";
import { ResetPasswordPage } from "./components/ResetPasswordPage";
import { LandingHomePage } from "./components/LandingHomePage";
import { supabase } from "./lib/supabase";
import { authErrorMessage } from "./lib/authErrorMessages";
import { useInactivityLogout } from "./hooks/useInactivityLogout";


// ==================
// Types
// ==================
interface ControlItem {
  id: string;
  ref: string; // ex: "1.1"
  domain: string; // ex: "Politique de securite"
  impact: 1 | 2 | 3; // poids
  description: string; // point de controle
  realized: ControlStatus; // État du contrôle : non évalué, conforme, partiel, non conforme, non applicable
}

type ControlStatus = -2 | -1 | 0 | 0.5 | 1;
type ControlStatusKey = "not_evaluated" | "conform" | "partial" | "non_conform" | "not_applicable";
type ControlStatusFilter = "all" | ControlStatusKey;

const CONTROL_STATUS_OPTIONS: ControlStatusKey[] = [
  "not_evaluated",
  "conform",
  "partial",
  "non_conform",
  "not_applicable",
];

function normalizeControlStatus(value: any): ControlStatus | null {
  if (value === -2 || value === "-2" || value === "not_evaluated") return -2;
  if (value === 1 || value === "1" || value === true || value === "conform" || value === "done") return 1;
  if (value === 0.5 || value === "0.5" || value === "partial") return 0.5;
  if (value === 0 || value === "0" || value === false || value === "non_conform" || value === "not_done") return 0;
  if (value === -1 || value === "-1" || value === "not_applicable" || value === "na" || value === "N/A") return -1;
  return null;
}

function controlStatusKey(status: ControlStatus | any): ControlStatusKey {
  const normalized = normalizeControlStatus(status);
  if (normalized === 1) return "conform";
  if (normalized === 0.5) return "partial";
  if (normalized === 0) return "non_conform";
  if (normalized === -1) return "not_applicable";
  return "not_evaluated";
}

function controlStatusFromKey(key: ControlStatusKey | string): ControlStatus {
  if (key === "conform") return 1;
  if (key === "partial") return 0.5;
  if (key === "non_conform") return 0;
  if (key === "not_applicable") return -1;
  return -2;
}

function controlStatusLabel(status: ControlStatus | ControlStatusKey | string, lang: LangKey, short = false): string {
  const key = typeof status === "string" && CONTROL_STATUS_OPTIONS.includes(status as ControlStatusKey)
    ? status as ControlStatusKey
    : controlStatusKey(status);

  if (lang === "fr") {
    if (key === "conform") return "Conforme";
    if (key === "partial") return short ? "Partiel" : "Partiellement conforme";
    if (key === "non_conform") return "Non conforme";
    if (key === "not_applicable") return "Non applicable";
    return "Non évalué";
  }
  if (key === "conform") return "Compliant";
  if (key === "partial") return short ? "Partial" : "Partially compliant";
  if (key === "non_conform") return "Non-compliant";
  if (key === "not_applicable") return "Not applicable";
  return "Not evaluated";
}

function controlStatusClass(status: ControlStatus | ControlStatusKey | string): string {
  const key = typeof status === "string" && CONTROL_STATUS_OPTIONS.includes(status as ControlStatusKey)
    ? status as ControlStatusKey
    : controlStatusKey(status);
  if (key === "conform") return "border-emerald-500/50 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10";
  if (key === "partial") return "border-amber-500/50 text-amber-700 dark:text-amber-300 bg-amber-500/10";
  if (key === "non_conform") return "border-rose-500/50 text-rose-700 dark:text-rose-300 bg-rose-500/10";
  if (key === "not_applicable") return "border-muted-foreground/40 text-muted-foreground bg-muted/20";
  return "border-sky-500/40 text-sky-700 dark:text-sky-300 bg-sky-500/10";
}

function controlStatusScore(status: ControlStatus): number {
  if (status === 1) return 1;
  if (status === 0.5) return 0.5;
  return 0;
}

function isGapStatus(status: ControlStatus): boolean {
  return status === 0 || status === 0.5;
}

function isImplementedStatus(status: ControlStatus): boolean {
  return status === 1 || status === 0.5;
}

function isApplicableForMaturity(status: ControlStatus): boolean {
  return status !== -1 && status !== -2;
}

function isEvaluatedStatus(status: ControlStatus): boolean {
  return status !== -2;
}

interface AssessmentMetrics {
  totalControls: number;
  evaluatedControls: number;
  notEvaluatedControls: number;
  notApplicableControls: number;
  maturityControls: number;
  evaluationPercent: number;
  maturityPoints: number;
  maturityMax: number;
  maturityPercent: number;
}

function calculateAssessmentMetrics(rows: ControlItem[]): AssessmentMetrics {
  const totalControls = rows.length;
  const evaluatedControls = rows.filter((row) => isEvaluatedStatus(row.realized)).length;
  const notEvaluatedControls = rows.filter((row) => row.realized === -2).length;
  const notApplicableControls = rows.filter((row) => row.realized === -1).length;
  const maturityRows = rows.filter((row) => isApplicableForMaturity(row.realized));
  const maturityPoints = maturityRows.reduce(
    (total, row) => total + row.impact * controlStatusScore(row.realized),
    0
  );
  const maturityMax = maturityRows.reduce((total, row) => total + row.impact, 0);

  return {
    totalControls,
    evaluatedControls,
    notEvaluatedControls,
    notApplicableControls,
    maturityControls: maturityRows.length,
    evaluationPercent: totalControls ? Math.round((evaluatedControls / totalControls) * 100) : 0,
    maturityPoints,
    maturityMax,
    maturityPercent: maturityMax ? Number(((maturityPoints / maturityMax) * 100).toFixed(2)) : 0,
  };
}

function assessmentCoverageNotice(metrics: AssessmentMetrics, lang: "fr" | "en"): string {
  if (metrics.maturityControls === 0) {
    return lang === "fr"
      ? "Maturité non calculable : aucun contrôle évalué et applicable."
      : "Maturity cannot be calculated: no assessed and applicable control.";
  }
  if (metrics.evaluationPercent < 100) {
    return lang === "fr"
      ? `Score provisoire calculé sur ${metrics.maturityControls} contrôle(s) évalué(s) et applicable(s) ; couverture de l’audit : ${metrics.evaluationPercent}%.`
      : `Provisional score based on ${metrics.maturityControls} assessed and applicable control(s); audit coverage: ${metrics.evaluationPercent}%.`;
  }
  return lang === "fr"
    ? `Score calculé sur les ${metrics.maturityControls} contrôle(s) évalué(s) et applicable(s).`
    : `Score based on all ${metrics.maturityControls} assessed and applicable control(s).`;
}

type AuditCriticality = "low" | "medium" | "high";
type AuditType = "initial" | "follow_up" | "internal" | "external";

type UserRole = "admin" | "auditor" | "contributor" | "viewer";
type SubscriptionPlan = "free" | "premium";

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization?: string;
  createdAt: string;
  lastLoginAt?: string;
  active: boolean;
  passwordHash?: string;
  subscriptionPlan?: SubscriptionPlan;
  createdByUserId?: string;
  createdByEmail?: string;
  groupId?: string;
  groupName?: string;
}

interface NewUserPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  organization?: string;
  subscriptionPlan?: SubscriptionPlan;
  createdByUserId?: string;
  createdByEmail?: string;
  groupId?: string;
  groupName?: string;
}

function normalizeSubscriptionPlan(value: unknown): SubscriptionPlan {
  return value === "premium" ? "premium" : "free";
}

const PREMIUM_CONTACT_EMAIL = "julien.messaoudi@edu.esiee.fr";

async function updateSubscriptionPlanOnServer(
  email: string,
  subscriptionPlan: SubscriptionPlan
) {
  const { data, error } = await supabase.rpc("gaptrack_set_subscription_plan", {
    target_email: normalizeEmail(email),
    next_plan: normalizeSubscriptionPlan(subscriptionPlan),
  });

  if (error) {
    throw error;
  }

  return data;
}

async function updateManagedUserProfileOnServer(
  email: string,
  patch: { role?: UserRole; subscriptionPlan?: SubscriptionPlan; active?: boolean }
) {
  const { data, error } = await supabase.rpc("gaptrack_owner_update_user_profile", {
    target_email: normalizeEmail(email),
    next_role: patch.role ? normalizeUserRole(patch.role) : null,
    next_plan: patch.subscriptionPlan ? normalizeSubscriptionPlan(patch.subscriptionPlan) : null,
    next_active: typeof patch.active === "boolean" ? patch.active : null,
  });

  if (error) {
    throw error;
  }

  return data;
}

async function deleteManagedUserProfileOnServer(target: AppUser) {
  const targetEmail = normalizeEmail(target.email);
  const targetUserId = String(target.id || "").trim();

  if (!targetUserId && !targetEmail) {
    throw new Error("Compte cible invalide.");
  }

  try {
    const { data, error } = await supabase.rpc("gaptrack_admin_delete_user_profile", {
      target_user_id: targetUserId || null,
      target_email: targetEmail || null,
    });

    if (!error) return data;

    console.warn("Unable to delete managed user via RPC; falling back to direct profile deletion.", error);
  } catch (error) {
    console.warn("Unable to delete managed user via RPC; falling back to direct profile deletion.", error);
  }

  // Fallback pour les environnements où la fonction RPC n'est pas encore déployée.
  // La suppression persistante se fait côté Supabase afin que le compte ne réapparaisse
  // pas au prochain rechargement de la page.
  const now = new Date().toISOString();
  const actorId = await supabase.auth.getUser()
    .then(({ data }) => data.user?.id || null)
    .catch(() => null);

  const softDeletePatch: Record<string, string | boolean | null> = {
    active: false,
    deleted_at: now,
  };
  if (actorId) softDeletePatch.deleted_by_user_id = actorId;

  if (targetUserId) {
    // Sans la RPC, on privilégie la suppression de la ligne profil pour éviter
    // que d'anciennes fonctions de listing réaffichent le compte au rechargement.
    const { error: deleteError } = await supabase
      .from("gaptrack_profiles")
      .delete()
      .eq("id", targetUserId);

    if (!deleteError) return;
    console.warn("Unable to hard-delete managed GapTrack profile; trying soft-delete.", deleteError);

    const { error: softDeleteError } = await supabase
      .from("gaptrack_profiles")
      .update(softDeletePatch)
      .eq("id", targetUserId);

    if (!softDeleteError) return;
    throw softDeleteError;
  }

  const { error: deleteByEmailError } = await supabase
    .from("gaptrack_profiles")
    .delete()
    .eq("email", targetEmail);

  if (deleteByEmailError) throw deleteByEmailError;
}

async function fetchGapTrackProfileOnServer(
  userId: string,
  fallback: {
    email: string;
    name?: string;
    organization?: string;
    role?: UserRole;
    subscriptionPlan?: SubscriptionPlan;
    active?: boolean;
    createdByUserId?: string;
    createdByEmail?: string;
    groupId?: string;
    groupName?: string;
  }
): Promise<{
  email: string;
  name?: string;
  organization?: string;
  role?: UserRole;
  subscriptionPlan?: SubscriptionPlan;
  active?: boolean;
  createdByUserId?: string;
  createdByEmail?: string;
  groupId?: string;
  groupName?: string;
}> {
  try {
    const profileColumnAttempts = [
      "email, name, organization, role, subscription_plan, active, created_by_user_id, created_by_email, group_id, group_name, deleted_at",
      "email, name, organization, role, subscription_plan, created_by_user_id, created_by_email, group_id, group_name, deleted_at",
      "email, name, organization, role, subscription_plan, active, created_by_user_id, created_by_email",
      "email, name, organization, role, subscription_plan, created_by_user_id, created_by_email",
      "email, name, organization, role, subscription_plan, active",
      "email, name, organization, role, subscription_plan",
    ];

    let data: any = null;
    let error: any = null;

    for (const columns of profileColumnAttempts) {
      const result = await supabase
        .from("gaptrack_profiles")
        .select(columns)
        .eq("id", userId)
        .maybeSingle();

      data = result.data as any;
      error = result.error;

      if (!error) break;

      // Compatibilité progressive : l'application reste utilisable même si les
      // nouvelles colonnes Supabase n'ont pas encore été migrées.
      const message = String(error.message || "").toLowerCase();
      if (!message.includes("active") && !message.includes("created_by") && !message.includes("group_")) break;
    }

    if (error) {
      throw error;
    }

    if (!data) {
      return fallback;
    }

    return {
      ...fallback,
      email: normalizeEmail(String(data.email || fallback.email)),
      name: typeof data.name === "string" && data.name.trim() ? data.name : fallback.name,
      organization: typeof data.organization === "string" && data.organization.trim() ? data.organization : fallback.organization,
      role: data.role === "admin" || data.role === "auditor" || data.role === "contributor" || data.role === "viewer"
        ? data.role
        : fallback.role,
      subscriptionPlan: normalizeSubscriptionPlan(data.subscription_plan),
      active: typeof data.active === "boolean" ? data.active : fallback.active,
      createdByUserId: typeof data.created_by_user_id === "string" && data.created_by_user_id.trim()
        ? data.created_by_user_id
        : fallback.createdByUserId,
      createdByEmail: typeof data.created_by_email === "string" && data.created_by_email.trim()
        ? normalizeEmail(data.created_by_email)
        : fallback.createdByEmail,
      groupId: typeof data.group_id === "string" && data.group_id.trim()
        ? data.group_id.trim()
        : fallback.groupId,
      groupName: typeof data.group_name === "string" && data.group_name.trim()
        ? data.group_name.trim()
        : fallback.groupName,
    };
  } catch (error) {
    console.error("Unable to fetch GapTrack profile from Supabase.", error);
    return fallback;
  }
}

function isPremiumPlan(plan: SubscriptionPlan | undefined): boolean {
  return normalizeSubscriptionPlan(plan) === "premium";
}

function buildPremiumRequestMailto(params: { email?: string; name?: string; organization?: string; source?: string } = {}): string {
  const subject = "Demande d’activation Premium GapTrack";
  const body = [
    "Bonjour Julien,",
    "",
    "Je souhaite être recontacté pour activer GapTrack Premium.",
    params.email ? `E-mail à activer : ${params.email}` : "E-mail à activer : ",
    params.name ? `Nom : ${params.name}` : "Nom : ",
    params.organization ? `Organisation : ${params.organization}` : "Organisation : ",
    "Besoin principal : audits illimités / exports PDF-CSV / preuves cloud / validation des preuves / utilisateurs et rôles / modèles personnalisés / autre",
    "Contexte ou délai souhaité : ",
    params.source ? `Origine : ${params.source}` : "Origine : GapTrack",
    "",
    "J’ai compris que je peux continuer à utiliser mon compte Free en attendant l’activation Premium, sans perdre les données déjà saisies.",
    "",
    "Merci.",
  ].join("\n");

  return `mailto:${PREMIUM_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function saveSelectedSubscriptionPlan(plan: SubscriptionPlan) {
  try {
    sessionStorage.setItem("gaptrack_selected_plan", plan);
  } catch {}
}

function subscriptionPlanLabel(plan: SubscriptionPlan | undefined): string {
  return normalizeSubscriptionPlan(plan) === "premium" ? "Premium" : "Free";
}

function subscriptionPlanBadgeClass(plan: SubscriptionPlan | undefined): string {
  return normalizeSubscriptionPlan(plan) === "premium"
    ? "border-cyan-500/50 text-cyan-700 dark:text-cyan-300 bg-cyan-500/10"
    : "border-sky-500/40 text-sky-700 dark:text-sky-300 bg-sky-500/10";
}

interface Session {
  id: string;
  name: string;
  createdAt: string; // ISO
  /** Explicit marker for the temporary first audit created during bootstrap. */
  bootstrap?: boolean;
  frameworkId?: string;
  frameworkVersion?: string;
  frameworkCatalogId?: string;
  frameworkCatalogRevision?: string;
  scope?: string;
  criticality?: AuditCriticality;
  templateId?: string;

  // Professional audit identity card
  organization?: string;
  auditor?: string;
  sponsor?: string;
  auditDate?: string; // YYYY-MM-DD
  auditType?: AuditType;
  objectives?: string;
  context?: string;
}

type EvidenceStorageKind = "metadata_only" | "indexeddb" | "backend" | "note";

type EvidenceReviewStatus = "validated" | "refused";

interface EvidenceItem {
  id: string;
  filename: string;
  size: number; // bytes
  note?: string;
  addedAt: string; // ISO
  addedBy?: string;
  mimeType?: string;
  storageKind?: EvidenceStorageKind;
  storageKey?: string;
  /** Legacy/user-owned storage paths keep the uploader user id as first folder.
   *  Group-shared storage paths use the shared group id instead. */
  ownerUserId?: string;
  groupId?: string;
  sha256?: string;
  contentAvailable?: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewStatus?: EvidenceReviewStatus;
  reviewComment?: string;
}

type EvidenceStatus = "absent" | "added" | "to_validate" | "validated" | "refused";
type EvidenceStatusMap = Record<string, EvidenceStatus>;

interface PlanAction {
  owner?: string;                    // responsable
  due?: string;                      // "YYYY-MM-DD"
  priority?: "low" | "medium" | "high";
  comment?: string;                  // action / commentaire
}

interface AuditSnapshot {
  rows: ControlItem[];
  evidenceMap: Record<string, EvidenceItem[]>;
  proofStatusMap: EvidenceStatusMap;
  plans: Record<string, PlanAction>;
}

type AuditLogAction =
  | "audit_created"
  | "audit_updated"
  | "audit_deleted"
  | "audit_duplicated"
  | "control_status_changed"
  | "plan_updated"
  | "evidence_added"
  | "evidence_note_added"
  | "evidence_deleted"
  | "evidence_status_changed"
  | "evidence_submitted"
  | "evidence_validated"
  | "evidence_refused"
  | "user_event";

interface AuditLogEntry {
  id: string;
  at: string;
  actor: string;
  actorEmail?: string;
  action: AuditLogAction;
  entityType: "audit" | "control" | "evidence" | "plan" | "user";
  entityId?: string;
  controlId?: string;
  controlRef?: string;
  controlDomain?: string;
  message: string;
  details?: string;
  before?: string;
  after?: string;
}

interface ListingOpenRequest {
  id: number;
  domain?: string;
  controlId?: string;
}

type FrameworkId = "ISO27001" | "NIS2" | "DORA" | "RGPD" | "PGSSI-S";

function frameworkLabel(id: FrameworkId, lang: LangKey): string {
  switch (id) {
    case "ISO27001":
      return "ISO/IEC 27001";
    case "NIS2":
      return "NIS2";
    case "DORA":
      return "DORA";
    case "RGPD":
      return lang === "fr" ? "RGPD" : "GDPR";
    case "PGSSI-S":
      return "PGSSI-S";
    default:
      return String(id);
  }
}

function normalizeLoadedFrameworkId(v: any): FrameworkId | null {
  const s = String(v ?? "").trim();
  if (!s) return null;

  const normalized = s
    .toUpperCase()
    .replace(/[\s_]+/g, "-")
    .replace(/^GDPR$/, "RGPD");

  if (normalized === "ISO27001" || normalized === "ISO-27001") return "ISO27001";
  if (normalized === "PGSSI-S") return "PGSSI-S";
  if (normalized === "NIS2") return "NIS2";
  if (normalized === "DORA") return "DORA";
  if (normalized === "RGPD") return "RGPD";
  return null;
}

function normalizeSessionFrameworkId(v: any): FrameworkId | null {
  return normalizeLoadedFrameworkId(v);
}

function sessionFrameworkLabel(session: Session | null | undefined, lang: LangKey): string {
  const fw = normalizeSessionFrameworkId(session?.frameworkId);
  if (!fw) return lang === "fr" ? "Référentiel non renseigné" : "Framework not set";
  const version = session?.frameworkVersion?.trim();
  return version ? `${frameworkLabel(fw, lang)}:${version}` : frameworkLabel(fw, lang);
}

function isVersionedFrameworkSession(session: Session | null | undefined): boolean {
  return Boolean(
    session?.frameworkId?.trim() &&
    session?.frameworkVersion?.trim() &&
    session?.frameworkCatalogId?.trim() &&
    session?.frameworkCatalogRevision?.trim()
  );
}

function criticalityLabel(value: AuditCriticality | undefined, lang: LangKey): string {
  if (lang === "fr") {
    if (value === "low") return "Faible";
    if (value === "high") return "Élevée";
    return "Moyenne";
  }
  if (value === "low") return "Low";
  if (value === "high") return "High";
  return "Medium";
}

function auditTypeLabel(value: AuditType | undefined, lang: LangKey): string {
  if (lang === "fr") {
    if (value === "follow_up") return "Suivi / réévaluation";
    if (value === "internal") return "Audit interne";
    if (value === "external") return "Audit externe";
    return "Audit initial";
  }
  if (value === "follow_up") return "Follow-up / reassessment";
  if (value === "internal") return "Internal audit";
  if (value === "external") return "External audit";
  return "Initial audit";
}

function defaultAuditDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatAuditDate(value: string | undefined, lang: LangKey): string {
  if (!value) return lang === "fr" ? "Date non renseignée" : "Date not set";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US");
}

function auditProfileCompletion(session: Session | null | undefined): { done: number; total: number; missing: string[] } {
  const checks = [
    { key: "organization", ok: Boolean(session?.organization?.trim()) },
    { key: "auditDate", ok: Boolean(session?.auditDate?.trim()) },
    { key: "auditor", ok: Boolean(session?.auditor?.trim()) },
    { key: "scope", ok: Boolean(session?.scope?.trim()) },
    { key: "objectives", ok: Boolean(session?.objectives?.trim()) },
    { key: "context", ok: Boolean(session?.context?.trim()) },
  ];
  return { done: checks.filter((c) => c.ok).length, total: checks.length, missing: checks.filter((c) => !c.ok).map((c) => c.key) };
}


function isBootstrapAuditSession(session: Session | null | undefined): boolean {
  return session?.bootstrap === true;
}




interface TemplateRow {
  ref: string;
  domain: string;
  impact: 1 | 2 | 3;
  description: string;
}

interface ChecklistTemplate {
  id: string;
  name: string;
  frameworkId: FrameworkId;
  version?: string;
  builtIn?: boolean;
  catalogId?: string;
  revision?: string;
  sourceUrl?: string;
  sourceNotice?: string;
  createdAt: string; // ISO
  rows: TemplateRow[];
}

interface BuiltInFrameworkCatalog {
  schemaVersion: number;
  id: string;
  frameworkId: FrameworkId;
  name: string;
  version: string;
  revision: string;
  publishedAt: string;
  sourceUrl: string;
  notice: string;
  controlCount: number;
  rows: TemplateRow[];
}


// ==================
// Constants & (ASCII-only)
// ==================
const STORAGE_KEY = "grc_rssi_controls_v1"; // legacy (pre-sessions)
const STORAGE_SETTINGS = "grc_rssi_settings_v1";
const USERS_KEY = "gaptrack_users_v1";
const ACTIVE_USER_KEY = "gaptrack_active_user_v1";

const TEMPLATES_KEY = "grc_rssi_templates_v1";
const LAST_TEMPLATE_BY_FRAMEWORK_KEY = "grc_rssi_last_template_by_framework_v1";



const EVIDENCE_FILES_DB_NAME = "grc_rssi_evidence_files_v1";
const EVIDENCE_FILES_STORE_NAME = "evidence_files";

type StoredEvidenceFile = {
  id: string;
  blob: Blob;
  filename: string;
  mimeType: string;
  size: number;
  addedAt: string;
  sha256?: string;
};

function currentEvidenceActor(): string {
  try {
    const candidates = [
      localStorage.getItem("grc_current_user"),
      localStorage.getItem("grc_user_email"),
      localStorage.getItem("user_email"),
      localStorage.getItem("email"),
    ];
    return candidates.find((v) => v && v.trim())?.trim() || "Utilisateur local";
  } catch {
    return "Utilisateur local";
  }
}

function supportsIndexedDbStorage(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

function openEvidenceFilesDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!supportsIndexedDbStorage()) {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }

    const request = window.indexedDB.open(EVIDENCE_FILES_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(EVIDENCE_FILES_STORE_NAME)) {
        db.createObjectStore(EVIDENCE_FILES_STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Unable to open evidence storage."));
  });
}

async function saveEvidenceFile(record: StoredEvidenceFile): Promise<void> {
  const db = await openEvidenceFilesDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(EVIDENCE_FILES_STORE_NAME, "readwrite");
    tx.objectStore(EVIDENCE_FILES_STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Unable to save evidence file."));
  }).finally(() => db.close());
}

async function getEvidenceFile(id: string): Promise<StoredEvidenceFile | null> {
  const db = await openEvidenceFilesDb();
  return new Promise<StoredEvidenceFile | null>((resolve, reject) => {
    const tx = db.transaction(EVIDENCE_FILES_STORE_NAME, "readonly");
    const request = tx.objectStore(EVIDENCE_FILES_STORE_NAME).get(id);
    request.onsuccess = () => resolve((request.result as StoredEvidenceFile | undefined) || null);
    request.onerror = () => reject(request.error || new Error("Unable to read evidence file."));
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
}

async function deleteEvidenceFile(id: string): Promise<void> {
  const db = await openEvidenceFilesDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(EVIDENCE_FILES_STORE_NAME, "readwrite");
    tx.objectStore(EVIDENCE_FILES_STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Unable to delete evidence file."));
  }).finally(() => db.close());
}

const EVIDENCE_STORAGE_BUCKET = "gaptrack-evidence";

function createEvidenceUuid(): string {
  const randomUUID = (globalThis as any).crypto?.randomUUID;
  if (typeof randomUUID === "function") return randomUUID.call((globalThis as any).crypto);

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function safeStorageFilename(name: string): string {
  const cleaned = String(name || "evidence")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return cleaned || "evidence";
}

function evidenceItemFromBackendRow(row: any): { controlId: string; item: EvidenceItem } | null {
  if (!row?.id || !row?.control_id || !row?.filename || !row?.storage_path) return null;

  return {
    controlId: String(row.control_id),
    item: {
      id: String(row.id),
      filename: String(row.filename),
      size: Number(row.size_bytes || 0),
      mimeType: typeof row.mime_type === "string" ? row.mime_type : undefined,
      addedAt: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
      addedBy: "Supabase",
      storageKind: "backend",
      storageKey: String(row.storage_path),
      ownerUserId: typeof row.owner_user_id === "string" && row.owner_user_id.trim() ? row.owner_user_id.trim() : undefined,
      groupId: typeof row.group_id === "string" && row.group_id.trim() ? row.group_id.trim() : undefined,
      contentAvailable: true,
    },
  };
}

async function fetchBackendEvidenceMapForSession(auditSessionId: string): Promise<Record<string, EvidenceItem[]>> {
  if (!auditSessionId) return {};

  try {
    const context = await getSupabaseUserContext();
    const baseColumns = "id, owner_user_id, group_id, control_id, filename, mime_type, size_bytes, storage_path, created_at";

    const primaryResult = await supabase
      .from("gaptrack_evidence_files")
      .select(baseColumns)
      .eq("audit_session_id", auditSessionId)
      .eq("group_id", context.groupId)
      .order("created_at", { ascending: false });

    let rows: unknown[] = primaryResult.data || [];
    let queryError = primaryResult.error;

    // Compatibility with databases where the group_id migration has not been applied yet.
    if (queryError && String(queryError.message || "").toLowerCase().includes("group_id")) {
      const legacyResult = await supabase
        .from("gaptrack_evidence_files")
        .select("id, owner_user_id, control_id, filename, mime_type, size_bytes, storage_path, created_at")
        .eq("audit_session_id", auditSessionId)
        .eq("owner_user_id", context.userId)
        .order("created_at", { ascending: false });
      rows = legacyResult.data || [];
      queryError = legacyResult.error;
    }

    if (queryError) throw queryError;

    const map: Record<string, EvidenceItem[]> = {};
    for (const row of rows) {
      const parsed = evidenceItemFromBackendRow(row);
      if (!parsed) continue;
      map[parsed.controlId] = [...(map[parsed.controlId] || []), parsed.item];
    }

    return map;
  } catch (error) {
    console.error("Unable to load evidence files from Supabase Storage metadata.", error);
    return {};
  }
}

function mergeEvidenceMaps(
  localMap: Record<string, EvidenceItem[]>,
  backendMap: Record<string, EvidenceItem[]>
): Record<string, EvidenceItem[]> {
  const out: Record<string, EvidenceItem[]> = {};
  const controlIds = new Set([...Object.keys(localMap || {}), ...Object.keys(backendMap || {})]);

  for (const controlId of controlIds) {
    const seen = new Set<string>();
    const merged: EvidenceItem[] = [];

    for (const item of backendMap[controlId] || []) {
      if (!item?.id || seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }

    for (const item of localMap[controlId] || []) {
      if (!item?.id || seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }

    if (merged.length) out[controlId] = merged;
  }

  return out;
}

async function mergeEvidenceMapWithBackend(
  auditSessionId: string,
  localMap: Record<string, EvidenceItem[]>
): Promise<Record<string, EvidenceItem[]>> {
  const backendMap = await fetchBackendEvidenceMapForSession(auditSessionId);
  return mergeEvidenceMaps(localMap || {}, backendMap);
}

async function uploadEvidenceFileToBackend(params: {
  file: File;
  auditSessionId: string;
  controlId: string;
  evidenceId: string;
  addedAt: string;
  addedBy: string;
  sha256?: string;
}): Promise<EvidenceItem> {
  const context = await getSupabaseUserContext();
  const userId = context.userId;
  const groupId = context.groupId;
  const validationError = validateEvidenceFile(params.file);
  if (validationError) throw new Error(validationError);

  if (![groupId, params.auditSessionId, params.controlId, params.evidenceId].every(isSafePathSegment)) {
    throw new Error("Identifiant de preuve invalide.");
  }

  const safeFilename = safeStorageFilename(params.file.name);
  const mimeType = resolveSafeMimeType(params.file);
  const storagePath = [
    groupId,
    params.auditSessionId,
    params.controlId,
    `${params.evidenceId}-${safeFilename}`,
  ].join("/");

  const { error: uploadError } = await supabase.storage
    .from(EVIDENCE_STORAGE_BUCKET)
    .upload(storagePath, params.file, {
      cacheControl: "0",
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const insertPayload: Record<string, unknown> = {
    id: params.evidenceId,
    owner_user_id: userId,
    group_id: groupId,
    audit_session_id: params.auditSessionId,
    control_id: params.controlId,
    filename: safeFilename,
    mime_type: mimeType,
    size_bytes: params.file.size,
    storage_bucket: EVIDENCE_STORAGE_BUCKET,
    storage_path: storagePath,
  };

  let result = await supabase
    .from("gaptrack_evidence_files")
    .insert(insertPayload)
    .select("id, owner_user_id, group_id, filename, mime_type, size_bytes, storage_path, created_at")
    .single();

  if (result.error && String(result.error.message || "").toLowerCase().includes("group_id")) {
    const { group_id: _groupId, ...legacyPayload } = insertPayload;
    result = await supabase
      .from("gaptrack_evidence_files")
      .insert(legacyPayload)
      .select("id, owner_user_id, filename, mime_type, size_bytes, storage_path, created_at")
      .single();
  }

  if (result.error) {
    await supabase.storage.from(EVIDENCE_STORAGE_BUCKET).remove([storagePath]).catch(() => undefined);
    throw result.error;
  }

  const data = result.data as any;
  return {
    id: String(data?.id || params.evidenceId),
    filename: String(data?.filename || safeFilename),
    size: Number(data?.size_bytes ?? params.file.size),
    mimeType: typeof data?.mime_type === "string" ? data.mime_type : mimeType,
    addedAt: typeof data?.created_at === "string" ? data.created_at : params.addedAt,
    addedBy: params.addedBy,
    storageKind: "backend",
    storageKey: String(data?.storage_path || storagePath),
    ownerUserId: typeof data?.owner_user_id === "string" ? data.owner_user_id : userId,
    groupId: typeof data?.group_id === "string" ? data.group_id : groupId,
    sha256: params.sha256,
    contentAvailable: true,
  };
}

async function openBackendEvidenceItem(item: EvidenceItem): Promise<void> {
  if (!item.storageKey) throw new Error("Missing Supabase Storage path.");
  const context = await getSupabaseUserContext();
  if (!storagePathBelongsToEvidenceItem(item.storageKey, context, item)) throw new Error("Chemin de preuve non autorisé.");

  const { data, error } = await supabase.storage
    .from(EVIDENCE_STORAGE_BUCKET)
    .createSignedUrl(item.storageKey, 60, { download: safeStorageFilename(item.filename || "evidence") });

  if (error) throw error;
  if (!data?.signedUrl) throw new Error("Unable to create signed URL.");

  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}

async function deleteBackendEvidenceItem(item: EvidenceItem): Promise<void> {
  if (!item.storageKey) throw new Error("Missing Supabase Storage path.");
  const context = await getSupabaseUserContext();
  if (!storagePathBelongsToEvidenceItem(item.storageKey, context, item)) throw new Error("Chemin de preuve non autorisé.");

  const { error: fileError } = await supabase.storage
    .from(EVIDENCE_STORAGE_BUCKET)
    .remove([item.storageKey]);

  if (fileError) throw fileError;

  let result = await supabase
    .from("gaptrack_evidence_files")
    .delete()
    .eq("id", item.id)
    .eq("group_id", context.groupId);

  if (result.error && String(result.error.message || "").toLowerCase().includes("group_id")) {
    result = await supabase
      .from("gaptrack_evidence_files")
      .delete()
      .eq("id", item.id)
      .eq("owner_user_id", context.userId);
  }

  if (result.error) throw result.error;
}

async function copyBackendEvidenceItemToAudit(
  item: EvidenceItem,
  targetAuditSessionId: string,
  controlId: string
): Promise<EvidenceItem> {
  if (!item.storageKey) throw new Error("Missing Supabase Storage path.");

  const context = await getSupabaseUserContext();
  if (!storagePathBelongsToEvidenceItem(item.storageKey, context, item)) {
    throw new Error("Chemin de preuve non autorisé.");
  }

  const newId = createEvidenceUuid();
  if (![context.groupId, targetAuditSessionId, controlId, newId].every(isSafePathSegment)) {
    throw new Error("Identifiant de preuve invalide.");
  }

  const { data: sourceBlob, error: downloadError } = await supabase.storage
    .from(EVIDENCE_STORAGE_BUCKET)
    .download(item.storageKey);
  if (downloadError || !sourceBlob) throw downloadError || new Error("Unable to copy evidence file.");

  const filename = safeStorageFilename(item.filename || "evidence");
  const mimeType = item.mimeType || sourceBlob.type || "application/octet-stream";
  const storagePath = [
    context.groupId,
    targetAuditSessionId,
    controlId,
    `${newId}-${filename}`,
  ].join("/");

  const { error: uploadError } = await supabase.storage
    .from(EVIDENCE_STORAGE_BUCKET)
    .upload(storagePath, sourceBlob, {
      cacheControl: "0",
      contentType: mimeType,
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const insertPayload: Record<string, unknown> = {
    id: newId,
    owner_user_id: context.userId,
    group_id: context.groupId,
    audit_session_id: targetAuditSessionId,
    control_id: controlId,
    filename,
    mime_type: mimeType,
    size_bytes: item.size || sourceBlob.size,
    storage_bucket: EVIDENCE_STORAGE_BUCKET,
    storage_path: storagePath,
  };

  let result = await supabase
    .from("gaptrack_evidence_files")
    .insert(insertPayload)
    .select("id, owner_user_id, group_id, filename, mime_type, size_bytes, storage_path, created_at")
    .single();

  if (result.error && String(result.error.message || "").toLowerCase().includes("group_id")) {
    const { group_id: _groupId, ...legacyPayload } = insertPayload;
    result = await supabase
      .from("gaptrack_evidence_files")
      .insert(legacyPayload)
      .select("id, owner_user_id, filename, mime_type, size_bytes, storage_path, created_at")
      .single();
  }

  if (result.error) {
    await supabase.storage.from(EVIDENCE_STORAGE_BUCKET).remove([storagePath]).catch(() => undefined);
    throw result.error;
  }

  const data = result.data as any;
  return {
    ...item,
    id: String(data?.id || newId),
    filename: String(data?.filename || filename),
    size: Number(data?.size_bytes ?? item.size ?? sourceBlob.size),
    mimeType: typeof data?.mime_type === "string" ? data.mime_type : mimeType,
    addedAt: typeof data?.created_at === "string" ? data.created_at : new Date().toISOString(),
    storageKind: "backend",
    storageKey: String(data?.storage_path || storagePath),
    ownerUserId: typeof data?.owner_user_id === "string" ? data.owner_user_id : context.userId,
    groupId: typeof data?.group_id === "string" ? data.group_id : context.groupId,
    contentAvailable: true,
  };
}

async function cleanupDuplicatedEvidenceItems(evidenceMap: Record<string, EvidenceItem[]>): Promise<void> {
  for (const item of Object.values(evidenceMap).flat()) {
    try {
      if (item.storageKind === "backend" && item.storageKey) {
        await deleteBackendEvidenceItem(item);
      } else if (item.storageKind === "indexeddb" && item.storageKey) {
        await deleteEvidenceFile(item.storageKey);
      }
    } catch (error) {
      console.warn("Unable to clean up a duplicated evidence item.", error);
    }
  }
}

async function duplicateEvidenceMapForAudit(
  sourceMap: Record<string, EvidenceItem[]>,
  targetAuditSessionId: string
): Promise<Record<string, EvidenceItem[]>> {
  const duplicated: Record<string, EvidenceItem[]> = {};

  try {
    for (const [controlId, items] of Object.entries(sourceMap || {})) {
      const copies: EvidenceItem[] = [];
      duplicated[controlId] = copies;

      for (const item of items || []) {
        if (item.storageKind === "backend" && item.storageKey && item.contentAvailable !== false) {
          copies.push(await copyBackendEvidenceItemToAudit(item, targetAuditSessionId, controlId));
          continue;
        }

        if (item.storageKind === "indexeddb" && item.storageKey && item.contentAvailable !== false) {
          const sourceFile = await getEvidenceFile(item.storageKey);
          if (!sourceFile) throw new Error(`Local evidence file not found: ${item.filename}`);
          const newId = createEvidenceUuid();
          await saveEvidenceFile({ ...sourceFile, id: newId, addedAt: new Date().toISOString() });
          copies.push({
            ...item,
            id: newId,
            storageKey: newId,
            addedAt: new Date().toISOString(),
            contentAvailable: true,
          });
          continue;
        }

        if (item.storageKind === "note" || item.note) {
          copies.push({ ...item, id: createEvidenceUuid(), addedAt: new Date().toISOString() });
          continue;
        }

        // A reference without accessible content is still duplicated, but never
        // points to the source audit's physical file.
        copies.push({
          ...item,
          id: createEvidenceUuid(),
          storageKind: "metadata_only",
          storageKey: undefined,
          ownerUserId: undefined,
          groupId: undefined,
          contentAvailable: false,
          addedAt: new Date().toISOString(),
        });
      }

      if (!copies.length) delete duplicated[controlId];
    }

    return duplicated;
  } catch (error) {
    await cleanupDuplicatedEvidenceItems(duplicated);
    throw error;
  }
}

async function sha256File(file: File): Promise<string | undefined> {
  try {
    if (typeof window === "undefined" || !window.crypto?.subtle) return undefined;
    const buffer = await file.arrayBuffer();
    const digest = await window.crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return undefined;
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safeStorageFilename(filename);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadEvidenceItem(item: EvidenceItem, lang: LangKey) {
  if (item.note) {
    downloadBlob(new Blob([item.note], { type: "text/plain;charset=utf-8" }), item.filename || "note.txt");
    return;
  }

  if (item.storageKind === "backend" && item.storageKey) {
    try {
      await openBackendEvidenceItem(item);
    } catch (error) {
      console.error("Unable to open backend evidence file.", error);
      toast.error(
        lang === "fr"
          ? "Impossible d’ouvrir la preuve depuis le stockage sécurisé."
          : "Unable to open the evidence from secure storage."
      );
    }
    return;
  }

  if (item.storageKind === "indexeddb" && item.storageKey) {
    const stored = await getEvidenceFile(item.storageKey);
    if (!stored) {
      toast.error(lang === "fr" ? "Fichier introuvable dans le stockage local." : "File not found in local storage.");
      return;
    }
    downloadBlob(stored.blob, stored.filename || item.filename);
    return;
  }

  toast.info(
    lang === "fr"
      ? "Cette entrée est une référence de preuve : le contenu du fichier n’a pas été stocké."
      : "This entry is an evidence reference: the file content was not stored."
  );
}

function evidenceStorageLabel(item: EvidenceItem, lang: LangKey): string {
  if (item.note || item.storageKind === "note") return lang === "fr" ? "Note" : "Note";
  if (item.storageKind === "indexeddb" && item.contentAvailable !== false) {
    return lang === "fr" ? "Fichier stocké localement" : "File stored locally";
  }
  if (item.storageKind === "backend" && item.contentAvailable !== false) {
    return lang === "fr" ? "Fichier stocké dans Supabase" : "File stored in Supabase";
  }
  return lang === "fr" ? "Référence seule" : "Reference only";
}

function isEvidenceContentAvailable(item: EvidenceItem): boolean {
  return Boolean(
    item.note ||
    item.storageKind === "note" ||
    ((item.storageKind === "indexeddb" || item.storageKind === "backend") && item.contentAvailable !== false)
  );
}



function auditLogActionLabel(action: AuditLogAction, lang: LangKey): string {
  const fr: Record<AuditLogAction, string> = {
    audit_created: "Audit créé",
    audit_updated: "Fiche audit mise à jour",
    audit_deleted: "Audit supprimé",
    audit_duplicated: "Audit dupliqué",
    control_status_changed: "Statut de contrôle modifié",
    plan_updated: "Plan d’action modifié",
    evidence_added: "Preuve ajoutée",
    evidence_note_added: "Note ajoutée",
    evidence_deleted: "Preuve supprimée",
    evidence_status_changed: "Statut de preuve modifié",
    evidence_submitted: "Preuve envoyée en validation",
    evidence_validated: "Preuve validée",
    evidence_refused: "Preuve refusée",
    user_event: "Utilisateur",
  };
  const en: Record<AuditLogAction, string> = {
    audit_created: "Audit created",
    audit_updated: "Audit profile updated",
    audit_deleted: "Audit deleted",
    audit_duplicated: "Audit duplicated",
    control_status_changed: "Control status changed",
    plan_updated: "Action plan updated",
    evidence_added: "Evidence added",
    evidence_note_added: "Note added",
    evidence_deleted: "Evidence deleted",
    evidence_status_changed: "Evidence status changed",
    evidence_submitted: "Evidence submitted for review",
    evidence_validated: "Evidence validated",
    evidence_refused: "Evidence rejected",
    user_event: "User",
  };
  return (lang === "fr" ? fr : en)[action] || String(action);
}

function auditLogActionClass(action: AuditLogAction): string {
  if (action === "evidence_validated") return "border-emerald-500/50 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10";
  if (action === "evidence_refused" || action === "audit_deleted") return "border-rose-500/50 text-rose-700 dark:text-rose-300 bg-rose-500/10";
  if (action === "evidence_submitted" || action === "evidence_status_changed") return "border-sky-500/50 text-sky-700 dark:text-sky-300 bg-sky-500/10";
  if (action === "plan_updated" || action === "control_status_changed") return "border-amber-500/50 text-amber-700 dark:text-amber-300 bg-amber-500/10";
  return "border-muted-foreground/30 text-muted-foreground bg-muted/20";
}

function exportAuditLogCSV(entries: AuditLogEntry[], lang: LangKey) {
  const delimiter = ";";
  const header = lang === "fr"
    ? ["Date", "Acteur", "Email", "Action", "Élément", "Référence", "Domaine", "Avant", "Après", "Message", "Détails"]
    : ["Date", "Actor", "Email", "Action", "Entity", "Reference", "Domain", "Before", "After", "Message", "Details"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/\r?\n/g, " ").replaceAll('"', '""')}"`;
  const lines = [
    header.map(esc).join(delimiter),
    ...entries.map((e) => [
      new Date(e.at).toLocaleString(lang === "fr" ? "fr-FR" : "en-US"),
      e.actor,
      e.actorEmail || "",
      auditLogActionLabel(e.action, lang),
      e.entityType,
      e.controlRef || "",
      e.controlDomain || "",
      e.before || "",
      e.after || "",
      e.message,
      e.details || "",
    ].map(esc).join(delimiter)),
  ];
  downloadBlob(new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), `gaptrack-journal-${new Date().toISOString().slice(0, 10)}.csv`);
}

function normalizeEvidenceStatus(value: any): EvidenceStatus | null {
  if (value === "absent" || value === "added" || value === "to_validate" || value === "validated" || value === "refused") {
    return value;
  }
  return null;
}

function coerceEvidenceStatusForCount(status: EvidenceStatus | null | undefined, count: number): EvidenceStatus {
  if (count === 0) return "absent";
  const normalized = normalizeEvidenceStatus(status);
  if (!normalized || normalized === "absent") return "added";
  return normalized;
}

function selectableEvidenceStatuses(hasEvidence: boolean): EvidenceStatus[] {
  return hasEvidence ? ["added", "to_validate", "validated", "refused"] : ["absent"];
}

function effectiveEvidenceStatus(
  controlId: string,
  evidenceMap: Record<string, EvidenceItem[]>,
  proofStatusMap: EvidenceStatusMap
): EvidenceStatus {
  const count = evidenceMap[controlId]?.length || 0;
  return coerceEvidenceStatusForCount(proofStatusMap[controlId], count);
}

function evidenceStatusLabel(status: EvidenceStatus, lang: LangKey): string {
  if (status === "absent") return lang === "fr" ? "Aucune preuve" : "No evidence";
  if (status === "added") return lang === "fr" ? "Preuve ajoutée" : "Evidence added";
  if (status === "to_validate") return lang === "fr" ? "À valider" : "To validate";
  if (status === "refused") return lang === "fr" ? "Refusée / insuffisante" : "Rejected / insufficient";
  return lang === "fr" ? "Validée" : "Validated";
}

function evidenceStatusClass(status: EvidenceStatus): string {
  if (status === "validated") return "border-emerald-500/50 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10";
  if (status === "to_validate") return "border-sky-500/50 text-sky-700 dark:text-sky-300 bg-sky-500/10";
  if (status === "added") return "border-amber-500/50 text-amber-700 dark:text-amber-300 bg-amber-500/10";
  if (status === "refused") return "border-rose-500/50 text-rose-700 dark:text-rose-300 bg-rose-500/10";
  return "border-muted-foreground/30 text-muted-foreground bg-muted/20";
}



const I18N = {
  fr: {
    appTitle: "Plateforme SSI - Évaluations & Tableaux de bord",
    listing: "Listing",
    dashboard: "Tableau de bord",
    bulkDone: "Marquer les visibles conformes",
    bulkUndone: "Marquer les visibles non conformes",
    search: "Rechercher...",
    domain: "Domaine",
    impact: "Impact",
    controlPoint: "Point de contrôle",
    realized: "État du contrôle",
    ref: "Référence",
    globalScore: "Maturité des contrôles évalués",
	scoringShort: "Score sur les contrôles évalués et applicables.",
	scoringHint:
	"Maturité = somme pondérée des contrôles conformes et partiels ÷ somme des impacts des contrôles évalués et applicables. Le taux d’évaluation est affiché séparément.",
    level: "Niveau",
    empty: "Aucune ligne. Données manquantes.",
    autosaved: "Modifications enregistrées",
    theme: "Thème",
    dark: "Sombre",
    light: "Clair",
    language: "Langue",
    top3: "Top 3 des domaines à prioriser",
    byDomain: "Résultats par domaine",
    maturityRadar: "Maturité par domaine (%)",
    items: "lignes",
    session: "Session",
    newSession: "Nouvelle",
    duplicate: "Dupliquer",
    evidence: "Preuves & références",
    addFile: "Ajouter une preuve",
    addNote: "Ajouter une note",
    noEvidence: "Aucune preuve ou référence pour ce contrôle.",
    export: "Exporter le rapport PDF",
    compare: "Comparaison",
    delete: "Supprimer",
    cannotDeleteLast: "Impossible de supprimer la dernière session.",
    confirmDeleteTitle: "Supprimer la session ?",
    confirmDeleteDesc: "Cette action supprimera définitivement la session dans ce navigateur.",
    confirm: "Confirmer",
	globalMeaning: "Signification globale",
	maturityLegend: "Légende de maturité",
    cancel: "Annuler",
	saving: "Enregistrement…",
	localSaved: "Brouillon sauvegardé",
	syncing: "Synchronisation serveur…",
	localOnly: "Mode hors ligne",
	syncedShort: "Synchronisé",
	syncError: "Synchronisation serveur impossible",
	retrySync: "Réessayer",
	savedShort: "Sauvegardé",
	saveError: "Erreur de sauvegarde",
	actionPlan: "Plan d’action",
  },
  en: {
    appTitle: "Sec Platform - Assessments & Dashboards",
    listing: "Listing",
    dashboard: "Dashboard",
    bulkDone: "Mark visible compliant",
    bulkUndone: "Mark visible non-compliant",
    search: "Search...",
    domain: "Domain",
    impact: "Impact",
    controlPoint: "Control point",
    realized: "Control status",
    ref: "Ref",
    globalScore: "Maturity of assessed controls",
	scoringShort: "Score for assessed and applicable controls.",
	scoringHint:
	"Maturity = weighted compliant and partial controls divided by the impact of assessed and applicable controls. Assessment coverage is shown separately.",
    level: "Level",
    empty: "No rows yet.",
    autosaved: "Changes saved",
    theme: "Theme",
    dark: "Dark",
    light: "Light",
    language: "Language",
    top3: "Top 3 domains to prioritize",
    byDomain: "Results by domain",
    maturityRadar: "Maturity by domain (%)",
    items: "rows",
    session: "Session",
    newSession: "New",
    duplicate: "Duplicate",
    evidence: "Evidence & references",
    addFile: "Add evidence",
    addNote: "Add note",
    noEvidence: "No evidence or reference for this control.",
    export: "Export PDF report",
    compare: "Comparison",
    delete: "Delete",
    cannotDeleteLast: "Cannot delete the last session.",
    confirmDeleteTitle: "Delete session?",
    confirmDeleteDesc: "This will permanently remove the session in this browser.",
    confirm: "Confirm",
	globalMeaning: "Global meaning",
	maturityLegend: "Maturity legend",
    cancel: "Cancel",
	saving: "Saving locally…",
	localSaved: "Saved locally",
	syncing: "Saved locally · Syncing…",
	localOnly: "Local mode",
	syncedShort: "Synced",
	syncError: "Saved locally · Sync unavailable",
	retrySync: "Retry",
	savedShort: "Saved",
	saveError: "Local save error",
	actionPlan: "Action plan",
  },
};

type LangKey = keyof typeof I18N;
type SaveState = "saving" | "local_saved" | "syncing" | "saved" | "sync_error" | "local_only" | "error";

function saveStateLabel(saveState: SaveState, lang: LangKey): string {
  const t = I18N[lang];
  if (saveState === "saving") return t.saving;
  if (saveState === "local_saved") return t.localSaved;
  if (saveState === "syncing") return t.syncing;
  if (saveState === "local_only") return t.localOnly;
  if (saveState === "sync_error") return t.syncError;
  if (saveState === "error") return t.saveError;
  return t.syncedShort;
}

function saveStateTitle(saveState: SaveState, lang: LangKey): string {
  if (lang === "fr") {
    if (saveState === "saving") return "Écriture dans le navigateur en cours.";
    if (saveState === "local_saved") return "La sauvegarde locale a réussi. La synchronisation serveur va démarrer.";
    if (saveState === "syncing") return "La sauvegarde locale est faite. Envoi vers le serveur en cours.";
    if (saveState === "local_only") return "Les données sont sauvegardées dans ce navigateur. Aucun backend de synchronisation n’est configuré.";
    if (saveState === "sync_error") return "Les données sont conservées localement, mais la synchronisation serveur est indisponible.";
    if (saveState === "error") return "La sauvegarde locale a échoué.";
    return "La sauvegarde locale et la synchronisation serveur sont terminées.";
  }
  if (saveState === "saving") return "Writing to the browser storage.";
  if (saveState === "local_saved") return "Local save succeeded. Server sync is about to start.";
  if (saveState === "syncing") return "Local save is done. Server sync is in progress.";
  if (saveState === "local_only") return "Data is saved in this browser. No backend sync is configured.";
  if (saveState === "sync_error") return "Data is saved locally, but server sync is unavailable.";
  if (saveState === "error") return "Local save failed.";
  return "Local save and server sync are complete.";
}


// ==================
// Génération automatique du plan d’action
// ==================
type PlanPriority = NonNullable<PlanAction["priority"]>;
type PlanCategory =
  | "governance"
  | "policy"
  | "risk"
  | "awareness"
  | "access"
  | "backup"
  | "incident"
  | "supplier"
  | "asset"
  | "operations"
  | "compliance"
  | "development"
  | "default";

function normalizeRuleText(value: string): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function addDaysISO(days: number, base = new Date()): string {
  const d = new Date(base);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function hasAnyPlanFields(p?: PlanAction): boolean {
  if (!p) return false;
  return Boolean(p.owner?.trim() || p.due || p.priority || p.comment?.trim());
}

function inferPlanPriority(row: ControlItem): PlanPriority {
  if (row.impact >= 3) return "high";
  if (row.impact === 2) return "medium";
  return "low";
}

function dueDaysForPriority(priority: PlanPriority): number {
  if (priority === "high") return 30;
  if (priority === "medium") return 60;
  return 90;
}

function inferPlanCategory(row: ControlItem): PlanCategory {
  const text = normalizeRuleText(`${row.domain} ${row.description}`);
  const has = (...words: string[]) => words.some((w) => text.includes(normalizeRuleText(w)));

  if (has("incident", "alerte", "signalement", "crise", "violation", "attaque")) return "incident";
  if (has("sauvegarde", "restauration", "backup", "reprise", "continuite", "pca", "pra")) return "backup";
  if (has("acces", "habilitation", "identifiant", "mot de passe", "authentification", "mfa", "compte", "privilege", "admin")) return "access";
  if (has("tiers", "prestataire", "fournisseur", "sous-traitant", "contrat", "externalise")) return "supplier";
  if (has("sensibilise", "sensibilisation", "formation", "forme", "charte", "personnel", "employe", "rh")) return "awareness";
  if (has("politique", "regle", "procedure", "directive", "norme", "documente", "formalise")) return "policy";
  if (has("risque", "menace", "vulnerabilite", "analyse", "appreciation", "traitement")) return "risk";
  if (has("actif", "inventaire", "classification", "donnee", "support", "materiel", "equipement")) return "asset";
  if (has("journal", "supervision", "mise a jour", "correctif", "antivirus", "protection", "operation", "exploitation", "configuration")) return "operations";
  if (has("rgpd", "conformite", "legal", "reglementaire", "audit", "preuve", "registre")) return "compliance";
  if (has("developpement", "application", "code", "test", "recette", "changement", "maintenance", "systeme")) return "development";
  if (has("direction", "engagement", "responsabilite", "gouvernance", "pilotage", "comite")) return "governance";

  return "default";
}

const PLAN_ACTION_LIBRARY: Record<LangKey, Record<PlanCategory, { owner: string; action: string; proof: string; closing: string }>> = {
  fr: {
    governance: {
      owner: "Direction + RSSI/DSI",
      action: "Faire valider par la direction un engagement sécurité visible : nomination d’un référent SSI, objectifs sécurité prioritaires, arbitrage des moyens et communication interne aux équipes.",
      proof: "Note d’engagement signée, compte rendu de comité, mail de communication interne, désignation du référent SSI.",
      closing: "La direction a formellement validé le dispositif et un responsable est identifié.",
    },
    policy: {
      owner: "RSSI/DSI + Direction",
      action: "Rédiger ou mettre à jour une règle/procédure courte et applicable, la faire valider, puis la diffuser aux personnes concernées.",
      proof: "Politique/procédure datée, version validée, preuve de diffusion ou accusé de lecture.",
      closing: "Le document existe, il est validé, diffusé et compréhensible par les équipes.",
    },
    risk: {
      owner: "RSSI/DSI + Direction métiers",
      action: "Réaliser une analyse simple des risques : actifs concernés, scénarios redoutés, vraisemblance, impact, mesures existantes et mesures complémentaires à planifier.",
      proof: "Tableau d’analyse des risques, registre de traitement, décisions d’acceptation ou de réduction du risque.",
      closing: "Les risques majeurs sont identifiés, priorisés et associés à des mesures de traitement.",
    },
    awareness: {
      owner: "RH + RSSI/DSI",
      action: "Mettre en place une sensibilisation sécurité légère mais traçable : charte, rappel phishing/mots de passe, bonnes pratiques, intégration des nouveaux arrivants.",
      proof: "Support de sensibilisation, liste de présence, attestation, email de diffusion, charte signée.",
      closing: "Les collaborateurs concernés ont reçu l’information et une preuve de participation existe.",
    },
    access: {
      owner: "DSI / Prestataire IT",
      action: "Revoir les accès : lister les comptes, supprimer les comptes inutiles, limiter les droits administrateurs, activer le MFA sur les comptes sensibles et documenter le processus d’arrivée/départ.",
      proof: "Export des comptes, capture MFA, registre des habilitations, ticket de suppression ou validation manager.",
      closing: "Les accès critiques sont maîtrisés, justifiés et revus périodiquement.",
    },
    backup: {
      owner: "DSI / Prestataire IT",
      action: "Formaliser la stratégie de sauvegarde, vérifier la fréquence, isoler au moins une copie, tester une restauration et documenter le résultat du test.",
      proof: "Rapport de sauvegarde, capture de configuration, procès-verbal de test de restauration, procédure de reprise.",
      closing: "Une restauration testée prouve que l’activité peut reprendre en cas d’incident.",
    },
    incident: {
      owner: "DSI/RSSI + Direction",
      action: "Définir une procédure d’incident simple : qui alerter, comment qualifier l’incident, premières actions, communication interne/externe, conservation des preuves et retour d’expérience.",
      proof: "Procédure incident, liste de contacts d’urgence, modèle de fiche incident, compte rendu d’exercice ou de test.",
      closing: "L’organisation sait qui fait quoi pendant les premières heures d’un incident.",
    },
    supplier: {
      owner: "Achats/Juridique + RSSI/DSI",
      action: "Identifier les prestataires critiques, vérifier leurs engagements sécurité, ajouter les clauses minimales au contrat et conserver les preuves ou attestations disponibles.",
      proof: "Liste des prestataires critiques, questionnaire sécurité, clauses contractuelles, attestation ou certification fournisseur.",
      closing: "Les tiers critiques sont connus et encadrés par des exigences sécurité minimales.",
    },
    asset: {
      owner: "DSI / Responsable métiers",
      action: "Construire ou mettre à jour l’inventaire des actifs et données sensibles, définir leur propriétaire, leur criticité et les règles de protection associées.",
      proof: "Inventaire des actifs, classification, liste des propriétaires, règles de manipulation ou stockage.",
      closing: "Les actifs importants sont connus, classés et associés à un responsable.",
    },
    operations: {
      owner: "DSI / Prestataire IT",
      action: "Mettre sous contrôle l’exploitation : mises à jour, protection antimalware, supervision minimale, journaux utiles, durcissement des configurations et traitement des anomalies.",
      proof: "Captures de console, rapport de mises à jour, journal d’exploitation, tickets de correction, configuration de protection.",
      closing: "Les opérations techniques essentielles sont suivies et les anomalies sont traitées.",
    },
    compliance: {
      owner: "DPO/Juridique + RSSI/DSI",
      action: "Vérifier l’exigence réglementaire, identifier les documents attendus, compléter le registre ou les preuves et planifier une revue périodique.",
      proof: "Registre, note de conformité, preuve de revue, analyse d’écart, validation DPO/juridique.",
      closing: "L’exigence est documentée et les preuves nécessaires sont disponibles.",
    },
    development: {
      owner: "Responsable applicatif + DSI",
      action: "Intégrer la sécurité dans le cycle de changement ou de développement : validation, tests, séparation des environnements, revue des droits et traçabilité des mises en production.",
      proof: "Ticket de changement, compte rendu de recette, résultat de test, validation de mise en production, procédure de rollback.",
      closing: "Les changements sont contrôlés avant mise en production et restent traçables.",
    },
    default: {
      owner: "DSI / RSSI / Prestataire IT",
      action: "Définir une mesure concrète, désigner un responsable, fixer une échéance, appliquer la mesure puis conserver une preuve exploitable.",
      proof: "Procédure, capture d’écran, ticket, compte rendu, document validé ou export de configuration.",
      closing: "La mesure est appliquée, vérifiable et rattachée au contrôle concerné.",
    },
  },
  en: {
    governance: {
      owner: "Management + CISO/CIO",
      action: "Have management formally endorse security: name a security owner, define priority objectives, allocate resources and communicate the commitment internally.",
      proof: "Signed commitment note, committee minutes, internal communication, named security owner.",
      closing: "Management has formally approved the security setup and an owner is identified.",
    },
    policy: {
      owner: "CISO/CIO + Management",
      action: "Create or update a short, usable policy/procedure, get it approved, and communicate it to the relevant people.",
      proof: "Dated policy/procedure, approved version, communication evidence or acknowledgement.",
      closing: "The document exists, is approved, distributed and understandable by teams.",
    },
    risk: {
      owner: "CISO/CIO + Business owners",
      action: "Run a simple risk assessment: assets, feared scenarios, likelihood, impact, existing measures and additional actions to plan.",
      proof: "Risk assessment table, treatment register, risk acceptance or reduction decisions.",
      closing: "Major risks are identified, prioritized and linked to treatment measures.",
    },
    awareness: {
      owner: "HR + CISO/CIO",
      action: "Deploy lightweight but traceable security awareness: charter, phishing/password reminders, good practices and onboarding material.",
      proof: "Awareness deck, attendance list, acknowledgement, communication email, signed charter.",
      closing: "Relevant employees have received the information and proof of participation exists.",
    },
    access: {
      owner: "IT / IT provider",
      action: "Review access rights: list accounts, remove unused accounts, limit admin privileges, enable MFA on sensitive accounts and document joiner/mover/leaver steps.",
      proof: "Account export, MFA screenshot, access register, deletion ticket or manager approval.",
      closing: "Critical access rights are controlled, justified and periodically reviewed.",
    },
    backup: {
      owner: "IT / IT provider",
      action: "Formalize the backup strategy, check frequency, isolate at least one copy, test a restore and document the test result.",
      proof: "Backup report, configuration screenshot, restore test report, recovery procedure.",
      closing: "A tested restore proves the business can recover after an incident.",
    },
    incident: {
      owner: "CISO/IT + Management",
      action: "Define a simple incident procedure: who to alert, how to qualify the incident, first actions, internal/external communication, evidence preservation and lessons learned.",
      proof: "Incident procedure, emergency contact list, incident form template, exercise or test minutes.",
      closing: "The organization knows who does what during the first hours of an incident.",
    },
    supplier: {
      owner: "Procurement/Legal + CISO/IT",
      action: "Identify critical suppliers, check their security commitments, add minimum security clauses and keep available evidence or attestations.",
      proof: "Critical supplier list, security questionnaire, contractual clauses, supplier attestation or certification.",
      closing: "Critical third parties are known and covered by minimum security requirements.",
    },
    asset: {
      owner: "IT / Business owner",
      action: "Create or update the inventory of key assets and sensitive data, define ownership, criticality and associated protection rules.",
      proof: "Asset inventory, classification, owner list, handling or storage rules.",
      closing: "Important assets are known, classified and assigned to an owner.",
    },
    operations: {
      owner: "IT / IT provider",
      action: "Control operations: updates, antimalware, basic monitoring, useful logs, secure configuration and anomaly handling.",
      proof: "Console screenshots, update report, operations log, remediation tickets, protection configuration.",
      closing: "Essential technical operations are monitored and anomalies are handled.",
    },
    compliance: {
      owner: "DPO/Legal + CISO/IT",
      action: "Check the regulatory requirement, identify expected documents, complete the register or evidence and schedule periodic review.",
      proof: "Register, compliance note, review evidence, gap analysis, DPO/legal validation.",
      closing: "The requirement is documented and expected evidence is available.",
    },
    development: {
      owner: "Application owner + IT",
      action: "Embed security into change/development: approval, testing, environment separation, access review and production release traceability.",
      proof: "Change ticket, acceptance report, test result, release approval, rollback procedure.",
      closing: "Changes are controlled before production and remain traceable.",
    },
    default: {
      owner: "IT / CISO / IT provider",
      action: "Define a concrete measure, assign an owner, set a due date, implement it and keep usable evidence.",
      proof: "Procedure, screenshot, ticket, meeting minutes, approved document or configuration export.",
      closing: "The measure is implemented, verifiable and linked to the relevant control.",
    },
  },
};

function generatePlanForControl(row: ControlItem, lang: LangKey, baseDate = new Date()): PlanAction {
  const priority = inferPlanPriority(row);
  const category = inferPlanCategory(row);
  const tpl = PLAN_ACTION_LIBRARY[lang][category] || PLAN_ACTION_LIBRARY[lang].default;
  const due = addDaysISO(dueDaysForPriority(priority), baseDate);
  const prioLabel = priority === "high" ? "P1" : priority === "medium" ? "P2" : "P3";

  if (lang === "fr") {
    return {
      owner: tpl.owner,
      due,
      priority,
      comment: [
        `Action proposée (${prioLabel}) : ${tpl.action}`,
        `Pourquoi : écart impact ${row.impact} sur « ${row.domain} ».`,
        `Preuve attendue : ${tpl.proof}`,
        `Critère de clôture : ${tpl.closing}`,
      ].join("\n"),
    };
  }

  return {
    owner: tpl.owner,
    due,
    priority,
    comment: [
      `Suggested action (${prioLabel}): ${tpl.action}`,
      `Why: impact ${row.impact} gap in “${row.domain}”.`,
      `Expected evidence: ${tpl.proof}`,
      `Closing criterion: ${tpl.closing}`,
    ].join("\n"),
  };
}


type WeeklyFocus = {
  label: string;
  why: string;
  firstStep: string;
  proof: string;
  effort: string;
};

function priorityCode(priority?: PlanAction["priority"]): "P1" | "P2" | "P3" | "" {
  if (priority === "high") return "P1";
  if (priority === "medium") return "P2";
  if (priority === "low") return "P3";
  return "";
}

function priorityWeight(priority?: PlanAction["priority"]): number {
  if (priority === "high") return 1;
  if (priority === "medium") return 2;
  if (priority === "low") return 3;
  return 9;
}

function daysUntilISO(due?: string): number | null {
  if (!due) return null;
  const d = new Date(`${due}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((d.getTime() - today.getTime()) / 86400000);
}

function formatDueHuman(due: string | undefined, lang: LangKey): string {
  const days = daysUntilISO(due);
  if (days === null) return lang === "fr" ? "À planifier" : "To schedule";
  if (days < 0) return lang === "fr" ? `En retard de ${Math.abs(days)} j` : `${Math.abs(days)}d overdue`;
  if (days === 0) return lang === "fr" ? "Aujourd’hui" : "Today";
  if (days === 1) return lang === "fr" ? "Demain" : "Tomorrow";
  if (days <= 7) return lang === "fr" ? `Dans ${days} j` : `In ${days}d`;
  return due ?? (lang === "fr" ? "À planifier" : "To schedule");
}

function weeklyFocusForControl(row: ControlItem, lang: LangKey): WeeklyFocus {
  const category = inferPlanCategory(row);
  const tpl = PLAN_ACTION_LIBRARY[lang][category] || PLAN_ACTION_LIBRARY[lang].default;

  const fr: Record<PlanCategory, WeeklyFocus> = {
    governance: {
      label: "Décision dirigeant",
      why: "Sans arbitrage visible de la direction, les actions sécurité restent bloquées ou non priorisées.",
      firstStep: "Obtenir cette semaine une décision écrite : référent sécurité nommé, objectifs prioritaires et moyens minimum validés.",
      proof: "Note ou mail de la direction, compte rendu de réunion, désignation du référent.",
      effort: "30-60 min",
    },
    policy: {
      label: "Règle minimale",
      why: "Une règle courte évite les pratiques informelles et donne un cadre clair aux équipes et prestataires.",
      firstStep: "Créer une version 1 page de la règle, la faire valider, puis la diffuser aux personnes concernées.",
      proof: "Document daté, version validée, preuve de diffusion.",
      effort: "1-2 h",
    },
    risk: {
      label: "Risque priorisé",
      why: "Les PME doivent traiter d’abord les scénarios qui peuvent bloquer l’activité ou exposer les données.",
      firstStep: "Lister 3 scénarios majeurs, noter impact/vraisemblance et choisir une mesure immédiate par scénario.",
      proof: "Mini registre des risques, décision de traitement ou d’acceptation.",
      effort: "2 h",
    },
    awareness: {
      label: "Sensibilisation rapide",
      why: "Les erreurs humaines restent un point d’entrée fréquent : phishing, mots de passe, pièces jointes, données sensibles.",
      firstStep: "Envoyer un rappel sécurité court et tracer la diffusion auprès des collaborateurs concernés.",
      proof: "Support, email de diffusion, liste de présence ou accusé de lecture.",
      effort: "45 min",
    },
    access: {
      label: "Accès critiques",
      why: "Les comptes, droits administrateurs et accès sans MFA sont des portes d’entrée directes pour un attaquant.",
      firstStep: "Revoir les comptes sensibles, supprimer les comptes inutiles, limiter les admins et activer le MFA prioritaire.",
      proof: "Export des comptes, capture MFA, registre des habilitations, ticket de suppression.",
      effort: "2-4 h",
    },
    backup: {
      label: "Sauvegarde testée",
      why: "Sans restauration testée, une attaque ou panne peut devenir un arrêt d’activité long et coûteux.",
      firstStep: "Lancer un test de restauration sur un fichier ou système critique et documenter le résultat.",
      proof: "Rapport de sauvegarde, capture de configuration, PV de test de restauration.",
      effort: "1-3 h",
    },
    incident: {
      label: "Réaction incident",
      why: "Les premières heures d’un incident décident souvent de l’impact financier, juridique et opérationnel.",
      firstStep: "Définir qui appeler, quoi couper, quoi conserver, et comment communiquer en cas d’incident.",
      proof: "Procédure incident courte, liste de contacts d’urgence, fiche incident.",
      effort: "1-2 h",
    },
    supplier: {
      label: "Tiers critique",
      why: "Un prestataire mal encadré peut exposer les données, les accès ou la continuité d’activité de la PME.",
      firstStep: "Identifier le prestataire le plus critique et demander ses garanties sécurité ou ajouter une clause minimale.",
      proof: "Liste des tiers critiques, questionnaire, clause contractuelle, attestation fournisseur.",
      effort: "1-2 h",
    },
    asset: {
      label: "Actifs sensibles",
      why: "On ne protège correctement que ce que l’on connaît : données, postes, serveurs, applications et responsables.",
      firstStep: "Lister les 10 actifs ou données les plus critiques et affecter un propriétaire à chacun.",
      proof: "Inventaire, classification, propriétaire désigné.",
      effort: "1-2 h",
    },
    operations: {
      label: "Hygiène technique",
      why: "Les failles non corrigées, protections désactivées ou journaux absents augmentent fortement l’exposition.",
      firstStep: "Vérifier mises à jour, antivirus/EDR, comptes admin et journaux sur les systèmes les plus critiques.",
      proof: "Captures de console, rapport de patch, ticket de correction, configuration de protection.",
      effort: "2-4 h",
    },
    compliance: {
      label: "Preuve conformité",
      why: "La conformité doit être prouvable : sans preuve, l’entreprise reste fragile face aux clients, assureurs ou contrôles.",
      firstStep: "Identifier la preuve minimale attendue, la déposer dans l’audit et planifier la revue suivante.",
      proof: "Registre, note de conformité, preuve de revue, validation DPO/juridique.",
      effort: "1-2 h",
    },
    development: {
      label: "Changement maîtrisé",
      why: "Un changement non testé ou non tracé peut créer une faille ou une interruption de service.",
      firstStep: "Ajouter validation, test minimal, responsable et preuve pour le prochain changement applicatif.",
      proof: "Ticket de changement, résultat de test, validation de mise en production.",
      effort: "1-3 h",
    },
    default: {
      label: "Action immédiate",
      why: "Cet écart réduit la maîtrise globale du dispositif et doit être transformé en action concrète.",
      firstStep: tpl.action,
      proof: tpl.proof,
      effort: row.impact >= 3 ? "1-3 h" : "30-90 min",
    },
  };

  const en: Record<PlanCategory, WeeklyFocus> = {
    governance: {
      label: "Management decision",
      why: "Without visible management support, security actions remain blocked or deprioritized.",
      firstStep: "Get a written decision this week: named security owner, priority objectives and minimum resources.",
      proof: "Management note/email, meeting minutes, named security owner.",
      effort: "30-60 min",
    },
    policy: {
      label: "Minimum rule",
      why: "A short rule avoids informal practices and gives teams/providers a clear baseline.",
      firstStep: "Create a 1-page version, get it approved, and share it with relevant people.",
      proof: "Dated document, approved version, distribution evidence.",
      effort: "1-2h",
    },
    risk: {
      label: "Prioritized risk",
      why: "SMBs should first handle scenarios that could stop activity or expose data.",
      firstStep: "List 3 major scenarios, rate impact/likelihood and choose one immediate measure for each.",
      proof: "Mini risk register, treatment or acceptance decision.",
      effort: "2h",
    },
    awareness: {
      label: "Quick awareness",
      why: "Human errors remain a common entry point: phishing, passwords, attachments and sensitive data.",
      firstStep: "Send a short security reminder and keep evidence of distribution.",
      proof: "Material, distribution email, attendance list or acknowledgement.",
      effort: "45 min",
    },
    access: {
      label: "Critical access",
      why: "Accounts, admin rights and access without MFA are direct entry points for attackers.",
      firstStep: "Review sensitive accounts, remove unused accounts, limit admins and enable priority MFA.",
      proof: "Account export, MFA screenshot, access register, deletion ticket.",
      effort: "2-4h",
    },
    backup: {
      label: "Tested backup",
      why: "Without a tested restore, an attack or outage can become a long and costly business interruption.",
      firstStep: "Run a restore test on a critical file/system and document the result.",
      proof: "Backup report, configuration screenshot, restore test report.",
      effort: "1-3h",
    },
    incident: {
      label: "Incident response",
      why: "The first hours of an incident often determine financial, legal and operational impact.",
      firstStep: "Define who to call, what to disconnect, what to preserve and how to communicate.",
      proof: "Short incident procedure, emergency contact list, incident form.",
      effort: "1-2h",
    },
    supplier: {
      label: "Critical third party",
      why: "A poorly controlled provider can expose company data, access or continuity.",
      firstStep: "Identify the most critical provider and request security commitments or add a minimum clause.",
      proof: "Critical supplier list, questionnaire, contract clause, supplier attestation.",
      effort: "1-2h",
    },
    asset: {
      label: "Sensitive assets",
      why: "You can only protect what you know: data, devices, servers, apps and owners.",
      firstStep: "List the 10 most critical assets/data and assign one owner to each.",
      proof: "Inventory, classification, assigned owner.",
      effort: "1-2h",
    },
    operations: {
      label: "Technical hygiene",
      why: "Unpatched flaws, disabled protection or missing logs significantly increase exposure.",
      firstStep: "Check updates, antivirus/EDR, admin accounts and logs on the most critical systems.",
      proof: "Console screenshots, patch report, remediation ticket, protection configuration.",
      effort: "2-4h",
    },
    compliance: {
      label: "Compliance evidence",
      why: "Compliance must be provable; without evidence the company remains weak with customers, insurers or auditors.",
      firstStep: "Identify the minimum expected proof, attach it to the audit and schedule the next review.",
      proof: "Register, compliance note, review proof, legal/DPO validation.",
      effort: "1-2h",
    },
    development: {
      label: "Controlled change",
      why: "An untested or untracked change can create a vulnerability or service disruption.",
      firstStep: "Add approval, a minimum test, owner and proof for the next application change.",
      proof: "Change ticket, test result, production approval.",
      effort: "1-3h",
    },
    default: {
      label: "Immediate action",
      why: "This gap reduces overall control and should be converted into a concrete action.",
      firstStep: tpl.action,
      proof: tpl.proof,
      effort: row.impact >= 3 ? "1-3h" : "30-90 min",
    },
  };

  return (lang === "fr" ? fr : en)[category];
}

function weeklyPriorityScore(row: ControlItem, plan?: PlanAction): number {
  const category = inferPlanCategory(row);
  const dueDays = daysUntilISO(plan?.due);

  let score = row.impact * 100;

  if (!hasAnyPlanFields(plan)) score += 45;
  if (plan?.priority === "high") score += 60;
  if (plan?.priority === "medium") score += 35;
  if (plan?.priority === "low") score += 15;

  if (dueDays !== null) {
    if (dueDays < 0) score += 90;
    else if (dueDays <= 7) score += 80;
    else if (dueDays <= 30) score += 35;
  } else {
    score += 20;
  }

  if (["access", "backup", "incident"].includes(category)) score += 35;
  if (["governance", "risk", "policy"].includes(category)) score += 25;
  if (["supplier", "operations", "asset"].includes(category)) score += 15;

  return score;
}

function generateWeeklyPlanForControl(row: ControlItem, lang: LangKey, baseDate = new Date()): PlanAction {
  const priority = inferPlanPriority(row);
  const focus = weeklyFocusForControl(row, lang);
  const due = addDaysISO(priority === "high" ? 7 : priority === "medium" ? 14 : 21, baseDate);

  if (lang === "fr") {
    return {
      owner: (PLAN_ACTION_LIBRARY[lang][inferPlanCategory(row)] || PLAN_ACTION_LIBRARY[lang].default).owner,
      due,
      priority,
      comment: [
        `Action cette semaine (${priorityCode(priority)}) : ${focus.firstStep}`,
        `Pourquoi maintenant : ${focus.why}`,
        `Preuve attendue : ${focus.proof}`,
        `Effort estimé : ${focus.effort}`,
        `Résultat attendu : une preuve exploitable est ajoutée et l’action suivante est clarifiée.`,
      ].join("\n"),
    };
  }

  return {
    owner: (PLAN_ACTION_LIBRARY[lang][inferPlanCategory(row)] || PLAN_ACTION_LIBRARY[lang].default).owner,
    due,
    priority,
    comment: [
      `This week action (${priorityCode(priority)}): ${focus.firstStep}`,
      `Why now: ${focus.why}`,
      `Expected evidence: ${focus.proof}`,
      `Estimated effort: ${focus.effort}`,
      `Expected result: usable evidence is added and the next action is clear.`,
    ].join("\n"),
  };
}

// Dataset embedded (if any) or fetched fallback
const FIXED_LISTING: ControlItem[] = [];

// ==================
// Utils
// ==================
function uuid(){ return (globalThis as any).crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`; }

function maturityLabel(p: number, lang: LangKey) {
  const map = (frLabel: string) => (lang === "fr" ? frLabel : ({
    "Niveau critique": "Critical",
    "Niveau initial": "Initial",
    "Niveau opportunité": "Opportunity",
    "Niveau géré": "Managed",
    "Niveau optimisé": "Optimized",
  } as Record<string, string>)[frLabel] || frLabel);
  if (p <= 20) return map("Niveau critique");
  if (p <= 40) return map("Niveau initial");
  if (p <= 60) return map("Niveau opportunité");
  if (p <= 80) return map("Niveau géré");
  return map("Niveau optimisé");
}

function significationText(p: number, lang: LangKey) {
  if (lang === "fr") {
    if (p <= 20) return "Aucun dispositif de sécurité structuré. Risques majeurs : mesures urgentes à engager.";
    if (p <= 40) return "Dispositif émergent : prioriser les fondamentaux et l'organisation.";
    if (p <= 60) return "Dispositif en construction : saisir les opportunités d'amélioration.";
    if (p <= 80) return "Dispositif géré : consolider les contrôles et la conformité.";
    return "Dispositif optimisé : viser l'amélioration continue et la resilience.";
  }
  if (p <= 20) return "No structured security program. Major risks: urgent measures required.";
  if (p <= 40) return "Emerging program: prioritize fundamentals and organization.";
  if (p <= 60) return "In-progress program: capture improvement opportunities.";
  if (p <= 80) return "Managed program: consolidate controls and compliance.";
  return "Optimized program: pursue continuous improvement and resilience.";
}

function reportPriorityLabel(priority: PlanAction["priority"] | undefined, lang: LangKey): string {
  if (priority === "high") return lang === "fr" ? "Haute (P1)" : "High (P1)";
  if (priority === "medium") return lang === "fr" ? "Moyenne (P2)" : "Medium (P2)";
  if (priority === "low") return lang === "fr" ? "Basse (P3)" : "Low (P3)";
  return lang === "fr" ? "Non définie" : "Not set";
}

function reportShortText(value: string | undefined, fallback = "—", max = 180): string {
  const s = String(value || "").trim();
  if (!s) return fallback;
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function reportPlanSummary(plan: PlanAction | undefined, lang: LangKey): string {
  if (!plan || !hasAnyPlanFields(plan)) return lang === "fr" ? "Plan à compléter" : "Action plan to complete";
  const lines = [
    plan.owner ? `${lang === "fr" ? "Responsable" : "Owner"}: ${plan.owner}` : "",
    plan.due ? `${lang === "fr" ? "Échéance" : "Due"}: ${formatDueHuman(plan.due, lang)} (${plan.due})` : "",
    plan.priority ? `${lang === "fr" ? "Priorité" : "Priority"}: ${reportPriorityLabel(plan.priority, lang)}` : "",
    plan.comment ? reportShortText(plan.comment, "", 520) : "",
  ].filter(Boolean);
  return lines.join("\n");
}

function safeExportFilename(value: string, lang: LangKey): string {
  const base = String(value || (lang === "fr" ? "rapport-audit" : "audit-report"))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || (lang === "fr" ? "rapport-audit" : "audit-report");
  return `${base}-${new Date().toISOString().slice(0, 10)}`;
}

// ==================
// Searchable PDF export helpers
// ==================
function pdfText(value: unknown, fallback = "—"): string {
  const text = String(value ?? "").replace(/\s+$/g, "").trim();
  return text || fallback;
}

function pdfDateStamp(lang: LangKey): string {
  return lang === "fr" ? new Date().toLocaleString("fr-FR") : new Date().toLocaleString("en-GB");
}

declare global {
  interface Window {
    jspdf?: { jsPDF?: any; autoTable?: any };
    autoTable?: any;
    jspdfAutoTable?: any;
  }
}

let searchablePdfLibrariesPromise: Promise<{ jsPDF: any; autoTable: (doc: any, options: any) => void }> | null = null;

function loadExternalScriptOnce(id: string, src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("Export PDF indisponible hors navigateur."));
      return;
    }

    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Impossible de charger ${src}`)), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Impossible de charger ${src}`));
    document.head.appendChild(script);
  });
}

async function loadSearchablePdfLibraries(): Promise<{ jsPDF: any; autoTable: (doc: any, options: any) => void }> {
  if (!searchablePdfLibrariesPromise) {
    searchablePdfLibrariesPromise = (async () => {
      await loadExternalScriptOnce(
        "gaptrack-jspdf",
        "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"
      );
      await loadExternalScriptOnce(
        "gaptrack-jspdf-autotable",
        "https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js"
      );

      const jsPDF = window.jspdf?.jsPDF;
      if (!jsPDF) {
        throw new Error("La bibliothèque jsPDF n’a pas pu être initialisée.");
      }

      const autoTable = (doc: any, options: any) => {
        if (typeof doc?.autoTable === "function") {
          doc.autoTable(options);
          return;
        }

        const globalAutoTable = window.jspdf?.autoTable || window.jspdfAutoTable || window.autoTable;
        if (typeof globalAutoTable === "function") {
          globalAutoTable(doc, options);
          return;
        }

        throw new Error("La bibliothèque jspdf-autotable n’a pas pu être initialisée.");
      };

      return { jsPDF, autoTable };
    })();
  }

  return searchablePdfLibrariesPromise;
}

function addPdfPageNumbers(doc: any, footerLeft: string) {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(footerLeft, 14, 287);
    doc.text(`${page}/${pageCount}`, 196, 287, { align: "right" });
  }
  doc.setTextColor(15, 23, 42);
}

function addPdfWrappedText(doc: any, text: string, x: number, y: number, width: number, lineHeight = 5): number {
  const lines = doc.splitTextToSize(text, width);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

async function saveSearchablePlanPDF({
  rows,
  plans,
  lang,
  proofStatusFor,
  filename,
}: {
  rows: ControlItem[];
  plans?: Record<string, PlanAction>;
  lang: LangKey;
  proofStatusFor: (controlId: string) => EvidenceStatus;
  filename?: string;
}) {
  const { jsPDF, autoTable } = await loadSearchablePdfLibraries();
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const title = lang === "fr" ? "Plan d’action" : "Action plan";

  doc.setProperties({
    title,
    subject: lang === "fr" ? "Plan d’action GapTrack" : "GapTrack action plan",
    author: "GapTrack",
    creator: "GapTrack",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 14, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`${lang === "fr" ? "Généré le" : "Generated on"} ${pdfDateStamp(lang)} · ${rows.length} ${lang === "fr" ? "écart(s)" : "gap(s)"}`, 14, 23);

  const prioLabel = (p?: PlanAction["priority"]) => {
    if (p === "high") return "P1";
    if (p === "medium") return "P2";
    if (p === "low") return "P3";
    return "";
  };

  autoTable(doc, {
    startY: 30,
    head: [[
      lang === "fr" ? "Réf." : "Ref",
      lang === "fr" ? "Domaine" : "Domain",
      "Impact",
      lang === "fr" ? "Point de contrôle" : "Control point",
      lang === "fr" ? "Priorité" : "Priority",
      lang === "fr" ? "Échéance" : "Due",
      lang === "fr" ? "Resp." : "Owner",
      lang === "fr" ? "Preuve" : "Evidence",
      "Action",
    ]],
    body: rows.map((r) => {
      const p = plans?.[r.id];
      return [
        pdfText(r.ref, ""),
        pdfText(r.domain, ""),
        String(r.impact),
        pdfText(r.description, ""),
        prioLabel(p?.priority),
        pdfText(p?.due, ""),
        pdfText(p?.owner, ""),
        evidenceStatusLabel(proofStatusFor(r.id), lang),
        pdfText(p?.comment, ""),
      ];
    }),
    styles: {
      font: "helvetica",
      fontSize: 7.6,
      cellPadding: 1.8,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      overflow: "linebreak",
      valign: "top",
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 13 },
      1: { cellWidth: 35 },
      2: { cellWidth: 13, halign: "center" },
      3: { cellWidth: 66 },
      4: { cellWidth: 15, halign: "center" },
      5: { cellWidth: 20 },
      6: { cellWidth: 23 },
      7: { cellWidth: 26 },
      8: { cellWidth: 73 },
    },
    didDrawPage: () => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("GapTrack", 14, 202);
      doc.text(String(doc.getCurrentPageInfo().pageNumber), 283, 202, { align: "right" });
      doc.setTextColor(15, 23, 42);
    },
    margin: { top: 12, right: 10, bottom: 14, left: 10 },
  });

  doc.save(filename || (lang === "fr" ? "plan_action.pdf" : "action_plan.pdf"));
}

async function saveSearchableAuditReportPDF({
  rows,
  lang,
  session,
  sessionName,
  baseline,
  plans,
  evidenceMap,
  proofStatusMap,
  filename,
}: {
  rows: ControlItem[];
  lang: LangKey;
  session?: Session | null;
  sessionName: string;
  baseline?: ControlItem[] | null;
  plans?: Record<string, PlanAction>;
  evidenceMap?: Record<string, EvidenceItem[]>;
  proofStatusMap?: EvidenceStatusMap;
  filename?: string;
}) {
  const cmpRef = (a: string, b: string) =>
    a.localeCompare(b, lang === "fr" ? "fr" : "en", { numeric: true, sensitivity: "base" });

  const proofStatusFor = (controlId: string) =>
    effectiveEvidenceStatus(controlId, evidenceMap || {}, proofStatusMap || {});

  const hasPlan = (id: string) => hasAnyPlanFields(plans?.[id]);

  const assessmentMetrics = calculateAssessmentMetrics(rows);
  const baselineMetrics = baseline?.length ? calculateAssessmentMetrics(baseline) : null;

  const byDomain: Record<string, {
    points: number;
    max: number;
    count: number;
    evaluated: number;
    maturityCount: number;
    gaps: number;
    criticalGaps: number;
    missingProof: number;
  }> = {};

  for (const r of rows) {
    const x = byDomain[r.domain] || (byDomain[r.domain] = {
      points: 0,
      max: 0,
      count: 0,
      evaluated: 0,
      maturityCount: 0,
      gaps: 0,
      criticalGaps: 0,
      missingProof: 0,
    });

    x.count += 1;
    if (isEvaluatedStatus(r.realized)) x.evaluated += 1;
    if (isGapStatus(r.realized)) x.gaps += 1;
    if (r.impact === 3 && isGapStatus(r.realized)) x.criticalGaps += 1;
    if (isImplementedStatus(r.realized) && proofStatusFor(r.id) !== "validated") x.missingProof += 1;

    if (!isApplicableForMaturity(r.realized)) continue;
    x.maturityCount += 1;
    x.max += r.impact;
    x.points += r.impact * controlStatusScore(r.realized);
  }

  const domains = Object.entries(byDomain).map(([domain, v]) => ({
    domain,
    ...v,
    percent: v.max ? Number(((v.points / v.max) * 100).toFixed(2)) : 0,
    evaluationPercent: v.count ? Math.round((v.evaluated / v.count) * 100) : 0,
  }));

  const global = assessmentMetrics.maturityPoints;
  const globalMax = assessmentMetrics.maturityMax;
  const globalPercent = assessmentMetrics.maturityPercent;
  const level = assessmentMetrics.maturityControls > 0
    ? maturityLabel(globalPercent, lang)
    : (lang === "fr" ? "Non calculable" : "Not available");
  const baselinePercent = baselineMetrics && baselineMetrics.maturityControls > 0
    ? baselineMetrics.maturityPercent
    : null;
  const delta = baselinePercent === null || assessmentMetrics.maturityControls === 0
    ? null
    : Number((globalPercent - baselinePercent).toFixed(2));

  const gaps = rows
    .filter((r) => isGapStatus(r.realized))
    .slice()
    .sort((a, b) => (b.impact - a.impact) || cmpRef(a.ref, b.ref));
  const criticalGaps = gaps.filter((r) => r.impact === 3);
  const gapsWithoutPlan = gaps.filter((r) => !hasPlan(r.id));
  const missingProofs = rows
    .filter((r) => isImplementedStatus(r.realized) && proofStatusFor(r.id) !== "validated")
    .slice()
    .sort((a, b) => (b.impact - a.impact) || cmpRef(a.ref, b.ref));

  const plannedActions = gaps
    .map((row) => ({ row, plan: plans?.[row.id] }))
    .filter(({ plan }) => hasAnyPlanFields(plan))
    .sort((a, b) =>
      priorityWeight(a.plan?.priority) - priorityWeight(b.plan?.priority) ||
      ((daysUntilISO(a.plan?.due) ?? 9999) - (daysUntilISO(b.plan?.due) ?? 9999)) ||
      (b.row.impact - a.row.impact) ||
      cmpRef(a.row.ref, b.row.ref)
    );

  const allEvidenceCount = rows.reduce((total, r) => total + (evidenceMap?.[r.id]?.length || 0), 0);
  const evidenceValidatedControls = rows.filter((r) => proofStatusFor(r.id) === "validated").length;
  const evidenceAddedControls = rows.filter((r) => proofStatusFor(r.id) !== "absent").length;
  const conformControls = rows.filter((r) => r.realized === 1).length;
  const partialControls = rows.filter((r) => r.realized === 0.5).length;
  const nonConformControls = rows.filter((r) => r.realized === 0).length;
  const notEvaluatedControls = assessmentMetrics.notEvaluatedControls;
  const notApplicableControls = assessmentMetrics.notApplicableControls;
  const topDomains = domains
    .slice()
    .sort((a, b) =>
      (b.criticalGaps - a.criticalGaps) ||
      (b.gaps - a.gaps) ||
      (a.percent - b.percent) ||
      a.domain.localeCompare(b.domain, lang === "fr" ? "fr" : "en")
    )
    .slice(0, 6);

  const reportConclusion = (() => {
    if (assessmentMetrics.maturityControls === 0) {
      return lang === "fr"
        ? "Aucune conclusion de maturité ne peut encore être formulée : aucun contrôle évalué et applicable n’entre dans le calcul."
        : "No maturity conclusion can be drawn yet: no assessed and applicable control is included in the calculation.";
    }
    if (assessmentMetrics.evaluationPercent < 100) {
      return lang === "fr"
        ? `La maturité des contrôles évalués est de ${globalPercent}%. Ce résultat reste provisoire avec ${assessmentMetrics.evaluationPercent}% de couverture ; une conclusion sur l’ensemble du périmètre nécessite de terminer l’évaluation.`
        : `Maturity of assessed controls is ${globalPercent}%. This result remains provisional at ${assessmentMetrics.evaluationPercent}% coverage; a conclusion about the full scope requires completing the assessment.`;
    }
    if (lang === "fr") {
      if (globalPercent <= 20) return "Le dispositif de sécurité est à un niveau critique. La priorité est de structurer les fondamentaux, de traiter les écarts d’impact 3 et de produire des preuves vérifiables.";
      if (globalPercent <= 40) return "Le dispositif est en phase initiale. Des mesures existent probablement, mais elles doivent être formalisées, pilotées et rattachées à des preuves.";
      if (globalPercent <= 60) return "Le dispositif progresse mais reste hétérogène. Les actions doivent se concentrer sur les domaines faibles, les preuves et la réduction des écarts majeurs.";
      if (globalPercent <= 80) return "Le dispositif est globalement maîtrisé. L’enjeu principal est la consolidation, le suivi périodique et la démonstration par les preuves.";
      return "Le dispositif est mature. Le rapport doit surtout alimenter l’amélioration continue et la conservation des preuves.";
    }
    if (globalPercent <= 20) return "The security program is at a critical level. Priority should be given to core controls, impact-3 gaps and verifiable evidence.";
    if (globalPercent <= 40) return "The program is at an initial stage. Measures may exist, but need to be formalized, governed and backed by evidence.";
    if (globalPercent <= 60) return "The program is progressing but remains uneven. Actions should focus on weak domains, evidence and major gaps.";
    if (globalPercent <= 80) return "The program is broadly managed. The main challenge is consolidation, periodic monitoring and evidence.";
    return "The program is mature. The report mainly supports continuous improvement and evidence retention.";
  })();

  const recommendations: string[] = [];
  if (lang === "fr") {
    if (criticalGaps.length) recommendations.push(`Traiter en priorité les ${criticalGaps.length} écart(s) d’impact 3, avec responsable, échéance et preuve attendue.`);
    if (gapsWithoutPlan.length) recommendations.push(`Compléter le plan d’action pour ${gapsWithoutPlan.length} écart(s), en commençant par les plus critiques.`);
    if (missingProofs.length) recommendations.push(`Valider les preuves des ${missingProofs.length} contrôle(s) conformes ou partiels non encore justifiés.`);
    if (notEvaluatedControls) recommendations.push(`Finaliser l’évaluation des ${notEvaluatedControls} contrôle(s) encore non évalués.`);
    if (!recommendations.length) recommendations.push("Maintenir une revue périodique, conserver les preuves et suivre les actions jusqu’à clôture.");
  } else {
    if (criticalGaps.length) recommendations.push(`Prioritize the ${criticalGaps.length} impact-3 gap(s), with owner, due date and expected evidence.`);
    if (gapsWithoutPlan.length) recommendations.push(`Complete the action plan for ${gapsWithoutPlan.length} gap(s), starting with the most critical.`);
    if (missingProofs.length) recommendations.push(`Validate evidence for ${missingProofs.length} compliant or partial control(s) not yet justified.`);
    if (notEvaluatedControls) recommendations.push(`Finalize the assessment of the ${notEvaluatedControls} control(s) still not evaluated.`);
    if (!recommendations.length) recommendations.push("Maintain periodic review, evidence retention and action follow-up until closure.");
  }

  const title = lang === "fr" ? "Rapport d’audit sécurité" : "Security audit report";
  const { jsPDF, autoTable } = await loadSearchablePdfLibraries();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setProperties({
    title,
    subject: lang === "fr" ? "Rapport d’audit GapTrack" : "GapTrack audit report",
    author: "GapTrack",
    creator: "GapTrack",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("GAPTRACK · AUDIT SSI", 14, 15);

  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 14, 27);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`${pdfText(sessionName)} · ${sessionFrameworkLabel(session, lang)} · ${formatAuditDate(session?.auditDate, lang)}`, 14, 35);
  doc.text(`${lang === "fr" ? "Généré le" : "Generated on"} ${pdfDateStamp(lang)}`, 196, 15, { align: "right" });
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.7);
  doc.line(14, 42, 196, 42);

  autoTable(doc, {
    startY: 48,
    body: [
      [lang === "fr" ? "Organisation" : "Organization", pdfText(session?.organization, "—"), lang === "fr" ? "Auditeur" : "Auditor", pdfText(session?.auditor, "—")],
      [lang === "fr" ? "Commanditaire" : "Sponsor", pdfText(session?.sponsor, "—"), lang === "fr" ? "Périmètre" : "Scope", pdfText(session?.scope, "—")],
      [lang === "fr" ? "Type" : "Type", auditTypeLabel(session?.auditType, lang), lang === "fr" ? "Criticité" : "Criticality", criticalityLabel(session?.criticality, lang)],
    ],
    theme: "grid",
    styles: { font: "helvetica", fontSize: 9, cellPadding: 2.5, lineColor: [226, 232, 240], lineWidth: 0.15 },
    columnStyles: { 0: { fontStyle: "bold", fillColor: [248, 250, 252] }, 2: { fontStyle: "bold", fillColor: [248, 250, 252] } },
    margin: { left: 14, right: 14 },
  });

  autoTable(doc, {
    startY: ((doc as any).lastAutoTable?.finalY || 72) + 8,
    head: [[lang === "fr" ? "Maturité évaluée" : "Assessed maturity", lang === "fr" ? "Taux d’évaluation" : "Assessment coverage", lang === "fr" ? "Écarts critiques" : "Critical gaps", lang === "fr" ? "Preuves validées" : "Validated evidence"]],
    body: [[`${globalPercent}%\n${level}\n${global} / ${globalMax} pts`, `${assessmentMetrics.evaluatedControls} / ${assessmentMetrics.totalControls}\n${assessmentMetrics.evaluationPercent}%`, `${criticalGaps.length}\nImpact 3`, `${evidenceValidatedControls}\n${allEvidenceCount} preuve(s)`]],
    styles: { font: "helvetica", fontSize: 9, cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.15, valign: "top" },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
    margin: { left: 14, right: 14 },
  });

  let y = ((doc as any).lastAutoTable?.finalY || 108) + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(lang === "fr" ? "Synthèse exécutive" : "Executive summary", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y = addPdfWrappedText(doc, reportConclusion, 14, y, 182, 5) + 2;
  y = addPdfWrappedText(doc, assessmentCoverageNotice(assessmentMetrics, lang), 14, y, 182, 5) + 2;
  for (const rec of recommendations.slice(0, 5)) {
    y = addPdfWrappedText(doc, `• ${rec}`, 18, y, 176, 5);
  }

  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(lang === "fr" ? "Lecture des résultats" : "Reading the results", 14, 18);

  autoTable(doc, {
    startY: 25,
    head: [[lang === "fr" ? "Indicateur" : "Metric", lang === "fr" ? "Valeur" : "Value"]],
    body: [
      [lang === "fr" ? "Conforme" : "Compliant", conformControls],
      [lang === "fr" ? "Partiellement conforme" : "Partially compliant", partialControls],
      [lang === "fr" ? "Non conforme" : "Non-compliant", nonConformControls],
      [lang === "fr" ? "Non évalué" : "Not evaluated", notEvaluatedControls],
      [lang === "fr" ? "Non applicable" : "Not applicable", notApplicableControls],
      [lang === "fr" ? "Taux d’évaluation" : "Assessment coverage", `${assessmentMetrics.evaluationPercent}% (${assessmentMetrics.evaluatedControls} / ${assessmentMetrics.totalControls})`],
      [lang === "fr" ? "Contrôles avec preuve" : "Controls with evidence", evidenceAddedControls],
      [lang === "fr" ? "Preuves manquantes ou non validées" : "Missing or unvalidated evidence", missingProofs.length],
      [lang === "fr" ? "Évolution vs audit précédent" : "Change vs previous audit", delta === null ? "—" : `${delta >= 0 ? "+" : ""}${delta} pts (${baselinePercent}% → ${globalPercent}%) · ${lang === "fr" ? "couverture" : "coverage"} ${baselineMetrics?.evaluationPercent ?? 0}% → ${assessmentMetrics.evaluationPercent}%`],
    ],
    styles: { font: "helvetica", fontSize: 9, cellPadding: 2.3, lineColor: [226, 232, 240], lineWidth: 0.15 },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] },
    margin: { left: 14, right: 14 },
  });

  autoTable(doc, {
    startY: ((doc as any).lastAutoTable?.finalY || 80) + 8,
    head: [[lang === "fr" ? "Domaine" : "Domain", lang === "fr" ? "Maturité évaluée" : "Assessed maturity", lang === "fr" ? "Évaluation" : "Assessment", "Score", lang === "fr" ? "Écarts" : "Gaps", "Impact 3", lang === "fr" ? "Preuves à revoir" : "Evidence to review"]],
    body: domains
      .slice()
      .sort((a, b) => a.domain.localeCompare(b.domain, lang === "fr" ? "fr" : "en"))
      .map((d) => [d.domain, d.maturityCount ? `${d.percent}%\n${maturityLabel(d.percent, lang)}` : "—", `${d.evaluated} / ${d.count}\n${d.evaluationPercent}%`, `${d.points} / ${d.max}`, d.gaps, d.criticalGaps, d.missingProof]),
    styles: { font: "helvetica", fontSize: 8, cellPadding: 2, lineColor: [226, 232, 240], lineWidth: 0.15, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] },
    columnStyles: { 0: { cellWidth: 48 }, 1: { cellWidth: 27 }, 2: { cellWidth: 25 }, 3: { cellWidth: 22 }, 4: { cellWidth: 17 }, 5: { cellWidth: 19 }, 6: { cellWidth: 24 } },
    margin: { left: 14, right: 14 },
  });

  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(lang === "fr" ? "Priorités" : "Priorities", 14, 18);

  autoTable(doc, {
    startY: 25,
    head: [[lang === "fr" ? "Domaine prioritaire" : "Priority domain", "%", lang === "fr" ? "Écarts" : "Gaps", "P3"]],
    body: topDomains.map((d) => [d.domain, `${d.percent}%`, d.gaps, d.criticalGaps]),
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2, lineColor: [226, 232, 240], lineWidth: 0.15 },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] },
    margin: { left: 14, right: 14 },
  });

  autoTable(doc, {
    startY: ((doc as any).lastAutoTable?.finalY || 60) + 8,
    head: [[lang === "fr" ? "Réf." : "Ref", lang === "fr" ? "Domaine" : "Domain", "Impact", lang === "fr" ? "Priorité" : "Priority", lang === "fr" ? "Échéance" : "Due", lang === "fr" ? "Responsable" : "Owner", lang === "fr" ? "Action / preuve attendue" : "Action / expected evidence"]],
    body: (plannedActions.length ? plannedActions.slice(0, 25) : gaps.slice(0, 25).map((row) => ({ row, plan: undefined }))).map(({ row, plan }) => [
      row.ref,
      row.domain,
      row.impact,
      reportPriorityLabel(plan?.priority, lang),
      plan?.due ? formatDueHuman(plan.due, lang) : "—",
      pdfText(plan?.owner),
      reportShortText(plan?.comment, lang === "fr" ? "Créer une action avec responsable, échéance, preuve attendue et critère de clôture." : "Create an action with owner, due date, expected evidence and closure criterion.", 900),
    ]),
    styles: { font: "helvetica", fontSize: 7.5, cellPadding: 1.8, lineColor: [226, 232, 240], lineWidth: 0.15, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] },
    columnStyles: { 0: { cellWidth: 14 }, 1: { cellWidth: 35 }, 2: { cellWidth: 15, halign: "center" }, 3: { cellWidth: 23 }, 4: { cellWidth: 23 }, 5: { cellWidth: 25 }, 6: { cellWidth: 66 } },
    margin: { left: 14, right: 14 },
  });

  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(lang === "fr" ? "Liste détaillée des écarts" : "Detailed list of gaps", 14, 18);

  autoTable(doc, {
    startY: 25,
    head: [[lang === "fr" ? "Réf." : "Ref", lang === "fr" ? "Domaine" : "Domain", "Impact", lang === "fr" ? "Statut" : "Status", lang === "fr" ? "Point de contrôle" : "Control point", lang === "fr" ? "Preuve" : "Evidence", lang === "fr" ? "Plan d’action" : "Action plan"]],
    body: (gaps.length ? gaps : rows).map((g) => [
      g.ref,
      g.domain,
      g.impact,
      controlStatusLabel(g.realized, lang, true),
      g.description,
      `${evidenceStatusLabel(proofStatusFor(g.id), lang)}\n${evidenceMap?.[g.id]?.length || 0} ${lang === "fr" ? "preuve(s)" : "item(s)"}`,
      reportPlanSummary(plans?.[g.id], lang),
    ]),
    styles: { font: "helvetica", fontSize: 7.2, cellPadding: 1.7, lineColor: [226, 232, 240], lineWidth: 0.15, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] },
    columnStyles: { 0: { cellWidth: 14 }, 1: { cellWidth: 34 }, 2: { cellWidth: 14, halign: "center" }, 3: { cellWidth: 23 }, 4: { cellWidth: 50 }, 5: { cellWidth: 25 }, 6: { cellWidth: 42 } },
    margin: { left: 4, right: 4 },
  });

  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(lang === "fr" ? "Annexes" : "Appendices", 14, 18);

  autoTable(doc, {
    startY: 25,
    head: [[lang === "fr" ? "Preuves non validées - Réf." : "Unvalidated evidence - Ref", lang === "fr" ? "Domaine" : "Domain", lang === "fr" ? "Statut" : "Status"]],
    body: missingProofs.map((r) => [r.ref, r.domain, evidenceStatusLabel(proofStatusFor(r.id), lang)]),
    styles: { font: "helvetica", fontSize: 8, cellPadding: 2, lineColor: [226, 232, 240], lineWidth: 0.15, overflow: "linebreak" },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] },
    margin: { left: 14, right: 14 },
  });

  autoTable(doc, {
    startY: ((doc as any).lastAutoTable?.finalY || 70) + 8,
    head: [[lang === "fr" ? "Écarts sans plan - Réf." : "Gaps without plan - Ref", lang === "fr" ? "Domaine" : "Domain", "Impact"]],
    body: gapsWithoutPlan.map((r) => [r.ref, r.domain, r.impact]),
    styles: { font: "helvetica", fontSize: 8, cellPadding: 2, lineColor: [226, 232, 240], lineWidth: 0.15, overflow: "linebreak" },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] },
    margin: { left: 14, right: 14 },
  });

  addPdfPageNumbers(doc, `GapTrack · ${pdfText(sessionName)} · ${pdfDateStamp(lang)}`);
  doc.save(filename || `${safeExportFilename(sessionName || title, lang)}.pdf`);
}


// ==================
// Storage helpers
// ==================
function loadLegacyRows(): ControlItem[] | null {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) as ControlItem[] : null; } catch { return null; }
}
function loadSettings() { try { const raw = localStorage.getItem(STORAGE_SETTINGS); return raw ? JSON.parse(raw) : {}; } catch { return {}; } }
function saveSettings(s: any) { localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(s)); }

function normalizeEmail(value: string): string {
  return String(value || "").trim().toLowerCase();
}

function normalizeUserRole(value: any): UserRole {
  if (value === "admin" || value === "auditor" || value === "contributor" || value === "viewer") return value;
  return "viewer";
}

// ==================
// Security hardening helpers
// ==================
const SECURITY_MIN_PASSWORD_LENGTH = 12;
const SECURITY_MAX_PASSWORD_LENGTH = 128;
const EVIDENCE_MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per evidence file
const TEMPLATE_IMPORT_MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB per CSV/JSON template

const EVIDENCE_ALLOWED_EXTENSIONS = new Set([
  "pdf", "png", "jpg", "jpeg", "webp", "txt", "csv", "json", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
]);

const EVIDENCE_ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/csv",
  "application/json",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const EVIDENCE_BLOCKED_EXTENSIONS = new Set([
  "html", "htm", "svg", "js", "mjs", "cjs", "ts", "tsx", "jsx", "exe", "dll", "bat", "cmd", "com", "scr", "ps1", "sh", "php", "py", "jar", "msi", "apk",
]);

const EVIDENCE_ACCEPT_ATTRIBUTE = Array.from(EVIDENCE_ALLOWED_EXTENSIONS).map((ext) => `.${ext}`).join(",");

function getFileExtension(name: string): string {
  const match = String(name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
}

function isSafePathSegment(value: string): boolean {
  return /^[a-zA-Z0-9._-]{1,160}$/.test(String(value || "")) && !String(value).includes("..");
}

function resolveSafeMimeType(file: File): string {
  const declared = String(file.type || "").toLowerCase();
  return EVIDENCE_ALLOWED_MIME_TYPES.has(declared) ? declared : "application/octet-stream";
}

function validateEvidenceFile(file: File): string | null {
  const extension = getFileExtension(file.name);

  if (!file || file.size <= 0) return "Fichier invalide.";
  if (file.size > EVIDENCE_MAX_FILE_BYTES) return "Fichier trop volumineux : 10 Mo maximum.";
  if (!extension || EVIDENCE_BLOCKED_EXTENSIONS.has(extension)) return "Type de fichier interdit pour une preuve.";
  if (!EVIDENCE_ALLOWED_EXTENSIONS.has(extension)) return "Type de fichier non autorisé. Formats acceptés : PDF, images, Office, CSV, JSON, TXT.";

  const declared = String(file.type || "").toLowerCase();
  if (declared && !EVIDENCE_ALLOWED_MIME_TYPES.has(declared)) return "Type MIME non autorisé pour une preuve.";

  return null;
}

function validateTemplateImportFile(file: File, lang: LangKey): string | null {
  const extension = getFileExtension(file.name);
  const declared = String(file.type || "").toLowerCase();
  const validExtension = extension === "csv" || extension === "json";
  const validMime = !declared || declared === "text/csv" || declared === "application/csv" || declared === "application/json";

  if (!file || file.size <= 0) return lang === "fr" ? "Fichier invalide." : "Invalid file.";
  if (file.size > TEMPLATE_IMPORT_MAX_FILE_BYTES) return lang === "fr" ? "Template trop volumineux : 2 Mo maximum." : "Template too large: 2 MB maximum.";
  if (!validExtension || !validMime) return lang === "fr" ? "Import limité aux fichiers CSV ou JSON." : "Import is limited to CSV or JSON files.";

  return null;
}

function validatePasswordStrength(password: string, context: { email?: string; name?: string; organization?: string } = {}, lang: LangKey = "fr"): string | null {
  const value = String(password || "");
  const lower = value.toLowerCase();
  const forbiddenFragments = [context.email, context.name, context.organization]
    .map((part) => String(part || "").trim().toLowerCase())
    .filter((part) => part.length >= 4);

  if (value.length < SECURITY_MIN_PASSWORD_LENGTH) {
    return lang === "fr" ? `Mot de passe : ${SECURITY_MIN_PASSWORD_LENGTH} caractères minimum.` : `Password: at least ${SECURITY_MIN_PASSWORD_LENGTH} characters.`;
  }
  if (value.length > SECURITY_MAX_PASSWORD_LENGTH) {
    return lang === "fr" ? `Mot de passe : ${SECURITY_MAX_PASSWORD_LENGTH} caractères maximum.` : `Password: ${SECURITY_MAX_PASSWORD_LENGTH} characters maximum.`;
  }
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/[0-9]/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
    return lang === "fr" ? "Le mot de passe doit contenir minuscule, majuscule, chiffre et caractère spécial." : "Password must include lowercase, uppercase, number, and special character.";
  }
  if (forbiddenFragments.some((part) => lower.includes(part))) {
    return lang === "fr" ? "Le mot de passe ne doit pas contenir votre nom, organisation ou e-mail." : "Password must not include your name, organization, or email.";
  }
  return null;
}

function sanitizeUserForClientStorage(user: AppUser): AppUser {
  const { passwordHash: _removedPasswordHash, ...safeUser } = user;
  return {
    ...safeUser,
    email: normalizeEmail(safeUser.email),
    role: normalizeUserRole(safeUser.role),
    subscriptionPlan: normalizeSubscriptionPlan(safeUser.subscriptionPlan),
    active: safeUser.active !== false,
  };
}

function storagePathBelongsToEvidenceItem(
  storageKey: string | undefined,
  context: SupabaseUserContext,
  item?: Pick<EvidenceItem, "ownerUserId" | "groupId">
): boolean {
  if (!storageKey || !context?.userId || !context?.groupId) return false;
  const parts = String(storageKey).split("/");
  if (parts.length < 4 || !parts.every((part) => isSafePathSegment(part))) return false;

  // New shared storage path: <group_id>/<audit_id>/<control_id>/<file>
  if (parts[0] === context.groupId) return true;

  // Backward compatibility for files uploaded before group sharing.
  if (parts[0] === context.userId) return true;
  if (item?.ownerUserId && parts[0] === item.ownerUserId) return true;
  if (item?.groupId && parts[0] === item.groupId && item.groupId === context.groupId) return true;

  return false;
}

function userRoleLabel(role: UserRole | undefined, lang: LangKey): string {
  const r = normalizeUserRole(role);
  if (lang === "fr") {
    if (r === "admin") return "Admin";
    if (r === "auditor") return "Auditeur";
    if (r === "contributor") return "Contributeur";
    return "Lecteur";
  }
  if (r === "admin") return "Admin";
  if (r === "auditor") return "Auditor";
  if (r === "contributor") return "Contributor";
  return "Viewer";
}

function userRoleDescription(role: UserRole, lang: LangKey): string {
  if (lang === "fr") {
    if (role === "admin") return "Gère les utilisateurs, les audits et les paramètres.";
    if (role === "auditor") return "Crée et modifie les audits, statuts, plans et preuves.";
    if (role === "contributor") return "Ajoute des preuves et contribue aux plans.";
    return "Consulte les audits et les rapports en lecture seule.";
  }
  if (role === "admin") return "Manages users, audits and settings.";
  if (role === "auditor") return "Creates and edits audits, statuses, plans and evidence.";
  if (role === "contributor") return "Adds evidence and contributes to plans.";
  return "Reads audits and reports only.";
}

function userRoleBadgeClass(role: UserRole | undefined): string {
  const r = normalizeUserRole(role);
  if (r === "admin") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (r === "auditor") return "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  if (r === "contributor") return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "border-muted-foreground/30 bg-muted/20 text-muted-foreground";
}

function loadUsers(): AppUser[] {
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw || raw === "null" || raw === "undefined") return [];
  try {
    const val = JSON.parse(raw);
    if (!Array.isArray(val)) return [];
    return val
      .filter((u: any) => u && typeof u.id === "string" && typeof u.email === "string")
      .map((u: any) => sanitizeUserForClientStorage({
        id: String(u.id),
        name: String(u.name || u.email || "Utilisateur"),
        email: normalizeEmail(u.email),
        role: normalizeUserRole(u.role),
        organization: u.organization ? String(u.organization) : undefined,
        createdAt: u.createdAt ? String(u.createdAt) : new Date().toISOString(),
        lastLoginAt: u.lastLoginAt ? String(u.lastLoginAt) : undefined,
        active: u.active !== false,
        subscriptionPlan: normalizeSubscriptionPlan(u.subscriptionPlan),
        createdByUserId: u.createdByUserId ? String(u.createdByUserId) : undefined,
        createdByEmail: u.createdByEmail ? normalizeEmail(u.createdByEmail) : undefined,
        groupId: u.groupId ? String(u.groupId) : undefined,
        groupName: u.groupName ? String(u.groupName) : undefined,
      }))
      .filter((u: AppUser) => u.email);
  } catch {
    return [];
  }
}

function saveUsers(users: AppUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users.map(sanitizeUserForClientStorage)));
}


function saveActiveUserId(_id: string) {
  // Ne persiste plus l’utilisateur actif dans localStorage : la session Supabase est la source de vérité.
}

function clearActiveUserId() {
  try { localStorage.removeItem(ACTIVE_USER_KEY); } catch {}
}

function setLocalActorFromUser(user: AppUser | null) {
  try {
    if (!user) {
      localStorage.removeItem("grc_current_user");
      localStorage.removeItem("grc_user_email");
      return;
    }
    localStorage.setItem("grc_current_user", user.name || user.email);
    localStorage.setItem("grc_user_email", user.email);
  } catch {}
}

function userCanManageUsers(user: AppUser | null | undefined): boolean {
  return isServiceOwnerUser(user) || normalizeUserRole(user?.role) === "admin";
}

function userCanManageSubscriptions(user: AppUser | null | undefined): boolean {
  return normalizeEmail(user?.email || "") === normalizeEmail(PREMIUM_CONTACT_EMAIL);
}

function isServiceOwnerEmail(email: string | null | undefined): boolean {
  return normalizeEmail(email || "") === normalizeEmail(PREMIUM_CONTACT_EMAIL);
}

function isServiceOwnerUser(user: AppUser | null | undefined): boolean {
  return isServiceOwnerEmail(user?.email);
}

function userWasCreatedBy(candidate: AppUser, creator: AppUser | null | undefined): boolean {
  if (!creator) return false;
  return (
    Boolean(candidate.createdByUserId && candidate.createdByUserId === creator.id) ||
    Boolean(candidate.createdByEmail && normalizeEmail(candidate.createdByEmail) === normalizeEmail(creator.email))
  );
}

function normalizeGroupId(value: unknown): string | undefined {
  const cleaned = String(value || "").trim();
  return cleaned || undefined;
}

function safeGroupIdFromUser(user: AppUser): string {
  const base = user.id || normalizeEmail(user.email) || uuid();
  return `group-${String(base).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || uuid()}`;
}

function findCreatorForUser(candidate: AppUser, users: AppUser[]): AppUser | undefined {
  const createdByEmail = normalizeEmail(candidate.createdByEmail || "");
  return users.find((u) => (candidate.createdByUserId && u.id === candidate.createdByUserId) || (createdByEmail && normalizeEmail(u.email) === createdByEmail));
}

function createdByLabel(candidate: AppUser, users: AppUser[], lang: LangKey): string {
  const creator = findCreatorForUser(candidate, users);
  if (creator) return `${creator.name || creator.email} · ${creator.email}`;
  if (candidate.createdByEmail) return normalizeEmail(candidate.createdByEmail);
  return lang === "fr" ? "Inscription directe / groupe racine" : "Direct signup / root group";
}

function resolveGroupForUser(user: AppUser, users: AppUser[], lang: LangKey): { groupId?: string; groupName: string } {
  const ownGroupId = normalizeGroupId(user.groupId);
  const ownGroupName = String(user.groupName || "").trim();
  if (ownGroupName) return { groupId: ownGroupId, groupName: ownGroupName };

  if (ownGroupId) {
    const sameGroup = users.find((u) => normalizeGroupId(u.groupId) === ownGroupId && String(u.groupName || "").trim());
    if (sameGroup?.groupName) return { groupId: ownGroupId, groupName: sameGroup.groupName };
  }

  const creator = findCreatorForUser(user, users);
  if (creator?.groupName) return { groupId: normalizeGroupId(creator.groupId), groupName: creator.groupName };

  const ownedUserWithGroup = users.find((u) => userWasCreatedBy(u, user) && String(u.groupName || "").trim());
  if (ownedUserWithGroup?.groupName) return { groupId: normalizeGroupId(ownedUserWithGroup.groupId), groupName: ownedUserWithGroup.groupName };

  return { groupId: ownGroupId, groupName: lang === "fr" ? "Groupe non défini" : "Group not set" };
}

function resolveManagedGroupForCreator(creator: AppUser, users: AppUser[], lang: LangKey): { groupId: string; groupName: string } {
  const existing = resolveGroupForUser(creator, users, lang);
  if (existing.groupId && existing.groupName && !/non défini|not set/i.test(existing.groupName)) {
    return { groupId: existing.groupId, groupName: existing.groupName };
  }

  const createdUserWithGroup = users.find((u) => userWasCreatedBy(u, creator) && normalizeGroupId(u.groupId) && String(u.groupName || "").trim());
  if (createdUserWithGroup?.groupId && createdUserWithGroup.groupName) {
    return { groupId: createdUserWithGroup.groupId, groupName: createdUserWithGroup.groupName };
  }

  const knownGroups = new Set(
    users
      .filter((u) => !isServiceOwnerEmail(u.email))
      .map((u) => String(u.groupName || "").trim().toLowerCase())
      .filter(Boolean)
  );
  const groupName = lang === "fr" ? `Groupe ${Math.max(1, knownGroups.size + 1)}` : `Group ${Math.max(1, knownGroups.size + 1)}`;
  return { groupId: safeGroupIdFromUser(creator), groupName };
}

function usersShareManagedGroup(a: AppUser | null | undefined, b: AppUser | null | undefined): boolean {
  if (!a || !b) return false;
  const aGroupId = normalizeGroupId(a.groupId);
  const bGroupId = normalizeGroupId(b.groupId);
  if (aGroupId && bGroupId && aGroupId === bGroupId) return true;
  const aGroupName = String(a.groupName || "").trim().toLowerCase();
  const bGroupName = String(b.groupName || "").trim().toLowerCase();
  return Boolean(aGroupName && bGroupName && aGroupName === bGroupName);
}

function userRecordFromProfileRow(row: any): AppUser | null {
  if (row?.deleted_at) return null;
  const email = normalizeEmail(row?.email || "");
  if (!email) return null;
  return sanitizeUserForClientStorage({
    id: String(row?.id || uuid()),
    name: typeof row?.name === "string" && row.name.trim() ? row.name.trim() : email,
    email,
    role: normalizeUserRole(row?.role),
    organization: typeof row?.organization === "string" && row.organization.trim() ? row.organization.trim() : undefined,
    createdAt: typeof row?.created_at === "string" ? row.created_at : new Date().toISOString(),
    active: typeof row?.active === "boolean" ? row.active : true,
    subscriptionPlan: normalizeSubscriptionPlan(row?.subscription_plan),
    createdByUserId: typeof row?.created_by_user_id === "string" && row.created_by_user_id.trim() ? row.created_by_user_id : undefined,
    createdByEmail: typeof row?.created_by_email === "string" && row.created_by_email.trim() ? normalizeEmail(row.created_by_email) : undefined,
    groupId: typeof row?.group_id === "string" && row.group_id.trim() ? row.group_id.trim() : undefined,
    groupName: typeof row?.group_name === "string" && row.group_name.trim() ? row.group_name.trim() : undefined,
  });
}

function mergeUsersByEmail(localUsers: AppUser[], incomingUsers: AppUser[]): AppUser[] {
  // Supabase is the source of truth for the user list.
  // We only preserve a few harmless local fields for users that still exist on the server.
  // This prevents deleted/soft-deleted users from reappearing from localStorage.
  const localByEmail = new Map<string, AppUser>();

  for (const user of localUsers) {
    const key = normalizeEmail(user.email);
    if (!key) continue;
    localByEmail.set(key, user);
  }

  const nextByEmail = new Map<string, AppUser>();

  for (const incoming of incomingUsers) {
    const key = normalizeEmail(incoming.email);
    if (!key) continue;

    const existing = localByEmail.get(key);

    nextByEmail.set(key, sanitizeUserForClientStorage({
      ...existing,
      ...incoming,
      id: incoming.id || existing?.id || uuid(),
      createdAt: incoming.createdAt || existing?.createdAt || new Date().toISOString(),
      lastLoginAt: existing?.lastLoginAt || incoming.lastLoginAt,
      createdByUserId: incoming.createdByUserId,
      createdByEmail: incoming.createdByEmail,
      groupId: incoming.groupId,
      groupName: incoming.groupName,
    }));
  }

  return Array.from(nextByEmail.values()).sort((a, b) => {
    const ga = String(a.groupName || "");
    const gb = String(b.groupName || "");
    if (ga !== gb) return ga.localeCompare(gb);
    return String(a.name || a.email).localeCompare(String(b.name || b.email));
  });
}

async function fetchManageableUserProfilesOnServer(activeUser: AppUser): Promise<AppUser[]> {
  const profileColumns = "id, email, name, organization, role, subscription_plan, active, created_at, created_by_user_id, created_by_email, group_id, group_name, deleted_at";

  const parseRows = (rows: any[] | null | undefined) => (rows || [])
    .map(userRecordFromProfileRow)
    .filter((u): u is AppUser => Boolean(u));

  const rpcNames = userCanManageSubscriptions(activeUser)
    ? ["gaptrack_owner_list_user_profiles", "gaptrack_list_user_profiles"]
    : ["gaptrack_group_list_user_profiles"];

  for (const rpcName of rpcNames) {
    try {
      const { data, error } = await supabase.rpc(rpcName);
      if (!error && Array.isArray(data)) return parseRows(data);
      if (error) console.warn(`Unable to load profiles via ${rpcName}.`, error);
    } catch (error) {
      console.warn(`Unable to load profiles via ${rpcName}.`, error);
    }
  }

  const selectAttempts = [
    profileColumns,
    "id, email, name, organization, role, subscription_plan, active, created_at, created_by_user_id, created_by_email, deleted_at",
    "id, email, name, organization, role, subscription_plan, created_at",
  ];

  for (const columns of selectAttempts) {
    const result = await supabase
      .from("gaptrack_profiles")
      .select(columns)
      .order("created_at", { ascending: false });

    if (!result.error) return parseRows(result.data as any[]);

    const message = String(result.error.message || "").toLowerCase();
    if (!message.includes("active") && !message.includes("created_by") && !message.includes("group_")) {
      console.warn("Unable to load manageable GapTrack profiles.", result.error);
      break;
    }
  }

  return [];
}

function userCanViewUserRecord(viewer: AppUser | null | undefined, candidate: AppUser): boolean {
  if (!userCanManageUsers(viewer)) return false;
  if (userCanManageSubscriptions(viewer)) return true;
  if (isServiceOwnerEmail(candidate.email)) return false;
  if (viewer?.id === candidate.id) return true;
  return userWasCreatedBy(candidate, viewer) || usersShareManagedGroup(viewer, candidate);
}

function userCanModifyUserRecord(editor: AppUser | null | undefined, candidate: AppUser): boolean {
  if (!userCanManageUsers(editor)) return false;
  if (userCanManageSubscriptions(editor)) return true;
  if (isServiceOwnerEmail(candidate.email)) return false;
  if (editor?.id === candidate.id) return true;
  return userWasCreatedBy(candidate, editor) || usersShareManagedGroup(editor, candidate);
}

function isExistingSupabaseAccountError(error: { message?: string; status?: number } | null | undefined): boolean {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.status === 422 ||
    message.includes("already registered") ||
    message.includes("already exists") ||
    message.includes("user already") ||
    message.includes("email already")
  );
}

function userCanCreateUsers(user: AppUser | null | undefined): boolean {
  return userCanManageUsers(user) && (isPremiumPlan(user?.subscriptionPlan) || userCanManageSubscriptions(user));
}

function userCanEditAudit(user: AppUser | null | undefined): boolean {
  if (isServiceOwnerUser(user)) return false;
  const role = normalizeUserRole(user?.role);
  return role === "admin" || role === "auditor" || role === "contributor";
}

function userCanReviewEvidence(user: AppUser | null | undefined): boolean {
  if (isServiceOwnerUser(user)) return false;
  const role = normalizeUserRole(user?.role);
  return role === "admin" || role === "auditor";
}

function userCanManageAudits(user: AppUser | null | undefined): boolean {
  if (isServiceOwnerUser(user)) return false;
  const role = normalizeUserRole(user?.role);
  return role === "admin" || role === "auditor";
}

function userCanDeleteAudits(user: AppUser | null | undefined): boolean {
  if (isServiceOwnerUser(user)) return false;
  return normalizeUserRole(user?.role) === "admin";
}


// ==================
// Templates helpers
// ==================
const BUILT_IN_FRAMEWORK_CATALOG_PATHS = [
  "/frameworks/iso-27001-2022-annex-a.json",
];

function parseBuiltInFrameworkCatalog(value: unknown): ChecklistTemplate {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid built-in framework catalog.");
  }

  const raw = value as Partial<BuiltInFrameworkCatalog> & Record<string, unknown>;
  const frameworkId = normalizeLoadedFrameworkId(raw.frameworkId);
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const version = typeof raw.version === "string" ? raw.version.trim() : "";
  const revision = typeof raw.revision === "string" ? raw.revision.trim() : "";
  const sourceUrl = typeof raw.sourceUrl === "string" ? raw.sourceUrl.trim() : "";
  const sourceNotice = typeof raw.notice === "string" ? raw.notice.trim() : "";
  const publishedAt = typeof raw.publishedAt === "string" ? raw.publishedAt.trim() : "";

  if (raw.schemaVersion !== 1 || !frameworkId || !id || !name || !version || !revision || !sourceUrl || !sourceNotice) {
    throw new Error("Incomplete built-in framework catalog metadata.");
  }
  if (!Array.isArray(raw.rows)) throw new Error("Built-in framework catalog rows are missing.");

  const rows = (raw.rows as unknown[]).map((row) => {
    const item = row && typeof row === "object" && !Array.isArray(row)
      ? row as Record<string, unknown>
      : {};
    return {
      ref: String(item.ref ?? "").trim(),
      domain: String(item.domain ?? "").trim(),
      impact: normalizeImpact(item.impact),
      description: String(item.description ?? "").trim(),
    };
  }).filter((row) => row.ref && row.domain && row.description);

  const expectedCount = typeof raw.controlCount === "number" ? raw.controlCount : 0;
  const uniqueRefs = new Set(rows.map((row) => row.ref));
  if (!expectedCount || rows.length !== expectedCount || uniqueRefs.size !== rows.length) {
    throw new Error("Built-in framework catalog control count or references are invalid.");
  }
  if (frameworkId === "ISO27001" && version === "2022" && rows.length !== 93) {
    throw new Error("The ISO/IEC 27001:2022 Annex A assessment catalog must contain 93 controls.");
  }

  return {
    id,
    name,
    frameworkId,
    version,
    builtIn: true,
    catalogId: id,
    revision,
    sourceUrl,
    sourceNotice,
    createdAt: publishedAt || new Date().toISOString(),
    rows,
  };
}

async function loadBuiltInTemplates(): Promise<ChecklistTemplate[]> {
  const results = await Promise.allSettled(BUILT_IN_FRAMEWORK_CATALOG_PATHS.map(async (path) => {
    const response = await fetch(path, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Unable to load ${path} (${response.status}).`);
    return parseBuiltInFrameworkCatalog(await response.json());
  }));

  const templates: ChecklistTemplate[] = [];
  results.forEach((result) => {
    if (result.status === "fulfilled") templates.push(result.value);
    else console.error("Unable to load a built-in framework catalog.", result.reason);
  });
  return templates;
}

function loadTemplates(): ChecklistTemplate[] {
  const raw = localStorage.getItem(TEMPLATES_KEY);
  if (!raw || raw === "null" || raw === "undefined") return [];
  try {
    const val = JSON.parse(raw);
    if (!Array.isArray(val)) return [];
    return val
      .filter((t: any) => t && typeof t === "object" && typeof t.id === "string" && typeof t.name === "string" && typeof t.frameworkId === "string" && Array.isArray(t.rows))
      .map((t: any) => {
        const fw = normalizeLoadedFrameworkId(t.frameworkId);
        if (!fw) return null;
        return {
          id: String(t.id),
          name: String(t.name),
          frameworkId: fw,
          version: t.version ? String(t.version) : undefined,
          builtIn: false,
          createdAt: t.createdAt ? String(t.createdAt) : new Date().toISOString(),
          rows: (t.rows as any[])
            .map((r: any) => ({
              ref: String(r.ref ?? "").trim(),
              domain: String(r.domain ?? "").trim(),
              impact: normalizeImpact(r.impact),
              description: String(r.description ?? "").trim(),
            }))
            .filter((r) => r.ref || r.description),
        } as ChecklistTemplate;
      })
      .filter(Boolean) as ChecklistTemplate[];
  } catch {
    return [];
  }
}

function saveTemplates(list: ChecklistTemplate[]) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(list.filter((template) => !template.builtIn)));
}

function loadLastTemplateByFramework(): Record<string, string> {
  const raw = localStorage.getItem(LAST_TEMPLATE_BY_FRAMEWORK_KEY);
  if (!raw || raw === "null" || raw === "undefined") return {};
  try {
    const val = JSON.parse(raw);
    if (val && typeof val === "object" && !Array.isArray(val)) return val as Record<string, string>;
    return {};
  } catch {
    return {};
  }
}

function saveLastTemplateByFramework(m: Record<string, string>) {
  localStorage.setItem(LAST_TEMPLATE_BY_FRAMEWORK_KEY, JSON.stringify(m));
}

function normalizeImpact(v: any): 1 | 2 | 3 {
  const n = typeof v === "string" ? parseInt(v, 10) : (typeof v === "number" ? v : 2);
  if (n === 1 || n === 2 || n === 3) return n;
  if (n <= 1) return 1;
  if (n >= 3) return 3;
  return 2;
}

function templateRowsToControlItems(rows: TemplateRow[]): ControlItem[] {
  return rows
    .map((r, i) => ({
      id: uuid(),
      ref: String(r.ref ?? "").trim() || `R${i + 1}`,
      domain: String(r.domain ?? "").trim() || "General",
      impact: normalizeImpact((r as any).impact),
      description: String(r.description ?? "").trim(),
      realized: -2 as const,
    }))
    .filter((r) => r.description || r.ref);
}

function detectCsvSeparator(headerLine: string): string {
  // common cases: ";" in FR exports, "," in EN exports, or tab
  const semi = (headerLine.match(/;/g) || []).length;
  const comma = (headerLine.match(/,/g) || []).length;
  const tab = (headerLine.match(/\t/g) || []).length;
  if (tab >= semi && tab >= comma) return "\t";
  return semi >= comma ? ";" : ",";
}

function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === sep && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseTemplateFromCSV(csvText: string): TemplateRow[] {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const sep = detectCsvSeparator(lines[0]);
  const header = splitCsvLine(lines[0], sep).map(h => h.toLowerCase().replace(/\s+/g, ""));
  const idx = (keys: string[]) => header.findIndex(h => keys.includes(h));
  const iRef = idx(["ref","reference","controle","contrôle","id","code"]);
  const iDomain = idx(["domain","domaine","categorie","catégorie","family","famille"]);
  const iImpact = idx(["impact","poids","weight","criticality","criticite","criticité","priorite","priorité"]);
  const iDesc = idx(["description","controlpoint","pointdecontrole","pointdecontrôle","controlepoint","libelle","libellé","title","intitule","intitulé"]);

  const out: TemplateRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i], sep);
    const ref = iRef >= 0 ? (cols[iRef] ?? "") : "";
    const domain = iDomain >= 0 ? (cols[iDomain] ?? "") : "";
    const impactRaw = iImpact >= 0 ? (cols[iImpact] ?? "") : "2";
    const desc = iDesc >= 0 ? (cols[iDesc] ?? "") : (cols[cols.length - 1] ?? "");
    if (!ref && !desc) continue;
    out.push({
      ref: String(ref).trim(),
      domain: String(domain).trim() || "General",
      impact: normalizeImpact(impactRaw),
      description: String(desc).trim(),
    });
  }
  return out;
}

function parseTemplateFromJSON(jsonText: string): { name?: string; version?: string; rows: TemplateRow[] } {
  const obj = JSON.parse(jsonText);
  const arr = Array.isArray(obj) ? obj
    : Array.isArray(obj?.rows) ? obj.rows
    : Array.isArray(obj?.controls) ? obj.controls
    : Array.isArray(obj?.items) ? obj.items
    : [];
  const rows: TemplateRow[] = (arr as any[]).map((r: any) => ({
    ref: String(r.ref ?? r.reference ?? r.id ?? "").trim(),
    domain: String(r.domain ?? r.domaine ?? r.category ?? "General").trim() || "General",
    impact: normalizeImpact(r.impact ?? r.weight ?? r.criticality ?? 2),
    description: String(r.description ?? r.title ?? r.libelle ?? r["controlPoint"] ?? "").trim(),
  })).filter(r => r.ref || r.description);
  const name = !Array.isArray(obj) ? (obj?.name ? String(obj.name) : undefined) : undefined;
  const version = !Array.isArray(obj) ? (obj?.version ? String(obj.version) : undefined) : undefined;
  return { name, version, rows };
}

async function readFileAsText(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result ?? ""));
    fr.onerror = () => reject(fr.error);
    fr.readAsText(file);
  });
}

async function importTemplateFile(frameworkId: FrameworkId, file: File): Promise<ChecklistTemplate> {
  const text = await readFileAsText(file);
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  let parsed: { name?: string; version?: string; rows: TemplateRow[] } = { rows: [] };
  if (ext === 'csv') {
    parsed.rows = parseTemplateFromCSV(text);
  } else {
    // default JSON
    parsed = parseTemplateFromJSON(text);
    if (!parsed.rows.length && text.trim().startsWith("ref")) {
      parsed.rows = parseTemplateFromCSV(text);
    }
  }
  const tpl: ChecklistTemplate = {
    id: uuid(),
    name: parsed.name || file.name.replace(/\.(json|csv)$/i, ""),
    frameworkId,
    version: parsed.version,
    createdAt: new Date().toISOString(),
    rows: parsed.rows,
  };
  return tpl;
}

// ==================
// Template model downloads (CSV/JSON)
// ==================
function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function templateModelCSV(frameworkId: FrameworkId, lang: LangKey): string {
  // Excel FR often expects ";" + UTF-8 BOM for accents.
  const delimiter = lang === "fr" ? ";" : ",";
  const NEWLINE = "\r\n";
  const header = ["ref", "domain", "impact", "description"];
  const exampleDomain = lang === "fr" ? "Organisation" : "Organization";
  const exampleRef = frameworkId === "ISO27001" ? "A.5.1" : "1.1";
  const exampleDesc =
    lang === "fr"
      ? "EXEMPLE (à remplacer) : contrôle interne / exigence de sécurité"
      : "EXAMPLE (replace): internal control / security requirement";

  const esc = (v: unknown) => {
    const str = String(v ?? "").replace(/\r?\n/g, " ");
    const safe = str.replaceAll('"', '""');
    return `"${safe}"`;
  };

  const rows = [
    header,
    [exampleRef, exampleDomain, "2", exampleDesc],
  ];

  const csv = (lang === "fr" ? "\uFEFF" : "") + rows.map((r) => r.map(esc).join(delimiter)).join(NEWLINE);
  return csv;
}

function templateModelJSON(frameworkId: FrameworkId, lang: LangKey): string {
  const name =
    lang === "fr"
      ? `Modèle ${frameworkId} (à compléter)`
      : `${frameworkId} template (fill me)`;
  const version = frameworkId === "ISO27001" ? "2022" : "1.0";
  const exampleDomain = lang === "fr" ? "Organisation" : "Organization";
  const exampleRef = frameworkId === "ISO27001" ? "A.5.1" : "1.1";
  const exampleDesc =
    lang === "fr"
      ? "EXEMPLE (à remplacer) : contrôle interne / exigence de sécurité"
      : "EXAMPLE (replace): internal control / security requirement";

  const payload = {
    name,
    version,
    rows: [
      { ref: exampleRef, domain: exampleDomain, impact: 2, description: exampleDesc },
    ],
  };

  return JSON.stringify(payload, null, 2);
}




// ==================
// Backend Supabase (audits, snapshots, journal)
// ==================
const AUDIT_SESSIONS_TABLE = "gaptrack_audit_sessions";

type SnapshotPayload = {
  rows: ControlItem[];
  evidenceMap: Record<string, EvidenceItem[]>;
  plans: Record<string, PlanAction>;
  proofStatusMap?: EvidenceStatusMap;
  auditLog?: AuditLogEntry[];
};

function normalizeSnapshotPayload(value: unknown): SnapshotPayload {
  const data = value && typeof value === "object" ? value as Partial<SnapshotPayload> : {};
  return {
    rows: Array.isArray(data.rows) ? data.rows : [],
    evidenceMap: data.evidenceMap && typeof data.evidenceMap === "object" ? data.evidenceMap : {},
    plans: data.plans && typeof data.plans === "object" ? data.plans : {},
    proofStatusMap: data.proofStatusMap && typeof data.proofStatusMap === "object" ? data.proofStatusMap : {},
    auditLog: Array.isArray(data.auditLog) ? data.auditLog : [],
  };
}

function normalizeBackendSession(value: any): Session | null {
  if (!value || typeof value !== "object") return null;
  if (typeof value.id !== "string" || typeof value.name !== "string" || typeof value.createdAt !== "string") return null;
  return {
    id: value.id,
    name: value.name,
    createdAt: value.createdAt,
    bootstrap: value.bootstrap === true,
    frameworkId: typeof value.frameworkId === "string" ? value.frameworkId : undefined,
    frameworkVersion: typeof value.frameworkVersion === "string" ? value.frameworkVersion : undefined,
    frameworkCatalogId: typeof value.frameworkCatalogId === "string" ? value.frameworkCatalogId : undefined,
    frameworkCatalogRevision: typeof value.frameworkCatalogRevision === "string" ? value.frameworkCatalogRevision : undefined,
    scope: typeof value.scope === "string" ? value.scope : undefined,
    criticality: value.criticality === "low" || value.criticality === "medium" || value.criticality === "high" ? value.criticality : undefined,
    templateId: typeof value.templateId === "string" ? value.templateId : undefined,
    organization: typeof value.organization === "string" ? value.organization : undefined,
    auditor: typeof value.auditor === "string" ? value.auditor : undefined,
    sponsor: typeof value.sponsor === "string" ? value.sponsor : undefined,
    auditDate: typeof value.auditDate === "string" ? value.auditDate : undefined,
    auditType: value.auditType === "initial" || value.auditType === "follow_up" || value.auditType === "internal" || value.auditType === "external" ? value.auditType : undefined,
    objectives: typeof value.objectives === "string" ? value.objectives : undefined,
    context: typeof value.context === "string" ? value.context : undefined,
  };
}

function withoutGroupId<T extends Record<string, unknown>>(row: T): Omit<T, "group_id"> {
  const legacyRow = { ...row };
  delete legacyRow.group_id;
  return legacyRow;
}

async function getSupabaseUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id) throw error || new Error("Utilisateur non connecté.");
  return data.user.id;
}

type SupabaseUserContext = {
  userId: string;
  groupId: string;
  groupName?: string;
};

function fallbackGroupIdForUserId(userId: string): string {
  return `group-${String(userId || uuid()).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "")}`;
}

function safeSharedGroupId(value: string | undefined, userId: string): string {
  const fallback = fallbackGroupIdForUserId(userId);
  const candidate = String(value || fallback).trim();
  return isSafePathSegment(candidate) ? candidate : fallback;
}

async function getSupabaseUserContext(): Promise<SupabaseUserContext> {
  const userId = await getSupabaseUserId();
  let groupId: string | undefined;
  let groupName: string | undefined;

  try {
    const { data, error } = await supabase
      .from("gaptrack_profiles")
      .select("group_id, group_name")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data) {
      groupId = typeof data.group_id === "string" && data.group_id.trim() ? data.group_id.trim() : undefined;
      groupName = typeof data.group_name === "string" && data.group_name.trim() ? data.group_name.trim() : undefined;
    }
  } catch (error) {
    console.warn("Unable to read GapTrack group context; using a personal fallback group.", error);
  }

  const safeGroupId = safeSharedGroupId(groupId, userId);

  // If an old profile has no group yet, initialize a stable personal group.
  // When an admin creates users, the same group_id is then reused by all members.
  if (!groupId || groupId !== safeGroupId) {
    try {
      await supabase
        .from("gaptrack_profiles")
        .update({
          group_id: safeGroupId,
          group_name: groupName || "Groupe 1",
        })
        .eq("id", userId);
    } catch (error) {
      console.warn("Unable to persist GapTrack fallback group on profile.", error);
    }
  }

  return {
    userId,
    groupId: safeGroupId,
    groupName,
  };
}

async function loadSessionsFromBackend(): Promise<Session[]> {
  const context = await getSupabaseUserContext();

  const primaryResult = await supabase
    .from(AUDIT_SESSIONS_TABLE)
    .select("session, group_id, updated_at")
    .eq("group_id", context.groupId)
    .order("updated_at", { ascending: false });

  let rows: unknown[] = primaryResult.data || [];
  let queryError = primaryResult.error;

  // Compatibility with databases where the group_id migration has not been applied yet.
  if (queryError && String(queryError.message || "").toLowerCase().includes("group_id")) {
    const legacyResult = await supabase
      .from(AUDIT_SESSIONS_TABLE)
      .select("session, updated_at")
      .eq("owner_user_id", context.userId)
      .order("updated_at", { ascending: false });
    rows = legacyResult.data || [];
    queryError = legacyResult.error;
  }

  if (queryError) throw queryError;

  return rows
    .map((row: any) => normalizeBackendSession(row.session))
    .filter(Boolean) as Session[];
}

async function updateAuditSessionMetadataOnBackend(session: Session): Promise<void> {
  const context = await getSupabaseUserContext();
  const patch = {
    session,
    updated_at: new Date().toISOString(),
  };

  let result = await supabase
    .from(AUDIT_SESSIONS_TABLE)
    .update(patch)
    .eq("id", session.id)
    .eq("group_id", context.groupId)
    .select("id");

  if (result.error && String(result.error.message || "").toLowerCase().includes("group_id")) {
    result = await supabase
      .from(AUDIT_SESSIONS_TABLE)
      .update(patch)
      .eq("id", session.id)
      .eq("owner_user_id", context.userId)
      .select("id");
  }

  if (result.error) throw result.error;
  if (!Array.isArray(result.data) || result.data.length === 0) {
    throw new Error("Audit introuvable : ses métadonnées n’ont pas été enregistrées.");
  }
}

async function createAuditSessionOnBackend(session: Session, snapshot: SnapshotPayload): Promise<void> {
  const context = await getSupabaseUserContext();
  const payload = {
    id: session.id,
    owner_user_id: context.userId,
    group_id: context.groupId,
    session,
    state: normalizeSnapshotPayload(snapshot),
    updated_at: new Date().toISOString(),
  };

  let result = await supabase.from(AUDIT_SESSIONS_TABLE).insert(payload);
  if (result.error && String(result.error.message || "").toLowerCase().includes("group_id")) {
    result = await supabase.from(AUDIT_SESSIONS_TABLE).insert(withoutGroupId(payload));
  }
  if (result.error) throw result.error;
}

async function evidenceStoragePathsReferencedByOtherAudits(
  deletedAuditId: string,
  context: SupabaseUserContext
): Promise<Set<string>> {
  const primaryResult = await supabase
    .from(AUDIT_SESSIONS_TABLE)
    .select("id, state")
    .eq("group_id", context.groupId)
    .neq("id", deletedAuditId);

  let rows: any[] = primaryResult.data || [];
  let queryError = primaryResult.error;
  if (queryError && String(queryError.message || "").toLowerCase().includes("group_id")) {
    const legacyResult = await supabase
      .from(AUDIT_SESSIONS_TABLE)
      .select("id, state")
      .eq("owner_user_id", context.userId)
      .neq("id", deletedAuditId);
    rows = legacyResult.data || [];
    queryError = legacyResult.error;
  }
  if (queryError) throw queryError;

  const referenced = new Set<string>();
  for (const row of rows) {
    const snapshot = normalizeSnapshotPayload(row?.state);
    for (const item of Object.values(snapshot.evidenceMap).flat()) {
      if (item?.storageKind === "backend" && item.storageKey) referenced.add(item.storageKey);
    }
  }

  const primaryEvidenceResult = await supabase
    .from("gaptrack_evidence_files")
    .select("storage_path")
    .eq("group_id", context.groupId)
    .neq("audit_session_id", deletedAuditId);
  let evidenceRows: any[] = primaryEvidenceResult.data || [];
  let evidenceError = primaryEvidenceResult.error;
  if (evidenceError && String(evidenceError.message || "").toLowerCase().includes("group_id")) {
    const legacyEvidenceResult = await supabase
      .from("gaptrack_evidence_files")
      .select("storage_path")
      .eq("owner_user_id", context.userId)
      .neq("audit_session_id", deletedAuditId);
    evidenceRows = legacyEvidenceResult.data || [];
    evidenceError = legacyEvidenceResult.error;
  }
  if (evidenceError) throw evidenceError;
  for (const row of evidenceRows) {
    if (typeof row?.storage_path === "string" && row.storage_path) referenced.add(row.storage_path);
  }
  return referenced;
}

async function deleteAuditSessionFromBackend(sessionId: string | null | undefined): Promise<void> {
  if (!sessionId) return;
  const context = await getSupabaseUserContext();
  const snapshot = await apiGetSnapshot(sessionId).catch(() => null);
  const backendEvidenceMap = await fetchBackendEvidenceMapForSession(sessionId).catch(() => ({}));
  const evidenceMap = mergeEvidenceMaps(snapshot?.evidenceMap || {}, backendEvidenceMap);
  const referencedElsewhere = await evidenceStoragePathsReferencedByOtherAudits(sessionId, context).catch((error) => {
    console.warn("Unable to verify shared evidence references; physical file cleanup is skipped.", error);
    return null;
  });

  let result = await supabase
    .from(AUDIT_SESSIONS_TABLE)
    .delete()
    .eq("id", sessionId)
    .eq("group_id", context.groupId)
    .select("id");

  if (result.error && String(result.error.message || "").toLowerCase().includes("group_id")) {
    result = await supabase
      .from(AUDIT_SESSIONS_TABLE)
      .delete()
      .eq("id", sessionId)
      .eq("owner_user_id", context.userId)
      .select("id");
  }

  if (result.error) throw result.error;
  if (!Array.isArray(result.data) || result.data.length === 0) {
    throw new Error("Audit introuvable : la suppression n’a pas été confirmée par le serveur.");
  }

  for (const item of Object.values(evidenceMap).flat()) {
    try {
      if (item.storageKind === "backend" && item.storageKey && referencedElsewhere && !referencedElsewhere.has(item.storageKey)) {
        await deleteBackendEvidenceItem(item);
      } else if (item.storageKind === "indexeddb" && item.storageKey) {
        await deleteEvidenceFile(item.storageKey);
      }
    } catch (error) {
      console.warn("Audit deleted, but one evidence file could not be cleaned up.", error);
    }
  }
}

async function apiGetSnapshot(auditId: string): Promise<SnapshotPayload | null> {
  const context = await getSupabaseUserContext();
  let result = await supabase
    .from(AUDIT_SESSIONS_TABLE)
    .select("state")
    .eq("id", auditId)
    .eq("group_id", context.groupId)
    .maybeSingle();

  if (result.error && String(result.error.message || "").toLowerCase().includes("group_id")) {
    result = await supabase
      .from(AUDIT_SESSIONS_TABLE)
      .select("state")
      .eq("id", auditId)
      .eq("owner_user_id", context.userId)
      .maybeSingle();
  }

  if (result.error) throw result.error;
  return result.data?.state == null ? null : normalizeSnapshotPayload(result.data.state);
}

async function apiPutSnapshot(auditId: string, payload: SnapshotPayload): Promise<void> {
  const context = await getSupabaseUserContext();
  const updatePatch = {
    state: payload,
    updated_at: new Date().toISOString(),
  };

  let updateResult = await supabase
    .from(AUDIT_SESSIONS_TABLE)
    .update(updatePatch)
    .eq("id", auditId)
    .eq("group_id", context.groupId)
    .select("id");

  if (updateResult.error && String(updateResult.error.message || "").toLowerCase().includes("group_id")) {
    updateResult = await supabase
      .from(AUDIT_SESSIONS_TABLE)
      .update(updatePatch)
      .eq("id", auditId)
      .eq("owner_user_id", context.userId)
      .select("id");
  }

  if (updateResult.error) throw updateResult.error;
  if (!Array.isArray(updateResult.data) || updateResult.data.length === 0) {
    throw new Error("Audit introuvable : la sauvegarde a été refusée pour éviter de recréer un audit supprimé.");
  }
}

async function loadDefaultAuditRows(): Promise<ControlItem[]> {
  const response = await fetch("/listing.json");
  if (!response.ok) throw new Error(`Unable to load listing.json (${response.status}).`);
  const value = await response.json();
  return Array.isArray(value) ? value as ControlItem[] : [];
}

















// Seed rows helper used when creating or resetting a session
function seedRowsFrom(current: ControlItem[]): ControlItem[] {
  if (current && current.length) return current.map((r) => ({ ...r, realized: -2 as ControlStatus }));
  const legacy = loadLegacyRows();
  if (legacy && legacy.length) return legacy.map((r) => ({ ...r }));
  if (FIXED_LISTING && FIXED_LISTING.length) return FIXED_LISTING.map((r) => ({ ...r }));
  return [];
}


// ==================
// Theming CSS (dark that actually darkens surfaces)
// ==================
const THEME_CSS = `
:root{
  --background:#ffffff;
  --foreground:#0b1220;
  --muted:#f1f5f9;
  --muted-foreground:#64748b;
  --border:#e2e8f0;
  --card:#ffffff;
  --card-foreground:#0b1220;
  --primary:#2563eb;
  --primary-foreground:#ffffff;
}
.dark{
  --background:#0b1220;
  --foreground:#e2e8f0;
  --muted:#0f172a;
  --muted-foreground:#94a3b8;
  --border:#1f2937;
  --card:#0f172a;
  --card-foreground:#e5e7eb;
  --primary:#60a5fa;
  --primary-foreground:#0b1220;
}
html,body{background:var(--background);color:var(--foreground);width:100%;max-width:100%;overflow-x:hidden;} 
#root{width:100%;max-width:100%;overflow-x:hidden;}
*{min-width:0;}
@supports (overflow: clip){
  html,body,#root{overflow-x:clip;}
}

.bg-background{background-color:var(--background)!important;}
.text-foreground{color:var(--foreground)!important;}
.text-muted-foreground{color:var(--muted-foreground)!important;}
.border{border-color:color-mix(in srgb, var(--border) 78%, transparent)!important;}
.border-t{border-top-color:color-mix(in srgb, var(--border) 72%, transparent)!important;}
.border-b{border-bottom-color:color-mix(in srgb, var(--border) 72%, transparent)!important;}
.border-r{border-right-color:color-mix(in srgb, var(--border) 72%, transparent)!important;}
.border-l{border-left-color:color-mix(in srgb, var(--border) 72%, transparent)!important;}
.bg-muted\/50{background-color:rgba(148,163,184,.1);background-color:color-mix(in srgb, var(--muted) 50%, transparent);} 
/* Premium shell separators */
.toolbar-shell,.page-header-shell,.mobile-nav-shell,.sidebar-shell{position:relative;}
.toolbar-shell::after,.page-header-shell::after,.mobile-nav-shell::before{content:"";position:absolute;left:0;right:0;height:1px;pointer-events:none;background:linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--border) 18%, transparent) 8%, color-mix(in srgb, var(--border) 90%, transparent) 50%, color-mix(in srgb, var(--border) 18%, transparent) 92%, transparent 100%);}
.toolbar-shell::after,.page-header-shell::after{bottom:0;}
.mobile-nav-shell::before{top:0;}
.toolbar-shell::before,.page-header-shell::before{content:"";position:absolute;left:0;right:0;bottom:-12px;height:12px;pointer-events:none;background:linear-gradient(to bottom, color-mix(in srgb, var(--foreground) 7%, transparent), transparent 70%);opacity:.35;}
.sidebar-shell::after{content:"";position:absolute;top:14px;bottom:14px;right:0;width:1px;pointer-events:none;background:linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--border) 20%, transparent) 10%, color-mix(in srgb, var(--border) 95%, transparent) 50%, color-mix(in srgb, var(--border) 20%, transparent) 90%, transparent 100%);}
.sidebar-shell::before{content:"";position:absolute;top:14px;bottom:14px;right:-10px;width:20px;pointer-events:none;background:radial-gradient(circle at left center, color-mix(in srgb, var(--primary) 10%, transparent), transparent 68%);opacity:.5;}
.sidebar-divider{height:1px;margin:.25rem .25rem .5rem;background:linear-gradient(90deg, transparent, color-mix(in srgb, var(--border) 90%, transparent), transparent);}

/* Premium SaaS / glassmorphism layer */
.app-shell{
  width:100%;
  max-width:100%;
  min-width:0;
  overflow-x:hidden;
  min-height:100vh;
  background:
    radial-gradient(circle at 18% -10%, color-mix(in srgb, var(--primary) 18%, transparent), transparent 34rem),
    radial-gradient(circle at 90% 8%, rgba(168,85,247,.07), transparent 28rem),
    linear-gradient(180deg, color-mix(in srgb, var(--background) 92%, #020617 8%), var(--background) 46rem);
}
.dark .app-shell{
  background:
    radial-gradient(circle at 16% -12%, color-mix(in srgb, var(--primary) 20%, transparent), transparent 36rem),
    radial-gradient(circle at 90% 4%, rgba(124,58,237,.13), transparent 29rem),
    radial-gradient(circle at 48% 100%, rgba(14,165,233,.08), transparent 40rem),
    linear-gradient(180deg, #0b1220 0%, #07111d 54%, #07111d 100%);
}
.main-surface{position:relative;isolation:isolate;}
.main-surface::before{
  content:"";
  position:absolute;
  inset:0;
  pointer-events:none;
  z-index:-1;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--primary) 5%, transparent), transparent 22rem),
    radial-gradient(circle at 70% 18%, color-mix(in srgb, var(--primary) 8%, transparent), transparent 24rem);
  opacity:.85;
}
.toolbar-shell,.page-header-shell,.sidebar-shell,.mobile-nav-shell{
  background:linear-gradient(180deg, color-mix(in srgb, var(--background) 88%, transparent), color-mix(in srgb, var(--background) 64%, transparent))!important;
  backdrop-filter:blur(18px) saturate(135%);
  -webkit-backdrop-filter:blur(18px) saturate(135%);
}
.toolbar-shell{box-shadow:0 10px 32px -28px rgba(0,0,0,.65), inset 0 -1px 0 color-mix(in srgb, #fff 8%, transparent);}
.page-header-shell{box-shadow:0 18px 36px -34px rgba(0,0,0,.65), inset 0 1px 0 color-mix(in srgb, #fff 5%, transparent);}
.sidebar-shell{
  background:linear-gradient(180deg, color-mix(in srgb, var(--background) 78%, transparent), color-mix(in srgb, var(--card) 45%, transparent))!important;
  box-shadow:18px 0 45px -42px color-mix(in srgb, var(--primary) 45%, #000 55%), inset -1px 0 0 color-mix(in srgb, #fff 5%, transparent);
}
.sidebar-shell .bg-primary{box-shadow:0 10px 28px -18px color-mix(in srgb, var(--primary) 75%, transparent), inset 0 1px 0 rgba(255,255,255,.2);}
.sidebar-shell button:not(.bg-primary){transition:background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;}
.sidebar-shell button:not(.bg-primary):hover{background:color-mix(in srgb, var(--foreground) 6%, transparent)!important;box-shadow:inset 0 1px 0 color-mix(in srgb, #fff 7%, transparent);transform:translateX(1px);}
.premium-card,.detail-panel,.cmd-panel,.drawer,.modal{
  background:linear-gradient(180deg, color-mix(in srgb, var(--card) 78%, transparent), color-mix(in srgb, var(--card) 56%, transparent));
  border-color:color-mix(in srgb, var(--border) 66%, transparent)!important;
  box-shadow:0 22px 70px -52px rgba(0,0,0,.75), inset 0 1px 0 color-mix(in srgb, #fff 6%, transparent);
  backdrop-filter:blur(16px) saturate(130%);
  -webkit-backdrop-filter:blur(16px) saturate(130%);
}
.kpi,.progress,input,textarea,[role="combobox"]{
  box-shadow:inset 0 1px 0 color-mix(in srgb, #fff 5%, transparent);
}
.row-interactive:hover td{background:color-mix(in srgb, var(--primary) 7%, var(--muted) 15%);}
.row-selected td{background:linear-gradient(90deg, color-mix(in srgb, var(--primary) 14%, transparent), color-mix(in srgb, var(--muted) 28%, transparent))!important;}
.main-surface .rounded-xl.border:not(button),
.main-surface .rounded-2xl.border:not(button){
  background:linear-gradient(180deg, color-mix(in srgb, var(--card) 72%, transparent), color-mix(in srgb, var(--card) 48%, transparent));
  border-color:color-mix(in srgb, var(--border) 58%, transparent)!important;
  box-shadow:0 20px 58px -48px rgba(0,0,0,.72), inset 0 1px 0 color-mix(in srgb, #fff 6%, transparent);
  backdrop-filter:blur(12px) saturate(125%);
  -webkit-backdrop-filter:blur(12px) saturate(125%);
}
.main-surface .rounded-xl.border:not(button):hover,
.main-surface .rounded-2xl.border:not(button):hover{
  border-color:color-mix(in srgb, var(--primary) 26%, var(--border))!important;
}
.hover\:bg-muted\/20:hover{background-color:rgba(148,163,184,.08);background-color:color-mix(in srgb, var(--muted) 20%, transparent);} 
/* Card helpers */
.bg-card{background-color:var(--card)!important;}
.text-card-foreground{color:var(--card-foreground)!important;}
/* Primary helpers for contrasty chips */
.bg-primary{background-color:var(--primary)!important;}
.text-primary-foreground{color:var(--primary-foreground)!important;}
.border-primary{border-color:var(--primary)!important;}
/* Switch theming */
.ui-switch{background-color:color-mix(in srgb, var(--foreground) 6%, transparent)!important}
.dark .ui-switch{background-color:#0d1a2b!important}
.ui-switch[data-state="checked"]{background-color:var(--primary)!important}
.ui-switch[data-state="checked"] > span{background-color:var(--primary-foreground)!important}
/* Shadows on dark */
.dark .shadow-sm{box-shadow:0 1px 0 rgba(255,255,255,0.03), 0 1px 2px rgba(0,0,0,0.25)!important;}
/* KPI pills */
.kpi{display:inline-flex;align-items:center;gap:.35rem;padding:.35rem .6rem;border-radius:9999px;border:1px solid var(--border);background:color-mix(in srgb, var(--muted) 50%, transparent);color:var(--card-foreground);font-size:.8rem;}
.dark .kpi{background:color-mix(in srgb, var(--muted) 65%, transparent);} 
/* Progress bar */
.progress{height:8px;border-radius:9999px;border:1px solid var(--border);background:color-mix(in srgb, var(--muted) 55%, transparent);overflow:hidden}
.progress__bar{height:100%;background:var(--primary);border-radius:9999px}
/* Row hierarchy (hover + selected) */
.row-interactive{cursor:pointer}
.dashboard-row{cursor:default}
.row-interactive td{transition:background-color 160ms ease, transform 160ms ease;}
.row-interactive td:first-child{position:relative;}
.row-interactive td:first-child::before{content:"";position:absolute;left:0;top:6px;bottom:6px;width:3px;border-radius:9999px;background:transparent;opacity:0;transition:background-color 160ms ease, box-shadow 160ms ease, opacity 160ms ease;}
.row-interactive:hover td{background:color-mix(in srgb, var(--muted) 22%, transparent);transform:translateY(-1px);}
.row-interactive:hover td:first-child::before{opacity:.35;background:color-mix(in srgb, var(--primary) 55%, transparent);}
.row-interactive:active td{transform:translateY(0);}


/* Zebra striping (subtle) */
.row-zebra-even td{background:color-mix(in srgb, var(--muted) 10%, transparent);}
.dark .row-zebra-even td{background:rgba(255,255,255,0.012);}
.row-zebra-odd td{background:transparent;}

/* Selected row accent */
.row-selected{outline:1px solid color-mix(in srgb, var(--primary) 55%, transparent);outline-offset:-1px;filter:drop-shadow(0 14px 26px color-mix(in srgb, var(--primary) 20%, transparent));}
.row-selected td{background:color-mix(in srgb, var(--muted) 34%, transparent);transform:translateY(0) !important;}
.row-selected td:first-child::before{opacity:1;background:color-mix(in srgb, var(--primary) 85%, transparent);box-shadow:0 0 0 1px color-mix(in srgb, var(--primary) 35%, transparent),0 0 18px color-mix(in srgb, var(--primary) 35%, transparent);}

/* Detail panel emphasis */
.detail-panel{background:color-mix(in srgb, var(--card) 70%, transparent);backdrop-filter:blur(10px);}
.dark .detail-panel{background:color-mix(in srgb, var(--card) 35%, transparent);}
.detail-panel--active{box-shadow:0 0 0 1px color-mix(in srgb, var(--primary) 22%, transparent),0 24px 60px -40px color-mix(in srgb, var(--primary) 40%, transparent);}
.detail-panel .text-xs.text-muted-foreground{color:color-mix(in srgb, var(--foreground) 64%, var(--muted-foreground))!important;font-weight:500;letter-spacing:.01em;}
.detail-panel .text-[11px].text-muted-foreground{color:color-mix(in srgb, var(--foreground) 58%, var(--muted-foreground))!important;}
.dark .detail-panel .text-xs.text-muted-foreground{color:color-mix(in srgb, var(--foreground) 74%, var(--muted-foreground))!important;}
.dark .detail-panel .text-[11px].text-muted-foreground{color:color-mix(in srgb, var(--foreground) 66%, var(--muted-foreground))!important;}

/* Command palette */
.cmd-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:flex-start;justify-content:center;padding:10vh 1rem;z-index:9999;}
.cmd-panel{width:100%;max-width:680px;background:var(--card);color:var(--card-foreground);border:1px solid var(--border);border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.3);position:relative;z-index:10000;}
.cmd-panel header{padding:.75rem 1rem;border-bottom:1px solid var(--border);display:flex;gap:.5rem;align-items:center}
.cmd-panel input{flex:1;background:transparent;border:none;outline:none;color:inherit}
.cmd-list{max-height:50vh;overflow:auto}
.cmd-item{padding:.65rem 1rem;cursor:pointer}
.cmd-item:hover,.cmd-item.active{background:color-mix(in srgb, var(--muted) 40%, transparent)}
/* Drawer */
.drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9998}
.drawer{position:fixed;top:0;right:0;height:100%;width:400px;max-width:100%;background:var(--card);color:var(--card-foreground);border-left:1px solid var(--border);box-shadow:0 10px 40px rgba(0,0,0,.3);z-index:10000;display:flex;flex-direction:column}
.drawer header{display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1rem;border-bottom:1px solid var(--border)}
.drawer .body{padding:1rem;gap:0.75rem;display:flex;flex-direction:column;overflow:auto}
/* Modal */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:10001}
.modal{width:100%;max-width:420px;background:var(--card);color:var(--card-foreground);border:1px solid var(--border);border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.35)}
/* Radix (shadcn/ui) poppers (Select/Dropdown/etc.) are portaled to <body>. Ensure they render above our modal overlay. */
[data-radix-popper-content-wrapper]{z-index:10050!important}

.wizard-modal{max-width:980px}
.onboarding-wizard .body{max-height:72vh;overflow:auto;padding:0 1rem 1rem 1rem}
.wizard-grid{display:grid;grid-template-columns:1fr;gap:.75rem}
@media (min-width: 640px){.wizard-grid{grid-template-columns:1fr 1fr}}

.modal header{padding:1rem 1rem .5rem 1rem;font-weight:600}
.modal .body{padding:0 .75rem 1rem .75rem;color:var(--muted-foreground)}
.modal footer{display:flex;justify-content:flex-end;gap:.5rem;padding:0 1rem 1rem 1rem}

/* User management dialog: keeps the window inside the viewport and gives the content its own clean scroll area. */
.user-management-overlay{
  padding:16px;
  overflow:hidden;
}
.user-management-modal{
  width:min(1120px, calc(100vw - 32px));
  max-width:none;
  max-height:calc(100dvh - 32px);
  display:flex;
  flex-direction:column;
  overflow:hidden;
}
.user-management-modal header{
  flex:0 0 auto;
  padding:1rem 1.25rem;
  border-bottom:1px solid var(--border);
}
.user-management-body{
  flex:1 1 auto;
  min-height:0;
  max-height:none!important;
  padding:1rem 1.25rem!important;
  overflow-y:auto;
  overflow-x:hidden;
  scrollbar-gutter:stable;
}
.user-management-modal footer{
  flex:0 0 auto;
  padding:.85rem 1.25rem!important;
  border-top:1px solid var(--border);
  background:linear-gradient(180deg, color-mix(in srgb, var(--card) 66%, transparent), color-mix(in srgb, var(--card) 86%, transparent));
}
.user-management-grid{
  align-items:start;
}
@media (max-width: 1279px){
  .user-management-grid{
    grid-template-columns:1fr!important;
  }
}
@media (max-width: 640px){
  .user-management-overlay{
    padding:8px;
  }
  .user-management-modal{
    width:calc(100vw - 16px);
    max-height:calc(100dvh - 16px);
    border-radius:14px;
  }
  .user-management-modal header,
  .user-management-body,
  .user-management-modal footer{
    padding-left:.85rem!important;
    padding-right:.85rem!important;
  }
  .user-management-modal footer > button{
    width:100%;
  }
}

.line-clamp-2,.line-clamp-3{display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden;}
.line-clamp-2{-webkit-line-clamp:2;}
.line-clamp-3{-webkit-line-clamp:3;}

/* Mobile app layout fixes: prevent body-wide horizontal scroll and keep wide tables inside local scrollers. */
.screen-only,
.screen-only > .flex,
.main-surface{
  width:100%;
  max-width:100%;
  min-width:0;
}
.main-surface{
  flex:1 1 auto;
  overflow-x:hidden;
}
.main-surface > *{
  max-width:100%;
}
.overflow-x-auto{
  max-width:100%;
  -webkit-overflow-scrolling:touch;
  overscroll-behavior-x:contain;
}

@media (max-width: 767px){
  .toolbar-shell,
  .page-header-shell,
  .mobile-nav-shell{
    width:100%;
    max-width:100vw;
    overflow-x:hidden;
  }

  .main-surface{
    flex-basis:100%;
    max-width:100vw;
    padding-bottom:calc(92px + env(safe-area-inset-bottom));
  }

  .main-surface .p-4,
  .main-surface .p-5,
  .main-surface .p-6{
    padding-left:14px!important;
    padding-right:14px!important;
  }

  .toolbar-shell .p-2{
    padding-left:12px;
    padding-right:12px;
  }

  .mobile-nav-shell > div{
    max-width:100%;
    overflow-x:auto;
    scrollbar-width:none;
  }
  .mobile-nav-shell > div::-webkit-scrollbar{display:none;}
  .mobile-nav-shell button{
    min-width:64px;
    flex:0 0 auto;
  }

  .detail-panel{
    border-radius:18px;
  }
}

/* Print */
.no-print{}
.print-only{display:none}
.screen-only{display:block}
@media print{
  .no-print,.cmd-overlay,.cmd-panel,.ui-switch,.drawer-overlay,.drawer,.modal-overlay,.modal{display:none!important}
  .screen-only{display:none!important}
  .print-only{display:block!important}
  html,body{background:#fff!important;color:#000!important}
  .w-64{display:none!important}
  .border{border-color:#ddd!important}
  .page{page-break-after:always}
  .page:last-child{page-break-after:auto}
}
`;

const PRINT_BASE_CSS = `
*{box-sizing:border-box}
html,body{background:#fff;color:#000;font:14px/1.4 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial}
.page{page-break-after:always}
.page:last-child{page-break-after:auto}
h1{font-size:28px;margin:0 0 8px}
h2{font-size:20px;margin:0 0 8px}
.text-sm{font-size:12px}
.text-3xl{font-size:28px}
.text-xl{font-size:20px}
.font-bold{font-weight:700}
.grid{display:grid}
.grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}
.gap-4{gap:16px}
.border{border:1px solid #ddd}
.rounded-md{border-radius:8px}
.p-4{padding:16px}
.p-10{padding:40px}
.mb-3{margin-bottom:12px}
.mt-6{margin-top:24px}
.w-full{width:100%}
.text-right{text-align:right}
.text-left{text-align:left}
table{border-collapse:collapse;width:100%}
th,td{border-top:1px solid #ddd;padding:8px 8px;text-align:left;vertical-align:top}
thead tr th{background:#f5f5f5}
thead{display:table-header-group;}
tfoot{display:table-footer-group;}
tr{page-break-inside:avoid;}
th,td{page-break-inside:avoid; word-break:break-word;}
/* --- Print table header: prevent ugly word wrapping --- */
th{
  white-space: nowrap;
  word-break: normal;
}
td{
  word-break: break-word;
}

/* --- Force better column widths for the "gaps" table --- */
table.gaps-table{
  table-layout: fixed;
}
table.gaps-table th:nth-child(1),
table.gaps-table td:nth-child(1){
  width: 92px; /* Référence */
}
table.gaps-table th:nth-child(3),
table.gaps-table td:nth-child(3){
  width: 70px; /* Impact */
}


/* --- Fix chevauchement "Point de contrôle" / "Action" (PDF) --- */
table.gaps-table thead th{
  white-space: normal;      /* autorise le retour à la ligne */
  overflow: hidden;         /* empêche de déborder sur la colonne suivante */
  text-overflow: ellipsis;  /* optionnel : joli si ça manque de place */
}

table.gaps-table thead th.action-col{
  white-space: nowrap;      /* "Action" reste sur une ligne */
}




/* === PDF: rendre la colonne "Action" plus visible === */
table.gaps-table{ table-layout: fixed; }

table.gaps-table th.action-col,
table.gaps-table td.action-col{
  width: 280px;            /* augmente si tu veux encore plus large */
}

table.gaps-table th.action-col{
  background:#eef2ff;      /* fond léger (header) */
  font-weight:700;
}

table.gaps-table td.action-col{
  background:#f5f7ff;      /* fond léger (cells) */
  border-left:2px solid #c7d2fe;  /* séparation visuelle nette */
  white-space:pre-wrap;
}

table.gaps-table td.action-col .action-label{ font-weight:700; }
table.gaps-table td.action-col .action-line{ margin:0 0 4px; }

@page{size:A4;margin:12mm}
body{margin:0}
.report-cover{border-bottom:4px solid #0f172a;padding-bottom:18px;margin-bottom:20px}
.report-brand{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#475569}
.report-subtitle{color:#475569;margin:4px 0 0;font-size:13px}
.report-muted{color:#64748b}
.report-small{font-size:11px}
.report-section-title{font-size:18px;margin:0 0 10px;font-weight:700;color:#0f172a}
.report-section-kicker{font-size:11px;text-transform:uppercase;letter-spacing:.09em;color:#64748b;font-weight:700;margin-bottom:6px}
.report-grid{display:grid;gap:12px}
.report-grid-2{grid-template-columns:repeat(2,minmax(0,1fr))}
.report-grid-3{grid-template-columns:repeat(3,minmax(0,1fr))}
.report-grid-4{grid-template-columns:repeat(4,minmax(0,1fr))}
.report-card{border:1px solid #dbe3ef;border-radius:12px;padding:14px;background:#fff}
.report-kpi-label{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#64748b;font-weight:700}
.report-kpi-value{font-size:28px;line-height:1.05;font-weight:800;color:#0f172a;margin-top:5px}
.report-kpi-note{font-size:11px;color:#64748b;margin-top:5px}
.report-pill{display:inline-block;border:1px solid #cbd5e1;border-radius:999px;padding:3px 8px;font-size:11px;font-weight:700;background:#f8fafc;color:#334155}
.report-pill-critical{border-color:#fecdd3;background:#fff1f2;color:#9f1239}
.report-pill-warning{border-color:#fde68a;background:#fffbeb;color:#92400e}
.report-pill-good{border-color:#bbf7d0;background:#f0fdf4;color:#166534}
.report-callout{border-left:4px solid #2563eb;background:#eff6ff;padding:12px 14px;border-radius:10px;margin-top:14px}
.report-callout-warning{border-left-color:#e11d48;background:#fff1f2}
.report-list{margin:8px 0 0 18px;padding:0}
.report-list li{margin:4px 0}
.report-maturity-track{height:8px;border-radius:999px;background:#e2e8f0;overflow:hidden}
.report-maturity-fill{height:8px;border-radius:999px;background:#2563eb}
.report-table-compact th,.report-table-compact td{padding:6px 7px;font-size:11px}
.report-table-compact th{font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#334155}
.report-action-text{white-space:pre-wrap;font-size:10.5px;line-height:1.35}
.report-footer{position:fixed;bottom:6mm;left:12mm;right:12mm;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:4px}
.flex{display:flex}
.items-center{align-items:center}
.justify-between{justify-content:space-between}
.gap-2{gap:8px}
.gap-3{gap:12px}
.text-4xl{font-size:34px}
.font-semibold{font-weight:600}
.tabular-nums{font-variant-numeric:tabular-nums}
.align-top{vertical-align:top}
.whitespace-pre-wrap{white-space:pre-wrap}
.break-words{word-break:break-word}

`;

void PRINT_BASE_CSS;

function ThemeStyles(){
  return <style dangerouslySetInnerHTML={{ __html: THEME_CSS }} />;
}

function ScrollTopButton(){
  const [visible, setVisible] = React.useState(false);
  React.useEffect(()=>{
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  },[]);
  if(!visible) return null;
  return (
    <button
      onClick={()=>window.scrollTo({top:0, behavior:'smooth'})}
      className="fixed bottom-20 md:bottom-6 right-6 z-50 rounded-full bg-primary text-primary-foreground shadow-sm p-3 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary no-print"
      aria-label="Remonter en haut"
      title="Remonter en haut"
    >
      <ArrowUp className="h-5 w-5"/>
    </button>
  );
}

function CommandPalette({ open, setOpen, onNavigate, onToggleTheme, domains }: { open: boolean; setOpen: (b: boolean) => void; onNavigate: (k: string) => void; onToggleTheme: () => void; domains: string[] }){
  const [q, setQ] = React.useState("");
  const base = [
    { label: 'Aller au Listing', action: () => onNavigate('listing') },
    { label: 'Aller à Cette semaine', action: () => onNavigate('weekly') },
    { label: 'Aller au Tableau de bord', action: () => onNavigate('dashboard') },
    { label: 'Aller aux risques', action: () => onNavigate('risks') },
    { label: "Aller au Journal d’audit", action: () => onNavigate('journal') },
    { label: 'Rechercher (Listing)', action: () => { onNavigate('listing'); setTimeout(()=>window.dispatchEvent(new Event('focus-search')), 0); } },
    { label: "Aller au Plan d’action", action: () => onNavigate("plan") },
    { label: 'Changer de thème', action: onToggleTheme },
  ];
  const domainCmds = domains.map(d => ({ label: `Filtrer domaine: ${d}`, action: () => { onNavigate('listing'); setTimeout(()=>window.dispatchEvent(new CustomEvent('set-domain-filter', { detail: d })), 0); } }));
  const items = [...base, ...domainCmds].filter(it => it.label.toLowerCase().includes(q.toLowerCase()));
  const [active, setActive] = React.useState(0);
  React.useEffect(()=>{
    const onKey = (e: KeyboardEvent) => {
      if(!open) return;
      if(e.key === 'Escape'){ setOpen(false); }
      if(e.key === 'ArrowDown'){ e.preventDefault(); setActive(a=>Math.min(items.length-1, a+1)); }
      if(e.key === 'ArrowUp'){ e.preventDefault(); setActive(a=>Math.max(0, a-1)); }
      if(e.key === 'Enter'){ e.preventDefault(); const it = items[active]; if(it){ setOpen(false); it.action(); } }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, items, active]);
  React.useEffect(()=>{ document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);
  if(!open) return null;
  return (
    <div className="cmd-overlay no-print" role="dialog" aria-modal="true" onClick={()=>setOpen(false)}>
      <div className="cmd-panel" onClick={(e)=>e.stopPropagation()}>
        <header>
          <span className="text-xs text-muted-foreground">⌘K</span>
          <input autoFocus placeholder="Rechercher une commande..." value={q} onChange={e=>setQ(e.target.value)} />
        </header>
        <div className="cmd-list">
          {items.map((it,i)=> (
            <div key={i} className={"cmd-item" + (i===active?" active":"")} onMouseEnter={()=>setActive(i)} onClick={()=>{ setOpen(false); it.action(); }}>
              {it.label}
            </div>
          ))}
          {items.length===0 && <div className="cmd-item text-muted-foreground">Aucun resultat</div>}
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel, onConfirm, onCancel }:{ open:boolean; title:string; description:string; confirmLabel:string; cancelLabel:string; onConfirm:()=>void; onCancel:()=>void }){
  useEffect(()=>{ document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);
  useEffect(()=>{
    if(!open) return;
    const onKey = (e: KeyboardEvent) => {
      if(e.key === 'Escape') onCancel();
      if(e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onConfirm, onCancel]);
  if(!open) return null;
  return (
    <div className="modal-overlay no-print" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <header>{title}</header>
        <div className="body">{description}</div>
        <footer>
          <Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant="destructive" onClick={onConfirm}>{confirmLabel}</Button>
        </footer>
      </div>
    </div>
  );
}



function UserAccessScreen(props: {
  mode: "setup" | "login";
  lang: LangKey;
  setLang: (l: LangKey) => void;
  theme: "light" | "dark";
  setTheme: (m: "light" | "dark") => void;
  users: AppUser[];
  onCreateAdmin: (payload: NewUserPayload) => Promise<void>;
  onLogin: (userId: string, password: string) => Promise<boolean>;
  onSupabaseAuthenticated: (profile: { email: string; name?: string; organization?: string; role?: UserRole; subscriptionPlan?: SubscriptionPlan; createdByUserId?: string; createdByEmail?: string; groupId?: string; groupName?: string }) => void;
  onBackHome?: () => void;
}) {
  return <LoginAccessPage {...props} />;
}

function UserManagementDialog({
  open,
  onClose,
  lang,
  users,
  activeUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onResetPassword,
  onActivatePremiumByEmail,
  canManageSubscriptions,
  canCreateUsers,
}: {
  open: boolean;
  onClose: () => void;
  lang: LangKey;
  users: AppUser[];
  activeUser: AppUser | null;
  onAddUser: (payload: NewUserPayload) => Promise<boolean>;
  onUpdateUser: (userId: string, patch: Partial<AppUser>) => void | Promise<void>;
  onDeleteUser: (userId: string) => void | Promise<void>;
  onResetPassword: (userId: string, password: string) => Promise<void>;
  onActivatePremiumByEmail: (email: string) => void | Promise<void>;
  canManageSubscriptions: boolean;
  canCreateUsers: boolean;
}) {
  useEffect(()=>{ document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [role, setRole] = useState<UserRole>("contributor");
  const [newUserPlan, setNewUserPlan] = useState<SubscriptionPlan>("free");
  const [password, setPassword] = useState("");
  const [premiumEmail, setPremiumEmail] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setOrganization("");
      setRole("contributor");
      setNewUserPlan("free");
      setPassword("");
      setPremiumEmail("");
    }
  }, [open, activeUser?.organization]);

  if (!open) return null;

  const admins = users.filter((u) => u.active !== false && u.role === "admin" && !isServiceOwnerEmail(u.email));
  const canManage = userCanManageUsers(activeUser);
  const canCreate = canCreateUsers;
  const activeUserId = String(activeUser?.id || "").trim();
  const activeUserEmail = normalizeEmail(activeUser?.email || "");

  // Dans la section "Comptes créés", le compte connecté reste affiché uniquement
  // dans le panneau de gauche. La liste ne montre que les autres comptes créés
  // par ce compte connecté.
  const visibleUsers = users.filter((u) => {
    if (!userCanViewUserRecord(activeUser, u) || isServiceOwnerEmail(u.email)) return false;

    const isCurrentUser =
      (activeUserId && String(u.id || "").trim() === activeUserId) ||
      (activeUserEmail && normalizeEmail(u.email) === activeUserEmail);

    if (isCurrentUser) return false;

    if (canManageSubscriptions) return true;

    return userWasCreatedBy(u, activeUser);
  });
  const countedVisibleUsers = visibleUsers;

  async function addUser() {
    if (!canCreate) return;
    const managedGroup = activeUser ? resolveManagedGroupForCreator(activeUser, users, lang) : undefined;
    const ok = await onAddUser({
      name,
      email,
      password,
      role,
      organization,
      subscriptionPlan: canManageSubscriptions ? newUserPlan : "free",
      createdByUserId: activeUser?.id,
      createdByEmail: activeUser?.email,
      groupId: managedGroup?.groupId,
      groupName: managedGroup?.groupName,
    });
    if (ok) {
      setName("");
      setEmail("");
      setOrganization("");
      setPassword("");
      setRole("contributor");
      setNewUserPlan("free");
    }
  }

  return (
    <div className="modal-overlay user-management-overlay no-print" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal user-management-modal" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between gap-3">
          <span>{lang === "fr" ? "Gestion des utilisateurs" : "User management"}</span>
          <Button size="sm" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
        </header>

        <div className="body user-management-body">
          <div className="user-management-grid grid min-w-0 gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
            <aside className="min-w-0 space-y-4">
              <div className="rounded-2xl border bg-muted/20 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-xl border bg-background p-2">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">
                      {activeUser?.name || "—"} · {activeUser?.email || "—"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {lang === "fr" ? "Rôle actif" : "Active role"} : {userRoleLabel(activeUser?.role, lang)}
                    </div>
                  </div>
                  <Badge variant="outline" className={userRoleBadgeClass(activeUser?.role)}>
                    {userRoleLabel(activeUser?.role, lang)}
                  </Badge>
                  <Badge variant="outline" className={subscriptionPlanBadgeClass(activeUser?.subscriptionPlan)}>
                    {subscriptionPlanLabel(activeUser?.subscriptionPlan)}
                  </Badge>
                </div>
              </div>

              {!canManage && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
                  {lang === "fr" ? "Seul un administrateur peut voir ou gérer les utilisateurs." : "Only administrators can view or manage users."}
                </div>
              )}

              {canManage && !canCreate && (
                <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-sm text-cyan-900 dark:text-cyan-100">
                  {lang === "fr"
                    ? "La création d’utilisateurs est réservée aux comptes administrateurs Premium."
                    : "User creation is reserved for Premium administrator accounts."}
                </div>
              )}

              {canCreate && (
                <div className="rounded-2xl border p-4">
                  <div className="mb-3 flex items-center gap-2 font-medium">
                    <UserPlus className="h-4 w-4" />
                    {lang === "fr" ? "Inviter / créer un utilisateur" : "Invite / create user"}
                  </div>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {lang === "fr"
                      ? "Un e-mail de vérification sera envoyé. L’utilisateur pourra se connecter avec le mot de passe temporaire après confirmation de son adresse e-mail."
                      : "A verification email will be sent. The user can sign in with the temporary password after confirming their email address."}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <div>
                      <label className="text-sm text-muted-foreground">{lang === "fr" ? "Nom" : "Name"}</label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Email</label>
                      <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">{lang === "fr" ? "Organisation" : "Organization"}</label>
                      <Input value={organization} onChange={(e) => setOrganization(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">{lang === "fr" ? "Rôle" : "Role"}</label>
                      <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                        <SelectTrigger>{userRoleLabel(role, lang)}</SelectTrigger>
                        <SelectContent>
                          {(["admin", "auditor", "contributor", "viewer"] as UserRole[]).map((r) => (
                            <SelectItem key={r} value={r}>{userRoleLabel(r, lang)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {canManageSubscriptions && (
                      <div>
                        <label className="text-sm text-muted-foreground">{lang === "fr" ? "Offre" : "Plan"}</label>
                        <Select value={newUserPlan} onValueChange={(v) => setNewUserPlan(normalizeSubscriptionPlan(v))}>
                          <SelectTrigger>{subscriptionPlanLabel(newUserPlan)}</SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Free</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div>
                      <label className="text-sm text-muted-foreground">{lang === "fr" ? "Mot de passe temporaire" : "Temporary password"}</label>
                      <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
                    </div>
                  </div>
                  <Button className="mt-4" onClick={addUser}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    {lang === "fr" ? "Créer et envoyer l’e-mail" : "Create and send email"}
                  </Button>
                </div>
              )}

              {canManage && canManageSubscriptions && (
                <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
                  <div className="mb-2 flex items-center gap-2 font-medium text-cyan-900 dark:text-cyan-100">
                    <ShieldCheck className="h-4 w-4" />
                    {lang === "fr" ? "Activation Premium par adresse e-mail" : "Premium activation by email"}
                  </div>
                  <p className="mb-3 text-sm text-cyan-900/80 dark:text-cyan-100/80">
                    {lang === "fr"
                      ? "Saisissez l’adresse reçue par e-mail : l’offre Premium sera activée côté serveur pour tous ses navigateurs et appareils."
                      : "Enter the address received by email: Premium will be enabled server-side across all browsers and devices."}
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={premiumEmail}
                      onChange={(e) => setPremiumEmail(e.target.value)}
                      type="email"
                      placeholder="client@entreprise.com"
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        onActivatePremiumByEmail(premiumEmail);
                        setPremiumEmail("");
                      }}
                    >
                      {lang === "fr" ? "Activer Premium" : "Activate Premium"}
                    </Button>
                  </div>
                </div>
              )}
            </aside>

            {canManage && (
              <section className="min-w-0 space-y-3">
                <div className="rounded-2xl border p-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">
                        {canManageSubscriptions
                          ? (lang === "fr" ? "Comptes utilisateurs" : "User accounts")
                          : (lang === "fr" ? "Comptes créés" : "Created accounts")}
                      </div>
                    </div>
                    <Badge variant="outline">{countedVisibleUsers.length}</Badge>
                  </div>

                  {visibleUsers.length === 0 ? (
                    <div className="rounded-xl border bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
                      {lang === "fr" ? "Aucun compte créé pour le moment." : "No account created yet."}
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {visibleUsers.map((u) => {
                        const isSelf = activeUser?.id === u.id;
                        const isOwnerAccount = isServiceOwnerEmail(u.email);
                        const canEditTarget = canManage && userCanModifyUserRecord(activeUser, u);
                        const disablingLastAdmin = !userCanManageSubscriptions(activeUser) && u.role === "admin" && admins.length <= 1 && u.active !== false;
                        const deletingLastAdmin = u.role === "admin" && admins.length <= 1 && u.active !== false;
                        return (
                          <div key={u.id} className={"rounded-2xl border bg-muted/10 p-4 " + (u.active === false ? "opacity-60" : "")}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate font-medium">{u.name}</div>
                                <div className="truncate text-sm text-muted-foreground">{u.email}</div>
                                <div className="mt-1 truncate text-xs text-muted-foreground">
                                  {u.organization || "—"} · {lang === "fr" ? "Créé le" : "Created"} {new Date(u.createdAt).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US")}
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <Badge variant="outline" className="bg-background/70">
                                    {resolveGroupForUser(u, users, lang).groupName}
                                  </Badge>
                                  <span className="truncate">
                                    {lang === "fr" ? "Créé par" : "Created by"} : {createdByLabel(u, users, lang)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className={subscriptionPlanBadgeClass(u.subscriptionPlan)}>
                                  {subscriptionPlanLabel(u.subscriptionPlan)}
                                </Badge>
                                <Badge variant="outline" className={userRoleBadgeClass(u.role)}>
                                  {u.active === false ? (lang === "fr" ? "Inactif" : "Inactive") : (lang === "fr" ? "Actif" : "Active")}
                                </Badge>
                              </div>
                            </div>

                            <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2 2xl:grid-cols-[160px_180px_minmax(0,1fr)]">
                              <div className="min-w-0">
                                <label className="text-xs text-muted-foreground">{lang === "fr" ? "Offre" : "Plan"}</label>
                                {canManageSubscriptions ? (
                                  <Select
                                    value={normalizeSubscriptionPlan(u.subscriptionPlan)}
                                    disabled={!canEditTarget || isOwnerAccount}
                                    onValueChange={(v) => onUpdateUser(u.id, { subscriptionPlan: normalizeSubscriptionPlan(v) })}
                                  >
                                    <SelectTrigger className="w-full">{subscriptionPlanLabel(u.subscriptionPlan)}</SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="free">Free</SelectItem>
                                      <SelectItem value="premium">Premium</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <div className="mt-2">
                                    <Badge variant="outline" className={subscriptionPlanBadgeClass(u.subscriptionPlan)}>
                                      {subscriptionPlanLabel(u.subscriptionPlan)}
                                    </Badge>
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0">
                                <label className="text-xs text-muted-foreground">{lang === "fr" ? "Rôle" : "Role"}</label>
                                <Select
                                  value={u.role}
                                  disabled={!canEditTarget || disablingLastAdmin || isOwnerAccount}
                                  onValueChange={(v) => onUpdateUser(u.id, { role: v as UserRole })}
                                >
                                  <SelectTrigger className="w-full">{userRoleLabel(u.role, lang)}</SelectTrigger>
                                  <SelectContent>
                                    {(["admin", "auditor", "contributor", "viewer"] as UserRole[]).map((r) => (
                                      <SelectItem key={r} value={r}>{userRoleLabel(r, lang)}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="min-w-0 md:col-span-2 2xl:col-span-1">
                                <label className="text-xs text-muted-foreground">{lang === "fr" ? "Actions" : "Actions"}</label>
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={!canEditTarget || isSelf || disablingLastAdmin || isOwnerAccount}
                                    onClick={() => onUpdateUser(u.id, { active: u.active === false })}
                                  >
                                    {u.active === false ? (lang === "fr" ? "Réactiver" : "Reactivate") : (lang === "fr" ? "Désactiver" : "Deactivate")}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={!canEditTarget || isOwnerAccount}
                                    onClick={() => {
                                      const next = window.prompt(lang === "fr" ? "Nouveau mot de passe temporaire" : "New temporary password");
                                      if (!next) return;
                                      onResetPassword(u.id, next);
                                    }}
                                  >
                                    {lang === "fr" ? "Réinitialiser" : "Reset"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    disabled={!canEditTarget || isSelf || deletingLastAdmin || isOwnerAccount}
                                    onClick={() => void onDeleteUser(u.id)}
                                  >
                                    <Trash2 className="mr-1 h-4 w-4" />
                                    {lang === "fr" ? "Supprimer" : "Delete"}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>

        <footer>
          <Button onClick={onClose}>{lang === "fr" ? "Fermer" : "Close"}</Button>
        </footer>
      </div>
    </div>
  );
}


function ServiceOwnerAdminConsole({
  lang,
  users,
  activeUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onResetPassword,
  onSetSubscriptionByEmail,
  onLogout,
}: {
  lang: LangKey;
  users: AppUser[];
  activeUser: AppUser;
  onAddUser: (payload: NewUserPayload) => Promise<boolean>;
  onUpdateUser: (userId: string, patch: Partial<AppUser>) => void | Promise<void>;
  onDeleteUser: (userId: string) => void | Promise<void>;
  onResetPassword: (userId: string, password: string) => Promise<void>;
  onSetSubscriptionByEmail: (email: string, plan: SubscriptionPlan) => void | Promise<void>;
  onLogout: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [role, setRole] = useState<UserRole>("contributor");
  const [newUserPlan, setNewUserPlan] = useState<SubscriptionPlan>("free");
  const [password, setPassword] = useState("");
  const [planEmail, setPlanEmail] = useState("");
  const [directPlan, setDirectPlan] = useState<SubscriptionPlan>("premium");

  // Le compte propriétaire sert uniquement à administrer GapTrack :
  // il ne doit ni compter, ni apparaître dans la liste des comptes clients.
  const visibleUsers = useMemo(
    () => users
      .filter((u) => userCanViewUserRecord(activeUser, u) && !isServiceOwnerEmail(u.email))
      .sort((a, b) => {
        const groupA = resolveGroupForUser(a, users, lang).groupName;
        const groupB = resolveGroupForUser(b, users, lang).groupName;
        if (groupA !== groupB) return groupA.localeCompare(groupB);
        return String(a.name || a.email).localeCompare(String(b.name || b.email));
      }),
    [users, activeUser, lang]
  );
  const countedUsers = visibleUsers;
  const activeAdmins = countedUsers.filter((u) => u.active !== false && u.role === "admin");
  const premiumCount = countedUsers.filter((u) => normalizeSubscriptionPlan(u.subscriptionPlan) === "premium").length;
  const freeCount = countedUsers.length - premiumCount;

  async function addUser() {
    const managedGroup = resolveManagedGroupForCreator(activeUser, users, lang);
    const ok = await onAddUser({
      name,
      email,
      password,
      role,
      organization,
      subscriptionPlan: newUserPlan,
      createdByUserId: activeUser.id,
      createdByEmail: activeUser.email,
      groupId: managedGroup.groupId,
      groupName: managedGroup.groupName,
    });

    if (ok) {
      setName("");
      setEmail("");
      setOrganization("");
      setPassword("");
      setRole("contributor");
      setNewUserPlan("free");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground app-shell">
      <ThemeStyles />
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-5 py-6 lg:px-8">
        <header className="rounded-3xl border bg-muted/10 p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-900 dark:text-cyan-100">
                <ShieldCheck className="h-4 w-4" />
                {lang === "fr" ? "Console propriétaire" : "Owner console"}
              </div>
              <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">
                {lang === "fr" ? "Administration GapTrack" : "GapTrack administration"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {lang === "fr"
                  ? "Ce compte ne donne pas accès aux audits : il sert uniquement à gérer les utilisateurs, les rôles et les offres Free/Premium."
                  : "This account does not access audits: it is only used to manage users, roles and Free/Premium plans."}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {activeUser.name} · {activeUser.email}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={userRoleBadgeClass(activeUser.role)}>{userRoleLabel(activeUser.role, lang)}</Badge>
              <Badge variant="outline" className={subscriptionPlanBadgeClass(activeUser.subscriptionPlan)}>
                {subscriptionPlanLabel(activeUser.subscriptionPlan)}
              </Badge>
              <Button variant="outline" onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                {lang === "fr" ? "Déconnexion" : "Logout"}
              </Button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border bg-muted/10 p-4">
            <div className="text-sm text-muted-foreground">{lang === "fr" ? "Utilisateurs" : "Users"}</div>
            <div className="mt-2 text-3xl font-semibold">{countedUsers.length}</div>
          </div>
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
            <div className="text-sm text-cyan-900/80 dark:text-cyan-100/80">Premium</div>
            <div className="mt-2 text-3xl font-semibold text-cyan-900 dark:text-cyan-100">{premiumCount}</div>
          </div>
          <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4">
            <div className="text-sm text-sky-900/80 dark:text-sky-100/80">Free</div>
            <div className="mt-2 text-3xl font-semibold text-sky-900 dark:text-sky-100">{freeCount}</div>
          </div>
        </section>

        <div className="grid min-w-0 gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
          <aside className="min-w-0 space-y-5">
            <section className="rounded-2xl border p-4">
              <div className="mb-3 flex items-center gap-2 font-medium">
                <UserPlus className="h-4 w-4" />
                {lang === "fr" ? "Inviter / créer un utilisateur" : "Invite / create user"}
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                {lang === "fr"
                  ? "Le compte créé pourra faire des audits selon son rôle et son offre."
                  : "The created account can perform audits depending on its role and plan."}
              </p>
              <div className="grid gap-3">
                <div>
                  <label className="text-sm text-muted-foreground">{lang === "fr" ? "Nom" : "Name"}</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Email</label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">{lang === "fr" ? "Organisation" : "Organization"}</label>
                  <Input value={organization} onChange={(e) => setOrganization(e.target.value)} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-sm text-muted-foreground">{lang === "fr" ? "Rôle" : "Role"}</label>
                    <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                      <SelectTrigger>{userRoleLabel(role, lang)}</SelectTrigger>
                      <SelectContent>
                        {(["admin", "auditor", "contributor", "viewer"] as UserRole[]).map((r) => (
                          <SelectItem key={r} value={r}>{userRoleLabel(r, lang)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">{lang === "fr" ? "Offre" : "Plan"}</label>
                    <Select value={newUserPlan} onValueChange={(v) => setNewUserPlan(normalizeSubscriptionPlan(v))}>
                      <SelectTrigger>{subscriptionPlanLabel(newUserPlan)}</SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">{lang === "fr" ? "Mot de passe temporaire" : "Temporary password"}</label>
                  <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
                </div>
              </div>
              <Button className="mt-4 w-full" onClick={addUser}>
                <UserPlus className="mr-2 h-4 w-4" />
                {lang === "fr" ? "Créer et envoyer l’e-mail" : "Create and send email"}
              </Button>
            </section>

            <section className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
              <div className="mb-2 flex items-center gap-2 font-medium text-cyan-900 dark:text-cyan-100">
                <ShieldCheck className="h-4 w-4" />
                {lang === "fr" ? "Changer une offre par e-mail" : "Change a plan by email"}
              </div>
              <p className="mb-3 text-sm text-cyan-900/80 dark:text-cyan-100/80">
                {lang === "fr"
                  ? "L’offre est mise à jour côté Supabase et sera valable sur tous les navigateurs et appareils."
                  : "The plan is updated in Supabase and will apply on all browsers and devices."}
              </p>
              <div className="grid gap-2">
                <Input value={planEmail} onChange={(e) => setPlanEmail(e.target.value)} type="email" placeholder="client@entreprise.com" />
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Select value={directPlan} onValueChange={(v) => setDirectPlan(normalizeSubscriptionPlan(v))}>
                    <SelectTrigger>{subscriptionPlanLabel(directPlan)}</SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    onClick={() => {
                      onSetSubscriptionByEmail(planEmail, directPlan);
                      setPlanEmail("");
                    }}
                  >
                    {lang === "fr" ? "Appliquer" : "Apply"}
                  </Button>
                </div>
              </div>
            </section>
          </aside>

          <section className="min-w-0 rounded-2xl border p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium">{lang === "fr" ? "Comptes utilisateurs" : "User accounts"}</div>
                <div className="text-sm text-muted-foreground">
                  {lang === "fr" ? "Gestion des rôles, accès et offres." : "Manage roles, access and plans."}
                </div>
              </div>
              <Badge variant="outline">{countedUsers.length}</Badge>
            </div>

            <div className="grid gap-3">
              {visibleUsers.map((u) => {
                const isSelf = activeUser.id === u.id;
                const isOwnerAccount = isServiceOwnerEmail(u.email);
                const canEditTarget = userCanModifyUserRecord(activeUser, u);
                const disablingLastAdmin = !userCanManageSubscriptions(activeUser) && u.role === "admin" && activeAdmins.length <= 1 && u.active !== false;
                const deletingLastAdmin = u.role === "admin" && activeAdmins.length <= 1 && u.active !== false;

                return (
                  <article key={u.id} className={"rounded-2xl border bg-muted/10 p-4 " + (u.active === false ? "opacity-60" : "")}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate font-medium">{u.name}</div>
                          {isOwnerAccount ? (
                            <Badge variant="outline" className="border-cyan-500/40 text-cyan-700 dark:text-cyan-300 bg-cyan-500/10">
                              {lang === "fr" ? "Compte propriétaire" : "Owner account"}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="truncate text-sm text-muted-foreground">{u.email}</div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">
                          {u.organization || "—"} · {lang === "fr" ? "Créé le" : "Created"} {new Date(u.createdAt).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US")}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="bg-background/70">
                            {resolveGroupForUser(u, users, lang).groupName}
                          </Badge>
                          <span className="truncate">
                            {lang === "fr" ? "Créé par" : "Created by"} : {createdByLabel(u, users, lang)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={subscriptionPlanBadgeClass(u.subscriptionPlan)}>{subscriptionPlanLabel(u.subscriptionPlan)}</Badge>
                        <Badge variant="outline" className={userRoleBadgeClass(u.role)}>{userRoleLabel(u.role, lang)}</Badge>
                        <Badge variant="outline" className={u.active === false ? "border-rose-500/40 text-rose-700 dark:text-rose-300 bg-rose-500/10" : "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10"}>
                          {u.active === false ? (lang === "fr" ? "Inactif" : "Inactive") : (lang === "fr" ? "Actif" : "Active")}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-[170px_190px_minmax(0,1fr)]">
                      <div className="min-w-0">
                        <label className="text-xs text-muted-foreground">{lang === "fr" ? "Offre" : "Plan"}</label>
                        {isOwnerAccount ? (
                          <div className="mt-2">
                            <Badge variant="outline" className={subscriptionPlanBadgeClass(u.subscriptionPlan)}>{subscriptionPlanLabel(u.subscriptionPlan)}</Badge>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {lang === "fr" ? "Offre verrouillée" : "Locked plan"}
                            </div>
                          </div>
                        ) : (
                          <Select
                            value={normalizeSubscriptionPlan(u.subscriptionPlan)}
                            disabled={!canEditTarget}
                            onValueChange={(v) => onUpdateUser(u.id, { subscriptionPlan: normalizeSubscriptionPlan(v) })}
                          >
                            <SelectTrigger className="w-full">{subscriptionPlanLabel(u.subscriptionPlan)}</SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="premium">Premium</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      <div className="min-w-0">
                        <label className="text-xs text-muted-foreground">{lang === "fr" ? "Rôle" : "Role"}</label>
                        <Select
                          value={u.role}
                          disabled={!canEditTarget || disablingLastAdmin || isOwnerAccount}
                          onValueChange={(v) => onUpdateUser(u.id, { role: v as UserRole })}
                        >
                          <SelectTrigger className="w-full">{userRoleLabel(u.role, lang)}</SelectTrigger>
                          <SelectContent>
                            {(["admin", "auditor", "contributor", "viewer"] as UserRole[]).map((r) => (
                              <SelectItem key={r} value={r}>{userRoleLabel(r, lang)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="min-w-0">
                        <label className="text-xs text-muted-foreground">{lang === "fr" ? "Actions" : "Actions"}</label>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canEditTarget || isSelf || disablingLastAdmin || isOwnerAccount}
                            onClick={() => onUpdateUser(u.id, { active: u.active === false })}
                          >
                            {u.active === false ? (lang === "fr" ? "Réactiver" : "Reactivate") : (lang === "fr" ? "Désactiver" : "Deactivate")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canEditTarget || isOwnerAccount}
                            onClick={() => {
                              const next = window.prompt(lang === "fr" ? "Nouveau mot de passe temporaire" : "New temporary password");
                              if (!next) return;
                              onResetPassword(u.id, next);
                            }}
                          >
                            {lang === "fr" ? "Réinitialiser" : "Reset"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={!canEditTarget || isSelf || deletingLastAdmin || isOwnerAccount}
                            onClick={() => void onDeleteUser(u.id)}
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            {lang === "fr" ? "Supprimer" : "Delete"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}



function CreateAuditWizard({
  open,
  onClose,
  lang,
  templates,
  currentRowsCount,
  onImportTemplate,
  onCreateAudit,
  canImportTemplates = true,
  onPremiumRequired,
}:{
  open: boolean;
  onClose: () => void;
  lang: LangKey;
  templates: ChecklistTemplate[];
  currentRowsCount: number;
  onImportTemplate: (frameworkId: FrameworkId, file: File) => Promise<ChecklistTemplate>;
  canImportTemplates?: boolean;
  onPremiumRequired?: (featureLabel?: string) => boolean;
  onCreateAudit: (payload: {
    name: string;
    frameworkId: FrameworkId;
    frameworkVersion?: string;
    frameworkCatalogId?: string;
    frameworkCatalogRevision?: string;
    scope: string;
    criticality: AuditCriticality;
    templateId?: string;
    rows: ControlItem[];
    organization?: string;
    auditor?: string;
    sponsor?: string;
    auditDate?: string;
    auditType?: AuditType;
    objectives?: string;
    context?: string;
  }) => Promise<boolean | void>;
}){
  useEffect(()=>{ document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);
  const [step, setStep] = useState(0);
  const [frameworkId, setFrameworkId] = useState<FrameworkId>("ISO27001");
  const [source, setSource] = useState<"template" | "current">(currentRowsCount > 0 ? "current" : "template");
  const [name, setName] = useState("");
  const [scope, setScope] = useState("");
  const [criticality, setCriticality] = useState<AuditCriticality>("medium");
  const [organization, setOrganization] = useState("");
  const [auditor, setAuditor] = useState(currentEvidenceActor());
  const [sponsor, setSponsor] = useState("");
  const [auditDate, setAuditDate] = useState(defaultAuditDate());
  const [auditType, setAuditType] = useState<AuditType>("initial");
  const [objectives, setObjectives] = useState("");
  const [context, setContext] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const autoSelectedVersionedSourceRef = useRef(false);

  const available = templates.filter(t=>t.frameworkId === frameworkId);
  const selected = available.find(t=>t.id === templateId) || null;

  useEffect(()=>{
    const list = templates.filter(t=>t.frameworkId === frameworkId);
    const preferred = list.find((template) => template.builtIn) || list[0];
    setTemplateId((prev) => list.some((tpl) => tpl.id === prev) ? prev : (preferred?.id || ""));
  }, [frameworkId, templates]);

  useEffect(()=>{
    if (!open) {
      autoSelectedVersionedSourceRef.current = false;
      return;
    }
    setStep(0);
    setSource(currentRowsCount > 0 ? "current" : "template");
    autoSelectedVersionedSourceRef.current = false;
    setAuditDate((prev) => prev || defaultAuditDate());
    setAuditor((prev) => prev || currentEvidenceActor());
  }, [open, currentRowsCount]);

  useEffect(() => {
    if (!open || autoSelectedVersionedSourceRef.current) return;
    const versioned = templates.find((template) => template.frameworkId === frameworkId && template.builtIn);
    if (!versioned) return;
    setTemplateId(versioned.id);
    setSource("template");
    autoSelectedVersionedSourceRef.current = true;
  }, [frameworkId, open, templates]);

  useEffect(()=>{
    if (!open) return;
    const stamp = new Date().toISOString().slice(0,10);
    const f = frameworkLabel(frameworkId, lang);
    setName((prev) => prev.trim() ? prev : (lang==='fr'? `Audit ${f} ${stamp}` : `${f} Audit ${stamp}`));
  }, [open, frameworkId, lang]);

  if(!open) return null;

  const sourceReady = source === "current"
    ? currentRowsCount > 0
    : Boolean(selected && selected.rows.length > 0);

  const stepValid = [
    Boolean(name.trim() && organization.trim() && auditDate && auditor.trim()),
    sourceReady,
    Boolean(scope.trim() && objectives.trim()),
    Boolean(name.trim() && organization.trim() && auditDate && sourceReady),
  ];

  const steps = [
    {
      title: lang === "fr" ? "Fiche audit" : "Audit profile",
      subtitle: lang === "fr" ? "Identifiez clairement l’audit et l’organisation." : "Clearly identify the audit and organization.",
    },
    {
      title: lang === "fr" ? "Référentiel" : "Framework",
      subtitle: lang === "fr" ? "Choisissez la base de contrôles à évaluer." : "Choose the control baseline to assess.",
    },
    {
      title: lang === "fr" ? "Périmètre & objectifs" : "Scope & objectives",
      subtitle: lang === "fr" ? "Cadrez ce qui est inclus, exclu et attendu." : "Define what is included, excluded and expected.",
    },
    {
      title: lang === "fr" ? "Lancement" : "Launch",
      subtitle: lang === "fr" ? "Vérifiez puis créez l’audit." : "Review and create the audit.",
    },
  ];

  const explainMissing = () => {
    if (step === 0) {
      toast.error(lang === "fr" ? "Renseignez au minimum le nom, l’organisation, l’auditeur et la date." : "Fill at least the name, organization, auditor and date.");
      return;
    }
    if (step === 1) {
      toast.error(lang === "fr" ? "Sélectionnez une checklist actuelle ou importez un template CSV/JSON." : "Select the current checklist or import a CSV/JSON template.");
      return;
    }
    if (step === 2) {
      toast.error(lang === "fr" ? "Renseignez le périmètre et les objectifs pour cadrer l’audit." : "Fill the scope and objectives to frame the audit.");
    }
  };

  const goNext = () => {
    if (!stepValid[step]) {
      explainMissing();
      return;
    }
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const createAudit = async () => {
    if (!stepValid[3] || !stepValid[2]) {
      explainMissing();
      return;
    }
    if (busy) return;

    const baseRows = source === "current"
      ? []
      : (selected ? templateRowsToControlItems(selected.rows) : []);

    setBusy(true);
    try {
      const created = await onCreateAudit({
        name: name.trim(),
        frameworkId,
        frameworkVersion: source === "template" ? selected?.version : undefined,
        frameworkCatalogId: source === "template" ? selected?.catalogId : undefined,
        frameworkCatalogRevision: source === "template" ? selected?.revision : undefined,
        scope: scope.trim(),
        criticality,
        templateId: source === "template" ? selected?.id : undefined,
        rows: baseRows,
        organization: organization.trim(),
        auditor: auditor.trim(),
        sponsor: sponsor.trim(),
        auditDate,
        auditType,
        objectives: objectives.trim(),
        context: context.trim(),
      });
      if (created !== false) onClose();
    } catch (error) {
      console.error("Unable to create audit.", error);
      toast.error(lang === "fr" ? "Impossible de créer l’audit sur le serveur." : "Unable to create the audit on the server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay no-print" role="dialog" aria-modal="true" onClick={() => { if (!busy) onClose(); }}>
      <div className="modal wizard-modal onboarding-wizard" onClick={e=>e.stopPropagation()}>
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-sky-700 dark:text-sky-300">
              {lang === "fr" ? "Parcours de démarrage" : "Getting started"}
            </div>
            <div className="text-xl font-semibold">
              {lang === "fr" ? "Créer un audit exploitable" : "Create an actionable audit"}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {lang === "fr"
                ? "4 étapes pour éviter un audit “non renseigné” et commencer avec une base claire."
                : "4 steps to avoid an empty audit and start with a clear baseline."}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}><X className="h-4 w-4" /></Button>
        </header>

        <div className="body" style={{color:"inherit"}}>
          <div className="mb-5 grid gap-2 md:grid-cols-4">
            {steps.map((s, index) => {
              const active = step === index;
              const done = index < step || stepValid[index];
              return (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => {
                    if (index <= step || steps.slice(0, index).every((_, i) => stepValid[i])) setStep(index);
                  }}
                  className={`rounded-xl border p-3 text-left transition ${active ? "border-sky-500 bg-sky-500/10" : done ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-background/40"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${active ? "bg-sky-500 text-white" : done ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                      {done && !active ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                    </span>
                    <span className="font-medium">{s.title}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{s.subtitle}</p>
                </button>
              );
            })}
          </div>

          {step === 0 && (
            <div className="wizard-grid">
              <div className="sm:col-span-2">
                <div className="text-xs text-muted-foreground mb-1">{lang==='fr' ? "Nom de l'audit" : "Audit name"}</div>
                <Input value={name} onChange={(e)=>setName(e.target.value)} placeholder={lang === "fr" ? "Ex: Audit SSI 2026 - Siège" : "e.g., Security audit 2026 - HQ"} />
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">{lang==='fr' ? "Organisation auditée" : "Audited organization"}</div>
                <Input
                  value={organization}
                  onChange={(e)=>setOrganization(e.target.value)}
                  placeholder={lang==='fr' ? "Ex: PME Martin" : "e.g., Martin SMB"}
                />
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">{lang==='fr' ? "Date de l'audit" : "Audit date"}</div>
                <Input type="date" value={auditDate} onChange={(e)=>setAuditDate(e.target.value)} />
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">{lang==='fr' ? "Auditeur / Responsable mission" : "Auditor / engagement lead"}</div>
                <Input
                  value={auditor}
                  onChange={(e)=>setAuditor(e.target.value)}
                  placeholder={lang==='fr' ? "Nom, fonction, cabinet" : "Name, role, firm"}
                />
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">{lang==='fr' ? "Commanditaire" : "Sponsor"}</div>
                <Input
                  value={sponsor}
                  onChange={(e)=>setSponsor(e.target.value)}
                  placeholder={lang==='fr' ? "Direction, DSI, RSSI..." : "Management, CIO, CISO..."}
                />
              </div>

              <div className="sm:col-span-2">
                <div className="text-xs text-muted-foreground mb-1">{lang==='fr' ? "Type d'audit" : "Audit type"}</div>
                <Select value={auditType} onValueChange={(v)=>setAuditType(v as AuditType)}>
                  <SelectTrigger className="w-full">
                    <span className="truncate">{auditTypeLabel(auditType, lang)}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="initial">{lang==='fr' ? "Audit initial" : "Initial audit"}</SelectItem>
                    <SelectItem value="follow_up">{lang==='fr' ? "Suivi / réévaluation" : "Follow-up / reassessment"}</SelectItem>
                    <SelectItem value="internal">{lang==='fr' ? "Audit interne" : "Internal audit"}</SelectItem>
                    <SelectItem value="external">{lang==='fr' ? "Audit externe" : "External audit"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4">
              <div className="wizard-grid">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">{lang==='fr' ? "Référentiel" : "Framework"}</div>
                  <Select value={frameworkId} onValueChange={(v)=>{
                    const nextFramework = v as FrameworkId;
                    setFrameworkId(nextFramework);
                    if (templates.some((template) => template.frameworkId === nextFramework && template.builtIn)) {
                      setSource("template");
                    }
                  }}>
                    <SelectTrigger className="w-full">
                      <span className="truncate">{frameworkLabel(frameworkId, lang)}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ISO27001">ISO/IEC 27001</SelectItem>
                      <SelectItem value="NIS2">NIS2</SelectItem>
                      <SelectItem value="DORA">DORA</SelectItem>
                      <SelectItem value="RGPD">{lang === "fr" ? "RGPD" : "GDPR"}</SelectItem>
                      <SelectItem value="PGSSI-S">PGSSI-S</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-1">{lang==='fr' ? "Criticité du périmètre" : "Scope criticality"}</div>
                  <Select value={criticality} onValueChange={(v)=>setCriticality(v as any)}>
                    <SelectTrigger className="w-full">
                      <span className="truncate">{criticalityLabel(criticality, lang)}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{lang==='fr' ? "Faible" : "Low"}</SelectItem>
                      <SelectItem value="medium">{lang==='fr' ? "Moyenne" : "Medium"}</SelectItem>
                      <SelectItem value="high">{lang==='fr' ? "Élevée" : "High"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{lang==='fr' ? "Source de la checklist" : "Checklist source"}</div>
                    <p className="text-sm text-muted-foreground">
                      {lang === "fr"
                        ? "Utilisez la checklist déjà chargée. L’import de modèles CSV/JSON est réservé à Premium."
                        : "Use the existing checklist. CSV/JSON template import is reserved for Premium."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={source === "current" ? "default" : "outline"}
                      onClick={()=>setSource("current")}
                      disabled={currentRowsCount <= 0}
                    >
                      {lang==='fr' ? "Checklist actuelle" : "Current checklist"}
                      {currentRowsCount > 0 && <Badge className="ml-2" variant="secondary">{currentRowsCount}</Badge>}
                    </Button>
                    <Button
                      size="sm"
                      variant={source === "template" ? "default" : "outline"}
                      onClick={()=>setSource("template")}
                    >
                      {lang==='fr' ? "Template / import" : "Template / import"}
                    </Button>
                  </div>
                </div>

                {source === "current" && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100">
                    <div className="font-medium">
                      {lang === "fr" ? "Checklist actuelle — version non renseignée" : "Current checklist — version not set"}
                    </div>
                    <div className="mt-1">
                      {currentRowsCount > 0
                        ? (lang === "fr" ? `${currentRowsCount} contrôles seront repris avec des statuts réinitialisés.` : `${currentRowsCount} controls will be reused with reset statuses.`)
                        : (lang === "fr" ? "Aucune checklist actuelle disponible." : "No current checklist available.")}
                    </div>
                  </div>
                )}

                {source === "template" && (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-medium">{lang==='fr' ? "Template" : "Template"}</div>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="file"
                            accept=".json,.csv,application/json,text/csv"
                            style={{display:"none"}}
                            disabled={busy || !canImportTemplates}
                            onChange={async (e)=>{
                              const f = e.target.files?.[0];
                              if(!f) return;
                              const fileError = validateTemplateImportFile(f, lang);
                              if (fileError) {
                                toast.error(fileError);
                                (e.target as any).value = "";
                                return;
                              }
                              try{
                                setBusy(true);
                                const tpl = await onImportTemplate(frameworkId, f);
                                toast.success(lang==='fr' ? "Template importé" : "Template imported");
                                setTemplateId(tpl.id);
                              }catch(err){
                                console.error(err);
                                toast.error(err instanceof Error && err.message ? err.message : (lang==='fr' ? "Import impossible (format JSON/CSV)" : "Import failed (JSON/CSV format)"));
                              }finally{
                                setBusy(false);
                                (e.target as any).value = "";
                              }
                            }}
                          />
                          <Button size="sm" variant="outline" onClick={(ev)=>{
                            if (!canImportTemplates) {
                              onPremiumRequired?.(lang === "fr" ? "L’import de modèles personnalisés" : "Custom template import");
                              return;
                            }
                            const input = (ev.currentTarget.parentElement?.querySelector('input[type="file"]') as HTMLInputElement | null);
                            input?.click();
                          }} disabled={busy}>
                            <Paperclip className="h-4 w-4 mr-2" />
                            {lang==='fr' ? "Importer CSV/JSON" : "Import CSV/JSON"}
                          </Button>
                        </label>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const content = templateModelCSV(frameworkId, lang);
                            downloadTextFile(`template_${frameworkId}.csv`, content, "text/csv;charset=utf-8;");
                          }}
                          disabled={busy}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {lang === "fr" ? "Modèle CSV" : "CSV template"}
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const content = templateModelJSON(frameworkId, lang);
                            downloadTextFile(`template_${frameworkId}.json`, content, "application/json;charset=utf-8;");
                          }}
                          disabled={busy}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {lang === "fr" ? "Modèle JSON" : "JSON template"}
                        </Button>
                      </div>
                    </div>

                    {!canImportTemplates ? (
                      <div className="mt-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-cyan-900 dark:text-cyan-100">
                        {lang === "fr"
                          ? "Free permet de travailler sur l’audit en cours. Les imports de modèles personnalisés sont inclus dans Premium."
                          : "Free lets you work on the current audit. Custom template imports are included in Premium."}
                      </div>
                    ) : null}

                    {available.length > 0 ? (
                      <div className="mt-3">
                        <Select value={templateId} onValueChange={(v)=>setTemplateId(v)}>
                          <SelectTrigger className="w-full">
                            <span className="truncate">{selected?.name || (lang==='fr' ? "Choisir un template" : "Pick a template")}</span>
                          </SelectTrigger>
                          <SelectContent>
                            {available.map(tpl => (
                              <SelectItem key={tpl.id} value={tpl.id}>
                                {tpl.name}{tpl.version ? ` · ${tpl.version}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {selected ? (
                            <span className="flex flex-wrap items-center gap-2">
                              <span>{selected.rows.length} {lang==='fr' ? "contrôles" : "controls"}</span>
                              {selected.version && <Badge variant="outline">{frameworkLabel(selected.frameworkId, lang)}:{selected.version}</Badge>}
                              {selected.builtIn ? (
                                <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                                  {lang === "fr" ? "Catalogue versionné" : "Versioned catalog"} · {selected.revision}
                                </Badge>
                              ) : (
                                <span>• {lang==='fr' ? "créé" : "created"} {new Date(selected.createdAt).toLocaleString()}</span>
                              )}
                            </span>
                          ) : (
                            <span>{lang==='fr' ? "Aucun template sélectionné." : "No template selected."}</span>
                          )}
                        </div>
                        {selected?.sourceNotice && (
                          <div className="mt-3 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                            <div>{selected.sourceNotice}</div>
                            {selected.sourceUrl && (
                              <a className="mt-2 inline-block text-primary hover:underline" href={selected.sourceUrl} target="_blank" rel="noreferrer">
                                {lang === "fr" ? "Consulter la référence ISO" : "View the ISO reference"}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">
                        {lang==='fr' ? "Aucun template pour ce référentiel. Importez un fichier CSV/JSON ou utilisez la checklist actuelle." : "No template for this framework yet. Import a CSV/JSON file or use the current checklist."}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">{lang==='fr' ? "Périmètre audité" : "Audit scope"}</div>
                <textarea
                  value={scope}
                  onChange={(e)=>setScope(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder={lang==='fr' ? "Ex: SI interne, applications critiques, postes utilisateurs, prestataires IT, site de Paris..." : "e.g., internal IS, critical apps, endpoints, IT providers, Paris site..."}
                />
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">{lang==='fr' ? "Objectifs de l'audit" : "Audit objectives"}</div>
                <textarea
                  value={objectives}
                  onChange={(e)=>setObjectives(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder={lang==='fr' ? "Ex: mesurer la maturité SSI, prioriser les écarts impact 3, préparer un plan d’action vérifiable..." : "e.g., measure security maturity, prioritize impact-3 gaps, prepare a verifiable action plan..."}
                />
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">{lang==='fr' ? "Contexte métier / contraintes" : "Business context / constraints"}</div>
                <textarea
                  value={context}
                  onChange={(e)=>setContext(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder={lang==='fr' ? "Ex: activité critique, données sensibles, exigences clients/assureurs, ressources limitées..." : "e.g., critical activity, sensitive data, customer/insurer requirements, limited resources..."}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
              <div className="rounded-xl border p-4">
                <div className="mb-3 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  <div className="font-semibold">{lang === "fr" ? "Résumé de l’audit" : "Audit summary"}</div>
                </div>
                <div className="grid gap-3 text-sm">
                  <div className="flex justify-between gap-4 border-b pb-2">
                    <span className="text-muted-foreground">{lang === "fr" ? "Organisation" : "Organization"}</span>
                    <span className="text-right font-medium">{organization || "—"}</span>
                  </div>
                  <div className="flex justify-between gap-4 border-b pb-2">
                    <span className="text-muted-foreground">{lang === "fr" ? "Audit" : "Audit"}</span>
                    <span className="text-right font-medium">{name || "—"}</span>
                  </div>
                  <div className="flex justify-between gap-4 border-b pb-2">
                    <span className="text-muted-foreground">{lang === "fr" ? "Référentiel" : "Framework"}</span>
                    <span className="text-right font-medium">
                      {source === "template" && selected?.version
                        ? `${frameworkLabel(frameworkId, lang)}:${selected.version}`
                        : frameworkLabel(frameworkId, lang)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 border-b pb-2">
                    <span className="text-muted-foreground">{lang === "fr" ? "Checklist" : "Checklist"}</span>
                    <span className="text-right font-medium">
                      {source === "current"
                        ? `${currentRowsCount} ${lang === "fr" ? "contrôles actuels · non versionnés" : "current controls · unversioned"}`
                        : `${selected?.rows.length || 0} ${lang === "fr" ? "contrôles" : "controls"}${selected?.revision ? ` · révision ${selected.revision}` : ""}`}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 border-b pb-2">
                    <span className="text-muted-foreground">{lang === "fr" ? "Criticité" : "Criticality"}</span>
                    <span className="text-right font-medium">{criticalityLabel(criticality, lang)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{lang === "fr" ? "Auditeur" : "Auditor"}</span>
                    <span className="text-right font-medium">{auditor || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  <div className="font-semibold">{lang === "fr" ? "Après création" : "After creation"}</div>
                </div>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-2"><span className="font-semibold text-foreground">1.</span>{lang === "fr" ? "Évaluez les contrôles dans Listing." : "Assess controls in Listing."}</li>
                  <li className="flex gap-2"><span className="font-semibold text-foreground">2.</span>{lang === "fr" ? "Traitez les priorités dans Cette semaine." : "Handle priorities in This week."}</li>
                  <li className="flex gap-2"><span className="font-semibold text-foreground">3.</span>{lang === "fr" ? "Ajoutez les preuves attendues." : "Add expected evidence."}</li>
                  <li className="flex gap-2"><span className="font-semibold text-foreground">4.</span>{lang === "fr" ? "Pilotez la progression dans le tableau de bord." : "Track progress in the dashboard."}</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        <footer className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">
            {lang === "fr" ? `Étape ${step + 1} sur ${steps.length}` : `Step ${step + 1} of ${steps.length}`}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} disabled={busy}>{lang==='fr' ? "Annuler" : "Cancel"}</Button>
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={busy}>
                {lang === "fr" ? "Retour" : "Back"}
              </Button>
            )}
            {step < steps.length - 1 ? (
              <Button onClick={goNext} disabled={busy}>
                {lang === "fr" ? "Continuer" : "Continue"}
              </Button>
            ) : (
              <Button onClick={() => { void createAudit(); }} disabled={!stepValid[3] || !stepValid[2] || busy}>
                {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                {busy ? (lang === "fr" ? "Création…" : "Creating…") : (lang==='fr' ? "Créer l’audit" : "Create audit")}
              </Button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}


function AuditProfileDialog({
  open,
  session,
  lang,
  onClose,
  onSave,
}: {
  open: boolean;
  session: Session | null | undefined;
  lang: LangKey;
  onClose: () => void;
  onSave: (patch: Partial<Session>) => Promise<boolean>;
}) {
  useEffect(()=>{ document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [criticality, setCriticality] = useState<AuditCriticality>("medium");
  const [auditType, setAuditType] = useState<AuditType>("initial");
  const [auditDate, setAuditDate] = useState(defaultAuditDate());
  const [auditor, setAuditor] = useState("");
  const [sponsor, setSponsor] = useState("");
  const [scope, setScope] = useState("");
  const [objectives, setObjectives] = useState("");
  const [context, setContext] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !session) return;
    setName(session.name || "Audit");
    setOrganization(session.organization || "");
    setCriticality(session.criticality || "medium");
    setAuditType(session.auditType || "initial");
    setAuditDate(session.auditDate || defaultAuditDate());
    setAuditor(session.auditor || currentEvidenceActor());
    setSponsor(session.sponsor || "");
    setScope(session.scope || "");
    setObjectives(session.objectives || "");
    setContext(session.context || "");
  }, [open, session]);

  if (!open || !session) return null;

  const canSave = name.trim().length > 0;

  return (
    <div className="modal-overlay no-print" role="dialog" aria-modal="true" onClick={() => { if (!busy) onClose(); }}>
      <div className="modal wizard-modal" onClick={e=>e.stopPropagation()}>
        <header className="flex items-center justify-between">
          <span>{lang === "fr" ? "Fiche d’audit professionnelle" : "Professional audit profile"}</span>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}><X className="h-4 w-4" /></Button>
        </header>
        <div className="body" style={{color:"inherit"}}>
          <div className="text-sm text-muted-foreground mb-3">
            {lang === "fr"
              ? "Ces informations apparaissent dans l’en-tête de l’audit et dans le rapport exporté."
              : "These details appear in the audit header and exported report."}
          </div>
          <div className="wizard-grid">
            <div className="sm:col-span-2">
              <div className="text-xs text-muted-foreground mb-1">{lang === "fr" ? "Nom de l’audit" : "Audit name"}</div>
              <Input value={name} onChange={(e)=>setName(e.target.value)} />
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">{lang === "fr" ? "Organisation auditée" : "Audited organization"}</div>
              <Input value={organization} onChange={(e)=>setOrganization(e.target.value)} />
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">{lang === "fr" ? "Date de l’audit" : "Audit date"}</div>
              <Input type="date" value={auditDate} onChange={(e)=>setAuditDate(e.target.value)} />
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">{lang === "fr" ? "Référentiel" : "Framework"}</div>
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <div className="font-medium">{sessionFrameworkLabel(session, lang)}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {lang === "fr"
                    ? "Le référentiel et sa version sont figés à la création pour préserver la traçabilité de l’audit."
                    : "The framework and version are fixed at creation to preserve audit traceability."}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">{lang === "fr" ? "Criticité" : "Criticality"}</div>
              <Select value={criticality} onValueChange={(v)=>setCriticality(v as AuditCriticality)}>
                <SelectTrigger className="w-full"><span>{criticalityLabel(criticality, lang)}</span></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{lang === "fr" ? "Faible" : "Low"}</SelectItem>
                  <SelectItem value="medium">{lang === "fr" ? "Moyenne" : "Medium"}</SelectItem>
                  <SelectItem value="high">{lang === "fr" ? "Élevée" : "High"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">{lang === "fr" ? "Type d’audit" : "Audit type"}</div>
              <Select value={auditType} onValueChange={(v)=>setAuditType(v as AuditType)}>
                <SelectTrigger className="w-full"><span>{auditTypeLabel(auditType, lang)}</span></SelectTrigger>
                <SelectContent>
                  <SelectItem value="initial">{lang === "fr" ? "Audit initial" : "Initial audit"}</SelectItem>
                  <SelectItem value="follow_up">{lang === "fr" ? "Suivi / réévaluation" : "Follow-up / reassessment"}</SelectItem>
                  <SelectItem value="internal">{lang === "fr" ? "Audit interne" : "Internal audit"}</SelectItem>
                  <SelectItem value="external">{lang === "fr" ? "Audit externe" : "External audit"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">{lang === "fr" ? "Auditeur / Responsable mission" : "Auditor / engagement lead"}</div>
              <Input value={auditor} onChange={(e)=>setAuditor(e.target.value)} />
            </div>

            <div className="sm:col-span-2">
              <div className="text-xs text-muted-foreground mb-1">{lang === "fr" ? "Commanditaire" : "Sponsor"}</div>
              <Input value={sponsor} onChange={(e)=>setSponsor(e.target.value)} placeholder={lang === "fr" ? "Direction, DSI, RSSI..." : "Management, CIO, CISO..."} />
            </div>

            <div className="sm:col-span-2">
              <div className="text-xs text-muted-foreground mb-1">{lang === "fr" ? "Périmètre audité" : "Audit scope"}</div>
              <textarea value={scope} onChange={(e)=>setScope(e.target.value)} rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
            </div>

            <div className="sm:col-span-2">
              <div className="text-xs text-muted-foreground mb-1">{lang === "fr" ? "Objectifs de l’audit" : "Audit objectives"}</div>
              <textarea value={objectives} onChange={(e)=>setObjectives(e.target.value)} rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
            </div>

            <div className="sm:col-span-2">
              <div className="text-xs text-muted-foreground mb-1">{lang === "fr" ? "Contexte métier / contraintes" : "Business context / constraints"}</div>
              <textarea value={context} onChange={(e)=>setContext(e.target.value)} rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
            </div>
          </div>
        </div>
        <footer>
          <Button variant="ghost" onClick={onClose} disabled={busy}>{lang === "fr" ? "Annuler" : "Cancel"}</Button>
          <Button
            onClick={() => {
              if (!canSave || busy) return;
              setBusy(true);
              void onSave({
                  name: name.trim(),
                  organization: organization.trim(),
                  criticality,
                  auditType,
                  auditDate,
                  auditor: auditor.trim(),
                  sponsor: sponsor.trim(),
                  scope: scope.trim(),
                  objectives: objectives.trim(),
                  context: context.trim(),
                })
                .then((saved) => { if (saved) onClose(); })
                .finally(() => setBusy(false));
            }}
            disabled={!canSave || busy}
          >
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
            {busy ? (lang === "fr" ? "Enregistrement…" : "Saving…") : (lang === "fr" ? "Enregistrer la fiche" : "Save profile")}
          </Button>
        </footer>
      </div>
    </div>
  );
}

function AuditIdentityBanner({ session, lang, onEdit }: { session: Session | null | undefined; lang: LangKey; onEdit: () => void }) {
  if (!session) return null;

  const completion = auditProfileCompletion(session);
  const complete = completion.done === completion.total;
  const org = session.organization?.trim() || (lang === "fr" ? "Organisation non renseignée" : "Organization not set");
  const auditor = session.auditor?.trim() || (lang === "fr" ? "Auditeur non renseigné" : "Auditor not set");
  const scope = session.scope?.trim() || (lang === "fr" ? "Périmètre non renseigné" : "Scope not set");
  const objectives = session.objectives?.trim() || (lang === "fr" ? "Objectifs non renseignés" : "Objectives not set");

  return (
    <div className="px-4 pb-3 bg-background/60 no-print">
      <div className="rounded-2xl border bg-card/70 p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge variant="outline" className={complete ? "border-emerald-500/50 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10" : "border-amber-500/50 text-amber-700 dark:text-amber-300 bg-amber-500/10"}>
                {complete
                  ? (lang === "fr" ? "Fiche audit complète" : "Audit profile complete")
                  : (lang === "fr" ? `Fiche audit ${completion.done}/${completion.total}` : `Audit profile ${completion.done}/${completion.total}`)}
              </Badge>
              <Badge variant="secondary">{sessionFrameworkLabel(session, lang)}</Badge>
              <Badge
                variant="outline"
                className={isVersionedFrameworkSession(session)
                  ? "border-emerald-500/50 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10"
                  : "border-amber-500/50 text-amber-700 dark:text-amber-300 bg-amber-500/10"}
              >
                {isVersionedFrameworkSession(session)
                  ? (lang === "fr" ? `Référentiel versionné · rév. ${session.frameworkCatalogRevision}` : `Versioned framework · rev. ${session.frameworkCatalogRevision}`)
                  : (lang === "fr" ? "Version non renseignée" : "Version not set")}
              </Badge>
              <Badge variant="outline">{auditTypeLabel(session.auditType, lang)}</Badge>
              <Badge variant="outline">{lang === "fr" ? "Criticité " : "Criticality "}{criticalityLabel(session.criticality, lang)}</Badge>
            </div>
            <h2 className="text-lg font-semibold truncate">{org}</h2>
            <p className="text-sm text-muted-foreground truncate">{session.name} • {formatAuditDate(session.auditDate, lang)} • {auditor}</p>
          </div>
          <Button size="sm" variant={complete ? "outline" : "default"} onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            {complete ? (lang === "fr" ? "Modifier la fiche" : "Edit profile") : (lang === "fr" ? "Compléter la fiche" : "Complete profile")}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4 text-sm">
          <div className="rounded-xl border p-3">
            <div className="text-xs text-muted-foreground mb-1">{lang === "fr" ? "Périmètre" : "Scope"}</div>
            <div className="line-clamp-3 whitespace-pre-wrap">{scope}</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-muted-foreground mb-1">{lang === "fr" ? "Objectifs" : "Objectives"}</div>
            <div className="line-clamp-3 whitespace-pre-wrap">{objectives}</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-muted-foreground mb-1">{lang === "fr" ? "Commanditaire / contexte" : "Sponsor / context"}</div>
            <div className="line-clamp-3 whitespace-pre-wrap">{[session.sponsor, session.context].filter(Boolean).join(" — ") || (lang === "fr" ? "Non renseigné" : "Not set")}</div>
          </div>
        </div>
      </div>
    </div>
  );
}



function Sidebar({ current, onNavigate, lang }: { current: string; onNavigate: (k: string) => void; lang: LangKey }) {
  const t = I18N[lang];

  const items = [
    { key: "listing", label: t.listing, icon: <ListChecks className="h-5 w-5" /> },
    { key: "weekly", label: lang === "fr" ? "Cette semaine" : "This week", icon: <Lightbulb className="h-5 w-5" /> },
    { key: "plan", label: t.actionPlan, icon: <ListTodo className="h-5 w-5" /> },
    { key: "risks", label: lang === "fr" ? "Risques" : "Risks", icon: <AlertTriangle className="h-5 w-5" /> },
    { key: "dashboard", label: t.dashboard, icon: <BarChart3 className="h-5 w-5" /> },
    { key: "journal", label: lang === "fr" ? "Journal d’audit" : "Audit log", icon: <History className="h-5 w-5" /> },
    { key: "settings", label: lang === "fr" ? "Paramètres" : "Settings", icon: <Settings className="h-5 w-5" /> },
  ];

  return (
    <aside
      className="hidden md:block no-print"
      style={{
        width: 256,
        minWidth: 256,
        minHeight: "calc(100vh - 64px)",
        padding: "24px 18px",
        background: "rgba(8, 18, 38, 0.86)",
        borderRight: "1px solid rgba(148, 163, 184, 0.14)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <img
          src="/icon-192.png"
          alt=""
          aria-hidden="true"
          style={{
            width: 58,
            height: 58,
            flexShrink: 0,
            borderRadius: 14,
            objectFit: "contain",
            display: "block",
          }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#f8fbff", lineHeight: 1 }}>
            GapTrack
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: "#94a3b8", lineHeight: 1.2 }}>
            Audit SSI
          </div>
        </div>
      </div>

      <div
        style={{
          height: 1,
          background: "rgba(148, 163, 184, 0.14)",
          marginBottom: 26,
        }}
      />

      <nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((it) => {
          const active = current === it.key;

          return (
            <button
              key={it.key}
              type="button"
              onClick={() => onNavigate(it.key)}
              aria-current={active ? "page" : undefined}
              style={{
                width: "100%",
                height: 56,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: 14,
                padding: "0 18px",
                border: 0,
                borderRadius: 10,
                cursor: "pointer",
                textAlign: "left",
                background: active ? "linear-gradient(180deg, #68aefe, #5298f4)" : "transparent",
                color: active ? "#06101f" : "#e5edf8",
                boxShadow: active ? "0 16px 34px rgba(47, 113, 255, 0.28)" : "none",
                fontSize: 15,
                fontWeight: 750,
                lineHeight: 1,
              }}
            >
              <span
                style={{
                  width: 24,
                  minWidth: 24,
                  height: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {it.icon}
              </span>

              <span
                style={{
                  display: "block",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {it.label}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}


function PremiumFeatureNotice({ lang, title, description, bullets, onRequestPremium }: { lang: LangKey; title: string; description: string; bullets?: string[]; onRequestPremium: () => void }) {
  return (
    <div className="p-4">
      <Card className="glass-card border-cyan-500/30 bg-cyan-500/5">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-800 dark:text-cyan-100">
                <ShieldCheck className="h-4 w-4" />
                {lang === "fr" ? "Premium" : "Premium"}
              </div>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
              {bullets?.length ? (
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {bullets.map((item) => (
                    <div key={item} className="flex items-start gap-2 rounded-xl border bg-background/60 p-3 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <Button type="button" onClick={onRequestPremium} className="shrink-0">
              <Mail className="mr-2 h-4 w-4" />
              {lang === "fr" ? "Demander Premium" : "Request Premium"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MobileNav({ current, onNavigate, lang }: { current: string; onNavigate: (k: string) => void; lang: LangKey }) {
  const t = I18N[lang];
  const items = [
    { key: "listing", label: t.listing, icon: <ListChecks className="h-5 w-5" /> },
    { key: "weekly", label: lang === "fr" ? "Semaine" : "Week", icon: <Lightbulb className="h-5 w-5" /> },
    { key: "plan", label: t.actionPlan, icon: <ListTodo className="h-5 w-5" /> },
    { key: "risks", label: lang === "fr" ? "Risques" : "Risks", icon: <AlertTriangle className="h-5 w-5" /> },
    { key: "dashboard", label: t.dashboard, icon: <BarChart3 className="h-5 w-5" /> },
    { key: "journal", label: lang === "fr" ? "Journal" : "Log", icon: <History className="h-5 w-5" /> },
    { key: "settings", label: lang === "fr" ? "Param." : "Settings", icon: <Settings className="h-5 w-5" /> },
  ] as const;

  return (
    <div
      className="mobile-nav-shell fixed bottom-0 inset-x-0 z-30 bg-background/90 backdrop-blur md:hidden no-print"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto max-w-screen-sm px-2 py-2 flex items-stretch gap-1">
        {items.map((it) => {
          const active = current === it.key;
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => onNavigate(it.key)}
              className={
                "flex-1 rounded-xl px-2 py-2 flex flex-col items-center justify-center gap-1 text-xs " +
                (active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50")
              }
              aria-current={active ? "page" : undefined}
            >
              {it.icon}
              <span className="truncate">{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}


function Toolbar({
  lang,
  onUndo,
  onRedo,
  sessions,
  activeSessionId,
  onChangeSession,
  onCreateSession,
  onDuplicateSession,
  onDeleteSession,
  saveState,
  onRenameSession,
  onRetrySync,
  activeUser,
  canChangeSession = true,
  canEditAuditSession = true,
  canManageUsers,
  canManageAudits,
  canDeleteAudits,
  onOpenUsers,
  onRequestPremium,
  onLogout
}: {
  lang: LangKey;
  setLang: (l: LangKey) => void;
  theme: "light" | "dark";
  setTheme: (m: "light" | "dark") => void;
  onUndo: () => void;
  onRedo: () => void;
  sessions: Session[];
  activeSessionId: string;
  onChangeSession: (id: string) => void;
  onCreateSession: () => void;
  onDuplicateSession: () => void;
  onDeleteSession: () => void;
  saveState: SaveState;
  lastSavedAt: number | null;
  onRenameSession: (id: string, name: string) => void;
  onRetrySync?: () => void;
  activeUser?: AppUser | null;
  canChangeSession?: boolean;
  canEditAuditSession?: boolean;
  canManageUsers?: boolean;
  canManageAudits?: boolean;
  canDeleteAudits?: boolean;
  onOpenUsers?: () => void;
  onRequestPremium?: () => void;
  onLogout?: () => void;
}) {
  const t = I18N[lang];
  const [showSessionActions, setShowSessionActions] = useState(false);
  const saveIndicatorClass =
    saveState === "error"
      ? "border-destructive/40 text-destructive"
      : saveState === "sync_error"
        ? "border-amber-500/40 text-amber-700 dark:text-amber-300"
        : saveState === "local_only"
          ? "border-sky-500/40 text-sky-700 dark:text-sky-300"
          : "text-muted-foreground";

  return (
    <div className="toolbar-shell sticky top-0 z-20 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 no-print">
      <div className="p-2 flex flex-col gap-2">
        {/* Row 1: brand + quick toggles */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <img
              src="/icon-192.png"
              alt=""
              aria-hidden="true"
              className="h-7 w-7 shrink-0 rounded-md object-contain"
              loading="eager"
              decoding="async"
            />
            <span className="font-semibold text-sm">GapTrack</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">Audit SSI</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Annuler / Rétablir (compact on mobile) */}
            <Button size="sm" variant="outline" className="px-2" onClick={onUndo} disabled={!canEditAuditSession} title={lang === "fr" ? "Annuler" : "Undo"}>
              <Undo2 className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">{lang === "fr" ? "Annuler" : "Undo"}</span>
            </Button>
            <Button size="sm" variant="outline" className="px-2" onClick={onRedo} disabled={!canEditAuditSession} title={lang === "fr" ? "Rétablir" : "Redo"}>
              <Redo2 className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">{lang === "fr" ? "Rétablir" : "Redo"}</span>
            </Button>

            {activeUser && (
              <div
                className="hidden h-9 max-w-[260px] items-center gap-1 rounded-md border border-input bg-background px-3 text-sm md:flex"
                title={userRoleDescription(activeUser.role, lang)}
                role="status"
                aria-label={lang === "fr" ? "Utilisateur connecté" : "Signed-in user"}
              >
                <Users className="h-4 w-4 shrink-0" />
                <span className="truncate">{activeUser.name}</span>
                <Badge variant="outline" className={"ml-2 " + userRoleBadgeClass(activeUser.role)}>
                  {userRoleLabel(activeUser.role, lang)}
                </Badge>
                <Badge variant="outline" className={"ml-1 " + subscriptionPlanBadgeClass(activeUser.subscriptionPlan)}>
                  {subscriptionPlanLabel(activeUser.subscriptionPlan)}
                </Badge>
              </div>
            )}

            {activeUser && !isPremiumPlan(activeUser.subscriptionPlan) && onRequestPremium && (
              <Button
                size="sm"
                variant="outline"
                className="hidden lg:flex"
                onClick={onRequestPremium}
                title={lang === "fr" ? "Demander l’activation Premium" : "Request Premium activation"}
              >
                <Mail className="h-4 w-4 mr-1" />
                {lang === "fr" ? "Demander Premium" : "Request Premium"}
              </Button>
            )}

            {activeUser && (
              <Button
                size="sm"
                variant="ghost"
                className="px-2"
                onClick={onLogout}
                title={lang === "fr" ? "Se déconnecter" : "Sign out"}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Row 2: sessions + autosave */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
          <Select value={activeSessionId} onValueChange={(v) => onChangeSession(v)} disabled={!canChangeSession}>
            <SelectTrigger className="w-full sm:w-[260px]" title={t.session} disabled={!canChangeSession}>
              <span className="truncate">{sessions.find((s) => s.id === activeSessionId)?.name || t.session}</span>
            </SelectTrigger>
            <SelectContent>
              {sessions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={showSessionActions ? "default" : "outline"}
              onClick={() => setShowSessionActions((v) => !v)}
              disabled={!canChangeSession}
              aria-expanded={showSessionActions}
              title={lang === "fr" ? "Actions de session" : "Session actions"}
            >
              {lang === "fr" ? "Plus" : "More"}
            </Button>

            {showSessionActions && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-background/80 p-2">
                <Button size="sm" variant="outline" onClick={onCreateSession} title={t.newSession} disabled={!canManageAudits || !canEditAuditSession}>
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">{t.newSession}</span>
                </Button>
                <Button size="sm" variant="outline" onClick={onDuplicateSession} title={t.duplicate} disabled={!canManageAudits || !canEditAuditSession}>
                  <Copy className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">{t.duplicate}</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canManageAudits || !canEditAuditSession}
                  onClick={() => {
                    const current = sessions.find((s) => s.id === activeSessionId)?.name || "";
                    const proposed = window.prompt(lang === "fr" ? "Nom de la session" : "Session name", current);
                    if (proposed === null) return;
                    onRenameSession(activeSessionId, proposed);
                  }}
                  title={lang === "fr" ? "Renommer" : "Rename"}
                >
                  <Pencil className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">{lang === "fr" ? "Renommer" : "Rename"}</span>
                </Button>

                <Button size="sm" variant="destructive" onClick={onDeleteSession} title={t.delete} disabled={!canDeleteAudits || !canEditAuditSession}>
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">{t.delete}</span>
                </Button>

                <Button size="sm" variant="outline" onClick={onOpenUsers} title={lang === "fr" ? "Utilisateurs" : "Users"} disabled={!canManageUsers}>
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">{lang === "fr" ? "Utilisateurs" : "Users"}</span>
                </Button>
              </div>
            )}
          </div>
          {/* Autosave + server sync indicator */}
          <div
            className={
              "flex items-center gap-1 rounded-full border px-2 py-1 text-xs sm:ml-auto " +
              saveIndicatorClass
            }
            title={saveStateTitle(saveState, lang)}
          >
            {saveState === "saving" || saveState === "syncing" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : saveState === "sync_error" || saveState === "error" ? (
              <AlertCircle className="h-3.5 w-3.5" />
            ) : saveState === "local_only" ? (
              <Info className="h-3.5 w-3.5" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            <span>{saveStateLabel(saveState, lang)}</span>
            {saveState === "sync_error" && onRetrySync && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="ml-1 h-5 px-1.5 text-xs"
                onClick={onRetrySync}
                title={t.retrySync}
              >
                <Redo2 className="h-3 w-3 sm:mr-1" />
                <span className="hidden sm:inline">{t.retrySync}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}



function SettingsProfileView({
  activeUser,
  lang,
  onSaveProfile,
  onRequestPasswordReset,
  onLogout,
  onRequestPremium,
}: {
  activeUser: AppUser | null;
  lang: LangKey;
  onSaveProfile: (patch: { name: string; organization?: string }) => Promise<boolean>;
  onRequestPasswordReset: () => Promise<void>;
  onLogout: () => void;
  onRequestPremium?: () => void;
}) {
  const [name, setName] = useState(activeUser?.name || "");
  const [organization, setOrganization] = useState(activeUser?.organization || "");
  const [saving, setSaving] = useState(false);
  const [securityAction, setSecurityAction] = useState<"password" | "logout" | null>(null);
  const [privacyAction, setPrivacyAction] = useState<"export" | "deletion" | null>(null);
  const [mfaAction, setMfaAction] = useState<"refresh" | "enroll" | "verify" | "unenroll" | null>(null);
  const [mfaVerifyCode, setMfaVerifyCode] = useState("");
  const [mfaEnrollment, setMfaEnrollment] = useState<{ factorId: string; qrCode?: string; secret?: string } | null>(null);
  const [mfaStatus, setMfaStatus] = useState<{ factors: any[]; currentLevel?: string; nextLevel?: string; error?: string }>({ factors: [] });

  useEffect(() => {
    setName(activeUser?.name || "");
    setOrganization(activeUser?.organization || "");
  }, [activeUser?.id, activeUser?.name, activeUser?.organization]);

  useEffect(() => {
    setMfaEnrollment(null);
    setMfaVerifyCode("");
    if (!activeUser?.id) {
      setMfaStatus({ factors: [] });
      return;
    }

    void refreshMfaStatus(false);
  }, [activeUser?.id]);

  const initials = React.useMemo(() => {
    const source = (activeUser?.name || activeUser?.email || "GT").trim();
    const parts = source.split(/[\s._-]+/).filter(Boolean);
    const letters = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : source.slice(0, 2);
    return letters.toUpperCase();
  }, [activeUser?.email, activeUser?.name]);

  const locale = lang === "fr" ? "fr-FR" : "en-US";
  const formatAccountDate = (value?: string) => {
    if (!value) return lang === "fr" ? "Non disponible" : "Unavailable";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(locale);
  };

  if (!activeUser) {
    return (
      <div className="p-4">
        <Card className="glass-card">
          <CardContent className="p-6 text-sm text-muted-foreground">
            {lang === "fr" ? "Aucun utilisateur connecté." : "No signed-in user."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const trimmedName = name.trim();
  const trimmedOrganization = organization.trim();
  const originalOrganization = activeUser.organization || "";
  const hasChanges = trimmedName !== activeUser.name || trimmedOrganization !== originalOrganization;
  const canSave = Boolean(trimmedName) && hasChanges && !saving;

  async function saveProfile() {
    if (!trimmedName) {
      toast.error(lang === "fr" ? "Le nom est obligatoire." : "Name is required.");
      return;
    }

    setSaving(true);
    try {
      const ok = await onSaveProfile({
        name: trimmedName,
        organization: trimmedOrganization || undefined,
      });
      if (ok) {
        setName(trimmedName);
        setOrganization(trimmedOrganization);
      }
    } finally {
      setSaving(false);
    }
  }

  async function requestPasswordReset() {
    if (securityAction) return;
    setSecurityAction("password");
    try {
      await onRequestPasswordReset();
    } finally {
      setSecurityAction(null);
    }
  }

  function getMfaClient() {
    return (supabase.auth as any).mfa;
  }

  async function refreshMfaStatus(showBusy = true) {
    const mfa = getMfaClient();

    if (!mfa?.listFactors) {
      setMfaStatus({
        factors: [],
        error: lang === "fr" ? "La MFA Supabase n’est pas disponible sur ce client." : "Supabase MFA is not available on this client.",
      });
      return;
    }

    if (showBusy) setMfaAction("refresh");
    try {
      const factorsResult = await mfa.listFactors();
      if (factorsResult.error) throw factorsResult.error;

      let currentLevel: string | undefined;
      let nextLevel: string | undefined;

      if (mfa.getAuthenticatorAssuranceLevel) {
        const aalResult = await mfa.getAuthenticatorAssuranceLevel();
        if (aalResult.error) throw aalResult.error;
        currentLevel = aalResult.data?.currentLevel;
        nextLevel = aalResult.data?.nextLevel;
      }

      setMfaStatus({
        factors: Array.isArray(factorsResult.data?.totp) ? factorsResult.data.totp : [],
        currentLevel,
        nextLevel,
      });
    } catch (error) {
      console.error("Unable to refresh MFA status", error);
      setMfaStatus((previous) => ({ ...previous, error: authErrorMessage(error) }));
    } finally {
      if (showBusy) setMfaAction(null);
    }
  }

  async function startMfaEnrollment() {
    if (mfaAction) return;
    const mfa = getMfaClient();
    if (!mfa?.enroll) {
      toast.error(lang === "fr" ? "La MFA Supabase n’est pas disponible." : "Supabase MFA is not available.");
      return;
    }

    setMfaAction("enroll");
    setMfaStatus((previous) => ({ ...previous, error: undefined }));
    setMfaVerifyCode("");

    try {
      const { data, error } = await mfa.enroll({ factorType: "totp" });
      if (error) throw error;

      setMfaEnrollment({
        factorId: String(data.id),
        qrCode: typeof data.totp?.qr_code === "string" ? data.totp.qr_code : undefined,
        secret: typeof data.totp?.secret === "string" ? data.totp.secret : undefined,
      });

      toast.info(lang === "fr" ? "Scannez le QR code puis validez avec le code généré." : "Scan the QR code, then validate with the generated code.");
    } catch (error) {
      console.error("Unable to start MFA enrollment", error);
      toast.error(authErrorMessage(error));
    } finally {
      setMfaAction(null);
    }
  }

  async function confirmMfaEnrollment() {
    if (mfaAction || !mfaEnrollment) return;

    const code = mfaVerifyCode.replace(/\s+/g, "").trim();
    if (!/^\d{6}$/.test(code)) {
      toast.error(lang === "fr" ? "Saisissez le code à 6 chiffres de votre application d’authentification." : "Enter the 6-digit code from your authenticator app.");
      return;
    }

    const mfa = getMfaClient();
    setMfaAction("verify");

    try {
      const challenge = await mfa.challenge({ factorId: mfaEnrollment.factorId });
      if (challenge.error) throw challenge.error;

      const verify = await mfa.verify({
        factorId: mfaEnrollment.factorId,
        challengeId: challenge.data.id,
        code,
      });
      if (verify.error) throw verify.error;

      setMfaEnrollment(null);
      setMfaVerifyCode("");
      await refreshMfaStatus(false);
      toast.success(lang === "fr" ? "Double authentification activée." : "Two-factor authentication enabled.");
    } catch (error) {
      console.error("Unable to confirm MFA enrollment", error);
      toast.error(authErrorMessage(error));
    } finally {
      setMfaAction(null);
    }
  }

  async function unenrollMfaFactor(factorId: string) {
    if (mfaAction) return;

    const confirmed = window.confirm(
      lang === "fr"
        ? "Désactiver la double authentification pour ce compte ?"
        : "Disable two-factor authentication for this account?"
    );
    if (!confirmed) return;

    const mfa = getMfaClient();
    setMfaAction("unenroll");

    try {
      const { error } = await mfa.unenroll({ factorId });
      if (error) throw error;

      setMfaEnrollment(null);
      setMfaVerifyCode("");
      await refreshMfaStatus(false);
      toast.success(lang === "fr" ? "Double authentification désactivée." : "Two-factor authentication disabled.");
    } catch (error) {
      console.error("Unable to disable MFA", error);
      toast.error(authErrorMessage(error));
    } finally {
      setMfaAction(null);
    }
  }

  async function copyMfaSecret() {
    if (!mfaEnrollment?.secret) return;
    try {
      await navigator.clipboard.writeText(mfaEnrollment.secret);
      toast.success(lang === "fr" ? "Clé secrète copiée." : "Secret key copied.");
    } catch {
      toast.error(lang === "fr" ? "Impossible de copier la clé automatiquement." : "Unable to copy the key automatically.");
    }
  }

  function confirmLogout() {
    const confirmed = window.confirm(
      lang === "fr"
        ? "Voulez-vous vraiment vous déconnecter de cette session ?"
        : "Do you really want to sign out of this session?"
    );

    if (!confirmed) return;
    setSecurityAction("logout");
    onLogout();
  }

  const currentSubscriptionPlan = normalizeSubscriptionPlan(activeUser.subscriptionPlan);
  const verifiedMfaFactors = mfaStatus.factors.filter((factor) => factor?.status === "verified");
  const pendingMfaFactors = mfaStatus.factors.filter((factor) => factor?.status && factor.status !== "verified");
  const hasMfaEnabled = verifiedMfaFactors.length > 0;
  const mfaNeedsVerification = mfaStatus.nextLevel === "aal2" && mfaStatus.currentLevel !== "aal2";
  const hasPremiumSubscription = currentSubscriptionPlan === "premium";
  const subscriptionIncludedFeatures = hasPremiumSubscription
    ? [
        lang === "fr" ? "Audits illimités" : "Unlimited audits",
        lang === "fr" ? "Exports PDF / CSV et journal exportable" : "PDF / CSV exports and exportable audit log",
        lang === "fr" ? "Utilisateurs, rôles et collaboration équipe" : "Users, roles, and team collaboration",
        lang === "fr" ? "Stockage cloud sécurisé des preuves" : "Secure cloud evidence storage",
        lang === "fr" ? "Validation / refus des preuves" : "Evidence validation / rejection workflow",
        lang === "fr" ? "Import de modèles personnalisés" : "Custom template imports",
      ]
    : [
        lang === "fr" ? "1 audit actif pour tester GapTrack" : "1 active audit to try GapTrack",
        lang === "fr" ? "1 utilisateur, usage individuel" : "1 user, individual use",
        lang === "fr" ? "Saisie des contrôles et suivi des écarts" : "Control assessment and gap tracking",
        lang === "fr" ? "Preuves et notes stockées localement" : "Locally stored evidence and notes",
      ];
  const subscriptionLockedFeatures = hasPremiumSubscription
    ? []
    : [
        lang === "fr" ? "Audits illimités" : "Unlimited audits",
        lang === "fr" ? "Exports PDF / CSV" : "PDF / CSV exports",
        lang === "fr" ? "Utilisateurs, rôles et collaboration" : "Users, roles, and collaboration",
        lang === "fr" ? "Stockage cloud sécurisé des preuves" : "Secure cloud evidence storage",
        lang === "fr" ? "Validation / refus des preuves" : "Evidence validation / rejection",
        lang === "fr" ? "Modèles personnalisés" : "Custom templates",
        lang === "fr" ? "Journal d’audit avancé" : "Advanced audit log",
      ];

  function requestPremiumFromSettings() {
    if (onRequestPremium) {
      onRequestPremium();
      return;
    }

    window.location.href = buildPremiumRequestMailto({
      email: activeUser?.email || "",
      name: activeUser?.name || "",
      organization: activeUser?.organization || "",
      source: lang === "fr" ? "Paramètres - Gestion de l’abonnement" : "Settings - Subscription management",
    });
  }

  const accountId = activeUser.id || "";
  const accountEmail = activeUser.email || "";
  const accountName = activeUser.name || "";
  const accountOrganization = activeUser.organization || "";
  const accountRole = activeUser.role;
  const accountCreatedAt = activeUser.createdAt;
  const accountLastLoginAt = activeUser.lastLoginAt || null;
  const accountIsActive = activeUser.active !== false;
  const exportDate = () => new Date().toISOString().slice(0, 10);

  function exportAccountPrivacyData() {
    if (privacyAction) return;

    setPrivacyAction("export");
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        source: "GapTrack - Paramètres - Confidentialité et données",
        account: {
          id: accountId,
          name: accountName,
          email: accountEmail,
          organization: accountOrganization || null,
          role: accountRole,
          subscriptionPlan: currentSubscriptionPlan,
          createdAt: accountCreatedAt,
          lastLoginAt: accountLastLoginAt,
          active: accountIsActive,
        },
        privacy: {
          authenticationProvider: "Supabase Auth",
          profileStorage: "public.gaptrack_profiles",
          auditStorage: "public.gaptrack_audit_sessions",
          evidenceStorage: EVIDENCE_STORAGE_BUCKET,
          localEvidenceCache: EVIDENCE_FILES_DB_NAME,
          note:
            lang === "fr"
              ? "Cet export contient les informations de compte visibles dans votre profil GapTrack. Les audits et preuves complets restent exportables depuis leurs écrans dédiés selon vos droits."
              : "This export contains the account information visible in your GapTrack profile. Full audits and evidence remain exportable from their dedicated screens according to your permissions.",
        },
      };

      const filename = `gaptrack-donnees-compte-${safeStorageFilename(accountEmail || "utilisateur")}-${exportDate()}.json`;
      downloadBlob(
        new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" }),
        filename
      );

      toast.success(lang === "fr" ? "Export des données du compte généré." : "Account data export generated.");
    } finally {
      setPrivacyAction(null);
    }
  }

  async function requestAccountDeletionByMagicLink() {
    if (privacyAction) return;

    const typedEmail = normalizeEmail(
      window.prompt(
        lang === "fr"
          ? `Pour recevoir le lien de validation, retapez votre e-mail : ${accountEmail}`
          : `To receive the validation link, retype your email: ${accountEmail}`
      ) || ""
    );

    if (!typedEmail) return;

    if (typedEmail !== normalizeEmail(accountEmail)) {
      toast.error(lang === "fr" ? "L’e-mail saisi ne correspond pas au compte connecté." : "The email you entered does not match the signed-in account.");
      return;
    }

    setPrivacyAction("deletion");
    try {
      const redirectTo = `${window.location.origin}/app?gaptrack_delete_confirm=1`;
      const { error } = await supabase.auth.signInWithOtp({
        email: accountEmail,
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: false,
        },
      });

      if (error) throw error;

      toast.success(
        lang === "fr"
          ? "E-mail de validation envoyé. Cliquez sur le lien reçu pour confirmer la suppression."
          : "Validation email sent. Click the link you received to confirm deletion."
      );
    } catch (error) {
      console.error("Unable to send account deletion magic link.", error);
      toast.error(authErrorMessage(error));
    } finally {
      setPrivacyAction(null);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <Card className="glass-card overflow-hidden">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border bg-background text-xl font-bold shadow-sm">
                {initials}
              </div>
              <div className="min-w-0">
                <CardTitle className="flex flex-wrap items-center gap-2">
                  <Users className="h-5 w-5" />
                  {lang === "fr" ? "Profil utilisateur" : "User profile"}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {lang === "fr"
                    ? "Gérez les informations affichées dans les audits, preuves et journaux."
                    : "Manage the information shown in audits, evidence, and logs."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={userRoleBadgeClass(activeUser.role)}>
                {userRoleLabel(activeUser.role, lang)}
              </Badge>
              <Badge variant="outline" className={subscriptionPlanBadgeClass(activeUser.subscriptionPlan)}>
                {subscriptionPlanLabel(activeUser.subscriptionPlan)}
              </Badge>
              <Badge variant="outline" className={activeUser.active === false ? "border-rose-500/50 text-rose-700 dark:text-rose-300 bg-rose-500/10" : "border-emerald-500/50 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10"}>
                {activeUser.active === false
                  ? (lang === "fr" ? "Compte désactivé" : "Inactive")
                  : (lang === "fr" ? "Compte actif" : "Active")}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="settings-profile-name">
                {lang === "fr" ? "Nom affiché" : "Display name"}
              </label>
              <Input
                id="settings-profile-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                placeholder={lang === "fr" ? "Votre nom" : "Your name"}
              />
              <p className="text-xs text-muted-foreground">
                {lang === "fr" ? "Utilisé comme acteur dans le journal d’audit." : "Used as the actor name in the audit log."}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="settings-profile-organization">
                {lang === "fr" ? "Organisation" : "Organization"}
              </label>
              <Input
                id="settings-profile-organization"
                value={organization}
                onChange={(event) => setOrganization(event.target.value)}
                maxLength={120}
                placeholder={lang === "fr" ? "PME / Client / Cabinet" : "Company / Client / Firm"}
              />
              <p className="text-xs text-muted-foreground">
                {lang === "fr" ? "Préremplira progressivement vos fiches d’audit." : "Can be reused to prefill audit profiles."}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Mail className="h-4 w-4" />
                E-mail
              </div>
              <div className="truncate text-sm font-semibold">{activeUser.email}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {lang === "fr" ? "Adresse de connexion Supabase" : "Supabase sign-in address"}
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
                {lang === "fr" ? "Rôle" : "Role"}
              </div>
              <div className="text-sm font-semibold">{userRoleLabel(activeUser.role, lang)}</div>
              <div className="mt-1 text-xs text-muted-foreground">{userRoleDescription(activeUser.role, lang)}</div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Clock3 className="h-4 w-4" />
                {lang === "fr" ? "Créé le" : "Created"}
              </div>
              <div className="text-sm font-semibold">{formatAccountDate(activeUser.createdAt)}</div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                {lang === "fr" ? "Dernière connexion" : "Last sign-in"}
              </div>
              <div className="text-sm font-semibold">{formatAccountDate(activeUser.lastLoginAt)}</div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {lang === "fr"
                ? "Le rôle, l’e-mail et l’offre sont affichés en lecture seule pour éviter les changements non autorisés."
                : "Role, email, and plan are read-only to prevent unauthorized changes."}
            </div>
            <Button type="button" onClick={saveProfile} disabled={!canSave}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}
              {saving ? (lang === "fr" ? "Enregistrement…" : "Saving…") : (lang === "fr" ? "Enregistrer le profil" : "Save profile")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card overflow-hidden">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <CardTitle className="flex flex-wrap items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                {lang === "fr" ? "Sécurité du compte" : "Account security"}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {lang === "fr"
                  ? "Contrôlez les accès à votre compte et appliquez les bonnes pratiques de sécurité."
                  : "Control account access and apply security best practices."}
              </p>
            </div>
            <Badge variant="outline" className="border-emerald-500/50 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              {lang === "fr" ? "Protégé par Supabase Auth" : "Protected by Supabase Auth"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Shield className="h-4 w-4" />
                {lang === "fr" ? "Mot de passe" : "Password"}
              </div>
              <div className="text-sm font-semibold">
                {lang === "fr" ? "Géré par Supabase Auth" : "Managed by Supabase Auth"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {lang === "fr" ? "La modification passe par un e-mail sécurisé." : "Changes go through a secure email."}
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
                {lang === "fr" ? "2FA" : "2FA"}
              </div>
              <div className="text-sm font-semibold">
                {mfaAction === "refresh"
                  ? (lang === "fr" ? "Vérification…" : "Checking…")
                  : hasMfaEnabled
                    ? (lang === "fr" ? "Activée" : "Enabled")
                    : (lang === "fr" ? "Non activée" : "Not enabled")}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {hasMfaEnabled
                  ? (lang === "fr" ? `${verifiedMfaFactors.length} facteur TOTP actif.` : `${verifiedMfaFactors.length} active TOTP factor.`)
                  : (lang === "fr" ? "Ajoutez un code à usage unique." : "Add a one-time code.")}
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                {lang === "fr" ? "Niveau session" : "Session level"}
              </div>
              <div className="text-sm font-semibold">{mfaStatus.currentLevel?.toUpperCase() || "AAL1"}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {mfaNeedsVerification
                  ? (lang === "fr" ? "Un code 2FA sera demandé." : "A 2FA code will be requested.")
                  : (lang === "fr" ? "Session conforme à l’état actuel." : "Session matches current state.")}
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Clock3 className="h-4 w-4" />
                {lang === "fr" ? "Dernière connexion" : "Last sign-in"}
              </div>
              <div className="text-sm font-semibold">{formatAccountDate(activeUser.lastLoginAt)}</div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border bg-muted/10 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold">
                    {lang === "fr" ? "Modifier mon mot de passe" : "Change my password"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {lang === "fr"
                      ? "Recevez un lien de réinitialisation sur l’adresse e-mail de votre compte."
                      : "Receive a reset link at your account email address."}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                className="mt-4"
                onClick={requestPasswordReset}
                disabled={securityAction !== null}
              >
                {securityAction === "password" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                {securityAction === "password"
                  ? (lang === "fr" ? "Envoi en cours…" : "Sending…")
                  : (lang === "fr" ? "Envoyer le lien sécurisé" : "Send secure link")}
              </Button>
            </div>

            <div className="rounded-2xl border bg-muted/10 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold">
                    {lang === "fr" ? "Déconnexion de cette session" : "Sign out of this session"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {lang === "fr"
                      ? "Ferme l’accès GapTrack sur cet appareil. Recommandé sur un ordinateur partagé."
                      : "Closes GapTrack access on this device. Recommended on shared computers."}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={confirmLogout}
                disabled={securityAction !== null}
              >
                {securityAction === "logout" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                {lang === "fr" ? "Me déconnecter" : "Sign out"}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border bg-muted/10 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="h-4 w-4" />
                  {lang === "fr" ? "Double authentification 2FA" : "Two-factor authentication"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {lang === "fr"
                    ? "Activez un code TOTP dans une application d’authentification. Après activation, GapTrack demandera ce code après le mot de passe."
                    : "Enable a TOTP code in an authenticator app. After activation, GapTrack will request this code after the password."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={hasMfaEnabled ? "border-emerald-500/50 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10" : "border-amber-500/50 text-amber-700 dark:text-amber-300 bg-amber-500/10"}>
                  {hasMfaEnabled ? (lang === "fr" ? "2FA activée" : "2FA enabled") : (lang === "fr" ? "2FA inactive" : "2FA inactive")}
                </Badge>
                <Button type="button" variant="outline" size="sm" onClick={() => refreshMfaStatus()} disabled={mfaAction !== null}>
                  {mfaAction === "refresh" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Redo2 className="mr-2 h-4 w-4" />}
                  {lang === "fr" ? "Actualiser" : "Refresh"}
                </Button>
              </div>
            </div>

            {mfaStatus.error ? (
              <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-800 dark:text-rose-100">
                {mfaStatus.error}
              </div>
            ) : null}

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border bg-background/60 p-4">
                <h4 className="text-sm font-semibold">
                  {hasMfaEnabled ? (lang === "fr" ? "Facteurs actifs" : "Active factors") : (lang === "fr" ? "Aucun facteur actif" : "No active factor")}
                </h4>

                {verifiedMfaFactors.length ? (
                  <div className="mt-3 space-y-2">
                    {verifiedMfaFactors.map((factor, index) => (
                      <div key={factor.id || index} className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {factor.friendly_name || factor.factor_type || `TOTP ${index + 1}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {factor.created_at
                              ? (lang === "fr" ? `Créé le ${formatAccountDate(factor.created_at)}` : `Created ${formatAccountDate(factor.created_at)}`)
                              : (lang === "fr" ? "Facteur vérifié" : "Verified factor")}
                          </div>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => unenrollMfaFactor(factor.id)} disabled={mfaAction !== null}>
                          {mfaAction === "unenroll" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                          {lang === "fr" ? "Désactiver" : "Disable"}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {lang === "fr"
                      ? "Ajoutez un facteur TOTP pour renforcer l’accès au compte."
                      : "Add a TOTP factor to strengthen account access."}
                  </p>
                )}

                {pendingMfaFactors.length ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {lang === "fr"
                      ? `${pendingMfaFactors.length} facteur non finalisé sera ignoré tant qu’il n’est pas vérifié.`
                      : `${pendingMfaFactors.length} unfinished factor will be ignored until verified.`}
                  </p>
                ) : null}

                {!mfaEnrollment ? (
                  <Button type="button" className="mt-4" onClick={startMfaEnrollment} disabled={mfaAction !== null}>
                    {mfaAction === "enroll" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                    {hasMfaEnabled
                      ? (lang === "fr" ? "Ajouter un autre facteur" : "Add another factor")
                      : (lang === "fr" ? "Activer la 2FA" : "Enable 2FA")}
                  </Button>
                ) : null}
              </div>

              <div className="rounded-2xl border bg-background/60 p-4">
                {mfaEnrollment ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold">
                        {lang === "fr" ? "Scanner le QR code" : "Scan the QR code"}
                      </h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {lang === "fr"
                          ? "Ajoutez GapTrack dans votre application d’authentification, puis saisissez le code à 6 chiffres."
                          : "Add GapTrack to your authenticator app, then enter the 6-digit code."}
                      </p>
                    </div>

                    {mfaEnrollment.qrCode ? (
                      <div className="flex justify-center rounded-2xl border bg-white p-4">
                        <img src={mfaEnrollment.qrCode} alt={lang === "fr" ? "QR code 2FA" : "2FA QR code"} className="h-48 w-48" />
                      </div>
                    ) : null}

                    {mfaEnrollment.secret ? (
                      <div className="rounded-xl border bg-muted/20 p-3">
                        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {lang === "fr" ? "Clé manuelle" : "Manual key"}
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="min-w-0 flex-1 break-all rounded bg-background px-2 py-1 text-xs">{mfaEnrollment.secret}</code>
                          <Button type="button" variant="outline" size="sm" onClick={copyMfaSecret}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="settings-mfa-code">
                        {lang === "fr" ? "Code à 6 chiffres" : "6-digit code"}
                      </label>
                      <Input
                        id="settings-mfa-code"
                        value={mfaVerifyCode}
                        onChange={(event) => setMfaVerifyCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="123456"
                        maxLength={6}
                      />
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button type="button" onClick={confirmMfaEnrollment} disabled={mfaAction !== null}>
                        {mfaAction === "verify" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                        {lang === "fr" ? "Confirmer l’activation" : "Confirm activation"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setMfaEnrollment(null);
                          setMfaVerifyCode("");
                        }}
                        disabled={mfaAction !== null}
                      >
                        {lang === "fr" ? "Annuler" : "Cancel"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-sm text-sky-900 dark:text-sky-100">
                    <div className="flex gap-3">
                      <Info className="mt-0.5 h-5 w-5 shrink-0" />
                      <div>
                        <h4 className="font-semibold">
                          {lang === "fr" ? "À savoir" : "Good to know"}
                        </h4>
                        <p className="mt-1 text-sky-900/80 dark:text-sky-100/80">
                          {lang === "fr"
                            ? "La 2FA ne peut pas être activée à distance sans l’utilisateur : il doit scanner le secret depuis sa propre application d’authentification."
                            : "2FA cannot be enabled remotely without the user: they must scan the secret from their own authenticator app."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  {lang === "fr" ? "Conseils de sécurité" : "Security tips"}
                </h3>
                <ul className="list-disc space-y-1 pl-4 text-sm text-amber-900/80 dark:text-amber-100/80">
                  <li>{lang === "fr" ? "Utilisez un mot de passe unique, long et difficile à deviner." : "Use a unique, long password that is hard to guess."}</li>
                  <li>{lang === "fr" ? "Ne partagez jamais votre compte : créez un utilisateur dédié pour chaque personne." : "Never share your account: create a dedicated user for each person."}</li>
                  <li>{lang === "fr" ? "Activez la double authentification pour les comptes administrateurs et auditeurs." : "Enable two-factor authentication for administrator and auditor accounts."}</li>
                  <li>{lang === "fr" ? "Déconnectez-vous après usage sur un poste non personnel." : "Sign out after use on a device you do not own."}</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card overflow-hidden">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <CardTitle className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={subscriptionPlanBadgeClass(currentSubscriptionPlan)}>
                  {subscriptionPlanLabel(currentSubscriptionPlan)}
                </Badge>
                {lang === "fr" ? "Gestion de l’abonnement" : "Subscription management"}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {lang === "fr"
                  ? "Consultez votre offre, vos limites et demandez l’activation Premium si nécessaire."
                  : "Review your plan, limits, and request Premium activation when needed."}
              </p>
            </div>
            <Badge variant="outline" className={hasPremiumSubscription ? "border-cyan-500/50 text-cyan-700 dark:text-cyan-300 bg-cyan-500/10" : "border-sky-500/40 text-sky-700 dark:text-sky-300 bg-sky-500/10"}>
              {hasPremiumSubscription
                ? (lang === "fr" ? "Premium actif" : "Premium active")
                : (lang === "fr" ? "Offre Free" : "Free plan")}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border bg-muted/10 p-4 lg:col-span-1">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {lang === "fr" ? "Offre actuelle" : "Current plan"}
                  </div>
                  <div className="mt-1 text-2xl font-semibold">{subscriptionPlanLabel(currentSubscriptionPlan)}</div>
                </div>
                <div className={hasPremiumSubscription ? "flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300" : "flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"}>
                  {hasPremiumSubscription ? <ShieldCheck className="h-6 w-6" /> : <Info className="h-6 w-6" />}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {hasPremiumSubscription
                  ? (lang === "fr"
                    ? "Votre compte dispose des fonctionnalités avancées de GapTrack."
                    : "Your account has access to GapTrack advanced features.")
                  : (lang === "fr"
                    ? "Votre compte est en Free et reste utilisable immédiatement. Premium pourra être activé côté serveur sur ce même compte."
                    : "Your account is on Free and remains usable immediately. Premium can be enabled server-side on this same account.")}
              </p>
              <div className="mt-4 rounded-xl border bg-background/60 p-3 text-xs text-muted-foreground">
                {lang === "fr" ? "Adresse associée" : "Linked address"}
                <div className="mt-1 truncate text-sm font-semibold text-foreground">{activeUser.email}</div>
              </div>
            </div>

            <div className="rounded-2xl border p-4 lg:col-span-2">
              <h3 className="text-sm font-semibold">
                {hasPremiumSubscription
                  ? (lang === "fr" ? "Fonctionnalités incluses" : "Included features")
                  : (lang === "fr" ? "Fonctionnalités disponibles avec votre offre" : "Features available with your plan")}
              </h3>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {subscriptionIncludedFeatures.map((feature) => (
                  <div key={feature} className="flex items-start gap-2 rounded-xl border bg-background/60 p-3 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              {!hasPremiumSubscription ? (
                <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
                    <div>
                      <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                        {lang === "fr" ? "Fonctionnalités Premium verrouillées" : "Locked Premium features"}
                      </h4>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {subscriptionLockedFeatures.map((feature) => (
                          <Badge key={feature} variant="outline" className="border-amber-500/40 text-amber-800 dark:text-amber-100 bg-amber-500/10">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border bg-muted/10 p-4">
              <h3 className="text-sm font-semibold">
                {lang === "fr" ? "Demander une évolution d’offre" : "Request a plan change"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasPremiumSubscription
                  ? (lang === "fr"
                    ? "Vous pouvez contacter le support pour toute question liée à votre offre Premium."
                    : "You can contact support for any question about your Premium plan.")
                  : (lang === "fr"
                    ? "Un e-mail prérempli sera préparé avec votre adresse, nom, organisation et besoin. Vous pouvez continuer à travailler en Free pendant la validation."
                    : "A prefilled email will be prepared with your address, name, organization, and need. You can keep working on Free while validation is pending.")}
              </p>
              <Button type="button" className="mt-4" onClick={requestPremiumFromSettings}>
                <Mail className="mr-2 h-4 w-4" />
                {hasPremiumSubscription
                  ? (lang === "fr" ? "Contacter le support Premium" : "Contact Premium support")
                  : (lang === "fr" ? "Demander l’activation Premium" : "Request Premium activation")}
              </Button>
            </div>

            <div className="rounded-2xl border bg-muted/10 p-4">
              <h3 className="text-sm font-semibold">
                {lang === "fr" ? "Sécurité de l’abonnement" : "Subscription security"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {lang === "fr"
                  ? "Le changement d’offre ne doit jamais être décidé par le navigateur : GapTrack lit l’état réel depuis Supabase."
                  : "Plan changes must never be decided by the browser: GapTrack reads the real state from Supabase."}
              </p>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
                  <span>{lang === "fr" ? "Offre lue depuis le profil serveur." : "Plan read from the server profile."}</span>
                </div>
                <div className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
                  <span>{lang === "fr" ? "Activation Premium réservée à la fonction Supabase sécurisée, sur le même compte." : "Premium activation reserved to the secured Supabase function, on the same account."}</span>
                </div>
                <div className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
                  <span>{lang === "fr" ? "Les exports, la collaboration, les preuves cloud, la validation et les modèles personnalisés restent bloqués tant que l’offre n’est pas Premium." : "Exports, collaboration, cloud evidence, validation, and custom templates stay locked until the plan is Premium."}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card overflow-hidden">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <CardTitle className="flex flex-wrap items-center gap-2">
                <Shield className="h-5 w-5" />
                {lang === "fr" ? "Confidentialité et données" : "Privacy and data"}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {lang === "fr"
                  ? "Contrôlez les données de votre compte, les exports et les traces conservées dans ce navigateur."
                  : "Control your account data, exports, and traces kept in this browser."}
              </p>
            </div>
            <Badge variant="outline" className="border-emerald-500/50 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              {lang === "fr" ? "Données maîtrisées" : "Data under control"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Users className="h-4 w-4" />
                {lang === "fr" ? "Profil" : "Profile"}
              </div>
              <div className="text-sm font-semibold">{lang === "fr" ? "Table profils Supabase" : "Supabase profiles table"}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {lang === "fr" ? "Nom, e-mail, rôle, organisation et offre." : "Name, email, role, organization, and plan."}
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <FileCheck2 className="h-4 w-4" />
                {lang === "fr" ? "Audits" : "Audits"}
              </div>
              <div className="text-sm font-semibold">{lang === "fr" ? "Sessions et états d’audit" : "Audit sessions and states"}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {lang === "fr" ? "Contrôles, plans d’action, statuts et journaux." : "Controls, action plans, statuses, and logs."}
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Paperclip className="h-4 w-4" />
                {lang === "fr" ? "Preuves" : "Evidence"}
              </div>
              <div className="text-sm font-semibold">{lang === "fr" ? "Stockage sécurisé" : "Secure storage"}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {lang === "fr" ? "Fichiers dans Supabase ou cache local navigateur." : "Files in Supabase or local browser cache."}
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Clock3 className="h-4 w-4" />
                {lang === "fr" ? "Traçabilité" : "Traceability"}
              </div>
              <div className="text-sm font-semibold">{lang === "fr" ? "Journal d’audit" : "Audit log"}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {lang === "fr" ? "Actions horodatées liées aux audits et preuves." : "Timestamped actions linked to audits and evidence."}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border bg-muted/10 p-4">
              <h3 className="text-sm font-semibold">
                {lang === "fr" ? "Exporter mes données de compte" : "Export my account data"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {lang === "fr"
                  ? "Télécharge un fichier JSON contenant les informations visibles de votre profil, de sécurité et d’abonnement."
                  : "Downloads a JSON file containing the visible information from your profile, security, and subscription settings."}
              </p>
              <Button type="button" className="mt-4" onClick={exportAccountPrivacyData} disabled={privacyAction !== null}>
                {privacyAction === "export" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {lang === "fr" ? "Exporter mes données" : "Export my data"}
              </Button>
            </div>

            <div className="rounded-2xl border bg-muted/10 p-4">
              <h3 className="text-sm font-semibold">
                {lang === "fr" ? "Demander la suppression du compte" : "Request account deletion"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {lang === "fr"
                  ? "Envoie un lien Supabase Auth au compte connecté. Après clic sur le lien, l’utilisateur devra confirmer une dernière fois avant suppression serveur."
                  : "Sends a Supabase Auth link to the signed-in account. After clicking the link, the user must confirm once more before server-side deletion."}
              </p>
              <Button type="button" variant="outline" className="mt-4" onClick={requestAccountDeletionByMagicLink} disabled={privacyAction !== null}>
                {privacyAction === "deletion" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                {lang === "fr" ? "Demander la suppression" : "Request deletion"}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4">
            <div className="flex gap-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-700 dark:text-sky-300" />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-sky-900 dark:text-sky-100">
                  {lang === "fr" ? "Principe de confidentialité" : "Privacy principle"}
                </h3>
                <p className="text-sm text-sky-900/80 dark:text-sky-100/80">
                  {lang === "fr"
                    ? "La suppression définitive passe par Supabase Auth : lien de validation envoyé par e-mail, confirmation finale dans l’application, puis Edge Function sécurisée côté serveur. Aucun service e-mail externe n’est nécessaire."
                    : "Permanent deletion goes through Supabase Auth: validation link by email, final confirmation in the app, then a secured server-side Edge Function. No external email provider is required."}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PageHeader({ tab, lang, rows }: { tab: string; lang: LangKey; rows: ControlItem[] }) {
  const t = I18N[lang];
  const titleMap: Record<string, string> = {
    listing: t.listing,
    weekly: lang === "fr" ? "Cette semaine" : "This week",
	plan: t.actionPlan,
    risks: lang === "fr" ? "Risques" : "Risks",
    dashboard: t.dashboard,
    journal: lang === "fr" ? "Journal d’audit" : "Audit log",
    settings: lang === "fr" ? "Paramètres" : "Settings",
  };
  const subMap: Record<string, string> = lang === "fr"
    ? {
        listing: "Évaluer les contrôles et saisir les preuves",
        weekly: "Les actions prioritaires à lancer maintenant",
		plan: "Construire et suivre le plan d’action",
        risks: "Traduire les écarts en risques métier concrets",
        dashboard: "Synthèse de maturité et priorités",
        journal: "Historique horodaté des preuves, contrôles et décisions",
        settings: "Profil utilisateur et préférences du compte",
      }
    : {
        listing: "Assessment and 0/1 entry of controls",
        weekly: "Priority actions to start now",
		plan: "Track gaps and complete the action plan",
        risks: "Turn gaps into concrete business risks",
        dashboard: "Scores and priorities overview",
        journal: "Timestamped history of evidence, controls and decisions",
        settings: "User profile and account preferences",
      };
  const title = titleMap[tab] ?? "";
  const sub = subMap[tab] ?? "";

  const total = rows.length;
  const done = rows.filter(r => isEvaluatedStatus(r.realized)).length;
  const donePct = total > 0 ? Math.round((done / total) * 100) : 0;
  const lbl = lang === "fr" ? { completed: "Évalué", of: "sur" } : { completed: "Evaluated", of: "of" };

  return (
    <div className="page-header-shell px-4 pt-4 pb-3 bg-background/60">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{sub}</p>
        </div>
        {tab === "listing" && (
          <div className="w-full sm:w-80" aria-label="progress">
            <div className="flex items-baseline justify-between text-xs mb-1">
              <span>{lbl.completed}</span>
              <span>{done} {lbl.of} {total} ({donePct}%)</span>
            </div>
            <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={donePct}>
              <div className="progress__bar" style={{ width: `${donePct}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ------------------
// Sticky header shadow helper (adds a subtle shadow only when the header is "stuck")
// Usage: const { sentinelRef, isStuck } = useStickyShadow();
// Place <div ref={sentinelRef} className="h-px" /> just before the table header (inside the scroll area).
// ------------------
function useStickyShadow() {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        // When the sentinel is NOT visible, it means we've scrolled past it => header is stuck
        setIsStuck(!entry.isIntersecting);
      },
      { threshold: [0, 1] }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { sentinelRef, isStuck };
}

function ListingView({ rows, setRows, lang, onOpenEvidence, evidenceCountFor, evidenceListFor, proofStatusFor, setProofStatusForRow, plans, openRequest, onOpenRequestConsumed, canExport = true, onPremiumRequired }: { rows: ControlItem[]; setRows: (r: ControlItem[]) => void; lang: LangKey; theme: "dark" | "light"; onOpenEvidence: (control: ControlItem) => void; evidenceCountFor: (controlId: string) => number; evidenceListFor: (controlId: string) => EvidenceItem[]; proofStatusFor: (controlId: string) => EvidenceStatus; setProofStatusForRow: (controlId: string, status: EvidenceStatus) => void; plans: Record<string, PlanAction>; openRequest?: ListingOpenRequest | null; onOpenRequestConsumed?: () => void; canExport?: boolean; onPremiumRequired?: (featureLabel?: string) => boolean}) {
  const t = I18N[lang];

  const { sentinelRef: listingSentinelRef, isStuck: listingStuck } = useStickyShadow();

  const [domainFilter, setDomainFilter] = useState<string | "all">("all");
  const [search, setSearch] = useState("");
  const [impactFilter, setImpactFilter] = useState<"all" | "1" | "2" | "3">("all");
  const [statusFilter, setStatusFilter] = useState<ControlStatusFilter>("all");
  const [evidenceFilter, setEvidenceFilter] = useState<"all" | "with" | "without">("all");
  const [proofFilter, setProofFilter] = useState<"all" | EvidenceStatus>("all");
  const [planFilter, setPlanFilter] = React.useState<"all" | "with" | "without">("all");
  const [showListingSecondary, setShowListingSecondary] = useState(false);
  

  // Keyboard navigation & quick toggle
  const [selIndex, setSelIndex] = useState<number>(-1);
  
  const [selId, setSelId] = useState<string | null>(null);
  
  
  
  type SortKey = "ref" | "domain" | "impact" | "realized";
  const [sortKey, setSortKey] = useState<SortKey>("ref");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  
  const [viewMode, setViewMode] = useState<"all" | "gaps">("all");



  
  const filteredRef = useRef<ControlItem[]>([]);
  
  
  

  
  const setRealized = (id: string, v: ControlStatus) => {
	setRows(rows.map((r) => (r.id === id ? { ...r, realized: v } : r)));
  };

  
  function exportCSV(rows: ControlItem[], lang: LangKey) {
      if (!canExport) {
        onPremiumRequired?.(lang === "fr" ? "L’export CSV du listing" : "Listing CSV export");
        return;
      }
	  // Excel FR attend souvent ; (séparateur de liste) et UTF-8 avec BOM
	  const delimiter = ";";
	  const NEWLINE = "\r\n";

	  const header =
		lang === "fr"
		  ? ["Ref", "Domaine", "Impact", "Statut", "Description"]
		  : ["Ref", "Domain", "Impact", "Status", "Description"];

	  const statusLabel = (r: ControlItem) => controlStatusLabel(r.realized, lang);

	  const esc = (v: unknown) => {
		// on évite aussi de casser le CSV si la description contient des retours ligne
		const str = String(v ?? "").replace(/\r?\n/g, " ");
		const safe = str.replaceAll('"', '""');
		return `"${safe}"`;
	  };

	  const csv =
		"\uFEFF" + // ✅ BOM UTF-8 pour Excel (corrige les accents)
		[
		  header.map(esc).join(delimiter),
		  ...rows.map((r) =>
			[r.ref, r.domain, r.impact, statusLabel(r), r.description]
			  .map(esc)
			  .join(delimiter)
		  ),
		].join(NEWLINE);

	  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	  const url = URL.createObjectURL(blob);

	  const a = document.createElement("a");
	  a.href = url;
	  a.download = lang === "fr" ? "export_audit.csv" : "audit_export.csv";
	  document.body.appendChild(a);
	  a.click();
	  a.remove();

	  URL.revokeObjectURL(url);
  }


  
  
  
  
  useEffect(() => {
	  const onKey = (e: KeyboardEvent) => {
		const active = document.activeElement as HTMLElement | null;
		const tag = active?.tagName;
		if (tag === "INPUT" || tag === "TEXTAREA" || active?.isContentEditable) return;

		const filtered = filteredRef.current;
		if (!filtered.length) return;

		const currentIndex = selIndex < 0 ? 0 : Math.min(selIndex, filtered.length - 1);

		const selectIndex = (idx: number) => {
		  const clamped = Math.max(0, Math.min(filtered.length - 1, idx));
		  setSelIndex(clamped);

		  // ✅ Si tu as ajouté selId (10.1/10.2), garde ces 2 lignes
		  // Sinon, supprime-les.
		  setSelId(filtered[clamped]?.id ?? null);
		};

		// Navigation
		if (e.key === "ArrowDown") {
		  e.preventDefault();
		  selectIndex(currentIndex + 1);
		  return;
		}
		if (e.key === "ArrowUp") {
		  e.preventDefault();
		  selectIndex(currentIndex - 1);
		  return;
		}

		const r = filtered[currentIndex];
		if (!r) return;

		// Actions audit 
		const k = e.key.toLowerCase();

		if (k === "f" || e.key === "1") {
		  e.preventDefault();
		  setRealized(r.id, 1);
		  return;
		}
		if (k === "p" || e.key === "2") {
		  e.preventDefault();
		  setRealized(r.id, 0.5);
		  return;
		}
		if (k === "x" || e.key === "0") {
		  e.preventDefault();
		  setRealized(r.id, 0);
		  return;
		}
		if (k === "n") {
		  e.preventDefault();
		  setRealized(r.id, -2);
		  return;
		}
		if (k === "a") {
		  e.preventDefault();
		  setRealized(r.id, -1);
		  return;
		}
		if (k === "d") {
		  e.preventDefault();
		  onOpenEvidence(r);
		  return;
		}

		// Toggle rapide (espace) : fait <-> non fait
		if (e.key === " ") {
		  e.preventDefault();
		  setRealized(r.id, r.realized === 1 ? 0 : 1);
		  return;
		}
	  };

	  window.addEventListener("keydown", onKey);
	  return () => window.removeEventListener("keydown", onKey);
  }, [selIndex, onOpenEvidence, setRealized, setSelId]);


  const searchRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onFocus = () => searchRef.current?.focus();
    const onSetDomain = (e: any) => setDomainFilter(((e && e.detail) || "all") as any);

    const onSelectRow = (e: any) => {
      const id = e?.detail;
      if (typeof id === "string" && id) {
        setSelId(id);
        setSelIndex(-1); // l'effet selId -> selIndex recalera le bon index
      }
    };

    window.addEventListener("focus-search", onFocus);
    window.addEventListener("set-domain-filter", onSetDomain as any);
    window.addEventListener("select-row", onSelectRow as any);

    return () => {
      window.removeEventListener("focus-search", onFocus);
      window.removeEventListener("set-domain-filter", onSetDomain as any);
      window.removeEventListener("select-row", onSelectRow as any);
    };
  }, []);

  // Navigation fiable depuis le dashboard : on passe par un état React au lieu
  // de dépendre uniquement d'un CustomEvent qui pouvait partir avant le montage du Listing.
  useEffect(() => {
    if (!openRequest) return;

    setDomainFilter((openRequest.domain || "all") as any);
    setImpactFilter("all");
    setStatusFilter("all");
    setEvidenceFilter("all");
    setProofFilter("all");
    setPlanFilter("all");
    setSearch("");
    setViewMode("all");
    setSortKey("ref");
    setSortDir("asc");

    if (openRequest.controlId) {
      setSelId(openRequest.controlId);
      setSelIndex(-1);
    } else {
      setSelId(null);
      setSelIndex(0);
    }

    onOpenRequestConsumed?.();
  }, [openRequest?.id]);

  
    const filtersAreDefault =
		domainFilter === "all" &&
		impactFilter === "all" &&
		statusFilter === "all" &&
		evidenceFilter === "all" &&
		proofFilter === "all" &&
		planFilter === "all" &&
		search.trim() === "" &&
		viewMode === "all" &&
		sortKey === "ref" &&
		sortDir === "asc";

    const resetFilters = () => {
		setDomainFilter("all");
		setImpactFilter("all");
		setStatusFilter("all");
		setEvidenceFilter("all");
		setProofFilter("all");
		setPlanFilter("all");
		setSearch("");
		setViewMode("all");
		setSortKey("ref");
		setSortDir("asc");

		// Optionnel mais “pro” : remettre le focus sur la recherche
		searchRef.current?.focus();
    };

  
  
  
  const domains = useMemo(() => Array.from(new Set(rows.map((r) => r.domain))).sort(), [rows]);
  
  
  const planStatusFor = React.useCallback(
    (id: string): "none" | "partial" | "complete" => {
      const p = plans?.[id];
      if (!p) return "none";

      const hasAny = !!(p.owner?.trim() || p.due || p.priority || p.comment?.trim());
      if (!hasAny) return "none";

      const complete = !!(p.owner?.trim() && p.due && p.priority && p.comment?.trim());
      return complete ? "complete" : "partial";
    },
    [plans]
  );

  
  
  
  const filtered = useMemo(() => {
	const q = search.trim().toLowerCase();

  const out = rows.filter((r) => {
    // Domaine
    if (domainFilter !== "all" && r.domain !== domainFilter) return false;

    // Impact (1/2/3)
    if (impactFilter !== "all" && String(r.impact) !== impactFilter) return false;

    // État du contrôle
	if (viewMode === "gaps") {
	  // Écarts = contrôles partiels ou non conformes. Non applicable et non évalué sont exclus.
	  if (!isGapStatus(r.realized)) return false;
	} else if (statusFilter !== "all" && controlStatusKey(r.realized) !== statusFilter) {
	  return false;
	}


    // Preuves (avec / sans pièces jointes)
    const evCount = evidenceCountFor(r.id) || 0;
    if (evidenceFilter === "with" && evCount === 0) return false;
    if (evidenceFilter === "without" && evCount > 0) return false;

    const proofStatus = proofStatusFor(r.id);
    if (proofFilter !== "all" && proofStatus !== proofFilter) return false;
	
	
	const ps = planStatusFor(r.id);
	if (planFilter === "with" && ps === "none") return false;
	if (planFilter === "without" && ps !== "none") return false;

	
	

    // Recherche texte (ref, domaine, description)
    if (!q) return true;

    const ref = r.ref.toLowerCase();
    const dom = r.domain.toLowerCase();
    const desc = r.description.toLowerCase();

    return ref.includes(q) || dom.includes(q) || desc.includes(q);
  });

  filteredRef.current = out;
  return out;
}, [rows, domainFilter, impactFilter, statusFilter, evidenceFilter, proofFilter, planFilter, search, evidenceCountFor, proofStatusFor, viewMode, planStatusFor]);


  
  const sorted = useMemo(() => {
	  const arr = [...filtered];

	  const cmpStr = (a: string, b: string) => a.localeCompare(b, "fr", { numeric: true, sensitivity: "base" });

	  const realizedRank = (v: ControlStatus) => {
		const key = controlStatusKey(v);
		if (key === "not_evaluated") return 0;
		if (key === "non_conform") return 1;
		if (key === "partial") return 2;
		if (key === "conform") return 3;
		return 4;
	  };

	  arr.sort((a, b) => {
		let r = 0;

		if (sortKey === "ref") r = cmpStr(a.ref, b.ref);
		else if (sortKey === "domain") r = cmpStr(a.domain, b.domain);
		else if (sortKey === "impact") r = a.impact - b.impact;
		else if (sortKey === "realized") r = realizedRank(a.realized) - realizedRank(b.realized);

		return sortDir === "asc" ? r : -r;
	  });

	  return arr;
  }, [filtered, sortKey, sortDir]);
  
  
  
  useEffect(() => {
	  // Important : la navigation clavier doit suivre l'ordre affiché (sorted)
	  filteredRef.current = sorted;
  }, [sorted]);

  


  const selectedRow = selId
	  ? sorted.find((r) => r.id === selId) || null
	  : selIndex >= 0 && selIndex < sorted.length
		? sorted[selIndex]
		: null;


  useEffect(() => {
	  // 1) Rien à afficher => aucune sélection
	  if (sorted.length === 0) {
		if (selIndex !== -1) setSelIndex(-1);
		if (selId !== null) setSelId(null);
		return;
	  }

	  // 2) Si on a un selId, on recale selIndex sur l’ordre affiché (sorted)
	  if (selId) {
		const idx = sorted.findIndex((r) => r.id === selId);
		if (idx !== -1) {
		  if (selIndex !== idx) setSelIndex(idx);
		  return;
		}
	  }

	  // 3) Si pas de selId (ou selId plus visible), on force une sélection valide
	  if (selIndex < 0 || selIndex >= sorted.length) {
		setSelIndex(0);
		setSelId(sorted[0].id);
	  }
  }, [sorted, selId, selIndex]);


  


  
  useEffect(() => {
	  if (!selectedRow) return;
	  const el = document.querySelector(`[data-rowid="${selectedRow.id}"]`);
	  (el as HTMLElement | null)?.scrollIntoView({ block: "nearest" });
  }, [selectedRow?.id]);

  
  
  
  
  const bulkSet = (value: ControlStatus) => {
    const targets = sorted;

    if (!targets.length) {
      toast.info(lang === "fr" ? "Aucun contrôle visible avec les filtres actuels." : "No visible control with the current filters.");
      return;
    }

    if (filtersAreDefault) {
      toast.error(
        lang === "fr"
          ? "Ajoutez d’abord un filtre ou une recherche : les actions de masse sont réservées aux contrôles visibles filtrés."
          : "Add a filter or search first: bulk actions are restricted to filtered visible controls."
      );
      return;
    }

    const targetLabel = value === 1
      ? (lang === "fr" ? "conformes" : "compliant")
      : (lang === "fr" ? "non conformes" : "non-compliant");

    const confirmMessage = lang === "fr"
      ? `Vous allez marquer ${targets.length} contrôle(s) visible(s) comme ${targetLabel}. Cette action s’applique uniquement aux filtres actifs. Continuer ?`
      : `You are about to mark ${targets.length} visible control(s) as ${targetLabel}. This only applies to the active filters. Continue?`;

    if (!window.confirm(confirmMessage)) return;

    const previousRows = rows;
    const ids = new Set(targets.map((f) => f.id));
    setRows(rows.map((r) => (ids.has(r.id) ? { ...r, realized: value } : r)));

    toast.success(
      lang === "fr"
        ? `${targets.length} contrôle(s) visible(s) marqué(s) ${targetLabel}.`
        : `${targets.length} visible control(s) marked ${targetLabel}.`,
      {
        action: {
          label: lang === "fr" ? "Annuler" : "Undo",
          onClick: () => setRows(previousRows),
        },
      }
    );
  };
  
  const isDarkMode = () =>
	document.documentElement.classList.contains("dark") ||
	document.body.classList.contains("dark");

  const impactStyle = (impact: number) => {
		const dark = typeof document !== "undefined" && isDarkMode();

	// Dark : on veut le rendu pastel clair (comme ta capture 3)
	if (dark) {
		if (impact >= 3) return { backgroundColor: "#ffe4e6", borderColor: "#fb7185", color: "#9f1239" }; // rose clair
		if (impact === 2) return { backgroundColor: "#fef3c7", borderColor: "#f59e0b", color: "#92400e" }; // jaune clair
		return { backgroundColor: "#d1fae5", borderColor: "#10b981", color: "#065f46" }; // vert clair
	}

	// Light : on veut TRÈS léger (pas “sombre”)
	if (impact >= 3) return { backgroundColor: "#fff1f2", borderColor: "#fb7185", color: "#be123c" };
	if (impact === 2) return { backgroundColor: "#fffbeb", borderColor: "#f59e0b", color: "#b45309" };
	return { backgroundColor: "#ecfdf5", borderColor: "#10b981", color: "#047857" };
  };

  

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-2xl border bg-card/40 p-3 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative sm:w-[320px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              className="pl-8 w-full"
              placeholder={t.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <div className="text-sm text-muted-foreground whitespace-nowrap">
              {filtered.length} / {rows.length} {t.items}
            </div>
            <Button
              variant={showListingSecondary ? "default" : "outline"}
              size="sm"
              onClick={() => setShowListingSecondary((v) => !v)}
              aria-expanded={showListingSecondary}
            >
              <Filter className="h-4 w-4 mr-1" />
              {lang === "fr" ? "Plus" : "More"}
            </Button>
          </div>
        </div>

        {showListingSecondary && (
          <div className="rounded-xl border bg-background/50 p-3 space-y-3">
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
              <Select value={domainFilter} onValueChange={setDomainFilter}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <Filter className="h-4 w-4 mr-1" />
                  <span className="truncate">{domainFilter === "all" ? t.domain : domainFilter}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{lang === "fr" ? "Tous les domaines" : "All domains"}</SelectItem>
                  {domains.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={impactFilter} onValueChange={(value: string) => setImpactFilter(value as "all" | "1" | "2" | "3")}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <span className="truncate">
                    {impactFilter === "all" ? (lang === "fr" ? "Tous les impacts" : "All impacts") : `Impact ${impactFilter}`}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{lang === "fr" ? "Tous les impacts" : "All impacts"}</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ControlStatusFilter)} disabled={viewMode === "gaps"}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <span className="truncate">
                    {statusFilter === "all"
                      ? (lang === "fr" ? "Tous les états" : "All statuses")
                      : controlStatusLabel(statusFilter, lang)}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{lang === "fr" ? "Tous les états" : "All statuses"}</SelectItem>
                  {CONTROL_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>{controlStatusLabel(status, lang)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={evidenceFilter} onValueChange={(value: string) => setEvidenceFilter(value as "all" | "with" | "without")}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <span className="truncate">
                    {evidenceFilter === "all"
                      ? (lang === "fr" ? "Toutes les preuves" : "All evidence")
                      : evidenceFilter === "with"
                        ? (lang === "fr" ? "Avec pièces" : "With files")
                        : (lang === "fr" ? "Sans pièces" : "Without files")}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{lang === "fr" ? "Toutes les preuves" : "All evidence"}</SelectItem>
                  <SelectItem value="with">{lang === "fr" ? "Avec pièces" : "With files"}</SelectItem>
                  <SelectItem value="without">{lang === "fr" ? "Sans pièces" : "Without files"}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={proofFilter} onValueChange={(v) => setProofFilter(v as any)}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <span className="truncate">
                    {proofFilter === "all" ? (lang === "fr" ? "Statut de preuve : tous" : "Evidence status: all") : evidenceStatusLabel(proofFilter as EvidenceStatus, lang)}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{lang === "fr" ? "Tous" : "All"}</SelectItem>
                  <SelectItem value="absent">{evidenceStatusLabel("absent", lang)}</SelectItem>
                  <SelectItem value="added">{evidenceStatusLabel("added", lang)}</SelectItem>
                  <SelectItem value="to_validate">{evidenceStatusLabel("to_validate", lang)}</SelectItem>
                  <SelectItem value="validated">{evidenceStatusLabel("validated", lang)}</SelectItem>
                  <SelectItem value="refused">{evidenceStatusLabel("refused", lang)}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={planFilter} onValueChange={(v) => setPlanFilter(v as any)}>
                <SelectTrigger className="w-full sm:w-[170px]">
                  <span className="truncate">
                    {planFilter === "all"
                      ? (lang === "fr" ? "Plan d’action" : "Action plan")
                      : planFilter === "with"
                        ? (lang === "fr" ? "Avec plan" : "With plan")
                        : (lang === "fr" ? "Sans plan" : "No plan")}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{lang === "fr" ? "Tous" : "All"}</SelectItem>
                  <SelectItem value="with">{lang === "fr" ? "Avec plan" : "With plan"}</SelectItem>
                  <SelectItem value="without">{lang === "fr" ? "Sans plan" : "No plan"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 border-t pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                disabled={filtersAreDefault}
                className="gap-1"
                title={lang === "fr" ? "Réinitialiser tous les filtres" : "Reset all filters"}
              >
                <X className="h-4 w-4" />
                {lang === "fr" ? "Réinitialiser" : "Reset"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportCSV(sorted, lang)}
                title={!canExport ? (lang === "fr" ? "Premium requis" : "Premium required") : undefined}
              >
                {lang === "fr" ? "Exporter CSV" : "Export CSV"}{!canExport ? " · Premium" : ""}
              </Button>
              <Button
                onClick={() => bulkSet(1)}
                variant="outline"
                size="sm"
                disabled={filtersAreDefault || sorted.length === 0}
                title={
                  filtersAreDefault
                    ? (lang === "fr" ? "Activez un filtre ou une recherche avant une action de masse." : "Apply a filter or search before using a bulk action.")
                    : (lang === "fr" ? `${sorted.length} contrôle(s) visible(s) seront concernés.` : `${sorted.length} visible control(s) will be affected.`)
                }
              >
                {t.bulkDone}
              </Button>
              <Button
                onClick={() => bulkSet(0)}
                variant="outline"
                size="sm"
                disabled={filtersAreDefault || sorted.length === 0}
                title={
                  filtersAreDefault
                    ? (lang === "fr" ? "Activez un filtre ou une recherche avant une action de masse." : "Apply a filter or search before using a bulk action.")
                    : (lang === "fr" ? `${sorted.length} contrôle(s) visible(s) seront concernés.` : `${sorted.length} visible control(s) will be affected.`)
                }
              >
                {t.bulkUndone}
              </Button>
              <div className="basis-full text-xs text-muted-foreground">
                {filtersAreDefault
                  ? (lang === "fr" ? "Actions de masse désactivées tant qu’aucun filtre ou recherche n’est actif." : "Bulk actions are disabled until a filter or search is active.")
                  : (lang === "fr" ? `Action de masse limitée aux ${sorted.length} contrôle(s) visibles.` : `Bulk action limited to the ${sorted.length} visible control(s).`)}
              </div>
            </div>
          </div>
        )}
      </div>

		
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
		  {/* Table / mobile cards (2/3) */}
		  <div className="lg:col-span-2 rounded-2xl overflow-hidden border">
            <div ref={listingSentinelRef} className="h-px" />
            <div className="md:hidden p-3 space-y-2">
              {filtered.length === 0 && (
                <div className="rounded-xl border bg-muted/20 p-4 text-center text-sm text-muted-foreground">{t.empty}</div>
              )}
              {sorted.map((r, idx) => {
                const isSelected = (selId ? r.id === selId : idx === selIndex);
                const evidenceCount = evidenceCountFor(r.id);
                const ps = planStatusFor(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    className={"w-full rounded-2xl border p-3 text-left transition " + (isSelected ? "border-primary bg-primary/10" : "bg-background/45")}
                    onClick={() => { setSelIndex(idx); setSelId(r.id); }}
                    aria-current={isSelected ? "true" : undefined}
                    data-rowid={r.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold leading-tight">{r.ref}</div>
                        <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{r.domain}</div>
                      </div>
                      <span
                        style={{
                          ...impactStyle(r.impact),
                          borderWidth: "1px",
                          borderStyle: "solid",
                          borderRadius: "9999px",
                          padding: "2px 8px",
                          fontSize: "12px",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minWidth: "30px",
                          flexShrink: 0,
                        }}
                        title={(lang === "fr" ? "Impact " : "Impact ") + r.impact}
                      >
                        {r.impact}
                      </span>
                    </div>

                    <div className="mt-3 text-sm leading-snug line-clamp-3">{r.description}</div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={"rounded-full px-2.5 py-1 text-xs " + controlStatusClass(r.realized)}>
                        {controlStatusLabel(r.realized, lang, true)}
                      </Badge>
                      <Badge variant="outline" className={"rounded-full px-2.5 py-1 text-xs " + evidenceStatusClass(proofStatusFor(r.id))}>
                        {evidenceStatusLabel(proofStatusFor(r.id), lang)}
                      </Badge>
                      {evidenceCount > 0 && <span className="kpi text-xs">{evidenceCount} file(s)</span>}
                      {ps !== "none" && (
                        <Badge
                          variant="outline"
                          className={
                            "rounded-full px-2.5 py-1 text-xs " +
                            (ps === "complete"
                              ? "border-emerald-500/50 text-emerald-700 dark:text-emerald-300"
                              : "border-amber-500/50 text-amber-700 dark:text-amber-300")
                          }
                        >
                          {ps === "complete" ? "Plan ✓" : "Plan…"}
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
			<div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
			  <thead className={"sticky top-0 z-10 bg-background/70 backdrop-blur border-b border-border/40 dark:border-white/5 " + (listingStuck ? "shadow-sm shadow-black/20 dark:shadow-black/40" : "")}>
				<tr>
				  
				  <th className="p-2 w-24 text-left">
					  <button
						type="button"
						className="inline-flex items-center gap-1 hover:underline"
						onClick={() => {
						  if (sortKey === "ref") setSortDir(sortDir === "asc" ? "desc" : "asc");
						  else { setSortKey("ref"); setSortDir("asc"); }
						}}
					  >
						{t.ref}
						{sortKey === "ref" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
					  </button>
				  </th>

				  
				  <th className="hidden md:table-cell p-2 w-64 text-left">
					  <button
						type="button"
						className="inline-flex items-center gap-1 hover:underline"
						onClick={() => {
						  if (sortKey === "domain") setSortDir(sortDir === "asc" ? "desc" : "asc");
						  else { setSortKey("domain"); setSortDir("asc"); }
						}}
					  >
						{t.domain}
						{sortKey === "domain" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
					  </button>
				  </th>

				  
				  
				  <th className="p-2 w-28 text-left">
					<span className="inline-flex items-center gap-1">
						{t.impact}
						<span
							className="inline-flex items-center text-muted-foreground"
							title={lang === "fr" ? "1=Faible, 2=Moyen, 3=Élevé" : "1=Low, 2=Medium, 3=High"}
						>
							<Info className="h-3.5 w-3.5" />
						</span>
					</span>
				  </th>
				  <th className="p-2 text-left">{t.controlPoint}</th>
				  
				  <th className="p-2 w-72 text-left">
					  <button
						type="button"
						className="inline-flex items-center gap-1 hover:underline"
						onClick={() => {
						  if (sortKey === "realized") setSortDir(sortDir === "asc" ? "desc" : "asc");
						  else { setSortKey("realized"); setSortDir("asc"); } // asc = Non évalué en premier
						}}
					  >
						{t.realized}
						{sortKey === "realized" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
					  </button>
				  </th>

				  
				  
				</tr>
			  </thead>
			  <tbody>
				{filtered.length === 0 && (
				  <tr>
					<td colSpan={5} className="p-6 text-center text-muted-foreground">{t.empty}</td>
				  </tr>
				)}
				{sorted.map((r, idx) => {
				  const isSelected = (selId ? r.id === selId : idx === selIndex);
				  return (
				  <tr
					key={r.id}
					className={"border-t border-border/40 dark:border-white/5 row-interactive " + (idx % 2 === 0 ? "row-zebra-even " : "row-zebra-odd ") + (isSelected ? "row-selected" : "")}
					onClick={() => { setSelIndex(idx); setSelId(r.id); }}
					tabIndex={0}
					aria-selected={isSelected}
					data-rowid={r.id}
				>
					<td className="p-2 align-top"><div className="font-medium">{r.ref}</div><div className="text-xs text-muted-foreground md:hidden">{r.domain}</div></td>
					<td className="hidden md:table-cell p-2 align-top">{r.domain}</td>
					<td className="p-2 align-top">
						<span
							style={{
							  ...impactStyle(r.impact),
							  borderWidth: "1px",
							  borderStyle: "solid",
							  borderRadius: "9999px",
							  padding: "2px 8px",
							  fontSize: "12px",
							  fontWeight: 700,
							  display: "inline-flex",
							  alignItems: "center",
							  justifyContent: "center",
							  minWidth: "28px",
							}}
							title={(lang === "fr" ? "Impact " : "Impact ") + r.impact}
						>
							{r.impact}
						</span>
					</td>


					<td className="p-2 align-top">
					  <div className="control-desc clamp-2" style={{ cursor: "default" }}>
						{r.description}
					  </div>
					</td>


					<td className="p-2 align-top">
						<div className="flex items-center gap-2">
							<Badge
							  variant="outline"
							  className={"h-8 w-[170px] justify-center rounded-md px-3 font-medium " + controlStatusClass(r.realized)}
							  title={lang === "fr" ? "État modifiable dans le panneau de droite" : "Status editable in the right panel"}
							>
							  <span className="truncate">{controlStatusLabel(r.realized, lang, true)}</span>
							</Badge>

							<Button
								variant="outline"
								size="icon"
								onClick={(e) => {
									e.stopPropagation();
									onOpenEvidence(r);
								}}
								title={t.evidence}
							>
								<Paperclip className="h-4 w-4" />
							</Button>

							{evidenceCountFor(r.id) > 0 && (
								<span className="kpi">{evidenceCountFor(r.id)} file(s)</span>
							)}

							<Badge
							  variant="outline"
							  className={"ml-1 " + evidenceStatusClass(proofStatusFor(r.id))}
							  title={lang === "fr" ? "Statut de preuve" : "Evidence status"}
							>
							  {evidenceStatusLabel(proofStatusFor(r.id), lang)}
							</Badge>
							
							{(() => {
							  const ps = planStatusFor(r.id);
							  if (ps === "none") return null;
							  return (
								<Badge
								  variant="outline"
								  className={
									"ml-1 " +
									(ps === "complete"
									  ? "border-emerald-500/50 text-emerald-700 dark:text-emerald-300"
									  : "border-amber-500/50 text-amber-700 dark:text-amber-300")
								  }
								  title={
									ps === "complete"
									  ? (lang === "fr" ? "Plan complet" : "Action plan complete")
									  : (lang === "fr" ? "Plan incomplet" : "Action plan incomplete")
								  }
								>
								  {ps === "complete" ? "Plan ✓" : "Plan…"}
								</Badge>
							  );
							})()}

							
							
							
						</div>
					</td>

				  </tr>
				  );
				})}
			  </tbody>
			</table>
</div>
		  </div>

		  {/* Panneau détail (1/3) */}
		  <div className="lg:col-span-1">
			<div className={"rounded-2xl border p-4 space-y-3 lg:sticky lg:top-20 detail-panel " + (selectedRow ? "detail-panel--active" : "")}>
			  {!selectedRow ? (
				<div className="text-sm text-muted-foreground">
				  {lang === "fr"
					? "Sélectionne une ligne pour voir les détails."
					: "Select a row to view details."}
				</div>
			  ) : (
				<>
				  {/* Header */}
				  <div className="space-y-1">
					<div className="text-sm font-semibold">
					  {selectedRow.ref}
					</div>
					<div className="text-xs text-muted-foreground">
					  {selectedRow.domain}
					</div>
				  </div>

				  {/* Impact */}
				  <div className="flex items-center justify-between">
					<div className="text-xs text-muted-foreground">{t.impact}</div>
					<span
					  style={{
						...impactStyle(selectedRow.impact),
						borderWidth: "1px",
						borderStyle: "solid",
						borderRadius: "9999px",
						padding: "2px 8px",
						fontSize: "12px",
						fontWeight: 700,
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						minWidth: "28px",
					  }}
					>
					  {selectedRow.impact}
					</span>
				  </div>

				  {/* État du contrôle */}
				  <div className="space-y-2">
				    <div className="flex items-center justify-between gap-2">
					  <div className="text-xs text-muted-foreground">{t.realized}</div>
					  <Badge variant="outline" className={controlStatusClass(selectedRow.realized)}>
					    {controlStatusLabel(selectedRow.realized, lang)}
					  </Badge>
				    </div>
				    <Select
					  value={controlStatusKey(selectedRow.realized)}
					  onValueChange={(v) => setRealized(selectedRow.id, controlStatusFromKey(v))}
				    >
					  <SelectTrigger className="w-full">
					    <span className="truncate">{controlStatusLabel(selectedRow.realized, lang)}</span>
					  </SelectTrigger>
					  <SelectContent>
					    {CONTROL_STATUS_OPTIONS.map((status) => (
						  <SelectItem key={status} value={status}>{controlStatusLabel(status, lang)}</SelectItem>
					    ))}
					  </SelectContent>
				    </Select>
				  </div>

				  
				  

				  {/* Description complète */}
				  <div className="space-y-1">
					<div className="text-xs text-muted-foreground">{t.controlPoint}</div>
					<div className="text-sm whitespace-pre-wrap break-words">
					  {selectedRow.description}
					</div>
				  </div>
				  
				  
				  
				  
				  {/* Statut de preuve */}
				  <div className="space-y-2 pt-2">
				    <div className="flex items-center justify-between gap-2">
				      <div className="text-xs text-muted-foreground">{lang === "fr" ? "Statut de preuve" : "Evidence status"}</div>
				      <Badge variant="outline" className={evidenceStatusClass(proofStatusFor(selectedRow.id))}>
				        {evidenceStatusLabel(proofStatusFor(selectedRow.id), lang)}
				      </Badge>
				    </div>

				    <Select
				      value={proofStatusFor(selectedRow.id)}
				      disabled={evidenceCountFor(selectedRow.id) === 0}
				      onValueChange={(v) => setProofStatusForRow(selectedRow.id, v as EvidenceStatus)}
				    >
				      <SelectTrigger className="w-full">
				        <span className="truncate">{evidenceStatusLabel(proofStatusFor(selectedRow.id), lang)}</span>
				      </SelectTrigger>
				      <SelectContent>
				        {selectableEvidenceStatuses(evidenceCountFor(selectedRow.id) > 0).map((status) => (
				          <SelectItem key={status} value={status}>
				            {evidenceStatusLabel(status, lang)}
				          </SelectItem>
				        ))}
				      </SelectContent>
				    </Select>
				  </div>

				  {/* Actions rapides */}
				  <div className="pt-2 flex flex-col gap-2">
					<Button
					  variant="outline"
					  size="sm"
					  onClick={() => onOpenEvidence(selectedRow)}
					>
					  <Paperclip className="h-4 w-4 mr-2" />
					  {lang === "fr" ? "Preuves & note" : "Evidence & note"}
					  {evidenceCountFor(selectedRow.id) > 0 ? (
						<span className="ml-2 text-xs text-muted-foreground">
						  ({evidenceCountFor(selectedRow.id)})
						</span>
					  ) : null}
					</Button>
					
					{(() => {
					  const list = evidenceListFor(selectedRow.id);
					  if (!list.length) return null;

					  return (
						<div className="rounded-xl border bg-muted/20 p-3 space-y-2">
						  <div className="text-xs text-muted-foreground">
							{lang === "fr" ? "Dernières preuves" : "Latest evidence"}
						  </div>

						  <ul className="space-y-1">
							{list.slice(0, 3).map((ev) => (
							  <li key={ev.id} className="flex items-center justify-between gap-2 text-sm">
								<span className="truncate">
								  {ev.note ? (lang === "fr" ? "Note" : "Note") : ev.filename}
								</span>
								<span className="text-xs text-muted-foreground">
								  {new Date(ev.addedAt).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US")}
								</span>
							  </li>
							))}
						  </ul>

						  {list.length > 3 && (
							<div className="text-xs text-muted-foreground">
							  {lang === "fr" ? `+ ${list.length - 3} autre(s)` : `+ ${list.length - 3} more`}
							</div>
						  )}
						</div>
					  );
					})()}

					
					
					
					

					<div className="flex gap-2">
					  <Button
						variant="outline"
						size="sm"
						className="flex-1"
						onClick={() => {
						  const i = selIndex < 0 ? 0 : selIndex;
						  const idx = Math.max(0, i - 1);
						  setSelIndex(idx);
						  setSelId(sorted[idx]?.id ?? null);
						}}

						disabled={!selectedRow || selIndex <= 0}
					  >
						{lang === "fr" ? "Précédent" : "Prev"}
					  </Button>
					  <Button
						  variant="outline"
						  size="sm"
						  className="flex-1"
						  onClick={() => {
							const i = selIndex < 0 ? 0 : selIndex;
							const idx = Math.min(sorted.length - 1, i + 1);
							setSelIndex(idx);
							setSelId(sorted[idx]?.id ?? null);
						  }}
						  disabled={!selectedRow || selIndex >= sorted.length - 1}
						>
						  {lang === "fr" ? "Suivant" : "Next"}
					  </Button>

					</div>
				  </div>
				</>
			  )}
			</div>
		  </div>
      </div>

    </div>
  );
}

function WeeklyPriorityView({
  rows,
  setRows,
  lang,
  plans,
  patchPlan,
  proofStatusFor,
  onOpenPlan,
}: {
  rows: ControlItem[];
  setRows: (r: ControlItem[]) => void;
  lang: LangKey;
  plans: Record<string, PlanAction>;
  patchPlan: (rowId: string, patch: Partial<PlanAction>) => void;
  proofStatusFor: (controlId: string) => EvidenceStatus;
  onOpenPlan: (rowId?: string) => void;
}) {
  const gaps = useMemo(() => rows.filter((r) => isGapStatus(r.realized)), [rows]);

  const priorities = useMemo(() => {
    return gaps
      .map((row) => {
        const existingPlan = plans[row.id];
        const suggestedPlan = hasAnyPlanFields(existingPlan)
          ? existingPlan
          : generateWeeklyPlanForControl(row, lang);
        const focus = weeklyFocusForControl(row, lang);
        return {
          row,
          plan: suggestedPlan,
          existingPlan,
          focus,
          score: weeklyPriorityScore(row, existingPlan),
        };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.row.impact !== b.row.impact) return b.row.impact - a.row.impact;
        const aPr = priorityWeight(a.plan?.priority);
        const bPr = priorityWeight(b.plan?.priority);
        if (aPr !== bPr) return aPr - bPr;
        return a.row.ref.localeCompare(b.row.ref, undefined, { numeric: true, sensitivity: "base" });
      })
      .slice(0, 5);
  }, [gaps, plans, lang]);

  const missingPlans = priorities.filter((p) => !hasAnyPlanFields(p.existingPlan)).length;
  const p1Count = priorities.filter((p) => p.plan?.priority === "high").length;
  const impactCovered = priorities.reduce((sum, p) => sum + p.row.impact, 0);
  const validatedProofs = priorities.filter((p) => proofStatusFor(p.row.id) === "validated").length;

  const generateWeeklyPlans = (overwrite = false) => {
    const targets = priorities.filter((p) => overwrite || !hasAnyPlanFields(p.existingPlan));
    if (!targets.length) {
      toast.info(lang === "fr" ? "Les actions affichées ont déjà un plan." : "Displayed actions already have a plan.");
      return;
    }

    targets.forEach(({ row }) => {
      patchPlan(row.id, generateWeeklyPlanForControl(row, lang));
    });

    toast.success(
      lang === "fr"
        ? `${targets.length} action(s) préparée(s) pour cette semaine.`
        : `${targets.length} action(s) prepared for this week.`
    );
  };

  const markDone = (row: ControlItem) => {
    setRows(rows.map((r) => (r.id === row.id ? { ...r, realized: 1 as ControlStatus } : r)));
    toast.success(lang === "fr" ? `Contrôle ${row.ref} marqué conforme.` : `Control ${row.ref} marked compliant.`);
  };

  const pLabel = (p?: PlanAction["priority"]) => {
    if (p === "high") return "P1";
    if (p === "medium") return "P2";
    if (p === "low") return "P3";
    return lang === "fr" ? "À qualifier" : "To qualify";
  };

  const priorityBadgeClass = (p?: PlanAction["priority"]) => {
    if (p === "high") return "border-rose-500/50 text-rose-700 dark:text-rose-300 bg-rose-500/10";
    if (p === "medium") return "border-amber-500/50 text-amber-700 dark:text-amber-300 bg-amber-500/10";
    if (p === "low") return "border-emerald-500/50 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10";
    return "";
  };

  if (priorities.length === 0) {
    return (
      <div className="p-4">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>{lang === "fr" ? "Aucune action prioritaire" : "No priority action"}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {lang === "fr"
              ? "Aucun contrôle partiel ou non conforme n’est disponible. Le mode semaine se remplira dès qu’un écart sera identifié."
              : "No partial or non-compliant control is available. This view will populate as soon as a gap is identified."}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <Card className="rounded-2xl border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">
                  {lang === "fr" ? "Vos actions prioritaires cette semaine" : "Your priority actions this week"}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground max-w-3xl">
                {lang === "fr"
                  ? "Ce mode transforme les écarts en une liste courte, exécutable et orientée PME : quoi faire, pourquoi, par qui, avant quand, et quelle preuve conserver."
                  : "This mode turns gaps into a short, executable SMB-focused list: what to do, why, by whom, by when, and what proof to keep."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Button size="sm" onClick={() => generateWeeklyPlans(false)} disabled={missingPlans === 0}>
                <Lightbulb className="h-4 w-4 mr-1" />
                {lang === "fr" ? `Préparer ma semaine (${missingPlans})` : `Prepare my week (${missingPlans})`}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4">
            <div className="rounded-xl border bg-background/60 p-3">
              <div className="text-xs text-muted-foreground">{lang === "fr" ? "Actions affichées" : "Displayed actions"}</div>
              <div className="text-2xl font-semibold">{priorities.length}</div>
            </div>
            <div className="rounded-xl border bg-background/60 p-3">
              <div className="text-xs text-muted-foreground">{lang === "fr" ? "Actions P1" : "P1 actions"}</div>
              <div className="text-2xl font-semibold">{p1Count}</div>
            </div>
            <div className="rounded-xl border bg-background/60 p-3">
              <div className="text-xs text-muted-foreground">{lang === "fr" ? "Impact couvert" : "Covered impact"}</div>
              <div className="text-2xl font-semibold">{impactCovered}</div>
            </div>
            <div className="rounded-xl border bg-background/60 p-3">
              <div className="text-xs text-muted-foreground">{lang === "fr" ? "Preuves validées" : "Validated evidence"}</div>
              <div className="text-2xl font-semibold">{validatedProofs}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3">
        {priorities.map(({ row, plan, existingPlan, focus }, index) => {
          const isPlanned = hasAnyPlanFields(existingPlan);
          const dueHuman = formatDueHuman(plan?.due, lang);

          return (
            <Card key={row.id} className="rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                    <div className="space-y-2 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                          {index + 1}
                        </span>
                        <span className="font-semibold">{row.ref}</span>
                        <Badge variant="outline">{row.domain}</Badge>
                        <Badge variant="outline" className={priorityBadgeClass(plan?.priority)}>
                          {pLabel(plan?.priority)}
                        </Badge>
                        <Badge variant="outline">
                          {lang === "fr" ? `Impact ${row.impact}` : `Impact ${row.impact}`}
                        </Badge>
                        <Badge variant="outline" className={evidenceStatusClass(proofStatusFor(row.id))}>
                          {lang === "fr" ? "Preuve: " : "Evidence: "}{evidenceStatusLabel(proofStatusFor(row.id), lang)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            isPlanned
                              ? "border-emerald-500/50 text-emerald-700 dark:text-emerald-300"
                              : "border-amber-500/50 text-amber-700 dark:text-amber-300"
                          }
                        >
                          {isPlanned ? (lang === "fr" ? "Plan renseigné" : "Plan filled") : (lang === "fr" ? "Plan à compléter" : "Plan missing")}
                        </Badge>
                      </div>

                      <div className="text-sm font-medium leading-relaxed">{row.description}</div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Button size="sm" onClick={() => patchPlan(row.id, generateWeeklyPlanForControl(row, lang))}>
                        <Lightbulb className="h-4 w-4 mr-1" />
                        {isPlanned ? (lang === "fr" ? "Mettre à jour" : "Update") : (lang === "fr" ? "Générer" : "Generate")}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onOpenPlan(row.id)}>
                        {lang === "fr" ? "Ouvrir plan" : "Open plan"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => markDone(row)}>
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        {lang === "fr" ? "Marquer conforme" : "Mark compliant"}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <div className="rounded-xl border bg-muted/20 p-3">
                      <div className="text-xs font-semibold text-muted-foreground mb-1">
                        {lang === "fr" ? "Pourquoi c’est prioritaire" : "Why it matters"}
                      </div>
                      <div className="text-sm">{focus.why}</div>
                    </div>

                    <div className="rounded-xl border bg-muted/20 p-3">
                      <div className="text-xs font-semibold text-muted-foreground mb-1">
                        {lang === "fr" ? "Action à lancer cette semaine" : "Action to start this week"}
                      </div>
                      <div className="text-sm">{focus.firstStep}</div>
                    </div>

                    <div className="rounded-xl border bg-muted/20 p-3">
                      <div className="text-xs font-semibold text-muted-foreground mb-1">
                        {lang === "fr" ? "Preuve attendue" : "Expected evidence"}
                      </div>
                      <div className="text-sm">{focus.proof}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                    <div className="rounded-xl border p-3">
                      <div className="text-xs text-muted-foreground">{lang === "fr" ? "Responsable proposé" : "Suggested owner"}</div>
                      <div className="font-medium">{plan?.owner || (lang === "fr" ? "À définir" : "To define")}</div>
                    </div>
                    <div className="rounded-xl border p-3">
                      <div className="text-xs text-muted-foreground">{lang === "fr" ? "Échéance proposée" : "Suggested due date"}</div>
                      <div className="font-medium">{dueHuman}</div>
                      {plan?.due ? <div className="text-xs text-muted-foreground">{plan.due}</div> : null}
                    </div>
                    <div className="rounded-xl border p-3">
                      <div className="text-xs text-muted-foreground">{lang === "fr" ? "Effort estimé" : "Estimated effort"}</div>
                      <div className="font-medium">{focus.effort}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}


function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-muted">
      <div className="h-2 rounded-full bg-primary" style={{ width: `${value}%` }} />
    </div>
  );
}


function PlanView({
  rows,
  lang,
  plans,
  patchPlan,
  evidenceCountFor,
  proofStatusFor,
  setProofStatusForRow,
  onOpenEvidence,
  canExport = true,
  canAssignOwners = true,
  onPremiumRequired,
}: {
  rows: ControlItem[];
  lang: LangKey;
  plans: Record<string, PlanAction>;
  patchPlan: (rowId: string, patch: Partial<PlanAction>) => void;
  evidenceCountFor: (controlId: string) => number;
  proofStatusFor: (controlId: string) => EvidenceStatus;
  setProofStatusForRow: (controlId: string, status: EvidenceStatus) => void;
  onOpenEvidence: (control: ControlItem) => void;
  canExport?: boolean;
  canAssignOwners?: boolean;
  onPremiumRequired?: (featureLabel?: string) => boolean;
}) {
  const t = I18N[lang];

  const { sentinelRef: planSentinelRef, isStuck: planStuck } = useStickyShadow();


  const impactStylePlan = (impact: number): React.CSSProperties => {
    const dark =
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark");

    if (dark) {
      if (impact >= 3) return { backgroundColor: "#ffe4e6", borderColor: "#fb7185", color: "#9f1239" };
      if (impact === 2) return { backgroundColor: "#fef3c7", borderColor: "#f59e0b", color: "#92400e" };
      return { backgroundColor: "#d1fae5", borderColor: "#10b981", color: "#065f46" };
    }

    if (impact >= 3) return { backgroundColor: "#fff1f2", borderColor: "#fb7185", color: "#be123c" };
    if (impact === 2) return { backgroundColor: "#fffbeb", borderColor: "#f59e0b", color: "#b45309" };
    return { backgroundColor: "#ecfdf5", borderColor: "#10b981", color: "#047857" };
  };

  const domains = useMemo(
    () => Array.from(new Set(rows.map((r) => r.domain))).sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const [domainFilter, setDomainFilter] = useState("all");
  const [impactFilter, setImpactFilter] = useState<"all" | "1" | "2" | "3">("all");
  const [planFilter, setPlanFilter] = useState<"all" | "with" | "without">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "p1" | "p2" | "p3" | "none">("all");
  const [dueFilter, setDueFilter] = useState<"all" | "overdue" | "next7" | "next30" | "none">("all");
  const [proofFilter, setProofFilter] = useState<"all" | EvidenceStatus>("all");
  const [search, setSearch] = useState("");
  const [showPlanSecondary, setShowPlanSecondary] = useState(false);
  const [selId, setSelId] = useState<string | null>(null);

  const hasAnyPlan = React.useCallback((p?: PlanAction) => {
    if (!p) return false;
    const owner = (p.owner || "").trim();
    const due = (p.due || "").trim();
    const comment = (p.comment || "").trim();
    return Boolean(owner || due || comment || p.priority);
  }, []);

  const today0 = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const parseDue = (s?: string) => {
    if (!s) return null;
    const d = new Date(`${s}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const daysFromToday = (due?: string) => {
    const d = parseDue(due);
    if (!d) return null;
    return Math.floor((d.getTime() - today0.getTime()) / 86400000);
  };

  const prioRank = (p?: PlanAction["priority"] | string) => {
    if (p === "high") return 1;    // P1
    if (p === "medium") return 2;  // P2
    if (p === "low") return 3;     // P3
    if (p === "p1") return 1;
    if (p === "p2") return 2;
    if (p === "p3") return 3;
    return 99;
  };


  const planStatusLabel = (hasPlan: boolean) =>
    hasPlan ? (lang === "fr" ? "Plan renseigné" : "Plan filled") : (lang === "fr" ? "Plan à compléter" : "Plan missing");

  const planStatusClass = (hasPlan: boolean) =>
    hasPlan
      ? "border-emerald-500/50 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10"
      : "border-amber-500/50 text-amber-700 dark:text-amber-300 bg-amber-500/10";

  const priorityLabel = (p?: PlanAction["priority"]) => {
    if (p === "high") return "P1";
    if (p === "medium") return "P2";
    if (p === "low") return "P3";
    return "—";
  };

  const priorityClass = (p?: PlanAction["priority"]) => {
    if (p === "high") return "border-rose-500/50 text-rose-700 dark:text-rose-300 bg-rose-500/10";
    if (p === "medium") return "border-amber-500/50 text-amber-700 dark:text-amber-300 bg-amber-500/10";
    if (p === "low") return "border-emerald-500/50 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10";
    return "border-muted-foreground/30 text-muted-foreground bg-muted/20";
  };

  const formatDateShort = (due?: string) => {
    if (!due) return "—";
    const d = parseDue(due);
    if (!d) return due;
    return d.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  const dueClass = (due?: string) => {
    const df = daysFromToday(due);
    if (df === null) return "border-muted-foreground/30 text-muted-foreground bg-muted/20";
    if (df < 0) return "border-rose-500/50 text-rose-700 dark:text-rose-300 bg-rose-500/10";
    if (df <= 7) return "border-amber-500/50 text-amber-700 dark:text-amber-300 bg-amber-500/10";
    return "border-sky-500/40 text-sky-700 dark:text-sky-300 bg-sky-500/10";
  };

  const firstActionLine = (comment?: string) => {
    const cleaned = String(comment ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) || "";

    if (!cleaned) return lang === "fr" ? "Aucune action renseignée" : "No action filled";

    const withoutPrefix = cleaned
      .replace(/^(action proposée|action à lancer|action|commentaire)\s*(p[123])?\s*[::-]\s*/i, "")
      .trim();

    return withoutPrefix || cleaned;
  };

  const ownerShort = (owner?: string) => {
    const v = String(owner ?? "").trim();
    return v || "—";
  };

  const matchPriorityFilter = (p?: PlanAction["priority"]) => {
    if (priorityFilter === "all") return true;
    if (priorityFilter === "none") return !p;
    if (priorityFilter === "p1") return p === "high";
    if (priorityFilter === "p2") return p === "medium";
    if (priorityFilter === "p3") return p === "low";
    return true;
  };

  const matchDueFilter = (due?: string) => {
    const df = daysFromToday(due);
    if (dueFilter === "all") return true;
    if (dueFilter === "none") return df === null;
    if (df === null) return false;

    if (dueFilter === "overdue") return df < 0;
    if (dueFilter === "next7") return df >= 0 && df <= 7;
    if (dueFilter === "next30") return df >= 0 && df <= 30;
    return true;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    // Écarts = contrôles partiels ou non conformes.
    const base = rows.filter((r) => isGapStatus(r.realized));

    const out = base.filter((r) => {
      if (domainFilter !== "all" && r.domain !== domainFilter) return false;
      if (impactFilter !== "all" && String(r.impact) !== impactFilter) return false;

      const p = plans[r.id];
      const hasPlan = hasAnyPlan(p);

      if (planFilter === "with" && !hasPlan) return false;
      if (planFilter === "without" && hasPlan) return false;

      if (!matchPriorityFilter(p?.priority)) return false;
      if (!matchDueFilter(p?.due)) return false;

      const proofStatus = proofStatusFor(r.id);
      if (proofFilter !== "all" && proofStatus !== proofFilter) return false;

      if (!q) return true;
      const proofText = evidenceStatusLabel(proofStatus, lang).toLowerCase();
      const planText = `${p?.owner ?? ""} ${p?.due ?? ""} ${p?.priority ?? ""} ${p?.comment ?? ""} ${proofText}`.toLowerCase();
      return (
        r.ref.toLowerCase().includes(q) ||
        r.domain.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        planText.includes(q)
      );
    });

    // Tri: sans plan -> priorité -> échéance -> impact desc -> ref
    out.sort((a, b) => {
      const ap = plans[a.id];
      const bp = plans[b.id];

      const aHas = hasAnyPlan(ap);
      const bHas = hasAnyPlan(bp);
      if (aHas !== bHas) return aHas ? 1 : -1;

      const aPr = prioRank(ap?.priority);
      const bPr = prioRank(bp?.priority);
      if (aPr !== bPr) return aPr - bPr;

      const aDf = daysFromToday(ap?.due);
      const bDf = daysFromToday(bp?.due);
      const aDueScore = aDf === null ? 999999 : aDf;
      const bDueScore = bDf === null ? 999999 : bDf;
      if (aDueScore !== bDueScore) return aDueScore - bDueScore;

      if (a.impact !== b.impact) return b.impact - a.impact;

      return a.ref.localeCompare(b.ref, undefined, { numeric: true, sensitivity: "base" });
    });

    return out;
  }, [
    rows,
    plans,
    domainFilter,
    impactFilter,
    planFilter,
    priorityFilter,
    dueFilter,
    proofFilter,
    proofStatusFor,
    search,
    hasAnyPlan,
    today0,
  ]);

  useEffect(() => {
    if (!filtered.length) {
      if (selId) setSelId(null);
      return;
    }
    if (!selId || !filtered.some((r) => r.id === selId)) {
      setSelId(filtered[0].id);
    }
  }, [filtered, selId]);

  const selectedRow = useMemo(
    () => (selId ? filtered.find((r) => r.id === selId) ?? null : null),
    [filtered, selId]
  );

  useEffect(() => {
    const onSelect = (event: Event) => {
      const id = String((event as CustomEvent<string>).detail || "");
      if (id) setSelId(id);
    };
    window.addEventListener("select-plan-row", onSelect as EventListener);
    return () => window.removeEventListener("select-plan-row", onSelect as EventListener);
  }, []);

  const withPlan = useMemo(
    () => filtered.filter((r) => hasAnyPlan(plans[r.id])).length,
    [filtered, plans, hasAnyPlan]
  );
  const pct = filtered.length ? Math.round((withPlan / filtered.length) * 100) : 0;
  const visibleWithoutPlan = useMemo(
    () => filtered.filter((r) => !hasAnyPlan(plans[r.id])).length,
    [filtered, plans, hasAnyPlan]
  );

  const generateVisiblePlans = (overwrite = false) => {
    const targets = filtered.filter((r) => overwrite || !hasAnyPlan(plans[r.id]));

    if (!targets.length) {
      toast.info(lang === "fr" ? "Aucun plan à générer avec les filtres actuels." : "No action plan to generate with the current filters.");
      return;
    }

    targets.forEach((r) => patchPlan(r.id, generatePlanForControl(r, lang)));

    toast.success(
      lang === "fr"
        ? `${targets.length} plan(s) d’action généré(s).`
        : `${targets.length} action plan(s) generated.`
    );
  };


  const generateSelectedPlan = (row: ControlItem) => {
    patchPlan(row.id, generatePlanForControl(row, lang));
    toast.success(lang === "fr" ? "Proposition de plan générée." : "Suggested action plan generated.");
  };

  const exportPlanCSV = () => {
    if (!canExport) {
      onPremiumRequired?.(lang === "fr" ? "L’export CSV du plan d’action" : "Action plan CSV export");
      return;
    }
    try {
      const delimiter = ";";
      const NEWLINE = "\r\n";

      const esc = (v: any) => {
        const str = String(v ?? "").replace(/\r?\n/g, " ");
        const safe = str.replaceAll('"', '""');
        return `"${safe}"`;
      };

      const prioLabel = (p?: PlanAction["priority"]) => {
        if (p === "high") return "P1";
        if (p === "medium") return "P2";
        if (p === "low") return "P3";
        return "";
      };

      const header =
        lang === "fr"
          ? ["Référence", "Domaine", "Impact", "Point de contrôle", "Priorité", "Échéance", "Responsable", "Statut preuve", "Action"]
          : ["Reference", "Domain", "Impact", "Control point", "Priority", "Due date", "Owner", "Evidence status", "Action"];

      const lines = filtered.map((r) => {
        const p = plans?.[r.id];
        return [
          r.ref,
          r.domain,
          r.impact,
          r.description,
          prioLabel(p?.priority),
          p?.due ?? "",
          p?.owner ?? "",
          evidenceStatusLabel(proofStatusFor(r.id), lang),
          p?.comment ?? "",
        ]
          .map(esc)
          .join(delimiter);
      });

      const csv = "\uFEFF" + [header.map(esc).join(delimiter), ...lines].join(NEWLINE);

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = lang === "fr" ? "plan_action.csv" : "action_plan.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast.error(lang === "fr" ? "Erreur export CSV" : "CSV export error");
    }
  };

  const exportPlanPDF = async () => {
    if (!canExport) {
      onPremiumRequired?.(lang === "fr" ? "L’export PDF du plan d’action" : "Action plan PDF export");
      return;
    }

    try {
      await saveSearchablePlanPDF({
        rows: filtered,
        plans,
        lang,
        proofStatusFor,
        filename: lang === "fr" ? "plan_action.pdf" : "action_plan.pdf",
      });
      toast.success(lang === "fr" ? "PDF généré." : "PDF generated.");
    } catch (e) {
      console.error(e);
      toast.error(lang === "fr" ? "Erreur export PDF" : "PDF export error");
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-2xl border bg-card/40 p-3 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative sm:w-[320px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8 w-full"
              placeholder={t.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <div className="text-sm text-muted-foreground whitespace-nowrap">
              {filtered.length} {lang === "fr" ? "écarts" : "gaps"} • {withPlan} {lang === "fr" ? "avec plan" : "with plan"} ({pct}%)
            </div>
            <Button
              variant={showPlanSecondary ? "default" : "outline"}
              size="sm"
              onClick={() => setShowPlanSecondary((v) => !v)}
              aria-expanded={showPlanSecondary}
            >
              <Filter className="h-4 w-4 mr-1" />
              {lang === "fr" ? "Plus" : "More"}
            </Button>
          </div>
        </div>

        {showPlanSecondary && (
          <div className="rounded-xl border bg-background/50 p-3 space-y-3">
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
              <Button
                className="shrink-0"
                variant="default"
                size="sm"
                onClick={() => generateVisiblePlans(false)}
                disabled={visibleWithoutPlan === 0}
                title={
                  lang === "fr"
                    ? "Génère uniquement les plans manquants parmi les écarts visibles"
                    : "Generate only missing plans among visible gaps"
                }
              >
                <Lightbulb className="h-4 w-4 mr-1" />
                {lang === "fr" ? "Compléter les écarts" : "Complete gaps"}
              </Button>
              <div className="text-sm text-muted-foreground whitespace-nowrap">
                {visibleWithoutPlan > 0
                  ? (lang === "fr" ? `${visibleWithoutPlan} plan(s) manquant(s)` : `${visibleWithoutPlan} missing plan(s)`)
                  : (lang === "fr" ? "Tous les écarts visibles ont un plan" : "All visible gaps have a plan")}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 border-t pt-3">
              <Select value={domainFilter} onValueChange={setDomainFilter}>
                <SelectTrigger className="w-full sm:w-[280px]">
                  <Filter className="h-4 w-4 mr-1" />
                  <span className="truncate">{domainFilter === "all" ? t.domain : domainFilter}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{lang === "fr" ? "Tous les domaines" : "All domains"}</SelectItem>
                  {domains.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={impactFilter} onValueChange={(v) => setImpactFilter(v as any)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <span className="truncate">
                    {impactFilter === "all"
                      ? (lang === "fr" ? "Tous impacts" : "All impacts")
                      : (lang === "fr" ? `Impact ${impactFilter}` : `Impact ${impactFilter}`)}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{lang === "fr" ? "Tous impacts" : "All impacts"}</SelectItem>
                  <SelectItem value="3">Impact 3</SelectItem>
                  <SelectItem value="2">Impact 2</SelectItem>
                  <SelectItem value="1">Impact 1</SelectItem>
                </SelectContent>
              </Select>

              <Select value={planFilter} onValueChange={(v) => setPlanFilter(v as any)}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <span className="truncate">
                    {planFilter === "all"
                      ? (lang === "fr" ? "Plan d’action: tous" : "Action plan: all")
                      : planFilter === "with"
                        ? (lang === "fr" ? "Avec plan d’action" : "With action plan")
                        : (lang === "fr" ? "Sans plan d’action" : "Without action plan")}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{lang === "fr" ? "Tous" : "All"}</SelectItem>
                  <SelectItem value="with">{lang === "fr" ? "Avec plan" : "With plan"}</SelectItem>
                  <SelectItem value="without">{lang === "fr" ? "Sans plan" : "Without plan"}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as any)}>
                <SelectTrigger className="w-full sm:w-[190px]">
                  <span className="truncate">
                    {priorityFilter === "all"
                      ? (lang === "fr" ? "Priorité: toutes" : "Priority: all")
                      : priorityFilter === "none"
                        ? (lang === "fr" ? "Priorité: non définie" : "Priority: not set")
                        : priorityFilter.toUpperCase()}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{lang === "fr" ? "Toutes" : "All"}</SelectItem>
                  <SelectItem value="p1">P1</SelectItem>
                  <SelectItem value="p2">P2</SelectItem>
                  <SelectItem value="p3">P3</SelectItem>
                  <SelectItem value="none">{lang === "fr" ? "Non définie" : "Not set"}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dueFilter} onValueChange={(v) => setDueFilter(v as any)}>
                <SelectTrigger className="w-full sm:w-[210px]">
                  <span className="truncate">
                    {dueFilter === "all"
                      ? (lang === "fr" ? "Échéance: toutes" : "Due: all")
                      : dueFilter === "overdue"
                        ? (lang === "fr" ? "En retard" : "Overdue")
                        : dueFilter === "next7"
                          ? (lang === "fr" ? "≤ 7 jours" : "≤ 7 days")
                          : dueFilter === "next30"
                            ? (lang === "fr" ? "≤ 30 jours" : "≤ 30 days")
                            : (lang === "fr" ? "Sans échéance" : "No due date")}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{lang === "fr" ? "Toutes" : "All"}</SelectItem>
                  <SelectItem value="overdue">{lang === "fr" ? "En retard" : "Overdue"}</SelectItem>
                  <SelectItem value="next7">{lang === "fr" ? "≤ 7 jours" : "≤ 7 days"}</SelectItem>
                  <SelectItem value="next30">{lang === "fr" ? "≤ 30 jours" : "≤ 30 days"}</SelectItem>
                  <SelectItem value="none">{lang === "fr" ? "Sans échéance" : "No due date"}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={proofFilter} onValueChange={(v) => setProofFilter(v as any)}>
                <SelectTrigger className="w-full sm:w-[210px]">
                  <span className="truncate">
                    {proofFilter === "all" ? (lang === "fr" ? "Preuve: toutes" : "Evidence: all") : evidenceStatusLabel(proofFilter as EvidenceStatus, lang)}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{lang === "fr" ? "Toutes" : "All"}</SelectItem>
                  <SelectItem value="absent">{evidenceStatusLabel("absent", lang)}</SelectItem>
                  <SelectItem value="added">{evidenceStatusLabel("added", lang)}</SelectItem>
                  <SelectItem value="to_validate">{evidenceStatusLabel("to_validate", lang)}</SelectItem>
                  <SelectItem value="validated">{evidenceStatusLabel("validated", lang)}</SelectItem>
                  <SelectItem value="refused">{evidenceStatusLabel("refused", lang)}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 border-t pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={exportPlanCSV}
                title={!canExport ? (lang === "fr" ? "Premium requis" : "Premium required") : undefined}
              >
                {lang === "fr" ? "Exporter CSV (Plan)" : "Export CSV (Plan)"}{!canExport ? " · Premium" : ""}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportPlanPDF}
                title={!canExport ? (lang === "fr" ? "Premium requis" : "Premium required") : undefined}
              >
                {lang === "fr" ? "Exporter PDF (Plan)" : "Export PDF (Plan)"}{!canExport ? " · Premium" : ""}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl overflow-hidden border">
          <div className="overflow-x-auto">
            <div ref={planSentinelRef} className="h-px" />
            <table className="w-full min-w-[1320px] table-fixed text-sm">
              <thead className={"sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border/40 dark:border-white/5 " + (planStuck ? "shadow-sm shadow-black/20 dark:shadow-black/40" : "")}>
                <tr>
                  <th className="p-2 w-20 text-left">{t.ref}</th>
                  <th className="hidden xl:table-cell p-2 w-52 text-left">{t.domain}</th>
                  <th className="p-2 w-20 text-left">{t.impact}</th>
                  <th className="p-2 w-32 text-left">{lang === "fr" ? "Statut" : "Status"}</th>
                  <th className="p-2 w-32 text-left">{lang === "fr" ? "Preuve" : "Evidence"}</th>
                  <th className="p-2 w-24 text-left">{lang === "fr" ? "Prio." : "Prio."}</th>
                  <th className="p-2 w-28 text-left">{lang === "fr" ? "Échéance" : "Due"}</th>
                  <th className="p-2 w-44 text-left">{lang === "fr" ? "Responsable" : "Owner"}</th>
                  <th className="p-2 text-left">{lang === "fr" ? "Action — résumé" : "Action — summary"}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-muted-foreground">
                      {lang === "fr"
                        ? "Aucun écart partiel ou non conforme avec les filtres actuels."
                        : "No partial or non-compliant gap with current filters."}
                    </td>
                  </tr>
                )}

                {filtered.map((r, idx) => {
                  const p = plans[r.id];
                  const hasPlan = hasAnyPlan(p);
                  const actionSummary = firstActionLine(p?.comment);

                  return (
                    <tr
                      key={r.id}
                      className={"border-t border-border/40 dark:border-white/5 row-interactive " + (idx % 2 === 0 ? "row-zebra-even " : "row-zebra-odd ") + (r.id === selId ? "row-selected" : "")}
                      onClick={() => setSelId(r.id)}
                      tabIndex={0}
                      aria-selected={r.id === selId}
                      data-rowid={r.id}
                    >
                      <td className="p-2 align-middle">
                        <div className="font-medium">{r.ref}</div>
                        <div className="text-xs text-muted-foreground xl:hidden truncate">{r.domain}</div>
                      </td>

                      <td className="hidden xl:table-cell p-2 align-middle">
                        <div className="truncate" title={r.domain}>{r.domain}</div>
                      </td>

                      <td className="p-2 align-middle">
                        <span
                          style={{
                            ...impactStylePlan(r.impact),
                            borderWidth: "1px",
                            borderStyle: "solid",
                            borderRadius: "9999px",
                            padding: "2px 8px",
                            fontSize: "12px",
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: "28px",
                          }}
                          title={(lang === "fr" ? "Impact " : "Impact ") + r.impact}
                        >
                          {r.impact}
                        </span>
                      </td>

                      <td className="p-2 align-middle">
                        <Badge variant="outline" className={planStatusClass(hasPlan)}>
                          {planStatusLabel(hasPlan)}
                        </Badge>
                      </td>

                      <td className="p-2 align-middle">
                        <Badge variant="outline" className={evidenceStatusClass(proofStatusFor(r.id))}>
                          {evidenceStatusLabel(proofStatusFor(r.id), lang)}
                        </Badge>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {evidenceCountFor(r.id)} {lang === "fr" ? "preuve(s)" : "proof(s)"}
                        </div>
                      </td>

                      <td className="p-2 align-middle">
                        <Badge variant="outline" className={priorityClass(p?.priority)}>
                          {priorityLabel(p?.priority)}
                        </Badge>
                      </td>

                      <td className="p-2 align-middle">
                        <Badge variant="outline" className={dueClass(p?.due)}>
                          {formatDateShort(p?.due)}
                        </Badge>
                      </td>

                      <td className="p-2 align-middle">
                        <div className="truncate text-sm" title={ownerShort(p?.owner)}>
                          {ownerShort(p?.owner)}
                        </div>
                      </td>

                      <td className="p-2 align-middle">
                        <div className={"truncate " + (p?.comment?.trim() ? "text-foreground" : "text-muted-foreground")} title={p?.comment?.trim() || actionSummary}>
                          {actionSummary}
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground truncate" title={r.description}>
                          {r.description}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className={"rounded-2xl border p-4 space-y-3 lg:sticky lg:top-20 detail-panel " + (selectedRow ? "detail-panel--active" : "")}>
            {!selectedRow ? (
              <div className="text-sm text-muted-foreground">
                {lang === "fr" ? "Clique un écart pour compléter son plan d’action." : "Click a gap to fill its action plan."}
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <div className="text-sm font-semibold">{selectedRow.ref}</div>
                  <div className="text-xs text-muted-foreground">{selectedRow.domain}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">{t.controlPoint}</div>
                  <div className="text-sm whitespace-pre-wrap break-words">{selectedRow.description}</div>
                </div>

                <div className="rounded-xl border bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground">{lang === "fr" ? "Statut de preuve" : "Evidence status"}</div>
                    <Badge variant="outline" className={evidenceStatusClass(proofStatusFor(selectedRow.id))}>
                      {evidenceStatusLabel(proofStatusFor(selectedRow.id), lang)}
                    </Badge>
                  </div>

                  <Select
                    value={proofStatusFor(selectedRow.id)}
                    disabled={evidenceCountFor(selectedRow.id) === 0}
                    onValueChange={(v) => setProofStatusForRow(selectedRow.id, v as EvidenceStatus)}
                  >
                    <SelectTrigger className="w-full">
                      <span className="truncate">{evidenceStatusLabel(proofStatusFor(selectedRow.id), lang)}</span>
                    </SelectTrigger>
                    <SelectContent>
                      {selectableEvidenceStatuses(evidenceCountFor(selectedRow.id) > 0).map((status) => (
                        <SelectItem key={status} value={status}>
                          {evidenceStatusLabel(status, lang)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button variant="outline" size="sm" className="w-full" onClick={() => onOpenEvidence(selectedRow)}>
                    <Paperclip className="h-4 w-4 mr-2" />
                    {lang === "fr" ? "Preuves & note" : "Evidence & note"}
                    <span className="ml-2 text-xs text-muted-foreground">({evidenceCountFor(selectedRow.id)})</span>
                  </Button>
                </div>

                {(() => {
                  const plan = plans[selectedRow.id] || {};
                  const prioLabel =
                    plan.priority === "high"
                      ? "P1"
                      : plan.priority === "medium"
                      ? "P2"
                      : plan.priority === "low"
                      ? "P3"
                      : lang === "fr"
                      ? "Priorité"
                      : "Priority";

                  return (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-muted-foreground">{lang === "fr" ? "Plan d’action" : "Action plan"}</div>
                        <Button variant="outline" size="sm" onClick={() => generateSelectedPlan(selectedRow)}>
                          <Lightbulb className="h-4 w-4 mr-1" />
                          {lang === "fr" ? "Générer" : "Generate"}
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">{lang === "fr" ? "Responsable" : "Owner"}</div>
                          <Input
                            value={plan.owner || ""}
                            placeholder={canAssignOwners ? (lang === "fr" ? "Ex: DSI / RSSI / Prestataire..." : "e.g., CIO / CISO / Vendor...") : (lang === "fr" ? "Assignation réservée à Premium" : "Assignment reserved for Premium")}
                            readOnly={!canAssignOwners}
                            onFocus={() => {
                              if (!canAssignOwners) onPremiumRequired?.(lang === "fr" ? "L’assignation des responsables" : "Owner assignment");
                            }}
                            onChange={(e) => patchPlan(selectedRow.id, { owner: e.target.value })}
                          />
                          {!canAssignOwners ? (
                            <div className="text-[11px] text-muted-foreground">
                              {lang === "fr" ? "Free garde un plan simple ; l’assignation nominative est Premium." : "Free keeps a simple plan; named assignment is Premium."}
                            </div>
                          ) : null}
                        </div>

                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">{lang === "fr" ? "Échéance" : "Due date"}</div>
                          <Input
                            type="date"
                            value={plan.due || ""}
                            onChange={(e) => patchPlan(selectedRow.id, { due: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">{lang === "fr" ? "Priorité" : "Priority"}</div>
                        <Select
                          value={plan.priority ?? "none"}
                          onValueChange={(v) => patchPlan(selectedRow.id, { priority: v === "none" ? undefined : (v as any) })}
                        >
                          <SelectTrigger className="w-full">
                            <span className="truncate">{prioLabel}</span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{lang === "fr" ? "Non définie" : "Not set"}</SelectItem>
                            <SelectItem value="high">{lang === "fr" ? "Haute (P1)" : "High (P1)"}</SelectItem>
                            <SelectItem value="medium">{lang === "fr" ? "Moyenne (P2)" : "Medium (P2)"}</SelectItem>
                            <SelectItem value="low">{lang === "fr" ? "Basse (P3)" : "Low (P3)"}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">{lang === "fr" ? "Action détaillée / Commentaire" : "Detailed action / Comment"}</div>
                        <textarea
                          className="w-full min-h-[120px] resize-y rounded-md border bg-background/40 p-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                          placeholder={lang === "fr" ? "Détail complet visible ici uniquement : quoi faire, comment, preuve attendue, critère de clôture..." : "Full detail shown here only: what to do, how, expected evidence, closure criteria..."}
                          value={plan.comment || ""}
                          onChange={(e) => patchPlan(selectedRow.id, { comment: e.target.value })}
                        />
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}









function DashboardView({
  rows,
  plans,
  lang,
  compareWith,
  onExport,
  canExport = true,
  onOpenDomain,
  onOpenControl,
  proofStatusFor,
}: {
  rows: ControlItem[];
  plans?: Record<string, PlanAction>;
  lang: LangKey;
  compareWith?: ControlItem[] | null;
  onExport: () => void;
  canExport?: boolean;
  onOpenDomain?: (domain: string) => void;
  onOpenControl?: (controlId: string, domain: string) => void;
  proofStatusFor: (controlId: string) => EvidenceStatus;
}) {
  const t = I18N[lang];
  const { sentinelRef: dashSentinelRef, isStuck: dashStuck } = useStickyShadow();
  const hasComparison = Boolean(compareWith && compareWith.length);

  const roundPct = (value: number) => Number(value.toFixed(2));
  const clampPct = (value: number) => Math.max(0, Math.min(100, value));
  const assessmentMetrics = React.useMemo(() => calculateAssessmentMetrics(rows), [rows]);

  // Agrégations : maturité déclarée d'un côté, preuve validée de l'autre.
  const agg = React.useMemo(() => {
    const map: Record<string, {
      points: number;
      max: number;
      count: number;
      evaluatedCount: number;
      maturityCount: number;
      realizedCount: number;
      validatedProofCount: number;
    }> = {};

    for (const r of rows) {
      const rec = map[r.domain] || (map[r.domain] = {
        points: 0,
        max: 0,
        count: 0,
        evaluatedCount: 0,
        maturityCount: 0,
        realizedCount: 0,
        validatedProofCount: 0,
      });

      rec.count += 1;
      if (isEvaluatedStatus(r.realized)) rec.evaluatedCount += 1;

      // Non applicable et non évalué sont exclus de la maturité. La couverture
      // d'évaluation reste calculée séparément sur tous les contrôles.
      if (!isApplicableForMaturity(r.realized)) continue;

      rec.max += r.impact;
      rec.maturityCount += 1;
      rec.points += r.impact * controlStatusScore(r.realized);

      if (isImplementedStatus(r.realized)) {
        rec.realizedCount += 1;
        if (proofStatusFor(r.id) === "validated") {
          rec.validatedProofCount += 1;
        }
      }
    }

    const arr = Object.entries(map).map(([domain, v]) => ({
      domain,
      points: v.points,
      max: v.max,
      count: v.count,
      realizedCount: v.realizedCount,
      validatedProofCount: v.validatedProofCount,
      percent: v.max > 0 ? roundPct((v.points / v.max) * 100) : 0,
      evaluationPercent: v.count > 0 ? Math.round((v.evaluatedCount / v.count) * 100) : 0,
      proofPercent: v.realizedCount > 0 ? Math.round((v.validatedProofCount / v.realizedCount) * 100) : 0,
    }));

    const realizedTotal = arr.reduce((a, c) => a + c.realizedCount, 0);
    const validatedTotal = arr.reduce((a, c) => a + c.validatedProofCount, 0);
    const proofPercent = realizedTotal > 0 ? Math.round((validatedTotal / realizedTotal) * 100) : 0;

    return {
      arr,
      global: assessmentMetrics.maturityPoints,
      globalMax: assessmentMetrics.maturityMax,
      globalPercent: assessmentMetrics.maturityPercent,
      proof: {
        realizedTotal,
        validatedTotal,
        percent: proofPercent,
      },
    };
  }, [rows, proofStatusFor, assessmentMetrics]);

  const level = assessmentMetrics.maturityControls > 0
    ? maturityLabel(agg.globalPercent, lang)
    : (lang === "fr" ? "Non calculable" : "Not available");
  // The radar is always rendered. If an audit has no rows yet, these four
  // neutral axes keep the figure visible instead of replacing it with an
  // empty-state message. Real audit domains take over as soon as they exist.
  const emptyRadarDomains = lang === "fr"
    ? ["Organisation", "Personnes", "Physique", "Technologie"]
    : ["Organization", "People", "Physical", "Technology"];
  const radarData = agg.arr.length > 0
    ? agg.arr.map((d) => ({ domain: d.domain, value: d.percent }))
    : emptyRadarDomains.map((domain) => ({ domain, value: 0 }));

  const maturityTone = React.useCallback((p: number) => {
    if (p <= 20) return "border-rose-500/30 text-rose-700 dark:text-rose-200 bg-rose-500/10";
    if (p <= 40) return "border-amber-500/30 text-amber-800 dark:text-amber-200 bg-amber-500/10";
    if (p <= 60) return "border-yellow-500/30 text-yellow-800 dark:text-yellow-200 bg-yellow-500/10";
    if (p <= 80) return "border-emerald-500/30 text-emerald-700 dark:text-emerald-200 bg-emerald-500/10";
    return "border-sky-500/30 text-sky-700 dark:text-sky-200 bg-sky-500/10";
  }, []);

  const proofTone = React.useCallback((p: number, realizedTotal: number) => {
    if (realizedTotal === 0) return "border-muted-foreground/30 text-muted-foreground bg-muted/20";
    if (p <= 20) return "border-rose-500/30 text-rose-700 dark:text-rose-200 bg-rose-500/10";
    if (p <= 50) return "border-amber-500/30 text-amber-800 dark:text-amber-200 bg-amber-500/10";
    if (p <= 80) return "border-yellow-500/30 text-yellow-800 dark:text-yellow-200 bg-yellow-500/10";
    return "border-emerald-500/30 text-emerald-700 dark:text-emerald-200 bg-emerald-500/10";
  }, []);

  const proofLabel = React.useCallback((p: number, realizedTotal: number) => {
    if (lang === "fr") {
      if (realizedTotal === 0) return "Aucun contrôle conforme ou partiel";
      if (p <= 20) return "Preuves insuffisantes";
      if (p <= 50) return "Preuves faibles";
      if (p <= 80) return "Preuves partielles";
      return "Preuves solides";
    }
    if (realizedTotal === 0) return "No compliant or partial controls";
    if (p <= 20) return "Insufficient evidence";
    if (p <= 50) return "Weak evidence";
    if (p <= 80) return "Partial evidence";
    return "Strong evidence";
  }, [lang]);

  // Texte détaillé "Signification globale" : on parle explicitement de maturité, pas de preuve.
  const sig = React.useMemo(() => {
    const p = agg.globalPercent;
    if (assessmentMetrics.maturityControls === 0) {
      return {
        icon: <Info className="h-5 w-5" />,
        title: lang === "fr" ? "Maturité non calculable" : "Maturity not available",
        lead: lang === "fr" ? "Commencez par évaluer les contrôles applicables" : "Start by assessing applicable controls",
        lines: [assessmentCoverageNotice(assessmentMetrics, lang)],
      };
    }
    if (lang === "fr") {
      if (p <= 20) {
        return {
          icon: <AlertTriangle className="h-5 w-5" />,
          title: `Maturité des contrôles évalués ${p}%`,
          lead: "Aucun dispositif de sécurité structuré",
          lines: [
            "L’organisation est exposée à des risques majeurs.",
            "La protection du SI est quasi inexistante : des mesures urgentes s’imposent pour éviter incidents, fuites ou sanctions.",
          ],
        };
      }
      if (p <= 40) {
        return {
          icon: <Info className="h-5 w-5" />,
          title: `Maturité des contrôles évalués ${p}%`,
          lead: "Quelques actions isolées ont été mises en place",
          lines: [
            "Cependant, la cohérence et le pilotage global sont encore insuffisants.",
            "La sécurité n’est pas encore intégrée aux processus métiers, et les failles restent nombreuses.",
            "Il est temps d’engager une vraie démarche structurée.",
          ],
        };
      }
      if (p <= 60) {
        return {
          icon: <Lightbulb className="h-5 w-5" />,
          title: `Maturité des contrôles évalués ${p}%`,
          lead: "Les premières briques sont là, mais l’ensemble reste fragile",
          lines: [
            "Des efforts existent, parfois locaux, sans vision d’ensemble ni formalisation.",
            "Structurer la gouvernance et capitaliser devient prioritaire.",
          ],
        };
      }
      if (p <= 80) {
        return {
          icon: <Shield className="h-5 w-5" />,
          title: `Maturité des contrôles évalués ${p}%`,
          lead: "La sécurité est prise en compte de manière cohérente",
          lines: [
            "Les pratiques sont ancrées, les processus documentés et appliqués.",
            "Des améliorations ponctuelles restent possibles, mais le socle est solide.",
          ],
        };
      }
      return {
        icon: <ShieldCheck className="h-5 w-5" />,
        title: `Maturité des contrôles évalués ${p}%`,
        lead: "La sécurité fait partie de la culture d’entreprise",
        lines: [
          "Processus robustes, contrôles efficaces, amélioration continue en place.",
          "Un haut niveau de maturité à valoriser et à entretenir dans la durée.",
        ],
      };
    }

    if (p <= 20) return { icon: <AlertTriangle className="h-5 w-5" />, title: `Assessed-control maturity ${p}%`, lead: "No structured security program", lines: ["Major risks. Urgent measures required."] };
    if (p <= 40) return { icon: <Info className="h-5 w-5" />, title: `Assessed-control maturity ${p}%`, lead: "Some isolated actions", lines: ["Still lacking coherence and governance. Start a structured program."] };
    if (p <= 60) return { icon: <Lightbulb className="h-5 w-5" />, title: `Assessed-control maturity ${p}%`, lead: "Foundations exist, remains fragile", lines: ["Local efforts without company-wide formalization."] };
    if (p <= 80) return { icon: <Shield className="h-5 w-5" />, title: `Assessed-control maturity ${p}%`, lead: "Security handled coherently", lines: ["Practices documented and applied. Solid baseline."] };
    return { icon: <ShieldCheck className="h-5 w-5" />, title: `Assessed-control maturity ${p}%`, lead: "Security is part of the culture", lines: ["Robust processes and continuous improvement."] };
  }, [agg.globalPercent, assessmentMetrics, lang]);


  const dashboardOps = React.useMemo(() => {
    const cmpRef = (a: string, b: string) =>
      a.localeCompare(b, lang === "fr" ? "fr" : "en", { numeric: true, sensitivity: "base" });

    const hasPlan = (id: string) => {
      const p = plans?.[id];
      if (!p) return false;
      return !!((p.owner || "").trim() || p.due || p.priority || (p.comment || "").trim());
    };

    const criticalGaps = rows.filter((r) => r.impact === 3 && isGapStatus(r.realized));
    const impact3WithoutPlan = criticalGaps
      .filter((r) => !hasPlan(r.id))
      .sort((a, b) => cmpRef(a.ref, b.ref))
      .slice(0, 5);

    const missingProofControls = rows
      .filter((r) => isImplementedStatus(r.realized) && proofStatusFor(r.id) !== "validated")
      .sort((a, b) => (b.impact - a.impact) || cmpRef(a.ref, b.ref));

    const overdueActions = rows
      .filter((r) => isGapStatus(r.realized) && hasPlan(r.id) && (daysUntilISO(plans?.[r.id]?.due) ?? 9999) < 0)
      .sort((a, b) => (daysUntilISO(plans?.[a.id]?.due) ?? 0) - (daysUntilISO(plans?.[b.id]?.due) ?? 0))
      .slice(0, 5);

    const domainRows = agg.arr.map((d) => {
      const domainControls = rows.filter((r) => r.domain === d.domain);
      const domainGaps = domainControls.filter((r) => isGapStatus(r.realized));
      const domainCriticalGaps = domainGaps.filter((r) => r.impact === 3);
      const missingProof = domainControls.filter((r) => isImplementedStatus(r.realized) && proofStatusFor(r.id) !== "validated").length;
      const overdue = domainControls.filter((r) => isGapStatus(r.realized) && hasPlan(r.id) && (daysUntilISO(plans?.[r.id]?.due) ?? 9999) < 0).length;
      return {
        ...d,
        gaps: domainGaps.length,
        criticalGaps: domainCriticalGaps.length,
        criticalImpact: domainCriticalGaps.reduce((sum, r) => sum + r.impact, 0),
        missingProof,
        overdue,
      };
    });

    const criticalDomains = [...domainRows]
      .sort((a, b) =>
        (b.criticalGaps - a.criticalGaps) ||
        (b.gaps - a.gaps) ||
        (a.percent - b.percent) ||
        a.domain.localeCompare(b.domain, lang === "fr" ? "fr" : "en")
      )
      .slice(0, 5);

    return {
      evaluatedControls: assessmentMetrics.evaluatedControls,
      totalControls: assessmentMetrics.totalControls,
      evaluatedPercent: assessmentMetrics.evaluationPercent,
      criticalGapCount: criticalGaps.length,
      impact3WithoutPlanCount: criticalGaps.filter((r) => !hasPlan(r.id)).length,
      impact3WithoutPlan,
      missingProofCount: missingProofControls.length,
      topMissingProof: missingProofControls.slice(0, 5),
      overdueActionCount: rows.filter((r) => isGapStatus(r.realized) && hasPlan(r.id) && (daysUntilISO(plans?.[r.id]?.due) ?? 9999) < 0).length,
      overdueActions,
      criticalDomains,
      domainRows,
    };
  }, [rows, plans, proofStatusFor, agg.arr, lang, assessmentMetrics]);

  const credibilityGap = agg.proof.realizedTotal > 0 && (
    agg.globalPercent - agg.proof.percent >= 30 ||
    (agg.globalPercent >= 70 && agg.proof.percent < 50)
  );
return (
    <>
      <div className="no-print px-4 -mb-2">
        <div className="rounded-2xl border bg-card/40 p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <div className="text-sm font-semibold">
              {lang === "fr" ? "Comprendre le niveau de maturité" : "Understand maturity level"}
            </div>
            <div className="text-sm text-muted-foreground">
              {level} • {agg.globalPercent}% · {lang === "fr" ? "évaluation" : "assessment"} {assessmentMetrics.evaluationPercent}%
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button size="sm" onClick={() => document.getElementById("dashboard-domain-results")?.scrollIntoView({ block: "start", behavior: "smooth" })}>
              <BarChart3 className="h-4 w-4 mr-1" />
              {lang === "fr" ? "Voir les domaines" : "View domains"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              title={!canExport ? (lang === "fr" ? "Premium requis" : "Premium required") : undefined}
            >
              <Download className="h-4 w-4 mr-1" />
              {t.export}{!canExport ? " · Premium" : ""}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">{t.globalScore}</div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="text-4xl font-bold tabular-nums">{agg.globalPercent}%</div>
                <Badge className="bg-primary text-primary-foreground border-0">{level}</Badge>
              </div>
              <div className="mt-2 text-xs text-muted-foreground tabular-nums">
                {agg.global} / {agg.globalMax} {lang === "fr" ? "points" : "pts"} · {assessmentMetrics.maturityControls} {lang === "fr" ? "contrôle(s) évalué(s) applicable(s)" : "assessed applicable control(s)"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">{lang === "fr" ? "Contrôles évalués" : "Evaluated controls"}</div>
              <div className="mt-2 text-4xl font-bold tabular-nums">{dashboardOps.evaluatedControls} / {dashboardOps.totalControls}</div>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <ProgressBar value={clampPct(dashboardOps.evaluatedPercent)} />
                <span className="min-w-[42px] text-right tabular-nums">{dashboardOps.evaluatedPercent}%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">{lang === "fr" ? "Écarts critiques" : "Critical gaps"}</div>
              <div className="mt-2 text-4xl font-bold tabular-nums">{dashboardOps.criticalGapCount}</div>
              <div className="mt-2 text-xs text-muted-foreground">
                {dashboardOps.impact3WithoutPlanCount} {lang === "fr" ? "impact 3 sans plan" : "impact 3 without plan"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">{lang === "fr" ? "Preuves manquantes" : "Missing evidence"}</div>
              <div className="mt-2 text-4xl font-bold tabular-nums">{dashboardOps.missingProofCount}</div>
              <div className="mt-2 text-xs text-muted-foreground">
                {lang === "fr" ? "Sur contrôles conformes ou partiels" : "On compliant or partial controls"}
              </div>
            </CardContent>
          </Card>
        </div>

        {(assessmentMetrics.evaluationPercent < 100 || assessmentMetrics.maturityControls === 0) && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" />
              {assessmentMetrics.maturityControls === 0
                ? (lang === "fr" ? "Maturité non calculable" : "Maturity not available")
                : (lang === "fr" ? "Score de maturité provisoire" : "Provisional maturity score")}
            </div>
            <p className="mt-1">{assessmentCoverageNotice(assessmentMetrics, lang)}</p>
          </div>
        )}

        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold">
                  {lang === "fr" ? "Maturité des contrôles évalués" : "Maturity of assessed controls"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {lang === "fr"
                    ? `Le taux d’évaluation (${assessmentMetrics.evaluationPercent}%) reste un indicateur distinct du score de maturité.`
                    : `Assessment coverage (${assessmentMetrics.evaluationPercent}%) remains separate from the maturity score.`}
                </div>
              </div>
              <div className="text-2xl font-bold tabular-nums">{agg.globalPercent}%</div>
            </div>
            <div className="mt-4 h-4 w-full rounded-full bg-muted border border-border/40 overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${clampPct(agg.globalPercent)}%` }} />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle>{lang === "fr" ? "Domaines les plus critiques" : "Most critical domains"}</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardOps.criticalDomains.length === 0 ? (
                <div className="text-sm text-muted-foreground">{lang === "fr" ? "Aucun domaine à afficher." : "No domain to display."}</div>
              ) : (
                <div className="space-y-2">
                  {dashboardOps.criticalDomains.map((d) => (
                    <button
                      key={d.domain}
                      type="button"
                      disabled={!onOpenDomain}
                      onClick={() => onOpenDomain?.(d.domain)}
                      className="w-full rounded-2xl border p-3 text-left hover:bg-muted/30 disabled:opacity-70"
                      title={lang === "fr" ? "Voir les contrôles de ce domaine" : "View controls in this domain"}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium truncate">{d.domain}</span>
                        <span className="text-sm font-semibold tabular-nums">{d.percent}%</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <ProgressBar value={clampPct(d.percent)} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{d.criticalGaps} {lang === "fr" ? "écart(s) impact 3" : "impact 3 gap(s)"}</span>
                        <span>•</span>
                        <span>{d.gaps} {lang === "fr" ? "écart(s)" : "gap(s)"}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle>{lang === "fr" ? "Écarts impact 3 sans plan" : "Impact 3 gaps without a plan"}</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardOps.impact3WithoutPlan.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  {dashboardOps.criticalGapCount === 0
                    ? (lang === "fr" ? "Aucun écart critique." : "No critical gap.")
                    : (lang === "fr" ? "Tous les écarts critiques ont un plan." : "All critical gaps have a plan.")}
                </div>
              ) : (
                <ul className="space-y-2">
                  {dashboardOps.impact3WithoutPlan.map((g) => (
                    <li key={g.id}>
                      <button
                        type="button"
                        disabled={!onOpenControl}
                        className="w-full rounded-xl border p-2 text-left hover:bg-muted/30 disabled:opacity-70"
                        onClick={() => onOpenControl?.(g.id, g.domain)}
                        title={lang === "fr" ? "Ouvrir dans le listing" : "Open in listing"}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold tabular-nums">{g.ref}</span>
                          <Badge variant="outline" className="border-rose-500/50 text-rose-700 dark:text-rose-300 bg-rose-500/10">Impact 3</Badge>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground truncate">{g.domain}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle>{lang === "fr" ? "Actions en retard" : "Overdue actions"}</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardOps.overdueActions.length === 0 ? (
                <div className="text-sm text-muted-foreground">{lang === "fr" ? "Aucune action en retard." : "No overdue action."}</div>
              ) : (
                <ul className="space-y-2">
                  {dashboardOps.overdueActions.map((g) => (
                    <li key={g.id}>
                      <button
                        type="button"
                        disabled={!onOpenControl}
                        className="w-full rounded-xl border p-2 text-left hover:bg-muted/30 disabled:opacity-70"
                        onClick={() => onOpenControl?.(g.id, g.domain)}
                        title={lang === "fr" ? "Ouvrir dans le listing" : "Open in listing"}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold tabular-nums">{g.ref}</span>
                          <Badge variant="outline" className="border-rose-500/50 text-rose-700 dark:text-rose-300 bg-rose-500/10">
                            {formatDueHuman(plans?.[g.id]?.due, lang)}
                          </Badge>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground truncate">{plans?.[g.id]?.owner || g.domain}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card id="dashboard-domain-results">
          <CardHeader className="pb-3">
            <CardTitle>{t.byDomain}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {lang === "fr" ? "La maturité porte uniquement sur les contrôles évalués et applicables ; la couverture d’évaluation est affichée séparément." : "Maturity only covers assessed and applicable controls; assessment coverage is shown separately."}
            </p>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border overflow-hidden">
              <div className="overflow-x-auto">
                <div ref={dashSentinelRef} className="h-px" />
                <table className="w-full text-sm min-w-[1020px]" data-compare-active={hasComparison ? "1" : "0"}>
                  <thead className={"sticky top-0 z-10 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 dark:border-white/5 " + (dashStuck ? "shadow-sm shadow-black/20 dark:shadow-black/40" : "")}>
                    <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="p-2 text-left w-[27%]">{t.domain}</th>
                      <th className="p-2 text-left w-[25%]">{lang === "fr" ? "Maturité évaluée" : "Assessed maturity"}</th>
                      <th className="p-2 text-left w-[16%]">{lang === "fr" ? "Évaluation" : "Assessment"}</th>
                      <th className="p-2 text-left w-[20%]">{lang === "fr" ? "Preuve" : "Evidence"}</th>
                      <th className="p-2 text-right w-[7%]">{lang === "fr" ? "Score" : "Score"}</th>
                      <th className="p-2 text-right w-[5%]">{lang === "fr" ? "Ctrl." : "Ctrls"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...agg.arr]
                      .sort((a, b) => a.percent - b.percent || a.domain.localeCompare(b.domain, lang === "fr" ? "fr" : "en"))
                      .map((d, idx) => {
                        const pctClamped = clampPct(d.percent);
                        const proofPctClamped = clampPct(d.proofPercent);
                        return (
                          <tr
                            key={d.domain}
                            role={onOpenDomain ? "button" : undefined}
                            tabIndex={onOpenDomain ? 0 : undefined}
                            onClick={() => onOpenDomain?.(d.domain)}
                            onKeyDown={(e) => {
                              if (!onOpenDomain) return;
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onOpenDomain(d.domain);
                              }
                            }}
                            className={"border-t border-border/40 dark:border-white/5 row-interactive dashboard-row cursor-pointer " + (idx % 2 === 0 ? "row-zebra-even " : "row-zebra-odd ")}
                            title={lang === "fr" ? "Voir les contrôles de ce domaine" : "View controls in this domain"}
                          >
                            <td className="p-2 align-top">
                              <div className="flex flex-col gap-0.5">
                                {onOpenDomain ? (
                                  <button
                                    type="button"
                                    className="text-left text-primary hover:underline font-medium"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenDomain(d.domain);
                                    }}
                                    title={lang === "fr" ? "Voir les contrôles de ce domaine" : "View controls in this domain"}
                                  >
                                    {d.domain}
                                  </button>
                                ) : (
                                  <span className="font-medium" title={d.domain}>{d.domain}</span>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {d.points}/{d.max} {lang === "fr" ? "points évalués" : "assessed pts"} • {d.count} {lang === "fr" ? "contrôles au total" : "total controls"}
                                </span>
                              </div>
                            </td>

                            <td className="p-2 align-top">
                              <div className="flex min-w-[130px] items-center gap-2">
                                <span className="tabular-nums font-semibold min-w-[44px] text-right">{d.evaluationPercent}%</span>
                                <ProgressBar value={clampPct(d.evaluationPercent)} />
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground text-right tabular-nums">
                                {d.evaluatedCount} / {d.count}
                              </div>
                            </td>

                            <td className="p-2 align-top">
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className={"font-semibold " + maturityTone(d.percent)}>
                                  {maturityLabel(d.percent, lang)}
                                </Badge>
                                <div className="ml-auto flex min-w-[180px] items-center gap-2">
                                  <span className="tabular-nums font-semibold min-w-[46px] text-right">{d.percent}%</span>
                                  <div className="h-2 flex-1 rounded bg-muted border border-border/40">
                                    <div className="h-2 rounded bg-primary" style={{ width: `${pctClamped}%` }} />
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="p-2 align-top">
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className={"font-semibold " + proofTone(d.proofPercent, d.realizedCount)}>
                                  {proofLabel(d.proofPercent, d.realizedCount)}
                                </Badge>
                                <div className="ml-auto flex min-w-[150px] items-center gap-2">
                                  <span className="tabular-nums font-semibold min-w-[46px] text-right">{d.proofPercent}%</span>
                                  <div className="h-2 flex-1 rounded bg-muted border border-border/40">
                                    <div className="h-2 rounded bg-primary" style={{ width: `${proofPctClamped}%` }} />
                                  </div>
                                </div>
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground text-right tabular-nums">
                                {d.validatedProofCount} / {d.realizedCount} {lang === "fr" ? "validées" : "validated"}
                              </div>
                            </td>

                            <td className="p-2 text-right tabular-nums font-medium">{d.points} / {d.max}</td>
                            <td className="p-2 text-right tabular-nums">{d.count}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-4">
          <div className="space-y-4">
            <Card id="maturity-meaning">
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">{t.globalMeaning}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  {sig.icon}
                  <span className="font-medium">{sig.title}</span>
                </div>
                <div className="text-base font-semibold">{sig.lead}</div>
                {sig.lines.map((l, i) => (
                  <p key={i} className="text-sm text-muted-foreground">{l}</p>
                ))}
                {credibilityGap && (
                  <div className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertTriangle className="h-4 w-4" />
                      {lang === "fr" ? "Écart de crédibilité" : "Credibility gap"}
                    </div>
                    <p className="mt-1">
                      {lang === "fr"
                        ? "La maturité déclarée est supérieure au niveau de preuves validées. Avant un audit, un client ou un assureur, priorisez la validation des preuves."
                        : "Declared maturity is higher than the validated evidence level. Before an audit, customer review, or insurer review, prioritize evidence validation."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle>{t.maturityLegend}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-2xl overflow-hidden border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-background/70 backdrop-blur border-b border-border/40 dark:border-white/5">
                      <tr>
                        <th className="p-2 text-left">% score</th>
                        <th className="p-2 text-left">{lang === "fr" ? "Interprétation" : "Interpretation"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { range: "0 — 20%", label: lang === "fr" ? "Niveau critique" : "Critical" },
                        { range: "21 — 40%", label: lang === "fr" ? "Niveau initial" : "Initial" },
                        { range: "41 — 60%", label: lang === "fr" ? "Niveau opportunité" : "Opportunity" },
                        { range: "61 — 80%", label: lang === "fr" ? "Niveau géré" : "Managed" },
                        { range: "81 — 100%", label: lang === "fr" ? "Niveau optimisé" : "Optimized" },
                      ].map((r) => (
                        <tr key={r.range} className="border-t">
                          <td className="p-2">{r.range}</td>
                          <td className="p-2">{r.label}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t.maturityRadar}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {lang === "fr" ? "Tous les domaines restent visibles sur la figure, y compris à 0 %." : "Every domain remains visible on the figure, including at 0%."}
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="72%">
                      <PolarGrid />
                      <PolarAngleAxis dataKey="domain" tick={{ fontSize: 12, fill: "var(--card-foreground)" }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar name="%" dataKey="value" stroke="#8884d8" strokeWidth={2} fill="#8884d8" fillOpacity={0.3} dot={{ r: 3 }} />
                      <Tooltip
                        contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--card-foreground)" }}
                        labelStyle={{ color: "var(--card-foreground)", fontWeight: 600 }}
                        itemStyle={{ color: "var(--card-foreground)" }}
                        formatter={(value: any) => [`${value}%`, ""]}
                        labelFormatter={(label: any) => `${label}`}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}


type RiskSeverity = "critical" | "high" | "medium" | "low";
type RiskFamilyKey = "ransomware" | "data_leak" | "business_interruption" | "supplier" | "compliance" | "governance" | "access" | "proof";

interface RiskScenario {
  id: RiskFamilyKey;
  title: string;
  description: string;
  impact: string;
  firstAction: string;
  proof: string;
  score: number;
  severity: RiskSeverity;
  controls: ControlItem[];
  missingPlans: number;
  missingProofs: number;
  overduePlans: number;
}

function riskSeverityFromScore(score: number): RiskSeverity {
  if (score >= 95) return "critical";
  if (score >= 65) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function riskSeverityLabel(severity: RiskSeverity, lang: LangKey): string {
  if (lang === "fr") {
    if (severity === "critical") return "Critique";
    if (severity === "high") return "Élevé";
    if (severity === "medium") return "Modéré";
    return "Faible";
  }
  if (severity === "critical") return "Critical";
  if (severity === "high") return "High";
  if (severity === "medium") return "Moderate";
  return "Low";
}

function riskSeverityClass(severity: RiskSeverity): string {
  if (severity === "critical") return "border-rose-500/60 text-rose-700 dark:text-rose-200 bg-rose-500/10";
  if (severity === "high") return "border-orange-500/60 text-orange-700 dark:text-orange-200 bg-orange-500/10";
  if (severity === "medium") return "border-amber-500/60 text-amber-700 dark:text-amber-200 bg-amber-500/10";
  return "border-emerald-500/50 text-emerald-700 dark:text-emerald-200 bg-emerald-500/10";
}

function riskFamilyMeta(id: RiskFamilyKey, lang: LangKey): Omit<RiskScenario, "id" | "score" | "severity" | "controls" | "missingPlans" | "missingProofs" | "overduePlans"> {
  const fr: Record<RiskFamilyKey, Omit<RiskScenario, "id" | "score" | "severity" | "controls" | "missingPlans" | "missingProofs" | "overduePlans">> = {
    ransomware: {
      title: "Risque ransomware / compromission",
      description: "Faiblesses sur les accès, sauvegardes, incidents ou opérations pouvant amplifier une attaque.",
      impact: "Chiffrement, arrêt d’activité, perte de données, coûts de reprise.",
      firstAction: "Prioriser MFA, comptes admin, sauvegarde testée et procédure incident courte.",
      proof: "Capture MFA, rapport de sauvegarde, test de restauration, procédure incident.",
    },
    data_leak: {
      title: "Risque de fuite de données",
      description: "Écarts sur les accès, actifs, prestataires ou exigences de conformité exposant les données sensibles.",
      impact: "Divulgation de données, atteinte à l’image, obligations client ou réglementaires.",
      firstAction: "Identifier les données sensibles, revoir les accès et cadrer les tiers critiques.",
      proof: "Inventaire, matrice d’habilitations, clauses fournisseur, registre de traitement.",
    },
    business_interruption: {
      title: "Risque d’interruption d’activité",
      description: "Manque de préparation sur sauvegarde, continuité, incident ou exploitation technique.",
      impact: "Indisponibilité, perte de chiffre d’affaires, retard de production ou de service.",
      firstAction: "Tester une restauration et formaliser les premières heures de réaction incident.",
      proof: "PV de restauration, procédure de reprise, contacts d’urgence, rapport d’exploitation.",
    },
    supplier: {
      title: "Risque fournisseur / tiers",
      description: "Dépendances externes mal identifiées ou exigences sécurité insuffisantes auprès des prestataires.",
      impact: "Rupture de service, accès tiers mal maîtrisé, responsabilité contractuelle.",
      firstAction: "Lister les tiers critiques et demander les garanties minimales de sécurité.",
      proof: "Liste des tiers, questionnaire sécurité, clauses contractuelles, attestation.",
    },
    compliance: {
      title: "Risque de non-conformité",
      description: "Exigences réglementaires ou contractuelles non documentées ou non prouvables.",
      impact: "Écart client, assureur ou auditeur, sanctions, retard commercial.",
      firstAction: "Identifier les preuves minimales attendues et compléter le registre de conformité.",
      proof: "Registre, décision, preuve de revue, rapport d’écart, validation DPO/juridique.",
    },
    governance: {
      title: "Risque de pilotage sécurité insuffisant",
      description: "Gouvernance, politique ou analyse de risques incomplète, rendant les décisions difficiles à arbitrer.",
      impact: "Actions dispersées, priorités floues, budgets non arbitrés, responsabilités ambiguës.",
      firstAction: "Nommer un responsable, faire valider une politique courte et prioriser les risques majeurs.",
      proof: "Décision de direction, politique validée, registre de risques, compte rendu de comité.",
    },
    access: {
      title: "Risque d’accès non maîtrisés",
      description: "Comptes, habilitations, mots de passe ou privilèges insuffisamment contrôlés.",
      impact: "Intrusion, abus de privilège, accès non autorisé aux données ou systèmes critiques.",
      firstAction: "Revoir les comptes sensibles, supprimer les comptes inutiles et activer le MFA prioritaire.",
      proof: "Export des comptes, registre des habilitations, capture MFA, ticket de suppression.",
    },
    proof: {
      title: "Risque de preuves insuffisantes",
      description: "Contrôles déclarés conformes ou partiels sans preuve validée exploitable.",
      impact: "Maturité difficile à défendre devant un client, un auditeur ou un assureur.",
      firstAction: "Collecter, envoyer en validation puis valider les preuves des contrôles les plus critiques.",
      proof: "Preuves validées, commentaires de revue, journal d’audit horodaté.",
    },
  };

  const en: Record<RiskFamilyKey, Omit<RiskScenario, "id" | "score" | "severity" | "controls" | "missingPlans" | "missingProofs" | "overduePlans">> = {
    ransomware: {
      title: "Ransomware / compromise risk",
      description: "Weaknesses in access, backup, incident response or operations that can amplify an attack.",
      impact: "Encryption, downtime, data loss and recovery cost.",
      firstAction: "Prioritize MFA, admin accounts, tested backups and a short incident procedure.",
      proof: "MFA screenshot, backup report, restore test, incident procedure.",
    },
    data_leak: {
      title: "Data leakage risk",
      description: "Gaps in access, assets, suppliers or compliance requirements exposing sensitive data.",
      impact: "Data disclosure, reputation damage, customer or regulatory obligations.",
      firstAction: "Identify sensitive data, review access and frame critical third parties.",
      proof: "Inventory, access matrix, supplier clauses, processing register.",
    },
    business_interruption: {
      title: "Business interruption risk",
      description: "Lack of preparedness across backup, continuity, incident response or technical operations.",
      impact: "Unavailability, revenue loss, production or service delay.",
      firstAction: "Test a restore and formalize first-hour incident response.",
      proof: "Restore report, recovery procedure, emergency contacts, operations report.",
    },
    supplier: {
      title: "Supplier / third-party risk",
      description: "External dependencies insufficiently identified or covered by security requirements.",
      impact: "Service disruption, uncontrolled third-party access, contractual exposure.",
      firstAction: "List critical suppliers and request minimum security guarantees.",
      proof: "Supplier list, security questionnaire, contract clauses, attestation.",
    },
    compliance: {
      title: "Compliance risk",
      description: "Regulatory or contractual requirements not documented or not provable.",
      impact: "Customer, insurer or auditor gap, sanctions, commercial delay.",
      firstAction: "Identify minimum expected evidence and complete the compliance register.",
      proof: "Register, decision, review proof, gap report, legal/DPO validation.",
    },
    governance: {
      title: "Weak security governance risk",
      description: "Incomplete governance, policy or risk assessment making decisions hard to prioritize.",
      impact: "Scattered actions, unclear priorities, unapproved budgets, ambiguous responsibilities.",
      firstAction: "Name an owner, approve a short policy and prioritize major risks.",
      proof: "Management decision, approved policy, risk register, committee minutes.",
    },
    access: {
      title: "Uncontrolled access risk",
      description: "Accounts, permissions, passwords or privileges insufficiently controlled.",
      impact: "Intrusion, privilege abuse, unauthorized access to critical data or systems.",
      firstAction: "Review sensitive accounts, remove unused accounts and enable priority MFA.",
      proof: "Account export, access register, MFA screenshot, deletion ticket.",
    },
    proof: {
      title: "Insufficient evidence risk",
      description: "Controls declared compliant or partial without usable validated evidence.",
      impact: "Maturity is hard to defend with a customer, auditor or insurer.",
      firstAction: "Collect, submit and validate evidence for the most critical controls.",
      proof: "Validated evidence, review comments, timestamped audit log.",
    },
  };

  return (lang === "fr" ? fr : en)[id];
}

function riskFamiliesForControl(row: ControlItem, proofStatus: EvidenceStatus): RiskFamilyKey[] {
  const category = inferPlanCategory(row);
  const families = new Set<RiskFamilyKey>();

  if (["access", "backup", "incident", "operations"].includes(category)) families.add("ransomware");
  if (["backup", "incident", "operations", "supplier"].includes(category)) families.add("business_interruption");
  if (["access", "asset", "supplier", "compliance"].includes(category)) families.add("data_leak");
  if (category === "supplier") families.add("supplier");
  if (["compliance", "risk"].includes(category)) families.add("compliance");
  if (["governance", "policy", "risk"].includes(category)) families.add("governance");
  if (category === "access") families.add("access");
  if (isImplementedStatus(row.realized) && proofStatus !== "validated") families.add("proof");

  if (!families.size) {
    if (row.impact >= 3) families.add("governance");
    else families.add("compliance");
  }

  return Array.from(families);
}

function controlRiskBaseScore(row: ControlItem, plan?: PlanAction, proofStatus?: EvidenceStatus): number {
  let score = row.impact * 12;
  const status = controlStatusKey(row.realized);
  if (status === "non_conform") score += 36;
  else if (status === "partial") score += 24;
  else if (status === "not_evaluated") score += 18;
  else if (status === "conform" && proofStatus !== "validated") score += 12;

  if (!hasAnyPlanFields(plan) && isGapStatus(row.realized)) score += 18;
  const days = daysUntilISO(plan?.due);
  if (days !== null && days < 0) score += 20;
  if (proofStatus === "refused") score += 14;
  else if (proofStatus === "to_validate") score += 6;
  else if (isImplementedStatus(row.realized) && proofStatus !== "validated") score += 10;

  return score;
}

function buildRiskScenarios(rows: ControlItem[], plans: Record<string, PlanAction> | undefined, proofStatusFor: (controlId: string) => EvidenceStatus, lang: LangKey): RiskScenario[] {
  const map: Record<RiskFamilyKey, RiskScenario> = {} as Record<RiskFamilyKey, RiskScenario>;
  const candidateRows = rows.filter((row) => {
    const proof = proofStatusFor(row.id);
    return isGapStatus(row.realized) || controlStatusKey(row.realized) === "not_evaluated" || (isImplementedStatus(row.realized) && proof !== "validated");
  });

  for (const row of candidateRows) {
    const proof = proofStatusFor(row.id);
    const plan = plans?.[row.id];
    const baseScore = controlRiskBaseScore(row, plan, proof);
    const families = riskFamiliesForControl(row, proof);

    for (const family of families) {
      const meta = riskFamilyMeta(family, lang);
      const rec = map[family] || (map[family] = {
        id: family,
        ...meta,
        score: 0,
        severity: "low",
        controls: [],
        missingPlans: 0,
        missingProofs: 0,
        overduePlans: 0,
      });

      rec.score += baseScore;
      rec.controls.push(row);
      if (isGapStatus(row.realized) && !hasAnyPlanFields(plan)) rec.missingPlans += 1;
      if (isImplementedStatus(row.realized) && proof !== "validated") rec.missingProofs += 1;
      const due = daysUntilISO(plan?.due);
      if (due !== null && due < 0) rec.overduePlans += 1;
    }
  }

  return Object.values(map)
    .map((risk) => {
      const dedup = new Map<string, ControlItem>();
      for (const c of risk.controls) dedup.set(c.id, c);
      const controls = Array.from(dedup.values()).sort((a, b) => {
        const aScore = controlRiskBaseScore(a, plans?.[a.id], proofStatusFor(a.id));
        const bScore = controlRiskBaseScore(b, plans?.[b.id], proofStatusFor(b.id));
        return (bScore - aScore) || a.ref.localeCompare(b.ref, lang === "fr" ? "fr" : "en", { numeric: true, sensitivity: "base" });
      });
      const normalizedScore = Math.min(120, Math.round(risk.score / Math.max(1, Math.sqrt(controls.length))));
      return { ...risk, controls, score: normalizedScore, severity: riskSeverityFromScore(normalizedScore) };
    })
    .sort((a, b) => (b.score - a.score) || a.title.localeCompare(b.title));
}

function RisksView({ rows, plans, lang, proofStatusFor, onOpenControl, onOpenPlan }: { rows: ControlItem[]; plans: Record<string, PlanAction>; lang: LangKey; proofStatusFor: (controlId: string) => EvidenceStatus; onOpenControl: (controlId: string, domain: string) => void; onOpenPlan: (controlId: string) => void }) {
  const [query, setQuery] = React.useState("");
  const [severityFilter, setSeverityFilter] = React.useState<"all" | RiskSeverity>("all");
  const risks = React.useMemo(() => buildRiskScenarios(rows, plans, proofStatusFor, lang), [rows, plans, proofStatusFor, lang]);

  const filtered = React.useMemo(() => {
    const q = normalizeRuleText(query);
    return risks.filter((risk) => {
      if (severityFilter !== "all" && risk.severity !== severityFilter) return false;
      if (!q) return true;
      const haystack = normalizeRuleText([
        risk.title,
        risk.description,
        risk.impact,
        risk.firstAction,
        risk.proof,
        ...risk.controls.flatMap((c) => [c.ref, c.domain, c.description]),
      ].join(" "));
      return haystack.includes(q);
    });
  }, [risks, query, severityFilter]);

  const stats = React.useMemo(() => {
    const critical = risks.filter((r) => r.severity === "critical").length;
    const high = risks.filter((r) => r.severity === "high").length;
    const gaps = rows.filter((r) => isGapStatus(r.realized)).length;
    const missingProofs = rows.filter((r) => isImplementedStatus(r.realized) && proofStatusFor(r.id) !== "validated").length;
    const missingPlans = rows.filter((r) => isGapStatus(r.realized) && !hasAnyPlanFields(plans?.[r.id])).length;
    const topScore = risks[0]?.score || 0;
    return { critical, high, gaps, missingProofs, missingPlans, topScore };
  }, [risks, rows, plans, proofStatusFor]);

  const topControls = React.useMemo(() => {
    const unique = new Map<string, ControlItem>();
    risks.forEach((r) => r.controls.slice(0, 4).forEach((c) => unique.set(c.id, c)));
    return Array.from(unique.values())
      .sort((a, b) => controlRiskBaseScore(b, plans?.[b.id], proofStatusFor(b.id)) - controlRiskBaseScore(a, plans?.[a.id], proofStatusFor(a.id)))
      .slice(0, 6);
  }, [risks, plans, proofStatusFor]);

  const kpi = [
    { label: lang === "fr" ? "Risques critiques" : "Critical risks", value: stats.critical, hint: lang === "fr" ? "À traiter en premier" : "Handle first" },
    { label: lang === "fr" ? "Risques élevés" : "High risks", value: stats.high, hint: lang === "fr" ? "Priorité forte" : "Strong priority" },
    { label: lang === "fr" ? "Écarts ouverts" : "Open gaps", value: stats.gaps, hint: lang === "fr" ? "Non conformes ou partiels" : "Non-compliant or partial" },
    { label: lang === "fr" ? "Preuves à sécuriser" : "Evidence to secure", value: stats.missingProofs, hint: lang === "fr" ? "Conformes/partiels sans preuve validée" : "Compliant/partial without validated evidence" },
  ];

  return (
    <div className="p-4 space-y-4">
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" />{lang === "fr" ? "Cartographie des risques" : "Risk map"}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {lang === "fr"
                ? "Cette page transforme les écarts de contrôle en risques métier compréhensibles : quoi peut arriver, pourquoi, et quelle action lancer."
                : "This page turns control gaps into business-readable risks: what can happen, why, and what action to start."}
            </p>
          </div>
          <Badge variant="outline" className={riskSeverityClass(riskSeverityFromScore(stats.topScore))}>
            {lang === "fr" ? "Niveau dominant : " : "Dominant level: "}{riskSeverityLabel(riskSeverityFromScore(stats.topScore), lang)}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {kpi.map((item) => (
              <div key={item.label} className="rounded-2xl border bg-background/50 p-4">
                <div className="text-xs text-muted-foreground">{item.label}</div>
                <div className="text-3xl font-semibold tabular-nums mt-1">{item.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{item.hint}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" placeholder={lang === "fr" ? "Rechercher un risque, domaine, contrôle..." : "Search risk, domain, control..."} />
            </div>
            <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as "all" | RiskSeverity)}>
              <SelectTrigger className="w-full">
                <span>{severityFilter === "all" ? (lang === "fr" ? "Tous les niveaux" : "All levels") : riskSeverityLabel(severityFilter, lang)}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{lang === "fr" ? "Tous les niveaux" : "All levels"}</SelectItem>
                <SelectItem value="critical">{riskSeverityLabel("critical", lang)}</SelectItem>
                <SelectItem value="high">{riskSeverityLabel("high", lang)}</SelectItem>
                <SelectItem value="medium">{riskSeverityLabel("medium", lang)}</SelectItem>
                <SelectItem value="low">{riskSeverityLabel("low", lang)}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {risks.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <ShieldCheck className="h-10 w-10 mx-auto text-emerald-500 mb-3" />
            <div className="font-semibold">{lang === "fr" ? "Aucun risque prioritaire détecté" : "No priority risk detected"}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {lang === "fr"
                ? "Les risques apparaîtront lorsque des contrôles seront non conformes, partiels, non évalués ou sans preuve validée."
                : "Risks will appear when controls are non-compliant, partial, not evaluated or lack validated evidence."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 2xl:grid-cols-[1fr_420px] gap-4">
          <div className="space-y-4">
            {filtered.map((risk) => {
              const shownControls = risk.controls.slice(0, 5);
              return (
                <Card key={risk.id} className="overflow-hidden">
                  <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant="outline" className={riskSeverityClass(risk.severity)}>{riskSeverityLabel(risk.severity, lang)}</Badge>
                        <Badge variant="secondary">{risk.score}/120</Badge>
                        <Badge variant="outline">{risk.controls.length} {lang === "fr" ? "contrôle(s) lié(s)" : "linked control(s)"}</Badge>
                      </div>
                      <CardTitle className="text-xl">{risk.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{risk.description}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => shownControls[0] && onOpenControl(shownControls[0].id, shownControls[0].domain)} disabled={!shownControls[0]}>
                      <ListChecks className="h-4 w-4 mr-2" />
                      {lang === "fr" ? "Voir les contrôles" : "View controls"}
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-sm">
                      <div className="rounded-2xl border p-3 bg-background/50">
                        <div className="text-xs text-muted-foreground mb-1">{lang === "fr" ? "Impact métier" : "Business impact"}</div>
                        <div>{risk.impact}</div>
                      </div>
                      <div className="rounded-2xl border p-3 bg-background/50">
                        <div className="text-xs text-muted-foreground mb-1">{lang === "fr" ? "Action prioritaire" : "Priority action"}</div>
                        <div>{risk.firstAction}</div>
                      </div>
                      <div className="rounded-2xl border p-3 bg-background/50">
                        <div className="text-xs text-muted-foreground mb-1">{lang === "fr" ? "Preuve attendue" : "Expected evidence"}</div>
                        <div>{risk.proof}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div className="rounded-xl border p-3"><span className="font-semibold tabular-nums">{risk.missingPlans}</span> {lang === "fr" ? "sans plan" : "without plan"}</div>
                      <div className="rounded-xl border p-3"><span className="font-semibold tabular-nums">{risk.missingProofs}</span> {lang === "fr" ? "preuves à valider" : "evidence to validate"}</div>
                      <div className="rounded-xl border p-3"><span className="font-semibold tabular-nums">{risk.overduePlans}</span> {lang === "fr" ? "actions en retard" : "overdue actions"}</div>
                    </div>

                    <div className="rounded-2xl border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-background/70 border-b">
                          <tr>
                            <th className="p-2 text-left">{lang === "fr" ? "Contrôle" : "Control"}</th>
                            <th className="p-2 text-left">{lang === "fr" ? "Statut" : "Status"}</th>
                            <th className="p-2 text-left">{lang === "fr" ? "Preuve" : "Evidence"}</th>
                            <th className="p-2 text-right">{lang === "fr" ? "Action" : "Action"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shownControls.map((control) => {
                            const proof = proofStatusFor(control.id);
                            const plan = plans?.[control.id];
                            const missingPlan = isGapStatus(control.realized) && !hasAnyPlanFields(plan);
                            return (
                              <tr key={control.id} className="border-t row-interactive">
                                <td className="p-2 align-top">
                                  <button type="button" className="font-medium text-primary hover:underline" onClick={() => onOpenControl(control.id, control.domain)}>
                                    {control.ref}
                                  </button>
                                  <div className="text-xs text-muted-foreground line-clamp-2">{control.domain} — {control.description}</div>
                                </td>
                                <td className="p-2 align-top"><Badge variant="outline" className={controlStatusClass(control.realized)}>{controlStatusLabel(control.realized, lang, true)}</Badge></td>
                                <td className="p-2 align-top"><Badge variant="outline" className={evidenceStatusClass(proof)}>{evidenceStatusLabel(proof, lang)}</Badge></td>
                                <td className="p-2 align-top text-right">
                                  <Button size="sm" variant={missingPlan ? "default" : "outline"} onClick={() => onOpenPlan(control.id)}>
                                    {missingPlan ? (lang === "fr" ? "Créer plan" : "Create plan") : (lang === "fr" ? "Ouvrir plan" : "Open plan")}
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5" />{lang === "fr" ? "Contrôles à regarder d’abord" : "Controls to review first"}</CardTitle>
                <p className="text-sm text-muted-foreground">{lang === "fr" ? "Classés selon impact, statut, preuve et plan d’action." : "Ranked by impact, status, evidence and action plan."}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {topControls.map((control, idx) => (
                  <button key={control.id} type="button" onClick={() => onOpenControl(control.id, control.domain)} className="w-full text-left rounded-2xl border p-3 hover:bg-muted/40 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-semibold">{idx + 1}</div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">{control.ref} · {control.domain}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{control.description}</div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <Badge variant="outline" className={controlStatusClass(control.realized)}>{controlStatusLabel(control.realized, lang, true)}</Badge>
                          <Badge variant="outline">Impact {control.impact}</Badge>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {!topControls.length && <div className="text-sm text-muted-foreground">{lang === "fr" ? "Aucun contrôle prioritaire." : "No priority control."}</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileCheck2 className="h-5 w-5" />{lang === "fr" ? "Lecture recommandée" : "Recommended reading"}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>{lang === "fr" ? "Utilisez cette page pour expliquer les écarts à un dirigeant : évitez le jargon contrôle par contrôle, et commencez par le risque métier." : "Use this page to explain gaps to management: avoid control-by-control jargon and start with the business risk."}</p>
                <p>{lang === "fr" ? "Ensuite, ouvrez le plan d’action pour désigner un responsable, une échéance et une preuve attendue." : "Then open the action plan to assign an owner, a due date and expected evidence."}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditLogView({ entries, lang, onExport, onClear, canClear, canExport = true }: { entries: AuditLogEntry[]; lang: LangKey; onExport: () => void; onClear: () => void; canClear: boolean; canExport?: boolean }) {
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<"all" | AuditLogAction>("all");

  const evidenceEvents = entries.filter((e) => e.entityType === "evidence" || e.action.startsWith("evidence_")).length;
  const validationEvents = entries.filter((e) => e.action === "evidence_validated" || e.action === "evidence_refused").length;
  const todayEvents = entries.filter((e) => {
    const d = new Date(e.at);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  const filtered = entries.filter((e) => {
    if (actionFilter !== "all" && e.action !== actionFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [e.actor, e.actorEmail, auditLogActionLabel(e.action, lang), e.message, e.details, e.controlRef, e.controlDomain, e.before, e.after]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  const actions = Array.from(new Set(entries.map((e) => e.action)));

  return (
    <main className="p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="glass-card"><CardContent className="p-4"><div className="text-xs text-muted-foreground">{lang === "fr" ? "Événements" : "Events"}</div><div className="text-3xl font-semibold tabular-nums">{entries.length}</div><div className="mt-1 text-[11px] text-muted-foreground">{lang === "fr" ? "Preuves" : "Evidence"}: {evidenceEvents}</div></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4"><div className="text-xs text-muted-foreground">{lang === "fr" ? "Aujourd’hui" : "Today"}</div><div className="text-3xl font-semibold tabular-nums">{todayEvents}</div></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4"><div className="text-xs text-muted-foreground">{lang === "fr" ? "Revues de preuve" : "Evidence reviews"}</div><div className="text-3xl font-semibold tabular-nums">{validationEvents}</div></CardContent></Card>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />{lang === "fr" ? "Journal d’audit" : "Audit log"}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {lang === "fr"
                  ? "Chaque changement important est horodaté : preuve ajoutée, validation, refus, modification de contrôle ou de plan."
                  : "Every important change is timestamped: evidence added, validation, rejection, control update or action plan update."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                disabled={entries.length === 0}
                title={!canExport ? (lang === "fr" ? "Premium requis" : "Premium required") : undefined}
              >
                <Download className="h-4 w-4 mr-1" />
                {lang === "fr" ? "Exporter CSV" : "Export CSV"}{!canExport ? " · Premium" : ""}
              </Button>
              {canClear && <Button variant="ghost" size="sm" onClick={onClear} disabled={entries.length === 0}><Trash2 className="h-4 w-4 mr-1" />{lang === "fr" ? "Vider" : "Clear"}</Button>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={lang === "fr" ? "Rechercher dans le journal..." : "Search audit log..."} />
            </div>
            <Select value={actionFilter} onValueChange={(v) => setActionFilter(v as any)}>
              <SelectTrigger><span>{actionFilter === "all" ? (lang === "fr" ? "Toutes les actions" : "All actions") : auditLogActionLabel(actionFilter as AuditLogAction, lang)}</span></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{lang === "fr" ? "Toutes les actions" : "All actions"}</SelectItem>
                {actions.map((a) => <SelectItem key={a} value={a}>{auditLogActionLabel(a, lang)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {entries.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              {lang === "fr" ? "Le journal est vide. Les prochaines actions sur les preuves, contrôles et plans seront enregistrées ici." : "The log is empty. Future evidence, control and plan actions will be recorded here."}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{lang === "fr" ? "Aucun événement ne correspond aux filtres." : "No event matches the filters."}</div>
          ) : (
            <div className="space-y-2">
              {filtered.map((e) => (
                <div key={e.id} className="rounded-xl border bg-card/60 p-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={auditLogActionClass(e.action)}>{auditLogActionLabel(e.action, lang)}</Badge>
                        {e.controlRef && <Badge variant="outline">{e.controlRef}</Badge>}
                        {e.controlDomain && <span className="text-xs text-muted-foreground truncate">{e.controlDomain}</span>}
                      </div>
                      <div className="text-sm font-medium">{e.message}</div>
                      {e.details && <div className="text-xs text-muted-foreground whitespace-pre-wrap">{e.details}</div>}
                      {(e.before || e.after) && (
                        <div className="text-xs text-muted-foreground">
                          {e.before && <span>{lang === "fr" ? "Avant" : "Before"}: <b className="text-foreground">{e.before}</b></span>}
                          {e.before && e.after && <span> · </span>}
                          {e.after && <span>{lang === "fr" ? "Après" : "After"}: <b className="text-foreground">{e.after}</b></span>}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-xs text-muted-foreground md:text-right">
                      <div className="flex items-center gap-1 md:justify-end"><Clock3 className="h-3.5 w-3.5" />{new Date(e.at).toLocaleString(lang === "fr" ? "fr-FR" : "en-US")}</div>
                      <div>{e.actor}{e.actorEmail ? ` · ${e.actorEmail}` : ""}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function EvidenceDrawer({ open, onClose, control, auditSessionId, evidenceMap, proofStatusMap, commitEvidenceChange, lang, canAddEvidence, canReviewEvidence, canUseCloudStorage, onAuditEvent, onBusyChange }: { open: boolean; onClose: ()=>void; control: ControlItem | null; auditSessionId: string; evidenceMap: Record<string, EvidenceItem[]>; proofStatusMap: EvidenceStatusMap; commitEvidenceChange: (nextEvidenceMap: Record<string, EvidenceItem[]>, nextProofStatusMap?: EvidenceStatusMap) => void; lang: LangKey; canAddEvidence: boolean; canReviewEvidence: boolean; canUseCloudStorage: boolean; onAuditEvent?: (entry: Omit<AuditLogEntry, "id" | "at" | "actor" | "actorEmail">) => void; onBusyChange?: (busy: boolean) => void }){
  const t = I18N[lang];
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(()=>{ if(!open){ setNote(""); } }, [open]);
  useEffect(() => {
    onBusyChange?.(busy);
    return () => onBusyChange?.(false);
  }, [busy, onBusyChange]);
  useEffect(() => {
    if (!busy) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [busy]);
  if(!open || !control) return null;

  const list = evidenceMap[control.id] || [];
  const proofStatus = effectiveEvidenceStatus(control.id, evidenceMap, proofStatusMap);
  const emitEvidenceLog = (action: AuditLogAction, message: string, extra?: Partial<AuditLogEntry>) => {
    onAuditEvent?.({
      action,
      entityType: "evidence",
      entityId: extra?.entityId,
      controlId: control.id,
      controlRef: control.ref,
      controlDomain: control.domain,
      message,
      details: extra?.details,
      before: extra?.before,
      after: extra?.after,
    });
  };

  const proofStatusAfterEvidenceAdd = (current: EvidenceStatus): EvidenceStatus => {
    if (current === "validated") return "to_validate";
    if (current === "absent") return "added";
    return current;
  };

  const setProofStatus = (status: EvidenceStatus) => {
    if (busy) return;
    const coerced = coerceEvidenceStatusForCount(status, list.length);
    if (["to_validate", "validated", "refused"].includes(coerced) && !canReviewEvidence) {
      toast.error(lang === "fr" ? "Le workflow de validation des preuves est réservé à Premium." : "The evidence validation workflow is reserved for Premium.");
      return;
    }
    if (coerced === proofStatus) return;
    const shouldReview = coerced === "validated" || coerced === "refused";
    const reviewedAt = new Date().toISOString();
    const reviewedBy = currentEvidenceActor();
    const nextEvidenceMap = shouldReview
      ? {
          ...evidenceMap,
          [control.id]: list.map((item) => ({
            ...item,
            reviewedAt,
            reviewedBy,
            reviewStatus: coerced as EvidenceReviewStatus,
          })),
        }
      : evidenceMap;

    commitEvidenceChange(nextEvidenceMap, {
      ...proofStatusMap,
      [control.id]: coerced,
    });

    const action: AuditLogAction = coerced === "validated"
      ? "evidence_validated"
      : coerced === "refused"
        ? "evidence_refused"
        : coerced === "to_validate"
          ? "evidence_submitted"
          : "evidence_status_changed";
    emitEvidenceLog(
      action,
      lang === "fr" ? `Statut de preuve mis à jour pour le contrôle ${control.ref}.` : `Evidence status updated for control ${control.ref}.`,
      {
        before: evidenceStatusLabel(proofStatus, lang),
        after: evidenceStatusLabel(coerced, lang),
      }
    );
  };

  const addFile = async (file: File) => {
    if (busy) return;
    if (!canAddEvidence) {
      toast.error(lang === "fr" ? "Votre rôle ne permet pas d’ajouter une preuve." : "Your role cannot add evidence.");
      return;
    }

    if (!auditSessionId) {
      toast.error(lang === "fr" ? "Aucun audit actif pour rattacher cette preuve." : "No active audit to attach this evidence to.");
      return;
    }

    setBusy(true);

    const id = createEvidenceUuid();
    const addedAt = new Date().toISOString();
    const addedBy = currentEvidenceActor();

    let item: EvidenceItem;

    try {
      const fileError = validateEvidenceFile(file);
      if (fileError) throw new Error(fileError);

      const sha256 = await sha256File(file);
      if (canUseCloudStorage) {
        item = await uploadEvidenceFileToBackend({
          file,
          auditSessionId,
          controlId: control.id,
          evidenceId: id,
          addedAt,
          addedBy,
          sha256,
        });

        toast.success(
          lang === "fr"
            ? "Preuve envoyée dans le stockage sécurisé Supabase."
            : "Evidence uploaded to secure Supabase storage."
        );
      } else {
        const safeFilename = safeStorageFilename(file.name);
        const mimeType = resolveSafeMimeType(file);
        await saveEvidenceFile({
          id,
          blob: file,
          filename: safeFilename,
          mimeType,
          size: file.size,
          addedAt,
          sha256,
        });
        item = {
          id,
          filename: safeFilename,
          size: file.size,
          mimeType,
          addedAt,
          addedBy,
          storageKind: "indexeddb",
          storageKey: id,
          sha256,
          contentAvailable: true,
        };
        toast.success(
          lang === "fr"
            ? "Preuve enregistrée localement. Le stockage cloud sécurisé est inclus dans Premium."
            : "Evidence saved locally. Secure cloud storage is included in Premium."
        );
      }
    } catch (error) {
      console.error("Evidence upload error:", error);
      toast.error(
        canUseCloudStorage
          ? (lang === "fr" ? "Impossible d’envoyer la preuve dans le stockage sécurisé." : "Unable to upload the evidence to secure storage.")
          : (lang === "fr" ? "Impossible d’enregistrer la preuve localement." : "Unable to save the evidence locally.")
      );
      setBusy(false);
      return;
    }

    const nextList = [item, ...list];
    const nextEvidenceMap = { ...evidenceMap, [control.id]: nextList };
    const nextStatus = coerceEvidenceStatusForCount(proofStatusAfterEvidenceAdd(proofStatus), nextList.length);
    commitEvidenceChange(nextEvidenceMap, { ...proofStatusMap, [control.id]: nextStatus });
    emitEvidenceLog(
      "evidence_added",
      lang === "fr" ? `Preuve ajoutée au contrôle ${control.ref}.` : `Evidence added to control ${control.ref}.`,
      { entityId: item.id, details: `${item.filename} • ${Math.round(item.size / 1024)} KB`, before: evidenceStatusLabel(proofStatus, lang), after: evidenceStatusLabel(nextStatus, lang) }
    );
    setBusy(false);
  };
  const addNote = () => {
    if (busy) return;
    if (!canAddEvidence) {
      toast.error(lang === "fr" ? "Votre rôle ne permet pas d’ajouter une note de preuve." : "Your role cannot add evidence notes.");
      return;
    }
    if(!note.trim()) return; 
    const item: EvidenceItem = {
      id: uuid(),
      filename: `note.txt`,
      size: note.length,
      note: note.trim(),
      addedAt: new Date().toISOString(),
      addedBy: currentEvidenceActor(),
      storageKind: "note",
      contentAvailable: true,
    };
    const nextList = [item, ...list];
    const nextEvidenceMap = { ...evidenceMap, [control.id]: nextList };
    const nextStatus = coerceEvidenceStatusForCount(proofStatusAfterEvidenceAdd(proofStatus), nextList.length);
    commitEvidenceChange(nextEvidenceMap, { ...proofStatusMap, [control.id]: nextStatus });
    emitEvidenceLog(
      "evidence_note_added",
      lang === "fr" ? `Note de preuve ajoutée au contrôle ${control.ref}.` : `Evidence note added to control ${control.ref}.`,
      { entityId: item.id, details: item.note?.slice(0, 240), before: evidenceStatusLabel(proofStatus, lang), after: evidenceStatusLabel(nextStatus, lang) }
    );
    setNote("");
  };
  const remove = async (id: string) => {
    if (busy) return;
    if (!canAddEvidence) {
      toast.error(lang === "fr" ? "Votre rôle ne permet pas de supprimer une preuve." : "Your role cannot delete evidence.");
      return;
    }

    setBusy(true);

    const removed = (evidenceMap[control.id] || []).find(i => i.id === id);

    if (removed?.storageKind === "backend") {
      try {
        await deleteBackendEvidenceItem(removed);
      } catch (error) {
        console.error("Backend evidence delete error:", error);
        toast.error(
          lang === "fr"
            ? "Impossible de supprimer la preuve du stockage sécurisé."
            : "Unable to delete the evidence from secure storage."
        );
        setBusy(false);
        return;
      }
    } else if (removed?.storageKind === "indexeddb" && removed.storageKey) {
      await deleteEvidenceFile(removed.storageKey).catch(() => undefined);
    }

    const remaining = (evidenceMap[control.id] || []).filter(i => i.id !== id);
    const nextEvidenceMap = { ...evidenceMap, [control.id]: remaining };
    const nextStatus = coerceEvidenceStatusForCount(proofStatusMap[control.id], remaining.length);
    commitEvidenceChange(nextEvidenceMap, { ...proofStatusMap, [control.id]: nextStatus });
    emitEvidenceLog(
      "evidence_deleted",
      lang === "fr" ? `Preuve supprimée du contrôle ${control.ref}.` : `Evidence removed from control ${control.ref}.`,
      { entityId: id, details: removed?.filename, before: evidenceStatusLabel(proofStatus, lang), after: evidenceStatusLabel(nextStatus, lang) }
    );
    setBusy(false);
  };


  return (
    <>
      <div className="drawer-overlay" onClick={() => { if (!busy) onClose(); }}/>
      <div className="drawer" role="dialog" aria-modal="true" aria-label={t.evidence}>
        <header>
          <div className="font-medium">{t.evidence} — {control.ref}</div>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={busy}><X className="h-5 w-5"/></Button>
        </header>
        <div className="body">
          <div className="text-sm text-muted-foreground">{control.description}</div>


          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-muted-foreground flex gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-300" />
            <div>
              {canUseCloudStorage
                ? (lang === "fr"
                  ? "Premium actif : les fichiers ajoutés ici sont envoyés dans un bucket privé Supabase Storage avec URL signée temporaire et policies RLS."
                  : "Premium active: files added here are uploaded to a private Supabase Storage bucket with temporary signed URLs and RLS policies.")
                : (lang === "fr"
                  ? "Offre Free : les fichiers sont conservés localement dans ce navigateur. Passez en Premium pour le stockage cloud sécurisé et partagé."
                  : "Free plan: files are stored locally in this browser. Upgrade to Premium for secure shared cloud storage.")}
            </div>
          </div>

          <div className="rounded-xl border bg-muted/20 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">{lang === "fr" ? "Statut de preuve" : "Evidence status"}</div>
              <Badge variant="outline" className={evidenceStatusClass(proofStatus)}>
                {evidenceStatusLabel(proofStatus, lang)}
              </Badge>
            </div>
            <Select value={proofStatus} disabled={busy || list.length === 0 || !canReviewEvidence} onValueChange={(v) => setProofStatus(v as EvidenceStatus)}>
              <SelectTrigger className="w-full">
                <span>{evidenceStatusLabel(proofStatus, lang)}</span>
              </SelectTrigger>
              <SelectContent>
                {selectableEvidenceStatuses(list.length > 0).map((status) => (
                  <SelectItem key={status} value={status}>
                    {evidenceStatusLabel(status, lang)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">
              {canReviewEvidence
                ? (lang === "fr"
                  ? "Premium : les preuves peuvent être envoyées en validation, validées ou refusées par un auditeur / administrateur."
                  : "Premium: evidence can be submitted, validated, or rejected by an auditor / administrator.")
                : (lang === "fr"
                  ? "Free : le statut indique surtout la présence d’une preuve. Le workflow de validation / refus est réservé à Premium."
                  : "Free: the status mainly indicates whether evidence exists. Validation / rejection workflow is reserved for Premium.")}
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <input ref={fileInputRef} type="file" accept={EVIDENCE_ACCEPT_ATTRIBUTE} disabled={busy} onChange={(e)=>{ const f=e.target.files?.[0]; if(f) void addFile(f); e.currentTarget.value=''; }} className="hidden"/>
            <Button variant="outline" disabled={busy || !canAddEvidence} onClick={()=>fileInputRef.current?.click()}>{busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin"/> : <Paperclip className="h-4 w-4 mr-1"/>}{busy ? (lang === "fr" ? "Traitement…" : "Processing…") : t.addFile}</Button>
          </div>
          <div className="space-y-1">
            <label className="text-sm">{t.addNote}</label>
            <textarea className="w-full min-h-[90px] rounded-md border bg-background p-2" value={note} disabled={busy} onChange={e=>setNote(e.target.value)} placeholder="..."/>
            <div><Button size="sm" disabled={busy || !canAddEvidence} onClick={addNote}>{lang==='fr'? 'Enregistrer' : 'Save'}</Button></div>
          </div>

          <div>
            <div className="text-sm font-medium mb-1">{lang==='fr'? 'Preuves et références' : 'Evidence and references'}</div>
            {list.length===0 && <div className="text-sm text-muted-foreground">{t.noEvidence}</div>}
            <div className="space-y-2">
              {list.map(it => (
                <div key={it.id} className="border rounded-md p-2 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{it.filename}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(it.addedAt).toLocaleString()} • {Math.round(it.size/1024)} KB • {evidenceStorageLabel(it, lang)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {lang === "fr" ? "Ajoutée par" : "Added by"} {it.addedBy || (lang === "fr" ? "Utilisateur local" : "Local user")}
                        {it.mimeType ? ` • ${it.mimeType}` : ""}
                      </div>
                      {it.sha256 && (
                        <div className="text-xs text-muted-foreground truncate" title={it.sha256}>SHA-256: {it.sha256}</div>
                      )}
                      {it.reviewedAt && (
                        <div className="text-xs text-muted-foreground">
                          {it.reviewStatus === "refused"
                            ? (lang === "fr" ? "Refusée par" : "Rejected by")
                            : (lang === "fr" ? "Validée par" : "Validated by")} {it.reviewedBy || "—"} • {new Date(it.reviewedAt).toLocaleString()}
                        </div>
                      )}
                      {it.reviewComment && (
                        <div className="text-xs text-muted-foreground">{lang === "fr" ? "Commentaire" : "Comment"}: {it.reviewComment}</div>
                      )}
                    </div>
                    <Badge variant="outline" className={isEvidenceContentAvailable(it) ? "border-emerald-500/50 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10" : "border-amber-500/50 text-amber-700 dark:text-amber-300 bg-amber-500/10"}>
                      {isEvidenceContentAvailable(it) ? (lang === "fr" ? "Consultable" : "Readable") : (lang === "fr" ? "Référence" : "Reference")}
                    </Badge>
                  </div>
                  {it.note && <div className="text-sm mt-1 whitespace-pre-wrap">{it.note}</div>}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" disabled={busy} onClick={() => downloadEvidenceItem(it, lang)}>
                      <Download className="h-4 w-4 mr-1" />
                      {lang==='fr'? 'Télécharger' : 'Download'}
                    </Button>
                    <Button variant="ghost" size="sm" disabled={busy || !canAddEvidence} onClick={() => { void remove(it.id); }}>{lang==='fr'? 'Supprimer' : 'Delete'}</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function PrintExecutive({
  rows,
  lang,
  session,
  sessionName,
  baseline,
  plans,
  evidenceMap,
  proofStatusMap,
}: {
  rows: ControlItem[];
  lang: LangKey;
  session?: Session | null;
  sessionName: string;
  baseline?: ControlItem[] | null;
  plans?: Record<string, PlanAction>;
  evidenceMap?: Record<string, EvidenceItem[]>;
  proofStatusMap?: EvidenceStatusMap;
}) {
  const cmpRef = React.useCallback((a: string, b: string) =>
    a.localeCompare(b, lang === "fr" ? "fr" : "en", { numeric: true, sensitivity: "base" }),
  [lang]);

  const proofStatusFor = React.useCallback((controlId: string) =>
    effectiveEvidenceStatus(controlId, evidenceMap || {}, proofStatusMap || {}),
  [evidenceMap, proofStatusMap]);

  const hasPlan = React.useCallback((id: string) => hasAnyPlanFields(plans?.[id]), [plans]);
  const assessmentMetrics = React.useMemo(() => calculateAssessmentMetrics(rows), [rows]);
  const baselineMetrics = React.useMemo(
    () => baseline?.length ? calculateAssessmentMetrics(baseline) : null,
    [baseline]
  );

  const agg = React.useMemo(() => {
    const byDomain: Record<string, {
      points: number;
      max: number;
      count: number;
      evaluated: number;
      maturityCount: number;
      gaps: number;
      criticalGaps: number;
      missingProof: number;
      validatedProof: number;
      withPlan: number;
    }> = {};

    for (const r of rows) {
      const x = byDomain[r.domain] || (byDomain[r.domain] = {
        points: 0,
        max: 0,
        count: 0,
        evaluated: 0,
        maturityCount: 0,
        gaps: 0,
        criticalGaps: 0,
        missingProof: 0,
        validatedProof: 0,
        withPlan: 0,
      });

      x.count += 1;
      if (isEvaluatedStatus(r.realized)) x.evaluated += 1;
      if (isGapStatus(r.realized)) x.gaps += 1;
      if (r.impact === 3 && isGapStatus(r.realized)) x.criticalGaps += 1;
      if (isImplementedStatus(r.realized) && proofStatusFor(r.id) !== "validated") x.missingProof += 1;
      if (proofStatusFor(r.id) === "validated") x.validatedProof += 1;
      if (isGapStatus(r.realized) && hasPlan(r.id)) x.withPlan += 1;

      if (!isApplicableForMaturity(r.realized)) continue;
      x.maturityCount += 1;
      x.max += r.impact;
      x.points += r.impact * controlStatusScore(r.realized);
    }

    const arr = Object.entries(byDomain).map(([domain, v]) => ({
      domain,
      ...v,
      percent: v.max ? Number(((v.points / v.max) * 100).toFixed(2)) : 0,
      evaluationPercent: v.count ? Math.round((v.evaluated / v.count) * 100) : 0,
    }));

    return {
      arr,
      global: assessmentMetrics.maturityPoints,
      globalMax: assessmentMetrics.maturityMax,
      globalPercent: assessmentMetrics.maturityPercent,
    };
  }, [rows, proofStatusFor, hasPlan, assessmentMetrics]);

  const t = I18N[lang];
  const level = assessmentMetrics.maturityControls > 0
    ? maturityLabel(agg.globalPercent, lang)
    : (lang === "fr" ? "Non calculable" : "Not available");
  const baselinePercent = baselineMetrics && baselineMetrics.maturityControls > 0
    ? baselineMetrics.maturityPercent
    : null;
  const delta = baselinePercent === null || assessmentMetrics.maturityControls === 0
    ? null
    : Number((agg.globalPercent - baselinePercent).toFixed(2));

  const gaps = React.useMemo(() => rows
    .filter((r) => isGapStatus(r.realized))
    .slice()
    .sort((a, b) => (b.impact - a.impact) || cmpRef(a.ref, b.ref)), [rows, cmpRef]);

  const criticalGaps = React.useMemo(() => gaps.filter((r) => r.impact === 3), [gaps]);
  const gapsWithoutPlan = React.useMemo(() => gaps.filter((r) => !hasPlan(r.id)), [gaps, hasPlan]);
  const missingProofs = React.useMemo(() => rows
    .filter((r) => isImplementedStatus(r.realized) && proofStatusFor(r.id) !== "validated")
    .slice()
    .sort((a, b) => (b.impact - a.impact) || cmpRef(a.ref, b.ref)), [rows, proofStatusFor, cmpRef]);

  const plannedActions = React.useMemo(() => gaps
    .map((row) => ({ row, plan: plans?.[row.id] }))
    .filter(({ plan }) => hasAnyPlanFields(plan))
    .sort((a, b) =>
      priorityWeight(a.plan?.priority) - priorityWeight(b.plan?.priority) ||
      ((daysUntilISO(a.plan?.due) ?? 9999) - (daysUntilISO(b.plan?.due) ?? 9999)) ||
      (b.row.impact - a.row.impact) ||
      cmpRef(a.row.ref, b.row.ref)
    ), [gaps, plans, cmpRef]);

  const overdueActions = plannedActions.filter(({ plan }) => (daysUntilISO(plan?.due) ?? 9999) < 0);
  const allEvidenceCount = rows.reduce((total, r) => total + (evidenceMap?.[r.id]?.length || 0), 0);
  const evidenceValidatedControls = rows.filter((r) => proofStatusFor(r.id) === "validated").length;
  const evidenceAddedControls = rows.filter((r) => proofStatusFor(r.id) !== "absent").length;
  const evaluatedControls = assessmentMetrics.evaluatedControls;
  const evaluatedPercent = assessmentMetrics.evaluationPercent;
  const applicableControls = assessmentMetrics.maturityControls;
  const conformControls = rows.filter((r) => r.realized === 1).length;
  const partialControls = rows.filter((r) => r.realized === 0.5).length;
  const nonConformControls = rows.filter((r) => r.realized === 0).length;
  const notEvaluatedControls = assessmentMetrics.notEvaluatedControls;
  const notApplicableControls = assessmentMetrics.notApplicableControls;

  const topDomains = React.useMemo(() => [...agg.arr]
    .sort((a, b) =>
      (b.criticalGaps - a.criticalGaps) ||
      (b.gaps - a.gaps) ||
      (a.percent - b.percent) ||
      a.domain.localeCompare(b.domain, lang === "fr" ? "fr" : "en")
    )
    .slice(0, 6), [agg.arr, lang]);

  const reportConclusion = React.useMemo(() => {
    if (assessmentMetrics.maturityControls === 0) {
      return lang === "fr"
        ? "Aucune conclusion de maturité ne peut encore être formulée : aucun contrôle évalué et applicable n’entre dans le calcul."
        : "No maturity conclusion can be drawn yet: no assessed and applicable control is included in the calculation.";
    }
    if (assessmentMetrics.evaluationPercent < 100) {
      return lang === "fr"
        ? `La maturité des contrôles évalués est de ${agg.globalPercent}%. Ce résultat reste provisoire avec ${assessmentMetrics.evaluationPercent}% de couverture ; une conclusion sur l’ensemble du périmètre nécessite de terminer l’évaluation.`
        : `Maturity of assessed controls is ${agg.globalPercent}%. This result remains provisional at ${assessmentMetrics.evaluationPercent}% coverage; a conclusion about the full scope requires completing the assessment.`;
    }
    if (lang === "fr") {
      if (agg.globalPercent <= 20) return "Le dispositif de sécurité est à un niveau critique. La priorité est de structurer les fondamentaux, de traiter les écarts d’impact 3 et de produire des preuves vérifiables.";
      if (agg.globalPercent <= 40) return "Le dispositif est en phase initiale. Des mesures existent probablement, mais elles doivent être formalisées, pilotées et rattachées à des preuves.";
      if (agg.globalPercent <= 60) return "Le dispositif progresse mais reste hétérogène. Les actions doivent se concentrer sur les domaines faibles, les preuves et la réduction des écarts majeurs.";
      if (agg.globalPercent <= 80) return "Le dispositif est globalement maîtrisé. L’enjeu principal est la consolidation, le suivi périodique et la démonstration par les preuves.";
      return "Le dispositif est mature. Le rapport doit surtout alimenter l’amélioration continue et la conservation des preuves.";
    }
    if (agg.globalPercent <= 20) return "The security program is at a critical level. Priority should be given to core controls, impact-3 gaps and verifiable evidence.";
    if (agg.globalPercent <= 40) return "The program is at an initial stage. Measures may exist, but need to be formalized, governed and backed by evidence.";
    if (agg.globalPercent <= 60) return "The program is progressing but remains uneven. Actions should focus on weak domains, evidence and major gaps.";
    if (agg.globalPercent <= 80) return "The program is broadly managed. The main challenge is consolidation, periodic monitoring and evidence.";
    return "The program is mature. The report mainly supports continuous improvement and evidence retention.";
  }, [agg.globalPercent, assessmentMetrics, lang]);

  const recommendations = React.useMemo(() => {
    const out: string[] = [];
    if (lang === "fr") {
      if (criticalGaps.length) out.push(`Traiter en priorité les ${criticalGaps.length} écart(s) d’impact 3, avec responsable, échéance et preuve attendue.`);
      if (gapsWithoutPlan.length) out.push(`Compléter le plan d’action pour ${gapsWithoutPlan.length} écart(s), en commençant par les plus critiques.`);
      if (missingProofs.length) out.push(`Valider les preuves des ${missingProofs.length} contrôle(s) conformes ou partiels non encore justifiés.`);
      if (notEvaluatedControls) out.push(`Finaliser l’évaluation des ${notEvaluatedControls} contrôle(s) encore non évalués.`);
      if (!out.length) out.push("Maintenir une revue périodique, conserver les preuves et suivre les actions jusqu'à clôture.");
      return out.slice(0, 5);
    }
    if (criticalGaps.length) out.push(`Prioritize the ${criticalGaps.length} impact-3 gap(s), with owner, due date and expected evidence.`);
    if (gapsWithoutPlan.length) out.push(`Complete action plans for ${gapsWithoutPlan.length} gap(s), starting with the most critical.`);
    if (missingProofs.length) out.push(`Validate evidence for ${missingProofs.length} compliant or partial control(s) not yet justified.`);
    if (notEvaluatedControls) out.push(`Complete the assessment for ${notEvaluatedControls} control(s) still not evaluated.`);
    if (!out.length) out.push("Maintain periodic review, retain evidence and track actions until closure.");
    return out.slice(0, 5);
  }, [criticalGaps.length, gapsWithoutPlan.length, missingProofs.length, notEvaluatedControls, lang]);

  const statusRows = [
    { label: controlStatusLabel("conform", lang), count: conformControls },
    { label: controlStatusLabel("partial", lang), count: partialControls },
    { label: controlStatusLabel("non_conform", lang), count: nonConformControls },
    { label: controlStatusLabel("not_evaluated", lang), count: notEvaluatedControls },
    { label: controlStatusLabel("not_applicable", lang), count: notApplicableControls },
  ];

  return (
    <div className="print-only">
      <section className="page p-10">
        <div className="report-cover flex items-center justify-between">
          <div>
            <div className="report-brand">GapTrack · {lang === "fr" ? "Audit SSI" : "Sec Audit"}</div>
            <h1>{lang === "fr" ? "Rapport d’audit sécurité" : "Security audit report"}</h1>
            <p className="report-subtitle">
              {sessionName} · {sessionFrameworkLabel(session, lang)} · {formatAuditDate(session?.auditDate, lang)}
            </p>
          </div>
          <div className="text-right report-small report-muted">
            <strong>{lang === "fr" ? "Généré le" : "Generated on"}</strong><br />
            {new Date().toLocaleString(lang === "fr" ? "fr-FR" : "en-US")}<br />
            {lang === "fr" ? "Livrable exécutif" : "Executive deliverable"}
          </div>
        </div>

        <div className="report-grid report-grid-3">
          <div className="report-card">
            <div className="report-kpi-label">{lang === "fr" ? "Organisation" : "Organization"}</div>
            <div className="font-semibold">{session?.organization || "—"}</div>
            <div className="report-kpi-note">{lang === "fr" ? "Commanditaire" : "Sponsor"}: {session?.sponsor || "—"}</div>
          </div>
          <div className="report-card">
            <div className="report-kpi-label">{lang === "fr" ? "Auditeur" : "Auditor"}</div>
            <div className="font-semibold">{session?.auditor || "—"}</div>
            <div className="report-kpi-note">{auditTypeLabel(session?.auditType, lang)} · {criticalityLabel(session?.criticality, lang)}</div>
          </div>
          <div className="report-card">
            <div className="report-kpi-label">{lang === "fr" ? "Périmètre" : "Scope"}</div>
            <div>{reportShortText(session?.scope, "—", 210)}</div>
          </div>
        </div>

        <div className="mt-6 report-grid report-grid-4">
          <div className="report-card">
            <div className="report-kpi-label">{t.globalScore}</div>
            <div className="report-kpi-value tabular-nums">{agg.globalPercent}%</div>
            <div className="report-kpi-note">{level} · {agg.global} / {agg.globalMax} {lang === "fr" ? "points" : "pts"}</div>
          </div>
          <div className="report-card">
            <div className="report-kpi-label">{lang === "fr" ? "Contrôles évalués" : "Assessed controls"}</div>
            <div className="report-kpi-value tabular-nums">{evaluatedControls} / {rows.length}</div>
            <div className="report-kpi-note">{evaluatedPercent}% {lang === "fr" ? "de l’audit" : "of audit"}</div>
          </div>
          <div className="report-card">
            <div className="report-kpi-label">{lang === "fr" ? "Écarts critiques" : "Critical gaps"}</div>
            <div className="report-kpi-value tabular-nums">{criticalGaps.length}</div>
            <div className="report-kpi-note">{lang === "fr" ? "Impact 3 partiels ou non conformes" : "Impact-3 partial or non-compliant"}</div>
          </div>
          <div className="report-card">
            <div className="report-kpi-label">{lang === "fr" ? "Preuves validées" : "Validated evidence"}</div>
            <div className="report-kpi-value tabular-nums">{evidenceValidatedControls}</div>
            <div className="report-kpi-note">{allEvidenceCount} {lang === "fr" ? "preuve(s) référencée(s)" : "evidence item(s) referenced"}</div>
          </div>
        </div>

        {(assessmentMetrics.evaluationPercent < 100 || assessmentMetrics.maturityControls === 0) && (
          <div className="mt-6 report-callout report-callout-warning">
            <div className="report-section-kicker">
              {assessmentMetrics.maturityControls === 0
                ? (lang === "fr" ? "Maturité non calculable" : "Maturity not available")
                : (lang === "fr" ? "Résultat provisoire" : "Provisional result")}
            </div>
            <div>{assessmentCoverageNotice(assessmentMetrics, lang)}</div>
          </div>
        )}

        {delta !== null && (
          <div className="mt-6 report-card">
            <div className="report-kpi-label">{lang === "fr" ? "Évolution vs session précédente" : "Change vs previous session"}</div>
            <div className="font-semibold tabular-nums">
              {delta >= 0 ? "+" : ""}{delta} {lang === "fr" ? "points" : "pts"} · {baselinePercent}% → {agg.globalPercent}%
            </div>
            <div className="report-kpi-note">
              {lang === "fr" ? "Couverture" : "Coverage"}: {baselineMetrics?.evaluationPercent ?? 0}% → {assessmentMetrics.evaluationPercent}%
            </div>
          </div>
        )}

        <div className={(agg.globalPercent <= 20 || criticalGaps.length > 0) ? "report-callout report-callout-warning" : "report-callout"}>
          <div className="report-section-kicker">{lang === "fr" ? "Synthèse exécutive" : "Executive summary"}</div>
          <div>{reportConclusion}</div>
          <ul className="report-list">
            {recommendations.map((r, idx) => <li key={idx}>{r}</li>)}
          </ul>
        </div>

        {(session?.objectives || session?.context) && (
          <div className="mt-6 report-grid report-grid-2">
            <div className="report-card">
              <div className="report-section-kicker">{lang === "fr" ? "Objectifs" : "Objectives"}</div>
              <div>{reportShortText(session?.objectives, "—", 520)}</div>
            </div>
            <div className="report-card">
              <div className="report-section-kicker">{lang === "fr" ? "Contexte" : "Context"}</div>
              <div>{reportShortText(session?.context, "—", 520)}</div>
            </div>
          </div>
        )}
      </section>

      <section className="page p-10">
        <div className="report-section-kicker">{lang === "fr" ? "01 · Lecture des résultats" : "01 · Results overview"}</div>
        <h2 className="report-section-title">{lang === "fr" ? "Maturité, preuve et couverture" : "Maturity, evidence and coverage"}</h2>

        <div className="report-grid report-grid-3 mb-3">
          <div className="report-card">
            <div className="report-kpi-label">{lang === "fr" ? "Évalués et applicables" : "Assessed and applicable"}</div>
            <div className="report-kpi-value tabular-nums">{applicableControls}</div>
            <div className="report-kpi-note">{notApplicableControls} {lang === "fr" ? "non applicable(s)" : "not applicable"}</div>
          </div>
          <div className="report-card">
            <div className="report-kpi-label">{lang === "fr" ? "Preuves à régulariser" : "Evidence to fix"}</div>
            <div className="report-kpi-value tabular-nums">{missingProofs.length}</div>
            <div className="report-kpi-note">{lang === "fr" ? "Sur contrôles conformes ou partiels" : "On compliant or partial controls"}</div>
          </div>
          <div className="report-card">
            <div className="report-kpi-label">{lang === "fr" ? "Actions en retard" : "Overdue actions"}</div>
            <div className="report-kpi-value tabular-nums">{overdueActions.length}</div>
            <div className="report-kpi-note">{plannedActions.length} {lang === "fr" ? "action(s) planifiée(s)" : "planned action(s)"}</div>
          </div>
        </div>

        <div className="report-grid report-grid-2">
          <div className="report-card">
            <div className="report-section-kicker">{lang === "fr" ? "Répartition des statuts" : "Status breakdown"}</div>
            <table className="report-table-compact">
              <tbody>
                {statusRows.map((s) => (
                  <tr key={s.label}>
                    <td>{s.label}</td>
                    <td className="text-right tabular-nums"><strong>{s.count}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="report-card">
            <div className="report-section-kicker">{lang === "fr" ? "Statut des preuves" : "Evidence status"}</div>
            <table className="report-table-compact">
              <tbody>
                <tr><td>{lang === "fr" ? "Contrôles avec preuve" : "Controls with evidence"}</td><td className="text-right tabular-nums"><strong>{evidenceAddedControls}</strong></td></tr>
                <tr><td>{evidenceStatusLabel("validated", lang)}</td><td className="text-right tabular-nums"><strong>{evidenceValidatedControls}</strong></td></tr>
                <tr><td>{lang === "fr" ? "Preuves référencées" : "Evidence items"}</td><td className="text-right tabular-nums"><strong>{allEvidenceCount}</strong></td></tr>
                <tr><td>{lang === "fr" ? "Preuves manquantes ou non validées" : "Missing or unvalidated evidence"}</td><td className="text-right tabular-nums"><strong>{missingProofs.length}</strong></td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <h2 className="report-section-title mt-6">{t.byDomain}</h2>
        <table className="w-full text-sm border report-table-compact">
          <thead>
            <tr>
              <th>{t.domain}</th>
              <th className="text-right">{lang === "fr" ? "Maturité évaluée" : "Assessed maturity"}</th>
              <th className="text-right">{lang === "fr" ? "Évaluation" : "Assessment"}</th>
              <th className="text-right">{lang === "fr" ? "Score" : "Score"}</th>
              <th className="text-right">{lang === "fr" ? "Écarts" : "Gaps"}</th>
              <th className="text-right">{lang === "fr" ? "Impact 3" : "Impact 3"}</th>
              <th className="text-right">{lang === "fr" ? "Preuves à revoir" : "Evidence to review"}</th>
            </tr>
          </thead>
          <tbody>
            {[...agg.arr].sort((a, b) => a.domain.localeCompare(b.domain, lang === "fr" ? "fr" : "en")).map((d) => {
              const pctClamped = Math.max(0, Math.min(100, d.percent));
              return (
                <tr key={d.domain}>
                  <td><strong>{d.domain}</strong><br /><span className="report-muted report-small">{d.count} {lang === "fr" ? "contrôle(s)" : "control(s)"}</span></td>
                  <td className="text-right tabular-nums">
                    <strong>{d.maturityCount ? `${d.percent}%` : "—"}</strong>
                    <div className="report-maturity-track"><div className="report-maturity-fill" style={{ width: `${pctClamped}%` }} /></div>
                    <span className="report-muted report-small">{d.maturityCount ? maturityLabel(d.percent, lang) : (lang === "fr" ? "Non calculable" : "Not available")}</span>
                  </td>
                  <td className="text-right tabular-nums"><strong>{d.evaluationPercent}%</strong><br /><span className="report-muted report-small">{d.evaluated} / {d.count}</span></td>
                  <td className="text-right tabular-nums">{d.points} / {d.max}</td>
                  <td className="text-right tabular-nums">{d.gaps}</td>
                  <td className="text-right tabular-nums">{d.criticalGaps}</td>
                  <td className="text-right tabular-nums">{d.missingProof}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="page p-10">
        <div className="report-section-kicker">{lang === "fr" ? "02 · Priorités" : "02 · Priorities"}</div>
        <h2 className="report-section-title">{lang === "fr" ? "Domaines et écarts à traiter en premier" : "Domains and gaps to address first"}</h2>

        <div className="report-grid report-grid-2">
          <div className="report-card">
            <div className="report-section-kicker">{lang === "fr" ? "Domaines prioritaires" : "Priority domains"}</div>
            <table className="report-table-compact">
              <thead><tr><th>{t.domain}</th><th className="text-right">%</th><th className="text-right">{lang === "fr" ? "Écarts" : "Gaps"}</th><th className="text-right">P3</th></tr></thead>
              <tbody>
                {topDomains.map((d) => (
                  <tr key={d.domain}>
                    <td>{d.domain}</td>
                    <td className="text-right tabular-nums">{d.percent}%</td>
                    <td className="text-right tabular-nums">{d.gaps}</td>
                    <td className="text-right tabular-nums">{d.criticalGaps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="report-card">
            <div className="report-section-kicker">{lang === "fr" ? "Écarts impact 3" : "Impact-3 gaps"}</div>
            <table className="report-table-compact">
              <thead><tr><th>{t.ref}</th><th>{t.domain}</th><th>{lang === "fr" ? "Plan" : "Plan"}</th></tr></thead>
              <tbody>
                {criticalGaps.slice(0, 10).map((r) => (
                  <tr key={r.id}>
                    <td>{r.ref}</td>
                    <td>{r.domain}</td>
                    <td>{hasPlan(r.id) ? <span className="report-pill report-pill-good">OK</span> : <span className="report-pill report-pill-critical">{lang === "fr" ? "À créer" : "Missing"}</span>}</td>
                  </tr>
                ))}
                {criticalGaps.length === 0 && <tr><td colSpan={3} className="text-right report-muted">{lang === "fr" ? "Aucun" : "None"}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <h2 className="report-section-title mt-6">{lang === "fr" ? "Plan d’action priorisé" : "Prioritized action plan"}</h2>
        <p className="report-muted text-sm mb-3">
          {lang === "fr"
            ? "Extrait des actions à lancer ou suivre, triées par priorité, échéance et impact."
            : "Extract of actions to launch or track, sorted by priority, due date and impact."}
        </p>
        <table className="w-full border report-table-compact gaps-table">
          <thead>
            <tr>
              <th>{t.ref}</th>
              <th>{t.domain}</th>
              <th className="text-right">{t.impact}</th>
              <th>{lang === "fr" ? "Priorité" : "Priority"}</th>
              <th>{lang === "fr" ? "Échéance" : "Due"}</th>
              <th>{lang === "fr" ? "Responsable" : "Owner"}</th>
              <th className="action-col">{lang === "fr" ? "Action / preuve attendue" : "Action / expected evidence"}</th>
            </tr>
          </thead>
          <tbody>
            {plannedActions.slice(0, 18).map(({ row, plan }) => (
              <tr key={row.id}>
                <td>{row.ref}</td>
                <td>{row.domain}</td>
                <td className="text-right tabular-nums">{row.impact}</td>
                <td>{reportPriorityLabel(plan?.priority, lang)}</td>
                <td>{plan?.due ? formatDueHuman(plan.due, lang) : "—"}</td>
                <td>{plan?.owner || "—"}</td>
                <td className="action-col report-action-text">{reportShortText(plan?.comment, lang === "fr" ? "Action à préciser." : "Action to define.", 620)}</td>
              </tr>
            ))}
            {plannedActions.length === 0 && gaps.slice(0, 12).map((row) => (
              <tr key={row.id}>
                <td>{row.ref}</td>
                <td>{row.domain}</td>
                <td className="text-right tabular-nums">{row.impact}</td>
                <td><span className="report-pill report-pill-warning">{lang === "fr" ? "À définir" : "To define"}</span></td>
                <td>—</td>
                <td>—</td>
                <td className="action-col report-action-text">{lang === "fr" ? "Créer une action avec responsable, échéance, preuve attendue et critère de clôture." : "Create an action with owner, due date, expected evidence and closure criterion."}</td>
              </tr>
            ))}
            {gaps.length === 0 && <tr><td colSpan={7} className="text-right report-muted">{lang === "fr" ? "Aucun écart à planifier" : "No gap to plan"}</td></tr>}
          </tbody>
        </table>
      </section>

      <section className="page p-10">
        <div className="report-section-kicker">{lang === "fr" ? "03 · Détails" : "03 · Details"}</div>
        <h2 className="report-section-title">{lang === "fr" ? "Liste détaillée des écarts" : "Detailed list of gaps"}</h2>
        <p className="report-muted text-sm mb-3">
          {lang === "fr" ? "Trié par impact décroissant, puis par référence." : "Sorted by impact descending, then reference."}
        </p>
        <table className="w-full text-sm border gaps-table report-table-compact">
          <thead>
            <tr>
              <th>{t.ref}</th>
              <th>{t.domain}</th>
              <th className="text-right">{t.impact}</th>
              <th>{t.realized}</th>
              <th>{t.controlPoint}</th>
              <th>{lang === "fr" ? "Preuve" : "Evidence"}</th>
              <th className="action-col">{lang === "fr" ? "Plan d’action" : "Action plan"}</th>
            </tr>
          </thead>
          <tbody>
            {gaps.map((g) => (
              <tr key={g.id}>
                <td>{g.ref}</td>
                <td>{g.domain}</td>
                <td className="text-right tabular-nums">{g.impact}</td>
                <td>{controlStatusLabel(g.realized, lang, true)}</td>
                <td>{g.description}</td>
                <td>{evidenceStatusLabel(proofStatusFor(g.id), lang)}<br /><span className="report-muted report-small">{evidenceMap?.[g.id]?.length || 0} {lang === "fr" ? "preuve(s)" : "item(s)"}</span></td>
                <td className="action-col report-action-text">{reportPlanSummary(plans?.[g.id], lang)}</td>
              </tr>
            ))}
            {gaps.length === 0 && (
              <tr><td colSpan={7} className="p-4 text-center report-muted">{lang === "fr" ? "Aucun écart" : "No gaps"}</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="page p-10">
        <div className="report-section-kicker">{lang === "fr" ? "04 · Annexes" : "04 · Appendices"}</div>
        <h2 className="report-section-title">{lang === "fr" ? "Preuves à compléter et traçabilité" : "Evidence to complete and traceability"}</h2>

        <div className="report-grid report-grid-2">
          <div className="report-card">
            <div className="report-section-kicker">{lang === "fr" ? "Preuves non validées" : "Unvalidated evidence"}</div>
            <table className="report-table-compact">
              <thead><tr><th>{t.ref}</th><th>{t.domain}</th><th>{lang === "fr" ? "Statut" : "Status"}</th></tr></thead>
              <tbody>
                {missingProofs.slice(0, 18).map((r) => (
                  <tr key={r.id}>
                    <td>{r.ref}</td>
                    <td>{r.domain}</td>
                    <td>{evidenceStatusLabel(proofStatusFor(r.id), lang)}</td>
                  </tr>
                ))}
                {missingProofs.length === 0 && <tr><td colSpan={3} className="text-right report-muted">{lang === "fr" ? "Aucune" : "None"}</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="report-card">
            <div className="report-section-kicker">{lang === "fr" ? "Écarts sans plan" : "Gaps without plan"}</div>
            <table className="report-table-compact">
              <thead><tr><th>{t.ref}</th><th>{t.domain}</th><th className="text-right">{t.impact}</th></tr></thead>
              <tbody>
                {gapsWithoutPlan.slice(0, 18).map((r) => (
                  <tr key={r.id}>
                    <td>{r.ref}</td>
                    <td>{r.domain}</td>
                    <td className="text-right tabular-nums">{r.impact}</td>
                  </tr>
                ))}
                {gapsWithoutPlan.length === 0 && <tr><td colSpan={3} className="text-right report-muted">{lang === "fr" ? "Aucun" : "None"}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 report-card">
          <div className="report-section-kicker">{lang === "fr" ? "Réserve" : "Disclaimer"}</div>
          <p className="text-sm report-muted">
            {lang === "fr"
              ? "Ce rapport est généré à partir des informations saisies dans GapTrack. Les résultats dépendent de la complétude de l’évaluation, de la qualité des preuves jointes et du périmètre déclaré."
              : "This report is generated from information entered in GapTrack. Results depend on the completeness of the assessment, evidence quality and declared scope."}
          </p>
        </div>
      </section>

      <div className="report-footer">
        GapTrack · {sessionName} · {sessionFrameworkLabel(session, lang)} · {new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US")}
      </div>
    </div>
  );
}

type AppRoute = "home" | "about" | "security" | "privacy" | "login" | "app" | "reset-password";

function pathForRoute(route: AppRoute): string {
  if (route === "about") return "/a-propos";
  if (route === "security") return "/securite";
  if (route === "privacy") return "/confidentialite";
  if (route === "login") return "/login";
  if (route === "app") return "/app";
  if (route === "reset-password") return "/reset-password";
  return "/";
}

function getCurrentAppRoute(): AppRoute {
  if (typeof window === "undefined") return "home";

  const path = window.location.pathname;

  if (path.startsWith("/reset-password")) return "reset-password";
  if (path.startsWith("/a-propos")) return "about";
  if (path.startsWith("/securite")) return "security";
  if (path.startsWith("/confidentialite")) return "privacy";
  if (path.startsWith("/login")) return "login";
  if (path.startsWith("/app")) return "app";

  return "home";
}


type SeoRouteConfig = {
  title: string;
  description: string;
  path: string;
  robots: "index, follow" | "noindex, nofollow";
};

const SEO_ROUTE_CONFIG: Record<AppRoute, SeoRouteConfig> = {
  home: {
    title: "GapTrack — Plateforme d’audit SSI et gestion des preuves",
    description: "Centralisez vos audits SSI, preuves, écarts et plans d’action dans une plateforme sécurisée pensée pour ISO 27001, NIS2, DORA, RGPD et PGSSI-S.",
    path: "/",
    robots: "index, follow",
  },
  about: {
    title: "À propos de GapTrack — Audit SSI, conformité et preuves",
    description: "Découvrez GapTrack, un projet conçu pour simplifier l’audit SSI, la conformité, la gestion des preuves, le suivi des écarts et les plans d’action.",
    path: "/a-propos",
    robots: "index, follow",
  },
  security: {
    title: "Sécurité GapTrack — Protection des audits, preuves et accès",
    description: "Découvrez les principes de sécurité de GapTrack : authentification, rôles, protection des preuves, traçabilité et confidentialité des données d’audit SSI.",
    path: "/securite",
    robots: "index, follow",
  },
  privacy: {
    title: "Confidentialité GapTrack — Données, preuves et audits SSI",
    description: "Consultez la politique de confidentialité de GapTrack : données de compte, audits SSI, preuves, rôles, traçabilité, conservation et demandes de suppression.",
    path: "/confidentialite",
    robots: "index, follow",
  },
  login: {
    title: "Connexion GapTrack",
    description: "Accédez à votre espace GapTrack pour gérer vos audits SSI, preuves, écarts et plans d’action.",
    path: "/login",
    robots: "noindex, nofollow",
  },
  app: {
    title: I18N.fr.appTitle,
    description: "Espace applicatif privé GapTrack réservé aux utilisateurs connectés.",
    path: "/app",
    robots: "noindex, nofollow",
  },
  "reset-password": {
    title: "Réinitialisation du mot de passe GapTrack",
    description: "Page sécurisée de réinitialisation du mot de passe GapTrack.",
    path: "/reset-password",
    robots: "noindex, nofollow",
  },
};

function siteOrigin(): string {
  if (typeof window === "undefined" || !window.location?.origin) return "";
  return window.location.origin;
}

function absoluteRouteUrl(path: string): string {
  const origin = siteOrigin();
  return origin ? `${origin}${path}` : path;
}

function upsertMetaTag(attribute: "name" | "property", key: string, content: string): void {
  if (typeof document === "undefined") return;

  const selector = `meta[${attribute}="${key}"]`;
  let element = document.head.querySelector<HTMLMetaElement>(selector);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

function upsertCanonicalLink(href: string): void {
  if (typeof document === "undefined") return;

  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }

  element.setAttribute("href", href);
}

function applyRouteSeo(route: AppRoute, lang: LangKey = "fr"): void {
  if (typeof document === "undefined") return;

  const config = SEO_ROUTE_CONFIG[route] || SEO_ROUTE_CONFIG.home;
  const title = route === "app" ? I18N[lang].appTitle : config.title;
  const canonicalUrl = absoluteRouteUrl(config.path);

  document.documentElement.lang = lang;
  document.title = title;

  upsertMetaTag("name", "description", config.description);
  upsertMetaTag("name", "robots", config.robots);

  upsertCanonicalLink(canonicalUrl);

  upsertMetaTag("property", "og:site_name", "GapTrack");
  upsertMetaTag("property", "og:type", "website");
  upsertMetaTag("property", "og:title", title);
  upsertMetaTag("property", "og:description", config.description);
  upsertMetaTag("property", "og:url", canonicalUrl);
  upsertMetaTag("property", "og:locale", lang === "fr" ? "fr_FR" : "en_US");

  upsertMetaTag("name", "twitter:card", "summary_large_image");
  upsertMetaTag("name", "twitter:title", title);
  upsertMetaTag("name", "twitter:description", config.description);
}

function AppRouter() {
  const [route, setRoute] = useState<AppRoute>(() => getCurrentAppRoute());

  const navigate = React.useCallback((nextRoute: AppRoute, replace = false) => {
    const nextPath = pathForRoute(nextRoute);

    if (typeof window !== "undefined" && window.location.pathname !== nextPath) {
      if (replace) {
        window.history.replaceState({}, "", nextPath);
      } else {
        window.history.pushState({}, "", nextPath);
      }
    }

    setRoute(nextRoute);

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncRoute = () => setRoute(getCurrentAppRoute());

    window.addEventListener("popstate", syncRoute);

    return () => {
      window.removeEventListener("popstate", syncRoute);
    };
  }, []);

  useEffect(() => {
    applyRouteSeo(route);
  }, [route]);

  if (route === "reset-password") {
    return <ResetPasswordPage />;
  }

  return <GapTrackApp route={route} navigate={navigate} />;
}

export default AppRouter;

function GapTrackApp({
  route,
  navigate,
}: {
  route: AppRoute;
  navigate: (route: AppRoute, replace?: boolean) => void;
}) {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const savedTheme = loadSettings().theme;
    return savedTheme === "light" || savedTheme === "dark" ? savedTheme : "dark";
  });
  const [lang, setLang] = useState<LangKey>((loadSettings().lang as any) || "fr");
  const [tab, setTab] = useState("listing");
  const [listingOpenRequest, setListingOpenRequest] = useState<ListingOpenRequest | null>(null);

  const openListingFromDashboard = React.useCallback((domain: string, controlId?: string) => {
    setListingOpenRequest({ id: Date.now(), domain, controlId });
    setTab("listing");
  }, []);
  
  useEffect(() => {
    applyRouteSeo(route, lang);
  }, [route, lang]);

  // Sessions
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState("");

  // Built-in versioned catalogs are loaded from public assets. Only custom
  // templates are persisted in localStorage.
  const [customTemplates, setCustomTemplates] = useState<ChecklistTemplate[]>(() => loadTemplates());
  const [builtInTemplates, setBuiltInTemplates] = useState<ChecklistTemplate[]>([]);
  const templates = React.useMemo(
    () => [...builtInTemplates, ...customTemplates],
    [builtInTemplates, customTemplates]
  );

  useEffect(() => { try { saveTemplates(customTemplates); } catch {} }, [customTemplates]);
  useEffect(() => {
    let cancelled = false;
    void loadBuiltInTemplates().then((loaded) => {
      if (!cancelled) setBuiltInTemplates(loaded);
    });
    return () => { cancelled = true; };
  }, []);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const autoOpenedWizardForSessionRef = useRef<string | null>(null);
  const currentSession = React.useMemo(
    () => sessions.find((s) => s.id === activeSessionId) || null,
    [sessions, activeSessionId]
  );

  const [users, setUsers] = useState<AppUser[]>(() => loadUsers());
  const [activeUserId, setActiveUserId] = useState<string>("");
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  const activeUser = React.useMemo(
    () => users.find((u) => u.id === activeUserId && u.active !== false) || null,
    [users, activeUserId]
  );
  const accountDeletionConfirmationHandledRef = useRef(false);

  useEffect(() => {
    if (activeUser && route !== "app") {
      navigate("app", true);
    }
  }, [activeUser, route, navigate]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    if (url.searchParams.get("gaptrack_delete_confirm") !== "1") return;
    if (accountDeletionConfirmationHandledRef.current) return;
    if (!activeUser) return;

    const deletionUser = activeUser;
    const deletionUserEmail = normalizeEmail(deletionUser.email);

    accountDeletionConfirmationHandledRef.current = true;

    const cleanDeletionQuery = () => {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete("gaptrack_delete_confirm");
      window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
    };

    async function confirmAndDeleteAccount() {
      try {
        const firstConfirmation = window.confirm(
          lang === "fr"
            ? `Le lien e-mail a été validé. Voulez-vous supprimer définitivement le compte ${deletionUserEmail} et ses données serveur ?`
            : `The email link was validated. Do you want to permanently delete the account ${deletionUserEmail} and its server data?`
        );

        if (!firstConfirmation) {
          toast.info(lang === "fr" ? "Suppression du compte annulée." : "Account deletion cancelled.");
          return;
        }

        const typedEmail = normalizeEmail(
          window.prompt(
            lang === "fr"
              ? `Dernière confirmation : retapez votre e-mail (${deletionUserEmail}) pour supprimer le compte.`
              : `Final confirmation: retype your email (${deletionUserEmail}) to delete the account.`
          ) || ""
        );

        if (typedEmail !== deletionUserEmail) {
          toast.error(lang === "fr" ? "E-mail incorrect. Suppression annulée." : "Incorrect email. Deletion cancelled.");
          return;
        }

        const { error } = await supabase.functions.invoke("gaptrack-delete-own-account", {
          body: { confirmEmail: deletionUserEmail },
        });

        if (error) throw error;

        toast.success(lang === "fr" ? "Compte supprimé définitivement." : "Account permanently deleted.");
        await supabase.auth.signOut().catch(() => undefined);
        clearActiveUserId();
        setActiveUserId("");
        setUsers((prev) => {
          const next = prev.filter((user) => user.id !== deletionUser.id && normalizeEmail(user.email) !== deletionUserEmail);
          saveUsers(next);
          return next;
        });
        setLocalActorFromUser(null);
        navigate("home", true);
      } catch (error) {
        console.error("Unable to delete own account after email confirmation.", error);
        const message = error instanceof Error ? error.message : "";
        toast.error(
          lang === "fr"
            ? `Impossible de supprimer le compte côté serveur${message ? ` : ${message}` : "."}`
            : `Unable to delete the server-side account${message ? `: ${message}` : "."}`
        );
      } finally {
        cleanDeletionQuery();
      }
    }

    void confirmAndDeleteAccount();
  }, [activeUser, lang, navigate]);

  const canManageUsersFlag = userCanManageUsers(activeUser);
  const canCreateUsersFlag = userCanCreateUsers(activeUser);
  const canManageSubscriptionsFlag = userCanManageSubscriptions(activeUser);
  const canEditAuditFlag = userCanEditAudit(activeUser);
  const canReviewEvidenceFlag = userCanReviewEvidence(activeUser);
  const canManageAuditsFlag = userCanManageAudits(activeUser);
  const canDeleteAuditsFlag = userCanDeleteAudits(activeUser);
  const isPremiumUser = isPremiumPlan(activeUser?.subscriptionPlan);

  useEffect(() => {
    if (!activeUser || !userCanManageUsers(activeUser)) return;

    const manager = activeUser;
    let cancelled = false;

    async function loadManageableProfiles() {
      try {
        const profiles = await fetchManageableUserProfilesOnServer(manager);
        if (cancelled || profiles.length === 0) return;

        setUsers((prev) => {
          const next = mergeUsersByEmail(prev, profiles);
          saveUsers(next);
          return next;
        });
      } catch (error) {
        console.warn("Unable to refresh manageable GapTrack profiles.", error);
      }
    }

    void loadManageableProfiles();

    return () => {
      cancelled = true;
    };
  }, [activeUser?.id, activeUser?.email, activeUser?.role, activeUser?.subscriptionPlan, activeUser?.groupId, activeUser?.groupName]);

  // Journal d’audit local, séparé de l’undo/redo pour rester traçable.
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const auditLogRef = useRef<AuditLogEntry[]>([]);

  const appendAuditLog = React.useCallback((entry: Omit<AuditLogEntry, "id" | "at" | "actor" | "actorEmail">) => {
    if (!activeSessionId) return;
    const actorName = activeUser?.name || currentEvidenceActor();
    const actorEmail = activeUser?.email;
    const nextEntry: AuditLogEntry = {
      id: uuid(),
      at: new Date().toISOString(),
      actor: actorName,
      actorEmail,
      ...entry,
    };
    setAuditLog((prev) => {
      const next = [nextEntry, ...prev].slice(0, 800);
      auditLogRef.current = next;
      return next;
    });
  }, [activeSessionId, activeUser?.email, activeUser?.name]);

  const clearAuditLog = React.useCallback(() => {
    if (!activeSessionId) return;
    if (!canDeleteAuditsFlag) {
      toast.error(lang === "fr" ? "Seul un administrateur peut vider le journal." : "Only an administrator can clear the log.");
      return;
    }
    auditLogRef.current = [];
    setAuditLog([]);
    toast.success(lang === "fr" ? "Journal vidé." : "Audit log cleared.");
  }, [activeSessionId, canDeleteAuditsFlag, lang]);

  useEffect(() => {
    saveUsers(users);
  }, [users]);

  useEffect(() => {
    setLocalActorFromUser(activeUser);
  }, [activeUser]);

  const requireAuditEditor = React.useCallback(() => {
    if (canEditAuditFlag) return true;
    toast.error(lang === "fr" ? "Votre rôle ne permet pas de modifier cet audit." : "Your role cannot edit this audit.");
    return false;
  }, [canEditAuditFlag, lang]);

  const requireEvidenceReviewer = React.useCallback(() => {
    if (canReviewEvidenceFlag) return true;
    toast.error(lang === "fr" ? "Seul un auditeur ou administrateur peut valider ou refuser une preuve." : "Only an auditor or administrator can validate or reject evidence.");
    return false;
  }, [canReviewEvidenceFlag, lang]);

  const requireAuditManager = React.useCallback(() => {
    if (canManageAuditsFlag) return true;
    toast.error(lang === "fr" ? "Votre rôle ne permet pas de créer ou gérer des audits." : "Your role cannot create or manage audits.");
    return false;
  }, [canManageAuditsFlag, lang]);

  const requireAuditDeletion = React.useCallback(() => {
    if (canDeleteAuditsFlag) return true;
    toast.error(lang === "fr" ? "Seul un administrateur peut supprimer un audit." : "Only an administrator can delete an audit.");
    return false;
  }, [canDeleteAuditsFlag, lang]);

  const requestPremiumByEmail = React.useCallback((source?: string) => {
    const href = buildPremiumRequestMailto({
      email: activeUser?.email,
      name: activeUser?.name,
      organization: activeUser?.organization,
      source: source || "Application GapTrack",
    });
    window.location.href = href;
  }, [activeUser?.email, activeUser?.name, activeUser?.organization]);

  const requirePremiumFeature = React.useCallback((featureLabel?: string) => {
    if (isPremiumUser) return true;
    toast.error(
      lang === "fr"
        ? `${featureLabel || "Cette fonctionnalité"} est réservée à l’offre Premium.`
        : `${featureLabel || "This feature"} is reserved for the Premium plan.`,
      {
        action: {
          label: lang === "fr" ? "Demander Premium" : "Request Premium",
          onClick: () => requestPremiumByEmail(featureLabel),
        },
      }
    );
    return false;
  }, [isPremiumUser, lang, requestPremiumByEmail]);


  const updateOwnProfile = React.useCallback(async (patch: { name: string; organization?: string }) => {
    if (!activeUser) {
      toast.error(lang === "fr" ? "Aucun utilisateur connecté." : "No signed-in user.");
      return false;
    }

    const name = patch.name.trim();
    const organization = patch.organization?.trim() || undefined;

    if (!name) {
      toast.error(lang === "fr" ? "Le nom est obligatoire." : "Name is required.");
      return false;
    }

    if (name.length > 80 || (organization && organization.length > 120)) {
      toast.error(lang === "fr" ? "Le profil contient une valeur trop longue." : "The profile contains a value that is too long.");
      return false;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user?.id) throw authError || new Error("Utilisateur non connecté.");

      const { error } = await supabase
        .from("gaptrack_profiles")
        .update({ name, organization: organization || null })
        .eq("id", authData.user.id);

      if (error) throw error;

      await supabase.auth.updateUser({
        data: { name, organization: organization || null },
      }).catch((error) => {
        console.warn("Unable to mirror profile in Supabase Auth metadata.", error);
      });

      const updatedUser: AppUser = { ...activeUser, name, organization };
      setUsers((prev) => {
        const next = prev.map((user) => user.id === activeUser.id ? updatedUser : user);
        saveUsers(next);
        return next;
      });
      setLocalActorFromUser(updatedUser);
      toast.success(lang === "fr" ? "Profil mis à jour." : "Profile updated.");
      return true;
    } catch (error) {
      console.error("Unable to update GapTrack profile.", error);
      toast.error(lang === "fr" ? "Impossible de mettre à jour le profil serveur." : "Unable to update the server profile.");
      return false;
    }
  }, [activeUser, lang]);

  const requestOwnPasswordReset = React.useCallback(async () => {
    const targetEmail = normalizeEmail(activeUser?.email || "");

    if (!targetEmail) {
      toast.error(lang === "fr" ? "Aucun e-mail de compte disponible." : "No account email is available.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      console.error("Unable to send own password reset email", error);
      toast.error(authErrorMessage(error));
      return;
    }

    toast.success(
      lang === "fr"
        ? "E-mail de réinitialisation envoyé. Consultez votre boîte mail."
        : "Password reset email sent. Check your inbox."
    );
  }, [activeUser?.email, lang]);

  const syncSupabaseAuthenticatedUser = React.useCallback((profile: { email: string; name?: string; organization?: string; role?: UserRole; subscriptionPlan?: SubscriptionPlan; active?: boolean; createdByUserId?: string; createdByEmail?: string; groupId?: string; groupName?: string }) => {
    const email = normalizeEmail(profile.email);

    if (!email) return;

    if (profile.active === false) {
      setUsers((prev) => {
        const next = prev.map((u) => normalizeEmail(u.email) === email ? { ...u, active: false } : u);
        saveUsers(next);
        return next;
      });
      toast.error(lang === "fr" ? "Ce compte a été désactivé par l’administrateur." : "This account has been disabled by the administrator.");
      void supabase.auth.signOut();
      return;
    }

    const now = new Date().toISOString();
    const profilePlan = normalizeSubscriptionPlan(profile.subscriptionPlan);

    setUsers((prev) => {
      const existing = prev.find((u) => normalizeEmail(u.email) === email);
      let active: AppUser;
      let next: AppUser[];

      if (existing) {
        const subscriptionPlan = profilePlan;
        active = {
          ...existing,
          name: profile.name?.trim() || existing.name || email,
          organization: profile.organization?.trim() || existing.organization,
          role: profile.role ? normalizeUserRole(profile.role) : (isServiceOwnerEmail(email) ? "admin" : "viewer"),
          subscriptionPlan,
          createdByUserId: profile.createdByUserId || existing.createdByUserId,
          createdByEmail: profile.createdByEmail ? normalizeEmail(profile.createdByEmail) : existing.createdByEmail,
          groupId: profile.groupId || existing.groupId,
          groupName: profile.groupName || existing.groupName,
          active: profile.active !== false,
          lastLoginAt: now,
        };
        next = prev.map((u) => u.id === existing.id ? active : u);
      } else {
        const subscriptionPlan = profilePlan;
        active = {
          id: uuid(),
          name: profile.name?.trim() || email,
          email,
          role: profile.role ? normalizeUserRole(profile.role) : (isServiceOwnerEmail(email) ? "admin" : "viewer"),
          subscriptionPlan,
          organization: profile.organization?.trim() || undefined,
          createdByUserId: profile.createdByUserId || undefined,
          createdByEmail: profile.createdByEmail ? normalizeEmail(profile.createdByEmail) : undefined,
          groupId: profile.groupId || undefined,
          groupName: profile.groupName || undefined,
          createdAt: now,
          lastLoginAt: now,
          active: profile.active !== false,
        };
        next = [active, ...prev];
      }

      saveUsers(next);
      saveActiveUserId(active.id);
      setActiveUserId(active.id);
      setLocalActorFromUser(active);
      return next;
    });
  }, [lang]);

  useEffect(() => {
    let mounted = true;

    async function syncAuthSessionUser(user: any) {
      if (!user?.email) return;

      try {
        const mfa = (supabase.auth as any).mfa;
        if (mfa?.getAuthenticatorAssuranceLevel) {
          const { data, error } = await mfa.getAuthenticatorAssuranceLevel();
          if (error) throw error;

          if (data?.nextLevel === "aal2" && data?.currentLevel !== "aal2") {
            if (!mounted) return;
            clearActiveUserId();
            setActiveUserId("");
            setLocalActorFromUser(null);
            return;
          }
        }
      } catch (error) {
        console.error("Unable to evaluate Supabase MFA session level", error);
        if (!mounted) return;
        clearActiveUserId();
        setActiveUserId("");
        setLocalActorFromUser(null);
        return;
      }

      const meta = user.user_metadata || {};
      const metaCreatedByUserId = typeof meta.createdByUserId === "string" && meta.createdByUserId.trim()
        ? meta.createdByUserId
        : (typeof meta.invitedByUserId === "string" && meta.invitedByUserId.trim() ? meta.invitedByUserId : undefined);
      const metaCreatedByEmail = typeof meta.createdByEmail === "string" && meta.createdByEmail.trim()
        ? normalizeEmail(meta.createdByEmail)
        : (typeof meta.invitedByEmail === "string" && meta.invitedByEmail.trim() ? normalizeEmail(meta.invitedByEmail) : undefined);
      const fallbackProfile = {
        email: user.email,
        name: typeof meta.name === "string" ? meta.name : undefined,
        organization: typeof meta.organization === "string" ? meta.organization : undefined,
        // Never trust client-editable Auth metadata for role or plan. Ownership is
        // only a legacy fallback; Supabase gaptrack_profiles remains the source.
        role: undefined,
        subscriptionPlan: "free" as SubscriptionPlan,
        active: undefined,
        createdByUserId: metaCreatedByUserId,
        createdByEmail: metaCreatedByEmail,
        groupId: typeof meta.groupId === "string" && meta.groupId.trim() ? meta.groupId.trim() : undefined,
        groupName: typeof meta.groupName === "string" && meta.groupName.trim() ? meta.groupName.trim() : undefined,
      };

      const serverProfile = await fetchGapTrackProfileOnServer(user.id, fallbackProfile);
      if (!mounted) return;

      syncSupabaseAuthenticatedUser(serverProfile);
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      void syncAuthSessionUser(data.session?.user);
    }).catch(() => {});

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT") {
        clearActiveUserId();
        setActiveUserId("");
        setLocalActorFromUser(null);
        return;
      }

      void syncAuthSessionUser(session?.user);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [syncSupabaseAuthenticatedUser]);

  const createAdminUser = React.useCallback(async (_payload: NewUserPayload) => {
    toast.error(lang === "fr" ? "La création locale est désactivée : utilisez Supabase Auth." : "Local account creation is disabled: use Supabase Auth.");
  }, [lang]);

  const loginUser = React.useCallback(async (_userId: string, _password: string) => {
    toast.error(lang === "fr" ? "La connexion locale est désactivée : utilisez Supabase Auth." : "Local login is disabled: use Supabase Auth.");
    return false;
  }, [lang]);

  const logoutUser = React.useCallback(() => {
    // Une expiration liée à l’inactivité ne doit fermer que la session
    // de ce navigateur, sans déconnecter les autres appareils.
    void supabase.auth.signOut({
      scope: "local",
    });
    clearActiveUserId();
    setActiveUserId("");
    setLocalActorFromUser(null);
  }, []);

  const addUser = React.useCallback(async (payload: NewUserPayload) => {
    if (!canCreateUsersFlag) {
      toast.error(lang === "fr" ? "Création d’utilisateurs réservée aux comptes administrateurs Premium." : "User creation is reserved for Premium administrator accounts.");
      return false;
    }
    const email = normalizeEmail(payload.email);
    if (!payload.name.trim() || !email) {
      toast.error(lang === "fr" ? "Nom et email obligatoires." : "Name and email are required.");
      return false;
    }
    if (users.some((u) => normalizeEmail(u.email) === email)) {
      toast.error(lang === "fr" ? "Cet email existe déjà." : "This email already exists.");
      return false;
    }
    if (isServiceOwnerEmail(email) && !canManageSubscriptionsFlag) {
      toast.error(lang === "fr" ? "Ce compte propriétaire est protégé." : "This service-owner account is protected.");
      return false;
    }
    const passwordError = validatePasswordStrength(payload.password, { email, name: payload.name, organization: payload.organization }, lang);
    if (passwordError) {
      toast.error(passwordError);
      return false;
    }

    const organization = payload.organization?.trim() || undefined;
    const requestedSubscriptionPlan = canManageSubscriptionsFlag ? normalizeSubscriptionPlan(payload.subscriptionPlan) : "free";
    let subscriptionPlan = requestedSubscriptionPlan;
    const localCreatedByUserId = activeUser?.id;
    const createdByEmail = activeUser?.email ? normalizeEmail(activeUser.email) : undefined;
    const managedGroup = activeUser
      ? {
        groupId: payload.groupId || resolveManagedGroupForCreator(activeUser, users, lang).groupId,
        groupName: payload.groupName || resolveManagedGroupForCreator(activeUser, users, lang).groupName,
      }
      : { groupId: payload.groupId, groupName: payload.groupName };

    try {
      const previousSession = await supabase.auth.getSession().then(({ data }) => data.session).catch(() => null);
      const currentAuthUserId = await supabase.auth.getUser()
        .then(({ data }) => data.user?.id)
        .catch(() => undefined);
      const serverCreatedByUserId = currentAuthUserId || localCreatedByUserId;

      const { data, error } = await supabase.auth.signUp({
        email,
        password: payload.password,
        options: {
          data: {
            name: payload.name.trim(),
            organization,
            // These are only hints for server-side onboarding. RLS/RPC must decide the actual role and plan.
            requestedRole: normalizeUserRole(payload.role),
            requestedSubscriptionPlan: subscriptionPlan,
            createdByUserId: serverCreatedByUserId,
            createdByEmail,
            groupId: managedGroup.groupId,
            groupName: managedGroup.groupName,
            // Ancien format conservé pour compatibilité avec les triggers déjà déployés.
            invitedByUserId: serverCreatedByUserId,
            invitedByEmail: createdByEmail,
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (data.session && previousSession?.access_token && previousSession?.refresh_token) {
        await supabase.auth.setSession({
          access_token: previousSession.access_token,
          refresh_token: previousSession.refresh_token,
        });
      } else if (data.session && !previousSession) {
        await supabase.auth.signOut();
        if (activeUser) {
          saveActiveUserId(activeUser.id);
          setActiveUserId(activeUser.id);
          setLocalActorFromUser(activeUser);
        }
      }

      if (error) {
        if (isExistingSupabaseAccountError(error)) {
          toast.error(lang === "fr" ? "Un compte Supabase existe déjà avec cet e-mail." : "A Supabase account already exists with this email.");
          return false;
        }
        toast.error(authErrorMessage(error));
        return false;
      }

      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        toast.error(lang === "fr" ? "Un compte existe déjà avec cet e-mail." : "An account already exists with this email.");
        return false;
      }

      const ownershipPatch: Record<string, string> = {};
      if (serverCreatedByUserId) ownershipPatch.created_by_user_id = serverCreatedByUserId;
      if (createdByEmail) ownershipPatch.created_by_email = createdByEmail;
      if (managedGroup.groupId) ownershipPatch.group_id = managedGroup.groupId;
      if (managedGroup.groupName) ownershipPatch.group_name = managedGroup.groupName;

      if (data.user?.id && Object.keys(ownershipPatch).length > 0) {
        await supabase
          .from("gaptrack_profiles")
          .update(ownershipPatch)
          .eq("id", data.user.id)
          .then(({ error }) => {
            if (error) {
              console.warn("Unable to persist created-by ownership on GapTrack profile.", error);
            }
          });
      }

      if (currentAuthUserId && managedGroup.groupId && managedGroup.groupName) {
        await supabase
          .from("gaptrack_profiles")
          .update({ group_id: managedGroup.groupId, group_name: managedGroup.groupName })
          .eq("id", currentAuthUserId)
          .then(({ error }) => {
            if (error) console.warn("Unable to persist creator group on GapTrack profile.", error);
          });
      }

      if (requestedSubscriptionPlan === "premium") {
        try {
          await updateManagedUserProfileOnServer(email, { subscriptionPlan: "premium" });
        } catch (error) {
          console.error(error);
          subscriptionPlan = "free";
          toast.error(
            lang === "fr"
              ? "Utilisateur créé, mais Premium n’a pas pu être activé côté serveur."
              : "User created, but Premium could not be enabled on the server."
          );
        }
      }
    } catch (error) {
      console.error(error);
      toast.error(lang === "fr" ? "Impossible d’envoyer l’e-mail de vérification Supabase." : "Unable to send the Supabase verification email.");
      return false;
    }

    const user: AppUser = {
      id: uuid(),
      name: payload.name.trim(),
      email,
      role: normalizeUserRole(payload.role),
      organization,
      subscriptionPlan,
      createdByUserId: localCreatedByUserId,
      createdByEmail,
      groupId: managedGroup.groupId,
      groupName: managedGroup.groupName,
      createdAt: new Date().toISOString(),
      active: true,
    };
    const next = [
      user,
      ...users.map((existing) => (
        activeUser && existing.id === activeUser.id && managedGroup.groupId && managedGroup.groupName
          ? { ...existing, groupId: existing.groupId || managedGroup.groupId, groupName: existing.groupName || managedGroup.groupName }
          : existing
      )),
    ];
    saveUsers(next);
    setUsers(next);
    toast.success(lang === "fr" ? "Utilisateur créé. Un e-mail de vérification lui a été envoyé." : "User created. A verification email has been sent.");
    return true;
  }, [activeUser, canCreateUsersFlag, canManageSubscriptionsFlag, lang, users]);

  const updateUser = React.useCallback(async (userId: string, patch: Partial<AppUser>) => {
    if (!canManageUsersFlag) {
      toast.error(lang === "fr" ? "Action réservée aux administrateurs." : "Administrators only.");
      return;
    }

    const target = users.find((u) => u.id === userId);
    if (!target) return;

    if (isServiceOwnerEmail(target.email) && patch.subscriptionPlan) {
      toast.error(lang === "fr" ? "L’offre du compte propriétaire est verrouillée." : "The owner account plan is locked.");
      return;
    }

    if (isServiceOwnerEmail(target.email) && (patch.role || patch.active === false)) {
      toast.error(lang === "fr" ? "Le compte propriétaire est protégé." : "The owner account is protected.");
      return;
    }

    if (!userCanModifyUserRecord(activeUser, target)) {
      toast.error(lang === "fr" ? "Vous pouvez modifier uniquement les utilisateurs que vous avez créés." : "You can only edit users you created.");
      return;
    }

    if (isServiceOwnerEmail(target.email) && !canManageSubscriptionsFlag) {
      toast.error(lang === "fr" ? "Ce compte propriétaire est protégé." : "This service-owner account is protected.");
      return;
    }

    if (patch.subscriptionPlan && !canManageSubscriptionsFlag) {
      toast.error(lang === "fr" ? "Seul le propriétaire du service peut activer Premium." : "Only the service owner can activate Premium.");
      return;
    }

    const activeAdmins = users.filter((u) => u.active !== false && u.role === "admin");
    if (!canManageSubscriptionsFlag && target.role === "admin" && activeAdmins.length <= 1 && (patch.role || patch.active === false)) {
      toast.error(lang === "fr" ? "Impossible de retirer le dernier administrateur actif." : "Cannot remove the last active administrator.");
      return;
    }

    if (patch.subscriptionPlan) {
      const nextPlan = normalizeSubscriptionPlan(patch.subscriptionPlan);

      try {
        if (canManageSubscriptionsFlag) {
          await updateManagedUserProfileOnServer(target.email, { subscriptionPlan: nextPlan });
        } else {
          await updateSubscriptionPlanOnServer(target.email, nextPlan);
        }
      } catch (error) {
        console.error(error);
        toast.error(
          lang === "fr"
            ? "Impossible de mettre à jour l’offre dans Supabase."
            : "Unable to update the plan in Supabase."
        );
        return;
      }

      setUsers((prev) => {
        const next = prev.map((u) => u.id === userId ? {
          ...u,
          ...patch,
          role: patch.role ? normalizeUserRole(patch.role) : u.role,
          subscriptionPlan: nextPlan,
        } : u);
        saveUsers(next);
        return next;
      });

      toast.success(lang === "fr" ? "Offre mise à jour côté serveur." : "Plan updated on server.");
      return;
    }

    if (canManageSubscriptionsFlag && (patch.role || typeof patch.active === "boolean")) {
      try {
        await updateManagedUserProfileOnServer(target.email, {
          role: patch.role ? normalizeUserRole(patch.role) : undefined,
          active: typeof patch.active === "boolean" ? patch.active : undefined,
        });
      } catch (error) {
        console.error(error);
        toast.error(
          lang === "fr"
            ? "Impossible de mettre à jour ce compte côté Supabase."
            : "Unable to update this account in Supabase."
        );
        return;
      }
    }

    setUsers((prev) => {
      const next = prev.map((u) => u.id === userId ? {
        ...u,
        ...patch,
        role: patch.role ? normalizeUserRole(patch.role) : u.role,
        subscriptionPlan: normalizeSubscriptionPlan(u.subscriptionPlan),
      } : u);
      saveUsers(next);
      return next;
    });
  }, [activeUser, canManageSubscriptionsFlag, canManageUsersFlag, lang, users]);

  const setSubscriptionByEmail = React.useCallback(async (rawEmail: string, plan: SubscriptionPlan) => {
    if (!canManageSubscriptionsFlag) {
      toast.error(lang === "fr" ? "Seul le propriétaire du service peut modifier les offres." : "Only the service owner can change plans.");
      return;
    }

    const email = normalizeEmail(rawEmail);
    if (!email) {
      toast.error(lang === "fr" ? "Adresse e-mail obligatoire." : "Email is required.");
      return;
    }

    if (isServiceOwnerEmail(email)) {
      toast.error(lang === "fr" ? "L’offre du compte propriétaire est verrouillée." : "The owner account plan is locked.");
      return;
    }

    const nextPlan = normalizeSubscriptionPlan(plan);

    try {
      await updateManagedUserProfileOnServer(email, { subscriptionPlan: nextPlan });
    } catch (error) {
      console.error(error);
      toast.error(
        lang === "fr"
          ? "Impossible de mettre à jour l’offre dans Supabase."
          : "Unable to update the plan in Supabase."
      );
      return;
    }

    setUsers((prev) => {
      const next = prev.map((u) => normalizeEmail(u.email) === email ? { ...u, subscriptionPlan: nextPlan } : u);
      saveUsers(next);
      return next;
    });

    toast.success(lang === "fr" ? `Offre ${subscriptionPlanLabel(nextPlan)} appliquée pour ${email}.` : `${subscriptionPlanLabel(nextPlan)} applied for ${email}.`);
  }, [canManageSubscriptionsFlag, lang]);

  const activatePremiumByEmail = React.useCallback(async (rawEmail: string) => {
    if (!canManageSubscriptionsFlag) {
      toast.error(lang === "fr" ? "Seul le propriétaire du service peut activer Premium." : "Only the service owner can activate Premium.");
      return;
    }

    const email = normalizeEmail(rawEmail);
    if (!email) {
      toast.error(lang === "fr" ? "Adresse e-mail obligatoire." : "Email is required.");
      return;
    }

    if (isServiceOwnerEmail(email)) {
      toast.error(lang === "fr" ? "L’offre du compte propriétaire est verrouillée." : "The owner account plan is locked.");
      return;
    }

    try {
      await updateManagedUserProfileOnServer(email, { subscriptionPlan: "premium" });
    } catch (error) {
      console.error(error);
      toast.error(
        lang === "fr"
          ? "Impossible d’activer Premium dans Supabase."
          : "Unable to activate Premium in Supabase."
      );
      return;
    }

    setUsers((prev) => {
      const next = prev.map((u) => normalizeEmail(u.email) === email ? { ...u, subscriptionPlan: "premium" as SubscriptionPlan } : u);
      saveUsers(next);
      return next;
    });

    toast.success(lang === "fr" ? `Premium activé pour ${email}.` : `Premium activated for ${email}.`);
  }, [canManageSubscriptionsFlag, lang]);

  const deleteUser = React.useCallback(async (userId: string) => {
    if (!canManageUsersFlag) {
      toast.error(lang === "fr" ? "Action réservée aux administrateurs." : "Administrators only.");
      return;
    }

    const target = users.find((u) => u.id === userId);

    if (!target) {
      toast.error(lang === "fr" ? "Compte introuvable." : "Account not found.");
      return;
    }

    if (userId === activeUserId || activeUser?.id === userId) {
      toast.error(lang === "fr" ? "Vous ne pouvez pas supprimer votre propre compte connecté." : "You cannot delete your own signed-in account.");
      return;
    }

    const activeAdmins = users.filter((u) => u.active !== false && u.role === "admin" && !isServiceOwnerEmail(u.email));

    if (!userCanModifyUserRecord(activeUser, target)) {
      toast.error(lang === "fr" ? "Vous pouvez supprimer uniquement les utilisateurs que vous avez créés ou ceux de votre groupe." : "You can only delete users you created or users from your group.");
      return;
    }

    if (isServiceOwnerEmail(target.email)) {
      toast.error(lang === "fr" ? "Ce compte propriétaire est protégé." : "This service-owner account is protected.");
      return;
    }

    if (target.role === "admin" && activeAdmins.length <= 1) {
      toast.error(lang === "fr" ? "Impossible de supprimer le dernier administrateur actif." : "Cannot delete the last active administrator.");
      return;
    }

    const targetLabel = `${target.name || target.email} (${target.email})`;
    const firstConfirmation = window.confirm(
      lang === "fr"
        ? `Êtes-vous sûr de vouloir supprimer le compte ${targetLabel} ?\n\nCette action le retirera de l’administration GapTrack et sera enregistrée côté Supabase.`
        : `Are you sure you want to delete the account ${targetLabel}?\n\nThis will remove it from GapTrack administration and persist the change in Supabase.`
    );

    if (!firstConfirmation) {
      toast.info(lang === "fr" ? "Suppression annulée." : "Deletion cancelled.");
      return;
    }

    const typedEmail = normalizeEmail(
      window.prompt(
        lang === "fr"
          ? `Dernière confirmation : retapez l’e-mail du compte à supprimer (${target.email}).`
          : `Final confirmation: retype the email of the account to delete (${target.email}).`
      ) || ""
    );

    if (typedEmail !== normalizeEmail(target.email)) {
      toast.error(lang === "fr" ? "E-mail incorrect. Suppression annulée." : "Incorrect email. Deletion cancelled.");
      return;
    }

    try {
      await deleteManagedUserProfileOnServer(target);

      setUsers((prev) => {
        const next = prev.filter((u) => u.id !== userId && normalizeEmail(u.email) !== normalizeEmail(target.email));
        saveUsers(next);
        return next;
      });

      toast.success(lang === "fr" ? "Compte supprimé." : "Account deleted.");
    } catch (error) {
      console.error("Unable to delete managed user account.", error);
      const message = error instanceof Error ? error.message : "";
      toast.error(
        lang === "fr"
          ? `Impossible de supprimer le compte côté serveur${message ? ` : ${message}` : "."}`
          : `Unable to delete the account server-side${message ? `: ${message}` : "."}`
      );
    }
  }, [activeUser, activeUserId, canManageUsersFlag, lang, users]);

  const resetUserPassword = React.useCallback(async (userId: string, _password: string) => {
    if (!canManageUsersFlag) {
      toast.error(lang === "fr" ? "Action réservée aux administrateurs." : "Administrators only.");
      return;
    }
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    if (!userCanModifyUserRecord(activeUser, target)) {
      toast.error(lang === "fr" ? "Vous pouvez réinitialiser uniquement les utilisateurs que vous avez créés." : "You can only reset users you created.");
      return;
    }
    if (isServiceOwnerEmail(target.email) && !canManageSubscriptionsFlag) {
      toast.error(lang === "fr" ? "Ce compte propriétaire est protégé." : "This service-owner account is protected.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(target.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error(authErrorMessage(error));
      return;
    }

    toast.success(lang === "fr" ? "E-mail de réinitialisation envoyé." : "Password reset email sent.");
  }, [activeUser, canManageSubscriptionsFlag, canManageUsersFlag, lang, users]);

  const updateSessionProfile = React.useCallback(async (sessionId: string, patch: Partial<Session>): Promise<boolean> => {
    if (!requireAuditManager()) return false;
    const current = sessions.find((session) => session.id === sessionId);
    if (!current) return false;
    const updated: Session = { ...current, ...patch, bootstrap: false };

    try {
      await updateAuditSessionMetadataOnBackend(updated);
      setSessions((prev) => prev.map((session) => session.id === sessionId ? updated : session));
      appendAuditLog({
        action: "audit_updated",
        entityType: "audit",
        entityId: sessionId,
        message: lang === "fr" ? "Fiche d’audit mise à jour." : "Audit profile updated.",
        details: Object.keys(patch).join(", "),
      });
      toast.success(lang === "fr" ? "Fiche d’audit mise à jour" : "Audit profile updated");
      return true;
    } catch (error) {
      console.error("Unable to update audit profile.", error);
      toast.error(lang === "fr" ? "La fiche n’a pas été enregistrée sur le serveur." : "The profile was not saved on the server.");
      return false;
    }
  }, [lang, requireAuditManager, appendAuditLog, sessions]);

  
  
  const renameSession = React.useCallback(async (sessionId: string, newName: string) => {
      if (!requireAuditManager()) return;
	  const name = newName.trim();
	  if (!name) {
		toast.error(lang === "fr" ? "Nom invalide" : "Invalid name");
		return;
	  }

      const current = sessions.find((session) => session.id === sessionId);
      if (!current) return;
      const updated: Session = { ...current, name, bootstrap: false };

      try {
        await updateAuditSessionMetadataOnBackend(updated);
        setSessions((prev) => prev.map((session) => session.id === sessionId ? updated : session));
        appendAuditLog({
          action: "audit_updated",
          entityType: "audit",
          entityId: sessionId,
          message: lang === "fr" ? "Audit renommé." : "Audit renamed.",
          before: current.name,
          after: name,
        });
      } catch (error) {
        console.error("Unable to rename audit.", error);
        toast.error(lang === "fr" ? "Le nouvel intitulé n’a pas été enregistré." : "The new name was not saved.");
      }
  }, [lang, requireAuditManager, appendAuditLog, sessions]);

  
  

  // Current dataset (rows) and evidences for active session
  const [rows, setRows] = useState<ControlItem[]>([]);
  const [evidenceMap, setEvidenceMap] = useState<Record<string, EvidenceItem[]>>({});
  const [proofStatusMap, setProofStatusMap] = useState<EvidenceStatusMap>({});
  
  // Plan d’action (persisté par session dans le navigateur)
  const [plans, setPlans] = useState<Record<string, PlanAction>>({});

    // Autosave "pro" (debounce + indicateur)
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [isAuditMutating, setIsAuditMutating] = useState(false);
  const [isEvidenceBusy, setIsEvidenceBusy] = useState(false);
  const [auditLoadError, setAuditLoadError] = useState<string | null>(null);
  const [auditReloadKey, setAuditReloadKey] = useState(0);
  const [backendInitReloadKey, setBackendInitReloadKey] = useState(0);
  const saveTimerRef = useRef<number | null>(null);
  const saveSeqRef = useRef(0);
  const skipNextAutosaveSessionRef = useRef<string | null>(null);
  const activeSessionIdRef = useRef(activeSessionId);
  const langRef = useRef(lang);
  const snapshotCacheRef = useRef<Map<string, SnapshotPayload>>(new Map());
  const saveQueueRef = useRef<Map<string, Promise<void>>>(new Map());

  const rowsRef = useRef<ControlItem[]>([]);
  const evidenceMapRef = useRef<Record<string, EvidenceItem[]>>({});
  const proofStatusMapRef = useRef<EvidenceStatusMap>({});
  const plansRef = useRef<Record<string, PlanAction>>({});
  const undoStack = useRef<AuditSnapshot[]>([]);
  const redoStack = useRef<AuditSnapshot[]>([]);

  useEffect(() => { activeSessionIdRef.current = activeSessionId; }, [activeSessionId]);
  useEffect(() => { langRef.current = lang; }, [lang]);

  useEffect(() => {
    if (!currentSession || isAuditLoading || auditLoadError) return;
    if (autoOpenedWizardForSessionRef.current === currentSession.id) return;

    const auditIsReady = Boolean(
      currentSession.organization?.trim() &&
      currentSession.auditDate &&
      currentSession.auditor?.trim() &&
      normalizeSessionFrameworkId(currentSession.frameworkId) &&
      currentSession.scope?.trim() &&
      currentSession.objectives?.trim() &&
      rows.length > 0
    );

    if (!auditIsReady) {
      autoOpenedWizardForSessionRef.current = currentSession.id;
      setWizardOpen(true);
    }
  }, [auditLoadError, currentSession, isAuditLoading, rows.length]);

  const cloneForHistory = React.useCallback(<T,>(value: T): T => {
    return JSON.parse(JSON.stringify(value ?? null));
  }, []);

  const currentSnapshot = React.useCallback((): AuditSnapshot => ({
    rows: cloneForHistory(rowsRef.current),
    evidenceMap: cloneForHistory(evidenceMapRef.current),
    proofStatusMap: cloneForHistory(proofStatusMapRef.current),
    plans: cloneForHistory(plansRef.current),
  }), [cloneForHistory]);

  const applySnapshot = React.useCallback((snapshot: AuditSnapshot) => {
    const nextRows = cloneForHistory(snapshot.rows || []);
    const nextEvidenceMap = cloneForHistory(snapshot.evidenceMap || {});
    const nextProofStatusMap = cloneForHistory(snapshot.proofStatusMap || {});
    const nextPlans = cloneForHistory(snapshot.plans || {});

    rowsRef.current = nextRows;
    evidenceMapRef.current = nextEvidenceMap;
    proofStatusMapRef.current = nextProofStatusMap;
    plansRef.current = nextPlans;

    setRows(nextRows);
    setEvidenceMap(nextEvidenceMap);
    setProofStatusMap(nextProofStatusMap);
    setPlans(nextPlans);
  }, [cloneForHistory]);

  const rememberSnapshot = React.useCallback(() => {
    undoStack.current.push(currentSnapshot());
    if (undoStack.current.length > 100) undoStack.current.shift();
    redoStack.current = [];
  }, [currentSnapshot]);

  const resetHistory = React.useCallback(() => {
    undoStack.current = [];
    redoStack.current = [];
  }, []);

  const undoAuditChange = React.useCallback(() => {
    if (isAuditLoading || isAuditMutating || auditLoadError) return;
    const previous = undoStack.current.pop();
    if (!previous) return;
    redoStack.current.push(currentSnapshot());
    applySnapshot(previous);
  }, [applySnapshot, auditLoadError, currentSnapshot, isAuditLoading, isAuditMutating]);

  const redoAuditChange = React.useCallback(() => {
    if (isAuditLoading || isAuditMutating || auditLoadError) return;
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(currentSnapshot());
    applySnapshot(next);
  }, [applySnapshot, auditLoadError, currentSnapshot, isAuditLoading, isAuditMutating]);

  useEffect(() => { rowsRef.current = rows; }, [rows]);
  useEffect(() => { evidenceMapRef.current = evidenceMap; }, [evidenceMap]);
  useEffect(() => { proofStatusMapRef.current = proofStatusMap; }, [proofStatusMap]);
  useEffect(() => { plansRef.current = plans; }, [plans]);
  useEffect(() => { auditLogRef.current = auditLog; }, [auditLog]);

  const persistentSnapshot = React.useCallback((): SnapshotPayload => normalizeSnapshotPayload({
    rows: cloneForHistory(rowsRef.current),
    evidenceMap: cloneForHistory(evidenceMapRef.current),
    plans: cloneForHistory(plansRef.current),
    proofStatusMap: cloneForHistory(proofStatusMapRef.current),
    auditLog: cloneForHistory(auditLogRef.current),
  }), [cloneForHistory]);

  const applyPersistedSnapshot = React.useCallback((snapshot: SnapshotPayload) => {
    const normalized = normalizeSnapshotPayload(snapshot);
    applySnapshot({
      rows: normalized.rows,
      evidenceMap: normalized.evidenceMap,
      proofStatusMap: normalized.proofStatusMap || {},
      plans: normalized.plans,
    });
    const nextLog = normalized.auditLog || [];
    auditLogRef.current = nextLog;
    setAuditLog(nextLog);
    resetHistory();
  }, [applySnapshot, resetHistory]);

  const fetchPersistedSnapshot = React.useCallback(async (sessionId: string): Promise<SnapshotPayload | null> => {
    const cached = snapshotCacheRef.current.get(sessionId);
    if (cached) return normalizeSnapshotPayload(cached);

    const remote = await apiGetSnapshot(sessionId);
    if (!remote) return null;
    const normalized = normalizeSnapshotPayload(remote);
    normalized.evidenceMap = await mergeEvidenceMapWithBackend(sessionId, normalized.evidenceMap);
    snapshotCacheRef.current.set(sessionId, normalized);
    return normalizeSnapshotPayload(normalized);
  }, []);

  const pushToBackend = React.useCallback(async (sessionId: string, payload: SnapshotPayload) => {
    const normalized = normalizeSnapshotPayload(payload);
    const previous = saveQueueRef.current.get(sessionId) || Promise.resolve();
    const queued = previous
      .catch(() => undefined)
      .then(async () => {
        await apiPutSnapshot(sessionId, normalized);
        snapshotCacheRef.current.set(sessionId, normalizeSnapshotPayload(normalized));
      });
    saveQueueRef.current.set(sessionId, queued);

    try {
      await queued;
    } finally {
      if (saveQueueRef.current.get(sessionId) === queued) saveQueueRef.current.delete(sessionId);
    }
  }, []);

  const waitForPendingSave = React.useCallback(async (sessionId: string) => {
    const pending = saveQueueRef.current.get(sessionId);
    if (pending) await pending;
  }, []);

  const cancelScheduledAutosave = React.useCallback(() => {
    saveSeqRef.current += 1;
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }, []);

  const flushActiveAudit = React.useCallback(async () => {
    const sessionId = activeSessionIdRef.current;
    if (!sessionId || auditLoadError) return;
    cancelScheduledAutosave();
    await waitForPendingSave(sessionId);
    setSaveState("syncing");
    await pushToBackend(sessionId, persistentSnapshot());
    if (activeSessionIdRef.current === sessionId) {
      setLastSavedAt(Date.now());
      setSaveState("saved");
    }
  }, [auditLoadError, cancelScheduledAutosave, persistentSnapshot, pushToBackend, waitForPendingSave]);

  const logoutAfterSaving = React.useCallback(async () => {
    if (isAuditLoading || isAuditMutating || isEvidenceBusy) {
      toast.info(lang === "fr" ? "Une opération d’audit est en cours." : "An audit operation is still running.");
      return;
    }
    setIsAuditMutating(true);
    try {
      await flushActiveAudit();
      logoutUser();
      navigate("home", true);
    } catch (error) {
      console.error("Unable to save audit before logout.", error);
      setSaveState("sync_error");
      toast.error(lang === "fr" ? "Déconnexion annulée : l’audit n’a pas pu être sauvegardé." : "Sign-out cancelled: the audit could not be saved.");
    } finally {
      setIsAuditMutating(false);
    }
  }, [flushActiveAudit, isAuditLoading, isAuditMutating, isEvidenceBusy, lang, logoutUser, navigate]);

  useInactivityLogout({
    enabled: Boolean(activeUser),
    timeoutMs: 30 * 60 * 1_000,
    warningMs: 2 * 60 * 1_000,
    lang,
    onTimeout: logoutAfterSaving,
  });





  const patchPlanForRow = React.useCallback((rowId: string, patch: Partial<PlanAction>) => {
	  if (!activeSessionId || !requireAuditEditor()) return;
	  rememberSnapshot();
	  const prev = plansRef.current;
      const before = prev[rowId] || {};
	  const next = {
		...prev,
		[rowId]: { ...(prev[rowId] || {}), ...patch },
	  };
	  plansRef.current = next;
	  setPlans(next);
      const row = rowsRef.current.find((r) => r.id === rowId);
      appendAuditLog({
        action: "plan_updated",
        entityType: "plan",
        entityId: rowId,
        controlId: rowId,
        controlRef: row?.ref,
        controlDomain: row?.domain,
        message: lang === "fr" ? `Plan d’action mis à jour${row ? ` pour le contrôle ${row.ref}` : ""}.` : `Action plan updated${row ? ` for control ${row.ref}` : ""}.`,
        before: hasAnyPlanFields(before) ? (lang === "fr" ? "Plan existant" : "Existing plan") : (lang === "fr" ? "Aucun plan" : "No plan"),
        after: hasAnyPlanFields(next[rowId]) ? (lang === "fr" ? "Plan renseigné" : "Plan filled") : (lang === "fr" ? "Aucun plan" : "No plan"),
        details: Object.keys(patch).join(", "),
      });
  }, [activeSessionId, rememberSnapshot, requireAuditEditor, appendAuditLog, lang]);

  const proofStatusForRow = React.useCallback(
    (rowId: string) => effectiveEvidenceStatus(rowId, evidenceMap, proofStatusMap),
    [evidenceMap, proofStatusMap]
  );

  const setProofStatusForRow = React.useCallback((rowId: string, status: EvidenceStatus) => {
    if (!requireAuditEditor()) return;
    if (["to_validate", "validated", "refused"].includes(status) && !requirePremiumFeature(lang === "fr" ? "Le workflow de validation des preuves" : "Evidence validation workflow")) return;
    if ((status === "validated" || status === "refused") && !requireEvidenceReviewer()) return;
    rememberSnapshot();
    const count = evidenceMapRef.current[rowId]?.length || 0;
    const beforeStatus = effectiveEvidenceStatus(rowId, evidenceMapRef.current, proofStatusMapRef.current);
    const coerced = coerceEvidenceStatusForCount(status, count);
    const next = {
      ...proofStatusMapRef.current,
      [rowId]: coerced,
    };
    proofStatusMapRef.current = next;
    setProofStatusMap(next);
    if (beforeStatus !== coerced) {
      const row = rowsRef.current.find((r) => r.id === rowId);
      appendAuditLog({
        action: coerced === "validated" ? "evidence_validated" : coerced === "refused" ? "evidence_refused" : coerced === "to_validate" ? "evidence_submitted" : "evidence_status_changed",
        entityType: "evidence",
        entityId: rowId,
        controlId: rowId,
        controlRef: row?.ref,
        controlDomain: row?.domain,
        message: lang === "fr" ? `Statut de preuve modifié${row ? ` pour le contrôle ${row.ref}` : ""}.` : `Evidence status changed${row ? ` for control ${row.ref}` : ""}.`,
        before: evidenceStatusLabel(beforeStatus, lang),
        after: evidenceStatusLabel(coerced, lang),
      });
    }
  }, [rememberSnapshot, requireAuditEditor, requireEvidenceReviewer, requirePremiumFeature, appendAuditLog, lang]);

  const commitEvidenceChange = React.useCallback((nextEvidenceMap: Record<string, EvidenceItem[]>, nextProofStatusMap?: EvidenceStatusMap) => {
    if (!requireAuditEditor()) return;
    rememberSnapshot();
    const evidenceNext = cloneForHistory(nextEvidenceMap || {});
    const proofNext = cloneForHistory(nextProofStatusMap || proofStatusMapRef.current || {});
    evidenceMapRef.current = evidenceNext;
    proofStatusMapRef.current = proofNext;
    setEvidenceMap(evidenceNext);
    setProofStatusMap(proofNext);
  }, [cloneForHistory, rememberSnapshot, requireAuditEditor]);

  useEffect(() => {
    setProofStatusMap((prev) => {
      let changed = false;
      const next: EvidenceStatusMap = { ...prev };

      for (const [rowId, status] of Object.entries(prev) as Array<[string, EvidenceStatus]>) {
        const count = evidenceMap[rowId]?.length || 0;
        const coerced = coerceEvidenceStatusForCount(status, count);
        if (coerced !== status) {
          next[rowId] = coerced;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [evidenceMap, proofStatusMap]);



  // Initialize the user's audits from Supabase. The first placeholder and its
  // snapshot are inserted together so the UI never exposes a half-created audit.
  useEffect(() => {
    let cancelled = false;

    async function initBackendSessions() {
      if (!activeUser) {
        cancelScheduledAutosave();
        snapshotCacheRef.current.clear();
        saveQueueRef.current.clear();
        setSessions([]);
        setActiveSessionId("");
        activeSessionIdRef.current = "";
        setAuditLoadError(null);
        setIsAuditLoading(false);
        return;
      }

      cancelScheduledAutosave();
      snapshotCacheRef.current.clear();
      saveQueueRef.current.clear();
      setSessions([]);
      setActiveSessionId("");
      activeSessionIdRef.current = "";
      setIsAuditLoading(true);
      setAuditLoadError(null);
      try {
        const remoteSessions = await loadSessionsFromBackend();
        if (cancelled) return;

        if (remoteSessions.length > 0) {
          setSessions(remoteSessions);
          setActiveSessionId(remoteSessions[0].id);
          return;
        }

        const first: Session = {
          id: uuid(),
          name: "Audit 1",
          createdAt: new Date().toISOString(),
          auditDate: defaultAuditDate(),
          auditType: "initial",
          criticality: "medium",
          bootstrap: true,
        };
        const initialSnapshot = normalizeSnapshotPayload({
          rows: await loadDefaultAuditRows().catch(() => seedRowsFrom([])),
          evidenceMap: {},
          proofStatusMap: {},
          plans: {},
          auditLog: [],
        });

        await createAuditSessionOnBackend(first, initialSnapshot);
        if (cancelled) return;

        snapshotCacheRef.current.set(first.id, initialSnapshot);
        setSessions([first]);
        setActiveSessionId(first.id);
      } catch (error) {
        console.error("Unable to initialize Supabase audit sessions.", error);
        if (!cancelled) {
          setSaveState("sync_error");
          setAuditLoadError(langRef.current === "fr" ? "Impossible de charger les audits depuis Supabase." : "Unable to load audits from Supabase.");
        }
      } finally {
        if (!cancelled && !activeSessionIdRef.current) setIsAuditLoading(false);
      }
    }

    void initBackendSessions();

    return () => {
      cancelled = true;
    };
  }, [activeUser?.id, backendInitReloadKey, cancelScheduledAutosave]);

  // Loading is deliberately blocking: stale rows from the previous audit are
  // never editable while the target snapshot is being fetched.
  useEffect(() => {
    if (!activeSessionId) return;
    const sessionId = activeSessionId;
    activeSessionIdRef.current = sessionId;
    let cancelled = false;

    setIsAuditLoading(true);
    setAuditLoadError(null);
    skipNextAutosaveSessionRef.current = sessionId;

    void (async () => {
      try {
        let snapshot = await fetchPersistedSnapshot(sessionId);
        if (!snapshot) {
          snapshot = normalizeSnapshotPayload({
            rows: await loadDefaultAuditRows().catch(() => seedRowsFrom([])),
            evidenceMap: await mergeEvidenceMapWithBackend(sessionId, {}),
            proofStatusMap: {},
            plans: {},
            auditLog: [],
          });
          await apiPutSnapshot(sessionId, snapshot);
          snapshotCacheRef.current.set(sessionId, snapshot);
        }

        if (cancelled || activeSessionIdRef.current !== sessionId) return;
        applyPersistedSnapshot(snapshot);
        setSaveState("saved");
      } catch (error) {
        console.error("Unable to load audit snapshot.", error);
        if (cancelled || activeSessionIdRef.current !== sessionId) return;
        setAuditLoadError(langRef.current === "fr" ? "Impossible de charger cet audit. Aucune modification n’est autorisée tant qu’il n’est pas rechargé." : "Unable to load this audit. Editing is blocked until it is reloaded.");
        setSaveState("sync_error");
      } finally {
        if (!cancelled && activeSessionIdRef.current === sessionId) setIsAuditLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [activeSessionId, auditReloadKey, applyPersistedSnapshot, fetchPersistedSnapshot]);

  // Debounced autosave. Every write is captured for one immutable session id
  // and serialized with the previous write for that same audit.
  useEffect(() => {
    if (!activeSessionId || isAuditLoading || isAuditMutating || auditLoadError) return;

    if (skipNextAutosaveSessionRef.current === activeSessionId) {
      skipNextAutosaveSessionRef.current = null;
      return;
    }

    const sessionId = activeSessionId;
    const payload = normalizeSnapshotPayload({ rows, evidenceMap, plans, proofStatusMap, auditLog });
    const saveSeq = ++saveSeqRef.current;
    setSaveState("saving");

    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }

    const timerId = window.setTimeout(async () => {
      if (saveTimerRef.current === timerId) saveTimerRef.current = null;
      try {
        if (activeSessionIdRef.current === sessionId) setSaveState("syncing");
        await pushToBackend(sessionId, payload);

        if (saveSeqRef.current === saveSeq && activeSessionIdRef.current === sessionId) {
          setLastSavedAt(Date.now());
          setSaveState("saved");
        }
      } catch (e) {
        console.error("Backend sync error:", e);

        if (saveSeqRef.current === saveSeq && activeSessionIdRef.current === sessionId) {
          setSaveState("sync_error");
        }
      }
    }, 650);
    saveTimerRef.current = timerId;

    return () => {
      if (saveTimerRef.current === timerId) {
        window.clearTimeout(timerId);
        saveTimerRef.current = null;
      }
    };
  }, [activeSessionId, auditLoadError, auditLog, evidenceMap, isAuditLoading, isAuditMutating, plans, proofStatusMap, pushToBackend, rows]);

  useEffect(() => {
    const shouldGuard = saveState === "saving" || saveState === "syncing" || isAuditMutating;
    if (!shouldGuard) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [isAuditMutating, saveState]);

  const retryBackendSync = React.useCallback(async () => {
    if (!activeSessionId) {
      setAuditLoadError(null);
      setBackendInitReloadKey((value) => value + 1);
      return;
    }

    if (auditLoadError) {
      snapshotCacheRef.current.delete(activeSessionId);
      setAuditReloadKey((value) => value + 1);
      return;
    }

    setSaveState("syncing");
    try {
      await pushToBackend(activeSessionId, persistentSnapshot());
      setLastSavedAt(Date.now());
      setSaveState("saved");
      toast.success(lang === "fr" ? "Synchronisation réussie." : "Sync completed.");
    } catch (e) {
      console.error("Manual backend sync error:", e);
      setSaveState("sync_error");
      toast.error(lang === "fr" ? "Synchronisation serveur indisponible." : "Server sync unavailable.");
    }
  }, [activeSessionId, auditLoadError, lang, persistentSnapshot, pushToBackend]);



  // Theme & language persistence
  useEffect(() => {
    const s = loadSettings();
    saveSettings({ ...s, lang, theme });
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark"); else root.classList.remove("dark");
    (root as HTMLElement).style.colorScheme = theme;
  }, [lang, theme]);

  // Undo/redo global shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cmd = e.ctrlKey || e.metaKey;
      if (cmd && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undoAuditChange();
      }
      if (cmd && e.key.toLowerCase() === "z" && e.shiftKey) {
        e.preventDefault();
        redoAuditChange();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undoAuditChange, redoAuditChange]);

  // Command palette (Ctrl/Cmd+K)
  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { const cmd = e.ctrlKey || e.metaKey; if (cmd && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(v => !v); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Self-tests (non-blocking)
  function runSelfTests() {
    try {
      console.assert(maturityLabel(10, "fr") === "Niveau critique", "maturityLabel FR basic");
      console.assert(maturityLabel(90, "fr") === "Niveau optimisé", "maturityLabel FR upper");
      const sample: ControlItem[] = [
        { id: "a", ref: "1.1", domain: "D1", impact: 3, description: "", realized: 1 },
        { id: "b", ref: "1.2", domain: "D1", impact: 1, description: "", realized: 0 },
      ];
      const pts = sample.reduce((s, r) => s + r.impact * controlStatusScore(r.realized), 0);
      console.assert(pts === 3, "aggregation test");
      console.assert(significationText(10, 'en').toLowerCase().includes('no structured'), 'signification EN');
      console.assert(significationText(85, "fr").toLowerCase().includes("optimis"), "signification FR");
      const seeded = seedRowsFrom(sample);
      console.assert(seeded.every(r=>r.realized===-2), 'seed resets to non evaluated');
      const untouchedMetrics = calculateAssessmentMetrics(seeded);
      console.assert(untouchedMetrics.evaluationPercent === 0 && untouchedMetrics.maturityMax === 0, "non-evaluated controls are excluded from maturity");
      const partialCoverageMetrics = calculateAssessmentMetrics([
        { ...sample[0], realized: 1 },
        { ...sample[1], realized: -2 },
      ]);
      console.assert(partialCoverageMetrics.evaluationPercent === 50 && partialCoverageMetrics.maturityPercent === 100, "coverage and assessed maturity stay separate");
      const balancedMetrics = calculateAssessmentMetrics([
        { ...sample[0], impact: 2, realized: 1 },
        { ...sample[1], impact: 2, realized: 0 },
      ]);
      console.assert(balancedMetrics.maturityPercent === 50, "weighted assessed maturity");
    } catch (e) {
      console.warn("Self-tests failed", e);
    }
  }
  runSelfTests();

  

  // History-aware setters. L’historique couvre maintenant l’état complet de l’audit :
  // contrôles, preuves, statuts de preuve et plans d’action.
  const setRowsWithHistory = React.useCallback((next: ControlItem[] | ((prev: ControlItem[]) => ControlItem[])) => {
    if (!requireAuditEditor()) return;
    rememberSnapshot();
    const previous = rowsRef.current;
    const actual: ControlItem[] = typeof next === "function" ? (next as (prev: ControlItem[]) => ControlItem[])(previous) : next;
    const prevById = new Map<string, ControlItem>(previous.map((r): [string, ControlItem] => [r.id, r]));
    rowsRef.current = actual;
    setRows(actual);
    actual.forEach((row: ControlItem) => {
      const prev = prevById.get(row.id);
      if (prev && prev.realized !== row.realized) {
        appendAuditLog({
          action: "control_status_changed",
          entityType: "control",
          entityId: row.id,
          controlId: row.id,
          controlRef: row.ref,
          controlDomain: row.domain,
          message: lang === "fr" ? `Statut du contrôle ${row.ref} modifié.` : `Control ${row.ref} status changed.`,
          before: controlStatusLabel(prev.realized, lang),
          after: controlStatusLabel(row.realized, lang),
        });
      }
    });
  }, [rememberSnapshot, requireAuditEditor, appendAuditLog, lang]);



  const handleImportTemplate = React.useCallback(async (frameworkId: FrameworkId, file: File) => {
    if (!requireAuditManager()) throw new Error(lang === "fr" ? "Droits insuffisants" : "Insufficient rights");
    if (!requirePremiumFeature(lang === "fr" ? "L’import de modèles personnalisés" : "Custom template import")) {
      throw new Error(lang === "fr" ? "Import réservé à Premium" : "Premium required for import");
    }
    const tpl = await importTemplateFile(frameworkId, file);
    setCustomTemplates((prev) => {
      const next = [tpl, ...prev.filter(p => p.id !== tpl.id)];
      return next;
    });
    try{
      const last = loadLastTemplateByFramework();
      last[frameworkId] = tpl.id;
      saveLastTemplateByFramework(last);
    }catch{}
    return tpl;
  }, [requireAuditManager, requirePremiumFeature, lang]);

  const allowCreateAuditForPlan = React.useCallback(() => {
    const hasOnlyBootstrap = sessions.length === 1 && isBootstrapAuditSession(sessions[0]);
    if (normalizeSubscriptionPlan(activeUser?.subscriptionPlan) === "premium" || sessions.length === 0 || hasOnlyBootstrap) {
      return true;
    }

    toast.error(
      lang === "fr"
        ? "Offre Free : 1 audit actif pour tester GapTrack. Premium débloque les audits illimités et la collaboration."
        : "Free plan: 1 active audit to try GapTrack. Premium unlocks unlimited audits and collaboration.",
      {
        action: {
          label: lang === "fr" ? "Demander Premium" : "Request Premium",
          onClick: () => requestPremiumByEmail("Création de plusieurs audits"),
        },
      }
    );
    return false;
  }, [activeUser?.subscriptionPlan, lang, requestPremiumByEmail, sessions]);

  const isPristineBootstrapAudit = React.useCallback((session: Session | null | undefined) => {
    return Boolean(
      isBootstrapAuditSession(session) &&
      Object.values(evidenceMapRef.current).every((items) => !items?.length) &&
      Object.keys(proofStatusMapRef.current).length === 0 &&
      Object.values(plansRef.current).every((plan) => !hasAnyPlanFields(plan)) &&
      auditLogRef.current.length === 0
    );
  }, []);

  const activatePersistedAudit = React.useCallback((sessionId: string, snapshot: SnapshotPayload) => {
    snapshotCacheRef.current.set(sessionId, normalizeSnapshotPayload(snapshot));
    skipNextAutosaveSessionRef.current = sessionId;
    activeSessionIdRef.current = sessionId;
    setIsAuditLoading(true);
    setActiveSessionId(sessionId);
    setAuditLoadError(null);
    resetHistory();
  }, [resetHistory]);

  const createSessionFromRows = React.useCallback(async (requestedSession: Session, baseRows: ControlItem[]): Promise<boolean> => {
    if (!requireAuditManager() || !allowCreateAuditForPlan() || isAuditLoading || isAuditMutating || isEvidenceBusy || auditLoadError) return false;

    const session: Session = { ...requestedSession, bootstrap: false };
    const initialLog: AuditLogEntry[] = [{
      id: uuid(),
      at: new Date().toISOString(),
      actor: activeUser?.name || currentEvidenceActor(),
      actorEmail: activeUser?.email,
      action: "audit_created",
      entityType: "audit",
      entityId: session.id,
      message: lang === "fr" ? `Audit créé : ${session.name}` : `Audit created: ${session.name}`,
      details: `${sessionFrameworkLabel(session, lang)} · ${baseRows.length} ${lang === "fr" ? "contrôles" : "controls"}`,
    }];
    const snapshot = normalizeSnapshotPayload({
      rows: baseRows,
      evidenceMap: {},
      proofStatusMap: {},
      plans: {},
      auditLog: initialLog,
    });
    const bootstrap = sessions.length === 1 && isPristineBootstrapAudit(sessions[0]) ? sessions[0] : null;
    let created = false;

    setIsAuditMutating(true);
    try {
      await flushActiveAudit();
      await createAuditSessionOnBackend(session, snapshot);
      created = true;

      if (bootstrap) {
        try {
          await deleteAuditSessionFromBackend(bootstrap.id);
          snapshotCacheRef.current.delete(bootstrap.id);
        } catch (error) {
          await deleteAuditSessionFromBackend(session.id).catch(() => undefined);
          created = false;
          throw error;
        }
      }

      setSessions(bootstrap ? [session] : [session, ...sessions]);
      activatePersistedAudit(session.id, snapshot);
      setWizardOpen(false);
      toast.success(lang === "fr" ? "Audit créé" : "Audit created");
      return true;
    } catch (error) {
      if (created) await deleteAuditSessionFromBackend(session.id).catch(() => undefined);
      console.error("Unable to create audit transactionally.", error);
      toast.error(lang === "fr" ? "L’audit n’a pas été créé : aucune donnée partielle n’a été conservée." : "The audit was not created; no partial data was kept.");
      return false;
    } finally {
      setIsAuditMutating(false);
    }
  }, [activeUser?.email, activeUser?.name, activatePersistedAudit, allowCreateAuditForPlan, auditLoadError, flushActiveAudit, isAuditLoading, isAuditMutating, isEvidenceBusy, isPristineBootstrapAudit, lang, requireAuditManager, sessions]);

  const duplicateSession = React.useCallback(async () => {
    if (!requireAuditManager() || !allowCreateAuditForPlan() || isAuditLoading || isAuditMutating || isEvidenceBusy || auditLoadError) return;
    if (!activeSessionId) {
      setWizardOpen(true);
      return;
    }
    const source = sessions.find((session) => session.id === activeSessionId);
    if (!source) return;

    const clone: Session = {
      ...source,
      id: uuid(),
      name: `${source.name || "Audit"}${lang === "fr" ? " (copie)" : " (copy)"}`,
      createdAt: new Date().toISOString(),
      bootstrap: false,
    };
    const duplicateLog: AuditLogEntry[] = [{
      id: uuid(),
      at: new Date().toISOString(),
      actor: activeUser?.name || currentEvidenceActor(),
      actorEmail: activeUser?.email,
      action: "audit_duplicated",
      entityType: "audit",
      entityId: clone.id,
      message: lang === "fr" ? `Audit dupliqué depuis ${source.name}.` : `Audit duplicated from ${source.name}.`,
      details: `source_audit_id=${source.id}`,
    }];
    let created = false;
    let copiedEvidence: Record<string, EvidenceItem[]> = {};

    setIsAuditMutating(true);
    try {
      await flushActiveAudit();
      const sourceSnapshot = persistentSnapshot();
      const provisional = normalizeSnapshotPayload({ ...sourceSnapshot, evidenceMap: {}, auditLog: duplicateLog });
      await createAuditSessionOnBackend(clone, provisional);
      created = true;

      copiedEvidence = await duplicateEvidenceMapForAudit(sourceSnapshot.evidenceMap, clone.id);
      const finalSnapshot = normalizeSnapshotPayload({ ...provisional, evidenceMap: copiedEvidence });
      await apiPutSnapshot(clone.id, finalSnapshot);

      setSessions([clone, ...sessions]);
      activatePersistedAudit(clone.id, finalSnapshot);
      toast.success(lang === "fr" ? "Audit dupliqué" : "Audit duplicated");
    } catch (error) {
      await cleanupDuplicatedEvidenceItems(copiedEvidence);
      if (created) await deleteAuditSessionFromBackend(clone.id).catch(() => undefined);
      console.error("Unable to duplicate audit transactionally.", error);
      toast.error(lang === "fr" ? "La duplication a échoué. La copie partielle a été supprimée." : "Duplication failed. The partial copy was removed.");
    } finally {
      setIsAuditMutating(false);
    }
  }, [activeSessionId, activeUser?.email, activeUser?.name, activatePersistedAudit, allowCreateAuditForPlan, auditLoadError, flushActiveAudit, isAuditLoading, isAuditMutating, isEvidenceBusy, lang, persistentSnapshot, requireAuditManager, sessions]);

  const performDeleteSession = React.useCallback(async () => {
    if (!requireAuditDeletion() || !activeSessionId || isAuditLoading || isAuditMutating || isEvidenceBusy || auditLoadError) return;
    const deletedId = activeSessionId;
    const index = sessions.findIndex((session) => session.id === deletedId);

    setIsAuditMutating(true);
    try {
      cancelScheduledAutosave();
      await waitForPendingSave(deletedId);

      if (sessions.length <= 1) {
        const fresh: Session = {
          id: uuid(),
          name: "Audit 1",
          createdAt: new Date().toISOString(),
          auditDate: defaultAuditDate(),
          auditType: "initial",
          criticality: "medium",
          bootstrap: true,
        };
        const freshSnapshot = normalizeSnapshotPayload({
          rows: await loadDefaultAuditRows().catch(() => seedRowsFrom([])),
          evidenceMap: {},
          proofStatusMap: {},
          plans: {},
          auditLog: [],
        });

        await createAuditSessionOnBackend(fresh, freshSnapshot);
        try {
          await deleteAuditSessionFromBackend(deletedId);
        } catch (error) {
          await deleteAuditSessionFromBackend(fresh.id).catch(() => undefined);
          throw error;
        }

        snapshotCacheRef.current.delete(deletedId);
        setSessions([fresh]);
        autoOpenedWizardForSessionRef.current = null;
        activatePersistedAudit(fresh.id, freshSnapshot);
        setWizardOpen(true);
        toast.success(lang === "fr" ? "Audit supprimé. Créez un nouvel audit." : "Audit deleted. Create a new audit.");
        return;
      }

      await deleteAuditSessionFromBackend(deletedId);
      snapshotCacheRef.current.delete(deletedId);
      const survivors = sessions.filter((session) => session.id !== deletedId);
      const neighbor = survivors[index - 1] || survivors[index] || survivors[0];
      setSessions(survivors);
      if (neighbor) {
        skipNextAutosaveSessionRef.current = neighbor.id;
        activeSessionIdRef.current = neighbor.id;
        setIsAuditLoading(true);
        setActiveSessionId(neighbor.id);
      }
      toast.success(lang === "fr" ? "Audit supprimé" : "Audit deleted");
    } catch (error) {
      console.error("Unable to delete audit.", error);
      toast.error(lang === "fr" ? "La suppression n’a pas été confirmée par le serveur." : "The deletion was not confirmed by the server.");
    } finally {
      setIsAuditMutating(false);
    }
  }, [activeSessionId, activatePersistedAudit, auditLoadError, cancelScheduledAutosave, isAuditLoading, isAuditMutating, isEvidenceBusy, lang, requireAuditDeletion, sessions, waitForPendingSave]);

  const [confirmDelOpen, setConfirmDelOpen] = useState(false);
  const deleteSession = () => {
    if (!requireAuditDeletion() || auditLoadError || isAuditLoading || isAuditMutating || isEvidenceBusy) return;
    setConfirmDelOpen(true);
  };

  // Evidence drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerControl, setDrawerControl] = useState<ControlItem | null>(null);
  const openEvidence = (control: ControlItem) => { setDrawerControl(control); setDrawerOpen(true); };
  const closeEvidence = () => setDrawerOpen(false);

  const changeActiveSession = React.useCallback(async (nextSessionId: string) => {
    if (!nextSessionId || nextSessionId === activeSessionIdRef.current || isAuditLoading || isAuditMutating || isEvidenceBusy) return;
    if (!sessions.some((session) => session.id === nextSessionId)) return;

    setIsAuditMutating(true);
    try {
      await flushActiveAudit();
      setDrawerOpen(false);
      setProfileOpen(false);
      setWizardOpen(false);
      skipNextAutosaveSessionRef.current = nextSessionId;
      activeSessionIdRef.current = nextSessionId;
      setIsAuditLoading(true);
      setAuditLoadError(null);
      setActiveSessionId(nextSessionId);
      resetHistory();
    } catch (error) {
      console.error("Unable to flush audit before switching.", error);
      setSaveState("sync_error");
      toast.error(lang === "fr" ? "Changement annulé : l’audit actuel n’a pas pu être sauvegardé." : "Switch cancelled: the current audit could not be saved.");
    } finally {
      setIsAuditMutating(false);
    }
  }, [flushActiveAudit, isAuditLoading, isAuditMutating, isEvidenceBusy, lang, resetHistory, sessions]);

  // Comparison is loaded from the real persisted snapshot of the closest older
  // audit, restricted to the same framework whenever one is known.
  const [compareRows, setCompareRows] = useState<ControlItem[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    setCompareRows(null);
    const current = sessions.find((session) => session.id === activeSessionId);
    if (!current) return () => { cancelled = true; };
    const currentTime = new Date(current.createdAt).getTime();
    const currentFramework = normalizeSessionFrameworkId(current.frameworkId);
    const currentFrameworkVersion = current.frameworkVersion?.trim();
    const currentCatalogId = current.frameworkCatalogId?.trim();
    const previous = sessions
      .filter((session) => session.id !== current.id)
      .filter((session) => new Date(session.createdAt).getTime() < currentTime)
      .filter((session) => !currentFramework || normalizeSessionFrameworkId(session.frameworkId) === currentFramework)
      .filter((session) => !currentFrameworkVersion || session.frameworkVersion?.trim() === currentFrameworkVersion)
      .filter((session) => !currentCatalogId || session.frameworkCatalogId?.trim() === currentCatalogId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    if (!previous) return () => { cancelled = true; };

    void fetchPersistedSnapshot(previous.id)
      .then((snapshot) => {
        if (!cancelled && activeSessionIdRef.current === current.id) setCompareRows(snapshot?.rows || null);
      })
      .catch((error) => console.warn("Unable to load comparison audit.", error));
    return () => { cancelled = true; };
  }, [activeSessionId, fetchPersistedSnapshot, sessions]);

  const handleExport = React.useCallback(async () => {
    if (!requirePremiumFeature(lang === "fr" ? "L’export PDF du rapport" : "PDF report export")) return;

    try {
      const current = sessions.find((s) => s.id === activeSessionId) || currentSession;
      const baseTitle = current?.name || current?.organization || (lang === "fr" ? "rapport-audit" : "audit-report");

      await saveSearchableAuditReportPDF({
        rows,
        lang,
        session: current,
        sessionName: baseTitle,
        baseline: compareRows || null,
        plans,
        evidenceMap,
        proofStatusMap,
        filename: `${safeExportFilename(baseTitle, lang)}.pdf`,
      });

      toast.success(lang === "fr" ? "PDF généré." : "PDF generated.");
    } catch (e) {
      console.error(e);
      toast.error(lang === "fr" ? "Erreur export PDF" : "PDF export error");
    }
  }, [
    activeSessionId,
    compareRows,
    currentSession,
    evidenceMap,
    lang,
    plans,
    proofStatusMap,
    requirePremiumFeature,
    rows,
    sessions,
  ]);


  const t = I18N[lang];
  const delDesc = sessions.length <= 1
    ? (lang==='fr' ? "Ceci réinitialisera l'application avec une session vierge." : "This will reset the app to a fresh session.")
    : (lang==='fr' ? t.confirmDeleteDesc : t.confirmDeleteDesc);

  if (!activeUser) {
    if (route === "login" || route === "app") {
      return (
        <MotionConfig transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} reducedMotion="user">
          <UserAccessScreen
            mode={users.length === 0 ? "setup" : "login"}
            lang={lang}
            setLang={setLang}
            theme={theme}
            setTheme={setTheme}
            users={users}
            onCreateAdmin={createAdminUser}
            onLogin={async (userId, password) => {
              const ok = await loginUser(userId, password);
              if (ok) navigate("app", true);
              return ok;
            }}
            onSupabaseAuthenticated={(profile) => {
              syncSupabaseAuthenticatedUser(profile);
              navigate("app", true);
            }}
            onBackHome={() => navigate("home")}
          />
        </MotionConfig>
      );
    }

    return (
      <MotionConfig transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} reducedMotion="user">
        <LandingHomePage
          initialPage={route === "about" ? "apropos" : route === "security" ? "securite" : route === "privacy" ? "confidentialite" : "plateforme"}
          onAccess={(plan) => {
            if (plan) saveSelectedSubscriptionPlan(normalizeSubscriptionPlan(plan));
            navigate("login");
          }}
          onNavigate={(page) => navigate(page === "apropos" ? "about" : page === "securite" ? "security" : page === "confidentialite" ? "privacy" : "home")}
        />
      </MotionConfig>
    );
  }

  if (isServiceOwnerUser(activeUser)) {
    return (
      <MotionConfig transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} reducedMotion="user">
        <ServiceOwnerAdminConsole
          lang={lang}
          users={users}
          activeUser={activeUser}
          onAddUser={addUser}
          onUpdateUser={updateUser}
          onDeleteUser={deleteUser}
          onResetPassword={resetUserPassword}
          onSetSubscriptionByEmail={setSubscriptionByEmail}
          onLogout={() => {
            logoutUser();
            navigate("home", true);
          }}
        />
      </MotionConfig>
    );
  }

  return (
    <MotionConfig transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} reducedMotion="user">
      <div className="min-h-screen bg-background text-foreground app-shell">
      <ThemeStyles/>
      <div className="screen-only">
      <Toolbar
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        onUndo={undoAuditChange}
        onRedo={redoAuditChange}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onChangeSession={(id) => { void changeActiveSession(id); }}
        onCreateSession={() => {
          if (!allowCreateAuditForPlan()) return;
          setWizardOpen(true);
        }}
        onDuplicateSession={duplicateSession}
        onDeleteSession={deleteSession}
		saveState={saveState}
		lastSavedAt={lastSavedAt}
		onRenameSession={renameSession}
		onRetrySync={retryBackendSync}
        activeUser={activeUser}
        canChangeSession={!isAuditLoading && !isAuditMutating && !isEvidenceBusy}
        canEditAuditSession={!isAuditLoading && !isAuditMutating && !isEvidenceBusy && !auditLoadError}
        canManageUsers={canManageUsersFlag}
        canManageAudits={canManageAuditsFlag}
        canDeleteAudits={canDeleteAuditsFlag}
        onOpenUsers={() => setUsersDialogOpen(true)}
        onRequestPremium={() => requestPremiumByEmail("Barre d’outils GapTrack")}
        onLogout={() => { void logoutAfterSaving(); }}
      />
      <div className="flex">
        <Sidebar current={tab} onNavigate={setTab} lang={lang} />
        <div className="main-surface flex-1">
          {isAuditLoading ? (
            <main className="mx-auto max-w-3xl p-6">
              <Card>
                <CardContent className="flex items-center gap-3 p-6 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {lang === "fr" ? "Chargement sécurisé de l’audit…" : "Securely loading the audit…"}
                </CardContent>
              </Card>
            </main>
          ) : auditLoadError ? (
            <main className="mx-auto max-w-3xl p-6">
              <Card>
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-start gap-3 text-destructive">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <p>{auditLoadError}</p>
                  </div>
                  <Button variant="outline" onClick={() => { void retryBackendSync(); }}>
                    {lang === "fr" ? "Recharger l’audit" : "Reload audit"}
                  </Button>
                </CardContent>
              </Card>
            </main>
          ) : (
          <>
          <PageHeader tab={tab} lang={lang} rows={rows} />
          <AuditIdentityBanner session={currentSession} lang={lang} onEdit={() => setProfileOpen(true)} />
            <AnimatePresence mode="wait">
              {tab === "listing" && (
                <motion.div
                  key="listing"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <ListingView
                rows={rows}
                setRows={setRowsWithHistory}
                lang={lang}
				theme={theme}
                onOpenEvidence={openEvidence}
                evidenceCountFor={(id)=> (evidenceMap[id]?.length || 0)}
				evidenceListFor={(id) => evidenceMap[id] || []}
				proofStatusFor={proofStatusForRow}
				setProofStatusForRow={setProofStatusForRow}
				plans={plans}
				openRequest={listingOpenRequest}
				onOpenRequestConsumed={() => setListingOpenRequest(null)}
					canExport={isPremiumUser}
					onPremiumRequired={requirePremiumFeature}
              />
                </motion.div>
              )}

              {tab === "weekly" && (
                <motion.div
                  key="weekly"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <WeeklyPriorityView
                    rows={rows}
                    setRows={setRowsWithHistory}
                    lang={lang}
                    plans={plans}
                    patchPlan={patchPlanForRow}
                    proofStatusFor={proofStatusForRow}
                    onOpenPlan={(controlId) => {
                      setTab("plan");
                      if (controlId) {
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent("select-plan-row", { detail: controlId }));
                        }, 0);
                      }
                    }}
                  />
                </motion.div>
              )}

              {tab === "risks" && (
                <motion.div
                  key="risks"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <RisksView
                    rows={rows}
                    plans={plans}
                    lang={lang}
                    proofStatusFor={proofStatusForRow}
                    onOpenControl={(controlId, domain) => {
                      openListingFromDashboard(domain, controlId);
                    }}
                    onOpenPlan={(controlId) => {
                      setTab("plan");
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent("select-plan-row", { detail: controlId }));
                      }, 0);
                    }}
                  />
                </motion.div>
              )}

              {tab === "dashboard" && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <DashboardView
				rows={rows}
				plans={plans}
				lang={lang}
				compareWith={compareRows || undefined}
				onExport={handleExport}
					canExport={isPremiumUser}
				onOpenDomain={(domain) => {
					openListingFromDashboard(domain);
				}}
				
				
				onOpenControl={(controlId, domain) => {
				  openListingFromDashboard(domain, controlId);
				}}

				
				
			  
				proofStatusFor={proofStatusForRow}/>
                </motion.div>
              )}



              {tab === "journal" && (
                <motion.div
                  key="journal"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  {isPremiumUser ? (
                    <AuditLogView
                      entries={auditLog}
                      lang={lang}
                      onExport={() => {
                        if (!requirePremiumFeature(lang === "fr" ? "L’export CSV du journal" : "Audit log CSV export")) return;
                        exportAuditLogCSV(auditLog, lang);
                      }}
                      onClear={clearAuditLog}
                      canClear={canDeleteAuditsFlag}
                      canExport={isPremiumUser}
                    />
                  ) : (
                    <PremiumFeatureNotice
                      lang={lang}
                      title={lang === "fr" ? "Journal d’audit avancé" : "Advanced audit log"}
                      description={lang === "fr" ? "Free enregistre l’essentiel pour votre audit en cours. Premium affiche et exporte le journal horodaté complet des preuves, validations, refus et modifications." : "Free keeps the essentials for your current audit. Premium displays and exports the full timestamped log of evidence, validation, rejection, and changes."}
                      bullets={lang === "fr" ? ["Historique horodaté", "Export CSV du journal", "Traçabilité des validations", "Support des audits équipe"] : ["Timestamped history", "CSV audit log export", "Validation traceability", "Team audit support"]}
                      onRequestPremium={() => requestPremiumByEmail(lang === "fr" ? "Journal d’audit avancé" : "Advanced audit log")}
                    />
                  )}
                </motion.div>
              )}


              {tab === "settings" && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <SettingsProfileView
                    activeUser={activeUser}
                    lang={lang}
                    onSaveProfile={updateOwnProfile}
                    onRequestPasswordReset={requestOwnPasswordReset}
                    onLogout={() => { void logoutAfterSaving(); }}
                    onRequestPremium={() => requestPremiumByEmail(lang === "fr" ? "Paramètres - Gestion de l’abonnement" : "Settings - Subscription management")}
                  />
                </motion.div>
              )}

              {tab === "plan" && (
                <motion.div
                  key="plan"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <PlanView
				rows={rows}
				lang={lang}
				plans={plans}
				patchPlan={patchPlanForRow}
				evidenceCountFor={(id)=> (evidenceMap[id]?.length || 0)}
				proofStatusFor={proofStatusForRow}
				setProofStatusForRow={setProofStatusForRow}
				onOpenEvidence={openEvidence}
					canExport={isPremiumUser}
                        canAssignOwners={isPremiumUser}
					onPremiumRequired={requirePremiumFeature}
			  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
          )}
</div>
      </div>

            <MobileNav current={tab} onNavigate={setTab} lang={lang} />

<CommandPalette open={paletteOpen} setOpen={setPaletteOpen} onNavigate={setTab} onToggleTheme={() => setTheme(theme==='dark'?'light':'dark')} domains={(Array.from(new Set(rows.map((r) => r.domain))) as string[]).sort()} />
      <ScrollTopButton/>

      <EvidenceDrawer
        open={drawerOpen && !isAuditLoading && !auditLoadError}
        onClose={closeEvidence}
        control={drawerControl}
        auditSessionId={activeSessionId}
        evidenceMap={evidenceMap}
        proofStatusMap={proofStatusMap}
        commitEvidenceChange={commitEvidenceChange}
        lang={lang}
        canAddEvidence={canEditAuditFlag}
        canReviewEvidence={canReviewEvidenceFlag && isPremiumUser}
        canUseCloudStorage={isPremiumUser}
        onAuditEvent={appendAuditLog}
        onBusyChange={setIsEvidenceBusy}
      />
	  
      </div>

      <UserManagementDialog
        open={usersDialogOpen}
        onClose={() => setUsersDialogOpen(false)}
        lang={lang}
        users={users}
        activeUser={activeUser}
        onAddUser={addUser}
        onUpdateUser={updateUser}
        onDeleteUser={deleteUser}
        onResetPassword={resetUserPassword}
        onActivatePremiumByEmail={activatePremiumByEmail}
        canManageSubscriptions={canManageSubscriptionsFlag}
        canCreateUsers={canCreateUsersFlag}
      />

      <CreateAuditWizard
        open={wizardOpen}
        onClose={()=>setWizardOpen(false)}
        lang={lang}
        templates={templates}
        currentRowsCount={rows.length}
        onImportTemplate={handleImportTemplate}
        canImportTemplates={isPremiumUser}
        onPremiumRequired={requirePremiumFeature}
        onCreateAudit={async ({ name, frameworkId, frameworkVersion, frameworkCatalogId, frameworkCatalogRevision, scope, criticality, templateId, rows: tplRows, organization, auditor, sponsor, auditDate, auditType, objectives, context }) => {
          const sessionBase: Omit<Session, "id" | "createdAt"> = {
            name,
            frameworkId,
            frameworkVersion,
            frameworkCatalogId,
            frameworkCatalogRevision,
            scope,
            criticality,
            templateId,
            organization,
            auditor,
            sponsor,
            auditDate,
            auditType,
            objectives,
            context,
          };

          if (tplRows && tplRows.length > 0) {
            const s: Session = { id: uuid(), createdAt: new Date().toISOString(), ...sessionBase };
            return createSessionFromRows(s, tplRows);
          }
          // Source = current checklist (reset statuses)
          const s: Session = {
            id: uuid(),
            createdAt: new Date().toISOString(),
            ...sessionBase,
            templateId: undefined,
            frameworkVersion: undefined,
            frameworkCatalogId: undefined,
            frameworkCatalogRevision: undefined,
          };
          const base = seedRowsFrom(rows);
          return createSessionFromRows(s, base);
        }}
      />

      <AuditProfileDialog
        open={profileOpen}
        session={currentSession}
        lang={lang}
        onClose={() => setProfileOpen(false)}
        onSave={async (patch) => {
          if (!activeSessionId) return false;
          return updateSessionProfile(activeSessionId, patch);
        }}
      />

      <ConfirmDialog
        open={confirmDelOpen}
        title={t.confirmDeleteTitle}
        description={delDesc}
        confirmLabel={t.confirm}
        cancelLabel={t.cancel}
        onConfirm={()=>{ setConfirmDelOpen(false); void performDeleteSession(); }}
        onCancel={()=>setConfirmDelOpen(false)}
      />

      <PrintExecutive
        rows={rows}
        lang={lang}
        session={currentSession}
        sessionName={currentSession?.name || 'Audit'}
        baseline={compareRows || undefined}
        plans={plans}
        evidenceMap={evidenceMap}
        proofStatusMap={proofStatusMap}
      />
      </div>
    </MotionConfig>
  );
}
