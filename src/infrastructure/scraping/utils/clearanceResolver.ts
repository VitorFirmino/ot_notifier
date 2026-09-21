import {
  getCachedClearance,
  invalidateClearance,
  saveClearance,
  type CachedClearance,
} from "./clearanceCache";
import { solveCloudflareChallenge } from "./capsolverClient";

const inFlight = new Map<string, Promise<CachedClearance | null>>();

const solveAndStore = async (
  domain: string,
  url: string,
  proxySessionId: string | null,
  staleClearance: string | null
): Promise<CachedClearance | null> => {
  const cached = await getCachedClearance(domain);
  const replacedByAnotherSolve =
    Boolean(cached) &&
    cached?.cfClearance !== staleClearance &&
    cached?.proxySessionId === proxySessionId;

  if (cached && replacedByAnotherSolve) return cached;

  await invalidateClearance(domain);

  const solved = await solveCloudflareChallenge(url, proxySessionId);
  if (!solved) return null;

  const clearance: CachedClearance = {
    cfClearance: solved.cfClearance,
    userAgent: solved.userAgent,
    proxySessionId,
    exitIp: null,
    solvedAt: Date.now(),
  };

  await saveClearance(domain, clearance);
  return clearance;
};

export const resolveClearance = async (
  domain: string,
  url: string,
  proxySessionId: string | null,
  staleClearance: string | null
): Promise<CachedClearance | null> => {
  const pending = inFlight.get(domain);
  if (pending) return pending;

  const run = solveAndStore(domain, url, proxySessionId, staleClearance);
  inFlight.set(domain, run);

  try {
    return await run;
  } finally {
    inFlight.delete(domain);
  }
};
