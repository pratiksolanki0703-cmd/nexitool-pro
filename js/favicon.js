// Centralized Management (Favicon)
(function() {
    // CONFIGURATION: favicon file (subfolder-depth-aware)
    const FAVICON_URL = 'favicon.ico';

    // The "../" prefix is read from THIS SCRIPT TAG's own unresolved src attribute
    // rather than window.location.pathname — pathname parsing counted the GitHub
    // Pages repo-subpath segment ("/nexitool-pro/") as an extra folder level, so
    // tool pages pointed the favicon/logo one directory too high and 404'd (this
    // is why the logo failed to load on tool pages). Every page already hardcodes
    // the correct "../" depth for its own <script src="...js/favicon.js"> tag, so
    // reading it back here is depth-correct no matter what subpath it's hosted at.
    // Captured now, at top-level sync execution, while document.currentScript is valid.
    const scriptEl = document.currentScript
        || Array.from(document.getElementsByTagName('script')).find(s => /(^|\/)favicon\.js$/.test(s.getAttribute('src') || ''));
    const prefix = scriptEl ? (scriptEl.getAttribute('src').match(/^(\.\.\/)*/) || [''])[0] : '';

    // LOGIC: Injects the favicon into the head and updates logo images
    function setFavicon() {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.getElementsByTagName('head')[0].appendChild(link);
        }

        // If the URL is a relative path (like 'favicon.ico'),
        // prefix it with this page's own script-derived depth.
        let finalUrl = FAVICON_URL;
        if (!FAVICON_URL.startsWith('data:') && !FAVICON_URL.startsWith('http')) {
            finalUrl = prefix + FAVICON_URL;
        }

        link.href = finalUrl;

        // Update any logo images on the page
        const logoImages = document.querySelectorAll('.logo-img');
        logoImages.forEach(img => {
            img.src = finalUrl;
        });
    }

    // Run on load and also when content changes (for dynamically loaded headers/footers)
    function init() {
        setFavicon();
        
        // Observe for changes to catch dynamically loaded components
        const observer = new MutationObserver(setFavicon);
        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
