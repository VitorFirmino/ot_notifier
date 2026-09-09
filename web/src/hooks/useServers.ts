import { useQuery } from "@tanstack/react-query";
import { api } from "@services/api";

export const SERVERS_QUERY_KEY = ["servers"] as const;

export const useServers = () =>
  useQuery({
    queryKey: SERVERS_QUERY_KEY,
    queryFn: api.getServers,
    refetchInterval: 15000,
  });
