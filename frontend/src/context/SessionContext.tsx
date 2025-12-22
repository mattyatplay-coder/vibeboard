'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';

interface Session {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count?: {
    generations: number;
  };
}

interface SessionContextType {
  sessions: Session[];
  selectedSessionId: string | null;
  isLoading: boolean;
  selectSession: (sessionId: string | null) => void;
  createSession: (name: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  refreshSessions: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const params = useParams();
  const projectId = params?.id as string;

  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const data = await fetchAPI(`/projects/${projectId}/sessions`);
      setSessions(data);

      // Auto-select first session if none selected?
      // Or keep 'All Generations' (null) as default?
      // Let's keep null as default for now, or maybe restore from localStorage?
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadSessions();
  }, [projectId, loadSessions]);

  const createSession = async (name: string) => {
    if (!projectId) return;
    try {
      const newSession = await fetchAPI(`/projects/${projectId}/sessions`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      setSessions(prev => [newSession, ...prev]);
      setSelectedSessionId(newSession.id);
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!projectId) return;
    try {
      await fetchAPI(`/projects/${projectId}/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw error;
    }
  };

  const selectSession = (sessionId: string | null) => {
    setSelectedSessionId(sessionId);
  };

  return (
    <SessionContext.Provider
      value={{
        sessions,
        selectedSessionId,
        isLoading,
        selectSession,
        createSession,
        deleteSession,
        refreshSessions: loadSessions,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
