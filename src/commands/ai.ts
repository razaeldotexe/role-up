import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction } from 'discord.js';
import { handleAIRoles } from '../utils/ai-handler.js';

export const data = new SlashCommandBuilder()
  .setName('ai')
  .setDescription('Automate server management using AI')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption((option) =>
    option
      .setName('prompt')
      .setDescription('Instruction for the AI (e.g., "reorganize roles" or "rename server")')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const prompt = interaction.options.getString('prompt', true);
  await handleAIRoles(interaction, prompt);
}
