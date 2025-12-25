// components/ServiceBill/TransportFOLSection.jsx
import { useEffect, useState } from "react";
import axiosInstance from "../../api/axiosConfig";

export default function TransportFOLSection({ data = {}, onChange }) {
  const [slabs, setSlabs] = useState([]);
  const [selectedIds, setSelectedIds] = useState(
    data.destination_entry_ids || []
  );

  const [activeTab, setActiveTab] = useState("select"); // select | preview
  const [rhQty, setRhQty] = useState(data.rh_qty || "");
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const serviceBillId = data?.id;

  const allSelected =
    slabs.length > 0 && selectedIds.length === slabs.length;

  const someSelected =
    selectedIds.length > 0 && selectedIds.length < slabs.length;

  /* ───────── Fetch unbilled + current service bill entries ───────── */
  useEffect(() => {
    axiosInstance
      .get("/destination-entries/transport-fol-unbilled/", {
        params: {
          service_bill_id: serviceBillId || undefined,
        },
      })
      .then((res) => setSlabs(res.data))
      .catch((err) => console.error(err));
  }, [serviceBillId]);

  /* ───────── Hydrate selection (edit mode) ───────── */
  useEffect(() => {
    if (data.destination_entry_ids) {
      setSelectedIds(data.destination_entry_ids);
    }
    if (data.rh_qty) {
      setRhQty(data.rh_qty);
    }
  }, [data.destination_entry_ids, data.rh_qty]);

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
      setSelectedIds(slabs.map((e) => e.id));
    }
  };

  /* ───────── Preview API ───────── */
  const loadPreview = async () => {
    if (!selectedIds.length) {
      alert("Select at least one FOL destination entry");
      return;
    }

    setLoadingPreview(true);

    try {
      const res = await axiosInstance.post(
        "/destination-entries/transport-fol-preview/",
        {
          destination_entry_ids: selectedIds,
          rh_qty: rhQty || 0,
        }
      );

      setPreviewData(res.data);
      setActiveTab("preview");

      // persist values to parent
      onChange("destination_entry_ids", selectedIds);
      onChange("rh_qty", rhQty);
    } catch (err) {
      console.error(err);
      alert("Failed to load preview");
    } finally {
      setLoadingPreview(false);
    }
  };

  return (
    <div className="space-y-6 text-sm">
      {/* ───── Tabs ───── */}
      <div className="flex border-b">
        <button
          className={`px-4 py-2 ${
            activeTab === "select"
              ? "border-b-2 border-black font-semibold"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("select")}
        >
          Select Entries
        </button>

        <button
          className={`px-4 py-2 ${
            activeTab === "preview"
              ? "border-b-2 border-black font-semibold"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("preview")}
          disabled={!previewData}
        >
          Preview
        </button>
      </div>

      {/* ───────── SELECT TAB ───────── */}
      {activeTab === "select" && (
        <>
          {/* FOL Bill Number */}
          <div className="w-1/3">
            <label className="block mb-1 font-medium">
              FOL Bill Number
            </label>
            <input
              className="border p-1.5 rounded w-full"
              value={data.bill_number || ""}
              onChange={(e) =>
                onChange("bill_number", e.target.value)
              }
            />
          </div>

          {/* RH Qty */}
          <div className="w-1/3">
            <label className="block mb-1 font-medium">
              RH Quantity
            </label>
            <input
              type="number"
              className="border p-1.5 rounded w-full"
              value={rhQty}
              onChange={(e) => setRhQty(e.target.value)}
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
                        if (el)
                          el.indeterminate = someSelected;
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
                {slabs.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-gray-50"
                  >
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
                    <td className="p-2 border">
                      {r.bill_number}
                    </td>
                    <td className="p-2 border">
                      {r.rate_ranges.join(", ")}
                    </td>
                  </tr>
                ))}

                {slabs.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-4 text-center text-gray-500"
                    >
                      No unbilled Transport FOL entries
                      found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-4">
            <button
              onClick={loadPreview}
              disabled={loadingPreview}
              className="px-4 py-2 bg-black text-white rounded"
            >
              {loadingPreview
                ? "Loading Preview..."
                : "Preview Transport FOL"}
            </button>
          </div>
        </>
      )}

      {/* ───────── PREVIEW TAB ───────── */}
      {activeTab === "preview" && previewData && (
        <div className="space-y-6">
          {previewData.slabs.map((row, idx) => (
            <div
              key={idx}
              className="border rounded p-3"
            >
              <div className="font-semibold mb-2">
                SLAB {row.range_slab} | Rate:{" "}
                {row.rate}
              </div>

              <table className="w-full border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-1">
                      Destination
                    </th>
                    <th className="border p-1">
                      Qty (MT)
                    </th>
                    <th className="border p-1">
                      MT × KM
                    </th>
                    <th className="border p-1">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {row.destinations.map(
                    (d, i) => (
                      <tr key={i}>
                        <td className="border p-1">
                          {d.destination_place}
                        </td>
                        <td className="border p-1 text-right">
                          {d.qty_mt}
                        </td>
                        <td className="border p-1 text-right">
                          {d.qty_mtk}
                        </td>
                        <td className="border p-1 text-right">
                          {d.amount}
                        </td>
                      </tr>
                    )
                  )}

                  <tr className="font-semibold bg-gray-50">
                    <td className="border p-1 text-right">
                      TOTAL
                    </td>
                    <td className="border p-1 text-right">
                      {row.range_total_qty}
                    </td>
                    <td className="border p-1 text-right">
                      {row.range_total_mtk}
                    </td>
                    <td className="border p-1 text-right">
                      {row.range_total_amount}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}

          <div className="border-t pt-3 font-semibold">
            RH Qty: {previewData.rh_qty}
            <br />
            Grand Total Qty:{" "}
            {previewData.grand_total_qty}
            <br />
            Grand Total Amount:{" "}
            {previewData.grand_total_amount}
          </div>
        </div>
      )}
    </div>
  );
}
