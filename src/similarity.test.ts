import { describe, expect, it } from "vitest";
import type { TFile } from "obsidian";
import { calculateSimilarity, tokenize } from "./similarity";
import { SuggestionEngine } from "./suggestionEngine";
import type { ScannedNote, SemanticGraphBuilderSettings } from "./types";

describe("tokenize", () => {
  it("lowercases text and removes common stop words", () => {
    expect(tokenize("The Student Equity Plan and the CARE team")).toEqual([
      "student",
      "equity",
      "plan",
      "care",
      "team",
    ]);
  });
});

describe("calculateSimilarity", () => {
  it("scores related text higher than unrelated text", () => {
    const source =
      "Student equity plan retention coaching outreach and basic needs referrals";
    const related =
      "Equity outreach coaching improves student retention and referrals";
    const unrelated =
      "Facilities work order schedule parking permits and room inventory";

    expect(calculateSimilarity(source, related).score).toBeGreaterThan(
      calculateSimilarity(source, unrelated).score
    );
  });
});

describe("SuggestionEngine", () => {
  it("excludes the active note, applies limits, and sorts by score", () => {
    const settings: SemanticGraphBuilderSettings = {
      minimumSimilarityScore: 0.1,
      maximumSuggestionsPerNote: 2,
      excludedFolders: [],
      requirePreviewBeforeInsert: true,
    };
    const engine = new SuggestionEngine(settings);
    const active = note(
      "Programs/Student Equity.md",
      "Student equity retention coaching outreach referrals"
    );
    const suggestions = engine.getSuggestions(active, [
      active,
      note(
        "Programs/Retention Coaching.md",
        "Retention coaching student outreach referrals"
      ),
      note("Facilities/Parking.md", "Parking permit inventory"),
      note("Programs/Basic Needs.md", "Student basic needs referrals"),
    ]);

    expect(suggestions.map((suggestion) => suggestion.path)).toEqual([
      "Programs/Retention Coaching.md",
      "Programs/Basic Needs.md",
    ]);
  });
});

function note(path: string, text: string): ScannedNote {
  const basename = path.split("/").pop()?.replace(/\.md$/, "") ?? path;

  return {
    file: { path, basename, extension: "md" } as TFile,
    title: basename,
    path,
    content: text,
    text,
    wordCount: text.split(/\s+/).length,
  };
}
