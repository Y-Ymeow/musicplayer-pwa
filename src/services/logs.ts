export type LogLevel = 'log' | 'warn' | 'error';

export interface LogEntry {
  id: number;
  ts: number;
  level: LogLevel;
  scope?: string;
  message: string;
  data?: unknown[];
}

const logs: LogEntry[] = [];
const listeners = new Set<(items: LogEntry[]) => void>();
let logId = 1;

function emit() {
  const snapshot = logs.slice();
  listeners.forEach((listener) => listener(snapshot));
}

export function addLog(entry: Omit<LogEntry, 'id' | 'ts'>) {
  logs.push({
    id: logId++,
    ts: Date.now(),
    ...entry,
  });

  if (logs.length > 200) {
    logs.splice(0, logs.length - 200);
  }

  emit();
}

export function getLogs() {
  return logs.slice();
}

export function clearLogs() {
  logs.length = 0;
  emit();
}

export function subscribeLogs(listener: (items: LogEntry[]) => void) {
  listeners.add(listener);
  listener(getLogs());
  return () => listeners.delete(listener);
}
