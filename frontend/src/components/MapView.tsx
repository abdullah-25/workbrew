import React, { useEffect } from 'react'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Spot } from '../data/spots'
import { Clock } from 'lucide-react'
interface MapViewProps {
  spots: Spot[]
  selectedSpotId: string | null
  onMarkerClick: (id: string) => void
}
function MapController({
  selectedSpot,
  spots,
}: {
  selectedSpot: Spot | undefined
  spots: Spot[]
}) {
  const map = useMap()
  useEffect(() => {
    if (selectedSpot) {
      map.flyTo(selectedSpot.coordinates, 15, { duration: 1.5 })
    } else if (spots.length > 0) {
      const bounds = spots.map((s) => s.coordinates)
      if (bounds.length > 0) {
        map.fitBounds(bounds as [number, number][], { padding: [50, 50], maxZoom: 14 })
      }
    }
  }, [selectedSpot, map, spots])
  return null
}
function getMarkerColor(score: number) {
  if (score >= 8) return '#22c55e'
  if (score >= 5) return '#f59e0b'
  return '#ef4444'
}
export function MapView({ spots, selectedSpotId, onMarkerClick }: MapViewProps) {
  const center: [number, number] = [43.6532, -79.3832]
  const selectedSpot = spots.find((s) => s.id === selectedSpotId)
  return (
    <div className="relative w-full h-full bg-[#e5e5e5]">
      <MapContainer
        center={center}
        zoom={13}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <MapController selectedSpot={selectedSpot} spots={spots} />
        {spots.map((spot) => {
          const isSelected = selectedSpotId === spot.id
          const color = getMarkerColor(spot.score)
          return (
            <CircleMarker
              key={spot.id}
              center={spot.coordinates}
              radius={isSelected ? 10 : 8}
              pathOptions={{
                fillColor: color,
                fillOpacity: isSelected ? 1 : 0.7,
                color: isSelected ? '#1a1a1a' : '#ffffff',
                weight: isSelected ? 2 : 1.5,
              }}
              eventHandlers={{ click: () => onMarkerClick(spot.id) }}
            >
              <Tooltip
                direction="top"
                offset={[0, -10]}
                opacity={1}
                className="!bg-white !text-text !border-border !border-[0.5px] !rounded-card !shadow-none !p-2 !font-sans"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-sm">{spot.name}</span>
                  <span className="text-xs text-muted">{spot.score.toFixed(1)} Score</span>
                </div>
              </Tooltip>
            </CircleMarker>
          )
        })}
      </MapContainer>

      <div className="absolute bottom-6 left-6 z-10">
        <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border-[0.5px] border-border text-xs text-muted">
          <Clock size={12} />
          <span>Toronto cafes</span>
        </div>
      </div>
    </div>
  )
}
