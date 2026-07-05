// Ad Blocker Detection System
// Detects ad blockers and manages coin earning accordingly
(function() {
    let adBlockerDetected = false;
    let userDisabledEarning = false;
    let earningAllowed = false;

    // Check if user previously chose to disable earnings (stored in localStorage)
    function checkUserPreference() {
        const pref = localStorage.getItem('nexitool-coin-earning');
        if (pref === 'disabled') {
            userDisabledEarning = true;
            return true;
        }
        return false;
    }

    // Detect ad blocker - only if element is actually REMOVED by blocker
    async function detectAdBlocker() {
        return new Promise(resolve => {
            const elem = document.createElement('div');
            // Make it LOOK like a real ad so ad blocker targets it
            elem.id = 'google_ads_div';
            elem.className = 'ad adsbygoogle';
            elem.style.cssText = 'width:1px; height:1px; position:absolute; left:-9999px;';
            document.body.appendChild(elem);

            setTimeout(() => {
                // Ad blocker REMOVES elements, not just hides them
                const detected = !document.body.contains(elem);
                try { document.body.removeChild(elem); } catch (e) {}
                resolve(detected);
            }, 100);
        });
    }

    // Show ad blocker modal
    function showAdBlockerModal() {
        const existing = document.getElementById('adBlockerModal');
        if (existing) return;

        const modal = document.createElement('div');
        modal.id = 'adBlockerModal';
        modal.className = 'adblock-modal';
        modal.innerHTML = `
            <div class="adblock-modal-content">
                <h3>Ad Blocker Detected</h3>
                <p>To continue earning coins, please disable your ad blocker.</p>
                <div class="adblock-modal-buttons">
                    <button class="adblock-btn adblock-btn-primary" onclick="window.handleAdBlockerResponse('disabled')">I Already Disabled It</button>
                    <button class="adblock-btn adblock-btn-secondary" onclick="window.handleAdBlockerResponse('skip')">Continue Without Earning Coins</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Show future earning message
    function showFutureEarningMessage() {
        const existing = document.getElementById('futureEarningModal');
        if (existing) return;

        const modal = document.createElement('div');
        modal.id = 'futureEarningModal';
        modal.className = 'adblock-modal';
        modal.innerHTML = `
            <div class="adblock-modal-content">
                <h3>Coins Earning Disabled</h3>
                <p>To earn coins in the future, click the coin icon in your profile.</p>
                <button class="adblock-btn adblock-btn-primary" style="width: 100%;" onclick="document.getElementById('futureEarningModal').remove()">OK</button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Handle user response to ad blocker modal
    window.handleAdBlockerResponse = async function(response) {
        const modal = document.getElementById('adBlockerModal');
        if (modal) modal.remove();

        if (response === 'disabled') {
            // Recheck if ad blocker is actually disabled
            const stillBlocked = await detectAdBlocker();
            if (stillBlocked) {
                showAdBlockerModal(); // Show same modal again
            } else {
                earningAllowed = true;
                adBlockerDetected = false;
                localStorage.removeItem('nexitool-coin-earning'); // Clear any "disabled" preference
                if (window.startCoinEarning) window.startCoinEarning();
                if (window.updateCoinUI) window.updateCoinUI(false); // false = not disabled
            }
        } else if (response === 'skip') {
            userDisabledEarning = true;
            earningAllowed = false;
            // Save user preference to localStorage - persist across page loads
            localStorage.setItem('nexitool-coin-earning', 'disabled');
            showFutureEarningMessage();
            if (window.updateCoinUI) window.updateCoinUI(true); // true = disabled
            // Stop the coin ticker if it's running
            if (window.stopCoinEarning) window.stopCoinEarning();
        }
    };

    // Check red coin clicks
    function setupRedCoinListener() {
        document.addEventListener('click', async function(e) {
            const coinBadge = document.getElementById('coinBadge');
            if (e.target === coinBadge || coinBadge?.contains(e.target)) {
                if (userDisabledEarning || !earningAllowed) {
                    // When user clicks red coin, try to re-enable earning
                    // First check if ad blocker is really blocking
                    const stillBlocked = await detectAdBlocker();

                    if (stillBlocked) {
                        // Actually blocked - show why
                        showAdBlockerModal();
                    } else {
                        // Not blocked - just enable
                        localStorage.removeItem('nexitool-coin-earning');
                        userDisabledEarning = false;
                        adBlockerDetected = false;
                        earningAllowed = true;
                        if (window.startCoinEarning) window.startCoinEarning();
                        if (window.updateCoinUI) window.updateCoinUI(false);
                    }
                }
            }
        }, true);
    }

    // Background check every 60 seconds (only if earning is active)
    // Silently disable if ad blocker detected - don't show popup
    function startBackgroundCheck() {
        setInterval(async () => {
            if (earningAllowed && !userDisabledEarning && !adBlockerDetected) {
                const blocked = await detectAdBlocker();
                if (blocked) {
                    adBlockerDetected = true;
                    earningAllowed = false;
                    if (window.stopCoinEarning) window.stopCoinEarning();
                    if (window.updateCoinUI) window.updateCoinUI(true);
                    // Silent disable - no popup. User can click red coin to retry
                }
            }
        }, 60000); // 60 seconds
    }

    // Initialize on page load
    window.initAdBlockDetector = async function() {
        // Check if user already chose to disable earnings
        if (checkUserPreference()) {
            userDisabledEarning = true;
            earningAllowed = false;
            if (window.updateCoinUI) window.updateCoinUI(true);
            if (window.stopCoinEarning) window.stopCoinEarning();
            setupRedCoinListener();
            console.log('[AdBlock] User previously disabled coins');
            return;
        }

        // Check for ad blocker on page load
        const blocked = await detectAdBlocker();
        console.log('[AdBlock] Detection result:', blocked ? 'BLOCKED' : 'OK');

        if (blocked) {
            adBlockerDetected = true;
            earningAllowed = false;
            showAdBlockerModal();
            if (window.updateCoinUI) window.updateCoinUI(true);
            console.log('[AdBlock] Showing ad blocker modal');
        } else {
            earningAllowed = true;
            if (window.updateCoinUI) window.updateCoinUI(false);
            setupRedCoinListener();
            startBackgroundCheck();
            if (window.startCoinEarning) window.startCoinEarning();
            console.log('[AdBlock] Coins earning started');
        }
    };

    // Export state for other scripts
    window.getAdBlockStatus = function() {
        return {
            detected: adBlockerDetected,
            userDisabled: userDisabledEarning,
            earningAllowed: earningAllowed
        };
    };
})();
