import { useQuery } from "@tanstack/react-query";
import { api } from "@services/api";

export const EVENTS_QUERY_KEY = ["events"] as const;

export const useEvents = (limit = 50) =>
  useQuery({
    queryKey: EVENTS_QUERY_KEY,
    queryFn: () => api.getEvents(limit),
    refetchInterval: 20000,
  });
