import React from 'react'
import { MapPin } from 'lucide-react'
import { Spot } from '../data/spots'
import { SpotCard } from './SpotCard'
import { FilterOption } from '../App'
interface DiscoveryPanelProps {
  spots: Spot[]
  selectedSpotId: string | null
  expandedSpotId: string | null
  onSpotClick: (id: string) => void
  minScore: number
  onScoreChange: (score: number) => void
  activeFilter: FilterOption
  onFilterChange: (filter: FilterOption) => void
  savedSpotIds: Set<string>
  onToggleSave: (id: string) => void
}
const FILTERS: FilterOption[] = ['All', 'Quiet', 'Fast WiFi']
export function DiscoveryPanel({
  spots,
  selectedSpotId,
  expandedSpotId,
  onSpotClick,
  minScore,
  onScoreChange,
  activeFilter,
  onFilterChange,
  savedSpotIds,
  onToggleSave,
}: DiscoveryPanelProps) {
  return (
    <div className="w-[320px] h-full flex flex-col bg-background border-r-[0.5px] border-border flex-shrink-0">
      <div className="p-6 flex flex-col gap-5 border-b-[0.5px] border-border bg-white z-10">
        <div className="flex items-center gap-2 text-text">
          <MapPin size={18} />
          <h1 className="text-lg font-semibold">Spots near Toronto</h1>
        </div>

        <div className="flex flex-col gap-4">
          {/* Score Slider */}
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted whitespace-nowrap">Minimum Score</span>
            <div className="flex-1 h-[1px] bg-border relative flex items-center">
              <input
                type="range"
                min="1"
                max="10"
                step="0.1"
                value={minScore}
                onChange={(e) => onScoreChange(parseFloat(e.target.value))}
                className="absolute w-full opacity-0 cursor-pointer h-full z-10"
              />
              <div
                className="absolute h-3 w-3 bg-text rounded-full shadow-sm pointer-events-none transform -translate-x-1/2"
                style={{ left: `${((minScore - 1) / 9) * 100}%` }}
              />
            </div>
            <span className="font-medium w-6 text-right">
              {minScore.toFixed(1)}
            </span>
          </div>

          {/* Chip Filters */}
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 -mx-2 px-2">
            {FILTERS.map((filter) => (
              <button
                key={filter}
                onClick={() => onFilterChange(filter)}
                className={`
                  flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors
                  ${activeFilter === filter ? 'bg-[#1a1a1a] text-white border-[0.5px] border-[#1a1a1a]' : 'bg-white text-text border-[0.5px] border-border hover:bg-gray-50'}
                `}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4">
        {spots.length === 0 ? (
          <div className="text-center text-muted text-sm mt-10">
            No spots found matching these filters.
          </div>
        ) : (
          spots.map((spot) => (
            <div key={spot.id} id={`spot-${spot.id}`}>
              <SpotCard
                spot={spot}
                isSelected={selectedSpotId === spot.id}
                isExpanded={expandedSpotId === spot.id}
                onClick={() => onSpotClick(spot.id)}
                isSaved={savedSpotIds.has(spot.id)}
                onToggleSave={() => onToggleSave(spot.id)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
