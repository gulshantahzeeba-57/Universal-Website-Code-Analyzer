// ===== ScanForge auth page =====
// This project has no real backend yet, so accounts are simulated in
// localStorage: a `sfUsers` map of email -> { name, password } stands in
// for a users table, purely so the sign in / sign up flow can tell you
// "no account with that email" or "you already have an account" like a
// real one would. See README.md for how to wire this to a real backend.

const usersKey = 'sfUsers';

function getUsers() {
    return JSON.parse(localStorage.getItem(usersKey) || '{}');
}

function saveUsers(users) {
    localStorage.setItem(usersKey, JSON.stringify(users));
}

function switchAuthTab(tab, opts) {
    opts = opts || {};
    const isLogin = tab === 'login';
    document.getElementById('tab-login').classList.toggle('active', isLogin);
    document.getElementById('tab-signup').classList.toggle('active', !isLogin);
    document.getElementById('form-login').classList.toggle('hidden', !isLogin);
    document.getElementById('form-signup').classList.toggle('hidden', isLogin);

    // Clear stale alerts whenever the tab changes, unless the caller is
    // deliberately handing an email across (see goToTabWithEmail).
    if (!opts.keepAlerts) {
        hideAlert('login');
        hideAlert('signup');
    }

    const url = new URL(window.location);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url);
}

// Used by the "Sign up" / "Sign in" link inside an alert: carries the
// email the person already typed over to the other tab so they don't
// have to retype it.
function goToTabWithEmail(tab) {
    const fromEmail = tab === 'signup'
        ? document.getElementById('login-email').value.trim()
        : document.getElementById('signup-email').value.trim();

    switchAuthTab(tab, { keepAlerts: true });
    hideAlert('login');
    hideAlert('signup');

    if (fromEmail) {
        const targetInput = tab === 'signup'
            ? document.getElementById('signup-email')
            : document.getElementById('login-email');
        targetInput.value = fromEmail;
    }
}

function showAlert(which, text) {
    document.getElementById(which + '-alert-text').textContent = text;
    document.getElementById(which + '-alert').classList.remove('hidden');
}

function hideAlert(which) {
    document.getElementById(which + '-alert').classList.add('hidden');
}

function submitAuth(event, kind) {
    event.preventDefault();
    const users = getUsers();

    if (kind === 'signup') {
        hideAlert('signup');
        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim().toLowerCase();
        const password = document.getElementById('signup-pass').value;

        if (users[email]) {
            showAlert('signup', 'An account with this email already exists.');
            return false;
        }

        users[email] = { name, password };
        saveUsers(users);
        completeAuth('signup', { name, email });

    } else {
        hideAlert('login');
        const email = document.getElementById('login-email').value.trim().toLowerCase();
        const password = document.getElementById('login-pass').value;
        const record = users[email];

        if (!record) {
            showAlert('login', "We couldn't find an account with this email.");
            return false;
        }
        if (record.password !== password) {
            showAlert('login', 'That password doesn\u2019t match this account.');
            return false;
        }

        completeAuth('login', { name: record.name, email });
    }

    return false;
}

function completeAuth(kind, user) {
    localStorage.setItem('sfUser', JSON.stringify({
        name: user.name || 'there',
        email: user.email,
        joined: new Date().toISOString()
    }));

    const title = kind === 'signup' ? 'Account created' : 'Signed in';
    const text = kind === 'signup'
        ? 'Welcome to ScanForge — taking you to your dashboard…'
        : 'Good to see you again — taking you to your dashboard…';

    document.getElementById('auth-success-title').textContent = title;
    document.getElementById('auth-success-text').textContent = text;
    document.getElementById('auth-forms').classList.add('hidden');
    document.querySelector('.auth-tabs').classList.add('hidden');
    document.getElementById('auth-success').classList.remove('hidden');

    setTimeout(() => {
        window.location.href = DASHBOARD_URL;
    }, 900);
}

// Open on whichever tab the link pointed to (?tab=signup / ?tab=login)
(function initTab() {
    const params = new URLSearchParams(window.location.search);
    switchAuthTab(params.get('tab') === 'signup' ? 'signup' : 'login');
})();
