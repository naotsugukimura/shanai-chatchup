import entitiesData from "@/data/entities.json"
import layersData from "@/data/layers.json"
import { Header } from "@/components/Header"
import { DashboardClient } from "@/components/DashboardClient"
import type { Entity, LayerDefinition } from "@/lib/types"

export default function Home() {
  const entities = entitiesData as unknown as Entity[]
  const layers = layersData as unknown as LayerDefinition[]

  return (
    <>
      <Header />
      <DashboardClient entities={entities} layers={layers} />
    </>
  )
}
