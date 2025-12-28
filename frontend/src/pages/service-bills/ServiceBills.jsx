import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axiosConfig";

export default function ServiceBillList() {
  const navigate = useNavigate();

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
  });

  /* -------------------------
   * Fetch Service Bills
   * ------------------------- */
  const fetchBills = async (page = 1, searchValue = "") => {
    try {
      setLoading(true);

      const res = await axiosInstance.get("/service-bills/", {
        params: {
          page,
          search: searchValue || undefined,
        },
      });

      setBills(res.data.results || []);
      setPagination({
        page,
        totalPages: Math.ceil(res.data.count / 10), // DRF default page size
      });

      setSelectedIds([]); // clear selection on page change
    } catch (err) {
      console.error("Failed to load service bills", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  /* -------------------------
   * Selection helpers
   * ------------------------- */
  const allSelected =
    bills.length > 0 && selectedIds.length === bills.length;

  const toggleSelectAll = (checked) => {
    setSelectedIds(checked ? bills.map((b) => b.id) : []);
  };

  const toggleRow = (id, checked) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id)
    );
  };

  /* -------------------------
   * Bulk Delete
   * ------------------------- */
  const handleDelete = async () => {
    if (!confirm("Delete selected service bills?")) return;

    try {
      await axiosInstance.delete(
        `/service-bills/bulk-delete/?ids=${selectedIds.join(",")}`
      );
      fetchBills(pagination.page, search);
    } catch {
      alert("Failed to delete service bills");
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-semibold">Service Bills</h2>

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
            onClick={() => navigate("/app/service-bills/create")}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            + New Service Bill
          </button>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search service bill..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          fetchBills(1, e.target.value);
        }}
        className="border px-3 py-2 rounded w-full"
      />

      {/* List */}
      {loading ? (
        <div className="p-6 text-center text-gray-400">
          Loading service bills...
        </div>
      ) : bills.length === 0 ? (

        <div className="text-gray-500">No service bills found.</div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          {/* Select All */}
          <div className="bg-gray-100 p-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => toggleSelectAll(e.target.checked)}
            />
            <span className="text-sm text-gray-700">
              Select all ({bills.length})
            </span>
          </div>

          {/* Cards (UNCHANGED UI) */}
          <div className="grid gap-3 p-3">
            {bills.map((bill) => (
              <div
                key={bill.id}
                className={`border rounded p-3 cursor-pointer ${
                  selectedIds.includes(bill.id)
                    ? "border-blue-500 bg-blue-50"
                    : ""
                }`}
                onClick={() => navigate(`/service-bills/${bill.id}`)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(bill.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        toggleRow(bill.id, e.target.checked)
                      }
                    />
                    <strong>Service Bill #{bill.id}</strong>
                  </div>

                  <span className="text-sm text-gray-600">
                    {bill.bill_date || "—"}
                  </span>
                </div>

                <div className="flex gap-8 mt-2 text-sm">
                  <span>Handling: {bill.handling?.bill_number || "—"}</span>
                  <span>Depot: {bill.depot?.bill_number || "—"}</span>
                  <span>FOL: {bill.fol?.bill_number || "—"}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center p-3 bg-gray-100">
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={pagination.page <= 1}
              onClick={() =>
                fetchBills(pagination.page - 1, search)
              }
            >
              Prev
            </button>

            <span className="text-sm">
              Page <b>{pagination.page}</b> / {pagination.totalPages}
            </span>

            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() =>
                fetchBills(pagination.page + 1, search)
              }
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>) 
}
