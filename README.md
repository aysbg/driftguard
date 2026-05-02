# DriftGuard

A local-first CLI for detecting spec-to-code drift. Compare OpenAPI and Markdown specs against the routes in your TypeScript or JavaScript codebase to find missing or unimplemented API operations.

## Install

Requires Node.js >= 22.

```bash
npm install -g driftguard
```

Or run without installing:

```bash
npx driftguard scan
```

## Quick Start

Run from your repository root with the default scan paths (spec: `docs`, code: `src`):

```bash
npx driftguard scan
```

Scan with explicit paths and JSON output:

```bash
npx driftguard scan --repo . --spec specs/openapi.yml --code src --json
```

Scan using a config file:

```bash
npx driftguard scan --repo . --config .driftguard.yml --json
```

## Configuration

DriftGuard auto-discovers `.driftguard.yml` at `<repo>/.driftguard.yml`. If the config file is absent, it falls back to the built-in defaults.

```yaml
# .driftguard.yml
spec:
  - docs
  - specs/openapi.yml
code:
  - src
output:
  json: false
report:
  format: text
```

### Fields

- `spec` - List of spec files or directories to scan (default: `docs`). Supports OpenAPI JSON/YAML and Markdown files.
- `code` - List of code directories or files to index (default: `src`). Only `.ts`, `.tsx`, `.js`, `.jsx`, `.mts`, and `.cts` are indexed.
- `output.json` - Whether to emit JSON output (default: `false`).
- `report.format` - Output format. Currently `text` or `json` (default: `text`).

### Config Precedence

1. CLI flags (e.g. `--spec`, `--code`, `--json`)
2. `.driftguard.yml`
3. Default values (`repo: .`, `spec: ["docs"]`, `code: ["src"]`)

CLI `--spec` and `--code` values can be supplied multiple times and will override config values completely.

## Exit codes

| Code | Meaning |
|------|---------|
| `0`  | No drift detected or warnings only. |
| `1`  | Drift found (missing OpenAPI route in code or similar). |
| `2`  | Input, config, or runtime error (missing repo, invalid spec file, bad config, etc.). |

## Supported Patterns

DriftGuard indexes these TS/JS route declaration patterns:

- `router.get('/path', handler)`
- `app.get('/path', handler)`
- `fastify.get('/path', handler)`

Also supported for `post`, `put`, `patch`, and `delete`. Express-style path parameters such as `/users/:id` are normalized to `/users/{id}` for comparison against OpenAPI specs.

Extra code routes with no matching OpenAPI operation are reported as warnings, not drift, in this version.

## Local/Offline Behavior

DriftGuard runs entirely on your machine. No network calls, no remote services, no LLM matching. It is deterministic and designed to run in CI or locally.

## Out of Scope

The current release focuses on route existence checks only. It does not:

- Compare request or response schemas
- Validate authentication or permissions
- Detect semantic drift or business logic changes
- Sync with a hosted Foundation service
- Run as a CI gate or pre-commit hook
- Provide baseline or historical drift tracking
- Host a UI or generate PDF/HTML reports

These features are planned for future releases.

## Development

### Local Setup

```bash
git clone <repo-url>
cd driftguard
npm install
```

### Build

```bash
npm run build
```

This compiles `src/` into `dist/`. The CLI entry point is `dist/cli.js`.

### Run the CLI locally (without installing)

```bash
# After building
node dist/cli.js --help

# Example scan on the repo itself
node dist/cli.js scan --repo . --spec docs --code src

# Scan with JSON output
node dist/cli.js scan --repo . --spec docs --code src --json

# Run in CI mode with SARIF output
node dist/cli.js scan --repo . --spec docs --code src --ci --sarif report.sarif

# Baseline operations
node dist/cli.js baseline save --repo . --spec docs --code src --name default
node dist/cli.js baseline list --repo .

# Foundation project selection (requires token)
node dist/cli.js foundation auth --token <your-token>
node dist/cli.js foundation projects --token <your-token>
node dist/cli.js foundation select --project-id <your-project-id>
```

### Create a Minimal Test Fixture

```bash
mkdir -p /tmp/driftguard-test/docs /tmp/driftguard-test/src
cat > /tmp/driftguard-test/.driftguard.yml <<'EOF'
spec:
  - docs
code:
  - src
EOF

cat > /tmp/driftguard-test/docs/openapi.yml <<'EOF'
openapi: "3.0.0"
info:
  version: 1.0.0
  title: Test API
paths:
  /users:
    get:
      summary: List users
EOF

cat > /tmp/driftguard-test/src/routes.ts <<'EOF'
import express from 'express';
const router = express.Router();
router.get('/users', (_req, res) => res.json([]));
export default router;
EOF

# Run the scan
node dist/cli.js scan --repo /tmp/driftguard-test --json
```

### Run Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# CLI/integration tests only
npm run test:cli
```

### Type Check

```bash
npm run typecheck
```

### Watch Mode (Development)

```bash
# Re-run tests on file changes
npx vitest

# Run a specific test file in watch mode
npx vitest tests/unit/config/resolver.test.ts
```

## License

MIT
