import entitiesData from "@/data/entities.json"
import layersData from "@/data/layers.json"
import triggersData from "@/data/triggers.json"
import { Header } from "@/components/Header"
import { DashboardClient } from "@/components/DashboardClient"
import type { Entity, LayerDefinition } from "@/lib/types"
import type { Trigger } from "@/lib/trigger-types"

export default function Home() {
  const entities = entitiesData as unknown as Entity[]
  const layers = layersData as unknown as LayerDefinition[]
  const triggers = triggersData as unknown as Trigger[]

  return (
    <>
      <Header />
      <DashboardClient entities={entities} layers={layers} triggers={triggers} />
    </>
  )
}
