import type { TFile } from "obsidian";

export type SuggestionProvider = "smart-connections" | "local";

export interface SemanticGraphBuilderSettings {
  minimumSimilarityScore: number;
  maximumSuggestionsPerNote: number;
  excludedFolders: string[];
  requirePreviewBeforeInsert: boolean;
  suggestionProvider: SuggestionProvider;
}

export interface ScannedNote {
  file: TFile;
  title: string;
  path: string;
  content: string;
  text: string;
  wordCount: number;
}

export interface VaultScanResult {
  notes: ScannedNote[];
  totalMarkdownFiles: number;
  excludedMarkdownFiles: number;
  excludedFolders: string[];
  scannedAt: number;
}

export interface SemanticLinkSuggestion {
  title: string;
  path: string;
  score: number;
  sharedTerms: string[];
  provider: SuggestionProvider;
  selected: boolean;
}

export interface SuggestionResult {
  suggestions: SemanticLinkSuggestion[];
  provider: SuggestionProvider;
  fallbackUsed: boolean;
  message?: string;
}

export const DEFAULT_EXCLUDED_FOLDERS = [
  "Templates",
  "Archive",
  "Attachments",
  "Daily Notes",
];
