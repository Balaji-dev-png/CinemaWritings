"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Minus, Send, Film, ChevronRight, RotateCcw } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

// ─── Full Knowledge Base ───────────────────────────────────────────────────
interface KBEntry {
  keywords: string[];
  answer: string;
  actions?: { label: string; path: string }[];
}

const KNOWLEDGE_BASE: KBEntry[] = [
  {
    keywords: ["script", "new script", "create script", "start writing", "screenplay", "create", "new"],
    answer: "To create a new screenplay:\n\n1. Go to the **Dashboard**\n2. Click **New Script** (gold button, top right)\n3. Give it a title and start writing immediately\n\nThe editor opens with a full WGA-standard format — scene headings, action, dialogue, and transitions all auto-formatted.",
    actions: [{ label: "Go to Dashboard", path: "/" }],
  },
  {
    keywords: ["format", "scene heading", "action", "dialogue", "character", "parenthetical", "transition", "element", "slugline", "wga"],
    answer: "CinemaWritings uses **WGA-standard screenplay formatting**. Use the element selector in the toolbar:\n\n• **Scene Heading** — INT./EXT. LOCATION - TIME\n• **Action** — description of the scene\n• **Character** — speaker name (centered, uppercase)\n• **Dialogue** — what the character says\n• **Parenthetical** — (beat), (to John), (whispers)\n• **Transition** — FADE IN:, CUT TO:, SMASH CUT:\n\nPress **Tab** to cycle between element types.",
  },
  {
    keywords: ["editor", "writing", "tiptap", "edit", "type", "keyboard", "align", "alignment", "image", "picture"],
    answer: "The **Screenplay Editor** features:\n\n• WGA-compliant auto-formatting with Tiptap\n• Live word / page count\n• Font, paper color, text color, and alignment customization in the header\n• Image insertion (drag-and-drop or click the image icon)\n• Dark mode toggle\n• Auto-save on every keystroke\n• Compare versions side-by-side\n• Director's Suite shortcut in header\n• Storyboard shortcut from Dashboard",
    actions: [{ label: "Open Editor", path: "/editor" }],
  },
  {
    keywords: ["export", "pdf", "download", "print", "pitch deck", "shot list"],
    answer: "CinemaWritings has **three export formats**:\n\n• **Screenplay PDF** — click the Export button in the editor header. Standard WGA-formatted PDF with proper margins.\n• **Pitch Deck PDF** — from the Director's Suite, click Export. Exports your entire visual canvas as a landscape Pitch Deck.\n• **Shot List** — from the Storyboard page, click Export Shot List. Exports a formatted shot list for your crew.\n\nAll exports are client-side — no upload required.",
  },
  {
    keywords: ["storyboard", "shot", "scene card", "frame", "visual", "board"],
    answer: "The **Storyboard Suite** lets you visually plan every shot:\n\n• **Add shots** — click 'Add Shot' to create scene cards\n• **Drag to reorder** — drag any card to change shot order\n• **Frame aspect ratio** — toggle between 16:9, 2.39:1, 4:3, 1.85:1\n• **Click a card** to edit: Shot Number, Scene Heading, Shot Type, Camera Movement, Lens, Technical Notes, Frame Image\n• **Bulk select** — select multiple cards to delete at once\n• **Export Shot List** — exports a formatted PDF for your crew\n\nOpen from the Dashboard by clicking the **Storyboard (layers) icon** on any script card.",
    actions: [{ label: "Go to Dashboard", path: "/" }],
  },
  {
    keywords: ["director", "suite", "canvas", "workspace", "node", "infinite", "board", "moodboard"],
    answer: "The **Director's Suite** is an infinite canvas for visual development:\n\n• **Idea Cards** — freeform text brainstorming\n• **Shot Cards** — full camera specs with reference images\n• **Image Cards** — mood board images (upload or URL)\n• **Link Cards** — reference URLs with favicon preview\n\n**Navigation:**\n• Spacebar + drag to pan\n• Scroll to zoom\n• Ctrl+0 to reset, Ctrl+Shift+H to fit all\n\n**Tools:**\n• Connect Mode — wire cards together\n• Draw Mode — freehand sketches over the canvas\n• Export — generates a Pitch Deck PDF",
    actions: [{ label: "Open Director's Suite", path: "/directors-suite" }],
  },
  {
    keywords: ["idea card", "idea", "brainstorm", "note"],
    answer: "**Idea Cards** are freeform text blocks in the Director's Suite.\n\n• Click the title to rename\n• Write notes in the body\n• Pick a **Tone color** from the palette at the bottom (Midnight, Forest, Indigo, Crimson, Amber, Teal)\n• Drag to move, resize from the corner handle",
  },
  {
    keywords: ["shot card", "shot", "shot type", "camera", "spec"],
    answer: "**Shot Cards** in the Director's Suite contain:\n\n• Shot Number & type (WS, MCU, CU, ECU…)\n• Camera Movement (Dolly, Pan, Tilt, Steadicam…)\n• Lens / Focal Length\n• Description & Director Notes\n• Frame Reference image (drag-and-drop or click)\n• Reference Link",
  },
  {
    keywords: ["image card", "image", "moodboard", "photo", "reference"],
    answer: "**Image Cards** let you build a visual mood board:\n\n• Paste an image URL and press Enter\n• Or click **Upload Image** to use a local file\n• Drag an image file directly onto the card\n• Add a caption below the image\n• Hover to reveal the delete button",
  },
  {
    keywords: ["link card", "link", "url", "reference url", "website"],
    answer: "**Link Cards** display a reference URL with:\n\n• A custom label / title\n• The URL input field\n• An auto-fetched **favicon + hostname preview chip** (appears after entering a URL)\n• Click the chip to open the link in a new tab",
  },
  {
    keywords: ["connect", "wire", "connection", "connector", "connect mode"],
    answer: "**Connect Mode** lets you draw wires between cards:\n\n1. Click **Connect Mode** in the Director's Suite sidebar\n2. Click the **source card** (it glows gold)\n3. Click the **destination card** to create a wire\n4. Click any wire to delete it\n\nUse this to map story relationships, shot sequences, or scene dependencies.",
  },
  {
    keywords: ["draw", "drawing", "sketch", "freehand", "pen", "pencil", "brush", "eraser", "draw mode"],
    answer: "**Draw Mode** lets you sketch freehand over the canvas:\n\n• **Pen** — clean lines\n• **Pencil** — semi-transparent texture\n• **Brush** — thick, translucent strokes\n• **Eraser** — erase parts of your drawing\n• **Select** — click a stroke to drag it\n\nAll strokes are saved per-script and persist across sessions. Use the drawing toolbar to pick color, stroke width, undo, or clear all.",
  },
  {
    keywords: ["dolly", "zoom", "difference", "dolly vs zoom", "pan", "tilt", "crane", "handheld", "steadicam", "camera movement", "movement"],
    answer: "**Camera movement differences:**\n\n• **Dolly In/Out** — camera physically moves; depth & perspective change\n• **Zoom In/Out** — focal length changes; perspective stays flat\n• **Pan** — rotate left/right on tripod axis\n• **Tilt** — rotate up/down on tripod axis\n• **Crane** — vertical boom arm movement\n• **Handheld** — raw, energetic feel\n• **Steadicam** — smooth floating, follows action\n• **Whip Pan** — very fast pan creating blur/transition",
  },
  {
    keywords: ["shot type", "wide shot", "close up", "medium", "ecу", "mcu", "ots", "pov", "two shot", "dutch", "aerial"],
    answer: "**Shot Types:**\n\n• **EWS** — Extreme Wide Shot (establishing)\n• **WS** — Wide Shot (full body)\n• **MS** — Medium Shot (waist up)\n• **MCU** — Medium Close-Up (chest up)\n• **CU** — Close-Up (face)\n• **ECU** — Extreme Close-Up (eyes / detail)\n• **OTS** — Over-The-Shoulder\n• **POV** — Point of View\n• **Two Shot** — two subjects in frame\n• **Dutch Angle** — canted/tilted for tension\n• **Aerial** — from above",
  },
  {
    keywords: ["version", "history", "save", "draft", "snapshot", "autosave", "auto-save"],
    answer: "CinemaWritings **auto-saves every keystroke** to your backend.\n\n• **Document History** — view past saves, hover over a script card on the Dashboard and click the **clock icon**\n• **Named Versions** — inside the editor, use the version panel to create a named snapshot of your current draft\n• **Compare** — compare any two versions side-by-side to see what changed",
    actions: [{ label: "Go to Dashboard", path: "/" }],
  },
  {
    keywords: ["login", "sign in", "signup", "register", "account", "auth", "logout", "password"],
    answer: "CinemaWritings uses **Supabase Auth** (secure, server-validated).\n\n• **Sign Up** — create a free account with email + password\n• **Sign In** — your scripts are private and only visible to you\n• **Logout** — click your profile / logout button in the header\n\nAll data is isolated per user with Row-Level Security — nobody else can access your scripts.",
    actions: [{ label: "Sign In", path: "/login" }, { label: "Create Account", path: "/signup" }],
  },
  {
    keywords: ["font", "paper", "color", "style", "customize", "theme", "dark mode", "light mode", "font size", "appearance"],
    answer: "**Editor customization options:**\n\n• **Font family** — Courier Prime, Inter, Roboto, and more (in editor header)\n• **Font size** — adjust with + / – in the toolbar\n• **Paper color** — white, cream, dark (script settings)\n• **Text color** — adjust per preference\n• **Dark / Light mode** — toggle with the moon icon in the header",
  },
  {
    keywords: ["zoom", "pan", "navigate", "canvas", "fit", "reset", "keyboard shortcut"],
    answer: "**Canvas navigation in Director's Suite:**\n\n• **Scroll** — zoom in/out\n• **Spacebar + drag** — pan the canvas\n• **Middle mouse drag** — also pans\n• **Ctrl + =** / **Ctrl + –** — zoom in/out\n• **Ctrl + 0** — reset to 100%\n• **Ctrl + Shift + H** — fit all cards in view\n• **Fit icon** (toolbar) — fit to content\n• **Home icon** (toolbar) — reset canvas",
  },
  {
    keywords: ["github", "source", "open source", "code", "repo", "repository"],
    answer: "CinemaWritings is **open source** on GitHub!\n\nYou can star the repo, report issues, or contribute features. The codebase uses Next.js 16 + TypeScript + Tailwind CSS on the frontend, and Django REST Framework on the backend.",
    actions: [{ label: "View on GitHub", path: "https://github.com/Balaji-dev-png/CinemaWritings" }],
  },
  {
    keywords: ["copyright", "author name", "written by", "credit", "author credit", "name copyright"],
    answer: "The **copyright line** on your title page is automatically generated from the **Author Name** you type in the \"Written by\" field.\n\n• Type your name in the author field on the title page\n• The copyright at the bottom-right updates instantly to **© [year] [Your Name]**\n• You can also click the copyright directly to type a custom value\n• Changing the author name always resets the copyright to match",
  },
  {
    keywords: ["title page", "title", "metadata", "written by", "logline", "synopsis", "personal info", "contact", "align title page"],
    answer: "The **Title Page** is the first page of your screenplay and contains:\n\n• **Script Title** — click to edit inline\n• **Written by** prefix — editable (e.g. \"story by\", \"based on\")\n• **Author Name** — your name; also drives the copyright line\n• **Logline** — one-sentence story summary (collapsible)\n• **Synopsis** — longer overview (collapsible)\n• **Personal Information** — phone, email, address, website, agency (collapsible)\n• **Copyright** — auto-generated from author name, click to customize\n\n**Formatting**: All fields are saved automatically. Red squiggly lines are disabled for a cleaner look. You can also align the title, author, and copyright text using the alignment buttons in the top header!",
  },
  {
    keywords: ["sign up", "signup", "full name", "name", "register", "create account", "account name"],
    answer: "When you **create a CinemaWritings account**, you provide:\n\n1. **Full Name** — used as your display name and in the account menu\n2. **Email** — your login email\n3. **Password** — minimum 8 characters\n\nYour name is stored securely and shown in your profile menu at the top right.",
    actions: [{ label: "Create Account", path: "/signup" }],
  },
  {
    keywords: ["help", "how", "what", "feature", "features", "do", "can you", "guide", "tutorial"],
    answer: "I'm your **CinemaWritings Lead Producer** — here to guide you through every feature!\n\nHere's what I know about:\n\n• **Screenplay Editor** — WGA format, auto-save, versions, alignment controls\n• **Title Page** — author name, copyright, logline, synopsis\n• **Notes Editor** — per-script & global notes with auto-save and color themes\n• **Director's Suite** — infinite canvas with Idea, Shot, Image, Link cards\n• **Storyboard** — drag-and-drop shot planning\n• **Draw Mode** — freehand sketches on the canvas\n• **Connect Mode** — wire cards together\n• **Export** — PDF, Pitch Deck, Shot List\n• **Cinematography** — shot types, camera movements explained\n• **Account & Auth** — sign up, login, data privacy\n\nJust ask me anything!",
  },
  {
    keywords: ["notes", "note editor", "notepad", "write notes", "note taking", "my notes", "per-script notes", "global notes", "note color", "pin note"],
    answer: "**Notes Editor** lets you keep a personal notepad alongside your screenplay:\n\n• **Open per-script notes** — click the **Book icon** (📖) in the Editor, Director's Suite, or Storyboard header — takes you to notes for that specific script\n• **Open global notes** — click **My Notes** button on the Dashboard home page\n• **Create** — click 'New Note' in the sidebar\n• **Auto-save** — changes save automatically every 800ms\n• **Pin notes** — click the pin icon to keep important notes at the top\n• **Colors** — choose from 6 themes: Ink, Forest, Navy, Wine, Amber, Slate\n• **Search** — filter notes by title or content\n• **Django-backed** — all notes are private and stored securely on the backend",
    actions: [{ label: "My Notes", path: "/notes" }],
  },
  {
    keywords: ["focus mode", "focus", "distraction free", "candle", "flame", "candle flame", "writing mode", "fullscreen"],
    answer: "**Focus Mode** creates a cinematic, distraction-free writing space:\n\n• Press the **Eye icon** in the editor header, or use **Ctrl+Shift+F** to toggle\n• The toolbar and sidebars disappear — only your script remains\n• A **🕯 flickering candle** appears in the bottom-right corner to set the mood\n• The candle has a realistic animated flame with ambient glow and wax drips\n• Press **Exit Focus** (top-right) or **Ctrl+Shift+F** to return to normal",
  },
];


interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
  actions?: { label: string; path: string }[];
}

function findAnswer(query: string): KBEntry {
  const lower = query.toLowerCase();
  let bestMatch = KNOWLEDGE_BASE[KNOWLEDGE_BASE.length - 1];
  let bestScore = 0;
  for (const entry of KNOWLEDGE_BASE) {
    const score = entry.keywords.reduce((s, kw) =>
      lower.includes(kw.toLowerCase()) ? s + kw.length * 2 : s, 0
    );
    if (score > bestScore) { bestScore = score; bestMatch = entry; }
  }
  return bestMatch;
}

function renderMarkdown(text: string): React.ReactNode[] {
  return text.split("\n").map((line, i, arr) => {
    const parts = line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
      j % 2 === 1 ? <strong key={j} style={{ color: "#c9a84c" }}>{part}</strong> : part
    );
    return <span key={i} className="block">{parts}{i < arr.length - 1 && <br />}</span>;
  });
}

function ChatMessage({ msg, onNavigate }: { msg: Message; onNavigate: (path: string) => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-3 py-2.5 text-xs leading-relaxed ${msg.role === "user" ? "rounded-br-md" : "rounded-bl-md"}`}
        style={{
          background: msg.role === "user" ? "linear-gradient(135deg,#c9a84c,#a8862e)" : "rgba(255,255,255,0.06)",
          color: msg.role === "user" ? "#0d0d0d" : "#e2e8f0",
          border: msg.role === "bot" ? "1px solid rgba(255,255,255,0.08)" : undefined,
        }}
      >
        <div className="space-y-0.5">{renderMarkdown(msg.text)}</div>
        {msg.actions && msg.actions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {msg.actions.map(a => (
              <button key={a.path + a.label} onClick={() => onNavigate(a.path)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors"
                style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.25)" }}>
                {a.label} <ChevronRight className="w-2.5 h-2.5" />
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

const QUICK_REPLIES = ["Screenplay format", "Title page", "Notes", "Focus Mode", "Storyboard", "Director's Suite", "Export PDF", "Shot types"];

export function ChatbotWidget() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([{
    id: "welcome",
    role: "bot",
    text: "Hey! I'm your **CinemaWritings Lead Producer**. I know every feature of this app — formatting, storyboards, Director's Suite, exports, cinematography, and more.\n\nWhat can I help you with?",
    actions: [{ label: "Show all features", path: "__help" }],
  }]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  const pageContext = pathname?.includes("storyboard") ? "Storyboard"
    : pathname?.includes("director") ? "Director's Suite"
    : pathname?.includes("notes") ? "Notes"
    : pathname?.includes("editor") ? "Editor"
    : "Dashboard";

  useEffect(() => {
    if (open && !minimized) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, minimized]);

  // Close bot when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside, true);
    return () => document.removeEventListener("mousedown", handleClickOutside, true);
  }, [open]);

  const resolveActionPath = useCallback((path: string) => {
    if (path === "__help") return path;
    if (path.startsWith("http")) return path;
    
    // Extract ID if we are on any script page
    let currentId = null;
    if (pathname) {
      const match = pathname.match(/\/(?:editor|directors-suite|storyboard|notes)\/([^\/]+)/);
      if (match) currentId = match[1];
    }
    
    if (currentId) {
      if (path === "/directors-suite") return `/directors-suite/${currentId}`;
      if (path === "/storyboard") return `/directors-suite/${currentId}?tab=storyboard`;
      if (path === "/editor") return `/editor/${currentId}`;
      if (path === "/notes") return `/notes/${currentId}`;
    }
    
    return path;
  }, [pathname]);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    setTimeout(() => {
      const entry = findAnswer(text);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        text: entry.answer,
        actions: entry.actions?.map(a => ({ ...a, path: resolveActionPath(a.path) })),
      };
      setMessages(prev => [...prev, botMsg]);
    }, 280);
  }, [resolveActionPath]);

  const handleNavigate = useCallback((path: string) => {
    if (path === "__help") { sendMessage("What features does CinemaWritings have?"); return; }
    if (path.startsWith("http")) { window.open(path, "_blank", "noopener noreferrer"); return; }
    if (path === "/directors-suite" || path === "/storyboard" || path === "/editor") {
        sendMessage("You need to open a script from the dashboard first to access this suite.");
        return;
    }
    sendMessage("Opening... ⏳");
    // Small timeout to allow the message to render before router blocks the main thread
    setTimeout(() => {
      router.push(path);
      setOpen(false);
    }, 100);
  }, [router, sendMessage]);

  const resetChat = () => {
    setMessages([{
      id: "welcome2",
      role: "bot",
      text: "Chat reset! Ask me anything about CinemaWritings.",
    }]);
  };

  const isLeftAligned = pathname?.includes("/editor/");

  return (
    <motion.div
      ref={widgetRef}
      drag
      dragMomentum={false}
      style={{
        position: "fixed",
        bottom: "5rem",
        left: isLeftAligned ? "1.5rem" : undefined,
        right: !isLeftAligned ? "1.5rem" : undefined,
        zIndex: 99999,
      }}
      className={`flex flex-col-reverse ${isLeftAligned ? "items-start" : "items-end"} gap-4`}
    >
      {/* FAB — Drag Handle */}
      <motion.button
        id="chatbot-fab"
        onClick={() => { setOpen(v => !v); setMinimized(false); }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="w-13 h-13 rounded-full flex items-center justify-center shadow-2xl shrink-0 cursor-grab active:cursor-grabbing"
        style={{
          width: 52,
          height: 52,
          background: open ? "rgba(201,168,76,0.95)" : "linear-gradient(135deg,#c9a84c,#a8862e)",
          boxShadow: "0 8px 32px rgba(201,168,76,0.3), 0 2px 8px rgba(0,0,0,0.5)",
          pointerEvents: "auto",
        }}
        aria-label="Open CinemaWritings assistant"
      >
        <AnimatePresence mode="wait">
          {open
            ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><X className="w-5 h-5 text-black dark:text-white" /></motion.div>
            : <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}><Film className="w-5 h-5 text-black dark:text-white" /></motion.div>
          }
        </AnimatePresence>
      </motion.button>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="chatbot-window"
            onPointerDownCapture={(e) => e.stopPropagation()} // Prevent dragging from the window
            initial={{ opacity: 0, y: 20, scale: 0.95, originX: isLeftAligned ? 0 : 1, originY: 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="rounded-2xl overflow-hidden flex flex-col shrink-0"
            style={{
              width: 360,
              height: minimized ? "auto" : 520,
              background: "rgba(10,10,18,0.97)",
              border: "1px solid rgba(201,168,76,0.2)",
              boxShadow: "0 24px 64px -8px rgba(0,0,0,0.8), 0 0 0 0.5px rgba(201,168,76,0.08)",
              backdropFilter: "blur(20px)",
              pointerEvents: "auto",
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.3)" }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#c9a84c,#a8862e)" }}>
                <Film className="w-3.5 h-3.5 text-black" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold" style={{ color: "#c9a84c" }}>Lead Producer</p>
                <p className="text-[10px] text-zinc-500">CinemaWritings Assistant · {pageContext}</p>
              </div>
              <button onClick={resetChat} className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 transition-colors" title="Reset conversation"><RotateCcw className="w-3.5 h-3.5" /></button>
              <button onClick={() => setMinimized(v => !v)} className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 transition-colors" title="Minimize"><Minus className="w-3.5 h-3.5" /></button>
            </div>

            <AnimatePresence>
              {!minimized && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex flex-col flex-1 overflow-hidden">
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 suite-scrollbar">
                    {messages.map(msg => <ChatMessage key={msg.id} msg={msg} onNavigate={handleNavigate} />)}
                    <div ref={bottomRef} />
                  </div>

                  {/* Quick replies */}
                  <div className="px-3 py-2 flex gap-1.5 overflow-x-auto suite-scrollbar shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    {QUICK_REPLIES.map(s => (
                      <button key={s} onClick={() => sendMessage(s)}
                        className="px-2 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-colors shrink-0"
                        style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.06)" }}>
                        {s}
                      </button>
                    ))}
                  </div>

                  {/* Input */}
                  <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
                    className="flex items-center gap-2 px-3 py-2.5 shrink-0"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.2)" }}>
                    <input
                      type="text"
                      className="flex-1 bg-transparent text-xs text-zinc-200 outline-none placeholder:text-zinc-600"
                      placeholder="Ask about any feature..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                    />
                    <button type="submit" disabled={!input.trim()}
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
                      style={{ background: "linear-gradient(135deg,#c9a84c,#a8862e)" }}>
                      <Send className="w-3.5 h-3.5 text-black" />
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
