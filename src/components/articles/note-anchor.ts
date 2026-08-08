import { Mark, mergeAttributes } from "@tiptap/core";

export const NoteAnchor = Mark.create({
  name: "noteAnchor",
  inclusive: false,

  addAttributes() {
    return {
      noteId: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-note-id"),
        renderHTML: (attrs: { noteId: string | null }) =>
          attrs.noteId ? { "data-note-id": attrs.noteId } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-note-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "note-anchor" }), 0];
  },
});
