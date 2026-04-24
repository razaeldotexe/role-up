import { Events, Interaction } from 'discord.js';

export const name = Events.InteractionCreate;
export const once = false;

export async function execute(interaction: Interaction) {
  if (!interaction.isChatInputCommand()) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = interaction.client as any;
  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}`);
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: 'There was an error while executing this command!',
        flags: [64], // Ephemeral
      }).catch(err => console.error('Error sending followUp:', err));
    } else {
      await interaction.reply({
        content: 'There was an error while executing this command!',
        flags: [64], // Ephemeral
      }).catch(err => console.error('Error sending reply:', err));
    }
  }
}
