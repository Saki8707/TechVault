"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SectionTree } from "@/components/layout/section-tree";
import type { SectionNode } from "@/lib/sections";

export function MobileNav({ tree }: { tree: SectionNode[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Otvori meni kategorija"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 overflow-y-auto p-3">
          <SheetHeader className="px-0">
            <SheetTitle>Kategorije</SheetTitle>
          </SheetHeader>
          <div onClick={() => setOpen(false)}>
            <SectionTree tree={tree} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
