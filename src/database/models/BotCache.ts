import { Schema, model } from 'mongoose';

const BotCacheSchema = new Schema({
  // ID pesan dari user
  userMessageId: { type: String, required: true, unique: true },
  // ID pesan balasan dari bot
  botMessageId: { type: String, required: true },
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  // Cache akan otomatis terhapus setelah 24 jam untuk menjaga kebersihan database
  createdAt: { type: Date, default: Date.now, expires: '24h' },
});

export const BotCache = model('BotCache', BotCacheSchema);
