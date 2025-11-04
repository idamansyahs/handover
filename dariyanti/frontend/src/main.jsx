import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import './assets/css/style.css'
// import 'bootstrap/dist/css/bootstrap.min.css';
// import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import $ from 'jquery';

// Tambahkan jQuery ke window object agar bisa diakses oleh OwlCarousel
// Ini diperlukan jika Anda menggunakan react-owl-carousel yang bergantung pada jQuery
window.jQuery = $;
window.$ = $;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
