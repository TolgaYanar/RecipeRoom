import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Bookmark, ShoppingCart, ChevronDown, User, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import MegaMenu from './MegaMenu';

const regularNav = [
  { path: '/recipes', label: 'Recipes' },
  { path: '/challenges', label: 'Challenges' },
  { path: '/create', label: 'Create' },
];

const supplierNav = [
  { path: '/supplier', label: 'Dashboard' },
  { path: '/supplier/inventory', label: 'Inventory' },
  { path: '/supplier/orders', label: 'Orders' },
  { path: '/recipes', label: 'Recipes' },
];

export default function Navbar() {
  const { user, logout, openAuth } = useAuth();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMegaMenu, setShowMegaMenu] = useState(false);
  const megaOpenTimer = useRef(null);
  const megaCloseTimer = useRef(null);

  const isSupplier = user?.user_type === 'Local_Supplier';
  const isAdmin = user?.user_type === 'Administrator';
  const navLinks = isSupplier ? supplierNav : regularNav;

  const isActive = (path) => location.pathname === path;

  // Close user menu on outside click
  useEffect(() => {
    if (!showUserMenu) return;
    const handler = (e) => {
      if (!e.target.closest('.user-menu-container')) setShowUserMenu(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showUserMenu]);

  const handleRecipesEnter = () => {
    clearTimeout(megaCloseTimer.current);
    megaOpenTimer.current = setTimeout(() => setShowMegaMenu(true), 120);
  };

  const handleRecipesLeave = () => {
    clearTimeout(megaOpenTimer.current);
    megaCloseTimer.current = setTimeout(() => setShowMegaMenu(false), 150);
  };

  const closeMegaMenu = () => {
    clearTimeout(megaOpenTimer.current);
    clearTimeout(megaCloseTimer.current);
    setShowMegaMenu(false);
  };

  const avatarSrc = user?.avatar
    || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.username || 'U')}`;

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 bg-[#1B3A2D] h-[72px]"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="max-w-[1440px] mx-auto px-20 h-full flex items-center justify-between">
          {/* Left: Logo + Nav Links */}
          <div className="flex items-center" style={{ gap: '48px' }}>
            {/* Wordmark */}
            <Link to="/" className="flex items-center hover:opacity-90 transition-opacity" style={{ gap: '10px' }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M4 14C4 18.4183 7.58172 22 12 22H16C20.4183 22 24 18.4183 24 14C24 13.4477 23.5523 13 23 13H5C4.44772 13 4 13.4477 4 14Z"
                  fill="#F5C518" stroke="#F5C518" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                />
                <path d="M9 9C9 9 9.5 6 11 6" stroke="#F5C518" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M14 8C14 8 14.5 5 16 5" stroke="#F5C518" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M19 9C19 9 19.5 6 21 6" stroke="#F5C518" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <div className="flex items-baseline">
                <span className="text-[20px] font-normal text-white">Recipe</span>
                <span className="text-[20px] font-extrabold text-[#F5C518]">Room</span>
              </div>
            </Link>

            {/* Nav Links */}
            <div className="hidden md:flex items-center" style={{ gap: '36px' }}>
              {navLinks.map((link) => {
                const active = isActive(link.path);
                const isRecipes = link.label === 'Recipes';
                return (
                  <div
                    key={link.path}
                    className="relative"
                    onMouseEnter={isRecipes ? handleRecipesEnter : undefined}
                    onMouseLeave={isRecipes ? handleRecipesLeave : undefined}
                  >
                    <Link
                      to={link.path}
                      className="text-[14px] font-medium transition-all hover:text-white hover:font-semibold"
                      style={{ color: active ? '#F5C518' : 'rgba(255,255,255,0.75)', fontWeight: active ? 600 : undefined }}
                    >
                      {link.label}
                    </Link>
                    {active && (
                      <div
                        className="absolute left-0 right-0 bg-[#F5C518]"
                        style={{ height: '2px', bottom: '-4px' }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Icons + User */}
          <div className="flex items-center" style={{ gap: '12px' }}>
            {user ? (
              <>
                {!isSupplier && (
                  <>
                    <button className="p-2 rounded-lg transition-all hover:bg-white/10">
                      <Search className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.75)' }} strokeWidth={1.5} />
                    </button>
                    <button className="p-2 rounded-lg transition-all hover:bg-white/10">
                      <Bookmark className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.75)' }} strokeWidth={1.5} />
                    </button>
                    <Link to="/checkout" className="relative p-2 rounded-lg transition-all hover:bg-white/10">
                      <ShoppingCart className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.75)' }} strokeWidth={1.5} />
                    </Link>
                    <div className="h-[20px] mx-1" style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.20)' }} />
                  </>
                )}

                {/* User menu */}
                <div className="relative user-menu-container">
                  <button
                    onClick={() => setShowUserMenu((v) => !v)}
                    className="flex items-center gap-2 p-1.5 rounded-lg transition-all hover:bg-white/10"
                  >
                    <img
                      src={avatarSrc}
                      alt={user.username}
                      className="w-8 h-8 rounded-full object-cover"
                      style={{ border: '1.5px solid #F5C518' }}
                      onError={(e) => { e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.username || 'U')}`; }}
                    />
                    <span className="text-sm font-medium text-white hidden lg:block">
                      {user.username}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.60)' }} strokeWidth={1.5} />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-[#EBEBEB] rounded-lg shadow-lg py-1 z-[100]">
                      <Link
                        to="/profile"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center px-4 py-2.5 text-[14px] text-[#1A1A1A] hover:bg-[#FAF8F5] transition-colors"
                      >
                        <User className="w-4 h-4 mr-2.5 text-[#6B6B6B]" strokeWidth={1.5} />
                        My Profile
                      </Link>

                      {isAdmin && (
                        <>
                          <div className="border-t border-[#EBEBEB] my-1" />
                          <Link
                            to="/admin"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center px-4 py-2.5 text-[14px] text-[#1A1A1A] hover:bg-[#FAF8F5] transition-colors"
                          >
                            <Shield className="w-4 h-4 mr-2.5 text-[#F5C518]" strokeWidth={1.5} />
                            <span className="font-semibold">Admin Dashboard</span>
                          </Link>
                        </>
                      )}

                      <div className="border-t border-[#EBEBEB] my-1" />
                      <button
                        onClick={() => { logout(); setShowUserMenu(false); }}
                        className="flex items-center w-full px-4 py-2.5 text-[14px] text-[#1A1A1A] hover:bg-[#FAF8F5] transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4 mr-2.5 text-[#6B6B6B]" strokeWidth={1.5} />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={openAuth}
                className="border-[1.5px] border-white bg-transparent text-white hover:bg-white hover:text-[#1B3A2D] rounded-md px-4 py-1.5 text-[14px] font-semibold transition-all"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Spacer so content isn't hidden under fixed nav */}
      <div className="h-[72px]" />

      <MegaMenu
        isOpen={showMegaMenu}
        onClose={closeMegaMenu}
        onMouseEnter={handleRecipesEnter}
        onMouseLeave={handleRecipesLeave}
      />
    </>
  );
}
