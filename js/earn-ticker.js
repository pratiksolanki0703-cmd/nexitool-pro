// Passive coin-earning ticker: +5 coins roughly every 30s while a user is
// signed in and the tab is actually visible. Server-side (earn_ad_tick RPC)
// enforces the real 90-coins/minute combined cap — this file just decides
// when to ask, never how much to grant.
// Ad blocker check: stops earning if ad blocker detected or user disabled it.
(function() {
    const TICK_INTERVAL_MS = 30000;
    // Remembers the last tick attempt across page navigations (each page load
    // is a fresh JS context) so switching pages resumes the 30s cycle instead
    // of restarting it from zero every time.
    const LAST_TICK_KEY = 'nexitool-last-earn-tick';
    let intervalId = null;
    let timeoutId = null;

    async function tick() {
        if (document.visibilityState !== 'visible') return;

        // Check ad blocker status
        const adBlockStatus = window.getAdBlockStatus && window.getAdBlockStatus();
        if (adBlockStatus && !adBlockStatus.earningAllowed) return;

        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (!session) return;

        localStorage.setItem(LAST_TICK_KEY, String(Date.now()));
        const { data, error } = await window.supabaseClient.rpc('earn_ad_tick');
        if (error) {
            console.error('earn_ad_tick failed', error);
            return;
        }
        if (window.updateCachedBalance) window.updateCachedBalance(data.balance);
    }

    function scheduleRecurring() {
        if (intervalId) return;
        intervalId = setInterval(tick, TICK_INTERVAL_MS);
    }

    function start() {
        if (intervalId || timeoutId) return;
        const adBlockStatus = window.getAdBlockStatus && window.getAdBlockStatus();
        if (adBlockStatus && !adBlockStatus.earningAllowed) return;

        const lastTick = parseInt(localStorage.getItem(LAST_TICK_KEY) || '0', 10);
        const remaining = lastTick ? Math.max(0, TICK_INTERVAL_MS - (Date.now() - lastTick)) : TICK_INTERVAL_MS;

        timeoutId = setTimeout(() => {
            timeoutId = null;
            tick();
            scheduleRecurring();
        }, remaining);
    }

    function stop() {
        if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
        if (intervalId) { clearInterval(intervalId); intervalId = null; }
    }

    window.startCoinEarning = start;
    window.stopCoinEarning = stop;

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') stop();
        else window.supabaseClient.auth.getSession().then(({ data: { session } }) => {
            if (session) start();
        });
    });

    window.supabaseClient.auth.onAuthStateChange((_event, session) => {
        if (session) start();
        else stop();
    });

    window.supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (session) start();
    });
})();
