import { supabase } from "./supabase";

export interface HistoryEvent {
  action:
    | "CREATED"
    | "TITLE_CHANGED"
    | "CONTENT_UPDATED"
    | "VERSION_SAVED"
    | "VERSION_RESTORED";
  timestamp: number;
  details?: string;
}

export interface ScriptMeta {
  author: string;
  contact: string;
  logline?: string;
  synopsis?: string;
  writtenByPrefix?: string;
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
  paperColor?: string;
  fontFamily?: string;
  textColor?: string;
  fontSize?: number;
}

/* ─── Data Access ─── */

export const getScripts = async (): Promise<Script[]> => {
  try {
    const { data, error } = await supabase
      .from("scripts")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((s: any) => {
      const settingsRaw = typeof window !== 'undefined' ? localStorage.getItem(`script_settings_${s.id}`) : null;
      const settings = settingsRaw ? JSON.parse(settingsRaw) : {};
      return {
        id: s.id,
        title: s.title,
        content: "",
        updatedAt: new Date(s.updated_at).getTime(),
        historyList: [],
        tags: s.tags || [],
        paperColor: settings.paperColor || "",
        fontFamily: settings.fontFamily || "Courier Prime",
        textColor: settings.textColor || "",
        fontSize: settings.fontSize || 12,
      };
    });
  } catch (e: any) {
    console.error(
      "Supabase getScripts failed:",
      e.message || JSON.stringify(e) || e,
    );
    return [];
  }
};

export const getScriptById = async (
  id: string,
): Promise<Script | undefined> => {
  try {
    const { data: s, error } = await supabase
      .from("scripts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    const script: Script = {
      id: s.id,
      title: s.title,
      content: s.content,
      updatedAt: new Date(s.updated_at).getTime(),
      historyList: (s.history || []).map((h: any) => ({
        action: h.action,
        timestamp: new Date(h.timestamp).getTime(),
        details: h.details,
      })),
      meta: {
        author: s.author || "",
        contact: s.contact || "",
        logline: s.logline || "",
        synopsis: s.synopsis || "",
        writtenByPrefix: s.written_by_prefix || "written by",
      },
      versions: (s.versions || []).map((v: any) => ({
        name: v.name,
        content: v.content_snapshot,
        timestamp: new Date(v.created_at).getTime(),
      })),
      tags: s.tags || [],
    };
    
    if (typeof window !== 'undefined') {
      const settingsRaw = localStorage.getItem(`script_settings_${s.id}`);
      if (settingsRaw) {
        const settings = JSON.parse(settingsRaw);
        script.paperColor = settings.paperColor || "";
        script.fontFamily = settings.fontFamily || "Courier Prime";
        script.textColor = settings.textColor || "";
        script.fontSize = settings.fontSize || 12;
      }
      
      const versionsRaw = localStorage.getItem(`script_versions_${s.id}`);
      if (versionsRaw) {
        try {
          const localVersions = JSON.parse(versionsRaw);
          script.versions = [...(script.versions || []), ...localVersions];
        } catch (e) {}
      }
    }
    
    return script;
  } catch (e: any) {
    console.error(
      "Supabase getScriptById failed:",
      e.message || JSON.stringify(e) || e,
    );
    return undefined;
  }
};

export const createScript = async (
  title: string = "Untitled Script",
): Promise<Script> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const content = `<p class="scene-heading">INT. NEW SCENE - DAY</p><p class="action"></p>`;

  const { data: s, error } = await supabase
    .from("scripts")
    .insert([
      {
        title,
        content,
        user_id: user.id,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  return {
    id: s.id,
    title: s.title,
    content: s.content,
    updatedAt: new Date(s.updated_at).getTime(),
    historyList: [],
  };
};

// Debounce helper for content updates
let updateTimeout: NodeJS.Timeout | null = null;

export const updateScript = async (id: string, updates: Partial<Script>) => {
  const payload: any = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.content !== undefined) payload.content = updates.content;
  if (updates.meta) {
    if (updates.meta.author !== undefined) payload.author = updates.meta.author;
    if (updates.meta.contact !== undefined)
      payload.contact = updates.meta.contact;
    if (updates.meta.logline !== undefined)
      payload.logline = updates.meta.logline;
    if (updates.meta.synopsis !== undefined)
      payload.synopsis = updates.meta.synopsis;
    if (updates.meta.writtenByPrefix !== undefined)
      payload.written_by_prefix = updates.meta.writtenByPrefix;
  }
  if (updates.tags !== undefined) payload.tags = updates.tags;

  // Handle local storage for styling settings since schema doesn't support them
  if (
    updates.paperColor !== undefined ||
    updates.fontFamily !== undefined ||
    updates.textColor !== undefined ||
    updates.fontSize !== undefined
  ) {
    if (typeof window !== "undefined") {
      const existingRaw = localStorage.getItem(`script_settings_${id}`);
      const existing = existingRaw ? JSON.parse(existingRaw) : {};
      
      const newSettings = {
        ...existing,
        ...(updates.paperColor !== undefined && { paperColor: updates.paperColor }),
        ...(updates.fontFamily !== undefined && { fontFamily: updates.fontFamily }),
        ...(updates.textColor !== undefined && { textColor: updates.textColor }),
        ...(updates.fontSize !== undefined && { fontSize: updates.fontSize }),
      };
      
      localStorage.setItem(`script_settings_${id}`, JSON.stringify(newSettings));
    }
  }

  if (Object.keys(payload).length === 0) return;

  if (updateTimeout) clearTimeout(updateTimeout);
  updateTimeout = setTimeout(async () => {
    try {
      // Use getUser() — server-validated — never getSession() alone
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        // Not logging the error detail to avoid leaking session info
        return;
      }

      const { error } = await supabase
        .from("scripts")
        .update(payload)
        .eq("id", id);

      if (error) {
        console.error("Supabase updateScript error details:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          status: (error as any).status,
        });
        throw error;
      }
    } catch (e) {
      console.error("Supabase updateScript failed catch:", e);
    }
  }, 1000);
};

export const deleteScript = async (id: string) => {
  try {
    const { error } = await supabase.from("scripts").delete().eq("id", id);

    if (error) throw error;
  } catch (e) {
    console.error("Supabase deleteScript failed", e);
  }
};

/* ─── Version Management ─── */
export const saveVersion = async (
  id: string,
  name: string,
): Promise<boolean> => {
  try {
    const script = await getScriptById(id);
    if (!script) throw new Error("Script not found");

    if (typeof window !== "undefined") {
      const existingRaw = localStorage.getItem(`script_versions_${id}`);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      
      const newVersion = {
        name,
        content: script.content,
        timestamp: Date.now(),
      };
      
      existing.push(newVersion);
      localStorage.setItem(`script_versions_${id}`, JSON.stringify(existing));
      return true;
    }
    return false;
  } catch (e) {
    console.error("Local saveVersion failed", e);
    return false;
  }
};

export const restoreVersion = async (
  id: string,
  versionIdOrIndex: string | number,
): Promise<string | null> => {
  try {
    if (typeof window !== "undefined") {
      const existingRaw = localStorage.getItem(`script_versions_${id}`);
      if (!existingRaw) return null;
      
      const versions = JSON.parse(existingRaw);
      
      // If versionIdOrIndex is a number, we treat it as an index. Otherwise, find by name.
      let targetVersion;
      if (typeof versionIdOrIndex === "number") {
        targetVersion = versions[versionIdOrIndex];
      } else {
        targetVersion = versions.find((v: any) => v.name === versionIdOrIndex || v.timestamp.toString() === versionIdOrIndex);
      }
      
      if (targetVersion) {
        // Save restored content to backend
        await updateScript(id, { content: targetVersion.content });
        return targetVersion.content;
      }
    }
    return null;
  } catch (e) {
    console.error("Local restoreVersion failed", e);
    return null;
  }
};

/* ─── Fountain Export/Import (Unchanged) ─── */
export const exportToFountain = (
  html: string,
  meta?: ScriptMeta,
  title?: string,
): string => {
  const div = document.createElement("div");
  // Strip pageNode wrappers before processing — Fountain format doesn't have pages
  const strippedHtml = html
    .replace(/<div[^>]*data-type="pageNode"[^>]*>/gi, "")
    .replace(/<\/div>/gi, "");
  div.innerHTML = strippedHtml;
  const lines: string[] = [];

  if (title) lines.push(`Title: ${title}`);
  if (meta?.author) lines.push(`Author: ${meta.author}`);
  if (meta?.contact)
    lines.push(`Contact: ${meta.contact.replace(/\n/g, " | ")}`);
  if (meta?.logline) lines.push(`Logline: ${meta.logline}`);
  if (meta?.synopsis)
    lines.push(`Synopsis: ${meta.synopsis.replace(/\n/g, " ")}`);

  lines.push("");
  lines.push("=".repeat(60));
  lines.push("");

  div.querySelectorAll("p").forEach((p) => {
    const text = p.textContent?.trim() || "";
    if (!text && !p.className) {
      lines.push("");
      return;
    }

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

  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

export const importFromFountain = (fountain: string): string => {
  const lines = fountain.split("\n");
  const html: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) continue;

    if (/^(INT\.|EXT\.|INT\.\/EXT\.)\s/i.test(trimmed)) {
      html.push(`<p class="scene-heading">${trimmed}</p>`);
    } else if (
      trimmed.startsWith(">") ||
      (trimmed === trimmed.toUpperCase() && trimmed.endsWith(":"))
    ) {
      html.push(`<p class="transition">${trimmed.replace(/^>\s*/, "")}</p>`);
    } else if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
      html.push(`<p class="parenthetical">${trimmed}</p>`);
    } else if (
      trimmed === trimmed.toUpperCase() &&
      trimmed.length < 40 &&
      /^[A-Z]/.test(trimmed)
    ) {
      html.push(`<p class="character">${trimmed}</p>`);
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
    } else {
      html.push(`<p class="action">${trimmed}</p>`);
    }
  }

  return `<div data-type="pageNode">${html.join("")}</div>`;
};
