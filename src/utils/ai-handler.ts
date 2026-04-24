import axios from 'axios';
import 'dotenv/config';
import { ChatInputCommandInteraction, Guild, ChannelType, PermissionFlagsBits } from 'discord.js';
import { GuildData } from '../database/models/GuildData.js';

const SYSTEM_INSTRUCTIONS: string = `
You are a Discord Server Management Expert AI. Your goal is to help reorganize and manage roles and channels based on user instructions with professional server standards.
Current Server Data (from Database):
{GUILD_DATA}

User Instruction: "{USER_PROMPT}"

IMPORTANT GUIDELINES:
1. ROLE & CHANNEL IDENTIFICATION: Identify roles and channels by name or function.
2. SUPPORTED ACTIONS:
   - { "action": "renameRole", "roleId": "ID", "newName": "NAME" }
   - { "action": "setRoleColor", "roleId": "ID", "newColor": "#HEX" }
   - { "action": "deleteRole", "roleId": "ID" }
   - { "action": "createRole", "name": "NAME", "color": "#HEX", "hoist": true/false }
   - { "action": "renameServer", "newName": "NAME" }
   - { "action": "createChannel", "name": "NAME", "type": "text|voice|category|announcement", "parentId": "ID (optional)", "topic": "TOPIC (optional)", "position": number (optional) }
   - { "action": "editChannel", "channelId": "ID", "newName": "NAME (optional)", "parentId": "ID (optional)", "topic": "TOPIC (optional)", "slowmode": seconds (optional)", "position": number (optional) }
   - { "action": "deleteChannel", "channelId": "ID" }
   - { "action": "setChannelPermissions", "channelId": "ID", "roleId": "ID", "allow": ["ViewChannel", "SendMessages", etc], "deny": [...] }
   - { "action": "cloneChannel", "channelId": "ID", "newName": "NAME (optional)" }
3. RETURN JSON: Return a valid JSON object with the following structure:
   {
     "message": "Your brief explanation of what you are doing (in Indonesian)",
     "actions": [ ... actions here ... ]
   }
4. OUTPUT ONLY: DO NOT provide any text other than the JSON object.
5. CONTEXT: Use the provided GUILD_DATA as the single source of truth.
6. PERMISSION FLAGS: Use PascalCase (e.g., ViewChannel, SendMessages, ReadMessageHistory, Connect, Speak, ManageChannels).
`;

export interface AIAction {
  action:
    | 'renameRole'
    | 'setRoleColor'
    | 'deleteRole'
    | 'createRole'
    | 'renameServer'
    | 'createChannel'
    | 'editChannel'
    | 'deleteChannel'
    | 'setChannelPermissions'
    | 'cloneChannel';
  roleId?: string;
  newName?: string;
  newColor?: string;
  name?: string;
  color?: string;
  hoist?: boolean;
  channelId?: string;
  type?: 'text' | 'voice' | 'category' | 'announcement';
  parentId?: string;
  topic?: string;
  slowmode?: number;
  position?: number;
  allow?: string[];
  deny?: string[];
}

export interface ProviderResult {
  rawResult: string;
  providerName: string;
  modelId: string;
}

interface Provider {
  name: string;
  fn: (prompt: string, guildData: any, modelId: string) => Promise<string>;
  models: string[];
}

class ModelRegistry {
  private providers: Provider[];

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

  async tryGoogle(prompt: string, guildData: any, modelId: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const fullPrompt = SYSTEM_INSTRUCTIONS.replace(
      '{GUILD_DATA}',
      JSON.stringify(guildData)
    ).replace('{USER_PROMPT}', prompt);
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: fullPrompt }] }],
    });
    return response.data.candidates[0].content.parts[0].text;
  }

  async tryOpenRouter(prompt: string, guildData: any, modelId: string): Promise<string> {
    const fullPrompt = SYSTEM_INSTRUCTIONS.replace(
      '{GUILD_DATA}',
      JSON.stringify(guildData)
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

  async tryGroq(prompt: string, guildData: any, modelId: string): Promise<string> {
    const fullPrompt = SYSTEM_INSTRUCTIONS.replace(
      '{GUILD_DATA}',
      JSON.stringify(guildData)
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

  async executeRotation(prompt: string, guildData: any): Promise<ProviderResult | null> {
    for (const provider of this.providers) {
      for (const modelId of provider.models) {
        try {
          console.log(`Trying ${provider.name} with model ${modelId}...`);
          const rawResult = await provider.fn(prompt, guildData, modelId);
          return {
            rawResult,
            providerName: provider.name,
            modelId: modelId,
          };
        } catch (err) {
          const errorMsg = (err as any).response?.data?.error?.message || (err as any).message;
          console.error(`[FAIL] ${provider.name} (${modelId}):`, errorMsg);
        }
      }
    }
    return null;
  }
}

class ServerAutomator {
  private interaction: ChatInputCommandInteraction;
  private guild: Guild;
  private summary: string;

  constructor(interaction: ChatInputCommandInteraction) {
    this.interaction = interaction;
    this.guild = interaction.guild as Guild;
    this.summary = '';
  }

  async processAction(action: AIAction): Promise<void> {
    try {
      switch (action.action) {
        case 'renameRole': {
          if (!action.roleId || !action.newName) break;
          const role = this.guild.roles.cache.get(action.roleId);
          if (role) {
            const oldName = role.name;
            await role.setName(action.newName);
            this.summary += `- Renamed role **${oldName}** to **${action.newName}**\n`;
          }
          break;
        }
        case 'setRoleColor': {
          if (!action.roleId || !action.newColor) break;
          const role = this.guild.roles.cache.get(action.roleId);
          if (role) {
            await role.setColor(action.newColor as any);
            this.summary += `- Changed color of **${role.name}** to **${action.newColor}**\n`;
          }
          break;
        }
        case 'deleteRole': {
          if (!action.roleId) break;
          const role = this.guild.roles.cache.get(action.roleId);
          if (role) {
            const roleName = role.name;
            await role.delete();
            this.summary += `- Deleted role **${roleName}**\n`;
          }
          break;
        }
        case 'createRole': {
          if (!action.name) break;
          const newRole = await this.guild.roles.create({
            name: action.name,
            color: action.color as any,
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
        case 'createChannel': {
          if (!action.name || !action.type) break;
          const typeMap = {
            text: ChannelType.GuildText,
            voice: ChannelType.GuildVoice,
            category: ChannelType.GuildCategory,
            announcement: ChannelType.GuildAnnouncement,
          };
          const newChannel = await this.guild.channels.create({
            name: action.name,
            type: typeMap[action.type] || ChannelType.GuildText,
            parent: action.parentId,
            topic: action.topic,
            position: action.position,
          });
          this.summary += `- Created channel **#${newChannel.name}**\n`;
          break;
        }
        case 'editChannel': {
          if (!action.channelId) break;
          const channel = this.guild.channels.cache.get(action.channelId);
          if (channel) {
            const options: any = {};
            if (action.newName) options.name = action.newName;
            if (action.parentId !== undefined) options.parent = action.parentId;
            if (action.topic !== undefined) options.topic = action.topic;
            if (action.slowmode !== undefined) options.rateLimitPerUser = action.slowmode;
            if (action.position !== undefined) options.position = action.position;

            await (channel as any).edit(options);
            this.summary += `- Updated settings for channel **#${channel.name}**\n`;
          }
          break;
        }
        case 'deleteChannel': {
          if (!action.channelId) break;
          const channel = this.guild.channels.cache.get(action.channelId);
          if (channel) {
            const name = channel.name;
            await channel.delete();
            this.summary += `- Deleted channel **#${name}**\n`;
          }
          break;
        }
        case 'setChannelPermissions': {
          if (!action.channelId || !action.roleId) break;
          const channel = this.guild.channels.cache.get(action.channelId);
          if (channel) {
            const overwrites: any = {};
            action.allow?.forEach((perm) => {
              if ((PermissionFlagsBits as any)[perm] !== undefined) {
                overwrites[perm] = true;
              }
            });
            action.deny?.forEach((perm) => {
              if ((PermissionFlagsBits as any)[perm] !== undefined) {
                overwrites[perm] = false;
              }
            });
            await (channel as any).permissionOverwrites.edit(action.roleId, overwrites);
            this.summary += `- Updated permissions for channel **#${channel.name}**\n`;
          }
          break;
        }
        case 'cloneChannel': {
          if (!action.channelId) break;
          const channel = this.guild.channels.cache.get(action.channelId);
          if (channel && channel.isTextBased()) {
            const cloned = await (channel as any).clone({
              name: action.newName || `${channel.name}-copy`,
            });
            this.summary += `- Cloned channel **#${channel.name}** to **#${cloned.name}**\n`;
          }
          break;
        }
      }
    } catch (err) {
      this.summary += `⚠️ Gagal eksekusi: ${action.action} - ${(err as any).message}\n`;
    }
  }

  async run(
    actions: AIAction[],
    providerInfo: ProviderResult,
    aiMessage: string
  ): Promise<string> {
    this.summary = `${aiMessage}\n\n### Tindakan yang diambil:\n`;
    for (const action of actions) {
      await this.processAction(action);
    }
    this.summary += `\n*AI Provider: ${providerInfo.providerName} (${providerInfo.modelId})*`;
    return this.summary;
  }
}

export async function handleAIRoles(
  interaction: ChatInputCommandInteraction,
  prompt: string
): Promise<any> {
  await interaction.deferReply();

  if (!interaction.guild) {
    return interaction.editReply('Perintah ini hanya dapat digunakan di dalam server.');
  }

  // Ambil data terbaru dari MongoDB
  const guildData = await GuildData.findOne({ guildId: interaction.guildId });

  if (!guildData) {
    return interaction.editReply(
      'Data server belum tersinkronisasi. Silakan jalankan /sync terlebih dahulu.'
    );
  }

  const registry = new ModelRegistry();
  const rotationResult = await registry.executeRotation(prompt, guildData);

  if (!rotationResult) {
    return interaction.editReply('Sistem membutuhkan pendinginan sekitar 24jam');
  }

  try {
    const jsonText = rotationResult.rawResult.replace(/```json|```/gi, '').trim();
    const resultObj = JSON.parse(jsonText);
    const actions: AIAction[] = resultObj.actions;
    const aiMessage: string = resultObj.message || 'Melakukan otomasi server...';

    if (!Array.isArray(actions) || actions.length === 0) {
      return interaction.editReply(
        `AI (${rotationResult.providerName} - ${rotationResult.modelId}) tidak menemukan perubahan yang diperlukan.`
      );
    }

    const automator = new ServerAutomator(interaction);
    const summary = await automator.run(actions, rotationResult, aiMessage);

    await interaction.editReply(summary);
  } catch (error) {
    console.error('Final Processing Error:', error);
    await interaction.editReply(
      `Terjadi kesalahan saat memproses hasil dari ${rotationResult.providerName}.`
    );
  }
}
