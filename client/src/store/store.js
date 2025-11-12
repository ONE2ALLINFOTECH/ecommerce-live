import { configureStore } from '@reduxjs/toolkit';
import cartReducer from './cartSlice';
import userCustomerReducer from './userCustomerSlice';

// Enhanced localStorage utility
export const loadState = () => {
  try {
    const serializedState = localStorage.getItem('reduxState');
    if (serializedState === null) {
      return undefined;
    }
    return JSON.parse(serializedState);
  } catch (err) {
    console.error('Error loading state from localStorage:', err);
    return undefined;
  }
};

export const saveState = (state) => {
  try {
    const serializedState = JSON.stringify({
      cart: state.cart,
      userCustomer: state.userCustomer
    });
    localStorage.setItem('reduxState', serializedState);
    
    // Also save local cart separately for guest users
    if (!state.userCustomer.userInfo) {
      localStorage.setItem('localCart', JSON.stringify(state.cart));
    }
  } catch (err) {
    console.error('Error saving state to localStorage:', err);
  }
};

const preloadedState = loadState();

const store = configureStore({
  reducer: {
    cart: cartReducer,
    userCustomer: userCustomerReducer,
  },
  preloadedState,
});

store.subscribe(() => {
  saveState(store.getState());
});

export default store;