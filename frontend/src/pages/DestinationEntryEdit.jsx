import { useState, useEffect } from "react";
import AsyncSelect from "react-select/async";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../api/axiosConfig";
import RangeBlock from "../components/DestinationEntry/RangeBlock";
import useFormPersist from "../hooks/useFormPersist";
import DealerSearchRow from "../components/DestinationEntry/DealerSearchRow";
import { API_BASE } from "../api/axiosConfig";

/**
 * DestinationEntryEdit.jsx
 * - Holds top-level data
 * - Fetches rate ranges
 * - Renders RangeBlock for each range
 * - Submits nested payload to POST /destination-entries/create-full/
 */

export default function DestinationEntryEdit() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [rateRanges, setRateRanges] = useState([]);
    const [loadingRanges, setLoadingRanges] = useState(false);

    const [form, setForm] = useState({
        destination: null,
        date: "",
        letter_note: "",
        to_address: "",
        bill_number: "",
        ranges: [],
    });


  useFormPersist(`destination-entry-edit-${id}`, form, setForm);

  useEffect(() => {
    fetchEntry();
    fetchRateRanges();
  }, []);

  async function fetchEntry() {
    try {
      const res = await axiosInstance.get(
        `/destination-entries/${id}/`
      );

      const e = res.data;

      setForm({
        destination: {
          value: e.destination.id,
          label: e.destination.name,
        },
        date: e.date,
        letter_note: e.letter_note,
        to_address: e.to_address,
        bill_number: e.bill_number,

        ranges: e.range_entries.map(r => ({
          id: r.id,
          rate_range: {
            value: r.rate_range,
            id: r.rate_range,
            rate: r.rate,
            from_km: Number(r.rate_range_display?.split("-")[0]),
            to_km: Number(r.rate_range_display?.split("-")[1]),
          },
          rate: Number(r.rate),
          print_page_no: r.print_page_no ?? null,
          dealer_entries: r.dealer_entries.map(d => ({
            id: d.id,
            dealer: {
              value: d.dealer,
              label: `${d.dealer_name}`,
              dealer_id: d.dealer,
            },
            despatched_to: d.despatched_to,
            mda_number: d.mda_number,
            bill_doc: d.bill_doc || "",
            date: d.date,
            km: d.km,
            no_bags: d.no_bags,
            mt: d.mt,
            mtk: d.mtk,
            amount: d.amount,
            description: d.description,
            remarks: d.remarks,
          }))
        })),
      });

    } catch (err) {
      console.error(err);
      alert("Failed loading entry");
    } finally {
      setLoading(false);
    }
  }
  
  async function fetchRateRanges() {
    setLoadingRanges(true);
    try {
      const res = await axiosInstance.get("/rate-ranges/?page_size=500");
      setRateRanges(
        (res.data.results || []).map(r => ({
          value: r.id,
          id: r.id,
          label: `${r.from_km}-${r.to_km} km @ ₹${r.rate}`,
          from_km: r.from_km,
          to_km: r.to_km,
          rate: Number(r.rate),
          is_mtk: !!r.is_mtk,
        }))
      );
    } catch {
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
            bill_doc: d.bill_doc || "",
            date: d.date || "",
            description: d.description || "FACTOM FOS",
            remarks: d.remarks || "",
          }));

          return {
            rate_range: r.rate_range?.value ?? null,
            rate: Number(r.rate || 0),
            print_page_no: r.print_page_no ?? null,
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

      await axiosInstance.put(
        `/destination-entries/${id}/`,
        payload
      );
      //reload app
      alert("Updated successfully");

    } catch (err) {
      console.error(err);
      alert("Failed updating");
    }
  };

  const handlePrint = async () => {

    const response = await axiosInstance.get(
      `/destination-entries/${id}/print/`,
      { responseType: "blob" }
    );

    const fileURL = URL.createObjectURL(response.data);
    window.open(fileURL);
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
      bill_doc: entry.bill_doc || "",
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

  const sortAllDealersByMda = () => {
    setForm((prev) => {
      const nextRanges = prev.ranges.map((range) => {
        if (!range.dealer_entries || range.dealer_entries.length <= 1) {
          return range;
        }

        const sortedEntries = [...range.dealer_entries].sort((a, b) => {
          const mdaA = (a.mda_number || "").trim();
          const mdaB = (b.mda_number || "").trim();

          // empty MDA always last
          if (!mdaA && !mdaB) return 0;
          if (!mdaA) return 1;
          if (!mdaB) return -1;

          return mdaA.localeCompare(mdaB, undefined, {
            numeric: true,
            sensitivity: "base",
          });
        });

        return {
          ...range,
          dealer_entries: sortedEntries,
        };
      });

      return {
        ...prev,
        ranges: nextRanges,
      };
    });
  };


  return (
    <div className="">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold">Edit Destination Entry #{id}</h1>
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

            <div className="flex gap-2">
              {/* SORT BY MDA */}
              <button
                onClick={sortAllDealersByMda}
                title="Sort all dealers by MDA number"
                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded text-sm"
              >
                ⇅ MDA
              </button>

              {/* ADD RANGE */}
              <button
                onClick={addRange}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
              >
                + Add Range
              </button>
            </div>
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


      <div className="flex justify-end mt-5 gap-2">
        <button
          onClick={handlePrint}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
        >
          Print
        </button>
        <button
          onClick={handleSubmit}
          className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
        >
          Update
        </button>
      </div>
    </div>
  );
}
