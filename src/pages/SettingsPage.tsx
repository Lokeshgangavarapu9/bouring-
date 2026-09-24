import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Trash2, Eye, Database, Check } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { currentUser, logout, updatePrivacySettings } = useAuth();
  const [clearedNotice, setClearedNotice] = useState(false);

  const privacy = currentUser?.privacy_settings || {
    profileVisibility: 'PUBLIC',
    emailVisibility: 'CONNECTIONS_ONLY',
    socialLinksVisibility: 'PUBLIC',
  };

  const handleClearLocalData = () => {
    localStorage.removeItem('molecule_connections');
    localStorage.removeItem('molecule_social_profiles');
    localStorage.removeItem('molecule_current_user');
    setClearedNotice(true);
    setTimeout(() => {
      logout();
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-light text-slate-900">
          Account & <span className="font-semibold">Privacy Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Boring strictly respects user consent and transparent spatial relationship storage.
        </p>
      </div>

      <div className="space-y-6">
        {/* Privacy Principles Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Privacy & Consent Guarantees</h3>
              <p className="text-xs text-slate-400">Privacy & Security Standards</p>
            </div>
          </div>

          <ul className="space-y-2.5 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <span><strong>No account scraping:</strong> We never scrape private social networks or access third-party credentials.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <span><strong>Mutual agreement only:</strong> 3D graph bonds are only rendered when both participants explicitly accept the relationship.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <span><strong>Transparent representation:</strong> Spatial coordinates are mathematically computed locally with no hidden surveillance telemetry.</span>
            </li>
          </ul>
        </div>

        {/* Visibility Controls */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Eye className="h-4 w-4 text-indigo-500" />
            <span>Profile Visibility Controls</span>
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-800">Public Profile Visibility</p>
                <p className="text-[11px] text-slate-500">
                  {privacy.profileVisibility === 'PUBLIC'
                    ? 'Currently visible to all Boring visitors'
                    : 'Currently restricted to mutual accepted bonds only'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={privacy.profileVisibility === 'PUBLIC'}
                onChange={e =>
                  updatePrivacySettings({
                    profileVisibility: e.target.checked ? 'PUBLIC' : 'CONNECTIONS_ONLY',
                  })
                }
                className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <p className="text-xs font-semibold text-slate-800">Public Email Address</p>
                <p className="text-[11px] text-slate-500">
                  {privacy.emailVisibility === 'PUBLIC'
                    ? 'Email displayed publicly'
                    : 'Email restricted to accepted mutual bonds'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={privacy.emailVisibility === 'PUBLIC'}
                onChange={e =>
                  updatePrivacySettings({
                    emailVisibility: e.target.checked ? 'PUBLIC' : 'CONNECTIONS_ONLY',
                  })
                }
                className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <p className="text-xs font-semibold text-slate-800">Public Social Profile Links</p>
                <p className="text-[11px] text-slate-500">
                  {privacy.socialLinksVisibility === 'PUBLIC'
                    ? 'External links displayed publicly'
                    : 'External links restricted to accepted mutual bonds'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={privacy.socialLinksVisibility === 'PUBLIC'}
                onChange={e =>
                  updatePrivacySettings({
                    socialLinksVisibility: e.target.checked ? 'PUBLIC' : 'CONNECTIONS_ONLY',
                  })
                }
                className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Data Reset & Account Simulation */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-rose-100/80 bg-rose-50/20 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-rose-900">Reset Application Data</h3>
              <p className="text-xs text-rose-700/70">Restore default network state and local settings</p>
            </div>
          </div>

          <p className="text-xs text-slate-600 mb-4">
            Clears all cached network modifications, custom mock connections, and restores default profile data.
          </p>

          <button
            onClick={handleClearLocalData}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Reset Demo Data</span>
          </button>

          {clearedNotice && (
            <p className="mt-3 text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <Check className="h-3.5 w-3.5" />
              Reset complete! Reloading session...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
