// Coin-earning eligibility check.
// Detects ad blockers via a REAL network request to our own ads folder.
// No modals — just silently disables earning and shows red coin if blocked.
(function() {
    let adBlockerDetected = false;
    let userDisabledEarning = false;
    let earningAllowed = false;

    function getAdsProbeUrl() {
        const scriptEl = document.currentScript || document.querySelector('script[src*="verify-tracking.js"]');
        const src = scriptEl ? scriptEl.src : (location.origin + '/js/verify-tracking.js');
        return src.replace(/js\/verify-tracking\.js.*$/, 'ads/display-ads.js') + '?_=' + Date.now();
    }
    const ADS_PROBE_URL = getAdsProbeUrl();

    function stopEarningNow() {
        earningAllowed = false;
        if (window.stopCoinEarning) window.stopCoinEarning();
        if (window.updateCoinUI) window.updateCoinUI(true);
    }

    function startEarningNow() {
        earningAllowed = true;
        adBlockerDetected = false;
        if (window.updateCoinUI) window.updateCoinUI(false);
        if (window.startCoinEarning) window.startCoinEarning();
    }

    function checkUserPreference() {
        return localStorage.getItem('nexitool-coin-earning') === 'disabled';
    }

    async function detectAdBlocker() {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        try {
            await fetch(ADS_PROBE_URL, {
                method: 'GET',
                cache: 'no-store',
                signal: controller.signal
            });
            clearTimeout(timeout);
            return false;
        } catch (err) {
            clearTimeout(timeout);
            return true;
        }
    }

    function setupRedCoinListener() {
        document.addEventListener('click', async function(e) {
            const coinBadge = document.getElementById('coinBadge');
            if (!(e.target === coinBadge || coinBadge?.contains(e.target))) return;
            if (!userDisabledEarning && earningAllowed) return;
            if (!(await hasSession())) return;

            const stillBlocked = await detectAdBlocker();
            if (stillBlocked) {
                stopEarningNow();
            } else {
                localStorage.removeItem('nexitool-coin-earning');
                userDisabledEarning = false;
                startEarningNow();
            }
        }, true);
    }

    let backgroundIntervalId = null;
    function startBackgroundCheck() {
        if (backgroundIntervalId) return;
        backgroundIntervalId = setInterval(async () => {
            if (!earningAllowed || userDisabledEarning || adBlockerDetected) return;
            const blocked = await detectAdBlocker();
            if (blocked) {
                adBlockerDetected = true;
                stopEarningNow();
            }
        }, 60000);
    }

    function stopBackgroundCheck() {
        if (backgroundIntervalId) {
            clearInterval(backgroundIntervalId);
            backgroundIntervalId = null;
        }
    }

    async function hasSession() {
        if (!window.supabaseClient) return false;
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        return !!session;
    }

    async function runCheckForLoggedInUser() {
        if (checkUserPreference()) {
            userDisabledEarning = true;
            stopEarningNow();
        } else {
            startEarningNow();
        }
        startBackgroundCheck();
    }

    function resetForLoggedOutUser() {
        stopBackgroundCheck();
        earningAllowed = false;
        adBlockerDetected = false;
        userDisabledEarning = false;
    }

    window.initAdBlockDetector = async function() {
        setupRedCoinListener();
        if (await hasSession()) await runCheckForLoggedInUser();
        if (window.supabaseClient) {
            window.supabaseClient.auth.onAuthStateChange(async (_event, session) => {
                if (session) await runCheckForLoggedInUser();
                else resetForLoggedOutUser();
            });
        }
    };

    window.getAdBlockStatus = function() {
        return { detected: adBlockerDetected, userDisabled: userDisabledEarning, earningAllowed };
    };
})();
