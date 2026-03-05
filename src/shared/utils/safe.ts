export const safe = async <T>(
  fn: () => Promise<T>
): Promise<{ ok: true; data: T } | { ok: false; error: Error }> => {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

export const safeSync = <T>(fn: () => T): { ok: true; data: T } | { ok: false; error: Error } => {
  try {
    const data = fn();
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};
