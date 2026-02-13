// src/pages/TransportItems.jsx
import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosConfig";

export default function TransportItems() {
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [itemId, setItemId] = useState(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  // ✅ Fetch list
  const fetchItems = async () => {
    const res = await axiosInstance.get(
      `transport-items/?page=${page}&search=${search}`
    );
    setItems(res.data.results);
    setLastPage(Math.ceil(res.data.count / 10));
  };

  useEffect(() => {
    fetchItems();
  }, [page, search]);

  // ✅ Reset form
  const resetForm = () => {
    setName("");
    setDescription("");
    setItemId(null);
    setIsEditing(false);
  };

  // ✅ Open Add
  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  // ✅ Open Edit
  const openEditModal = (item) => {
    setName(item.name);
    setDescription(item.description ?? "");
    setItemId(item.id);
    setIsEditing(true);
    setShowModal(true);
  };

  // ✅ Save
  const saveItem = async (e) => {
    e.preventDefault();

    const payload = { name, description };

    if (isEditing) {
      await axiosInstance.put(`transport-items/${itemId}/`, payload);
    } else {
      await axiosInstance.post(`transport-items/`, payload);
    }

    fetchItems();
    setShowModal(false);
    resetForm();
  };

  // ✅ Single Delete
  const deleteItem = async (id) => {
    if (!confirm("Are you sure delete this item?")) return;
    await axiosInstance.delete(`/transport-items/${id}/`);
    fetchItems();
  };

  // ✅ Select All
  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((i) => i.id));
    }
  };

  // ✅ Toggle single
  const toggleSelection = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-semibold">Transport Items</h1>

        <button
          onClick={openAddModal}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Add Item
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search items..."
        className="border px-3 py-2 rounded mb-4 w-full"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Table */}
      <div className="border rounded-md overflow-hidden">
        <table className="w-full bg-white shadow rounded border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">
                <input
                  type="checkbox"
                  onChange={toggleSelectAll}
                  checked={selectedIds.length === items.length && items.length > 0}
                />
              </th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Description</th>
              <th className="p-2"></th>
            </tr>
          </thead>

          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center p-4 text-gray-500 italic">
                  No items found
                </td>
              </tr>
            )}

            {items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-2 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => toggleSelection(item.id)}
                  />
                </td>

                <td className="p-2">{item.name}</td>
                <td className="p-2">{item.description}</td>

                <td className="p-2 text-right">
                  <button
                    onClick={() => openEditModal(item)}
                    className="text-blue-600 mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="text-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex justify-between items-center p-3 bg-gray-100">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>

          <span>
            Page <b>{page}</b> / {lastPage}
          </span>

          <button
            disabled={page === lastPage}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-96 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">
              {isEditing ? "Edit Item" : "Add Item"}
            </h2>

            <form onSubmit={saveItem}>
              <label className="block mb-2">Name</label>
              <input
                type="text"
                className="w-full border p-2 rounded mb-4"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <label className="block mb-2">Description</label>
              <textarea
                className="w-full border p-2 rounded mb-4"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="border px-4 py-2 rounded"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                  {isEditing ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
