import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap'; // Gunakan React-Bootstrap
import api from '../../api';
import Layout from '../../components/Layout';
import ConfirmationDialog from '../../components/ConfirmationDialog'; // Impor modal konfirmasi

const DaftarKonten = () => {
    const [kontenList, setKontenList] = useState([]);
    const [form, setForm] = useState({ id: null, link: "", deskripsi: "", platform: "" });
    const [loading, setLoading] = useState(true);
    const [editingContentId, setEditingContentId] = useState(null); 

    const [showFormModal, setShowFormModal] = useState(false);
    
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [kontenToDelete, setKontenToDelete] = useState(null);

    // 🔹 1. State baru untuk notifikasi (menggantikan alert)
    const [message, setMessage] = useState({ text: null, type: 'info' });

    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchKonten = async () => {
            setLoading(true);
            try {
                const res = await api.get("/api/konten-user", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setKontenList(res.data || []);
            } catch (err) {
                console.error("Error fetching content:", err);
                setMessage({ text: 'Gagal memuat konten.', type: 'error' });
            } finally {
                setLoading(false);
            }
        };
        if (token) {
            fetchKonten();
        } else {
             console.error("Token not found.");
             setMessage({ text: 'Token tidak ditemukan. Silakan login kembali.', type: 'error' });
             setLoading(false);
        }
    }, [token]);

    const handleDeleteClick = (id) => {
        setKontenToDelete(id);
        setShowDeleteModal(true);
    };

    const handleCloseDeleteModal = () => {
        setKontenToDelete(null);
        setShowDeleteModal(false);
    };

    const executeDeleteKonten = async () => {
        if (!kontenToDelete) return;
        try {
            await api.delete(`/api/konten-management/${kontenToDelete}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setKontenList(kontenList.filter((k) => k.id !== kontenToDelete));
            // 🔹 2. Ganti alert() dengan state message
            setMessage({ text: 'Konten berhasil dihapus!', type: 'success' });
        } catch (err) {
            console.error("Error deleting content:", err);
            // 🔹 2. Ganti alert() dengan state message
            const errorMsg = err.response?.data?.message || err.message;
            setMessage({ text: `Gagal menghapus konten: ${errorMsg}`, type: 'error' });
        } finally {
            handleCloseDeleteModal(); // Tetap tutup modal
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prevForm) => ({ ...prevForm, [name]: value }));
    }

    const handleShowAddModal = () => {
        setEditingContentId(null);
        setForm({ id: null, link: "", deskripsi: "", platform: "" });
        setShowFormModal(true);
    }

    const handleShowEditModal = (konten) => {
        setEditingContentId(konten.id);
        setForm({
            id: konten.id,
            link: konten.link || "",
            deskripsi: konten.deskripsi || "",
            platform: konten.platform || ""
        });
        setShowFormModal(true);
    }

    const handleCloseFormModal = () => {
        setShowFormModal(false);
        setEditingContentId(null);
        setForm({ id: null, link: "", deskripsi: "", platform: "" });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const headers = { Authorization: `Bearer ${token}` }; 

        try {
            if (editingContentId) {
                await api.put(`/api/konten-management/${editingContentId}`, form, { headers });
                // 🔹 3. Ganti alert() dengan state message
                setMessage({ text: 'Konten berhasil diperbarui!', type: 'success' });
            } else {
                const { id, ...dataToCreate } = form;
                await api.post("/api/konten-management", dataToCreate, { headers }); 
                // 🔹 3. Ganti alert() dengan state message
                setMessage({ text: 'Konten berhasil ditambahkan!', type: 'success' });
            }

            const res = await api.get("/api/konten-user", { headers });
            setKontenList(res.data || []); 
            
            handleCloseFormModal();

        } catch (err) {
            console.error("Error submitting content:", err);
            // 🔹 3. Ganti alert() dengan state message
            const errorMsg = err.response?.data?.message || err.message;
            setMessage({ text: `Gagal menyimpan konten: ${errorMsg}`, type: 'error' });
        }
    }

    return (
        <Layout>
            <div className="container-fluid py-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h1 className="h3 mb-0 fw-bold text-dark">Manajemen Konten</h1>
                    <button
                        className="btn btn-primary shadow-sm"
                        onClick={handleShowAddModal}
                    >
                        <i className="bi bi-plus-circle me-1"></i> Tambah Konten
                    </button>
                </div>

                {/* 🔹 4. Tampilkan state message di sini */}
                {message.text && (
                  <div className={`
                        alert
                        ${message.type === 'success' ? 'alert-success' : ''}
                        ${message.type === 'error' ? 'alert-danger' : ''}
                        ${message.type === 'info' ? 'alert-info' : ''}
                        alert-dismissible fade show
                     `}
                     role="alert">
                     {message.text}
                     <button
                       type="button"
                       className="btn-close"
                       onClick={() => setMessage({ text: null, type: 'info' })}
                       aria-label="Close"
                     ></button>
                  </div>
                )}

                {loading && <div className="text-center p-5"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div></div>}
                {!loading && !token && message.type === 'error' && (
                    <div className="alert alert-danger">Tidak dapat memuat data.</div>
                )}


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
                                                    <button
                                                        className="btn btn-sm btn-outline-primary me-1"
                                                        onClick={() => handleShowEditModal(konten)}
                                                        title="Edit Konten"
                                                    >
                                                        <i className="bi bi-pencil-square"></i>
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-outline-danger"
                                                        onClick={() => handleDeleteClick(konten.id)}
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

            {/* Modal Tambah/Edit (React-Bootstrap) */}
            <Modal show={showFormModal} onHide={handleCloseFormModal} centered>
                {/* 🔹 Tambahkan div ini agar shadow-lg berfungsi */}
                <div className="modal-content shadow-lg">
                    <form onSubmit={handleSubmit}>
                        <Modal.Header closeButton className="bg-primary text-dark">
                            <Modal.Title className="fw-bold">
                                {editingContentId ? '✏️ Edit Konten' : '➕ Tambah Konten Baru'}
                            </Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <div className="mb-3">
                                <label htmlFor="formLink" className="form-label">Link Konten</label>
                                <input
                                    type="url"
                                    name="link"
                                    className="form-control"
                                    id="formLink"
                                    value={form.link || ''}
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
                                    value={form.deskripsi || ''}
                                    onChange={handleChange}
                                ></textarea>
                            </div>
                            <div className="mb-3">
                                <label htmlFor="formPlatform" className="form-label">Platform</label>
                                <select
                                    name="platform"
                                    className="form-select"
                                    id="formPlatform"
                                    value={form.platform || ''}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">-- Pilih --</option>
                                    <option value="Instagram">Instagram</option>
                                    <option value="Tiktok">Tiktok</option>
                                </select>
                            </div>
                        </Modal.Body>
                        <Modal.Footer className="border-0">
                            <Button variant="secondary" onClick={handleCloseFormModal}>
                                Batal
                            </Button>
                            <Button type="submit" variant="primary">
                                {editingContentId ? 'Simpan Perubahan' : 'Tambah Konten'}
                            </Button>
                        </Modal.Footer>
                    </form>
                </div>
            </Modal>
            
            {/* Render Modal Konfirmasi Hapus */}
            <ConfirmationDialog
              show={showDeleteModal}
              onClose={handleCloseDeleteModal}
              onConfirm={executeDeleteKonten}
              title="Konfirmasi Hapus Konten"
              message="Apakah Anda yakin ingin menghapus konten ini?"
              confirmText="Ya, Hapus"
              cancelText="Batal"
            />
        </Layout>
    )
}

export default DaftarKonten;