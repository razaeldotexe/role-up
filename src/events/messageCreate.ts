import { Events, Message, PermissionFlagsBits, ChannelType } from 'discord.js';
import { handleAIMessage } from '../utils/ai-handler.js';

export const name = Events.MessageCreate;
export const once = false;

const PREFIX = '!';

export async function execute(message: Message) {
  if (message.partial) {
    try {
      await message.fetch();
    } catch (error) {
      console.error('Failed to fetch partial message:', error);
      return;
    }
  }

  if (message.author.bot || !message.guild) return;

  // Cek jika pesan di channel 'role-up'
  const isRoleUpChannel =
    message.channel.type === ChannelType.GuildText && message.channel.name === 'role-up';

  if (isRoleUpChannel) {
    // Abaikan jika pesan menggunakan prefix (mungkin untuk command bot lain)
    if (message.content.startsWith(PREFIX)) return;

    // Cek permission: Hanya Admin atau Owner server yang bisa menggunakan AI
    const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator);
    const isOwner = message.guild.ownerId === message.author.id;

    if (!isAdmin && !isOwner) return;

    // Aksi bot mengetik
    await message.channel.sendTyping();

    // Proses sebagai prompt AI
    return handleAIMessage(message, message.content);
  }

  // Logika command prefix normal
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const commandName = args.shift()?.toLowerCase();

  // Basic ping example
  if (commandName === 'ping') {
    await message.reply('🏓 Pong!');
  }
}
