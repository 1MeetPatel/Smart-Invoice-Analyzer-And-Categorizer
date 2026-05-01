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
    charts: {},
    resultsDirty: true,
    reportsDirty: true
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

    // Click to upload
    DOM.uploadZone.addEventListener('click', () => {
        DOM.fileInput.click();
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
                setTimeout(() => updateReports(), 50);
            } else if (page === 'all-invoices') {
                setTimeout(() => renderResults(), 50);
            }
            
            updateNavIndicator();
        });
    });

    // Initial positioning
    window.addEventListener('load', () => setTimeout(updateNavIndicator, 100));
    window.addEventListener('resize', updateNavIndicator);
}

function updateNavIndicator() {
    const activeLink = document.querySelector('.header-nav-link.active');
    const indicator = document.getElementById('nav-indicator');
    
    if (activeLink && indicator) {
        indicator.style.width = `${activeLink.offsetWidth}px`;
        indicator.style.height = `${activeLink.offsetHeight}px`;
        indicator.style.transform = `translateX(${activeLink.offsetLeft}px)`;
    }
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
        state.resultsDirty = true;
        state.reportsDirty = true;
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
    if (!state.resultsDirty) return;

    // Render Full Table
    DOM.resultsBody.innerHTML = '';
    state.results.forEach((record, index) => {
        DOM.resultsBody.appendChild(createRow(record, index));
    });

    state.resultsDirty = false;
}

function createRow(record, index) {
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td>${escapeHtml(record.invoice_number || 'N/A')}</td>
        <td>${escapeHtml(record.date || 'N/A')}</td>
        <td style="font-weight: 500; color: var(--text-primary);">${escapeHtml(record.product || 'Various Products')}</td>
        <td style="font-weight: 800; color: var(--accent-color);">${parseFloat(record.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td style="color: var(--text-secondary);">${parseFloat(record.tax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td style="font-size: 0.85rem; color: var(--text-secondary); font-family: monospace;">${escapeHtml(record.tax_id || 'N/A')}</td>
        <td style="font-size: 0.85rem; color: var(--text-secondary); font-family: monospace;">${escapeHtml(record.buyer_id || 'N/A')}</td>
        <td><span class="status-badge badge-processed">Processed</span></td>
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
// ========================
function initCharts() {
    // Global Chart.js Defaults for Smoothness
    Chart.defaults.animation.duration = 1500;
    Chart.defaults.animation.easing = 'easeOutQuart';
    Chart.defaults.font.family = "'Inter', sans-serif";
    
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1e293b',
                titleColor: '#f8fafc',
                bodyColor: '#94a3b8',
                borderColor: '#334155',
                borderWidth: 1,
                padding: 12,
                displayColors: false
            }
        }
    };

    // 1. Expenditure Trend Chart (Area Chart)
    state.charts.trend = new Chart(document.getElementById('chart-spending-trend'), {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Expenditure',
                data: [0, 0, 0, 0, 0, 0],
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#6366f1'
            }]
        },
        options: {
            ...commonOptions,
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });

    // 2. Category Donut Chart
    state.charts.category = new Chart(document.getElementById('chart-category-donut'), {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: ['#6366f1', '#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
                borderWidth: 0,
                hoverOffset: 15
            }]
        },
        options: {
            ...commonOptions,
            cutout: '70%',
            plugins: {
                ...commonOptions.plugins,
                legend: { display: true, position: 'bottom', labels: { color: '#94a3b8', usePointStyle: true, padding: 20 } }
            }
        }
    });

    // 3. Tax Efficiency (Stacked Bar Chart)
    state.charts.tax = new Chart(document.getElementById('chart-tax-efficiency'), {
        type: 'bar',
        data: {
            labels: ['Net Amount', 'Tax Amount'],
            datasets: [{
                data: [0, 0],
                backgroundColor: ['#6366f1', '#ef4444'],
                borderRadius: 8
            }]
        },
        options: {
            ...commonOptions,
            scales: {
                y: { display: false },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });

    // 4. Top Vendors Horizontal Bar Chart
    state.charts.vendors = new Chart(document.getElementById('chart-vendor-bars'), {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Total Spend',
                data: [],
                backgroundColor: 'rgba(99, 102, 241, 0.8)',
                borderRadius: 4
            }]
        },
        options: {
            ...commonOptions,
            indexAxis: 'y',
            scales: {
                x: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
                y: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });

    // 5. Expense by Department (Horizontal Bar)
    state.charts.departments = new Chart(document.getElementById('chart-department-bars'), {
        type: 'bar',
        data: {
            labels: ['Sales', 'Marketing', 'Operations', 'Finance', 'HR'],
            datasets: [{
                data: [0, 0, 0, 0, 0],
                backgroundColor: 'rgba(99, 102, 241, 0.8)',
                borderRadius: 6,
                barThickness: 24
            }]
        },
        options: {
            ...commonOptions,
            indexAxis: 'y',
            scales: {
                x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.03)' }, ticks: { color: '#94a3b8' } },
                y: { grid: { display: false }, ticks: { color: '#475569', font: { weight: '600' } } }
            }
        }
    });
}

function updateReports() {
    if (!state.reportsDirty && state.results.length > 0) return;

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
    const catMap = {};
    const vendorMap = {};
    const monthlySpend = Array(12).fill(0); // Jan to Dec
    
    const deptMap = { 'Sales': 0, 'Marketing': 0, 'Operations': 0, 'Finance': 0, 'HR': 0 };
    const heatmapData = {};
    ['Sales', 'Marketing', 'Operations', 'Finance', 'HR'].forEach(d => heatmapData[d] = Array(12).fill(0));

    state.results.forEach(r => {
        const amt = parseAmount(r.total);
        const tax = parseAmount(r.tax);
        const conf = parseFloat(r.confidence || 0.95);

        totalSpend += amt;
        totalTax += tax;
        totalConf += conf;

        const cat = r.category || 'Other';
        catMap[cat] = (catMap[cat] || 0) + amt;

        const dept = getDepartment(cat);
        deptMap[dept] += amt;

        const vend = r.vendor || 'Unknown';
        vendorMap[vend] = (vendorMap[vend] || { amt: 0, count: 0 });
        vendorMap[vend].amt += amt;
        vendorMap[vend].count += 1;

        // Extract month for trend and heatmap
        if (r.date) {
            const dateParts = r.date.split('/');
            if (dateParts.length >= 2) {
                const monthIdx = parseInt(dateParts[0]) - 1; // Assume MM/DD/YYYY
                if (monthIdx >= 0 && monthIdx < 12) {
                    monthlySpend[monthIdx] += amt;
                    heatmapData[dept][monthIdx] += amt;
                }
            }
        }
    });

    const avgConf = ((totalConf / state.results.length) * 100).toFixed(0);
    const avgInvoice = state.results.length > 0 ? (totalSpend / state.results.length) : 0;

    // 2. Hero UI
    DOM.pulseTotal.textContent = `₹ ${totalSpend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    DOM.pulseTax.textContent = `₹ ${totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById('pulse-avg').textContent = `₹ ${avgInvoice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    DOM.pulseConfidence.textContent = avgConf;
    document.getElementById('total-count-label').textContent = `Across ${state.results.length} invoices`;

    // 3. Update Charts
    // Spending Trend
    state.charts.trend.data.datasets[0].data = monthlySpend;
    state.charts.trend.update();

    // Category Donut
    const catLabels = Object.keys(catMap);
    const catVals = catLabels.map(l => catMap[l]);
    state.charts.category.data.labels = catLabels;
    state.charts.category.data.datasets[0].data = catVals;
    state.charts.category.update();

    // Tax Efficiency
    state.charts.tax.data.datasets[0].data = [totalSpend - totalTax, totalTax];
    state.charts.tax.update();

    // Top Vendors
    const topVendors = Object.entries(vendorMap)
        .sort((a,b) => b[1].amt - a[1].amt)
        .slice(0, 5);
    
    state.charts.vendors.data.labels = topVendors.map(v => v[0]);
    state.charts.vendors.data.datasets[0].data = topVendors.map(v => v[1].amt);
    state.charts.vendors.update();

    // Department Chart
    state.charts.departments.data.datasets[0].data = ['Sales', 'Marketing', 'Operations', 'Finance', 'HR'].map(d => deptMap[d]);
    state.charts.departments.update();

    // Heatmap
    renderHeatmap(heatmapData);
    
    state.reportsDirty = false;
}

function getDepartment(category) {
    const cat = (category || '').toLowerCase();
    if (cat.includes('sales')) return 'Sales';
    if (cat.includes('marketing') || cat.includes('advertis')) return 'Marketing';
    if (cat.includes('it') || cat.includes('software') || cat.includes('utilit') || cat.includes('travel')) return 'Operations';
    if (cat.includes('office') || cat.includes('supplies') || cat.includes('profess')) return 'Finance';
    return 'HR';
}

function renderHeatmap(data) {
    const container = document.getElementById('expense-heatmap');
    if (!container) return;
    container.innerHTML = '';

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const depts = ['Marketing', 'Operations', 'Sales', 'Finance', 'HR'];
    
    // Create Main Grid Wrapper (to separate from Legend)
    const heatmapMain = document.createElement('div');
    heatmapMain.className = 'heatmap-main-content';

    // Find max value for scaling colors
    let maxVal = 0;
    depts.forEach(d => {
        if (data[d]) {
            data[d].forEach(v => { if(v > maxVal) maxVal = v; });
        }
    });
    if (maxVal === 0) maxVal = 1;

    // 1. Grid Rows
    depts.forEach(dept => {
        const row = document.createElement('div');
        row.className = 'heatmap-row';
        
        const label = document.createElement('div');
        label.className = 'heatmap-label';
        label.textContent = dept;
        row.appendChild(label);

        const cells = document.createElement('div');
        cells.className = 'heatmap-cells';

        const deptData = data[dept] || Array(12).fill(0);
        data[dept].forEach((val, idx) => {
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            
            // Calculate opacity based on value
            const opacity = val === 0 ? 0.03 : 0.1 + (val / maxVal) * 0.9;
            cell.style.backgroundColor = `rgba(99, 102, 241, ${opacity})`;
            
            // Custom Tooltip Events
            cell.addEventListener('mouseenter', (e) => {
                const tooltip = document.getElementById('heatmap-tooltip');
                if (!tooltip) return;
                
                const amount = val > 0 ? val.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : 'No data';
                tooltip.innerHTML = `<strong>${dept}</strong><br>${amount}`;
                tooltip.style.opacity = '1';
                tooltip.style.visibility = 'visible';
            });

            cell.addEventListener('mousemove', (e) => {
                const tooltip = document.getElementById('heatmap-tooltip');
                if (!tooltip) return;
                
                const x = e.pageX + 15;
                const y = e.pageY - 40;
                tooltip.style.left = `${x}px`;
                tooltip.style.top = `${y}px`;
            });

            cell.addEventListener('mouseleave', () => {
                const tooltip = document.getElementById('heatmap-tooltip');
                if (tooltip) {
                    tooltip.style.opacity = '0';
                    tooltip.style.visibility = 'hidden';
                }
            });
            
            cells.appendChild(cell);
        });

        row.appendChild(cells);
        heatmapMain.appendChild(row);
    });

    // 2. Month Labels at Bottom
    const monthRow = document.createElement('div');
    monthRow.className = 'heatmap-months-row';
    months.forEach(m => {
        const tag = document.createElement('div');
        tag.className = 'heatmap-month-tag';
        tag.textContent = m;
        monthRow.appendChild(tag);
    });
    heatmapMain.appendChild(monthRow);

    container.appendChild(heatmapMain);

    // 3. Legend on the right
    const legend = document.createElement('div');
    legend.className = 'heatmap-legend';
    legend.innerHTML = `
        <span class="legend-text">High</span>
        <div class="legend-bar"></div>
        <span class="legend-text">Low</span>
    `;
    container.appendChild(legend);
}

function parseAmount(amt) {
    if (!amt) return 0;
    const val = parseFloat(amt.toString().replace(/[^0-9.]/g, ''));
    return isNaN(val) ? 0 : val;
}



window.deleteRow = function(index) {
    state.results.splice(index, 1);
    state.resultsDirty = true;
    state.reportsDirty = true;
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

window.showPage = function(page) {
    const link = document.querySelector(`.header-nav-link[data-page="${page}"]`);
    if (link) link.click();
};

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}


