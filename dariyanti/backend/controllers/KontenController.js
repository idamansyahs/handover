import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getKonten = async (req, res) => {
  try {
    const response = await prisma.konten.findMany();
    res.status(200).json(response);
  } catch (error) {
    // PERBAIKAN: Standarisasi format error dan status code
    res.status(500).json({ error: error.message });
  }
};

export const getKontenById = async (req, res) => {
  try {
    const response = await prisma.konten.findUnique({
      where: {
        id: Number(req.params.id),
      },
    });
    // PERBAIKAN: Tambahkan cek jika tidak ditemukan
    if (!response) {
      return res.status(404).json({ error: "Konten tidak ditemukan" });
    }
    res.status(200).json(response);
  } catch (error) {
    // PERBAIKAN: Standarisasi format error dan status code
    res.status(500).json({ error: error.message });
  }
};

export const createKonten = async (req, res) => {
  // PERBAIKAN: Hapus 'createAt'. Biarkan Prisma menangani 'createdAt' secara otomatis.
  const { link, deskripsi, platform } = req.body;
  try {
    const response = await prisma.konten.create({
      data: {
        link: link,
        deskripsi: deskripsi,
        platform: platform,
        // 'createdAt' akan diisi otomatis oleh Prisma
      },
    });
    res.status(201).json(response); // PERBAIKAN: Gunakan status 201 untuk 'created'
  } catch (error) {
    // PERBAIKAN: Standarisasi format error dan status code (bukan 402)
    res.status(500).json({ error: error.message });
  }
};

export const updateKonten = async (req, res) => {
  // PERBAIKAN: Ganti 'createAt' menjadi 'createdAt' agar konsisten
  const { link, deskripsi, platform, createdAt } = req.body;
  try {
    const response = await prisma.konten.update({
      where: {
        id: Number(req.params.id),
      },
      data: {
        link: link,
        deskripsi: deskripsi,
        platform: platform,
        createdAt: createdAt, // Menggunakan 'createdAt'
      },
    });
    res.status(200).json(response);
  } catch (error) {
    // PERBAIKAN: Standarisasi format error dan status code (bukan 403)
    // PERBAIKAN: Tambahkan cek error P2025 (Not Found)
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Konten tidak ditemukan" });
    }
    res.status(500).json({ error: error.message });
  }
};

export const deleteKonten = async (req, res) => {
  try {
    const response = await prisma.konten.delete({
      where: {
        id: Number(req.params.id),
      },
    });
    res.status(200).json(response);
  } catch (error) {
    // PERBAIKAN: Standarisasi format error dan status code (bukan 403)
    // PERBAIKAN: Tambahkan cek error P2025 (Not Found)
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Konten tidak ditemukan" });
    }
    res.status(500).json({ error: error.message });
  }
};