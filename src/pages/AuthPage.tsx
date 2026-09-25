import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Sparkles, ArrowRight, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { DatePicker } from '../components/common/DatePicker';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup, isAuthenticated, loading: authLoading, setAuthSession } = useAuth();

  const rawDest = (location.state as any)?.from?.pathname;
  const destination = rawDest === '/dashboard' ? '/profile' : rawDest || '/profile';

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  
  // Two-step recovery state
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // If the user is already authenticated, redirect them to their destination
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, authLoading, destination, navigate]);

  const isDobValid = (dob: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return false;
    const [y, m, d] = dob.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (isNaN(date.getTime()) || date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
      return false;
    }
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return y >= 1900 && date <= today;
  };

  const validate = (): boolean => {
    const errs: { [key: string]: string } = {};

    // In recovery step 2, email and DOB are already verified
    if (mode === 'forgot' && recoveryStep === 2) {
      if (!newPassword) {
        errs.newPassword = 'New password is required.';
      } else if (newPassword.length < 6) {
        errs.newPassword = 'Password must be at least 6 characters.';
      }

      if (!confirmPassword) {
        errs.confirmPassword = 'Confirm your new password.';
      } else if (newPassword !== confirmPassword) {
        errs.confirmPassword = 'Passwords do not match.';
      }

      setErrors(errs);
      return Object.keys(errs).length === 0;
    }

    // Email validation
    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      errs.email = 'Please enter a valid email address (e.g. name@domain.com).';
    }

    // Password validation (only for signin/signup)
    if (mode === 'signin' || mode === 'signup') {
      if (!password) {
        errs.password = 'Password is required.';
      } else if (password.length < 6) {
        errs.password = 'Password must be at least 6 characters.';
      }
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

      // Date of Birth validation
      if (!dateOfBirth) {
        errs.dateOfBirth = 'Date of birth is required.';
      } else if (!isDobValid(dateOfBirth)) {
        errs.dateOfBirth = 'Please select a valid date of birth between 1900 and today.';
      }
    }

    if (mode === 'forgot' && recoveryStep === 1) {
      if (!dateOfBirth) {
        errs.dateOfBirth = 'Date of birth is required.';
      } else if (!isDobValid(dateOfBirth)) {
        errs.dateOfBirth = 'Please select a valid date of birth between 1900 and today.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setSuccessMessage('');

    try {
      if (mode === 'signin') {
        await login(email.trim(), password);
        navigate(destination, { replace: true });
      } else if (mode === 'signup') {
        await signup(name.trim(), username.trim(), email.trim(), password, dateOfBirth);
        navigate(destination, { replace: true });
      } else if (mode === 'forgot') {
        if (recoveryStep === 1) {
          const res = await api.auth.forgotPassword(email.trim(), dateOfBirth);
          if (res.resetToken) {
            setResetToken(res.resetToken);
            setRecoveryStep(2);
            setSuccessMessage(res.message || 'Recovery information verified. Please create your new password.');
          } else {
            setSuccessMessage(res.message || 'If the information matches our records, you will be able to reset your password.');
          }
        } else if (recoveryStep === 2) {
          if (!resetToken) {
            throw new Error('Recovery session has expired. Please verify your information again.');
          }
          const res = await api.auth.resetPassword(newPassword, confirmPassword, resetToken);
          if (res.token && res.user) {
            setAuthSession(res.token, res.user);
            navigate(destination, { replace: true });
          } else {
            setSuccessMessage('Your password has been securely updated. You can now sign in.');
            setMode('signin');
            setRecoveryStep(1);
            setPassword('');
          }
        }
      }
    } catch (err: any) {
      setErrors({ form: err.message || 'Authentication request failed. Please check your information.' });
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
            {mode === 'signin' && 'Sign in to Boring'}
            {mode === 'signup' && 'Create your Boring account'}
            {mode === 'forgot' && (recoveryStep === 1 ? 'Forgot your password?' : 'Create New Password')}
          </h2>
          <p className="mt-1.5 text-xs text-slate-500">
            {mode === 'forgot'
              ? (recoveryStep === 1
                  ? 'Enter your email address and date of birth to verify your account.'
                  : 'Enter and confirm your new secure password.')
              : 'Explore your social relationships as an interactive 3D molecular structure'}
          </p>
        </div>

        {/* Form Container */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-lg">
          {mode !== 'forgot' ? (
            <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setRecoveryStep(1);
                  setErrors({});
                  setSuccessMessage('');
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
                  setRecoveryStep(1);
                  setErrors({});
                  setSuccessMessage('');
                }}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                  mode === 'signup' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign Up
              </button>
            </div>
          ) : (
            <div className="mb-6">
              <button
                type="button"
                onClick={() => {
                  if (recoveryStep === 2) {
                    setRecoveryStep(1);
                  } else {
                    setMode('signin');
                  }
                  setErrors({});
                  setSuccessMessage('');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{recoveryStep === 2 ? 'Back to Verification' : 'Back to Sign In'}</span>
              </button>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* SIGN UP: Name & Username */}
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

            {/* Email (Signin, Signup, and Recovery Step 1) */}
            {(mode !== 'forgot' || recoveryStep === 1) && (
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
            )}

            {/* Password (signin and signup only) */}
            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700">Password</label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setRecoveryStep(1);
                        setErrors({});
                        setSuccessMessage('');
                      }}
                      className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
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
            )}

            {/* Date of Birth: naturally below password on signup */}
            {mode === 'signup' && (
              <DatePicker
                value={dateOfBirth}
                onChange={val => {
                  setDateOfBirth(val);
                  if (errors.dateOfBirth) setErrors(prev => ({ ...prev, dateOfBirth: '' }));
                }}
                label="Date of Birth"
                placeholder="Select your date of birth"
                error={errors.dateOfBirth}
                helperText="Used for secure account recovery. Never shared publicly."
              />
            )}

            {/* Recovery Step 1: Date of Birth */}
            {mode === 'forgot' && recoveryStep === 1 && (
              <DatePicker
                value={dateOfBirth}
                onChange={val => {
                  setDateOfBirth(val);
                  if (errors.dateOfBirth) setErrors(prev => ({ ...prev, dateOfBirth: '' }));
                }}
                label="Date of Birth"
                placeholder="Select your date of birth"
                error={errors.dateOfBirth}
                helperText="Enter the date of birth associated with your account"
              />
            )}

            {/* Recovery Step 2: New Password & Confirm New Password */}
            {mode === 'forgot' && recoveryStep === 2 && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => {
                        setNewPassword(e.target.value);
                        if (errors.newPassword) setErrors(prev => ({ ...prev, newPassword: '' }));
                      }}
                      placeholder="At least 6 characters"
                      className={`w-full rounded-xl border bg-white/80 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                        errors.newPassword
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                          : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500'
                      }`}
                    />
                  </div>
                  {errors.newPassword && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-600">
                      <AlertCircle className="h-3 w-3" />
                      <span>{errors.newPassword}</span>
                    </p>
                  )}
                </div>

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
              </>
            )}

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
              <span>
                {loading
                  ? 'Processing...'
                  : mode === 'signin'
                  ? 'Sign In →'
                  : mode === 'signup'
                  ? 'Create Account →'
                  : recoveryStep === 1
                  ? 'Verify Recovery Info →'
                  : 'Reset Password & Sign In →'}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Floating Action Switcher */}
      <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-40">
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setRecoveryStep(1);
            setErrors({});
            setSuccessMessage('');
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
