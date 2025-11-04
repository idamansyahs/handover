import React, { useEffect, useState } from "react";
import api from "../api";
import ConfirmationDialog from "../components/ConfirmationDialog";

// Impor komponen React-Bootstrap
import { Modal, Button, Form, Pagination } from "react-bootstrap";

// Reusable Badge
const StatusBadge = ({ status }) => {
  const colors = {
    PENDING: "warning",
    CONFIRMED: "success",
    CHECKED_IN: "info",
    CHECKED_OUT: "secondary",
    CANCELLED: "danger",
  };
  const textContrast = {
      PENDING: "dark",
      CONFIRMED: "white",
      CHECKED_IN: "dark",
      CHECKED_OUT: "white",
      CANCELLED: "white",
  }
  return <span className={`badge rounded-pill bg-${colors[status]} text-${textContrast[status]}`}>{status}</span>;
};

// Reusable Status Select
const StatusSelect = ({ value, onChange }) => (
  <select className="form-select form-select-sm mt-1" value={value} onChange={onChange}>
    {["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"].map((s) => (
      <option key={s} value={s}>
        {s}
      </option>
    ))}
  </select>
);

// 🔹 KOMPONEN BARU UNTUK PAYMENT STATUS (DIPERBAIKI)
const PaymentStatusBadge = ({ status }) => {
  if (!status) {
    return <span className="badge rounded-pill bg-secondary text-white">N/A</span>;
  }

  const displayStatus = status.toUpperCase();
  let color = "secondary";
  let text = "white";

  switch (displayStatus) {
    case "PAID":
    case "SETTLEMENT":
    case "SUCCESS":
      color = "success";
      text = "white";
      break;
    case "PENDING":
      color = "warning";
      text = "dark";
      break;
    case "FAILED":
    case "EXPIRE":
    case "CANCEL":
      color = "danger";
      text = "white";
      break;
    default:
      color = "secondary";
      text = "white";
  }

  return <span className={`badge rounded-pill bg-${color} text-${text}`}>{displayStatus}</span>;
};


const BookingAdmin = () => {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null);

  // --- State untuk Modal ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const [hasChecked, setHasChecked] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState(null);

  const [message, setMessage] = useState({ text: null, type: 'info' });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Tampilkan 10 item per halaman

  // --- Handler Modal Add ---
  const handleCloseAdd = () => setShowAddModal(false);
  const handleShowAdd = () => {
    setNewBooking({
      guestName: "", email: "", phone: "", notes: "",
      checkIn: "", checkOut: "", roomId: "", roomType: "",
      nights: 0, pricePerNight: 0, total: 0,
    });
    setAvailableRooms([]);
    setHasChecked(false);
    setShowAddModal(true);
  };

  // --- Handler Modal Assign ---
  const handleCloseAssign = () => {
    setShowAssignModal(false);
    setSelectedBooking(null);
    setSelectedRoomId(null);
  };
  const handleShowAssign = (booking) => {
    setSelectedBooking(booking);
    setSelectedRoomId(null);
    setShowAssignModal(true);
  };

  const [newBooking, setNewBooking] = useState({
    guestName: "", email: "", phone: "", notes: "",
    checkIn: "", checkOut: "", roomId: "", roomType: "",
    nights: 0, pricePerNight: 0, total: 0,
  });

  const token = localStorage.getItem("token");

  // --- FETCHING DATA ---
  useEffect(() => {
    fetchRooms();
    fetchBookings();
  }, []); 

  useEffect(() => {
    const newTotalPages = Math.ceil(bookings.length / itemsPerPage);
    if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
    }
    // Jika bookings kosong, reset ke halaman 1
    if (newTotalPages === 0) {
        setCurrentPage(1);
    }
  }, [bookings, currentPage, itemsPerPage]);

  const fetchRooms = async () => {
    try {
      const res = await api.get("/api/room", { headers: { Authorization: `Bearer ${token}` } });
      setRooms(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await api.get("/api/booking", { headers: { Authorization: `Bearer ${token}` } });
      const sortedBookings = res.data.sort((a, b) => b.id - a.id);
      setBookings(sortedBookings);
    } catch (err) {
      console.error(err);
    }
  };

  // --- HELPER ---
  const calculateNightsAndTotal = (bookingData) => {
    let nights = 0;
    let total = 0;
    if (bookingData.checkIn && bookingData.checkOut) {
      const start = new Date(bookingData.checkIn);
      const end = new Date(bookingData.checkOut);
      const diffTime = Math.abs(end - start);
      nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    if (nights <= 0) nights = 1; 
    if (bookingData.pricePerNight && nights > 0) total = nights * bookingData.pricePerNight;
    return { nights, total };
  };

  // --- LOGIKA FORM BOOKING ---

  const resetAvailability = () => {
    setAvailableRooms([]);
    setHasChecked(false);
    return {
      roomId: "",
      pricePerNight: 0,
      nights: 0,
      total: 0,
    };
  };

  const handleRoomTypeChange = (e) => {
    setNewBooking({
      ...newBooking,
      roomType: e.target.value,
      ...resetAvailability(), 
    });
  };

  const handleCheckInChange = (e) => {
    const newCheckIn = e.target.value;
    let newCheckOut = newBooking.checkOut;
    if (newCheckOut && new Date(newCheckIn) >= new Date(newCheckOut)) {
      newCheckOut = "";
    }
    setNewBooking({
      ...newBooking,
      checkIn: newCheckIn,
      checkOut: newCheckOut,
      ...resetAvailability(),
    });
  };

  const handleCheckOutChange = (e) => {
    setNewBooking({
      ...newBooking,
      checkOut: e.target.value,
      ...resetAvailability(),
    });
  };

  const getMinCheckOutDate = () => {
    if (!newBooking.checkIn) return '';
    const checkInDate = new Date(newBooking.checkIn);
    checkInDate.setDate(checkInDate.getDate() + 1);
    return checkInDate.toISOString().split('T')[0];
  };

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };
  
  // --- END LOGIKA FORM ---


  // --- CRUD ---
  const handleCreateBooking = async () => {
    if (!newBooking.guestName || !newBooking.email || !newBooking.phone) {
      // 🔹 Ganti alert dengan message
      setMessage({ text: 'Guest Name, Email, dan Phone wajib diisi.', type: 'error' });
      return;
    }
    if (!newBooking.roomId) {
      // 🔹 Ganti alert dengan message
      setMessage({ text: 'Anda harus memilih kamar terlebih dahulu.', type: 'error' });
      return;
    }
    
    try {
      const { nights, total } = calculateNightsAndTotal(newBooking);
      const payload = { ...newBooking, nights, total };
      await api.post("/api/booking", payload, { headers: { Authorization: `Bearer ${token}` } });
      handleCloseAdd(); 
      fetchBookings();
      fetchRooms();
      // 🔹 Tambah pesan sukses
      setMessage({ text: 'Booking berhasil ditambahkan!', type: 'success' });
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
      // 🔹 Ganti alert dengan message
      const errorMsg = err.response?.data?.message || err.message;
      setMessage({ text: `Gagal menyimpan booking: ${errorMsg}`, type: 'error' });
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.put(`/api/booking/${id}/status`, { status }, { headers: { Authorization: `Bearer ${token}` } });
      fetchBookings();
      fetchRooms();
      setMessage({ text: 'Status booking berhasil diperbarui.', type: 'success' });
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || err.message;
      setMessage({ text: `Gagal memperbarui status: ${errorMsg}`, type: 'error' });
    }
  };

  const handleDeleteClick = (id) => {
    setBookingToDelete(id);
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setBookingToDelete(null);
    setShowDeleteModal(false);
  };

  const executeDeleteBooking = async () => {
    if (!bookingToDelete) return;
    try {
      await api.delete(`/api/booking/${bookingToDelete}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchBookings();
      fetchRooms();
      // 🔹 Tambah pesan sukses
      setMessage({ text: 'Booking berhasil dihapus.', type: 'success' });
    } catch (err) {
      console.error(err);
      // 🔹 Tambah pesan error
      const errorMsg = err.response?.data?.message || err.message;
      setMessage({ text: `Gagal menghapus booking: ${errorMsg}`, type: 'error' });
    } finally {
      handleCloseDeleteModal();
    }
  };

  const checkAvailability = async () => {
    if (!newBooking.roomType || !newBooking.checkIn || !newBooking.checkOut) {
      alert("Pilih Room Type, Check-In, dan Check-Out dulu!");
      return;
    }
    try {
      const res = await api.get("/api/available", {
        params: {
          type: newBooking.roomType,
          checkIn: newBooking.checkIn,
          checkOut: newBooking.checkOut,
        },
        headers: { Authorization: `Bearer ${token}` },
      });
      setAvailableRooms(res.data);
    } catch (err) {
      console.error(err);
      setAvailableRooms([]);
    } finally {
      setHasChecked(true);
    }
  };

  const handleUpdateRoom = async () => {
    if (!selectedBooking || !selectedRoomId) return;
    const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
    const { nights, total } = calculateNightsAndTotal({
      checkIn: selectedBooking.checkIn,
      checkOut: selectedBooking.checkOut,
      pricePerNight: selectedRoom?.price || 0,
    });
    try {
      await api.put(
        `/api/booking/${selectedBooking.id}`,
        {
          roomId: selectedRoomId,
          roomType: selectedRoom?.type || selectedBooking.roomType,
          pricePerNight: selectedRoom?.price || 0,
          nights,
          total,
          status: "CONFIRMED" 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      handleCloseAssign();
      fetchBookings();
      fetchRooms();
      setMessage({ text: 'Kamar berhasil di-assign ke booking.', type: 'success' });
    } catch (err) {
       console.error(err);
       const errorMsg = err.response?.data?.message || err.message;
       setMessage({ text: `Gagal assign kamar: ${errorMsg}`, type: 'error' });
    }
  };

  // 🔹 BARU: --- Logika Paginasi ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBookings = bookings.slice(indexOfFirstItem, indexOfLastItem); // Gunakan data yang sudah di-slice
  const totalPages = Math.ceil(bookings.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
      setCurrentPage(pageNumber);
  };
  
  // 🔹 BARU: Helper untuk render item paginasi
  const renderPaginationItems = () => {
    let items = [];
    const maxPagesToShow = 5; // Tampilkan 5 tombol halaman (misal: ... 3, 4, 5, 6, 7 ...)
    let startPage, endPage;

    if (totalPages <= maxPagesToShow) {
        startPage = 1;
        endPage = totalPages;
    } else {
        const maxPagesBeforeCurrent = Math.floor(maxPagesToShow / 2);
        const maxPagesAfterCurrent = Math.ceil(maxPagesToShow / 2) - 1;

        if (currentPage <= maxPagesBeforeCurrent) {
            startPage = 1;
            endPage = maxPagesToShow;
        } else if (currentPage + maxPagesAfterCurrent >= totalPages) {
            startPage = totalPages - maxPagesToShow + 1;
            endPage = totalPages;
        } else {
            startPage = currentPage - maxPagesBeforeCurrent;
            endPage = currentPage + maxPagesAfterCurrent;
        }
    }
    
    // Tombol "Halaman 1" & "..." di awal
    if (startPage > 1) {
        items.push(<Pagination.Item key={1} onClick={() => handlePageChange(1)}>{1}</Pagination.Item>);
        if (startPage > 2) {
            items.push(<Pagination.Ellipsis key="start-ellipsis" disabled />);
        }
    }

    // Tombol halaman (misal: 3, 4, 5)
    for (let number = startPage; number <= endPage; number++) {
        items.push(
            <Pagination.Item key={number} active={number === currentPage} onClick={() => handlePageChange(number)}>
                {number}
            </Pagination.Item>
        );
    }

    // Tombol "Halaman Terakhir" & "..." di akhir
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            items.push(<Pagination.Ellipsis key="end-ellipsis" disabled />);
        }
        items.push(<Pagination.Item key={totalPages} onClick={() => handlePageChange(totalPages)}>{totalPages}</Pagination.Item>);
    }

    return items;
  };

  // --- UI ---
  return (
      <div className="container-fluid py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="h3 mb-0 fw-bold text-dark">Booking Management</h1>
          <Button variant="primary" className="shadow-sm" onClick={handleShowAdd}>
            <i className="bi bi-plus-circle me-1"></i> Add Booking
          </Button>
        </div>

        {message.text && (
          <div className={`
                alert
                ${message.type === 'success' ? 'alert-success' : ''}
                ${message.type === 'error' ? 'alert-danger' : ''}
                ${message.type === 'info' ? 'alert-info' : ''}
                ${message.type === 'warning' ? 'alert-warning' : ''}
                alert-dismissible fade show
             `}
             role="alert">
             {message.text}
             <button
               type="button"
               className="btn-close"
               onClick={() => setMessage({ text: null, type: 'info' })}
               aria-label="Close"
             ></button>
          </div>
        )}

        {/* Card Tabel Booking */}
        <div className="card shadow-sm mb-4">
            <div className="card-header py-3 bg-light border-0 d-flex justify-content-between align-items-center">
                <h6 className="m-0 fw-bold text-primary">Current Bookings</h6>
            </div>
            <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-dark">
                      <tr>
                        <th>No</th>
                        <th>Guest</th>
                        <th>Contact</th>
                        <th>Room Type</th>
                        <th>Room#</th>
                        <th>Check-In</th>
                        <th>Check-Out</th>
                        <th>Nights</th>
                        <th>Total</th>
                        <th>Payment</th>
                        <th>Status</th>
                        <th>Notes</th>
                        <th className="text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.length > 0 ? (
                        currentBookings.map((b) => (
                        <tr key={b.id}>
                          <td class="text-center">{bookings.indexOf(b) + 1}</td>
                          <td className="fw-semibold">{b.guestName}</td>
                          <td>
                            <small className="d-block">{b.email}</small>
                            <small className="d-block text-muted">{b.phone}</small>
                          </td>
                          <td>{b.roomType}</td>
                          <td className="text-center">{b.room ? b.room.roomNumber : "-"}</td>
                          <td>{new Date(b.checkIn).toLocaleDateString('id-ID')}</td>
                          <td>{new Date(b.checkOut).toLocaleDateString('id-ID')}</td>
                          <td className="text-center">{b.nights}</td>
                          <td className="fw-bold text-success">Rp {Number(b.total || 0).toLocaleString('id-ID')}</td>
                          
                          <td>
                            <PaymentStatusBadge status={b.payment_status} />
                          </td>
                          
                          <td>
                            <div className="d-flex flex-column align-items-start">
                                <StatusBadge status={b.status} />
                                <StatusSelect value={b.status} onChange={(e) => handleUpdateStatus(b.id, e.target.value)} />
                            </div>
                          </td>
                          <td className="text-truncate" style={{maxWidth: '150px'}} title={b.notes}>{b.notes}</td>
                          <td className="align-middle text-center">
                            <div className='d-flex justify-content-center align-items-center gap-2 h-100'>
                            {!b.roomId && b.status !== 'CANCELLED' && (
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="me-1"
                                onClick={() => handleShowAssign(b)}
                                title="Assign Room"
                              >
                                <i className="bi bi-key-fill"></i>
                              </Button>
                            )}
                            <Button variant="outline-danger" size="sm" onClick={() => handleDeleteClick(b.id)} title="Delete Booking">
                              <i className="bi bi-trash"></i>
                            </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                      ) : (
                        <tr>
                            <td colSpan="12" className="text-center text-muted p-4">No bookings found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
            </div>
            {totalPages > 1 && (
                <div className="card-footer bg-light border-0 py-2">
                    <div className="d-flex justify-content-between align-items-center">
                        {/* Kiri: Info & Items per Page */}
                        <div className="d-flex align-items-center">
                            <Form.Select 
                                size="sm" 
                                value={itemsPerPage} 
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1); // Reset ke halaman 1
                                }}
                                style={{ width: '75px' }}
                                className="me-3"
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </Form.Select>
                            <small className="text-muted">
                                Page {currentPage} of {totalPages} (Total: {bookings.length} bookings)
                            </small>
                        </div>
                        
                        {/* Kanan: Kontrol Paginasi */}
                        <Pagination className="mb-0">
                            <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
                            <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
                            
                            {/* Render tombol halaman */}
                            {renderPaginationItems()} 

                            <Pagination.Next onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />
                            <Pagination.Last onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} />
                        </Pagination>
                    </div>
                </div>
            )}
        </div>

        {/* Modal Create Booking (React-Bootstrap) */}
        <Modal 
          show={showAddModal} 
          onHide={handleCloseAdd} 
          size="lg" 
          centered 
          contentClassName="shadow-lg"
        >
          <Modal.Header closeButton className="bg-primary text-dark">
            <Modal.Title className="fw-bold">➕ Add New Booking</Modal.Title>
          </Modal.Header>
          <Form onSubmit={(e) => { e.preventDefault(); handleCreateBooking(); }}>
            <Modal.Body>
              <div className="row g-3">
                    {/* Form Input Guest */}
                    <div className="col-md-6">
                      <Form.Group>
                        <Form.Label>Guest Name</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Nama Tamu"
                          value={newBooking.guestName}
                          onChange={(e) => setNewBooking({ ...newBooking, guestName: e.target.value })}
                          required
                        />
                      </Form.Group>
                    </div>
                    <div className="col-md-6">
                      <Form.Group>
                        <Form.Label>Email</Form.Label>
                        <Form.Control
                          type="email"
                          placeholder="email@tamu.com"
                          value={newBooking.email}
                          onChange={(e) => setNewBooking({ ...newBooking, email: e.target.value })}
                          required
                        />
                      </Form.Group>
                    </div>
                    <div className="col-md-6">
                      <Form.Group>
                        <Form.Label>Phone</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Nomor Telepon"
                          value={newBooking.phone}
                          onChange={(e) => setNewBooking({ ...newBooking, phone: e.target.value })}
                          required
                        />
                      </Form.Group>
                    </div>
                    <div className="col-md-6">
                      <Form.Group>
                        <Form.Label>Notes</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Catatan (opsional)"
                          value={newBooking.notes}
                          onChange={(e) => setNewBooking({ ...newBooking, notes: e.target.value })}
                        />
                      </Form.Group>
                    </div>
                    
                    {/* --- FORM DENGAN LOGIKA BARU --- */}
                    <div className="col-md-6">
                      <Form.Group>
                        <Form.Label>Room Type</Form.Label>
                        <Form.Select
                          value={newBooking.roomType}
                          onChange={handleRoomTypeChange}
                          required
                        >
                          <option value="" disabled>-- Select Type --</option>
                          <option value="FBK">BOUTIQUE</option>
                          <option value="FSKG">SS KING</option>
                          <option value="FSST">SS TWIN</option>
                          <option value="DXQ">DXQ</option>
                        </Form.Select>
                      </Form.Group>
                    </div>
                    <div className="col-md-3">
                      <Form.Group>
                        <Form.Label>Check In</Form.Label>
                        <Form.Control
                          type="date"
                          value={newBooking.checkIn}
                          onChange={handleCheckInChange}
                          min={getTodayDate()}
                          required
                        />
                      </Form.Group>
                    </div>
                    <div className="col-md-3">
                      <Form.Group>
                        <Form.Label>Check Out</Form.Label>
                        <Form.Control
                          type="date"
                          value={newBooking.checkOut}
                          onChange={handleCheckOutChange}
                          min={getMinCheckOutDate()}
                          disabled={!newBooking.checkIn}
                          required
                        />
                      </Form.Group>
                    </div>
                    {/* --- END FORM LOGIKA BARU --- */}
                    
                    <div className="col-12">
                      <Button 
                        variant="outline-primary" 
                        className="w-100" 
                        onClick={checkAvailability} 
                        disabled={!newBooking.roomType || !newBooking.checkIn || !newBooking.checkOut}
                        >
                        <i className="bi bi-search me-1"></i> Check Available Rooms
                      </Button>
                    </div>
                    
                    {/* Tampilkan jika ada hasil */}
                    {availableRooms.length > 0 && (
                      <div className="col-12">
                        <Form.Group>
                          <Form.Label>Available Rooms</Form.Label>
                          <Form.Select
                            value={newBooking.roomId}
                            onChange={(e) => {
                              const selected = availableRooms.find((r) => r.id === Number(e.target.value));
                              const updated = {
                                ...newBooking,
                                roomId: e.target.value,
                                roomType: selected ? selected.type : newBooking.roomType,
                                pricePerNight: selected ? selected.price : newBooking.pricePerNight,
                              };
                              const { nights, total } = calculateNightsAndTotal(updated);
                              setNewBooking({ ...updated, nights, total });
                            }}
                            required
                          >
                            <option value="" disabled>-- Select Room --</option>
                            {availableRooms.map((r) => (
                              <option key={r.id} value={r.id}>
                                Room {r.roomNumber} - {r.type} (Rp {Number(r.price).toLocaleString('id-ID')})
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </div>
                    )}

                    {/* LOGIKA PESAN DIPERBAIKI */}
                    {hasChecked && availableRooms.length === 0 && (
                        <div className="col-12">
                            <div className="alert alert-warning mt-2 small">
                              No rooms available for the selected type and dates.
                            </div>
                        </div>
                    )}

                    {/* Info Harga */}
                    <div className="col-md-4">
                      <Form.Group>
                          <Form.Label>Price/Night</Form.Label>
                          <Form.Control type="text" value={newBooking.pricePerNight ? `Rp ${Number(newBooking.pricePerNight).toLocaleString('id-ID')}` : ""} readOnly />
                      </Form.Group>
                    </div>
                    <div className="col-md-4">
                      <Form.Group>
                          <Form.Label>Nights</Form.Label>
                          <Form.Control type="number" value={calculateNightsAndTotal(newBooking).nights || 0} readOnly />
                      </Form.Group>
                    </div>
                    <div className="col-md-4">
                      <Form.Group>
                          <Form.Label>Total</Form.Label>
                          <Form.Control type="text" value={calculateNightsAndTotal(newBooking).total ? `Rp ${Number(calculateNightsAndTotal(newBooking).total).toLocaleString('id-ID')}` : "Rp 0"} readOnly />
                      </Form.Group>
                    </div>
              </div>
            </Modal.Body>
            <Modal.Footer className="border-0">
              <Button variant="secondary" onClick={handleCloseAdd}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                type="submit" 
                disabled={!newBooking.roomId}
              >
                <i className="bi bi-save me-1"></i> Save Booking
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* Modal Assign Room (React-Bootstrap) */}
        <Modal 
          show={showAssignModal} 
          onHide={handleCloseAssign} 
          centered 
          contentClassName="shadow-lg"
        >
          <Modal.Header closeButton className="bg-primary text-dark">
            <Modal.Title className="fw-bold">🛏 Assign Room</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedBooking && (
              <div>
                <p className="mb-2">
                  Assign room for: <strong className="text-primary">{selectedBooking.guestName}</strong>
                </p>
                <p className="mb-3">
                  Booking: <small className="text-muted">#{selectedBooking.id} ({selectedBooking.roomType}, {new Date(selectedBooking.checkIn).toLocaleDateString('id-ID')} - {new Date(selectedBooking.checkOut).toLocaleDateString('id-ID')})</small>
                </p>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Available Rooms ({selectedBooking.roomType})</Form.Label>
                  <Form.Select
                    value={selectedRoomId || ""}
                    onChange={(e) => setSelectedRoomId(Number(e.target.value))}
                    required
                  >
                    <option value="" disabled>-- Select Room --</option>
                    {rooms
                      .filter(
                        (r) =>
                          r.type === selectedBooking.roomType &&
                          (r.status === "VCI" || r.status === "VCN")
                      )
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          Room {r.roomNumber} (Rp {Number(r.price).toLocaleString('id-ID')}) - Status: {r.status}
                        </option>
                      ))}
                   </Form.Select>
                   {rooms.filter(r => r.type === selectedBooking.roomType && (r.status === "VCI" || r.status === "VCN")).length === 0 && (
                        <div className="alert alert-warning mt-2 small">No vacant clean rooms found for type {selectedBooking.roomType}.</div>
                   )}
                </Form.Group>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button variant="secondary" onClick={handleCloseAssign}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUpdateRoom} disabled={!selectedRoomId}>
             <i className="bi bi-check-lg me-1"></i> Save Assignment
            </Button>
          </Modal.Footer>
        </Modal>
        <ConfirmationDialog
          show={showDeleteModal}
          onClose={handleCloseDeleteModal}
          onConfirm={executeDeleteBooking}
          title="Konfirmasi Hapus Booking"
          message="Apakah Anda yakin ingin menghapus booking ini?"
          confirmText="Ya, Hapus"
          cancelText="Batal"
        />
      </div>
  );
};

export default BookingAdmin;