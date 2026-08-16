let selectedZipFile = null;

// ---- Session guard ----
// ScanForge has no backend user database yet (see README), so a session is
// just { name, email } saved in localStorage by the /login page. Each
// signed-in email gets its own scan history so one browser can hold
// separate demo accounts side by side.
const currentUser = JSON.parse(localStorage.getItem('sfUser') || 'null');
if (!currentUser) {
    window.location.href = LOGIN_URL;
}

const historyKey = 'sfHistory_' + (currentUser ? currentUser.email : 'guest');
let auditHistory = JSON.parse(localStorage.getItem(historyKey)) || [];

function logoutUser() {
    localStorage.removeItem('sfUser');
    window.location.href = LOGIN_URL;
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    if (currentUser) {
        document.getElementById('user-name').textContent = currentUser.name;
        document.getElementById('user-email').textContent = currentUser.email;
        document.getElementById('user-avatar').textContent = currentUser.name.charAt(0).toUpperCase();
    }
    updateHistoryUI();
});

// View Navigation (Analyzer vs History Log)
function switchView(viewName) {
    document.getElementById('pane-analyzer').classList.toggle('hidden', viewName !== 'analyzer');
    document.getElementById('pane-history').classList.toggle('hidden', viewName !== 'history');

    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns[0].classList.toggle('active', viewName === 'analyzer');
    navBtns[1].classList.toggle('active', viewName === 'history');

    if (viewName === 'history') updateHistoryTable();
}

// Tab Switching (URL vs ZIP)
function switchTab(type) {
    document.getElementById('tab-url').classList.toggle('active', type === 'url');
    document.getElementById('tab-zip').classList.toggle('active', type === 'zip');
    document.getElementById('content-url').classList.toggle('hidden', type !== 'url');
    document.getElementById('content-zip').classList.toggle('hidden', type !== 'zip');
}

// File Input Handler
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.zip')) {
        selectedZipFile = file;
        document.getElementById('preview-filename').textContent = file.name;
        document.getElementById('preview-filesize').textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
        document.getElementById('dropzone-default').classList.add('hidden');
        document.getElementById('file-preview').classList.remove('hidden');
        document.getElementById('zip-action-bar').classList.remove('hidden');
    }
}

function removeSelectedFile(event) {
    event.stopPropagation();
    selectedZipFile = null;
    document.getElementById('zip-input').value = '';
    document.getElementById('file-preview').classList.add('hidden');
    document.getElementById('zip-action-bar').classList.add('hidden');
    document.getElementById('dropzone-default').classList.remove('hidden');
}

// API Audit Actions
async function analyzeURL() {
    const url = document.getElementById('url-input').value.trim();
    if (!url) return alert("Please specify a URL.");

    showLoader(true);
    try {
        const res = await fetch('/analyze-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        const data = await res.json();
        showLoader(false);
        if (data.error) alert(data.error);
        else processNewAuditResult(data, url, 'URL Audit');
    } catch (err) {
        showLoader(false);
        alert("Request error: " + err.message);
    }
}

async function analyzeZIP() {
    if (!selectedZipFile) return alert("Please choose a ZIP file.");

    showLoader(true);
    const formData = new FormData();
    formData.append('file', selectedZipFile);

    try {
        const res = await fetch('/analyze-zip', { method: 'POST', body: formData });
        const data = await res.json();
        showLoader(false);
        if (data.error) alert(data.error);
        else processNewAuditResult(data, selectedZipFile.name, 'ZIP Archive');
    } catch (err) {
        showLoader(false);
        alert("Upload error: " + err.message);
    }
}

// Process & Save Audit History Log
function processNewAuditResult(data, targetName, typeLabel) {
    const record = {
        id: Date.now(),
        target: targetName,
        type: typeLabel,
        score: data.scores ? data.scores.overall : 85,
        time: new Date().toLocaleString(),
        passed: data.passed || ["All checks passed."],
        warnings: data.warnings || ["No warnings."],
        errors: data.errors || ["No critical errors."]
    };

    // Save to history list
    auditHistory.unshift(record);
    localStorage.setItem('webPulseHistory', JSON.stringify(auditHistory));
    updateHistoryUI();

    // Show on Active Screen Immediately
    renderLiveResult(record);
}

function renderLiveResult(record) {
    document.getElementById('live-result').classList.remove('hidden');
    document.getElementById('live-score').textContent = record.score;
    document.getElementById('live-target').textContent = record.target;
    document.getElementById('live-type').textContent = record.type;
    document.getElementById('live-time').textContent = record.time;

    populateList('live-passed', record.passed);
    populateList('live-warning', record.warnings);
    populateList('live-error', record.errors);

    document.getElementById('live-result').scrollIntoView({ behavior: 'smooth' });
}

// History Logs Table UI
function updateHistoryUI() {
    const total = auditHistory.length;
    document.getElementById('total-scans-count').textContent = total;
    document.getElementById('total-scans-badge').textContent = total;
}

function updateHistoryTable() {
    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = '';

    if (auditHistory.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted);">No audit records found.</td></tr>`;
        return;
    }

    auditHistory.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${item.id.toString().slice(-4)}</td>
            <td><strong>${item.target}</strong></td>
            <td><span class="badge-type">${item.type}</span></td>
            <td><strong>${item.score}/100</strong></td>
            <td>${item.time}</td>
            <td><button class="btn-sm" onclick="viewHistoricalModal(${item.id})">View Report</button></td>
        `;
        tbody.appendChild(tr);
    });
}

// Modal View for Past Records
function viewHistoricalModal(id) {
    const record = auditHistory.find(item => item.id === id);
    if (!record) return;

    document.getElementById('modal-target').textContent = record.target;
    document.getElementById('modal-type').textContent = record.type;
    document.getElementById('modal-time').textContent = record.time;
    document.getElementById('modal-score').textContent = record.score;

    populateList('modal-passed', record.passed);
    populateList('modal-warning', record.warnings);
    populateList('modal-error', record.errors);

    document.getElementById('modal-details').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal-details').classList.add('hidden');
}

function clearAllHistory() {
    if (confirm("Are you sure you want to clear all audit records?")) {
        auditHistory = [];
        localStorage.removeItem('webPulseHistory');
        updateHistoryUI();
        updateHistoryTable();
    }
}

// General Utilities
function populateList(elemId, items) {
    const ul = document.getElementById(elemId);
    ul.innerHTML = '';
    items.forEach(i => {
        const li = document.createElement('li');
        li.textContent = i;
        ul.appendChild(li);
    });
}

function showLoader(visible) {
    document.getElementById('loader').classList.toggle('hidden', !visible);
    if (visible) document.getElementById('live-result').classList.add('hidden');
}

function resetAnalyzer() {
    document.getElementById('url-input').value = '';
    removeSelectedFile(new Event('click'));
    document.getElementById('live-result').classList.add('hidden');
}

