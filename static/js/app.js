/**
 * Smart Invoice Analyzer — Frontend Application
 * Handles file upload, processing, results display, and CSV export.
 */

// ========================
// State Management
// ========================
const state = {
    results: [],
    processing: false,
    processedCount: 0,
    charts: {}
};

// ========================
// DOM References
// ========================
const DOM = {
    uploadZone: document.getElementById('upload-zone'),
    fileInput: document.getElementById('file-input'),
    processingSection: document.getElementById('processing-section'),
    processingStatus: document.getElementById('processing-status'),
    resultsBody: document.getElementById('results-body'),
    exportCsvBtn: document.getElementById('export-csv-btn'),
    navLinks: document.querySelectorAll('.header-nav-link'),
    pageViews: document.querySelectorAll('.page-view'),
    // Reports Dashboard
    reportEmptyState: document.getElementById('reports-empty-state'),
    reportActiveContent: document.getElementById('reports-active-content'),
    pulseTotal: document.getElementById('pulse-total'),
    pulseTax: document.getElementById('pulse-tax'),
    pulseTaxPct: document.getElementById('pulse-tax-pct'),
    pulseAvg: document.getElementById('pulse-avg'),
    pulseCount: document.getElementById('pulse-count'),
    pulseConfidence: document.getElementById('pulse-confidence'),
    topPartnerName: document.getElementById('top-partner-name'),
    topPartnerStats: document.getElementById('top-partner-stats'),
    auditFlagCard: document.getElementById('audit-flag-card')
};

// ========================
// Initialization
// ========================
document.addEventListener('DOMContentLoaded', () => {
    initUploadZone();
    initButtons();
    initNavigation();
    initCharts();
    checkHealth();
});

function initUploadZone() {
    // File input change
    DOM.fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            processFiles(Array.from(e.target.files));
        }
        e.target.value = '';
    });

    // Drag & Drop
    DOM.uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        DOM.uploadZone.classList.add('drag-over');
    });

    DOM.uploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        DOM.uploadZone.classList.remove('drag-over');
    });

    DOM.uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        DOM.uploadZone.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files);
        processFiles(files);
    });
}

function initButtons() {
    DOM.exportCsvBtn.addEventListener('click', exportCSV);
}

function initNavigation() {
    DOM.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            if (!page) return;

            // Update active link
            DOM.navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Update visible view
            DOM.pageViews.forEach(view => {
                view.classList.remove('active');
                if (view.id === `${page}-view`) {
                    view.classList.add('active');
                }
            });

            if (page === 'reports') {
                updateReports();
            }
        });
    });
}

// ========================
// Health Check
// ========================
async function checkHealth() {
    try {
        const res = await fetch('/health');
        const data = await res.json();
        if (!data.tesseract_available) {
            showToast('Tesseract OCR not detected. Using fallback mode.', 'info');
        }
    } catch (e) {
        showToast('Server connection issue.', 'error');
    }
}

// ========================
// File Processing
// ========================
async function processFiles(files) {
    if (state.processing) return;
    state.processing = true;

    DOM.processingSection.style.display = 'flex';
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
        DOM.processingStatus.textContent = `Processing ${i + 1}/${files.length}: ${files[i].name}`;
        try {
            const res = await uploadAndProcess(files[i]);
            if (res && res.status === 'success') {
                state.results.unshift(res.data); // Add new ones to top
                successCount++;
                state.processedCount++;
            }
        } catch (err) {
            showToast(`Failed: ${files[i].name}`, 'error');
        }
    }

    state.processing = false;
    DOM.processingSection.style.display = 'none';

    if (successCount > 0) {
        renderResults();
        updateReports();
        showToast(`Processed ${successCount} file(s)`, 'success');
        
        // Auto-navigate to All Invoices after 1.5 seconds
        setTimeout(() => {
            const invoicesLink = document.querySelector('[data-page="all-invoices"]');
            if (invoicesLink) invoicesLink.click();
        }, 1500);
    }
}

async function uploadAndProcess(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/upload', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) return null;
    return await response.json();
}

// ========================
// Results Rendering
// ========================
function renderResults() {
    // Render Full Table
    DOM.resultsBody.innerHTML = '';
    state.results.forEach((record, index) => {
        DOM.resultsBody.appendChild(createRow(record, index));
    });
}

function createRow(record, index) {
    const row = document.createElement('tr');
    const categoryClass = getCategoryBadgeClass(record.category);
    
    row.innerHTML = `
        <td>${escapeHtml(record.invoice_number || 'N/A')}</td>
        <td>${escapeHtml(record.date || 'N/A')}</td>
        <td>${escapeHtml(record.vendor || 'Unknown')}</td>
        <td><span class="badge ${categoryClass}">${escapeHtml(record.category || 'Other')}</span></td>
        <td>${parseFloat(record.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td><span class="badge badge-success">Processed</span></td>
        <td>
            <div class="action-links">
                <span class="action-link" onclick="deleteRow(${index})" title="Delete" style="color: #ef4444;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </span>
            </div>
        </td>
    `;
    return row;
}

function getCategoryBadgeClass(cat) {
    const map = {
        'Utilities': 'badge-yellow',
        'Software & IT': 'badge-blue',
        'Office Supplies': 'badge-purple',
        'Travel & Transport': 'badge-pink',
        'Food & Dining': 'badge-yellow',
        'Professional Services': 'badge-blue',
        'Marketing & Advertising': 'badge-pink',
    };
    return map[cat] || 'badge-purple';
}

// ========================
// Reports & Charts
// ========================
function initCharts() {
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#64748b';

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { backgroundColor: '#1e293b', padding: 12, cornerRadius: 8 }
        },
        scales: {
            x: { grid: { display: false } },
            y: { border: { display: false }, grid: { color: 'rgba(226, 232, 240, 0.5)' } }
        }
    };

    // 1. Fresh Spending Pulse
    const trendCtx = document.getElementById('fresh-chart-trend').getContext('2d');
    const grad = trendCtx.createLinearGradient(0, 0, 0, 300);
    grad.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
    grad.addColorStop(1, 'rgba(99, 102, 241, 0)');

    state.charts.trend = new Chart(trendCtx, {
        type: 'line',
        data: { labels: [], datasets: [{ 
            label: 'Total spend', data: [], borderColor: '#6366f1', borderWidth: 3, 
            fill: true, backgroundColor: grad, tension: 0.4, pointRadius: 5, pointHoverRadius: 8,
            pointBackgroundColor: '#fff', pointBorderColor: '#6366f1', pointBorderWidth: 2
        }] },
        options: commonOptions
    });

    // 2. Fresh Category Mix
    state.charts.category = new Chart(document.getElementById('fresh-chart-category'), {
        type: 'doughnut',
        data: { labels: [], datasets: [{ 
            data: [], backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ef4444'], 
            borderWidth: 0, cutout: '80%' 
        }] },
        options: { ...commonOptions, plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 8, padding: 10 } } } }
    });
}

function updateReports() {
    if (state.results.length === 0) {
        DOM.reportEmptyState.style.display = 'flex';
        DOM.reportActiveContent.style.display = 'none';
        return;
    }

    DOM.reportEmptyState.style.display = 'none';
    DOM.reportActiveContent.style.display = 'block';

    // 1. Calculations
    let totalSpend = 0;
    let totalTax = 0;
    let totalConf = 0;
    let mathFailure = false;
    const catMap = {};
    const trendMap = {};
    const vendorMap = {};

    state.results.forEach(r => {
        const amt = parseAmount(r.total);
        const tax = parseAmount(r.tax);
        const conf = parseFloat(r.confidence || 0.95);

        totalSpend += amt;
        totalTax += tax;
        totalConf += conf;

        if (conf < 0.9) mathFailure = true;

        // Categories
        const cat = r.category || 'Other';
        catMap[cat] = (catMap[cat] || 0) + amt;

        // Timeline
        const date = r.date || 'Unknown';
        trendMap[date] = (trendMap[date] || 0) + amt;

        // Vendors
        const vend = r.vendor || 'Unknown';
        vendorMap[vend] = (vendorMap[vend] || { amt: 0, count: 0 });
        vendorMap[vend].amt += amt;
        vendorMap[vend].count += 1;
    });

    const avgInvoice = totalSpend / state.results.length;
    const taxPct = ((totalTax / totalSpend) * 100).toFixed(1);
    const avgConf = ((totalConf / state.results.length) * 100).toFixed(0);

    // 2. Pulse UI
    DOM.pulseTotal.textContent = `₹${totalSpend.toLocaleString('en-IN')}`;
    DOM.pulseTax.textContent = `₹${totalTax.toLocaleString('en-IN')}`;
    DOM.pulseTaxPct.textContent = `${taxPct}% of total spend`;
    DOM.pulseAvg.textContent = `₹${avgInvoice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    DOM.pulseCount.textContent = `Across ${state.results.length} invoices`;
    DOM.pulseConfidence.textContent = `${avgConf}%`;

    // 3. Top Partner
    const topVendor = Object.entries(vendorMap).sort((a,b) => b[1].amt - a[1].amt)[0];
    if (topVendor) {
        DOM.topPartnerName.textContent = topVendor[0];
        DOM.topPartnerStats.textContent = `${topVendor[1].count} invoices • ₹${topVendor[1].amt.toLocaleString()}`;
    }

    // 4. Audit Flag
    DOM.auditFlagCard.style.display = mathFailure ? 'block' : 'none';

    // 5. Charts
    const sortedDates = Object.keys(trendMap).sort();
    state.charts.trend.data.labels = sortedDates;
    state.charts.trend.data.datasets[0].data = sortedDates.map(d => trendMap[d]);
    state.charts.trend.update();

    const catLabels = Object.keys(catMap);
    state.charts.category.data.labels = catLabels;
    state.charts.category.data.datasets[0].data = catLabels.map(l => catMap[l]);
    state.charts.category.update();
}

function parseAmount(amt) {
    if (!amt) return 0;
    const val = parseFloat(amt.toString().replace(/[^0-9.]/g, ''));
    return isNaN(val) ? 0 : val;
}



window.deleteRow = function(index) {
    state.results.splice(index, 1);
    renderResults();
    updateReports();
};

window.viewRawText = function(index) {
    const text = state.results[index].raw_text || 'No raw text available';
    alert("Raw Extracted Text:\n\n" + text.substring(0, 1000) + (text.length > 1000 ? "..." : ""));
};

// ========================
// CSV Export
// ========================
async function exportCSV() {
    if (state.results.length === 0) {
        showToast('No data to export', 'error');
        return;
    }

    try {
        const response = await fetch('/export-csv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ records: state.results }),
        });

        const data = await response.json();

        if (data.status === 'success') {
            window.location.href = `/download/${data.filename}`;
            showToast(`CSV exported!`, 'success');
        }
    } catch (err) {
        showToast(`Export error`, 'error');
    }
}

// ========================
// Toast Notifications
// ========================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
