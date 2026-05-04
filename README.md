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
| **Screenplay PDF** | **Server-side generation (WeasyPrint)** — Generates a high-resolution, WGA-standard PDF adhering to exact Hollywood margins (1.5" left bind). Captures the exact WYSIWYG state of your editor. |
| **Pitch Deck PDF** | **Server-side generation (WeasyPrint)** — Exports your Director's Suite canvas into a professional landscape 2x2 grid presentation format. |
| **Fountain (.fountain)** | Standard Fountain plain-text format with title metadata header block |
| **Plain Text (.txt)** | Human-readable export in Fountain syntax with metadata |

### Multi-Document Dashboard
- Create, organize, and delete multiple scripts
- Securely stored in the cloud via Django backend
- Script history timeline per document
- Pastel gradient card system with dark mode

### Director's Suite (Pre-Production Canvas)
- **Infinite Node-based Workspace** for moodboarding and shot listing
- **Black & White Aesthetic** with grid snapping and fluid scroll-to-zoom
- Add standard film shots, idea blocks, sticky notes, reference images, and web links
- Group select, dragging, resizing, and connection edges
- **Export to Pitch Deck PDF** for production-ready visual documents

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2 (Turbopack) |
| Editor Core | TipTap / ProseMirror |
| Backend Core | Django REST Framework (Python) |
| DB / Storage | PostgreSQL (via Django ORM) |
| PDF Generation | WeasyPrint (Server-side) / html2canvas (Client-side PNGs) |
| Styling | Tailwind CSS v4 + custom CSS |
| Deployment | Netlify (Frontend) |

---

## 🚀 Getting Started

### 1. Backend Setup (Django)
Navigate to the `backend` directory, install requirements, and run migrations:
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### 2. Frontend Setup (Next.js)
Open a new terminal in the root directory:
```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx              # Dashboard (Supabase-backed)
│   ├── login/                # Supabase Auth Login
│   ├── signup/               # Supabase Auth Signup
│   └── editor/[id]/page.tsx  # Editor page (Auto-syncs with DB)
│
├── components/
│   ├── editor/
│   │   ├── ScriptEditor.tsx  # Main editor + theme sync
│   │   └── TitlePage.tsx     # Title page with metadata
│   └── ui/
│       └── ThemeToggle.tsx   # Light/Dark mode switcher
│
└── lib/
    ├── storage.ts            # Supabase CRUD layer
    ├── auth.ts               # Supabase Auth wrappers
    └── supabase.ts           # Supabase client initialization
```

---

## ⌨️ Keyboard Shortcuts
... (rest of shortcuts same as before) ...

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
