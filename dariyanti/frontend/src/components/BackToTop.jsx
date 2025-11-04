import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { ScrollContext } from '../contexts/ScrollContext'; // Pastikan path ini benar

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const { pathname } = useLocation();
  const scrollableRef = useContext(ScrollContext);

  // --- Helper Functions (Tidak Berubah) ---
  const getScrollTarget = () => {
    return scrollableRef?.current || window;
  };

  const getScrollPosition = () => {
    if (scrollableRef?.current) {
      return scrollableRef.current.scrollTop; 
    }
    return window.scrollY;
  };

  const scrollToTopAction = (isInstant = false) => {
    const target = getScrollTarget();
    if (target === window) {
      target.scrollTo({ top: 0, behavior: isInstant ? 'auto' : 'smooth' });
    } else if (target?.scrollTo) { 
      target.scrollTo({ top: 0, behavior: isInstant ? 'auto' : 'smooth' });
    }
  };

  // --- Efek 1: Scroll ke atas saat pindah halaman (Tidak Berubah) ---
  useEffect(() => {
    scrollToTopAction(true); 
  }, [pathname, scrollableRef]); 

  
  // --- Efek 2: Tampilkan/sembunyikan tombol (DITAMBAH DEBUGGING) ---
  useEffect(() => {
    // !! TAMBAHKAN DEBUGGING !!
    const currentRef = scrollableRef?.current;
    const listenerTarget = currentRef || window;

    // Log 1: Periksa ref dari context
    console.log("BackToTop Context Ref:", scrollableRef);
    // Log 2: Periksa elemen <main> (jika ada)
    console.log("BackToTop 'current' Ref:", currentRef);
    // Log 3: Tentukan target listener
    console.log("BackToTop: Attaching scroll listener to:", listenerTarget === window ? "WINDOW" : "MAIN ELEMENT");

    const toggleVisibility = () => {
      const position = getScrollPosition();
      // Uncomment log di bawah ini jika perlu melacak angka scroll
      // console.log("Scroll position:", position);
      
      if (position > 100) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    if (!listenerTarget) return;

    listenerTarget.addEventListener('scroll', toggleVisibility);

    // Panggil sekali saat mount untuk cek posisi awal (jika halaman di-refresh)
    toggleVisibility();

    return () => {
      console.log("BackToTop: Cleaning up listener from:", listenerTarget === window ? "WINDOW" : "MAIN ELEMENT");
      listenerTarget.removeEventListener('scroll', toggleVisibility);
    };
  }, [scrollableRef, pathname]); // Dependensi ini sudah benar

  
  const handleScrollClick = (e) => {
    e.preventDefault();
    scrollToTopAction(false); 
  };

  
  // --- PERUBAHAN UTAMA DI SINI ---
  // Kita tidak lagi me-render secara kondisional (menghapus {isVisible && ...})
  // Kita SELALU me-render, tapi MENGGANTI className
  return (
    <a
      href="#"
      onClick={handleScrollClick}
      // Terapkan kelas 'active' secara dinamis
      className={`back-to-top ${isVisible ? 'active' : ''}`}
      role="button"
      aria-label="Back to Top"
      // Hapus 'style' prop, biarkan CSS Anda yang mengatur
    >
      <i className="fa fa-chevron-up"></i>
    </a>
  );
}