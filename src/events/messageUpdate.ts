import { Events, Message, PermissionFlagsBits, ChannelType } from 'discord.js';
import { handleAIMessage } from '../utils/ai-handler.js';
import { BotCache } from '../database/models/BotCache.js';

export const name = Events.MessageUpdate;
export const once = false;

const PREFIX = '!';

export async function execute(oldMessage: Message, newMessage: Message) {
  if (newMessage.partial) {
    try {
      await newMessage.fetch();
    } catch (error) {
      console.error('Failed to fetch partial new message:', error);
      return;
    }
  }

  // Pastikan pesan bukan dari bot dan ada di dalam guild
  if (newMessage.author?.bot || !newMessage.guild) return;

  // Jika konten tidak berubah, abaikan (misal hanya embed atau link preview yang update)
  if (oldMessage.content === newMessage.content) return;

  // Cek jika pesan di channel 'role-up'
  const isRoleUpChannel =
    newMessage.channel.type === ChannelType.GuildText && newMessage.channel.name === 'role-up';

  if (isRoleUpChannel) {
    // Abaikan jika pesan menggunakan prefix
    if (newMessage.content.startsWith(PREFIX)) return;

    // Cek permission: Hanya Admin atau Owner server yang bisa menggunakan AI
    const isAdmin = newMessage.member?.permissions.has(PermissionFlagsBits.Administrator);
    const isOwner = newMessage.guild.ownerId === newMessage.author.id;

    if (!isAdmin && !isOwner) return;

    // 1. Hapus pesan lama (AI) menggunakan cache MongoDB
    try {
      const cachedMapping = await BotCache.findOne({ userMessageId: newMessage.id });

      if (cachedMapping) {
        const channel = newMessage.guild.channels.cache.get(cachedMapping.channelId);
        if (channel && channel.isTextBased()) {
          const oldBotMsg = await (channel as any).messages.fetch(cachedMapping.botMessageId);
          if (oldBotMsg) {
            await oldBotMsg.delete();
          }
        }
        // Hapus entry cache lama
        await BotCache.deleteOne({ _id: cachedMapping._id });
      }
    } catch (error) {
      // Abaikan jika pesan sudah tidak ada
      console.error('Gagal menghapus pesan lama AI dari cache:', error);
    }

    // 2. Aksi bot mengetik
    await newMessage.channel.sendTyping();

    // 3. Pesan baru (dipicu di dalam handleAIMessage)
    return handleAIMessage(newMessage, newMessage.content || '');
  }
}
