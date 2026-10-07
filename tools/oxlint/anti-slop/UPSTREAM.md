# Vendored anti-slop Oxlint plugin

Source repository: **unknown** — the install skill bundle does not publish an upstream
repository or revision, so no source commit is claimed. The files were copied verbatim from the
installer's pristine asset snapshot.

## Pristine snapshot

- Snapshot: `~/.agents/skills/install-anti-slop/assets/anti-slop/` (skill `install-anti-slop`).
- Entry point `index.ts` SHA-256: `41082FBD4489E3E05DDA5F6E74EB22C0C77F336E8F6A964F42C7193A0E4C03FF`.
- Copied byte-for-byte; no local edits to the plugin itself.

## Installed paths

- Plugin entry point: `tools/oxlint/anti-slop/index.ts`
- Generic rules: `tools/oxlint/anti-slop/rules/**`
- Shared helpers: `tools/oxlint/anti-slop/shared/**`
- Vendored Stylistic rule (with its own `UPSTREAM.md` and `LICENSE`):
  `tools/oxlint/anti-slop/vendor/eslint-stylistic/**`
- Optional Effect plugin (present in the snapshot but **not registered**): `tools/oxlint/anti-slop/effect/**`

## Dependency and configuration

- `@oxlint/plugins` pinned to exactly `1.86.0`, matching the resolved `oxlint` `1.86.0`.
- Registered in `.oxlintrc.json` under `jsPlugins` as `{ "name": "anti-slop", ... }`, with all
  generic rules set to `"error"` plus native `oxc/no-accumulating-spread`.
- `.oxfmtrc.json` `ignorePatterns` excludes the vendored plugin and agent-tooling directories so
  they are not reformatted.
- `tsconfig.json` excludes `./tools` from the app typecheck: the vendored plugin imports with
  `.ts` extensions and is loaded by Oxlint, not the Next.js type graph.
- The Effect plugin is intentionally not enabled: the project has no direct `effect` dependency.

## Intentional deviations

- `src/components/ui/**` is excluded from Oxlint (`ignorePatterns`). These are vendored
  shadcn/ui and mapcn registry components; anti-slop is scoped to owned application source
  (`src/app`, `src/components` outside `ui`, `src/lib`, `src/hooks`, `scripts`).

## Local adaptations

None to the plugin source. Rule-level adaptations for the vendored
`padding-line-between-statements` code are documented in
`tools/oxlint/anti-slop/vendor/eslint-stylistic/UPSTREAM.md`.
