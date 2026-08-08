import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "s", "u", "code", "pre", "blockquote",
  "h1", "h2", "h3", "h4",
  "ul", "ol", "li",
  "a", "img", "span", "figure", "figcaption", "mark",
  "table", "thead", "tbody", "tr", "th", "td",
];

/** Sanitizuje HTML iz editora pre cuvanja u bazu (spreca stored XSS). */
export function sanitizeArticleHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: [
      "href", "src", "alt", "title", "target", "rel", "colspan", "rowspan",
      "style", "data-note-id", "data-tag-name", "class",
    ],
  });
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

/** Gruba konverzija HTML sadrzaja (iz Tiptap editora) u prost tekst, za pretragu. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, (entity) => ENTITIES[entity] ?? " ")
    .replace(/\s+/g, " ")
    .trim();
}
