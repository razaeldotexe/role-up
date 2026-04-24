---
title: 'TypeScript Migration'
created: '2026-04-24T04:35:00Z'
status: 'draft'
authors: ['TechLead', 'User']
type: 'design'
design_depth: 'standard'
task_complexity: 'complex'
---

# TypeScript Migration Design Document

## Problem Statement

The Role-Up Discord bot is currently written in vanilla JavaScript (ESM). While the codebase is modular and functions well, the lack of static typing introduces runtime risks, especially when dealing with complex data structures returned by the Discord.js API and the multi-provider AI responses. As the bot scales to support more features, refactoring, maintaining, and extending the codebase will become increasingly error-prone without compile-time guarantees. The objective is to migrate the entire codebase to TypeScript, introducing formal type definitions and strict compiler checks to improve developer experience, code reliability, and long-term maintainability, while preserving the existing ESM architecture and dynamic command/event loading paradigms.

## Requirements

### Functional Requirements

1. **REQ-1:** All `.js` source files in `src/` and `scripts/` must be converted to `.ts`.
2. **REQ-2:** The bot must execute successfully in a development environment using `tsx` (e.g., `npm run dev`).
3. **REQ-3:** The codebase must compile successfully to a `dist/` directory using the TypeScript compiler (`tsc`), and run correctly using Node.js (e.g., `npm start`).
4. **REQ-4:** The dynamic command and event loaders must be updated to correctly resolve extensions and paths in both the `tsx` development environment and the compiled `dist/` production output.

### Non-Functional Requirements

1. **REQ-5:** The TypeScript configuration must enforce Strict Mode (`strict: true`) to maximize type safety and prohibit implicit `any` types.
2. **REQ-6:** The project must retain its native Node.js ECMAScript Modules (ESM) architecture, using NodeNext module resolution.

### Constraints

- The migration must not alter the core functionality or multi-provider AI logic of the bot.
- No new build tools (like Webpack or esbuild) should be introduced; the pipeline must rely solely on `tsc` and `tsx`.

## Approach

### Selected Approach

**NodeNext Module Resolution**
We will utilize the official TypeScript compiler (`tsc`) with NodeNext module resolution. This means we must append `.js` file extensions in all relative imports within `.ts` files.

### Alternatives Considered

#### Bundler Module Resolution with `esbuild`

- **Description**: Use a bundler to compile extensionless TS imports.
- **Pros**: Clean extensionless imports in source code.
- **Cons**: Adds a new build tool dependency and departs from a standard `tsc` pipeline.
- **Rejected Because**: The project explicitly limits the build tools to `tsc` and `tsx` to keep the pipeline simple and natively aligned with ESM constraints.

### Decision Matrix

| Criterion          | Weight | Approach A (NodeNext)        | Approach B (Bundler+esbuild)   |
| ------------------ | ------ | ---------------------------- | ------------------------------ |
| Build Simplicity   | 40%    | 5: Pure tsc/tsx pipeline     | 3: Adds new bundler tool       |
| ESM Compliance     | 40%    | 5: Official Node.js standard | 4: Relies on bundler shim      |
| Import Syntax      | 20%    | 3: Requires .js in source    | 5: Clean extensionless imports |
| **Weighted Total** |        | **4.6**                      | **3.8**                        |

## Architecture

- **`index.ts`** dynamically scans `src/commands` and `src/events`, resolving the appropriate extension based on the environment flag or runtime check. — _[Required to support both the TS extension via tsx in dev, and the compiled JS extension in prod (REQ-4)]_
- **Commands & Events** export objects strictly typing their structure (e.g., `SlashCommandBuilder` for `data`, and a function accepting a `ChatInputCommandInteraction` for `execute`). — _[Required by REQ-5 to ensure no implicit any is used]_
- **`ai-handler.ts`** will define `ModelRegistry`, `ServerAutomator`, and interfaces like `ModelProvider` and `ActionPayload` to guarantee structured AI responses are processed safely.

### Data Flow

The data flow from Discord interaction to AI provider and back remains exactly the same as the JS version, but the boundaries between the Discord Client, Event Handlers, and `ai-handler.ts` will be explicitly typed.

### Key Interfaces

```typescript
// Example interface for AI action payloads
interface AIAction {
  action: 'rename' | 'setColor' | 'delete' | 'create' | 'renameServer';
  roleId?: string;
  newName?: string;
  newColor?: string;
  name?: string;
  color?: string;
  hoist?: boolean;
}
```

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables                                                                  |
| ----- | -------- | -------- | ----------------------------------------------------------------------------- |
| 1     | `coder`  | No       | `tsconfig.json`, updated `package.json`, environment definitions              |
| 2     | `coder`  | No       | Typed `src/utils/ai-handler.ts` and core structural types                     |
| 3     | `coder`  | No       | Typed events and commands directories                                         |
| 4     | `coder`  | No       | `index.ts` loader adaptation, deployment script migration, final build checks |

## Risk Assessment

| Risk                                           | Severity | Likelihood | Mitigation                                                                                           |
| ---------------------------------------------- | -------- | ---------- | ---------------------------------------------------------------------------------------------------- |
| Dynamic module resolution failure in ESM       | HIGH     | MEDIUM     | Explicit `.js` extension usage and runtime checks for `NODE_ENV` or file paths during initialization |
| Type-casting hiding actual API data structures | MEDIUM   | LOW        | Using official `discord.js` interfaces and robust generic typing for the AI JSON responses           |
| Missing types for third-party libraries        | LOW      | LOW        | Adding `@types/node` and utilizing the built-in types of `discord.js`                                |

## Success Criteria

1. `npm run lint` and `npm run format` complete without errors after the codebase is updated.
2. The application compiles completely to the `dist/` directory using `tsc`.
3. The server starts and connects to Discord via `tsx src/index.ts` and `node dist/index.js`.
4. All commands (specifically `/automate`) are deployed successfully to the Discord application.
