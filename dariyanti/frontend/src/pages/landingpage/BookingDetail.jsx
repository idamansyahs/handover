import React, { useState, useEffect } from 'react';
import { /*useLocation,*/ useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api';
import ConfirmationDialog from '../../components/ConfirmationDialog';

// Helper untuk format mata uang
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

// Helper untuk format tanggal
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString("id-ID", {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Objek untuk memetakan kode tipe kamar ke nama lengkapnya
const roomTypeMapping = {
  FBK: "Fhandika Boutique",
  FSKG: "Fhandika SS King",
  FSST: "Fhandika SS Twin",
  DXQ: "Fhandika DXQ",
};

// Fungsi untuk mendapatkan nama lengkap, dengan fallback jika kode tidak ditemukan
const getRoomTypeName = (typeCode) => {
  return roomTypeMapping[typeCode] || typeCode; // Jika tidak ada di map, tampilkan kode aslinya
};

// Komponen BookingDetail
const BookingDetail = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(0);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [message, setMessage] = useState({ text: null, type: 'info' });

  // Fungsi untuk memproses pembayaran
    const processPayment = async () => {
        if (!booking || isPaying) return; // cegah double click
        setIsPaying(true);
        setMessage({ text: null, type: 'info' });

        try {
            const response = await api.post('/api/booking/pembayaran', {
                bookingId: booking.id
            });

            const transactionToken = response.data.token;

           if (transactionToken) {
          window.snap.pay(transactionToken, {
          onSuccess: function (result) {
                setPaymentCompleted(true);
                setIsPaying(false);
            },
            onPending: function (result) {
                console.log('Pembayaran Pending:', result);
                setMessage({ text: 'Pembayaran Anda tertunda. Anda akan dialihkan...', type: 'info' });
                setTimeout(() => {
                navigate(`/payment-finish?order_id=${result.order_id}&status_code=${result.status_code}&transaction_status=${result.transaction_status}`);
            }, 1500);
                setIsPaying(false);
            },
            onError: function (result) {
                console.log('Pembayaran Gagal:', result);
                setMessage({ text: 'Pembayaran Gagal. Anda akan dialihkan...', type: 'error' });
                setTimeout(() => {
                navigate(`/payment-finish?order_id=${result.order_id}&status_code=${result.status_code}&transaction_status=${result.transaction_status}`);
            }, 1500);
                setIsPaying(false);
            },
            onClose: function () {
                console.log('Jendela pembayaran ditutup oleh pengguna.');
                setMessage({ text: "Anda menutup jendela pembayaran. Selesaikan pembayaran sebelum waktu habis atau batalkan pesanan.", type: 'info' });
                setIsPaying(false);
            }
        });
      } else {
      throw new Error("Token transaksi tidak valid.");
    }
        } catch (error) {
            console.error("Gagal mendapatkan token pembayaran:", error);
            const errorMsg = error.response?.data?.error || ""; // e.g., "Status pesanan adalah: CANCELLED"
            
            if (errorMsg.includes("Status pesanan adalah: CONFIRMED")) {
                setMessage({ text: 'Pesanan ini sudah dikonfirmasi. Menampilkan halaman sukses...', type: 'success' });
                setPaymentCompleted(true); // Ini memicu judul "Pembayaran Berhasil!"
            } else if (errorMsg.includes("Status pesanan adalah: CANCELLED") || errorMsg.includes("Status pesanan adalah: CONFIRMED")) {
                setMessage({ text: 'Pesanan ini telah dibatalkan atau selesai dan tidak bisa diproses.', type: 'error' });
                setBooking(prev => ({ ...prev, status: 'CANCELLED' })); 
            } else {
                setMessage({ text: 'Gagal memulai sesi pembayaran. Silakan coba lagi.', type: 'error' });
            }
            setIsPaying(false);
            // Tampilkan pesan error kepada user
        }
    };

    // Fungsi yang dipanggil tombol "Batalkan Pesanan"
  const handleCancelBookingClick = () => {
    setMessage({ text: null, type: 'info' }); // Reset pesan error/sukses sebelumnya
    setShowCancelConfirm(true); // <-- Tampilkan modal konfirmasi
  };

  // Fungsi yang dijalankan JIKA pengguna konfirmasi di modal
  const executeCancellation = async () => {
    // Logika pembatalan dipindahkan ke sini (tanpa konfirmasi lagi)
    setIsCancelling(true);
    try {
      await api.put(`/api/booking-user/${bookingId}/cancel`);
      setMessage({ text: "Pesanan Anda telah berhasil dibatalkan.", type: 'success' });
      // Redirect setelah delay
      setTimeout(() => navigate('/rooms/booking'), 1500);
      setBooking(prev => ({ ...prev, status: 'CANCELLED' })); // Update status di UI
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Gagal membatalkan pesanan.";
      setMessage({ text: `Gagal membatalkan pesanan: ${errorMessage}`, type: 'error' });
      console.error("Gagal membatalkan:", err);
    } finally {
      setIsCancelling(false);
    }
  };

  const startRedirectCountdown = (seconds) => {
    let timeLeft = seconds;
    setRedirectCountdown(timeLeft);

    const countdownInterval = setInterval(() => {
      timeLeft -= 1;
      setRedirectCountdown(timeLeft);

      if (timeLeft <= 0) {
        clearInterval(countdownInterval);
        navigate("/");
      }
    }, 1000);
  };

  useEffect(() => {
    const fetchBookingData = async () => {
      try {
        const response = await api.get(`/api/booking-user/${bookingId}`);
        const bookingData = response.data;
        if (bookingData.status === 'CONFIRMED') {
            setPaymentCompleted(true);
            setBooking(bookingData);
        } else if (bookingData.status === 'PENDING') {
            setBooking(bookingData);
        } else {
            setError("Pesanan ini telah dibatalkan atau statusnya tidak valid.");
            startRedirectCountdown(7);
            return;
        }
      } catch (err) {
        setError("Gagal memuat detail pesanan atau pesanan tidak ditemukan.");
        console.error(err);
        startRedirectCountdown(7);
      } finally {
        setLoading(false);
      }
    };

    if (bookingId) {
      fetchBookingData();
    }
  }, [bookingId, navigate]);

  
  if (loading) {
    return (
        <div className="container-xxl py-5 text-center">
            <div className="spinner-border text-primary" role="status" style={{width: '3rem', height: '3rem'}}>
                <span className="visually-hidden">Memuat...</span>
            </div>
            <h4 className="mt-3">Memuat Detail Pesanan...</h4>
        </div>
    );
  }
  if (error) {
  return (
    <div className="alert alert-danger text-center my-5">
      <p>{error}</p>
      {redirectCountdown > 0 && (
        <p>
          Anda akan dialihkan ke halaman utama dalam{" "}
          <strong>{redirectCountdown}</strong> detik...
        </p>
      )}
    </div>
  );
}
  if (!booking) {
    return <div className="text-center my-5"><h2>Detail Pesanan Tidak Ditemukan.</h2></div>;
  }

  // Hitung durasi setelah data 'booking' ada
  const checkInDate = new Date(booking.checkIn);
  const checkOutDate = new Date(booking.checkOut);
  const duration = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)) || 1;

  return (
    <div className="container-xxl py-5 wow fadeInUp" data-wow-delay="0.1s">
      <div className="container">
        {/* Judul Halaman */}
        
        {message.text && (
          <div className={`
                p-3 mb-4 rounded text-center
                ${message.type === 'success' ? 'bg-success-subtle text-success-emphasis' : ''}
                ${message.type === 'error' ? 'bg-danger-subtle text-danger-emphasis fw-semibold' : ''}
                ${message.type === 'warning' ? 'bg-warning-subtle text-warning-emphasis fw-semibold' : ''}
                ${message.type === 'info' ? 'bg-primary-subtle text-primary-emphasis' : ''}
                position-relative
             `}
             role="alert"> {/* Tambahkan role="alert" untuk aksesibilitas */}

             {/* Ikon yang sesuai */}
             {message.type === 'success' && <i className="bi bi-check-circle-fill me-2"></i>}
             {message.type === 'error' && <i className="bi bi-exclamation-triangle-fill me-2"></i>}
             {message.type === 'warning' && <i className="bi bi-exclamation-triangle-fill me-2"></i>}
             {message.type === 'info' && <i className="bi bi-info-circle-fill me-2"></i>} {/* Atau ikon lain jika perlu */}

             {message.text}

             {/* Tombol close (opsional, disesuaikan) */}
             <button
               type="button"
               className="btn-close position-absolute top-0 end-0 p-2 me-2 mt-1" /* Posisi absolute */
               onClick={() => setMessage({ text: null, type: 'info' })}
               aria-label="Close"
               style={{ fontSize: '0.75rem' }} /* Perkecil ukuran tombol close */
             ></button>
          </div>
        )}

        <div className="text-center mb-5">
          {booking.status === 'CANCELLED' ? (
            <>
              <h5 className="section-title ff-secondary text-center text-danger fw-normal">Dibatalkan</h5>
              <h1 className="fw-bold text-danger mb-3"><i className="bi bi-x-circle-fill me-2"></i>Pesanan Dibatalkan</h1>
              <p className="text-muted fs-5">
                Pesanan ini telah dibatalkan dan tidak dapat diproses lagi.
              </p>
            </>
          ) : paymentCompleted ? (
            <>
              <h5 className="section-title ff-secondary text-center text-primary fw-normal">Sukses</h5>
              <h1 className="fw-bold text-success mb-3"><i className="bi bi-check-circle-fill me-2"></i>Pembayaran Berhasil!</h1>
              <p className="text-muted fs-5">
                Terima kasih! Pesanan Anda telah kami terima dan akan segera diproses.
              </p>
            </>
          ) : (
            <>
              <h5 className="section-title ff-secondary text-center text-primary fw-normal">Pembayaran</h5>
              <h1 className="fw-bold mb-3">Selesaikan Pembayaran Anda</h1>
              <p className="text-muted fs-5">
                Pesanan Anda akan dikonfirmasi setelah pembayaran berhasil.
              </p>
            </>
          )}
        </div>

        <div className="row g-4 justify-content-center">
          <div className="col-lg-7 col-md-9"> {/* Sedikit lebih lebar */}
            {/* Card styling dari style.css */}
            <div className="card shadow-sm h-100">
               {/* Header Opsional */}
               {/* <div className="card-header bg-primary text-dark fw-bold">Detail Pesanan #{booking.bookingCode || booking.id}</div> */}
              <div className="card-body p-4">
                <ul className="list-group list-group-flush mb-4">
                  <li className="list-group-item d-flex justify-content-between px-0 py-2">
                    <span className="text-muted">ID Booking</span>
                    <strong className="text-dark">#{booking.bookingCode || booking.id}</strong>
                  </li>
                  <li className="list-group-item d-flex justify-content-between px-0 py-2">
                    <span className="text-muted">Nama Pemesan</span>
                    <strong className="text-dark">{booking.guestName}</strong>
                  </li>
                  <li className="list-group-item d-flex justify-content-between px-0 py-2">
                    <span className="text-muted">Phone</span>
                    <strong className="text-dark">{booking.phone}</strong>
                  </li>
                  <li className="list-group-item d-flex justify-content-between px-0 py-2">
                    <span className="text-muted">Email</span>
                    <strong className="text-dark">{booking.email}</strong>
                  </li>
                  <li className="list-group-item d-flex justify-content-between px-0 py-2">
                    <span className="text-muted">Tipe Kamar</span>
                    <strong className="text-dark">{getRoomTypeName(booking.roomType)}</strong>
                  </li>
                  <li className="list-group-item d-flex justify-content-between px-0 py-2">
                    <span className="text-muted">Check-in</span>
                    <strong className="text-dark">{formatDate(booking.checkIn)}</strong>
                  </li>
                  <li className="list-group-item d-flex justify-content-between px-0 py-2">
                    <span className="text-muted">Check-out</span>
                    <strong className="text-dark">{formatDate(booking.checkOut)}</strong>
                  </li>
                   <li className="list-group-item d-flex justify-content-between px-0 py-2">
                    <span className="text-muted">Durasi</span>
                    <strong className="text-dark">
                      {`${duration} malam (@${formatCurrency(booking.pricePerNight)}/malam)`}
                    </strong>
                  </li>
                </ul>
                {/* <hr /> */}
                {/* Total Pembayaran */}
                <div className="d-flex justify-content-between align-items-center mt-3 p-3 bg-light rounded"> {/* Latar terang untuk total */}
                  <h5 className="mb-0 fw-bold">Total Pembayaran</h5>
                  <h4 className="mb-0 fw-bold text-primary"> {/* Warna primer untuk total */}
                    {formatCurrency(booking.total)}
                  </h4>
                </div>
                {/* Tombol Aksi */}
                <div className="d-flex justify-content-center align-items-center gap-3 mt-4 pt-3">
                  {booking?.status === 'PENDING' && !paymentCompleted ? (
                      <>
                          <button
                            onClick={handleCancelBookingClick}
                            className="btn btn-outline-danger py-2 px-4"
                            disabled={isCancelling || isPaying}
                          >
                            {isCancelling ? (<><span className="spinner-border spinner-border-sm"></span> Batal...</>) : (<><i className="bi bi-x-circle me-1"></i> Batalkan</>)}
                          </button>
                          <button
                            onClick={processPayment}
                            className="btn btn-primary btn-lg py-2 px-4"
                            disabled={isCancelling || isPaying}
                          >
                            {isPaying ? (<><span className="spinner-border spinner-border-sm"></span> Proses...</>) : (<><i className="bi bi-credit-card me-1"></i> Bayar Sekarang</>)}
                          </button>
                      </>
                  ) : ( // Jika sudah dibayar atau dibatalkan
                       <>
                          <Link to="/" className="btn btn-primary py-2 px-4">
                             <i className="bi bi-house-door me-1"></i> Kembali ke Home
                          </Link>
                          <Link to="/rooms/booking" className="btn btn-outline-secondary py-2 px-4">
                             <i className="bi bi-calendar-plus me-1"></i> Booking Lagi
                          </Link>
                      </>
                  )}
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ConfirmationDialog
        show={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)} // Sembunyikan modal saat ditutup
        onConfirm={executeCancellation} // Jalankan pembatalan saat dikonfirmasi
        title="Konfirmasi Pembatalan"
        message="Apakah Anda yakin ingin membatalkan pesanan ini?"
      />
    </div>
  );
}

export default BookingDetail;