import { Guild } from 'discord.js';
import { GuildData } from '../database/models/GuildData.js';

export async function fullSyncGuild(guild: Guild) {
  try {
    console.log(`[SYNC] Memulai sinkronisasi total untuk guild: ${guild.name} (${guild.id})`);

    // Fetch all elements comprehensively
    const members = await guild.members.fetch();
    const channels = await guild.channels.fetch();
    const roles = await guild.roles.fetch();
    const emojis = await guild.emojis.fetch();
    const stickers = await guild.stickers.fetch();

    let invites = [];
    try {
      const inviteCollection = await guild.invites.fetch();
      invites = inviteCollection.map((inv) => ({
        code: inv.code,
        uses: inv.uses,
        maxUses: inv.maxUses,
        expiresAt: inv.expiresAt,
        channelId: inv.channelId,
        inviterId: inv.inviterId,
      }));
    } catch (e) {
      console.warn(`[SYNC] Gagal fetch invites untuk ${guild.name}: Tidak ada izin.`);
    }

    let bans = [];
    try {
      const banCollection = await guild.bans.fetch();
      bans = banCollection.map((b) => ({
        userId: b.user.id,
        reason: b.reason,
      }));
    } catch (e) {
      console.warn(`[SYNC] Gagal fetch bans untuk ${guild.name}: Tidak ada izin.`);
    }

    const webhooks = [];
    // Only fetch webhooks for text-based channels to avoid overhead
    for (const channel of channels.values()) {
      if (channel && (channel.type === 0 || channel.type === 5 || channel.type === 15)) {
        // GuildText, GuildAnnouncement, GuildForum
        try {
          const channelWebhooks = await (channel as any).fetchWebhooks();
          channelWebhooks.forEach((wh: any) => {
            webhooks.push({
              id: wh.id,
              name: wh.name,
              channelId: wh.channelId,
              token: wh.token,
            });
          });
        } catch (e) {}
      }
    }

    const guildData = {
      guildId: guild.id,
      name: guild.name,
      icon: guild.icon,
      ownerId: guild.ownerId,
      description: guild.description,
      verificationLevel: guild.verificationLevel,
      explicitContentFilter: guild.explicitContentFilter,

      channels: channels.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        parentId: c.parentId,
        topic: (c as any).topic || null,
        nsfw: (c as any).nsfw || false,
        position: c.position,
        rateLimitPerUser: (c as any).rateLimitPerUser || 0,
        bitrate: (c as any).bitrate || null,
        userLimit: (c as any).userLimit || null,
        permissionOverwrites: c.permissionOverwrites.cache.map((p) => ({
          id: p.id,
          type: p.type,
          allow: p.allow.bitfield.toString(),
          deny: p.deny.bitfield.toString(),
        })),
      })),

      members: members.map((m) => ({
        id: m.id,
        username: m.user.username,
        displayName: m.displayName,
        roles: m.roles.cache.map((r) => r.id),
        joinedAt: m.joinedAt,
        premiumSince: m.premiumSince,
        communicationDisabledUntil: m.communicationDisabledUntil,
      })),

      roles: roles.map((r) => ({
        id: r.id,
        name: r.name,
        color: r.hexColor,
        position: r.position,
        permissions: r.permissions.bitfield.toString(),
        hoist: r.hoist,
        managed: r.managed,
      })),

      emojis: emojis.map((e) => ({
        id: e.id,
        name: e.name,
        animated: e.animated,
      })),

      stickers: stickers.map((s) => ({
        id: s.id,
        name: s.name,
        format: s.format,
      })),

      bans,
      invites,
      webhooks,
      lastSynced: new Date(),
    };

    await GuildData.findOneAndUpdate({ guildId: guild.id }, guildData, { upsert: true, new: true });

    console.log(`[SYNC] Berhasil sinkronisasi total untuk ${guild.name}`);
  } catch (error) {
    console.error(`[SYNC ERROR] Gagal sinkronisasi guild ${guild.name}:`, error);
  }
}
