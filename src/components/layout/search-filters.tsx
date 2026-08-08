"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import type { FlatSection } from "@/lib/sections";

const STANDARD_FILTER_OPTIONS = [
  { value: "none", label: "Podrazumevano (relevantnost)" },
  { value: "myViews", label: "Najčešće gledano od mene" },
  { value: "myFromSearch", label: "Najčešće otvarano iz moje pretrage" },
  { value: "sitePopularSearch", label: "Najpopularnije na celom sajtu" },
];

export function SearchFilters({ sections }: { sections: FlatSection[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const currentFilter = searchParams.get("filter") ?? "none";
  const currentScope = searchParams.get("scope")?.split(",").filter(Boolean) ?? [];
  const currentScopeMode = searchParams.get("scopeMode") ?? "only";

  const [draftScope, setDraftScope] = useState<string[]>(currentScope);
  const [draftMode, setDraftMode] = useState(currentScopeMode);

  function updateParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    router.push(`/pretraga?${params.toString()}`);
  }

  function toggleScopeSection(id: string) {
    setDraftScope((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function applyAdvanced() {
    updateParams({
      scope: draftScope.length > 0 ? draftScope.join(",") : null,
      scopeMode: draftScope.length > 0 ? draftMode : null,
    });
    setAdvancedOpen(false);
  }

  function clearAdvanced() {
    setDraftScope([]);
    updateParams({ scope: null, scopeMode: null, filter: null });
    setAdvancedOpen(false);
  }

  const activeCount = (currentFilter !== "none" ? 1 : 0) + (currentScope.length > 0 ? 1 : 0);

  return (
    <div className="shrink-0">
      <Button
        variant="outline"
        size="sm"
        className="h-10 gap-1.5 rounded-full px-3 sm:h-11"
        onClick={() => setAdvancedOpen(true)}
      >
        <SlidersHorizontal className="h-4 w-4" />
        <span className="hidden sm:inline">Filter</span>
        {activeCount > 0 && (
          <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
            {activeCount}
          </span>
        )}
      </Button>

      <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Filter pretrage</DialogTitle>
            <DialogDescription>
              Izaberi standardni filter i/ili napredni filter po kategorijama, pa primeni.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Standardni filter</p>
            <Select
              value={currentFilter}
              onValueChange={(v) => updateParams({ filter: v === "none" ? null : v })}
            >
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                {STANDARD_FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="pt-1 text-sm font-medium">Napredni filter</p>

          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div>
              <p className="text-sm font-medium">
                {draftMode === "only" ? "Pretražuj samo ovde" : "Isključi iz pretrage"}
              </p>
              <p className="text-xs text-muted-foreground">
                Uključi za &quot;isključi&quot;, isključi za &quot;samo ovde&quot;
              </p>
            </div>
            <Switch
              checked={draftMode === "exclude"}
              onCheckedChange={(checked) => setDraftMode(checked ? "exclude" : "only")}
            />
          </div>

          <div className="max-h-72 space-y-0.5 overflow-y-auto rounded-md border p-2">
            {sections.map((s) => (
              <label
                key={s.id}
                className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50"
                style={{ paddingLeft: `${8 + s.depth * 16}px` }}
              >
                <span className="truncate">{s.name}</span>
                <Switch
                  checked={draftScope.includes(s.id)}
                  onCheckedChange={() => toggleScopeSection(s.id)}
                />
              </label>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={clearAdvanced}>
              Poništi
            </Button>
            <Button onClick={applyAdvanced}>Primeni</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
