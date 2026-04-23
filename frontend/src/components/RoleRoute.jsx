import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RoleRoute({ children, roles }) {
  const { user, openAuth } = useAuth();

  useEffect(() => {
    if (!user) openAuth();
  }, [user, openAuth]);

  if (!user) return null;

  if (!roles.includes(user.user_type)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-8xl font-bold text-gray-100 mb-4">403</h1>
          <p className="text-gray-500 text-lg mb-6">You don't have permission to view this page.</p>
          <Link to="/" className="text-amber-600 hover:underline text-sm">← Back to Home</Link>
        </div>
      </div>
    );
  }

  return children;
}
