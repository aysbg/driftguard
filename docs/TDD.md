# DriftGuard - TDD (Technical Design Document)

Document ID: tdd-e411528ba678

---

## Section: system_overview

### Overview

DriftGuard is a **CLI-first, local-first system** for detecting and explaining drift between documented product intent and implemented code. As a new system at medium scale, the architecture is intentionally centered on a **single executable with modular internal subsystems**, rather than a distributed service mesh. This keeps setup fast for solo developers and small teams while still supporting CI automation, reproducible reporting, and a future bridge to optional hosted/team workflows.

### Architectural Intent

The system is designed around the core product promise of **spec-to-code accountability**:

- ingest existing specification artifacts without requiring proprietary authoring workflows
- normalize those artifacts into a common internal representation
- map documented intent to implementation areas in a repository
- evaluate for implementation drift using deterministic, explainable rules
- produce readable, audit-friendly findings with citations to both spec and code
- optionally sync outputs to Foundation without making cloud connectivity a dependency

### High-Level System Shape

DriftGuard uses a **modular monolith architecture** for the OSS CLI:

- **Presentation layer:** command-line interface, config loading, exit codes, human-readable output
- **Core analysis layer:** spec parsing, codebase indexing, mapping, drift validation, severity scoring
- **Output layer:** terminal reports, machine-readable exports, evidence packs
- **Integration layer:** CI adapters, pre-commit usage patterns, optional Foundation sync

This shape is preferred because it matches the adoption model:
- users want a **single install and single command**
- CI needs **deterministic, self-contained execution**
- teams need **offline-capable scans** and explicit control over data leaving the local environment
- the product must remain **open-source friendly** and easy to extend through adapters and plugins

### Primary Architectural Principles

The system overview is guided by the following principles derived from the product and PRD context:

- **Local-first by default:** all core scanning and reporting must work without network access
- **Deterministic and reproducible:** the same spec set and code commit should yield the same result
- **Source-agnostic analysis:** validation operates on a Unified Spec IR, not raw source formats
- **Explainability over black-box scoring:** every finding should trace back to spec text and code evidence
- **Pluggable ingestion and rules:** spec formats and drift rules are extensible through adapters/plugins
- **Fail open on partial understanding:** unsupported or ambiguous spec content produces warnings, not hard failures
- **Security by default:** secrets for optional integrations are protected and repository content is not transmitted unless explicitly enabled

### Scope of the Initial System

The initial architecture supports:

- local scans against one repository and one or more spec sources
- common spec inputs such as Markdown, ADRs, and OpenAPI
- repository-to-spec mapping through config and inferred relationships
- explainable drift findings with severity and blast-radius context
- CI and pre-merge execution with deterministic exit codes
- exportable evidence in standard formats such as JSON and PDF
- optional opt-in sync to Foundation for centralized visibility

The initial system explicitly does **not** include:

- browser-based spec authoring or collaborative review as a primary workflow
- autonomous code changes or automatic spec reconciliation
- broad enterprise governance capabilities such as multi-org administration and policy management

### Architectural Outcome

The result is a system that behaves like **developer infrastructure, not a hosted black box**: fast to run locally, predictable in CI, explainable under audit, and structured so that future hosted/team capabilities can be added without weakening the standalone OSS core.

## Architecture

The DriftGuard architecture is a **modular monolith packaged as a single CLI executable**, with clear subsystem boundaries so the OSS core stays simple while future hosted/team extensions remain possible without reworking the analysis model.

### Architectural Style

DriftGuard adopts a **layered modular architecture** with **pipeline-oriented execution**:

1. **Input acquisition** collects repository state, spec sources, config, and optional baselines
2. **Normalization** converts heterogeneous spec inputs into a **Unified Spec IR**
3. **Repository understanding** indexes code, structure, symbols, and change scope
4. **Mapping and validation** links intent to implementation and evaluates drift rules
5. **Finding assembly** scores, deduplicates, and explains detected drift
6. **Output and integration** renders reports, sets exit codes, and optionally syncs results

This style is chosen because it fits the primary workflow: a user invokes one command, the system performs a deterministic scan, and returns explainable results tied to concrete evidence.

### Core Runtime Topology

At runtime, DriftGuard is organized into the following major internal modules:

- **CLI Shell**
  - command parsing
  - config resolution
  - environment validation
  - execution orchestration
  - exit code handling

- **Scan Orchestrator**
  - coordinates the end-to-end analysis pipeline
  - manages scan phases and shared execution context
  - enforces deterministic ordering and failure handling

- **Spec Ingestion Adapters**
  - parse Markdown, ADRs, OpenAPI, and future formats
  - emit normalized entities, requirements, constraints, and traceable references
  - report unsupported or ambiguous content as warnings

- **Unified Spec IR Layer**
  - canonical internal model for all spec content
  - stores sections, requirement statements, relationships, provenance, and version metadata
  - isolates downstream logic from source-format differences

- **Repository Analysis Engine**
  - traverses repository contents
  - builds code metadata and lightweight structural indexes
  - identifies implementation units such as files, modules, routes, handlers, and interfaces

- **Spec-to-Code Mapper**
  - resolves links between IR entities and implementation areas
  - combines explicit config mapping with inferred relationships
  - records confidence and rationale for each mapping

- **Drift Rule Engine**
  - executes deterministic validation rules against mapped spec/code pairs
  - supports built-in and plugin-provided rules
  - emits structured rule results with citations and reasoning

- **Finding Prioritization Engine**
  - converts raw rule results into user-facing findings
  - assigns severity, blast-radius context, and remediation hints
  - groups related evidence to reduce noisy output

- **Reporting and Export Layer**
  - renders terminal output
  - produces JSON and PDF-ready evidence artifacts
  - preserves stable identifiers for tracking findings across scans

- **Integration Connectors**
  - CI adapters
  - pre-commit/pre-push invocation helpers
  - optional Foundation sync client

### Architectural Boundaries

To keep the system maintainable, DriftGuard separates responsibilities into strict boundaries:

#### 1. Source Format Boundary
Parsers and adapters may understand source-specific syntax, but they must output only the **Unified Spec IR**. The validation engine never depends on raw Markdown headings, OpenAPI object shapes, or ADR file structure directly.

#### 2. Analysis Boundary
Repository indexing, mapping, and drift validation are independent stages. This allows:
- improved indexing without changing rule logic
- new mapping strategies without changing report rendering
- additional rules without rewriting ingestion

#### 3. Integration Boundary
Optional capabilities such as Foundation sync, GitHub workflow helpers, or future hosted features sit outside the core scan engine. A local offline scan must remain fully functional when these integrations are absent.

#### 4. Plugin Boundary
Extensibility points are explicit and narrow:
- spec ingestion adapters
- drift validation rules
- report exporters
- sync/integration connectors

Plugins may contribute behavior, but the core runtime owns execution order, data contracts, and safety constraints.

### Primary Data Flow Through the Architecture

The architecture centers on a small number of stable internal artifacts:

- **Scan Request**
  - repo path
  - spec paths/sources
  - config
  - mode flags
  - baseline reference
  - output settings

- **Unified Spec IR**
  - normalized intent model with provenance

- **Repository Index**
  - structured representation of relevant implementation surfaces

- **Mapping Graph**
  - relationships between spec entities and code entities

- **Rule Evaluation Results**
  - per-rule assessments with evidence and rationale

- **Findings Set**
  - deduplicated, severity-ranked drift findings for users and CI

- **Evidence Pack**
  - exportable machine/human-readable scan artifact

These artifacts are designed to be serializable, inspectable, and stable enough to support reproducible scans, debugging, and future interoperability.

### Execution Model

DriftGuard runs primarily as a **single-process batch analysis tool**. This is appropriate for the initial scale because:

- most scans are bounded to one repository
- users prioritize low setup and predictable execution over distributed throughput
- CI environments benefit from simple invocation and minimal infrastructure dependencies

Within that process, the system may use **bounded parallelism** for independent work such as file parsing or repository indexing, but all externally observable outputs must remain deterministic regardless of thread scheduling.

### Persistence Strategy

The initial architecture is intentionally **stateless by default** between runs, except for explicit local artifacts:

- config files in the repository or user environment
- generated reports and evidence packs
- optional local cache/index data for performance
- optional baseline snapshots or previous findings references

There is **no required central database** for core operation. This supports offline use, simple installation, and easy CI adoption. If Foundation sync is enabled, remote persistence is treated as a downstream replication target, not a required system of record for scanning.

### Security and Trust Posture in the Architecture

Security-sensitive design choices are embedded into the architecture:

- repository contents are processed locally unless sync is explicitly enabled
- credentials for optional integrations are stored using OS-native secure storage where available
- secrets are excluded from logs and exported artifacts by default
- evidence generation is traceable and citation-based, reducing black-box trust requirements
- plugin/integration boundaries are controlled so extensions cannot silently redefine core finding semantics without explicit registration

### Architectural Decisions That Shape v1

The following decisions are foundational for the initial release:

- **Single binary / single command UX** over multi-service deployment
- **Unified Spec IR as the system contract** between ingestion and validation
- **Pluggable rule engine** so built-in checks and future custom rules use the same model
- **Deterministic scan pipeline** suitable for CI enforcement and audit evidence
- **Optional cloud/team bridge** rather than cloud dependency
- **Fail-open parsing behavior** so partial spec understanding still produces useful output

### Evolution Path

The chosen architecture leaves room for growth without changing the OSS core model:

- additional spec adapters can expand supported inputs
- richer repository analyzers can improve language/framework coverage
- team workflows can consume exported findings or synced results
- hosted/reporting features can build on the same scan artifacts and evidence model
- enterprise/on-prem runners can reuse the same single-scan engine in a managed wrapper

This makes the architecture appropriate for a new medium-scale system: simple enough to ship and adopt quickly, but structured enough to support future commercial and compliance-oriented extensions.

## Components

The DriftGuard system is composed of a small set of **core runtime components** aligned to the product workflow: ingest specs, understand the repository, map intent to implementation, evaluate drift, and produce explainable outputs.

### 1. CLI Shell

The CLI Shell is the user-facing entry point and the only required runtime surface in v1.

**Responsibilities**
- parse commands and flags such as scan, report export, and config validation
- resolve configuration from CLI args, repo config files, and environment variables
- validate execution prerequisites such as repo path, spec paths, and output destinations
- initialize scan mode such as local scan, CI enforcement, or evidence export
- emit terminal-friendly output and deterministic exit codes

**Key design notes**
- must support a **single-command first-run experience**
- must behave consistently in local and CI environments
- should expose enough flags for adoption without forcing complex setup

### 2. Configuration Resolver

This component converts user input into a normalized runtime configuration.

**Responsibilities**
- merge config-as-code, CLI overrides, and environment defaults
- define scan scope, include/exclude rules, mapping hints, severity thresholds, and sync settings
- validate incompatible or ambiguous options before scan execution
- provide a stable resolved config object to downstream components

**Why it exists separately**
- keeps command parsing distinct from policy/config interpretation
- supports reproducible scans by making effective configuration explicit and inspectable

### 3. Scan Orchestrator

The Scan Orchestrator is the top-level coordinator for a single DriftGuard run.

**Responsibilities**
- create the scan context and phase order
- invoke ingestion, indexing, mapping, validation, and reporting in sequence
- manage bounded parallel work where safe
- enforce deterministic ordering of inputs, evaluation, and outputs
- collect warnings, soft failures, and fatal errors into a coherent run result

**Key design notes**
- owns lifecycle, not business logic
- ensures optional components never compromise the local-first scan path

### 4. Spec Ingestion Adapters

These adapters parse supported specification sources and convert them into a common internal model.

**Initial supported sources**
- Markdown product and technical specifications
- ADRs
- OpenAPI documents

**Responsibilities**
- parse source-specific syntax and structure
- extract requirements, constraints, architectural decisions, endpoints, and references
- preserve provenance such as file path, section heading, and line range where possible
- surface unsupported constructs as warnings
- emit only **Unified Spec IR**, never source-specific objects to downstream analysis

**Extensibility**
- new spec formats can be added as adapters without changing the rule engine
- adapters must conform to strict contracts for traceability and deterministic output

### 5. Unified Spec IR Manager

The Unified Spec IR Manager owns the canonical representation of documented intent.

**Responsibilities**
- hold normalized spec entities such as requirements, constraints, decisions, interfaces, and relationships
- preserve provenance metadata for citation and auditability
- maintain source version references where available
- expose stable identifiers for requirements and sections across the scan pipeline

**Why it is central**
- it is the **contract boundary** between parsing and validation
- it makes rules source-agnostic and keeps the architecture extensible

### 6. Repository Analysis Engine

This component builds a structured understanding of the implementation side of the comparison.

**Responsibilities**
- traverse the repository according to configured scope
- identify relevant implementation units such as files, modules, routes, handlers, APIs, and interfaces
- build lightweight indexes over repository structure and symbols
- detect change scope for diff-aware or pre-merge execution modes
- attach file metadata and code references needed for evidence generation

**Key design notes**
- optimized for practical repository understanding, not full compiler-grade semantic analysis in v1
- should degrade gracefully across different languages and frameworks

### 7. Spec-to-Code Mapper

The Spec-to-Code Mapper links documented intent to probable implementation areas.

**Responsibilities**
- combine explicit user mappings with inferred relationships
- associate spec entities with files, modules, endpoints, or code surfaces
- record confidence, rationale, and source of the mapping
- support one-to-many and many-to-one relationships where realistic

**Mapping inputs**
- config-defined associations
- path and naming similarity
- structural cues from OpenAPI or ADR references
- repository metadata and code surface classification

**Why it matters**
- high-quality mapping is the foundation for high-signal findings
- explainable mapping is required for user trust and remediation speed

### 8. Drift Rule Engine

The Drift Rule Engine evaluates whether mapped code still satisfies documented intent.

**Responsibilities**
- execute deterministic rules against the Unified Spec IR, Repository Index, and Mapping Graph
- support built-in rules and plugin-provided rules through the same execution model
- produce structured rule results with evidence, rationale, and confidence markers
- distinguish between confirmed drift, insufficient evidence, and non-applicable checks

**Examples of rule categories**
- missing implementation for documented requirement
- implementation surface present but inconsistent with documented API or constraint
- architectural decision contradicted by repository structure
- spec-defined interface or route behavior diverging from code reality

**Key design notes**
- built-in rules should themselves be implemented as plugins where feasible
- rule execution must remain reproducible and transparent

### 9. Finding Assembly and Prioritization Engine

This component converts raw rule results into actionable user-facing findings.

**Responsibilities**
- deduplicate overlapping rule outputs
- group related evidence into a single coherent finding
- assign severity based on rule type, confidence, and blast radius
- identify impacted surfaces such as endpoints, modules, or files
- attach remediation hints and next-step guidance

**Why it exists**
- users do not want raw rule exhaust
- CI and audit workflows need stable, interpretable finding objects rather than low-level rule events

### 10. Reporting and Evidence Pack Generator

This component renders scan results into formats suited for developers, CI, and audit consumers.

**Responsibilities**
- generate readable terminal summaries
- produce machine-readable JSON exports
- assemble PDF-ready or other shareable evidence artifacts
- include citations to spec text and code locations
- preserve stable finding identifiers for comparison across scans

**Output goals**
- fast feedback for terminal users
- structured artifacts for automation
- audit-friendly evidence for stakeholders outside engineering

### 11. Baseline and Finding History Comparator

This component supports tracking change over time without requiring a central platform.

**Responsibilities**
- compare current findings to a provided baseline or previous scan artifact
- classify findings as new, persisting, resolved, or changed in severity
- support rollout workflows where only new drift blocks CI
- provide trend-oriented metadata for reports and exports

**Why it matters**
- directly supports the product need to distinguish true regressions from known debt
- enables gradual adoption in small teams and legacy repos

### 12. Integration Connectors

Integration Connectors bridge the core scan engine to external workflows while remaining optional.

**Initial integrations**
- CI usage patterns and adapters
- pre-commit / pre-push helper scripts
- optional Foundation sync

**Responsibilities**
- package scan invocation for automation contexts
- translate findings into integration-safe payloads
- enforce opt-in behavior for any networked capability
- isolate external API concerns from core analysis logic

**Key design notes**
- integrations must not become a hidden dependency for core scanning
- failure of an optional connector must not invalidate a successful local analysis run unless explicitly configured

### 13. Foundation Sync Client

This is a specialized integration component for the optional hosted/team bridge.

**Responsibilities**
- authenticate using securely stored credentials
- transmit approved findings, evidence metadata, and scan summaries
- respect redaction and privacy settings
- retry safely without altering the local scan result

**Architectural constraint**
- Foundation is a **replication target**, not the source of truth for local scans

### 14. Plugin Host

The Plugin Host provides controlled extensibility for the OSS ecosystem and future commercial variants.

**Responsibilities**
- register and load supported plugin types
- validate plugin manifests and version compatibility
- expose bounded interfaces for adapters, rules, exporters, and connectors
- isolate plugin failures so they do not corrupt core scan state
- enforce explicit registration of any behavior that affects findings

**Supported plugin categories**
- spec ingestion adapters
- drift validation rules
- report exporters
- integration connectors

### Component Relationship Summary

In a typical run, components interact in the following order:

1. **CLI Shell** accepts the command
2. **Configuration Resolver** produces the effective scan configuration
3. **Scan Orchestrator** initializes execution
4. **Spec Ingestion Adapters** produce the **Unified Spec IR**
5. **Repository Analysis Engine** produces the **Repository Index**
6. **Spec-to-Code Mapper** builds the **Mapping Graph**
7. **Drift Rule Engine** evaluates for drift
8. **Finding Assembly and Prioritization Engine** creates actionable findings
9. **Reporting and Evidence Pack Generator** emits outputs
10. **Baseline Comparator** and **Integration Connectors** optionally enrich or distribute results

### v1 Component Priorities

For the initial release, the highest-priority components are:

- CLI Shell
- Configuration Resolver
- Scan Orchestrator
- Markdown / ADR / OpenAPI ingestion adapters
- Unified Spec IR Manager
- Repository Analysis Engine
- Spec-to-Code Mapper
- Drift Rule Engine
- Reporting and JSON evidence export

The following components are important but may begin in simpler form:
- PDF-ready evidence generation
- Baseline comparison depth
- Foundation Sync Client
- broader plugin ecosystem support

This component set keeps DriftGuard aligned with its core promise: **a single local tool that produces deterministic, explainable spec-to-code drift findings without requiring a hosted control plane**.

## Application Flow

The application flow describes how a single DriftGuard run progresses from command invocation to actionable findings, exported evidence, and optional downstream integrations. Because DriftGuard is a **CLI-first, single-process, deterministic analysis tool**, the flow is primarily a **bounded batch pipeline** with explicit checkpoints, stable intermediate artifacts, and predictable failure behavior.

### End-to-End Runtime Flow

A standard scan follows this high-level sequence:

1. **Command invocation**
   - user runs a DriftGuard CLI command such as a local scan, CI scan, or export-oriented run
   - CLI flags, environment variables, and config files are collected

2. **Configuration resolution**
   - effective scan configuration is assembled
   - repository path, spec sources, include/exclude rules, mapping hints, baseline references, severity thresholds, and output settings are validated
   - invalid hard prerequisites fail early before expensive analysis begins

3. **Scan context initialization**
   - the Scan Orchestrator creates a run-scoped execution context
   - stable scan metadata is assigned, including repository reference, commit identifier if available, execution mode, and output destinations
   - deterministic ordering of inputs is established

4. **Specification ingestion**
   - each configured spec source is routed to the appropriate ingestion adapter
   - Markdown, ADR, OpenAPI, and future formats are parsed independently
   - extracted requirements, constraints, decisions, interfaces, and provenance are normalized into the **Unified Spec IR**
   - unsupported or ambiguous sections are recorded as warnings rather than terminating the scan

5. **Repository analysis**
   - the repository is traversed within configured scope
   - relevant implementation surfaces are identified, such as modules, endpoints, handlers, interfaces, and files
   - a **Repository Index** is produced with enough structural metadata to support mapping and evidence generation
   - in diff-aware modes, change scope is also computed

6. **Spec-to-code mapping**
   - spec entities in the Unified Spec IR are linked to likely implementation areas in the Repository Index
   - explicit config mappings are applied first
   - inferred relationships are then added using naming, path, structural, and format-derived cues
   - the result is a **Mapping Graph** with confidence and rationale attached to each relationship

7. **Drift rule evaluation**
   - the Drift Rule Engine executes applicable rules against the Unified Spec IR, Repository Index, and Mapping Graph
   - each rule emits structured results describing one of:
     - detected drift
     - no drift found
     - insufficient evidence
     - not applicable
   - every positive result must include traceable citations and machine-readable reasoning metadata

8. **Finding assembly and prioritization**
   - raw rule results are deduplicated and grouped into user-facing findings
   - severity, confidence, and blast-radius context are assigned
   - related evidence is consolidated so the user sees a coherent explanation rather than fragmented rule output

9. **Baseline comparison**
   - if a prior findings artifact or baseline reference is supplied, the current findings are compared to historical results
   - findings are classified as new, persisted, resolved, or changed
   - this step affects reporting and CI policy decisions, but not the underlying detection logic

10. **Reporting and export**
    - terminal output is rendered for interactive use
    - machine-readable artifacts such as JSON evidence packs are written
    - optional PDF-ready or shareable report material is assembled
    - stable finding identifiers are preserved for future comparison

11. **Exit code determination**
    - the final run result is mapped to deterministic exit codes
    - CI mode may fail based on configured severity thresholds, new-findings-only rules, or hard execution errors
    - local mode may complete successfully while still surfacing findings and warnings

12. **Optional integrations**
    - if explicitly enabled, Integration Connectors may:
      - publish artifacts to CI contexts
      - annotate workflow outputs
      - invoke Foundation sync
    - integration failures are isolated unless configuration explicitly makes them blocking

### Canonical Scan Sequence

The core runtime sequence can be summarized as:

**CLI Shell → Configuration Resolver → Scan Orchestrator → Spec Ingestion Adapters → Unified Spec IR → Repository Analysis Engine → Repository Index → Spec-to-Code Mapper → Mapping Graph → Drift Rule Engine → Rule Results → Finding Assembly → Baseline Comparator → Reporting/Export → Exit Codes → Optional Connectors**

This ordering is intentionally strict because reproducibility depends on a known sequence of transformations over stable artifacts.

### Primary User Flows

#### 1. First Local Scan Flow

This is the primary adoption path for solo founders and small teams.

**Typical flow**
- user installs DriftGuard
- user points the CLI at a repository and one or more spec files or directories
- DriftGuard resolves config from flags or a minimal repo config file
- scan runs locally without requiring authentication or network access
- findings are displayed in the terminal with:
  - spec citations
  - code citations
  - plain-language explanations
  - severity indicators
- optional JSON evidence is exported for later review

**Architectural significance**
- must succeed with minimal setup
- must not require Foundation or any hosted dependency
- must prioritize understandable output over workflow complexity

#### 2. Configured Repository Scan Flow

This flow supports repeatable usage after initial adoption.

**Typical flow**
- user commits a DriftGuard config file to the repository
- config defines:
  - spec locations
  - repository scope
  - mapping hints
  - ignored paths
  - severity thresholds
  - output settings
- subsequent scans run with little or no CLI flag repetition
- effective configuration is stable and inspectable for debugging and CI parity

**Architectural significance**
- supports deterministic team usage
- reduces ambiguity in mapping and scope
- makes findings more repeatable across environments

#### 3. CI / Pre-Merge Enforcement Flow

This flow supports automated enforcement in pull requests and pipelines.

**Typical flow**
- CI job checks out the repository at a specific commit
- DriftGuard runs in CI mode with deterministic output settings
- optional diff-aware scope narrows analysis to changed files or impacted surfaces
- findings are generated and compared to a baseline if configured
- exit code reflects enforcement policy, for example:
  - fail on any high-severity drift
  - fail only on new drift
  - warn on ambiguous parsing but do not fail
- artifacts are saved for job inspection

**Architectural significance**
- outputs must be reproducible across runs on the same commit
- exit code semantics must be stable and documented
- no interactive or stateful assumptions can exist in the scan path

#### 4. Evidence Export Flow

This flow serves audit and stakeholder review use cases.

**Typical flow**
- user runs a scan with export options enabled
- DriftGuard assembles a machine-readable evidence pack and optionally a shareable report format
- each finding includes:
  - requirement or decision reference
  - code evidence location
  - drift explanation
  - severity and blast-radius metadata
  - scan metadata and provenance
- generated artifacts can be archived, attached to tickets, or reviewed outside the CLI

**Architectural significance**
- evidence artifacts must be serializable and portable
- exported results must preserve provenance and stable IDs
- reports are downstream renderings of core findings, not separate analysis paths

#### 5. Optional Foundation Sync Flow

This flow extends the local scan without redefining it.

**Typical flow**
- local scan completes first
- sync eligibility is checked against explicit user configuration
- redaction/privacy rules are applied before transmission
- findings metadata and approved evidence summaries are sent to Foundation
- local scan result remains authoritative even if sync is delayed or fails

**Architectural significance**
- sync is post-analysis replication, not part of core detection
- no network dependency is introduced into the local scan path
- privacy controls are enforced before data leaves the machine

### Internal Phase Behavior

#### Phase 1: Preflight and Validation

Before analysis begins, DriftGuard performs preflight checks for:
- repository existence and readability
- spec source existence and accessibility
- output path writability
- config schema validity
- plugin compatibility where relevant

**Behavioral rule**
- hard prerequisites fail early
- content ambiguity does not fail early unless explicitly configured

#### Phase 2: Parse and Normalize

During ingestion:
- source-specific parsing remains isolated within adapters
- each adapter emits normalized entities into the Unified Spec IR
- provenance is preserved at extraction time to avoid losing traceability later

**Behavioral rule**
- normalization errors are captured with source context
- partially parseable documents still contribute usable IR entities

#### Phase 3: Understand the Repository

During repository analysis:
- traversal respects include/exclude settings
- implementation units are classified into analyzable surfaces
- index generation favors practical speed and broad compatibility over deep semantic completeness in v1

**Behavioral rule**
- unsupported languages/frameworks should degrade to lower-confidence structural analysis rather than total failure where possible

#### Phase 4: Map Intent to Implementation

During mapping:
- explicit mappings have highest precedence
- inferred mappings are additive and explainable
- multiple candidate targets may be retained when ambiguity is meaningful

**Behavioral rule**
- mapping confidence is recorded, never implied
- low-confidence mapping should reduce certainty of findings, not silently disappear

#### Phase 5: Evaluate Drift

During rule evaluation:
- rules execute over normalized artifacts only
- each rule must declare applicability conditions
- positive findings require evidence and rationale
- insufficient-evidence outcomes are distinct from "no drift"

**Behavioral rule**
- the engine must prefer explicit uncertainty over overconfident false precision

#### Phase 6: Assemble Findings and Decide Outcome

In the final analysis phase:
- duplicate or overlapping rule results are merged
- severity and blast-radius are calculated
- baseline comparison may alter status labels but not core evidence
- enforcement policy determines the final exit code

**Behavioral rule**
- user-facing findings are the stable contract for reporting, CI, and future sync

### Determinism and Ordering in the Flow

To satisfy auditability and CI predictability, the application flow enforces deterministic behavior in several places:

- spec sources are processed in stable sorted order
- repository traversal normalizes path ordering
- mapping and rule execution use deterministic iteration order
- finding IDs are derived from stable evidence features rather than runtime randomness
- report rendering preserves consistent ordering for equivalent results
- parallel execution is allowed only where output ordering is explicitly normalized afterward

This ensures that the same repository state, spec set, and configuration produce the same findings set and exit behavior.

### Failure and Warning Flow

The application flow distinguishes between **fatal errors**, **soft failures**, and **analysis warnings**.

#### Fatal errors
Examples:
- invalid config schema
- unreadable repository root
- missing required spec path
- corrupt required output destination

**Effect**
- scan stops
- non-zero execution error exit code is returned
- no partial success is presented as a valid drift result

#### Soft failures
Examples:
- one optional exporter fails
- one plugin rule crashes but isolation is enabled
- Foundation sync fails after local scan completes

**Effect**
- core scan may still succeed
- failures are surfaced in run metadata and terminal output
- blocking behavior depends on explicit configuration

#### Analysis warnings
Examples:
- unsupported Markdown structure
- ambiguous mapping
- low-confidence inference
- partially understood spec section

**Effect**
- scan continues
- warnings are included in output and evidence artifacts
- user is informed that some findings may be incomplete rather than incorrect

### Output Decision Flow

At the end of execution, DriftGuard determines what to emit and how to classify the run:

- **No findings, no blocking errors**
  - clean terminal summary
  - success exit code

- **Findings present, non-blocking policy**
  - findings displayed/exported
  - success or warning-compatible exit code depending on mode

- **Findings exceed enforcement threshold**
  - findings displayed/exported
  - failure exit code for CI or strict local mode

- **Execution error**
  - error summary shown
  - failure exit code distinct from drift-detected code where possible

This separation is important because users and CI systems must distinguish:
- "the scan failed"
- "the scan succeeded and found drift"
- "the scan succeeded but had warnings"

### Why This Flow Fits DriftGuard

This application flow is appropriate for DriftGuard because it aligns directly with the product's operating model:

- **single-command adoption** for local developer use
- **deterministic batch execution** for CI and audit contexts
- **explainable intermediate artifacts** for trust and debugging
- **fail-open content understanding** for imperfect real-world specifications
- **optional downstream sync** without weakening the local-first core

The result is a runtime flow that is simple enough for an OSS CLI, but structured enough to support enforcement, evidence generation, and future team/compliance extensions.

---

## Section: tech_stack_decisions

### Overview

The DriftGuard technology stack is intentionally optimized for a **CLI-first, local-first OSS developer tool** rather than a browser-centric SaaS platform. The stack must support four core needs simultaneously:

- **Fast local execution** on common developer machines
- **Deterministic, explainable analysis** suitable for CI and audit evidence
- **Incremental extensibility** for new spec formats, code analyzers, and rule types
- **Optional cloud/Foundation integration** without making hosted services a hard dependency

At a medium expected scale, the primary technical challenge is not extreme throughput or multi-tenant infrastructure; it is achieving **high-signal repository analysis across heterogeneous inputs** while keeping installation, configuration, and runtime behavior simple enough for solo founders and small teams. This strongly favors a stack centered on:

- a **portable CLI runtime**
- **structured parsing and AST-based analysis** over opaque end-to-end AI workflows
- **file-system and git-native execution**
- **modular adapters/plugins** for language and document support
- **machine-readable outputs** alongside human-friendly terminal reports

### Architectural Direction

The stack should support a layered architecture with clear boundaries:

| Layer | Purpose | Technology Direction |
|---|---|---|
| CLI/Application Layer | Commands, config loading, UX, exit codes | Lightweight CLI-oriented runtime and command framework |
| Ingestion Layer | Read docs, specs, repo files, git context | File-system-native libraries with strong cross-platform support |
| Analysis Layer | Parse specs/code, map entities, detect drift | Deterministic parsers, AST tooling, rule engine |
| Explanation Layer | Generate findings with citations and rationale | Template-driven explanations with optional bounded AI assist |
| Output/Integration Layer | Terminal, JSON/Markdown reports, CI hooks, optional sync | Structured serializers, GitHub/CI integration adapters, opt-in HTTP client |

### Decision Principles

Technology decisions in this document should be evaluated against the following principles:

1. **Local-first by default**
   - Core scanning must run fully offline.
   - No required hosted dependency for baseline product value.

2. **Explainability over black-box intelligence**
   - Findings should be traceable to specific spec text, code locations, and matching logic.
   - AI-assisted components, if used, must remain bounded and non-critical to core operation.

3. **Low-friction OSS adoption**
   - Installation and first scan should be achievable in minutes.
   - Cross-platform support for macOS, Linux, and Windows is required.

4. **Deterministic CI behavior**
   - Stable exit codes, reproducible findings, and configurable thresholds are more important than experimental sophistication.
   - The stack must behave predictably in ephemeral CI runners.

5. **Incremental extensibility**
   - New spec parsers, language analyzers, and custom rules should be addable without redesigning the core.
   - Plugin-style boundaries are preferred where they do not add heavy operational complexity.

6. **Privacy and trust**
   - Repository contents should remain local unless users explicitly enable sync/export behavior.
   - Any external model or API integration must be optional, explicit, and auditable.

### Scope of the Stack Decision

For DriftGuard, the technology stack decision primarily covers:

- the **CLI runtime and packaging approach**
- parsing and analysis technologies for **Markdown, ADRs, OpenAPI, and code ASTs**
- configuration and plugin mechanisms
- reporting/output formats for local and CI usage
- optional integration points for GitHub Actions and Foundation sync

It explicitly does **not** optimize for a full hosted enterprise platform in the initial system design. SaaS/dashboard concerns are deferred so the stack can remain aligned with the near-term product strategy: **deliver a trusted OSS CLI that detects spec-to-code drift with explainable, audit-ready output**.

## Platform Choices

DriftGuard should be implemented as a **TypeScript/Node.js-based CLI application** with a modular core and optional integration adapters. This best matches the product's distribution model, target users, and extension needs while keeping local setup and cross-platform support straightforward.

### Primary Platform Decision: Node.js + TypeScript CLI

**Decision:** Use **Node.js LTS** as the primary runtime and **TypeScript** as the implementation language for the OSS CLI.

**Why this fits DriftGuard:**
- **Fastest path to OSS adoption** for the target audience:
  - `npx driftguard ...` supports near-zero-friction trial usage
  - npm-based install paths are already familiar to indie hackers and small teams
- **Strong ecosystem fit** for:
  - Markdown and YAML/JSON parsing
  - OpenAPI tooling
  - file-system and git integration
  - code parsing for JavaScript/TypeScript repositories
- **Cross-platform support** is mature across macOS, Linux, and Windows
- **Plugin and config ergonomics** are better for the intended v0.2-v0.3 extension model
- **TypeScript improves maintainability** for IR definitions, rule contracts, findings schemas, and plugin APIs

**Why not a browser-first platform:**
- The product's core workflow is repo-local, asynchronous, and CI-oriented
- Browser delivery would create unnecessary friction around:
  - local repository access
  - privacy-sensitive code analysis
  - offline execution
  - deterministic CI behavior

### Recommended Runtime Baseline

| Area | Decision |
|---|---|
| Runtime | **Node.js 22 LTS** baseline, support current active LTS line |
| Language | **TypeScript** with strict mode enabled |
| Module format | **ESM-first** with carefully managed CommonJS compatibility only where needed for ecosystem support |
| Package distribution | **npm package** as primary distribution channel |
| Execution modes | `npx`, global install, local dev dependency, CI invocation |
| Build output | Transpiled JavaScript for distribution, declaration files for plugin authors |

### CLI Packaging and Distribution Model

DriftGuard should be packaged first as a standard npm CLI, with optional standalone binaries considered later if startup time or install friction becomes a meaningful adoption blocker.

**Initial distribution approach:**
- Publish as `driftguard` on npm
- Support:
  - `npx driftguard scan`
  - `npm install -D driftguard`
  - `pnpm dlx driftguard`
  - GitHub Action usage via npm-based invocation
- Provide a single executable entry point with subcommands such as:
  - `scan`
  - `report`
  - `init`
  - `baseline`
  - `sync`

**Why npm-first is the right default:**
- Matches the expected early adopter environment
- Simplifies OSS release and versioning
- Makes plugin loading and JavaScript-based custom rules much easier than a compiled native binary model
- Reduces operational complexity compared to shipping platform-specific installers on day one

**Deferred option: standalone binaries**
- Consider generating platform-specific binaries later for:
  - security-sensitive environments without Node preinstalled
  - faster cold-start UX
  - simpler enterprise pilot rollout
- This is a **packaging optimization**, not a platform decision for the initial architecture

### Local Execution Model

DriftGuard should run primarily as a **single-process local analysis tool** with bounded internal concurrency rather than as a distributed service.

**Decision characteristics:**
- Scan directly against local file system paths
- Use git metadata from the checked-out repository when available
- Perform deterministic parsing and analysis in-process
- Parallelize independent parsing/analyzer work conservatively using async workers or worker threads only where justified

This is appropriate because the medium-scale challenge is repository heterogeneity and signal quality, not horizontal traffic scaling.

### Configuration Platform Choice

**Decision:** Use **config-as-code** with a small number of explicit file formats.

**Recommended support order:**
1. `.driftguard.yml`
2. `driftguard.config.ts` or `driftguard.config.js`
3. CLI flags for overrides

**Rationale:**
- YAML is accessible for simple adoption
- TS/JS config enables advanced repository-specific logic, ignore patterns, and custom mapping behavior
- CLI flags remain important for quick scans and CI parameterization

**Design constraint:**
- Config loading must remain deterministic and auditable
- Executable config should be clearly separated from purely declarative config in documentation and trust model

### Plugin/Extension Platform

**Decision:** Expose extensions through a **versioned internal API and JavaScript/TypeScript plugin model**, not a separate microservice or remote plugin marketplace.

**Extension targets:**
- spec parsers
- code analyzers
- custom drift rules
- output/report formatters
- integration adapters

**Why this fits DriftGuard:**
- Keeps execution local
- Allows fast community contributions
- Aligns with planned custom rule engine goals
- Avoids the operational and security complexity of remote execution frameworks

**Guardrails for plugins:**
- Stable, versioned interfaces around the IR and finding schema
- Explicit capability boundaries
- Clear failure isolation so one plugin cannot silently invalidate an entire scan
- Optional plugin disabling in CI for reproducibility

### Optional Cloud / Foundation Integration Boundary

The platform should include a **strict separation between core local CLI capability and optional networked integrations**.

**Decision:**
- Core scan engine has **no hard dependency** on any hosted backend
- Foundation sync, GitHub comment posting, and future team workflows are implemented as **opt-in adapters**
- Networked features should be disabled by default unless explicitly configured

**Architectural implication:**
- HTTP clients, auth flows, and sync serializers belong at the integration edge
- Findings generation, evidence mapping, and severity calculation must remain fully local and functional offline

This preserves trust with privacy-sensitive users and avoids undermining the local-first value proposition.

### CI Platform Choice

**Decision:** Treat CI as a first-class execution environment, but not as a separate platform.

**Primary target:**
- **GitHub Actions** for the initial supported CI path

**Secondary compatibility target:**
- Any CI system capable of running a Node CLI and consuming exit codes / JSON artifacts

**Required platform behaviors:**
- non-interactive execution
- stable exit codes
- machine-readable outputs
- configurable thresholds
- support for changed-file or scoped scans

This approach supports both solo local usage and team enforcement without introducing a dedicated server component.

### Platform Decisions Summary

| Concern | Chosen Direction | Reason |
|---|---|---|
| Core application platform | **Node.js CLI** | Best fit for local repo analysis, CI usage, and OSS adoption |
| Implementation language | **TypeScript** | Strong typing for IR, plugins, and maintainability |
| Primary distribution | **npm package** | Lowest-friction install and update path |
| Primary execution model | **Local single-process tool** | Simpler, deterministic, adequate for expected scale |
| Config platform | **YAML + optional TS/JS config** | Easy onboarding plus power-user flexibility |
| Extension model | **Local JS/TS plugins** | Enables extensibility without hosted complexity |
| Cloud dependency | **Optional only** | Preserves privacy, offline value, and trust |
| CI target | **GitHub Actions first** | Highest relevance for target users, easy adoption |

### Final Recommendation

Adopt **TypeScript on Node.js as the canonical platform for DriftGuard**, delivered as an **npm-distributed CLI** with:
- local-first execution,
- config-as-code,
- deterministic in-process analysis,
- a versioned plugin surface,
- and opt-in integration adapters for GitHub and Foundation.

This platform is the best match for DriftGuard's early product strategy: **trusted OSS adoption, quick first-run success, explainable CI behavior, and extensibility without premature platform complexity**.

## Key Libraries

DriftGuard should use a **small, pragmatic library set** that reinforces its local-first, deterministic, explainable CLI architecture. Library choices should favor **maturity, cross-platform behavior, ecosystem adoption, and transparent data handling** over novelty.

### Library Selection Principles

Libraries in the core path should be chosen based on the following criteria:

- **Deterministic behavior**
  - Stable parsing and serialization
  - Minimal hidden network access or dynamic runtime behavior

- **Strong TypeScript support**
  - First-class typings
  - Good compatibility with strict mode and ESM

- **Cross-platform filesystem and process safety**
  - Reliable behavior on macOS, Linux, and Windows
  - Predictable path handling and globbing

- **Explainable parsing over heuristic black boxes**
  - AST and syntax-tree libraries preferred over opaque model-only approaches
  - Ability to preserve source positions, ranges, and citations

- **Controlled dependency footprint**
  - Prefer a few well-maintained foundational libraries over many thin wrappers
  - Avoid dependencies that introduce heavy binary install burden unless justified

---

### Recommended Core Library Categories

| Area | Recommended Direction | Why |
|---|---|---|
| CLI framework | **Commander** or **CAC** | Simple, mature command/subcommand parsing for CLI-first UX |
| Terminal UX | **Picocolors**, **Ora** (minimal use), **cli-table3** or custom formatter | Lightweight human-friendly terminal output |
| Config parsing | **yaml**, **zod** | Human-editable config plus strict validation |
| File discovery | **fast-glob** | Fast, cross-platform file matching with ignore support |
| Filesystem utilities | **fs/promises**, **pathe** or Node `path` | Native-first, portable path/file operations |
| Git access | **simple-git** or direct `git` invocation | Lightweight git metadata and diff support |
| Markdown/MD AST | **unified + remark** ecosystem | Structured section extraction, headings, lists, code fences, citations |
| HTML/Doc normalization | **rehype** family where needed | Normalize rich Markdown/HTML-derived content |
| YAML/JSON parsing | **yaml**, native `JSON` | Required for config and OpenAPI ingestion |
| OpenAPI parsing | **@apidevtools/swagger-parser** | Mature dereferencing and validation for OpenAPI |
| TS/JS AST analysis | **ts-morph** + TypeScript compiler API | Best fit for repo analysis in TS/JS-heavy environments |
| Multi-language parsing | **tree-sitter** and selected grammars | Extensible AST strategy for Go/Rust/Java/Python adapters |
| Schema validation | **zod** | Runtime validation for config, plugin contracts, and report payloads |
| Frontmatter parsing | **gray-matter** | Useful for docs with metadata and ADR conventions |
| Diffing | **diff** or custom IR diff utilities | Clear finding generation and report comparison |
| Logging | **pino** (structured) or minimal internal logger | Machine-readable logs without heavy observability stack |
| Markdown report generation | Native templates / **markdown-table** only if needed | Keep reports simple and controllable |
| JSON serialization | Native JSON + stable ordering utility | Reproducible CI artifacts |
| HTTP client (optional integrations only) | **undici** | Modern Node-native HTTP for GitHub/Foundation adapters |
| Testing | **Vitest** | Fast TS-native test runner with good DX |
| Snapshot/golden tests | Vitest snapshots + fixture harness | Important for deterministic parser/output verification |
| Fixture-based repository tests | Small synthetic repos for route detection, model extraction, and drift scenarios | Important for deterministic parser/output verification |

---

### CLI and Terminal Libraries

The CLI should stay lightweight and predictable. DriftGuard does not need a rich TUI framework in the initial design.

**Recommended choices:**
- **Commander** or **CAC** for:
  - subcommands such as `scan`, `report`, `baseline`, `init`, `sync`
  - typed flags and help text
  - deterministic command parsing
- **Picocolors** for:
  - minimal terminal styling
  - low dependency weight
- **Ora** only for:
  - optional local interactive progress indicators
  - never for CI-required output paths
- **cli-table3** only if tabular output becomes necessary; otherwise prefer custom formatting to keep output stable

**Guidance:**
- Human output should be intentionally simple and grep-friendly
- CI mode should avoid spinners, cursor control, and non-deterministic formatting

---

### Configuration and Validation Libraries

Config is central to adoption and trust, so parsing must be flexible while validation remains strict.

**Recommended choices:**
- **yaml**
  - parse `.driftguard.yml`
  - preserve predictable schema handling
- **zod**
  - validate config shape
  - validate plugin manifests and report schemas
  - provide high-quality error messages for misconfiguration
- Native dynamic import for `driftguard.config.ts/js`
  - executable config should be loaded through a clearly documented path
  - validated into the same normalized internal config model

**Why this matters:**
- Solo developers need readable config
- CI users need immediate and actionable config errors
- Plugin APIs need a runtime contract, not just compile-time types

---

### Repository Ingestion and Git Libraries

DriftGuard's scan path depends heavily on reliable local file and git access.

**Recommended choices:**
- **fast-glob**
  - discover specs and code files
  - apply ignore patterns
  - support common monorepo layouts
- Native **fs/promises**
  - default for file reads and stat operations
- **simple-git** or direct process execution against `git`
  - branch/commit metadata
  - changed-files scans
  - baseline comparisons
  - historical drift support (`--since`, diff-scoped analysis)

**Preference note:**
- Use native Node APIs wherever possible for the core file path
- Keep git integration shallow and explicit; avoid libraries that try to model all git behavior internally

---

### Document Parsing Libraries

DriftGuard needs high-signal parsing for Markdown, ADRs, and structured specification documents.

**Recommended choices:**
- **unified + remark-parse + remark-gfm**
  - parse Markdown into syntax trees
  - extract headings, sections, lists, tables, code blocks, task lists
  - support source-position mapping for evidence citations
- **remark-frontmatter** and/or **gray-matter**
  - parse metadata in ADRs and structured docs
- **rehype** tools only when normalization of embedded HTML content is required

**Why this stack fits:**
- Markdown is a first-class input format for target users
- Section-aware parsing is essential for citing exact spec text
- The ecosystem is mature, composable, and explainable

**Expected parsing outputs:**
- document sections with heading hierarchy
- normalized requirement-like statements
- source spans for traceability
- document metadata such as ADR status, owners, tags, and dates where present

---

### OpenAPI and Structured Spec Libraries

OpenAPI is one of the most important structured spec formats in scope, so validation and dereferencing should use proven tooling.

**Recommended choices:**
- **@apidevtools/swagger-parser**
  - validate OpenAPI documents
  - dereference `$ref`s
  - normalize multi-file specs into a usable analysis form
- **yaml**
  - parse source YAML before validation where needed

**Why this is the right level:**
- DriftGuard needs consistent API entity extraction, not a full API gateway/runtime framework
- A mature parser reduces edge-case bugs around references and schema shape

**Use in analysis:**
- extract endpoints, methods, operation IDs, parameters, request/response schemas
- map API contracts to discovered routes and handlers in code
- generate precise citations back to spec operations and fields

---

### Code Analysis Libraries

Code analysis is central to DriftGuard's value, especially for JavaScript/TypeScript repositories in the initial launch phase.

#### TypeScript / JavaScript

**Recommended choices:**
- **ts-morph**
  - ergonomic wrapper around the TypeScript compiler API
  - useful for symbol navigation, source files, imports, declarations, and project-aware analysis
- Native **TypeScript compiler API**
  - use directly where finer control or performance is needed

**Why this fits DriftGuard:**
- Best initial language coverage for expected OSS adopters
- Strong support for analyzing:
  - Express/NestJS/Fastify route declarations
  - interfaces and type aliases
  - enums, services, DTOs, validators
  - references between modules and exported symbols

#### Multi-language expansion

**Recommended direction:**
- **tree-sitter** with selected grammars for:
  - Python
  - Go
  - Rust
  - Java
- Wrap each language analyzer behind a common internal analyzer interface

**Why tree-sitter is a good expansion path:**
- Fast, incremental parsing
  - Consistent syntax-tree access across languages
  - Good fit for local analysis without standing up language servers

**Constraint:**
- Do not over-commit to broad language parity in v0; ship strong TS/JS support first, then add targeted adapters where signal quality is acceptable

---

### Internal Matching and Rule Evaluation Support

DriftGuard's most important logic should live in its own domain code, but a few small utilities are useful.

**Recommended choices:**
- **zod**
  - validate IR nodes, findings, and plugin-returned payloads at runtime
- Lightweight diff/matching utilities
  - use **diff** only where textual comparison materially improves explanations
  - keep spec-to-code matching heuristics in first-party code for transparency and control

**Important design choice:**
- The entity matching engine, scoring logic, and finding generation should remain **internal product logic**, not outsourced to a generic AI orchestration or rule-processing framework

That keeps:
- explanations auditable
- scoring tunable
- false-positive reduction under direct control

---

### Output, Reporting, and Serialization Libraries

Outputs must be both human-readable and machine-consumable.

**Recommended choices:**
- Native **JSON.stringify** plus stable key ordering helper
  - reproducible artifacts for CI and audit export
- Simple string/template-based Markdown generation
  - more controllable than adopting a heavy reporting framework
- Optional **markdown-table** if tabular summaries become repetitive
- **pino** for structured logs if a dedicated logger is needed

**Output principles supported by this stack:**
- stable report structure
- easy downstream ingestion
- readable local summaries
- deterministic snapshots for regression tests

---

### Optional Network/Integration Libraries

Network access belongs only at the integration edge.

**Recommended choices:**
- **undici**
  - GitHub API usage
  - Foundation sync/export
  - future bounded external calls
- Native auth/token handling through environment variables and explicit config

**Rule:**
- No network library should sit in the core scan path
- Integrations must be cleanly separable so offline scans remain fully functional

---

### Testing and Quality Libraries

Given DriftGuard's emphasis on deterministic behavior, the test stack should strongly support fixtures and golden outputs.

**Recommended choices:**
- **Vitest**
  - unit tests for parsing, matching, severity scoring, and CLI behavior
  - good TypeScript ergonomics
- Snapshot/golden-file tests
  - verify JSON and Markdown report stability
  - verify parser output for representative docs and repos
- Fixture-based repository tests
  - small synthetic repos for route detection, model extraction, and drift scenarios

**Priority test areas:**
- Markdown section extraction
- OpenAPI dereferencing and entity extraction
- TS route/model analyzer correctness
- finding stability across repeated runs
- config validation and plugin failure isolation
- changed-file / git-scoped scan behavior

---

### Suggested Initial Library Baseline

| Concern | Preferred Library/Approach | Priority |
|---|---|---|
| CLI commands | **Commander** or **CAC** | P0 |
| Colors/output | **Picocolors** | P0 |
| Config validation | **zod** | P0 |
| YAML parsing | **yaml** | P0 |
| File discovery | **fast-glob** | P0 |
| Git metadata | **simple-git** or direct `git` | P0 |
| Markdown parsing | **unified + remark** | P0 |
| Frontmatter | **gray-matter** | P1 |
| OpenAPI parsing | **@apidevtools/swagger-parser** | P0 |
| TS/JS code analysis | **ts-morph** | P0 |
| Multi-language path | **tree-sitter** | P1 |
| Optional HTTP | **undici** | P1 |
| Structured logging | **pino** | P1 |
| Test runner | **Vitest** | P0 |

---

### Libraries to Avoid in the Core Path

To preserve simplicity and trust, DriftGuard should avoid the following in the initial core:

- **Heavy workflow/orchestration frameworks**
  - unnecessary for a deterministic local CLI
- **LLM-first parsing frameworks**
  - reduce explainability in the core analysis path
- **Large native binary dependencies without clear ROI**
  - increase install friction for OSS users
- **Browser-oriented UI libraries**
  - irrelevant to initial product shape
- **Database/ORM dependencies in the local scan engine**
  - findings can remain in-memory and file-export based for v0

---

### Final Recommendation

Adopt a library stack centered on:

- **Commander/CAC** for CLI structure
- **zod + yaml** for validated config
- **fast-glob + fs/promises + simple-git** for repo ingestion
- **unified/remark** for Markdown and ADR parsing
- **@apidevtools/swagger-parser** for OpenAPI
- **ts-morph** for TypeScript/JavaScript code analysis
- **tree-sitter** as the planned multi-language extension path
- **undici** only for opt-in integrations
- **Vitest** for deterministic fixture-driven testing

This library set best supports DriftGuard's core promise: **fast local scans, explainable evidence mapping, low-friction OSS adoption, and an extensible architecture without unnecessary platform weight**.

## Tradeoffs

The selected DriftGuard stack is intentionally opinionated. It optimizes for **trustworthy local analysis, fast OSS adoption, and explainable CI behavior**, but those choices come with real tradeoffs that should be made explicit.

### Primary Stack Tradeoff Summary

| Decision | Benefits | Costs / Risks | Why Acceptable Now |
|---|---|---|---|
| **Node.js + TypeScript CLI** | Fast adoption, npm distribution, strong TS ecosystem, easy plugin model | Higher memory/runtime overhead than compiled languages; weaker native performance for very large repos | Medium expected scale and OSS adoption speed matter more than raw throughput |
| **Local-first execution** | Privacy, offline use, deterministic scans, no backend dependency | No centralized state, team dashboards, or cross-repo analytics by default | Core value is repo-local accountability, not hosted collaboration in v0 |
| **Deterministic AST/rule-based analysis** | Explainable findings, auditability, reproducibility | Lower coverage on ambiguous requirements; more engineering effort than pure LLM heuristics | Trust and false-positive control are more important than broad but opaque detection |
| **Markdown/OpenAPI/AST-first parsing** | Strong evidence mapping and citations | Initial format support is narrower than "analyze anything" positioning | Better to do common formats well than support many poorly |
| **Plugin-based extensibility in-process** | Low-friction customization, simple contribution model | Plugin isolation and safety are weaker than out-of-process execution | Appropriate for early OSS extensibility if interfaces are versioned and guarded |
| **npm-first packaging** | Familiar install path, easy updates, aligns with JS plugins | Requires Node runtime; some security-sensitive users prefer standalone binaries | Best default for target users; binaries can be added later |
| **GitHub Actions-first CI support** | High relevance for target users, simple docs/support burden | Less polished experience on other CI platforms initially | Sensible focus for launch audience |

---

### Runtime Tradeoffs: Node.js vs Compiled CLI Languages

Choosing **Node.js/TypeScript** over Go or Rust is a product adoption decision as much as a technical one.

**What is gained:**
- easiest install and trial path for the expected audience
- strong TypeScript ergonomics for:
  - IR schemas
  - plugin contracts
  - parser adapters
  - report generation
- excellent ecosystem fit for Markdown, OpenAPI, YAML, and JavaScript/TypeScript repo analysis
- much lower friction for community-contributed rules and plugins

**What is given up:**
- slower cold start than a native compiled CLI
- higher memory usage during large scans
- more packaging complexity in environments without Node
- somewhat less confidence for extremely large monorepos or heavy parallel analysis

**Why this is still the right choice:**
DriftGuard's early bottleneck is expected to be **analysis quality and usability**, not CPU-bound throughput at enterprise scale. If adoption later reveals startup latency or memory pressure as major blockers, packaging can evolve toward standalone binaries without changing the core architectural direction.

---

### Local-First vs Hosted-First Tradeoff

DriftGuard explicitly chooses a **local-first core** rather than making a hosted backend central to value delivery.

**Advantages of local-first:**
- repository contents stay on the user's machine by default
- scans work offline
- trust is higher for security-sensitive repos
- CI behavior is simpler because the tool does not depend on service availability
- OSS users receive real value without account creation or vendor lock-in

**Costs of local-first:**
- no inherent central history across repositories or teams
- collaboration features require opt-in export/sync paths
- audit evidence sharing is less seamless than a hosted dashboard
- support for organizational policy management is deferred

**Implication:**
This is a deliberate tradeoff in favor of **developer-led adoption**. It may slow expansion into compliance-heavy or management-heavy workflows until Foundation sync and reporting features mature, but it materially increases trust and first-run conversion for the primary audience.

---

### Explainable Rules vs LLM-First Analysis Tradeoff

DriftGuard's stack favors **deterministic parsers, AST tooling, and explicit matching logic** over a model-centric architecture.

**Benefits:**
- findings can cite exact spec sections and code locations
- CI results are reproducible
- false positives are easier to debug
- matching behavior can be tuned explicitly
- audit and compliance use cases remain credible

**Limitations:**
- vague product requirements and implied behaviors are harder to detect
- business-rule inference may remain partial without bounded AI assist
- some drift categories will have lower recall than a more heuristic LLM-first approach
- engineering effort is higher because product logic must be built rather than delegated to generic AI orchestration

**Resulting design stance:**
AI can be used as an **optional assistive layer** for ranking, explanation polishing, or weak-signal classification, but not as the sole basis for core drift detection. This preserves the product's trust model.

---

### Breadth vs Depth of Language Support

The stack strongly favors **deep TypeScript/JavaScript support first**, with multi-language support added through adapters.

**Benefits of this approach:**
- better route/model detection quality in the most likely early-adopter repos
- faster time to a launchable OSS product
- simpler testing and fixture coverage
- fewer low-quality analyzers shipped just to claim broad support

**Tradeoffs:**
- users with Python, Go, Rust, or Java repos may receive partial value initially
- cross-language parity will lag
- documentation must be explicit about supported frameworks and confidence levels

**Why this is acceptable:**
For a new system at medium scale, **high-signal support in common early use cases** is more valuable than shallow support across many ecosystems. The tree-sitter path preserves expansion optionality without forcing broad v0 commitments.

---

### In-Process Plugins vs Strong Isolation

Allowing **JS/TS plugins inside the CLI process** makes DriftGuard extensible, but it also introduces risk.

**Advantages:**
- plugin authors can work in the same language as the core tool
- custom rules are easy to distribute and debug
- no need for sidecar services, RPC, or plugin daemons
- lower maintenance burden than sandboxed remote extension systems

**Risks:**
- plugins can affect performance or crash scans
- executable plugin code raises trust and security concerns
- deterministic CI can be undermined if plugins are poorly controlled
- version compatibility must be managed carefully

**Mitigations required:**
- versioned plugin API
- explicit plugin enable/disable controls
- validation of plugin outputs
- clear CI guidance for pinning versions and limiting trusted plugins
- failure isolation at plugin boundaries where feasible

This is a pragmatic v0 tradeoff: **extensibility now**, stronger sandboxing later if ecosystem growth justifies it.

---

### YAML + TS/JS Config Tradeoff

Supporting both **declarative YAML** and **executable TS/JS config** improves usability, but creates a trust and reproducibility tension.

**Why support both:**
- YAML keeps onboarding simple
- TS/JS config enables advanced repository-specific logic
- power users can encode dynamic path selection or custom mappings

**Tradeoffs introduced:**
- executable config is harder to audit
- dynamic config can reduce reproducibility if it depends on environment state
- support complexity increases because two config styles must be documented and tested

**Design consequence:**
YAML should remain the recommended default for most users, while TS/JS config is treated as an advanced escape hatch with explicit documentation around determinism and CI safety.

---

### npm Package vs Standalone Binary Tradeoff

An **npm-first distribution model** is the best fit for launch, but not universally ideal.

**npm-first strengths:**
- zero-to-first-run is fast for JS-heavy users
- easy integration into existing repo toolchains
- aligns naturally with plugin loading and versioning
- low release overhead for OSS iteration

**npm-first weaknesses:**
- requires Node in local and CI environments
- can be less appealing in locked-down enterprise environments
- install reproducibility depends on package manager behavior unless carefully documented
- cold-start UX may be slower than native binaries

**Future flexibility:**
If enterprise pilots, security-sensitive environments, or performance constraints demand it, standalone binaries can be added later. That change would improve distribution ergonomics without invalidating the current stack.

---

### Simplicity vs Future Platform Ambition

The chosen stack intentionally does **not** optimize for a future full SaaS platform.

**What this protects:**
- keeps current architecture aligned with actual product strategy
- avoids premature backend, database, auth, and multi-tenant complexity
- allows the team to validate whether spec-to-code drift is a strong enough wedge before building hosted infrastructure

**What this delays:**
- centralized team analytics
- durable finding history in a shared system of record
- organizational workflows, approvals, and policy administration
- enterprise-grade governance features

This is the correct tradeoff for a **new OSS-first product**, but it means the team should continuously watch for signals that the center of gravity is shifting from local analysis toward team coordination.

---

### Key Technical Risks to Monitor

The chosen stack is sound for current goals, but several risks should be monitored as part of implementation and early adoption:

| Risk | Why It Matters | Mitigation Direction |
|---|---|---|
| **False positives from brittle mappings** | Undermines trust faster than missing some drift | Invest in IR quality, citations, suppression paths, fixture testing |
| **Performance on larger repos** | Could hurt CI adoption and local repeat use | Scope scans, cache parse artifacts later, optimize hot analyzers, consider worker threads selectively |
| **Plugin instability** | Can reduce reproducibility and supportability | Versioned APIs, schema validation, clear plugin trust model |
| **Config complexity creep** | Can erode "works in minutes" promise | Keep defaults strong; resist overexposing internals in v0 |
| **Uneven language/framework support** | Can create expectation mismatch | Publish support matrix and confidence levels explicitly |
| **Node ecosystem churn / ESM friction** | Can affect plugin ergonomics and install stability | Keep runtime baseline narrow, document module expectations, test packaging thoroughly |

---

### Tradeoff Position

Overall, the DriftGuard stack intentionally chooses:

- **adoption speed over maximal runtime performance**
- **explainability over heuristic breadth**
- **local trust over hosted convenience**
- **deep initial support over broad but shallow coverage**
- **pragmatic extensibility over hard isolation**

These are the right tradeoffs for the current product strategy. For DriftGuard, success in the near term depends less on building the most technically expansive platform and more on delivering a tool that users can **install quickly, trust immediately, and integrate into local and CI workflows without operational drag**.
