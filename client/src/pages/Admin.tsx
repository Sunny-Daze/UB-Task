import { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../api/client';

const initialForm = {
  name: '',
  trigger_type: 'nth_order' as 'nth_order' | 'first_time' | 'manual',
  trigger_value: '3',
  discount_type: 'percentage' as 'percentage' | 'flat',
  discount_value: '10',
  max_discount_amount: '',
  min_order_amount: '',
  coupon_validity_days: '30',
  active: true,
};

const Admin = () => {
  const [form, setForm] = useState(initialForm);
  const [issued, setIssued] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadIssued = async () => {
    const res = await api.get('/coupons/issued');
    setIssued(res.data.data);
  };

  useEffect(() => {
    const init = async () => {
      try {
        await loadIssued();
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const setField = (key: string, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const body: any = {
        name: form.name,
        trigger_type: form.trigger_type,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        active: form.active,
      };
      if (form.trigger_type === 'nth_order') {
        body.trigger_value = Number(form.trigger_value);
      }
      if (form.max_discount_amount) {
        body.max_discount_amount = Number(form.max_discount_amount);
      }
      if (form.min_order_amount) {
        body.min_order_amount = Number(form.min_order_amount);
      }
      if (form.coupon_validity_days) {
        body.coupon_validity_days = Number(form.coupon_validity_days);
      }

      await api.post('/coupons/configurations', body);
      setSuccess('Coupon configuration created');
      setForm(initialForm);
      await loadIssued();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-6">Configurations</h1>

        <form
          onSubmit={submit}
          className="bg-white border border-slate-200 rounded-lg p-6 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input
              required
              className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-blue-500"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Trigger type</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded bg-white focus:outline-none focus:border-blue-500"
              value={form.trigger_type}
              onChange={(e) => setField('trigger_type', e.target.value)}
            >
              <option value="nth_order">Every Nth order</option>
              <option value="first_time">First order</option>
              <option value="manual">Manual</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Trigger value (N)
            </label>
            <input
              type="number"
              min={1}
              disabled={form.trigger_type !== 'nth_order'}
              className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-blue-500 disabled:bg-slate-50"
              value={form.trigger_value}
              onChange={(e) => setField('trigger_value', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Discount type</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded bg-white focus:outline-none focus:border-blue-500"
              value={form.discount_type}
              onChange={(e) => setField('discount_type', e.target.value)}
            >
              <option value="percentage">Percentage</option>
              <option value="flat">Flat</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Discount value</label>
            <input
              type="number"
              min={0}
              step="0.01"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-blue-500"
              value={form.discount_value}
              onChange={(e) => setField('discount_value', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Max discount amount
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-blue-500"
              value={form.max_discount_amount}
              onChange={(e) => setField('max_discount_amount', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Min order amount
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-blue-500"
              value={form.min_order_amount}
              onChange={(e) => setField('min_order_amount', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Validity (days)</label>
            <input
              type="number"
              min={1}
              className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-blue-500"
              value={form.coupon_validity_days}
              onChange={(e) => setField('coupon_validity_days', e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="active"
              type="checkbox"
              checked={form.active}
              onChange={(e) => setField('active', e.target.checked)}
            />
            <label htmlFor="active" className="text-sm text-slate-700">
              Active
            </label>
          </div>

          {error && <div className="md:col-span-2 text-sm text-red-600">{error}</div>}
          {success && <div className="md:col-span-2 text-sm text-green-700">{success}</div>}

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create configuration'}
            </button>
          </div>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-3">Issued coupons</h2>
        {loading ? (
          <div className="text-slate-500">Loading…</div>
        ) : issued.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded p-6 text-slate-500">
            No coupons issued yet.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Config</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Discount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {issued.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-blue-700">{c.code}</td>
                    <td className="px-4 py-3">{c.configuration_name}</td>
                    <td className="px-4 py-3">{c.username ?? '—'}</td>
                    <td className="px-4 py-3">
                      {c.discount_type === 'percentage'
                        ? `${c.discount_value}%`
                        : `$${c.discount_value}`}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">{c.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(c.expires_at).toLocaleDateString()}
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

export default Admin;
