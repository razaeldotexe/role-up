import { Schema, model } from 'mongoose';

const UserWarningSchema = new Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  warningCount: { type: Number, default: 0 },
  lastWarningDate: { type: Date, default: Date.now },
  reason: { type: String },
});

// Indeks unik agar satu user hanya punya satu record per guild
UserWarningSchema.index({ guildId: 1, userId: 1 }, { unique: true });

export const UserWarning = model('UserWarning', UserWarningSchema);
