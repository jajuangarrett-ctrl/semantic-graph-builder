import type {
  ExistingSemanticLinkStatus,
  SemanticLinkSuggestion,
} from "./types";

export const SEMANTIC_LINKS_START = "<!-- semantic-links:start -->";
export const SEMANTIC_LINKS_END = "<!-- semantic-links:end -->";

export interface SemanticLinkEntry {
  title: string;
  path: string;
  target: string;
  wikilink: string;
}

export interface SkippedSemanticLink extends SemanticLinkEntry {
  reason: "already-in-block" | "already-in-note";
}

export interface SemanticLinksUpdate {
  updatedContent: string;
  blockMarkdown: string;
  existingBlockFound: boolean;
  changed: boolean;
  blockedReason?: string;
  addedLinks: SemanticLinkEntry[];
  existingBlockLinks: SemanticLinkEntry[];
  skippedLinks: SkippedSemanticLink[];
}

interface ExistingSemanticBlock {
  markdown: string;
  startIndex: number;
  endIndex: number;
}

interface ParsedWikiLink {
  raw: string;
  target: string;
  keys: Set<string>;
}

export function prepareSemanticLinksUpdate(
  content: string,
  selectedSuggestions: Pick<SemanticLinkSuggestion, "title" | "path">[]
): SemanticLinksUpdate {
  const existingBlock = findSemanticLinksBlock(content);

  if (!existingBlock && content.includes(SEMANTIC_LINKS_START)) {
    return {
      updatedContent: content,
      blockMarkdown: "",
      existingBlockFound: false,
      changed: false,
      blockedReason:
        "The note has a semantic-links start marker without a matching end marker.",
      addedLinks: [],
      existingBlockLinks: [],
      skippedLinks: [],
    };
  }

  const outsideContent = existingBlock
    ? `${content.slice(0, existingBlock.startIndex)}${content.slice(
        existingBlock.endIndex
      )}`
    : content;
  const outsideLinkKeys = extractLinkKeys(outsideContent);
  const existingBlockLinks = existingBlock
    ? extractWikiLinks(existingBlock.markdown).map((link) =>
        entryFromWikiLink(link.raw, link.target)
      )
    : [];
  const blockLinkKeys = new Set<string>();
  const uniqueExistingBlockLinks: SemanticLinkEntry[] = [];

  for (const link of existingBlockLinks) {
    const keys = linkKeys(link.target);

    if (hasAnyKey(blockLinkKeys, keys)) {
      continue;
    }

    addKeys(blockLinkKeys, keys);
    uniqueExistingBlockLinks.push(link);
  }

  const addedLinks: SemanticLinkEntry[] = [];
  const skippedLinks: SkippedSemanticLink[] = [];

  for (const suggestion of selectedSuggestions) {
    const entry = entryFromSuggestion(suggestion);
    const keys = linkKeys(entry.target);

    if (hasAnyKey(outsideLinkKeys, keys)) {
      skippedLinks.push({ ...entry, reason: "already-in-note" });
      continue;
    }

    if (hasAnyKey(blockLinkKeys, keys)) {
      skippedLinks.push({ ...entry, reason: "already-in-block" });
      continue;
    }

    addKeys(blockLinkKeys, keys);
    addedLinks.push(entry);
  }

  const finalLinks = [...uniqueExistingBlockLinks, ...addedLinks];
  const blockMarkdown =
    existingBlock || finalLinks.length > 0
      ? renderSemanticLinksBlock(finalLinks)
      : "";
  const updatedContent = blockMarkdown
    ? existingBlock
      ? replaceSemanticLinksBlock(content, existingBlock, blockMarkdown)
      : appendSemanticLinksBlock(content, blockMarkdown)
    : content;

  return {
    updatedContent,
    blockMarkdown,
    existingBlockFound: Boolean(existingBlock),
    changed: updatedContent !== content,
    addedLinks,
    existingBlockLinks: uniqueExistingBlockLinks,
    skippedLinks,
  };
}

export function renderSemanticLinksBlock(links: SemanticLinkEntry[]): string {
  const linkLines = links.map((link) => `* ${link.wikilink}`);

  return [
    SEMANTIC_LINKS_START,
    "",
    "### Related Notes",
    "",
    ...linkLines,
    "",
    SEMANTIC_LINKS_END,
  ].join("\n");
}

export function entryFromSuggestion(
  suggestion: Pick<SemanticLinkSuggestion, "title" | "path">
): SemanticLinkEntry {
  const target = pathToWikilinkTarget(suggestion.path);

  return {
    title: suggestion.title,
    path: suggestion.path,
    target,
    wikilink: formatWikilink(target, suggestion.title),
  };
}

export function getExistingSemanticLinkStatus(
  content: string,
  suggestion: Pick<SemanticLinkSuggestion, "title" | "path">
): ExistingSemanticLinkStatus | null {
  const existingBlock = findSemanticLinksBlock(content);
  const outsideContent = existingBlock
    ? `${content.slice(0, existingBlock.startIndex)}${content.slice(
        existingBlock.endIndex
      )}`
    : content;
  const outsideLinkKeys = extractLinkKeys(outsideContent);
  const blockLinkKeys = existingBlock
    ? extractLinkKeys(existingBlock.markdown).reduce((keys, link) => {
        addKeys(keys, link.keys);

        return keys;
      }, new Set<string>())
    : new Set<string>();
  const entry = entryFromSuggestion(suggestion);
  const candidateKeys = linkKeys(entry.target);

  if (hasAnyKey(blockLinkKeys, candidateKeys)) {
    return "already-in-block";
  }

  if (hasAnyKey(outsideLinkKeys, candidateKeys)) {
    return "already-in-note";
  }

  return null;
}

function findSemanticLinksBlock(content: string): ExistingSemanticBlock | null {
  const startIndex = content.indexOf(SEMANTIC_LINKS_START);

  if (startIndex === -1) {
    return null;
  }

  const endMarkerIndex = content.indexOf(SEMANTIC_LINKS_END, startIndex);

  if (endMarkerIndex === -1) {
    return null;
  }

  const endIndex = endMarkerIndex + SEMANTIC_LINKS_END.length;

  return {
    markdown: content.slice(startIndex, endIndex),
    startIndex,
    endIndex,
  };
}

function replaceSemanticLinksBlock(
  content: string,
  existingBlock: ExistingSemanticBlock,
  blockMarkdown: string
): string {
  return `${content.slice(0, existingBlock.startIndex)}${blockMarkdown}${content.slice(
    existingBlock.endIndex
  )}`;
}

function appendSemanticLinksBlock(content: string, blockMarkdown: string): string {
  const trimmedEndContent = content.replace(/\s+$/g, "");

  if (trimmedEndContent.length === 0) {
    return `${blockMarkdown}\n`;
  }

  return `${trimmedEndContent}\n\n${blockMarkdown}\n`;
}

function extractWikiLinks(markdown: string): ParsedWikiLink[] {
  const links: ParsedWikiLink[] = [];
  const wikiLinkPattern = /(?<!!)\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;
  let match: RegExpExecArray | null;

  while ((match = wikiLinkPattern.exec(markdown)) !== null) {
    const target = match[1].trim();

    links.push({
      raw: match[0],
      target,
      keys: linkKeys(target),
    });
  }

  return links;
}

function extractLinkKeys(markdown: string): Set<string> {
  const keys = new Set<string>();

  for (const link of extractWikiLinks(markdown)) {
    addKeys(keys, link.keys);
  }

  return keys;
}

function entryFromWikiLink(wikilink: string, target: string): SemanticLinkEntry {
  const title = target.split("/").pop() ?? target;

  return {
    title,
    path: `${target}.md`,
    target,
    wikilink,
  };
}

function pathToWikilinkTarget(path: string): string {
  return path.replace(/\.md$/i, "");
}

function formatWikilink(target: string, title: string): string {
  const targetTitle = target.split("/").pop() ?? target;

  if (target === title) {
    return `[[${target}]]`;
  }

  return `[[${target}|${title || targetTitle}]]`;
}

function linkKeys(target: string): Set<string> {
  const normalizedTarget = normalizeTarget(target);
  const basename = normalizedTarget.split("/").pop() ?? normalizedTarget;

  return new Set([normalizedTarget, basename]);
}

function normalizeTarget(target: string): string {
  return target
    .replace(/\.md$/i, "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .toLocaleLowerCase();
}

function hasAnyKey(existingKeys: Set<string>, candidateKeys: Set<string>): boolean {
  for (const key of candidateKeys) {
    if (existingKeys.has(key)) {
      return true;
    }
  }

  return false;
}

function addKeys(targetSet: Set<string>, keys: Set<string>): void {
  for (const key of keys) {
    targetSet.add(key);
  }
}
