import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { handleAIRoles } from '../utils/ai-handler.js';

export const data = new SlashCommandBuilder()
  .setName('automate')
  .setDescription('Automate server management using AI')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption((option) =>
    option
      .setName('prompt')
      .setDescription('Instruction for the AI (e.g., "reorganize roles" or "rename server")')
      .setRequired(true)
  );

export async function execute(interaction) {
  const prompt = interaction.options.getString('prompt');
  await handleAIRoles(interaction, prompt);
}
