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

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

export const api = {
  auth: {
    signup: (name: string, username: string, email: string, password?: string) =>
      request<{ user: any; token: string }>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, username, email, password }),
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
