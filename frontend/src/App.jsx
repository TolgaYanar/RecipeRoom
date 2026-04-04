import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import Home from './pages/Home';
import Recipes from './pages/Recipes';
import RecipeDetail from './pages/RecipeDetail';
import CreateRecipe from './pages/CreateRecipe';
import Challenges from './pages/Challenges';
import Profile from './pages/Profile';
import Checkout from './pages/Checkout';
import SupplierDashboard from './pages/SupplierDashboard';
import SupplierInventory from './pages/SupplierInventory';
import SupplierOrders from './pages/SupplierOrders';
import AdminPanel from './pages/AdminPanel';

function App() {
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState(null);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <>
      <Navbar
        user={user}
        onSignInClick={() => setShowAuth(true)}
        onLogout={handleLogout}
      />
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onLogin={handleLogin}
      />
      <Routes>
        {/* Main pages */}
        <Route path="/" element={<Home />} />
        <Route path="/recipes" element={<Recipes />} />
        <Route path="/recipes/:id" element={<RecipeDetail />} />
        <Route path="/create" element={<CreateRecipe />} />
        <Route path="/challenges" element={<Challenges />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/checkout" element={<Checkout />} />

        {/* Supplier pages */}
        <Route path="/supplier" element={<SupplierDashboard />} />
        <Route path="/supplier/inventory" element={<SupplierInventory />} />
        <Route path="/supplier/orders" element={<SupplierOrders />} />

        {/* Admin pages */}
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </>
  );
}

export default App;
