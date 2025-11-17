import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosConfig";

export default function Destination() {
  const [destinations, setDestinations] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    place: "",
    description: "",
    is_garage: false,
    });


  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
  });

  const fetchDestinations = async (page = 1, searchValue = "") => {
    try {
      const response = await axiosInstance.get(
        `/destinations/?page=${page}&search=${searchValue}`
      );
      setDestinations(response.data.results);
      setPagination({
        page: page,
        totalPages: Math.ceil(response.data.count / 10),
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleSave = async () => {
    try {
      if (editId) {
        await axiosInstance.put(`/destinations/${editId}/`, form);
      } else {
        await axiosInstance.post(`/destinations/`, form);
      }

      setForm({ name: "", is_garage: false });
      setEditId(null);
      setShowModal(false);
      fetchDestinations(pagination.page, search);
    } catch (error) {
      alert(error.response?.data?.detail || "Error saving destination");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete selected destinations?")) return;

    try {
      await axiosInstance.delete(`/destinations/bulk_delete/?ids=${selectedIds.join(",")}`);
      setSelectedIds([]);
      fetchDestinations(1, search);
    } catch (error) {
      alert("Error deleting destinations");
    }
  };


  const openEditModal = (destination) => {
    setForm({
        name: destination.name,
        place: destination.place,
        description: destination.description,
        is_garage: destination.is_garage,
    });
    setEditId(destination.id);
    setShowModal(true);
    };

  useEffect(() => {
    fetchDestinations();
  }, []);

  return (
    <div className="p-4">
      {/* ---- Header ---- */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-3xl font-semibold">Destinations</h2>
        <div className="flex  gap-2">
           {/* ---- Bulk Delete Button ---- */}
      {selectedIds.length > 0 && (
        <button
          onClick={handleDelete}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Delete Selected ({selectedIds.length})
        </button>
      )} 

        <button
          onClick={() => {
            setForm({ name: "", is_garage: false });
            setEditId(null);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          + Add Destination
        </button>
        </div>
      </div>

      {/* ---- Search Input ---- */}
      <input
        type="text"
        placeholder="Search destination..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          fetchDestinations(1, e.target.value);
        }}
        className="border px-3 py-2 rounded w-full mb-4"
      />

      {/* ---- Table ---- */}
      <div className="border rounded-md overflow-hidden">
       
        <table className="w-full bg-white shadow rounded border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">
                <input
                  type="checkbox"
                  checked={selectedIds.length === destinations.length}
                  onChange={(e) =>
                    setSelectedIds(
                      e.target.checked ? destinations.map((d) => d.id) : []
                    )
                  }
                />
              </th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Place</th>
                <th className="p-2 text-left">Description</th>
              <th className="p-2 text-left">Garage?</th>
              <th className="p-2 w-28 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {destinations.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center p-4 text-gray-500 italic">
                  No Destinations found
                </td>
              </tr>
            )}
            {destinations.map((destination) => (
              <tr key={destination.id} className="border-b">
                <td className="p-2 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(destination.id)}
                    onChange={(e) =>
                      setSelectedIds(
                        e.target.checked
                          ? [...selectedIds, destination.id]
                          : selectedIds.filter((id) => id !== destination.id)
                      )
                    }
                  />
                </td>
                <td className="p-2">{destination.name}</td>
                <td className="p-2">{destination.place || "-"}</td>
                <td className="p-2">{destination.description || "-"}</td>
                <td className="p-2">{destination.is_garage ? "Yes" : "No"}</td>

                <td className="p-2 text-center">
                  <button
                    onClick={() => openEditModal(destination)}
                    className="px-3 py-1 bg-green-600 text-white rounded"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ---- Pagination ---- */}
        <div className="flex justify-between items-center p-3 bg-gray-100">
          <button
            disabled={pagination.page <= 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
            onClick={() => fetchDestinations(pagination.page - 1, search)}
          >
            Prev
          </button>

          <span>
            Page <b>{pagination.page}</b> / {pagination.totalPages}
          </span>

          <button
            disabled={pagination.page >= pagination.totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
            onClick={() => fetchDestinations(pagination.page + 1, search)}
          >
            Next
          </button>
        </div>
      </div>

      {/* ---- Modal ---- */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center">
          <div className="bg-white w-96 p-4 rounded shadow-lg">
            <h3 className="text-lg font-semibold mb-3">
              {editId ? "Edit Destination" : "Add Destination"}
            </h3>

            <input
              type="text"
              placeholder="Destination name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border px-3 py-2 rounded w-full mb-3"
            />

            <input
            type="text"
            placeholder="Place (optional)"
            value={form.place}
            onChange={(e) => setForm({ ...form, place: e.target.value })}
            className="border px-3 py-2 rounded w-full mb-3"
            />

            <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="border px-3 py-2 rounded w-full mb-3 h-20 resize-none"
            />


            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={form.is_garage}
                onChange={(e) =>
                  setForm({ ...form, is_garage: e.target.checked })
                }
              />
              Mark as Garage
            </label>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-1 border rounded"
              >
                Cancel
              </button>
              <button onClick={handleSave} className="px-3 py-1 bg-blue-600 text-white rounded">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
