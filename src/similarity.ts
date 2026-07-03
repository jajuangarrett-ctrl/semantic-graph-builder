export interface SimilarityResult {
  score: number;
  sharedTerms: string[];
  sourceTokenCount: number;
  candidateTokenCount: number;
}

export const DEFAULT_STOP_WORDS = new Set([
  "a",
  "about",
  "above",
  "after",
  "again",
  "against",
  "all",
  "am",
  "an",
  "and",
  "any",
  "are",
  "as",
  "at",
  "be",
  "because",
  "been",
  "before",
  "being",
  "below",
  "between",
  "both",
  "but",
  "by",
  "can",
  "could",
  "did",
  "do",
  "does",
  "doing",
  "down",
  "during",
  "each",
  "few",
  "for",
  "from",
  "further",
  "had",
  "has",
  "have",
  "having",
  "he",
  "her",
  "here",
  "hers",
  "herself",
  "him",
  "himself",
  "his",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "itself",
  "just",
  "me",
  "more",
  "most",
  "my",
  "myself",
  "no",
  "nor",
  "not",
  "now",
  "of",
  "off",
  "on",
  "once",
  "only",
  "or",
  "other",
  "our",
  "ours",
  "ourselves",
  "out",
  "over",
  "own",
  "same",
  "she",
  "should",
  "so",
  "some",
  "such",
  "than",
  "that",
  "the",
  "their",
  "theirs",
  "them",
  "themselves",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "to",
  "too",
  "under",
  "until",
  "up",
  "very",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "who",
  "whom",
  "why",
  "will",
  "with",
  "would",
  "you",
  "your",
  "yours",
  "yourself",
  "yourselves",
]);

export function tokenize(
  text: string,
  stopWords: ReadonlySet<string> = DEFAULT_STOP_WORDS
): string[] {
  const normalizedText = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
  const tokens =
    normalizedText.match(/[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*/gu) ?? [];

  return tokens
    .map((token) => token.replace(/^[-']+|[-']+$/g, ""))
    .filter((token) => token.length > 1 && !stopWords.has(token));
}

export function buildTermFrequency(tokens: string[]): Map<string, number> {
  const frequencies = new Map<string, number>();

  for (const token of tokens) {
    frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
  }

  return frequencies;
}

export function calculateSimilarity(
  sourceText: string,
  candidateText: string
): SimilarityResult {
  const sourceTokens = tokenize(sourceText);
  const candidateTokens = tokenize(candidateText);
  const sourceFrequency = buildTermFrequency(sourceTokens);
  const candidateFrequency = buildTermFrequency(candidateTokens);
  const sharedTerms = getSharedTerms(sourceFrequency, candidateFrequency);

  return {
    score: cosineSimilarity(sourceFrequency, candidateFrequency),
    sharedTerms,
    sourceTokenCount: sourceTokens.length,
    candidateTokenCount: candidateTokens.length,
  };
}

export function cosineSimilarity(
  sourceFrequency: Map<string, number>,
  candidateFrequency: Map<string, number>
): number {
  if (sourceFrequency.size === 0 || candidateFrequency.size === 0) {
    return 0;
  }

  let dotProduct = 0;
  let sourceMagnitude = 0;
  let candidateMagnitude = 0;

  for (const [term, sourceCount] of sourceFrequency) {
    sourceMagnitude += sourceCount * sourceCount;
    dotProduct += sourceCount * (candidateFrequency.get(term) ?? 0);
  }

  for (const candidateCount of candidateFrequency.values()) {
    candidateMagnitude += candidateCount * candidateCount;
  }

  if (sourceMagnitude === 0 || candidateMagnitude === 0) {
    return 0;
  }

  return roundScore(
    dotProduct / (Math.sqrt(sourceMagnitude) * Math.sqrt(candidateMagnitude))
  );
}

function getSharedTerms(
  sourceFrequency: Map<string, number>,
  candidateFrequency: Map<string, number>
): string[] {
  return Array.from(sourceFrequency.keys())
    .filter((term) => candidateFrequency.has(term))
    .sort();
}

function roundScore(score: number): number {
  return Math.round(score * 10000) / 10000;
}
