// Shows a welcome guide (content from js/guide-content.js) every time a user
// signs in — not when a page load merely restores an already-active session.
// Triggered from js/auth-widget.js only on the SIGNED_IN auth event.
(function() {
    function showGuideModal() {
        if (document.getElementById('guideModalOverlay')) return;
        const cfg = window.GUIDE_CONTENT;
        if (!cfg) return;

        const sectionsHtml = (cfg.sections || []).map(s => `
            <div class="guide-section">
                <h4>${s.heading}</h4>
                <p>${s.body}</p>
            </div>
        `).join('');

        const overlay = document.createElement('div');
        overlay.id = 'guideModalOverlay';
        overlay.className = 'auth-modal-overlay';
        overlay.innerHTML = `
            <div class="auth-modal guide-modal">
                <button class="auth-modal-close" id="guideModalClose">&times;</button>
                <h3>${cfg.title || 'Welcome!'}</h3>
                <div class="guide-sections">${sectionsHtml}</div>
                <button id="guideModalDone" class="auth-submit-btn" style="width: 100%; margin-top: 1rem;">Got it</button>
            </div>
        `;
        document.body.appendChild(overlay);

        function close() {
            overlay.remove();
        }
        document.getElementById('guideModalClose').addEventListener('click', close);
        document.getElementById('guideModalDone').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    }

    window.maybeShowGuide = function() {
        showGuideModal();
    };
})();
