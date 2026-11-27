import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ApiError,
  createUserProfile,
  deleteUserProfile,
  fetchCurrentSession,
  fetchUserProfiles,
  loginAccount,
  logoutAccount,
  registerAccount,
  updateUserProfile,
} from "../lib/api";
import type {
  AccountProfile,
  AccountProfileCreate,
  AccountProfileUpdate,
  AudienceChapterId,
  AuthUser,
} from "../types/nutrition";

interface AuthContextValue {
  user: AuthUser | null;
  profiles: AccountProfile[];
  activeProfile: AccountProfile | null;
  activeProfileId: number | null;
  loading: boolean;
  authModalOpen: boolean;
  authModalMode: "login" | "register";
  authModalChapter: AudienceChapterId | null;
  openAuthModal: (
    mode?: "login" | "register",
    chapter?: AudienceChapterId | null,
  ) => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    full_name: string;
    email: string;
    password: string;
    initial_profile?: AccountProfileCreate;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  refreshProfiles: () => Promise<void>;
  selectProfile: (profileId: number) => void;
  createProfile: (payload: AccountProfileCreate) => Promise<AccountProfile>;
  updateProfile: (
    profileId: number,
    payload: AccountProfileUpdate,
  ) => Promise<AccountProfile>;
  removeProfile: (profileId: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profiles, setProfiles] = useState<AccountProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("login");
  const [authModalChapter, setAuthModalChapter] =
    useState<AudienceChapterId | null>(null);

  const syncActiveProfileSelection = useCallback(
    (nextProfiles: AccountProfile[], preferredId?: number | null) => {
      if (nextProfiles.length === 0) {
        setActiveProfileId(null);
        return;
      }
      if (preferredId && nextProfiles.some((p) => p.id === preferredId)) {
        setActiveProfileId(preferredId);
        return;
      }
      const def = nextProfiles.find((p) => p.is_default) ?? nextProfiles[0];
      setActiveProfileId(def.id);
    },
    [],
  );

  const refreshSession = useCallback(async () => {
    setLoading(true);
    try {
      const session = await fetchCurrentSession();
      setUser(session.user);
      setProfiles(session.profiles);
      syncActiveProfileSelection(session.profiles, activeProfileId);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        setProfiles([]);
        setActiveProfileId(null);
      } else {
        // Keep unauthenticated state if backend is unreachable at boot.
        setUser(null);
        setProfiles([]);
        setActiveProfileId(null);
      }
    } finally {
      setLoading(false);
    }
  }, [activeProfileId, syncActiveProfileSelection]);

  useEffect(() => {
    void refreshSession();
    // Run only once on mount to hydrate cookie session without localStorage tokens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshProfiles = useCallback(async () => {
    if (!user) return;
    const list = await fetchUserProfiles();
    setProfiles(list);
    syncActiveProfileSelection(list, activeProfileId);
  }, [user, activeProfileId, syncActiveProfileSelection]);

  const openAuthModal = useCallback(
    (mode: "login" | "register" = "login", chapter: AudienceChapterId | null = null) => {
      setAuthModalMode(mode);
      setAuthModalChapter(chapter);
      setAuthModalOpen(true);
    },
    [],
  );

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await loginAccount({ email, password });
      setUser(session.user);
      setProfiles(session.profiles);
      syncActiveProfileSelection(session.profiles);
      setAuthModalOpen(false);
    },
    [syncActiveProfileSelection],
  );

  const register = useCallback(
    async (payload: {
      full_name: string;
      email: string;
      password: string;
      initial_profile?: AccountProfileCreate;
    }) => {
      const session = await registerAccount(payload);
      setUser(session.user);
      setProfiles(session.profiles);
      syncActiveProfileSelection(session.profiles);
      setAuthModalOpen(false);
    },
    [syncActiveProfileSelection],
  );

  const logout = useCallback(async () => {
    try {
      await logoutAccount();
    } finally {
      setUser(null);
      setProfiles([]);
      setActiveProfileId(null);
    }
  }, []);

  const selectProfile = useCallback((profileId: number) => {
    setActiveProfileId(profileId);
  }, []);

  const createProfile = useCallback(
    async (payload: AccountProfileCreate): Promise<AccountProfile> => {
      const created = await createUserProfile(payload);
      const nextList = await fetchUserProfiles();
      setProfiles(nextList);
      setActiveProfileId(created.id);
      return created;
    },
    [],
  );

  const updateProfile = useCallback(
    async (
      profileId: number,
      payload: AccountProfileUpdate,
    ): Promise<AccountProfile> => {
      const updated = await updateUserProfile(profileId, payload);
      const nextList = await fetchUserProfiles();
      setProfiles(nextList);
      return updated;
    },
    [],
  );

  const removeProfile = useCallback(
    async (profileId: number): Promise<void> => {
      await deleteUserProfile(profileId);
      const nextList = await fetchUserProfiles();
      setProfiles(nextList);
      syncActiveProfileSelection(nextList, activeProfileId === profileId ? null : activeProfileId);
    },
    [activeProfileId, syncActiveProfileSelection],
  );

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null,
    [profiles, activeProfileId],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profiles,
      activeProfile,
      activeProfileId: activeProfile?.id ?? null,
      loading,
      authModalOpen,
      authModalMode,
      authModalChapter,
      openAuthModal,
      closeAuthModal,
      login,
      register,
      logout,
      refreshSession,
      refreshProfiles,
      selectProfile,
      createProfile,
      updateProfile,
      removeProfile,
    }),
    [
      user,
      profiles,
      activeProfile,
      loading,
      authModalOpen,
      authModalMode,
      authModalChapter,
      openAuthModal,
      closeAuthModal,
      login,
      register,
      logout,
      refreshSession,
      refreshProfiles,
      selectProfile,
      createProfile,
      updateProfile,
      removeProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return ctx;
}
