// WebSocket shim for @libsql/isomorphic-ws — CF Workers has WebSocket globally
export const WebSocket = globalThis.WebSocket;
