import { Badge } from "@/components/ui/badge"
import type { ImpactLevel } from "@/lib/types"
import { getImpactColor, getImpactLabel } from "@/lib/utils"

interface ImpactBadgeProps {
  level: ImpactLevel
  size?: "sm" | "md"
}

export function ImpactBadge({ level, size = "md" }: ImpactBadgeProps) {
  const sizeClasses = size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5"
  const textColor = level === "medium" ? "text-black" : "text-white"
  return (
    <Badge
      className={`${getImpactColor(level)} ${textColor} border-0 ${sizeClasses} font-medium`}
    >
      {getImpactLabel(level)}
    </Badge>
  )
}
