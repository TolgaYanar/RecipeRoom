import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, openAuth } = useAuth();

  useEffect(() => {
    if (!user) openAuth();
  }, [user, openAuth]);

  if (!user) return null;
  return children;
}
