/**
 * Settings Store
 * 
 * Zustand store for managing Settings page UI state.
 * Handles form states, validation errors, and loading states.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useSettingsStore = create(
  persist(
    (set, get) => ({
      // Profile form state
      profileForm: {
        firstName: '',
        lastName: '',
        username: '',
        phone: '',
        skill: '',
        displayName: '',
        bio: '',
      },

      // Password form state (not persisted for security)
      passwordForm: {
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      },

      // Social links form state
      socialLinksForm: {
        facebook: '',
        twitter: '',
        linkedin: '',
        website: '',
        github: '',
      },

      // Validation errors
      errors: {
        profile: {},
        password: {},
        socialLinks: {},
      },

      // Loading states
      isLoading: {
        profile: false,
        password: false,
        socialLinks: false,
      },

      // Actions
      setProfileForm: (data) =>
        set((state) => ({
          profileForm: { ...state.profileForm, ...data },
        })),

      setPasswordForm: (data) =>
        set((state) => ({
          passwordForm: { ...state.passwordForm, ...data },
        })),

      setSocialLinksForm: (data) =>
        set((state) => ({
          socialLinksForm: { ...state.socialLinksForm, ...data },
        })),

      setErrors: (section, errors) =>
        set((state) => ({
          errors: { ...state.errors, [section]: errors },
        })),

      clearErrors: (section) =>
        set((state) => ({
          errors: { ...state.errors, [section]: {} },
        })),

      setLoading: (section, loading) =>
        set((state) => ({
          isLoading: { ...state.isLoading, [section]: loading },
        })),

      resetForms: () =>
        set({
          profileForm: {
            firstName: '',
            lastName: '',
            username: '',
            phone: '',
            skill: '',
            displayName: '',
            bio: '',
          },
          passwordForm: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          },
          socialLinksForm: {
            facebook: '',
            twitter: '',
            linkedin: '',
            website: '',
            github: '',
          },
          errors: {
            profile: {},
            password: {},
            socialLinks: {},
          },
        }),

      // Reset specific form
      resetProfileForm: () =>
        set({
          profileForm: {
            firstName: '',
            lastName: '',
            username: '',
            phone: '',
            skill: '',
            displayName: '',
            bio: '',
          },
          errors: {
            ...get().errors,
            profile: {},
          },
        }),

      resetPasswordForm: () =>
        set({
          passwordForm: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          },
          errors: {
            ...get().errors,
            password: {},
          },
        }),

      resetSocialLinksForm: () =>
        set({
          socialLinksForm: {
            facebook: '',
            twitter: '',
            linkedin: '',
            website: '',
            github: '',
          },
          errors: {
            ...get().errors,
            socialLinks: {},
          },
        }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist form data, not loading/error states
        profileForm: state.profileForm,
        socialLinksForm: state.socialLinksForm,
        // Don't persist password form for security
      }),
    }
  )
);

export default useSettingsStore;

