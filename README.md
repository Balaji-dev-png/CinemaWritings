# 🎬 CinemaWritings

**CinemaWritings** is a professional, browser-based screenplay editor built for writers who want industry-standard formatting without the complexity of traditional screenwriting software. Write, format, export, and version your scripts — all in one beautiful, responsive app.

**Live:** [https://cinemawritings.netlify.app](https://cinemawritings.netlify.app)

---

## ✨ Features

### Editor
- **TipTap-powered rich editor** with native bold, italic, and underline support
- **Screenplay element types** via keyboard shortcuts or the floating toolbar:
  - Scene Heading (`Ctrl+1`)
  - Action (`Ctrl+2`)
  - Character (`Ctrl+3`)
  - Dialogue (`Ctrl+4`)
  - Parenthetical (`Ctrl+5`)
  - Transition (`Ctrl+6`)
  - Shot (`Ctrl+7`)
- **Smart autocomplete** for character names, scene prefixes (`INT.` / `EXT.`), and standard transitions
- **`Ctrl+Space`** — opens the element selector menu at the cursor
- **Focus Mode** — a cinematic, distraction-free writing environment with a film-grain overlay

### Title Page
- Editable title, author, "written by" prefix, and contact block
- **Logline** and **Synopsis** fields (collapsible) — included in all exports

### Version History & Draft Comparison
- **Save named drafts** at any point
- **Restore** any previous draft with zero page flash
- **Side-by-side split-screen comparison** of any two drafts with full screenplay formatting preserved

### Exports
| Format | Description |
|---|---|
| **Download PDF** | Direct download — no print dialog. WGA-standard layout with correct character, dialogue, and transition positioning. Preserves bold, italic, underline formatting. Includes title page, logline, synopsis, and contact info. |
| **Fountain (.fountain)** | Standard Fountain plain-text format with title metadata header block |
| **Plain Text (.txt)** | Human-readable export in Fountain syntax with metadata |

### Multi-Document Dashboard
- Create, organize, and delete multiple scripts
- Script history timeline per document
- Pastel gradient card system with dark mode

### Responsive Design
- **Desktop**: renders as a physical 8.5×11 page with WGA-standard inch margins
- **Tablet**: condensed padding while preserving the page feel
- **Mobile**: flat-card layout, fluid percentage-based indents, bottom-docked formatting toolbar
- Full **dark mode** support

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2 (Turbopack) |
| Editor Core | TipTap / ProseMirror |
| Animations | Framer Motion + CSS keyframes |
| PDF Generation | jsPDF (vector text, no rasterizing) |
| Styling | Tailwind CSS v4 + custom CSS |
| Fonts | Courier Prime (editor/PDF), Poppins (UI) |
| Storage | localStorage (client-side persistence) |
| Deployment | Netlify |

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx              # Dashboard
│   ├── layout.tsx            # Root layout + fonts
│   ├── globals.css           # Global styles + screenplay CSS
│   └── editor/[id]/page.tsx  # Editor page
│
├── components/
│   ├── editor/
│   │   ├── ScriptEditor.tsx  # Main TipTap editor + toolbar
│   │   ├── TitlePage.tsx     # Title page with logline/synopsis
│   │   ├── VersionManager.tsx# Save, restore, compare drafts
│   │   ├── CompareModal.tsx  # Side-by-side draft comparison
│   │   ├── SceneNavigator.tsx# Left panel scene list
│   │   ├── ScriptAnalytics.tsx# Word/scene/page stats
│   │   └── nodes/            # TipTap custom screenplay node types
│   └── ui/
│       ├── ThemeToggle.tsx
│       └── ShortcutsPanel.tsx
│
└── lib/
    ├── storage.ts            # localStorage CRUD + Fountain export/import
    └── exportPdf.ts          # jsPDF-based PDF generation with full formatting
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+1` | Scene Heading |
| `Ctrl+2` | Action |
| `Ctrl+3` | Character |
| `Ctrl+4` | Dialogue |
| `Ctrl+5` | Parenthetical |
| `Ctrl+6` | Transition |
| `Ctrl+7` | Shot |
| `Ctrl+Space` | Open element selector menu |
| `Ctrl+B` | Bold |
| `Ctrl+I` | Italic |
| `Ctrl+U` | Underline |
| `Tab` | Accept autocomplete suggestion |
| `Escape` | Close autocomplete / exit focus mode |

---

## 📄 License

MIT
