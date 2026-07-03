import { App, ButtonComponent, Modal, Notice } from "obsidian";
import type { SemanticLinksUpdate } from "../linkWriter";

interface PreviewModalOptions {
  filePath: string;
  update: SemanticLinksUpdate;
  onConfirm: () => Promise<void>;
}

export class PreviewModal extends Modal {
  private options: PreviewModalOptions;

  constructor(app: App, options: PreviewModalOptions) {
    super(app);
    this.options = options;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    this.modalEl.addClass("semantic-links-preview-modal");
    this.setTitle("Preview Semantic Links");

    contentEl.createEl("p", {
      cls: "semantic-links-preview-modal__intro",
      text: "Review the exact semantic-links block before it is written.",
    });

    const summaryEl = contentEl.createDiv({
      cls: "semantic-links-preview-modal__summary",
    });
    this.renderSummaryItem(summaryEl, "Note", this.options.filePath);
    this.renderSummaryItem(
      summaryEl,
      "Action",
      this.options.update.existingBlockFound
        ? "Update existing semantic-links block"
        : "Create semantic-links block"
    );
    this.renderSummaryItem(
      summaryEl,
      "New links",
      String(this.options.update.addedLinks.length)
    );

    const previewLabelEl = contentEl.createEl("h3", {
      text: "Markdown Preview",
    });
    previewLabelEl.addClass("semantic-links-preview-modal__heading");

    contentEl.createEl("pre", {
      cls: "semantic-links-preview-modal__markdown",
      text: this.options.update.blockMarkdown,
    });

    if (this.options.update.skippedLinks.length > 0) {
      this.renderSkippedLinks();
    }

    const actionsEl = contentEl.createDiv({
      cls: "semantic-links-preview-modal__actions",
    });
    new ButtonComponent(actionsEl)
      .setButtonText("Cancel")
      .onClick(() => this.close());

    const confirmButton = new ButtonComponent(actionsEl)
      .setButtonText("Insert Links")
      .setCta()
      .onClick(async () => {
        confirmButton.setDisabled(true);

        try {
          await this.options.onConfirm();
          this.close();
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown write error";
          new Notice(`Semantic Graph Builder did not write links: ${message}`);
          confirmButton.setDisabled(false);
        }
      });
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private renderSummaryItem(
    containerEl: HTMLElement,
    label: string,
    value: string
  ): void {
    const itemEl = containerEl.createDiv({
      cls: "semantic-links-preview-modal__summary-item",
    });
    itemEl.createSpan({ text: label });
    itemEl.createSpan({ text: value });
  }

  private renderSkippedLinks(): void {
    const skippedEl = this.contentEl.createDiv({
      cls: "semantic-links-preview-modal__skipped",
    });
    skippedEl.createEl("h3", {
      cls: "semantic-links-preview-modal__heading",
      text: "Skipped Links",
    });

    const listEl = skippedEl.createEl("ul");

    for (const skippedLink of this.options.update.skippedLinks) {
      const reason =
        skippedLink.reason === "already-in-block"
          ? "already in semantic-links block"
          : "already linked elsewhere in note";
      listEl.createEl("li", {
        text: `${skippedLink.wikilink} (${reason})`,
      });
    }
  }
}
