// Auth widget: renders into #authWidget (see components/header.html). Sign-in/up
// modal (email+password; Google button present but disabled until real OAuth
// creds exist), coin-balance pill, sign-out. Called from js/script.js's
// loadComponents() right after header injection.
//
// Balance is fetched once on session-establish (there is no other way to learn
// the starting number), then updated ONLY from each RPC response's `balance`
// field afterward — never re-fetched on a timer. earn-ticker.js and
// rewarded-ads.js both call window.updateCachedBalance() after their RPCs.
(function() {
    let cachedBalance = 0;

    function setBalance(balance) {
        cachedBalance = balance;
        const pill = document.getElementById('coinBalancePill');
        if (pill) pill.textContent = `${balance} coins`;
    }
    window.updateCachedBalance = setBalance;

    function renderLoggedOut(container) {
        container.innerHTML = `<button id="authSignInBtn" class="auth-signin-btn">Sign In</button>`;
        document.getElementById('authSignInBtn').addEventListener('click', openAuthModal);
    }

    function renderLoggedIn(container) {
        container.innerHTML = `
            <button id="watchAdBtn" class="watch-ad-btn" disabled title="Coming soon">
                <i data-lucide="play-circle"></i> Watch Ad
            </button>
            <div class="coin-balance-pill" id="coinBalancePill">${cachedBalance} coins</div>
            <button id="authSignOutBtn" class="icon-btn" title="Sign out"><i data-lucide="log-out"></i></button>
        `;
        if (window.lucide) lucide.createIcons();

        document.getElementById('authSignOutBtn').addEventListener('click', async () => {
            await window.supabaseClient.auth.signOut();
        });

        const watchAdBtn = document.getElementById('watchAdBtn');
        watchAdBtn.addEventListener('click', () => {
            if (window.showRewardedAd) window.showRewardedAd();
        });
    }

    function openAuthModal() {
        if (document.getElementById('authModalOverlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'authModalOverlay';
        overlay.className = 'auth-modal-overlay';
        overlay.innerHTML = `
            <div class="auth-modal">
                <button class="auth-modal-close" id="authModalClose">&times;</button>
                <h3>Sign in to NexiTool</h3>
                <p class="auth-modal-sub">Earn coins by watching ads. No payments, ever.</p>
                <div class="auth-modal-error" id="authModalError" style="display:none;"></div>
                <form id="authEmailForm">
                    <input type="email" id="authEmailInput" placeholder="Email" required autocomplete="email">
                    <input type="password" id="authPasswordInput" placeholder="Password (min 6 chars)" required autocomplete="current-password" minlength="6">
                    <button type="submit" id="authSubmitBtn" class="auth-submit-btn">Sign In</button>
                </form>
                <button id="authToggleMode" class="auth-toggle-mode" type="button">Need an account? Sign up</button>
                <button class="auth-google-btn" disabled title="Coming soon" type="button">
                    <i data-lucide="chrome"></i> Continue with Google (coming soon)
                </button>
            </div>
        `;
        document.body.appendChild(overlay);
        if (window.lucide) lucide.createIcons();

        let mode = 'signin';
        const errorEl = document.getElementById('authModalError');
        const submitBtn = document.getElementById('authSubmitBtn');
        const toggleBtn = document.getElementById('authToggleMode');

        function closeModal() { overlay.remove(); }
        document.getElementById('authModalClose').addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

        toggleBtn.addEventListener('click', () => {
            mode = mode === 'signin' ? 'signup' : 'signin';
            submitBtn.textContent = mode === 'signin' ? 'Sign In' : 'Sign Up';
            toggleBtn.textContent = mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in';
            errorEl.style.display = 'none';
        });

        document.getElementById('authEmailForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            errorEl.style.display = 'none';

            const email = document.getElementById('authEmailInput').value.trim();
            const password = document.getElementById('authPasswordInput').value;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Please wait...';

            const { error } = mode === 'signin'
                ? await window.supabaseClient.auth.signInWithPassword({ email, password })
                : await window.supabaseClient.auth.signUp({ email, password });

            if (error) {
                errorEl.textContent = error.message;
                errorEl.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.textContent = mode === 'signin' ? 'Sign In' : 'Sign Up';
                return;
            }

            closeModal();
        });
    }

    async function fetchInitialBalance() {
        const { data, error } = await window.supabaseClient
            .from('profiles')
            .select('credit_balance')
            .single();
        if (!error && data) setBalance(data.credit_balance);
    }

    async function refresh() {
        const container = document.getElementById('authWidget');
        if (!container) return;

        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (session) {
            localStorage.setItem('userType', 'free');
            renderLoggedIn(container);
            await fetchInitialBalance();
        } else {
            localStorage.setItem('userType', 'anonymous');
            renderLoggedOut(container);
        }
    }

    let subscribed = false;

    window.initAuthWidget = function() {
        if (!window.supabaseClient) {
            console.error('auth-widget.js: window.supabaseClient not found — check script load order');
            return;
        }
        refresh();
        if (!subscribed) {
            subscribed = true;
            window.supabaseClient.auth.onAuthStateChange(() => refresh());
        }
    };
})();
