// src/pages/Places.jsx
import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosConfig";

export default function Places() {
  const [places, setPlaces] = useState([]);
  const [destinations, setDestinations] = useState([]); // ✅ list of destination options

  const [selectedIds, setSelectedIds] = useState([]);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [placeId, setPlaceId] = useState(null);

  const [name, setName] = useState("");
  const [distance, setDistance] = useState("");
  const [district, setDistrict] = useState("");
  const [destination, setDestination] = useState(""); // ✅ selected destination ID

  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  // ✅ Fetch Destinations for Select Dropdown
  const fetchDestinations = async () => {
    const res = await axiosInstance.get("destinations/?page_size=1000");
    setDestinations(res.data.results ?? res.data);
  };

  // ✅ Fetch Places list (pagination + search)
  const fetchPlaces = async () => {
    const res = await axiosInstance.get(`places/?page=${page}&search=${search}`);
    setPlaces(res.data.results);
    setLastPage(Math.ceil(res.data.count / 10));
  };

  useEffect(() => {
    fetchPlaces();
  }, [page, search]);

  useEffect(() => {
    fetchDestinations(); // ✅ load dropdown data once
  }, []);

  // ✅ Reset Modal form
  const resetForm = () => {
    setName("");
    setDistance("");
    setDistrict("");
    setDestination(""); // ✅ clear selection
    setPlaceId(null);
    setIsEditing(false);
  };

  // ✅ Open modal for Add
  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  // ✅ Open modal for Update
  const openEditModal = (place) => {
    setName(place.name);
    setDistance(place.distance);
    setDistrict(place.district ?? "");
    setDestination(place.destination ?? ""); // ✅ existing data
    setPlaceId(place.id);
    setIsEditing(true);
    setShowModal(true);
  };

  // ✅ Save (Create / Update)
  const savePlace = async (e) => {
    e.preventDefault();

    const payload = { name, distance, district, destination };

    if (isEditing) {
      await axiosInstance.put(`/places/${placeId}/`, payload);
    } else {
      await axiosInstance.post(`/places/`, payload);
    }

    fetchPlaces();
    setShowModal(false);
    resetForm();
  };

  // ✅ Single Delete
  const deletePlace = async (id) => {
    if (!confirm("Are you sure delete this place?")) return;
    await axiosInstance.delete(`/places/${id}/`);
    fetchPlaces();
  };

  // ✅ Select / Unselect ALL
  const toggleSelectAll = () => {
    if (selectedIds.length === places.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(places.map((p) => p.id));
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm("Delete selected places?")) return;

    await axiosInstance.delete(`/places/bulk_delete/?ids=${selectedIds}`, { ids: selectedIds });

    setSelectedIds([]);
    fetchPlaces();
  };

  // ✅ Toggle individual selection
  const toggleSelection = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-4">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-semibold">Places</h1>

        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={deleteSelected}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Delete Selected ({selectedIds.length})
            </button>
          )}

          <button
            onClick={openAddModal}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Add Place
          </button>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search places..."
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
                checked={selectedIds.length === places.length && places.length > 0}
              />
            </th>
            <th className="p-2 text-left">Place</th>
            <th className="p-2 text-left">District</th>
            <th className="p-2 text-left">Destination</th>
            <th className="p-2 text-left">Distance (KM)</th>
            <th className="p-2"></th>
          </tr>
        </thead>

        <tbody>
          {places.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center p-4 text-gray-500 italic">
                No places found
              </td>
            </tr>
          )}

          {places.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="p-2 text-center">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(p.id)}
                  onChange={() => toggleSelection(p.id)}
                />
              </td>
              <td className="p-2">{p.name}</td>
              <td className="p-2">{p.district}</td>
              <td className="p-2">{p.destination_name ?? "-"}</td>
              <td className="p-2">{p.distance} km</td>

              <td className="p-2 text-right">
                <button
                  onClick={() => openEditModal(p)}
                  className="text-blue-600 mr-3"
                >
                  Edit
                </button>
                <button
                  onClick={() => deletePlace(p.id)}
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

      {/* Popup Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-96 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">
              {isEditing ? "Edit Place" : "Add Place"}
            </h2>

            <form onSubmit={savePlace}>
              {/* Name */}
              <label className="block mb-2">Place Name</label>
              <input
                type="text"
                className="w-full border p-2 rounded mb-4"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              {/* Distance */}
              <label className="block mb-2">Distance (km)</label>
              <input
                type="number"
                step="0.01"
                className="w-full border p-2 rounded mb-4"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                required
              />

              {/* Destination Dropdown */}
              <label className="block mb-2">Destination</label>
              <select
                className="w-full border p-2 rounded mb-4"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              >
                <option value="">-- Select Destination --</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              {/* District */}
              <label className="block mb-2">District</label>
              <input
                type="text"
                className="w-full border p-2 rounded mb-4"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
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
