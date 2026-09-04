import { useQuery } from "@tanstack/react-query";
import { authApi } from "../api/auth.api";

/**
 * Hook to fetch active feature codes for the current user's college.
 * Provides `isFeatureActive(code)` for dynamic gating in nav items and views.
 * Refetches on window focus to catch SuperAdmin grant/revoke actions promptly.
 */
export function useActiveFeatures() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["activeFeatures"],
    queryFn: async () => {
      try {
        const res = await authApi.getActiveFeatures();
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const activeFeatures = Array.isArray(data) ? data : [];

  const isFeatureActive = (featureCode) => {
    if (!featureCode) return true; // Core items have no feature code and are always visible
    const clean = featureCode.toLowerCase().trim();
    return activeFeatures.some((f) => {
      const code = f.toLowerCase().trim();
      return (
        code === clean ||
        code === clean.replace(/-/g, "_") ||
        code === clean.replace(/_/g, "-") ||
        code.replace(/s$/, "") === clean.replace(/s$/, "")
      );
    });
  };

  return {
    activeFeatures,
    isFeatureActive,
    isLoading,
    error,
    refetch,
  };
}
