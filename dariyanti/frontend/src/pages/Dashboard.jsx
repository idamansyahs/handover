import React, { useEffect, useState } from "react";
import api from "../api";
import Layout from "../components/Layout";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(true);

  useEffect(() => {
    const fetchBookingsData = async () => {
      try {
        const res = await api.get("/api/booking");
        setBookings(res.data || []);
      } catch (err) {
        console.error("fetch bookings:", err);
      } finally {
        setLoadingBookings(false);
      }
    };
    const fetchRoomsData = async () => { // Fungsi fetch rooms
        try {
            const res = await api.get("/api/room");
            setRooms(res.data || []);
        } catch (err) {
            console.error("fetch rooms:", err);
        } finally {
            setLoadingRooms(false);
        }
    }

    fetchBookingsData();
    fetchRoomsData(); // Panggil fetch rooms
  }, []); // Hanya run sekali saat mount

  // Hitung Statistik (setelah data ada)
  const pendingBookings = bookings.filter(b => b.status === 'PENDING').length;
  const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED').length;
  const checkedInGuests = bookings.filter(b => b.status === 'CHECKED_IN').length;
  const availableRooms = rooms.filter(r => r.status === 'VCI' || r.status === 'VCN').length;


  return (
    <>
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
          <h1 className="h3 mb-0 fw-bold text-dark">Dashboard</h1>
          {/* Opsional: Tombol aksi cepat */}
          {/* <Link to="/bookings" className="d-none d-sm-inline-block btn btn-sm btn-primary shadow-sm">
            <i className="fas fa-list fa-sm text-white-50 me-1"></i> View Bookings
          </Link> */}
      </div>


      {/* Baris Kartu Statistik */}
      <div className="row">
          {/* Kartu Pending Bookings */}
          <div className="col-xl-3 col-md-6 mb-4">
              <div className="card border-start border-5 border-warning shadow h-100 py-2"> {/* Warna Warning untuk Pending */}
                  <div className="card-body">
                      <div className="row no-gutters align-items-center">
                          <div className="col mr-2">
                              <div className="text-xs fw-bold text-warning text-uppercase mb-1">Bookings (Pending)</div>
                              <div className="h5 mb-0 fw-bold text-gray-800">{loadingBookings ? '...' : pendingBookings}</div>
                          </div>
                          <div className="col-auto">
                              <i className="bi bi-clock-history fs-2 text-gray-300"></i>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

           {/* Kartu Confirmed Bookings */}
           <div className="col-xl-3 col-md-6 mb-4">
              <div className="card border-start border-5 border-success shadow h-100 py-2"> {/* Warna Success untuk Confirmed */}
                  <div className="card-body">
                      <div className="row no-gutters align-items-center">
                          <div className="col mr-2">
                              <div className="text-xs fw-bold text-success text-uppercase mb-1">Bookings (Confirmed)</div>
                              <div className="h5 mb-0 fw-bold text-gray-800">{loadingBookings ? '...' : confirmedBookings}</div>
                          </div>
                          <div className="col-auto">
                              <i className="bi bi-calendar-check fs-2 text-gray-300"></i>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          {/* Kartu Checked In Guests */}
          <div className="col-xl-3 col-md-6 mb-4">
              <div className="card border-start border-5 border-info shadow h-100 py-2"> {/* Warna Info untuk Checked In */}
                  <div className="card-body">
                      <div className="row no-gutters align-items-center">
                          <div className="col mr-2">
                              <div className="text-xs fw-bold text-info text-uppercase mb-1">Guests Checked In</div>
                              <div className="h5 mb-0 fw-bold text-gray-800">{loadingBookings ? '...' : checkedInGuests}</div>
                          </div>
                          <div className="col-auto">
                              <i className="bi bi-person-check fs-2 text-gray-300"></i>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

           {/* Kartu Available Rooms */}
           <div className="col-xl-3 col-md-6 mb-4">
              <div className="card border-start border-5 border-primary shadow h-100 py-2"> {/* Warna Primary untuk Rooms */}
                  <div className="card-body">
                      <div className="row no-gutters align-items-center">
                          <div className="col mr-2">
                              <div className="text-xs fw-bold text-primary text-uppercase mb-1">Available Rooms</div>
                              <div className="h5 mb-0 fw-bold text-gray-800">{loadingRooms ? '...' : availableRooms} / {loadingRooms ? '...' : rooms.length}</div>
                          </div>
                          <div className="col-auto">
                              <i className="bi bi-door-open fs-2 text-gray-300"></i>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>


      {/* Tabel Recent Bookings */}
      <section className="mt-4">
        <h2 className="h5 mb-3 text-primary">Recent Bookings</h2>

        {loadingBookings ? (
          <div className="d-flex justify-content-center p-5">
             <div className="spinner-border text-primary" role="status">
                 <span className="visually-hidden">Loading...</span>
             </div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="alert alert-secondary text-center">No bookings yet.</div>
        ) : (
          <div className="card shadow-sm mb-4">
            <div className="card-header py-3 bg-light border-0">
                <h6 className="m-0 fw-bold text-primary">Last 5 Bookings</h6>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  {/* Gunakan table-dark dari style.css */}
                  <thead className="table-dark">
                    <tr>
                      <th>No</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Tampilkan 5 terbaru */}
                    {bookings.slice(0, 5).map((b) => (
                      <tr key={b.id}>
                        <td class="text-left">{bookings.indexOf(b) + 1}</td>
                        <td className="fw-semibold">{b.guestName}</td>
                        <td>{b.email}</td>
                        <td>{new Date(b.checkIn).toLocaleDateString()}</td>
                        <td>{new Date(b.checkOut).toLocaleDateString()}</td>
                        <td>
                            {/* Contoh Badge Status */}
                            <span className={`badge rounded-pill bg-${
                                b.status === 'CONFIRMED' ? 'success' :
                                b.status === 'PENDING' ? 'warning' :
                                b.status === 'CHECKED_IN' ? 'info' :
                                b.status === 'CANCELLED' ? 'danger' : 'secondary'
                            } text-${
                                // Atur kontras teks jika perlu
                                ['warning', 'info', 'light', 'secondary'].includes(
                                    b.status === 'CONFIRMED' ? 'success' :
                                    b.status === 'PENDING' ? 'warning' :
                                    b.status === 'CHECKED_IN' ? 'info' :
                                    b.status === 'CANCELLED' ? 'danger' : 'secondary'
                                ) ? 'dark' : 'white'
                            }`}>
                                {b.status}
                            </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {bookings.length > 5 && (
                 <div className="card-footer text-center bg-light border-0">
                     <Link to="/bookings" className="btn btn-sm btn-outline-primary">View All Bookings</Link>
                 </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}