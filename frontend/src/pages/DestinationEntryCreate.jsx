import { useState, useEffect } from "react";
import AsyncSelect from "react-select/async";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosConfig";
import RangeBlock from "../components/DestinationEntry/RangeBlock";
import useFormPersist from "../hooks/useFormPersist";
import DealerSearchRow from "../components/DestinationEntry/DealerSearchRow";


/**
 * DestinationEntryCreate.jsx
 * - Holds top-level data
 * - Fetches rate ranges
 * - Renders RangeBlock for each range
 * - Submits nested payload to POST /destination-entries/create-full/
 */

export default function DestinationEntryCreate() {
  const navigate = useNavigate();

  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem("destination-entry-form");
    const defaults = saved
      ? JSON.parse(saved)
      : {
          date: "",
          letter_note: "",
          to_address: "",
          bill_number: "",
          destination: null,
        };

    return {
      // defaults loaded here
      ...defaults,

      // this is always empty when starting a new form
      ranges: [],
    };
  });


  useFormPersist("destination-entry-form", form, setForm);

  const [rateRanges, setRateRanges] = useState([]);
  const [loadingRanges, setLoadingRanges] = useState(false);

  useEffect(() => {
    fetchRateRanges();
  }, []);

  async function fetchRateRanges() {
    try {
      setLoadingRanges(true);
      const res = await axiosInstance.get("/rate-ranges/?page_size=500");
      const opts = (res.data.results || []).map((r) => ({
        value: r.id,
        id: r.id,
        label: `${r.from_km}-${r.to_km} km @ ₹${r.rate}`,
        from_km: r.from_km,
        to_km: r.to_km,
        rate: Number(r.rate),
        is_mtk: !!r.is_mtk,
      }));
      setRateRanges(opts);
    } catch (err) {
      console.error("fetchRateRanges", err);
      setRateRanges([]);
    } finally {
      setLoadingRanges(false);
    }
  }

  // Async load destinations (used by top-level select)
  const loadDestinations = async (input) => {
    try {
      const q = input ? `?search=${encodeURIComponent(input)}` : "";
      const res = await axiosInstance.get(`/destinations/${q}`);
      return (res.data.results || []).map((d) => ({
        value: d.id,
        label: d.name,
      }));
    } catch (err) {
      console.error("loadDestinations", err);
      return [];
    }
  };

  // add/remove ranges (top-level)
  const addRange = () => {
    setForm((f) => {
      let next = {
        ...f,
        ranges: [
          ...f.ranges,
          {
            id: crypto.randomUUID(),
            rate_range: null,
            rate: "",
            dealer_entries: [],
          },
        ],
      };

      next.ranges.sort((a, b) => {
        if (!a.rate_range || !b.rate_range) return 0;
        return a.rate_range.from_km - b.rate_range.from_km;
      });

      return next;
    });
  };

  const removeRange = (ri) => {
    setForm((f) => {
      const next = { ...f, ranges: f.ranges.slice() };
      next.ranges.splice(ri, 1);
      return next;
    });
  };

  // callbacks used by RangeBlock to update nested state
  const updateRangeAt = (ri, newRange) => {
    setForm((f) => {
      let next = { ...f, ranges: f.ranges.map((r) => ({ ...r })) };
      next.ranges[ri] = newRange;

      // sort by slab from_km
      next.ranges.sort((a, b) => {
        if (!a.rate_range || !b.rate_range) return 0;
        return a.rate_range.from_km - b.rate_range.from_km;
      });

      return next;
    });
  };


  // Submit: prepare nested payload expected by serializers
  const handleSubmit = async () => {
    if (!form.destination) return alert("Select destination");
    if (!form.ranges.length) return alert("Add at least one range");

    try {
      const payload = {
        destination: form.destination.value,
        letter_note: form.letter_note,
        bill_number: form.bill_number,
        date: form.date,
        to_address: form.to_address,
        range_entries: form.ranges.map((r) => {
          const dealer_entries = (r.dealer_entries || []).map((d) => ({
            dealer: d.dealer?.value ?? d.dealer,
            despatched_to: d.despatched_to || "",
            km: Number(d.km || 0),
            no_bags: Number(d.no_bags || 0),
            rate: Number(r.rate || 0),
            mt: Number(d.mt || 0),
            mtk: Number(d.mtk || 0),
            amount: Number(d.amount || 0),
            mda_number: d.mda_number || "",
            date: d.date || "",
            description: d.description || "FACTOM FOS",
            remarks: d.remarks || "",
          }));

          return {
            rate_range: r.rate_range?.value ?? null,
            rate: Number(r.rate || 0),
            total_bags: dealer_entries.reduce(
              (s, x) => s + Number(x.no_bags || 0),
              0
            ),
            total_mt: dealer_entries.reduce((s, x) => s + Number(x.mt || 0), 0),
            total_mtk: dealer_entries.reduce(
              (s, x) => s + Number(x.mtk || 0),
              0
            ),
            total_amount: dealer_entries.reduce(
              (s, x) => s + Number(x.amount || 0),
              0
            ),
            dealer_entries,
          };
        }),
      };

      const result = await axiosInstance.post("/destination-entries/create-full/", payload);
      const id = result.data.id;
     
      navigate("/app/destination-entries/" + id, {
        state: { success: true, message: "Destination entry created successfully!" },
      });
    } catch (err) {
      console.error("submit error:", err);
      alert(err.response?.data?.detail || "Failed to submit");
    }
  };

  // top-level update helpers
  const updateTopField = (field, value) =>
    setForm((f) => ({ ...f, [field]: value }));

  const calcMt = (bags) => Number((Number(bags || 0) * 0.05).toFixed(3));
  const calcMtk = (mt, km) => Number((Number(mt || 0) * Number(km || 0)).toFixed(3));

  const addDealer = (entry) => {
    // entry = { dealer, mda, date, bags }
    // entry.dealer is the AsyncSelect option produced by loadDealers:
    // { value: dealer_id, dealer_id, dealer_name, place_id, place_name, distance, rate_range_id, rate, is_mtk, ... }

    const dealerOpt = entry.dealer || {};
    const rrId = Number(dealerOpt.rate_range_id ?? dealerOpt.rate_range?.value ?? dealerOpt.rate_range?.id);
    const rate = Number(dealerOpt.rate ?? 0);
    const is_mtk = !!dealerOpt.is_mtk;
    const km = Number(dealerOpt.distance ?? 0);
    const bags = Number(entry.bags ?? 0);

    // normalized dealer entry shape used inside range.dealer_entries
    const normalizedDealerEntry = {
      id: crypto.randomUUID(),
      dealer: {
        // keep the AsyncSelect-friendly shape so existing code works
        value: dealerOpt.dealer_id ?? dealerOpt.value,
        label: `${dealerOpt.dealer_name ?? dealerOpt.label ?? ""} (${dealerOpt.place_name ?? ""})`,
        // include raw metadata for later use
        dealer_id: dealerOpt.dealer_id ?? dealerOpt.value,
        dealer_name: dealerOpt.dealer_name ?? dealerOpt.label,
        place_id: dealerOpt.place_id,
        place_name: dealerOpt.place_name,
        distance: km,
        rate_range_id: rrId,
        rate,
        is_mtk,
      },
      despatched_to: `${dealerOpt.dealer_name ?? ""}, ${dealerOpt.place_name ?? ""}`,
      mda_number: entry.mda || "",
      date: entry.date || "",
      no_bags: bags,
      km,
      mt: calcMt(bags), // bags * 0.05
      mtk: calcMtk(calcMt(bags), km), // mt * km
      amount: is_mtk
        ? Number((rate * calcMtk(calcMt(bags), km)).toFixed(2))
        : Number((rate * calcMt(bags)).toFixed(2)),
      description: entry.description || "FACTOM FOS",
      remarks: entry.remarks || "",
    };

    setForm((prev) => {
      // try to find existing range block by several possible shapes
      const idx = prev.ranges.findIndex((r) => {
        const rr = r.rate_range;
        if (!rr) return false;
        // possible shapes: rr === primitive id, rr.id, rr.value
        return (
          rr === rrId ||
          rr?.id === rrId ||
          rr?.value === rrId ||
          // sometimes rr may be nested deeper (e.g., { rate_range: { value: id } })
          (r.rate_range?.rate_range?.value === rrId)
        );
      });

      // if found, append to dealer_entries
      if (idx !== -1) {
        const updated = prev.ranges.map((r) => ({ ...r, dealer_entries: [...(r.dealer_entries || [])] }));
        updated[idx].dealer_entries.push(normalizedDealerEntry);

        // also update totals if you keep them in range (optional)
        return { ...prev, ranges: updated };
      }

      // not found -> create new normalized range block
      const newRange = {
        id: crypto.randomUUID(),
        // normalized rate_range object: include both id and value to match any future checks
        rate_range: {
          id: rrId,
          value: rrId,
          rate,
          is_mtk,
          // if you have from_km/to_km in rateRanges, you can try to find them:
          // we'll attempt to populate from fetched rateRanges if available
          from_km: (() => {
            const rr = rateRanges.find((x) => x.id === rrId || x.value === rrId);
            return rr?.from_km ?? null;
          })(),
          to_km: (() => {
            const rr = rateRanges.find((x) => x.id === rrId || x.value === rrId);
            return rr?.to_km ?? null;
          })(),
        },
        rate: rate,
        is_mtk,
        dealer_entries: [normalizedDealerEntry],
      };

      const nextRanges = [...prev.ranges, newRange];

      // keep ranges sorted by from_km if available, otherwise by rate_range.id
      nextRanges.sort((a, b) => {
        const aFrom = a.rate_range?.from_km ?? a.rate_range?.id ?? a.rate_range?.value ?? 0;
        const bFrom = b.rate_range?.from_km ?? b.rate_range?.id ?? b.rate_range?.value ?? 0;
        return (aFrom || 0) - (bFrom || 0);
      });

      return { ...prev, ranges: nextRanges };
    });
  };

  return (
    <div className="">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold">Create Destination Entry</h1>
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded text-sm"
        >
          Back
        </button>
      </div>

      {/* header */}
      <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
        <div>
          <label className="block mb-1">Destination</label>
          <AsyncSelect
            cacheOptions
            defaultOptions
            loadOptions={loadDestinations}
            onChange={(opt) => updateTopField("destination", opt)}
            value={form.destination}
            placeholder="Search destination..."
            styles={{
              control: (base) => ({ ...base, minHeight: "38px" }),
              menu: (base) => ({ ...base, fontSize: "14px" }),
            }}
          />
        </div>

        <div>
          <label className="block mb-1">Date</label>
          <input
            type="date"
            className="border p-1.5 rounded w-full"
            value={form.date}
            onChange={(e) => updateTopField("date", e.target.value)}
          />
        </div>

        <div>
          <label className="block mb-1">Bill No.</label>
          <input
            className="border p-1.5 rounded w-full"
            value={form.bill_number}
            onChange={(e) => updateTopField("bill_number", e.target.value)}
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="block mb-1 text-sm">Letter Note</label>
        <textarea
          rows={3}
          className="border p-1.5 rounded w-full text-sm"
          value={form.letter_note}
          onChange={(e) => updateTopField("letter_note", e.target.value)}
        />
      </div>

      <div className="mb-4">
        <label className="block mb-1 text-sm">To Address</label>
        <textarea
          rows={2}
          className="border p-1.5 rounded w-full text-sm"
          value={form.to_address}
          onChange={(e) => updateTopField("to_address", e.target.value)}
        />
      </div>

     {form.destination && (
       
       <>
            <DealerSearchRow
              destinationId={form.destination?.value}
              onAdd={addDealer}
            />
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-semibold">Ranges</h2>

            <button
              onClick={addRange}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
            >
              + Add Range
            </button>
          </div>

          <div className="space-y-3">
            {form.ranges.map((range, ri) => (
              <RangeBlock
                key={range.id}
                index={ri}
                range={range}
                rateRanges={rateRanges}
                loadingRanges={loadingRanges}
                onSelectRange={(opt) =>
                  updateRangeAt(ri, {
                    ...range,
                    rate_range: opt,
                    rate: opt.rate,
                    is_mtk: opt.is_mtk,
                  })
                }
                onRemoveRange={() => removeRange(ri)}
                onUpdateRange={(newRange) => updateRangeAt(ri, newRange)}
                selectedDestinationId={form.destination?.value}
                usedRateRangeIds={form.ranges
                  .filter(r => r.rate_range)
                  .map(r => r.rate_range.value)}
              />
            ))}
          </div>
        </>
      )}


      <div className="flex justify-end mt-5">
        <button
          onClick={handleSubmit}
          className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
