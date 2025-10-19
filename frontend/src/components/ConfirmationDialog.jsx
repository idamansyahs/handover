// src/components/ConfirmationDialog.jsx
import React, { useEffect, useRef } from 'react';
import { Modal } from 'bootstrap'; // Impor Modal dari Bootstrap JS

function ConfirmationDialog({ show, onClose, onConfirm, title, message, confirmText = "Ya, Batalkan", cancelText = "Tidak" }) {
  const modalRef = useRef();
  const bsModalRef = useRef();

  // Inisialisasi dan kontrol modal Bootstrap
  useEffect(() => {
    if (modalRef.current) {
      bsModalRef.current = new Modal(modalRef.current, {
        backdrop: 'static', // Tidak menutup saat klik backdrop
        keyboard: false // Tidak menutup dengan Esc
      });

      // Handler untuk event 'hidden.bs.modal'
      const handleModalHidden = () => {
        if (onClose) {
          onClose(); // Panggil onClose prop saat modal selesai disembunyikan
        }
      };
      modalRef.current.addEventListener('hidden.bs.modal', handleModalHidden);

      // Cleanup listener saat komponen unmount
      return () => {
        if (modalRef.current) {
          modalRef.current.removeEventListener('hidden.bs.modal', handleModalHidden);
        }
        // Hancurkan instance modal saat unmount jika masih ada
        if (bsModalRef.current) {
           // bsModalRef.current.dispose(); // Hati-hati, dispose bisa error jika modal sudah hilang
        }
      };
    }
  }, [onClose]); // Tambahkan onClose sebagai dependency


  // Tampilkan/sembunyikan modal berdasarkan prop 'show'
  useEffect(() => {
    if (bsModalRef.current) {
      if (show) {
        bsModalRef.current.show();
      } else {
         // Cek jika modal instance masih ada sebelum hide
         // Ini mencegah error jika komponen unmount sebelum modal hide selesai
         const modalElement = document.getElementById(modalRef.current?.id || '');
         const modalInstance = Modal.getInstance(modalElement);
         if (modalInstance) {
            modalInstance.hide();
         }
      }
    }
  }, [show]);

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    // Sembunyikan modal (akan trigger onClose via event hidden.bs.modal)
     const modalElement = document.getElementById(modalRef.current?.id || '');
     const modalInstance = Modal.getInstance(modalElement);
     if (modalInstance) {
        modalInstance.hide();
     }
  };

  const handleClose = () => {
      // Sembunyikan modal (akan trigger onClose via event hidden.bs.modal)
       const modalElement = document.getElementById(modalRef.current?.id || '');
       const modalInstance = Modal.getInstance(modalElement);
       if (modalInstance) {
          modalInstance.hide();
       }
  }

  // Generate ID unik untuk modal jika perlu (opsional, bisa hardcode)
  const modalId = `confirmModal-${Math.random().toString(36).substring(7)}`;


  return (
    <div className="modal fade" ref={modalRef} id={modalId} tabIndex="-1" aria-labelledby={`${modalId}Label`} aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered"> {/* Posisikan di tengah */}
        <div className="modal-content shadow-lg rounded-3"> {/* Style card */}
          <div className="modal-header bg-warning border-0"> {/* Header warning */}
            <h5 className="modal-title fw-bold text-dark" id={`${modalId}Label`}>
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {title || "Konfirmasi"} {/* Judul default */}
            </h5>
            {/* Tombol close di header (opsional) */}
             <button type="button" className="btn-close" onClick={handleClose} aria-label="Close"></button>
          </div>
          <div className="modal-body text-center fs-5 py-4"> {/* Body */}
            {message || "Apakah Anda yakin?"} {/* Pesan default */}
          </div>
          <div className="modal-footer border-0 justify-content-center pb-3"> {/* Footer */}
            <button type="button" className="btn btn-secondary px-4" onClick={handleClose}>
              {cancelText}
            </button>
            <button type="button" className="btn btn-danger px-4" onClick={handleConfirm}> {/* Tombol confirm (merah) */}
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationDialog;