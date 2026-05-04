/**
 * API client for the Django backend.
 *
 * Provides typed methods for all screenplay CRUD operations,
 * version management, and PDF export.
 *
 * Falls back gracefully if the backend is unreachable.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
import { getAccessToken, logout } from "./auth";

// ─── Types ────────────────────────────────────────────────────────────────

export interface ApiScript {
  id: string;
  title: string;
  author: string;
  contact: string;
  logline: string;
  synopsis: string;
  written_by_prefix: string;
  content: string;
  color: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  scenes?: ApiScene[];
  versions?: ApiScriptVersion[];
  history?: ApiHistoryEvent[];
}

export interface ApiScriptListItem {
  id: string;
  title: string;
  author: string;
  color: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  history_count: number;
  version_count: number;
  scene_count: number;
}

export interface ApiScene {
  id: string;
  slugline: string;
  order: number;
  elements: ApiElement[];
  created_at: string;
}

export interface ApiElement {
  id: string;
  element_type: string;
  content: string;
  content_html: string;
  order: number;
}

export interface ApiScriptVersion {
  id: string;
  name: string;
  content_snapshot: string;
  created_at: string;
}

export interface ApiHistoryEvent {
  id: string;
  action: string;
  details: string;
  timestamp: string;
}

// ─── Fetch wrapper ────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    headers,
    ...options,
  });

  if (response.status === 401) {
    logout();
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json();
}

// ─── Script CRUD ──────────────────────────────────────────────────────────

export async function apiGetScripts(): Promise<ApiScriptListItem[]> {
  const data = await apiFetch<
    { results: ApiScriptListItem[] } | ApiScriptListItem[]
  >("/scripts/");
  return Array.isArray(data) ? data : data.results;
}

export async function apiGetScript(id: string): Promise<ApiScript> {
  return apiFetch<ApiScript>(`/scripts/${id}/`);
}

export async function apiCreateScript(data: {
  id?: string;
  title?: string;
  content?: string;
  author?: string;
  contact?: string;
  logline?: string;
  synopsis?: string;
  written_by_prefix?: string;
  color?: string;
  tags?: string[];
}): Promise<ApiScript> {
  return apiFetch<ApiScript>("/scripts/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function apiUpdateScript(
  id: string,
  data: Partial<{
    title: string;
    author: string;
    contact: string;
    logline: string;
    synopsis: string;
    written_by_prefix: string;
    content: string;
    color: string;
    tags: string[];
  }>,
): Promise<ApiScript> {
  return apiFetch<ApiScript>(`/scripts/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function apiDeleteScript(id: string): Promise<void> {
  return apiFetch<void>(`/scripts/${id}/`, {
    method: "DELETE",
  });
}

// ─── Versions ─────────────────────────────────────────────────────────────

export async function apiGetVersions(
  scriptId: string,
): Promise<ApiScriptVersion[]> {
  return apiFetch<ApiScriptVersion[]>(`/scripts/${scriptId}/versions/`);
}

export async function apiSaveVersion(
  scriptId: string,
  name: string,
): Promise<ApiScriptVersion> {
  return apiFetch<ApiScriptVersion>(`/scripts/${scriptId}/save_version/`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function apiRestoreVersion(
  scriptId: string,
  versionId: string,
): Promise<ApiScript> {
  return apiFetch<ApiScript>(
    `/scripts/${scriptId}/versions/${versionId}/restore/`,
    { method: "POST" },
  );
}

// ─── History ──────────────────────────────────────────────────────────────

export async function apiGetHistory(
  scriptId: string,
): Promise<ApiHistoryEvent[]> {
  return apiFetch<ApiHistoryEvent[]>(`/scripts/${scriptId}/history/`);
}

// ─── Search ───────────────────────────────────────────────────────────────

export async function apiSearchScripts(
  query: string,
): Promise<ApiScriptListItem[]> {
  const data = await apiFetch<{ results: ApiScriptListItem[] }>(
    `/scripts/search/?q=${encodeURIComponent(query)}`,
  );
  return data.results;
}

// ─── PDF Export ───────────────────────────────────────────────────────────

export async function apiExportPdf(scriptId: string): Promise<void> {
  const url = `${API_BASE}/scripts/${scriptId}/export/pdf/`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`PDF export failed: ${response.status}`);
  }
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = "screenplay.pdf";
  a.click();
  URL.revokeObjectURL(blobUrl);
}

// ─── Backend availability check ───────────────────────────────────────────

export async function isBackendAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/scripts/`, {
      method: "HEAD",
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
