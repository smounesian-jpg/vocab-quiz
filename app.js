let words = [];
let currentIndex = 0;
let score = 0;
let currentQuestion = null;

// ۱. ثبت سرویس ورکر به صورت نسبی و ساده
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
        .then(() => console.log('Service Worker Registered'))
        .catch(err => console.log('Service Worker Failed', err));
}

// ۲. دریافت دیتابیس لغات به صورت مستقیم و بدون پیشوند پوشه
fetch('vocab_ALL_756.json')
    .then(res => {
        if (!res.ok) throw new Error('File not found');
        return res.json();
    })
    .then(data => {
        words = data;
        document.getElementById('total-count').textContent = words.length;
        loadProgress();
        showQuestion();
    }).catch(err => {
        console.error(err);
        alert("خطا در بارگذاری لغات. لطفاً مطمئن شوید فایل vocab_ALL_756.json در گیت‌هاب شما وجود دارد.");
    });

function showQuestion() {
    if (words.length === 0) return;
    currentQuestion = words[currentIndex];
    document.getElementById('question-text').textContent = currentQuestion.question;
    document.getElementById('opt1').textContent = "۱) " + currentQuestion.option1;
    document.getElementById('opt2').textContent = "۲) " + currentQuestion.option2;
    document.getElementById('opt3').textContent = "۳) " + currentQuestion.option4; // اصلاح نام دکمه‌ها در صورت نیاز
    document.getElementById('opt4').textContent = "۴) " + currentQuestion.option4;
    
    for (let i = 1; i <= 4; i++) {
        document.getElementById('opt' + i).disabled = false;
        document.getElementById('opt' + i).style.backgroundColor = '#f1f5f9';
    }
    document.getElementById('explanation-box').style.display = 'none';
    document.getElementById('next-btn').style.display = 'none';
}

function checkAnswer(selected) {
    for (let i = 1; i <= 4; i++) document.getElementById('opt' + i).disabled = true;
    const correct = currentQuestion.correct_answer;
    if (selected === correct) {
        document.getElementById('opt' + selected).style.backgroundColor = '#10b981';
        score += 10;
    } else {
        document.getElementById('opt' + selected).style.backgroundColor = '#ef4444';
        document.getElementById('opt' + correct).style.backgroundColor = '#10b981';
    }
    document.getElementById('explanation-box').style.display = 'block';
    document.getElementById('explanation-box').innerHTML = "<b>توضیح:</b> " + (currentQuestion.explanation || "");
    document.getElementById('next-btn').style.display = 'block';
    currentIndex = (currentIndex + 1) % words.length;
    saveProgress();
}

function nextQuestion() { showQuestion(); }

// سیستم ذخیره پیشرفت لایتنر روی گوشی شما
function saveProgress() {
    localStorage.setItem('v_idx', currentIndex);
    localStorage.setItem('v_score', score);
    document.getElementById('seen-count').textContent = currentIndex;
    document.getElementById('score-count').textContent = score;
}

function loadProgress() {
    const sIdx = localStorage.getItem('v_idx');
    const sScore = localStorage.getItem('v_score');
    if (sIdx) currentIndex = parseInt(sIdx);
    if (sScore) score = parseInt(sScore);
    document.getElementById('seen-count').textContent = currentIndex;
    document.getElementById('score-count').textContent = score;
}
