// Centralized Management (Favicon)
(function() {
    // CONFIGURATION: favicon file (subfolder-depth-aware)
    const FAVICON_URL = 'favicon.ico';

    // LOGIC: Injects the favicon into the head and updates logo images
    function setFavicon() {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.getElementsByTagName('head')[0].appendChild(link);
        }
        
        // If the URL is a relative path (like 'favicon.ico'), 
        // we need to handle subfolders
        let finalUrl = FAVICON_URL;
        if (!FAVICON_URL.startsWith('data:') && !FAVICON_URL.startsWith('http')) {
            // All pages currently use explicit .html filenames, so depth is simply
            // everything before the last path segment (kept in sync with js/script.js).
            const pathParts = window.location.pathname.split('/').filter(p => p);
            const depth = Math.max(pathParts.length - 1, 0);
            finalUrl = '../'.repeat(depth) + FAVICON_URL;
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
