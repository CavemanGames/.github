# CavemanGames/.github

Organization profile of **Cave Man's Development Studio** on GitHub.

| Path | What it is |
|---|---|
| `profile/README.md` | The page shown at [github.com/CavemanGames](https://github.com/CavemanGames) |
| `profile/assets/symbol.svg` | Brand symbol, version B (Brand kit v1.1) |
| `profile/stats.svg`, `profile/languages.svg` | Stats cards, generated (do not edit by hand) |
| `scripts/org-stats.mjs` | Reads every org repository through the GitHub API and writes the two cards |
| `.github/workflows/org-stats.yml` | Runs the script every Monday, on demand and when the script changes |

## Stats cards

- Private repositories only add to totals: no names, descriptions or per-repository numbers are
  ever written or logged.
- Forks and this `.github` repository are not counted.
- To count private repositories, add the `ORG_STATS_TOKEN` secret: a fine-grained token owned by
  the CavemanGames organization, repository access **All repositories**, permission
  **Metadata: read-only**, nothing else. Source of truth: Doppler (workspace Caveman).
  Without it, the workflow uses the default token and counts public repositories only.
- Run locally: `GITHUB_TOKEN=... node scripts/org-stats.mjs --org CavemanGames`
  (Node 20+, no dependencies).

## Rules

- Public repository: everything here is visible to anyone. No secrets, no client data.
- Text follows the Cave Man's brand voice; client names only from the confirmed list
  (see `CLAUDE.md` in `CavemanGames/cavemans-site`).
- Code, comments, commits and docs in English.
