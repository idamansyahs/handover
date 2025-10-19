import React, { useEffect, useState } from "react";
import api from "../api";
import Layout from "../components/Layout";

// 🔹 Reusable Badge
const StatusBadge = ({ status }) => {
  const colors = {
    PENDING: "warning", // Kuning untuk pending
    CONFIRMED: "success", // Hijau untuk confirmed
    CHECKED_IN: "info",   // Biru muda untuk check-in
    CHECKED_OUT: "secondary", // Abu-abu untuk check-out
    CANCELLED: "danger",  // Merah untuk cancelled
  };
  const textContrast = { // Tentukan warna teks untuk kontras
      PENDING: "dark",
      CONFIRMED: "white",
      CHECKED_IN: "dark",
      CHECKED_OUT: "white",
      CANCELLED: "white",
  }

  return <span className={`badge rounded-pill bg-${colors[status]} text-${textContrast[status]}`}>{status}</span>;
};

// 🔹 Reusable Status Select
const StatusSelect = ({ value, onChange }) => (
  <select className="form-select form-select-sm mt-1" value={value} onChange={onChange}>
    {["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"].map((s) => (
      <option key={s} value={s}>
        {s}
      </option>
    ))}
  </select>
);

const BookingAdmin = () => {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [newBooking, setNewBooking] = useState({
    guestName: "",
    email: "",
    phone: "",
    notes: "",
    checkIn: "",
    checkOut: "",
    roomId: "",
    roomType: "",
    nights: 0,
    pricePerNight: 0,
    total: 0,
  });

  const token = localStorage.getItem("token");

  // --- FETCHING DATA ---
  useEffect(() => {
    fetchRooms();
    fetchBookings();
  }, );

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
      setBookings(res.data);
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
      nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    }

    if (bookingData.pricePerNight && nights > 0) total = nights * bookingData.pricePerNight;
    return { nights, total };
  };

  // --- CRUD ---
  const handleCreateBooking = async () => {
    try {
      const { nights, total } = calculateNightsAndTotal(newBooking);
      const payload = { ...newBooking, nights, total };

      await api.post("/api/booking", payload, { headers: { Authorization: `Bearer ${token}` } });

      fetchBookings();
      fetchRooms();

      // reset form
      setNewBooking({
        guestName: "",
        email: "",
        phone: "",
        notes: "",
        checkIn: "",
        checkOut: "",
        roomId: "",
        roomType: "",
        nights: 0,
        pricePerNight: 0,
        total: 0,
      });

      const modal = window.bootstrap.Modal.getInstance(document.getElementById("addBookingModal"));
      modal?.hide();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.put(`/api/booking/${id}/status`, { status }, { headers: { Authorization: `Bearer ${token}` } });
      fetchBookings();
      fetchRooms();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBooking = async (id) => {
    if (!window.confirm("Hapus booking ini?")) return;
    try {
      await api.delete(`/api/booking/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchBookings();
      fetchRooms();
    } catch (err) {
      console.error(err);
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
    }
  };

  const handleUpdateRoom = async () => {
    if (!selectedBooking || !selectedRoomId) return;

    const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

    // hitung nights & total
    let nights = 0;
    let total = 0;
    if (selectedBooking.checkIn && selectedBooking.checkOut) {
      const start = new Date(selectedBooking.checkIn);
      const end = new Date(selectedBooking.checkOut);
      nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    }
    if (selectedRoom?.price && nights > 0) {
      total = nights * selectedRoom.price;
    }

    await api.put(
      `/api/booking/${selectedBooking.id}`,
      {
        roomId: selectedRoomId,
        roomType: selectedRoom?.type || selectedBooking.roomType,
        pricePerNight: selectedRoom?.price || 0,
        nights,
        total,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setSelectedBooking(null);
    setSelectedRoomId(null);
    fetchBookings();
    fetchRooms();
  };

  // --- UI ---
  return (
    <Layout>
      {/* Gunakan container-fluid untuk admin */}
      <div className="container-fluid py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="h3 mb-0 fw-bold text-dark">Booking Management</h1>
          <button className="btn btn-primary shadow-sm" data-bs-toggle="modal" data-bs-target="#addBookingModal">
            <i className="bi bi-plus-circle me-1"></i> Add Booking
          </button>
        </div>

        {/* Card untuk Tabel Booking */}
        <div className="card shadow-sm mb-4">
            <div className="card-header py-3 bg-light border-0 d-flex justify-content-between align-items-center">
                <h6 className="m-0 fw-bold text-primary">Current Bookings</h6>
                {/* Opsional: Tambah filter atau search */}
            </div>
            <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    {/* Header table-dark */}
                    <thead className="table-dark">
                      <tr>
                        <th>Guest</th>
                        <th>Contact</th>
                        {/* <th>Email</th>
                        <th>Phone</th> */}
                        <th>Room Type</th>
                        <th>Room#</th>
                        <th>Check-In</th>
                        <th>Check-Out</th>
                        <th>Nights</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Notes</th>
                        <th className="text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.length > 0 ? bookings.map((b) => (
                        <tr key={b.id}>
                          <td className="fw-semibold">{b.guestName}</td>
                          <td>
                            <small className="d-block">{b.email}</small>
                            <small className="d-block text-muted">{b.phone}</small>
                          </td>
                          {/* <td>{b.email}</td>
                          <td>{b.phone}</td> */}
                          <td>{b.roomType}</td>
                          <td className="text-center">{b.room ? b.room.roomNumber : "-"}</td>
                          <td>{new Date(b.checkIn).toLocaleDateString('id-ID')}</td>
                          <td>{new Date(b.checkOut).toLocaleDateString('id-ID')}</td>
                          <td className="text-center">{b.nights}</td>
                          <td className="fw-bold text-success">Rp {Number(b.total || 0).toLocaleString('id-ID')}</td>
                          <td>
                             {/* Select di bawah badge */}
                            <div className="d-flex flex-column align-items-start">
                                <StatusBadge status={b.status} />
                                <StatusSelect value={b.status} onChange={(e) => handleUpdateStatus(b.id, e.target.value)} />
                            </div>
                          </td>
                          <td className="text-truncate" style={{maxWidth: '150px'}} title={b.notes}>{b.notes}</td>
                          <td className="text-center">
                             {/* Tombol Assign dan Delete */}
                            {!b.roomId && b.status !== 'CANCELLED' && ( // Hanya tampil jika belum ada room & tidak cancel
                              <button
                                className="btn btn-sm btn-outline-primary me-1" // Primary untuk assign
                                data-bs-toggle="modal"
                                data-bs-target="#assignRoomModal"
                                onClick={() => setSelectedBooking(b)}
                                title="Assign Room"
                              >
                                <i className="bi bi-key-fill"></i>
                              </button>
                            )}
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteBooking(b.id)} title="Delete Booking">
                              <i className="bi bi-trash"></i>
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                            <td colSpan="12" className="text-center text-muted p-4">No bookings found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
            </div>
            {/* Opsional: Pagination jika data banyak */}
            {/* <div className="card-footer bg-light border-0"> ... Pagination controls ... </div> */}
        </div>


        {/* Modal Create Booking */}
        <div className="modal fade" id="addBookingModal" tabIndex="-1" aria-hidden="true">
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content shadow-lg">
              <div className="modal-header bg-primary text-dark"> {/* Disesuaikan */}
                <h5 className="modal-title fw-bold">➕ Add New Booking</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div className="modal-body">
                {/* Isi form Add Booking */}
                 <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Guest Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newBooking.guestName}
                          onChange={(e) => setNewBooking({ ...newBooking, guestName: e.target.value })}
                        />
                      </div>
                      {/* ... input fields lainnya ... */}
                       <div className="col-md-6">
                        <label className="form-label">Email</label>
                        <input
                          type="email"
                          className="form-control"
                          value={newBooking.email}
                          onChange={(e) => setNewBooking({ ...newBooking, email: e.target.value })}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Phone</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newBooking.phone}
                          onChange={(e) => setNewBooking({ ...newBooking, phone: e.target.value })}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Notes</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newBooking.notes}
                          onChange={(e) => setNewBooking({ ...newBooking, notes: e.target.value })}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Room Type</label>
                        <select
                          className="form-select"
                          value={newBooking.roomType}
                          onChange={(e) => setNewBooking({ ...newBooking, roomType: e.target.value, roomId: "" })}
                        >
                           <option value="" disabled>-- Select Type --</option>
                           <option value="FBK">BOUTIQUE</option>
                           <option value="FSKG">SS KING</option>
                           <option value="FSST">SS TWIN</option>
                           <option value="DXQ">DXQ</option>
                        </select>
                      </div>
                       <div className="col-md-3">
                        <label className="form-label">Check In</label>
                        <input
                          type="date"
                          className="form-control"
                          value={newBooking.checkIn}
                          onChange={(e) => setNewBooking({ ...newBooking, checkIn: e.target.value })}
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Check Out</label>
                        <input
                          type="date"
                          className="form-control"
                          value={newBooking.checkOut}
                          onChange={(e) => setNewBooking({ ...newBooking, checkOut: e.target.value })}
                          min={newBooking.checkIn || ''} // Tambahkan min date
                          disabled={!newBooking.checkIn} // Disable jika checkin belum diisi
                        />
                      </div>
                      <div className="col-12">
                         <button type="button" className="btn btn-outline-primary w-100" onClick={checkAvailability} disabled={!newBooking.roomType || !newBooking.checkIn || !newBooking.checkOut}>
                           <i className="bi bi-search me-1"></i> Check Available Rooms
                         </button>
                      </div>
                      {availableRooms.length > 0 && (
                        <div className="col-12">
                          <label className="form-label">Available Rooms</label>
                          <select
                            className="form-select"
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
                          >
                             <option value="" disabled>-- Select Room --</option>
                             {availableRooms.map((r) => (
                              <option key={r.id} value={r.id}>
                                Room {r.roomNumber} - {r.type} (Rp {Number(r.price).toLocaleString('id-ID')})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {availableRooms.length === 0 && newBooking.roomType && newBooking.checkIn && newBooking.checkOut && (
                          <div className="col-12">
                              <div className="alert alert-warning mt-2">No rooms available for the selected type and dates.</div>
                          </div>
                      )}

                       <div className="col-md-4">
                        <label className="form-label">Price/Night</label>
                        <input type="text" className="form-control" value={newBooking.pricePerNight ? `Rp ${Number(newBooking.pricePerNight).toLocaleString('id-ID')}` : ""} readOnly />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Nights</label>
                        <input type="number" className="form-control" value={calculateNightsAndTotal(newBooking).nights || 0} readOnly />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Total</label>
                        <input type="text" className="form-control" value={calculateNightsAndTotal(newBooking).total ? `Rp ${Number(calculateNightsAndTotal(newBooking).total).toLocaleString('id-ID')}` : "Rp 0"} readOnly />
                      </div>
                </div>
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-secondary" data-bs-dismiss="modal">
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleCreateBooking} disabled={!newBooking.roomId}> {/* Disable jika room blm dipilih */}
                  <i className="bi bi-save me-1"></i> Save Booking
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 🔹 Modal Assign Room */}
        <div className="modal fade" id="assignRoomModal" tabIndex="-1" aria-hidden="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg">
               {/* Header bg-primary */}
              <div className="modal-header bg-primary text-dark">
                <h5 className="modal-title fw-bold">🛏 Assign Room</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div className="modal-body">
                {selectedBooking && (
                  <div>
                    <p className="mb-2">
                      Assign room for: <strong className="text-primary">{selectedBooking.guestName}</strong>
                    </p>
                    <p className="mb-3">
                      Booking: <small className="text-muted">#{selectedBooking.id} ({selectedBooking.roomType}, {new Date(selectedBooking.checkIn).toLocaleDateString('id-ID')} - {new Date(selectedBooking.checkOut).toLocaleDateString('id-ID')})</small>
                    </p>

                    {/* Filtered Available Rooms */}
                    <div className="mb-3">
                      <label htmlFor="assignRoomSelect" className="form-label fw-semibold">Available Rooms ({selectedBooking.roomType})</label>
                      <select
                        id="assignRoomSelect"
                        className="form-select"
                        value={selectedRoomId || ""}
                        onChange={(e) => setSelectedRoomId(Number(e.target.value))}
                      >
                        <option value="" disabled>-- Select Room --</option>
                        {rooms
                          .filter(
                            (r) =>
                              r.type === selectedBooking.roomType &&
                              (r.status === "VCI" || r.status === "VCN") // Filter hanya vacant clean
                          )
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              Room {r.roomNumber} (Rp {Number(r.price).toLocaleString('id-ID')}) - Status: {r.status}
                            </option>
                          ))}
                       </select>
                      {/* Tampilkan pesan jika tidak ada room tersedia */}
                       {rooms.filter(r => r.type === selectedBooking.roomType && (r.status === "VCI" || r.status === "VCN")).length === 0 && (
                            <div className="alert alert-warning mt-2 small">No vacant clean rooms found for type {selectedBooking.roomType}.</div>
                       )}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-secondary" data-bs-dismiss="modal">
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleUpdateRoom} data-bs-dismiss="modal" disabled={!selectedRoomId}> {/* Disable jika room blm dipilih */}
                 <i className="bi bi-check-lg me-1"></i> Save Assignment
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default BookingAdmin;
