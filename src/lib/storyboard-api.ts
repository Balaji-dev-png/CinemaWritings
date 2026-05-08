/**
 * Storyboard API client — LocalStorage implementation for Netlify production
 * This prevents the 'Failed to load storyboard' error by storing data locally
 * until a Supabase schema is finalized for storyboards.
 */

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
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  aspect_ratio?: "16:9" | "2.39:1" | "4:3" | "1.85:1";
}

export interface Storyboard {
  id: string;
  script_title: string;
  title: string;
  aspect_ratio: "16:9" | "2.39:1" | "4:3" | "1.85:1"; // default global fallback
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

const storageKey = (id: string) => `storyboard_${id}`;

export async function getStoryboard(scriptId: string): Promise<Storyboard> {
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(storageKey(scriptId));
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        parsed.cards = parsed.cards || [];
        parsed.connectors = parsed.connectors || [];
        return parsed;
      } catch (e) {
        console.error("Failed to parse storyboard from local storage", e);
      }
    }
  }
  
  const initial: Storyboard = {
    id: scriptId,
    script_title: "Untitled",
    title: "Storyboard",
    aspect_ratio: "16:9",
    cards: [],
    connectors: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  if (typeof window !== "undefined") {
    localStorage.setItem(storageKey(scriptId), JSON.stringify(initial));
  }
  
  return initial;
}

export async function updateStoryboard(scriptId: string, data: Partial<Storyboard>): Promise<Storyboard> {
  const sb = await getStoryboard(scriptId);
  const updated: Storyboard = { ...sb, ...data, updated_at: new Date().toISOString() };
  if (typeof window !== "undefined") {
    localStorage.setItem(storageKey(scriptId), JSON.stringify(updated));
  }
  return updated;
}

export async function createSceneCard(storyboardId: string, data: Partial<SceneCard> = {}): Promise<SceneCard> {
  const sb = await getStoryboard(storyboardId);
  sb.cards = sb.cards || [];
  const newCard: SceneCard = {
    id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2, 9),
    order: sb.cards.length,
    shot_number: "",
    scene_heading: "",
    shot_type: "MS",
    camera_movement: "static",
    lens: "",
    technical_notes: "",
    image_url: "",
    x: 0,
    y: 0,
    width: 320,
    height: 180,
    aspect_ratio: sb.aspect_ratio || "16:9",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...data,
  };
  sb.cards.push(newCard);
  await updateStoryboard(storyboardId, { cards: sb.cards });
  return newCard;
}

export async function updateSceneCard(storyboardId: string, cardId: string, data: Partial<SceneCard>): Promise<SceneCard> {
  const sb = await getStoryboard(storyboardId);
  const idx = sb.cards.findIndex(c => c.id === cardId);
  if (idx === -1) throw new Error("Card not found");
  
  sb.cards[idx] = { ...sb.cards[idx], ...data, updated_at: new Date().toISOString() };
  await updateStoryboard(storyboardId, { cards: sb.cards });
  return sb.cards[idx];
}

export async function deleteSceneCard(storyboardId: string, cardId: string): Promise<void> {
  const sb = await getStoryboard(storyboardId);
  sb.cards = sb.cards.filter(c => c.id !== cardId);
  await updateStoryboard(storyboardId, { cards: sb.cards });
}

export async function reorderSceneCards(storyboardId: string, orderedIds: string[]): Promise<void> {
  const sb = await getStoryboard(storyboardId);
  const cardsMap = new Map(sb.cards.map(c => [c.id, c]));
  
  sb.cards = orderedIds.map((id, index) => {
    const card = cardsMap.get(id);
    if (card) {
      card.order = index;
      return card;
    }
    return null;
  }).filter(Boolean) as SceneCard[];
  
  await updateStoryboard(storyboardId, { cards: sb.cards });
}

export async function bulkDeleteSceneCards(storyboardId: string, ids: string[]): Promise<void> {
  const sb = await getStoryboard(storyboardId);
  sb.cards = sb.cards.filter(c => !ids.includes(c.id));
  await updateStoryboard(storyboardId, { cards: sb.cards });
}
