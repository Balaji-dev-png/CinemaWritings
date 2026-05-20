/**
 * Director's Suite — Supabase persistence layer.
 *
 * Replaces the Django /workspace/ API calls with direct Supabase queries.
 * Tables: canvas_state, workspace_assets (RLS: user_id = auth.uid())
 */

import { supabase } from "./supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkspaceAssetRow {
  id?: string;
  script_id: string;
  user_id: string;
  asset_id: string;
  asset_type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z_index: number;
  content: Record<string, unknown>;
}

export interface CanvasStateRow {
  id?: string;
  script_id: string;
  user_id: string;
  edges: unknown[];
  viewport: Record<string, unknown>;
  drawing_strokes: unknown[];
}

export interface WorkspaceData {
  assets: WorkspaceAssetRow[];
  edges: unknown[];
  viewport: { zoom: number; pan: { x: number; y: number } } | null;
  drawing_strokes: unknown[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function supabaseGetWorkspace(scriptId: string): Promise<WorkspaceData> {
  const userId = await getUserId();
  if (!userId) throw new Error("Not authenticated");

  const [assetsResult, canvasResult] = await Promise.all([
    supabase
      .from("workspace_assets")
      .select("*")
      .eq("script_id", scriptId)
      .eq("user_id", userId)
      .order("z_index", { ascending: true }),
    supabase
      .from("canvas_state")
      .select("*")
      .eq("script_id", scriptId)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (assetsResult.error) throw assetsResult.error;
  if (canvasResult.error) throw canvasResult.error;

  const canvas = canvasResult.data;

  return {
    assets: assetsResult.data ?? [],
    edges: (canvas?.edges as unknown[]) ?? [],
    viewport:
      canvas?.viewport && Object.keys(canvas.viewport).length > 0
        ? (canvas.viewport as { zoom: number; pan: { x: number; y: number } })
        : null,
    drawing_strokes: (canvas?.drawing_strokes as unknown[]) ?? [],
  };
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Full sync: replaces all assets for this script, and upserts canvas state.
 */
export async function supabaseSyncWorkspace(
  scriptId: string,
  payload: {
    assets?: WorkspaceAssetRow[];
    edges?: unknown[];
    viewport?: Record<string, unknown> | null;
    drawing_strokes?: unknown[];
  }
): Promise<void> {
  const userId = await getUserId();
  if (!userId) throw new Error("Not authenticated");

  const ops: Promise<unknown>[] = [];

  // ── Assets: delete all then re-insert ────────────────────────────────────
  if (payload.assets !== undefined) {
    const deleteOp = supabase
      .from("workspace_assets")
      .delete()
      .eq("script_id", scriptId)
      .eq("user_id", userId);

    const rows: WorkspaceAssetRow[] = payload.assets.map((a, i) => ({
      script_id: scriptId,
      user_id: userId,
      asset_id: a.asset_id || a.id || crypto.randomUUID(),
      asset_type: a.asset_type,
      x: a.x,
      y: a.y,
      width: a.width,
      height: a.height,
      z_index: i,
      content: a.content ?? {},
    }));

    ops.push(
      deleteOp.then(() =>
        rows.length > 0
          ? supabase.from("workspace_assets").insert(rows)
          : Promise.resolve()
      )
    );
  }

  // ── Canvas state: upsert ─────────────────────────────────────────────────
  const canvasPayload: Partial<CanvasStateRow> & { script_id: string; user_id: string } = {
    script_id: scriptId,
    user_id: userId,
  };

  if (payload.edges !== undefined) canvasPayload.edges = payload.edges;
  if (payload.viewport !== undefined)
    canvasPayload.viewport = payload.viewport ?? {};
  if (payload.drawing_strokes !== undefined)
    canvasPayload.drawing_strokes = payload.drawing_strokes;

  ops.push(
    supabase
      .from("canvas_state")
      .upsert(canvasPayload, { onConflict: "script_id,user_id" })
  );

  const results = await Promise.allSettled(ops);
  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    console.error("[suite-supabase] Sync errors:", failed);
  }
}
