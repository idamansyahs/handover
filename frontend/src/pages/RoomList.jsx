import React, { useEffect, useState } from "react";
import api from "../api";
import Layout from "../components/Layout";

const RoomList = () => {
  const [rooms, setRooms] = useState([]);

  const [newRoom, setNewRoom] = useState({
    roomNumber: "",
    type: "",
    price: "",
    status: "VCI",
  });
  const [editRoom, setEditRoom] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchRooms();
  }, );

  const fetchRooms = async () => {
    try {
      const res = await api.get("/api/room", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRooms(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async () => {
    try {
      await api.post("/api/room", newRoom, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNewRoom({ roomNumber: "", type: "", price: "", status: "VCI" });
      fetchRooms();
      const modal = window.bootstrap.Modal.getInstance(
        document.getElementById("addRoomModal")
      );
      if (modal) modal.hide();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async () => {
    if (!editRoom) return;
    try {
      await api.put(`/api/room/${editRoom.id}`, editRoom, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchRooms();
      setEditRoom(null);
      const modal = window.bootstrap.Modal.getInstance(
        document.getElementById("editRoomModal")
      );
      if (modal) modal.hide();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin ingin menghapus room ini?")) return;
    try {
      await api.delete(`/api/room/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchRooms();
    } catch (err) {
      console.error(err);
    }
  };

  // Fungsi badge status dengan kontras teks
    const getStatusBadge = (status) => {
      const colors = {
        OCCUPIED: "danger",   // Merah
        VCI: "success",     // Hijau (Vacant Clean Inspected)
        VCN: "info",        // Biru muda (Vacant Clean Not Inspected)
        VDN: "warning",     // Kuning (Vacant Dirty Not Inspected)
        OOO: "dark",        // Hitam/Gelap (Out of Order)
      };
      const textContrast = {
         OCCUPIED: "white",
         VCI: "white",
         VCN: "dark",
         VDN: "dark",
         OOO: "white",
      }
      return <span className={`badge bg-${colors[status]} text-${textContrast[status]}`}>{status}</span>;
    };

  return (
    <Layout>
      {/* Gunakan container-fluid */}
      <div className="container-fluid py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="h3 mb-0 fw-bold text-dark">Room Management</h1>
          <button
            className="btn btn-primary shadow-sm"
            data-bs-toggle="modal"
            data-bs-target="#addRoomModal"
          >
            <i className="bi bi-plus-circle me-1"></i> Add Room
          </button>
        </div>

        {/* Tampilan Card untuk Room */}
        <div className="row">
          {rooms.length > 0 ? rooms.map((room) => (
            <div key={room.id} className="col-sm-6 col-md-4 col-lg-3 mb-4">
              <div className="card shadow-sm border-0 rounded-3 h-100">
                <div className="card-body d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="card-title fw-bold mb-0 text-dark">
                      Room {room.roomNumber}
                    </h5>
                    {getStatusBadge(room.status)}
                  </div>
                  <p className="text-muted mb-1 small">
                    <strong>Type:</strong> {room.type}
                  </p>
                  <p className="text-muted mb-3 small">
                    <strong>Price:</strong> Rp{" "}
                    {Number(room.price).toLocaleString('id-ID')}
                  </p>
                  {/* Tombol di bawah */}
                  <div className="mt-auto d-flex justify-content-between">
                    <button
                      className="btn btn-outline-primary btn-sm" // Outline Primary
                      data-bs-toggle="modal"
                      data-bs-target="#editRoomModal"
                      onClick={() => setEditRoom(room)}
                      title="Edit Room"
                    >
                      <i className="bi bi-pencil-square"></i> Edit
                    </button>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => handleDelete(room.id)}
                      title="Delete Room"
                    >
                      <i className="bi bi-trash"></i> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="col-12">
                <div className="alert alert-secondary text-center">No rooms found. Click 'Add Room' to create one.</div>
            </div>
          )}
        </div>

        {/* Add Room Modal */}
        <div className="modal fade" id="addRoomModal" tabIndex="-1" aria-hidden="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 shadow">
               {/* Header bg-primary */}
              <div className="modal-header bg-primary text-dark border-0">
                <h5 className="modal-title fw-bold">Add New Room</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div className="modal-body">
                {/* ... form inputs (gunakan mb-3 untuk margin) ... */}
                <div className="mb-3">
                  <label htmlFor="roomNumber" className="form-label">Room Number</label>
                  <input type="text" className="form-control" id="roomNumber"
                    placeholder="Room Number"
                    value={newRoom.roomNumber}
                    onChange={(e) =>
                      setNewRoom({ ...newRoom, roomNumber: e.target.value })
                    }
                  />
                </div>

                <div className="mb-3">
                    <label htmlFor="roomType" className="form-label">Room Type</label>
                    <select className="form-select" id="roomType"
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
                  </select>
                </div>

                <div className="mb-3">
                  <label htmlFor="price" className="form-label">Price</label>
                  <input type="number" className="form-control" id="price"
                    placeholder="Price"
                    value={newRoom.price}
                    onChange={(e) =>
                      setNewRoom({ ...newRoom, price: e.target.value })
                    }
                  />
                </div>

                <div className="mb-3">
                    <label htmlFor="status" className="form-label">Status</label>
                    <select className="form-select" id="status"
                    value={newRoom.status}
                    onChange={(e) =>
                      setNewRoom({ ...newRoom, status: e.target.value })
                    }
                  >
                    <option value="VCI">VCI - Vacant Clean Inspected</option>
                    <option value="VCN">VCN - Vacant Clean Not inspected</option>
                {/* <option value="OCCUPIED">OCCUPIED</option> Occupied tidak bisa diset manual saat create */}
                    <option value="VDN">VDN - Vacant Dirty</option>
                    <option value="OOO">OOO - Out of Order</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-secondary" data-bs-dismiss="modal">
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleCreate}>
                 <i className="bi bi-save me-1"></i> Save Room
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Room Modal */}
        <div className="modal fade" id="editRoomModal" tabIndex="-1" aria-hidden="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 shadow">
              <div className="modal-header bg-primary text-dark border-0"> {/* Disesuaikan */}
                <h5 className="modal-title fw-bold">Edit Room {editRoom?.roomNumber}</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              {editRoom && (
                <>
                  <div className="modal-body">
                     {/* Form Edit Room */}
                    <div className="mb-3">
                      <label htmlFor="editRoomNumber" className="form-label">Room Number</label>
                      <input
                        type="text"
                        className="form-control"
                        id="editRoomNumber"
                        value={editRoom.roomNumber}
                        onChange={(e) =>
                          setEditRoom({
                            ...editRoom,
                            roomNumber: e.target.value,
                          })
                        }
                      />
                    </div>
                     <div className="mb-3">
                      <label htmlFor="editRoomType" className="form-label">Room Type</label>
                      <select
                        className="form-select"
                        id="editRoomType"
                        value={editRoom.type}
                        onChange={(e) =>
                          setEditRoom({ ...editRoom, type: e.target.value })
                        }
                      >
                         <option value="">-- Select Type --</option>
                         <option value="FBK">BOUTIQUE</option>
                         <option value="FSKG">SS KING</option>
                         <option value="FSST">SS TWIN</option>
                         <option value="DXQ">DXQ</option>
                      </select>
                    </div>
                     <div className="mb-3">
                      <label htmlFor="editPrice" className="form-label">Price (Rp)</label>
                      <input
                        type="number"
                        className="form-control"
                        id="editPrice"
                        value={editRoom.price}
                        onChange={(e) =>
                          setEditRoom({ ...editRoom, price: e.target.value })
                        }
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="editStatus" className="form-label">Status</label>
                      <select
                        className="form-select"
                        id="editStatus"
                        value={editRoom.status}
                        onChange={(e) =>
                          setEditRoom({ ...editRoom, status: e.target.value })
                        }
                      >
                         <option value="VCI">VCI - Vacant Clean Inspected</option>
                         <option value="VCN">VCN - Vacant Clean Not inspected</option>
                         <option value="OCCUPIED">OCCUPIED</option> {/* Status bisa diubah ke Occupied */}
                         <option value="VDN">VDN - Vacant Dirty</option>
                         <option value="OOO">OOO - Out of Order</option>
                      </select>
                    </div>
                  </div>
                  <div className="modal-footer border-0">
                    <button className="btn btn-secondary" data-bs-dismiss="modal">
                      Cancel
                    </button>
                    <button className="btn btn-primary" onClick={handleUpdate}>
                      <i className="bi bi-save me-1"></i> Update Room
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RoomList;
