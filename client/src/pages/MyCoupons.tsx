import { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../api/client';

const MyCoupons = () => {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/coupons/my');
        setCoupons(res.data.data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="text-slate-500">Loading…</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">My Coupons</h1>

      {coupons.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded p-6 text-slate-500">
          No coupons yet. Place orders to earn coupons!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map((c) => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="font-mono text-base bg-blue-50 text-blue-700 px-3 py-2 rounded inline-block">
                {c.code}
              </div>
              <div className="text-sm font-medium text-slate-900 mt-3">{c.config?.name}</div>
              <div className="text-xs text-slate-500 mt-1">
                {c.config?.discount_type === 'percentage'
                  ? `${c.config.discount_value}% off`
                  : `$${c.config?.discount_value} off`}
                {c.config?.min_order_amount ? ` · min $${c.config.min_order_amount}` : ''}
              </div>
              <div className="text-xs text-slate-400 mt-2">
                Status: <span className="text-slate-700">{c.status}</span>
              </div>
              <div className="text-xs text-slate-400">
                Expires: {new Date(c.expires_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyCoupons;
