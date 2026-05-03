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
| **Download PDF** | **Client-side generation** — No backend required. Captures the exact WYSIWYG state of your editor (including Title Page and custom colors) and generates a high-resolution, WGA-standard PDF. |
| **Fountain (.fountain)** | Standard Fountain plain-text format with title metadata header block |
| **Plain Text (.txt)** | Human-readable export in Fountain syntax with metadata |

### Multi-Document Dashboard
- Create, organize, and delete multiple scripts
- Securely stored in the cloud via Supabase
- Script history timeline per document
- Pastel gradient card system with dark mode

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2 (Turbopack) |
| Editor Core | TipTap / ProseMirror |
| Backend/DB | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth |
| PDF Generation | jsPDF + html2canvas |
| Styling | Tailwind CSS v4 + custom CSS |
| Deployment | Netlify |

---

## 🚀 Getting Started

### 1. Supabase Setup
Create a `scripts` table in your Supabase project with the following SQL:

```sql
create table public.scripts (
  id uuid default gen_random_uuid() primary key,
  title text not null default 'Untitled Script',
  content text default '',
  paper_color text default '',
  font_family text default 'Courier Prime',
  text_color text default '',
  author text default '',
  contact text default '',
  logline text default '',
  synopsis text default '',
  written_by_prefix text default 'written by',
  tags jsonb default '[]'::jsonb,
  history jsonb default '[]'::jsonb,
  versions jsonb default '[]'::jsonb,
  updated_at timestamptz default now(),
  created_at timestamptz default now(),
  user_id uuid references auth.users(id) on delete cascade
);

-- Enable RLS
alter table public.scripts enable row level security;

-- Create policies (Users only see their own scripts)
create policy "Users can view their own scripts" on public.scripts for select using (auth.uid() = user_id);
create policy "Users can insert their own scripts" on public.scripts for insert with check (auth.uid() = user_id);
create policy "Users can update their own scripts" on public.scripts for update using (auth.uid() = user_id);
create policy "Users can delete their own scripts" on public.scripts for delete using (auth.uid() = user_id);
```

### 2. Local Environment
Create a `.env.local` file:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Install & Run
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
