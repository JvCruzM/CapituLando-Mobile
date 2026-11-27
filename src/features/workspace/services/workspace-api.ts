import { dashboardKey } from "../../home/services/dashboard-api";
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
  projectId?: string | null;
  content: string;
  category?: string | null;
  createdAt?: string;
}
export const workspaceKey = (ownerId: string, section: string) =>
  ["workspace", ownerId, section] as const;
export function useWorkspaceSection<T extends { id: string }>(section: string) {
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
    mutationFn: async (
      update: ((items: T[]) => T[]) | { removeId: string },
    ) => {
      if (useAuthStore.getState().session?.user.id !== ownerId)
        throw new Error("A sessão mudou. Abra esta tela novamente.");
      const document =
        typeof update === "function"
          ? query.data
          : await accountRequest<WorkspaceDocument<T>>({
              url: `/api/workspace/${section}`,
            });
      if (!document) throw new Error("Aguarde o carregamento dos dados.");
      if (useAuthStore.getState().session?.user.id !== ownerId)
        throw new Error("A sessão mudou. Abra esta tela novamente.");
      return accountRequest<WorkspaceDocument<T>>({
        url: `/api/workspace/${section}`,
        method: "PUT",
        data: {
          revision: document.revision,
          value:
            typeof update === "function"
              ? update(document.value)
              : document.value.filter((item) => item.id !== update.removeId),
        },
      });
    },
    onSuccess: (doc) => {
      if (useAuthStore.getState().session?.user.id === ownerId) {
        client.setQueryData(key, doc);
        void client.invalidateQueries({ queryKey: dashboardKey(ownerId) });
      }
    },
    onError: () => void client.invalidateQueries({ queryKey: key }),
  });
  return {
    ...query,
    items: query.data?.value ?? [],
    update: mutation.mutateAsync,
    remove: (id: string) => mutation.mutateAsync({ removeId: id }),
    busy: mutation.isPending,
    saveError: mutation.error,
  };
}
