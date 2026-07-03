// Passive coin-earning ticker: +8 coins roughly every 30s while a user is
// signed in and the tab is actually visible. Server-side (earn_ad_tick RPC)
// enforces the real 90-coins/minute combined cap — this file just decides
// when to ask, never how much to grant.
(function() {
    const TICK_INTERVAL_MS = 30000;
    let intervalId = null;

    async function tick() {
        if (document.visibilityState !== 'visible') return;

        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (!session) return;

        const { data, error } = await window.supabaseClient.rpc('earn_ad_tick');
        if (error) {
            console.error('earn_ad_tick failed', error);
            return;
        }
        if (window.updateCachedBalance) window.updateCachedBalance(data.balance);
    }

    function start() {
        if (intervalId) return;
        intervalId = setInterval(tick, TICK_INTERVAL_MS);
    }

    function stop() {
        if (!intervalId) return;
        clearInterval(intervalId);
        intervalId = null;
    }

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
