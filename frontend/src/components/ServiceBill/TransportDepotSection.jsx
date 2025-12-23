import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../../api/axiosConfig";
import { Link } from "react-router-dom";

export default function TransportDepotSection({ data = {}, onChange }) {
  const [entries, setEntries] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const allSelected =
    entries.length > 0 && selectedIds.length === entries.length;

  const someSelected =
    selectedIds.length > 0 && selectedIds.length < entries.length;

  const serviceBillId = data?.id;

  /* ----------------------------------
   * Load UNBILLED DEPOT DEALER ENTRIES
   * ---------------------------------- */
  useEffect(() => {
    axiosInstance
      .get("/destination-entries/transport-depot-unbilled/", {
        params: {
          service_bill_id: serviceBillId || undefined,
        },
      })
      .then((res) => setEntries(res.data.results || []))
      .catch(console.error);
  }, [serviceBillId]);

  /* ----------------------------------
   * Selected rows (derived)
   * ---------------------------------- */
  const selectedRows = useMemo(() => {
    return entries.filter((e) => selectedIds.includes(e.id));
  }, [entries, selectedIds]);

  /* ----------------------------------
   * Auto totals
   * ---------------------------------- */
  useEffect(() => {
    const totalQty = selectedRows.reduce(
      (sum, r) => sum + Number(r.qty_mt || 0),
      0
    );

    const totalAmount = selectedRows.reduce(
      (sum, r) => sum + Number(r.amount || 0),
      0
    );

    onChange("entries", selectedRows);
    onChange("total_depot_qty", totalQty.toFixed(3));
    onChange("total_depot_amount", totalAmount.toFixed(2));
  }, [selectedRows, onChange]);

  /* ----------------------------------
   * Toggle row by UNIQUE dealer entry id
   * ---------------------------------- */
  const toggleRow = (id) => {
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
      setSelectedIds(entries.map((e) => e.id));
    }
  };


  return (
    <div className="space-y-6 text-sm">

      {/* Depot bill number */}
      <div className="w-1/3">
        <label className="block mb-1 font-medium">
          Depot Bill Number
        </label>
        <input
          className="border p-1.5 rounded w-full"
          value={data.bill_number || ""}
          onChange={(e) => onChange("bill_number", e.target.value)}
        />
      </div>

      {/* Selection table */}
      <div className="border rounded overflow-x-auto">
        <table className="w-full border-collapse text-center">
          <thead>
            <tr className="bg-gray-100 font-semibold">
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
              <th className="border p-2 text-left">Destination</th>
              <th className="border p-2">Qty (MT)</th>
              <th className="border p-2">KM</th>
              <th className="border p-2">MT × KM</th>
              <th className="border p-2">Rate</th>
              <th className="border p-2">Amount</th>
            </tr>
          </thead>


          <tbody>
            {entries.map((row) => {
              const checked = selectedIds.includes(row.id);

              return (
                <tr
                  key={row.id}
                  className={checked ? "bg-blue-50" : ""}
                >
                  <td className="border p-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRow(row.id)}
                    />
                  </td>

                  {/* 🔗 Destination link */}
                  <td className="border p-2 text-left">

                     <Link
                      to={`/app/destination-entries/${row.destination_entry_id}`}
                       target="_blank"
                       className="text-blue-600 hover:underline"
                    >
                      {row.destination}
                    </Link>
                  </td>

                  <td className="border p-2">
                    {row.qty_mt?.toFixed(3)}
                  </td>

                  <td className="border p-2">
                    {row.km}
                  </td>

                  <td className="border p-2">
                    {row.mt_km?.toFixed(2)}
                  </td>

                  <td className="border p-2">
                    {row.rate?.toFixed(2)}
                  </td>

                  <td className="border p-2 font-medium">
                    {row.amount?.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Totals */}
          <tfoot>
            <tr className="font-semibold bg-gray-50">
              <td className="border p-2" colSpan={2}>
                TOTAL
              </td>
              <td className="border p-2">
                {data.total_depot_qty || "0.000"}
              </td>
              <td className="border p-2"></td>
              <td className="border p-2"></td>
              <td className="border p-2"></td>
              <td className="border p-2">
                {data.total_depot_amount || "0.00"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
