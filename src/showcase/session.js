/** Session ownership for asynchronous host work. No DOM, scene or animation clock. */
export const staleSession = () => new DOMException('The robot selection changed.', 'AbortError');
export function createShowcaseSessions({ create = identity => ({ identity }), dispose = async () => {} } = {}) {
  let current = null, serial = 0, cleanup = Promise.resolve();
  const isCurrent = session => current === session && !session.abort.signal.aborted;
  const assertCurrent = session => { if (!isCurrent(session)) throw staleSession(); return session; };
  const retire = session => {
    if (!session) return;
    session.abort.abort(staleSession());
    cleanup = cleanup.catch(() => {}).then(() => dispose(session));
  };
  return {
    get current() { return current; },
    begin(identity) {
      retire(current);
      const session = { ...create(identity), generation:++serial, abort:new AbortController() };
      current = session;
      session.ready = cleanup.catch(() => {}).then(() => assertCurrent(session));
      // A newer selection can supersede a session before its caller awaits ready.
      session.ready.catch(() => {});
      return session;
    },
    isCurrent, assertCurrent,
    async guard(session, task) { assertCurrent(session); const result = await task(); assertCurrent(session); return result; },
    async close() { const previous = current; current = null; retire(previous); await cleanup.catch(() => {}); }
  };
}
