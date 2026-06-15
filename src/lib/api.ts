/**
 * API client for the Django backend.
 *
 * Provides typed methods for all screenplay CRUD operations,
 * version management, and PDF export.
 *
 * Falls back gracefully if the backend is unreachable.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
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
  paper_color: string;
  font_family: string;
  text_color: string;
  font_size: number;
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
  paper_color: string;
  font_family: string;
  text_color: string;
  font_size: number;
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
    // If the backend rejects the token, do not forcefully log out the user,
    // as this breaks local-only workflows when Supabase is down.
    throw new Error("Your session has expired or the server is unavailable.");
  }

  if (!response.ok) {
    // Log internally but never expose API URL or raw status to the user
    const status = response.status;
    if (process.env.NODE_ENV !== "production") {
      const errorText = await response.text().catch(() => "(no body)");
      console.error(`[API] ${options.method || "GET"} ${path} → ${status}:`, errorText);
    }
    throw new Error(
      status >= 500
        ? "A server error occurred. Please try again later."
        : "Request failed. Please check your input and try again."
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json();
}

// ─── Script CRUD ──────────────────────────────────────────────────────────

export async function apiGetScripts(): Promise<ApiScriptListItem[]> {
  try {
    const data = await apiFetch<any>("/scripts/");
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
  } catch (e) {
    console.error("apiGetScripts error:", e);
    return [];
  }
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
  paper_color?: string;
  font_family?: string;
  text_color?: string;
  font_size?: number;
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
    paper_color: string;
    font_family: string;
    text_color: string;
    font_size: number;
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
  try {
    const data = await apiFetch<any>(`/scripts/${scriptId}/history/`);
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
  } catch (e) {
    console.error("apiGetHistory error:", e);
    return [];
  }
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
  // Use apiFetch to ensure the Authorization header is sent
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const url = `${API_BASE}/scripts/${scriptId}/export/pdf/`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    throw new Error("Your session has expired or the server is unavailable.");
  }

  if (!response.ok) {
    throw new Error("PDF export failed. Please try again.");
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = "screenplay.pdf";
  a.click();
  URL.revokeObjectURL(blobUrl);
}

// ─── Workspace Sync (Director's Suite) ───────────────────────────────────

export interface ApiWorkspaceData {
  assets: any[];
  edges: any[];
  viewport: { zoom: number; pan: { x: number; y: number } } | null;
  drawing_strokes: any[];
}

/**
 * Fetches all data for the Director's Suite workspace:
 * - Assets (WorkspaceAsset rows)
 * - Edges (connectors stored on Script)
 * - Viewport (stored on Script)
 * - Drawing strokes (stored on Script)
 */
export async function apiGetWorkspace(scriptId: string): Promise<ApiWorkspaceData> {
  const [assets, script] = await Promise.all([
    apiFetch<any[]>(`/scripts/${scriptId}/workspace/`),
    apiFetch<any>(`/scripts/${scriptId}/`),
  ]);

  return {
    assets: assets || [],
    edges: script.workspace_edges || [],
    viewport: (script.canvas_viewport && Object.keys(script.canvas_viewport).length > 0)
      ? script.canvas_viewport
      : null,
    drawing_strokes: script.drawing_strokes || [],
  };
}

/**
 * Batch updates the entire workspace state in one call.
 */
export async function apiSyncWorkspace(
  scriptId: string,
  payload: {
    assets?: any[];
    edges?: any[];
    viewport?: any;
    drawing_strokes?: any[];
  }
): Promise<{ status: string; count: number }> {
  return apiFetch(`/scripts/${scriptId}/workspace/sync/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
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

// ─── Notes API ────────────────────────────────────────────────────────────

export interface ApiNote {
  id: string;
  script_id: string | null;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

/** List notes. Pass scriptId to get per-script notes, omit for all notes. */
export async function apiGetNotes(scriptId?: string): Promise<ApiNote[]> {
  const params = scriptId ? `?script=${scriptId}` : "";
  const data = await apiFetch<{ results: ApiNote[] } | ApiNote[]>(`/notes/${params}`);
  return (Array.isArray(data) ? data : data?.results) || [];
}

/** List global notes (not linked to any script). */
export async function apiGetGlobalNotes(): Promise<ApiNote[]> {
  const data = await apiFetch<{ results: ApiNote[] } | ApiNote[]>(`/notes/?global=1`);
  return Array.isArray(data) ? data : data.results;
}

export async function apiCreateNote(data: {
  title?: string;
  content?: string;
  color?: string;
  pinned?: boolean;
  script_id?: string | null;
}): Promise<ApiNote> {
  return apiFetch<ApiNote>("/notes/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function apiUpdateNote(
  id: string,
  data: Partial<ApiNote>,
): Promise<ApiNote> {
  return apiFetch<ApiNote>(`/notes/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function apiDeleteNote(id: string): Promise<void> {
  return apiFetch<void>(`/notes/${id}/`, {
    method: "DELETE",
  });
}

// ─── Text Files ────────────────────────────────────────────────────────────

export interface ApiTextFile {
  id: string;
  name: string;
  content: string;
  language: string;
  encoding: string;
  line_endings: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export async function apiGetTextFiles(pinned?: boolean): Promise<ApiTextFile[]> {
  const query = pinned !== undefined ? `?pinned=${pinned}` : "";
  try {
    const data = await apiFetch<any>(`/text-files/${query}`);
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
  } catch (e) {
    console.error("apiGetTextFiles error:", e);
    return [];
  }
}

export async function apiGetTextFile(id: string): Promise<ApiTextFile> {
  return apiFetch<ApiTextFile>(`/text-files/${id}/`);
}

export async function apiCreateTextFile(data: Partial<ApiTextFile>): Promise<ApiTextFile> {
  return apiFetch<ApiTextFile>("/text-files/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function apiUpdateTextFile(id: string, data: Partial<ApiTextFile>): Promise<ApiTextFile> {
  return apiFetch<ApiTextFile>(`/text-files/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function apiDeleteTextFile(id: string): Promise<void> {
  return apiFetch<void>(`/text-files/${id}/`, {
    method: "DELETE",
  });
}

export async function apiUploadImage(file: File): Promise<{ url: string }> {
  const url = `${API_BASE}/upload-image/`;
  const token = await getAccessToken();

  const formData = new FormData();
  formData.append("image", file);

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to upload image");
  }

  return response.json();
}
