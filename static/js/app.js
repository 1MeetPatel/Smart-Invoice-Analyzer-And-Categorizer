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
    processedCount: 0
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
    statProcessed: document.getElementById('stat-processed'),
    statDone: document.getElementById('stat-done'),
    statCategories: document.getElementById('stat-categories'),
    statTotal: document.getElementById('stat-total'),
};

// ========================
// Initialization
// ========================
document.addEventListener('DOMContentLoaded', () => {
    initUploadZone();
    initButtons();
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
        updateStats();
        showToast(`Processed ${successCount} file(s)`, 'success');
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
    DOM.resultsBody.innerHTML = '';

    state.results.forEach((record, index) => {
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
                    <span class="action-link" onclick="viewRawText(${index})" title="View Raw Text">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    </span>
                    <span class="action-link" onclick="deleteRow(${index})" title="Delete" style="color: #ef4444;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </span>
                </div>
            </td>
        `;
        DOM.resultsBody.appendChild(row);
    });
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

function updateStats() {
    DOM.statProcessed.textContent = state.processedCount;
    DOM.statDone.textContent = state.results.length;

    const categories = new Set(state.results.map(r => r.category));
    DOM.statCategories.textContent = categories.size;

    const total = state.results.reduce((sum, r) => {
        const val = parseFloat((r.total || '0').toString().replace(/[^0-9.]/g, ''));
        return sum + (isNaN(val) ? 0 : val);
    }, 0);
    DOM.statTotal.textContent = `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

window.deleteRow = function(index) {
    state.results.splice(index, 1);
    renderResults();
    updateStats();
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
