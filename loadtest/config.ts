import path from "node:path";

export const LOADTEST_PORT = Number(process.env.LOADTEST_PORT ?? 3077);
export const LOADTEST_API_BASE = `http://localhost:${LOADTEST_PORT}`;
export const LOADTEST_STORAGE_DIR = path.resolve(import.meta.dirname, ".storage");
export const LOADTEST_SESSION_FILE = path.resolve(import.meta.dirname, ".session.json");
export const LOADTEST_PASSWORD = "Str0ng!Pass2026";
