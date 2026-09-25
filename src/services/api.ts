/**
 * Client API Client for Boring Backend
 * Interacts with the Node/Express backend at /api
 */

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('boring_auth_token');
  const savedUser = localStorage.getItem('molecule_current_user');
  let currentUserId: string | null = null;
  if (savedUser) {
    try {
      currentUserId = JSON.parse(savedUser).id;
    } catch {}
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (currentUserId) {
    headers['X-User-Id'] = currentUserId;
  }

  return headers;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (err: any) {
    throw new Error('Could not connect to Boring backend server. Please verify the backend is running on port 3001.');
  }

  const text = await response.text();
  let data: any = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(response.statusText || `Server returned error (${response.status})`);
    }
  }

  if (!response.ok) {
    throw new Error(data.error || data.message || `API request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  auth: {
    signup: (name: string, username: string, email: string, password?: string, dateOfBirth?: string) =>
      request<{ user: any; token: string }>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, username, email, password, dateOfBirth }),
      }),

    login: (emailOrUsername: string, password?: string) =>
      request<{ user: any; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ emailOrUsername, password }),
      }),

    logout: () =>
      request<{ success: boolean }>('/auth/logout', {
        method: 'POST',
      }),

    getMe: () =>
      request<{ user: any }>('/auth/me'),

    getUsers: () =>
      request<{ users: any[] }>('/auth/users'),

    switchUser: (userId: string) =>
      request<{ user: any }>('/auth/switch', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      }),

    getSupabaseConfig: () =>
      request<{ configured: boolean; supabaseUrl: string | null; anonKey: string | null }>('/auth/supabase-config'),

    forgotPassword: (email: string, dateOfBirth: string) =>
      request<{ success: boolean; resetToken: string; message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email, dateOfBirth }),
      }),

    resetPassword: (password: string, confirmPassword?: string, resetToken?: string) =>
      request<{ success: boolean; message: string; user?: any; token?: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ password, confirmPassword, resetToken }),
      }),
  },

  relationships: {
    list: () =>
      request<{ relationships: any[]; mutualPartners: string[] }>('/relationships'),

    sendRequest: (receiverId: string) =>
      request<{ relationship: any }>('/relationships/requests', {
        method: 'POST',
        body: JSON.stringify({ receiverId }),
      }),

    acceptRequest: (id: string) =>
      request<{ relationship: any; message: string; isMutual: boolean }>(`/relationships/${id}/accept`, {
        method: 'POST',
      }),

    rejectRequest: (id: string) =>
      request<{ relationship: any }>(`/relationships/${id}/reject`, {
        method: 'POST',
      }),

    cancelRequest: (id: string) =>
      request<{ relationship: any }>(`/relationships/${id}/cancel`, {
        method: 'POST',
      }),

    connectBack: (userId: string) =>
      request<{ mutual: boolean; reverseRelationship: any; mutualId: string }>(`/relationships/${userId}/connect-back`, {
        method: 'POST',
      }),

    disconnect: (userId: string) =>
      request<{ mutualBroken: boolean }>(`/relationships/${userId}`, {
        method: 'DELETE',
      }),
  },

  profile: {
    getUser: (userId: string) =>
      request<{ user: any }>(`/users/${userId}`),

    getSocialProfile: (userId: string) =>
      request<{
        user: any;
        isSelf: boolean;
        isMutual: boolean;
        canViewConnectedSection: boolean;
        socialProfiles: any[];
        email?: string;
        privacy: any;
      }>(`/users/${userId}/social-profile`),

    updateProfile: (data: any) =>
      request<{ user: any }>('/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    getPrivacy: () =>
      request<{ privacy: any }>('/profile/privacy'),

    updatePrivacy: (settings: any) =>
      request<{ privacy: any }>('/profile/privacy', {
        method: 'PUT',
        body: JSON.stringify(settings),
      }),

    addSocial: (platform: string, profile_url: string, display_username: string) =>
      request<{ socialProfile: any }>('/profile/socials', {
        method: 'POST',
        body: JSON.stringify({ platform, profile_url, display_username }),
      }),

    updateSocial: (profileId: string, data: { profile_url: string; display_username?: string; platform?: string }) =>
      request<{ socialProfile: any }>(`/profile/socials/${profileId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    classifySocial: (url: string, display_username?: string, platform?: string) =>
      request<{
        valid: boolean;
        error?: string;
        rawUrl: string;
        normalizedUrl: string;
        canonicalUrl: string;
        hostname: string;
        platform: string;
        platformDisplayName: string;
        iconId: string;
        displayHandle: string;
      }>('/profile/socials/classify', {
        method: 'POST',
        body: JSON.stringify({ url, display_username, platform }),
      }),

    removeSocial: (profileId: string) =>
      request<{ success: boolean }>(`/profile/socials/${profileId}`, {
        method: 'DELETE',
      }),
  },

  network: {
    getMe: () =>
      request<{
        stats: { mutualCount: number; followerCount: number; followingCount: number };
        mutualUsers: any[];
        followerUsers: any[];
        followingUsers: any[];
      }>('/network/me'),

    getNetwork: (userId: string) =>
      request<{
        hostUserId: string;
        metrics: any;
        structure: any;
        nodeCount: number;
        edgeCount: number;
      }>(`/network/${userId}`),

    getLayout: (userId: string) =>
      request<{
        hostUserId: string;
        graphVersion: number;
        algorithmVersion: string;
        structure: any;
        nodes: any[];
        bonds: any[];
        qualityMetrics: any;
        fromCache: boolean;
      }>(`/network/${userId}/layout`),
  },
};
