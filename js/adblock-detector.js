// Ad Blocker Detection System
// Detects ad blockers and manages coin earning accordingly
(function() {
    let adBlockerDetected = false;
    let userDisabledEarning = false;
    let earningAllowed = false;

    // Detect ad blocker using bait element
    async function detectAdBlocker() {
        return new Promise(resolve => {
            const baitElement = document.createElement('div');
            baitElement.innerHTML = '&nbsp;';
            baitElement.setAttribute('class', 'ad');
            baitElement.setAttribute('style', 'display:none !important;');
            document.body.appendChild(baitElement);

            setTimeout(() => {
                const isBlocked = baitElement.offsetHeight === 0;
                document.body.removeChild(baitElement);
                resolve(isBlocked);
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
                if (window.startCoinEarning) window.startCoinEarning();
                if (window.updateCoinUI) window.updateCoinUI(false); // false = not disabled
            }
        } else if (response === 'skip') {
            userDisabledEarning = true;
            earningAllowed = false;
            showFutureEarningMessage();
            if (window.updateCoinUI) window.updateCoinUI(true); // true = disabled
        }
    };

    // Check red coin clicks
    function setupRedCoinListener() {
        document.addEventListener('click', async function(e) {
            const coinBadge = document.getElementById('coinBadge');
            if (e.target === coinBadge || coinBadge?.contains(e.target)) {
                if (userDisabledEarning || !earningAllowed) {
                    const stillBlocked = await detectAdBlocker();
                    if (stillBlocked) {
                        showAdBlockerModal();
                    } else {
                        earningAllowed = true;
                        userDisabledEarning = false;
                        if (window.startCoinEarning) window.startCoinEarning();
                        if (window.updateCoinUI) window.updateCoinUI(false);
                    }
                }
            }
        }, true);
    }

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
        const blocked = await detectAdBlocker();
        if (blocked) {
            adBlockerDetected = true;
            showAdBlockerModal();
        } else {
            earningAllowed = true;
            startBackgroundCheck();
            setupRedCoinListener();
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
