// src/components/Layout.jsx
import React from "react";
import { Outlet } from "react-router-dom"; // 1. Import Outlet
import Sidebar from "./Sidebar";
// HAPUS: import { ScrollContext }
// HAPUS: import useRef

// 2. Terima 'mainContentRef' sebagai prop
export default function Layout({ mainContentRef }) {
  // HAPUS: const mainContentRef = useRef(null);
  
  return (
    // HAPUS: <ScrollContext.Provider ...>
    <div className="d-flex admin-layout vh-100 overflow-hidden">
      <Sidebar />
      <main
        className="grow p-4 overflow-auto" // Pastikan 'flex-grow-1'
        ref={mainContentRef} // 3. Gunakan ref dari prop
      >
        <Outlet />
      </main>
    </div>
    // HAPUS: </ScrollContext.Provider>
  );
}