import { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../api/client';

const Orders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/orders');
        setOrders(res.data.data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="text-slate-500">Loading orders…</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Orders</h1>

      {orders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded p-6 text-slate-500">
          You haven't placed any orders yet.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Order ID</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Subtotal</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {o.id.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(o.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{o.item_count}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">${Number(o.subtotal).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-600">
                    ${Number(o.total).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Orders;
