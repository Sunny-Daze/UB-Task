import { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../api/client';

const Products = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/products');
        setProducts(res.data.data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const addToCart = async (productId: string) => {
    setAdding(productId);
    setToast('');
    try {
      await api.post('/cart/items', { productId, quantity: 1 });
      setToast('Added to cart');
      setTimeout(() => setToast(''), 1500);
    } catch (err) {
      setToast(getErrorMessage(err));
      setTimeout(() => setToast(''), 2000);
    } finally {
      setAdding(null);
    }
  };

  if (loading) return <div className="text-slate-500">Loading products…</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Products</h1>
        {toast && <div className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded">{toast}</div>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p) => (
          <div key={p.id} className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col">
            {p.image_uri ? (
              <img
                src={p.image_uri}
                alt={p.name}
                className="w-full h-40 object-cover rounded mb-3 bg-slate-100"
              />
            ) : (
              <div className="w-full h-40 rounded mb-3 bg-slate-100 flex items-center justify-center text-slate-400 text-sm">
                No image
              </div>
            )}
            <div className="font-medium text-slate-900">{p.name}</div>
            {p.category && <div className="text-xs text-slate-500 mb-1">{p.category}</div>}
            {p.description && (
              <div className="text-sm text-slate-600 line-clamp-2 mb-2">{p.description}</div>
            )}
            <div className="mt-auto flex items-center justify-between pt-2">
              <div className="text-blue-600 font-semibold">${Number(p.price).toFixed(2)}</div>
              <div className="text-xs text-slate-500">Stock: {p.stock_quantity}</div>
            </div>
            <button
              onClick={() => addToCart(p.id)}
              disabled={adding === p.id || p.stock_quantity <= 0}
              className="mt-3 w-full bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {p.stock_quantity <= 0 ? 'Out of stock' : adding === p.id ? 'Adding…' : 'Add to cart'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Products;
