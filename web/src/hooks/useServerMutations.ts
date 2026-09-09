import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AddServerPayload, ServerConfig, UpdateServerPayload } from "@types";
import { api } from "@services/api";
import { SERVERS_QUERY_KEY } from "./useServers";

type ServersContext = { previous?: ServerConfig[] };

const useOptimisticServersMutation = <TVariables>(
  mutationFn: (variables: TVariables) => Promise<unknown>,
  applyOptimisticUpdate: (servers: ServerConfig[], variables: TVariables) => ServerConfig[]
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (variables: TVariables): Promise<ServersContext> => {
      await queryClient.cancelQueries({ queryKey: SERVERS_QUERY_KEY });
      const previous = queryClient.getQueryData<ServerConfig[]>(SERVERS_QUERY_KEY);
      queryClient.setQueryData<ServerConfig[]>(SERVERS_QUERY_KEY, (old) =>
        old ? applyOptimisticUpdate(old, variables) : old
      );
      return { previous };
    },
    onError: (_err, _variables, context: ServersContext | undefined) => {
      if (context?.previous) queryClient.setQueryData(SERVERS_QUERY_KEY, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: SERVERS_QUERY_KEY }),
  });
};

export const useToggleServerStatus = () =>
  useOptimisticServersMutation(
    ({ serverId, enabled }: { serverId: string; enabled: boolean }) =>
      api.updateServer(serverId, { enabled }),
    (servers, { serverId, enabled }) =>
      servers.map((server) =>
        server.serverId === serverId ? { ...server, guild: { ...server.guild, enabled } } : server
      )
  );

export const useDeleteServer = () =>
  useOptimisticServersMutation(
    (serverId: string) => api.deleteServer(serverId),
    (servers, serverId) => servers.filter((server) => server.serverId !== serverId)
  );

export const useSyncServer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (serverId: string) => api.syncServer(serverId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SERVERS_QUERY_KEY }),
  });
};

export const useTestWebhook = () =>
  useMutation({
    mutationFn: (serverId: string) => api.testWebhook(serverId),
  });

export const useAddServer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddServerPayload) => api.addServer(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SERVERS_QUERY_KEY }),
  });
};

export const useUpdateServer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ serverId, payload }: { serverId: string; payload: UpdateServerPayload }) =>
      api.updateServer(serverId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SERVERS_QUERY_KEY }),
  });
};
