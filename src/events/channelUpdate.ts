import { Events, GuildChannel } from 'discord.js';
import { GuildData } from '../database/models/GuildData.js';

export const name = Events.ChannelUpdate;
export const once = false;

export async function execute(oldChannel: GuildChannel, newChannel: GuildChannel) {
  if (!newChannel.guild) return;

  const channelData = {
    id: newChannel.id,
    name: newChannel.name,
    type: newChannel.type,
    parentId: newChannel.parentId,
    topic: (newChannel as any).topic || null,
    nsfw: (newChannel as any).nsfw || false,
    position: newChannel.position,
    rateLimitPerUser: (newChannel as any).rateLimitPerUser || 0,
    bitrate: (newChannel as any).bitrate || null,
    userLimit: (newChannel as any).userLimit || null,
    permissionOverwrites: newChannel.permissionOverwrites.cache.map((p) => ({
      id: p.id,
      type: p.type,
      allow: p.allow.bitfield.toString(),
      deny: p.deny.bitfield.toString(),
    })),
  };

  await GuildData.findOneAndUpdate(
    { guildId: newChannel.guild.id, 'channels.id': newChannel.id },
    { $set: { 'channels.$': channelData } }
  );
  console.log(`[EVENT] Channel Updated: ${newChannel.name} in ${newChannel.guild.name}`);
}
