let words = [];
let currentIndex = 0;
let score = 0;
let currentQuestion = null;

// ۱. ثبت سرویس ورکر برای فعال‌سازی حالت آفلاین و دکمه نصب PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
        .then(() => console.log('Service Worker Registered Successfully'))
        .catch(err => console.log('Service Worker Registration Failed', err));
}

// ۲. دریافت دیتابیس لغات با آدرس کامل و تصحیح‌شده گیت‌هاب
// پیدا کردن خودکار مسیر اصلی پروژه روی گیت‌هاب پیج
const repoPath = window.location.pathname.split('/')[1];
const jsonUrl = window.location.origin + '/' + repoPath + '/vocab_ALL_756.json';

fetch(jsonUrl)

    .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
    })
    .then(data => {
        words = data;
        document.getElementById('total-count').textContent = words.length;
        loadProgress();
        showQuestion();
    }).catch(err => {
        console.error("Error loading JSON database:", err);
        alert("خطا در بارگذاری دیتابیس لغات. مطمئن شوید فایل json در مخزن گیت‌هاب موجود است.");
    });

// ۳. نمایش سوال چهارگزینه‌ای
function showQuestion() {
    if (words.length === 0) return;
    
    currentQuestion = words[currentIndex];
    
    document.getElementById('question-text').textContent = currentQuestion.question;
    document.getElementById('opt1').textContent = "۱) " + currentQuestion.option1;
    document.getElementById('opt2').textContent = "۲) " + currentQuestion.option2;
    document.getElementById('opt3').textContent = "۳) " + currentQuestion.option3;
    document.getElementById('opt4').textContent = "۴) " + currentQuestion.option4;
    
    // ریسیت کردن ظاهر دکمه‌ها برای سوال جدید
    for (let i = 1; i <= 4; i++) {
        document.getElementById('opt' + i).disabled = false;
        document.getElementById('opt' + i).style.backgroundColor = '#f1f5f9';
        document.getElementById('opt' + i).style.color = '#334155';
    }
    document.getElementById('explanation-box').style.display = 'none';
    document.getElementById('next-btn').style.display = 'none';
}

// ۴. بررسی پاسخ کاربر و محاسبه امتیاز
function checkAnswer(selected) {
    for (let i = 1; i <= 4; i++) {
        document.getElementById('opt' + i).disabled = true;
    }
    
    const correct = currentQuestion.correct_answer;
    if (selected === correct) {
        document.getElementById('opt' + selected).style.backgroundColor = '#10b981';
        document.getElementById('opt' + selected).style.color = 'white';
        score += 10;
    } else {
        document.getElementById('opt' + selected).style.backgroundColor = '#ef4444';
        document.getElementById('opt' + selected).style.color = 'white';
        document.getElementById('opt' + correct).style.backgroundColor = '#10b981';
        document.getElementById('opt' + correct).style.color = 'white';
    }
    
    // نمایش پاسخ تشریحی
    document.getElementById('explanation-box').style.display = 'block';
    document.getElementById('explanation-box').innerHTML = "<b>پاسخ تشریحی:</b> " + (currentQuestion.explanation || "توضیحی ثبت نشده است.");
    document.getElementById('next-btn').style.display = 'block';
    
    // رفتن به لغت بعدی (چرخش حلقوی واژه‌ها)
    currentIndex = (currentIndex + 1) % words.length;
    saveProgress();
}

// ۵. دکمه سوال بعدی
function nextQuestion() {
    showQuestion();
}

// ۶. ذخیره خودکار پیشرفت و لایتنر در حافظه مرورگر گوشی
function saveProgress() {
    localStorage.setItem('v_idx', currentIndex);
    localStorage.setItem('v_score', score);
    document.getElementById('seen-count').textContent = currentIndex;
    document.getElementById('score-count').textContent = score;
}

// ۷. بارگذاری پیشرفت قبلی کاربر هنگام باز شدن برنامه
function loadProgress() {
    const sIdx = localStorage.getItem('v_idx');
    const sScore = localStorage.getItem('v_score');
    if (sIdx) currentIndex = parseInt(sIdx);
    if (sScore) score = parseInt(sScore);
    document.getElementById('seen-count').textContent = currentIndex;
    document.getElementById('score-count').textContent = score;
}
