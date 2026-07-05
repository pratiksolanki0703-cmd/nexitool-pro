// Renders the top announcement bar from js/announcement-config.js.
// Fixed height, inserted above <header> so it pushes both the fixed header
// and page content down while visible — no config option can break the layout.
(function() {
    const BANNER_HEIGHT = 40;
    const HEADER_HEIGHT = 68;

    function init() {
        const cfg = window.ANNOUNCEMENT_CONFIG;
        if (!cfg || !cfg.enabled || !cfg.message) return;

        const banner = document.createElement('div');
        banner.id = 'announcementBanner';
        banner.textContent = cfg.message;
        banner.style.cssText = [
            'position: relative',
            'width: 100%',
            `height: ${BANNER_HEIGHT}px`,
            'display: flex',
            'align-items: center',
            'justify-content: center',
            'text-align: center',
            'padding: 0 2.5rem',
            'box-sizing: border-box',
            `background: ${cfg.backgroundColor || '#f5b301'}`,
            `color: ${cfg.textColor || '#111111'}`,
            `font-size: ${cfg.fontSize || '14px'}`,
            'font-weight: 600',
            'z-index: 101',
            'overflow: hidden',
            'white-space: nowrap',
            'text-overflow: ellipsis'
        ].join(';');
        document.body.insertBefore(banner, document.body.firstChild);

        const header = document.querySelector('header');
        if (header) header.style.top = BANNER_HEIGHT + 'px';
        document.body.style.paddingTop = (HEADER_HEIGHT + BANNER_HEIGHT) + 'px';
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
