export const SAFE_SERVER_ID_PATTERN = /^[a-z0-9_-]+$/i;

export const assertSafeServerId = (serverId: string): void => {
  if (!SAFE_SERVER_ID_PATTERN.test(serverId)) {
    throw new Error(`serverId inválido: ${serverId}`);
  }
};
