import { Routes, Route } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import ErrorBoundary from './components/ErrorBoundary';
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
import NotFound from './pages/NotFound';

function App() {
  const { showAuth, closeAuth, login } = useAuth();

  return (
    <>
      <Navbar />
      <AuthModal isOpen={showAuth} onClose={closeAuth} onLogin={login} />
      <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/recipes" element={<Recipes />} />
        <Route path="/recipes/:id" element={<RecipeDetail />} />
        <Route path="/challenges" element={<Challenges />} />

        <Route path="/create" element={
          <RoleRoute roles={['Home_Cook', 'Verified_Chef']}>
            <CreateRecipe />
          </RoleRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute><Profile /></ProtectedRoute>
        } />

        <Route path="/checkout" element={
          <ProtectedRoute><Checkout /></ProtectedRoute>
        } />

        <Route path="/supplier" element={
          <RoleRoute roles={['Local_Supplier']}>
            <SupplierDashboard />
          </RoleRoute>
        } />
        <Route path="/supplier/inventory" element={
          <RoleRoute roles={['Local_Supplier']}>
            <SupplierInventory />
          </RoleRoute>
        } />
        <Route path="/supplier/orders" element={
          <RoleRoute roles={['Local_Supplier']}>
            <SupplierOrders />
          </RoleRoute>
        } />

        <Route path="/admin" element={
          <RoleRoute roles={['Administrator']}>
            <AdminPanel />
          </RoleRoute>
        } />

        <Route path="*" element={<NotFound />} />
      </Routes>
      </ErrorBoundary>
    </>
  );
}

export default App;
