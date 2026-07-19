import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AuthUser {
  id: string;
  username: string;
  email: string | null;
  displayName: string | null;
}

interface AuthResponse {
  authenticated: boolean;
  user: AuthUser | null;
}

export function useUser() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 60_000,
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  return {
    user: data?.user ?? null,
    authenticated: data?.authenticated ?? false,
    isLoading,
    logoutMutation,
  };
}
