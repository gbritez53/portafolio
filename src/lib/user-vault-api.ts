// Cliente de la API de boveda por usuario. Solo habla con /admin/api; nunca envia claves ni texto plano.
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";
import { withBase } from "@/lib/base-path";

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export interface VaultUserSummary {
  id: string;
  name: string;
  status: "pending" | "active";
  hasPasskey: boolean;
}

export interface WrapperDto {
  id: string;
  kdfSalt: string;
  kdfIters: number | null;
  iv: string;
  wrappedDek: string;
}

export interface SealedCredential {
  id: string;
  name: string;
  payload: string;
  payloadIv: string;
}

export interface StoredCredential extends SealedCredential {
  createdAt: string;
  updatedAt: string;
}

export interface SealedSettings {
  payload: string;
  payloadIv: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(withBase(`/api/${path}`), {
    cache: "no-store",
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  if (!response.ok) throw await apiError(response);
  return (await response.json()) as T;
}

async function apiError(response: Response): Promise<ApiError> {
  let message = "No se pudo completar la operación.";
  try {
    message = ((await response.json()) as { error?: string }).error ?? message;
  } catch {
    // El cuerpo no era JSON: se queda el mensaje generico.
  }
  return new ApiError(message, response.status);
}

const send = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const listUsers = (signal?: AbortSignal) => request<{ users: VaultUserSummary[] }>("users", { signal }).then((r) => r.users);
export const createUser = (name: string) => request<{ user: VaultUserSummary }>("users", send("POST", { name })).then((r) => r.user);

export interface RegisterVerifyBody {
  userId: string;
  challengeId: string;
  response: RegistrationResponseJSON;
  label?: string;
  passkeyWrapper?: WrapperDto;
  recovery?: { wrapper: WrapperDto; authToken: string };
}

export const registerOptions = (userId: string) =>
  request<{ options: PublicKeyCredentialCreationOptionsJSON; challengeId: string }>("webauthn/register/options", send("POST", { userId }));
export const registerVerify = (body: RegisterVerifyBody) =>
  request<{ ok: true; credentialId: string; prfCapable: boolean }>("webauthn/register/verify", send("POST", body));

export const authenticateOptions = (userId: string) =>
  request<{ options: PublicKeyCredentialRequestOptionsJSON; challengeId: string }>("webauthn/authenticate/options", send("POST", { userId }));
export const authenticateVerify = (body: { userId: string; challengeId: string; response: AuthenticationResponseJSON }) =>
  request<{ userId: string; wrapper: WrapperDto | null }>("webauthn/authenticate/verify", send("POST", body));

export const recoveryParams = (userId: string) =>
  request<{ kdfSalt: string; kdfIters: number }>(`recovery/params?userId=${encodeURIComponent(userId)}`);
export const recoveryUnlock = (userId: string, authToken: string) =>
  request<{ userId: string; wrapper: WrapperDto }>("recovery/unlock", send("POST", { userId, authToken }));

export const lockVaultSession = () => request<{ ok: true }>("user-vault/session", { method: "DELETE" });

export const listVaultCredentials = (signal?: AbortSignal) =>
  request<{ credentials: StoredCredential[] }>("user-vault/credentials", { signal }).then((r) => r.credentials);
export const createVaultCredential = (item: SealedCredential) => request<{ id: string }>("user-vault/credentials", send("POST", item));
export const updateVaultCredential = (item: SealedCredential) => request<{ id: string }>("user-vault/credentials", send("PUT", item));
export const deleteVaultCredential = (id: string) => request<{ ok: true }>("user-vault/credentials", send("DELETE", { id }));

export interface VaultBatch {
  upserts: SealedCredential[];
  deletes: string[];
  settings?: SealedSettings;
}
export const applyVaultBatch = (batch: VaultBatch) => request<{ ok: true }>("user-vault/batch", send("POST", batch));

export const getVaultSettings = (signal?: AbortSignal) =>
  request<{ settings: SealedSettings | null }>("user-vault/settings", { signal }).then((r) => r.settings);
export const putVaultSettings = (settings: SealedSettings) => request<{ ok: true }>("user-vault/settings", send("PUT", settings));

export interface SealedFinanceEntry {
  id: string;
  payload: string;
  payloadIv: string;
}

export interface StoredFinanceEntry extends SealedFinanceEntry {
  createdAt: string;
  updatedAt: string;
}

export interface FinanceBatch {
  upserts: SealedFinanceEntry[];
  deletes: string[];
  settings?: SealedSettings;
}

export const getVaultFinances = (signal?: AbortSignal) =>
  request<{ entries: StoredFinanceEntry[]; settings: SealedSettings | null }>("user-vault/finances", { signal });
export const applyFinanceBatch = (batch: FinanceBatch) => request<{ ok: true }>("user-vault/finances", send("POST", batch));

export type SealedInvoice = SealedFinanceEntry;
export type StoredInvoice = StoredFinanceEntry;

export interface AutonomoBatch {
  upserts: SealedInvoice[];
  deletes: string[];
  settings?: SealedSettings;
}

export const getVaultAutonomo = (signal?: AbortSignal) =>
  request<{ invoices: StoredInvoice[]; settings: SealedSettings | null }>("user-vault/autonomo", { signal });
export const applyAutonomoBatch = (batch: AutonomoBatch) => request<{ ok: true }>("user-vault/autonomo", send("POST", batch));

export interface StoredDocument extends SealedFinanceEntry {
  createdAt: string;
}

export const listVaultDocuments = (signal?: AbortSignal) =>
  request<{ documents: StoredDocument[] }>("user-vault/autonomo-documents", { signal }).then((r) => r.documents);
export const deleteVaultDocument = (id: string) =>
  request<{ ok: true }>(`user-vault/autonomo-documents/${encodeURIComponent(id)}`, { method: "DELETE" });

// El archivo viaja ya cifrado. Sin pasar por `request`: lleva FormData y el navegador pone el boundary.
export async function uploadVaultDocument(item: SealedFinanceEntry, encrypted: Uint8Array<ArrayBuffer>): Promise<void> {
  const form = new FormData();
  form.append("id", item.id);
  form.append("payload", item.payload);
  form.append("payloadIv", item.payloadIv);
  form.append("file", new Blob([encrypted], { type: "application/octet-stream" }), "document.bin");
  const response = await fetch(withBase("/api/user-vault/autonomo-documents"), { method: "POST", body: form, cache: "no-store" });
  if (!response.ok) throw await apiError(response);
}

export async function downloadVaultDocument(id: string): Promise<Uint8Array<ArrayBuffer>> {
  const response = await fetch(withBase(`/api/user-vault/autonomo-documents/${encodeURIComponent(id)}`), { cache: "no-store" });
  if (!response.ok) throw await apiError(response);
  return new Uint8Array(await response.arrayBuffer());
}
