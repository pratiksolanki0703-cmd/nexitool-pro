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
        if (ddBal) ddBal.innerHTML = `<strong>${formatted}</strong> <span style="font-size: 0.85rem;">(${balance} total)</span>`;
    }
    window.updateCachedBalance = setBalance;

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
                <button id="profileBtn" class="profile-btn" title="Account" aria-haspopup="true" aria-expanded="false">
                    <span class="profile-avatar">${initial}</span>
                    <span class="coin-badge" id="coinBadge">${formatted}</span>
                </button>
                <div class="profile-dropdown" id="profileDropdown" hidden>
                    <div class="profile-email" title="${currentEmail}">${currentEmail}</div>
                    <div class="profile-balance" id="profileDropdownBalance">
                        <strong>${formatted}</strong> <span style="font-size: 0.85rem;">(${cachedBalance} total)</span>
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
                            <i data-lucide="play-circle"></i> <span>Watch Ad</span>
                        </button>
                        <p class="profile-earn-note">Or earn passively — 8 coins every 30 seconds just by keeping this tab open.</p>
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
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" fill="#4285F4"/>
                            <text x="12" y="15" font-size="14" font-weight="bold" fill="white" text-anchor="middle">G</text>
                        </svg>
                        Continue with Google
                    </button>

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
            submitBtn.textContent = mode === 'signin' ? 'Continue with Email' : 'Create Account';
            toggleBtn.textContent = mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in';
            errorEl.style.display = 'none';
        });

        function showForgotPasswordModal() {
            const resetOverlay = document.createElement('div');
            resetOverlay.className = 'auth-modal-overlay';
            resetOverlay.innerHTML = `
                <div class="auth-modal">
                    <button class="auth-modal-close" id="resetModalClose">&times;</button>
                    <div id="resetModalBody">
                        <!-- Step 1: Enter Email -->
                        <div id="resetStep1" class="reset-step">
                            <h3>Reset Password</h3>
                            <p class="auth-modal-sub">Enter your email to receive a verification code.</p>
                            <div class="auth-modal-error" id="resetError" style="display:none;"></div>
                            <input type="email" id="resetEmailInput" placeholder="Email" required autocomplete="email">
                            <button id="resetStep1Btn" class="auth-submit-btn" style="width: 100%; margin-top: 1rem;">Send Code</button>
                        </div>

                        <!-- Step 2: Enter OTP -->
                        <div id="resetStep2" class="reset-step" style="display:none;">
                            <h3>Verify Code</h3>
                            <p class="auth-modal-sub">We sent a code to <span id="resetEmailDisplay"></span></p>
                            <div class="auth-modal-error" id="resetError2" style="display:none;"></div>
                            <input type="text" id="resetOtpInput" placeholder="6-digit code" maxlength="6" required autocomplete="off">
                            <button id="resetStep2Btn" class="auth-submit-btn" style="width: 100%; margin-top: 1rem;">Verify Code</button>
                            <button id="resetBackBtn" class="auth-link-btn" style="width: 100%; margin-top: 0.5rem;">← Back</button>
                        </div>

                        <!-- Step 3: New Password -->
                        <div id="resetStep3" class="reset-step" style="display:none;">
                            <h3>New Password</h3>
                            <p class="auth-modal-sub">Enter a new password (minimum 8 characters).</p>
                            <div class="auth-modal-error" id="resetError3" style="display:none;"></div>
                            <input type="password" id="resetPasswordInput" placeholder="New password (min 8 chars)" required autocomplete="new-password" minlength="8">
                            <input type="password" id="resetPasswordConfirm" placeholder="Confirm password" required autocomplete="new-password" minlength="8">
                            <button id="resetStep3Btn" class="auth-submit-btn" style="width: 100%; margin-top: 1rem;">Reset Password</button>
                            <button id="resetBackBtn2" class="auth-link-btn" style="width: 100%; margin-top: 0.5rem;">← Back</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(resetOverlay);

            let resetEmail = '';
            let resetOtp = '';

            document.getElementById('resetModalClose').addEventListener('click', () => resetOverlay.remove());
            resetOverlay.addEventListener('click', (e) => { if (e.target === resetOverlay) resetOverlay.remove(); });

            // Step 1: Send OTP
            document.getElementById('resetStep1Btn').addEventListener('click', async () => {
                resetEmail = document.getElementById('resetEmailInput').value.trim();
                if (!resetEmail) {
                    document.getElementById('resetError').textContent = 'Please enter your email';
                    document.getElementById('resetError').style.display = 'block';
                    return;
                }

                const btn = document.getElementById('resetStep1Btn');
                btn.disabled = true;
                btn.textContent = 'Sending...';
                const errEl = document.getElementById('resetError');
                errEl.style.display = 'none';

                try {
                    const { error } = await window.supabaseClient.auth.signInWithOtp({ email: resetEmail });
                    if (error) {
                        errEl.textContent = error.message;
                        errEl.style.display = 'block';
                    } else {
                        document.getElementById('resetEmailDisplay').textContent = resetEmail;
                        document.getElementById('resetStep1').style.display = 'none';
                        document.getElementById('resetStep2').style.display = 'block';
                    }
                } catch (e) {
                    errEl.textContent = e.message;
                    errEl.style.display = 'block';
                }

                btn.disabled = false;
                btn.textContent = 'Send Code';
            });

            // Step 2: Verify OTP
            document.getElementById('resetStep2Btn').addEventListener('click', async () => {
                resetOtp = document.getElementById('resetOtpInput').value.trim();
                if (!resetOtp || resetOtp.length !== 6) {
                    document.getElementById('resetError2').textContent = 'Please enter a valid 6-digit code';
                    document.getElementById('resetError2').style.display = 'block';
                    return;
                }

                const btn = document.getElementById('resetStep2Btn');
                btn.disabled = true;
                btn.textContent = 'Verifying...';
                const errEl = document.getElementById('resetError2');
                errEl.style.display = 'none';

                try {
                    const { error } = await window.supabaseClient.auth.verifyOtp({
                        email: resetEmail,
                        token: resetOtp,
                        type: 'email'
                    });
                    if (error) {
                        errEl.textContent = error.message;
                        errEl.style.display = 'block';
                    } else {
                        document.getElementById('resetStep2').style.display = 'none';
                        document.getElementById('resetStep3').style.display = 'block';
                    }
                } catch (e) {
                    errEl.textContent = e.message;
                    errEl.style.display = 'block';
                }

                btn.disabled = false;
                btn.textContent = 'Verify Code';
            });

            // Step 3: Set New Password
            document.getElementById('resetStep3Btn').addEventListener('click', async () => {
                const pwd = document.getElementById('resetPasswordInput').value;
                const pwdConfirm = document.getElementById('resetPasswordConfirm').value;
                const errEl = document.getElementById('resetError3');
                errEl.style.display = 'none';

                if (pwd.length < 8) {
                    errEl.textContent = 'Password must be at least 8 characters';
                    errEl.style.display = 'block';
                    return;
                }

                if (pwd !== pwdConfirm) {
                    errEl.textContent = 'Passwords do not match';
                    errEl.style.display = 'block';
                    return;
                }

                const btn = document.getElementById('resetStep3Btn');
                btn.disabled = true;
                btn.textContent = 'Resetting...';

                try {
                    const { error } = await window.supabaseClient.auth.updateUser({ password: pwd });
                    if (error) {
                        errEl.textContent = error.message;
                        errEl.style.display = 'block';
                    } else {
                        alert('Password reset successfully! Please sign in with your new password.');
                        resetOverlay.remove();
                    }
                } catch (e) {
                    errEl.textContent = e.message;
                    errEl.style.display = 'block';
                }

                btn.disabled = false;
                btn.textContent = 'Reset Password';
            });

            // Back buttons
            document.getElementById('resetBackBtn').addEventListener('click', () => {
                document.getElementById('resetStep2').style.display = 'none';
                document.getElementById('resetStep1').style.display = 'block';
                document.getElementById('resetError').style.display = 'none';
                document.getElementById('resetError2').style.display = 'none';
            });

            document.getElementById('resetBackBtn2').addEventListener('click', () => {
                document.getElementById('resetStep3').style.display = 'none';
                document.getElementById('resetStep2').style.display = 'block';
                document.getElementById('resetError2').style.display = 'none';
                document.getElementById('resetError3').style.display = 'none';
            });
        }

        const forgotBtn = document.getElementById('authForgotBtn');
        if (forgotBtn) {
            forgotBtn.addEventListener('click', showForgotPasswordModal);
        }

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
