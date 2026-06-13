import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, Mail, Lock, Eye, EyeOff, AlertCircle, UserPlus, LogIn } from 'lucide-react';

export default function AuthModal() {
  const { showAuthModal, closeAuthModal, signIn, signUp } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  if (!showAuthModal) return null;

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setShowPassword(false);
    setRegisterSuccess(false);
  };

  const switchTab = (t: 'login' | 'register') => {
    resetForm();
    setTab(t);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) setError(err);
    else resetForm();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password || !confirmPassword) { setError('Please fill in all fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const { error: err } = await signUp(email, password);
    setLoading(false);
    if (err) setError(err);
    else setRegisterSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#161c23]/60 backdrop-blur-sm" onClick={closeAuthModal} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-[#c3c6d7] animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#c3c6d7] bg-[#f8f9ff]/50 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-gray-900">
            {tab === 'login' ? 'Sign In' : 'Create Account'}
          </h3>
          <button
            onClick={closeAuthModal}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#c3c6d7]">
          <button
            onClick={() => switchTab('login')}
            className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              tab === 'login'
                ? 'text-[#003da6] border-[#003da6] bg-blue-50/20'
                : 'text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-50/50'
            }`}
          >
            <LogIn className="h-3.5 w-3.5" />
            Sign In
          </button>
          <button
            onClick={() => switchTab('register')}
            className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              tab === 'register'
                ? 'text-[#003da6] border-[#003da6] bg-blue-50/20'
                : 'text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-50/50'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Register
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {registerSuccess ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-200">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="text-sm font-bold text-gray-900 mb-2">Check Your Email</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                We sent a confirmation link to <span className="font-bold text-gray-900">{email}</span>.
                Please verify your email before signing in.
              </p>
              <button
                onClick={() => switchTab('login')}
                className="mt-4 px-6 py-2 bg-[#003da6] text-white rounded-lg text-xs font-bold hover:bg-[#0052d9] transition-all"
              >
                Go to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={tab === 'login' ? handleLogin : handleRegister} className="space-y-4">
              {/* Email */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs border border-[#c3c6d7] bg-[#f8f9ff] rounded-lg outline-none focus:border-[#003da6] focus:ring-1 focus:ring-[#003da6]/20 transition-all"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 text-xs border border-[#c3c6d7] bg-[#f8f9ff] rounded-lg outline-none focus:border-[#003da6] focus:ring-1 focus:ring-[#003da6]/20 transition-all"
                    placeholder={tab === 'register' ? 'Min 6 characters' : 'Enter password'}
                    required
                    autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (register only) */}
              {tab === 'register' && (
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-xs border border-[#c3c6d7] bg-[#f8f9ff] rounded-lg outline-none focus:border-[#003da6] focus:ring-1 focus:ring-[#003da6]/20 transition-all"
                      placeholder="Re-enter password"
                      required
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#003da6] hover:bg-[#0052d9] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-lg text-xs tracking-wider uppercase shadow-sm hover:shadow active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="animate-pulse">Processing...</span>
                ) : tab === 'login' ? (
                  <><LogIn className="h-3.5 w-3.5" /> Sign In</>
                ) : (
                  <><UserPlus className="h-3.5 w-3.5" /> Create Account</>
                )}
              </button>

              {/* Switch prompt */}
              <p className="text-center text-[11px] text-gray-500 mt-2">
                {tab === 'login' ? (
                  <>Don't have an account? <button type="button" onClick={() => switchTab('register')} className="text-[#003da6] font-bold hover:underline">Register</button></>
                ) : (
                  <>Already have an account? <button type="button" onClick={() => switchTab('login')} className="text-[#003da6] font-bold hover:underline">Sign In</button></>
                )}
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
