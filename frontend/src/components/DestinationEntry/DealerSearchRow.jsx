import AsyncSelect from "react-select/async";
import axiosInstance from "../../api/axiosConfig";
import { use, useMemo, useState, useEffect } from "react";
import { debounce } from "../../api/useDebounce";

export default function DealerSearchRow({ destinationId, onAdd }) {
  const [dealer, setDealer] = useState(null);
  const [mda, setMda] = useState("");
  const [date, setDate] = useState("");
  const [bags, setBags] = useState("");
  const [bill_doc, setBillDoc] = useState("");
  const [transportItem, setTransportItem] = useState(null);

  const loadDealers = async (input) => {
    if (!destinationId) return [];
    const res = await axiosInstance.get(
      `/dealers/by-destination/?destination_id=${destinationId}&search=${input}`
    );
    return res.data.map((d) => ({
      value: d.dealer_id,
      label: `${d.dealer_name} (${d.place_name} - ${d.distance}km)`,
      ...d,
    }));
  };

  const loadDealersDebounced = useMemo(() => {
    return debounce(loadDealers, 1000);
  }, []);

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


  const handleAdd = () => {
    if (!dealer) return alert("Select Dealer");
    if (!bags) return alert("Enter Bags");

    onAdd({
      dealer,
      mda,
      date,
      bags: Number(bags),
      description: transportItem ? transportItem.label : "",
      bill_doc,
    });

    setDealer(null);
    setMda(Number(mda)+1); // increment mda for next entry;
    setBillDoc(Number(bill_doc)+1); // increment bill doc for next entry;
  };

  return (
    <div className="grid grid-cols-10 gap-2 items-center mb-3">
      <label className="text-sm col-span-1">Search Dealer</label>

      <div className="col-span-3">
        <AsyncSelect
            cacheOptions
            defaultOptions
            loadOptions={loadDealersDebounced}
            value={dealer}
            onChange={setDealer}
            onInputChange={(val) => val}
            placeholder="Search dealer..."
            isClearable
        />

      </div>
      
      <input
        className="border p-1 rounded"
        placeholder="MDA No"
        value={mda}
        onChange={(e) => setMda(e.target.value)}
      />
      <input
        type="date"
        className="border p-1 rounded"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <input
        className="border p-1 rounded"
        placeholder="Bags"
        value={bags}
        onChange={(e) => setBags(e.target.value)}
      />

      {/* ✅ Transport Item */}
      <div>
        <AsyncSelect
          cacheOptions
          defaultOptions
          loadOptions={loadItemsDebounced}
          value={transportItem}
          onChange={setTransportItem}
          placeholder="Transport item..."
          isClearable
        />
      </div>

      <input
        className="border p-1 rounded"
        placeholder="Bill Doc"
        value={bill_doc}
        onChange={(e) => setBillDoc(e.target.value)}
      />

      <button
        onClick={handleAdd}
        className="px-4 py-1 bg-blue-600 text-white rounded"
      >
        + Add
      </button>
    </div>
  );
}
