import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import AdminRoute from './AdminRoute.jsx';
import Home from '../pages/customer/Home.jsx';
import NotFound from '../pages/customer/NotFound.jsx';
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
import OrderTracking from '../pages/customer/OrderTracking.jsx';
import Notifications from '../pages/customer/Notifications.jsx';
import Dashboard from '../pages/admin/Dashboard.jsx';
import Deliveries from '../pages/admin/Deliveries.jsx';
import ManageCustomers from '../pages/admin/ManageCustomers.jsx';
import ManagePayments from '../pages/admin/ManagePayments.jsx';
import Reports from '../pages/admin/Reports.jsx';
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
      <Route path="/orders/:id/track" element={<ProtectedRoute><OrderTracking /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/admin" element={<AdminRoute><Dashboard /></AdminRoute>} />
      <Route path="/admin/deliveries" element={<AdminRoute><Deliveries /></AdminRoute>} />
      <Route path="/admin/customers" element={<AdminRoute><ManageCustomers /></AdminRoute>} />
      <Route path="/admin/payments" element={<AdminRoute><ManagePayments /></AdminRoute>} />
      <Route path="/admin/reports" element={<AdminRoute><Reports /></AdminRoute>} />
      <Route path="/admin/products" element={<AdminRoute><ManageProducts /></AdminRoute>} />
      <Route path="/admin/categories" element={<AdminRoute><ManageCategories /></AdminRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
