/**
 * Invocify — Frontend Application
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
let DOM = {};

// ========================
// Initialization
// ========================
document.addEventListener('DOMContentLoaded', () => {
    // Populate DOM References
    DOM = {
        uploadZone: document.getElementById('upload-zone'),
        fileInput: document.getElementById('file-input'),
        processingSection: document.getElementById('processing-section'),
        processingStatus: document.getElementById('processing-status'),
        resultsBody: document.getElementById('results-body'),
        exportCsvBtn: document.getElementById('export-csv-btn'),
        navLinks: document.querySelectorAll('.header-nav-link'),
        pageViews: document.querySelectorAll('.page-view'),
        themeController: document.getElementById('theme-controller'),
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

    initUploadZone();
    initButtons();
    initNavigation();
    initTheme();
    initCharts();
    initProfile();
    checkHealth();
});

// ========================
// Theme Management
// ========================
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    // Apply initial theme instantly (no transition on first load)
    document.documentElement.setAttribute('data-theme', theme);

    if (DOM.themeController) {
        DOM.themeController.addEventListener('click', (e) => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

            window.isTransitioning = true;
            setTimeout(() => { window.isTransitioning = false; }, 350);

            // Get click origin for the ripple epicenter
            const rect = DOM.themeController.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;

            // Use View Transitions API if available (Chrome 111+)
            if (document.startViewTransition) {
                document.startViewTransition(() => {
                    document.documentElement.setAttribute('data-theme', newTheme);
                    localStorage.setItem('theme', newTheme);
                });
                // Update charts after transition
                setTimeout(() => updateChartTheme(newTheme), 400);
            } else {
                // Fallback: circular clip-path ripple from toggle center
                performThemeRipple(x, y, newTheme);
            }
        });
    }
}

function performThemeRipple(x, y, newTheme) {
    // Calculate max radius needed to cover the entire screen from origin
    const maxDim = Math.max(
        Math.hypot(x, y),
        Math.hypot(window.innerWidth - x, y),
        Math.hypot(x, window.innerHeight - y),
        Math.hypot(window.innerWidth - x, window.innerHeight - y)
    );

    const isDark = newTheme === 'dark';

    // Create ripple overlay
    const ripple = document.createElement('div');
    ripple.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100vw; height: 100vh;
        background: ${isDark ? '#0f172a' : '#f8fafc'};
        z-index: 9999;
        pointer-events: none;
        clip-path: circle(0px at ${x}px ${y}px);
        will-change: clip-path;
    `;
    document.body.appendChild(ripple);

    // Force reflow
    ripple.getBoundingClientRect();

    // Expand ripple to cover screen
    ripple.style.transition = `clip-path 0.55s cubic-bezier(0.4, 0, 0.2, 1)`;
    ripple.style.clipPath = `circle(${maxDim}px at ${x}px ${y}px)`;

    // At halfway point, swap the theme (hidden under the ripple)
    setTimeout(() => {
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateChartTheme(newTheme);
    }, 280);

    // Shrink ripple away from the other side to reveal new theme
    setTimeout(() => {
        ripple.style.transition = `clip-path 0.45s cubic-bezier(0.4, 0, 0.2, 1)`;
        ripple.style.clipPath = `circle(0px at ${x}px ${y}px)`;
        setTimeout(() => ripple.remove(), 460);
    }, 320);
}


function updateChartTheme(theme) {
    const textColor = theme === 'dark' ? '#f8fafc' : '#475569';
    const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0,0,0,0.05)';
    
    Chart.defaults.color = textColor;
    
    Object.values(state.charts).forEach(chart => {
        if (!chart) return;
        
        if (chart.options.scales) {
            if (chart.options.scales.x) {
                chart.options.scales.x.ticks.color = textColor;
                if (chart.options.scales.x.grid) chart.options.scales.x.grid.color = gridColor;
            }
            if (chart.options.scales.y) {
                chart.options.scales.y.ticks.color = textColor;
                if (chart.options.scales.y.grid) chart.options.scales.y.grid.color = gridColor;
            }
        }
        
        if (chart.options.plugins && chart.options.plugins.legend) {
            chart.options.plugins.legend.labels.color = textColor;
        }
        
        chart.update('none');
    });
}

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

            const currentActive = document.querySelector('.page-view.active');

            // Update active link immediately
            DOM.navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            updateNavIndicator();

            // Fade out old view, then swap
            if (currentActive) {
                currentActive.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
                currentActive.style.opacity = '0';
                currentActive.style.transform = 'translateY(-8px)';

                setTimeout(() => {
                    currentActive.style.transition = '';
                    currentActive.style.opacity = '';
                    currentActive.style.transform = '';
                    currentActive.classList.remove('active');

                    const nextView = document.getElementById(`${page}-view`);
                    if (nextView) nextView.classList.add('active');

                    if (page === 'reports') setTimeout(() => updateReports(), 50);
                    else if (page === 'all-invoices') setTimeout(() => renderResults(true), 50);
                }, 180);
            } else {
                DOM.pageViews.forEach(view => {
                    view.classList.remove('active');
                    if (view.id === `${page}-view`) view.classList.add('active');
                });
                if (page === 'reports') setTimeout(() => updateReports(), 50);
                else if (page === 'all-invoices') setTimeout(() => renderResults(true), 50);
            }
        });
    });

    // Initial indicator positioning: disable transition for first paint
    window.addEventListener('load', () => {
        const indicator = document.getElementById('nav-indicator');
        if (indicator) {
            indicator.style.transition = 'none';
            updateNavIndicator();
            // Re-enable transition after first position is set
            requestAnimationFrame(() => requestAnimationFrame(() => {
                indicator.style.transition = '';
            }));
        }
    });
    window.addEventListener('resize', updateNavIndicator);
}

function updateNavIndicator() {
    const activeLink = document.querySelector('.header-nav-link.active');
    const indicator = document.getElementById('nav-indicator');
    
    if (activeLink && indicator) {
        const linkRect = activeLink.getBoundingClientRect();
        const navRect = activeLink.closest('.header-nav').getBoundingClientRect();
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
                state.results.unshift(res.data);
                successCount++;
                state.processedCount++;
            } else {
                showToast(`Failed: ${res ? res.message : 'Unknown server error'}`, 'error');
            }
        } catch (err) {
            console.error("Processing error:", err);
            showToast(`Error: ${files[i].name}`, 'error');
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

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData,
        });

        return await response.json();
    } catch (e) {
        return { status: 'error', message: e.message };
    }
}

// ========================
// Results Rendering
// ========================
// ========================
// Results Rendering
// ========================
function renderResults(force = false) {
    console.log("Rendering results. Force:", force, "Dirty:", state.resultsDirty, "Count:", state.results.length);
    if (!state.resultsDirty && !force) return;

    if (!DOM.resultsBody) {
        console.error("DOM.resultsBody not found!");
        return;
    }

    // Render Full Table
    DOM.resultsBody.innerHTML = '';
    
    if (state.results.length === 0) {
        DOM.resultsBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px; color: var(--text-secondary);">No invoices processed yet.</td></tr>';
    } else {
        state.results.forEach((record, index) => {
            const row = createRow(record, index);
            // Staggered entrance: each row fades in 50ms after the previous
            row.style.animationDelay = `${index * 45}ms`;
            row.classList.add('fade-in-row');
            DOM.resultsBody.appendChild(row);
        });
    }

    state.resultsDirty = false;
}

function createRow(record, index) {
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td>${escapeHtml(record.invoice_number || 'N/A')}</td>
        <td>${escapeHtml(record.date || 'N/A')}</td>
        <td style="font-weight: 500; color: var(--text-primary);">${escapeHtml(record.product || 'Various Products')}</td>
        <td style="font-weight: 800; color: var(--accent-color);">${formatCurrency(record.total)}</td>
        <td style="color: var(--text-secondary);">${formatCurrency(record.tax)}</td>
        <td style="font-size: 0.85rem; color: var(--text-secondary); font-family: monospace;">${escapeHtml(record.tax_id || 'N/A')}</td>
        <td style="font-size: 0.85rem; color: var(--text-secondary); font-family: monospace;">${escapeHtml(record.buyer_id || 'N/A')}</td>
        <td><span class="status-badge badge-processed">Processed</span></td>
        <td>
            <div class="action-links">
                <span class="action-link" onclick="deleteRow(${index})" title="Delete" style="color: #ef4444; cursor: pointer;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </span>
            </div>
        </td>
    `;
    return row;
}

function formatCurrency(val) {
    const num = parseFloat(val || 0);
    if (isNaN(num)) return '0.00';
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.deleteRow = function(index) {
    if (confirm('Delete this record?')) {
        state.results.splice(index, 1);
        state.resultsDirty = true;
        state.reportsDirty = true;
        renderResults();
        updateReports();
        showToast('Record deleted', 'info');
    }
};

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
// Dynamic Absolute Stack Engine for Extreme Smoothness
let activeToasts = [];

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // Add to our tracking stack (at the top)
    activeToasts.unshift(toast);
    container.appendChild(toast);
    
    // Position and Animate
    updateToastPositions(true);
    
    // Auto-dismiss
    setTimeout(() => {
        dismissToast(toast);
    }, 3000);
}

function dismissToast(toast) {
    const index = activeToasts.indexOf(toast);
    if (index === -1) return;
    
    // Remove from tracking first
    activeToasts.splice(index, 1);
    
    // Animate the target toast away
    const exit = toast.animate([
        { transform: toast.style.transform + ' scale(1)', opacity: 1 },
        { transform: 'translateY(-100px) scale(0.95)', opacity: 0 }
    ], {
        duration: 600,
        easing: 'cubic-bezier(0.2, 1, 0.2, 1)',
        fill: 'forwards'
    });
    
    // Immediately glide the rest of the stack into their new positions
    updateToastPositions(false);
    
    exit.onfinish = () => toast.remove();
}

function updateToastPositions(isNew = false) {
    let currentY = 0;
    
    activeToasts.forEach((toast, i) => {
        const isTarget = isNew && i === 0;
        const startTransform = isTarget ? 'translateY(-100px) scale(0.95)' : toast.style.transform || 'translateY(0px)';
        const targetY = currentY;
        const targetTransform = `translateY(${targetY}px) scale(1)`;
        
        toast.animate([
            { transform: startTransform, opacity: isTarget ? 0 : 1 },
            { transform: targetTransform, opacity: 1 }
        ], {
            duration: 700,
            easing: 'cubic-bezier(0.2, 1, 0.2, 1)',
            fill: 'forwards'
        });
        
        // Update the style property so we can track the "Last" position for the next animation
        toast.style.transform = targetTransform;
        
        // Offset by height + gap for the next toast below
        currentY += 56; // Standard pill height estimate
    });
}

window.showPage = function(page) {
    const link = document.querySelector(`.header-nav-link[data-page="${page}"]`);
    if (link) link.click();
};


// ========================
// Profile Management
// ========================
function initProfile() {
    const profileTrigger = document.getElementById('profile-trigger');
    const profileModal = document.getElementById('profile-modal');
    const closeBtn = document.getElementById('close-profile-modal');
    const uploadBtn = document.getElementById('btn-upload-avatar');
    const imageInput = document.getElementById('profile-image-input');
    const imagePreview = document.getElementById('image-preview');
    const nameInput = document.getElementById('user-name-input');
    const saveBtn = document.getElementById('save-profile-btn');
    const avatarContainer = document.getElementById('profile-avatar-container');

    // Load saved profile
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) {
        const data = JSON.parse(savedProfile);
        if (data.name) nameInput.value = data.name;
        if (data.avatar) updateAvatarUI(data.avatar);
    }

    // Pure CSS-transition-driven open/close (smoothest possible)
    const openModal = () => {
        profileModal.classList.add('active');
    };

    const closeModal = () => {
        // Reverse the CSS transition, then remove .active after it finishes
        const modalContent = profileModal.querySelector('.modal-content');
        modalContent.style.transition = 'transform 0.22s cubic-bezier(0.4, 0, 1, 1), opacity 0.2s ease';
        modalContent.style.transform = 'translateY(16px) scale(0.97)';
        modalContent.style.opacity = '0';
        profileModal.style.transition = 'background 0.22s ease';
        profileModal.style.background = 'rgba(15, 23, 42, 0.0)';
        profileModal.style.pointerEvents = 'none';

        setTimeout(() => {
            profileModal.classList.remove('active');
            // Reset inline styles so CSS classes take over next open
            modalContent.style.transition = '';
            modalContent.style.transform = '';
            modalContent.style.opacity = '';
            profileModal.style.transition = '';
            profileModal.style.background = '';
            profileModal.style.pointerEvents = '';
        }, 230);
    };

    profileTrigger.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);

    // Close on backdrop click
    profileModal.addEventListener('click', (e) => {
        if (e.target === profileModal) closeModal();
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && profileModal.classList.contains('active')) closeModal();
    });

    // Image Upload Logic
    uploadBtn.addEventListener('click', () => imageInput.click());

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64Image = event.target.result;
                imagePreview.innerHTML = `<img src="${base64Image}" alt="Preview">`;
            };
            reader.readAsDataURL(file);
        }
    });

    // Save Logic
    saveBtn.addEventListener('click', () => {
        const name = nameInput.value.trim();
        const previewImg = imagePreview.querySelector('img');
        const avatar = previewImg ? previewImg.src : null;

        const profileData = { name, avatar };
        localStorage.setItem('userProfile', JSON.stringify(profileData));
        
        if (avatar) updateAvatarUI(avatar);
        
        showToast('Profile updated successfully!', 'success');
        closeModal();
    });

    function updateAvatarUI(src) {
        avatarContainer.innerHTML = `<img src="${src}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        imagePreview.innerHTML = `<img src="${src}" alt="Preview">`;
    }
}


