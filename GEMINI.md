# GEMINI.md - Role-Up (Discord AI Bot)

This file provides instructional context for AI agents interacting with the **Role-Up** repository, an advanced Discord server automation assistant.

## Project Overview

**Role-Up** is a Discord bot built with **Discord.js v14** and **Node.js (ESM)**. It leverages a rotation of multiple AI providers (Google Gemini, OpenRouter, and Groq) to automate server management tasks like role hierarchy organization, color theming, and server renaming through natural language commands.

### Key Technologies

- **Runtime:** Node.js v18+ (ESM)
- **Discord Library:** [discord.js v14](https://discord.js.org/)
- **AI Providers:**
  - **Google Generative AI:** Gemini 2.5 series.
  - **OpenRouter:** Gemma 4, Qwen 3, etc.
  - **Groq:** Llama 4 Scout, Llama 3.3, etc.
- **HTTP Client:** Axios (for custom AI provider integrations).
- **Linting & Formatting:** ESLint & Prettier.

### Architecture

- `src/index.js`: Main entry point, initializes the Discord client, loads commands and events.
- `src/commands/`: Contains slash command definitions (e.g., `automate.js`, `ping.js`).
- `src/events/`: Discord event handlers (e.g., `interactionCreate.js`, `ready.js`).
- `src/utils/ai-handler.js`: Core logic for AI model rotation (`ModelRegistry`) and server automation execution (`ServerAutomator`).
- `scripts/deploy-commands.js`: Script to register slash commands with Discord.

## Building and Running

### Prerequisites

- Node.js v18+ installed.
- Valid API keys in a `.env` file (see `.env.example`).
- Discord Bot Token with `GUILD_MEMBERS`, `GUILD_MESSAGES`, and `MESSAGE_CONTENT` intents enabled.

### Key Commands

- `npm install`: Install dependencies.
- `npm run deploy`: Deploy slash commands to Discord.
- `npm start`: Start the bot (runs `node src/index.js`).
- `npm run lint`: Run ESLint to check code quality.
- `npm run format`: Run Prettier to format the codebase.

## Development Conventions

### AI Interaction & Logic

- **Failover Strategy:** The bot uses a "Triple-Provider Failover" system. If one provider or model fails (due to rate limits or downtime), it automatically tries the next one in the `ModelRegistry`.
- **Action Schema:** The AI returns a JSON array of actions. Supported actions include:
  - `rename`: Rename an existing role.
  - `setColor`: Update a role's color.
  - `delete`: Delete a role.
  - `create`: Create a new role with name, color, and hoist settings.
  - `renameServer`: Update the Discord server's name.
- **Safety:** Role management actions are filtered to exclude managed roles and the `@everyone` role. Administrator permissions are required to use the `/automate` command.

### Code Style

- **ESM:** Use `import`/`export` syntax.
- **Discord.js:** Follow v14 patterns (e.g., `SlashCommandBuilder`, `PermissionFlagsBits`).
- **Formatting:** Adhere to `.prettierrc` settings (single quotes, 2-space indentation).

## Key Files

- `src/utils/ai-handler.js`: The "brain" of the bot. Modify this to add new models, update system instructions, or add new automation actions.
- `src/commands/automate.js`: The primary interface for users to interact with the AI.
- `package.json`: Contains dependency and script definitions.
