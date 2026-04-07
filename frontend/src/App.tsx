import { useEffect, useMemo, useState } from "react";
import { LeftNav, NavItem } from "./components/LeftNav";
import { DiscoveryPanel } from "./components/DiscoveryPanel";
import { SavedPanel } from "./components/SavedPanel";
import { PreferencesPanel } from "./components/PreferencesPanel";
import { MapView } from "./components/MapView";
import { Spot, RecommendedResult, UserPreferences } from "./data/spots";

export type FilterOption = "All" | "Quiet" | "Fast WiFi";

const SAVED_KEY = "workbrew_saved_spots";
const PREFS_KEY = "workbrew_preferences";

const DEFAULT_PREFERENCES: UserPreferences = {
  workType: "Mixed",
  noisePreference: "No preference",
  sessionLength: "Half day (2-4hrs)",
  mustHaves: [],
};

function loadSaved(): Set<string> {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function persistSaved(ids: Set<string>) {
  localStorage.setItem(SAVED_KEY, JSON.stringify([...ids]));
}

function loadPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw
      ? { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) }
      : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function persistPreferences(prefs: UserPreferences) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function App() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [minScore, setMinScore] = useState<number>(1);
  const [activeFilter, setActiveFilter] = useState<FilterOption>("All");
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [expandedSpotId, setExpandedSpotId] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState<NavItem>("search");
  const [savedSpotIds, setSavedSpotIds] = useState<Set<string>>(loadSaved);
  const [preferences, setPreferences] =
    useState<UserPreferences>(loadPreferences);
  const [aiResults, setAiResults] = useState<RecommendedResult[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiQuery, setAiQuery] = useState("");

  useEffect(() => {
    fetch("/api/spots")
      .then((r) => r.json())
      .then((data: Spot[]) => setSpots(data))
      .catch(console.error);
  }, []);

  const handleToggleSave = (id: string) => {
    setSavedSpotIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persistSaved(next);
      return next;
    });
  };

  const handlePreferencesChange = (prefs: UserPreferences) => {
    setPreferences(prefs);
    persistPreferences(prefs);
  };

  const handleAiSearch = async (query: string) => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/spots/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          preferences: {
            work_type: preferences.workType,
            noise_preference: preferences.noisePreference,
            session_length: preferences.sessionLength,
            must_haves: preferences.mustHaves,
          },
        }),
      });
      if (!res.ok) {
        let serverMessage: string | null = null;
        try {
          const body = (await res.json()) as {
            detail?: string | { msg?: string }[];
          };
          if (typeof body?.detail === "string") serverMessage = body.detail;
          else if (Array.isArray(body?.detail)) {
            serverMessage = body.detail
              .map((e) =>
                typeof e === "object" && e && "msg" in e ? String(e.msg) : "",
              )
              .filter(Boolean)
              .join("; ");
          }
        } catch {
          /* ignore non-JSON error bodies */
        }
        if (res.status === 429)
          throw new Error("Please wait a few seconds and try again.");
        throw new Error(
          serverMessage || "Recommendations unavailable right now.",
        );
      }
      const data = await res.json();
      setAiResults(data.results);
      setAiQuery(query);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Something went wrong.");
      setAiResults(null);
    } finally {
      setAiLoading(false);
    }
  };

  const handleClearAiSearch = () => {
    setAiResults(null);
    setAiQuery("");
    setAiError(null);
  };

  const filteredSpots = useMemo(() => {
    return spots
      .filter((spot) => {
        if (spot.score < minScore) return false;
        if (activeFilter === "Quiet") {
          if (spot.amenities.noise !== "Quiet") return false;
        } else if (activeFilter === "Fast WiFi") {
          if (!["Fast", "Reliable"].includes(spot.amenities.wifi)) return false;
        }
        return true;
      })
      .sort((a, b) => b.score - a.score);
  }, [spots, minScore, activeFilter]);

  const displaySpots = useMemo(() => {
    if (aiResults) {
      const spotMap = new Map(spots.map((s) => [s.id, s]));
      return aiResults
        .map((r) => spotMap.get(r.id))
        .filter((s): s is Spot => s !== undefined);
    }
    return filteredSpots;
  }, [spots, filteredSpots, aiResults]);

  const reasoningMap = useMemo(() => {
    if (!aiResults) return null;
    return new Map(aiResults.map((r) => [r.id, r.reasoning]));
  }, [aiResults]);

  const handleSpotClick = (id: string) => {
    setSelectedSpotId(id);
    setExpandedSpotId((prev) => (prev === id ? null : id));
  };

  const handleMarkerClick = (id: string) => {
    setSelectedSpotId(id);
    setExpandedSpotId(id);
    const element = document.getElementById(`spot-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const panelSpots = activeNav === "saved" ? spots : displaySpots;

  return (
    <div className="flex w-full h-screen overflow-hidden bg-background font-sans text-text">
      <LeftNav activeItem={activeNav} onItemClick={setActiveNav} />

      {activeNav === "preferences" ? (
        <PreferencesPanel
          preferences={preferences}
          onPreferencesChange={handlePreferencesChange}
        />
      ) : activeNav === "saved" ? (
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
          spots={displaySpots}
          selectedSpotId={selectedSpotId}
          expandedSpotId={expandedSpotId}
          onSpotClick={handleSpotClick}
          minScore={minScore}
          onScoreChange={setMinScore}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          savedSpotIds={savedSpotIds}
          onToggleSave={handleToggleSave}
          onAiSearch={handleAiSearch}
          onClearAiSearch={handleClearAiSearch}
          aiLoading={aiLoading}
          aiError={aiError}
          aiQuery={aiQuery}
          reasoningMap={reasoningMap}
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
  );
}
