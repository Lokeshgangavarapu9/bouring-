import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Sparkles, ArrowRight, AlertCircle } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup, isAuthenticated, loading: authLoading } = useAuth();

  const rawDest = (location.state as any)?.from?.pathname;
  const destination = rawDest === '/dashboard' ? '/profile' : rawDest || '/profile';

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Handle incoming OAuth redirect token or errors in URL query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const err = params.get('error');

    if (token) {
      localStorage.setItem('boring_auth_token', token);
      window.history.replaceState({}, document.title, window.location.pathname);
      window.location.href = destination;
      return;
    }

    if (err) {
      window.history.replaceState({}, document.title, window.location.pathname);
      if (err === 'google_not_configured') {
        setErrors({
          form: 'Google OAuth is not configured on this server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the server environment.',
        });
      } else {
        setErrors({ form: `Google sign-in error: ${decodeURIComponent(err)}` });
      }
    }
  }, [destination]);

  // If the user is already authenticated, redirect them to their destination
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, authLoading, destination, navigate]);

  const validate = (): boolean => {
    const errs: { [key: string]: string } = {};

    // Email validation
    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      errs.email = 'Please enter a valid email address (e.g. name@domain.com).';
    }

    // Password validation
    if (!password) {
      errs.password = 'Password is required.';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }

    if (mode === 'signup') {
      // Name validation
      if (!name.trim()) {
        errs.name = 'Full name is required.';
      } else if (name.trim().length < 2) {
        errs.name = 'Name must be at least 2 characters.';
      }

      // Username validation
      const userTrimmed = username.trim().toLowerCase();
      if (!userTrimmed) {
        errs.username = 'Username is required.';
      } else if (userTrimmed.length < 3) {
        errs.username = 'Username must be at least 3 characters.';
      } else if (!/^[a-z0-9_]+$/.test(userTrimmed)) {
        errs.username = 'Only letters, numbers, and underscores are allowed.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      if (mode === 'signin') {
        await login(email.trim(), password);
      } else {
        await signup(name.trim(), username.trim(), email.trim(), password);
      }
      navigate(destination, { replace: true });
    } catch (err: any) {
      setErrors({ form: err.message || 'Authentication failed. Please check credentials.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setErrors(prev => ({ ...prev, form: '' }));
    try {
      const config = await api.auth.getGoogleConfig();
      if (!config.configured) {
        setErrors({
          form: 'Google OAuth is not configured on this server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the server environment.',
        });
        setGoogleLoading(false);
        return;
      }
      window.location.href = '/api/auth/google';
    } catch (err: any) {
      setErrors({ form: err.message || 'Unable to connect to Google OAuth service.' });
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-indigo-200/30 to-violet-200/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md space-y-7 relative z-10">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-2xl font-light tracking-tight text-slate-900">
            {mode === 'signin' ? 'Sign in to Boring' : 'Create your Boring account'}
          </h2>
          <p className="mt-1.5 text-xs text-slate-500">
            Explore your social relationships as an interactive 3D molecular structure
          </p>
        </div>

        {/* Form Container */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-lg">
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrors({});
              }}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                mode === 'signin' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrors({});
              }}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                mode === 'signup' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {mode === 'signup' && (
              <>
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={name}
                      onChange={e => {
                        setName(e.target.value);
                        if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                      }}
                      placeholder="e.g. Maya Chen"
                      className={`w-full rounded-xl border bg-white/80 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                        errors.name
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                          : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500'
                      }`}
                    />
                  </div>
                  {errors.name && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-600">
                      <AlertCircle className="h-3 w-3" />
                      <span>{errors.name}</span>
                    </p>
                  )}
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Username</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={e => {
                        setUsername(e.target.value);
                        if (errors.username) setErrors(prev => ({ ...prev, username: '' }));
                      }}
                      placeholder="e.g. mayac"
                      className={`w-full rounded-xl border bg-white/80 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                        errors.username
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                          : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500'
                      }`}
                    />
                  </div>
                  {errors.username && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-600">
                      <AlertCircle className="h-3 w-3" />
                      <span>{errors.username}</span>
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                  }}
                  placeholder="you@example.com"
                  className={`w-full rounded-xl border bg-white/80 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                    errors.email
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-600">
                  <AlertCircle className="h-3 w-3" />
                  <span>{errors.email}</span>
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                  }}
                  placeholder="At least 6 characters"
                  className={`w-full rounded-xl border bg-white/80 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                    errors.password
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                />
              </div>
              {errors.password && (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-600">
                  <AlertCircle className="h-3 w-3" />
                  <span>{errors.password}</span>
                </p>
              )}
            </div>

            {errors.form && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errors.form}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : mode === 'signin' ? 'Sign In →' : 'Create Account →'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            {/* Modern Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                <span className="bg-white px-3 text-slate-400 font-medium">or</span>
              </div>
            </div>

            {/* Continue with Google Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
              className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl border border-slate-200/90 bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer disabled:opacity-50"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Subtle Floating Action Element on Login Page */}
      <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-40">
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setErrors({});
          }}
          className="group inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/90 pl-3.5 pr-4 py-2 text-xs font-semibold text-white shadow-xl backdrop-blur-md hover:bg-slate-900 hover:scale-105 active:scale-95 transition-all"
          aria-label={mode === 'signin' ? 'Switch to Get started' : 'Switch to Log in'}
        >
          <span className="text-indigo-400 font-bold text-xs">✦</span>
          <span>{mode === 'signin' ? 'Get started →' : 'Log in →'}</span>
        </button>
      </div>
    </div>
  );
};
