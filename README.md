# Semantic Graph Builder

Semantic Graph Builder is an Obsidian plugin for turning approved note relationship suggestions into native `[[wikilinks]]`.

## Current Status

MVP complete.

Implemented:

- Plugin manifest
- TypeScript build shell
- Settings tab
- Command palette command: `Semantic Graph Builder: Open Link Suggestions`
- Right sidebar view: `Semantic Links`
- Vault markdown scanner
- Excluded folder handling
- Markdown note text extraction
- Local similarity scoring
- Ranked suggestion generation
- Suggestion selection UI
- Semantic links block writer
- Insert Selected Links control
- Preview modal confirmation
- Confirmed note writing through the semantic-links block

Not implemented yet:

- Smart Connections integration
- OpenAI or local embeddings
- AI-generated relationship explanations
- reciprocal links
- batch vault review queue

## Development

```bash
npm install
npm run build
```

For local Obsidian testing, copy the generated `main.js`, `manifest.json`, and `styles.css` into the vault plugin install folder:

```text
.obsidian/plugins/semantic-graph-builder/
```
