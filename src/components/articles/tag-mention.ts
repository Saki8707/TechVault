import { Node, mergeAttributes } from "@tiptap/core";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";

type TagSuggestionItem = { id: string; name: string; isNew?: boolean };

export const TagMentionPluginKey = new PluginKey("tagMention");

async function fetchTagSuggestions(query: string): Promise<TagSuggestionItem[]> {
  const res = await fetch(`/api/tags/suggest?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  const items: TagSuggestionItem[] = data.tags ?? [];

  const trimmed = query.trim();
  const hasExactMatch = items.some((i) => i.name.toLowerCase() === trimmed.toLowerCase());
  if (trimmed && !hasExactMatch) {
    items.unshift({ id: "__new__", name: trimmed, isNew: true });
  }
  return items;
}

function renderSuggestionPopup(): NonNullable<SuggestionOptions["render"]> {
  return () => {
    let popup: HTMLDivElement | null = null;
    let items: TagSuggestionItem[] = [];
    let selectedIndex = 0;
    let selectItem: ((item: TagSuggestionItem) => void) | null = null;

    function draw() {
      if (!popup) return;
      popup.innerHTML = "";
      if (items.length === 0) {
        const empty = document.createElement("div");
        empty.className = "px-3 py-2 text-sm text-muted-foreground";
        empty.textContent = "Upiši ime taga...";
        popup.appendChild(empty);
        return;
      }
      items.forEach((item, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = [
          "block w-full rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-muted/50",
          i === selectedIndex ? "bg-muted" : "",
        ].join(" ");
        btn.textContent = item.isNew ? `Novi tag: #${item.name}` : `#${item.name}`;
        btn.onmousedown = (e) => {
          e.preventDefault();
          selectItem?.(item);
        };
        popup!.appendChild(btn);
      });
    }

    function position(clientRect: (() => DOMRect | null) | null | undefined) {
      if (!popup || !clientRect) return;
      const rect = clientRect();
      if (!rect) return;
      popup.style.left = `${rect.left + window.scrollX}px`;
      popup.style.top = `${rect.bottom + window.scrollY + 4}px`;
    }

    return {
      onStart: (props) => {
        items = [];
        selectedIndex = 0;
        selectItem = (item) => props.command({ name: item.name });

        popup = document.createElement("div");
        popup.className =
          "fixed z-50 max-h-56 w-56 overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg";
        document.body.appendChild(popup);
        position(props.clientRect);
        draw();
      },
      onUpdate: (props) => {
        items = (props.items as TagSuggestionItem[]) ?? [];
        selectedIndex = 0;
        selectItem = (item) => props.command({ name: item.name });
        position(props.clientRect);
        draw();
      },
      onKeyDown: (props) => {
        if (props.event.key === "Escape") {
          popup?.remove();
          popup = null;
          return true;
        }
        if (props.event.key === "ArrowDown") {
          selectedIndex = (selectedIndex + 1) % Math.max(items.length, 1);
          draw();
          return true;
        }
        if (props.event.key === "ArrowUp") {
          selectedIndex = (selectedIndex - 1 + items.length) % Math.max(items.length, 1);
          draw();
          return true;
        }
        if (props.event.key === "Enter") {
          const item = items[selectedIndex];
          if (item) selectItem?.(item);
          return true;
        }
        return false;
      },
      onExit: () => {
        popup?.remove();
        popup = null;
      },
    };
  };
}

export const TagMention = Node.create({
  name: "tagMention",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      name: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-tag-name"),
        renderHTML: (attrs: { name: string }) => ({ "data-tag-name": attrs.name }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "a[data-tag-name]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        href: `/tag/${encodeURIComponent(node.attrs.name ?? "")}`,
        class: "tag-mention-link",
        contenteditable: "false",
      }),
      `#${node.attrs.name}`,
    ];
  },

  renderText({ node }) {
    return `#${node.attrs.name}`;
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: "#",
        pluginKey: TagMentionPluginKey,
        items: ({ query }) => fetchTagSuggestions(query),
        render: renderSuggestionPopup(),
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              { type: "tagMention", attrs: { name: (props as { name: string }).name } },
              { type: "text", text: " " },
            ])
            .run();
        },
      }),
    ];
  },
});
