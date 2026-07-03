// Google Auto Ads, gated by user tier.
// userType is read from localStorage: 'anonymous' (default), 'free', or 'premium'.
// Premium users never get ads. No login system exists yet, so userType stays
// 'anonymous' for everyone in Phase 1 — this is just wired up ready for Phase 2 login.
//
// TODO: replace PLACEHOLDER_PUB_ID with the real AdSense publisher id (pub-XXXXXXXXXXXXXXXX)
// once AdSense approves nexitool.pro.
(function() {
    const PLACEHOLDER_PUB_ID = 'ca-pub-0000000000000000';

    const userType = localStorage.getItem('userType') || 'anonymous';
    if (userType === 'premium') return;

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PLACEHOLDER_PUB_ID}`;
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
})();
