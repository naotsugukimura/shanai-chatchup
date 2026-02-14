import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ImpactLevel, BusinessArea, MonitoringFrequency } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getLayerColor(layer: number): string {
  const colors: Record<number, string> = {
    1: "bg-layer-1",
    2: "bg-layer-2",
    3: "bg-layer-3",
    4: "bg-layer-4",
    5: "bg-layer-5",
  }
  return colors[layer] ?? "bg-gray-500"
}

export function getLayerTextColor(layer: number): string {
  const colors: Record<number, string> = {
    1: "text-layer-1",
    2: "text-layer-2",
    3: "text-layer-3",
    4: "text-layer-4",
    5: "text-layer-5",
  }
  return colors[layer] ?? "text-gray-500"
}

export function getLayerBorderColor(layer: number): string {
  const colors: Record<number, string> = {
    1: "border-layer-1",
    2: "border-layer-2",
    3: "border-layer-3",
    4: "border-layer-4",
    5: "border-layer-5",
  }
  return colors[layer] ?? "border-gray-500"
}

export function getImpactColor(level: ImpactLevel): string {
  const colors: Record<ImpactLevel, string> = {
    high: "bg-impact-high",
    medium: "bg-impact-medium",
    low: "bg-impact-low",
  }
  return colors[level]
}

export function getImpactTextColor(level: ImpactLevel): string {
  const colors: Record<ImpactLevel, string> = {
    high: "text-impact-high",
    medium: "text-impact-medium",
    low: "text-impact-low",
  }
  return colors[level]
}

export function getImpactLabel(level: ImpactLevel): string {
  const labels: Record<ImpactLevel, string> = {
    high: "高",
    medium: "中",
    low: "低",
  }
  return labels[level]
}

export function getImpactIcon(level: ImpactLevel | "none"): string {
  const icons: Record<string, string> = {
    high: "🔴",
    medium: "🟡",
    low: "🟢",
    none: "─",
  }
  return icons[level] ?? "─"
}

export function getBusinessLabel(business: BusinessArea | "all"): string {
  const labels: Record<string, string> = {
    recruitment: "人材紹介",
    media: "メディア",
    saas: "SaaS",
    all: "全体",
  }
  return labels[business] ?? business
}

export function getFrequencyLabel(frequency: MonitoringFrequency): string {
  const labels: Record<MonitoringFrequency, string> = {
    realtime: "リアルタイム",
    weekly: "週次",
    monthly: "月次",
    quarterly: "四半期",
  }
  return labels[frequency]
}

export function getFrequencyOrder(frequency: MonitoringFrequency): number {
  const order: Record<MonitoringFrequency, number> = {
    realtime: 0,
    weekly: 1,
    monthly: 2,
    quarterly: 3,
  }
  return order[frequency]
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    confirmed: "確認済み",
    unconfirmed: "未確認",
    research_needed: "要調査",
  }
  return labels[status] ?? status
}
