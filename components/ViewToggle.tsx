"use client"

import { Button } from "@/components/ui/button"
import type { ViewMode, SortMode } from "@/lib/types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ViewToggleProps {
  viewMode: ViewMode
  onViewChange: (mode: ViewMode) => void
  sortBy: SortMode
  onSortChange: (sort: SortMode) => void
}

const viewModes: { value: ViewMode; label: string }[] = [
  { value: "card", label: "カード" },
  { value: "table", label: "テーブル" },
  { value: "layer", label: "レイヤー" },
]

const sortOptions: { value: SortMode; label: string }[] = [
  { value: "default", label: "レイヤー順" },
  { value: "impact", label: "影響度順" },
  { value: "name", label: "名前順" },
  { value: "frequency", label: "監視頻度順" },
]

export function ViewToggle({
  viewMode,
  onViewChange,
  sortBy,
  onSortChange,
}: ViewToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortMode)}>
        <SelectTrigger className="h-8 text-xs w-[110px] sm:w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex border rounded-md overflow-hidden">
        {viewModes.map((mode) => (
          <Button
            key={mode.value}
            variant={viewMode === mode.value ? "default" : "ghost"}
            size="sm"
            className="h-8 text-xs rounded-none px-3"
            onClick={() => onViewChange(mode.value)}
          >
            {mode.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
