/**
 * Storyboard API client — Django backend implementation.
 *
 * All storyboard data is now persisted to the Django backend:
 *   GET  /api/storyboards/{script_pk}/             → get or create storyboard
 *   PATCH /api/storyboards/{script_pk}/            → update title / aspect_ratio
 *   GET  /api/storyboards/{storyboard_pk}/cards/   → list cards
 *   POST /api/storyboards/{storyboard_pk}/cards/   → create card
 *   PATCH /api/storyboards/{storyboard_pk}/cards/{pk}/ → update card
 *   DELETE /api/storyboards/{storyboard_pk}/cards/{pk}/ → delete card
 *   POST /api/storyboards/{storyboard_pk}/cards/reorder/ → reorder
 *   DELETE /api/storyboards/{storyboard_pk}/cards/bulk_delete/ → bulk delete
 *
 * NOTE: getStoryboard(scriptId) returns a Storyboard whose `id` is the
 * Django storyboard UUID — NOT the scriptId. Callers must pass storyboard.id
 * to all card-level operations.
 */

import { getAccessToken, logout } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Connector {
  id: string;
  fromId: string;
  toId: string;
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
  // Spatial properties for infinite canvas
  x: number;
  y: number;
  width: number;
  height: number;
  aspect_ratio: string;
}

export interface Storyboard {
  /** Django storyboard UUID — NOT the scriptId. Use this for card operations. */
  id: string;
  script_title: string;
  title: string;
  aspect_ratio: string;
  cards: SceneCard[];
  connectors?: Connector[];
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

// ─── Fetch helper ────────────────────────────────────────────────────────────

async function sbFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    throw new Error("Session expired or the server is unavailable.");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "(no body)");
    console.error(`[storyboard-api] ${options.method || "GET"} ${path} → ${res.status}:`, text);
    throw new Error("Storyboard request failed.");
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

// ─── Storyboard CRUD ─────────────────────────────────────────────────────────

/**
 * Get or create the storyboard for a script.
 * Uses script_pk to look up (or auto-create) the storyboard.
 * Returns the storyboard with its own Django UUID as `id`.
 */
export async function getStoryboard(scriptId: string): Promise<Storyboard> {
  const data = await sbFetch<any>(`/storyboards/${scriptId}/`);
  return {
    id: data.id,
    script_title: data.script_title || "Untitled",
    title: data.title || "Storyboard",
    aspect_ratio: data.aspect_ratio || "1.78:1",
    cards: (data.cards || []).map(normalizeCard),
    connectors: [],
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

/**
 * Update storyboard metadata (title, aspect_ratio).
 * Uses the `scriptId` because the backend PATCH endpoint is keyed by script_pk.
 */
export async function updateStoryboard(
  scriptId: string,
  data: Partial<Storyboard>
): Promise<Storyboard> {
  const payload: Record<string, unknown> = {};
  if (data.title !== undefined) payload.title = data.title;
  if (data.aspect_ratio !== undefined) payload.aspect_ratio = data.aspect_ratio;
  if (data.script_title !== undefined) {
    // script_title is read-only on the backend; skip silently
  }

  const updated = await sbFetch<any>(`/storyboards/${scriptId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  return {
    id: updated.id,
    script_title: updated.script_title || "Untitled",
    title: updated.title || "Storyboard",
    aspect_ratio: updated.aspect_ratio || "1.78:1",
    cards: (updated.cards || []).map(normalizeCard),
    connectors: [],
    created_at: updated.created_at,
    updated_at: updated.updated_at,
  };
}

// ─── Scene Card CRUD ─────────────────────────────────────────────────────────

/**
 * Create a new scene card in the storyboard.
 * @param storyboardId — The Django storyboard UUID (storyboard.id)
 */
export async function createSceneCard(
  storyboardId: string,
  data: Partial<SceneCard> = {}
): Promise<SceneCard> {
  const payload = {
    shot_number: data.shot_number ?? "",
    scene_heading: data.scene_heading ?? "",
    shot_type: data.shot_type ?? "MS",
    camera_movement: data.camera_movement ?? "static",
    lens: data.lens ?? "",
    technical_notes: data.technical_notes ?? "",
    image_url: data.image_url ?? "",
    x: data.x ?? 0,
    y: data.y ?? 0,
    width: data.width ?? 320,
    height: data.height ?? 500,
    aspect_ratio: data.aspect_ratio ?? "1.78:1",
  };
  const card = await sbFetch<any>(`/storyboards/${storyboardId}/cards/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizeCard(card);
}

/**
 * Update a scene card.
 * @param storyboardId — The Django storyboard UUID (storyboard.id)
 * @param cardId — The card UUID
 */
export async function updateSceneCard(
  storyboardId: string,
  cardId: string,
  data: Partial<SceneCard>
): Promise<SceneCard> {
  const card = await sbFetch<any>(
    `/storyboards/${storyboardId}/cards/${cardId}/`,
    { method: "PATCH", body: JSON.stringify(data) }
  );
  return normalizeCard(card);
}

/**
 * Delete a single scene card.
 */
export async function deleteSceneCard(
  storyboardId: string,
  cardId: string
): Promise<void> {
  await sbFetch<void>(`/storyboards/${storyboardId}/cards/${cardId}/`, {
    method: "DELETE",
  });
}

/**
 * Reorder cards by providing an ordered array of card UUIDs.
 */
export async function reorderSceneCards(
  storyboardId: string,
  orderedIds: string[]
): Promise<void> {
  await sbFetch<void>(`/storyboards/${storyboardId}/cards/reorder/`, {
    method: "POST",
    body: JSON.stringify({ order: orderedIds }),
  });
}

/**
 * Bulk delete scene cards by ID.
 */
export async function bulkDeleteSceneCards(
  storyboardId: string,
  ids: string[]
): Promise<void> {
  await sbFetch<void>(`/storyboards/${storyboardId}/cards/bulk_delete/`, {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeCard(card: any): SceneCard {
  return {
    id: card.id,
    order: card.order ?? 0,
    shot_number: card.shot_number ?? "",
    scene_heading: card.scene_heading ?? "",
    shot_type: card.shot_type ?? "MS",
    camera_movement: card.camera_movement ?? "static",
    lens: card.lens ?? "",
    technical_notes: card.technical_notes ?? "",
    image_url: card.image_url ?? "",
    x: card.x ?? 0,
    y: card.y ?? 0,
    width: card.width ?? 320,
    height: card.height ?? 500,
    aspect_ratio: card.aspect_ratio ?? "1.78:1",
    created_at: card.created_at ?? "",
    updated_at: card.updated_at ?? "",
  };
}
