import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import AdminRoute from './AdminRoute.jsx';
import Home from '../pages/customer/Home.jsx';
import Login from '../pages/customer/Login.jsx';
import Register from '../pages/customer/Register.jsx';
import Profile from '../pages/customer/Profile.jsx';
import ProductList from '../pages/customer/ProductList.jsx';
import ProductDetail from '../pages/customer/ProductDetail.jsx';
import Cart from '../pages/customer/Cart.jsx';
import Checkout from '../pages/customer/Checkout.jsx';
import Payment from '../pages/customer/Payment.jsx';
import PaymentConfirmation from '../pages/customer/PaymentConfirmation.jsx';
import OrderHistory from '../pages/customer/OrderHistory.jsx';
import ManageOrders from '../pages/admin/ManageOrders.jsx';
import Inventory from '../pages/admin/Inventory.jsx';
import ManageProducts from '../pages/admin/ManageProducts.jsx';
import ManageCategories from '../pages/admin/ManageCategories.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/products" element={<ProductList />} />
      <Route path="/products/:id" element={<ProductDetail />} />
      <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
      <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
      <Route path="/payment/:id" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
      <Route path="/orders/:id/confirmation" element={<ProtectedRoute><PaymentConfirmation /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/admin/orders" element={<AdminRoute><ManageOrders /></AdminRoute>} />
      <Route path="/admin/inventory" element={<AdminRoute><Inventory /></AdminRoute>} />
      <Route path="/admin" element={<Navigate to="/admin/products" replace />} />
      <Route path="/admin/products" element={<AdminRoute><ManageProducts /></AdminRoute>} />
      <Route path="/admin/categories" element={<AdminRoute><ManageCategories /></AdminRoute>} />
      <Route path="*" element={<p>Page not found.</p>} />
    </Routes>
  );
}
