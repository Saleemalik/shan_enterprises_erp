import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosConfig";

export default function RateRange() {
  const [rateRanges, setRateRanges] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState({
    from_km: "",
    to_km: "",
    rate: "",
    is_mtk: true,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
  });

  const fetchRateRanges = async (page = 1, searchValue = "") => {
    try {
      const response = await axiosInstance.get(
        `/rate-ranges/?page=${page}&search=${searchValue}`
      );

      setRateRanges(response.data.results);
      setPagination({
        page,
        totalPages: Math.ceil(response.data.count / 10),
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleSave = async () => {
    try {
      if (editId) {
        await axiosInstance.put(`/rate-ranges/${editId}/`, form);
      } else {
        await axiosInstance.post(`/rate-ranges/`, form);
      }

      setForm({ from_km: "", to_km: "", rate: "", is_mtk: true });
      setEditId(null);
      setShowModal(false);
      fetchRateRanges(pagination.page, search);
    } catch (error) {
      alert(error.response?.data?.detail || "Error saving rate range");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete selected slabs?")) return;

    try {
      await axiosInstance.delete(`/rate-ranges/bulk_delete/?ids=${selectedIds.join(",")}`);
      setSelectedIds([]);
      fetchRateRanges(1, search);
    } catch (error) {
      alert("Error deleting rate range");
    }
  };

  const openEditModal = (slab) => {
    setForm({
      from_km: slab.from_km,
      to_km: slab.to_km,
      rate: slab.rate,
      is_mtk: slab.is_mtk,
    });
    setEditId(slab.id);
    setShowModal(true);
  };

  useEffect(() => {
    fetchRateRanges();
  }, []);

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-4xl font-semibold">Rate Ranges</h2>

        <div className="flex gap-2">
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
              setForm({ from_km: "", to_km: "", rate: "", is_mtk: true });
              setEditId(null);
              setShowModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            + Add Slab
          </button>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by km..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          fetchRateRanges(1, e.target.value);
        }}
        className="border px-3 py-2 rounded w-full mb-4"
      />

      {/* Table */}
      <div className="border rounded-md overflow-hidden">
        <table className="w-full bg-white shadow rounded border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">
                <input
                  type="checkbox"
                  checked={selectedIds.length === rateRanges.length}
                  onChange={(e) =>
                    setSelectedIds(
                      e.target.checked ? rateRanges.map((r) => r.id) : []
                    )
                  }
                />
              </th>
              <th className="p-2 text-left">From KM</th>
              <th className="p-2 text-left">To KM</th>
              <th className="p-2 text-left">Rate</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 w-28 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {rateRanges.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center p-4 text-gray-500 italic">
                No Ranges found
              </td>
            </tr>
          )}
            {rateRanges.map((slab) => (
              <tr key={slab.id} className="border-b">
                <td className="p-2 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(slab.id)}
                    onChange={(e) =>
                      setSelectedIds(
                        e.target.checked
                          ? [...selectedIds, slab.id]
                          : selectedIds.filter((id) => id !== slab.id)
                      )
                    }
                  />
                </td>

                <td className="p-2">{slab.from_km}</td>
                <td className="p-2">{slab.to_km}</td>
                <td className="p-2">{slab.rate}</td>
                <td className="p-2">{slab.is_mtk ? "MTK × Rate" : "MT × Rate"}</td>

                <td className="p-2 text-center">
                  <button
                    onClick={() => openEditModal(slab)}
                    className="px-3 py-1 bg-green-600 text-white rounded"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex justify-between items-center p-3 bg-gray-100">
          <button
            disabled={pagination.page <= 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
            onClick={() => fetchRateRanges(pagination.page - 1, search)}
          >
            Prev
          </button>

          <span>
            Page <b>{pagination.page}</b> / {pagination.totalPages}
          </span>

          <button
            disabled={pagination.page >= pagination.totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
            onClick={() => fetchRateRanges(pagination.page + 1, search)}
          >
            Next
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center">
          <div className="bg-white w-96 p-4 rounded shadow-lg">
            <h3 className="text-lg font-semibold mb-3">
              {editId ? "Edit Rate Range" : "Add Rate Range"}
            </h3>

            <input
              type="number"
              step="0.01"
              placeholder="From KM"
              value={form.from_km}
              onChange={(e) => setForm({ ...form, from_km: e.target.value })}
              className="border px-3 py-2 rounded w-full mb-3"
            />

            <input
              type="number"
              step="0.01"
              placeholder="To KM"
              value={form.to_km}
              onChange={(e) => setForm({ ...form, to_km: e.target.value })}
              className="border px-3 py-2 rounded w-full mb-3"
            />

            <input
              type="number"
              step="0.01"
              placeholder="Rate"
              value={form.rate}
              onChange={(e) => setForm({ ...form, rate: e.target.value })}
              className="border px-3 py-2 rounded w-full mb-3"
            />

            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={form.is_mtk}
                onChange={(e) =>
                  setForm({ ...form, is_mtk: e.target.checked })
                }
              />
              Rate applies to MTK (Qty × KM)
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
