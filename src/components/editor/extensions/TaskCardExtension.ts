import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { TaskCardView } from './TaskCardView'

export const TaskCardExtension = Node.create({
  name: 'taskCard',
  group: 'block',
  atom: true, // It is a block but its content is managed by React, not Tiptap's schema
  draggable: true,

  addAttributes() {
    return {
      title: {
        default: '',
      },
      description: {
        default: '',
      },
      status: {
        default: 'todo', // 'todo', 'in-progress', 'done'
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="taskCard"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'taskCard' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(TaskCardView)
  },
})
