export default function handler(req, res) {
  res.setHeader('Set-Cookie', 'agrivision_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure');
  return res.status(200).json({ success: true, message: 'Logged out' });
}
