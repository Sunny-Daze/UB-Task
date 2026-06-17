import { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../api/client';

const fmtMoney = (n: number) =>
  `$${(Number(n) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtInt = (n: number) => (Number(n) || 0).toLocaleString();

const Stats = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const res = await api.get('/coupons/stats');
    setStats(res.data.data);
  };

  useEffect(() => {
    const init = async () => {
      try {
        await load();
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    setError('');
    try {
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return <div className="text-slate-500">Loading stats…</div>;
  }
  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  const overview = stats?.overview;
  const discountCodes = stats?.discount_codes ?? [];

  const cards = [
    { label: 'Orders', value: fmtInt(overview?.total_orders ?? 0) },
    { label: 'Items sold', value: fmtInt(overview?.items_purchased ?? 0) },
    { label: 'Revenue', value: fmtMoney(overview?.revenue ?? 0) },
    { label: 'Discounts given', value: fmtMoney(overview?.total_discount ?? 0) },
    { label: 'Coupons used', value: fmtInt(overview?.coupons_used ?? 0) },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Stats</h1>
          <div className="text-sm text-slate-500 mt-1">
            Sales activity and coupon redemption across all users.
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="text-sm border border-slate-300 rounded px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="text-[11px] uppercase tracking-[0.1em] text-slate-500">
              {card.label}
            </div>
            <div className="font-display text-xl mt-1 text-slate-900">{card.value}</div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Discount codes used</h2>
        {discountCodes.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded p-6 text-slate-500">
            No coupons have been redeemed yet.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Configuration</th>
                  <th className="px-4 py-3 font-medium text-right">Times used</th>
                  <th className="px-4 py-3 font-medium text-right">Total discount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {discountCodes.map((d: any) => (
                  <tr key={d.coupon_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-blue-700">{d.code}</td>
                    <td className="px-4 py-3">{d.configuration_name}</td>
                    <td className="px-4 py-3 text-right">{fmtInt(d.times_used)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-700">
                      {fmtMoney(d.total_discount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Stats;
