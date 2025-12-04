import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ForgetPassword from './components/Auth/ForgetPassword';
import Dashboard from './components/Dashboard';
import CategoryList from './components/Category/CategoryList';
import CategoryForm from './components/Category/CategoryForm';
import BrandList from './components/Brand/BrandList';
import BrandForm from './components/Brand/BrandForm';
import ProductList from './components/Product/ProductList';
import ProductForm from './components/Product/ProductForm';
import UserHome from './components/UserHome/UserHome';
import UserElectroniccategory from './components/UserHome/UserElectroniccategory';
import ProductDetail from './components/Product/ProductDetail';
import CartCustomer from './pages/Cart';
import LoginCustomer from './components/AuthCustomer/LoginCustomer';
import RegisterCustomer from './components/AuthCustomer/RegisterCustomer';
import ForgotPasswordCustomer from './components/AuthCustomer/ForgotPasswordCustomer';
import ProtectedRouteCustomer from './components/ProtectedRouteCustomer';
import CheckoutCustomer from './pages/CheckoutCustomer';
import OrderSuccess from './pages/OrderSuccess';
import OrderStatus from './pages/OrderStatus';
import MyOrders from './pages/MyOrders';
import AdminOrders from './pages/AdminOrders';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import OrderTracking from './pages/OrderTracking'

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<UserHome />} />
        <Route path="/home" element={<UserHome />} />
        <Route path="/category/:slug" element={<UserElectroniccategory />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        
        {/* Customer Auth Routes */}
        <Route path="/login-customer" element={<LoginCustomer />} />
        <Route path="/register-customer" element={<RegisterCustomer />} />
        <Route path="/forgot-password-customer" element={<ForgotPasswordCustomer />} />
        <Route path="/order-tracking/:orderId" element={<OrderTracking />} />

        {/* Customer Protected Routes */}
        <Route path="/cart" element={<CartCustomer />} />
        <Route path="/checkout-customer" element={<CheckoutCustomer />} />
        <Route path="/order-success" element={<OrderSuccess />} />
        <Route path="/order-status" element={<OrderStatus />} />
        <Route path="/orders" element={<AdminOrders />} />
                <Route path="/user-orders" element={<MyOrders />} />

        {/* Admin Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forget" element={<ForgetPassword />} />
        
        {/* Admin Dashboard Routes */}
        <Route path="/dashboard" element={<Dashboard />}>
          <Route path="categories" element={<CategoryList />} />
          <Route path="categories/add" element={<CategoryForm />} />
          <Route path="categories/edit/:id" element={<CategoryForm />} />
          <Route path="brands" element={<BrandList />} />
          <Route path="brands/add" element={<BrandForm />} />
          <Route path="brands/edit/:id" element={<BrandForm />} />
          <Route path="products" element={<ProductList />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/edit/:id" element={<ProductForm />} />
          <Route path="orders" element={<AdminOrders />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;