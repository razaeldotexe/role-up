import mongoose from 'mongoose';
import 'dotenv/config';

export async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI tidak ditemukan di file .env');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Terhubung ke MongoDB');
  } catch (error) {
    console.error('❌ Gagal terhubung ke MongoDB:', error);
    process.exit(1);
  }
}
