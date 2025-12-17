import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axiosConfig";

export default function ServiceBillList() {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBills = async () => {
    try {
      const res = await axiosInstance.get("/service-bills/");
      setBills(res.data.results || res.data);
    } catch (err) {
      console.error("Failed to load service bills", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  if (loading) {
    return <div style={{ padding: 16 }}>Loading service bills...</div>;
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h2>Service Bills</h2>
        <button onClick={() => navigate("/app/service-bills/create")}>
          + New Service Bill
        </button>
      </div>

      {bills.length === 0 ? (
        <div>No service bills created yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {bills.map((bill) => (
            <div
              key={bill.id}
              onClick={() => navigate(`/service-bills/${bill.id}`)}
              style={{
                border: "1px solid #ddd",
                borderRadius: 6,
                padding: 12,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>Service Bill #{bill.id}</strong>
                <span>{bill.bill_date || "—"}</span>
              </div>

              <div style={{ marginTop: 6, fontSize: 14 }}>
                {bill.to_address || "No address"}
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 8, fontSize: 12 }}>
                <span>Handling: {bill.handling ? "✓" : "—"}</span>
                <span>Depot: {bill.transport_depot ? "✓" : "—"}</span>
                <span>FOL: {bill.transport_fol ? "✓" : "—"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
