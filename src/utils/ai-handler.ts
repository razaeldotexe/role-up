import axios from 'axios';
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ChatInputCommandInteraction,
  Guild,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  Message,
} from 'discord.js';
import { GuildData } from '../database/models/GuildData.js';
import { UserWarning } from '../database/models/UserWarning.js';
import { BotCache } from '../database/models/BotCache.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Membaca sistem instruksi dari file markdown
const systemPromptPath = path.join(__dirname, '../../prompts/system.md');
const getSystemInstructions = () => fs.readFileSync(systemPromptPath, 'utf8');

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
    | 'cloneChannel'
    | 'createEmbed'
    | 'editEmbed'
    | 'warnUser'
    | 'deleteMessages'
    | 'webSearch';
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
  title?: string;
  description?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: string;
  image?: string;
  thumbnail?: string;
  messageId?: string;
  userId?: string;
  count?: number;
  reason?: string;
  amount?: number;
  query?: string;
}

export interface ProviderResult {
  rawResult: string;
  providerName: string;
  modelId: string;
}

interface Provider {
  name: string;
  fn: (
    prompt: string,
    guildData: any,
    currentChannelId: string,
    modelId: string
  ) => Promise<string>;
  models: string[];
}

class ModelRegistry {
  private providers: Provider[];

  constructor() {
    this.providers = [
      {
        name: 'Google',
        fn: this.tryGoogle.bind(this),
        models: ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-2.0-pro-exp-02-05'],
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

  async tryGoogle(
    prompt: string,
    guildData: any,
    currentChannelId: string,
    modelId: string
  ): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const fullPrompt = getSystemInstructions()
      .replace('{GUILD_DATA}', JSON.stringify(guildData))
      .replace('{CURRENT_CHANNEL_ID}', currentChannelId)
      .replace('{USER_PROMPT}', prompt);
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: fullPrompt }] }],
    });
    return response.data.candidates[0].content.parts[0].text;
  }

  async tryOpenRouter(
    prompt: string,
    guildData: any,
    currentChannelId: string,
    modelId: string
  ): Promise<string> {
    const fullPrompt = getSystemInstructions()
      .replace('{GUILD_DATA}', JSON.stringify(guildData))
      .replace('{CURRENT_CHANNEL_ID}', currentChannelId)
      .replace('{USER_PROMPT}', prompt);
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

  async tryGroq(
    prompt: string,
    guildData: any,
    currentChannelId: string,
    modelId: string
  ): Promise<string> {
    const fullPrompt = getSystemInstructions()
      .replace('{GUILD_DATA}', JSON.stringify(guildData))
      .replace('{CURRENT_CHANNEL_ID}', currentChannelId)
      .replace('{USER_PROMPT}', prompt);
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

  async executeRotation(
    prompt: string,
    guildData: any,
    currentChannelId: string
  ): Promise<ProviderResult | null> {
    for (const provider of this.providers) {
      for (const modelId of provider.models) {
        try {
          console.log(`Trying ${provider.name} with model ${modelId}...`);
          const rawResult = await provider.fn(prompt, guildData, currentChannelId, modelId);
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
  private context: ChatInputCommandInteraction | Message;
  private guild: Guild;
  private summary: string;

  constructor(context: ChatInputCommandInteraction | Message) {
    this.context = context;
    this.guild = context.guild as Guild;
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
        case 'createEmbed': {
          if (!action.channelId) break;
          const channel = this.guild.channels.cache.get(action.channelId);
          if (channel && channel.isTextBased()) {
            const embed = new EmbedBuilder();
            if (action.title) embed.setTitle(action.title);
            if (action.description) embed.setDescription(action.description);
            if (action.color) embed.setColor(action.color as any);
            if (action.fields) embed.addFields(action.fields);
            if (action.footer) embed.setFooter({ text: action.footer });
            if (action.image) embed.setImage(action.image);
            if (action.thumbnail) embed.setThumbnail(action.thumbnail);

            await (channel as any).send({ embeds: [embed] });
            this.summary += `- Sent embed to channel **#${channel.name}**\n`;
          }
          break;
        }
        case 'editEmbed': {
          if (!action.messageId) break;

          let targetMessageId = action.messageId;
          let targetChannelId = action.channelId;

          if (action.messageId.includes('discord.com/channels/')) {
            const parsed = this.parseMessageLink(action.messageId);
            if (parsed) {
              targetMessageId = parsed.messageId;
              targetChannelId = parsed.channelId;
            }
          }

          if (!targetChannelId) {
            this.summary += `⚠️ Gagal edit embed: Channel ID diperlukan jika menggunakan message ID biasa.\n`;
            break;
          }

          const channel = this.guild.channels.cache.get(targetChannelId);
          if (channel && channel.isTextBased()) {
            const message = await (channel as any).messages.fetch(targetMessageId);
            if (message && message.embeds.length > 0) {
              const oldEmbed = message.embeds[0];
              const newEmbed = EmbedBuilder.from(oldEmbed);

              if (action.title !== undefined) newEmbed.setTitle(action.title);
              if (action.description !== undefined) newEmbed.setDescription(action.description);
              if (action.color !== undefined) newEmbed.setColor(action.color as any);
              if (action.fields !== undefined) newEmbed.setFields(action.fields);
              if (action.footer !== undefined) newEmbed.setFooter({ text: action.footer });
              if (action.image !== undefined) newEmbed.setImage(action.image);
              if (action.thumbnail !== undefined) newEmbed.setThumbnail(action.thumbnail);

              await message.edit({ embeds: [newEmbed] });
              this.summary += `- Berhasil mengedit embed pada message ID **${targetMessageId}** di **#${channel.name}**\n`;
            } else {
              this.summary += `⚠️ Gagal edit embed: Pesan tidak ditemukan atau tidak memiliki embed.\n`;
            }
          }
          break;
        }
        case 'warnUser': {
          if (!action.userId || action.count === undefined) break;

          const warnData = await UserWarning.findOneAndUpdate(
            { guildId: this.guild.id, userId: action.userId },
            {
              $inc: { warningCount: action.count },
              $set: { lastWarningDate: new Date(), reason: action.reason || 'No reason provided' },
            },
            { upsert: true, new: true }
          );

          this.summary += `- Memberi **${action.count}** warning kepada <@${action.userId}>. Total: **${warnData.warningCount}/10**\n`;

          if (warnData.warningCount >= 10) {
            const member = await this.guild.members.fetch(action.userId);
            if (member && member.bannable) {
              await member.ban({
                reason: `Limit warning tercapai (10/10). Terakhir: ${action.reason}`,
              });
              this.summary += `- 🚫 **Banned** <@${action.userId}> karena mencapai batas limit warning.\n`;
            } else {
              this.summary += `- ⚠️ Gagal Ban <@${action.userId}> (Role bot mungkin di bawah user ini atau bot tidak memiliki permission).\n`;
            }
          }
          break;
        }
        case 'deleteMessages': {
          if (!action.channelId || action.amount === undefined) break;
          const channel = this.guild.channels.cache.get(action.channelId);
          if (channel && channel.isTextBased()) {
            const amount = Math.min(action.amount, 100);
            const deleted = await (channel as any).bulkDelete(amount, true);
            this.summary += `- Menghapus **${deleted.size}** pesan di channel **#${channel.name}**\n`;
          }
          break;
        }
        case 'webSearch': {
          if (!action.query) break;
          try {
            const response = await axios.post(
              'https://delema.razael-fox.my.id/api/delema/v1/ai/alpha/search',
              {
                query: action.query,
                limit: 5,
                lang: 'Indonesian',
              }
            );

            if (response.data && response.data.ai_summary) {
              this.summary += `\n### 🔍 Hasil Deep Search Web (Alpha):\n${response.data.ai_summary}\n`;
            } else {
              this.summary += `\n### 🔍 Hasil Deep Search Web (Alpha):\n(Tidak ada ringkasan yang tersedia)\n`;
            }
          } catch (err) {
            this.summary += `⚠️ Gagal melakukan pencarian web alpha: ${(err as any).message}\n`;
          }
          break;
        }
      }
    } catch (err) {
      this.summary += `⚠️ Gagal eksekusi: ${action.action} - ${(err as any).message}\n`;
    }
  }

  private parseMessageLink(link: string) {
    const parts = link.split('/');
    if (parts.length >= 7) {
      return {
        channelId: parts[parts.length - 2],
        messageId: parts[parts.length - 1],
      };
    }
    return null;
  }

  async run(actions: AIAction[], providerInfo: ProviderResult, aiMessage: string): Promise<string> {
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

  const guildData = await GuildData.findOne({ guildId: interaction.guildId });

  if (!guildData) {
    return interaction.editReply(
      'Data server belum tersinkronisasi. Silakan jalankan /sync terlebih dahulu.'
    );
  }

  const registry = new ModelRegistry();
  const rotationResult = await registry.executeRotation(prompt, guildData, interaction.channelId!);

  if (!rotationResult) {
    return interaction.editReply('Sistem membutuhkan pendinginan sekitar 24jam');
  }

  try {
    const jsonText = rotationResult.rawResult.replace(/```json|```/gi, '').trim();
    const resultObj = JSON.parse(jsonText);
    const actions: AIAction[] = resultObj.actions;
    const aiMessage: string = resultObj.message || 'Melakukan otomasi server...';

    // Jika tidak ada aksi, tapi ada pesan, kirim pesannya saja (untuk chat/ngobrol)
    if (!Array.isArray(actions) || actions.length === 0) {
      if (resultObj.message) {
        return interaction.editReply(resultObj.message);
      }
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

export async function handleAIMessage(message: Message, prompt: string): Promise<any> {
  if (!message.guild) return;

  // Pastikan channel tersedia di cache untuk menghindari ChannelNotCached error
  if (!message.channel) {
    try {
      await message.guild.channels.fetch(message.channelId);
    } catch (error) {
      console.error('Failed to fetch channel for AI message:', error);
      return;
    }
  }

  const guildData = await GuildData.findOne({ guildId: message.guildId });

  if (!guildData) {
    return message.reply(
      'Data server belum tersinkronisasi. Silakan gunakan `/sync` terlebih dahulu.'
    );
  }

  const registry = new ModelRegistry();
  const rotationResult = await registry.executeRotation(prompt, guildData, message.channelId);

  if (!rotationResult) {
    return message.reply('Sistem membutuhkan pendinginan sekitar 24jam');
  }

  try {
    const jsonText = rotationResult.rawResult.replace(/```json|```/gi, '').trim();
    const resultObj = JSON.parse(jsonText);
    const actions: AIAction[] = resultObj.actions;
    const aiMessage: string = resultObj.message || 'Melakukan otomasi server...';

    // Jika tidak ada aksi, tapi ada pesan, kirim pesannya saja (untuk chat/ngobrol)
    if (!Array.isArray(actions) || actions.length === 0) {
      if (resultObj.message) {
        return message.reply(resultObj.message);
      }
      return message.reply(
        `AI (${rotationResult.providerName} - ${rotationResult.modelId}) tidak menemukan perubahan yang diperlukan.`
      );
    }

    const automator = new ServerAutomator(message);
    const summary = await automator.run(actions, rotationResult, aiMessage);

    const reply = await message.reply(summary);

    // Simpan ke cache MongoDB
    await BotCache.findOneAndUpdate(
      { userMessageId: message.id },
      {
        botMessageId: reply.id,
        guildId: message.guildId,
        channelId: message.channelId,
        createdAt: new Date(),
      },
      { upsert: true }
    );
  } catch (error) {
    console.error('Final Message Processing Error:', error);
    await message.reply(
      `Terjadi kesalahan saat memproses hasil dari ${rotationResult.providerName}.`
    );
  }
}
