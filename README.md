# Semantic Graph Builder

Semantic Graph Builder is an Obsidian plugin for turning approved note relationship suggestions into native `[[wikilinks]]`.

## Current Status

MVP complete. Version `0.2.0` adds an optional Smart Connections-backed suggestion provider.

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
- Suggestion provider setting
- Smart Connections semantic suggestions when Smart Connections is installed and indexed
- Local keyword-overlap fallback when Smart Connections is unavailable or returns no usable suggestions

Not implemented yet:

- First-party OpenAI or local embeddings inside this plugin
- AI-generated relationship explanations
- reciprocal links
- batch vault review queue

## Suggestion Providers

The default provider is `Smart Connections, fallback to local`. Semantic Graph Builder does not copy or modify Smart Connections; it reads available Smart Connections relationship results at runtime, then keeps its own safe preview-and-insert workflow for writing native `[[wikilinks]]`.

If Smart Connections is not installed, not enabled, or has not indexed the active note, the plugin falls back to local keyword overlap.

## Development

```bash
npm install
npm run build
```

For local Obsidian testing, copy the generated `main.js`, `manifest.json`, and `styles.css` into the vault plugin install folder:

```text
.obsidian/plugins/semantic-graph-builder/
```
