import { useEffect } from "react";

export default function HandlingSection({ data = {}, onChange }) {
  const input =
    "border p-1 rounded w-full text-right";
  const readonly =
    "border p-1 rounded w-full bg-gray-100 text-right";

  const num = (v) => parseFloat(v || 0);

  // auto calculations
  useEffect(() => {
    const qtyReceived =
      num(data.fol_total) +
      num(data.depot_total) +
      num(data.rh_sales);

    const shortage =
      num(data.qty_shipped) - qtyReceived;

    const billAmount =
      num(data.rate || 0) * qtyReceived;

    const cgst = billAmount * 0.09;
    const sgst = billAmount * 0.09;

    onChange("qty_received", qtyReceived.toFixed(2));
    onChange("shortage", shortage.toFixed(2));
    onChange("total_qty", qtyReceived.toFixed(2));
    onChange("bill_amount", billAmount.toFixed(2));
    onChange("cgst", cgst.toFixed(2));
    onChange("sgst", sgst.toFixed(2));
    onChange(
      "total_bill_amount",
      (billAmount + cgst + sgst).toFixed(2)
    );
  }, [
    data.qty_shipped,
    data.fol_total,
    data.depot_total,
    data.rh_sales,
    data.rate,
  ]);

  return (
    <div className="space-y-6 text-sm">

      {/* Qty Summary */}
      <div className="border rounded p-3">
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className="border p-2">Qty Shipped</td>
              <td className="border p-2 w-40">
                <input
                  className={input}
                  value={data.qty_shipped || ""}
                  onChange={(e) =>
                    onChange("qty_shipped", e.target.value)
                  }
                />
              </td>
            </tr>

            <tr>
              <td className="border p-2">FOL</td>
              <td className="border p-2">
                <input
                  className={input}
                  value={data.fol_total || ""}
                  onChange={(e) =>
                    onChange("fol_total", e.target.value)
                  }
                />
              </td>
            </tr>

            <tr>
              <td className="border p-2">
                Depot (ASC / SWC / CWC)
              </td>
              <td className="border p-2">
                <input
                  className={input}
                  value={data.depot_total || ""}
                  onChange={(e) =>
                    onChange("depot_total", e.target.value)
                  }
                />
              </td>
            </tr>

            <tr>
              <td className="border p-2">RH Sales</td>
              <td className="border p-2">
                <input
                  className={input}
                  value={data.rh_sales || ""}
                  onChange={(e) =>
                    onChange("rh_sales", e.target.value)
                  }
                />
              </td>
            </tr>

            <tr>
              <td className="border p-2 font-semibold">
                Qty Received
              </td>
              <td className="border p-2">
                <input
                  className={readonly}
                  readOnly
                  value={data.qty_received || "0.00"}
                />
              </td>
            </tr>

            <tr>
              <td className="border p-2 font-semibold">
                Excess / Shortage
              </td>
              <td className="border p-2">
                <input
                  className={readonly}
                  readOnly
                  value={data.shortage || "0.00"}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Billing Table */}
      <div className="border rounded p-3">
        <table className="w-full border-collapse text-center">
          <thead>
            <tr className="font-semibold">
              <th className="border p-2">Particulars</th>
              <th className="border p-2">Products</th>
              <th className="border p-2">Qty</th>
              <th className="border p-2">Rate / MT</th>
              <th className="border p-2">Bill Amount</th>
              <th className="border p-2">CGST</th>
              <th className="border p-2">SGST</th>
              <th className="border p-2">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border p-2">
                <input
                  className="border p-1 rounded w-full text-left"
                  value={data.particulars || ""}
                  onChange={(e) =>
                    onChange("particulars", e.target.value)
                  }
                />
              </td>

              <td className="border p-2">
                <input
                  className="border p-1 rounded w-full text-left"
                  value={data.products || ""}
                  onChange={(e) =>
                    onChange("products", e.target.value)
                  }
                />
              </td>

              <td className="border p-2">
                <input
                  className={readonly}
                  readOnly
                  value={data.total_qty || "0.00"}
                />
              </td>

              <td className="border p-2">
                <input
                  className={input}
                  value={data.rate || ""}
                  onChange={(e) =>
                    onChange("rate", e.target.value)
                  }
                />
              </td>

              <td className="border p-2">
                <input
                  className={readonly}
                  readOnly
                  value={data.bill_amount || "0.00"}
                />
              </td>

              <td className="border p-2">
                <input
                  className={readonly}
                  readOnly
                  value={data.cgst || "0.00"}
                />
              </td>

              <td className="border p-2">
                <input
                  className={readonly}
                  readOnly
                  value={data.sgst || "0.00"}
                />
              </td>

              <td className="border p-2 font-semibold">
                <input
                  className={readonly}
                  readOnly
                  value={data.total_bill_amount || "0.00"}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
