import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../services/api';

// Async Thunks
export const fetchCart = createAsyncThunk('cart/fetchCart', async (_, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      // Return local cart if no token
      const localCart = JSON.parse(localStorage.getItem('localCart') || '{"items":[],"totalQuantity":0,"totalAmount":0}');
      return localCart;
    }
    
    const { data } = await API.get('/cart');
    return data;
  } catch (error) {
    return rejectWithValue(error.response?.data || error.message);
  }
});

export const addToCartAPI = createAsyncThunk('cart/addToCart', async (productData, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      // Handle local cart for guest users
      const localCart = JSON.parse(localStorage.getItem('localCart') || '{"items":[],"totalQuantity":0,"totalAmount":0}');
      const existingItemIndex = localCart.items.findIndex(item => item.productId === productData.productId);
      
      if (existingItemIndex > -1) {
        localCart.items[existingItemIndex].quantity += productData.quantity || 1;
      } else {
        localCart.items.push({
          ...productData,
          quantity: productData.quantity || 1
        });
      }
      
      // Recalculate totals
      localCart.totalQuantity = localCart.items.reduce((sum, item) => sum + item.quantity, 0);
      localCart.totalAmount = localCart.items.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
      
      localStorage.setItem('localCart', JSON.stringify(localCart));
      return localCart;
    }
    
    const { data } = await API.post('/cart/add', productData);
    return data;
  } catch (error) {
    return rejectWithValue(error.response?.data || error.message);
  }
});

export const updateCartItemAPI = createAsyncThunk('cart/updateItem', async ({ productId, quantity }, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      // Handle local cart update for guest users
      const localCart = JSON.parse(localStorage.getItem('localCart') || '{"items":[],"totalQuantity":0,"totalAmount":0}');
      const itemIndex = localCart.items.findIndex(item => item.productId === productId);
      
      if (itemIndex > -1) {
        localCart.items[itemIndex].quantity = quantity;
        localCart.totalQuantity = localCart.items.reduce((sum, item) => sum + item.quantity, 0);
        localCart.totalAmount = localCart.items.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
        
        localStorage.setItem('localCart', JSON.stringify(localCart));
        return localCart;
      }
      throw new Error('Item not found in cart');
    }
    
    const { data } = await API.put(`/cart/update/${productId}`, { quantity });
    return data;
  } catch (error) {
    return rejectWithValue(error.response?.data || error.message);
  }
});

export const removeFromCartAPI = createAsyncThunk('cart/removeItem', async (productId, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      // Handle local cart remove for guest users
      const localCart = JSON.parse(localStorage.getItem('localCart') || '{"items":[],"totalQuantity":0,"totalAmount":0}');
      localCart.items = localCart.items.filter(item => item.productId !== productId);
      localCart.totalQuantity = localCart.items.reduce((sum, item) => sum + item.quantity, 0);
      localCart.totalAmount = localCart.items.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
      
      localStorage.setItem('localCart', JSON.stringify(localCart));
      return localCart;
    }
    
    const { data } = await API.delete(`/cart/remove/${productId}`);
    return data;
  } catch (error) {
    return rejectWithValue(error.response?.data || error.message);
  }
});

export const clearCartAPI = createAsyncThunk('cart/clearCart', async (_, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      // Clear local cart for guest users
      const emptyCart = { items: [], totalQuantity: 0, totalAmount: 0 };
      localStorage.setItem('localCart', JSON.stringify(emptyCart));
      return emptyCart;
    }
    
    const { data } = await API.delete('/cart/clear');
    return data;
  } catch (error) {
    return rejectWithValue(error.response?.data || error.message);
  }
});

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: [],
    totalQuantity: 0,
    totalAmount: 0,
    loading: false,
    error: null,
  },
  reducers: {
    // Local cart actions for immediate UI update
    addItemToCart(state, action) {
      const newItem = action.payload;
      const existingItem = state.items.find(item => item.productId === newItem.productId);
      
      if (!existingItem) {
        state.items.push({
          ...newItem,
          quantity: newItem.quantity || 1
        });
      } else {
        existingItem.quantity += newItem.quantity || 1;
      }
      
      state.totalQuantity = state.items.reduce((total, item) => total + item.quantity, 0);
      state.totalAmount = state.items.reduce((total, item) => total + (item.sellingPrice * item.quantity), 0);
    },
    
    removeItemFromCart(state, action) {
      const productId = action.payload;
      state.items = state.items.filter(item => item.productId !== productId);
      state.totalQuantity = state.items.reduce((total, item) => total + item.quantity, 0);
      state.totalAmount = state.items.reduce((total, item) => total + (item.sellingPrice * item.quantity), 0);
    },
    
    updateItemQuantity(state, action) {
      const { productId, quantity } = action.payload;
      const existingItem = state.items.find(item => item.productId === productId);
      
      if (existingItem) {
        existingItem.quantity = quantity;
        state.totalQuantity = state.items.reduce((total, item) => total + item.quantity, 0);
        state.totalAmount = state.items.reduce((total, item) => total + (item.sellingPrice * item.quantity), 0);
      }
    },
    
    clearCart(state) {
      state.items = [];
      state.totalQuantity = 0;
      state.totalAmount = 0;
    },
    
    setCartFromLocalStorage(state) {
      const localCart = JSON.parse(localStorage.getItem('localCart') || '{"items":[],"totalQuantity":0,"totalAmount":0}');
      state.items = localCart.items;
      state.totalQuantity = localCart.totalQuantity;
      state.totalAmount = localCart.totalAmount;
    },
    
    clearError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Cart
      .addCase(fetchCart.pending, (state) => { 
        state.loading = true; 
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items || [];
        state.totalQuantity = action.payload.totalQuantity || 0;
        state.totalAmount = action.payload.totalAmount || 0;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to fetch cart';
      })
      
      // Add to Cart
      .addCase(addToCartAPI.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addToCartAPI.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.totalQuantity = action.payload.totalQuantity;
        state.totalAmount = action.payload.totalAmount;
      })
      .addCase(addToCartAPI.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to add item to cart';
      })
      
      // Update Cart Item
      .addCase(updateCartItemAPI.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCartItemAPI.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.totalQuantity = action.payload.totalQuantity;
        state.totalAmount = action.payload.totalAmount;
      })
      .addCase(updateCartItemAPI.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to update item';
      })
      
      // Remove from Cart
      .addCase(removeFromCartAPI.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeFromCartAPI.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.totalQuantity = action.payload.totalQuantity;
        state.totalAmount = action.payload.totalAmount;
      })
      .addCase(removeFromCartAPI.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to remove item';
      })
      
      // Clear Cart
      .addCase(clearCartAPI.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(clearCartAPI.fulfilled, (state) => {
        state.loading = false;
        state.items = [];
        state.totalQuantity = 0;
        state.totalAmount = 0;
      })
      .addCase(clearCartAPI.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to clear cart';
      });
  }
});

export const { 
  addItemToCart, 
  removeItemFromCart, 
  updateItemQuantity, 
  clearCart, 
  setCartFromLocalStorage,
  clearError 
} = cartSlice.actions;

export default cartSlice.reducer;