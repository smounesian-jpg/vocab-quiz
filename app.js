let mainDatabase = [];
let leitnerDatabase = [];
let activePool = [];

let currentIndex = 0;
let userScore = 0;
let isLeitnerMode = false;
let orderMode = 'sequential'; // sequential or random
let currentQuestionData = null;

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/vocab-quiz/service-worker.js')
        .then(() => console.log('Service Worker Active'))
        .catch(err => console.log('SW Failed', err));
}

// ۱. مدیریت تم رنگی
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('quiz_dark_theme', document.body.classList.contains('dark-theme'));
}
if (localStorage.getItem('quiz_dark_theme') === 'true') document.body.classList.add('dark-theme');

// ۲. پردازش و ایمپورت فایل JSON
function importJSONFile() {
    const fileInput = document.getElementById('json-file-input');
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            if (Array.isArray(parsed)) {
                mainDatabase = parsed;
                leitnerDatabase = [];
                currentIndex = 0;
                userScore = 0;
                orderMode = 'sequential';
                
                saveToLocalStorage();
                alert(`بانک تست با موفقیت بارگذاری شد: ${mainDatabase.length} سوال.`);
                setupQuizMode();
            } else {
                alert("فرمت فایل باید یک آرایه مجزا از سوالات باشد.");
            }
        } catch (err) {
            alert("خطا در خواندن ساختار فایل JSON.");
        }
    };
    reader.readAsText(file);
}

// ۳. پیکربندی حالت فیلترها و استخر سوالات فعال
function setupQuizMode() {
    if (isLeitnerMode) {
        activePool = [...leitnerDatabase];
        document.getElementById('filter-bar').style.display = 'none';
    } else {
        activePool = [...mainDatabase];
        document.getElementById('filter-bar').style.display = 'flex';
        
        if (orderMode === 'random') {
            // شافل کردن سوالات بدون دستکاری دیتابیس اصلی
            activePool.sort(() => Math.random() - 0.5);
        }
    }
    
    document.getElementById('total-count').textContent = mainDatabase.length;
    document.getElementById('leitner-count').textContent = leitnerDatabase.length;
    document.getElementById('score-count').textContent = userScore;
    
    if (activePool.length > 0) {
        if (currentIndex >= activePool.length) currentIndex = 0;
        document.getElementById('options-box').style.display = 'grid';
        renderQuestion();
    } else {
        document.getElementById('options-box').style.display = 'none';
        document.getElementById('source-wrapper').innerHTML = '';
        document.getElementById('question-text').textContent = isLeitnerMode ? 
            "جعبه لایتنر شما خالی است! سوالی با پاسخ اشتباه وجود ندارد." : "لطفاً ابتدا فایل تست‌ها را ایمپورت کنید.";
    }
}

// ۴. نمایش سوال کنکور، منبع و گزینه‌ها به صورت کاملاً RTL
function renderQuestion() {
    if (activePool.length === 0) return;
    
    currentQuestionData = activePool[currentIndex];
    
    // تفکیک و استخراج خودکار منبع تست در صورت وجود
    let rawQuestion = currentQuestionData.question || '';
    let sourceMatch = rawQuestion.match(/^\[(.*?)\]/);
    
    if (sourceMatch) {
        document.getElementById('source-wrapper').innerHTML = `<span class="source-tag">📌 منبع: ${sourceMatch[1]}</span>`;
        document.getElementById('question-text').textContent = rawQuestion.replace(/^\[.*?\]/, '').trim();
    } else {
        document.getElementById('source-wrapper').innerHTML = '';
        document.getElementById('question-text').textContent = rawQuestion;
    }
    
    // گزینه‌ها
    document.getElementById('opt1').textContent = "۱) " + (currentQuestionData.option1 || '');
    document.getElementById('opt2').textContent = "۲) " + (currentQuestionData.option2 || '');
    document.getElementById('opt3').textContent = "۳) " + (currentQuestionData.option3 || '');
    document.getElementById('opt4').textContent = "۴) " + (currentQuestionData.option4 || '');
    
    for (let i = 1; i <= 4; i++) {
        const btn = document.getElementById('opt' + i);
        btn.disabled = false;
        btn.style.backgroundColor = 'var(--bg-color)';
        btn.style.color = 'var(--text-color)';
    }
    document.getElementById('explanation-box').style.display = 'none';
    document.getElementById('next-btn').style.display = 'none';
}

// ۵. تحلیل هوشمند پاسخ کاربر و ارسال اتوماتیک به لایتنر در صورت خطا
function submitAnswer(selected) {
    for (let i = 1; i <= 4; i++) document.getElementById('opt' + i).disabled = true;
    
    const correct = parseInt(currentQuestionData.correct_answer) || 1;
    
    if (selected === correct) {
        document.getElementById('opt' + selected).style.backgroundColor = 'var(--success)';
        document.getElementById('opt' + selected).style.color = 'white';
        userScore += 10;
        
        // اگر در حالت لایتنر پاسخ درست داد، سوال از لایتنر خارج می‌شود
        if (isLeitnerMode) {
            leitnerDatabase = leitnerDatabase.filter(item => item.question !== currentQuestionData.question);
        }
    } else {
        document.getElementById('opt' + selected).style.backgroundColor = 'var(--danger)';
        document.getElementById('opt' + selected).style.color = 'white';
        document.getElementById('opt' + correct).style.backgroundColor = 'var(--success)';
        document.getElementById('opt' + correct).style.color = 'white';
        
        // اضافه کردن سوال اشتباه به لایتنر در صورت عدم وجود
        const exists = leitnerDatabase.some(item => item.question === currentQuestionData.question);
        if (!exists) leitnerDatabase.push(currentQuestionData);
    }
    
    document.getElementById('explanation-box').innerHTML = `<strong>💡 پاسخ تشریحی:</strong><br>${currentQuestionData.explanation || 'توضیحی ثبت نشده است.'}`;
    document.getElementById('explanation-box').style.display = 'block';
    document.getElementById('next-btn').style.display = 'block';
    
    document.getElementById('leitner-count').textContent = leitnerDatabase.length;
    document.getElementById('score-count').textContent = userScore;
    saveToLocalStorage();
}

function loadNextQuestion() {
    if (activePool.length > 0) {
        currentIndex = (currentIndex + 1) % activePool.length;
        localStorage.setItem('quiz_current_index', currentIndex);
        renderQuestion();
    }
}

// ۶. فیلترها و سوییچ کردن حالت‌ها
function changeOrderMode() {
    orderMode = document.getElementById('order-select').value;
    currentIndex = 0;
    setupQuizMode();
}

function toggleLeitnerMode() {
    isLeitnerMode = !isLeitnerMode;
    currentIndex = 0;
    document.getElementById('leitner-toggle').textContent = isLeitnerMode ? "📥 حالت: جعبه لایتنر (غلط‌ها)" : "📥 حالت: کل سوالات";
    setupQuizMode();
}

// ۷. سیستم ذخیره پایدار در حافظه محلی گوشی
function saveToLocalStorage() {
    localStorage.setItem('cached_main_db', JSON.stringify(mainDatabase));
    localStorage.setItem('cached_leitner_db', JSON.stringify(leitnerDatabase));
    localStorage.setItem('quiz_current_index', currentIndex);
    localStorage.setItem('quiz_user_score', userScore);
}

window.addEventListener('DOMContentLoaded', () => {
    const localMain = localStorage.getItem('cached_main_db');
    const localLeitner = localStorage.getItem('cached_leitner_db');
    const localIndex = localStorage.getItem('quiz_current_index');
    const localScore = localStorage.getItem('quiz_user_score');
    
    if (localMain) mainDatabase = JSON.parse(localMain);
    if (localLeitner) leitnerDatabase = JSON.parse(localLeitner);
    if (localIndex) currentIndex = parseInt(localIndex);
    if (localScore) userScore = parseInt(localScore);
    
    if (mainDatabase.length > 0 || leitnerDatabase.length > 0) {
        setupQuizMode();
    }
});
