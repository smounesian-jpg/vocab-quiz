// ═══════════════════════════════════════════════
// آزمون‌یار هوشمند - نسخه IndexedDB
// داده‌ها با IndexedDB ذخیره می‌شن (پایدار در PWA)
// ═══════════════════════════════════════════════

let mainDatabase = [];
let leitnerDatabase = [];
let activePool = [];
let currentIndex = 0;
let userScore = 0;
let isLeitnerMode = false;
let orderMode = 'sequential';
let currentQuestionData = null;

// ────────────────────────────────────
// Service Worker registration
// ────────────────────────────────────
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/vocab-quiz/service-worker.js')
        .then(reg => {
            console.log('SW registered');
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'activated') {
                        window.location.reload();
                    }
                });
            });
        })
        .catch(err => console.warn('SW failed:', err));
}

// ────────────────────────────────────
// IndexedDB wrapper
// ────────────────────────────────────
const IDB_NAME = 'VocabQuizDB';
const IDB_VERSION = 1;
const IDB_STORE = 'appData';

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = e => {
            e.target.result.createObjectStore(IDB_STORE);
        };
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(e.target.error);
    });
}

async function idbGet(key) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readonly');
            const req = tx.objectStore(IDB_STORE).get(key);
            req.onsuccess = () => resolve(req.result ?? null);
            req.onerror = () => reject(req.error);
        });
    } catch(e) {
        console.warn('idbGet error:', e);
        return null;
    }
}

async function idbSet(key, value) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readwrite');
            const req = tx.objectStore(IDB_STORE).put(value, key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch(e) {
        console.warn('idbSet error:', e);
    }
}

// ────────────────────────────────────
// ذخیره همه چیز در IndexedDB
// ────────────────────────────────────
async function saveProgress() {
    await idbSet('leitner_db', leitnerDatabase);
    await idbSet('current_index', currentIndex);
    await idbSet('user_score', userScore);
}

async function saveMainDB() {
    await idbSet('main_db', mainDatabase);
}

// ────────────────────────────────────
// تم (Theme)
// ────────────────────────────────────
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('quiz_dark_theme', document.body.classList.contains('dark-theme'));
}

if (localStorage.getItem('quiz_dark_theme') === 'true') {
    document.body.classList.add('dark-theme');
}

// ────────────────────────────────────
// ایمپورت دستی (فقط اگه auto-fetch کار نکرد)
// ────────────────────────────────────
function importJSONFile() {
    const fileInput = document.getElementById('json-file-input');
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            if (Array.isArray(parsed)) {
                mainDatabase = parsed;
                leitnerDatabase = [];
                currentIndex = 0;
                userScore = 0;
                orderMode = 'sequential';
                await saveMainDB();
                await saveProgress();
                alert(`✅ بارگذاری موفق: ${mainDatabase.length} سوال ذخیره شد.`);
                setupQuizMode();
            } else {
                alert("فرمت فایل باید یک آرایه از سوالات باشد.");
            }
        } catch(err) {
            alert("خطا در خواندن فایل JSON.");
        }
    };
    reader.readAsText(file);
}

// ────────────────────────────────────
// Quiz Logic
// ────────────────────────────────────
function setupQuizMode() {
    if (isLeitnerMode) {
        activePool = [...leitnerDatabase];
        document.getElementById('filter-bar').style.display = 'none';
    } else {
        activePool = [...mainDatabase];
        document.getElementById('filter-bar').style.display = 'flex';
        if (orderMode === 'random') activePool.sort(() => Math.random() - 0.5);
    }

    document.getElementById('total-count').textContent = mainDatabase.length;
    document.getElementById('leitner-count').textContent = leitnerDatabase.length;
    document.getElementById('score-count').textContent = userScore;

    if (activePool.length > 0) {
        if (currentIndex >= activePool.length) currentIndex = 0;
        document.getElementById('options-box').style.display = 'grid';
        document.getElementById('test-info-header').style.display = 'block';
        renderQuestion();
    } else {
        document.getElementById('options-box').style.display = 'none';
        document.getElementById('test-info-header').style.display = 'none';
        document.getElementById('question-text').textContent = isLeitnerMode
            ? "جعبه لایتنر خالی است!"
            : "⚠️ فایل سوالات پیدا نشد. لطفاً دستی ایمپورت کنید.";
    }
}

function renderQuestion() {
    if (activePool.length === 0) return;
    currentQuestionData = activePool[currentIndex];

    const testId = currentQuestionData.id || (currentIndex + 1);
    const testSource = currentQuestionData.source || "نامشخص";
    document.getElementById('test-info-header').innerHTML =
        `🔹 شماره تست: ${testId} <br>🔹 منبع: ${testSource}`;

    document.getElementById('question-text').textContent = currentQuestionData.question || '';

    for (let i = 1; i <= 4; i++) {
        const btn = document.getElementById('opt' + i);
        btn.textContent = `${i}. ` + (currentQuestionData['option' + i] || '');
        btn.disabled = false;
        btn.style.backgroundColor = 'var(--bg-color)';
        btn.style.color = 'var(--text-color)';
    }

    document.getElementById('explanation-box').style.display = 'none';
    document.getElementById('next-btn').style.display = 'none';
}

async function submitAnswer(selected) {
    for (let i = 1; i <= 4; i++) document.getElementById('opt' + i).disabled = true;

    const correct = parseInt(currentQuestionData.correct_answer) || 1;

    if (selected === correct) {
        document.getElementById('opt' + selected).style.backgroundColor = 'var(--success)';
        document.getElementById('opt' + selected).style.color = 'white';
        userScore += 10;
        if (isLeitnerMode) {
            leitnerDatabase = leitnerDatabase.filter(item => item.id !== currentQuestionData.id);
        }
    } else {
        document.getElementById('opt' + selected).style.backgroundColor = 'var(--danger)';
        document.getElementById('opt' + selected).style.color = 'white';
        document.getElementById('opt' + correct).style.backgroundColor = 'var(--success)';
        document.getElementById('opt' + correct).style.color = 'white';

        if (!leitnerDatabase.some(item => item.id === currentQuestionData.id)) {
            leitnerDatabase.push(currentQuestionData);
        }
    }

    document.getElementById('explanation-box').innerHTML =
        `<strong>💡 پاسخ تشریحی:</strong><br>${currentQuestionData.explanation || 'توضیحی ثبت نشده.'}`;
    document.getElementById('explanation-box').style.display = 'block';
    document.getElementById('next-btn').style.display = 'block';

    document.getElementById('leitner-count').textContent = leitnerDatabase.length;
    document.getElementById('score-count').textContent = userScore;

    await saveProgress(); // ذخیره تغییرات در IndexedDB
}

function loadNextQuestion() {
    if (activePool.length > 0) {
        currentIndex = (currentIndex + 1) % activePool.length;
        idbSet('current_index', currentIndex); // ذخیره ایندکس جدید (بدون await)
        renderQuestion();
    }
}

function changeOrderMode() {
    orderMode = document.getElementById('order-select').value;
    currentIndex = 0;
    setupQuizMode();
}

function toggleLeitnerMode() {
    isLeitnerMode = !isLeitnerMode;
    currentIndex = 0;
    document.getElementById('leitner-toggle').textContent = isLeitnerMode
        ? "📥 حالت: جعبه لایتنر (غلط‌ها)"
        : "📥 حالت: کل سوالات";
    setupQuizMode();
}

// ────────────────────────────────────
// بارگذاری اولیه
// ────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('question-text').textContent = '⏳ در حال بارگذاری...';

    // ۱. بارگذاری progress از IndexedDB
    const savedLeitner = await idbGet('leitner_db');
    const savedIndex = await idbGet('current_index');
    const savedScore = await idbGet('user_score');
    const savedMainDB = await idbGet('main_db');

    if (Array.isArray(savedLeitner)) leitnerDatabase = savedLeitner;
    if (savedIndex !== null) currentIndex = parseInt(savedIndex) || 0;
    if (savedScore !== null) userScore = parseInt(savedScore) || 0;

    // ۲. اگه mainDatabase توی IndexedDB هست، فوری بارگذاری کن
    if (Array.isArray(savedMainDB) && savedMainDB.length > 0) {
        mainDatabase = savedMainDB;
        setupQuizMode();
        // در پس‌زمینه fetch کن تا آپدیت بمونه
        fetchAndUpdateMainDB();
        return;
    }

    // ۳. اگه توی IndexedDB نبود، از سرور fetch کن
    await fetchAndUpdateMainDB();
});

async function fetchAndUpdateMainDB() {
    try {
        // از شبکه با no-cache درخواست بده
        const res = await fetch('/vocab-quiz/vocab_ALL_756.json', {
            cache: 'no-cache'
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const freshData = await res.json();
        if (Array.isArray(freshData) && freshData.length > 0) {
            mainDatabase = freshData;
            await saveMainDB(); // ذخیره در IndexedDB
            setupQuizMode();
        }
    } catch (err) {
        console.warn('Auto-fetch failed, trying cache fallback:', err);
        // fallback به کش سرویس‌ورکر (در صورت آفلاین بودن)
        try {
            const cache = await caches.open('vocab-quiz-v6'); // همان نام کش فعلی
            const cachedResponse = await cache.match('/vocab-quiz/vocab_ALL_756.json');
            if (cachedResponse) {
                const cachedData = await cachedResponse.json();
                if (Array.isArray(cachedData) && cachedData.length > 0) {
                    mainDatabase = cachedData;
                    await saveMainDB();
                    setupQuizMode();
                    return;
                }
            }
        } catch (cacheErr) {
            console.warn('Cache fallback also failed:', cacheErr);
        }

        // اگر هیچ داده‌ای در دسترس نبود، UI رو آپدیت کن
        if (mainDatabase.length === 0) {
            document.getElementById('question-text').textContent =
                '⚠️ بارگذاری خودکار ناموفق. لطفاً فایل JSON را دستی ایمپورت کنید.';
            document.getElementById('options-box').style.display = 'none';
            document.getElementById('next-btn').style.display = 'none';
        }
    }
}
