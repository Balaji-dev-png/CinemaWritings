/**
 * Storyboard API client — wraps all /api/storyboards/ endpoints.
 * Uses the existing authenticated apiFetch from @/lib/api.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const { createBrowserClient } = await import("@supabase/ssr");
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
}

export interface SceneCard {
  id: string;
  order: number;
  shot_number: string;
  scene_heading: string;
  shot_type: string;
  camera_movement: string;
  lens: string;
  technical_notes: string;
  image_url: string;
  created_at: string;
  updated_at: string;
}

export interface Storyboard {
  id: string;
  script_title: string;
  title: string;
  aspect_ratio: "16:9" | "2.39:1" | "4:3" | "1.85:1";
  cards: SceneCard[];
  created_at: string;
  updated_at: string;
}

export const SHOT_TYPES: Record<string, string> = {
  EWS: "Extreme Wide Shot",
  WS: "Wide Shot",
  FS: "Full Shot",
  MWS: "Medium Wide / Cowboy",
  MS: "Medium Shot",
  MCU: "Medium Close-Up",
  CU: "Close-Up",
  ECU: "Extreme Close-Up",
  INSERT: "Insert Shot",
  OTS: "Over-the-Shoulder",
  POV: "Point of View",
  TWO: "Two Shot",
  DUTCH: "Dutch Angle",
  AERIAL: "Aerial Shot",
  CRANE: "Crane Shot",
};

export const CAMERA_MOVEMENTS: Record<string, string> = {
  static: "Static",
  pan_l: "Pan Left",
  pan_r: "Pan Right",
  tilt_u: "Tilt Up",
  tilt_d: "Tilt Down",
  dolly_in: "Dolly In",
  dolly_out: "Dolly Out",
  crane_u: "Crane Up",
  crane_d: "Crane Down",
  handheld: "Handheld",
  steadicam: "Steadicam",
  zoom_in: "Zoom In",
  zoom_out: "Zoom Out",
  arc: "Arc Shot",
  whip: "Whip Pan",
};

export async function getStoryboard(scriptId: string): Promise<Storyboard> {
  const res = await authFetch(`${API_BASE}/storyboards/${scriptId}/`);
  if (!res.ok) throw new Error("Failed to load storyboard");
  return res.json();
}

export async function updateStoryboard(scriptId: string, data: Partial<Storyboard>): Promise<Storyboard> {
  const res = await authFetch(`${API_BASE}/storyboards/${scriptId}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update storyboard");
  return res.json();
}

export async function createSceneCard(storyboardId: string, data: Partial<SceneCard> = {}): Promise<SceneCard> {
  const res = await authFetch(`${API_BASE}/storyboards/${storyboardId}/cards/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create scene card");
  return res.json();
}

export async function updateSceneCard(storyboardId: string, cardId: string, data: Partial<SceneCard>): Promise<SceneCard> {
  const res = await authFetch(`${API_BASE}/storyboards/${storyboardId}/cards/${cardId}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update scene card");
  return res.json();
}

export async function deleteSceneCard(storyboardId: string, cardId: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/storyboards/${storyboardId}/cards/${cardId}/`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete scene card");
}

export async function reorderSceneCards(storyboardId: string, orderedIds: string[]): Promise<void> {
  const res = await authFetch(`${API_BASE}/storyboards/${storyboardId}/cards/reorder/`, {
    method: "POST",
    body: JSON.stringify({ order: orderedIds }),
  });
  if (!res.ok) throw new Error("Failed to reorder cards");
}

export async function bulkDeleteSceneCards(storyboardId: string, ids: string[]): Promise<void> {
  const res = await authFetch(`${API_BASE}/storyboards/${storyboardId}/cards/bulk_delete/`, {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error("Failed to bulk delete cards");
}
