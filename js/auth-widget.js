// Auth widget: renders into #authWidget (see components/header.html).
// Logged out: Sign In button → modal. Logged in: profile avatar + coin badge,
// click avatar → dropdown with email, coins, coupon, earn section, sign out.
(function() {
    let cachedBalance = 0;
    let currentEmail = '';
    let watchAdShownOnce = false; // Track if user has seen the watch ad modal

    function redirectTarget() {
        return window.location.href.split('#')[0];
    }

    // Format coins: 999 → "999", 1000 → "1.01k", 100000 → "100k", 1000000 → "1m"
    function formatCoins(num) {
        if (num < 1000) return num.toString();
        if (num < 1000000) {
            const k = (num / 1000).toFixed(2).replace(/\.?0+$/, '');
            return k + 'k';
        }
        const m = (num / 1000000).toFixed(1).replace(/\.?0+$/, '');
        return m + 'm';
    }

    function setBalance(balance) {
        cachedBalance = balance;
        const pill = document.getElementById('coinBalancePill');
        const badge = document.getElementById('coinBadge');
        const ddBal = document.getElementById('profileDropdownBalance');

        const formatted = formatCoins(balance);
        if (pill) pill.textContent = formatted;
        if (badge) badge.textContent = formatted;
        if (ddBal) ddBal.innerHTML = `🪙 <strong>${formatted}</strong> <span style="font-size: 0.85rem;">(${balance} total)</span>`;
    }
    window.updateCachedBalance = setBalance;

    function updateCoinUI(disabled) {
        const badge = document.getElementById('coinBadge');
        if (!badge) return;
        if (disabled) {
            badge.classList.add('disabled');
        } else {
            badge.classList.remove('disabled');
        }
    }
    window.updateCoinUI = updateCoinUI;

    function renderLoggedOut(container) {
        container.innerHTML = `<button id="authSignInBtn" class="auth-signin-btn">Sign In</button>`;
        document.getElementById('authSignInBtn').addEventListener('click', openAuthModal);
    }

    function showWatchAdModal() {
        // Only show once per session; subsequent clicks go directly to the rewarded ad
        if (watchAdShownOnce) {
            if (window.showRewardedAd) window.showRewardedAd();
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'watchAdModalOverlay';
        overlay.className = 'auth-modal-overlay';
        overlay.innerHTML = `
            <div class="auth-modal">
                <button class="auth-modal-close" id="watchAdClose">&times;</button>
                <div style="text-align: center;">
                    <i data-lucide="play-circle" style="width: 48px; height: 48px; color: var(--brand); margin-bottom: 1rem;"></i>
                    <h3>Watch an Ad &amp; Earn Coins</h3>
                    <p class="auth-modal-sub">Complete a short rewarded video to earn <strong>30 coins</strong>.</p>
                </div>
                <div class="auth-modal-error" style="background: rgba(255, 193, 7, 0.15); border-left: 3px solid var(--accent-orange); color: var(--accent-orange);">
                    <strong>Important:</strong>
                    <ul style="margin: 0.5rem 0 0 0; padding-left: 1.25rem; font-size: 0.85rem;">
                        <li>Disable ad blockers for this to work</li>
                        <li>Watch the entire ad — skipping it won't earn coins</li>
                    </ul>
                </div>
                <button id="startWatchAd" class="auth-submit-btn" style="width: 100%; margin-top: 1.5rem;">Start Watching</button>
            </div>
        `;
        document.body.appendChild(overlay);
        if (window.lucide) lucide.createIcons();

        watchAdShownOnce = true;
        document.getElementById('watchAdClose').addEventListener('click', () => overlay.remove());
        document.getElementById('startWatchAd').addEventListener('click', () => {
            overlay.remove();
            if (window.showRewardedAd) window.showRewardedAd();
        });
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    }

    function renderLoggedIn(container) {
        const initial = (currentEmail[0] || 'u').toUpperCase();
        const formatted = formatCoins(cachedBalance);

        container.innerHTML = `
            <div class="profile-menu">
                <button id="headerWatchAdBtn" class="header-earn-btn" title="Watch an ad to earn 30 coins">
                    <i data-lucide="play-circle"></i>
                </button>
                <button id="profileBtn" class="profile-btn" title="Account" aria-haspopup="true" aria-expanded="false">
                    <span class="profile-avatar">${initial}</span>
                    <span class="coin-badge" id="coinBadge">${formatted}</span>
                </button>
                <div class="profile-dropdown" id="profileDropdown" hidden>
                    <div class="profile-email" title="${currentEmail}">${currentEmail}</div>
                    <div class="profile-balance" id="profileDropdownBalance">
                        🪙 <strong>${formatted}</strong> <span style="font-size: 0.85rem;">(${cachedBalance} total)</span>
                    </div>
                    <div class="profile-divider"></div>

                    <div class="profile-section-label">Coupon Code</div>
                    <div class="profile-coupon">
                        <input type="text" id="couponInput" placeholder="Enter code" class="profile-coupon-input">
                        <button id="couponBtn" class="profile-coupon-btn">Redeem</button>
                    </div>

                    <div class="profile-divider"></div>
                    <div class="profile-section-label">Earn coins</div>
                    <div class="profile-earn-section">
                        <button id="watchAdBtn" class="profile-earn-btn" title="Watch a video to earn 30 coins">
                            <i data-lucide="play-circle"></i> <span>Watch Ad — Earn 30 Coins</span>
                        </button>
                        <p class="profile-earn-note">Or earn passively — 5 coins every 30 seconds just by keeping this tab open.</p>
                    </div>

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
                setTimeout(() => document.addEventListener('click', onOutsideClick), 0);
            } else {
                closeDropdown();
            }
        });

        document.getElementById('authSignOutBtn').addEventListener('click', async () => {
            await window.supabaseClient.auth.signOut();
        });

        document.getElementById('watchAdBtn').addEventListener('click', showWatchAdModal);
        document.getElementById('headerWatchAdBtn').addEventListener('click', showWatchAdModal);

        document.getElementById('couponBtn').addEventListener('click', async () => {
            const code = document.getElementById('couponInput').value.trim();
            if (!code) {
                alert('Please enter a coupon code');
                return;
            }
            document.getElementById('couponBtn').disabled = true;
            document.getElementById('couponBtn').textContent = 'Redeeming...';

            try {
                const { data, error } = await window.supabaseClient.rpc('redeem_coupon', { p_code: code });
                if (error) throw error;
                if (data.success) {
                    alert(`Success! You earned ${data.granted} coins.`);
                    document.getElementById('couponInput').value = '';
                    setBalance(data.balance);
                } else {
                    alert(`Coupon error: ${data.reason || 'Unknown error'}`);
                }
            } catch (e) {
                alert(`Error: ${e.message}`);
            }

            document.getElementById('couponBtn').disabled = false;
            document.getElementById('couponBtn').textContent = 'Redeem';
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

                    <button id="authGoogleBtn" class="auth-google-btn" type="button">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Continue with Google
                    </button>

                    <!-- EMAIL LOGIN SECTION (DISABLED FOR NOW)
                    To enable email login in the future, uncomment this entire section:

                    <div class="auth-divider">
                        <span>or</span>
                    </div>

                    <form id="authEmailForm">
                        <input type="email" id="authEmailInput" placeholder="Email" required autocomplete="email">
                        <input type="password" id="authPasswordInput" placeholder="Password (min 6 chars)" required autocomplete="current-password" minlength="6">
                        <button type="submit" id="authSubmitBtn" class="auth-submit-btn">Continue with Email</button>
                    </form>

                    <div class="auth-footer-links">
                        <button id="authForgotBtn" class="auth-link-btn" type="button">Forgot password?</button>
                        <button id="authToggleMode" class="auth-link-btn" type="button">Need an account? Sign up</button>
                    </div>
                    -->
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        if (window.lucide) lucide.createIcons();

        let mode = 'signin';
        const errorEl = document.getElementById('authModalError');

        function closeModal() { overlay.remove(); }
        document.getElementById('authModalClose').addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

        /* EMAIL LOGIN EVENT LISTENERS (DISABLED)
        Uncomment these when re-enabling email login:

        const submitBtn = document.getElementById('authSubmitBtn');
        const toggleBtn = document.getElementById('authToggleMode');

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
            submitBtn.textContent = mode === 'signin' ? 'Continue with Email' : 'Create Account';
            toggleBtn.textContent = mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in';
            errorEl.style.display = 'none';
        });
        */

        /* FORGOT PASSWORD MODAL (DISABLED)
        Uncomment this entire function when re-enabling email login.
        All the 3-step password reset flow is ready and waiting.

        function showForgotPasswordModal() {
            ... (full implementation available above - just uncomment this whole section)
        }

        const forgotBtn = document.getElementById('authForgotBtn');
        if (forgotBtn) {
            forgotBtn.addEventListener('click', showForgotPasswordModal);
        }
        */

        document.getElementById('authGoogleBtn').addEventListener('click', async () => {
            const googleBtn = document.getElementById('authGoogleBtn');
            googleBtn.disabled = true;
            googleBtn.textContent = 'Signing in...';

            try {
                const { error } = await window.supabaseClient.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: redirectTarget()
                    }
                });
                if (error) {
                    errorEl.textContent = error.message || 'Google sign-in failed';
                    errorEl.style.display = 'block';
                    googleBtn.disabled = false;
                    googleBtn.innerHTML = '<i data-lucide="chrome"></i> Continue with Google';
                    if (window.lucide) lucide.createIcons();
                }
            } catch (e) {
                errorEl.textContent = e.message || 'An error occurred';
                errorEl.style.display = 'block';
                googleBtn.disabled = false;
                googleBtn.innerHTML = '<i data-lucide="chrome"></i> Continue with Google';
                if (window.lucide) lucide.createIcons();
            }
        });

        /* EMAIL FORM SUBMIT (DISABLED)
        Uncomment this when re-enabling email login:

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
        */
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
            if (window.maybeShowGuide) window.maybeShowGuide();
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
