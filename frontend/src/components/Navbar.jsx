import { Link, useLocation } from 'react-router-dom';
import { TbSoupFilled } from "react-icons/tb";
import { useAuth } from '../context/AuthContext';
import { RECIPE_DROPDOWN } from '../constants/tags';

export default function Navbar() {
  const { user, logout, openAuth } = useAuth();
  const location = useLocation();
  const path = location.pathname;

  return (
    <nav className="bg-green-950 px-6 py-3 flex items-center justify-between">
      {/* Left side - Logo + Nav links */}
      <div className="flex items-center gap-8">
        <Link to="/" className="text-white font-bold text-lg flex items-center">
          <span className="px-2 text-yellow-400"><TbSoupFilled /></span> Recipe<span className="text-amber-400">Room</span>
        </Link>
        <div className="flex items-center gap-6">
          {/* Recipes dropdown */}
          <div className="static group py-3 -my-3">
            <Link to="/recipes" className={`hover:font-bold text-sm transition ${path.startsWith('/recipes') ? 'border-b-2 font-bold text-amber-300 border-amber-400' : 'text-gray-300 font-medium'}`}>
              Recipes
            </Link>
            <div className="fixed left-0 right-0 top-[48px] hidden group-hover:block z-50">
              <div className="bg-white shadow-xl border-t border-gray-200 px-12 py-8 grid grid-cols-6 gap-6 max-w-screen">
                {RECIPE_DROPDOWN.map((section) => (
                  <div key={section.title}>
                    <h3 className="text-gray-700 font-bold mb-3">{section.title}</h3>
                    <ul className="space-y-2">
                      {section.options.map((option) => (
                        <li key={option.value}>
                          <Link
                            to={`/recipes?${section.param}=${option.value}`}
                            className="text-gray-600 hover:text-green-950 text-sm transition"

                          >
                            {option.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="bg-white shadow-xl border-t border-gray-200 px-12 py-4 flex justify-center">
                <Link to="/recipes" className="text-green-900 font-semibold text-sm hover:text-amber-600 transition">
                  VIEW ALL RECIPES →
                </Link>
              </div>
            </div>
          </div>
          <Link to="/challenges" className={`hover:font-bold text-sm transition ${path.startsWith('/challenges') ? 'border-b-2 font-bold text-amber-300 border-amber-400' : 'text-gray-300 font-medium'}`}>
            Challenges
          </Link>
          {user && (user.user_type === 'Home_Cook' || user.user_type === 'Verified_Chef') && (
            <Link to="/create" className={`hover:font-bold text-sm transition ${path.startsWith('/create') ? 'border-b-2 font-bold text-amber-300 border-amber-400' : 'text-gray-300 font-medium'}`}>
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
                <Link to="/supplier" className={`hover:font-bold text-sm transition ${path === '/supplier' ? 'border-b-2 font-bold text-amber-300 border-amber-400' : 'text-gray-300 font-medium'}`}>
                  Dashboard
                </Link>
                <Link to="/supplier/inventory" className={`hover:font-bold text-sm transition ${path === '/supplier/inventory' ? 'border-b-2 font-bold text-amber-300 border-amber-400' : 'text-gray-300 font-medium'}`}>
                  Inventory
                </Link>
                <Link to="/supplier/orders" className={`hover:font-bold text-sm transition ${path === '/supplier/orders' ? 'border-b-2 font-bold text-amber-300 border-amber-400' : 'text-gray-300 font-medium'}`}>
                  Orders
                </Link>
              </div>
            )}

            {/* Admin link */}
            {user.user_type === 'Administrator' && (
              <Link to="/admin" className={`hover:font-bold text-sm transition ${path.startsWith('/admin') ? 'border-b-2 font-bold text-amber-300 border-amber-400' : 'text-gray-300 font-medium'} mr-4`}>
                Admin Panel
              </Link>
            )}

            {/* User dropdown */}
            <div className="flex items-center gap-3">
              <Link to="/profile" className="text-white text-sm font-medium hover:text-amber-400 transition">
                {user.username}
              </Link>
              <button
                onClick={logout}
                className="text-gray-400 hover:text-white text-sm transition"
              >
                Logout
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={openAuth}
            className="border border-gray-500 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-gray-700 transition"
          >
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
}
