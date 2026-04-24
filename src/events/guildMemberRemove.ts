import { Events, GuildMember } from 'discord.js';
import { GuildData } from '../database/models/GuildData.js';

export const name = Events.GuildMemberRemove;
export const once = false;

export async function execute(member: GuildMember) {
  await GuildData.findOneAndUpdate(
    { guildId: member.guild.id },
    { $pull: { members: { id: member.id } } }
  );
  console.log(`[EVENT] Member Left: ${member.user.tag} from ${member.guild.name}`);
}
