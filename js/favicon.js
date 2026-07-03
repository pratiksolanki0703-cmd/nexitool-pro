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
            const pathParts = window.location.pathname.split('/').filter(p => p);
            // Improved depth calculation to handle clean URLs and  extensions
            let depth = 0;
            if (pathParts.length > 0) {
                const lastPart = pathParts[pathParts.length - 1];
                if (lastPart.includes('.')) {
                    // It's a file with extension
                    depth = pathParts.length - 1;
                } else {
                    // It's a clean URL or a directory
                    // Check if it's a known tool path structure (e.g., /tools/category/tool)
                    if (pathParts[0] === 'tools' && pathParts.length === 3) {
                        depth = 2; // tools/category/tool -> 2 levels deep
                    } else if (pathParts[0] === 'pages' || pathParts[0] === 'blog') {
                        depth = 1; // pages/page or blog/post -> 1 level deep
                    } else {
                        depth = pathParts.length;
                    }
                }
            }
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
