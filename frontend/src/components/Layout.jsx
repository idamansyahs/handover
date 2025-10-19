// src/components/Layout.jsx
import React from "react";
import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  return (
    <div className="d-flex admin-layout">
      <Sidebar />
      {/* Gunakan tag main untuk konten */}
      <main className="flex-grow-1 p-4">{children}</main>
    </div>
  );
}
