document.addEventListener('DOMContentLoaded', () => {
    // Current application state
    const state = {
        activeTab: 'upload',
        datasetUploaded: false,
        columns: [],
        numericCols: [],
        catCols: [],
        chartInstance: null,
        forecastChartInstance: null,
        token: null,
        username: null,
        role: null
    };

    const API_BASE = '/api';

    // UI Elements
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');
    
    // Upload Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const uploadProgressContainer = document.getElementById('upload-progress-container');
    const uploadProgressFill = document.getElementById('upload-progress-fill');
    const progressPercent = document.getElementById('progress-percent');
    const progressStatus = document.getElementById('progress-status');
    const uploadStatsGrid = document.getElementById('upload-stats-grid');
    const dataDetailsGrid = document.getElementById('data-details-grid');

    // Tab Navigation logic
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = item.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    function switchTab(tabName) {
        if (tabName !== 'upload' && !state.datasetUploaded && tabName !== 'admin') {
            alert('Please upload a dataset first!');
            return;
        }

        state.activeTab = tabName;

        // Update nav UI
        navItems.forEach(nav => {
            if (nav.getAttribute('data-tab') === tabName) {
                nav.classList.add('active');
            } else {
                nav.classList.remove('active');
            }
        });

        // Update tab screens
        tabContents.forEach(content => {
            if (content.id === `tab-${tabName}`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });

        // Update titles
        updateTitles(tabName);

        // Load data if switching to specific tabs
        if (tabName === 'dashboard' || tabName === 'chat') {
            loadDashboard();
        } else if (tabName === 'admin') {
            loadAdminPanel();
        }
    }

    function updateTitles(tabName) {
        const titles = {
            upload: {
                title: 'Upload & Clean',
                subtitle: 'Upload your dataset to start the AI cleaning and analytics pipeline'
            },
            dashboard: {
                title: 'Exploratory Dashboard',
                subtitle: 'Interact with visual breakdowns, correlation maps, and forecasts'
            },
            chat: {
                title: 'AI Data Analyst',
                subtitle: 'Ask natural language questions about your dataset trends and anomalies'
            },
            report: {
                title: 'Executive Report',
                subtitle: 'Generate a comprehensive, AI-written intelligence summary of your data'
            },
            admin: {
                title: 'Admin Control Panel',
                subtitle: 'Manage user access accounts, view audit trails, and cleanup disk storage'
            }
        };

        pageTitle.textContent = titles[tabName].title;
        pageSubtitle.textContent = titles[tabName].subtitle;
    }

    // --- FILE UPLOAD LOGIC ---
    
    // Drag and Drop listeners
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (fileInput.files.length > 0) {
            handleFileUpload(fileInput.files[0]);
        }
    });

    function handleFileUpload(file) {
        const formData = new FormData();
        formData.append('file', file);

        // UI Reset and show loader
        uploadProgressContainer.style.display = 'block';
        uploadStatsGrid.style.display = 'none';
        dataDetailsGrid.style.display = 'none';

        // Simulate progress up to 90%
        let progress = 0;
        const interval = setInterval(() => {
            if (progress < 85) {
                progress += Math.floor(Math.random() * 15) + 5;
                updateProgressBar(progress, 'Processing and cleaning dataset...');
            }
        }, 150);

        fetch(`${API_BASE}/upload`, {
            method: 'POST',
            headers: { 'Authorization': state.token },
            body: formData
        })
        .then(res => {
            if (!res.ok) throw new Error('Upload failed');
            return res.json();
        })
        .then(data => {
            clearInterval(interval);
            updateProgressBar(100, 'Success! Cleaning complete.');

            setTimeout(() => {
                state.datasetUploaded = true;
                state.columns = Object.keys(data.dtypes);
                
                // Populate metrics
                document.getElementById('val-rows').textContent = data.rows.toLocaleString();
                document.getElementById('val-cols').textContent = data.columns;
                document.getElementById('val-dupes').textContent = data.duplicates_removed;
                document.getElementById('val-missing').textContent = Object.keys(data.missing_fixed).length;

                // Populate missing list
                const missingList = document.getElementById('missing-values-list');
                missingList.innerHTML = '';
                const missingCount = Object.keys(data.missing_fixed).length;
                
                if (missingCount === 0) {
                    missingList.innerHTML = '<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> No missing values found!</span>';
                } else {
                    for (const [col, count] of Object.entries(data.missing_fixed)) {
                        missingList.innerHTML += `<span class="badge badge-danger"><i class="fa-solid fa-circle-exclamation"></i> ${col}: filled ${count} blanks</span>`;
                    }
                }

                // Populate schema/dtypes table
                const dtypesTableBody = document.querySelector('#dtypes-table tbody');
                dtypesTableBody.innerHTML = '';
                for (const [col, dtype] of Object.entries(data.dtypes)) {
                    let typeBadgeClass = 'badge';
                    if (dtype.includes('int') || dtype.includes('float')) {
                        typeBadgeClass += ' badge-success'; // Numeric
                    }
                    dtypesTableBody.innerHTML += `
                        <tr>
                            <td><strong>${col}</strong></td>
                            <td><span class="${typeBadgeClass}">${dtype}</span></td>
                        </tr>
                    `;
                }

                // Show results
                uploadProgressContainer.style.display = 'none';
                uploadStatsGrid.style.display = 'grid';
                dataDetailsGrid.style.display = 'grid';

                // Update dropzone content to show success details
                document.querySelector('#drop-zone .drop-zone-icon').innerHTML = '<i class="fa-solid fa-circle-check" style="color:var(--accent-emerald); filter: drop-shadow(0 0 10px rgba(16,185,129,0.4))"></i>';
                document.querySelector('#drop-zone h3').textContent = 'File Uploaded & Cleaned Successfully!';
                document.querySelector('#drop-zone h3').style.color = '#a7f3d0';
                document.querySelector('#drop-zone p').innerHTML = `Active dataset: <strong>${file.name}</strong>`;
                document.querySelector('#drop-zone button').innerHTML = '<i class="fa-solid fa-rotate"></i> Upload Different File';
                document.querySelector('#drop-zone button').className = 'btn btn-secondary';

                // Automatically load dashboard metadata and suggestions
                loadDashboard();
            }, 500);
        })
        .catch(err => {
            clearInterval(interval);
            updateProgressBar(0, '');
            uploadProgressContainer.style.display = 'none';
            alert(`Error uploading file: ${err.message}`);
        });
    }

    function updateProgressBar(value, statusText) {
        uploadProgressFill.style.width = `${value}%`;
        progressPercent.textContent = `${value}%`;
        if (statusText) progressStatus.textContent = statusText;
    }

    // --- DASHBOARD AND ANALYSIS LOGIC ---
    
    document.getElementById('refresh-dashboard').addEventListener('click', () => {
        loadDashboard();
    });

    function loadDashboard() {
        // Clear previous state if refreshing
        const edaTableHead = document.querySelector('#eda-summary-table thead');
        const edaTableBody = document.querySelector('#eda-summary-table tbody');
        edaTableHead.innerHTML = '<tr><th>Loading summary statistics...</th></tr>';
        edaTableBody.innerHTML = '';

        fetch(`${API_BASE}/analyze`, {
            headers: { 'Authorization': state.token }
        })
        .then(res => res.json())
        .then(data => {
            const eda = data.eda;
            
            // Build types arrays
            state.numericCols = [];
            state.catCols = [];
            for (const [col, dtype] of Object.entries(eda.dtypes)) {
                if (dtype.includes('int') || dtype.includes('float') || dtype.includes('number')) {
                    state.numericCols.push(col);
                } else if (dtype.includes('object') || dtype.includes('category') || dtype.includes('bool')) {
                    state.catCols.push(col);
                }
            }

            // Fallbacks if lists are empty
            if (state.numericCols.length === 0) {
                state.numericCols = eda.columns;
            }
            if (state.catCols.length === 0) {
                state.catCols = eda.columns;
            }

            // 1. Build descriptive summary table
            renderEdaTable(eda.stats);

            // 2. Setup Category breakdown controls and initial render
            setupCategoryControls();

            // 3. Render Correlation Heatmap
            renderCorrelationHeatmap(eda.correlations);

            // 4. Render Forecast details
            renderForecast(data.forecast);

            // 5. Render business executive summaries
            renderBusinessInsights(eda, data.forecast);

            // 6. Setup Plotly iframe visual gallery
            renderPlotlyGallery(data.charts);

            // 7. Render dynamic AI suggestions in chat screen
            renderSuggestions(data.suggestions);
        })
        .catch(err => {
            console.error(err);
            alert('Failed to load analysis dashboard.');
        });
    }

    function renderEdaTable(stats) {
        const edaTableHead = document.querySelector('#eda-summary-table thead');
        const edaTableBody = document.querySelector('#eda-summary-table tbody');
        edaTableHead.innerHTML = '';
        edaTableBody.innerHTML = '';

        if (!stats) {
            edaTableHead.innerHTML = '<tr><th>No numerical columns available.</th></tr>';
            return;
        }

        // stats keys: count, mean, std, min, 25%, 50%, 75%, max
        const statKeys = ['count', 'mean', 'std', 'min', '25%', '50%', '75%', 'max'];
        const cols = Object.keys(stats);

        // Header
        let headHtml = '<tr><th>Statistic</th>';
        cols.forEach(col => {
            headHtml += `<th>${col}</th>`;
        });
        headHtml += '</tr>';
        edaTableHead.innerHTML = headHtml;

        // Rows
        statKeys.forEach(statKey => {
            let rowHtml = `<tr><td><strong>${statKey}</strong></td>`;
            cols.forEach(col => {
                const val = stats[col][statKey] !== undefined ? stats[col][statKey] : '-';
                rowHtml += `<td>${typeof val === 'number' ? val.toLocaleString() : val}</td>`;
            });
            rowHtml += '</tr>';
            edaTableBody.innerHTML += rowHtml;
        });
    }

    function setupCategoryControls() {
        const catSelect = document.getElementById('select-cat-col');
        const numSelect = document.getElementById('select-num-col');

        catSelect.innerHTML = '';
        numSelect.innerHTML = '';

        if (state.catCols.length === 0) {
            catSelect.innerHTML = '<option value="">No categories</option>';
        } else {
            state.catCols.forEach(col => {
                catSelect.innerHTML += `<option value="${col}">${col}</option>`;
            });
        }

        state.numericCols.forEach(col => {
            numSelect.innerHTML += `<option value="${col}">${col}</option>`;
        });

        // Set up change listeners
        catSelect.onchange = updateCategoryChart;
        numSelect.onchange = updateCategoryChart;

        // Initial draw
        updateCategoryChart();
    }

    function updateCategoryChart() {
        const catCol = document.getElementById('select-cat-col').value;
        const numCol = document.getElementById('select-num-col').value;

        if (!catCol || !numCol) return;

        fetch(`${API_BASE}/groupby?cat_col=${encodeURIComponent(catCol)}&num_col=${encodeURIComponent(numCol)}`, {
            headers: { 'Authorization': state.token }
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) throw new Error(data.error);

            const ctx = document.getElementById('category-chart').getContext('2d');
            
            // Destroy previous chart
            if (state.chartInstance) {
                state.chartInstance.destroy();
            }

            // Create gradient
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, '#00f2fe');
            gradient.addColorStop(1, '#4facfe');

            state.chartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: `${numCol} total`,
                        data: data.values,
                        backgroundColor: gradient,
                        borderColor: '#00f2fe',
                        borderWidth: 1,
                        borderRadius: 6,
                        barThickness: 24
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: '#0b0f19',
                            titleColor: '#fff',
                            bodyColor: '#e2e8f0',
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                            borderWidth: 1,
                            padding: 10
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { color: '#94a3b8' }
                        },
                        y: {
                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
                            ticks: { color: '#94a3b8' }
                        }
                    }
                }
            });

            // Update plain English business insight for category distribution
            const topCategory = data.labels && data.labels[0] ? data.labels[0] : 'None';
            const topValue = data.values && data.values[0] ? data.values[0] : 0;
            document.getElementById('insight-dist').innerHTML = `<i class="fa-solid fa-chart-bar"></i> Dynamic check: Category <strong>"${topCategory}"</strong> has the highest volume of <strong>"${numCol}"</strong> at <strong>${topValue.toLocaleString()}</strong>. Select other keys below to update values.`;
        })
        .catch(err => {
            console.error(err);
        });
    }

    function renderCorrelationHeatmap(correlations) {
        const container = document.getElementById('heatmap-container');
        container.innerHTML = '';

        if (!correlations) {
            container.innerHTML = '<p class="text-center" style="color:var(--text-muted)">Need at least 2 numerical columns for a correlation heatmap.</p>';
            return;
        }

        const cols = Object.keys(correlations);
        
        // 1. Render column headers
        const headerRow = document.createElement('div');
        headerRow.className = 'heatmap-header-labels';
        cols.forEach(col => {
            const lbl = document.createElement('div');
            lbl.className = 'heatmap-header-label';
            lbl.textContent = col;
            lbl.title = col;
            headerRow.appendChild(lbl);
        });
        container.appendChild(headerRow);

        // 2. Render rows
        cols.forEach(rowCol => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'heatmap-row';

            // Row Label
            const rowLabel = document.createElement('div');
            rowLabel.className = 'heatmap-label';
            rowLabel.textContent = rowCol;
            rowLabel.title = rowCol;
            rowDiv.appendChild(rowLabel);

            // Cells
            cols.forEach(colCol => {
                const val = correlations[rowCol][colCol];
                const cell = document.createElement('div');
                cell.className = 'heatmap-cell';
                cell.textContent = val.toFixed(2);
                cell.setAttribute('data-tooltip', `${rowCol} x ${colCol}: ${val}`);

                // Map value (-1 to 1) to color scale (RdBu: Red negative, Blue positive)
                // Using HSLA or RGBA
                if (val >= 0) {
                    // Blue shade (positive correlation)
                    cell.style.backgroundColor = `rgba(14, 165, 233, ${val * 0.9 + 0.1})`;
                } else {
                    // Red shade (negative correlation)
                    cell.style.backgroundColor = `rgba(244, 63, 94, ${Math.abs(val) * 0.9 + 0.1})`;
                }

                rowDiv.appendChild(cell);
            });

            container.appendChild(rowDiv);
        });

        // 3. Render Correlation Legend / Explainer below the matrix cells
        const legendDiv = document.createElement('div');
        legendDiv.className = 'heatmap-legend';
        legendDiv.style.marginTop = '1.5rem';
        legendDiv.style.padding = '0.75rem';
        legendDiv.style.background = 'rgba(255, 255, 255, 0.02)';
        legendDiv.style.borderRadius = '8px';
        legendDiv.style.border = '1px solid var(--border-color)';
        legendDiv.style.fontSize = '0.78rem';
        legendDiv.style.color = 'var(--text-secondary)';
        legendDiv.style.lineHeight = '1.4';
        legendDiv.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 0.4rem; color: var(--text-primary);"><i class="fa-solid fa-circle-info"></i> How to Read Correlation Ratings:</div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem; font-weight: 500; flex-wrap: wrap; gap: 0.5rem;">
                <span style="color: #0ea5e9;">🔵 Positive (0.4 to 1.0): Fields move together</span>
                <span style="color: var(--text-muted);">⚪ Neutral (-0.2 to 0.2): No relationship</span>
                <span style="color: #f43f5e;">🔴 Negative (-1.0 to -0.4): Opposite directions</span>
            </div>
            <p style="margin: 0; font-size: 0.75rem; color: var(--text-muted);">
                Rating represents strength: <strong>1.00</strong> is perfect match, <strong>0.00</strong> is completely independent, and negative values mean as one goes up, the other goes down.
            </p>
        `;
        container.appendChild(legendDiv);
    }

    function renderForecast(forecast) {
        if (!forecast) {
            document.getElementById('forecast-trend').innerHTML = '-';
            document.getElementById('forecast-r2').textContent = '-';
            document.getElementById('forecast-mae').textContent = '-';
            return;
        }

        // Set metrics
        const trendEl = document.getElementById('forecast-trend');
        if (forecast.trend === 'upward') {
            trendEl.innerHTML = '<span class="trend-indicator"><i class="fa-solid fa-arrow-trend-up"></i></span> <span class="trend-text" style="color:var(--accent-cyan)">Upward</span>';
        } else {
            trendEl.innerHTML = '<span class="trend-indicator" style="color:var(--accent-rose)"><i class="fa-solid fa-arrow-trend-down"></i></span> <span class="trend-text" style="color:var(--accent-rose)">Downward</span>';
        }
        document.getElementById('forecast-r2').textContent = forecast.r2_score;
        document.getElementById('forecast-mae').textContent = forecast.mae;

        // Render predictions chart
        const ctx = document.getElementById('forecast-chart').getContext('2d');

        if (state.forecastChartInstance) {
            state.forecastChartInstance.destroy();
        }

        // Generate dynamic labels (Period +1, +2, +3)
        const labels = forecast.predictions.map((_, idx) => `Period +${idx + 1}`);

        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, 'rgba(139, 92, 246, 0.4)');
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0.0)');

        state.forecastChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Forecasted Value',
                    data: forecast.predictions,
                    borderColor: '#8b5cf6',
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.3,
                    borderWidth: 2,
                    pointBackgroundColor: '#8b5cf6',
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8' }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8' }
                    }
                }
            }
        });
    }

    // --- AI ASSISTANT CHAT LOGIC ---

    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatScreen = document.getElementById('chat-screen');
    const suggestionsList = document.getElementById('suggestions-list');

    // Clicking suggested questions
    suggestionsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-tag')) {
            chatInput.value = e.target.textContent;
            chatInput.focus();
        }
    });

    chatSendBtn.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });

    function sendChatMessage() {
        const question = chatInput.value.trim();
        if (!question) return;

        // Render User Message
        appendMessage('user', question);
        chatInput.value = '';

        // Render Typing Indicator
        const typingId = appendTypingIndicator();
        chatScreen.scrollTop = chatScreen.scrollHeight;

        // Post chat question
        fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': state.token
            },
            body: JSON.stringify({ question: question })
        })
        .then(res => {
            if (!res.ok) throw new Error('API Error');
            return res.json();
        })
        .then(data => {
            removeTypingIndicator(typingId);
            appendMessage('bot', data.answer);
            chatScreen.scrollTop = chatScreen.scrollHeight;
        })
        .catch(err => {
            removeTypingIndicator(typingId);
            appendMessage('bot', `Sorry, I encountered an error answering your question: ${err.message}`);
            chatScreen.scrollTop = chatScreen.scrollHeight;
        });
    }

    function appendMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-bubble ${sender}-message animate-fade-in`;

        const avatarIcon = sender === 'bot' ? 'fa-brain-circuit' : 'fa-user';
        
        // Simple Markdown parsing
        const parsedText = parseMarkdown(text);

        messageDiv.innerHTML = `
            <div class="bubble-avatar"><i class="fa-solid ${avatarIcon}"></i></div>
            <div class="bubble-content">
                ${parsedText}
            </div>
        `;

        chatScreen.appendChild(messageDiv);
    }

    function appendTypingIndicator() {
        const id = 'typing-' + Date.now();
        const indicatorDiv = document.createElement('div');
        indicatorDiv.className = `chat-bubble bot-message animate-fade-in`;
        indicatorDiv.id = id;
        indicatorDiv.innerHTML = `
            <div class="bubble-avatar"><i class="fa-solid fa-brain-circuit"></i></div>
            <div class="bubble-content">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        chatScreen.appendChild(indicatorDiv);
        return id;
    }

    function removeTypingIndicator(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    // --- EXECUTIVE REPORT LOGIC ---

    const generateReportBtn = document.getElementById('btn-generate-report');
    const downloadPdfBtn = document.getElementById('btn-download-pdf');
    const reportBody = document.getElementById('report-body');

    generateReportBtn.addEventListener('click', () => {
        generateReportBtn.disabled = true;
        generateReportBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing Data...';
        downloadPdfBtn.style.display = 'none'; // Hide button while loading
        
        reportBody.innerHTML = `
            <div class="report-placeholder">
                <i class="fa-solid fa-wand-magic-sparkles fa-spin" style="color:var(--accent-cyan)"></i>
                <h3>Generative AI Writing Report</h3>
                <p>Generating executive summary, identifying insights, checking anomalies, and formulating data recommendations...</p>
            </div>
        `;

        fetch(`${API_BASE}/summary`, {
            headers: { 'Authorization': state.token }
        })
        .then(res => res.json())
        .then(data => {
            generateReportBtn.disabled = false;
            generateReportBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Regenerate AI Summary';
            
            const parsedSummary = parseMarkdown(data.summary);
            
            reportBody.innerHTML = `
                <div class="report-markdown animate-fade-in">
                    ${parsedSummary}
                </div>
            `;
            downloadPdfBtn.style.display = 'flex'; // Show PDF button on success
        })
        .catch(err => {
            generateReportBtn.disabled = false;
            generateReportBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate AI Summary';
            downloadPdfBtn.style.display = 'none';
            reportBody.innerHTML = `
                <div class="report-placeholder" style="color:var(--accent-rose)">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <h3>Generation Failed</h3>
                    <p>Failed to retrieve Generative AI summary: ${err.message}</p>
                </div>
            `;
        });
    });

    // Download Report as PDF using browser printing engine with custom styles
    downloadPdfBtn.addEventListener('click', () => {
        const reportContent = reportBody.innerHTML;
        if (!reportContent || reportContent.includes('No Report Generated Yet')) {
            alert('Please generate a report first!');
            return;
        }

        const printWindow = window.open('', '_blank', 'width=850,height=900');
        printWindow.document.write(`
            <html>
            <head>
                <title>AI Data Analyst Executive Report</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    body {
                        font-family: 'Inter', sans-serif;
                        color: #1e293b;
                        line-height: 1.6;
                        padding: 40px;
                        max-width: 800px;
                        margin: 0 auto;
                        background-color: #ffffff;
                    }
                    h1, h2, h3 {
                        color: #0f172a;
                        margin-top: 1.8rem;
                        margin-bottom: 0.8rem;
                        font-weight: 700;
                    }
                    h1 {
                        font-size: 26px;
                        border-bottom: 2px solid #cbd5e1;
                        padding-bottom: 12px;
                    }
                    h2 {
                        font-size: 20px;
                        border-bottom: 1px solid #e2e8f0;
                        padding-bottom: 8px;
                    }
                    h3 {
                        font-size: 16px;
                    }
                    p {
                        margin-bottom: 1.2rem;
                        font-size: 14px;
                    }
                    ul, ol {
                        margin-bottom: 1.2rem;
                        padding-left: 24px;
                        font-size: 14px;
                    }
                    li {
                        margin-bottom: 0.6rem;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 24px 0;
                        font-size: 13px;
                    }
                    th, td {
                        border: 1px solid #e2e8f0;
                        padding: 12px 14px;
                        text-align: left;
                    }
                    th {
                        background-color: #f8fafc;
                        font-weight: 600;
                        color: #0f172a;
                    }
                    .report-header-print {
                        text-align: center;
                        margin-bottom: 35px;
                        border-bottom: 3px double #cbd5e1;
                        padding-bottom: 25px;
                    }
                    .report-title-print {
                        font-size: 30px;
                        font-weight: 700;
                        color: #0f172a;
                        margin: 0;
                    }
                    .report-meta-print {
                        font-size: 13px;
                        color: #64748b;
                        margin-top: 8px;
                        font-weight: 500;
                    }
                    @media print {
                        body {
                            padding: 0;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="report-header-print">
                    <h1 class="report-title-print">Analyst.AI Executive Report</h1>
                    <div class="report-meta-print">Generated on ${new Date().toLocaleDateString()} | Active Dataset: Cleaned Data</div>
                </div>
                <div>
                    ${reportContent}
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    });

    // Helper Markdown Parser
    function parseMarkdown(text) {
        if (!text) return '';
        let html = text;
        
        // --- Markdown Table Parser ---
        const lines = html.split('\n');
        let inTable = false;
        let tableRows = [];
        let newLines = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('|') && line.endsWith('|')) {
                if (!inTable) {
                    inTable = true;
                    tableRows = [];
                }
                tableRows.push(line);
            } else {
                if (inTable) {
                    const htmlTable = buildHtmlTable(tableRows);
                    newLines.push(htmlTable);
                    inTable = false;
                }
                newLines.push(lines[i]);
            }
        }
        if (inTable) {
            const htmlTable = buildHtmlTable(tableRows);
            newLines.push(htmlTable);
        }
        html = newLines.join('\n');
        
        // Strip markdown backticks
        html = html.replace(/```markdown/g, '');
        html = html.replace(/```/g, '');
        
        // Headers
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        
        // Bold
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Bullet points (convert list items)
        html = html.replace(/^\s*[\-\*]\s+(.*$)/gim, '<li>$1</li>');
        
        // Inline lists wrapping
        html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
        
        // Paragraphs
        html = html.replace(/\n\n/g, '<p></p>');
        
        // Fix line breaks for single newlines
        html = html.replace(/\n/g, '<br>');
        
        // Remove empty lists wrapping
        html = html.replace(/<\/ul><br><ul>/g, '');
        html = html.replace(/<\/ul><ul>/g, '');

        return html;
    }

    // Helper to convert markdown table rows into formatted HTML tables
    function buildHtmlTable(rows) {
        if (rows.length < 2) return rows.join('\n');
        
        let html = '<div class="table-responsive" style="margin: 1.25rem 0;"><table class="custom-table" style="width: 100%; border-collapse: collapse; background: rgba(15, 23, 42, 0.4); border-radius: 12px; overflow: hidden; border: 1px solid var(--border-color);">';
        
        // Parse headers (row 0)
        const headers = rows[0].split('|').map(s => s.trim()).filter((s, idx, arr) => idx > 0 && idx < arr.length - 1);
        
        html += '<thead><tr style="background: rgba(255,255,255,0.02);">';
        headers.forEach(h => {
            html += `<th style="padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-color); font-weight: 600; font-size: 0.85rem; color: var(--text-primary); text-transform: uppercase;">${h}</th>`;
        });
        html += '</tr></thead>';
        
        html += '<tbody>';
        // Skip index 1 (separator row like |---| )
        for (let i = 2; i < rows.length; i++) {
            const rowData = rows[i].split('|').map(s => s.trim()).filter((s, idx, arr) => idx > 0 && idx < arr.length - 1);
            if (rowData.length === 0) continue;
            
            html += '<tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">';
            rowData.forEach(cell => {
                html += `<td style="padding: 0.75rem 1rem; font-size: 0.9rem; color: var(--text-secondary);">${cell}</td>`;
            });
            html += '</tr>';
        }
        html += '</tbody></table></div>';
        return html;
    }

    // --- AUTHENTICATION & ADMIN PANEL LOGIC ---

    const loginOverlay = document.getElementById('login-overlay');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    const tabBtnLogin = document.getElementById('tab-btn-login');
    const tabBtnRegister = document.getElementById('tab-btn-register');
    
    const loginStatus = document.getElementById('login-status');
    const registerStatus = document.getElementById('register-status');
    
    const userDisplayName = document.getElementById('user-display-name');
    const btnLogout = document.getElementById('btn-logout');
    
    const navItemAdmin = document.getElementById('nav-item-admin');
    const adminUsersTableBody = document.querySelector('#admin-users-table tbody');
    
    const btnAdminCleanup = document.getElementById('btn-admin-cleanup');
    const adminCleanupStatus = document.getElementById('admin-cleanup-status');

    // Toggle between Sign In & Register tabs
    tabBtnLogin.addEventListener('click', () => {
        tabBtnLogin.classList.add('active');
        tabBtnRegister.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
        clearStatus();
    });

    tabBtnRegister.addEventListener('click', () => {
        tabBtnRegister.classList.add('active');
        tabBtnLogin.classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
        clearStatus();
    });

    function clearStatus() {
        loginStatus.className = 'auth-status';
        loginStatus.textContent = '';
        registerStatus.className = 'auth-status';
        registerStatus.textContent = '';
    }

    // Submit handler for registration
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;

        registerStatus.className = 'auth-status';
        registerStatus.textContent = 'Creating account...';

        fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
        .then(async res => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Registration failed');
            return data;
        })
        .then(data => {
            registerStatus.className = 'auth-status success';
            registerStatus.textContent = 'Registered successfully! Switching to login...';
            document.getElementById('register-username').value = '';
            document.getElementById('register-password').value = '';
            
            setTimeout(() => {
                tabBtnLogin.click();
            }, 1500);
        })
        .catch(err => {
            registerStatus.className = 'auth-status error';
            registerStatus.textContent = err.message;
        });
    });

    // Submit handler for Login
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        loginStatus.className = 'auth-status';
        loginStatus.textContent = 'Verifying credentials...';

        fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
        .then(async res => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Invalid username or password');
            return data;
        })
        .then(data => {
            loginStatus.className = 'auth-status success';
            loginStatus.textContent = 'Login successful!';
            document.getElementById('login-username').value = '';
            document.getElementById('login-password').value = '';

            // Persist session in localStorage to keep user logged in on page refresh
            localStorage.setItem('session', JSON.stringify(data));

            setTimeout(() => {
                // Initialize session state
                initUserSession(data);
            }, 500);
        })
        .catch(err => {
            loginStatus.className = 'auth-status error';
            loginStatus.textContent = err.message;
        });
    });

    // Google Login click handler
    const btnGoogleLogin = document.getElementById('btn-google-login');
    if (btnGoogleLogin) {
        btnGoogleLogin.addEventListener('click', () => {
            window.location.href = `${API_BASE}/auth/google/login`;
        });
    }

    // Logout handler
    btnLogout.addEventListener('click', () => {
        localStorage.removeItem('session');
        state.token = null;
        state.username = null;
        state.role = null;
        state.datasetUploaded = false;
        
        // Reset dropzone success messages to default
        document.querySelector('#drop-zone .drop-zone-icon').innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i>';
        document.querySelector('#drop-zone h3').textContent = 'Drag & Drop your file here';
        document.querySelector('#drop-zone h3').style.color = '';
        document.querySelector('#drop-zone p').innerHTML = 'Supports CSV, XLSX or XLS formats (Max 50MB)';
        document.querySelector('#drop-zone button').innerHTML = 'Browse Files';
        document.querySelector('#drop-zone button').className = 'btn btn-primary';

        // Hide dynamic components
        uploadStatsGrid.style.display = 'none';
        dataDetailsGrid.style.display = 'none';

        // Set layout display
        userDisplayName.textContent = 'Guest';
        navItemAdmin.style.display = 'none';
        
        switchTab('upload');
        loginOverlay.style.display = 'flex';
        clearStatus();
    });

    // Session loader
    function checkUserSession() {
        // Parse URL query parameters to check if redirected from Google login
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const username = urlParams.get('username');
        const role = urlParams.get('role');
        const error = urlParams.get('error');
        
        if (error) {
            alert('Google Sign-In failed: ' + decodeURIComponent(error));
            // Remove error parameter from URL cleanly
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (token && username && role) {
            const sessionData = { token, username, role };
            // Save to localStorage
            localStorage.setItem('session', JSON.stringify(sessionData));
            // Remove query parameters from URL cleanly
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Initialize session state
            initUserSession(sessionData);
            return;
        }

        const stored = localStorage.getItem('session');
        if (stored) {
            try {
                const session = JSON.parse(stored);
                initUserSession(session);
            } catch (e) {
                localStorage.removeItem('session');
                showLoginOverlay();
            }
        } else {
            showLoginOverlay();
        }
    }

    function initUserSession(session) {
        state.token = session.token;
        state.username = session.username;
        state.role = session.role;
        
        userDisplayName.textContent = state.username;
        loginOverlay.style.display = 'none';

        // Show/hide admin control tab based on role
        if (state.role === 'admin') {
            navItemAdmin.style.display = 'flex';
        } else {
            navItemAdmin.style.display = 'none';
        }

        // Auto-check if a dataset is already active on the backend
        checkActiveDataset();
    }

    function checkActiveDataset() {
        if (!state.token) return;
        fetch(`${API_BASE}/analyze`, {
            headers: { 'Authorization': state.token }
        })
        .then(res => {
            if (res.ok) {
                state.datasetUploaded = true;
                // Pre-load dashboard metadata in background so tabs work immediately
                loadDashboard();
            } else {
                state.datasetUploaded = false;
            }
        })
        .catch(() => {
            state.datasetUploaded = false;
        });
    }

    function showLoginOverlay() {
        loginOverlay.style.display = 'flex';
        navItemAdmin.style.display = 'none';
    }

    // Load Admin panel statistics
    function loadAdminPanel() {
        adminUsersTableBody.innerHTML = '<tr><td colspan="3" class="text-center">Loading users...</td></tr>';
        
        fetch(`${API_BASE}/auth/admin/users`, {
            headers: { 'Authorization': state.token }
        })
        .then(async res => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Failed to fetch admin users');
            return data;
        })
        .then(users => {
            adminUsersTableBody.innerHTML = '';
            users.forEach(u => {
                const badgeClass = u.role === 'admin' ? 'badge badge-success' : 'badge';
                adminUsersTableBody.innerHTML += `
                    <tr>
                        <td>${u.id}</td>
                        <td><strong>${u.username}</strong></td>
                        <td><span class="${badgeClass}">${u.role}</span></td>
                    </tr>
                `;
            });
        })
        .catch(err => {
            adminUsersTableBody.innerHTML = `<tr><td colspan="3" style="color:var(--accent-rose)" class="text-center">Error: ${err.message}</td></tr>`;
        });
    }

    // Disk Cleanup handler
    btnAdminCleanup.addEventListener('click', () => {
        if (!confirm('Are you sure you want to delete all uploaded and generated dashboard chart files? This cannot be undone.')) {
            return;
        }

        btnAdminCleanup.disabled = true;
        btnAdminCleanup.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cleaning disk...';
        adminCleanupStatus.textContent = '';

        fetch(`${API_BASE}/auth/admin/cleanup`, {
            method: 'POST',
            headers: { 'Authorization': state.token }
        })
        .then(async res => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Cleanup failed');
            return data;
        })
        .then(data => {
            btnAdminCleanup.disabled = false;
            btnAdminCleanup.innerHTML = '<i class="fa-solid fa-trash-can"></i> Purge Temporary Files';
            adminCleanupStatus.style.color = 'var(--accent-emerald)';
            adminCleanupStatus.textContent = data.message;

            // Reset upload stats since we cleared the data
            state.datasetUploaded = false;
        })
        .catch(err => {
            btnAdminCleanup.disabled = false;
            btnAdminCleanup.innerHTML = '<i class="fa-solid fa-trash-can"></i> Purge Temporary Files';
            adminCleanupStatus.style.color = 'var(--accent-rose)';
            adminCleanupStatus.textContent = `Error: ${err.message}`;
        });
    });

    // Run session check on initialization
    checkUserSession();

    function renderBusinessInsights(eda, forecast) {
        // 1. Correlation Insight
        const corrEl = document.getElementById('insight-corr');
        if (eda.correlations) {
            let maxCorr = -1;
            let maxPair = [];
            for (const [col1, row] of Object.entries(eda.correlations)) {
                for (const [col2, val] of Object.entries(row)) {
                    if (col1 !== col2 && val > maxCorr && val < 0.99) { // exclude self diagonal
                        maxCorr = val;
                        maxPair = [col1, col2];
                    }
                }
            }
            if (maxPair.length > 0) {
                corrEl.innerHTML = `<i class="fa-solid fa-circle-nodes"></i> Strongest connection detected: <strong>${maxPair[0]}</strong> and <strong>${maxPair[1]}</strong> tend to move together (Correlation rating: <strong>${maxCorr.toFixed(2)}</strong>). This is a strong indicator of potential business drivers.`;
            } else {
                corrEl.innerHTML = `<i class="fa-solid fa-circle-nodes"></i> No strong correlations detected among numerical fields. Columns change independently of each other.`;
            }
        } else {
            corrEl.innerHTML = `<i class="fa-solid fa-circle-nodes"></i> Not enough numerical data points to compute correlations.`;
        }

        // 2. Forecast Insight
        const forecastEl = document.getElementById('insight-forecast');
        if (forecast) {
            let predictability = "moderately predictable";
            if (forecast.r2_score >= 0.8) {
                predictability = "highly reliable and predictable";
            } else if (forecast.r2_score < 0.4) {
                predictability = "difficult to forecast (highly volatile)";
            }
            forecastEl.innerHTML = `<i class="fa-solid fa-arrow-trend-up"></i> Time series forecasts show a steady <strong>${forecast.trend}</strong> trend. Model confidence is rated at <strong>${forecast.r2_score}</strong> (${predictability}), showing low volatility in historic patterns.`;
        } else {
            forecastEl.innerHTML = `<i class="fa-solid fa-arrow-trend-up"></i> No forecasting models built. Need historical numerical variables.`;
        }
    }

    function renderPlotlyGallery(charts) {
        const tabsContainer = document.getElementById('plotly-tabs');
        const iframe = document.getElementById('plotly-iframe');
        const placeholder = document.getElementById('iframe-placeholder');

        tabsContainer.innerHTML = '';
        
        if (!charts || charts.length === 0) {
            tabsContainer.innerHTML = '<p class="text-center" style="color:var(--text-muted)">No interactive Plotly charts generated by backend.</p>';
            placeholder.style.display = 'flex';
            iframe.style.display = 'none';
            return;
        }

        charts.forEach((chart, index) => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary';
            btn.innerHTML = `<i class="fa-solid fa-chart-simple"></i> ${chart.title}`;
            btn.onclick = () => {
                placeholder.style.display = 'none';
                iframe.style.display = 'block';
                iframe.src = chart.path;

                // Active style
                document.querySelectorAll('#plotly-tabs button').forEach(b => {
                    b.classList.remove('btn-primary');
                    b.classList.add('btn-secondary');
                });
                btn.classList.add('btn-primary');
                btn.classList.remove('btn-secondary');
            };
            tabsContainer.appendChild(btn);

            // Auto-click first button to load default chart
            if (index === 0) {
                btn.click();
            }
        });
    }

    function renderSuggestions(suggestions) {
        const suggestionsList = document.getElementById('suggestions-list');
        if (!suggestionsList) return;
        
        suggestionsList.innerHTML = '';
        if (!suggestions || suggestions.length === 0) {
            suggestionsList.innerHTML = '<span style="color:var(--text-muted)">No suggestions available</span>';
            return;
        }
        
        suggestions.forEach(q => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-tag';
            btn.textContent = q;
            suggestionsList.appendChild(btn);
        });
    }
});
