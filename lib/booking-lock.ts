// Reduz contenção local. O bloqueio FOR UPDATE no banco protege a agenda
// quando há mais de uma instância da aplicação.
const pending = new Map<string, Promise<void>>();

export async function withBookingLock<T>(key: string, action: () => Promise<T>): Promise<T> {
  const previous = pending.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  pending.set(key, current);
  await previous;
  try {
    return await action();
  } finally {
    release();
    if (pending.get(key) === current) pending.delete(key);
  }
}
