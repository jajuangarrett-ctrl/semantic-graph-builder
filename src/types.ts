import type { TFile } from "obsidian";

export interface SemanticGraphBuilderSettings {
  minimumSimilarityScore: number;
  maximumSuggestionsPerNote: number;
  excludedFolders: string[];
  requirePreviewBeforeInsert: boolean;
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
  selected: boolean;
}

export const DEFAULT_EXCLUDED_FOLDERS = [
  "Templates",
  "Archive",
  "Attachments",
  "Daily Notes",
];
