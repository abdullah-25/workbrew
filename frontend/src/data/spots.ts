export interface Spot {
  id: string;
  name: string;
  neighborhood: string;
  score: number;
  coverPhoto: string;
  amenities: {
    wifi: string;
    noise: string;
    outlets: string;
  };
  aiSummary: string;
  coordinates: [number, number];
}

export interface RecommendedResult {
  id: string;
  reasoning: string;
}

export interface UserPreferences {
  workType: string;
  noisePreference: string;
  sessionLength: string;
  mustHaves: string[];
}
