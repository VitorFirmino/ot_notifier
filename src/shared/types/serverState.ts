export interface ServerState {
  name: string;
  serverId: string;
  processing?: {
    totalCharacters: number;
    processed: number;
    startTime: number;
  };
  verifying?: {
    totalCharacters: number;
    processed: number;
    startTime: number;
    elapsed: number;
  };
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
  };
  warn?: {
    message: string;
    timestamp: number;
  };
  nextCheck?: {
    timestamp: number;
    checkInterval: number;
  };
}

export interface ServerStates {
  [serverId: string]: ServerState;
}
