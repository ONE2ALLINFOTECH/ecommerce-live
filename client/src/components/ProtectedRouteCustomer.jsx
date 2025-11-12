import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRouteCustomer = ({ children }) => {
  const { userInfo } = useSelector(state => state.userCustomer);
  const location = useLocation();

  if (!userInfo) {
    return <Navigate to="/login-customer" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRouteCustomer;