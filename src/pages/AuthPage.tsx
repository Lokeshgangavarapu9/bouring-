import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup } = useAuth();

  const rawDest = (location.state as any)?.from?.pathname;
  const destination = rawDest === '/dashboard' ? '/profile' : rawDest || '/profile';

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [authSuccess, setAuthSuccess] = useState(false);
  const [launchedUrl, setLaunchedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const launchAuthenticatedApp = (targetPath: string) => {
    const targetUrl = targetPath || '/profile';
    try {
      const newTab = window.open(targetUrl, '_blank');
      if (newTab && !newTab.closed && typeof newTab.closed !== 'undefined') {
        setAuthSuccess(true);
        setLaunchedUrl(targetUrl);
        try {
          window.close();
        } catch {}
      } else {
        navigate(targetUrl, { replace: true });
      }
    } catch {
      navigate(targetUrl, { replace: true });
    }
  };

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
      launchAuthenticatedApp(destination);
    } catch (err: any) {
      setErrors({ form: err.message || 'Authentication failed. Please check credentials.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-indigo-200/30 to-violet-200/20 rounded-full blur-[100px] pointer-events-none" />

      {authSuccess ? (
        <div className="w-full max-w-md space-y-7 relative z-10 text-center animate-in fade-in duration-200">
          <div className="glass-panel rounded-3xl p-8 border border-slate-200/80 shadow-xl space-y-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 text-white shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-light tracking-tight text-slate-900">
                Authenticated Successfully
              </h2>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Your authenticated Boring application has opened in a new tab.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-3">
              <a
                href={launchedUrl || '/profile'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer"
              >
                <span>Open Application (Profile) →</span>
                <ArrowRight className="h-4 w-4" />
              </a>

              <button
                type="button"
                onClick={() => navigate(destination, { replace: true })}
                className="text-xs text-slate-500 hover:text-slate-800 underline transition-colors cursor-pointer"
              >
                Or continue in this tab
              </button>
            </div>
          </div>
        </div>
      ) : (
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
          </form>
        </div>
      </div>
      )}

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
