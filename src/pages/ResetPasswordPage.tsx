import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Sparkles, AlertCircle, CheckCircle2, Lock } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Parse recovery token from URL hash or query params
  useEffect(() => {
    // 1. Check URL hash (Supabase default format: #access_token=...&type=recovery)
    const hash = window.location.hash.substring(1);
    if (hash) {
      const hashParams = new URLSearchParams(hash);
      const token = hashParams.get('access_token') || hashParams.get('token');
      if (token) {
        setAccessToken(token);
        return;
      }
    }

    // 2. Check query params (e.g. ?code=... or ?token=...)
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code') || searchParams.get('token') || searchParams.get('access_token');
    if (code) {
      setAccessToken(code);
    }
  }, []);

  const validate = (): boolean => {
    const errs: { [key: string]: string } = {};

    if (!password) {
      errs.password = 'New password is required.';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }

    if (!confirmPassword) {
      errs.confirmPassword = 'Confirm your new password.';
    } else if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});

    try {
      await api.auth.resetPassword(password, confirmPassword, accessToken || undefined);
      setSuccess(true);
    } catch (err: any) {
      setErrors({
        form: err.message || 'Unable to update password. Your reset link may have expired or is invalid.',
      });
    } finally {
      setLoading(false);
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
            Create new password
          </h2>
          <p className="mt-1.5 text-xs text-slate-500">
            Enter and confirm your new secure password below
          </p>
        </div>

        {/* Card Container */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-lg">
          {success ? (
            <div className="text-center py-4 space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Password Updated</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Your password has been securely updated. You can now sign in to your Boring account.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/auth', { replace: true })}
                className="w-full mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <span>Sign In to Boring →</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* New Password */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">New Password</label>
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

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: '' }));
                    }}
                    placeholder="Re-enter your new password"
                    className={`w-full rounded-xl border bg-white/80 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                      errors.confirmPassword
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                        : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500'
                    }`}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-600">
                    <AlertCircle className="h-3 w-3" />
                    <span>{errors.confirmPassword}</span>
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
                <Lock className="h-4 w-4" />
                <span>{loading ? 'Updating Password...' : 'Update Password →'}</span>
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/auth"
                  className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Return to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
