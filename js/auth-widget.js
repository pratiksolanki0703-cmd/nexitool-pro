// Auth widget: renders into #authWidget (see components/header.html).
//  - Logged out: a "Sign In" button that opens an email/password modal.
//  - After signup (email confirmation required): the modal switches to a
//    "check your email" pending screen instead of silently closing.
//  - Logged in: a coin-balance pill + a profile button. Clicking the profile
//    button opens a dropdown with the account email, the earn-coins options
//    (Watch Ad + passive-earning note) and Sign out.
//
// Balance is fetched once on session-establish, then updated ONLY from each RPC
// response's `balance` field afterward (earn-ticker.js / rewarded-ads.js call
// window.updateCachedBalance()) — never re-fetched on a timer.
(function() {
    let cachedBalance = 0;
    let currentEmail = '';

    // Where Supabase should send the user after they click the email
    // verification link. Must be allow-listed in the project's Auth settings
    // (Site URL + Redirect URLs) — currently the GitHub Pages URL. Using the
    // current page URL (minus any hash) returns the user to where they signed up.
    function redirectTarget() {
        return window.location.href.split('#')[0];
    }

    function setBalance(balance) {
        cachedBalance = balance;
        const pill = document.getElementById('coinBalancePill');
        if (pill) pill.textContent = `${balance} coins`;
        const ddBal = document.getElementById('profileDropdownBalance');
        if (ddBal) ddBal.innerHTML = `<strong>${balance}</strong> coins`;
    }
    window.updateCachedBalance = setBalance;

    function renderLoggedOut(container) {
        container.innerHTML = `<button id="authSignInBtn" class="auth-signin-btn">Sign In</button>`;
        document.getElementById('authSignInBtn').addEventListener('click', openAuthModal);
    }

    function renderLoggedIn(container) {
        const initial = (currentEmail[0] || 'u').toUpperCase();
        container.innerHTML = `
            <div class="coin-balance-pill" id="coinBalancePill">${cachedBalance} coins</div>
            <div class="profile-menu">
                <button id="profileBtn" class="profile-btn" title="Account" aria-haspopup="true" aria-expanded="false">
                    <span class="profile-avatar">${initial}</span>
                </button>
                <div class="profile-dropdown" id="profileDropdown" hidden>
                    <div class="profile-email" title="${currentEmail}">${currentEmail}</div>
                    <div class="profile-balance" id="profileDropdownBalance"><strong>${cachedBalance}</strong> coins</div>
                    <div class="profile-divider"></div>
                    <div class="profile-section-label">Earn coins</div>
                    <button id="watchAdBtn" class="watch-ad-btn" disabled title="Coming soon">
                        <i data-lucide="play-circle"></i> Watch Ad (coming soon)
                    </button>
                    <p class="profile-earn-note">You also earn coins automatically while this tab stays open.</p>
                    <div class="profile-divider"></div>
                    <button id="authSignOutBtn" class="profile-signout">
                        <i data-lucide="log-out"></i> Sign out
                    </button>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();

        const profileBtn = document.getElementById('profileBtn');
        const dropdown = document.getElementById('profileDropdown');

        function closeDropdown() {
            dropdown.hidden = true;
            profileBtn.setAttribute('aria-expanded', 'false');
            document.removeEventListener('click', onOutsideClick);
        }
        function onOutsideClick(e) {
            if (!dropdown.contains(e.target) && e.target !== profileBtn && !profileBtn.contains(e.target)) {
                closeDropdown();
            }
        }
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (dropdown.hidden) {
                dropdown.hidden = false;
                profileBtn.setAttribute('aria-expanded', 'true');
                // defer so this same click doesn't immediately close it
                setTimeout(() => document.addEventListener('click', onOutsideClick), 0);
            } else {
                closeDropdown();
            }
        });

        document.getElementById('authSignOutBtn').addEventListener('click', async () => {
            await window.supabaseClient.auth.signOut();
        });

        document.getElementById('watchAdBtn').addEventListener('click', () => {
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
                <div id="authModalBody">
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

        function showVerifyPending(email) {
            document.getElementById('authModalBody').innerHTML = `
                <div class="auth-verify-pending">
                    <i data-lucide="mail-check" class="auth-verify-icon"></i>
                    <h3>Check your email</h3>
                    <p class="auth-modal-sub">We sent a verification link to <strong>${email}</strong>.
                    Click it to activate your account, then come back here — you'll be signed in automatically.</p>
                    <p class="auth-verify-hint">Didn't get it? Check your spam folder, or wait a minute and try signing up again.</p>
                    <button class="auth-submit-btn" id="authVerifyDone" type="button">Got it</button>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
            document.getElementById('authVerifyDone').addEventListener('click', closeModal);
        }

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

            if (mode === 'signup') {
                const { data, error } = await window.supabaseClient.auth.signUp({
                    email,
                    password,
                    options: { emailRedirectTo: redirectTarget() }
                });
                if (error) {
                    errorEl.textContent = error.message;
                    errorEl.style.display = 'block';
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Sign Up';
                    return;
                }
                // If email confirmation is required, there's no session yet — show
                // the "check your email" screen. If autoconfirm is ever enabled,
                // a session comes back and we just close (onAuthStateChange handles UI).
                if (!data.session) {
                    showVerifyPending(email);
                } else {
                    closeModal();
                }
                return;
            }

            const { error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
            if (error) {
                errorEl.textContent = error.message === 'Email not confirmed'
                    ? 'Please verify your email first — check the link we sent you.'
                    : error.message;
                errorEl.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign In';
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
            currentEmail = session.user?.email || '';
            localStorage.setItem('userType', 'free');
            renderLoggedIn(container);
            await fetchInitialBalance();
        } else {
            currentEmail = '';
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
