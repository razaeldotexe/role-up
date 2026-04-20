# Discord Server Automation AI Bot (2026 Edition)

An advanced Discord server automation assistant powered by 14 free AI models across three providers: Google, OpenRouter, and Groq. This bot is designed to help administrators manage roles, server identity, and general organization using natural language.

## Key Features

- **Triple-Provider Failover:** Automatic rotation between Google, OpenRouter, and Groq if a provider experiences downtime or rate limits.
- **Multi-Model Rotation:** Intelligently cycles through 14 different models (including Gemini 2.5, Gemma 4, and Llama 4 Scout) to ensure consistent service without cost.
- **Server Automation (`/automate`):**
  - **Professional Role Management:** Automatically creates and organizes role hierarchies (Admin, Moderator, Staff, etc.).
  - **Dynamic Server Renaming:** Instantly updates the server name based on user prompts.
  - **Themed Color Scaling:** Mass-updates role colors to match specific themes (e.g., Fantasy, Minimalist, Cyberpunk).
  - **Smart Group Identification:** Identifies roles by permissions and naming patterns to apply bulk changes.
- **Modern Architecture:** Built with Discord.js v14, ECMAScript Modules (ESM), ESLint, and Prettier.

## Prerequisites

- Node.js v18 or newer.
- A Discord Bot Token with the following Intents: `GUILD_MEMBERS`, `GUILD_MESSAGES`, `MESSAGE_CONTENT`.
- API Keys for at least one of the following providers:
  - [Google AI Studio](https://aistudio.google.com/)
  - [OpenRouter](https://openrouter.ai/)
  - [Groq](https://groq.com/)

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone git@github.com:razaeldotexe/role-up.git
   cd role-up
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy the example environment file and fill in your credentials:
   ```bash
   cp .env.example .env
   ```

4. **Deploy Slash Commands:**
   ```bash
   npm run deploy
   ```

5. **Start the Bot:**
   ```bash
   npm start
   ```

## Development

- **Linting:** Run `npm run lint` to check for code issues.
- **Formatting:** Run `npm run format` to automatically fix code style.

## License

This project is licensed under the [MIT License](LICENSE).
