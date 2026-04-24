import { Events, Message } from 'discord.js';

export const name = Events.MessageCreate;
export const once = false;

const PREFIX = '!';

export async function execute(message: Message) {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const commandName = args.shift()?.toLowerCase();

  // Basic ping example
  if (commandName === 'ping') {
    await message.reply('🏓 Pong!');
  }
}
