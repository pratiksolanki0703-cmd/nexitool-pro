// Rewarded video ad scaffold (Adsterra/Monetag). No real zone/account exists
// yet, so AD_NETWORK_READY stays false and js/auth-widget.js renders the
// "Watch Ad" button disabled ("Coming soon") until real credentials land here.
//
// Coins are only ever granted from the ad SDK's genuine completion
// callback/Promise — never a generic close/dismiss event, and never on a
// fixed timer. See MEMORY.md for why (spoofable if tied to anything else).
(function() {
    // TODO: replace with the real Adsterra/Monetag zone id once the account is approved.
    const PLACEHOLDER_ADSTERRA_ZONE_ID = '0000000';
    const AD_NETWORK_READY = false;

    function isAdBlockerActive() {
        return new Promise((resolve) => {
            const bait = document.createElement('div');
            bait.className = 'adsbox ad-banner ads text-ad advertisement';
            bait.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:1px;height:1px;';
            document.body.appendChild(bait);

            setTimeout(() => {
                const blocked = bait.offsetParent === null || bait.offsetHeight === 0;
                bait.remove();
                resolve(blocked);
            }, 100);
        });
    }

    function showAdBlockerModal() {
        if (document.getElementById('adBlockerModalOverlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'adBlockerModalOverlay';
        overlay.className = 'auth-modal-overlay';
        overlay.innerHTML = `
            <div class="auth-modal">
                <button class="auth-modal-close" id="adBlockerModalClose">&times;</button>
                <h3>Ad-blocker detected</h3>
                <p class="auth-modal-sub">Please disable your ad-blocker for NexiTool.pro to earn coins from this ad.</p>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('adBlockerModalClose').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    }

    async function creditVideoAd() {
        const { data, error } = await window.supabaseClient.rpc('earn_video_ad');
        if (error) {
            console.error('earn_video_ad failed', error);
            return;
        }
        if (window.updateCachedBalance) window.updateCachedBalance(data.balance);
    }

    async function showRewardedAd() {
        if (!AD_NETWORK_READY) {
            console.warn('rewarded-ads.js: no live ad network configured yet (PLACEHOLDER_ADSTERRA_ZONE_ID)');
            return;
        }

        const blocked = await isAdBlockerActive();
        if (blocked) {
            showAdBlockerModal();
            return;
        }

        // TODO: call the real Adsterra/Monetag rewarded-format SDK function here,
        // and call creditVideoAd() ONLY from its genuine completion callback/Promise
        // — never from a close/dismiss event. Expected shape (network API TBD):
        //
        // window.show_<zoneId>('pop').then(async () => { await creditVideoAd(); });
    }

    window.showRewardedAd = showRewardedAd;
})();
