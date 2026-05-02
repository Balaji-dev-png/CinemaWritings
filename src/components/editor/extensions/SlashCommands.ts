import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";
import { SlashCommandList, SLASH_COMMANDS } from "./SlashCommandList";

export const SlashCommandsExtension = Extension.create({
  name: "slashCommands",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        command: ({ editor, range, props }: any) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setNode(props.id)
            .run();
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        items: ({ query }) => {
          return SLASH_COMMANDS.filter((item) =>
            item.label.toLowerCase().includes(query.toLowerCase())
          );
        },
        render: () => {
          let component: ReactRenderer<any>;
          let popup: any;

          return {
            onStart: (props) => {
              component = new ReactRenderer(SlashCommandList, {
                props,
                editor: props.editor,
              });

              if (!props.clientRect) {
                return;
              }

              popup = tippy("body", {
                getReferenceClientRect: props.clientRect as any,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
              });
            },

            onUpdate(props) {
              component.updateProps(props);

              if (!props.clientRect) {
                return;
              }

              popup[0].setProps({
                getReferenceClientRect: props.clientRect as any,
              });
            },

            onKeyDown(props) {
              if (props.event.key === "Escape") {
                popup[0].hide();
                return true;
              }

              return component.ref?.onKeyDown(props) || false;
            },

            onExit() {
              popup[0].destroy();
              component.destroy();
            },
          };
        },
        ...this.options.suggestion,
      }),
    ];
  },
});
