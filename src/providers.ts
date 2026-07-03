import type { App } from "obsidian";
import { SmartConnectionsProvider } from "./smartConnectionsProvider";
import { SuggestionEngine } from "./suggestionEngine";
import type {
  ScannedNote,
  SemanticGraphBuilderSettings,
  SuggestionResult,
} from "./types";

export async function getSuggestionResult(
  app: App,
  settings: SemanticGraphBuilderSettings,
  activeNote: ScannedNote,
  notes: ScannedNote[]
): Promise<SuggestionResult> {
  if (settings.suggestionProvider === "smart-connections") {
    try {
      const smartResult = await new SmartConnectionsProvider(
        app,
        settings
      ).getSuggestions(activeNote, notes);

      if (smartResult?.suggestions.length) {
        return smartResult;
      }

      if (smartResult?.message) {
        return {
          ...localResult(settings, activeNote, notes),
          fallbackUsed: true,
          message: smartResult.message,
        };
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Smart Connections suggestions were unavailable.";

      return {
        ...localResult(settings, activeNote, notes),
        fallbackUsed: true,
        message,
      };
    }

    return {
      ...localResult(settings, activeNote, notes),
      fallbackUsed: true,
      message: "Smart Connections returned no usable suggestions.",
    };
  }

  return localResult(settings, activeNote, notes);
}

function localResult(
  settings: SemanticGraphBuilderSettings,
  activeNote: ScannedNote,
  notes: ScannedNote[]
): SuggestionResult {
  return {
    suggestions: new SuggestionEngine(settings).getSuggestions(activeNote, notes),
    provider: "local",
    fallbackUsed: false,
  };
}
