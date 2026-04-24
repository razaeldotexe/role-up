import { Events, Role } from 'discord.js';
import { GuildData } from '../database/models/GuildData.js';

export const name = Events.GuildRoleDelete;
export const once = false;

export async function execute(role: Role) {
  await GuildData.findOneAndUpdate(
    { guildId: role.guild.id },
    { $pull: { roles: { id: role.id } } }
  );
  console.log(`[EVENT] Role Deleted: ${role.name} from ${role.guild.name}`);
}
