import { Events, GuildChannel } from 'discord.js';
import { GuildData } from '../database/models/GuildData.js';

export const name = Events.ChannelCreate;
export const once = false;

export async function execute(channel: GuildChannel) {
  if (!channel.guild) return;

  const channelData = {
    id: channel.id,
    name: channel.name,
    type: channel.type,
    parentId: channel.parentId,
    topic: (channel as any).topic || null,
    nsfw: (channel as any).nsfw || false,
    position: channel.position,
    rateLimitPerUser: (channel as any).rateLimitPerUser || 0,
    bitrate: (channel as any).bitrate || null,
    userLimit: (channel as any).userLimit || null,
    permissionOverwrites: channel.permissionOverwrites.cache.map((p) => ({
      id: p.id,
      type: p.type,
      allow: p.allow.bitfield.toString(),
      deny: p.deny.bitfield.toString(),
    })),
  };

  await GuildData.findOneAndUpdate(
    { guildId: channel.guild.id },
    { $push: { channels: channelData } }
  );
  console.log(`[EVENT] Channel Created: ${channel.name} in ${channel.guild.name}`);
}
