import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../services/api';

export const registerUserCustomer = createAsyncThunk(
  'userCustomer/register',
  async (userData, { rejectWithValue }) => {
    try {
      const { data } = await API.post('/auth-customer/register', userData);
      localStorage.setItem('token', data.token);
      localStorage.setItem('userCustomer', JSON.stringify(data));
      return data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const loginUserCustomer = createAsyncThunk(
  'userCustomer/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const { data } = await API.post('/auth-customer/login', credentials);
      localStorage.setItem('token', data.token);
      localStorage.setItem('userCustomer', JSON.stringify(data));
      return data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const forgotPasswordCustomer = createAsyncThunk(
  'userCustomer/forgotPassword',
  async (email, { rejectWithValue }) => {
    try {
      const { data } = await API.post('/auth-customer/forgot-password', { email });
      return data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const resetPasswordCustomer = createAsyncThunk(
  'userCustomer/resetPassword',
  async (resetData, { rejectWithValue }) => {
    try {
      const { data } = await API.post('/auth-customer/reset-password', resetData);
      return data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const getProfileCustomer = createAsyncThunk(
  'userCustomer/getProfile',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await API.get('/auth-customer/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const userCustomerSlice = createSlice({
  name: 'userCustomer',
  initialState: {
    userInfo: localStorage.getItem('userCustomer') 
      ? JSON.parse(localStorage.getItem('userCustomer'))
      : null,
    loading: false,
    error: null,
    success: false
  },
  reducers: {
    logoutCustomer: (state) => {
      localStorage.removeItem('token');
      localStorage.removeItem('userCustomer');
      state.userInfo = null;
      state.loading = false;
      state.error = null;
    },
    clearErrorCustomer: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(registerUserCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUserCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.userInfo = action.payload;
        state.success = true;
      })
      .addCase(registerUserCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Registration failed';
      })
      // Login
      .addCase(loginUserCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUserCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.userInfo = action.payload;
        state.success = true;
      })
      .addCase(loginUserCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Login failed';
      })
      // Forgot Password
      .addCase(forgotPasswordCustomer.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(forgotPasswordCustomer.rejected, (state, action) => {
        state.error = action.payload?.message;
      })
      // Get Profile
      .addCase(getProfileCustomer.fulfilled, (state, action) => {
        state.userInfo = { ...state.userInfo, ...action.payload };
      });
  }
});

export const { logoutCustomer, clearErrorCustomer } = userCustomerSlice.actions;
export default userCustomerSlice.reducer;