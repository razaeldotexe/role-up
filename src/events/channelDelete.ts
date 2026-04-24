import { Events, GuildChannel } from 'discord.js';
import { GuildData } from '../database/models/GuildData.js';

export const name = Events.ChannelDelete;
export const once = false;

export async function execute(channel: GuildChannel) {
  if (!channel.guild) return;

  await GuildData.findOneAndUpdate(
    { guildId: channel.guild.id },
    { $pull: { channels: { id: channel.id } } }
  );
  console.log(`[EVENT] Channel Deleted: ${channel.name} from ${channel.guild.name}`);
}
