import { Client, Events, GatewayIntentBits, Partials, PermissionFlagsBits } from 'discord.js';
import 'dotenv/config';
import { handleAIRoles } from './ai-handler.js';

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// Prefix for command-based commands
const PREFIX = '!';

// When the client is ready
client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// Prefix command listener
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'ping') {
    await message.reply('🏓 Pong!');
  }
});

// Slash Command listener
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'ping') {
    await interaction.reply('🏓 Pong!');
  } else if (commandName === 'automate') {
    // Check for Administrator permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: 'You need Administrator permissions to use this command.',
        ephemeral: true,
      });
    }

    const prompt = interaction.options.getString('prompt');
    await handleAIRoles(interaction, prompt);
  }
});

// Log in
client.login(process.env.DISCORD_TOKEN);
