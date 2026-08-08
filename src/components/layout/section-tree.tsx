import Link from "next/link";
import { ChevronRight, EyeOff } from "lucide-react";
import type { SectionNode } from "@/lib/sections";

function nodeHref(id: string) {
  return `/kategorija/${id}`;
}

function TreeNode({ node }: { node: SectionNode }) {
  const hasChildren = node.children.length > 0;

  if (!hasChildren) {
    return (
      <Link
        href={nodeHref(node.id)}
        className="flex items-center justify-between rounded-md px-2 py-1.5 text-base text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          {node.hidden && <EyeOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
          <span className="truncate">{node.name}</span>
        </span>
        {node.articleCount > 0 && (
          <span className="ml-2 shrink-0 text-xs text-muted-foreground">
            {node.articleCount}
          </span>
        )}
      </Link>
    );
  }

  return (
    <details open className="group/details">
      <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md px-2 py-1.5 text-base font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-open/details:rotate-90" />
        {node.hidden && <EyeOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        <Link href={nodeHref(node.id)} className="flex-1 truncate">
          {node.name}
        </Link>
      </summary>
      <div className="ml-3 space-y-0.5 border-l border-sidebar-border pl-2">
        {node.children.map((child) => (
          <TreeNode key={child.id} node={child} />
        ))}
      </div>
    </details>
  );
}

export function SectionTree({ tree }: { tree: SectionNode[] }) {
  return (
    <nav className="space-y-0.5">
      {tree.map((node) => (
        <TreeNode key={node.id} node={node} />
      ))}
    </nav>
  );
}
