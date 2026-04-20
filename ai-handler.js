import axios from 'axios';
import 'dotenv/config';

const SYSTEM_INSTRUCTIONS = `
You are a Discord Role Management Expert AI. Your goal is to help reorganize and manage roles based on user instructions with professional server standards.
Current Roles in JSON:
{ROLES_DATA}

User Instruction: "{USER_PROMPT}"

IMPORTANT GUIDELINES:
1. GROUP IDENTIFICATION: When a user refers to a category like "staff", "members", or "levels", identify ALL roles that belong to that category based on their NAME (e.g., Admin, Mod, Staff, Helper, Team) or their PERMISSIONS (roles with administrative or moderation capabilities). 
2. APPLY TO GROUP: If the user asks to "change color of staff roles", apply the change to every role you identified as part of the staff group, not just a role named "staff".
3. INTERPRET INTENT: If a user asks for "staff roles", do not just create one role named "staff". Instead, create a professional hierarchy (e.g., Admin, Moderator, Staff, Helper) with appropriate colors.
4. THEME CONSISTENCY: When asked for a "fantasy theme" or similar, choose a coordinated color palette that fits the theme (e.g., Deep Purple, Gold, Emerald, Crimson) and apply it consistently across the related roles.
5. RETURN JSON: Return a valid JSON array of actions to take.
6. SUPPORTED ACTIONS:
   - { "action": "rename", "roleId": "ID", "newName": "NAME" }
   - { "action": "setColor", "roleId": "ID", "newColor": "#HEX" }
   - { "action": "delete", "roleId": "ID" }
   - { "action": "create", "name": "NAME", "color": "#HEX", "hoist": true/false }
   - { "action": "renameServer", "newName": "NAME" }
7. OUTPUT ONLY: DO NOT provide any text other than the JSON array.
8. CAUTION: Do not delete roles unless explicitly asked or if they are clearly redundant.
`;

async function tryGoogle(prompt, rolesData, modelId) {
  // Google API base from your list: https://generativelanguage.googleapis.com/v1beta
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const fullPrompt = SYSTEM_INSTRUCTIONS.replace('{ROLES_DATA}', JSON.stringify(rolesData)).replace(
    '{USER_PROMPT}',
    prompt
  );

  const response = await axios.post(url, {
    contents: [{ parts: [{ text: fullPrompt }] }],
  });
  return response.data.candidates[0].content.parts[0].text;
}

async function tryOpenRouter(prompt, rolesData, modelId) {
  const fullPrompt = SYSTEM_INSTRUCTIONS.replace('{ROLES_DATA}', JSON.stringify(rolesData)).replace(
    '{USER_PROMPT}',
    prompt
  );
  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: modelId,
      messages: [{ role: 'user', content: fullPrompt }],
    },
    {
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
    }
  );
  return response.data.choices[0].message.content;
}

async function tryGroq(prompt, rolesData, modelId) {
  const fullPrompt = SYSTEM_INSTRUCTIONS.replace('{ROLES_DATA}', JSON.stringify(rolesData)).replace(
    '{USER_PROMPT}',
    prompt
  );
  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: modelId,
      messages: [{ role: 'user', content: fullPrompt }],
    },
    {
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    }
  );
  return response.data.choices[0].message.content;
}

export async function handleAIRoles(interaction, prompt) {
  await interaction.deferReply();

  const roles = interaction.guild.roles.cache
    .map((r) => ({
      id: r.id,
      name: r.name,
      color: r.hexColor,
      position: r.position,
      managed: r.managed,
    }))
    .filter((r) => r.name !== '@everyone' && !r.managed);

  // Exact configuration from your 2026 list
  const providers = [
    {
      name: 'Google',
      fn: tryGoogle,
      models: ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro'],
    },
    {
      name: 'OpenRouter',
      fn: tryOpenRouter,
      models: [
        'google/gemma-4-31b-it:free',
        'google/gemma-4-26b-a4b-it:free',
        'nvidia/nemotron-3-super-120b-a12b:free',
        'qwen/qwen3-coder:free',
        'openrouter/free',
      ],
    },
    {
      name: 'Groq',
      fn: tryGroq,
      models: [
        'meta-llama/llama-4-scout-17b-16e-instruct',
        'llama-3.3-70b-versatile',
        'llama-3.1-8b-instant',
        'openai/gpt-oss-20b',
        'qwen/qwen3-32b',
        'moonshotai/kimi-k2-instruct-0905',
      ],
    },
  ];

  let rawResult = null;
  let successfulProvider = null;
  let successfulModel = null;

  outerLoop: for (const provider of providers) {
    for (const modelId of provider.models) {
      try {
        console.log(`Trying ${provider.name} with model ${modelId}...`);
        rawResult = await provider.fn(prompt, roles, modelId);
        successfulProvider = provider.name;
        successfulModel = modelId;
        break outerLoop;
      } catch (err) {
        const errorMsg = err.response?.data?.error?.message || err.message;
        console.error(`[FAIL] ${provider.name} (${modelId}):`, errorMsg);
      }
    }
  }

  if (!rawResult) {
    return interaction.editReply('Sistem membutuhkan pendinginan sekitar 24jam');
  }

  try {
    const jsonText = rawResult.replace(/```json|```/gi, '').trim();
    const actions = JSON.parse(jsonText);

    if (!Array.isArray(actions) || actions.length === 0) {
      return interaction.editReply(
        `AI (${successfulProvider} - ${successfulModel}) tidak menemukan perubahan yang diperlukan.`
      );
    }

    let summary = `### AI Thinking (${successfulProvider} - ${successfulModel})\n`;
    for (const action of actions) {
      try {
        if (action.action === 'rename') {
          const role = interaction.guild.roles.cache.get(action.roleId);
          if (role) {
            const oldName = role.name;
            await role.setName(action.newName);
            summary += `- Renamed role **${oldName}** to **${action.newName}**\n`;
          }
        } else if (action.action === 'setColor') {
          const role = interaction.guild.roles.cache.get(action.roleId);
          if (role) {
            await role.setColor(action.newColor);
            summary += `- Changed color of **${role.name}** to **${action.newColor}**\n`;
          }
        } else if (action.action === 'delete') {
          const role = interaction.guild.roles.cache.get(action.roleId);
          if (role) {
            const roleName = role.name;
            await role.delete();
            summary += `- Deleted role **${roleName}**\n`;
          }
        } else if (action.action === 'create') {
          const newRole = await interaction.guild.roles.create({
            name: action.name,
            color: action.color,
            hoist: action.hoist || false,
          });
          summary += `- Created new role **${newRole.name}**\n`;
        } else if (action.action === 'renameServer') {
          const oldName = interaction.guild.name;
          await interaction.guild.setName(action.newName);
          summary += `- Renamed server from **${oldName}** to **${action.newName}**\n`;
        }
      } catch (err) {
        summary += `⚠️ Gagal eksekusi: ${action.action} - ${err.message}\n`;
      }
    }

    await interaction.editReply(summary);
  } catch (error) {
    console.error('Final Processing Error:', error);
    await interaction.editReply(
      `Terjadi kesalahan saat memproses hasil dari ${successfulProvider}.`
    );
  }
}
