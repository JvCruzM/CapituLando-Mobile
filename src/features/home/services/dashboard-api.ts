import { useQuery } from "@tanstack/react-query";
import { accountRequest } from "../../../shared/api/account";
import { useAuthStore } from "../../auth/session";
export interface DashboardSummary {
  storyCount: number;
  chapterCount: number;
  wordCount: number;
  ideaCount: number;
  goals: { total: number; completed: number; percentage: number };
}
export const dashboardKey = (ownerId: string) =>
  ["dashboard", ownerId] as const;
export function useDashboard() {
  const ownerId = useAuthStore((state) => state.session?.user.id ?? "");
  return useQuery({
    queryKey: dashboardKey(ownerId),
    enabled: Boolean(ownerId),
    queryFn: ({ signal }) =>
      accountRequest<DashboardSummary>({ url: "/api/dashboard", signal }),
  });
}
