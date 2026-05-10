import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import ResizableImageView from "@/components/editor/ResizableImageView";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    resizableImage: {
      insertImage: (attrs: {
        src: string;
        alt?: string;
        width?: string;
        height?: string;
        align?: "left" | "center" | "right";
      }) => ReturnType;
    };
  }
}

export const ResizableImage = Node.create({
  name: "resizableImage",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: "" },
      width: {
        default: "400",
        parseHTML: (element) => {
          const w = element.getAttribute("width") || element.style.width;
          return w ? w.replace("px", "") : "400";
        },
      },
      height: {
        default: "auto",
        parseHTML: (element) => {
          const h = element.getAttribute("height") || element.style.height;
          return h ? h.replace("px", "") : "auto";
        },
      },
      align: {
        default: "left",
        parseHTML: (element) => {
          const wrapper = element.closest(".script-image-wrapper");
          if (wrapper) {
            if (wrapper.classList.contains("align-center")) return "center";
            if (wrapper.classList.contains("align-right")) return "right";
          }
          return "left";
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'img[src]:not([src^="data:image/svg"])' }];
  },

  renderHTML({ HTMLAttributes }) {
    const { width, height, align, src, alt } = HTMLAttributes;
    const styleStr = `width:${width}px;height:${height === "auto" ? "auto" : height + "px"};max-width:100%;display:inline-block;`;
    return [
      "div",
      { class: `script-image-wrapper align-${align || "left"}` },
      [
        "img",
        mergeAttributes(
          { src, alt: alt || "" },
          { style: styleStr, draggable: "false" }
        ),
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },

  addCommands() {
    return {
      insertImage:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
    };
  },
});
