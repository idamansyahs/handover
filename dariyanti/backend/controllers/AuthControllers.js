import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

// Login admin/user
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.admin.findUnique({ where: { email } });
    // PERBAIKAN: Standarisasi format error
    if (!user) return res.status(401).json({ error: "User tidak ditemukan" });

    const match = await bcrypt.compare(password, user.password);
    // PERBAIKAN: Standarisasi format error
    if (!match) return res.status(401).json({ error: "Password salah" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token });
  } catch (err) {
    console.error("Login error:", err);
    // PERBAIKAN: Standarisasi format error
    res.status(500).json({ error: "Internal server error" });
  }
};

// Protected profile
export const profile = async (req, res) => {
  try {
    const user = await prisma.admin.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, role: true },
    });
    // PERBAIKAN: Standarisasi format error
    if (!user) return res.status(404).json({ error: "User tidak ditemukan" });

    res.json(user);
  } catch (err) {
    console.error("Profile error:", err);
    // PERBAIKAN: Standarisasi format error
    res.status(500).json({ error: "Internal server error" });
  }
};