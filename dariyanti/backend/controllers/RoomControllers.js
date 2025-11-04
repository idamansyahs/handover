// src/controllers/roomController.js
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// helper validasi enum simple
const ROOM_TYPES = ["FBK", "FSKG", "FSST", "DXQ"];
const ROOM_STATUS = ["VCN", "VCI", "OCCUPIED", "VDN", "OOO"];

export const getRooms = async (req, res) => {
  try {
    // 1. Ambil data kamar DAN data booking terkaitnya
    const roomsWithBookings = await prisma.room.findMany({
      orderBy: { roomNumber: "asc" },
      include: {
        bookings: { // Sertakan relasi 'bookings'
          where: {
            status: { in: ["CONFIRMED", "CHECKED_IN"] } // Hanya booking yang aktif
          },
          select: { // Hanya perlu tahu apakah ada atau tidak
            id: true
          }
        }
      }
    });

    // 2. Proses data untuk menambahkan properti hasActiveBooking
    const rooms = roomsWithBookings.map(room => {
      // Cek apakah array bookings memiliki isi (lebih dari 0)
      const hasActiveBooking = room.bookings.length > 0;

      // Hapus properti bookings asli agar tidak dikirim ke frontend
      const { bookings, ...roomData } = room; 

      // Kembalikan data kamar + properti baru
      return {
        ...roomData,
        hasActiveBooking // Tambahkan properti boolean
      };
    });

    res.json(rooms); // Kirim data yang sudah diproses

  } catch (err) {
    console.error("getRooms:", err);
    res.status(500).json({ error: "Gagal mengambil daftar kamar" });
  }
};

export const getRoomById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) return res.status(404).json({ error: "Room tidak ditemukan" });
    res.json(room);
  } catch (err) {
    console.error("getRoomById:", err);
    res.status(500).json({ error: "Gagal mengambil detail kamar" });
  }
};

export const createRoom = async (req, res) => {
  try {
    const { roomNumber, type, price, status } = req.body;

    if (!roomNumber || !type || price == null) {
      return res.status(400).json({ error: "roomNumber, type dan price wajib diisi" });
    }
    if (!ROOM_TYPES.includes(type)) {
      return res.status(400).json({ error: `type invalid. Pilih salah satu: ${ROOM_TYPES.join(", ")}` });
    }
    if (status && !ROOM_STATUS.includes(status)) {
      return res.status(400).json({ error: `status invalid. Pilih salah satu: ${ROOM_STATUS.join(", ")}` });
    }

    const created = await prisma.room.create({
      data: {
        roomNumber,
        type,
        price: Number(price),
        status: status || "VCN",
      },
    });

    res.status(201).json(created);
  } catch (err) {
    console.error("createRoom:", err);
    if (err.code === "P2002") {
      return res.status(400).json({ error: "roomNumber sudah ada" });
    }
    res.status(500).json({ error: "Gagal membuat kamar" });
  }
};

export const updateRoom = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { role } = req.user;
    const { roomNumber, type, price, status } = req.body;

    if (type && !ROOM_TYPES.includes(type)) {
      return res.status(400).json({ error: `type invalid. Pilih salah satu: ${ROOM_TYPES.join(", ")}` });
    }
    if (status && !ROOM_STATUS.includes(status)) {
      return res.status(400).json({ error: `status invalid. Pilih salah satu: ${ROOM_STATUS.join(", ")}` });
    }

    // PERBAIKAN: Validasi logika bisnis (sama seperti di updateRoomStatus)
    if (status) {
      const activeBooking = await prisma.booking.findFirst({
        where: {
          roomId: id,
          status: { in: ["CONFIRMED", "CHECKED_IN"] },
        },
      });

      if (activeBooking) {
        return res.status(400).json({
          error: `Tidak dapat mengubah kamar. Masih ada booking aktif (ID: ${activeBooking.id})`,
        });
      }
    }

    let dataToUpdate;

    if (role === 'STAFF') {
      // Jika STAFF, hanya izinkan 'status'
      if (roomNumber !== undefined || type !== undefined || price !== undefined) {
        // Jika staff mencoba update selain status (misal via Postman / alat lain)
        return res.status(403).json({ error: "Akses ditolak. STAFF hanya dapat mengubah status kamar." });
      }
      // Jika mereka hanya mengirim 'status', data akan valid
      dataToUpdate = {
        ...(status !== undefined ? { status } : {}),
      };
      
    } else if (role === 'ADMIN') {
      // Jika ADMIN, izinkan semua field 
      dataToUpdate = {
        ...(roomNumber !== undefined ? { roomNumber } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(price !== undefined ? { price: Number(price) } : {}),
        ...(status !== undefined ? { status } : {}),
      };
    } else {
      // Keamanan ekstra jika role tidak dikenali
      return res.status(403).json({ error: "Role tidak dikenal." });
    }

    // Jika STAFF mengirim body kosong, cegah update
    if (Object.keys(dataToUpdate).length === 0) {
        return res.status(400).json({ error: "Tidak ada data untuk diperbarui." });
    }

    const updated = await prisma.room.update({
      where: { id },
      data: dataToUpdate, // 🔹 Gunakan objek data yang sudah difilter
    });

    res.json(updated);
  } catch (err) {
    console.error("updateRoom:", err);
    if (err.code === "P2025") return res.status(404).json({ error: "Room tidak ditemukan" });
    if (err.code === "P2002") return res.status(400).json({ error: "roomNumber conflict" });
    res.status(500).json({ error: "Gagal mengupdate kamar" });
  }
};

export const updateRoomStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    if (!status || !ROOM_STATUS.includes(status)) {
      return res.status(400).json({ error: `status invalid. Pilih salah satu: ${ROOM_STATUS.join(", ")}` });
    }

    // PERBAIKAN: Validasi logika bisnis
    // Cek apakah ada booking yang sedang CONFIRMED atau CHECKED_IN di kamar ini.
    // Jika ada, status kamar tidak boleh diubah secara manual.
    const activeBooking = await prisma.booking.findFirst({
      where: {
        roomId: id,
        status: { in: ["CONFIRMED", "CHECKED_IN"] },
      },
    });

    if (activeBooking) {
      return res.status(400).json({
        error: `Tidak dapat mengubah status kamar. Masih ada booking aktif (ID: ${activeBooking.id})`,
      });
    }

    const updated = await prisma.room.update({
      where: { id },
      data: { status },
    });

    res.json(updated);
  } catch (err) {
    console.error("updateRoomStatus:", err);
    if (err.code === "P2025") return res.status(404).json({ error: "Room tidak ditemukan" });
    res.status(500).json({ error: "Gagal mengupdate status kamar" });
  }
};

export const deleteRoom = async (req, res) => {
  try {
    const id = Number(req.params.id);

    // PERBAIKAN: Validasi logika bisnis
    // Cek apakah kamar ini memiliki booking terkait.
    const existingBookings = await prisma.booking.count({
      where: { roomId: id },
    });

    if (existingBookings > 0) {
      return res.status(400).json({
        error: `Kamar tidak dapat dihapus karena memiliki ${existingBookings} riwayat booking.`,
      });
    }

    await prisma.room.delete({ where: { id } });
    res.json({ message: "Room berhasil dihapus" });
  } catch (err) {
    console.error("deleteRoom:", err);
    if (err.code === "P2025") return res.status(404).json({ error: "Room tidak ditemukan" });
    res.status(500).json({ error: "Gagal menghapus kamar" });
  }
};