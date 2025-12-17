import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosConfig";
import { Link } from "react-router-dom";

export default function DestinationEntries() {
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  // --- Safe pages calc ---
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(
        `/destination-entries/?search=${search}&page=${page}`
      );

      setEntries(res.data.results || []);
      setCount(res.data.count || 0);
      setPageSize(res.data.page_size || 10);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, [search, page]);

  const deleteEntry = async (id) => {
    if (!window.confirm("Delete this entry?")) return;

    try {
      await axiosInstance.delete(`/destination-entries/${id}/`);
      fetchEntries();
    } catch (err) {
      console.error(err);
      alert("Delete failed!");
    }
  };

  return (
    <div className="p-6">

      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-2xl font-bold tracking-tight">
          Destination Entries
        </h1>

        <Link to="create" className="px-4 py-2 rounded bg-blue-600 text-white">
          + New Entry
        </Link>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          className="border p-2 w-full rounded"
          placeholder="Search destination, date, to address..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
      </div>

      {/* Table */}
      <div className="overflow-auto border rounded shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left border-b">
            <tr>
              <th className="p-2">ID</th>
              <th className="p-2">Destination</th>
              <th className="p-2">Date</th>
              <th className="p-2">Ranges Used</th>
              <th className="p-2">Billed?</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>

        <tbody>
          {loading && (
            <tr>
              <td colSpan={5} className="p-4 text-center">Loading...</td>
            </tr>
          )}

          {!loading && entries.length === 0 && (
            <tr>
              <td colSpan={5} className="p-4 text-center text-gray-500">
                No destination entries found.
              </td>
            </tr>
          )}

          {entries.map((entry) => (
            <tr key={entry.id} className="border-b hover:bg-gray-50">
              <td className="p-2">{entry.id}</td>

              <td className="p-2 font-medium">
                {/* entry.destination could be a name or object — adjust if needed */}
                {typeof entry.destination === "string"
                  ? entry.destination
                  : entry.destination?.name || entry.destination?.label || "—"}
              </td>

              <td className="p-2">{entry.date}</td>

              {/* Ranges */}
              <td className="p-2 text-sm">
                {entry.rate_ranges && entry.rate_ranges.length > 0 ? (
                  entry.rate_ranges.join(", ")
                ) : (
                  <span className="text-gray-400">No ranges</span>
                )}
              </td>

              {/* Billed (show bill number or Not billed) */}
              <td className="p-2">
                {entry.service_bill && entry.service_bill.bill_date ? (
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                    Bill @{entry.service_bill.bill_date}
                  </span>
                ) : (
                  <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded">
                    Not billed
                  </span>
                )}
              </td>

               {/* Action buttons */}
                <td className="p-2 flex gap-2">
                  <Link
                    to={`/app/destination-entries/${entry.id}`}
                    className="px-2 py-1 bg-yellow-500 text-white rounded"
                  >
                    Edit
                  </Link>

                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="px-2 py-1 bg-red-600 text-white rounded"
                  >
                    Delete
                  </button>
                </td>
            </tr>
          ))}
        </tbody>

        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-center items-center gap-2 mt-4">

        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Prev
        </button>

        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            onClick={() => setPage(i + 1)}
            className={`px-3 py-1 border rounded ${
              page === i + 1 ? "bg-blue-600 text-white" : ""
            }`}
          >
            {i + 1}
          </button>
        ))}

        <button
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Next
        </button>

      </div>
    </div>
  );
}
