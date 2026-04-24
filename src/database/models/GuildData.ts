import { Schema, model } from 'mongoose';

const GuildDataSchema = new Schema({
  guildId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  icon: { type: String },
  ownerId: { type: String },
  description: { type: String },
  verificationLevel: { type: Number },
  explicitContentFilter: { type: Number },

  channels: [
    {
      id: String,
      name: String,
      type: { type: Number },
      parentId: String,
      topic: String,
      nsfw: Boolean,
      position: Number,
      rateLimitPerUser: Number,
      bitrate: Number,
      userLimit: Number,
      permissionOverwrites: [Object],
    },
  ],

  members: [
    {
      id: String,
      username: String,
      displayName: String,
      roles: [String],
      joinedAt: Date,
      premiumSince: Date,
      communicationDisabledUntil: Date,
    },
  ],

  roles: [
    {
      id: String,
      name: String,
      color: String,
      position: Number,
      permissions: String,
      hoist: Boolean,
      managed: Boolean,
    },
  ],

  emojis: [
    {
      id: String,
      name: String,
      animated: Boolean,
    },
  ],

  stickers: [
    {
      id: String,
      name: String,
      format: Number,
    },
  ],

  bans: [
    {
      userId: String,
      reason: String,
    },
  ],

  invites: [
    {
      code: String,
      uses: Number,
      maxUses: Number,
      expiresAt: Date,
      channelId: String,
      inviterId: String,
    },
  ],

  webhooks: [
    {
      id: String,
      name: String,
      channelId: String,
      token: String,
    },
  ],

  lastSynced: { type: Date, default: Date.now },
});

export const GuildData = model('GuildData', GuildDataSchema);
