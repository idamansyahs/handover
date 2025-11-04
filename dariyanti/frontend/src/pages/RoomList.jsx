import React, { useEffect, useState, useContext } from "react"; 
import { AuthContext } from "../contexts/AuthContext";
import api from "../api";
import ConfirmationDialog from "../components/ConfirmationDialog";

// Impor komponen React-Bootstrap yang diperlukan
import { Modal, Button, Form } from "react-bootstrap"; // FloatingLabel dihapus, Form ditambah

const RoomList = () => {
  const [rooms, setRooms] = useState([]);

  // --- State untuk Modal ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);

  const [message, setMessage] = useState({ text: null, type: 'info' });

  const handleCloseAdd = () => setShowAddModal(false);
  const handleShowAdd = () => {
    setNewRoom({ roomNumber: "", type: "", price: "", status: "VCI" });
    setShowAddModal(true);
  };
  
  const handleCloseEdit = () => {
    setShowEditModal(false);
    setEditRoom(null); 
  };
  const handleShowEdit = (room) => {
    // 🔹 Cegah edit jika ada booking aktif
    if (room.hasActiveBooking) {
      setMessage({ text: 'Kamar ini tidak bisa diedit karena sedang digunakan dalam booking aktif.', type: 'warning' });
      return;
    }
    setEditRoom(room);
    setMessage({ text: null, type: 'info' });
    setShowEditModal(true);
  };
  // -------------------------

  const [newRoom, setNewRoom] = useState({
    roomNumber: "",
    type: "",
    price: "",
    status: "VCI",
  });
  const [editRoom, setEditRoom] = useState(null);

  const { user } = useContext(AuthContext);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await api.get("/api/room", { // ❗ Pastikan endpoint ini mengembalikan 'hasActiveBooking'
        headers: { Authorization: `Bearer ${token}` },
      });
      setRooms(res.data);
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Gagal memuat data kamar.', type: 'error' });
    }
  };

  const handleCreate = async () => {
    try {
      await api.post("/api/room", newRoom, {
        headers: { Authorization: `Bearer ${token}` },
      });
      handleCloseAdd(); 
      fetchRooms(); 
      // 🔹 Tambahkan pesan sukses
      setMessage({ text: 'Kamar berhasil ditambahkan!', type: 'success' });
    } catch (err) {
      console.error(err);
      // 🔹 Tambahkan pesan error
      const errorMsg = err.response?.data?.message || err.message;
      setMessage({ text: `Gagal menambahkan kamar: ${errorMsg}`, type: 'error' });
    }
  };

  const handleUpdate = async () => {
    if (!editRoom) return;
    let payload;
    if (user && user.role === 'STAFF') {
      // STAFF hanya boleh update status
      payload = { status: editRoom.status };
    } else {
      // ADMIN boleh update semuanya
      payload = editRoom; 
    }

    try {
      // 🔹 Gunakan payload yang sudah difilter
      await api.put(`/api/room/${editRoom.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` } ,
      });
      handleCloseEdit();
      fetchRooms();
      // 🔹 Tambahkan pesan sukses
      setMessage({ text: 'Kamar berhasil diperbarui!', type: 'success' });
    } catch (err) {
      console.error(err);
      // 🔹 Tambahkan pesan error
      const errorMsg = err.response?.data?.message || err.message;
      setMessage({ text: `Gagal memperbarui kamar: ${errorMsg}`, type: 'error' });
    }
  };

  const handleDeleteClick = (id, hasActiveBooking) => {
    // 🔹 Cegah hapus jika ada booking aktif
    if (hasActiveBooking) {
      setMessage({ text: 'Kamar ini tidak bisa dihapus karena sedang digunakan dalam booking aktif.', type: 'warning' });
      return;
    }
    setRoomToDelete(id);
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setRoomToDelete(null);
    setShowDeleteModal(false);
  };

  const executeDelete = async () => {
    if (!roomToDelete) return;
    try {
      await api.delete(`/api/room/${roomToDelete}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchRooms();
      // 🔹 Ganti alert dengan message
      setMessage({ text: 'Kamar berhasil dihapus!', type: 'success' });
    } catch (err) {
      console.error(err);
      // 🔹 Ganti alert dengan message
      const errorMsg = err.response?.data?.message || err.message;
      setMessage({ text: `Gagal menghapus kamar: ${errorMsg}`, type: 'error' });
    } finally {
      handleCloseDeleteModal();
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      OCCUPIED: "danger",
      VCI: "success",
      VCN: "secondary",
      VDN: "warning",
      OOO: "dark",
    };
    return <span className={`badge bg-${colors[status]}`}>{status}</span>;
  };

  return (
      <div className="container mt-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="fw-bold">Room Management</h2>
          {user && user.role === 'ADMIN' && (
            <Button
              variant="primary"
              className="shadow-sm"
              onClick={handleShowAdd}
            >
              <i className="bi bi-plus-circle me-2"></i> Add Room
            </Button>
          )}
        </div>

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

        <div className="row">
          {rooms.map((room) => (
            <div key={room.id} className="col-md-4 col-lg-3 mb-4">
              <div className="card shadow-sm border-0 rounded-3 h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h5 className="card-title fw-bold mb-0">
                      Room {room.roomNumber}
                    </h5>
                    {getStatusBadge(room.status)}
                  </div>
                  <p className="text-muted mb-1">
                    <strong>Type:</strong> {room.type}
                  </p>
                  <p className="text-muted mb-3">
                    <strong>Price:</strong> Rp{" "}
                    {Number(room.price).toLocaleString()}
                  </p>
                  <div className="d-flex justify-content-between">
                    <Button
                      variant="outline-warning"
                      size="sm"
                      onClick={() => handleShowEdit(room)}
                      disabled={room.hasActiveBooking} // Menonaktifkan jika ada booking aktif
                      title={room.hasActiveBooking ? "Tidak bisa diedit, kamar terpakai booking" : "Edit Kamar"}
                    >
                      <i className="bi bi-pencil-square me-1"></i>Edit
                    </Button>
                    {/* 🔹 Tambahkan prop 'disabled' dan 'title' */}
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDeleteClick(room.id, room.hasActiveBooking)}
                      
                      // Tambahkan pengecekan role di sini
                      disabled={room.hasActiveBooking || (user && user.role !== 'ADMIN')} 
                      
                      title={
                        (user && user.role !== 'ADMIN') ? 'Hanya Admin yang bisa menghapus' :
                        room.hasActiveBooking ? "Tidak bisa dihapus, kamar terpakai booking" : "Hapus Kamar"
                      }
                    >
                      <i className="bi bi-trash me-1"></i>Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Room Modal (Style Disesuaikan) */}
        <Modal 
          show={showAddModal} 
          onHide={handleCloseAdd} 
          centered 
          size="lg" // 🔹 UBAH: Tambah size="lg"
          contentClassName="shadow-lg" // 🔹 UBAH: Tambah shadow-lg
        >
          <Modal.Header 
            closeButton 
            className="bg-primary text-dark" // 🔹 UBAH: Ganti style header
          >
            <Modal.Title className="fw-bold">➕ Add Room</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {/* 🔹 UBAH: Ganti FloatingLabel ke Form.Group */}
            <Form.Group className="mb-3">
              <Form.Label>Room Number</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter room number"
                value={newRoom.roomNumber}
                onChange={(e) =>
                  setNewRoom({ ...newRoom, roomNumber: e.target.value })
                }
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Room Type</Form.Label>
              <Form.Select
                value={newRoom.type}
                onChange={(e) =>
                  setNewRoom({ ...newRoom, type: e.target.value })
                }
              >
                <option value="" disabled>-- Select Type --</option>
                <option value="FBK">BOUTIQUE</option>
                <option value="FSKG">SS KING</option>
                <option value="FSST">SS TWIN</option>
                <option value="DXQ">DXQ</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Price</Form.Label>
              <Form.Control
                type="number"
                placeholder="Enter price"
                value={newRoom.price}
                onChange={(e) =>
                  setNewRoom({ ...newRoom, price: e.target.value })
                }
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={newRoom.status}
                onChange={(e) =>
                  setNewRoom({ ...newRoom, status: e.target.value })
                }
              >
                <option value="VCI">VCI - Vacant Clean Inspected</option>
                <option value="VCN">VCN - Vacant Clean Not inspected</option>
                <option value="VDN">VDN - Vacant Dirty</option>
                <option value="OOO">OOO - Out of Order</option>
              </Form.Select>
            </Form.Group>

          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button variant="secondary" onClick={handleCloseAdd}> {/* Ganti ke secondary agar konsisten */}
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate}>
              Save Room
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Edit Room Modal (Style Disesuaikan) */}
        <Modal 
          show={showEditModal} 
          onHide={handleCloseEdit} 
          centered 
          contentClassName="shadow-lg" // 🔹 UBAH: Tambah shadow-lg
        >
          <Modal.Header 
            closeButton 
            className="bg-primary text-dark" // 🔹 UBAH: Ganti style header
          >
            <Modal.Title className="fw-bold">✏️ Edit Room</Modal.Title>
          </Modal.Header>
          {editRoom && (
            <>
              <Modal.Body>
                {/* 🔹 UBAH: Ganti FloatingLabel ke Form.Group */}
                <Form.Group className="mb-3">
                  <Form.Label>Room Number</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter room number"
                    value={editRoom.roomNumber}
                    onChange={(e) =>
                      setEditRoom({ ...editRoom, roomNumber: e.target.value })
                    }
                    // Tambahkan disabled
                    disabled={user && user.role === 'STAFF'} 
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Room Type</Form.Label>
                  <Form.Select
                    value={editRoom.type}
                    onChange={(e) =>
                      setEditRoom({ ...editRoom, type: e.target.value })
                    }
                    // Tambahkan disabled
                    disabled={user && user.role === 'STAFF'} 
                  >
                    <option value="FBK">BOUTIQUE</option>
                    <option value="FSKG">SS KING</option>
                    <option value="FSST">SS TWIN</option>
                    <option value="DXQ">DXQ</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Price</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="Enter price"
                    value={editRoom.price}
                    onChange={(e) =>
                      setEditRoom({ ...editRoom, price: e.target.value })
                    }
                    // Tambahkan disabled
                    disabled={user && user.role === 'STAFF'} 
                  />
                </Form.Group>

                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={editRoom.status}
                    onChange={(e) =>
                      setEditRoom({ ...editRoom, status: e.target.value })
                    }
                    // ❗️ JANGAN dinonaktifkan, karena STAFF boleh mengubah ini
                  >
                    <option value="VCI">VCI - Vacant Clean Inspected</option>
                    <option value="VCN">VCN - Vacant Clean Not inspected</option>
                    <option value="OCCUPIED">OCCUPIED</option>
                    <option value="VDN">VDN - Vacant Dirty</option>
                    <option value="OOO">OOO - Out of Order</option>
                  </Form.Select>
                </Form.Group>

              </Modal.Body>
              <Modal.Footer className="border-0">
                <Button variant="secondary" onClick={handleCloseEdit}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleUpdate}>
                  Update Room
                </Button>
              </Modal.Footer>
            </>
          )}
        </Modal>
        <ConfirmationDialog
          show={showDeleteModal}
          onClose={handleCloseDeleteModal}
          onConfirm={executeDelete}
          title="Konfirmasi Hapus Kamar"
          message={`Apakah Anda yakin ingin menghapus kamar ini? Tindakan ini tidak dapat dibatalkan.`}
          confirmText="Ya, Hapus"
          cancelText="Batal"
        />
      </div>
  );
};

export default RoomList;