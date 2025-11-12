import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../services/api';

export const registerUserCustomer = createAsyncThunk(
  'userCustomer/register',
  async (userData, { rejectWithValue }) => {
    try {
      const { data } = await API.post('/auth-customer/register', userData);
      
      console.log('✅ Register Response:', data);
      
      // Token save karo
      if (data.token) {
        localStorage.setItem('token', data.token);
        console.log('✅ Token saved in localStorage');
      }
      
      const userDataWithUsername = {
        ...data,
        username: data.name
      };
      
      localStorage.setItem('userCustomer', JSON.stringify(userDataWithUsername));
      return userDataWithUsername;
    } catch (error) {
      console.error('❌ Register Error:', error.response?.data);
      return rejectWithValue(error.response?.data || { message: 'Registration failed' });
    }
  }
);

export const loginUserCustomer = createAsyncThunk(
  'userCustomer/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const { data } = await API.post('/auth-customer/login', credentials);
      
      console.log('✅ Login Response:', data);
      console.log('✅ Token from response:', data.token);
      
      // Token save karo
      if (data.token) {
        localStorage.setItem('token', data.token);
        console.log('✅ Token saved in localStorage:', localStorage.getItem('token'));
      } else {
        console.error('❌ No token in response!');
      }
      
      const userDataWithUsername = {
        ...data,
        username: data.name
      };
      
      localStorage.setItem('userCustomer', JSON.stringify(userDataWithUsername));
      return userDataWithUsername;
    } catch (error) {
      console.error('❌ Login Error:', error.response?.data);
      return rejectWithValue(error.response?.data || { message: 'Login failed' });
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
      return rejectWithValue(error.response?.data || { message: 'Request failed' });
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
      return rejectWithValue(error.response?.data || { message: 'Reset failed' });
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
      return rejectWithValue(error.response?.data || { message: 'Failed to get profile' });
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
      .addCase(forgotPasswordCustomer.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(forgotPasswordCustomer.rejected, (state, action) => {
        state.error = action.payload?.message;
      })
      .addCase(getProfileCustomer.fulfilled, (state, action) => {
        state.userInfo = { ...state.userInfo, ...action.payload };
      });
  }
});

export const { logoutCustomer, clearErrorCustomer } = userCustomerSlice.actions;
export default userCustomerSlice.reducer;