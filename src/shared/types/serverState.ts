export interface ServerState {
  name: string;
  serverId: string;
  processing?: {
    totalCharacters: number;
    processed: number;
    startTime: number;
    isInitialSync: boolean;
  } | null;
  verifying?: {
    totalCharacters: number;
    processed: number;
    startTime: number;
    elapsed: number;
  } | null;
  finished?: {
    online: number;
    offline: number;
    changes: number;
    errors: number;
    cached: number;
    fetched: number;
    saved: boolean;
    duration: string;
    timestamp: number;
  } | null;
  warn?: {
    message: string;
    timestamp: number;
  } | null;
  nextCheck?: {
    timestamp: number;
    checkInterval: number;
  } | null;
}

export interface ServerStates {
  [serverId: string]: ServerState;
}
