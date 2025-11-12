// ForgetPassword.jsx
import React, { useState } from 'react';
import API from '../../services/api';

const ForgetPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    
    try {
      const response = await API.post('/auth/forget', { email });
      setMessage(response.data.message || 'OTP sent to your email!');
      setStep(2);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to send OTP. Please try again.';
      setError(errorMsg);
      console.error('Send OTP error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    
    try {
      const response = await API.post('/auth/verify-otp-reset', { 
        email, 
        otp, 
        newPassword 
      });
      setMessage(response.data.message || 'Password reset successful!');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Invalid OTP or request failed.';
      setError(errorMsg);
      console.error('Verify OTP error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setMessage('');
    setError('');
    
    try {
      const response = await API.post('/auth/forget', { email });
      setMessage('OTP resent successfully!');
    } catch (err) {
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      <div className="absolute inset-0 bg-black opacity-40"></div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          <div className="bg-white bg-opacity-10 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 border border-white border-opacity-20">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-white">Reset Password</h1>
              <p className="text-white/70 text-sm mt-2">
                {step === 1 && 'Enter your email to receive OTP'}
                {step === 2 && 'Enter the OTP and your new password'}
              </p>
            </div>

            {/* Success Message */}
            {message && (
              <div className="text-center p-3 rounded-lg mb-4 bg-green-500/20 border border-green-500/30 text-green-300">
                {message}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="text-center p-3 rounded-lg mb-4 bg-red-500/20 border border-red-500/30 text-red-300">
                {error}
              </div>
            )}

            {/* Step 1: Email */}
            {step === 1 && (
              <form onSubmit={handleSendOTP} className="space-y-5">
                <div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                    disabled={loading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              </form>
            )}

            {/* Step 2: OTP + New Password */}
            {step === 2 && (
              <form onSubmit={handleVerifyOTP} className="space-y-5">
                <div>
                  <input
                    type="text"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit OTP"
                    maxLength="6"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 text-center text-2xl tracking-widest focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                    disabled={loading}
                  />
                </div>
                <div>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New Password (min 6 characters)"
                    minLength="6"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                    disabled={loading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verifying...' : 'Reset Password'}
                </button>
                
                {/* Resend OTP */}
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="w-full py-2 text-purple-300 hover:text-purple-200 text-sm transition disabled:opacity-50"
                >
                  Didn't receive OTP? Resend
                </button>
              </form>
            )}

            <div className="mt-6 text-center">
              <a 
                href="/login" 
                className="text-purple-300 hover:text-purple-200 text-sm transition"
              >
                ← Back to Login
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgetPassword;