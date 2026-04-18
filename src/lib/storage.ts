import { v4 as uuidv4 } from "uuid";

export interface HistoryEvent {
  action: "CREATED" | "TITLE_CHANGED" | "CONTENT_UPDATED" | "VERSION_SAVED" | "VERSION_RESTORED";
  timestamp: number;
  details?: string;
}

export interface ScriptMeta {
  author: string;
  contact: string;
  logline?: string;
  synopsis?: string;
}

export interface ScriptVersion {
  name: string;
  content: string;
  timestamp: number;
}

export interface Script {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  historyList: HistoryEvent[];
  meta?: ScriptMeta;
  versions?: ScriptVersion[];
  tags?: string[];
  color?: string;
}

const STORAGE_KEY = "vibewriting_scripts";

export const getScripts = (): Script[] => {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveScripts = (scripts: Script[]) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scripts));
  }
};

export const getScriptById = (id: string): Script | undefined => {
  return getScripts().find((s) => s.id === id);
};

export const createScript = (): Script => {
  const newScript: Script = {
    id: uuidv4(),
    title: "Untitled Script",
    content: `<p class="scene-heading">INT. NEW SCENE - DAY</p><p class="action"></p>`,
    updatedAt: Date.now(),
    historyList: [
      { action: "CREATED", timestamp: Date.now(), details: "Script created" },
    ],
    meta: { author: "", contact: "", logline: "", synopsis: "" },
    versions: [],
    tags: [],
  };
  const scripts = getScripts();
  saveScripts([newScript, ...scripts]);
  return newScript;
};

export const updateScript = (id: string, updates: Partial<Script>) => {
  const scripts = getScripts();
  const index = scripts.findIndex((s) => s.id === id);

  if (index !== -1) {
    const existing = scripts[index];
    const now = Date.now();
    const newHistory = [...(existing.historyList || [])];

    // Throttle content updates to once per 10 minutes
    if (updates.content !== undefined && updates.content !== existing.content) {
      const last = newHistory
        .filter((h) => h.action === "CONTENT_UPDATED")
        .sort((a, b) => b.timestamp - a.timestamp)[0];
      if (!last || now - last.timestamp > 600000) {
        newHistory.push({ action: "CONTENT_UPDATED", timestamp: now, details: "Edit session recorded" });
      }
    }

    if (updates.title !== undefined && updates.title !== existing.title) {
      newHistory.push({ action: "TITLE_CHANGED", timestamp: now, details: `Title → "${updates.title}"` });
    }

    scripts[index] = { ...existing, ...updates, updatedAt: now, historyList: newHistory };
    saveScripts(scripts);
  }
};

export const deleteScript = (id: string) => {
  saveScripts(getScripts().filter((s) => s.id !== id));
};

/* ─── Version Management ─── */
export const saveVersion = (id: string, name: string): boolean => {
  const scripts = getScripts();
  const index = scripts.findIndex((s) => s.id === id);
  if (index === -1) return false;

  const script = scripts[index];
  const versions = [...(script.versions || [])];
  versions.push({ name, content: script.content, timestamp: Date.now() });

  const history = [...script.historyList, {
    action: "VERSION_SAVED" as const,
    timestamp: Date.now(),
    details: `Saved version: "${name}"`,
  }];

  scripts[index] = { ...script, versions, historyList: history, updatedAt: Date.now() };
  saveScripts(scripts);
  return true;
};

export const restoreVersion = (id: string, versionIndex: number): string | null => {
  const scripts = getScripts();
  const index = scripts.findIndex((s) => s.id === id);
  if (index === -1) return null;

  const script = scripts[index];
  const version = script.versions?.[versionIndex];
  if (!version) return null;

  const history = [...script.historyList, {
    action: "VERSION_RESTORED" as const,
    timestamp: Date.now(),
    details: `Restored version: "${version.name}"`,
  }];

  scripts[index] = { ...script, content: version.content, historyList: history, updatedAt: Date.now() };
  saveScripts(scripts);
  return version.content;
};

/* ─── Fountain Export ─── */
export const exportToFountain = (html: string): string => {
  const div = document.createElement("div");
  div.innerHTML = html;
  const lines: string[] = [];

  div.querySelectorAll("p").forEach((p) => {
    const text = p.textContent?.trim() || "";
    if (!text && !p.className) { lines.push(""); return; }

    const cls = p.className;
    if (cls.includes("scene-heading")) {
      lines.push("", text.toUpperCase(), "");
    } else if (cls.includes("action")) {
      lines.push(text, "");
    } else if (cls.includes("character")) {
      lines.push("", text.toUpperCase());
    } else if (cls.includes("parenthetical")) {
      lines.push(text.startsWith("(") ? text : `(${text})`);
    } else if (cls.includes("dialogue")) {
      lines.push(text, "");
    } else if (cls.includes("transition")) {
      lines.push("", `> ${text.toUpperCase()}`, "");
    } else if (cls.includes("shot")) {
      lines.push("", text.toUpperCase(), "");
    } else {
      lines.push(text, "");
    }
  });

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
};

/* ─── Fountain Import ─── */
export const importFromFountain = (fountain: string): string => {
  const lines = fountain.split("\n");
  const html: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) continue;

    // Scene heading
    if (/^(INT\.|EXT\.|INT\.\/EXT\.)\s/i.test(trimmed)) {
      html.push(`<p class="scene-heading">${trimmed}</p>`);
    }
    // Transition (starts with > or ends with :)
    else if (trimmed.startsWith(">") || (trimmed === trimmed.toUpperCase() && trimmed.endsWith(":"))) {
      html.push(`<p class="transition">${trimmed.replace(/^>\s*/, "")}</p>`);
    }
    // Parenthetical
    else if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
      html.push(`<p class="parenthetical">${trimmed}</p>`);
    }
    // Character (all caps, not too long, followed by dialogue)
    else if (trimmed === trimmed.toUpperCase() && trimmed.length < 40 && /^[A-Z]/.test(trimmed)) {
      html.push(`<p class="character">${trimmed}</p>`);
      // Next non-empty line is likely dialogue
      let j = i + 1;
      while (j < lines.length) {
        const next = lines[j].trim();
        if (!next) break;
        if (next.startsWith("(") && next.endsWith(")")) {
          html.push(`<p class="parenthetical">${next}</p>`);
        } else {
          html.push(`<p class="dialogue">${next}</p>`);
        }
        j++;
      }
      i = j;
    }
    // Default: action
    else {
      html.push(`<p class="action">${trimmed}</p>`);
    }
  }

  return html.join("");
};
