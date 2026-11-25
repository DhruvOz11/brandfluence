import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import CreatorSignup from './pages/CreatorSignup';
import CreatorLogin from './pages/CreatorLogin';
import CreatorDashboard from './pages/CreatorDashboard';
import CreatorPortfolio from './pages/CreatorPortfolio';
import BrandSignup from './pages/BrandSignup';
import BrandLogin from './pages/BrandLogin';
import BrandDashboard from './pages/BrandDashboard';
import CreatorProfile from './pages/CreatorProfile';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ChatPage from './pages/ChatPage';
import { getAuthValue } from './utils/authSession';
import './Responsive.css';

const RequireAuth = ({ role, children }) => {
  const hasSession =
    getAuthValue('token') && getAuthValue('userRole') === role;

  return hasSession ? children : <Navigate to={`/${role}/login`} replace />;
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/creator/signup" element={<CreatorSignup />} />
        <Route path="/creator/login" element={<CreatorLogin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route
          path="/creator/dashboard"
          element={<RequireAuth role="creator"><CreatorDashboard /></RequireAuth>}
        />
        <Route
          path="/creator/portfolio"
          element={<RequireAuth role="creator"><CreatorPortfolio /></RequireAuth>}
        />
        <Route
          path="/creator/chat"
          element={<RequireAuth role="creator"><ChatPage /></RequireAuth>}
        />
        <Route path="/brand/signup" element={<BrandSignup />} />
        <Route path="/brand/login" element={<BrandLogin />} />
        <Route
          path="/brand/dashboard"
          element={<RequireAuth role="brand"><BrandDashboard /></RequireAuth>}
        />
        <Route
          path="/brand/chat"
          element={<RequireAuth role="brand"><ChatPage /></RequireAuth>}
        />
        <Route
          path="/creators/:creatorId"
          element={<RequireAuth role="brand"><CreatorProfile /></RequireAuth>}
        />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={<RequireAuth role="admin"><AdminDashboard /></RequireAuth>}
        />
      </Routes>
    </Router>
  );
};

export default App;