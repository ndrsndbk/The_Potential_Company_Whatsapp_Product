import { create } from 'zustand';
import type { Conversation, Message } from '@/lib/api';

const MAX_OPEN_WINDOWS = 5;

interface ChatWindow {
  id: string; // conversation id
  conversation: Conversation;
  messages: Message[];
  isMinimized: boolean;
  isLoading: boolean;
  hasMoreMessages: boolean;
  position: number; // 0-4 position from right
}

interface ChatWindowsState {
  openWindows: ChatWindow[];
  activeWindowId: string | null;

  // Actions
  openWindow: (conversation: Conversation) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  setActiveWindow: (id: string | null) => void;
  setMessages: (id: string, messages: Message[]) => void;
  addMessage: (id: string, message: Message) => void;
  setLoading: (id: string, loading: boolean) => void;
  setHasMore: (id: string, hasMore: boolean) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  prependMessages: (id: string, messages: Message[]) => void;
}

export const useChatWindowsStore = create<ChatWindowsState>((set, get) => ({
  openWindows: [],
  activeWindowId: null,

  openWindow: (conversation: Conversation) => {
    const { openWindows } = get();

    // Check if already open
    const existing = openWindows.find((w) => w.id === conversation.id);
    if (existing) {
      // Just bring to front and restore if minimized
      set({
        activeWindowId: conversation.id,
        openWindows: openWindows.map((w) =>
          w.id === conversation.id ? { ...w, isMinimized: false } : w
        ),
      });
      return;
    }

    // Check max windows
    if (openWindows.length >= MAX_OPEN_WINDOWS) {
      // Close the oldest window
      const windowsToKeep = openWindows.slice(1);
      // Reposition remaining windows
      const repositioned = windowsToKeep.map((w, idx) => ({ ...w, position: idx }));

      const newWindow: ChatWindow = {
        id: conversation.id,
        conversation,
        messages: [],
        isMinimized: false,
        isLoading: true,
        hasMoreMessages: true,
        position: MAX_OPEN_WINDOWS - 1,
      };

      set({
        openWindows: [...repositioned, newWindow],
        activeWindowId: conversation.id,
      });
    } else {
      const newWindow: ChatWindow = {
        id: conversation.id,
        conversation,
        messages: [],
        isMinimized: false,
        isLoading: true,
        hasMoreMessages: true,
        position: openWindows.length,
      };

      set({
        openWindows: [...openWindows, newWindow],
        activeWindowId: conversation.id,
      });
    }
  },

  closeWindow: (id: string) => {
    const { openWindows, activeWindowId } = get();
    const filtered = openWindows.filter((w) => w.id !== id);

    // Reposition remaining windows
    const repositioned = filtered.map((w, idx) => ({ ...w, position: idx }));

    set({
      openWindows: repositioned,
      activeWindowId: activeWindowId === id ? null : activeWindowId,
    });
  },

  minimizeWindow: (id: string) => {
    set((state) => ({
      openWindows: state.openWindows.map((w) =>
        w.id === id ? { ...w, isMinimized: true } : w
      ),
      activeWindowId: state.activeWindowId === id ? null : state.activeWindowId,
    }));
  },

  restoreWindow: (id: string) => {
    set((state) => ({
      openWindows: state.openWindows.map((w) =>
        w.id === id ? { ...w, isMinimized: false } : w
      ),
      activeWindowId: id,
    }));
  },

  setActiveWindow: (id: string | null) => {
    set({ activeWindowId: id });
  },

  setMessages: (id: string, messages: Message[]) => {
    set((state) => ({
      openWindows: state.openWindows.map((w) =>
        w.id === id ? { ...w, messages, isLoading: false } : w
      ),
    }));
  },

  addMessage: (id: string, message: Message) => {
    set((state) => ({
      openWindows: state.openWindows.map((w) =>
        w.id === id ? { ...w, messages: [...w.messages, message] } : w
      ),
    }));
  },

  prependMessages: (id: string, messages: Message[]) => {
    set((state) => ({
      openWindows: state.openWindows.map((w) =>
        w.id === id ? { ...w, messages: [...messages, ...w.messages] } : w
      ),
    }));
  },

  setLoading: (id: string, loading: boolean) => {
    set((state) => ({
      openWindows: state.openWindows.map((w) =>
        w.id === id ? { ...w, isLoading: loading } : w
      ),
    }));
  },

  setHasMore: (id: string, hasMore: boolean) => {
    set((state) => ({
      openWindows: state.openWindows.map((w) =>
        w.id === id ? { ...w, hasMoreMessages: hasMore } : w
      ),
    }));
  },

  updateConversation: (id: string, updates: Partial<Conversation>) => {
    set((state) => ({
      openWindows: state.openWindows.map((w) =>
        w.id === id
          ? { ...w, conversation: { ...w.conversation, ...updates } }
          : w
      ),
    }));
  },
}));
