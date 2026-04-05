import { useEffect, useMemo, useState } from 'react'
import { LeftNav, NavItem } from './components/LeftNav'
import { DiscoveryPanel } from './components/DiscoveryPanel'
import { SavedPanel } from './components/SavedPanel'
import { MapView } from './components/MapView'
import { Spot } from './data/spots'

export type FilterOption = 'All' | 'Quiet' | 'Fast WiFi'

const SAVED_KEY = 'workbrew_saved_spots'

function loadSaved(): Set<string> {
  try {
    const raw = localStorage.getItem(SAVED_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function persistSaved(ids: Set<string>) {
  localStorage.setItem(SAVED_KEY, JSON.stringify([...ids]))
}

export function App() {
  const [spots, setSpots] = useState<Spot[]>([])
  const [minScore, setMinScore] = useState<number>(1)
  const [activeFilter, setActiveFilter] = useState<FilterOption>('All')
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null)
  const [expandedSpotId, setExpandedSpotId] = useState<string | null>(null)
  const [activeNav, setActiveNav] = useState<NavItem>('search')
  const [savedSpotIds, setSavedSpotIds] = useState<Set<string>>(loadSaved)

  useEffect(() => {
    fetch('/api/spots')
      .then((r) => r.json())
      .then((data: Spot[]) => setSpots(data))
      .catch(console.error)
  }, [])

  const handleToggleSave = (id: string) => {
    setSavedSpotIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      persistSaved(next)
      return next
    })
  }

  const filteredSpots = useMemo(() => {
    return spots
      .filter((spot) => {
        if (spot.score < minScore) return false
        if (activeFilter === 'Quiet') {
          if (spot.amenities.noise !== 'Quiet') return false
        } else if (activeFilter === 'Fast WiFi') {
          if (!['Fast', 'Reliable'].includes(spot.amenities.wifi)) return false
        }
        return true
      })
      .sort((a, b) => b.score - a.score)
  }, [spots, minScore, activeFilter])

  const handleSpotClick = (id: string) => {
    setSelectedSpotId(id)
    setExpandedSpotId((prev) => (prev === id ? null : id))
  }

  const handleMarkerClick = (id: string) => {
    setSelectedSpotId(id)
    setExpandedSpotId(id)
    const element = document.getElementById(`spot-${id}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const panelSpots = activeNav === 'saved' ? spots : filteredSpots

  return (
    <div className="flex w-full h-screen overflow-hidden bg-background font-sans text-text">
      <LeftNav activeItem={activeNav} onItemClick={setActiveNav} />

      {activeNav === 'saved' ? (
        <SavedPanel
          spots={spots}
          savedSpotIds={savedSpotIds}
          selectedSpotId={selectedSpotId}
          expandedSpotId={expandedSpotId}
          onSpotClick={handleSpotClick}
          onToggleSave={handleToggleSave}
        />
      ) : (
        <DiscoveryPanel
          spots={filteredSpots}
          selectedSpotId={selectedSpotId}
          expandedSpotId={expandedSpotId}
          onSpotClick={handleSpotClick}
          minScore={minScore}
          onScoreChange={setMinScore}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          savedSpotIds={savedSpotIds}
          onToggleSave={handleToggleSave}
        />
      )}

      <div className="flex-1 h-full border-l-[0.5px] border-border">
        <MapView
          spots={panelSpots}
          selectedSpotId={selectedSpotId}
          onMarkerClick={handleMarkerClick}
        />
      </div>
    </div>
  )
}
