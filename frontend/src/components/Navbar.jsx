import { Link } from 'react-router-dom';

export default function Navbar({ user, onSignInClick, onLogout }) {
  return (
    <nav className="bg-[#2d2d2d] px-6 py-3 flex items-center justify-between">
      {/* Left side - Logo + Nav links */}
      <div className="flex items-center gap-8">
        <Link to="/" className="text-white font-bold text-lg flex items-center gap-1">
          <span>🍳</span> Recipe<span className="text-amber-400">Room</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/recipes" className="text-gray-300 hover:text-white text-sm font-medium transition">
            Recipes
          </Link>
          <Link to="/challenges" className="text-gray-300 hover:text-white text-sm font-medium transition">
            Challenges
          </Link>
          {user && (user.user_type === 'Home_Cook' || user.user_type === 'Verified_Chef') && (
            <Link to="/create" className="text-gray-300 hover:text-white text-sm font-medium transition">
              Create
            </Link>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {user ? (
          <>
            {/* Supplier-specific links */}
            {user.user_type === 'Local_Supplier' && (
              <div className="flex items-center gap-4 mr-4">
                <Link to="/supplier" className="text-gray-300 hover:text-white text-sm font-medium transition">
                  Dashboard
                </Link>
                <Link to="/supplier/inventory" className="text-gray-300 hover:text-white text-sm font-medium transition">
                  Inventory
                </Link>
                <Link to="/supplier/orders" className="text-gray-300 hover:text-white text-sm font-medium transition">
                  Orders
                </Link>
              </div>
            )}

            {/* Admin link */}
            {user.user_type === 'Administrator' && (
              <Link to="/admin" className="text-gray-300 hover:text-white text-sm font-medium transition mr-4">
                Admin Panel
              </Link>
            )}

            {/* User dropdown */}
            <div className="flex items-center gap-3">
              <Link to="/profile" className="text-white text-sm font-medium hover:text-amber-400 transition">
                {user.username}
              </Link>
              <button
                onClick={onLogout}
                className="text-gray-400 hover:text-white text-sm transition"
              >
                Logout
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={onSignInClick}
            className="border border-gray-500 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-gray-700 transition"
          >
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
}
