import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-colors ${
    isActive
      ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] font-medium'
      : 'text-[var(--color-ink-700)] hover:bg-[var(--color-paper-2)]'
  }`;

const Dot = ({ active }: { active: boolean }) => (
  <span
    className={`inline-block w-1.5 h-1.5 rounded-full ${
      active ? 'bg-[var(--color-brand-500)]' : 'bg-slate-300'
    }`}
  />
);

const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/login');
  };

  const initial = (user?.username ?? '?').slice(0, 1).toUpperCase();

  return (
    <div className="h-screen flex bg-[var(--color-paper)]">
      <aside className="w-64 bg-white border-r border-slate-200/70 flex flex-col">
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center gap-2">
            <div className="font-display text-lg tracking-tight text-[var(--color-ink-900)]">
              uniblox store
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          <NavLink to="/products" className={navItemClass}>
            {({ isActive }) => <>Products</>}
          </NavLink>
          <NavLink to="/cart" className={navItemClass}>
            {({ isActive }) => <>Cart</>}
          </NavLink>
          <NavLink to="/orders" className={navItemClass}>
            {({ isActive }) => <>Orders</>}
          </NavLink>
          <NavLink to="/coupons" className={navItemClass}>
            {({ isActive }) => <>Coupons</>}
          </NavLink>
          {user?.role === 'admin' && (
            <>
              <div className="px-3 pt-5 pb-2 text-[10px] uppercase tracking-[0.12em] text-slate-400">
                Admin
              </div>
              <NavLink to="/admin" end className={navItemClass}>
                {({ isActive }) => <>Configurations</>}
              </NavLink>
              <NavLink to="/admin/stats" className={navItemClass}>
                {({ isActive }) => <>Stats</>}
              </NavLink>
            </>
          )}
        </nav>

        <div className="p-3 border-t border-slate-200/70">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-[var(--color-paper-2)] text-[var(--color-ink-700)] flex items-center justify-center text-sm font-medium">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-[var(--color-ink-900)] truncate">
                {user?.username}
              </div>
              <div className="text-[11px] text-[var(--color-ink-500)] capitalize">{user?.role}</div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full mt-1 text-[13px] px-3 py-2 rounded-md text-[var(--color-ink-700)] hover:bg-red-50 hover:text-red-600 text-left"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-10 py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
