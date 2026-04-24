import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction } from 'discord.js';
import { fullSyncGuild } from '../utils/sync-handler.js';

export const data = new SlashCommandBuilder()
  .setName('sync')
  .setDescription('Sinkronisasi data server ke database secara manual')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: [64] });

  if (!interaction.guild) {
    return interaction.editReply('Perintah ini hanya dapat digunakan di dalam server.');
  }

  try {
    await fullSyncGuild(interaction.guild);
    await interaction.editReply('✅ Sinkronisasi total berhasil dilakukan.');
  } catch (error) {
    console.error(error);
    await interaction.editReply('❌ Terjadi kesalahan saat sinkronisasi.');
  }
}
