import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accountRequest } from "../../../shared/api/account";
import { useAuthStore } from "../../auth/session";

export interface WorkspaceDocument<T> {
  revision: number;
  value: T[];
}
export interface WorkspaceGoal {
  id: string;
  title: string;
  unit: string;
  current: number;
  target: number;
  completed?: boolean;
  projectId?: string | null;
}
export interface WorkspaceIdea {
  id: string;
  projectId: string;
  content: string;
  category?: string | null;
  createdAt?: string;
}
export const workspaceKey = (ownerId: string, section: string) =>
  ["workspace", ownerId, section] as const;
export function useWorkspaceSection<T>(section: string) {
  const ownerId = useAuthStore((s) => s.session?.user.id ?? "");
  const client = useQueryClient();
  const key = workspaceKey(ownerId, section);
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(ownerId),
    queryFn: ({ signal }) =>
      accountRequest<WorkspaceDocument<T>>({
        url: `/api/workspace/${section}`,
        signal,
      }),
  });
  const mutation = useMutation({
    mutationFn: async (update: (items: T[]) => T[]) => {
      if (!query.data) throw new Error("Aguarde o carregamento dos dados.");
      return accountRequest<WorkspaceDocument<T>>({
        url: `/api/workspace/${section}`,
        method: "PUT",
        data: {
          revision: query.data.revision,
          value: update(query.data.value),
        },
      });
    },
    onSuccess: (doc) => {
      if (useAuthStore.getState().session?.user.id === ownerId)
        client.setQueryData(key, doc);
    },
    onError: () => void client.invalidateQueries({ queryKey: key }),
  });
  return {
    ...query,
    items: query.data?.value ?? [],
    update: mutation.mutateAsync,
    busy: mutation.isPending,
    saveError: mutation.error,
  };
}
