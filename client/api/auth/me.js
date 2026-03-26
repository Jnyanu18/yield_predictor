import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

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

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(c => {
    const [k, ...v] = c.trim().split('=');
    cookies[k.trim()] = v.join('=');
  });
  return cookies;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies['agrivision_session'];
    if (!token) return res.status(200).json({ user: null });

    const secret = process.env.AUTH_JWT_SECRET || 'change-me';
    const decoded = jwt.verify(token, secret);

    await connectDB();
    const user = await User.findById(decoded.userId).select('-passwordHash');
    if (!user) return res.status(200).json({ user: null });

    return res.status(200).json({ success: true, user: { id: user._id, email: user.email } });
  } catch {
    return res.status(200).json({ user: null });
  }
}
