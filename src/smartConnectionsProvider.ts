import type { App } from "obsidian";
import { calculateSimilarity } from "./similarity";
import type {
  ScannedNote,
  SemanticGraphBuilderSettings,
  SemanticLinkSuggestion,
  SuggestionResult,
} from "./types";

interface SmartConnectionsPlugin {
  env?: {
    state?: string;
    connections_lists?: {
      new_item?: (source: SmartSource) => SmartConnectionsList | undefined;
    };
    smart_sources?: {
      get?: (path: string) => SmartSource | undefined;
      init_file_path?: (path: string) => SmartSource | undefined;
    };
  };
}

interface SmartConnectionsList {
  get_results?: (params?: Record<string, unknown>) => Promise<SmartConnection[]>;
}

interface SmartSource {
  connections?: SmartConnectionsList;
  find_connections?: (params?: Record<string, unknown>) => Promise<SmartConnection[]>;
}

interface SmartConnection {
  score?: number;
  item?: {
    path?: string;
    key?: string;
  };
}

export class SmartConnectionsProvider {
  app: App;
  settings: SemanticGraphBuilderSettings;

  constructor(app: App, settings: SemanticGraphBuilderSettings) {
    this.app = app;
    this.settings = settings;
  }

  async getSuggestions(
    activeNote: ScannedNote,
    notes: ScannedNote[]
  ): Promise<SuggestionResult | null> {
    const plugin = this.getSmartConnectionsPlugin();
    const smartSources = plugin?.env?.smart_sources;

    if (!plugin?.env || !smartSources?.get) {
      return null;
    }

    const source =
      smartSources.get(activeNote.path) ?? smartSources.init_file_path?.(activeNote.path);

    if (!source) {
      return {
        suggestions: [],
        provider: "smart-connections",
        fallbackUsed: false,
        message:
          "Smart Connections has not indexed this note yet. Rebuild or refresh its index, then rescan.",
      };
    }

    if (
      !source.find_connections &&
      !source.connections?.get_results &&
      !plugin.env.connections_lists?.new_item
    ) {
      return {
        suggestions: [],
        provider: "smart-connections",
        fallbackUsed: false,
        message:
          "Smart Connections has not embedded this note yet. Rebuild or refresh its index, then rescan.",
      };
    }

    const noteByPath = new Map(notes.map((note) => [note.path, note]));
    const minimumScore = clampScore(this.settings.minimumSimilarityScore);
    const maximumSuggestions = clampSuggestionLimit(
      this.settings.maximumSuggestionsPerNote
    );
    const rawConnections = await this.getSmartConnections(
      source,
      plugin,
      {
        limit: Math.max(maximumSuggestions * 3, maximumSuggestions),
        exclude_blocks_from_source_connections: true,
        exclude_frontmatter_blocks: true,
      }
    );

    const suggestions = rawConnections
      .map((connection) =>
        this.toSuggestion(connection, activeNote, noteByPath)
      )
      .filter((suggestion): suggestion is SemanticLinkSuggestion =>
        Boolean(suggestion)
      )
      .filter(
        (suggestion, index, allSuggestions) =>
          allSuggestions.findIndex((item) => item.path === suggestion.path) ===
          index
      )
      .filter((suggestion) => suggestion.score >= minimumScore)
      .slice(0, maximumSuggestions);

    return {
      suggestions,
      provider: "smart-connections",
      fallbackUsed: false,
    };
  }

  private toSuggestion(
    connection: SmartConnection,
    activeNote: ScannedNote,
    noteByPath: Map<string, ScannedNote>
  ): SemanticLinkSuggestion | null {
    const path = normalizeMarkdownPath(connection.item?.path ?? connection.item?.key);
    const score = Number(connection.score);

    if (!path || path === activeNote.path) {
      return null;
    }

    const note = noteByPath.get(path);

    if (!note || !Number.isFinite(score)) {
      return null;
    }

    const localSimilarity = calculateSimilarity(activeNote.text, note.text);

    return {
      title: note.title,
      path: note.path,
      score,
      sharedTerms: localSimilarity.sharedTerms,
      provider: "smart-connections",
      selected: false,
    };
  }

  private getSmartConnectionsPlugin(): SmartConnectionsPlugin | null {
    const plugins = (this.app as unknown as {
      plugins?: {
        plugins?: Record<string, unknown>;
        getPlugin?: (id: string) => unknown;
      };
    }).plugins;
    const plugin =
      plugins?.getPlugin?.("smart-connections") ??
      plugins?.plugins?.["smart-connections"];

    return plugin ? (plugin as SmartConnectionsPlugin) : null;
  }

  private async getSmartConnections(
    source: SmartSource,
    plugin: SmartConnectionsPlugin,
    params: Record<string, unknown>
  ): Promise<SmartConnection[]> {
    const connectionsList =
      source.connections ?? plugin.env?.connections_lists?.new_item?.(source);

    if (connectionsList?.get_results) {
      const results = await connectionsList.get_results(params);

      return Array.isArray(results) ? results : [];
    }

    if (source.find_connections) {
      const results = await source.find_connections(params);

      return Array.isArray(results) ? results : [];
    }

    return [];
  }
}

function normalizeMarkdownPath(path: string | undefined): string {
  if (!path) {
    return "";
  }

  const notePath = path.split("#")[0];

  return notePath.endsWith(".md") ? notePath : "";
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
