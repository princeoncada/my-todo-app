"use client";

import { useState } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { Check, GripVertical, Layers, ListFilter, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type ViewItem = {
  id: string;
  name: string;
};

const PLACEHOLDER_VIEWS: ViewItem[] = [
  { id: "view-urgent", name: "Urgent + Work" },
  { id: "view-focus", name: "Deep Focus" },
  { id: "view-personal", name: "Personal Errands" },
  { id: "view-school", name: "School Sprint" },
];

type SortableViewRowProps = {
  view: ViewItem;
  index: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
};

function SortableViewRow({
  view,
  index,
  isSelected,
  onSelect,
}: SortableViewRowProps) {
  const { ref, handleRef, isDragging } = useSortable({
    id: view.id,
    index,
    type: "view",
    group: "views",
    accept: "view",
  });

  return (
    <div
      ref={ref}
      className={cn(
        "group/view-row flex items-center gap-0.5 rounded-md border border-transparent pr-0.5 transition",
        "hover:border-zinc-200 hover:bg-zinc-50",
        isDragging && "scale-[1.01] border-zinc-300 bg-zinc-100 shadow-sm"
      )}
    >
      <button
        ref={handleRef}
        type="button"
        className={cn(
          "cursor-grab rounded-sm p-1 text-zinc-400 transition",
          "hover:bg-zinc-200/70 hover:text-zinc-700 active:cursor-grabbing"
        )}
        aria-label={`Reorder ${view.name}`}
      >
        <GripVertical className="size-3.5" />
      </button>

      <button
        type="button"
        onClick={() => onSelect(view.id)}
        className={cn(
          "flex min-w-0 flex-1 items-center justify-between rounded-sm px-1.5 py-1 text-left text-xs transition",
          isSelected ? "text-zinc-900" : "text-zinc-700 hover:text-zinc-900"
        )}
      >
        <span className="truncate">{view.name}</span>
        <Check
          className={cn(
            "size-3.5 shrink-0",
            isSelected ? "opacity-100 text-zinc-700" : "opacity-0"
          )}
        />
      </button>
    </div>
  );
}

export default function ViewsSidebarPreview() {
  const [views, setViews] = useState<ViewItem[]>(PLACEHOLDER_VIEWS);
  const [selectedViewId, setSelectedViewId] = useState<string>("all-lists");

  return (
    <Card className="w-full border-zinc-200/80 bg-white/90 shadow-none py-0 mt-3">
      <CardHeader className="px-3 py-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-1.5">
            <ListFilter className="size-3.5 text-zinc-500" />
            Views
          </span>
          <Button type="button" size="xs" variant="outline" className="h-6 px-2">
            <Plus className="size-3" />
            Add View
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-2 px-3 pb-3 pt-0">
        <button
          type="button"
          onClick={() => setSelectedViewId("all-lists")}
          className={cn(
            "flex w-full items-center justify-between rounded-md border hover:bg-zinc-50 px-2 py-1.5 text-left text-xs transition",
            selectedViewId === "all-lists"
              ? "border-zinc-300 text-zinc-900"
              : "border-zinc-200 text-zinc-700"
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            <Layers className="size-3.5" />
            All Lists
          </span>
          <Check
            className={cn(
              "size-3.5",
              selectedViewId === "all-lists"
                ? "opacity-100 text-zinc-700"
                : "opacity-0"
            )}
          />
        </button>

        <Separator />

        <DragDropProvider
          onDragOver={(event) => {
            const { source, target } = event.operation;

            if (!source || !target) return;
            if (source.type !== "view" || target.type !== "view") return;

            const sourceId = String(source.id);
            const targetId = String(target.id);

            if (sourceId === targetId) return;

            setViews((current) => {
              const sourceIndex = current.findIndex((view) => view.id === sourceId);
              const targetIndex = current.findIndex((view) => view.id === targetId);

              if (sourceIndex === -1 || targetIndex === -1) return current;

              const next = [...current];
              const [moved] = next.splice(sourceIndex, 1);
              next.splice(targetIndex, 0, moved);
              return next;
            });
          }}
        >
          <div className="space-y-0.5">
            {views.map((view, index) => (
              <SortableViewRow
                key={view.id}
                view={view}
                index={index}
                isSelected={selectedViewId === view.id}
                onSelect={setSelectedViewId}
              />
            ))}
          </div>
        </DragDropProvider>
      </CardContent>
    </Card>
  );
}
