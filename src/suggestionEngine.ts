import { calculateSimilarity } from "./similarity";
import type {
  ScannedNote,
  SemanticGraphBuilderSettings,
  SemanticLinkSuggestion,
} from "./types";

export class SuggestionEngine {
  settings: SemanticGraphBuilderSettings;

  constructor(settings: SemanticGraphBuilderSettings) {
    this.settings = settings;
  }

  getSuggestions(
    activeNote: ScannedNote,
    notes: ScannedNote[]
  ): SemanticLinkSuggestion[] {
    const minimumScore = clampScore(this.settings.minimumSimilarityScore);
    const maximumSuggestions = clampSuggestionLimit(
      this.settings.maximumSuggestionsPerNote
    );

    return notes
      .filter((note) => note.path !== activeNote.path)
      .map((note) => {
        const result = calculateSimilarity(activeNote.text, note.text);

        return {
          title: note.title,
          path: note.path,
          score: result.score,
          sharedTerms: result.sharedTerms,
          provider: "local" as const,
          selected: false,
        };
      })
      .filter((suggestion) => suggestion.score >= minimumScore)
      .sort(compareSuggestions)
      .slice(0, maximumSuggestions);
  }
}

export function compareSuggestions(
  first: SemanticLinkSuggestion,
  second: SemanticLinkSuggestion
): number {
  if (second.score !== first.score) {
    return second.score - first.score;
  }

  return first.path.localeCompare(second.path);
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.min(1, Math.max(0, score));
}

function clampSuggestionLimit(limit: number): number {
  if (!Number.isFinite(limit)) {
    return 5;
  }

  return Math.min(20, Math.max(1, Math.round(limit)));
}
