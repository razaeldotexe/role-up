---
title: 'TypeScript Migration Implementation Plan'
design_ref: '/data/data/com.termux/files/home/role-up/docs/maestro/plans/2026-04-24-typescript-migration-design.md'
created: '2026-04-24T04:36:00Z'
status: 'approved'
total_phases: 5
estimated_files: 11
task_complexity: 'complex'
---

# TypeScript Migration Implementation Plan

## Plan Overview

- **Total phases**: 5
- **Agents involved**: coder
- **Estimated effort**: Moderate structural refactoring affecting all JS files. Strong emphasis on type safety and configuration of a new compile step.

## Dependency Graph

```
Phase 1 (Foundation: Config & Dependencies)
  |
Phase 2 (Core Domain: ai-handler.ts)
  |
Phase 3 (Feature Migration: Commands & Events)
  |
Phase 4 (Integration: index.ts & Deploy Scripts)
  |
Phase 5 (Quality: ESLint & Build Validation)
```

## Execution Strategy

| Stage | Phases  | Execution  | Agent Count | Notes                                      |
| ----- | ------- | ---------- | ----------- | ------------------------------------------ |
| 1     | Phase 1 | Sequential | 1           | Foundation setup (tsconfig, package.json)  |
| 2     | Phase 2 | Sequential | 1           | Core type definitions and AI logic         |
| 3     | Phase 3 | Sequential | 1           | Typing Discord event handlers and commands |
| 4     | Phase 4 | Sequential | 1           | Dynamic loader adaptations                 |
| 5     | Phase 5 | Sequential | 1           | Final build validation and linting         |

## Phase 1: Foundation (Config & Dependencies)

### Objective

Install TypeScript dependencies, establish `tsconfig.json` with NodeNext resolution, and update `package.json` scripts to support the new build pipeline.

### Agent: coder

### Parallel: No

### Files to Create

- `tsconfig.json` — TypeScript compiler configuration enforcing strict mode and NodeNext module resolution.

### Files to Modify

- `package.json` — Add `typescript`, `tsx`, `@types/node` as devDependencies. Update `scripts` (add `dev: "tsx src/index.ts"`, `build: "tsc"`, update `start: "node dist/index.js"`).

### Implementation Details

Configure `tsconfig.json` with:

- `target`: "ES2022"
- `module`: "NodeNext"
- `moduleResolution`: "NodeNext"
- `outDir`: "./dist"
- `rootDir`: "./" (or "./src" if scripts are moved or handled appropriately; since `scripts/` is at root level, `rootDir` should be `./` to encompass both `src/` and `scripts/`).
- `strict`: true
- `esModuleInterop`: true

### Validation

- Run `npm install` and verify dependencies are added.

### Dependencies

- Blocked by: []
- Blocks: [2, 3, 4, 5]

---

## Phase 2: Core Domain (ai-handler.ts)

### Objective

Migrate the core AI logic to TypeScript, introducing formal interfaces for the AI provider return schemas and the Discord role structures.

### Agent: coder

### Parallel: No

### Files to Modify

- `src/utils/ai-handler.js` -> `src/utils/ai-handler.ts` — Rename to `.ts`, add explicit interfaces for `AIAction`, `RoleData`, and `ProviderResult`. Update relative imports to include `.js` extension (e.g., `import 'dotenv/config.js'`).

### Implementation Details

- Define `interface AIAction` (action, roleId, newName, newColor, name, color, hoist).
- Define `interface RoleData` (id, name, color, position, managed).
- Type the `ModelRegistry` and `ServerAutomator` class methods.
- Type `interaction` parameters as `ChatInputCommandInteraction`.

### Validation

- Verify `tsc --noEmit` passes for this specific file.

### Dependencies

- Blocked by: [1]
- Blocks: [3]

---

## Phase 3: Feature Migration (Commands & Events)

### Objective

Migrate all command and event definitions to TypeScript, ensuring full type safety for Discord.js interactions.

### Agent: coder

### Parallel: No

### Files to Modify

- `src/commands/automate.js` -> `src/commands/automate.ts`
- `src/commands/ping.js` -> `src/commands/ping.ts`
- `src/events/interactionCreate.js` -> `src/events/interactionCreate.ts`
- `src/events/messageCreate.js` -> `src/events/messageCreate.ts`
- `src/events/ready.js` -> `src/events/ready.ts`

### Implementation Details

- Rename all files to `.ts`.
- In events, strongly type the `execute` function parameters (e.g., `interaction: Interaction`, `message: Message`, `client: Client`).
- In commands, ensure `execute` accepts `ChatInputCommandInteraction`.
- Ensure all relative local imports append the `.js` extension (e.g., `import { handleAIRoles } from '../utils/ai-handler.js'`).

### Validation

- Verify `tsc --noEmit` passes for these files.

### Dependencies

- Blocked by: [2]
- Blocks: [4]

---

## Phase 4: Integration (index.ts & deploy-commands.ts)

### Objective

Migrate the main entry point and deployment script, specifically adapting the dynamic `fs.readdirSync` loaders to handle the dual TS/JS environment.

### Agent: coder

### Parallel: No

### Files to Modify

- `src/index.js` -> `src/index.ts`
- `scripts/deploy-commands.js` -> `scripts/deploy-commands.ts`

### Implementation Details

- Rename to `.ts`.
- Update dynamic loaders: instead of `.filter(file => file.endsWith('.js'))`, the logic should support both `.js` and `.ts` depending on the runtime, or simply filter for `.js` and `.ts` while excluding source maps/declaration files.
  - Example: `file.endsWith('.js') || (file.endsWith('.ts') && !file.endsWith('.d.ts'))`
- Ensure dynamic `await import()` utilizes the correct path resolution for compiled output vs source.
- Provide explicit typing for the `client.commands` Collection.

### Validation

- Run `npm run build` to ensure the entire project compiles successfully into `dist/`.

### Dependencies

- Blocked by: [3]
- Blocks: [5]

---

## Phase 5: Quality (ESLint & Final Validation)

### Objective

Adapt the ESLint configuration to parse TypeScript files, and perform final build and lint validations.

### Agent: coder

### Parallel: No

### Files to Modify

- `eslint.config.js` — Add `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` (or equivalent flat config setups) to support linting the new `.ts` files.
- `package.json` — Add linting dependencies if necessary.

### Implementation Details

- Ensure `eslint.config.js` processes `.ts` files correctly without false positive syntax errors for interfaces/types.
- Fix any remaining linting errors introduced by the type annotations.

### Validation

- Run `npm run lint`.
- Run `npm run build`.

### Dependencies

- Blocked by: [4]
- Blocks: []

---

## File Inventory

| #   | File                              | Phase | Purpose                                    |
| --- | --------------------------------- | ----- | ------------------------------------------ |
| 1   | `tsconfig.json`                   | 1     | TypeScript compiler settings               |
| 2   | `package.json`                    | 1     | Dependencies and build scripts             |
| 3   | `src/utils/ai-handler.ts`         | 2     | Typed AI logic and interfaces              |
| 4   | `src/commands/automate.ts"        | 3     | Typed command definition                   |
| 5   | `src/commands/ping.ts`            | 3     | Typed command definition                   |
| 6   | `src/events/interactionCreate.ts" | 3     | Typed event handler                        |
| 7   | `src/events/messageCreate.ts"     | 3     | Typed event handler                        |
| 8   | `src/events/ready.ts"             | 3     | Typed event handler                        |
| 9   | `src/index.ts`                    | 4     | Typed entry point and dynamic loader       |
| 10  | `scripts/deploy-commands.ts"      | 4     | Typed deployment script and dynamic loader |
| 11  | `eslint.config.js`                | 5     | TypeScript linting configuration           |

## Risk Classification

| Phase | Risk   | Rationale                                                                                                     |
| ----- | ------ | ------------------------------------------------------------------------------------------------------------- |
| 1     | LOW    | Standard configuration changes, easily reversible.                                                            |
| 2     | MEDIUM | Core logic typing is safe, but incorrect interfaces could cause runtime data mismatches.                      |
| 3     | LOW    | Standard Discord.js event typing.                                                                             |
| 4     | HIGH   | Dynamic loader logic is sensitive to the runtime environment (`dist/` vs `src/`) and module resolution rules. |
| 5     | LOW    | ESLint configuration adjustments.                                                                             |

## Execution Profile

```
Execution Profile:
- Total phases: 5
- Parallelizable phases: 0
- Sequential-only phases: 5
- Estimated sequential wall time: 5-8 minutes

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```

## Token Budget Estimate

| Phase     | Agent | Model   | Est. Input  | Est. Output |
| --------- | ----- | ------- | ----------- | ----------- |
| 1         | coder | Primary | ~1,000      | ~300        |
| 2         | coder | Primary | ~2,000      | ~800        |
| 3         | coder | Primary | ~3,000      | ~1,500      |
| 4         | coder | Primary | ~2,500      | ~1,000      |
| 5         | coder | Primary | ~1,500      | ~500        |
| **Total** |       |         | **~10,000** | **~4,100**  |
