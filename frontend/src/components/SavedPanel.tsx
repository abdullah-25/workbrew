import { BookmarkIcon } from 'lucide-react'
import { Spot } from '../data/spots'
import { SpotCard } from './SpotCard'

interface SavedPanelProps {
  spots: Spot[]
  savedSpotIds: Set<string>
  selectedSpotId: string | null
  expandedSpotId: string | null
  onSpotClick: (id: string) => void
  onToggleSave: (id: string) => void
}

export function SavedPanel({
  spots,
  savedSpotIds,
  selectedSpotId,
  expandedSpotId,
  onSpotClick,
  onToggleSave,
}: SavedPanelProps) {
  const savedSpots = spots.filter((s) => savedSpotIds.has(s.id))

  return (
    <div className="w-[320px] h-full flex flex-col bg-background border-r-[0.5px] border-border flex-shrink-0">
      <div className="p-6 border-b-[0.5px] border-border bg-white z-10">
        <div className="flex items-center gap-2 text-text">
          <BookmarkIcon size={18} />
          <h1 className="text-lg font-semibold">Saved Spots</h1>
        </div>
        <p className="text-xs text-muted mt-1">{savedSpots.length} saved</p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4">
        {savedSpots.length === 0 ? (
          <div className="flex flex-col items-center gap-3 mt-16 text-center">
            <BookmarkIcon size={28} className="text-muted opacity-40" />
            <p className="text-sm text-muted">No saved spots yet.</p>
            <p className="text-xs text-muted opacity-70">
              Tap the heart on any cafe to save it here.
            </p>
          </div>
        ) : (
          savedSpots.map((spot) => (
            <div key={spot.id} id={`spot-${spot.id}`}>
              <SpotCard
                spot={spot}
                isSelected={selectedSpotId === spot.id}
                isExpanded={expandedSpotId === spot.id}
                onClick={() => onSpotClick(spot.id)}
                isSaved={true}
                onToggleSave={() => onToggleSave(spot.id)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
