import AsyncSelect from "react-select/async";
import axiosInstance from "../../api/axiosConfig";
import { useEffect } from "react";

export default function DealerEntriesBlock({
    range,
    onUpdateRange,
    selectedDestinationId,
}) {
    // --- helpers ---
    const normalizeOption = (opt) => {
        if (!opt) return null;

        // ensure stored shape is stable: { value, label, dealer_id, place_id, distance, name_place }
        return {
            value: opt.value,
            label: opt.label,
            dealer_id: opt.dealer_id ?? opt.dealerId ?? null,
            place_id: opt.place_id ?? null,
            distance: opt.distance ?? null,
            name_place: opt.name_place ?? `${opt.label ?? ""}`,
        };
    };

    const safeRows = () => range.dealer_entries || [];

    // --- CRUD helpers ---
    const addDealerRow = () => {
        const next = {
            ...range,
            dealer_entries: [
                ...safeRows(),
                {
                    dealer: null,
                    despatched_to: "",
                    mda_number: "",
                    date: "",
                    no_bags: "",
                    description: "FACTOM FOS",
                    km: "",
                    mt: 0,
                    mtk: 0,
                    amount: 0,
                },
            ],
        };
        onUpdateRange(next);
    };

    useEffect(() => {
        // if no dealer rows exist, add one by default
        debugger
        if (safeRows().length === 0) {
            addDealerRow();
        }
    }, []); // run only once on mount

    

    const removeDealerRow = (di) => {
        const rows = safeRows().filter((_, i) => i !== di);
        onUpdateRange({ ...range, dealer_entries: rows });
    };

    const setRows = (rows) => onUpdateRange({ ...range, dealer_entries: rows });

    const updateRow = (di, patch) => {
        const rows = [...safeRows()];
        rows[di] = { ...rows[di], ...patch };
        setRows(rows);
    };

    // calculate row values deterministically (no reliance on async state)
    const computeRowValues = (row) => {
        const bags = Number(row.no_bags || 0);
        const km = Number(row.km || 0);
        const rate = Number(range.rate || 0);
        const is_mtk = !!range.rate_range?.is_mtk;

        const mt = +(bags * 0.05).toFixed(4);
        const mtk = +(mt * km).toFixed(4);
        const amount = +(is_mtk ? rate * mtk : rate * mt);

        return { mt, mtk, amount };
    };

    // --- load dealers ---
    const loadDealers = async (inputText) => {
        if (!range?.rate_range?.id) return [];

        const params = { range_id: range.rate_range.id };
        if (selectedDestinationId) params.destination_id = selectedDestinationId;

        const res = await axiosInstance.get("/dealers/filter_by_range/", {
            params,
        });
        const data = res.data || [];
        return data
            .filter((item) =>
                String(item.dealer_name || "")
                    .toLowerCase()
                    .includes(String(inputText || "").toLowerCase())
            )
            .map((item) => ({
                value: item.dealer_id,
                dealer_id: item.dealer_id,
                place_id: item.place_id,
                label: `${item.dealer_name} — ${item.place_name} (${item.distance} KM)`,
                distance: item.distance,
                km: item.distance,
                name_place: `${item.dealer_name}, ${item.place_name}`,
            }));
    };

    // keep the row.dealer as a normalized option object (so AsyncSelect can match by .value)
    const handleDealerSelect = (di, opt) => {
        const option = normalizeOption(opt);
        const row = { ...safeRows()[di], dealer: option };

        // always update KM from selected dealer
        if (option?.distance != null) {
            row.km = option.distance;
        }
        // always update despatched_to when dealer changes
        if (option?.name_place) {
            row.despatched_to = option.name_place;
        }

        // compute derived values and update atomically
        const derived = computeRowValues(row);
        updateRow(di, { ...row, ...derived });
    };

    // Bags input: allow only digits and max length 4; compute derived values immediately
    const handleBagsChange = (di, value) => {
        // allow empty or digits only
        if (!/^\d*$/.test(value)) return;
        if (value.length > 4) return;

        const rows = [...safeRows()];
        rows[di] = { ...rows[di], no_bags: value };

        // compute derived values using the new row
        const derived = computeRowValues(rows[di]);
        rows[di] = { ...rows[di], ...derived };

        setRows(rows);
    };

    // MDA/date/desc/despatched_to simple updates -> recalc only if they affect numbers (km/no_bags)
    const handleFieldChange = (di, field, value) => {
        const rows = [...safeRows()];
        rows[di] = { ...rows[di], [field]: value };

        if (field === "no_bags" || field === "km") {
            const derived = computeRowValues(rows[di]);
            rows[di] = { ...rows[di], ...derived };
        }
        setRows(rows);
    };

    // ensure displayed value is normalized object (if stored as raw value string, try to keep it)
    const getSelectValue = (row) => {
        if (!row?.dealer) return null;
        // if already object with value/label, return as-is
        if (row.dealer.value && row.dealer.label) return row.dealer;
        // else try to build a fallback object
        return normalizeOption(row.dealer);
    };

    return (
        <div className="mt-4">
            <div className="flex justify-between mb-2">
                <h4 className="font-semibold">Dealer Entries</h4>
                <button
                    onClick={addDealerRow}
                    className="px-3 py-1 bg-green-600 text-white rounded"
                >
                    + Add Dealer
                </button>
            </div>

            <div className="grid grid-cols-12 gap-2 text-sm font-semibold border-b pb-2 mb-2">
                <div className="col-span-2">Dealer</div>
                <div className="col-span-3">Despatched To</div>
                <div className="col-span-1">MDA</div>
                <div className="col-span-1">Date</div>
                <div className="col-span-1">Bags</div>
                <div className="col-span-1">Desc</div>
                <div className="col-span-3">Details</div>
            </div>

            {safeRows().map((row, di) => (
                <div key={di} className="grid grid-cols-12 gap-1 items-center">
                    {/* Dealer */}
                    <AsyncSelect
                        className="col-span-2"
                        cacheOptions
                        defaultOptions
                        loadOptions={loadDealers}
                        getOptionValue={(o) => o.value}
                        getOptionLabel={(o) => o.label}
                        value={getSelectValue(row)}
                        onChange={(opt) => handleDealerSelect(di, opt)}
                        isClearable
                        styles={{
                            control: (base) => ({
                                ...base,
                                minHeight: "30px",
                                fontSize: "13px",
                            }),
                            menu: (base) => ({ ...base, fontSize: "13px" }),
                        }}
                    />

                    {/* Despatched To */}
                    <input
                        className="col-span-3 border p-1 rounded text-sm"
                        value={row.despatched_to || ""}
                        onChange={(e) =>
                            handleFieldChange(di, "despatched_to", e.target.value)
                        }
                    />

                    {/* MDA */}
                    <input
                        className="col-span-1 border p-1 rounded text-sm"
                        value={row.mda_number || ""}
                        onChange={(e) =>
                            handleFieldChange(di, "mda_number", e.target.value)
                        }
                    />

                    {/* Date */}
                    <input
                        className="col-span-1 border p-1 rounded text-sm"
                        type="date"
                        value={row.date || ""}
                        onChange={(e) => handleFieldChange(di, "date", e.target.value)}
                    />

                    {/* Bags */}
                    <input
                        className="col-span-1 border p-1 rounded text-sm"
                        maxLength={4}
                        inputMode="numeric"
                        value={row.no_bags ?? ""}
                        onChange={(e) => handleBagsChange(di, e.target.value)}
                    />

                    {/* Desc */}
                    <input
                        className="col-span-1 border p-1 rounded text-xs"
                        value={row.description || ""}
                        onChange={(e) =>
                            handleFieldChange(di, "description", e.target.value)
                        }
                    />

                    {/* Details - SUPER COMPACT single/two line */}
                    <div className="col-span-3 bg-gray-100 p-1 rounded leading-tight text-[14px]">
                        <div className="flex items-center gap-1 justify-between flex-wrap">
                            <span>MT: {row.mt ?? 0}</span>

                            <span className="flex items-center">KM: {row.km ?? 0}</span>

                            <span>MTK: {row.mtk ?? 0}</span>

                            <span>₹{Number(row.amount || 0).toFixed(2)}</span>

                            <button
                                onClick={() => removeDealerRow(di)}
                                className="px-1 py-0.5 bg-red-500 text-white rounded text-[12px]"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                </div>
            ))}

            {/* Totals */}
            <div className="mt-3 text-sm font-semibold text-green-700">
                Total Bags: {safeRows().reduce((s, x) => s + Number(x.no_bags || 0), 0)}{" "}
                | MT:{" "}
                {safeRows()
                    .reduce((s, x) => s + Number(x.mt || 0), 0)
                    .toFixed(2)}{" "}
                | MTK:{" "}
                {safeRows()
                    .reduce((s, x) => s + Number(x.mtk || 0), 0)
                    .toFixed(2)}{" "}
                | ₹
                {safeRows()
                    .reduce((s, x) => s + Number(x.amount || 0), 0)
                    .toFixed(2)}
            </div>
        </div>
    );
}
