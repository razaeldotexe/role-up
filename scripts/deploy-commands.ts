import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REST, Routes } from 'discord.js';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commands = [];
const commandsPath = path.join(__dirname, '../src/commands');
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith('.js') || (file.endsWith('.ts') && !file.endsWith('.d.ts')));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  // Gunakan dynamic import untuk memuat command
  const command = await import(`file://${filePath}`);
  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

(async () => {
  try {
    const clientId = process.env.CLIENT_ID!;

    console.log(`Menyiapkan pembaruan ${commands.length} command aplikasi (Global)...`);

    // Routes.applicationCommands(clientId) meregistrasi secara GLOBAL
    // Jika ingin guild-spesifik, gunakan Routes.applicationGuildCommands(clientId, guildId)
    const data = (await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    })) as any[];

    console.log(`Berhasil memperbarui ${data.length} command aplikasi secara GLOBAL.`);
    console.log(
      'Catatan: Command global mungkin membutuhkan waktu hingga 1 jam untuk muncul di semua server.'
    );
  } catch (error) {
    console.error('Gagal memperbarui command:', error);
  }
})();
