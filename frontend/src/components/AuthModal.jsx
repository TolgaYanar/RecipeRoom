import { useState } from 'react';
import { login as apiLogin, registerHomeCook, registerChef, registerSupplier } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose, onLogin }) {
  const { login } = useAuth();
  const [tab, setTab] = useState('signin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Sign In state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign Up state
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirm, setRegisterConfirm] = useState('');
  const [userType, setUserType] = useState('Home Cook');

  // Supplier-specific fields
  const [businessName, setBusinessName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setError('');
    setLoginEmail('');
    setLoginPassword('');
    setRegisterName('');
    setRegisterEmail('');
    setRegisterPassword('');
    setRegisterConfirm('');
    setUserType('Home Cook');
    setBusinessName('');
    setContactNumber('');
    setBusinessAddress('');
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiLogin(loginEmail, loginPassword);
      (onLogin ?? login)(data);
      resetForm();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');

    if (registerPassword !== registerConfirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const base = { username: registerName, email: registerEmail, password: registerPassword };

      if (userType === 'Home Cook') {
        await registerHomeCook(base);
      } else if (userType === 'Chef (Professional)') {
        await registerChef(base);
      } else if (userType === 'Local Supplier') {
        await registerSupplier({
          ...base,
          username: businessName,
          business_name: businessName,
          contact_number: contactNumber,
          address: businessAddress,
        });
      }

      const data = await apiLogin(registerEmail, registerPassword);
      (onLogin ?? login)(data);
      resetForm();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const userTypeDescription = {
    'Home Cook': 'Share your favorite recipes with the community',
    'Chef (Professional)': 'Your chef verification will be reviewed by our team within 48 hours',
    'Local Supplier': 'Provide fresh ingredients to our community',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 pb-2">
          <div>
            <h2 className="text-xl font-semibold text-[#1A1A1A]">Welcome to Recipe Room</h2>
            <p className="text-sm text-[#6B6B6B] mt-1">Sign in to create and share recipes with the world</p>
          </div>
          <button onClick={onClose} className="text-[#9E9E9E] hover:text-[#6B6B6B] text-xl">
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div className="flex mx-6 mt-4 bg-[#FAF8F5] rounded-lg p-1">
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
              tab === 'signin' ? 'bg-white shadow text-[#1A1A1A]' : 'text-[#6B6B6B]'
            }`}
            onClick={() => { setTab('signin'); setError(''); }}
          >
            Sign In
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
              tab === 'signup' ? 'bg-white shadow text-[#1A1A1A]' : 'text-[#6B6B6B]'
            }`}
            onClick={() => { setTab('signup'); setError(''); }}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* Sign In Form */}
        {tab === 'signin' && (
          <form onSubmit={handleSignIn} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-[#D0D0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3A2D] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-[#D0D0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3A2D] focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#1B3A2D] text-white rounded-lg font-medium hover:bg-[#2D5A42] disabled:opacity-50 transition"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* Sign Up Form */}
        {tab === 'signup' && (
          <form onSubmit={handleSignUp} className="p-6 space-y-4">
            {userType === 'Local Supplier' ? (
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Business Name</label>
                <input
                  type="text"
                  placeholder="Your business name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-[#D0D0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3A2D] focus:border-transparent"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Name</label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-[#D0D0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3A2D] focus:border-transparent"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">I am a...</label>
              <select
                value={userType}
                onChange={(e) => setUserType(e.target.value)}
                className="w-full px-3 py-2 border border-[#D0D0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3A2D] focus:border-transparent"
              >
                <option>Home Cook</option>
                <option>Chef (Professional)</option>
                <option>Local Supplier</option>
              </select>
              <p className="text-xs text-[#6B6B6B] mt-1">{userTypeDescription[userType]}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-[#D0D0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3A2D] focus:border-transparent"
              />
            </div>

            {userType === 'Local Supplier' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Contact Number</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 123-4567"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-[#D0D0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3A2D] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Business Address</label>
                  <input
                    type="text"
                    placeholder="123 Farm Road, City, State, ZIP"
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-[#D0D0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3A2D] focus:border-transparent"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-[#D0D0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3A2D] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Confirm Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={registerConfirm}
                onChange={(e) => setRegisterConfirm(e.target.value)}
                required
                className="w-full px-3 py-2 border border-[#D0D0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3A2D] focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#1B3A2D] text-white rounded-lg font-medium hover:bg-[#2D5A42] disabled:opacity-50 transition"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
