// ServiceBillCreate.jsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axiosConfig";
import HandlingSection from "../../components/ServiceBill/HandlingSection";
import TransportDepotSection from "../../components/ServiceBill/TransportDepotSection";
import TransportFOLSection from "../../components/ServiceBill/TransportFOLSection";
import { debounce } from "../../api/useDebounce";
import AsyncSelect from "react-select/async";


export default function ServiceBillCreate() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("HEADER");

  const STORAGE_KEY = "service_bill_create_draft";

  /* -------------------------------
   * DEFAULT FORM (SOURCE OF TRUTH)
   * ------------------------------- */
  const EMPTY_FORM = {
    bill_date: "",
    to_address: "",
    letter_note: "",
    date_of_clearing: "",
    product: "FACTOMFOS",
    hsn_code: "",
    year: "",

    handling: {
      bill_number: "",
      qty_shipped: "",
      fol_total: "",
      depot_total: "",
      rh_sales: "",
      qty_received: "",
      shortage: "",
      particulars: "",
      products: "",
      total_qty: "",
      rate: "",
      bill_amount: "",
      cgst: "",
      sgst: "",
      total_bill_amount: "",
    },

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
   * SAFE LOAD (MERGE DEFAULTS)
   * ------------------------------- */
  const loadInitialForm = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return {
        ...EMPTY_FORM,
        ...saved,
        handling: { ...EMPTY_FORM.handling, ...(saved?.handling || {}) },
        depot: { ...EMPTY_FORM.depot, ...(saved?.depot || {}) },
        fol: { ...EMPTY_FORM.fol, ...(saved?.fol || {}) },
      };
    } catch {
      return EMPTY_FORM;
    }
  };

  const [form, setForm] = useState(loadInitialForm);

  /* -------------------------------
   * PERSIST DRAFT
   * ------------------------------- */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form]);

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
   * SUBMIT
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

      console.log("SERVICE BILL PAYLOAD", payload);

      const res = await axiosInstance.post("/service-bills/", payload);
      
      navigate(`/app/service-bills/${res.data.id}`, { state: { success: true, message: "Service Bill created successfully!" } });

      // localStorage.removeItem(STORAGE_KEY);
      // navigate(`/app/service-bills/${res.data.id}`);
    } catch (err) {
      console.error(err?.response?.data || err);
      alert("Failed to create Service Bill");
    }
  };

  const input = "border p-1.5 rounded w-full";

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between mb-4">
        <h1 className="text-xl font-semibold">Create Service Bill</h1>
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
                value={form.bill_date}
                onChange={(e) =>
                  updateField(null, "bill_date", e.target.value)
                }
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">Year</label>
              <input
                className={input}
                value={form.year}
                onChange={(e) => updateField(null, "year", e.target.value)}
              />
            </div>

            <div className="col-span-2 border rounded p-3">
              <label className="block mb-1 font-medium">Date of Clearing</label>
              <input
                type="date"
                className={input}
                value={form.date_of_clearing}
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
              value={form.to_address}
              onChange={(e) =>
                updateField(null, "to_address", e.target.value)
              }
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Reference</label>
            <textarea
              rows={2}
              className={input}
              value={form.letter_note}
              onChange={(e) =>
                updateField(null, "letter_note", e.target.value)
              }
            />
          </div>

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
          data={form.handling}
          onChange={(f, v) => updateField("handling", f, v)}
        />
      )}

      {activeTab === "DEPOT" && (
        <TransportDepotSection
          data={form.depot}
          onChange={(f, v) => updateField("depot", f, v)}
        />
      )}

      {activeTab === "FOL" && (
        <TransportFOLSection
          data={form.fol}
          onChange={(f, v) => updateField("fol", f, v)}
        />
      )}

      <div className="flex justify-end mt-6">
        <button
          onClick={handleSubmit}
          className="px-6 py-2 bg-green-600 text-white rounded"
        >
          Save Service Bill
        </button>
      </div>
    </div>
  );
}
