import { Extension } from "@tiptap/core";

export const ScriptKeymap = Extension.create({
  name: "scriptKeymap",

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $head } = selection;
        const currentNodeType = $head.parent.type.name;
        const textContent = $head.parent.textContent;

        // Empty block? Pressing Enter should escape to Action
        if (textContent.length === 0 && currentNodeType !== "action" && currentNodeType !== "paragraph") {
          editor.commands.setNode("action");
          return true;
        }

        // If cursor is NOT at end of line, let default split happen
        if ($head.parentOffset < $head.parent.nodeSize - 2) {
          return false;
        }

        // Determine next block type based on WGA flow
        let nextNodeType = "action";
        switch (currentNodeType) {
          case "sceneHeading":
            nextNodeType = "action";
            break;
          case "character":
            nextNodeType = "dialogue";
            break;
          case "parenthetical":
            nextNodeType = "dialogue";
            break;
          case "dialogue":
            nextNodeType = "action";
            break;
          case "transition":
            nextNodeType = "sceneHeading";
            break;
          case "shot":
            nextNodeType = "action";
            break;
          case "action":
          case "paragraph":
          default:
            nextNodeType = "action";
            break;
        }

        editor.chain().splitBlock().setNode(nextNodeType).run();
        return true;
      },

      Tab: ({ editor }) => {
        const { state } = editor;
        const { $head } = state.selection;
        const currentNodeType = $head.parent.type.name;
        const textContent = $head.parent.textContent;

        // Empty block: cycle through element types
        if (textContent.length === 0) {
          const cycle: Record<string, string> = {
            action: "character",
            paragraph: "character",
            character: "sceneHeading",
            sceneHeading: "shot",
            shot: "transition",
            transition: "action",
            dialogue: "parenthetical",
            parenthetical: "action",
          };
          const next = cycle[currentNodeType] || "action";
          editor.commands.setNode(next);
          return true;
        }

        // Non-empty block: contextual conversion
        if (currentNodeType === "action" || currentNodeType === "paragraph") {
          editor.commands.setNode("character");
          return true;
        }
        if (currentNodeType === "character") {
          editor.commands.setNode("parenthetical");
          return true;
        }

        return true; // Prevent default tab
      },

      "Shift-Tab": ({ editor }) => {
        const { $head } = editor.state.selection;
        const currentNodeType = $head.parent.type.name;

        // Reverse cycle
        const reverseCycle: Record<string, string> = {
          character: "action",
          paragraph: "transition",
          sceneHeading: "character",
          shot: "sceneHeading",
          transition: "shot",
          action: "transition",
          parenthetical: "dialogue",
          dialogue: "character",
        };
        const prev = reverseCycle[currentNodeType] || "action";
        editor.commands.setNode(prev);
        return true;
      },
    };
  },
});
