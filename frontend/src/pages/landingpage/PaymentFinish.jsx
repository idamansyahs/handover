// frontend/src/pages/landingpage/PaymentFinish.jsx

import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api';
import './../../assets/css/PaymentFinish.css'; 
import ConfirmationDialog from '../../components/ConfirmationDialog';

const formatCurrency = (amount) => {
  if (!amount) return 'Rp 0';
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString("id-ID", {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const roomTypeMapping = {
  FBK: "Fhandika Boutique",
  FSKG: "Fhandika SS King",
  FSST: "Fhandika SS Twin",
  DXQ: "Fhandika DXQ",
};

const getRoomTypeName = (typeCode) => {
  return roomTypeMapping[typeCode] || typeCode;
};

const PaymentFinish = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [paymentStatus, setPaymentStatus] = useState({
        status: 'loading', // Ubah status awal menjadi loading
        message: 'Memverifikasi status pembayaran...',
        orderId: ''
    });

    const [bookingDetails, setBookingDetails] = useState(null);
    const [isRegenerating, setIsRegenerating] = useState(false);

    // === TAMBAHKAN STATE BARU UNTUK PEMBATALAN ===
    const [isCancelling, setIsCancelling] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [message, setMessage] = useState({ text: null, type: 'info' });

    // === FUNGSI BARU UNTUK MEMBUKA KEMBALI POPUP MIDTRANS ===
    const handleResumePayment = async() => {
        setMessage({ text: null, type: 'info' });
        // Pastikan detail booking dan token pembayaran sudah ada
        if (!bookingDetails || !bookingDetails.bookingCode) {
            setMessage({ text: "Detail pesanan tidak ditemukan. Silakan muat ulang halaman.", type: 'error' });
            return;
        }

        setIsRegenerating(true); // Mulai loading

        try {
            // 1. Minta token baru dari backend
            const response = await api.post('/api/regenerate-payment-token', {
                booking_code: bookingDetails.bookingCode
            });

            const { token: newToken } = response.data;

            // 2. Gunakan token baru untuk membuka Snap
            if (newToken) {
                window.snap.pay(newToken, {
                    onSuccess: function (result) {
                        console.log('Pembayaran Sukses:', result);
                        // Redirect ke halaman finish dengan status baru
                        setMessage({ text: 'Pembayaran Berhasil! Memuat ulang...', type: 'success' });
                        setTimeout(() => {
                           navigate(`/payment-finish?order_id=${bookingDetails.bookingCode}&status=success`);
                           window.location.reload();
                        }, 1500);
                    },
                    onPending: function (result) {
                        console.log('Pembayaran Pending:', result);
                        setMessage({ text: 'Pembayaran Anda masih tertunda. Halaman akan dimuat ulang.', type: 'info' });
                        // =================
                        setTimeout(() => window.location.reload(), 1500);
                    },
                    onError: function (result) {
                        console.log('Pembayaran Gagal:', result);
                        setMessage({ text: 'Pembayaran Gagal. Halaman akan dimuat ulang.', type: 'error' });
                         // =================
                        setTimeout(() => window.location.reload(), 1500);
                    },
                    onClose: function () {
                        console.log('Anda menutup jendela pembayaran');
                        setMessage({ text: 'Anda menutup jendela pembayaran sebelum transaksi selesai.', type: 'warning' });
                    }
                });
            } else {
                throw new Error("Token baru tidak diterima dari server.");
            }

        } catch (error) {
            // ================= UBAH BAGIAN INI =================
            console.error("Gagal membuat ulang token pembayaran:", error);
            
            // Log ini akan memberikan detail error dari backend
            if (error.response) {
                console.error("Data Error dari Backend:", error.response.data);
                console.error("Status Error dari Backend:", error.response.status);
            }
            
            setMessage({ text: "Gagal memuat ulang sesi pembayaran. Silakan coba lagi nanti.", type: 'error' });
            // ===================================================
        } finally {
            setIsRegenerating(false); // Selesai loading
        }
    };

    // Fungsi yang dipanggil tombol "Batalkan Pesanan"
    const handleCancelBookingClick = () => {
        setMessage({ text: null, type: 'info' }); // Reset pesan error/sukses sebelumnya
         // Validasi awal
        if (!bookingDetails || !bookingDetails.id) {
            setMessage({ text: "Detail pesanan tidak ditemukan untuk dibatalkan.", type: 'error' });
            return;
        }
        setShowCancelConfirm(true); // <-- Tampilkan modal konfirmasi
    };

    // Fungsi yang dijalankan JIKA pengguna konfirmasi di modal
    const executeCancellation = async () => {
        // Logika pembatalan dipindahkan ke sini
        setIsCancelling(true);
        try {
            const response = await api.post(`/api/booking/cancel/${bookingDetails.id}`);
            setMessage({ text: response.data.message || "Pesanan telah berhasil dibatalkan.", type: 'success' });

            // Update status utama halaman
            setPaymentStatus({
                status: 'error',
                message: 'Pesanan telah dibatalkan oleh Anda.',
                orderId: bookingDetails.bookingCode
            });
            setBookingDetails(response.data.booking);

        } catch (error) {
             console.error("Gagal membatalkan pesanan:", error);
             setMessage({ text: "Gagal membatalkan pesanan: " + (error.response?.data?.message || error.message), type: 'error' });
        } finally {
            setIsCancelling(false);
        }
    };

    // === FUNGSI BARU UNTUK MEMBATALKAN BOOKING ===
    const handleCancelBooking = async () => {
        setMessage({ text: null, type: 'info' }); // Reset pesan
        if (!bookingDetails || !bookingDetails.id) {
            setMessage({ text: "Detail pesanan tidak ditemukan.", type: 'error' });
            return;
        }

        // Konfirmasi pengguna
        if (!window.confirm("Apakah Anda yakin ingin membatalkan pesanan ini?")) {
            return;
        }

        setIsCancelling(true);
        try {
            // Panggil API cancelBookingUser dari backend
            const response = await api.post(`/api/booking/cancel/${bookingDetails.id}`);
            
            // Tampilkan pesan sukses
            setMessage({ text: response.data.message || "Pesanan telah berhasil dibatalkan.", type: 'success' });
            // Update UI
            setPaymentStatus({
                status: 'error', // Set status ke error/gagal
                message: 'Pesanan telah dibatalkan oleh Anda.',
                orderId: bookingDetails.bookingCode
            });
            // Update detail booking dengan data terbaru dari backend
            setBookingDetails(response.data.booking);

        } catch (error) {
            console.error("Gagal membatalkan pesanan:", error);
            setMessage({ text: "Gagal membatalkan pesanan: " + (error.response?.data?.message || error.message), type: 'error' });
        } finally {
            setIsCancelling(false);
        }
    };
    // === AKHIR FUNGSI BARU ===

    useEffect(() => {
        // 1. Ambil orderId LENGKAP dari URL (misal: "FBK22-1760694479489")
        const orderIdFromUrl = searchParams.get('order_id');

        const verifyPaymentStatus = async (fullOrderId) => {
            if (!fullOrderId) {
                setPaymentStatus({ status: 'error', message: 'ID Pesanan tidak valid.', orderId: '' });
                return;
            }

            // ==================== PERBAIKAN UTAMA DI SINI ====================
            // 2. Pisahkan orderId berdasarkan tanda '-' dan ambil bagian pertamanya.
            // Ini akan mengubah "FBK22-1760694479489" menjadi "FBK22".
            const cleanBookingCode = fullOrderId.split('-')[0];
            // ===============================================================

            try {
            // 3. Gunakan booking code yang sudah bersih untuk memanggil API.
            // ==================== LOGIKA BARU YANG LEBIH ANDAL ====================
            // 1. Selalu ambil status terbaru dari database. Ini adalah sumber kebenaran utama.
            const response = await api.get(`/api/booking-code/${cleanBookingCode}`);
            const dbBooking = response.data;
            setBookingDetails(dbBooking); // Simpan detail booking untuk ditampilkan

            // 2. Tentukan status halaman HANYA berdasarkan status dari database.
            // Abaikan parameter URL yang bisa membingungkan.
            switch (dbBooking.status) {
                case 'CONFIRMED':
                    setPaymentStatus({ status: 'success', message: 'Pembayaran Berhasil!', orderId: cleanBookingCode });
                    break;
                case 'PENDING':
                    setPaymentStatus({ status: 'pending', message: 'Kami masih menunggu pembayaran Anda.', orderId: cleanBookingCode });
                    break;
                case 'CANCELLED':
                    // Bedakan pesan jika payment_status nya CANCELLED (oleh user) vs EXPIRED/FAILED
                        if (dbBooking.payment_status === 'CANCELLED') {
                             setPaymentStatus({ status: 'error', message: 'Pesanan ini telah dibatalkan.', orderId: cleanBookingCode });
                        } else {
                             setPaymentStatus({ status: 'error', message: 'Waktu pembayaran telah habis atau pesanan dibatalkan.', orderId: cleanBookingCode });
                        }
                        break;
                default:
                    setPaymentStatus({ status: 'error', message: 'Status pesanan tidak dikenali.', orderId: cleanBookingCode });
                    break;
            }
        } catch (error) {
            console.error("Gagal memverifikasi status booking:", error);
            setPaymentStatus({ status: 'error', message: 'Gagal memuat detail pesanan.', orderId: cleanBookingCode });
        }
    };

    // 4. Panggil fungsi verifikasi dengan orderId LENGKAP dari URL.
    verifyPaymentStatus(orderIdFromUrl);
}, [searchParams]);

    // ==========================================================
    // === PERBAIKAN UTAMA UNTUK FLICKER ADA DI SINI ===
    // ==========================================================
    // Tambahkan 'if' block ini untuk menangani 'loading' state
    // SEBELUM Anda memanggil getStatusInfo()
    if (paymentStatus.status === 'loading') {
        return (
            <div className="payment-finish-container">
                <div className="payment-card payment-card-loading"> {/* Kelas loading */}
                    <div className="payment-icon">
                        <div className="spinner-border" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                    <h1 className="payment-title">Mohon Tunggu</h1>
                    <p className="payment-text">{paymentStatus.message}</p>
                </div>
            </div>
        );
    }
    // ==========================================================
    // === AKHIR DARI PERBAIKAN ===
    // ==========================================================


    // Kode di bawah ini HANYA akan berjalan jika status BUKAN 'loading'
    const getStatusInfo = () => {
        switch (paymentStatus.status) {
            case 'success':
                return {
                    icon: '✅', // Emoji atau bisa diganti Bootstrap Icon <i className="bi bi-check-circle-fill fs-1 text-success"></i>
                    type: 'success',
                    title: 'Pembayaran Berhasil!',
                    text: `Terima kasih! Pesanan Anda dengan ID ${paymentStatus.orderId} telah dikonfirmasi.`
                };
            case 'pending':
                return {
                    icon: '⏳', // Emoji atau <i className="bi bi-hourglass-split fs-1 text-primary"></i>
                    type: 'warning',
                    title: 'Pembayaran Tertunda',
                    text: `Kami masih menunggu konfirmasi pembayaran untuk pesanan ${paymentStatus.orderId}. Silakan selesaikan pembayaran Anda.`
                };
            case 'error':
            default:
                return {
                    icon: '❌', // Emoji atau <i className="bi bi-x-octagon-fill fs-1 text-danger"></i>
                    type: 'danger',
                    title: paymentStatus.message.includes("dibatalkan") ? 'Pesanan Dibatalkan' : 'Pembayaran Gagal/Kadaluarsa',
                    text: `${paymentStatus.message} (ID Pesanan: ${paymentStatus.orderId})`
                };
        }
    };

    const { icon, type, title, text } = getStatusInfo();

    return (
        <div className="payment-finish-container">
            <div className="payment-card">

{/* === TAMPILKAN PESAN ALERT KUSTOM (jika ada) === */}
                 {message.text && (
                    <div className={`
                            p-3 mb-4 rounded text-center
                            ${message.type === 'success' ? 'bg-success-subtle text-success-emphasis' : ''}
                            ${message.type === 'error' ? 'bg-danger-subtle text-danger-emphasis fw-semibold' : ''}
                            ${message.type === 'warning' ? 'bg-warning-subtle text-warning-emphasis fw-semibold' : ''}
                            ${message.type === 'info' ? 'bg-primary-subtle text-primary-emphasis' : ''}
                            position-relative small {/* Buat pesan ini lebih kecil */}
                        `}
                        role="alert">
                        {/* Ikon */}
                        {message.type === 'success' && <i className="bi bi-check-circle-fill me-2"></i>}
                        {message.type === 'error' && <i className="bi bi-exclamation-triangle-fill me-2"></i>}
                        {message.type === 'warning' && <i className="bi bi-exclamation-triangle-fill me-2"></i>}
                        {message.type === 'info' && <i className="bi bi-info-circle-fill me-2"></i>}
                        {message.text}
                        <button type="button" className="btn-close position-absolute top-0 end-0 p-2 me-1 mt-1" onClick={() => setMessage({ text: null, type: 'info' })} aria-label="Close" style={{ fontSize: '0.65rem' }}></button>
                    </div>
                 )}

                {/* === PESAN STATUS (GAYA BARU) === */}
                <div className={`
                        p-3 mb-4 rounded text-center
                        ${type === 'success' ? 'bg-success-subtle text-success-emphasis' : ''}
                        ${type === 'danger' ? 'bg-danger-subtle text-danger-emphasis fw-semibold' : ''}
                        ${type === 'warning' ? 'bg-warning-subtle text-warning-emphasis fw-semibold' : ''}
                        position-relative
                    `}
                    role="alert">

                    {/* Ikon */}
                    <div className="payment-icon" style={{ fontSize: '2.5rem', marginBottom: '10px' }}> {/* Perkecil ikon sedikit */}
                        {/* Ganti emoji dengan ikon jika diinginkan */}
                        {type === 'success' && <i className="bi bi-check-circle-fill text-success"></i>}
                        {type === 'danger' && <i className="bi bi-x-octagon-fill text-danger"></i>}
                        {type === 'warning' && <i className="bi bi-hourglass-split text-warning"></i>}
                    </div>

                    {/* Judul dan Teks Pesan */}
                    <h1 className="payment-title" style={{ fontSize: '1.5rem' }}>{title}</h1> {/* Perkecil judul */}
                    <p className="payment-text mb-0">{text}</p> {/* Hapus margin bawah teks */}

                    {/* Tombol close (opsional) */}
                    {/* <button
                        type="button"
                        className="btn-close position-absolute top-0 end-0 p-2 me-2 mt-1"
                        aria-label="Close"
                        style={{ fontSize: '0.75rem' }}
                        // onClick={() => {}} // Mungkin tidak perlu close di halaman finish?
                    ></button> */}
                </div>
                {bookingDetails && (
                    <div className="booking-details-summary"> {/* Kelas ini masih dari PaymentFinish.css */}
                        <h5 className="text-muted">Rincian Pesanan</h5>
                        <ul className="list-group list-group-flush">
                            <li className="list-group-item"><span>ID Booking</span><strong>#{bookingDetails.bookingCode}</strong></li>
                            <li className="list-group-item"><span>Nama Tamu</span><strong>{bookingDetails.guestName}</strong></li>
                            <li className="list-group-item"><span>Tipe Kamar</span><strong>{getRoomTypeName(bookingDetails.roomType)}</strong></li>
                            <li className="list-group-item"><span>Check-in</span><strong>{formatDate(bookingDetails.checkIn)}</strong></li>
                            <li className="list-group-item"><span>Check-out</span><strong>{formatDate(bookingDetails.checkOut)}</strong></li>
                            <li className="list-group-item bg-light">
                                <h6 className="mb-0 fw-bold">Total Pembayaran</h6>
                                <h5 className="mb-0 fw-bold text-primary">{formatCurrency(bookingDetails.total)}</h5>
                            </li>
                        </ul>
                    </div>
                )}

                {/* Tombol Aksi (di luar kotak pesan status) */}
                <div className="button-group"> {/* Kelas ini masih dari PaymentFinish.css */}
                    {paymentStatus.status === 'pending' ? (
                        <>
                            <button
                                onClick={handleResumePayment}
                                className="btn btn-primary fw-bold"
                                disabled={isRegenerating || isCancelling}
                            >
                                {isRegenerating ? (<><span className="spinner-border spinner-border-sm me-1"></span> Memuat...</>) : (<><i className="bi bi-credit-card me-1"></i> Lanjutkan Bayar</>)}
                            </button>
                            <button
                                onClick={handleCancelBookingClick}
                                className="btn btn-outline-danger"
                                disabled={isRegenerating || isCancelling}
                            >
                                {isCancelling ? (<><span className="spinner-border spinner-border-sm me-1"></span> Batal...</>) : (<><i className="bi bi-x-circle me-1"></i> Batalkan</>)}
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/" className="btn btn-primary"> <i className="bi bi-house-door me-1"></i> Ke Home </Link>
                            <Link to="/rooms/booking" className="btn btn-outline-secondary"> <i className="bi bi-calendar-plus me-1"></i> Booking Lagi </Link>
                        </>
                    )}
                </div>
            </div>
            <ConfirmationDialog
                show={showCancelConfirm}
                onClose={() => setShowCancelConfirm(false)}
                onConfirm={executeCancellation}
                title="Konfirmasi Pembatalan"
                message="Apakah Anda yakin ingin membatalkan pesanan ini?"
            />
        </div>
    );
};

export default PaymentFinish;