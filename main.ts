import { Plugin, WorkspaceLeaf } from "obsidian";
import {
  DEFAULT_SETTINGS,
  SemanticGraphBuilderSettingTab,
} from "./src/settings";
import type { SemanticGraphBuilderSettings } from "./src/types";
import {
  SemanticLinksView,
  VIEW_TYPE_SEMANTIC_LINKS,
} from "./src/views/SemanticLinksView";

export default class SemanticGraphBuilderPlugin extends Plugin {
  settings: SemanticGraphBuilderSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();

    this.registerView(
      VIEW_TYPE_SEMANTIC_LINKS,
      (leaf) => new SemanticLinksView(leaf, this)
    );

    this.addCommand({
      id: "open-link-suggestions",
      name: "Open Link Suggestions",
      callback: async () => {
        await this.activateSemanticLinksView();
      },
    });

    this.addSettingTab(new SemanticGraphBuilderSettingTab(this.app, this));
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_SEMANTIC_LINKS);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async activateSemanticLinksView() {
    const existingLeaf = this.app.workspace.getLeavesOfType(
      VIEW_TYPE_SEMANTIC_LINKS
    )[0];
    const leaf = existingLeaf ?? this.createSemanticLinksLeaf();

    await leaf.setViewState({
      type: VIEW_TYPE_SEMANTIC_LINKS,
      active: true,
    });
    await this.app.workspace.revealLeaf(leaf);
  }

  private createSemanticLinksLeaf(): WorkspaceLeaf {
    return (
      this.app.workspace.getRightLeaf(false) ??
      this.app.workspace.getLeaf("split")
    );
  }
}
