import { Extension, type Editor, type Range } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";

import { filterSlashItems, sizedTableItem, type SlashCommandItem } from "./slash-command-items";
import { suggestionMenuRenderer } from "./suggestion-menu";
import { parseTableSize } from "./table-tools";

export const slashCommandKey = new PluginKey("slashCommand");

/** "/" anywhere: the block menu (Moonstone 13.2). */
export const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        pluginKey: slashCommandKey,
        startOfLine: false,
        items: ({ query }: { query: string }) => {
          const size = parseTableSize(query);
          if (size) return [sizedTableItem(size)];
          return filterSlashItems(query);
        },
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor;
          range: Range;
          props: SlashCommandItem;
        }) => {
          props.run(editor, range);
        },
        render: suggestionMenuRenderer<SlashCommandItem>("Insert a block", "No matching blocks"),
      } satisfies Partial<SuggestionOptions<SlashCommandItem>>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
