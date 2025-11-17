import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosConfig";
import AsyncSelect from "react-select/async";

export default function Dealers() {
  const [dealers, setDealers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [excelFile, setExcelFile] = useState(null);

  const [form, setForm] = useState({
    code: "",
    name: "",
    address: "",
    pincode: "",
    mobile: "",
    place_ids: [],
  });

  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
  });

  const [allPlaces, setAllPlaces] = useState([]);

  // -------------------------
  // Fetch Dealers
  // -------------------------
  const fetchDealers = async (page = 1, searchValue = "") => {
    try {
      const res = await axiosInstance.get(
        `/dealers/?page=${page}&search=${searchValue}`
      );

      setDealers(res.data.results);
      setPagination({
        page,
        totalPages: Math.ceil(res.data.count / 10),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // -------------------------
  // Fetch ALL Places for Select mapping
  // -------------------------
  const fetchPlaces = async () => {
    try {
      const res = await axiosInstance.get("/places/?all=1");
      setAllPlaces(res.data.results);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDealers();
    fetchPlaces();
  }, []);

  // -------------------------
  // Save Dealer
  // -------------------------
  const handleSave = async () => {
    try {
      const payload = {
        ...form,
        place_ids: form.place_ids || [],
      };

      if (editId) {
        await axiosInstance.put(`/dealers/${editId}/`, payload);
      } else {
        await axiosInstance.post(`/dealers/`, payload);
      }

      setForm({
        code: "",
        name: "",
        address: "",
        pincode: "",
        mobile: "",
        place_ids: [],
      });
      setEditId(null);
      setShowModal(false);

      fetchDealers(pagination.page, search);
      fetchPlaces(); // refresh new places for dropdown
    } catch (err) {
      alert(err.response?.data?.detail || "Error saving dealer");
    }
  };

  // -------------------------
  // Delete Selected
  // -------------------------
  const handleDelete = async () => {
    if (!confirm("Delete selected dealers?")) return;

    try {
      await axiosInstance.delete(
        `/dealers/bulk_delete/?ids=${selectedIds.join(",")}`
      );
      setSelectedIds([]);
      fetchDealers(1, search);
    } catch (err) {
      alert("Error deleting dealers");
    }
  };

  // -------------------------
  // Excel Import
  // -------------------------
  const handleExcelUpload = async (file) => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axiosInstance.post(
        "/dealers/import_excel/",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      alert(
        `Import Success!\nDealers: ${res.data.dealers_created}\nPlaces: ${res.data.places_created}\nDestinations: ${res.data.destinations_created}`
      );

      fetchDealers(1, "");
      fetchPlaces();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Excel import failed");
    }
  };

  // -------------------------
  // Edit Modal Open
  // -------------------------
  const openEditModal = (dealer) => {
    setForm({
      code: dealer.code,
      name: dealer.name,
      address: dealer.address || "",
      pincode: dealer.pincode || "",
      mobile: dealer.mobile || "",
      place_ids: dealer.places ? dealer.places.map((p) => p.id) : [],
    });

    setEditId(dealer.id);
    setShowModal(true);
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-3xl font-semibold">Dealers</h2>

        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleDelete}
              className="bg-red-600 text-white px-4 py-2 rounded"
            >
              Delete Selected ({selectedIds.length})
            </button>
          )}

          <button
            className="px-4 py-2 bg-green-600 text-white rounded"
            onClick={() => document.getElementById("excelInput").click()}
          >
            Import Dealers
          </button>

          <input
            id="excelInput"
            type="file"
            accept=".xls,.xlsx,.ods"
            className="hidden"
            onChange={(e) => {
              if (e.target.files[0]) handleExcelUpload(e.target.files[0]);
            }}
          />

          <button
            onClick={() => {
              setForm({
                code: "",
                name: "",
                address: "",
                pincode: "",
                mobile: "",
                place_ids: [],
              });
              setEditId(null);
              setShowModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            + Add Dealer
          </button>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search dealer..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          fetchDealers(1, e.target.value);
        }}
        className="border px-3 py-2 rounded w-full mb-4"
      />

      {/* Table */}
      <div className="border rounded-md overflow-hidden">
        <table className="w-full bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">
                <input
                  type="checkbox"
                  checked={
                    dealers.length > 0 &&
                    selectedIds.length === dealers.length
                  }
                  onChange={(e) =>
                    setSelectedIds(
                      e.target.checked ? dealers.map((d) => d.id) : []
                    )
                  }
                />
              </th>

              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Address</th>
              <th className="p-2 text-left">Destinations</th>
              <th className="p-2 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {dealers.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center p-4 text-gray-500">
                  No dealers found
                </td>
              </tr>
            )}

            {dealers.map((dealer) => (
              <tr key={dealer.id} className="border-b">
                <td className="p-2 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(dealer.id)}
                    onChange={(e) =>
                      setSelectedIds(
                        e.target.checked
                          ? [...selectedIds, dealer.id]
                          : selectedIds.filter((id) => id !== dealer.id)
                      )
                    }
                  />
                </td>

                <td className="p-2">
                  <strong>{dealer.code}</strong> – {dealer.name}
                </td>

                <td className="p-2 text-sm">
                  {[dealer.mobile, dealer.address, dealer.pincode]
                    .filter(Boolean)
                    .join(", ")}
                </td>

                <td className="p-2 text-sm">
                  {dealer.places?.length ? (
                    Object.entries(
                      dealer.places.reduce((acc, place) => {
                        if (!acc[place.destination_name])
                          acc[place.destination_name] = [];
                        acc[place.destination_name].push(place.name);
                        return acc;
                      }, {})
                    ).map(([destination, places]) => (
                      <div key={destination}>
                        {places.join(", ")} – {destination}
                      </div>
                    ))
                  ) : (
                    <span className="text-gray-400 italic">No places</span>
                  )}
                </td>

                <td className="p-2 text-center">
                  <button
                    onClick={() => openEditModal(dealer)}
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
            className="px-3 py-1 border rounded disabled:opacity-50"
            disabled={pagination.page <= 1}
            onClick={() => fetchDealers(pagination.page - 1, search)}
          >
            Prev
          </button>

          <span>
            Page <b>{pagination.page}</b> / {pagination.totalPages}
          </span>

          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => fetchDealers(pagination.page + 1, search)}
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
              {editId ? "Edit Dealer" : "Add Dealer"}
            </h3>

            <input
              type="text"
              placeholder="Dealer Code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="border px-3 py-2 rounded w-full mb-3"
            />

            <input
              type="text"
              placeholder="Dealer Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border px-3 py-2 rounded w-full mb-3"
            />

            <input
              type="text"
              placeholder="Mobile"
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              className="border px-3 py-2 rounded w-full mb-3"
            />

            <input
              type="text"
              placeholder="Pincode"
              value={form.pincode}
              onChange={(e) => setForm({ ...form, pincode: e.target.value })}
              className="border px-3 py-2 rounded w-full mb-3"
            />

            <textarea
              placeholder="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="border px-3 py-2 rounded w-full mb-3 h-20"
            />

            <div className="mb-3">
              <label className="font-semibold mb-1 block">Places</label>

              <AsyncSelect
                isMulti
                cacheOptions
                defaultOptions
                loadOptions={async (inputValue) => {
                  try {
                    const res = await axiosInstance.get(
                      `/places/?search=${inputValue}`
                    );
                    return res.data.results.map((place) => ({
                      value: place.id,
                      label: `${place.name} - ${place.destination_name}`,
                    }));
                  } catch {
                    return [];
                  }
                }}
                value={form.place_ids?.map((id) => {
                  const place = allPlaces.find((p) => p.id === id);
                  return place
                    ? {
                        value: place.id,
                        label: `${place.name} - ${place.destination_name}`,
                      }
                    : { value: id, label: "Loading..." };
                })}
                onChange={(selected) =>
                  setForm({
                    ...form,
                    place_ids: selected.map((s) => s.value),
                  })
                }
                placeholder="Search places..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-1 border rounded"
              >
                Cancel
              </button>

              <button
                onClick={handleSave}
                className="px-3 py-1 bg-blue-600 text-white rounded"
              >
                Save
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
