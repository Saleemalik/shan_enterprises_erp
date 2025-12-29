// ServiceBillEdit.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../../api/axiosConfig";

import HandlingSection from "../../components/ServiceBill/HandlingSection";
import TransportDepotSection from "../../components/ServiceBill/TransportDepotSection";
import TransportFOLSection from "../../components/ServiceBill/TransportFOLSection";

export default function ServiceBillEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("HEADER");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);

  /* ----------------------------------
   * Load existing Service Bill
   * ---------------------------------- */
  useEffect(() => {
    axiosInstance
      .get(`/service-bills/${id}/`)
      .then((res) => {
        setForm(res.data);
        setLoading(false);
      })
      .catch(() => {
        alert("Failed to load Service Bill");
        navigate(-1);
      });
  }, [id]);

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

  /* ----------------------------------
   * Submit update
   * ---------------------------------- */
  const handleSubmit = async () => {
    try {
      await axiosInstance.put(`/service-bills/${id}/`, form);
      alert("Service Bill updated");
      navigate(`/app/service-bills/${id}`);
    } catch (err) {
      console.error(err?.response?.data || err);
      alert("Update failed");
    }
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
                onChange={(e) => updateField(null, "year", e.target.value)}
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
        </div>
      )}

      {/* HANDLING */}
      {activeTab === "HANDLING" && (
        <HandlingSection
          data={form.handling || {}}
          onChange={(field, value) =>
            updateField("handling", field, value)
          }
        />
      )}

      {/* DEPOT */}
      {activeTab === "DEPOT" && (
        <TransportDepotSection
            data={form.depot}
            serviceBillId={form.id}   // 🔥 REQUIRED
            onChange={(field, value) =>
                updateField("depot", field, value)
            }
        />
      )}

      {/* FOL */}
      {activeTab === "FOL" && (
        <TransportFOLSection
          data={form.fol || {}}
          onChange={(field, value) =>
            updateField("fol", field, value)
          }
        />
      )}

      <div className="flex justify-end mt-6">
        <button
          onClick={handleSubmit}
          className="px-6 py-2 bg-green-600 text-white rounded"
        >
          Update Service Bill
        </button>
      </div>
    </div>
  );
}
