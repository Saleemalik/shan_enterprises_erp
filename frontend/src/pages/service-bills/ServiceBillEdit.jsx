// ServiceBillEdit.jsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../../api/axiosConfig";

import HandlingSection from "../../components/ServiceBill/HandlingSection";
import TransportDepotSection from "../../components/ServiceBill/TransportDepotSection";
import TransportFOLSection from "../../components/ServiceBill/TransportFOLSection";
import { debounce } from "../../api/useDebounce";
import AsyncSelect from "react-select/async";

export default function ServiceBillEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("HEADER");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);

  /* -------------------------------
   * DEFAULT FORM (CRITICAL)
   * ------------------------------- */
  const EMPTY_FORM = {
    bill_date: "",
    to_address: "",
    letter_note: "",
    date_of_clearing: "",
    product: "FACTOMFOS",
    hsn_code: "",
    year: "",

    handling: null,

    depot: {
      bill_number: "",
      total_depot_qty: "",
      total_depot_amount: "",
      entries: [],
    },

    fol: {
      bill_number: "",
      rh_qty: "",
      grand_total_qty: "",
      grand_total_amount: "",
      slabs: [],
    },
  };

  /* -------------------------------
   * LOAD & MERGE SERVICE BILL
   * ------------------------------- */
  useEffect(() => {
    axiosInstance
      .get(`/service-bills/${id}/`)
      .then((res) => {
        const data = res.data;

        const merged = {
          ...EMPTY_FORM,
          ...data,
          handling: data.handling || null,
          depot: { ...EMPTY_FORM.depot, ...(data.depot || {}) },
          fol: { ...EMPTY_FORM.fol, ...(data.fol || {}) },
        };

        setForm(merged);
        setLoading(false);
      })
      .catch(() => {
        alert("Failed to load Service Bill");
        navigate(-1);
      });
  }, [id]);

  /* -------------------------------
   * UPDATE HELPERS
   * ------------------------------- */
  const updateField = (section, field, value) => {
    if (!section) {
      setForm((f) => ({ ...f, [field]: value }));
    } else {
      setForm((f) => ({
        ...f,
        [section]: { ...f[section], [field]: value },
      }));
    }
  };


  // ✅ Transport Items
  const loadTransportItems = async (input) => {
    const res = await axiosInstance.get(
      `/transport-items/?search=${input}&page_size=20`
    );

    const data = res.data.results ?? res.data;

    return data.map((i) => ({
      value: i.id,
      label: i.name,
      ...i,
    }));
  };

  const loadItemsDebounced = useMemo(
    () => debounce(loadTransportItems, 800),
    []
  );

  /* -------------------------------
   * SUBMIT UPDATE (NORMALIZED)
   * ------------------------------- */
  const handleSubmit = async () => {
    try {
      const payload = {
        bill_date: form.bill_date || null,
        to_address: form.to_address || "",
        letter_note: form.letter_note || "",
        date_of_clearing: form.date_of_clearing || "",
        product: form.product || "FACTOMFOS",
        hsn_code: form.hsn_code || "",
        year: form.year || "",

        handling: form.handling?.bill_number
          ? { ...form.handling }
          : null,

        depot: form.depot?.bill_number
          ? {
              bill_number: form.depot.bill_number,
              total_depot_qty: form.depot.total_depot_qty || 0,
              total_depot_amount: form.depot.total_depot_amount || 0,
              entries: form.depot.entries || [],
            }
          : null,

        fol: form.fol?.bill_number
          ? {
              bill_number: form.fol.bill_number,
              rh_qty: form.fol.rh_qty || 0,
              grand_total_qty: form.fol.grand_total_qty || 0,
              grand_total_amount: form.fol.grand_total_amount || 0,
              slabs: form.fol.slabs || [],
            }
          : null,
      };

      await axiosInstance.put(`/service-bills/${id}/`, payload);
      alert("Service Bill updated");
      navigate(`/app/service-bills/${id}`);
    } catch (err) {
      console.error(err?.response?.data || err);
      alert("Update failed");
    }
  };

  /* -------------------------------
   * PDF EXPORT
   * ------------------------------- */
  const handlePrint = async () => {
    const res = await axiosInstance.get(
      `/service-bills/${id}/export-pdf/`,
      { responseType: "blob" }
    );
    const fileURL = URL.createObjectURL(res.data);
    window.open(fileURL);
  };

  if (loading || !form) {
    return <div className="text-gray-500">Loading Service Bill...</div>;
  }

  const input = "border p-1.5 rounded w-full";

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between mb-4">
        <h1 className="text-xl font-semibold">
          Edit Service Bill #{id}
        </h1>
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-1.5 bg-gray-200 rounded"
        >
          Back
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 text-sm">
        {["HEADER", "HANDLING", "DEPOT", "FOL"].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-3 py-1.5 rounded ${
              activeTab === t ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            {t === "HEADER" && "Bill Header"}
            {t === "HANDLING" && "Handling"}
            {t === "DEPOT" && "Transport Depot"}
            {t === "FOL" && "Transport FOL"}
          </button>
        ))}
      </div>

      {/* HEADER */}
      {activeTab === "HEADER" && (
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block mb-1 font-medium">Bill Date</label>
              <input
                type="date"
                className={input}
                value={form.bill_date || ""}
                onChange={(e) =>
                  updateField(null, "bill_date", e.target.value)
                }
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">Year</label>
              <input
                className={input}
                value={form.year || ""}
                onChange={(e) =>
                  updateField(null, "year", e.target.value)
                }
              />
            </div>

            <div className="col-span-2">
              <label className="block mb-1 font-medium">
                Date of Clearing
              </label>
              <input
                type="date"
                className={input}
                value={form.date_of_clearing || ""}
                onChange={(e) =>
                  updateField(null, "date_of_clearing", e.target.value)
                }
              />
            </div>
          </div>

          <div>
            <label className="block mb-1 font-medium">To</label>
            <textarea
              rows={3}
              className={input}
              value={form.to_address || ""}
              onChange={(e) =>
                updateField(null, "to_address", e.target.value)
              }
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">
              Reference / Letter Note
            </label>
            <textarea
              rows={2}
              className={input}
              value={form.letter_note || ""}
              onChange={(e) =>
                updateField(null, "letter_note", e.target.value)
              }
            />
          </div>

          {/* ✅ PRODUCT & HSN FIXED */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block mb-1 font-medium">Product</label>
              <AsyncSelect
                cacheOptions
                defaultOptions
                loadOptions={loadItemsDebounced}
                value={form.product ? { value: form.product, label: form.product } : null}
                onChange={(opt) =>
                  updateField(null, "product", opt ? opt.label : "")
                }
                placeholder="Select or type product..."
                isClearable
              />
            </div>


            <div>
              <label className="block mb-1 font-medium">HSN / SAC</label>
              <input
                className={input}
                value={form.hsn_code}
                onChange={(e) =>
                  updateField(null, "hsn_code", e.target.value)
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTIONS */}
      {activeTab === "HANDLING" && (
        <HandlingSection
          data={form.handling || {}}
          onChange={(f, v) => updateField("handling", f, v)}
        />
      )}

      {activeTab === "DEPOT" && (
        <TransportDepotSection
          data={form.depot}
          serviceBillId={form.id}
          onChange={(f, v) => updateField("depot", f, v)}
          item={form.product}
        />
      )}

      {activeTab === "FOL" && (
        <TransportFOLSection
          data={form.fol}
          serviceBillId={form.id}
          onChange={(f, v) => updateField("fol", f, v)}
          item={form.product}
        />
      )}

      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={handleSubmit}
          className="px-6 py-2 bg-green-600 text-white rounded"
        >
          Update Service Bill
        </button>

        <button
          onClick={handlePrint}
          className="px-6 py-2 bg-blue-600 text-white rounded"
        >
          Export PDF
        </button>
      </div>
    </div>
  );
}
