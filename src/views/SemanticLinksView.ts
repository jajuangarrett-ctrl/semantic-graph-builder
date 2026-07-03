import {
  ButtonComponent,
  ItemView,
  MarkdownView,
  Notice,
  WorkspaceLeaf,
} from "obsidian";
import type { TFile } from "obsidian";
import type SemanticGraphBuilderPlugin from "../../main";
import { prepareSemanticLinksUpdate } from "../linkWriter";
import { PreviewModal } from "../modals/PreviewModal";
import { VaultScanner } from "../scanner";
import { SuggestionEngine } from "../suggestionEngine";
import type {
  ScannedNote,
  SemanticLinkSuggestion,
  VaultScanResult,
} from "../types";

export const VIEW_TYPE_SEMANTIC_LINKS = "semantic-graph-builder-links";

export class SemanticLinksView extends ItemView {
  plugin: SemanticGraphBuilderPlugin;
  private scanRequestId = 0;
  private activeNotePath = "";
  private selectedSuggestionPaths = new Set<string>();

  constructor(leaf: WorkspaceLeaf, plugin: SemanticGraphBuilderPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_SEMANTIC_LINKS;
  }

  getDisplayText(): string {
    return "Semantic Links";
  }

  getIcon(): string {
    return "network";
  }

  async onOpen(): Promise<void> {
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        void this.render();
      })
    );
    await this.render();
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
  }

  async render(): Promise<void> {
    const activeFile = this.getActiveMarkdownFile();
    const requestId = ++this.scanRequestId;
    this.resetSelectionWhenActiveNoteChanges(activeFile?.path ?? "");

    this.renderLoading(activeFile);

    try {
      const scanner = new VaultScanner(this.app, this.plugin.settings);
      const result = await scanner.scanMarkdownFiles();

      if (requestId !== this.scanRequestId) {
        return;
      }

      const activeNote = activeFile
        ? result.notes.find((note) => note.path === activeFile.path) ?? null
        : null;
      const activeNoteExcluded = activeFile
        ? scanner.isPathExcluded(activeFile.path)
        : false;
      const suggestions = activeNote
        ? new SuggestionEngine(this.plugin.settings).getSuggestions(
            activeNote,
            result.notes
          )
        : [];
      this.pruneSelection(suggestions);

      this.renderScanResult(
        result,
        activeFile,
        activeNote,
        activeNoteExcluded,
        suggestions
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown scan error";
      new Notice(`Semantic Graph Builder scan failed: ${message}`);
      this.renderScanError(activeFile, message);
    }
  }

  private renderLoading(activeFile: TFile | null): void {
    this.contentEl.empty();
    this.contentEl.addClass("semantic-links-view");

    this.contentEl.createEl("h2", { text: "Semantic Links" });
    this.renderCurrentNote(activeFile);

    this.contentEl.createDiv({
      cls: "semantic-links-view__status",
      text: "Scanning markdown notes...",
    });
  }

  private renderScanResult(
    result: VaultScanResult,
    activeFile: TFile | null,
    activeNote: ScannedNote | null,
    activeNoteExcluded: boolean,
    suggestions: SemanticLinkSuggestion[]
  ): void {
    this.contentEl.empty();
    this.contentEl.addClass("semantic-links-view");

    this.contentEl.createEl("h2", { text: "Semantic Links" });
    this.renderCurrentNote(activeFile);

    const summaryEl = this.contentEl.createDiv({
      cls: "semantic-links-view__summary",
    });
    this.renderMetric(summaryEl, "Scanned notes", result.notes.length);
    this.renderMetric(
      summaryEl,
      "Excluded markdown files",
      result.excludedMarkdownFiles
    );
    this.renderMetric(
      summaryEl,
      "Total markdown files",
      result.totalMarkdownFiles
    );

    const placeholderEl = this.contentEl.createDiv({
      cls: "semantic-links-view__placeholder",
    });
    placeholderEl.createEl("strong", { text: "Scanner ready" });

    if (!activeFile) {
      placeholderEl.createEl("p", {
        text: "Open a markdown note to extract active-note text.",
      });
    } else if (activeNoteExcluded) {
      placeholderEl.createEl("p", {
        text: "The active note is in an excluded folder.",
      });
    } else if (activeNote) {
      placeholderEl.createEl("p", {
        text: `Active note text extracted: ${activeNote.wordCount} words. ${suggestions.length} candidate suggestions meet the current threshold.`,
      });
    } else {
      placeholderEl.createEl("p", {
        text: "The active note was not included in the scan.",
      });
    }

    if (activeNote && !activeNoteExcluded) {
      this.renderSuggestions(suggestions);
    }

    const actionEl = this.contentEl.createDiv({
      cls: "semantic-links-view__actions",
    });
    new ButtonComponent(actionEl)
      .setButtonText("Rescan")
      .onClick(() => {
        void this.render();
      });
  }

  private renderScanError(activeFile: TFile | null, message: string): void {
    this.contentEl.empty();
    this.contentEl.addClass("semantic-links-view");

    this.contentEl.createEl("h2", { text: "Semantic Links" });
    this.renderCurrentNote(activeFile);

    this.contentEl.createDiv({
      cls: "semantic-links-view__placeholder",
      text: `Scan failed: ${message}`,
    });
  }

  private renderSuggestions(suggestions: SemanticLinkSuggestion[]): void {
    const sectionEl = this.contentEl.createDiv({
      cls: "semantic-links-view__suggestions",
    });
    const headerEl = sectionEl.createDiv({
      cls: "semantic-links-view__suggestions-header",
    });
    headerEl.createEl("h3", { text: "Suggestions" });
    const selectedCountEl = headerEl.createSpan({
      cls: "semantic-links-view__selected-count",
    });
    this.updateSelectedCount(selectedCountEl);

    if (suggestions.length === 0) {
      sectionEl.createDiv({
        cls: "semantic-links-view__empty",
        text: "No suggestions meet the current threshold.",
      });
      return;
    }

    const listEl = sectionEl.createDiv({
      cls: "semantic-links-suggestions-list",
    });
    const actionsEl = sectionEl.createDiv({
      cls: "semantic-links-view__insert-actions",
    });
    const insertButton = new ButtonComponent(actionsEl)
      .setButtonText("Insert Selected Links")
      .setCta()
      .setDisabled(this.selectedSuggestionPaths.size === 0)
      .onClick(() => {
        void this.handleInsertSelectedLinks(suggestions);
      });

    for (const suggestion of suggestions) {
      this.renderSuggestion(listEl, suggestion, selectedCountEl, insertButton);
    }
  }

  private renderSuggestion(
    containerEl: HTMLElement,
    suggestion: SemanticLinkSuggestion,
    selectedCountEl: HTMLElement,
    insertButton: ButtonComponent
  ): void {
    const suggestionEl = containerEl.createDiv({
      cls: "semantic-links-suggestion",
    });
    const isSelected = this.selectedSuggestionPaths.has(suggestion.path);
    suggestionEl.classList.toggle("is-selected", isSelected);

    const checkbox = suggestionEl.createEl("input", {
      cls: "semantic-links-suggestion__checkbox",
    }) as HTMLInputElement;
    checkbox.type = "checkbox";
    checkbox.checked = isSelected;
    checkbox.ariaLabel = `Select ${suggestion.title}`;
    checkbox.addEventListener("change", () => {
      this.setSuggestionSelected(
        suggestion.path,
        checkbox.checked,
        suggestionEl,
        selectedCountEl,
        insertButton
      );
    });

    const bodyEl = suggestionEl.createDiv({
      cls: "semantic-links-suggestion__body",
    });
    const titleRowEl = bodyEl.createDiv({
      cls: "semantic-links-suggestion__title-row",
    });
    titleRowEl.createDiv({
      cls: "semantic-links-suggestion__title",
      text: suggestion.title,
    });
    titleRowEl.createDiv({
      cls: "semantic-links-suggestion__score",
      text: suggestion.score.toFixed(2),
    });
    bodyEl.createDiv({
      cls: "semantic-links-suggestion__path",
      text: suggestion.path,
    });

    if (suggestion.sharedTerms.length > 0) {
      bodyEl.createDiv({
        cls: "semantic-links-suggestion__terms",
        text: `Shared: ${suggestion.sharedTerms.slice(0, 8).join(", ")}`,
      });
    }
  }

  private setSuggestionSelected(
    path: string,
    selected: boolean,
    suggestionEl: HTMLElement,
    selectedCountEl: HTMLElement,
    insertButton: ButtonComponent
  ): void {
    if (selected) {
      this.selectedSuggestionPaths.add(path);
    } else {
      this.selectedSuggestionPaths.delete(path);
    }

    suggestionEl.classList.toggle("is-selected", selected);
    this.updateSelectedCount(selectedCountEl);
    insertButton.setDisabled(this.selectedSuggestionPaths.size === 0);
  }

  private async handleInsertSelectedLinks(
    suggestions: SemanticLinkSuggestion[]
  ): Promise<void> {
    const activeFile = this.getActiveMarkdownFile();

    if (!activeFile) {
      new Notice("Open a markdown note before inserting semantic links.");
      return;
    }

    const selectedSuggestions = suggestions.filter((suggestion) =>
      this.selectedSuggestionPaths.has(suggestion.path)
    );

    if (selectedSuggestions.length === 0) {
      new Notice("Select at least one suggestion first.");
      return;
    }

    const content = await this.app.vault.cachedRead(activeFile);
    const update = prepareSemanticLinksUpdate(content, selectedSuggestions);

    if (update.blockedReason) {
      new Notice(update.blockedReason);
      return;
    }

    if (update.addedLinks.length === 0) {
      new Notice("No new semantic links to insert.");
      return;
    }

    new PreviewModal(this.app, {
      filePath: activeFile.path,
      update,
      onConfirm: async () => {
        const latestContent = await this.app.vault.cachedRead(activeFile);

        if (latestContent !== content) {
          throw new Error(
            "The note changed after the preview opened. Open a fresh preview and try again."
          );
        }

        await this.app.vault.modify(activeFile, update.updatedContent);
        this.selectedSuggestionPaths.clear();
        new Notice(
          `Inserted ${update.addedLinks.length} semantic link${
            update.addedLinks.length === 1 ? "" : "s"
          }.`
        );
        await this.render();
      },
    }).open();
  }

  private updateSelectedCount(containerEl: HTMLElement): void {
    containerEl.setText(`${this.selectedSuggestionPaths.size} selected`);
  }

  private resetSelectionWhenActiveNoteChanges(activePath: string): void {
    if (activePath === this.activeNotePath) {
      return;
    }

    this.activeNotePath = activePath;
    this.selectedSuggestionPaths.clear();
  }

  private pruneSelection(suggestions: SemanticLinkSuggestion[]): void {
    const visiblePaths = new Set(suggestions.map((suggestion) => suggestion.path));

    for (const selectedPath of Array.from(this.selectedSuggestionPaths)) {
      if (!visiblePaths.has(selectedPath)) {
        this.selectedSuggestionPaths.delete(selectedPath);
      }
    }
  }

  private renderCurrentNote(activeFile: TFile | null): void {
    const currentNoteEl = this.contentEl.createDiv({
      cls: "semantic-links-view__current",
    });
    currentNoteEl.createSpan({ text: "Current note: " });
    currentNoteEl.createSpan({
      text: activeFile ? activeFile.path : "No active markdown note",
    });
  }

  private renderMetric(containerEl: HTMLElement, label: string, value: number) {
    const metricEl = containerEl.createDiv({
      cls: "semantic-links-view__metric",
    });
    metricEl.createSpan({ text: label });
    metricEl.createSpan({ text: String(value) });
  }

  private getActiveMarkdownFile(): TFile | null {
    const activeMarkdownView =
      this.app.workspace.getActiveViewOfType(MarkdownView);

    if (activeMarkdownView?.file) {
      return activeMarkdownView.file;
    }

    const activeFile = this.app.workspace.getActiveFile();
    return activeFile?.extension === "md" ? activeFile : null;
  }
}
