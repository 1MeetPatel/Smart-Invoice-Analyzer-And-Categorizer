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
    reportTotalSpend: document.getElementById('report-total-spend'),
    reportAvgInvoice: document.getElementById('report-avg-invoice'),
    reportTotalCount: document.getElementById('report-total-count'),
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
    // Set global defaults for premium look
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.size = 13;
    Chart.defaults.color = '#64748b';
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.padding = 20;

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom' },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                padding: 12,
                cornerRadius: 8,
                titleFont: { size: 14, weight: '700' }
            }
        },
        scales: {
            x: { grid: { display: false } },
            y: { border: { display: false }, grid: { color: 'rgba(226, 232, 240, 0.5)' } }
        }
    };

    // 1. Trend Area Chart (with Gradient)
    const trendCtx = document.getElementById('chart-trend').getContext('2d');
    const trendGrad = trendCtx.createLinearGradient(0, 0, 0, 300);
    trendGrad.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
    trendGrad.addColorStop(1, 'rgba(99, 102, 241, 0)');

    state.charts.trend = new Chart(trendCtx, {
        type: 'line',
        data: { labels: [], datasets: [{ 
            label: 'Spending (₹)', data: [], borderColor: '#6366f1', borderWidth: 3, 
            fill: true, backgroundColor: trendGrad, tension: 0.4, pointRadius: 4
        }] },
        options: commonOptions
    });

    // 2. Category Doughnut
    state.charts.category = new Chart(document.getElementById('chart-category'), {
        type: 'doughnut',
        data: { labels: [], datasets: [{ 
            data: [], backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
            borderWidth: 0, hoverOffset: 15
        }] },
        options: { ...commonOptions, cutout: '70%' }
    });

    // 3. Vendors Horizontal Bar
    state.charts.vendors = new Chart(document.getElementById('chart-vendors'), {
        type: 'bar',
        data: { labels: [], datasets: [{ 
            label: 'Spend by Vendor (₹)', data: [], backgroundColor: '#6366f1', borderRadius: 6
        }] },
        options: { ...commonOptions, indexAxis: 'y' }
    });

    // 4. Status Pie
    state.charts.status = new Chart(document.getElementById('chart-status'), {
        type: 'pie',
        data: { labels: ['Processed', 'Flagged', 'Pending'], datasets: [{ 
            data: [0, 0, 0], backgroundColor: ['#10b981', '#ef4444', '#f59e0b'], borderWidth: 0
        }] },
        options: commonOptions
    });

    // 5. Comparison Bar
    state.charts.comparison = new Chart(document.getElementById('chart-comparison'), {
        type: 'bar',
        data: { labels: [], datasets: [{ 
            label: 'Current Period', data: [], backgroundColor: '#6366f1', borderRadius: 6
        }] },
        options: commonOptions
    });

    // 6. Distribution Polar Area
    state.charts.distribution = new Chart(document.getElementById('chart-distribution'), {
        type: 'polarArea',
        data: { labels: [], datasets: [{ 
            data: [], backgroundColor: ['rgba(99, 102, 241, 0.7)', 'rgba(16, 185, 129, 0.7)', 'rgba(245, 158, 11, 0.7)'],
            borderWidth: 0
        }] },
        options: { ...commonOptions, scales: { r: { grid: { color: 'rgba(226, 232, 240, 0.5)' } } } }
    });
}

function updateReports() {
    if (state.results.length === 0) return;

    // 1. Summary Metrics
    const totalSpend = state.results.reduce((sum, r) => sum + parseAmount(r.total), 0);
    const avgInvoice = totalSpend / state.results.length;

    DOM.reportTotalSpend.textContent = `₹${totalSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    DOM.reportAvgInvoice.textContent = `₹${avgInvoice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    DOM.reportTotalCount.textContent = state.results.length;

    // 2. Category Breakdown
    const catMap = {};
    state.results.forEach(r => {
        const cat = r.category || 'Other';
        catMap[cat] = (catMap[cat] || 0) + parseAmount(r.total);
    });
    state.charts.category.data.labels = Object.keys(catMap);
    state.charts.category.data.datasets[0].data = Object.values(catMap);
    state.charts.category.update();

    // 3. Trend Data
    const trendMap = {};
    state.results.forEach(r => {
        const date = r.date || 'Unknown';
        trendMap[date] = (trendMap[date] || 0) + parseAmount(r.total);
    });
    const sortedDates = Object.keys(trendMap).sort();
    state.charts.trend.data.labels = sortedDates;
    state.charts.trend.data.datasets[0].data = sortedDates.map(d => trendMap[d]);
    state.charts.trend.update();

    // 4. Vendor Data
    const vendorMap = {};
    state.results.forEach(r => {
        const v = r.vendor || 'Unknown';
        vendorMap[v] = (vendorMap[v] || 0) + parseAmount(r.total);
    });
    const sortedVendors = Object.entries(vendorMap).sort((a,b) => b[1]-a[1]).slice(0, 5);
    state.charts.vendors.data.labels = sortedVendors.map(v => v[0]);
    state.charts.vendors.data.datasets[0].data = sortedVendors.map(v => v[1]);
    state.charts.vendors.update();

    // 5. Status Data
    state.charts.status.data.datasets[0].data = [state.results.length, 0, 0];
    state.charts.status.update();

    // 6. Comparison & Distribution
    state.charts.comparison.data.labels = sortedDates.slice(-5);
    state.charts.comparison.data.datasets[0].data = sortedDates.slice(-5).map(d => trendMap[d]);
    state.charts.comparison.update();

    state.charts.distribution.data.labels = Object.keys(catMap).slice(0, 3);
    state.charts.distribution.data.datasets[0].data = Object.values(catMap).slice(0, 3);
    state.charts.distribution.update();
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
