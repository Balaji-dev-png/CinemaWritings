import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { Bold, Italic, Strikethrough, CheckSquare, ImageIcon } from 'lucide-react'
import { useEffect } from 'react'
import { TaskCardExtension } from './extensions/TaskCardExtension'
import { apiUploadImage } from '@/lib/api'

export const NotebookEditor = ({ 
  content, 
  onChange,
  fontFamily,
  fontSize,
  wordWrap
}: { 
  content: string, 
  onChange: (html: string) => void,
  fontFamily: string,
  fontSize: string,
  wordWrap: boolean
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskCardExtension,
      Image,
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-full dark:prose-invert max-w-full',
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            apiUploadImage(file).then((res) => {
              const { schema } = view.state;
              const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
              const node = schema.nodes.image.create({ src: res.url });
              if (coordinates) {
                const tr = view.state.tr.insert(coordinates.pos, node);
                view.dispatch(tr);
              } else {
                const tr = view.state.tr.replaceSelectionWith(node);
                view.dispatch(tr);
              }
            }).catch(console.error);
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event, slice) => {
        if (event.clipboardData && event.clipboardData.files && event.clipboardData.files[0]) {
          const file = event.clipboardData.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            apiUploadImage(file).then((res) => {
              const { schema } = view.state;
              const node = schema.nodes.image.create({ src: res.url });
              const tr = view.state.tr.replaceSelectionWith(node);
              view.dispatch(tr);
            }).catch(console.error);
            return true;
          }
        }
        return false;
      },
    },
  })

  // update content when active file changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false)
    }
  }, [content, editor])

  if (!editor) return null;

  const addImage = () => {
    const url = window.prompt('Image URL:')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* TOOLBAR */}
      <div className="flex-none flex items-center gap-2 px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f111a]">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded transition-colors ${editor.isActive('bold') ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded transition-colors ${editor.isActive('italic') ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-1.5 rounded transition-colors ${editor.isActive('strike') ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
        <button
          onClick={() => editor.chain().focus().insertContent('<div data-type="taskCard"></div>').run()}
          className={`p-1.5 rounded transition-colors ${editor.isActive('taskCard') ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
          title="Insert Task Card"
        >
          <CheckSquare className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
        <button
          onClick={addImage}
          className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors`}
          title="Insert Image"
        >
          <ImageIcon className="w-4 h-4" />
        </button>
      </div>
      
      {/* EDITOR */}
      <div 
        className="flex-1 overflow-y-auto p-6"
        style={{ 
          fontFamily, 
          fontSize: `${fontSize}px`,
          whiteSpace: wordWrap ? "pre-wrap" : "pre",
          overflowX: wordWrap ? "hidden" : "auto"
        }}
      >
        <EditorContent editor={editor} className="min-h-full outline-none" />
      </div>
    </div>
  )
}
