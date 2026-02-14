import { Badge } from "@/components/ui/badge"
import type { BusinessArea } from "@/lib/types"
import { getBusinessLabel } from "@/lib/utils"

interface BusinessTagProps {
  business: BusinessArea | "all"
}

export function BusinessTag({ business }: BusinessTagProps) {
  return (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
      {getBusinessLabel(business)}
    </Badge>
  )
}
