import { Events, Guild } from 'discord.js';
import { GuildData } from '../database/models/GuildData.js';

export const name = Events.GuildUpdate;
export const once = false;

export async function execute(oldGuild: Guild, newGuild: Guild) {
  await GuildData.findOneAndUpdate(
    { guildId: newGuild.id },
    {
      name: newGuild.name,
      icon: newGuild.icon,
      description: newGuild.description,
      verificationLevel: newGuild.verificationLevel,
      explicitContentFilter: newGuild.explicitContentFilter,
      ownerId: newGuild.ownerId,
    }
  );
  console.log(`[EVENT] Guild Updated: ${newGuild.name}`);
}
