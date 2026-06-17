import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client';

const Cart = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState<any>(null);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [appliedCode, setAppliedCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);
  const [orderResult, setOrderResult] = useState<any>(null);

  const loadCart = async (code?: string) => {
    const params = code ? { coupon: code } : {};
    const res = await api.get('/cart', { params });
    setCart(res.data.data);
  };

  const loadCoupons = async () => {
    const res = await api.get('/coupons/my');
    setCoupons(res.data.data);
  };

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([loadCart(), loadCoupons()]);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const update = async (productId: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        await api.delete(`/cart/items/${productId}`, {
          params: appliedCode ? { coupon: appliedCode } : {},
        });
      } else {
        await api.patch(
          `/cart/items/${productId}`,
          { quantity },
          { params: appliedCode ? { coupon: appliedCode } : {} }
        );
      }
      await loadCart(appliedCode || undefined);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const remove = async (productId: string) => {
    try {
      await api.delete(`/cart/items/${productId}`, {
        params: appliedCode ? { coupon: appliedCode } : {},
      });
      await loadCart(appliedCode || undefined);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const clear = async () => {
    try {
      await api.delete('/cart/items', {
        params: appliedCode ? { coupon: appliedCode } : {},
      });
      await loadCart(appliedCode || undefined);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const apply = async (code: string) => {
    try {
      setError('');
      setAppliedCode(code);
      await loadCart(code);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const clearCoupon = async () => {
    setAppliedCode('');
    await loadCart();
  };

  const placeOrder = async () => {
    setPlacing(true);
    setError('');
    try {
      const body = appliedCode ? { coupon_code: appliedCode } : {};
      const res = await api.post('/orders', body);
      setOrderResult(res.data.data);
      await loadCoupons();
      await loadCart();
      setAppliedCode('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPlacing(false);
    }
  };

  if (loading) return <div className="text-slate-500">Loading cart…</div>;

  if (orderResult) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h1 className="text-2xl font-semibold text-blue-600 mb-2">Order placed</h1>
        <div className="text-sm text-slate-600 mb-4">Order #{orderResult.order.id}</div>
        <div className="text-sm">Subtotal: ${Number(orderResult.order.subtotal).toFixed(2)}</div>
        <div className="text-sm">Total: ${Number(orderResult.order.total).toFixed(2)}</div>
        {orderResult.issued_coupons?.length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-medium text-slate-700 mb-2">You earned coupons!</div>
            <ul className="space-y-1">
              {orderResult.issued_coupons.map((c: any) => (
                <li key={c.id} className="text-sm text-slate-600">
                  <span className="font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                    {c.code}
                  </span>{' '}
                  — {c.configuration_name}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => navigate('/orders')}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
          >
            View orders
          </button>
          <button
            onClick={() => {
              setOrderResult(null);
              navigate('/products');
            }}
            className="border border-slate-300 px-4 py-2 rounded text-sm hover:bg-slate-50"
          >
            Continue shopping
          </button>
        </div>
      </div>
    );
  }

  const items = cart?.items ?? [];
  const applied = cart?.applied_coupon;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Cart</h1>
        {items.length > 0 && (
          <button onClick={clear} className="text-sm text-red-600 hover:underline">
            Clear cart
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 text-sm bg-red-50 text-red-600 border border-red-200 px-3 py-2 rounded">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded p-6 text-slate-500">
          Your cart is empty.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
            {items.map((it: any) => (
              <div key={it.product_id} className="p-4 flex items-center gap-4">
                {it.image_uri ? (
                  <img
                    src={it.image_uri}
                    alt={it.name}
                    className="w-16 h-16 object-cover rounded bg-slate-100"
                  />
                ) : (
                  <div className="w-16 h-16 rounded bg-slate-100" />
                )}
                <div className="flex-1">
                  <div className="font-medium text-slate-900">{it.name}</div>
                  <div className="text-sm text-slate-500">${Number(it.price).toFixed(2)} each</div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="w-8 h-8 rounded border border-slate-300 hover:bg-slate-50"
                    onClick={() => update(it.product_id, it.quantity - 1)}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={it.quantity}
                    onChange={(e) => {
                      const v = parseInt(e.target.value || '0', 10);
                      if (!Number.isNaN(v)) update(it.product_id, v);
                    }}
                    className="w-14 text-center px-1 py-1 border border-slate-300 rounded"
                  />
                  <button
                    className="w-8 h-8 rounded border border-slate-300 hover:bg-slate-50"
                    onClick={() => update(it.product_id, it.quantity + 1)}
                  >
                    +
                  </button>
                </div>
                <div className="w-20 text-right font-medium">
                  ${Number(it.line_total).toFixed(2)}
                </div>
                <button
                  onClick={() => remove(it.product_id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="font-medium mb-3 text-slate-900">Coupons</div>
              {coupons.length === 0 ? (
                <div className="text-sm text-slate-500">No coupons available</div>
              ) : (
                <ul className="space-y-2 max-h-64 overflow-y-auto">
                  {coupons.map((c: any) => {
                    const isApplied = appliedCode === c.code;
                    return (
                      <li
                        key={c.id}
                        className={`border rounded p-2 ${
                          isApplied ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-mono text-sm text-blue-700">{c.code}</div>
                            <div className="text-xs text-slate-500">
                              {c.config?.name ?? c.configuration_name ?? ''}
                            </div>
                            <div className="text-xs text-slate-400">
                              {c.status} · expires {new Date(c.expires_at).toLocaleDateString()}
                            </div>
                          </div>
                          {isApplied ? (
                            <button
                              onClick={clearCoupon}
                              className="text-xs text-red-600 hover:underline"
                            >
                              Remove
                            </button>
                          ) : (
                            <button
                              onClick={() => apply(c.code)}
                              disabled={c.status !== 'active'}
                              className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                              Apply
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {applied && !applied.valid && (
                <div className="mt-3 text-xs text-red-600">Coupon invalid: {applied.reason}</div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-slate-600">Subtotal</span>
                <span>${Number(cart.subtotal).toFixed(2)}</span>
              </div>
              {applied?.valid && (
                <div className="flex justify-between mb-1 text-green-700">
                  <span>Discount ({applied.code})</span>
                  <span>−${Number(applied.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-base border-t border-slate-200 pt-2 mt-2">
                <span>Total</span>
                <span className="text-blue-600">${Number(cart.final_amount).toFixed(2)}</span>
              </div>

              <button
                onClick={placeOrder}
                disabled={placing || items.length === 0}
                className="w-full mt-4 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {placing ? 'Placing…' : 'Place order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
