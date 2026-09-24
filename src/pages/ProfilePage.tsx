import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import { SocialProfile } from '../types';
import { 
  Globe, 
  Github, 
  Linkedin, 
  Edit3, 
  Save, 
  Plus, 
  AlertCircle,
  Users, 
  UserCheck, 
  UserPlus, 
  X,
  Camera,
  Trash2,
  Sparkles,
  ExternalLink,
  Lock
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { currentUser, updateProfile } = useAuth();
  const { 
    users, 
    connections, 
    getAcceptedConnections, 
    getUserSocialProfiles, 
    addSocialProfile,
    removeSocialProfile 
  } = useNetwork();

  // Edit Profile form state
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [gender, setGender] = useState(currentUser?.gender || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url || '');
  const [showcaseSuggestions, setShowcaseSuggestions] = useState<string[]>(
    currentUser?.showcase_suggestions || []
  );
  const [newShowcaseItem, setNewShowcaseItem] = useState('');
  const [editErrors, setEditErrors] = useState<{ [key: string]: string }>({});

  // Hidden file input ref for local photo upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add social link state
  const [showAddSocial, setShowAddSocial] = useState(false);
  const [socialPlatform, setSocialPlatform] = useState<SocialProfile['platform']>('instagram');
  const [socialUrl, setSocialUrl] = useState('');
  const [socialUsername, setSocialUsername] = useState('');
  const [socialError, setSocialError] = useState('');

  // Active Stat Drawer / Modal Tab: 'mutuals' | 'followers' | 'following' | null
  const [activeStatsTab, setActiveStatsTab] = useState<'mutuals' | 'followers' | 'following' | null>(null);

  if (!currentUser) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="glass-card rounded-3xl p-8 max-w-sm text-center border border-slate-200/80 shadow-lg">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">Authentication Required</h2>
          <p className="text-xs text-slate-500 mt-1 mb-5">Please log in to continue.</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
          >
            <span>Log In →</span>
          </Link>
        </div>
      </div>
    );
  }

  // 1. Mutuals: mutual accepted connections
  const acceptedConns = getAcceptedConnections(currentUser.id);
  const mutualUsers = acceptedConns.map(conn => {
    const otherId = conn.requester_id === currentUser.id ? conn.receiver_id : conn.requester_id;
    return users.find(u => u.id === otherId);
  }).filter((u): u is typeof users[0] => !!u);

  // 2. Followers: users who sent incoming connection requests or are connected
  const followerUserIds = new Set<string>();
  connections.forEach(c => {
    if (c.receiver_id === currentUser.id && (c.status === 'ACCEPTED' || c.status === 'PENDING')) {
      followerUserIds.add(c.requester_id);
    }
  });
  const followerUsers = users.filter(u => followerUserIds.has(u.id));

  // 3. Following: users whom currentUser reached out to or are accepted
  const followingUserIds = new Set<string>();
  connections.forEach(c => {
    if (c.requester_id === currentUser.id && (c.status === 'ACCEPTED' || c.status === 'PENDING')) {
      followingUserIds.add(c.receiver_id);
    }
  });
  const followingUsers = users.filter(u => followingUserIds.has(u.id));

  const socialProfiles = getUserSocialProfiles(currentUser.id);

  // Handle local image file picker
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setEditErrors(prev => ({ ...prev, avatar: 'Image must be under 5MB.' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setAvatarUrl(result);
        if (editErrors.avatar) {
          setEditErrors(prev => ({ ...prev, avatar: '' }));
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Validate & Save Profile Edit
  const handleSaveProfile = () => {
    const errs: { [key: string]: string } = {};
    if (!name.trim()) {
      errs.name = 'Full name is required.';
    } else if (name.trim().length < 2) {
      errs.name = 'Name must be at least 2 characters.';
    }

    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      return;
    }

    setEditErrors({});
    updateProfile({ 
      name: name.trim(), 
      bio: bio.trim(), 
      gender: gender.trim(),
      avatar_url: avatarUrl.trim() || currentUser.avatar_url,
      showcase_suggestions: showcaseSuggestions
    });
    setIsEditing(false);
  };

  // Add showcase suggestion tag
  const handleAddShowcaseItem = () => {
    const trimmed = newShowcaseItem.trim();
    if (!trimmed) return;
    if (!showcaseSuggestions.includes(trimmed)) {
      setShowcaseSuggestions(prev => [...prev, trimmed]);
    }
    setNewShowcaseItem('');
  };

  const handleRemoveShowcaseItem = (itemToRemove: string) => {
    setShowcaseSuggestions(prev => prev.filter(item => item !== itemToRemove));
  };

  // Add Social Profile
  const handleAddSocial = (e: React.FormEvent) => {
    e.preventDefault();
    setSocialError('');

    const urlTrimmed = socialUrl.trim();
    const handleTrimmed = socialUsername.trim();

    if (!handleTrimmed) {
      setSocialError('Display handle is required.');
      return;
    }

    if (!/^https?:\/\/[^\s$.?#].[^\s]*$/i.test(urlTrimmed)) {
      setSocialError('Profile URL must start with http:// or https://');
      return;
    }

    addSocialProfile(socialPlatform, urlTrimmed, handleTrimmed);
    setSocialUrl('');
    setSocialUsername('');
    setShowAddSocial(false);
  };

  // Render platform icon (supporting Instagram, YouTube, LinkedIn, GitHub, X, Facebook, Other)
  const renderPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
          </svg>
        );
      case 'youtube':
        return (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
            <polygon points="10 15 15 12 10 9 10 15" />
          </svg>
        );
      case 'linkedin':
        return <Linkedin className="h-4 w-4" />;
      case 'github':
        return <Github className="h-4 w-4" />;
      case 'facebook':
        return (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
          </svg>
        );
      case 'x':
        return (
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        );
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const getPlatformLabel = (platform: string) => {
    switch (platform) {
      case 'instagram': return 'Instagram';
      case 'linkedin': return 'LinkedIn';
      case 'youtube': return 'YouTube';
      case 'github': return 'GitHub';
      case 'x': return 'X';
      case 'facebook': return 'Facebook';
      case 'scholar': return 'Scholar';
      default: return 'Website / Other';
    }
  };

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-8">
      {/* 1. Profile Header Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <img
                src={currentUser.avatar_url}
                alt={currentUser.name}
                className="h-20 w-20 rounded-full object-cover ring-4 ring-white shadow-md shrink-0"
              />
              {isEditing && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-slate-900/60 text-white flex flex-col items-center justify-center opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
                  title="Change Photo"
                >
                  <Camera className="h-5 w-5 mb-0.5" />
                  <span className="text-[9px] font-semibold">Change</span>
                </button>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 leading-tight">
                  {currentUser.name}
                </h1>
                {currentUser.gender && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200/60">
                    {currentUser.gender}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-400 font-mono mt-0.5">
                @{currentUser.username}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsEditing(!isEditing);
              setName(currentUser.name);
              setBio(currentUser.bio);
              setGender(currentUser.gender || '');
              setAvatarUrl(currentUser.avatar_url);
              setShowcaseSuggestions(currentUser.showcase_suggestions || []);
              setEditErrors({});
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/90 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-white shadow-xs transition-all self-start sm:self-auto cursor-pointer"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
          </button>
        </div>

        {/* Edit Profile Form */}
        {isEditing ? (
          <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
            {/* Hidden Native File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoSelect}
              accept="image/*"
              className="hidden"
            />

            {/* Profile Photo Change Row */}
            <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50/80 border border-slate-200/60">
              <img
                src={avatarUrl || currentUser.avatar_url}
                alt="Selected Profile"
                className="h-14 w-14 rounded-full object-cover ring-2 ring-indigo-200 shadow-xs shrink-0"
              />
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-800">Profile Photo</p>
                <p className="text-[11px] text-slate-500">Pick an image file from your computer (JPG, PNG, GIF up to 5MB).</p>
                {editErrors.avatar && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-600">
                    <AlertCircle className="h-3 w-3" />
                    <span>{editErrors.avatar}</span>
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
              >
                <Camera className="h-3.5 w-3.5 text-indigo-600" />
                <span>Change Photo</span>
              </button>
            </div>

            {/* Name & Gender Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Display Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => {
                    setName(e.target.value);
                    if (editErrors.name) setEditErrors(prev => ({ ...prev, name: '' }));
                  }}
                  className={`w-full rounded-xl border bg-white/90 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 ${
                    editErrors.name
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                />
                {editErrors.name && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-600">
                    <AlertCircle className="h-3 w-3" />
                    <span>{editErrors.name}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Gender</label>
                <input
                  type="text"
                  placeholder="e.g. Non-binary, Female, Male"
                  value={gender}
                  onChange={e => setGender(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Bio Field */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Bio</label>
              <textarea
                rows={3}
                value={bio}
                onChange={e => setBio(e.target.value)}
                maxLength={300}
                placeholder="A short note about who you are..."
                className="w-full rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <p className="text-[10px] text-slate-400 text-right">{bio.length}/300</p>
            </div>

            {/* 7. Showcase Suggestions */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Showcase Suggestions
              </label>
              <p className="text-[11px] text-slate-500 mb-2.5">
                Highlight specific accounts, communities, or identities you want to showcase on your profile.
              </p>

              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="e.g. @lens/creative, substack.com/@alex, ethereum"
                  value={newShowcaseItem}
                  onChange={e => setNewShowcaseItem(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddShowcaseItem();
                    }
                  }}
                  className="flex-1 rounded-xl border border-slate-200 bg-white/90 px-3.5 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddShowcaseItem}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Add</span>
                </button>
              </div>

              {showcaseSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {showcaseSuggestions.map((item, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                    >
                      <Sparkles className="h-3 w-3 text-indigo-500" />
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveShowcaseItem(item)}
                        className="text-indigo-400 hover:text-indigo-700 rounded-full cursor-pointer"
                        title="Remove"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSaveProfile}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Submit Profile</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">About</h3>
            <p className="text-sm text-slate-700 leading-relaxed max-w-2xl">
              {currentUser.bio || 'No bio provided yet.'}
            </p>
          </div>
        )}
      </div>

      {/* 2. Exactly THREE Profile Stats: Mutuals, Followers, Following */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Mutuals Stat Card */}
        <button
          type="button"
          onClick={() => setActiveStatsTab(activeStatsTab === 'mutuals' ? null : 'mutuals')}
          className={`glass-panel rounded-2xl p-5 border text-left transition-all shadow-xs cursor-pointer group ${
            activeStatsTab === 'mutuals'
              ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/30'
              : 'border-slate-200/80 hover:border-indigo-300 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center transition-transform group-hover:scale-105">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Mutuals</p>
                <p className="text-xl font-bold text-slate-900">{mutualUsers.length}</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-indigo-600 group-hover:underline">
              {activeStatsTab === 'mutuals' ? 'Hide' : 'View'}
            </span>
          </div>
        </button>

        {/* Followers Stat Card */}
        <button
          type="button"
          onClick={() => setActiveStatsTab(activeStatsTab === 'followers' ? null : 'followers')}
          className={`glass-panel rounded-2xl p-5 border text-left transition-all shadow-xs cursor-pointer group ${
            activeStatsTab === 'followers'
              ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/30'
              : 'border-slate-200/80 hover:border-indigo-300 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center transition-transform group-hover:scale-105">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Followers</p>
                <p className="text-xl font-bold text-slate-900">{followerUsers.length}</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-indigo-600 group-hover:underline">
              {activeStatsTab === 'followers' ? 'Hide' : 'View'}
            </span>
          </div>
        </button>

        {/* Following Stat Card */}
        <button
          type="button"
          onClick={() => setActiveStatsTab(activeStatsTab === 'following' ? null : 'following')}
          className={`glass-panel rounded-2xl p-5 border text-left transition-all shadow-xs cursor-pointer group ${
            activeStatsTab === 'following'
              ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/30'
              : 'border-slate-200/80 hover:border-indigo-300 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center transition-transform group-hover:scale-105">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Following</p>
                <p className="text-xl font-bold text-slate-900">{followingUsers.length}</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-indigo-600 group-hover:underline">
              {activeStatsTab === 'following' ? 'Hide' : 'View'}
            </span>
          </div>
        </button>
      </div>

      {/* 3. Functional Details List for Mutuals / Followers / Following */}
      {activeStatsTab && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 capitalize">
                {activeStatsTab === 'mutuals' && 'Mutual Connections'}
                {activeStatsTab === 'followers' && 'Followers'}
                {activeStatsTab === 'following' && 'Following'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeStatsTab === 'mutuals' && 'People with two-way accepted relationships with you'}
                {activeStatsTab === 'followers' && 'People who follow or have reached out to you'}
                {activeStatsTab === 'following' && 'People you follow or are connected with'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveStatsTab(null)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {(() => {
            const list = activeStatsTab === 'mutuals' 
              ? mutualUsers 
              : activeStatsTab === 'followers' 
              ? followerUsers 
              : followingUsers;

            if (list.length === 0) {
              return (
                <div className="py-8 text-center text-xs text-slate-400">
                  No {activeStatsTab} found yet.
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {list.map(u => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-3 rounded-2xl border border-slate-200/70 bg-white/70 hover:bg-white transition-all shadow-xs"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <img
                        src={u.avatar_url}
                        alt={u.name}
                        className="h-10 w-10 rounded-full object-cover ring-2 ring-indigo-100 shrink-0"
                      />
                      <div className="truncate">
                        <p className="text-xs font-semibold text-slate-900 truncate">{u.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono truncate">@{u.username}</p>
                      </div>
                    </div>

                    <Link
                      to={`/3d-lab?select=${u.id}`}
                      className="text-[11px] font-medium text-indigo-600 hover:underline shrink-0"
                    >
                      3D Node
                    </Link>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* 8. Social Profiles Section */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Social Profiles</h3>
            <p className="text-xs text-slate-400 mt-0.5">Verified public accounts and professional channels</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddSocial(!showAddSocial)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-indigo-600" />
            <span>Add Social Network</span>
          </button>
        </div>

        {/* Add Social Form */}
        {showAddSocial && (
          <form onSubmit={handleAddSocial} className="mb-6 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Platform</label>
                <select
                  value={socialPlatform}
                  onChange={e => setSocialPlatform(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none"
                >
                  <option value="instagram">Instagram</option>
                  <option value="github">GitHub</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="youtube">YouTube</option>
                  <option value="x">X (Twitter)</option>
                  <option value="facebook">Facebook</option>
                  <option value="website">Personal Website / Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Display Handle / Username</label>
                <input
                  type="text"
                  placeholder="e.g. @username"
                  value={socialUsername}
                  onChange={e => setSocialUsername(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Profile URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={socialUrl}
                  onChange={e => setSocialUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            {socialError && (
              <p className="text-[11px] text-rose-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span>{socialError}</span>
              </p>
            )}

            <div className="flex items-center gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowAddSocial(false)}
                className="px-3 py-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
              >
                Add Link
              </button>
            </div>
          </form>
        )}

        {/* Existing Social Profiles List */}
        {socialProfiles.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No social profiles linked yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {socialProfiles.map(sp => (
              <div
                key={sp.id}
                className="relative flex items-center justify-between p-3 rounded-2xl border border-slate-200/70 bg-white/70 hover:bg-white hover:border-indigo-200 hover:shadow-xs transition-all group"
              >
                <a
                  href={sp.profile_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 truncate flex-1"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shrink-0 transition-transform group-hover:scale-105">
                    {renderPlatformIcon(sp.platform)}
                  </div>
                  <div className="truncate">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {getPlatformLabel(sp.platform)}
                    </p>
                    <p className="text-xs font-medium text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                      {sp.display_username}
                    </p>
                  </div>
                </a>

                <div className="flex items-center gap-1 pl-2">
                  <a
                    href={sp.profile_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                    title="Open link"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <button
                    type="button"
                    onClick={() => removeSocialProfile(sp.id)}
                    className="p-1 text-slate-300 hover:text-rose-500 rounded transition-colors cursor-pointer"
                    title="Remove social profile"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 7b. Showcase Suggestions Display on Profile */}
      {currentUser.showcase_suggestions && currentUser.showcase_suggestions.length > 0 && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Showcase Suggestions</h3>
              <p className="text-xs text-slate-400 mt-0.5">Showcased accounts, communities, and identities</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsEditing(true);
                setName(currentUser.name);
                setBio(currentUser.bio);
                setGender(currentUser.gender || '');
                setAvatarUrl(currentUser.avatar_url);
                setShowcaseSuggestions(currentUser.showcase_suggestions || []);
              }}
              className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
            >
              Edit
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {currentUser.showcase_suggestions.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-50/80 text-indigo-700 border border-indigo-100 shadow-2xs"
              >
                <Sparkles className="h-3 w-3 text-indigo-500" />
                <span>{item}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
