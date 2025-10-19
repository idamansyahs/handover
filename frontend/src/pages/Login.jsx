// src/pages/Login.jsx
import React, { useContext, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import './../assets/css/Login.css';

export default function Login() {
  const { login, loading } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      // login() akan redirect ke /dashboard
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Login gagal";
      setError(msg);
    }
  };

  return (
    // Gunakan kelas CSS untuk background dan layout
    <div className="login-page-background">
      {/* Gunakan kelas CSS untuk card */}
      <div className="login-card">
        <form onSubmit={handleSubmit}>
          <h2 className="text-center mb-4"> {/* Hapus inline style */}
            Admin Login
          </h2>

          {error && (
            // Gunakan alert Bootstrap
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {/* Gunakan struktur form Bootstrap */}
          <div className="mb-3">
            <label htmlFor="loginEmail" className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              id="loginEmail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Masukkan email Anda"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="loginPassword" className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              id="loginPassword"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Masukkan password"
            />
          </div>

          <button
            type="submit"
            // Gunakan kelas btn-primary
            className="btn btn-primary w-100 mb-3"
            disabled={loading}
          >
            {loading ? (
               <>
                 <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                 <span className="ms-2">Loading...</span>
               </>
               ) : "Login"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            // Gunakan kelas btn-outline-secondary
            className="btn btn-outline-secondary w-100"
          >
            ← Kembali ke Home
          </button>
        </form>
      </div>
    </div>
  );
}