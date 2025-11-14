import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosConfig";
import Select from "react-select";
import AsyncSelect from "react-select/async";

export default function Dealers() {
  const [dealers, setDealers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);

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

  const fetchDealers = async (page = 1, searchValue = "") => {
    try {
      const response = await axiosInstance.get(
        `/dealers/?page=${page}&search=${searchValue}`
      );
      setDealers(response.data.results);
      setPagination({
        page: page,
        totalPages: Math.ceil(response.data.count / 10),
      });
    } catch (error) {
      console.error(error);
    }
  };

  const [allPlaces, setAllPlaces] = useState([]);

  const fetchPlaces = async () => {
    try {
      const res = await axiosInstance.get("/places/?page=1"); // or fetch all
      setAllPlaces(res.data.results);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPlaces();
  }, []);

  const handleSave = async () => {
    try {
      const payload = { ...form, place_ids: form.place_ids || [] };

      if (editId) {
        await axiosInstance.put(`/dealers/${editId}/`, payload);
      } else {
        await axiosInstance.post("/dealers/", payload);
      }

      setForm({ code: "", name: "", mobile: "", address: "", pincode: "", place_ids: [] });
      setEditId(null);
      setShowModal(false);
      fetchDealers(pagination.page, search); // refresh table
    } catch (err) {
      alert(err.response?.data?.detail || "Error saving dealer");
    }
  };


  const handleDelete = async () => {
    if (!confirm("Delete selected dealers?")) return;

    try {
      await axiosInstance.delete(`/dealers/bulk_delete/?ids=${selectedIds.join(",")}`);
      setSelectedIds([]);
      fetchDealers(1, search);
    } catch (error) {
      alert("Error deleting dealers");
    }
  };

  const openEditModal = (dealer) => {
      setForm({
        code: dealer.code,
        name: dealer.name,
        address: dealer.address || "",
        pincode: dealer.pincode || "",
        mobile: dealer.mobile || "",
        place_ids: dealer.places ? dealer.places.map(p => p.id) : [],
      });
      setEditId(dealer.id);
      setShowModal(true);
    };

  useEffect(() => {
    fetchDealers();
  }, []);

  return (
    <div className="p-4">
      {/* ---- Header ---- */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-4xl font-semibold">Dealers</h2>
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
              setForm({ code: "", name: "", address: "", pincode: "", mobile: "", places: [] });
              setEditId(null);
              setShowModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            + Add Dealer
          </button>
        </div>
      </div>

      {/* ---- Search Input ---- */}
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

      {/* ---- Table ---- */}
      <div className="border rounded-md overflow-hidden">
        <table className="w-full bg-white shadow rounded border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">
                <input
                  type="checkbox"
                  checked={selectedIds.length === dealers.length && dealers.length > 0}
                  onChange={(e) =>
                    setSelectedIds(
                      e.target.checked ? dealers.map((d) => d.id) : []
                    )
                  }
                />
              </th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Address</th>
              <th className="p-2 text-left">Destination Plces</th>
              <th className="p-2 w-28 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {dealers.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center p-4 text-gray-500 italic">
                  No dealers found
                </td>
              </tr>
            )}
            {dealers.map((dealer) => (
              <tr key={dealer.id} className="border-b">
                {/* Checkbox */}
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

                {/* Code + Name */}
                <td className="p-2 text-sm max-w-[90px]">
                  <div className="flex items-center gap-1">
                    <div className="font-semibold">{dealer.code} - </div>
                    <div className="capitalize">{dealer.name}</div>
                  </div>
                </td>

                {/* Pincode, Mobile, Address */}
                <td className="p-2 text-sm max-w-[90px]">
                  {[
                    dealer.mobile,
                    dealer.address,
                    dealer.pincode
                  ].filter(Boolean).join(", ")}
                </td>


                {/* Places grouped by destination */}
               <td className="p-2 text-sm">
                {dealer.places && dealer.places.length > 0 ? (
                  // Group places by destination
                  Object.entries(
                    dealer.places.reduce((acc, place) => {
                      if (!acc[place.destination_name]) acc[place.destination_name] = [];
                      acc[place.destination_name].push(place.name);
                      return acc;
                    }, {})
                  ).map(([destination, places]) => (
                    <div key={destination}>
                      {places.join(", ")} - {destination}
                    </div>
                  ))
                ) : (
                  <span className="text-gray-400 italic">No places</span>
                )}
              </td>

                {/* Actions */}
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

        {/* ---- Pagination ---- */}
        <div className="flex justify-between items-center p-3 bg-gray-100">
          <button
            disabled={pagination.page <= 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
            onClick={() => fetchDealers(pagination.page - 1, search)}
          >
            Prev
          </button>

          <span>
            Page <b>{pagination.page}</b> / {pagination.totalPages}
          </span>

          <button
            disabled={pagination.page >= pagination.totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
            onClick={() => fetchDealers(pagination.page + 1, search)}
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
              {editId ? "Edit Dealer" : "Add Dealer"}
            </h3>

            <input
              type="text"
              placeholder="Dealer code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="border px-3 py-2 rounded w-full mb-3"
            />

            <input
              type="text"
              placeholder="Dealer name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border px-3 py-2 rounded w-full mb-3"
            />


            <input
              type="text"
              placeholder="Mobile (optional)"
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              className="border px-3 py-2 rounded w-full mb-3"
            />

            <input
              type="text"
              placeholder="Pincode (optional)"
              value={form.pincode}
              onChange={(e) => setForm({ ...form, pincode: e.target.value })}
              className="border px-3 py-2 rounded w-full mb-3"
            />

            <textarea
              placeholder="Address (optional)"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="border px-3 py-2 rounded w-full mb-3 h-20 resize-none"
            />
           
            <div className="mb-3">
            <label  abel className="font-semibold mb-1 block">Places</label>
            <AsyncSelect
              isMulti
              cacheOptions
              defaultOptions
              loadOptions={async (inputValue) => {
                try {
                  const res = await axiosInstance.get(`/places/?search=${inputValue}`);
                  // Map API results to react-select format
                  return res.data.results.map((place) => ({
                    value: place.id,
                    label: `${place.name} - ${place.destination_name}`,
                  }));
                } catch (err) {
                  console.error(err);
                  return [];
                }
              }}
              value={
                // Map current form.place_ids to Select value objects
                allPlaces
                  .filter((p) => form.place_ids?.includes(p.id))
                  .map((p) => ({
                    value: p.id,
                    label: `${p.name} - ${p.destination_name}`,
                  }))
              }
              onChange={(selectedOptions) =>
                setForm({
                  ...form,
                  place_ids: selectedOptions.map((opt) => opt.value),
                })
              }
              placeholder="Search and select places..."
              className="w-full"
              classNamePrefix="react-select"
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
