"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"

interface SearchBarProps {
  value: string
  onChange: (text: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [localValue, value, onChange])

  return (
    <div className="relative">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
        🔍
      </span>
      <Input
        type="text"
        placeholder="エンティティを検索..."
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="pl-8 h-8 text-sm"
      />
    </div>
  )
}
