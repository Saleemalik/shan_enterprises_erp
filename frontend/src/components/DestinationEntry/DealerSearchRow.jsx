import AsyncSelect from "react-select/async";
import axiosInstance from "../../api/axiosConfig";
import { use, useMemo, useState } from "react";
import { debounce } from "../../api/useDebounce";

export default function DealerSearchRow({ destinationId, onAdd }) {
  const [dealer, setDealer] = useState(null);
  const [mda, setMda] = useState("");
  const [description, setDesc] = useState("");
  const [date, setDate] = useState("");
  const [bags, setBags] = useState("");

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

  const handleAdd = () => {
    if (!dealer) return alert("Select Dealer");
    if (!bags) return alert("Enter Bags");

    onAdd({
      dealer,
      mda,
      date,
      bags: Number(bags),
      description,
    });

    setDealer(null);
    setMda(Number(mda)+1); // increment mda for next entry;
  };

  return (
    <div className="grid grid-cols-7 gap-2 items-center mb-3">
      <label className="text-sm col-span-1">Search Dealer</label>

      <div className="col-span-2">
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
        placeholder="Description"
        value={description}
        onChange={(e) => setDesc(e.target.value)}
      />
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

      <button
        onClick={handleAdd}
        className="px-4 py-1 bg-blue-600 text-white rounded"
      >
        + Add
      </button>
    </div>
  );
}
