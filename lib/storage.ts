import { ChatSession } from './types';

const STORAGE_KEY = 'chat_sessions';

export const saveSession = (session: ChatSession) => {
    try {
        const sessions = getSessions();
        const existingIndex = sessions.findIndex(s => s.id === session.id);

        if (existingIndex >= 0) {
            sessions[existingIndex] = session;
        } else {
            sessions.unshift(session);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
        window.dispatchEvent(new Event('storage-sessions'));
    } catch (error) {
        console.error('Failed to save session:', error);
    }
};

export const getSessions = (): ChatSession[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Failed to get sessions:', error);
        return [];
    }
};

export const getSessionById = (id: string): ChatSession | undefined => {
    const sessions = getSessions();
    return sessions.find(s => s.id === id);
};

export const deleteSession = (id: string) => {
    try {
        const sessions = getSessions();
        const filtered = sessions.filter(s => s.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        window.dispatchEvent(new Event('storage-sessions'));
    } catch (error) {
        console.error('Failed to delete session:', error);
    }
};
