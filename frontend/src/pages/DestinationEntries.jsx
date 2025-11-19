import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosConfig";
import { Link } from "react-router-dom";

export default function DestinationEntries() {
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Fetch list
  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(
        `/destination-entries/?search=${search}&page=${page}`
      );
      setEntries(res.data.results);
      setTotalPages(Math.ceil(res.data.count / res.data.page_size));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, [search, page]);

  // Delete entry
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
    <div className="p-4">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-3xl font-bold">Destination Entries</h1>

        {/* Create Button */}
        <Link
          to="create"
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          + New Entry
        </Link>
      </div>

      {/* Search input */}
      <input
        type="text"
        className="border p-2 mb-3 w-full rounded"
        placeholder="Search by bill number, date, destination..."
        value={search}
        onChange={(e) => {
          setPage(1);
          setSearch(e.target.value);
        }}
      />

      {/* List Table */}
      <div className="overflow-auto border rounded">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2">ID</th>
              <th className="p-2">Destination</th>
              <th className="p-2">Bill Number</th>
              <th className="p-2">Date</th>
              <th className="p-2">To Address</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="p-3 text-center">
                  Loading...
                </td>
              </tr>
            )}

            {!loading && entries.length === 0 && (
              <tr>
                <td colSpan={6} className="p-3 text-center">
                  No entries found
                </td>
              </tr>
            )}

            {entries.map((entry) => (
              <tr key={entry.id} className="border-b">
                <td className="p-2">{entry.id}</td>
                <td className="p-2">{entry.destination}</td>
                <td className="p-2">{entry.bill_number || "-"}</td>
                <td className="p-2">{entry.date}</td>
                <td className="p-2 max-w-[200px] truncate">
                  {entry.to_address}
                </td>

                {/* Action buttons */}
                <td className="p-2 flex gap-2">
                  <Link
                    to={`/destination-entry/edit/${entry.id}`}
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
      <div className="flex justify-center gap-3 mt-4">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Prev
        </button>

        <span className="px-3 py-1">
          Page {page} / {totalPages}
        </span>

        <button
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
