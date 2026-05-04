import { Node, mergeAttributes } from "@tiptap/core";

// Helper to create screenplay block nodes with specific classes
function createScriptNode(name: string, defaultClass: string) {
  return Node.create({
    name,
    group: "block",
    content: "inline*",
    defining: true, // Crucial: prevents node from being converted when empty

    parseHTML() {
      return [
        { tag: `p.${defaultClass}`, priority: 100 },
        { tag: `p[data-type="${name}"]`, priority: 100 },
      ];
    },

    renderHTML({ HTMLAttributes }) {
      return ["p", mergeAttributes({ class: defaultClass, "data-type": name }, HTMLAttributes), 0];
    },
  });
}

// Action is the DEFAULT block type — it matches any <p> tag (with or without class)
export const Action = Node.create({
  name: "action",
  group: "block",
  content: "inline*",
  defining: true,

  parseHTML() {
    return [
      { tag: "p.action", priority: 60 },
      { tag: 'p[data-type="action"]', priority: 60 },
      { tag: "p", priority: 30 }, // Fallback: any unmatched <p> becomes Action
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["p", mergeAttributes({ class: "action", "data-type": "action" }, HTMLAttributes), 0];
  },
});

export const SceneHeading = createScriptNode("sceneHeading", "scene-heading");
export const Character = createScriptNode("character", "character");
export const Dialogue = createScriptNode("dialogue", "dialogue");
export const Parenthetical = createScriptNode("parenthetical", "parenthetical");
export const Transition = createScriptNode("transition", "transition");
export const Shot = createScriptNode("shot", "shot");

// Extension node for V.O. (Voice Over) and O.S. (Off Screen) annotations
export const Extension = createScriptNode("extension", "extension");
