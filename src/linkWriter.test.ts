import { describe, expect, it } from "vitest";
import { prepareSemanticLinksUpdate } from "./linkWriter";
import type { SemanticLinkSuggestion } from "./types";

describe("prepareSemanticLinksUpdate", () => {
  it("appends a semantic links block when one does not exist", () => {
    const result = prepareSemanticLinksUpdate("# Current Note\n\nBody text.", [
      suggestion("Programs/Student Equity.md", "Student Equity"),
    ]);

    expect(result.existingBlockFound).toBe(false);
    expect(result.addedLinks).toHaveLength(1);
    expect(result.updatedContent).toContain("<!-- semantic-links:start -->");
    expect(result.updatedContent).toContain("### Related Notes");
    expect(result.updatedContent).toContain(
      "* [[Programs/Student Equity|Student Equity]]"
    );
    expect(result.updatedContent).toContain("<!-- semantic-links:end -->");
    expect(result.updatedContent).toContain(
      "Body text.\n\n<!-- semantic-links:start -->"
    );
  });

  it("updates an existing semantic links block instead of creating another one", () => {
    const content = [
      "# Current Note",
      "",
      "<!-- semantic-links:start -->",
      "",
      "Related Notes",
      "",
      "* [[Programs/Student Equity|Student Equity]]",
      "",
      "<!-- semantic-links:end -->",
      "",
      "More text.",
    ].join("\n");
    const result = prepareSemanticLinksUpdate(content, [
      suggestion("Programs/Basic Needs.md", "Basic Needs"),
    ]);

    expect(result.existingBlockFound).toBe(true);
    expect(result.updatedContent.match(/semantic-links:start/g)).toHaveLength(1);
    expect(result.updatedContent).toContain(
      "* [[Programs/Student Equity|Student Equity]]"
    );
    expect(result.updatedContent).toContain(
      "* [[Programs/Basic Needs|Basic Needs]]"
    );
    expect(result.updatedContent).toContain("### Related Notes");
    expect(result.updatedContent).not.toContain("\nRelated Notes\n");
  });

  it("does not duplicate a link that already exists in the semantic links block", () => {
    const content = [
      "<!-- semantic-links:start -->",
      "",
      "### Related Notes",
      "",
      "* [[Programs/Student Equity|Student Equity]]",
      "",
      "<!-- semantic-links:end -->",
    ].join("\n");
    const result = prepareSemanticLinksUpdate(content, [
      suggestion("Programs/Student Equity.md", "Student Equity"),
    ]);

    expect(result.addedLinks).toHaveLength(0);
    expect(result.skippedLinks).toEqual([
      expect.objectContaining({ reason: "already-in-block" }),
    ]);
    expect(result.updatedContent.match(/\[\[Programs\/Student Equity/g)).toHaveLength(1);
  });

  it("does not add a semantic block link when the note already links to the target elsewhere", () => {
    const content = "Already covered in [[Student Equity]].";
    const result = prepareSemanticLinksUpdate(
      content,
      [suggestion("Programs/Student Equity.md", "Student Equity")]
    );

    expect(result.addedLinks).toHaveLength(0);
    expect(result.skippedLinks).toEqual([
      expect.objectContaining({ reason: "already-in-note" }),
    ]);
    expect(result.updatedContent).toBe(content);
    expect(result.updatedContent).not.toContain("* [[Programs/Student Equity");
  });

  it("blocks writes when an existing semantic links block is malformed", () => {
    const content = [
      "# Current Note",
      "",
      "<!-- semantic-links:start -->",
      "",
      "### Related Notes",
    ].join("\n");
    const result = prepareSemanticLinksUpdate(content, [
      suggestion("Programs/Student Equity.md", "Student Equity"),
    ]);

    expect(result.changed).toBe(false);
    expect(result.blockedReason).toContain("without a matching end marker");
    expect(result.updatedContent).toBe(content);
  });
});

function suggestion(path: string, title: string): SemanticLinkSuggestion {
  return {
    path,
    title,
    score: 0.5,
    sharedTerms: [],
    provider: "local",
    selected: false,
  };
}
