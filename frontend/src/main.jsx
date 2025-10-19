import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import './assets/css/style.css'
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import BackToTop from "./components/BackToTop.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <BackToTop />
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
