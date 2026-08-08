"use client";

import { useRef, useState } from "react";
import TiptapImage from "@tiptap/extension-image";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";
import { AlignLeft, AlignCenter, AlignRight, Type } from "lucide-react";

const MIN_WIDTH = 80;

type Align = "left" | "center" | "right";

function alignStyle(align: Align | null): React.CSSProperties {
  if (align === "center") return { marginLeft: "auto", marginRight: "auto" };
  if (align === "right") return { marginLeft: "auto", marginRight: "0" };
  return { marginLeft: "0", marginRight: "auto" };
}

function ResizableImageView({ node, updateAttributes, selected }: NodeViewProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [editingCaption, setEditingCaption] = useState(false);
  const align = (node.attrs.align as Align | null) ?? "left";

  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const startX = e.clientX;
    const startWidth = wrapper.offsetWidth;
    const maxWidth = wrapper.parentElement?.clientWidth ?? startWidth * 3;

    function onMove(moveEvent: PointerEvent) {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.min(Math.max(startWidth + delta, MIN_WIDTH), maxWidth);
      updateAttributes({ width: Math.round(newWidth) });
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <NodeViewWrapper
      as="figure"
      className="relative my-1"
      style={{ width: node.attrs.width ? `${node.attrs.width}px` : "fit-content", ...alignStyle(align) }}
      data-drag-handle
    >
      <div ref={wrapperRef} className="relative">
        <img
          src={node.attrs.src}
          alt={node.attrs.alt ?? ""}
          title={node.attrs.title ?? ""}
          className={`block h-auto w-full rounded-sm ${selected ? "ring-2 ring-primary" : ""}`}
          draggable={false}
        />
        {selected && (
          <span
            onPointerDown={startResize}
            className="absolute right-0 bottom-0 h-3.5 w-3.5 translate-x-1/2 translate-y-1/2 cursor-nwse-resize rounded-full border-2 border-background bg-primary"
          />
        )}
      </div>

      {selected && (
        <div className="mt-1 flex items-center gap-0.5 rounded-md border bg-popover p-0.5 shadow-sm">
          {(["left", "center", "right"] as const).map((a) => {
            const Icon = a === "left" ? AlignLeft : a === "center" ? AlignCenter : AlignRight;
            return (
              <button
                key={a}
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => updateAttributes({ align: a })}
                className={`rounded p-1 hover:bg-muted ${align === a ? "bg-muted text-primary" : "text-muted-foreground"}`}
                aria-label={`Poravnaj sliku ${a}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => setEditingCaption((v) => !v)}
            className={`rounded p-1 hover:bg-muted ${editingCaption ? "bg-muted text-primary" : "text-muted-foreground"}`}
            aria-label="Dodaj natpis ispod slike"
          >
            <Type className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {(editingCaption || node.attrs.caption) && (
        <input
          value={node.attrs.caption ?? ""}
          onChange={(e) => updateAttributes({ caption: e.target.value })}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder="Natpis ispod slike..."
          className="mt-1 w-full rounded border-0 bg-transparent p-0.5 text-center text-xs text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
        />
      )}
    </NodeViewWrapper>
  );
}

export const ResizableImage = TiptapImage.extend({
  draggable: true,

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => {
          const w = element.style.width || element.getAttribute("width");
          return w ? parseInt(w, 10) : null;
        },
        renderHTML: () => ({}),
      },
      align: {
        default: "left",
        parseHTML: (element) => element.closest("figure")?.getAttribute("data-align") ?? "left",
        renderHTML: () => ({}),
      },
      caption: {
        default: null,
        parseHTML: (element) =>
          element.closest("figure")?.querySelector("figcaption")?.textContent ?? null,
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [
      { tag: "figure img[src]", priority: 60 },
      ...(this.parent?.() ?? []),
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const align = (node.attrs.align as Align | null) ?? "left";
    const widthStyle = node.attrs.width ? `width:${node.attrs.width}px;` : "width:fit-content;";
    const alignCss =
      align === "center"
        ? "margin-left:auto;margin-right:auto;"
        : align === "right"
          ? "margin-left:auto;margin-right:0;"
          : "margin-left:0;margin-right:auto;";

    return [
      "figure",
      { "data-align": align, style: `${widthStyle}${alignCss}` },
      [
        "img",
        {
          src: HTMLAttributes.src,
          alt: HTMLAttributes.alt ?? "",
          title: HTMLAttributes.title ?? "",
          style: "display:block;width:100%;height:auto;",
        },
      ],
      ...(node.attrs.caption
        ? ([["figcaption", { style: "text-align:center;font-size:0.75rem;" }, node.attrs.caption]] as const)
        : []),
    ];
  },
});
