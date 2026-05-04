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

        // Allow Enter to naturally create nodes so they can be processed by PageNode's automatic overflow detection

        // Empty block? Pressing Enter should stay as the current node type to maintain consistency 
        // unless the user manually changes it via Tab or the menu.
        if (textContent.length === 0) {
          const pos = $head.after();
          editor.chain().insertContentAt(pos, { type: currentNodeType }).focus(pos + 1).run();
          return true;
        }

        // If cursor is NOT at end of line, let default split happen
        // (default split might lift if empty, but we handled most empty cases above)
        if (textContent.length > 0 && $head.parentOffset < $head.parent.nodeSize - 2) {
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
            nextNodeType = "character";
            break;
          case "transition":
            nextNodeType = "sceneHeading";
            break;
          case "shot":
            nextNodeType = "action";
            break;
          case "extension":
            nextNodeType = "dialogue";
            break;
          case "action":
          case "paragraph":
          default:
            nextNodeType = "action";
            break;
        }

        // Explicitly insert a new node after the current one, avoiding splitBlock's lifting behavior
        const pos = $head.after();
        editor.chain().insertContentAt(pos, { type: nextNodeType }).focus(pos + 1).run();
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
            character: "extension",
            extension: "sceneHeading",
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
          extension: "character",
          sceneHeading: "extension",
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
