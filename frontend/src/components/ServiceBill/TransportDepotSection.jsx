import { useEffect, useMemo, useRef, useState } from "react";
import axiosInstance from "../../api/axiosConfig";
import { Link } from "react-router-dom";

export default function TransportDepotSection({
  data,
  serviceBillId,
  onChange,
}) {
  /* ----------------------------------
   * Normalize data (NULL SAFE)
   * ---------------------------------- */
  const safeData = data ?? {};
  const initialEntries = Array.isArray(safeData.entries)
    ? safeData.entries
    : [];

  const [entries, setEntries] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  // 🔒 Prevent re-initialization loop
  const initializedRef = useRef(false);

  /* ----------------------------------
   * Load depot dealer entries
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
   * Initialize selection ONCE (edit mode)
   * ---------------------------------- */
  useEffect(() => {
    if (
      !initializedRef.current &&
      initialEntries.length > 0
    ) {
      setSelectedIds(initialEntries);
      initializedRef.current = true;
    }
  }, [initialEntries]);

  /* ----------------------------------
   * Derived rows
   * ---------------------------------- */
  const selectedRows = useMemo(() => {
    return entries.filter((e) => selectedIds.includes(e.id));
  }, [entries, selectedIds]);

  /* ----------------------------------
   * Totals (pure calculation)
   * ---------------------------------- */
  const totals = useMemo(() => {
    const qty = selectedRows.reduce(
      (s, r) => s + Number(r?.qty_mt || 0),
      0
    );
    const amount = selectedRows.reduce(
      (s, r) => s + Number(r?.amount || 0),
      0
    );

    return {
      qty: qty.toFixed(3),
      amount: amount.toFixed(2),
    };
  }, [selectedRows]);

  /* ----------------------------------
   * USER ACTIONS → sync to parent
   * ---------------------------------- */
  const commitChange = (ids) => {
    setSelectedIds(ids);

    if (onChange) {
      onChange("entries", ids);
      onChange("total_depot_qty", totals.qty);
      onChange("total_depot_amount", totals.amount);
    }
  };

  const toggleRow = (id) => {
    commitChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  };

  const toggleSelectAll = () => {
    commitChange(
      selectedIds.length === entries.length
        ? []
        : entries.map((e) => e.id)
    );
  };

  const allSelected =
    entries.length > 0 &&
    selectedIds.length === entries.length;

  const someSelected =
    selectedIds.length > 0 &&
    selectedIds.length < entries.length;

  /* ----------------------------------
   * Render
   * ---------------------------------- */
  return (
    <div className="space-y-6 text-sm">
      {/* Depot bill number */}
      <div className="w-1/3">
        <label className="block mb-1 font-medium">
          Depot Bill Number
        </label>
        <input
          className="border p-1.5 rounded w-full"
          value={safeData.bill_number || ""}
          onChange={(e) =>
            onChange?.("bill_number", e.target.value)
          }
        />
      </div>

      {/* Table */}
      <div className="border rounded overflow-x-auto">
        <table className="w-full border-collapse text-center">
          <thead>
            <tr className="bg-gray-100 font-semibold">
              <th className="border p-2 w-10">
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

                  <td className="border p-2 text-left">
                    <Link
                      to={`/app/destination-entries/${row.destination_entry_id}`}
                      target="_blank"
                      className="text-blue-600 hover:underline"
                    >
                      {row.destination || "-"}
                    </Link>
                  </td>

                  <td className="border p-2">
                    {Number(row.qty_mt || 0).toFixed(3)}
                  </td>

                  <td className="border p-2">
                    {row.km ?? "-"}
                  </td>

                  <td className="border p-2">
                    {Number(row.mt_km || 0).toFixed(2)}
                  </td>

                  <td className="border p-2">
                    {Number(row.rate || 0).toFixed(2)}
                  </td>

                  <td className="border p-2 font-medium">
                    {Number(row.amount || 0).toFixed(2)}
                  </td>
                </tr>
              );
            })}

            {entries.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="border p-4 text-gray-500"
                >
                  No depot entries available
                </td>
              </tr>
            )}
          </tbody>

          <tfoot>
            <tr className="font-semibold bg-gray-50">
              <td className="border p-2" colSpan={2}>
                TOTAL
              </td>
              <td className="border p-2">{totals.qty}</td>
              <td colSpan={4} className="border p-2">
                {totals.amount}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
