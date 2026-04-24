import { Events, GuildMember } from 'discord.js';
import { GuildData } from '../database/models/GuildData.js';

export const name = Events.GuildMemberAdd;
export const once = false;

export async function execute(member: GuildMember) {
  const memberData = {
    id: member.id,
    username: member.user.username,
    displayName: member.displayName,
    roles: member.roles.cache.map((r) => r.id),
    joinedAt: member.joinedAt,
    premiumSince: member.premiumSince,
    communicationDisabledUntil: member.communicationDisabledUntil,
  };

  await GuildData.findOneAndUpdate(
    { guildId: member.guild.id },
    { $push: { members: memberData } }
  );
  console.log(`[EVENT] Member Joined: ${member.user.tag} to ${member.guild.name}`);
}
