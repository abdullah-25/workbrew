import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  NavigationIcon,
  SparklesIcon,
  ChevronDownIcon,
  HeartIcon,
} from "lucide-react";
import { Spot } from "../data/spots";
interface SpotCardProps {
  spot: Spot;
  isSelected: boolean;
  isExpanded: boolean;
  onClick: () => void;
  isSaved?: boolean;
  onToggleSave?: () => void;
  aiReasoning?: string;
}
export function SpotCard({
  spot,
  isSelected,
  isExpanded,
  onClick,
  isSaved = false,
  onToggleSave,
  aiReasoning,
}: SpotCardProps) {
  const handleDirections = (e: React.MouseEvent) => {
    e.stopPropagation();
    const [lat, lng] = spot.coordinates;
    window.open(
      `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`,
      "_blank",
    );
  };
  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSave?.();
  };
  return (
    <div
      onClick={onClick}
      className={`
        flex flex-col bg-white rounded-card overflow-hidden cursor-pointer transition-colors
        border-[0.5px] ${isSelected ? "border-text" : "border-border"}
      `}
    >
      {/* Cover Photo */}
      <div className="relative h-[160px] w-full overflow-hidden">
        <img
          src={spot.coverPhoto}
          alt={spot.name}
          className="w-full h-full object-cover"
        />
        <button
          onClick={handleSave}
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/55 transition-colors"
          aria-label={isSaved ? "Unsave spot" : "Save spot"}
        >
          <HeartIcon
            size={16}
            className={isSaved ? "text-red-400 fill-red-400" : "text-white/90"}
          />
        </button>
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm">
          {spot.score.toFixed(1)}{" "}
          <span className="font-normal opacity-70">/ 10</span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="font-medium text-text text-lg leading-tight">
            {spot.name}
          </h3>
          <span className="text-xs text-muted bg-background px-2 py-1 rounded-full w-fit border-[0.5px] border-border">
            {spot.neighborhood}
          </span>
        </div>

        {/* Amenity Pills */}
        <div className="flex flex-wrap gap-2 mt-1">
          {spot.amenities.wifi !== "Unknown" && (
            <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border-[0.5px] border-blue-200">
              {spot.amenities.wifi}
            </span>
          )}
          {spot.amenities.noise !== "Unknown" && (
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border-[0.5px] border-emerald-200">
              {spot.amenities.noise}
            </span>
          )}
          {spot.amenities.outlets !== "Unknown" && (
            <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border-[0.5px] border-amber-200">
              {spot.amenities.outlets}
            </span>
          )}
        </div>

        {/* AI Reasoning */}
        {aiReasoning && (
          <div className="flex items-start gap-1.5">
            <SparklesIcon
              size={12}
              className="text-amber-500 flex-shrink-0 mt-0.5"
            />
            <p className="text-xs text-muted leading-relaxed">{aiReasoning}</p>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleDirections}
          className="flex items-center justify-center gap-2 w-full mt-1 px-4 py-2 bg-[#1a1a1a] text-white text-sm font-medium rounded-lg hover:bg-[#333] transition-colors"
        >
          <NavigationIcon size={14} />
          <span>Get Directions</span>
        </button>
      </div>

      {/* AI Summary Strip */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t-[0.5px] border-border bg-[#fdfdfc]">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
          <SparklesIcon size={13} className="text-amber-500" />
          <span>AI Summary</span>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          <ChevronDownIcon size={14} className="text-muted" />
        </motion.div>
      </div>

      {/* Expandable AI Summary */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden bg-[#fdfdfc]"
          >
            <div className="px-4 pb-4 pt-1">
              <p className="text-sm text-text leading-relaxed">
                {spot.aiSummary}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
