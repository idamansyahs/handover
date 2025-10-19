import React, { useState, useEffect, useRef } from 'react'; // Tambahkan useRef
import { Link } from 'react-router-dom';
import { Modal } from 'bootstrap'; // <-- 1. Impor Modal Bootstrap JS
import api from '../../api';
import Layout from '../../components/Layout';

const DaftarKonten = () => {
    // Ganti nama state agar konsisten
    const [kontenList, setKontenList] = useState([]);
    // State form (sesuaikan field jika perlu)
    const [form, setForm] = useState({ id: null, link: "", deskripsi: "", platform: "" });
    const [loading, setLoading] = useState(true);
    const [editingContentId, setEditingContentId] = useState(null); // Tandai mode edit

    // State untuk instance modal
    const [modalInstance, setModalInstance] = useState(null);
    const modalElementRef = useRef(); // Ref untuk elemen modal

    const token = localStorage.getItem('token'); // Ambil token

    // Inisialisasi instance modal
    useEffect(() => {
        if (modalElementRef.current) {
            // Cek instance sebelum membuat baru untuk mencegah error backdrop
            const existingInstance = Modal.getInstance(modalElementRef.current);
            if (!existingInstance) {
                const modal = new Modal(modalElementRef.current);
                setModalInstance(modal);
            } else {
                setModalInstance(existingInstance);
            }
        }
    }, []); // Hanya sekali saat mount


    // Fetch data konten
    useEffect(() => {
        const fetchKonten = async () => {
            setLoading(true);
            try {
                // 2. Perbaiki Endpoint & TAMBAHKAN Header Auth
                const res = await api.get("/api/konten-management", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setKontenList(res.data || []);
            } catch (err) {
                console.error("Error fetching content:", err);
                 // Tambahkan notifikasi error jika perlu
                 // setError("Gagal memuat data konten. Pastikan Anda sudah login.");
            } finally {
                setLoading(false);
            }
        };
        if (token) {
            fetchKonten();
        } else {
             console.error("Token not found.");
             setLoading(false);
             // Handle jika tidak ada token (misal redirect login)
        }
    }, [token]); // Jalankan ulang jika token berubah

    // Hapus konten (Kode ini diasumsikan sudah berfungsi, hanya ditambahkan Auth Header)
    const deleteKonten = async (id) => {
        if (window.confirm('Apakah anda yakin ingin menghapus konten ini?')) {
            try {
                // 3. TAMBAHKAN Header Auth & Perbaiki Endpoint (jika perlu)
                await api.delete(`/api/konten-management/${id}`, { // Pastikan endpoint ini benar
                    headers: { Authorization: `Bearer ${token}` }
                });
                setKontenList(kontenList.filter((k) => k.id !== id));
                alert('Konten berhasil dihapus!'); // Ganti alert jika perlu
            } catch (err) {
                console.error("Error deleting content:", err);
                alert('Gagal menghapus konten: ' + (err.response?.data?.message || err.message)); // Ganti alert jika perlu
            }
        }
    }

    // Handle perubahan input form
    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prevForm) => ({ ...prevForm, [name]: value }));
    }

    // 4. Fungsi untuk MENAMPILKAN modal Tambah
    const handleShowAddModal = () => {
        setEditingContentId(null);
        // Reset form dengan nilai default string kosong
        setForm({ id: null, link: "", deskripsi: "", platform: "" });
        modalInstance?.show(); // Tampilkan modal via JS
    }

    // 5. Fungsi untuk MENAMPILKAN modal Edit
    const handleShowEditModal = (konten) => {
        setEditingContentId(konten.id);
        // Isi form dengan data konten (gunakan fallback string kosong '')
        setForm({
            id: konten.id,
            link: konten.link || "",
            deskripsi: konten.deskripsi || "",
            platform: konten.platform || ""
        });
        modalInstance?.show(); // Tampilkan modal via JS
    }

    // Submit tambah / edit konten
    const handleSubmit = async (e) => {
        e.preventDefault();
        const headers = { Authorization: `Bearer ${token}` }; // Siapkan header
        try {
            if (editingContentId) {
                // UPDATE: Gunakan endpoint PUT dan sertakan header
                await api.put(`/api/konten-management/${editingContentId}`, form, { headers });
                alert('Konten berhasil diperbarui!');
            } else {
                // CREATE: Gunakan endpoint POST dan sertakan header
                await api.post("/api/konten-management", form, { headers });
                alert('Konten berhasil ditambahkan!');
            }
            // Refresh list setelah create/update (sertakan header)
            const res = await api.get("/api/konten-management", { headers });
            setKontenList(res.data || []);
            modalInstance?.hide(); // Tutup modal
            // Reset state
            setEditingContentId(null);
            setForm({ id: null, link: "", deskripsi: "", platform: "" });

        } catch (err) {
            console.error("Error submitting content:", err);
            alert(`Gagal ${editingContentId ? 'memperbarui' : 'menambahkan'} konten: ` + (err.response?.data?.message || err.message));
        }
    }

    return (
        <Layout>
            <div className="container-fluid py-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h1 className="h3 mb-0 fw-bold text-dark">Manajemen Konten</h1>
                    {/* 6. Tombol Add: Panggil handleShowAddModal, HAPUS data-bs-* */}
                    <button
                        className="btn btn-primary shadow-sm"
                        onClick={handleShowAddModal}
                    >
                        <i className="bi bi-plus-circle me-1"></i> Tambah Konten
                    </button>
                </div>

                {/* Loading / Error State */}
                 {loading && <div className="text-center p-5"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div></div>}
                 {!loading && !token && <div className="alert alert-danger">Tidak dapat memuat konten. Token tidak ditemukan atau tidak valid.</div>}

                {/* Tabel Konten */}
                {!loading && token && (
                    <div className="card shadow-sm mb-4">
                        <div className="card-header py-3 bg-light border-0">
                            <h6 className="m-0 fw-bold text-primary">Daftar Konten</h6>
                        </div>
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-dark">
                                        <tr>
                                            <th>Link</th>
                                            <th>Deskripsi</th>
                                            <th>Platform</th>
                                            <th>Tgl Dibuat</th>
                                            <th className="text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {kontenList.length > 0 ? kontenList.map((konten) => (
                                            <tr key={konten.id}>
                                                <td><a href={konten.link} target="_blank" rel="noopener noreferrer">{konten.link}</a></td>
                                                <td>{konten.deskripsi}</td>
                                                <td>{konten.platform}</td>
                                                <td>{new Date(konten.createdAt).toLocaleString('id-ID')}</td>
                                                <td className="text-center">
                                                     {/* 7. Tombol Edit: Panggil handleShowEditModal, HAPUS data-bs-* */}
                                                    <button
                                                        className="btn btn-sm btn-outline-primary me-1"
                                                        onClick={() => handleShowEditModal(konten)}
                                                        title="Edit Konten"
                                                    >
                                                        <i className="bi bi-pencil-square"></i>
                                                    </button>
                                                    {/* Tombol Hapus (tidak diubah) */}
                                                    <button
                                                        className="btn btn-sm btn-outline-danger"
                                                        onClick={() => deleteKonten(konten.id)}
                                                        title="Hapus Konten"
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="5" className="text-center text-muted p-4">Belum ada konten.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 8. Modal Tambah/Edit (Gunakan ID yang sama: 'kontenFormModal') */}
            <div className="modal fade" id="kontenFormModal" ref={modalElementRef} tabIndex="-1" aria-labelledby="kontenFormModalLabel" aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content shadow-lg">
                        <form onSubmit={handleSubmit}>
                            <div className="modal-header bg-primary text-dark">
                                <h5 className="modal-title fw-bold" id="kontenFormModalLabel">
                                    {editingContentId ? '✏️ Edit Konten' : '➕ Tambah Konten Baru'}
                                </h5>
                                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div className="modal-body">
                                {/* Input fields bind ke state 'form' */}
                                <div className="mb-3">
                                    <label htmlFor="formLink" className="form-label">Link Konten</label>
                                    <input
                                        type="url"
                                        name="link"
                                        className="form-control"
                                        id="formLink"
                                        value={form.link || ''} // <-- 9. Fallback value
                                        onChange={handleChange}
                                        required
                                        placeholder="https://"
                                    />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="formDeskripsi" className="form-label">Deskripsi</label>
                                    <textarea
                                        name="deskripsi"
                                        className="form-control"
                                        id="formDeskripsi"
                                        rows="3"
                                        value={form.deskripsi || ''} // <-- 9. Fallback value
                                        onChange={handleChange}
                                    ></textarea>
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="formPlatform" className="form-label">Platform</label>
                                    <select
                                        name="platform"
                                        className="form-select"
                                        id="formPlatform"
                                        value={form.platform || ''} // <-- 9. Fallback value
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">-- Pilih --</option>
                                        <option value="Instagram">Instagram</option>
                                        <option value="Tiktok">Tiktok</option>
                                        {/* Tambah platform lain jika perlu */}
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer border-0">
                                <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                                    Batal
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingContentId ? 'Simpan Perubahan' : 'Tambah Konten'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </Layout>
    )
}

export default DaftarKonten;