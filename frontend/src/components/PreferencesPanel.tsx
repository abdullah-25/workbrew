import { SlidersHorizontalIcon, SparklesIcon } from "lucide-react";
import { UserPreferences } from "../data/spots";

interface PreferencesPanelProps {
  preferences: UserPreferences;
  onPreferencesChange: (prefs: UserPreferences) => void;
}

const WORK_TYPES = [
  "Deep focus work",
  "Meetings & calls",
  "Casual browsing",
  "Mixed",
];
const NOISE_OPTIONS = ["Silent", "Quiet hum", "Lively buzz", "No preference"];
const SESSION_LENGTHS = [
  "Quick stop (< 1hr)",
  "Half day (2-4hrs)",
  "Full day (4+ hrs)",
];
const MUST_HAVES = ["Fast WiFi", "Many outlets", "Good coffee", "Food options"];

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm transition-colors
        ${active ? "bg-[#1a1a1a] text-white" : "bg-white text-text border-[0.5px] border-border hover:bg-[#f0ede8]"}
      `}
    >
      {label}
    </button>
  );
}

export function PreferencesPanel({
  preferences,
  onPreferencesChange,
}: PreferencesPanelProps) {
  const update = (partial: Partial<UserPreferences>) => {
    onPreferencesChange({ ...preferences, ...partial });
  };

  const toggleMustHave = (item: string) => {
    const current = preferences.mustHaves;
    const next = current.includes(item)
      ? current.filter((h) => h !== item)
      : [...current, item];
    update({ mustHaves: next });
  };

  return (
    <div className="w-[320px] h-full flex flex-col bg-background border-r-[0.5px] border-border flex-shrink-0">
      <div className="p-6 border-b-[0.5px] border-border bg-white z-10">
        <div className="flex items-center gap-2 text-text">
          <SlidersHorizontalIcon size={18} />
          <h1 className="text-lg font-medium">Work Profile</h1>
        </div>
        <p className="text-xs text-muted mt-1">
          Personalize your cafe recommendations
        </p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-6">
        {/* Work Style */}
        <div className="flex flex-col gap-2.5">
          <span className="text-sm font-medium text-text">Work Style</span>
          <div className="flex flex-wrap gap-2">
            {WORK_TYPES.map((t) => (
              <Chip
                key={t}
                label={t}
                active={preferences.workType === t}
                onClick={() => update({ workType: t })}
              />
            ))}
          </div>
        </div>

        {/* Noise Preference */}
        <div className="flex flex-col gap-2.5">
          <span className="text-sm font-medium text-text">
            Noise Preference
          </span>
          <div className="flex flex-wrap gap-2">
            {NOISE_OPTIONS.map((n) => (
              <Chip
                key={n}
                label={n}
                active={preferences.noisePreference === n}
                onClick={() => update({ noisePreference: n })}
              />
            ))}
          </div>
        </div>

        {/* Session Length */}
        <div className="flex flex-col gap-2.5">
          <span className="text-sm font-medium text-text">Session Length</span>
          <div className="flex flex-wrap gap-2">
            {SESSION_LENGTHS.map((s) => (
              <Chip
                key={s}
                label={s}
                active={preferences.sessionLength === s}
                onClick={() => update({ sessionLength: s })}
              />
            ))}
          </div>
        </div>

        {/* Must-Haves */}
        <div className="flex flex-col gap-2.5">
          <span className="text-sm font-medium text-text">Must-Haves</span>
          <p className="text-xs text-muted -mt-1">Select all that apply</p>
          <div className="flex flex-wrap gap-2">
            {MUST_HAVES.map((m) => (
              <Chip
                key={m}
                label={m}
                active={preferences.mustHaves.includes(m)}
                onClick={() => toggleMustHave(m)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 py-3 border-t-[0.5px] border-border bg-[#fdfdfc]">
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <SparklesIcon size={12} className="text-amber-500" />
          <span>Your preferences personalize AI recommendations</span>
        </div>
      </div>
    </div>
  );
}
