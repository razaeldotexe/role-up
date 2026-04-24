import { Events, Role } from 'discord.js';
import { GuildData } from '../database/models/GuildData.js';

export const name = Events.GuildRoleCreate;
export const once = false;

export async function execute(role: Role) {
  const roleData = {
    id: role.id,
    name: role.name,
    color: role.hexColor,
    position: role.position,
    permissions: role.permissions.bitfield.toString(),
    hoist: role.hoist,
    managed: role.managed,
  };

  await GuildData.findOneAndUpdate({ guildId: role.guild.id }, { $push: { roles: roleData } });
  console.log(`[EVENT] Role Created: ${role.name} in ${role.guild.name}`);
}
