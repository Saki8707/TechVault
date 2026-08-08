import { Extension, type Editor } from "@tiptap/core";

const BLOCK_TYPES = ["paragraph", "heading", "blockquote"];

/** Boja pozadine celog bloka (pasusa/naslova/citata), ne samo selektovanog teksta. */
export const BlockBackground = Extension.create({
  name: "blockBackground",

  addGlobalAttributes() {
    return [
      {
        types: BLOCK_TYPES,
        attributes: {
          backgroundColor: {
            default: null,
            parseHTML: (el: HTMLElement) => el.style.backgroundColor || null,
            renderHTML: (attrs: Record<string, unknown>) => {
              const backgroundColor = attrs.backgroundColor as string | null;
              if (!backgroundColor) return {};
              return {
                style: `background-color: ${backgroundColor}; padding: 0.125rem 0.5rem; border-radius: 0.375rem;`,
              };
            },
          },
        },
      },
    ];
  },
});

export function setBlockBackground(editor: Editor, color: string | null) {
  for (const type of BLOCK_TYPES) {
    if (editor.isActive(type)) {
      editor.chain().focus().updateAttributes(type, { backgroundColor: color }).run();
      return true;
    }
  }
  return false;
}
