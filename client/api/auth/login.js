import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

let cached = global._mongoConn;
async function connectDB() {
  if (cached) return cached;
  cached = global._mongoConn = mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || 'agrivision' });
  return cached;
}

const userSchema = new mongoose.Schema(
  { email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true } },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'users' }
);
const User = mongoose.models.User || mongoose.model('User', userSchema);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    await connectDB();
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });

    const secret = process.env.AUTH_JWT_SECRET || 'change-me';
    const token = jwt.sign({ userId: user._id.toString(), email: user.email }, secret, { expiresIn: '7d' });

    res.setHeader('Set-Cookie', `agrivision_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}; Secure`);
    return res.status(200).json({ success: true, user: { id: user._id, email: user.email } });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ error: err.message });
  }
}
