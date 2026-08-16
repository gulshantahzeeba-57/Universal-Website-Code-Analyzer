// ===== ScanForge landing page interactions =====

// Smooth-scroll for in-page anchor links
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
        const id = link.getAttribute('href');
        if (id.length > 1) {
            const target = document.querySelector(id);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    });
});

// Mobile nav (simple: reveals links stacked under the bar)
function toggleMobileNav() {
    const links = document.querySelector('.lp-links');
    if (!links) return;
    const isOpen = links.style.display === 'flex';
    if (isOpen) {
        links.style.display = '';
        links.style.flexDirection = '';
        links.style.position = '';
    } else {
        links.style.display = 'flex';
        links.style.flexDirection = 'column';
        links.style.position = 'absolute';
        links.style.top = '72px';
        links.style.left = '0';
        links.style.right = '0';
        links.style.background = 'rgba(9,13,23,0.98)';
        links.style.padding = '20px 32px';
        links.style.gap = '18px';
        links.style.borderBottom = '1px solid var(--line-soft)';
    }
}

// Rotating scan target ticker on the hero monitor
const scanTargets = [
    'github.com/acme/storefront',
    'northwind-app.vercel.app',
    'project.zip → 214 files',
    'api.brightleaf.io/docs',
    'portfolio-v3.zip → 58 files'
];
let scanTargetIndex = 0;
const monitorTargetEl = document.getElementById('monitor-target');
if (monitorTargetEl) {
    setInterval(() => {
        scanTargetIndex = (scanTargetIndex + 1) % scanTargets.length;
        monitorTargetEl.textContent = scanTargets[scanTargetIndex];
    }, 3200);
}

// Reflect a logged-in user in the nav, if one exists (set by /login).
// See static/js/auth.js and README.md for how the demo session works.
(function reflectSession() {
    let user = null;
    try { user = JSON.parse(localStorage.getItem('sfUser')); } catch (e) { /* ignore */ }
    if (!user || typeof DASHBOARD_URL === 'undefined') return;

    const signIn = document.getElementById('nav-signin');
    const signUp = document.getElementById('nav-signup');
    if (signIn) { signIn.textContent = user.name; signIn.href = DASHBOARD_URL; }
    if (signUp) { signUp.textContent = 'Go to dashboard'; signUp.href = DASHBOARD_URL; }
})();
