// src/controllers/bookingController.js
import { PrismaClient } from "@prisma/client";
// PERBAIKAN: Hapus impor sendMail yang tidak digunakan
// import { sendMail } from "../src/utils/mailer.js";
import midtransClient from "midtrans-client";
import axios from "axios";

const prisma = new PrismaClient();

// Inisialisasi Snap
let snap = new midtransClient.Snap({
  isProduction: false, // false untuk sandbox, true untuk production
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// PERBAIKAN: Hapus fungsi generateBookingCode yang tidak digunakan
/*
const generateBookingCode = (roomType) => {
    const randomNum = Math.floor(10 + Math.random() * 90); // Angka acak antara 10-99
    return `${roomType}${randomNum}`;
};
*/

const bookingToRoomStatus = (bookingStatus) => {
  switch (bookingStatus) {
    case "CONFIRMED":
      return "VCI";
    case "CHECKED_IN":
      return "OCCUPIED";
    case "CHECKED_OUT":
      return "VDN";
    case "CANCELLED":
      return "VCI";
    default:
      return undefined;
  }
};

const nightsBetween = (start, end) => {
  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = new Date(end) - new Date(start);
  // Pastikan minimal 1 malam
  return Math.max(1, Math.ceil(diff / msPerDay));
};

const getBookingCodePrefix = (roomType) => {
  const mapping = {
    FBK: "FBK",
    FSKG: "FSKG",
    FSST: "FSST",
    DXQ: "DXQ",
  };
  return mapping[roomType] || "BOOK";
};

// Create booking (public)
export const createBookingUser = async (req, res) => {
  try {
    const { roomType, guestName, email, phone, notes, checkIn, checkOut } =
      req.body;
    if (!roomType || !guestName || !email || !phone || !checkIn || !checkOut) {
      return res.status(400).json({ error: "Lengkapi semua field yang required" });
    }

    // PERBAIKAN: Gunakan helper nightsBetween
    const nights = nightsBetween(checkIn, checkOut);
    const sampleRoom = await prisma.room.findFirst({ where: { type: roomType } });
    if (!sampleRoom)
      return res.status(400).json({ error: "Tipe kamar tidak tersedia" });

    const pricePerNight = sampleRoom.price;
    const total = pricePerNight * nights;

    const booking = await prisma.booking.create({
      data: {
        roomType,
        guestName,
        email,
        phone,
        notes,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        nights,
        pricePerNight,
        total,
        status: "PENDING",
      },
    });

    const prefix = getBookingCodePrefix(booking.roomType);
    const bookingCode = `${prefix}${booking.id}`;

    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: { bookingCode: bookingCode },
    });

    return res.status(201).json(updatedBooking);
  } catch (err) {
    console.error("createBooking:", err);
    return res.status(500).json({ error: "Gagal membuat booking" });
  }
};

// Create booking admin
export const createBooking = async (req, res) => {
  try {
    // PERBAIKAN: Hapus 'pricePerNight', 'nights', 'total', 'roomType' dari body.
    // Data ini harus diambil dari DB berdasarkan 'roomId'.
    const { guestName, email, phone, notes, checkIn, checkOut, roomId } =
      req.body;

    if (!roomId || !checkIn || !checkOut || !guestName) {
      return res.status(400).json({
        error: "roomId, checkIn, checkOut, dan guestName wajib diisi",
      });
    }

    // PERBAIKAN: Ambil data kamar dari database
    const room = await prisma.room.findUnique({
      where: { id: Number(roomId) },
    });
    if (!room) {
      return res.status(404).json({ error: "Room tidak ditemukan" });
    }

    // PERBAIKAN: Hitung 'nights' dan 'total' di backend
    const computedNights = nightsBetween(checkIn, checkOut);
    const finalPricePerNight = room.price;
    const finalTotal = finalPricePerNight * computedNights;

    const booking = await prisma.booking.create({
      data: {
        guestName,
        email,
        phone,
        notes,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        nights: computedNights,
        pricePerNight: finalPricePerNight,
        total: finalTotal,
        roomId: Number(roomId),
        roomType: room.type, // Ambil dari data kamar
        status: "CONFIRMED", // Booking admin langsung CONFIRMED
        payment_status: "SUCCESS", // Asumsi admin input = lunas
      },
      include: { room: true },
    });

    res.status(201).json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Update booking
export const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // Ambil data booking saat ini
    const existingBooking = await prisma.booking.findUnique({ where: { id: Number(id) }});
    if (!existingBooking) {
        return res.status(404).json({ error: "Booking tidak ditemukan" });
    }

    // Tentukan nilai checkIn, checkOut, dan pricePerNight
    const checkIn = data.checkIn ? new Date(data.checkIn) : existingBooking.checkIn;
    const checkOut = data.checkOut ? new Date(data.checkOut) : existingBooking.checkOut;
    // PERBAIKAN: Pastikan pricePerNight adalah angka, ambil dari data baru atau data lama
    const pricePerNight = (data.pricePerNight !== undefined) 
        ? Number(data.pricePerNight) 
        : existingBooking.pricePerNight;

    // if checkIn/checkOut change -> recompute nights & total if pricePerNight present
    if (data.checkIn || data.checkOut || data.pricePerNight !== undefined) {
      // PERBAIKAN: Gunakan helper nightsBetween secara konsisten
      const nights = nightsBetween(checkIn, checkOut);
      data.nights = nights;
      // Pastikan pricePerNight valid sebelum menghitung total
      if (pricePerNight !== null) {
        data.total = nights * pricePerNight;
      }
    }

    if (data.roomId || data.status === "CONFIRMED" || data.status === "CHECKED_IN") {
      data.payment_status = "SUCCESS"; 
    }

    const updated = await prisma.booking.update({
      where: { id: Number(id) },
      data,
      include: { room: true },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    // PERBAIKAN: Tambahkan cek error P2025 (Not Found)
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Booking tidak ditemukan" });
    }
    res.status(500).json({ error: err.message });
  }
};

// Fungsi untuk membuat transaksi Midtrans
export const createMidtransTransaction = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id: Number(bookingId) },
    });

    if (!booking) {
      // PERBAIKAN: Standarisasi format error
      return res.status(404).json({ error: "Booking tidak ditemukan" });
    }

    if (booking.status !== "PENDING") {
      // PERBAIKAN: Standarisasi format error
      return res.status(400).json({
        error: `Tidak dapat membuat pembayaran. Status pesanan adalah: ${booking.status}`,
      });
    }

    const new_midtrans_order_id = `${booking.bookingCode}-${Date.now()}`;
    console.log(
      `Membuat transaksi Midtrans baru dengan Order ID unik: ${new_midtrans_order_id}`
    );

    const parameter = {
      transaction_details: {
        order_id: new_midtrans_order_id,
        gross_amount: booking.total,
      },
      customer_details: {
        first_name: booking.guestName,
        email: booking.email,
        phone: booking.phone,
      },
      callbacks: {
        finish: `${process.env.FRONTEND_URL}/payment-finish`,
        unfinish: `${process.env.FRONTEND_URL}/payment-finish`,
        error: `${process.env.FRONTEND_URL}/payment-finish`,
      },
      expiry: {
        unit: "minute",
        duration: 15, // PERBAIKAN: Ubah dari 1 menit ke 15 menit
      },
    };

    const transaction = await snap.createTransaction(parameter);
    const transactionToken = transaction.token;

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentToken: transactionToken,
        midtransOrderId: new_midtrans_order_id,
      },
    });

    console.log(
      `Token baru ${transactionToken} berhasil dibuat dan disimpan untuk Order ID ${new_midtrans_order_id}.`
    );
    res.status(200).json({ token: transactionToken, orderId: new_midtrans_order_id });
  } catch (error) {
    console.error("Gagal membuat transaksi Midtrans:", error);
    // PERBAIKAN: Standarisasi format error
    res.status(500).json({
      error: "Gagal membuat transaksi Midtrans",
      detail: error.message,
    });
  }
};

export const handleMidtransNotification = async (req, res) => {
  try {
    console.log("=== Webhook Midtrans Masuk ===");
    console.log("Body:", req.body);

    const notificationJson = req.body;
    const statusResponse = await snap.transaction.notification(notificationJson);
    console.log("Status Response:", statusResponse);

    const orderId = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;

    console.log(
      `Notifikasi diterima. Order ID: ${orderId}, Status: ${transactionStatus}`
    );

    const booking = await prisma.booking.findUnique({
      where: { midtransOrderId: orderId },
    });

    if (!booking) {
      console.warn(`Booking dengan order_id Midtrans ${orderId} tidak ditemukan.`);
      return res.status(404).send("Booking tidak ditemukan");
    }

    let dataToUpdate = {};

    if (
      transactionStatus === "settlement" ||
      (transactionStatus === "capture" && fraudStatus === "accept")
    ) {
      dataToUpdate = { status: "CONFIRMED", payment_status: "SUCCESS" };
    } else if (transactionStatus === "expire") {
      dataToUpdate = { status: "CANCELLED", payment_status: "EXPIRED" };
    } else if (transactionStatus === "cancel" || transactionStatus === "deny") {
      dataToUpdate = { status: "CANCELLED", payment_status: "CANCELLED" };
    }

    if (Object.keys(dataToUpdate).length > 0) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: dataToUpdate,
      });
      console.log(
        `Booking ${booking.bookingCode} (order_id: ${orderId}) berhasil diupdate.`
      );
    } else {
      console.log(`Tidak ada perubahan status untuk transaksi ${orderId}.`);
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Kesalahan Webhook Midtrans:", error);
    res.status(500).send("Terjadi kesalahan pada webhook");
  }
};

// FUNGSI BARU UNTUK REGENERATE TOKEN
export const regenerateToken = async (req, res) => {
  console.log("=============================================");
  console.log(
    "MEMULAI PROSES REGENERATE TOKEN PADA:",
    new Date().toISOString()
  );

  const { booking_code } = req.body;
  console.log(`1. Menerima permintaan untuk booking_code: ${booking_code}`);

  if (!booking_code) {
    console.error("   -> GAGAL: Booking code tidak ada dalam request body.");
    // PERBAIKAN: Standarisasi format error
    return res.status(400).json({ error: "Booking code diperlukan" });
  }

  try {
    console.log(`2. Mencari data booking di database...`);
    const existingBooking = await prisma.booking.findUnique({
      where: {
        bookingCode: booking_code,
      },
    });

    if (!existingBooking) {
      console.error(
        `   -> GAGAL: Booking dengan kode ${booking_code} tidak ditemukan.`
      );
      // PERBAIKAN: Standarisasi format error
      return res.status(404).json({ error: "Booking tidak ditemukan" });
    }
    console.log(
      `   -> SUKSES: Data booking ditemukan untuk tamu: ${existingBooking.guestName}`
    );
    console.log(`   -> Status booking saat ini: ${existingBooking.status}`);

    if (existingBooking.status !== "PENDING") {
      console.error(
        `   -> GAGAL: Percobaan regenerate token untuk booking dengan status final: ${existingBooking.status}.`
      );
      console.log("=============================================\n");
      // PERBAIKAN: Standarisasi format error
      return res.status(400).json({
        error: `Tidak dapat melanjutkan pembayaran. Status pesanan saat ini adalah: ${existingBooking.status}`,
      });
    }

    console.log("3. Menginisialisasi Midtrans Snap...");
    // PERBAIKAN: Gunakan instance 'snap' yang sudah ada di global scope
    // let snap = new midtransClient.Snap(...)
    console.log("   -> SUKSES: Midtrans Snap terinisialisasi.");

    const new_midtrans_order_id = `${existingBooking.bookingCode}-${Date.now()}`;

    console.log(
      `4. Membuat parameter untuk transaksi Midtrans dengan order_id baru: ${new_midtrans_order_id}`
    );

    const parameter = {
      transaction_details: {
        order_id: new_midtrans_order_id,
        gross_amount: existingBooking.total,
      },
      customer_details: {
        first_name: existingBooking.guestName,
        email: existingBooking.email,
        phone: existingBooking.phone,
      },
      item_details: [
        {
          id: existingBooking.roomType,
          price: existingBooking.total,
          quantity: 1,
          name: `Booking Kamar Tipe ${existingBooking.roomType} #${existingBooking.bookingCode}`,
        },
      ],
      callbacks: {
        finish: `${process.env.FRONTEND_URL}/payment-finish`,
        unfinish: `${process.env.FRONTEND_URL}/payment-finish`,
        error: `${process.env.FRONTEND_URL}/payment-finish`,
      },
      credit_card: {
        secure: true,
      },
      expiry: {
        unit: "minute",
        duration: 15, // PERBAIKAN: Ubah dari 1 menit ke 15 menit
      },
    };
    console.log("   -> Parameter:", JSON.stringify(parameter, null, 2));

    console.log("5. Mengirim permintaan pembuatan transaksi ke Midtrans...");
    const transaction = await snap.createTransaction(parameter);
    const newTransactionToken = transaction.token;
    console.log("   -> SUKSES: Midtrans merespons dengan token baru.");

    console.log(
      "6. Memperbarui data booking di database dengan token & order_id baru..."
    );
    await prisma.booking.update({
      where: { id: existingBooking.id },
      data: {
        paymentToken: newTransactionToken,
        midtransOrderId: new_midtrans_order_id,
      },
    });
    console.log("   -> SUKSES: Database berhasil diperbarui.");

    console.log("7. Mengirim token baru ke frontend.");
    console.log("=============================================\n");
    res.status(200).json({ token: newTransactionToken });
  } catch (error) {
    console.error("   -> ERROR KRITIS PADA BLOK `try...catch`!");
    console.error("   -> Pesan Error:", error.message);
    if (error.ApiResponse) {
      console.error("   -> Respons API Midtrans:", error.ApiResponse);
    }
    console.log("=============================================\n");
    // PERBAIKAN: Standarisasi format error
    res.status(500).json({
      error: "Gagal membuat token pembayaran baru di server.",
      detail: error.message,
    });
  }
};

// FUNGSI BARU UNTUK CEK KETERSEDIAAN KAMAR
export const checkAvailabilityPublic = async (req, res) => {
  try {
    const { roomType, checkIn, checkOut } = req.query;

    if (!roomType || !checkIn || !checkOut) {
      // PERBAIKAN: Standarisasi format error
      return res.status(400).json({
        error: "Tipe kamar, tanggal check-in, dan check-out diperlukan.",
      });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      // PERBAIKAN: Standarisasi format error
      return res.status(400).json({ error: "Format tanggal tidak valid." });
    }

    const totalRoomsOfType = await prisma.room.count({
      where: {
        type: roomType,
        status: { not: "OOO" },
      },
    });

    if (totalRoomsOfType === 0) {
      return res.json({ available: false, message: "Tipe kamar tidak ditemukan." });
    }

    const conflictingBookings = await prisma.booking.count({
      where: {
        roomType: roomType,
        status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
        AND: [
          { checkIn: { lt: checkOutDate } },
          { checkOut: { gt: checkInDate } },
        ],
      },
    });

    const isAvailable = totalRoomsOfType > conflictingBookings;

    if (isAvailable) {
      res.json({
        available: true,
        message: `Kamar tipe ${roomType} tersedia pada tanggal tersebut.`,
      });
    } else {
      res.json({
        available: false,
        message: `Kamar tipe ${roomType} penuh pada tanggal tersebut.`,
      });
    }
  } catch (error) {
    console.error("Error checking public availability:", error);
    // PERBAIKAN: Standarisasi format error
    res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
};

// Get all bookings (admin)
export const getBookings = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: { room: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(bookings);
  } catch (err) {
    console.error("getBookings:", err);
    res.status(500).json({ error: "Gagal mengambil booking" });
  }
};

export const getBookingUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await prisma.booking.findUnique({
      where: { id: Number(id) },
    });
    if (!booking) {
      return res.status(404).json({ error: "Booking tidak ditemukan" });
    }
    res.json(booking);
  } catch (err) {
    console.error("getBookingUserById:", err);
    res.status(500).json({ error: "Gagal mengambil detail booking" });
  }
};

export const getBookingByCode = async (req, res) => {
  try {
    const { bookingCode } = req.params;
    const booking = await prisma.booking.findUnique({
      where: { bookingCode: bookingCode },
    });

    if (!booking) {
      // PERBAIKAN: Standarisasi format error
      return res.status(404).json({ error: "Booking tidak ditemukan." });
    }

    res.json(booking);
  } catch (error) {
    console.error("Error fetching booking by code:", error);
    // PERBAIKAN: Standarisasi format error
    res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
};

// Assign a real room to a booking (admin)
export const assignRoom = async (req, res) => {
  try {
    const { id } = req.params; // booking id
    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ error: "roomId required" });

    const booking = await prisma.booking.findUnique({
      where: { id: Number(id) },
    });
    if (!booking) return res.status(404).json({ error: "Booking tidak ditemukan" });

    const room = await prisma.room.findUnique({ where: { id: Number(roomId) } });
    if (!room) return res.status(404).json({ error: "Room tidak ditemukan" });

    const overlap = await prisma.booking.findFirst({
      where: {
        roomId: Number(roomId),
        status: { in: ["CONFIRMED", "CHECKED_IN"] },
        AND: [
          { checkIn: { lt: booking.checkOut } },
          { checkOut: { gt: booking.checkIn } },
        ],
        // Jangan cek overlap dengan diri sendiri (jika ini adalah update)
        NOT: {
          id: Number(id)
        }
      },
    });

    if (overlap) {
      return res.status(400).json({
        error: `Room tidak tersedia. Bertabrakan dengan booking ${overlap.bookingCode}`,
      });
    }

    const updated = await prisma.booking.update({
      where: { id: Number(id) },
      data: { roomId: Number(roomId), roomType: room.type }, // PERBAIKAN: Update juga roomType
      include: { room: true },
    });

    return res.json(updated);
  } catch (err) {
    console.error("assignRoom:", err);
    return res.status(500).json({ error: "Gagal assign room" });
  }
};

// Update booking status (admin)
export const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const dataToUpdate = { status };
    if (status === "CONFIRMED" || status === "CHECKED_IN") {
      dataToUpdate.payment_status = "SUCCESS";
    }

    const booking = await prisma.booking.update({
      where: { id: Number(id) },
      data: dataToUpdate,
      include: { room: true },
    });

    if (booking?.roomId) {
      const mapped = bookingToRoomStatus(status);
      if (mapped) {
        await prisma.room.update({
          where: { id: booking.roomId },
          data: { status: mapped },
        });
      }
    }

    res.json(booking);
  } catch (err) {
    console.error(err);
    // PERBAIKAN: Tambahkan cek error P2025 (Not Found)
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Booking tidak ditemukan" });
    }
    res.status(500).json({ error: err.message });
  }
};

export const getPublicRooms = async (req, res) => {
  try {
    const { search, type } = req.query;
    let where = {};
    if (search) {
      where.OR = [
        { type: { contains: search, mode: "insensitive" } },
        { roomNumber: { contains: search, mode: "insensitive" } },
      ];
    }
    if (type) {
      where.type = type;
    }

    const rooms = await prisma.room.findMany({
      where,
      orderBy: { id: "asc" },
    });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: "Error fetching rooms" });
  }
};

export const cancelBookingUser = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id: Number(id) },
    });

    if (!booking) {
      // PERBAIKAN: Standarisasi format error
      return res.status(404).json({ error: "Booking tidak ditemukan." });
    }

    if (booking.status !== "PENDING") {
      // PERBAIKAN: Standarisasi format error
      return res.status(400).json({
        error: "Hanya pesanan yang masih pending yang bisa dibatalkan.",
      });
    }

    // PERBAIKAN: Gunakan 'midtransOrderId' bukan 'bookingCode'
    if (booking.midtransOrderId) {
      const serverKey = process.env.MIDTRANS_SERVER_KEY;
      // PERBAIKAN: Panggil 'order_id' yang benar
      const midtransUrl = `https://api.sandbox.midtrans.com/v2/${booking.midtransOrderId}/cancel`;
      const authString = Buffer.from(`${serverKey}:`).toString("base64");

      try {
        console.log(
          `Mencoba membatalkan transaksi Midtrans: ${booking.midtransOrderId}`
        );
        await axios.post(
          midtransUrl,
          {},
          {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Basic ${authString}`,
            },
          }
        );
        console.log(
          `Transaksi Midtrans ${booking.midtransOrderId} berhasil dibatalkan.`
        );
      } catch (midtransError) {
        console.error(
          `Gagal membatalkan transaksi Midtrans ${booking.midtransOrderId}:`,
          midtransError.response?.data || midtransError.message
        );
        // Tetap lanjutkan proses, mungkin sudah expired
      }
    } else {
      console.log(`Booking ${booking.bookingCode} tidak memiliki midtransOrderId, pembatalan di Midtrans dilewati.`);
    }

    const cancelledBooking = await prisma.booking.update({
      where: { id: Number(id) },
      data: { status: "CANCELLED", payment_status: "CANCELLED" },
    });

    res.json({
      message: "Pesanan telah berhasil dibatalkan.",
      booking: cancelledBooking,
    });
  } catch (err) {
    console.error("Error cancelling booking:", err);
    // PERBAIKAN: Standarisasi format error
    res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
};

export const getBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id: Number(id) },
      select: { status: true, payment_status: true, bookingCode: true },
    });

    if (!booking) {
      // PERBAIKAN: Standarisasi format error
      return res.status(404).json({ error: "Booking tidak ditemukan" });
    }

    res.json({
      status: booking.status,
      payment_status: booking.payment_status,
      bookingCode: booking.bookingCode,
    });
  } catch (error) {
    console.error("Gagal mendapatkan status booking:", error);
    // PERBAIKAN: Standarisasi format error
    res.status(500).json({ error: "Gagal memeriksa status booking" });
  }
};

// Delete booking
export const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await prisma.booking.findUnique({
      where: { id: Number(id) },
    });

    // PERBAIKAN: Tambah cek jika booking tidak ada sebelum delete
    if (!booking) {
        return res.status(404).json({ error: "Booking tidak ditemukan" });
    }

    await prisma.booking.delete({ where: { id: Number(id) } });

    // Reset status kamar HANYA jika kamar ada dan booking BUKAN CHECKED_OUT
    if (booking.roomId && booking.status !== "CHECKED_OUT") {
      await prisma.room.update({
        where: { id: Number(booking.roomId) },
        data: { status: "VCI" }, // Set ke VCI (Vacant Clean Inspected)
      });
    }

    res.json({ message: "Booking deleted" });
  } catch (err) {
    console.error(err);
    // PERBAIKAN: Tambahkan cek error P2025 (Not Found)
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Booking tidak ditemukan saat mencoba menghapus" });
    }
    res.status(500).json({ error: err.message });
  }
};

export const available = async (req, res) => {
  try {
    const { type, checkIn, checkOut } = req.query;
    if (!type || !checkIn || !checkOut) {
      return res.status(400).json({ error: "Missing params" });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    const rooms = await prisma.room.findMany({
      where: {
        type,
        status: { not: "OOO" }, // exclude out of order
        bookings: {
          none: {
            // Kondisi overlap:
            // Booking berakhir setelah checkIn baru
            // DAN Booking dimulai sebelum checkOut baru
            status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
            AND: [
                { checkIn: { lt: checkOutDate } },
                { checkOut: { gt: checkInDate } },
            ]
          },
        },
      },
    });

    res.json(rooms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// FUNGSI BARU UNTUK MEMBERSIHKAN BOOKING YANG EXPIRED
export const cleanExpiredBookings = async () => {
  console.log("Running scheduled job: Cleaning expired bookings...");
  try {
    // Tentukan batas waktu (misalnya, 17 menit yang lalu)
    const expiryTime = new Date(Date.now() - 17 * 60 * 1000);

    const expiredBookings = await prisma.booking.findMany({
      where: {
        status: "PENDING",
        createdAt: {
          lt: expiryTime, // lt = less than
        },
      },
    });

    if (expiredBookings.length > 0) {
      const idsToCancel = expiredBookings.map((b) => b.id);
      console.log(
        `Found ${
          expiredBookings.length
        } expired bookings to cancel. IDs: ${idsToCancel.join(", ")}`
      );

      await prisma.booking.updateMany({
        where: {
          id: {
            in: idsToCancel,
          },
        },
        data: {
          status: "CANCELLED",
          payment_status: "EXPIRED", // PERBAIKAN: Gunakan EXPIRED
        },
      });
    } else {
      console.log("No expired bookings found.");
    }
  } catch (error) {
    console.error("Error during scheduled job:", error);
  }
};