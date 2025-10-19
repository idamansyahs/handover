import React, { useContext } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
// Icon bisa dari Bootstrap Icons (impor di style.css) atau Font Awesome

export default function Sidebar() {
  const { user, logout } = useContext(AuthContext); // Ambil user jika perlu
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    // navigate("/login"); // AuthContext mungkin sudah handle redirect
  };

  return (
    // Gunakan kelas sidebar dari style.css
    <aside className="d-flex flex-column flex-shrink-0 p-3 sidebar">
      <Link to="/dashboard" className="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-decoration-none text-white">
        {/* Ikon dan Judul Panel */}
        <i className="fas fa-hotel fs-4 me-2 text-primary"></i> {/* Ganti ikon jika perlu */}
        <span className="fs-5 fw-semibold">FBI Admin</span>
      </Link>
      <hr /> {/* Pemisah, style dari CSS */}
      <ul className="nav nav-pills flex-column mb-auto">
        {/* Gunakan NavLink untuk kelas 'active' otomatis */}
        <li className="nav-item mb-1">
          <NavLink to="/dashboard" className="nav-link" end> {/* Tambahkan 'end' prop */}
            <i className="bi bi-speedometer2 me-2"></i> Dashboard
          </NavLink>
        </li>
        <li className="nav-item mb-1">
          <NavLink to="/bookings" className="nav-link">
            <i className="bi bi-journal-bookmark-fill me-2"></i> Bookings
          </NavLink>
        </li>
        <li className="nav-item mb-1">
          <NavLink to="/room" className="nav-link">
            <i className="bi bi-door-open-fill me-2"></i> Rooms
          </NavLink>
        </li>
        <li className="nav-item mb-1">
          <NavLink to="/konten-management" className="nav-link">
             <i className="bi bi-pencil-square me-2"></i> Konten
          </NavLink>
        </li>
          <li className="nav-item mb-1 mt-auto pt-3 border-top border-secondary">
            <button className="nav-link text-danger" onClick={handleLogout} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none' }}>
              <i className="bi bi-box-arrow-right me-2"></i> Sign out
            </button>
          </li>
        {/* Tambahkan menu lain jika ada */}
      </ul>
    </aside>
  );
}