// components/ServiceBill/TransportFOLSection.jsx
import { useEffect, useState } from "react";
import axiosInstance from "../../api/axiosConfig";

export default function TransportFOLSection({ data = {}, onChange }) {
  const [rows, setRows] = useState([]);
  const [selectedIds, setSelectedIds] = useState(
    data.destination_entry_ids || []
  );

  const serviceBillId = data?.id;

  const allSelected =
    rows.length > 0 && selectedIds.length === rows.length;

  const someSelected =
    selectedIds.length > 0 && selectedIds.length < rows.length;

  /* ───────── Fetch unbilled + current service bill entries ───────── */
  useEffect(() => {
    axiosInstance
      .get("/destination-entries/transport-fol-unbilled/", {
        params: {
          service_bill_id: serviceBillId || undefined,
        },
      })
      .then((res) => setRows(res.data))
      .catch((err) => console.error(err));
  }, [serviceBillId]);

  /* ───────── Hydrate selection (edit mode) ───────── */
  useEffect(() => {
    if (
      data.destination_entry_ids &&
      JSON.stringify(data.destination_entry_ids) !==
        JSON.stringify(selectedIds)
    ) {
      setSelectedIds(data.destination_entry_ids);
    }
  }, [data.destination_entry_ids]);

  const toggle = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(rows.map((e) => e.id));
    }
  };

  return (
    <div className="space-y-6 text-sm">
      {/* ───── FOL Bill Number ───── */}
      <div className="w-1/3">
        <label className="block mb-1 font-medium">
          FOL Bill Number
        </label>
        <input
          className="border p-1.5 rounded w-full"
          value={data.bill_number || ""}
          onChange={(e) => onChange("bill_number", e.target.value)}
        />
      </div>

      <h2 className="font-semibold text-base">
        Select Transport FOL Entries
      </h2>

      <div className="border rounded">
        <table className="w-full border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2 w-10 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="p-2 border">Destination</th>
              <th className="p-2 border">Date</th>
              <th className="p-2 border">Bill No</th>
              <th className="p-2 border">Ranges</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="p-2 border text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(r.id)}
                    onChange={() => toggle(r.id)}
                  />
                </td>
                <td className="p-2 border">
                  {r.destination?.name}
                </td>
                <td className="p-2 border">{r.date}</td>
                <td className="p-2 border">{r.bill_number}</td>
                <td className="p-2 border">
                  {r.rate_ranges.join(", ")}
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="p-4 text-center text-gray-500"
                >
                  No unbilled Transport FOL entries found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
