let quizDatabase = [];
let currentIndex = 0;
let userScore = 0;
let currentQuestionData = null;

// ۱. ثبت سرویس ورکر با مسیر دقیق مخزن
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/vocab-quiz/service-worker.js')
        .then(() => console.log('Service Worker Active'))
        .catch(err => console.log('SW Registration Failed', err));
}

// ۲. تم تاریک و روشن
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('theme_preference', isDark ? 'dark' : 'light');
    document.querySelector('.theme-btn').textContent = isDark ? '☀️' : '🌙';
}

if (localStorage.getItem('theme_preference') === 'dark') {
    document.body.classList.add('dark-theme');
    document.querySelector('.theme-btn').textContent = '☀️';
}

// ۳. دریافت فایل ایمپورت شده
function importJSONFile() {
    const fileInput = document.getElementById('json-file-input');
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsedData = JSON.parse(e.target.result);
            if (Array.isArray(parsedData)) {
                quizDatabase = parsedData;
                localStorage.setItem('cached_quiz_db', JSON.stringify(quizDatabase));
                currentIndex = 0;
                userScore = 0;
                localStorage.setItem('quiz_current_index', currentIndex);
                localStorage.setItem('quiz_user_score', userScore);
                
                alert(`موفقیت‌آمیز! تعداد ${quizDatabase.length} سوال بارگذاری شد.`);
                initQuizLayout();
            } else {
                alert("خطا: ساختار فایل استاندارد نیست.");
            }
        } catch (err) {
            alert("خطا در پردازش فایل JSON.");
        }
    };
    reader.readAsText(file);
}

function initQuizLayout() {
    document.getElementById('total-count').textContent = quizDatabase.length;
    document.getElementById('score-count').textContent = userScore;
    if (quizDatabase.length > 0) {
        document.getElementById('options-box').style.display = 'grid';
        renderQuestion();
    }
}

function renderQuestion() {
    if (quizDatabase.length === 0) return;
    
    currentQuestionData = quizDatabase[currentIndex];
    document.getElementById('question-text').textContent = `${currentIndex + 1}. ${currentQuestionData.question}`;
    
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

function submitAnswer(selectedOption) {
    for (let i = 1; i <= 4; i++) {
        document.getElementById('opt' + i).disabled = true;
    }
    
    const correctAnswer = parseInt(currentQuestionData.correct_answer) || 1;
    const explanation = currentQuestionData.explanation || "توضیح تشریحی ندارد.";
    
    if (selectedOption === correctAnswer) {
        document.getElementById('opt' + selectedOption).style.backgroundColor = 'var(--success)';
        document.getElementById('opt' + selectedOption).style.color = 'white';
        userScore += 10;
    } else {
        document.getElementById('opt' + selectedOption).style.backgroundColor = 'var(--danger)';
        document.getElementById('opt' + selectedOption).style.color = 'white';
        document.getElementById('opt' + correctAnswer).style.backgroundColor = 'var(--success)';
        document.getElementById('opt' + correctAnswer).style.color = 'white';
    }
    
    const expBox = document.getElementById('explanation-box');
    expBox.innerHTML = `<strong>💡 پاسخ تشریحی:</strong> <br>${explanation}`;
    expBox.style.display = 'block';
    
    document.getElementById('next-btn').style.display = 'block';
    document.getElementById('score-count').textContent = userScore;
    localStorage.setItem('quiz_user_score', userScore);
}

function loadNextQuestion() {
    currentIndex = (currentIndex + 1) % quizDatabase.length;
    localStorage.setItem('quiz_current_index', currentIndex);
    renderQuestion();
}

window.addEventListener('DOMContentLoaded', () => {
    const cachedDB = localStorage.getItem('cached_quiz_db');
    const cachedIndex = localStorage.getItem('quiz_current_index');
    const cachedScore = localStorage.getItem('quiz_user_score');
    
    if (cachedDB) {
        quizDatabase = JSON.parse(cachedDB);
        if (cachedIndex) currentIndex = parseInt(cachedIndex);
        if (cachedScore) userScore = parseInt(cachedScore);
        initQuizLayout();
    }
});
