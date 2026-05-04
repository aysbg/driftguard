# DriftGuard Scan Action

Run DriftGuard scan in your GitHub Actions workflow to detect spec-to-code drift.

## Inputs

| Name | Description | Required | Default |
|------|-------------|----------|---------|
| `spec` | Spec directory or files (repeatable with commas) | No | `docs` |
| `code` | Code directory or files (repeatable with commas) | No | `src` |
| `fail-on` | Severity levels to fail on (comma-separated) | No | `high` |
| `sarif` | Path to write SARIF output file | No | `""` |
| `baseline` | Baseline name for comparison | No | `""` |
| `foundation-mcp` | Foundation project ID for MCP spec adapter | No | `""` |
| `foundation-token` | Foundation API token | No | `""` |
| `foundation-url` | Foundation API URL | No | `""` |
| `changed-only` | Only scan changed files | No | `false` |
| `base-ref` | Git base ref for changed-only scans | No | `origin/main` |
| `node-version` | Node.js version to use | No | `22` |
| `install-command` | Command to install driftguard | No | `npm install -g driftguard \|\| npm install driftguard` |

**Note:** The `foundation-token` input is masked in workflow logs (`mask-input: true`).

## Outputs

| Name | Description |
|------|-------------|
| `exit-code` | The exit code from the DriftGuard scan (0, 1, or 2) |
| `sarif-path` | Path to the generated SARIF file, if `sarif` input was provided |

## Usage

### 1. Basic scan

Run a minimal scan with default paths:

```yaml
- name: Run DriftGuard scan
  uses: ./.github/actions/driftguard
```

### 2. Scan with SARIF output

Generate a SARIF report and upload it with `github/codeql-action/upload-sarif`:

```yaml
- name: Run DriftGuard scan
  id: driftguard
  uses: ./.github/actions/driftguard
  with:
    sarif: driftguard-report.sarif

- name: Upload SARIF
  if: steps.driftguard.outputs.sarif-path != ''
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: ${{ steps.driftguard.outputs.sarif-path }}
```

### 3. Scan with baseline comparison

Compare the current scan against a saved baseline to see only new findings:

```yaml
- name: Run DriftGuard scan
  id: driftguard
  uses: ./.github/actions/driftguard
  with:
    baseline: default

- name: Check for new drift
  if: steps.driftguard.outputs.exit-code == '1'
  run: echo "New drift detected"
```

### 4. Scan with Foundation MCP specs

Pull specs from a Foundation project using the `--foundation-mcp` adapter:

```yaml
- name: Run DriftGuard scan
  id: driftguard
  uses: ./.github/actions/driftguard
  with:
    foundation-token: ${{ secrets.FOUNDATION_TOKEN }}
    foundation-mcp: my-project-id
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | No drift detected or warnings only |
| `1` | Drift found (missing routes, models, unreferenced rules, uncovered stories, etc.) |
| `2` | Input, config, or runtime error |

## Notes

- The action uses `continue-on-error: true` on the scan step so the exit code can be captured and exposed as an output. The action itself will exit with the scan's actual exit code.
- SARIF generation is handled by this action, but uploading the SARIF file to GitHub Code Scanning is the caller's responsibility. Use `github/codeql-action/upload-sarif` in a subsequent step.
- When `foundation-mcp` is provided, DriftGuard calls `foundation_menu` → `foundation_fetch` via the `foundationworks-mcp` package to discover and pull specs dynamically.
