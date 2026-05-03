# DriftGuard

A local-first CLI for detecting spec-to-code drift. Compare OpenAPI and Markdown specs against your TypeScript or JavaScript codebase to find missing routes, unimplemented data models, unreferenced business rules, uncovered story dependencies, and surplus code that is not documented.

DriftGuard runs entirely offline. No network calls, no remote services, no LLM matching. It is deterministic and designed to run in CI or locally.

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

Load a custom rule plugin:

```bash
npx driftguard scan --repo . --plugin ./custom-rule.js
```

Compare against a historical git ref:

```bash
npx driftguard scan --repo . --since HEAD~5 --json
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
plugins:
  - ./custom-rules/drift-rule.js
output:
  json: false
report:
  format: text
```

### Fields

- `spec` - List of spec files or directories to scan (default: `docs`). Supports OpenAPI JSON/YAML and Markdown files.
- `code` - List of code directories or files to index (default: `src`). Only `.ts`, `.tsx`, `.js`, `.jsx`, `.mts`, and `.cts` are indexed.
- `plugins` - List of local plugin files to load (optional). Each plugin must export a `run(input)` function.
- `output.json` - Whether to emit JSON output (default: `false`).
- `report.format` - Output format. Currently `text` or `json` (default: `text`).

### Config Precedence

1. CLI flags (e.g. `--spec`, `--code`, `--json`, `--plugin`)
2. `.driftguard.yml`
3. Default values (`repo: .`, `spec: ["docs"]`, `code: ["src"]`)

CLI `--spec`, `--code`, and `--plugin` values can be supplied multiple times and will override config values completely.

## Exit codes

| Code | Meaning |
|------|---------|
| `0`  | No drift detected or warnings only. |
| `1`  | Drift found (missing route, model, rule reference, uncovered story, etc.). |
| `2`  | Input, config, or runtime error (missing repo, invalid spec file, bad config, etc.). |

## Supported Patterns

### API Routes

DriftGuard indexes these TS/JS route declaration patterns:

- `router.get('/path', handler)`
- `app.get('/path', handler)`
- `fastify.get('/path', handler)`

Also supported for `post`, `put`, `patch`, and `delete`.

### NestJS Decorators

NestJS controller decorators are supported with literal string arguments:

- `@Controller('users')`
- `@Get(':id')`, `@Post()`, `@Put()`, `@Patch()`, `@Delete()`

Paths are combined into full routes (`users` + `:id` becomes `GET /users/{id}`). Path parameters such as `:id` are normalized to `{id}` for comparison against OpenAPI specs.

### Data Models

DriftGuard extracts TypeScript `interface` and `type alias` declarations from code and compares them against `components.schemas` defined in OpenAPI specs. This is a presence check only (name matching), not property-level validation.

## What DriftGuard Detects

### a. Missing API routes

When an OpenAPI operation has no matching route in code, DriftGuard creates a finding:

```bash
npx driftguard scan --repo . --spec specs/openapi.yml --code src
```

Example finding:

```json
{
  "id": "openapi-route-exists:GET|/users|specs/openapi.yml",
  "summary": "OpenAPI operation is not implemented by an indexed route",
  "severity": "high"
}
```

### b. Surplus code routes

Code routes that have no matching OpenAPI operation are reported as formal findings:

```bash
npx driftguard scan --repo . --spec specs/openapi.yml --code src
```

Example finding:

```json
{
  "id": "extra-route-not-in-spec:POST|/orders|src/routes.ts",
  "summary": "Route implementation exists with no matching spec operation",
  "severity": "medium"
}
```

### c. Data models against OpenAPI schemas

DriftGuard checks whether every `components.schemas` entry in your OpenAPI spec has a matching `interface` or `type` declaration in code:

```bash
npx driftguard scan --repo . --spec specs/openapi.yml --code src
```

Example finding when `Order` is declared in the spec but missing from code:

```json
{
  "id": "data-model-exists:Order|specs/openapi.yml",
  "summary": "Data model 'Order' is declared in spec but not found in code",
  "severity": "high"
}
```

### d. Business rules against code references

Markdown headings that declare business rules (e.g. `## BR-001: Payment Validation`) are scanned for references in code. If no reference is found, a finding is created:

```bash
npx driftguard scan --repo . --spec docs --code src
```

Example finding:

```json
{
  "id": "business-rule-referenced:BR-001|docs/rules.md",
  "summary": "Business rule 'BR-001 Require manager approval' is documented but not referenced in code",
  "severity": "medium"
}
```

### e. Story dependency coverage

User stories declared in Markdown (e.g. `## US-1: Process Order`) can list dependencies such as other rules, models, or routes. DriftGuard checks whether each dependency is covered by code and reports uncovered dependencies:

```bash
npx driftguard scan --repo . --spec docs --code src
```

Example finding when a story depends on a data model that is not implemented:

```json
{
  "id": "story-uncovered:US-1|docs/stories.md",
  "summary": "Story 'US-1 Place an order' depends on uncovered entities: Order",
  "severity": "low"
}
```

### f. Custom plugins and rules

You can write local JavaScript plugins that receive the spec IR and repository index, then return custom findings.

Example plugin (`custom-rule.js`):

```javascript
export function run({ repository }) {
  return repository.files
    .filter((f) => /TODO-[A-Za-z0-9_-]+/.test(f.filePath.split('/').pop() ?? ''))
    .map((f) => ({
      id: 'temp-file',
      summary: `Temp file found: ${f.filePath}`,
      severity: 'low',
      confidence: 'high',
      affectedFiles: [f.filePath],
    }));
}
```

Run it:

```bash
npx driftguard scan --repo . --plugin ./custom-rule.js
```

Plugin findings appear with a namespaced ID:

```json
{
  "id": "plugin:custom-rule:temp-file",
  "summary": "Temp file found: src/TODO-cleanup.ts",
  "severity": "low"
}
```

Plugins can also be declared in `.driftguard.yml`:

```yaml
plugins:
  - ./custom-rules/drift-rule.js
  - ./another-rule.mjs
```

### g. Historical drift tracking with `--since`

Compare the current scan against a previous git commit to see which findings are new, resolved, or persistent:

```bash
npx driftguard scan --repo . --since HEAD~5 --json
```

The JSON output includes a `historical` section:

```json
{
  "historical": {
    "sinceRef": "HEAD~5",
    "newFindings": [...],
    "resolvedFindings": [...],
    "persistedFindings": [...]
  }
}
```

DriftGuard creates a temporary snapshot of the repository at the specified ref. It never modifies your working tree.

## Local/Offline Behavior

DriftGuard runs entirely on your machine. No network calls, no remote services, no LLM matching. It is deterministic and designed to run in CI or locally.

## Out of Scope

The current release does not:

- Compare request or response schemas at the property level
- Validate authentication or permissions
- Detect semantic drift or business logic changes
- Sync with a hosted Foundation service
- Run as a CI gate or pre-commit hook
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

# Load a custom plugin
node dist/cli.js scan --repo . --spec docs --code src --plugin ./custom-rule.js

# Compare against a historical commit
node dist/cli.js scan --repo . --spec docs --code src --since HEAD~3 --json

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
