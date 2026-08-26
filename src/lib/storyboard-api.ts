/**
 * Storyboard API — Supabase implementation.
 *
 * All data is persisted directly to Supabase tables (no Django backend needed):
 *   - storyboards   : one row per script per user
 *   - scene_cards   : individual shot cards
 *
 * RLS policies ensure users can only access their own rows.
 */

import { supabase } from "./supabase";

// ─── Storyboard Connector Persistence ─────────────────────────────────────────

/**
 * Fetch connectors for a storyboard from the canvas_state table.
 * Uses a namespaced script_id ("sb:{scriptId}") so it doesn't collide with
 * the Director's Suite which uses the raw scriptId.
 */
export async function getStoryboardConnectors(scriptId: string): Promise<Connector[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("canvas_state")
    .select("edges")
    .eq("script_id", `sb:${scriptId}`)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[storyboard] Failed to load connectors:", error);
    return [];
  }
  return (data?.edges as Connector[]) ?? [];
}

/**
 * Persist storyboard connectors to the canvas_state table.
 */
export async function syncStoryboardConnectors(
  scriptId: string,
  connectors: Connector[]
): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase
    .from("canvas_state")
    .upsert(
      {
        script_id: `sb:${scriptId}`,
        user_id: userId,
        edges: connectors,
      },
      { onConflict: "script_id,user_id" }
    );

  if (error) {
    console.error("[storyboard] Failed to sync connectors:", error);
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

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
  x: number;
  y: number;
  width: number;
  height: number;
  aspect_ratio: string;
}

export interface Storyboard {
  /** Supabase storyboard UUID — use this for card operations */
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

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

// ─── Storyboard CRUD ─────────────────────────────────────────────────────────

/**
 * Get or create the storyboard for a script.
 * `scriptId` is the script's UUID from your scripts table.
 */
export async function getStoryboard(scriptId: string): Promise<Storyboard> {
  const userId = await getUserId();

  // Try to fetch existing
  const { data: existing, error: fetchErr } = await supabase
    .from("storyboards")
    .select("*, scene_cards(*)")
    .eq("script_id", scriptId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchErr) throw fetchErr;

  if (existing) {
    const cards = (existing.scene_cards ?? [])
      .map(normalizeCard)
      .sort((a: SceneCard, b: SceneCard) => a.order - b.order);

    // Load persisted connectors from canvas_state
    const connectors = await getStoryboardConnectors(scriptId);

    return {
      id: existing.id,
      script_title: existing.title || "Untitled",
      title: existing.title || "Storyboard",
      aspect_ratio: existing.aspect_ratio || "1.78:1",
      cards,
      connectors,
      created_at: existing.created_at,
      updated_at: existing.updated_at,
    };
  }

  // Create new storyboard
  const { data: created, error: createErr } = await supabase
    .from("storyboards")
    .insert({ script_id: scriptId, user_id: userId, title: "", aspect_ratio: "1.78:1" })
    .select()
    .single();

  if (createErr) throw createErr;

  return {
    id: created.id,
    script_title: "",
    title: "Storyboard",
    aspect_ratio: "1.78:1",
    cards: [],
    connectors: [],
    created_at: created.created_at,
    updated_at: created.updated_at,
  };
}

/**
 * Update storyboard metadata (title, aspect_ratio).
 * `scriptId` is used to look up the storyboard for this user.
 */
export async function updateStoryboard(
  scriptId: string,
  data: Partial<Storyboard>
): Promise<Storyboard> {
  const userId = await getUserId();

  const patch: Record<string, unknown> = {};
  if (data.title !== undefined) patch.title = data.title;
  if (data.aspect_ratio !== undefined) patch.aspect_ratio = data.aspect_ratio;

  const { data: updated, error } = await supabase
    .from("storyboards")
    .update(patch)
    .eq("script_id", scriptId)
    .eq("user_id", userId)
    .select("*, scene_cards(*)")
    .single();

  if (error) throw error;

  const cards = (updated.scene_cards ?? [])
    .map(normalizeCard)
    .sort((a: SceneCard, b: SceneCard) => a.order - b.order);

  return {
    id: updated.id,
    script_title: updated.title || "Untitled",
    title: updated.title || "Storyboard",
    aspect_ratio: updated.aspect_ratio || "1.78:1",
    cards,
    connectors: [],
    created_at: updated.created_at,
    updated_at: updated.updated_at,
  };
}

// ─── Scene Card CRUD ─────────────────────────────────────────────────────────

/**
 * Create a new scene card.
 * @param storyboardId — The Supabase storyboard UUID (storyboard.id)
 */
export async function createSceneCard(
  storyboardId: string,
  data: Partial<SceneCard> = {}
): Promise<SceneCard> {
  const userId = await getUserId();

  // Get current max order
  const { data: existing } = await supabase
    .from("scene_cards")
    .select("order")
    .eq("storyboard_id", storyboardId)
    .order("order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].order + 1 : 0;

  const row = {
    storyboard_id: storyboardId,
    user_id: userId,
    order: nextOrder,
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

  const { data: card, error } = await supabase
    .from("scene_cards")
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return normalizeCard(card);
}

/**
 * Update a scene card.
 * @param storyboardId — The Supabase storyboard UUID (storyboard.id)
 * @param cardId — The card UUID
 */
export async function updateSceneCard(
  storyboardId: string,
  cardId: string,
  data: Partial<SceneCard>
): Promise<SceneCard> {
  const { data: card, error } = await supabase
    .from("scene_cards")
    .update(data)
    .eq("id", cardId)
    .eq("storyboard_id", storyboardId)
    .select()
    .single();

  if (error) throw error;
  return normalizeCard(card);
}

/**
 * Delete a single scene card.
 */
export async function deleteSceneCard(
  storyboardId: string,
  cardId: string
): Promise<void> {
  const { error } = await supabase
    .from("scene_cards")
    .delete()
    .eq("id", cardId)
    .eq("storyboard_id", storyboardId);

  if (error) throw error;
}

/**
 * Reorder cards by providing an ordered array of card UUIDs.
 */
export async function reorderSceneCards(
  _storyboardId: string,
  orderedIds: string[]
): Promise<void> {
  const updates = orderedIds.map((id, index) =>
    supabase
      .from("scene_cards")
      .update({ order: index })
      .eq("id", id)
  );
  await Promise.all(updates);
}

/**
 * Bulk delete scene cards by ID.
 */
export async function bulkDeleteSceneCards(
  _storyboardId: string,
  ids: string[]
): Promise<void> {
  const { error } = await supabase
    .from("scene_cards")
    .delete()
    .in("id", ids);

  if (error) throw error;
}
