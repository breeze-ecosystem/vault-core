import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { getSites, type Site } from "@/lib/api";

interface SiteContextType {
  sites: Site[];
  currentSiteId: string | null;
  currentSite: Site | null;
  setCurrentSiteId: (id: string | null) => void;
  isLoading: boolean;
  refreshSites: () => Promise<void>;
}

const SiteContext = createContext<SiteContextType>({
  sites: [],
  currentSiteId: null,
  currentSite: null,
  setCurrentSiteId: () => {},
  isLoading: false,
  refreshSites: async () => {},
});

export function SiteProvider({ children }: { children: ReactNode }) {
  const { user, organization } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [currentSiteId, setCurrentSiteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isGlobalAdmin = user?.role === "GLOBAL_ADMIN";

  const refreshSites = useCallback(async () => {
    if (!isGlobalAdmin) return;
    setIsLoading(true);
    try {
      const data = await getSites();
      setSites(data);
      if (data.length > 0 && !currentSiteId) {
        setCurrentSiteId(data[0].id);
      }
    } catch {
      // Silently fail — sites are optional for non-multi-site orgs
    } finally {
      setIsLoading(false);
    }
  }, [isGlobalAdmin, currentSiteId]);

  useEffect(() => {
    if (isGlobalAdmin) {
      refreshSites();
    }
  }, [isGlobalAdmin, refreshSites]);

  const currentSite = sites.find((s) => s.id === currentSiteId) ?? null;

  return (
    <SiteContext.Provider
      value={{
        sites,
        currentSiteId,
        currentSite,
        setCurrentSiteId,
        isLoading,
        refreshSites,
      }}
    >
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  return useContext(SiteContext);
}
