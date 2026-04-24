import axios from 'axios';
import 'dotenv/config';
const SYSTEM_INSTRUCTIONS = `
You are a Discord Role Management Expert AI. Your goal is to help reorganize and manage roles based on user instructions with professional server standards.
Current Roles in JSON:
{ROLES_DATA}

User Instruction: "{USER_PROMPT}"

IMPORTANT GUIDELINES:
1. GROUP IDENTIFICATION: When a user refers to a category like "staff", "members", or "levels", identify ALL roles that belong to that category based on their NAME (e.g., Admin, Mod, Staff, Helper, Team) or their PERMISSIONS (roles with administrative or moderation capabilities). 
2. APPLY TO GROUP: If the user asks to "change color of staff roles", apply the change to every role you identified as part of the staff group, not just a role named "staff".
3. INTERPRET INTENT: If a user asks for "staff roles", do not just create one role named "staff". Instead, create a professional hierarchy (e.g., Admin, Moderator, Staff, Helper) with appropriate colors.
4. THEME CONSISTENCY: When asked for a "fantasy theme" or similar, choose a coordinated color palette that fits the theme (e.g., Deep Purple, Gold, Emerald, Crimson) and apply it consistently across the related roles.
5. RETURN JSON: Return a valid JSON array of actions to take.
6. SUPPORTED ACTIONS:
   - { "action": "rename", "roleId": "ID", "newName": "NAME" }
   - { "action": "setColor", "roleId": "ID", "newColor": "#HEX" }
   - { "action": "delete", "roleId": "ID" }
   - { "action": "create", "name": "NAME", "color": "#HEX", "hoist": true/false }
   - { "action": "renameServer", "newName": "NAME" }
7. OUTPUT ONLY: DO NOT provide any text other than the JSON array.
8. CAUTION: Do not delete roles unless explicitly asked or if they are clearly redundant.
`;
class ModelRegistry {
  providers;
  constructor() {
    this.providers = [
      {
        name: 'Google',
        fn: this.tryGoogle.bind(this),
        models: ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro'],
      },
      {
        name: 'OpenRouter',
        fn: this.tryOpenRouter.bind(this),
        models: [
          'google/gemma-4-31b-it:free',
          'google/gemma-4-26b-a4b-it:free',
          'nvidia/nemotron-3-super-120b-a12b:free',
          'qwen/qwen3-coder:free',
          'openrouter/free',
        ],
      },
      {
        name: 'Groq',
        fn: this.tryGroq.bind(this),
        models: [
          'meta-llama/llama-4-scout-17b-16e-instruct',
          'llama-3.3-70b-versatile',
          'llama-3.1-8b-instant',
          'openai/gpt-oss-20b',
          'qwen/qwen3-32b',
          'moonshotai/kimi-k2-instruct-0905',
        ],
      },
    ];
  }
  async tryGoogle(prompt, rolesData, modelId) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const fullPrompt = SYSTEM_INSTRUCTIONS.replace(
      '{ROLES_DATA}',
      JSON.stringify(rolesData)
    ).replace('{USER_PROMPT}', prompt);
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: fullPrompt }] }],
    });
    return response.data.candidates[0].content.parts[0].text;
  }
  async tryOpenRouter(prompt, rolesData, modelId) {
    const fullPrompt = SYSTEM_INSTRUCTIONS.replace(
      '{ROLES_DATA}',
      JSON.stringify(rolesData)
    ).replace('{USER_PROMPT}', prompt);
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: modelId,
        messages: [{ role: 'user', content: fullPrompt }],
      },
      {
        headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
      }
    );
    return response.data.choices[0].message.content;
  }
  async tryGroq(prompt, rolesData, modelId) {
    const fullPrompt = SYSTEM_INSTRUCTIONS.replace(
      '{ROLES_DATA}',
      JSON.stringify(rolesData)
    ).replace('{USER_PROMPT}', prompt);
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: modelId,
        messages: [{ role: 'user', content: fullPrompt }],
      },
      {
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      }
    );
    return response.data.choices[0].message.content;
  }
  async executeRotation(prompt, rolesData) {
    for (const provider of this.providers) {
      for (const modelId of provider.models) {
        try {
          console.log(`Trying ${provider.name} with model ${modelId}...`);
          const rawResult = await provider.fn(prompt, rolesData, modelId);
          return {
            rawResult,
            providerName: provider.name,
            modelId: modelId,
          };
        } catch (err) {
          const errorMsg = err.response?.data?.error?.message || err.message;
          console.error(`[FAIL] ${provider.name} (${modelId}):`, errorMsg);
        }
      }
    }
    return null;
  }
}
class ServerAutomator {
  interaction;
  guild;
  summary;
  constructor(interaction) {
    this.interaction = interaction;
    this.guild = interaction.guild;
    this.summary = '';
  }
  async processAction(action) {
    try {
      switch (action.action) {
        case 'rename': {
          if (!action.roleId || !action.newName) break;
          const role = this.guild.roles.cache.get(action.roleId);
          if (role) {
            const oldName = role.name;
            await role.setName(action.newName);
            this.summary += `- Renamed role **${oldName}** to **${action.newName}**\n`;
          }
          break;
        }
        case 'setColor': {
          if (!action.roleId || !action.newColor) break;
          const role = this.guild.roles.cache.get(action.roleId);
          if (role) {
            await role.setColor(action.newColor);
            this.summary += `- Changed color of **${role.name}** to **${action.newColor}**\n`;
          }
          break;
        }
        case 'delete': {
          if (!action.roleId) break;
          const role = this.guild.roles.cache.get(action.roleId);
          if (role) {
            const roleName = role.name;
            await role.delete();
            this.summary += `- Deleted role **${roleName}**\n`;
          }
          break;
        }
        case 'create': {
          if (!action.name) break;
          const newRole = await this.guild.roles.create({
            name: action.name,
            color: action.color,
            hoist: action.hoist || false,
          });
          this.summary += `- Created new role **${newRole.name}**\n`;
          break;
        }
        case 'renameServer': {
          if (!action.newName) break;
          const oldName = this.guild.name;
          await this.guild.setName(action.newName);
          this.summary += `- Renamed server from **${oldName}** to **${action.newName}**\n`;
          break;
        }
      }
    } catch (err) {
      this.summary += `⚠️ Gagal eksekusi: ${action.action} - ${err.message}\n`;
    }
  }
  async run(actions, providerInfo) {
    this.summary = `### AI Thinking (${providerInfo.providerName} - ${providerInfo.modelId})\n`;
    for (const action of actions) {
      await this.processAction(action);
    }
    return this.summary;
  }
}
export async function handleAIRoles(interaction, prompt) {
  await interaction.deferReply();
  if (!interaction.guild) {
    return interaction.editReply('Perintah ini hanya dapat digunakan di dalam server.');
  }
  const roles = interaction.guild.roles.cache
    .map((r) => ({
      id: r.id,
      name: r.name,
      color: r.hexColor,
      position: r.position,
      managed: r.managed,
    }))
    .filter((r) => r.name !== '@everyone' && !r.managed);
  const registry = new ModelRegistry();
  const rotationResult = await registry.executeRotation(prompt, roles);
  if (!rotationResult) {
    return interaction.editReply('Sistem membutuhkan pendinginan sekitar 24jam');
  }
  try {
    const jsonText = rotationResult.rawResult.replace(/```json|```/gi, '').trim();
    const actions = JSON.parse(jsonText);
    if (!Array.isArray(actions) || actions.length === 0) {
      return interaction.editReply(
        `AI (${rotationResult.providerName} - ${rotationResult.modelId}) tidak menemukan perubahan yang diperlukan.`
      );
    }
    const automator = new ServerAutomator(interaction);
    const summary = await automator.run(actions, rotationResult);
    await interaction.editReply(summary);
  } catch (error) {
    console.error('Final Processing Error:', error);
    await interaction.editReply(
      `Terjadi kesalahan saat memproses hasil dari ${rotationResult.providerName}.`
    );
  }
}
