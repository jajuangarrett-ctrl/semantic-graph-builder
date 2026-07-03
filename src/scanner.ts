import { App, normalizePath } from "obsidian";
import type { TFile } from "obsidian";
import type {
  ScannedNote,
  SemanticGraphBuilderSettings,
  VaultScanResult,
} from "./types";

export class VaultScanner {
  app: App;
  settings: SemanticGraphBuilderSettings;

  constructor(app: App, settings: SemanticGraphBuilderSettings) {
    this.app = app;
    this.settings = settings;
  }

  async scanMarkdownFiles(): Promise<VaultScanResult> {
    const markdownFiles = this.app.vault
      .getMarkdownFiles()
      .sort((a, b) => a.path.localeCompare(b.path));
    const eligibleFiles = markdownFiles.filter(
      (file) => !this.isPathExcluded(file.path)
    );
    const notes = await Promise.all(
      eligibleFiles.map((file) => this.extractNote(file))
    );

    return {
      notes,
      totalMarkdownFiles: markdownFiles.length,
      excludedMarkdownFiles: markdownFiles.length - eligibleFiles.length,
      excludedFolders: normalizeExcludedFolders(this.settings.excludedFolders),
      scannedAt: Date.now(),
    };
  }

  async extractNote(file: TFile): Promise<ScannedNote> {
    const content = await this.app.vault.cachedRead(file);
    const text = extractNoteText(content);

    return {
      file,
      title: file.basename,
      path: file.path,
      content,
      text,
      wordCount: countWords(text),
    };
  }

  isPathExcluded(path: string): boolean {
    return isPathExcluded(path, this.settings.excludedFolders);
  }
}

export function isPathExcluded(path: string, excludedFolders: string[]): boolean {
  const normalizedPath = normalizePath(path);
  const pathParts = normalizedPath.split("/");

  return normalizeExcludedFolders(excludedFolders).some((folder) => {
    if (folder.includes("/")) {
      return normalizedPath === folder || normalizedPath.startsWith(`${folder}/`);
    }

    return pathParts.includes(folder);
  });
}

export function normalizeExcludedFolders(excludedFolders: string[]): string[] {
  const folders = excludedFolders
    .map((folder) => normalizePath(folder.trim()).replace(/^\/+|\/+$/g, ""))
    .filter((folder) => folder.length > 0);

  return Array.from(new Set(folders));
}

export function extractNoteText(markdown: string): string {
  return markdown
    .replace(/^---\s*\n[\s\S]*?\n---\s*(?:\n|$)/, "\n")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/!\[[^\]]*?\]\([^)]*?\)/g, " ")
    .replace(
      /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g,
      (_match, target: string, alias: string | undefined) => alias ?? target
    )
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, " ")
    .replace(/[*_~`>#|()\[\]{}]/g, " ")
    .replace(/^-{3,}$/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function countWords(text: string): number {
  return text.match(/[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}
