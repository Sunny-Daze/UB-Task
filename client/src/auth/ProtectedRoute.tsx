import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export const ProtectedRoute = ({
  children,
  adminOnly,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-slate-500 gap-2 px-4 text-center">
        <p className="text-lg">Loading…</p>
        <p className="text-sm">
          Please be patient the server may be getting up from a cold start. This can take a few
          moments.
        </p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/products" replace />;

  return <>{children}</>;
};
