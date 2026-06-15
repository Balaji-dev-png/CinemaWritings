import { NodeViewWrapper, NodeViewProps } from '@tiptap/react'
import { useState } from 'react'

export const TaskCardView = (props: NodeViewProps) => {
  const { node, updateAttributes, deleteNode } = props
  const { title, description, status } = node.attrs

  const [isEditing, setIsEditing] = useState(title === '' && description === '')

  const statusColors: Record<string, string> = {
    'todo': 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    'in-progress': 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    'done': 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  }

  const statusLabels: Record<string, string> = {
    'todo': 'To Do',
    'in-progress': 'In Progress',
    'done': 'Done',
  }

  return (
    <NodeViewWrapper className="my-4">
      <div 
        className="relative group border rounded-xl p-4 shadow-sm transition-all bg-white dark:bg-[#1a1d27] border-slate-200 dark:border-slate-800"
        contentEditable={false} // The card manages its own state
      >
        {/* Delete Button */}
        <button 
          onClick={deleteNode}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all z-10"
          title="Delete Card"
        >
          ✕
        </button>

        {isEditing ? (
          <div className="flex flex-col gap-3">
            <input 
              type="text"
              placeholder="Task Title..."
              value={title}
              onChange={(e) => updateAttributes({ title: e.target.value })}
              className="text-lg font-bold bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              autoFocus
            />
            <textarea 
              placeholder="Add info or work..."
              value={description}
              onChange={(e) => updateAttributes({ description: e.target.value })}
              className="text-sm bg-transparent border-none outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-500 resize-none min-h-[80px]"
            />
            <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <select 
                value={status}
                onChange={(e) => updateAttributes({ status: e.target.value })}
                className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-none outline-none cursor-pointer"
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
              <button 
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-black text-white dark:bg-white dark:text-black hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
              >
                Save Card
              </button>
            </div>
          </div>
        ) : (
          <div 
            onClick={() => setIsEditing(true)}
            className="flex flex-col gap-2 cursor-pointer"
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 m-0">
                {title || 'Untitled Task'}
              </h3>
              <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusColors[status]}`}>
                {statusLabels[status]}
              </span>
            </div>
            
            {description ? (
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap m-0">
                {description}
              </p>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500 italic m-0">
                No description provided. Click to edit.
              </p>
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}
