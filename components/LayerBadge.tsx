import { Badge } from "@/components/ui/badge"
import { getLayerColor } from "@/lib/utils"

interface LayerBadgeProps {
  layer: number
  name?: string
  size?: "sm" | "md"
}

export function LayerBadge({ layer, name, size = "md" }: LayerBadgeProps) {
  const sizeClasses = size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5"
  return (
    <Badge
      className={`${getLayerColor(layer)} text-white border-0 ${sizeClasses} font-medium`}
    >
      L{layer}{name ? ` ${name}` : ""}
    </Badge>
  )
}
