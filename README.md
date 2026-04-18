# VibeWriting — Screenplay Editor 🎬

VibeWriting is a modern, privacy-first, professional screenwriting web application built with **Next.js** and **TipTap**. It is designed for screenwriters, directors, and hobbyists who want a distraction-free, fluid writing experience that automatically formats scripts to WGA industry standards.

![Dashboard Preview](https://github.com/Balaji-dev-png/VibeWriting/assets/123/dashboard-preview.png)
*(Replace link above with an actual screenshot of the dashboard when ready)*

## ✨ Key Features

### 🖋️ Professional Screenplay Formatting
- **Automatic WGA Auto-Formatting**: Effortlessly writes Scene Headings, Action, Characters, Dialogues, Parentheticals, and Transitions.
- **Smart Element Switching**: Use `Tab`, `Enter`, and `Shift+Tab` to seamlessly flow between character names, dialogue, and action lines just like industry-standard software (Final Draft, Arc Studio).
- **Native Autocomplete Engine**: Dynamic, context-aware suggestions. The engine "learns" your Character names and Scene Locations as you type, adding them to the suggestion dropdown magically.

### 🗂️ Organization & Navigation
- **Corkboard / Index Card View**: Visualize your entire screenplay. Drag-and-drop scene cards to reorganize your story flow instantly.
- **Scene Navigator**: A left sidebar that lets you jump to any scene with a single click.
- **Script Analytics**: Track crucial writer metrics — scene count, word count, estimated page count (1 page = ~1 minute), and even the breakdown of Action vs. Dialogue.

### 💾 Privacy & Persistence
- **100% Local Storage**: Your scripts never leave your browser. Everything is saved instantly to your device's `localStorage`.
- **Version History (Snapshots)**: Save named drafts (e.g., "Draft 1", "Polished Version") and restore them anytime without losing your current progress.

### 📤 Import & Export
- **Fountain Support**: Full support for `.fountain` files. Download your screenplay instantly or import existing Fountain files to continue working.
- **Print / PDF**: Native browser printing creates perfectly formatted, paginated scripts ready for production.

### 🎨 Beautiful, Distraction-Free UI
- **Light & Dark Mode**: A sleek theme toggle adjusts the environment for late-night writing.
- **Focus Mode**: Hide all sidebars and distractions — just you and the page.
- **Customization**: Adjust document background colors and choose from professional fonts like *Courier Prime*, *Lora*, *Inter*, or *Playfair Display*.

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Balaji-dev-png/VibeWriting.git
   cd VibeWriting
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open the App:**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Built With

- **[Next.js 14+ (App Router)](https://nextjs.org/)** — React meta-framework
- **[Tailwind CSS](https://tailwindcss.com/)** — Styling and responsive design
- **[TipTap (ProseMirror)](https://tiptap.dev/)** — Headless, block-based rich text editor
- **[Framer Motion](https://www.framer.com/motion/)** — Beautiful animations and micro-interactions
- **[Lucide React](https://lucide.dev/)** — Clean and consistent iconography
- **[next-themes](https://github.com/pacocoursey/next-themes)** — Effortless dark mode implementation

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Move to next logical element (e.g., Scene -> Action, Character -> Dialogue) |
| `Tab` / `Shift+Tab` | Cycle forwards/backwards through screenplay element types |
| `Ctrl + S` | Save a new version/snapshot |
| `Ctrl + /` | Toggle Help & Shortcuts overlay |
| `Ctrl + \` | Toggle Scene Navigator |
| `Shift + F` | Toggle Focus Mode |

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
