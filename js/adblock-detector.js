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

    // Detect ad blocker using multiple methods
    async function detectAdBlocker() {
        return new Promise(resolve => {
            let detected = false;

            // Method 1: Bait element detection (most reliable when combined)
            const baitElement = document.createElement('div');
            baitElement.innerHTML = '&nbsp;';
            baitElement.setAttribute('class', 'ad advertisement');
            baitElement.setAttribute('id', 'ad-slot-1');
            baitElement.setAttribute('style', 'display:none !important; visibility:hidden !important;');
            document.body.appendChild(baitElement);

            setTimeout(() => {
                // Check if element was removed or hidden by ad blocker
                if (!document.body.contains(baitElement) ||
                    baitElement.offsetHeight === 0 ||
                    window.getComputedStyle(baitElement).display === 'none') {
                    detected = true;
                }

                try {
                    document.body.removeChild(baitElement);
                } catch (e) {}

                // Method 2: Check for known ad blocker patterns
                if (!detected && window.adsbygoogle !== undefined) {
                    // Google Publisher Tag loaded, but let's verify it's real
                    if (typeof window.adsbygoogle === 'object' && window.adsbygoogle.length === 0) {
                        // Likely blocked
                        detected = true;
                    }
                }

                resolve(detected);
            }, 50); // Reduced timeout for faster detection
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
                    // When user clicks red coin, show them options to re-enable
                    const reenableModal = document.createElement('div');
                    reenableModal.id = 'reenableEarningModal';
                    reenableModal.className = 'adblock-modal';
                    reenableModal.innerHTML = `
                        <div class="adblock-modal-content">
                            <h3>Enable Coin Earning?</h3>
                            <p>Click below to start earning coins again.</p>
                            <div class="adblock-modal-buttons">
                                <button class="adblock-btn adblock-btn-primary" onclick="window.handleReenableEarning()">Re-enable Earning</button>
                                <button class="adblock-btn adblock-btn-secondary" onclick="document.getElementById('reenableEarningModal').remove()">Cancel</button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(reenableModal);
                }
            }
        }, true);
    }

    // Re-enable earning when user clicks red coin
    window.handleReenableEarning = async function() {
        const modal = document.getElementById('reenableEarningModal');
        if (modal) modal.remove();

        // Clear the localStorage preference
        localStorage.removeItem('nexitool-coin-earning');
        userDisabledEarning = false;

        // Check if ad blocker is actually disabled now
        const stillBlocked = await detectAdBlocker();
        if (stillBlocked) {
            showAdBlockerModal();
        } else {
            earningAllowed = true;
            if (window.startCoinEarning) window.startCoinEarning();
            if (window.updateCoinUI) window.updateCoinUI(false);
        }
    };

    // Background check every 60 seconds (only if earning is active)
    function startBackgroundCheck() {
        setInterval(async () => {
            if (earningAllowed && !userDisabledEarning) {
                const blocked = await detectAdBlocker();
                if (blocked && !adBlockerDetected) {
                    adBlockerDetected = true;
                    earningAllowed = false;
                    if (window.stopCoinEarning) window.stopCoinEarning();
                    if (window.updateCoinUI) window.updateCoinUI(true);
                }
            }
        }, 60000); // 60 seconds
    }

    // Initialize on page load
    window.initAdBlockDetector = async function() {
        // Check if user already chose to disable earnings
        if (checkUserPreference()) {
            // User previously selected "no coins" - respect their choice
            earningAllowed = false;
            if (window.updateCoinUI) window.updateCoinUI(true); // Show red coin
            if (window.stopCoinEarning) window.stopCoinEarning();
            setupRedCoinListener(); // Allow user to re-enable by clicking coin
            return;
        }

        // Check for ad blocker only if user hasn't opted out
        const blocked = await detectAdBlocker();
        if (blocked) {
            adBlockerDetected = true;
            showAdBlockerModal();
        } else {
            earningAllowed = true;
            if (window.updateCoinUI) window.updateCoinUI(false); // Show normal coin
            startBackgroundCheck();
            setupRedCoinListener();
            if (window.startCoinEarning) window.startCoinEarning();
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
