import { accountRequest } from "../../../shared/api/account";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../auth/session";
export interface StoryRecord {
  id: string;
  title: string;
  genre: string | null;
  description: string | null;
  synopsis: string | null;
  coverImage: string | null;
  status: "DRAFT" | "IN_PROGRESS" | "COMPLETED";
  progressPercentage: number;
  chapterCount: number;
  wordCount: number;
}
export const libraryKey = (ownerId: string) => ["library", ownerId] as const;
export function useStories() {
  const ownerId = useAuthStore((s) => s.session?.user.id ?? "");
  return useQuery({
    queryKey: libraryKey(ownerId),
    enabled: Boolean(ownerId),
    queryFn: ({ signal }) =>
      accountRequest<StoryRecord[]>({ url: "/api/stories", signal }),
  });
}
