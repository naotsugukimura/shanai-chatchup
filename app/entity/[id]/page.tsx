import Link from "next/link"
import entitiesData from "@/data/entities.json"
import layersData from "@/data/layers.json"
import type { Entity, LayerDefinition } from "@/lib/types"
import { EntityDetailClient } from "./EntityDetailClient"
import { notFound } from "next/navigation"

const entities = entitiesData as unknown as Entity[]
const layers = layersData as unknown as LayerDefinition[]

export function generateStaticParams() {
  return entities.map((e) => ({ id: e.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const entity = entities.find((e) => e.id === id)
  return {
    title: entity
      ? `${entity.name} - SCI Dashboard`
      : "Not Found - SCI Dashboard",
  }
}

export default async function EntityPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const entity = entities.find((e) => e.id === id)
  if (!entity) notFound()

  const layer = layers.find((l) => l.id === entity.layer)
  const relatedEntities = entity.relatedEntities
    ? entities.filter((e) => entity.relatedEntities!.includes(e.id))
    : []

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link
        href="/"
        className="text-sm text-blue-600 hover:underline mb-4 inline-block"
      >
        ← ダッシュボードに戻る
      </Link>
      <EntityDetailClient
        entity={entity}
        layer={layer}
        relatedEntities={relatedEntities}
      />
    </div>
  )
}
