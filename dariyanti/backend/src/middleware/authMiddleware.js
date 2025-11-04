import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Token tidak tersedia" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Token tidak valid atau kedaluwarsa" });
    req.user = user;
    next();
  });
};

export const adminOnly = (req, res, next) => {
  // Pastikan ini dijalankan SETELAH authMiddleware
  if (req.user && req.user.role === 'ADMIN') {
    next(); // Lanjutkan jika ADMIN
  } else {
    // Tolak jika bukan ADMIN
    res.status(403).json({ error: "Akses ditolak. Memerlukan hak Admin." });
  }
};