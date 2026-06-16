# ReachIn Documentation

Engineering knowledge base for the ReachIn Chrome Extension.

---

## Quick Start

New to the project? Read in this order:

1. [Architecture](ARCHITECTURE.md) — system overview and component design
2. [Project Structure](PROJECT_STRUCTURE.md) — files, folders, and module relationships
3. [Local Development](LOCAL_DEVELOPMENT.md) — setup, debugging, testing
4. [Business Logic](BUSINESS_LOGIC.md) — collection rules and user flows

---

## Documentation Index

### Architecture and Design

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | High-level architecture, lifecycle, message passing, data flow, module breakdown |
| [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) | Directory tree, file purposes, module dependencies |
| [MANIFEST.md](MANIFEST.md) | Manifest V3 reference, permissions, entry points |

### Data and Storage

| Document | Description |
|----------|-------------|
| [STORAGE.md](STORAGE.md) | Storage keys, schemas, lifecycle, retention policies |
| [BUSINESS_LOGIC.md](BUSINESS_LOGIC.md) | Keyword processing, filtering, deduplication, history rules |

### Runtime Behavior

| Document | Description |
|----------|-------------|
| [CONTENT_SCRIPT.md](CONTENT_SCRIPT.md) | LinkedIn DOM interaction, scrolling, extraction, selectors |
| [UI_AND_UX.md](UI_AND_UX.md) | Popup views, user flows, settings, theme, clipboard |

### Operations and Compliance

| Document | Description |
|----------|-------------|
| [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) | Dev setup, debugging, reload workflow, test checklist |
| [OPERATIONS.md](OPERATIONS.md) | Troubleshooting, DOM changes, recovery procedures |
| [PRIVACY_AND_SECURITY.md](PRIVACY_AND_SECURITY.md) | Privacy guarantees, security review, CWS compliance |

### Engineering Standards

| Document | Description |
|----------|-------------|
| [CODE_GUIDELINES.md](CODE_GUIDELINES.md) | JavaScript, DOM, Chrome API, messaging, storage standards |
| [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) | Prioritized debt, risks, and recommended improvements |
| [COVERAGE_REPORT.md](COVERAGE_REPORT.md) | Full analysis inventory and knowledge gaps |

### External

| Document | Description |
|----------|-------------|
| [PRIVACY.md](../PRIVACY.md) | User-facing privacy policy |
| [README.md](../README.md) | User-facing project overview |

---

## Cursor Rules

AI coding standards in `.cursor/rules/`:

| Rule | Scope |
|------|-------|
| [chrome-extension-architecture.mdc](../.cursor/rules/chrome-extension-architecture.mdc) | MV3 architecture boundaries |
| [javascript-standards.mdc](../.cursor/rules/javascript-standards.mdc) | JavaScript conventions |
| [chrome-api-usage.mdc](../.cursor/rules/chrome-api-usage.mdc) | Chrome API patterns |
| [content-script.mdc](../.cursor/rules/content-script.mdc) | DOM interaction and selectors |
| [security.mdc](../.cursor/rules/security.mdc) | Security requirements |
| [privacy.mdc](../.cursor/rules/privacy.mdc) | Privacy and local-only processing |
| [testing.mdc](../.cursor/rules/testing.mdc) | Manual testing standards |

---

## Documentation Maintenance Policy

Documentation updates are **mandatory** and part of the Definition of Done for all code changes.

### When Code Changes, Update Docs

| Change | Impacted Documents |
|--------|-------------------|
| New/changed storage key | `STORAGE.md`, `COVERAGE_REPORT.md` |
| New/changed message action | `ARCHITECTURE.md`, `COVERAGE_REPORT.md` |
| New/changed LinkedIn selector | `CONTENT_SCRIPT.md`, `OPERATIONS.md` |
| New/changed permission | `MANIFEST.md`, `PRIVACY_AND_SECURITY.md`, `COVERAGE_REPORT.md` |
| New/changed UI view or flow | `UI_AND_UX.md`, `BUSINESS_LOGIC.md` |
| Behavior or business rule change | `BUSINESS_LOGIC.md`, `ARCHITECTURE.md` |
| New file or directory | `PROJECT_STRUCTURE.md` |
| Bug or limitation discovered | `TECHNICAL_DEBT.md` |
| User-facing feature change | `README.md` |
| New coding pattern | `CODE_GUIDELINES.md`, relevant `.cursor/rules/*.mdc` |

### Documentation Impact Report

After each change set, identify and update all impacted documents. For significant changes, note updates in the PR description:

```
Documentation Impact:
- Updated STORAGE.md (new key: exampleKey)
- Updated ARCHITECTURE.md (message registry)
- Updated COVERAGE_REPORT.md (storage keys count)
```

### Diagram Maintenance

Mermaid diagrams live inline in markdown files. Update diagrams when the flows they represent change.

---

## Contributing to Documentation

- Document only behavior that exists in the codebase
- Include file paths and function names as references
- Use Mermaid diagrams for architecture, sequence, and flow documentation
- Flag assumptions and knowledge gaps explicitly
- Keep user-facing content in `README.md` and `PRIVACY.md`; keep engineering detail in `docs/`
