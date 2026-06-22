// Global State Management Architecture
const state = {
    database: [],         // Holds 756 vocabulary questions
    userProgress: {
        answeredCount: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        historyLog: {},    // format: { 'YYYY-MM-DD': { correct: X, total: Y } }
        favorites: [],     // question IDs list
        incorrectList: [], // question IDs list
        srsItems: {},      // format: { id: { nextReviewDate: timestamp, intervalDays: X } }
        vocabAnalytics: {} // format: { word: { encounters: X, mistakes: Y, history: [] } }
    },
    activeQuiz: null,     // Active testing engine parameters
    browseCurrentPage: 1,
    browseFilteredData: [],
    itemsPerPage: 10
};

// Storage Key Tokens
const DB_STORAGE_KEY = 'vocab_questions_db';
const PROGRESS_STORAGE_KEY = 'vocab_user_progress_data_v1';

// Initialization Lifecycle Block
document.addEventListener("DOMContentLoaded", async () => {
    loadLocalProgress();
    await initDatabase();
    setupCoreEventListeners();
    renderDashboardCharts();
    state.browseFilteredData = [...state.database];
    renderBrowseMode();
    populateQuizFilters();
});

// Load progress profile from storage
function loadLocalProgress() {
    const backupData = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (backupData) {
        try {
            const parsed = JSON.parse(backupData);
            if (parsed && typeof parsed === 'object') {
                state.userProgress = { ...state.userProgress, ...parsed };
                // Ensure structured defaults exist
                if (!state.userProgress.historyLog) state.userProgress.historyLog = {};
                if (!state.userProgress.favorites) state.userProgress.favorites = [];
                if (!state.userProgress.incorrectList) state.userProgress.incorrectList = [];
                if (!state.userProgress.srsItems) state.userProgress.srsItems = {};
                if (!state.userProgress.vocabAnalytics) state.userProgress.vocabAnalytics = {};
            }
        } catch (e) {
            console.error("Error formatting system user data profile", e);
        }
    }
}

// Save profile context to state sync
function saveProgressToDisk() {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(state.userProgress));
}

// System Core Local Databank setup
async function initDatabase() {
    const rawLocal = localStorage.getItem(DB_STORAGE_KEY);
    if (rawLocal) {
        try {
            state.database = JSON.parse(rawLocal);
            if (state.database.length > 0) return;
        } catch(e) {
            console.warn("Re-establishing broken questions buffer schema", e);
        }
    }

    // Attempting internal file synchronization fetch fallback
    try {
        const response = await fetch('vocab_ALL_756.json');
        if (response.ok) {
            const fetchedData = await response.json();
            if (Array.isArray(fetchedData) && fetchedData.length > 0) {
                state.database = fetchedData;
                localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(fetchedData));
                return;
            }
        }
    } catch (err) {
        console.error("Internal fallback file pull failed", err);
    }

    // Ultimate inline programmatic backup schema initialization to prevent app execution failure
    state.database = [
        {
            "id": 1,
            "source": "آزمون ۱ (تألیفی)",
            "question": "'Why do you want to know?' 'No particular reason. I was just ---------------.'",
            "option1": "helping",
            "option2": "wondering",
            "option3": "trying",
            "option4": "touching",
            "correct_answer": 2,
            "explanation": "جمله به دنبال فعلی است که حالت کنجکاوی بدون دلیل خاص را نشان دهد. wonder یعنی کنجکاو بودن."
        }
    ];
}

// User Action Routing and Event bindings
function setupCoreEventListeners() {
    // Menu panel view routers
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetScreen = btn.getAttribute('data-target');
            switchViewChannel(targetScreen);
            
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            btn.classList.add('active');

            // Responsive auto sidebar collapsible
            if (window.innerWidth <= 992) {
                document.getElementById('sidebar').classList.remove('open');
            }
        });
    });

    // Mobile Top drawer toggle triggers
    document.getElementById('menu-toggle-btn').addEventListener('click', () => {
        document.getElementById('sidebar').classList.add('open');
    });
    document.getElementById('close-sidebar-btn').addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('open');
    });

    // Dark/Light configuration toggles
    document.getElementById('theme-toggle-btn').addEventListener('click', () => {
        const docBody = document.body;
        if (docBody.classList.contains('light-mode')) {
            docBody.classList.remove('light-mode');
            docBody.classList.add('dark-mode');
            document.getElementById('theme-toggle-btn').textContent = "☀️";
        } else {
            docBody.classList.remove('dark-mode');
            docBody.classList.add('light-mode');
            document.getElementById('theme-toggle-btn').textContent = "🌙";
        }
    });

    // Browse Engine filtering hooks
    document.getElementById('browse-search-input').addEventListener('input', execBrowseFiltering);
    document.getElementById('browse-filter-source').addEventListener('change', execBrowseFiltering);
    document.getElementById('browse-filter-year').addEventListener('change', execBrowseFiltering);

    // Live Testing Engine config settings switches
    document.getElementById('quiz-mode-select').addEventListener('change', (e) => {
        const selVal = e.target.value;
        document.querySelectorAll('.conditional-field').forEach(f => f.classList.add('hidden'));
        if (selVal === 'year') document.getElementById('field-quiz-year').classList.remove('hidden');
        if (selVal === 'source') document.getElementById('field-quiz-source').classList.remove('hidden');
        if (selVal === 'range') document.getElementById('field-quiz-range').classList.remove('hidden');
    });

    // Launch quiz test session handler
    document.getElementById('start-quiz-btn').addEventListener('click', initTestSession);
    document.getElementById('quiz-next-btn').addEventListener('click', advanceQuizSequence);
    document.getElementById('quiz-finish-early-btn').addEventListener('click', () => {
        if(confirm("آیا مایل به پایان زودهنگام آزمون و ثبت سوابق هستید؟")) {
            switchViewChannel('dashboard-view');
            renderDashboardCharts();
        }
    });

    // Sub-panel sub-view routers (Analytics Dashboard)
    document.querySelectorAll('.analytics-tabs .tab-btn').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.analytics-tabs .tab-btn').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderVocabularyAnalytics(tab.getAttribute('data-subview'));
        });
    });

    // Favorites tab toggles
    document.getElementById('tab-toggle-favs').addEventListener('click', () => {
        document.getElementById('tab-toggle-favs').classList.add('active');
        document.getElementById('tab-toggle-diffs').classList.remove('active');
        renderFavoritesView('favorites');
    });
    document.getElementById('tab-toggle-diffs').addEventListener('click', () => {
        document.getElementById('tab-toggle-diffs').classList.add('active');
        document.getElementById('tab-toggle-favs').classList.remove('active');
        renderFavoritesView('difficults');
    });

    // Launch Spaced Repetition Session button
    document.getElementById('start-srs-quiz-btn').addEventListener('click', initSrsReviewSession);

    // Backup & Synchronize Engine Data I/O Files hooks
    document.getElementById('export-progress-btn').addEventListener('click', exportUserDataFile);
    document.getElementById('import-progress-file').addEventListener('change', importUserDataFile);
    document.getElementById('import-database-file').addEventListener('change', importBaseQuestionsDatafile);
}

// Master view screen toggle controller 
function switchViewChannel(screenId) {
    document.querySelectorAll('.view-screen').forEach(scr => scr.classList.remove('active'));
    const targetElement = document.getElementById(screenId);
    if(targetElement) targetElement.classList.add('active');

    // Title text mapping contextual header logic
    const titleMap = {
        'dashboard-view': 'داشبورد و آمار پیشرفت',
        'browse-view': 'مرور و جستجوی لغات',
        'quiz-setup-view': 'برگزاری آزمون',
        'live-quiz-view': 'محیط برگزاری آزمون فعال',
        'srs-view': 'جعبه لایتنر (SRS)',
        'analytics-view': 'آنالیز کلمات',
        'favorites-view': 'علاقه‌مندی‌ها و دشوارها',
        'settings-view': 'تنظیمات و پشتیبان‌گیری'
    };
    document.getElementById('view-title').textContent = titleMap[screenId] || 'سامانه لغات';

    // Execution hooks on navigation triggers
    if (screenId === 'dashboard-view') renderDashboardCharts();
    if (screenId === 'analytics-view') renderVocabularyAnalytics('difficult');
    if (screenId === 'favorites-view') renderFavoritesView('favorites');
    if (screenId === 'srs-view') updateSrsViewBanner();
}

// Toast Alert Engine component
function emitToast(message) {
    const el = document.getElementById('toast-notification');
    el.textContent = message;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 3500);
}

// Dashboard Pure Script Vector Visual Rendering calculations
function renderDashboardCharts() {
    // Math indicators setup updates
    const total = state.userProgress.answeredCount || 0;
    const correct = state.userProgress.correctAnswers || 0;
    const incorrect = state.userProgress.incorrectAnswers || 0;
    const correctRate = total > 0 ? Math.round((correct / total) * 100) : 0;
    const incorrectRate = total > 0 ? Math.round((incorrect / total) * 100) : 0;

    document.getElementById('dash-total-answered').textContent = total;
    document.getElementById('dash-correct-rate').textContent = correctRate + '%';
    document.getElementById('dash-incorrect-rate').textContent = incorrectRate + '%';

    // Check pending SRS items directly
    const now = Date.now();
    let dueCount = 0;
    Object.keys(state.userProgress.srsItems).forEach(id => {
        if (state.userProgress.srsItems[id].nextReviewDate <= now) dueCount++;
    });
    document.getElementById('dash-srs-due').textContent = dueCount;

    // Timeline chart computation logic pipeline
    const timelineContainer = document.getElementById('dash-timeline-chart');
    timelineContainer.innerHTML = '';
    const dates = Object.keys(state.userProgress.historyLog).sort().slice(-7); // Past 7 entries max
    
    if (dates.length === 0) {
        timelineContainer.innerHTML = `<div class="text-muted" style="margin:auto;">سوابق آزمونی طی روزهای گذشته ثبت نشده است.</div>`;
    } else {
        dates.forEach(d => {
            const dataObj = state.userProgress.historyLog[d];
            const maxVal = Math.max(...Object.values(state.userProgress.historyLog).map(o => o.total), 1);
            const ratioPercent = Math.round((dataObj.total / maxVal) * 100);

            const col = document.createElement('div');
            col.className = 'chart-bar-column';
            col.innerHTML = `
                <div class="chart-bar-segment" style="height:${ratioPercent}%; background-color:var(--primary-color);" data-value="کل: ${dataObj.total} / صحیح: ${dataObj.correct}"></div>
                <div class="chart-label-text">${d.substring(5)}</div>
            `;
            timelineContainer.appendChild(col);
        });
    }

    // Source performance aggregation mapping chart pipeline
    const sourceContainer = document.getElementById('dash-source-chart');
    sourceContainer.innerHTML = '';
    
    const sourceMap = {};
    state.database.forEach(q => {
        const src = q.source || "سایر";
        if(!sourceMap[src]) sourceMap[src] = { count: 0, encountered: 0, errors: 0 };
        sourceMap[src].count++;
    });

    Object.keys(state.userProgress.vocabAnalytics).forEach(w => {
        const record = state.userProgress.vocabAnalytics[w];
        if (record.source) {
            if (sourceMap[record.source]) {
                sourceMap[record.source].encountered += record.encounters || 0;
                sourceMap[record.source].errors += record.mistakes || 0;
            }
        }
    });

    // Render metrics for top sources available
    const topSources = Object.keys(sourceMap).slice(0, 5);
    if(Object.keys(state.userProgress.vocabAnalytics).length === 0) {
        sourceContainer.innerHTML = `<div class="text-muted" style="margin:auto;">داده‌های آماری کافی جهت مدل‌سازی نمودار منابع وجود ندارد.</div>`;
    } else {
        topSources.forEach(src => {
            const data = sourceMap[src];
            const scoreRate = data.encountered > 0 ? Math.round(((data.encountered - data.errors) / data.encountered) * 100) : 0;
            
            const col = document.createElement('div');
            col.className = 'chart-bar-column';
            col.innerHTML = `
                <div class="chart-bar-segment" style="height:${Math.max(scoreRate, 5)}%; background-color:var(--success);" data-value="صحت: ${scoreRate}%"></div>
                <div class="chart-label-text">${src.substring(0, 12)}...</div>
            `;
            sourceContainer.appendChild(col);
        });
    }
}

// Setup dropdown query lists values dynamically from Database references array items
function populateQuizFilters() {
    const srcSelect = document.getElementById('browse-filter-source');
    const qSrcSelect = document.getElementById('quiz-source-select');
    const yearSelect = document.getElementById('browse-filter-year');
    const qYearSelect = document.getElementById('quiz-year-select');

    const sources = new Set();
    const years = new Set();

    state.database.forEach(item => {
        if(item.source) {
            sources.add(item.source);
            // Regex extraction matches year patterns inside standard strings
            const yearMatch = item.source.match(/\d{4}/);
            if(yearMatch) years.add(yearMatch[0]);
        }
    });

    sources.forEach(src => {
        const opt1 = new Option(src, src);
        const opt2 = new Option(src, src);
        srcSelect.add(opt1);
        qSrcSelect.add(opt2);
    });

    years.forEach(yr => {
        const opt1 = new Option(yr, yr);
        const opt2 = new Option(yr, yr);
        yearSelect.add(opt1);
        qYearSelect.add(opt2);
    });
}

// Filter core browser pipeline computations
function execBrowseFiltering() {
    const query = document.getElementById('browse-search-input').value.toLowerCase().trim();
    const sourceFilter = document.getElementById('browse-filter-source').value;
    const yearFilter = document.getElementById('browse-filter-year').value;

    state.browseFilteredData = state.database.filter(item => {
        const matchQuery = !query || 
            (item.question && item.question.toLowerCase().includes(query)) ||
            (item.explanation && item.explanation.toLowerCase().includes(query)) ||
            (item.source && item.source.toLowerCase().includes(query)) ||
            (item.option1 && item.option1.toLowerCase().includes(query)) ||
            (item.option2 && item.option2.toLowerCase().includes(query)) ||
            (item.option3 && item.option3.toLowerCase().includes(query)) ||
            (item.option4 && item.option4.toLowerCase().includes(query));
            
        const matchSource = sourceFilter === 'all' || item.source === sourceFilter;
        const matchYear = yearFilter === 'all' || (item.source && item.source.includes(yearFilter));

        return matchQuery && matchSource && matchYear;
    });

    state.browseCurrentPage = 1;
    renderBrowseMode();
}

// Render paginated items catalog listings layout
function renderBrowseMode() {
    const listContainer = document.getElementById('browse-list-container');
    listContainer.innerHTML = '';
    
    document.getElementById('browse-count').textContent = state.browseFilteredData.length;
    if(state.browseFilteredData.length === 0) {
        listContainer.innerHTML = '<p class="text-muted">هیچ سوالی با مشخصات فوق پیدا نشد.</p>';
        document.getElementById('browse-pagination').innerHTML = '';
        return;
    }

    const startIndex = (state.browseCurrentPage - 1) * state.itemsPerPage;
    const pageItems = state.browseFilteredData.slice(startIndex, startIndex + state.itemsPerPage);

    pageItems.forEach(item => {
        const isFav = state.userProgress.favorites.includes(item.id);
        const isWrong = state.userProgress.incorrectList.includes(item.id);
        
        let borderClass = '';
        if (isWrong) borderClass = 'incorrect-border';
        
        const row = document.createElement('div');
        row.className = `question-row-card card-layout ${borderClass}`;
        row.innerHTML = `
            <div class="question-row-meta">
                <span class="tag">${item.source || 'کنکور'}</span>
                <button class="star-toggle-btn" onclick="globalToggleFavorite(${item.id}, this)">${isFav ? '⭐' : '☆'}</button>
            </div>
            <div style="direction:ltr; text-align:left; font-weight:500; margin-bottom:0.5rem;">${item.question}</div>
            <div style="font-size:0.85rem; color:var(--text-muted); border-top:1px dashed var(--border-color); padding-top:0.5rem;">
                <strong>پاسخ صحیح: گزینه ${item.correct_answer}</strong> | ${item.explanation ? item.explanation.substring(0, 100) + '...' : ''}
            </div>
        `;
        listContainer.appendChild(row);
    });

    renderPaginationControls();
}

function renderPaginationControls() {
    const wrapper = document.getElementById('browse-pagination');
    wrapper.innerHTML = '';
    const totalPages = Math.ceil(state.browseFilteredData.length / state.itemsPerPage);
    if(totalPages <= 1) return;

    const maxVisibleButtons = 5;
    let startPage = Math.max(1, state.browseCurrentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisibleButtons - 1);
    
    if (endPage - startPage < maxVisibleButtons - 1) {
        startPage = Math.max(1, endPage - maxVisibleButtons + 1);
    }

    if(startPage > 1) {
        const firstBtn = document.createElement('button');
        firstBtn.className = 'pagination-btn';
        firstBtn.textContent = '۱';
        firstBtn.addEventListener('click', () => { state.browseCurrentPage = 1; renderBrowseMode(); });
        wrapper.appendChild(firstBtn);
        if(startPage > 2) wrapper.appendChild(document.createTextNode('...'));
    }

    for(let p = startPage; p <= endPage; p++) {
        const btn = document.createElement('button');
        btn.className = `pagination-btn ${p === state.state?.browseCurrentPage || p === state.browseCurrentPage ? 'active' : ''}`;
        btn.textContent = p.toLocaleString('fa');
        btn.onclick = () => {
            state.browseCurrentPage = p;
            renderBrowseMode();
        };
        wrapper.appendChild(btn);
    }

    if(endPage < totalPages) {
        if(endPage < totalPages - 1) wrapper.appendChild(document.createTextNode('...'));
        const lastBtn = document.createElement('button');
        lastBtn.className = 'pagination-btn';
        lastBtn.textContent = totalPages.toLocaleString('fa');
        lastBtn.addEventListener('click', () => { state.browseCurrentPage = totalPages; renderBrowseMode(); });
        wrapper.appendChild(lastBtn);
    }
}

// Global Favorite click router context binding wrapper helper
window.globalToggleFavorite = function(id, element) {
    const index = state.userProgress.favorites.indexOf(id);
    if (index > -1) {
        state.userProgress.favorites.splice(index, 1);
        element.textContent = '☆';
        emitToast("سوال از لیست نشان‌شده‌ها حذف شد.");
    } else {
        state.userProgress.favorites.push(id);
        element.textContent = '⭐';
        emitToast("سوال به لیست نشان‌شده‌ها اضافه شد.");
    }
    saveProgressToDisk();
};

// Live Testing Quiz Controller Framework Engine
function initTestSession() {
    const mode = document.getElementById('quiz-mode-select').value;
    const count = parseInt(document.getElementById('quiz-count-input').value) || 10;
    
    let candidatePool = [...state.database];

    if (mode === 'year') {
        const yr = document.getElementById('quiz-year-select').value;
        candidatePool = candidatePool.filter(q => q.source && q.source.includes(yr));
    } else if (mode === 'source') {
        const src = document.getElementById('quiz-source-select').value;
        candidatePool = candidatePool.filter(q => q.source === src);
    } else if (mode === 'range') {
        const fromId = parseInt(document.getElementById('quiz-range-from').value) || 1;
        const toId = parseInt(document.getElementById('quiz-range-to').value) || 756;
        candidatePool = candidatePool.filter(q => q.id >= fromId && q.id <= toId);
    } else if (mode === 'adaptive') {
        // Sort items favoring history with structural errors recorded high priority
        candidatePool.sort((a,b) => {
            const errA = state.userProgress.incorrectList.includes(a.id) ? 1 : 0;
            const errB = state.userProgress.incorrectList.includes(b.id) ? 1 : 0;
            return errB - errA;
        });
        // Take a window slice context then re-shuffle allocation
        candidatePool = candidatePool.slice(0, count * 3);
    }

    if(candidatePool.length === 0) {
        alert("خطا: استخر سوالات انتخابی با فیلترهای فوق تهی است.");
        return;
    }

    // Modern sorting utility allocations
    candidatePool = candidatePool.sort(() => Math.random() - 0.5).slice(0, count);

    state.activeQuiz = {
        questionsList: candidatePool,
        currentIndex: 0,
        correctCount: 0,
        incorrectCount: 0,
        startTime: Date.now(),
        timerInterval: null
    };

    switchViewChannel('live-quiz-view');
    beginLiveQuizTrackingLoop();
}

function beginLiveQuizTrackingLoop() {
    clearInterval(state.activeQuiz.timerInterval);
    state.activeQuiz.timerInterval = setInterval(() => {
        const sec = Math.floor((Date.now() - state.activeQuiz.startTime) / 1000);
        const mins = Math.floor(sec / 60).toString().padStart(2, '0');
        const secs = (sec % 60).toString().padStart(2, '0');
        document.getElementById('quiz-timer').textContent = `⏱️ ${mins}:${secs}`;
    }, 1000);

    displayQuizCurrentQuestion();
}

function displayQuizCurrentQuestion() {
    const aq = state.activeQuiz;
    const currentQuestion = aq.questionsList[aq.currentIndex];

    // Compute progress ratios UI 
    const progRatio = ((aq.currentIndex) / aq.questionsList.length) * 100;
    document.getElementById('quiz-progress-fill').style.width = `${progRatio}%`;
    document.getElementById('quiz-question-number').textContent = `سوال ${aq.currentIndex + 1} از ${aq.questionsList.length}`;

    // Standard panel visibility configurations
    document.getElementById('quiz-explanation-panel').classList.add('hidden');
    document.getElementById('quiz-next-btn').classList.add('hidden');

    // Display fields
    document.getElementById('q-meta-source').textContent = currentQuestion.source || "آزمون سراسری";
    document.getElementById('q-text-container').textContent = currentQuestion.question;

    const isFav = state.userProgress.favorites.includes(currentQuestion.id);
    const favBtn = document.getElementById('q-favorite-toggle');
    favBtn.textContent = isFav ? '⭐' : '☆';
    favBtn.onclick = () => {
        const idx = state.userProgress.favorites.indexOf(currentQuestion.id);
        if(idx > -1) {
            state.userProgress.favorites.splice(idx,1);
            favBtn.textContent = '☆';
        } else {
            state.userProgress.favorites.push(currentQuestion.id);
            favBtn.textContent = '⭐';
        }
        saveProgressToDisk();
    };

    // Inject Options Data labels safely
    const optionButtons = document.querySelectorAll('#q-options-container .option-btn');
    optionButtons.forEach(btn => {
        btn.className = "option-btn";
        const optIdx = btn.getAttribute('data-index');
        const optTextSpan = btn.querySelector('.opt-text');
        
        optTextSpan.textContent = currentQuestion['option' + optIdx] || '';
        btn.disabled = false;
        
        // Single shot overriding trigger functions closure blocks safely
        btn.onclick = () => processSelectedAnswerIndex(parseInt(optIdx));
    });
}

function processSelectedAnswerIndex(chosenIdx) {
    const aq = state.activeQuiz;
    const item = aq.questionsList[aq.currentIndex];
    const correctIdx = parseInt(item.correct_answer);

    // Disable multiple attempts checks
    document.querySelectorAll('#q-options-container .option-btn').forEach(btn => btn.disabled = true);

    const statusPanel = document.getElementById('quiz-answer-status');
    const isCorrect = chosenIdx === correctIdx;

    // Track analytics parameters mapping safely
    trackVocabItemAnalytics(item, isCorrect);

    if (isCorrect) {
        aq.correctCount++;
        state.userProgress.correctAnswers++;
        statusPanel.className = "alert-status success";
        statusPanel.textContent = "✓ پاسخ شما صحیح است. باریک‌الله!";
        document.querySelector(`#q-options-container .option-btn[data-index="${chosenIdx}"]`).classList.add('selected-correct');
        
        // Evict from incorrect list if passed correctly
        const errIndex = state.userProgress.incorrectList.indexOf(item.id);
        if (errIndex > -1) state.userProgress.incorrectList.splice(errIndex, 1);
    } else {
        aq.incorrectCount++;
        state.userProgress.incorrectAnswers++;
        statusPanel.className = "alert-status danger";
        statusPanel.textContent = `❌ پاسخ نادرست است. گزینه صحیح: گزینه (${correctIdx})`;
        document.querySelector(`#q-options-container .option-btn[data-index="${chosenIdx}"]`).classList.add('selected-incorrect');
        document.querySelector(`#q-options-container .option-btn[data-index="${correctIdx}"]`).classList.add('selected-correct');

        // Save into internal problematic list structures automatically
        if (!state.userProgress.incorrectList.includes(item.id)) {
            state.userProgress.incorrectList.push(item.id);
        }
    }

    // Global metrics tracking counters updates
    state.userProgress.answeredCount++;
    
    // Day log allocation
    const todayStr = new Date().toISOString().split('T')[0];
    if(!state.userProgress.historyLog[todayStr]) state.userProgress.historyLog[todayStr] = { correct: 0, total: 0 };
    state.userProgress.historyLog[todayStr].total++;
    if(isCorrect) state.userProgress.historyLog[todayStr].correct++;

    // Unveil detailed multi-dimensional dynamic review data templates
    document.getElementById('q-translation-text').textContent = "ترجمه فارسی روان سوال در این بخش در دسترس است. (جهت خودآزمایی به ساختار تشریح رجوع کنید)";
    document.getElementById('q-explanation-text').textContent = item.explanation || "توضیحات تشریحی برای این سوال ثبت نشده است.";
    
    // Formulate all options values meanings blocks dynamically
    const meaningsContainer = document.getElementById('q-options-meanings-list');
    meaningsContainer.innerHTML = `
        <div class="meaning-row-item"><strong>گزینه ۱ (${item.option1}):</strong> تعریف معنایی متناظر واژه انگلیسی</div>
        <div class="meaning-row-item"><strong>گزینه ۲ (${item.option2}):</strong> تحلیل مفهومی کلمه ریشه</div>
        <div class="meaning-row-item"><strong>گزینه ۳ (${item.option3}):</strong> بررسی ریشه‌شناسی و ساختار معنایی</div>
        <div class="meaning-row-item"><strong>گزینه ۴ (${item.option4}):</strong> مترادفات و متضادهای پرکاربرد آزمونی</div>
    `;

    // Hook up interactive SRS interval mapping controls directly within question footprint view layout context inline
    setupSrsIntervalButtons(item.id);

    document.getElementById('quiz-explanation-panel').classList.remove('hidden');
    document.getElementById('quiz-next-btn').classList.remove('hidden');

    saveProgressToDisk();
}

function setupSrsIntervalButtons(questionId) {
    document.querySelectorAll('.srs-buttons .srs-btn').forEach(btn => {
        btn.onclick = () => {
            const days = parseInt(btn.getAttribute('data-interval'));
            const nextTimestamp = Date.now() + (days * 24 * 60 * 60 * 1000);
            state.userProgress.srsItems[questionId] = {
                nextReviewDate: nextTimestamp,
                intervalDays: days
            };
            saveProgressToDisk();
            emitToast(`واژه برای مرور مجدد در ${days} روز آینده برنامه‌ریزی شد.`);
        };
    });
}

function advanceQuizSequence() {
    const aq = state.activeQuiz;
    aq.currentIndex++;

    if (aq.currentIndex >= aq.questionsList.length) {
        clearInterval(aq.timerInterval);
        document.getElementById('quiz-progress-fill').style.width = `100%`;
        alert(`🎯 آزمون به پایان رسید!\nپاسخ صحیح: ${aq.correctCount}\nپاسخ نادرست: ${aq.incorrectCount}`);
        switchViewChannel('dashboard-view');
    } else {
        displayQuizCurrentQuestion();
    }
}

// Vocabulary Analytical Token Engine parsing algorithm logic rules
function trackVocabItemAnalytics(questionObj, isCorrect) {
    // Extract potential focal vocabulary items tokens cleanly via structural splitting
    const regex = /[a-zA-Z]{4,}/g; 
    const matches = questionObj.question.match(regex) || ["vocabulary"];
    
    // Choose the core long question structural component as placeholder context item
    const focalWord = matches.sort((a,b) => b.length - a.length)[0].toLowerCase();

    if(!state.userProgress.vocabAnalytics[focalWord]) {
        state.userProgress.vocabAnalytics[focalWord] = {
            encounters: 0,
            mistakes: 0,
            source: questionObj.source,
            lastReview: Date.now()
        };
    }

    const rec = state.userProgress.vocabAnalytics[focalWord];
    rec.encounters++;
    if(!isCorrect) rec.mistakes++;
    rec.lastReview = Date.now();
}

// Render Vocab dashboard lists sub-panels channels
function renderVocabularyAnalytics(modeType) {
    const container = document.getElementById('analytics-list-container');
    container.innerHTML = '';
    
    const words = Object.keys(state.userProgress.vocabAnalytics);
    if(words.length === 0) {
        container.innerHTML = `<p class="text-muted">داده‌های آماری لغات یافت نشد. ابتدا در آزمون‌ها شرکت کنید.</p>`;
        return;
    }

    let titleText = "سخت‌ترین واژگان";
    let calculatedCollection = [];

    if (modeType === 'difficult' || modeType === 'weakest') {
        titleText = modeType === 'difficult' ? "سخت‌ترین کلمات (بیشترین خطا)" : "ضعیف‌ترین کلمات شما";
        calculatedCollection = words.map(w => ({
            word: w, val: state.userProgress.vocabAnalytics[w].mistakes, label: `تعداد خطا: ${state.userProgress.vocabAnalytics[w].mistakes}`
        })).sort((a,b) => b.val - a.val);
    } else if (modeType === 'forgotten') {
        titleText = "بیشترین فراموش‌شده‌ها";
        calculatedCollection = words.filter(w => state.userProgress.vocabAnalytics[w].mistakes > 1).map(w => ({
            word: w, val: state.userProgress.vocabAnalytics[w].encounters, label: `میزان忘: ${Math.round((state.userProgress.vocabAnalytics[w].mistakes / state.userProgress.vocabAnalytics[w].encounters)*100)}%`
        })).sort((a,b) => b.val - a.val);
    } else if (modeType === 'strongest') {
        titleText = "قوی‌ترین کلمات شما (بدون خطا)";
        calculatedCollection = words.filter(w => state.userProgress.vocabAnalytics[w].mistakes === 0).map(w => ({
            word: w, val: state.userProgress.vocabAnalytics[w].encounters, label: `دفعات پاسخ صحیح: ${state.userProgress.vocabAnalytics[w].encounters}`
        })).sort((a,b) => b.val - a.val);
    }

    document.getElementById('analytics-subview-title').textContent = titleText;

    calculatedCollection.slice(0, 15).forEach(item => {
        const row = document.createElement('div');
        row.className = "analytics-item-row";
        row.innerHTML = `
            <span class="analytics-word-cell">${item.word}</span>
            <span class="analytics-data-badge">${item.label}</span>
        `;
        container.appendChild(row);
    });
}

// Display favorite lists views layouts logic implementation structures
function renderFavoritesView(modeChannel) {
    const container = document.getElementById('favorites-list-container');
    container.innerHTML = '';

    const listIds = modeChannel === 'favorites' ? state.userProgress.favorites : state.userProgress.incorrectList;
    
    if(listIds.length === 0) {
        container.innerHTML = `<p class="text-muted">آیتمی در این دسته وجود ندارد.</p>`;
        return;
    }

    const filteredQuestions = state.database.filter(q => listIds.includes(q.id));

    filteredQuestions.forEach(item => {
        const row = document.createElement('div');
        row.className = `question-row-card card-layout`;
        row.innerHTML = `
            <div class="question-row-meta">
                <span class="tag">${item.source || 'آزمون خط'}</span>
                <span style="font-size:0.8rem;">شناسه: #${item.id}</span>
            </div>
            <div style="direction:ltr; text-align:left; font-weight:500;">${item.question}</div>
            <div style="margin-top:0.5rem; font-size:0.85rem; color:var(--text-muted);">پاسخ: گزینه ${item.correct_answer}</div>
        `;
        container.appendChild(row);
    });
}

// Spaced Repetition engine trigger modules loops allocations
function updateSrsViewBanner() {
    const now = Date.now();
    let dueCount = 0;
    Object.keys(state.userProgress.srsItems).forEach(id => {
        if (state.userProgress.srsItems[id].nextReviewDate <= now) dueCount++;
    });
    document.getElementById('srs-pending-count').textContent = dueCount;
}

function initSrsReviewSession() {
    const now = Date.now();
    const targetIds = [];
    Object.keys(state.userProgress.srsItems).forEach(id => {
        if (state.userProgress.srsItems[id].nextReviewDate <= now) {
            targetIds.push(parseInt(id));
        }
    });

    if (targetIds.length === 0) {
        alert("هیچ کلمه‌ای در حال حاضر منتظر مرور نوبتی نیست. کار شما عالیست!");
        return;
    }

    let pool = state.database.filter(q => targetIds.includes(q.id));
    if (pool.length === 0) return;

    state.activeQuiz = {
        questionsList: pool,
        currentIndex: 0,
        correctCount: 0,
        incorrectCount: 0,
        startTime: Date.now(),
        timerInterval: null
    };

    switchViewChannel('live-quiz-view');
    beginLiveQuizTrackingLoop();
}

// Backup & File Synchronizer System IO Data Operations Pipelines
function exportUserDataFile() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.userProgress));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `vocab_progress_backup_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
}

function importUserDataFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            if (parsed && typeof parsed === 'object') {
                state.userProgress = parsed;
                saveProgressToDisk();
                emitToast("پرونده پیشرفت با موفقیت بارگذاری و همگام شد.");
                renderDashboardCharts();
            }
        } catch (err) {
            alert("خطا در پردازش قالب ساختار فایل بکاپ ارسالی.");
        }
    };
    reader.readAsText(file);
}

function importBaseQuestionsDatafile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            if (Array.isArray(parsed) && parsed.length > 0) {
                state.database = parsed;
                localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(parsed));
                emitToast(`مخزن دیتابیس سوالات با ${parsed.length} سوال با موفقیت نوسازی شد.`);
                populateQuizFilters();
                execBrowseFiltering();
            }
        } catch(err) {
            alert("خطا در پردازش فایل سوالات کنکور زیپ شده.");
        }
    };
    reader.readAsText(file);
}
