const questions = [
  { text: 'أول شيءٍ خلقه الله تعالى هو:', options: ['آدم عليه السلام', 'النخلة', 'القلم'] },
  { text: 'آخر آية نزلت في القرآن الكريم هي قوله تعالى:', options: ['واتقوا يومًا تُرجعون فيه إلى الله ..', 'اليوم أكملت لكم دينكم وأتممت عليكم نعمتي ..', 'إنا أنزلناه في ليلة القدر'] },
  { text: 'السورة التي تسمى عروس القرآن هي:', options: ['الفاتحة', 'الرحمٰن', 'الواقعة'] },
  { text: 'كانت مهنة نبينا ﷺ هي:', options: ['رعي الغنم والتجارة', 'النجارة', 'الحدادة'] },
  { text: 'الصحابية التي لُقبت بـ «أم المساكين» رضي الله عنها هي:', options: ['زينب بنت خزيمة', 'أم سلمة', 'هند بنت عتبة'] },
  { text: 'عدد ملوك المملكة العربية السعودية الثالثة:', options: ['٥ ملوك', '٧ ملوك', '٩ ملوك'] },
  { text: 'أغلى عملة في العالم:', options: ['الدولار الأمريكي', 'الدينار الكويتي', 'الجنيه الإسترليني'] },
  { text: 'أكثر اللغات انتشارًا في العالم هي اللغة:', options: ['العربية', 'الإنجليزية', 'الأردية'] },
  { text: 'رقم بلاغات الابتزاز:', options: ['1909', '1919', '1900'] },
  { text: 'يبلغ طول قطار الحرمين الشريفين:', options: ['450 كم', '500 كم', '650 كم'] },
  { text: 'حقق منتخبنا السعودي الأول كأس آسيا:', options: ['مرة واحدة', '٣ مرات', '٥ مرات'] },
  { text: 'أسرع حيوان على وجه الأرض هو:', options: ['صقر الشاهين', 'اليعسوب', 'الحصان العربي'] }
];

const letters = ['أ', 'ب', 'ج'];
const form = document.getElementById('competitionForm');
const questionsContainer = document.getElementById('questionsContainer');
const submitBtn = document.getElementById('submitBtn');
const btnText = submitBtn.querySelector('.btn-text');
const spinner = submitBtn.querySelector('.spinner');
const statusBanner = document.getElementById('statusBanner');
const successDialog = document.getElementById('successDialog');

function renderQuestions() {
  questionsContainer.innerHTML = questions.map((q, index) => `
    <article class="question-card" data-question="${index}">
      <div class="question-number">السؤال ${index + 1} من ${questions.length}</div>
      <p class="question-text">${index + 1}- ${q.text}</p>
      <div class="options">
        ${q.options.map((option, optionIndex) => `
          <label class="option">
            <input type="radio" name="q${index + 1}" value="${optionIndex}" required>
            <span><b>${letters[optionIndex]} -</b> ${option}</span>
          </label>
        `).join('')}
      </div>
    </article>
  `).join('');
}

function normalizePhone(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('966')) return `0${digits.slice(3)}`;
  if (digits.startsWith('5') && digits.length === 9) return `0${digits}`;
  return digits;
}

function showStatus(message, type = 'error') {
  statusBanner.textContent = message;
  statusBanner.className = `status-banner ${type}`;
  statusBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function clearStatus() {
  statusBanner.className = 'status-banner hidden';
  statusBanner.textContent = '';
}

function setLoading(loading) {
  submitBtn.disabled = loading;
  btnText.textContent = loading ? 'جارٍ إرسال المشاركة...' : 'إرسال المشاركة';
  spinner.classList.toggle('hidden', !loading);
}

function validateForm() {
  clearStatus();
  document.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
  const name = document.getElementById('fullName').value.trim().replace(/\s+/g, ' ');
  const category = document.getElementById('category').value;
  const phone = normalizePhone(document.getElementById('phone').value);
  const nameParts = name.split(' ').filter(Boolean);

  if (nameParts.length < 4) {
    document.getElementById('fullName').classList.add('invalid');
    showStatus('فضلاً اكتب الاسم الرباعي كاملاً.');
    return null;
  }
  if (!category) {
    document.getElementById('category').classList.add('invalid');
    showStatus('فضلاً اختر فئة المشارك.');
    return null;
  }
  if (!/^05\d{8}$/.test(phone)) {
    document.getElementById('phone').classList.add('invalid');
    showStatus('فضلاً أدخل رقم جوال سعودي صحيحًا مثل 05xxxxxxxx.');
    return null;
  }

  const answers = [];
  for (let i = 1; i <= questions.length; i++) {
    const selected = form.querySelector(`input[name="q${i}"]:checked`);
    if (!selected) {
      const card = document.querySelector(`[data-question="${i - 1}"]`);
      card.classList.add('invalid');
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showStatus(`لم تتم الإجابة عن السؤال رقم ${i}.`);
      return null;
    }
    answers.push(Number(selected.value));
  }

  if (!document.getElementById('consent').checked) {
    showStatus('يلزم الموافقة على إقرار صحة البيانات قبل الإرسال.');
    return null;
  }
  return { fullName: name, category, phone, answers, website: '' };
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const payload = validateForm();
  if (!payload) return;

  setLoading(true);
  try {
    const response = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'تعذر إرسال المشاركة، حاول مرة أخرى.');

    form.reset();
    clearStatus();
    successDialog.showModal();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    showStatus(error.message || 'حدث خطأ غير متوقع.');
  } finally {
    setLoading(false);
  }
});

document.getElementById('closeDialog').addEventListener('click', () => successDialog.close());
renderQuestions();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
