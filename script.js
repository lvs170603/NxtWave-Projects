/**
 * BMICheck — script.js
 * All original BMI business logic preserved + enhanced UX
 */

/* ============================================================
   CONSTANTS
   ============================================================ */

// SVG gauge: semicircle, center=(130,130), r=110
// Arc path: M 20 130 A 110 110 0 0 1 240 130
// Total arc length = Math.PI * 110 ≈ 345.58
const GAUGE_TOTAL   = Math.PI * 110; // ≈ 345.58
const GAUGE_CX      = 130;
const GAUGE_CY      = 130;
const GAUGE_R       = 110;
const BMI_SCALE_MAX = 40; // BMI axis max for gauge

/* ============================================================
   DOM REFERENCES
   ============================================================ */

const form          = document.getElementById('bmi-form');
const weightInput   = document.getElementById('weight');
const heightInput   = document.getElementById('height');
const weightUnit    = document.getElementById('weight-unit');
const heightUnit    = document.getElementById('height-unit');
const weightError   = document.getElementById('weight-error');
const heightError   = document.getElementById('height-error');

const stepInput     = document.getElementById('step-input');
const stepResult    = document.getElementById('step-result');

const gaugeArc      = document.getElementById('gauge-arc');
const gaugeDot      = document.getElementById('gauge-dot');
const gaugeBmiValue = document.getElementById('gauge-bmi-value');
const bmiCategory   = document.getElementById('bmi-category');
const categoryPill  = document.getElementById('category-pill');
const categoryDot   = document.getElementById('category-dot');
const warningEl     = document.getElementById('warning');
const progressFill  = document.getElementById('bmi-progress');
const resetBtn      = document.getElementById('reset-button');

const themeToggle   = document.getElementById('theme-toggle');
const btnMetric     = document.getElementById('btn-metric');
const btnImperial   = document.getElementById('btn-imperial');

const catCards = {
  blue:  document.querySelector('.cat-blue'),
  green: document.querySelector('.cat-green'),
  amber: document.querySelector('.cat-amber'),
  red:   document.querySelector('.cat-red'),
};

/* ============================================================
   STATE
   ============================================================ */

let isMetric = true; // true = kg/cm, false = lbs/ft+in

/* ============================================================
   THEME TOGGLE
   ============================================================ */

// Persist theme preference
const storedTheme = localStorage.getItem('bmi-theme') || 'dark';
document.documentElement.setAttribute('data-theme', storedTheme);

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('bmi-theme', next);
});

/* ============================================================
   UNIT TOGGLE
   ============================================================ */

btnMetric.addEventListener('click', () => switchUnit('metric'));
btnImperial.addEventListener('click', () => switchUnit('imperial'));

function switchUnit(unit) {
  isMetric = unit === 'metric';

  // Update toggle button states
  btnMetric.classList.toggle('active', isMetric);
  btnImperial.classList.toggle('active', !isMetric);
  btnMetric.setAttribute('aria-pressed', String(isMetric));
  btnImperial.setAttribute('aria-pressed', String(!isMetric));

  // Update unit labels and placeholders
  if (isMetric) {
    weightUnit.textContent = 'kg';
    heightUnit.textContent = 'cm';
    weightInput.placeholder = '70';
    heightInput.placeholder = '175';
    weightInput.max = '500';
    heightInput.max = '300';
  } else {
    weightUnit.textContent = 'lbs';
    heightUnit.textContent = 'in';
    weightInput.placeholder = '154';
    heightInput.placeholder = '69';
    weightInput.max = '1100';
    heightInput.max = '120';
  }

  // Clear inputs and errors on switch
  weightInput.value = '';
  heightInput.value = '';
  clearError(weightInput, weightError);
  clearError(heightInput, heightError);
}

/* ============================================================
   FORM VALIDATION HELPERS
   ============================================================ */

function setError(input, errorEl, message) {
  input.classList.add('error');
  errorEl.textContent = message;
  input.setAttribute('aria-invalid', 'true');
}

function clearError(input, errorEl) {
  input.classList.remove('error');
  errorEl.textContent = '';
  input.removeAttribute('aria-invalid');
}

function validateInputs(weightVal, heightVal) {
  let valid = true;

  clearError(weightInput, weightError);
  clearError(heightInput, heightError);

  if (!weightVal || isNaN(weightVal)) {
    setError(weightInput, weightError, 'Please enter your weight.');
    valid = false;
  } else if (weightVal <= 0) {
    setError(weightInput, weightError, 'Weight must be greater than 0.');
    valid = false;
  } else if (isMetric && weightVal > 500) {
    setError(weightInput, weightError, 'Please enter a valid weight (≤ 500 kg).');
    valid = false;
  } else if (!isMetric && weightVal > 1100) {
    setError(weightInput, weightError, 'Please enter a valid weight (≤ 1100 lbs).');
    valid = false;
  }

  if (!heightVal || isNaN(heightVal)) {
    setError(heightInput, heightError, 'Please enter your height.');
    valid = false;
  } else if (heightVal <= 0) {
    setError(heightInput, heightError, 'Height must be greater than 0.');
    valid = false;
  } else if (isMetric && heightVal > 300) {
    setError(heightInput, heightError, 'Please enter a valid height (≤ 300 cm).');
    valid = false;
  } else if (!isMetric && heightVal > 120) {
    setError(heightInput, heightError, 'Please enter a valid height (≤ 120 in).');
    valid = false;
  }

  return valid;
}

/* ============================================================
   BMI CALCULATION  (Original logic preserved)
   ============================================================ */

/**
 * Calculate BMI.
 * @param {number} weightVal  — kg or lbs depending on unit
 * @param {number} heightVal  — cm or inches depending on unit
 * @returns {number} BMI rounded to 1 decimal
 */
function calculateBMI(weightVal, heightVal) {
  if (isMetric) {
    const heightM = heightVal / 100;
    return +(weightVal / (heightM * heightM)).toFixed(1);
  } else {
    // Imperial formula: BMI = (weight_lbs / height_in²) × 703
    return +((weightVal / (heightVal * heightVal)) * 703).toFixed(1);
  }
}

/**
 * Determine BMI category and associated styling.
 * @param {number} bmi
 * @returns {{ label, state, gaugeColor, progressGradient, advice, catKey }}
 */
function getBMIInfo(bmi) {
  if (bmi < 18.5) return {
    label:            'Underweight',
    state:            'state-blue',
    gaugeColor:       '#60a5fa',
    progressGradient: 'linear-gradient(90deg,#3b82f6,#60a5fa)',
    advice:           'Consider eating nutrient-rich foods and strength training to gain healthy weight.',
    catKey:           'blue',
  };
  if (bmi < 25) return {
    label:            'Normal Weight',
    state:            'state-green',
    gaugeColor:       '#34d399',
    progressGradient: 'linear-gradient(90deg,#10b981,#34d399)',
    advice:           'Great job! Maintain your weight with a balanced diet and regular exercise.',
    catKey:           'green',
  };
  if (bmi < 30) return {
    label:            'Overweight',
    state:            'state-amber',
    gaugeColor:       '#fbbf24',
    progressGradient: 'linear-gradient(90deg,#f59e0b,#fbbf24)',
    advice:           'Try reducing sugary and fatty foods. Include more physical activity in your routine.',
    catKey:           'amber',
  };
  return {
    label:            'Obesity',
    state:            'state-red',
    gaugeColor:       '#f87171',
    progressGradient: 'linear-gradient(90deg,#ef4444,#f87171)',
    advice:           "It's important to consult a healthcare provider for personalized advice.",
    catKey:           'red',
  };
}

/* ============================================================
   GAUGE ANIMATION
   ============================================================ */

/**
 * Update the SVG gauge arc and dot position.
 * @param {number} bmi
 * @param {string} color  — hex color string
 */
function animateGauge(bmi, color) {
  const t       = Math.min(bmi / BMI_SCALE_MAX, 1);
  const arcLen  = t * GAUGE_TOTAL;

  // Animate the arc fill
  gaugeArc.style.strokeDasharray = `${arcLen} ${GAUGE_TOTAL}`;
  gaugeArc.style.stroke          = color;

  // Calculate dot (x, y) along the semicircle
  // At fraction t: angle goes from π (left) to 0 (right) counter-clockwise (math)
  const angle = Math.PI - t * Math.PI;
  const dotX  = GAUGE_CX + GAUGE_R * Math.cos(angle);
  const dotY  = GAUGE_CY - GAUGE_R * Math.sin(angle);

  gaugeDot.setAttribute('cx', dotX.toFixed(2));
  gaugeDot.setAttribute('cy', dotY.toFixed(2));
  gaugeDot.style.filter = `drop-shadow(0 0 6px ${color})`;
}

/* ============================================================
   DISPLAY RESULTS
   ============================================================ */

function showResults(bmi, info) {
  // BMI numeric display in gauge center
  gaugeBmiValue.textContent = bmi;
  gaugeBmiValue.style.color = info.gaugeColor;

  // Category pill
  // Remove old state classes
  categoryPill.className = 'category-pill';
  categoryPill.classList.add(info.state);
  bmiCategory.textContent  = info.label;
  categoryDot.style.background = info.gaugeColor;

  // Health advice
  warningEl.textContent = info.advice;

  // Progress bar (scale: BMI 0-40 → 0-100%)
  const pct = Math.min((bmi / BMI_SCALE_MAX) * 100, 100);
  progressFill.style.width      = `${pct}%`;
  progressFill.style.background = info.progressGradient;

  // Highlight active category card
  Object.keys(catCards).forEach(key => {
    catCards[key].classList.toggle('active', key === info.catKey);
  });

  // Animate gauge
  animateGauge(bmi, info.gaugeColor);
}

/* ============================================================
   FORM SUBMIT  (Original event logic preserved)
   ============================================================ */

form.addEventListener('submit', function (event) {
  event.preventDefault();

  const weightVal = parseFloat(weightInput.value);
  const heightVal = parseFloat(heightInput.value);

  if (!validateInputs(weightVal, heightVal)) return;

  const bmi  = calculateBMI(weightVal, heightVal);
  const info = getBMIInfo(bmi);

  // Switch from input step to result step
  stepInput.classList.add('hidden');
  stepResult.classList.remove('hidden');
  stepResult.classList.add('slide-in');

  // Populate results
  showResults(bmi, info);

  // Clear inputs after calculation (original behaviour preserved)
  weightInput.value = '';
  heightInput.value = '';
});

/* ============================================================
   RESET  (Original event logic preserved)
   ============================================================ */

resetBtn.addEventListener('click', function () {
  // Reset gauge to zero
  gaugeArc.style.strokeDasharray = `0 ${GAUGE_TOTAL}`;
  gaugeDot.setAttribute('cx', '20');
  gaugeDot.setAttribute('cy', '130');

  // Reset all text
  gaugeBmiValue.textContent   = '--';
  gaugeBmiValue.style.color   = '';
  bmiCategory.textContent     = '--';
  categoryPill.className      = 'category-pill';
  warningEl.textContent       = '';
  progressFill.style.width    = '0%';
  progressFill.style.background = '';

  // Remove active from category cards
  Object.values(catCards).forEach(c => c.classList.remove('active'));

  // Switch back to input step
  stepResult.classList.remove('slide-in');
  stepResult.classList.add('hidden');
  stepInput.classList.remove('hidden');
  stepInput.classList.add('slide-in');
  setTimeout(() => stepInput.classList.remove('slide-in'), 600);

  // Focus first input for accessibility
  weightInput.focus();
});

/* ============================================================
   REAL-TIME INLINE VALIDATION (UX Enhancement)
   ============================================================ */

weightInput.addEventListener('input', () => {
  if (weightInput.value) clearError(weightInput, weightError);
});
heightInput.addEventListener('input', () => {
  if (heightInput.value) clearError(heightInput, heightError);
});
