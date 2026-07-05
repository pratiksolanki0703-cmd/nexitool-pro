// Coin-earning eligibility check.
// Detects ad blockers via a REAL network request to our own ads folder —
// this is what ad blockers actually block (URL pattern matching), unlike
// fake DOM elements which most modern blockers ignore.
(function() {
    let adBlockerDetected = false;
    let userDisabledEarning = false;
    let earningAllowed = false;

    // Resolve the ads file path relative to THIS script's own URL, so it
    // works whether the page is at site root or a nested tool page, and
    // regardless of custom domain vs github.io subpath.
    function getAdsProbeUrl() {
        const scriptEl = document.currentScript || document.querySelector('script[src*="verify-tracking.js"]');
        const src = scriptEl ? scriptEl.src : (location.origin + '/js/verify-tracking.js');
        return src.replace(/js\/verify-tracking\.js.*$/, 'ads/display-ads.js') + '?_=' + Date.now();
    }
    const ADS_PROBE_URL = getAdsProbeUrl();

    // Immediately halt earning — called first, before any UI/modal work.
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

    // Real network probe: fetch our own ads script. If an ad blocker is
    // active, the browser itself fails the request (ERR_BLOCKED_BY_CLIENT)
    // and fetch() rejects — that's the signal we use.
    async function detectAdBlocker(attempt = 1) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1500);
        try {
            await fetch(ADS_PROBE_URL, {
                method: 'GET',
                cache: 'no-store',
                signal: controller.signal
            });
            clearTimeout(timeout);
            return false; // request went through — no blocker
        } catch (err) {
            clearTimeout(timeout);
            // On first attempt, retry once after a short delay to handle transient network issues
            // (especially important on mobile with variable network conditions)
            if (attempt < 2) {
                await new Promise(r => setTimeout(r, 100));
                return detectAdBlocker(attempt + 1);
            }
            return true; // blocked, aborted, or network error — treat as blocked
        }
    }

    function showAdBlockerModal() {
        if (document.getElementById('verificationModal')) return;
        const modal = document.createElement('div');
        modal.id = 'verificationModal';
        modal.className = 'verification-modal';
        modal.innerHTML = `
            <div class="verification-modal-content">
                <h3>Ad Blocker Detected</h3>
                <p>To continue earning coins, please disable your ad blocker for this site.</p>
                <div class="verification-modal-buttons">
                    <button class="verification-btn verification-btn-primary" onclick="window.handleAdBlockerResponse('disabled')">I Already Disabled It</button>
                    <button class="verification-btn verification-btn-secondary" onclick="window.handleAdBlockerResponse('skip')">Continue Without Earning Coins</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    function showFutureEarningMessage() {
        if (document.getElementById('futureEarningModal')) return;
        const modal = document.createElement('div');
        modal.id = 'futureEarningModal';
        modal.className = 'verification-modal';
        modal.innerHTML = `
            <div class="verification-modal-content">
                <h3>Coin Earning Disabled</h3>
                <p>To earn coins in the future, click the coin icon in your profile.</p>
                <button class="verification-btn verification-btn-primary" style="width: 100%;" onclick="document.getElementById('futureEarningModal').remove()">OK</button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    window.handleAdBlockerResponse = async function(response) {
        const modal = document.getElementById('verificationModal');
        if (modal) modal.remove();

        if (response === 'disabled') {
            const stillBlocked = await detectAdBlocker();
            if (stillBlocked) {
                stopEarningNow();
                showAdBlockerModal();
            } else {
                localStorage.removeItem('nexitool-coin-earning');
                userDisabledEarning = false;
                startEarningNow();
            }
        } else if (response === 'skip') {
            stopEarningNow();
            userDisabledEarning = true;
            localStorage.setItem('nexitool-coin-earning', 'disabled');
            showFutureEarningMessage();
        }
    };

    function setupRedCoinListener() {
        document.addEventListener('click', async function(e) {
            const coinBadge = document.getElementById('coinBadge');
            if (!(e.target === coinBadge || coinBadge?.contains(e.target))) return;
            if (!userDisabledEarning && earningAllowed) return; // already earning, nothing to do
            if (!(await hasSession())) return; // coinBadge only renders when logged in, but be safe

            const stillBlocked = await detectAdBlocker();
            if (stillBlocked) {
                stopEarningNow();
                showAdBlockerModal();
            } else {
                localStorage.removeItem('nexitool-coin-earning');
                userDisabledEarning = false;
                startEarningNow();
            }
        }, true);
    }

    // Every 60s: re-check. Stop earning immediately if blocked, then notify.
    let backgroundIntervalId = null;
    function startBackgroundCheck() {
        if (backgroundIntervalId) return;
        backgroundIntervalId = setInterval(async () => {
            if (!earningAllowed || userDisabledEarning || adBlockerDetected) return;
            const blocked = await detectAdBlocker();
            if (blocked) {
                adBlockerDetected = true;
                stopEarningNow();
                showAdBlockerModal();
            }
        }, 60000);
    }

    function stopBackgroundCheck() {
        if (backgroundIntervalId) {
            clearInterval(backgroundIntervalId);
            backgroundIntervalId = null;
        }
    }

    // Nothing here matters for a signed-out visitor — they can't earn coins
    // at all, so there's nothing to protect and no reason to probe or nag.
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
            const blocked = await detectAdBlocker();
            if (blocked) {
                adBlockerDetected = true;
                stopEarningNow();
                showAdBlockerModal();
            } else {
                startEarningNow();
            }
        }
        startBackgroundCheck();
    }

    function resetForLoggedOutUser() {
        stopBackgroundCheck();
        earningAllowed = false;
        adBlockerDetected = false;
        userDisabledEarning = false;
        const modal = document.getElementById('verificationModal');
        if (modal) modal.remove();
    }

    window.initAdBlockDetector = async function() {
        setupRedCoinListener();

        // Small delay ensures browser has fully initialized and network stack is ready,
        // especially important on mobile with slower devices
        await new Promise(r => setTimeout(r, 50));

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
