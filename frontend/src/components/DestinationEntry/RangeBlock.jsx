import { useState } from "react";
import Select from "react-select";
import DealerEntriesBlock from "./DealerEntriesBlock";

/**
 * RangeBlock.jsx
 *
 * Props:
 * - index
 * - range (object)
 * - rateRanges (array)
 * - loadingRanges (bool)
 * - loadDealers(input) => Promise<options[]>
 * - onSelectRange(option) -> called when user selects a range option
 * - onRemoveRange() -> remove this whole block
 * - onUpdateRange(newRange) -> replace range object (used to update dealer entries etc)
 * - onUpdateRangeField(field, value)
 *
 * Behavior:
 * - If range.rate_range is null => show Select dropdown
 * - After selection => show read-only info (Option C)
 * - Manage dealer rows locally but call onUpdateRange to persist changes upstream
 */

export default function RangeBlock({
  range,
  rateRanges,
  loadingRanges,
  onSelectRange,
  onRemoveRange,
  onUpdateRange,
  selectedDestinationId,
  usedRateRangeIds,
}) {
  // keep a tiny local state to force re-renders when internal objects updated

  const filteredOptions = rateRanges.filter(
    r => !usedRateRangeIds.includes(r.value)
  );


  return (
    <div className="border rounded p-4 bg-gray-50">
      {/* header */}
      <div className="flex justify-between items-center mb-3">
        {/* Left section — selector OR read-only block */}
        <div className="flex-1">
          {!range.rate_range ? (
            // ---------- RANGE SELECTOR ----------
            <div>
              <label className="block mb-1 text-sm font-medium">
                Select Range Slab
              </label>
              <Select
                options={filteredOptions}
                isLoading={loadingRanges}
                onChange={(opt) => onSelectRange(opt)}
                placeholder="Choose range slab..."
              />
            </div>
          ) : (
            // ---------- READ-ONLY DISPLAY ----------
            <div className="border rounded-lg p-2 bg-gray-50">
              <div className="grid grid-cols-4 gap-3 items-center text-center">

                {/* PRINT PAGE NO */}
                <div className="text-left">
                  <div className="text-xs text-gray-600">Page</div>
                  <input
                    type="number"
                    min="1"
                    placeholder="Auto"
                    className="border rounded px-2 py-1 text-sm w-20"
                    value={range.print_page_no ?? ""}
                    onChange={(e) =>
                      onUpdateRange({
                        ...range,
                        print_page_no: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                  />
                </div>

                {/* RANGE */}
                <div>
                  <div className="text-sm text-gray-600">Range</div>
                  <div className="font-semibold">
                    {range.rate_range.from_km} – {range.rate_range.to_km} km
                  </div>
                </div>

                {/* MODE */}
                <div>
                  <div className="text-sm text-gray-600">Mode</div>
                  <div className="font-semibold">
                    {range.rate_range.is_mtk ? "MTK" : "MT"}
                  </div>
                </div>

                {/* RATE */}
                <div>
                  <div className="text-sm text-gray-600">Rate</div>
                  <div className="font-semibold">
                    ₹{Number(range.rate).toFixed(2)}
                  </div>
                </div>

              </div>
            </div>

          )}
        </div>

        {/* Right side — remove button */}
        {range.rate_range && (
          <button
            onClick={onRemoveRange}
            className="ml-4 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded whitespace-nowrap"
          >
            Remove
          </button>
        )}
      </div>

      {range.rate_range && (
        <DealerEntriesBlock
          range={range}
          onUpdateRange={onUpdateRange}
          selectedDestinationId={selectedDestinationId}
        />
      )}
    </div>
  );
}
