import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useUIStore = create(
  persist(
    (set, get) => ({
      // State
      theme: 'light', // 'light' | 'dark'
      activePanel: null, // 'chat' | 'whiteboard' | 'files' | 'participants' | 'settings' | null
      isSidebarOpen: true,
      isFullscreen: false,
      notifications: [],
      showParticipantsList: false,
      showSettings: false,
      layout: 'grid', // 'grid' | 'speaker' | 'sidebar'
      isMobile: false,
      isTablet: false,

      // Actions
      setTheme: (theme) => {
        set({ theme });
        // Apply theme to document
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },

      toggleTheme: () => {
        const newTheme = get().theme === 'light' ? 'dark' : 'light';
        get().setTheme(newTheme);
      },

      setActivePanel: (panel) => {
        // Toggle if same panel clicked
        if (get().activePanel === panel) {
          set({ activePanel: null });
        } else {
          set({ activePanel: panel });
        }
      },

      closePanel: () => set({ activePanel: null }),

      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

      setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),

      toggleFullscreen: async () => {
        const { isFullscreen } = get();

        if (!isFullscreen) {
          try {
            await document.documentElement.requestFullscreen();
            set({ isFullscreen: true });
          } catch (error) {
            console.error('Error entering fullscreen:', error);
          }
        } else {
          try {
            await document.exitFullscreen();
            set({ isFullscreen: false });
          } catch (error) {
            console.error('Error exiting fullscreen:', error);
          }
        }
      },

      addNotification: (notification) => {
        const id = Date.now().toString();
        const newNotification = {
          id,
          type: 'info', // 'info' | 'success' | 'warning' | 'error'
          message: '',
          duration: 3000,
          ...notification,
          timestamp: new Date(),
        };

        set((state) => ({
          notifications: [...state.notifications, newNotification],
        }));

        // Auto-remove after duration
        if (newNotification.duration > 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, newNotification.duration);
        }

        return id;
      },

      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },

      clearNotifications: () => set({ notifications: [] }),

      toggleParticipantsList: () => {
        set((state) => ({ showParticipantsList: !state.showParticipantsList }));
      },

      setShowParticipantsList: (show) => set({ showParticipantsList: show }),

      toggleSettings: () => {
        set((state) => ({ showSettings: !state.showSettings }));
      },

      setShowSettings: (show) => set({ showSettings: show }),

      setLayout: (layout) => set({ layout }),

      setDeviceType: () => {
        const width = window.innerWidth;
        set({
          isMobile: width < 768,
          isTablet: width >= 768 && width < 1024,
        });
      },

      // Initialize UI
      initialize: () => {
        // Set device type
        get().setDeviceType();

        // Listen for resize
        window.addEventListener('resize', get().setDeviceType);

        // Apply saved theme
        const { theme } = get();
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        }

        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', () => {
          set({ isFullscreen: !!document.fullscreenElement });
        });
      },

      cleanup: () => {
        window.removeEventListener('resize', get().setDeviceType);
      },
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        layout: state.layout,
      }),
    }
  )
);

export default useUIStore;
