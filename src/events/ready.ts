import { Events, Client, ChannelType, Guild, PermissionFlagsBits, OverwriteType } from 'discord.js';
import { connectDatabase } from '../database/mongoose.js';
import { fullSyncGuild } from '../utils/sync-handler.js';

export const name = Events.ClientReady;
export const once = true;

async function ensureRoleUpChannel(guild: Guild) {
  try {
    const roleUpChannel = guild.channels.cache.find(
      (c) => c.name === 'role-up' && c.type === ChannelType.GuildText
    );

    if (!roleUpChannel) {
      console.log(`Creating 'role-up' channel for guild: ${guild.name}`);
      await guild.channels.create({
        name: 'role-up',
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            type: OverwriteType.Role,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: guild.ownerId,
            type: OverwriteType.Member,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
          },
        ],
      });
    }
  } catch (error) {
    console.error(`Error ensuring 'role-up' channel for ${guild.name}:`, error);
  }
}

export async function execute(client: Client<true>) {
  console.log(`Ready! Logged in as ${client.user.tag}`);

  // Hubungkan ke database
  await connectDatabase();

  // Sinkronisasi data server saat startup
  for (const guild of client.guilds.cache.values()) {
    // Pastikan channel role-up ada
    await ensureRoleUpChannel(guild);

    fullSyncGuild(guild).catch((err) =>
      console.error(`Failed to sync guild ${guild.name} on startup:`, err)
    );
  }
}
