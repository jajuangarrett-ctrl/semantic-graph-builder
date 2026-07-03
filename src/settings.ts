import { App, PluginSettingTab, Setting } from "obsidian";
import type SemanticGraphBuilderPlugin from "../main";
import type { SemanticGraphBuilderSettings } from "./types";
import { DEFAULT_EXCLUDED_FOLDERS } from "./types";

export const DEFAULT_SETTINGS: SemanticGraphBuilderSettings = {
  minimumSimilarityScore: 0.2,
  maximumSuggestionsPerNote: 5,
  excludedFolders: DEFAULT_EXCLUDED_FOLDERS,
  requirePreviewBeforeInsert: true,
};

export class SemanticGraphBuilderSettingTab extends PluginSettingTab {
  plugin: SemanticGraphBuilderPlugin;

  constructor(app: App, plugin: SemanticGraphBuilderPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Semantic Graph Builder" });

    new Setting(containerEl)
      .setName("Minimum similarity score")
      .setDesc("Suggestions below this score will be hidden.")
      .addSlider((slider) =>
        slider
          .setLimits(0, 1, 0.05)
          .setValue(this.plugin.settings.minimumSimilarityScore)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.minimumSimilarityScore =
              clampScore(value);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Maximum suggestions per note")
      .setDesc("Caps how many related notes can be shown for the active note.")
      .addSlider((slider) =>
        slider
          .setLimits(1, 20, 1)
          .setValue(this.plugin.settings.maximumSuggestionsPerNote)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.maximumSuggestionsPerNote =
              clampSuggestionLimit(value);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Excluded folders")
      .setDesc("Folders ignored during future scans. One folder per line.")
      .addTextArea((text) => {
        text.inputEl.rows = 6;
        text
          .setPlaceholder(DEFAULT_EXCLUDED_FOLDERS.join("\n"))
          .setValue(this.plugin.settings.excludedFolders.join("\n"))
          .onChange(async (value) => {
            this.plugin.settings.excludedFolders =
              parseExcludedFolders(value);
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Require preview before inserting links")
      .setDesc("Preview confirmation is enforced before any note changes.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.requirePreviewBeforeInsert)
          .onChange(async (value) => {
            this.plugin.settings.requirePreviewBeforeInsert = value;
            await this.plugin.saveSettings();
          })
      );
  }
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_SETTINGS.minimumSimilarityScore;
  }

  return Math.min(1, Math.max(0, Number(value.toFixed(2))));
}

function clampSuggestionLimit(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_SETTINGS.maximumSuggestionsPerNote;
  }

  return Math.min(20, Math.max(1, Math.round(value)));
}

function parseExcludedFolders(value: string): string[] {
  const folders = value
    .split(/\r?\n|,/)
    .map((folder) => folder.trim().replace(/^\/+|\/+$/g, ""))
    .filter((folder) => folder.length > 0);

  return folders.length > 0 ? Array.from(new Set(folders)) : [];
}
