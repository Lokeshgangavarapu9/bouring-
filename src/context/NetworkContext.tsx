import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Connection, SocialProfile } from '../types';
import { useAuth } from './AuthContext';
import { api } from '../services/api';

export interface NetworkStats {
  mutualCount: number;
  followerCount: number;
  followingCount: number;
}

interface NetworkContextType {
  users: User[];
  connections: Connection[];
  mutualPartners: string[];
  socialProfiles: SocialProfile[];
  selectedNodeId: string | null;
  networkStats: NetworkStats;
  loading: boolean;
  error: string | null;
  setSelectedNodeId: (id: string | null) => void;
  sendConnectionRequest: (targetUserId: string) => Promise<void>;
  acceptConnection: (connectionId: string) => Promise<void>;
  rejectConnection: (connectionId: string) => Promise<void>;
  cancelConnection: (connectionId: string) => Promise<void>;
  connectBack: (targetUserId: string) => Promise<void>;
  disconnectUser: (targetUserId: string) => Promise<void>;
  getConnectionBetween: (userA: string, userB: string) => Connection | undefined;
  getAcceptedConnections: (userId: string) => Connection[];
  isUserMutual: (targetUserId: string) => boolean;
  canConnectBack: (targetUserId: string) => boolean;
  getUserSocialProfiles: (userId: string) => SocialProfile[];
  addSocialProfile: (platform: SocialProfile['platform'], profile_url: string, display_username: string) => Promise<void>;
  updateSocialProfile: (profileId: string, profile_url: string, display_username?: string, platform?: string) => Promise<void>;
  removeSocialProfile: (profileId: string) => Promise<void>;
  refreshNetworkData: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [mutualPartners, setMutualPartners] = useState<string[]>([]);
  const [socialProfiles, setSocialProfiles] = useState<SocialProfile[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [networkStats, setNetworkStats] = useState<NetworkStats>({
    mutualCount: 0,
    followerCount: 0,
    followingCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshNetworkData = useCallback(async () => {
    if (!currentUser) {
      setUsers([]);
      setConnections([]);
      setMutualPartners([]);
      setSocialProfiles([]);
      setNetworkStats({ mutualCount: 0, followerCount: 0, followingCount: 0 });
      setError(null);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch Users directory from real backend
      const usersRes = await api.auth.getUsers();
      if (usersRes.users) {
        setUsers(usersRes.users);
      }

      // 2. Fetch Relationships & Mutual Partners from real backend
      const relRes = await api.relationships.list();
      if (relRes.relationships) {
        const mapped: Connection[] = relRes.relationships.map((r: any) => ({
          id: r.id,
          requester_id: r.requester_id,
          receiver_id: r.receiver_id,
          status: (r.status === 'REQUESTED' ? 'PENDING' : r.status) as Connection['status'],
          created_at: r.created_at,
          updated_at: r.updated_at,
        }));
        setConnections(mapped);
      }
      if (relRes.mutualPartners) {
        setMutualPartners(relRes.mutualPartners);
      }

      // 3. Fetch Network Stats from real backend
      const statsRes = await api.network.getMe();
      if (statsRes.stats) {
        setNetworkStats(statsRes.stats);
      }

      // 4. Fetch Current User Social Profiles from backend
      try {
        const profileRes = await api.profile.getSocialProfile(currentUser.id);
        if (profileRes.socialProfiles) {
          setSocialProfiles(profileRes.socialProfiles);
        }
      } catch {}

      setError(null);
    } catch (err: any) {
      setError(err.message || 'Unable to connect to Boring services.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    refreshNetworkData();
  }, [refreshNetworkData]);

  // Check if target user is a mutual connection with current user
  const isUserMutual = (targetUserId: string): boolean => {
    return mutualPartners.includes(targetUserId);
  };

  // Check if currentUser can "Connect Back" to targetUserId
  // Condition: targetUserId -> currentUser is ACCEPTED_ONE_WAY, but currentUser has not connected back
  const canConnectBack = (targetUserId: string): boolean => {
    if (!currentUser) return false;
    if (isUserMutual(targetUserId)) return false;

    // Incoming accepted request from target to current user
    const incoming = connections.find(
      c => c.requester_id === targetUserId && c.receiver_id === currentUser.id && (c.status === 'ACCEPTED_ONE_WAY' || c.status === 'ACCEPTED')
    );
    // Outgoing from current to target
    const outgoing = connections.find(
      c => c.requester_id === currentUser.id && c.receiver_id === targetUserId && (c.status === 'ACCEPTED_ONE_WAY' || c.status === 'ACCEPTED')
    );

    return Boolean(incoming && !outgoing);
  };

  const getConnectionBetween = (userA: string, userB: string): Connection | undefined => {
    return connections.find(
      c =>
        (c.requester_id === userA && c.receiver_id === userB) ||
        (c.requester_id === userB && c.receiver_id === userA)
    );
  };

  // Send request to real backend
  const sendConnectionRequest = async (targetUserId: string) => {
    if (!currentUser || currentUser.id === targetUserId) return;
    try {
      await api.relationships.sendRequest(targetUserId);
      await refreshNetworkData();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to send connection request');
    }
  };

  // Accept incoming request (Transitions to ACCEPTED_ONE_WAY per frozen rule)
  // Acceptance alone DOES NOT create mutuality
  const acceptConnection = async (connectionId: string) => {
    try {
      await api.relationships.acceptRequest(connectionId);
      await refreshNetworkData();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to accept connection request');
    }
  };

  // Connect Back: The second step that establishes mutuality and creates the 3D bond
  const connectBack = async (targetUserId: string) => {
    try {
      await api.relationships.connectBack(targetUserId);
      await refreshNetworkData();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to complete reciprocal connect back');
    }
  };

  // Disconnect: Breaks mutuality and removes bond
  const disconnectUser = async (targetUserId: string) => {
    try {
      await api.relationships.disconnect(targetUserId);
      await refreshNetworkData();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to disconnect user');
    }
  };

  const rejectConnection = async (connectionId: string) => {
    try {
      await api.relationships.rejectRequest(connectionId);
      await refreshNetworkData();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to reject connection request');
    }
  };

  const cancelConnection = async (connectionId: string) => {
    try {
      await api.relationships.cancelRequest(connectionId);
      await refreshNetworkData();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to cancel connection request');
    }
  };

  // Molecular bonds only exist for mutual relationships!
  const getAcceptedConnections = (userId: string): Connection[] => {
    return connections.filter(c => {
      const otherId = c.requester_id === userId ? c.receiver_id : c.requester_id;
      if (userId === currentUser?.id) {
        return mutualPartners.includes(otherId) && (c.status === 'ACCEPTED' || c.status === 'ACCEPTED_ONE_WAY');
      }
      return (c.status === 'ACCEPTED' || c.status === 'ACCEPTED_ONE_WAY') && (c.requester_id === userId || c.receiver_id === userId);
    });
  };

  const getUserSocialProfiles = (userId: string): SocialProfile[] => {
    return socialProfiles.filter(p => p.user_id === userId);
  };

  const addSocialProfile = async (platform: SocialProfile['platform'], profile_url: string, display_username: string) => {
    if (!currentUser) return;
    try {
      const res = await api.profile.addSocial(platform, profile_url, display_username);
      if (res.socialProfile) {
        setSocialProfiles(prev => [...prev, res.socialProfile]);
      }
    } catch (err: any) {
      throw new Error(err.message || 'Failed to add social profile');
    }
  };

  const updateSocialProfile = async (
    profileId: string,
    profile_url: string,
    display_username?: string,
    platform?: string
  ) => {
    try {
      const res = await api.profile.updateSocial(profileId, { profile_url, display_username, platform });
      if (res.socialProfile) {
        setSocialProfiles(prev => prev.map(p => (p.id === profileId ? res.socialProfile : p)));
      }
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update social profile');
    }
  };

  const removeSocialProfile = async (profileId: string) => {
    try {
      await api.profile.removeSocial(profileId);
      setSocialProfiles(prev => prev.filter(p => p.id !== profileId));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to remove social profile');
    }
  };

  return (
    <NetworkContext.Provider
      value={{
        users,
        connections,
        mutualPartners,
        socialProfiles,
        selectedNodeId,
        networkStats,
        loading,
        error,
        setSelectedNodeId,
        sendConnectionRequest,
        acceptConnection,
        rejectConnection,
        cancelConnection,
        connectBack,
        disconnectUser,
        getConnectionBetween,
        getAcceptedConnections,
        isUserMutual,
        canConnectBack,
        getUserSocialProfiles,
        addSocialProfile,
        updateSocialProfile,
        removeSocialProfile,
        refreshNetworkData,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};
