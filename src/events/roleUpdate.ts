import { Events, Role } from 'discord.js';
import { GuildData } from '../database/models/GuildData.js';

export const name = Events.GuildRoleUpdate;
export const once = false;

export async function execute(oldRole: Role, newRole: Role) {
  const roleData = {
    id: newRole.id,
    name: newRole.name,
    color: newRole.hexColor,
    position: newRole.position,
    permissions: newRole.permissions.bitfield.toString(),
    hoist: newRole.hoist,
    managed: newRole.managed,
  };

  await GuildData.findOneAndUpdate(
    { guildId: newRole.guild.id, 'roles.id': newRole.id },
    { $set: { 'roles.$': roleData } }
  );
  console.log(`[EVENT] Role Updated: ${newRole.name} in ${newRole.guild.name}`);
}
