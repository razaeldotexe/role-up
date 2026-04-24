import { Events, Client } from 'discord.js';
import { connectDatabase } from '../database/mongoose.js';
import { fullSyncGuild } from '../utils/sync-handler.js';

export const name = Events.ClientReady;
export const once = true;

export async function execute(client: Client<true>) {
  console.log(`Ready! Logged in as ${client.user.tag}`);

  // Hubungkan ke database
  await connectDatabase();

  // Sinkronisasi data server saat startup (di background agar tidak menghambat bot merespon)
  for (const guild of client.guilds.cache.values()) {
    fullSyncGuild(guild).catch(err => console.error(`Failed to sync guild ${guild.name} on startup:`, err));
  }
}
