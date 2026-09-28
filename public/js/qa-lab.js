// QA Lab: a small BMI calculator (the "app under test") and a test session that runs against it.
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- The app under test ---------- */
  var build = '1.0';
  var weightInput = document.getElementById('bmi-weight');
  var heightInput = document.getElementById('bmi-height');
  var appForm = document.getElementById('bmi-form');
  var out = document.getElementById('bmi-out');
  var appPanel = document.getElementById('lab-app');

  function category(bmi) {
    // v1.0 ships with a boundary bug: exactly 18.5 is treated as underweight.
    var normalFrom = build === '1.0' ? bmi > 18.5 : bmi >= 18.5;
    if (!normalFrom) return 'Underweight';
    if (bmi < 25) return 'Normal';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  }

  function isNumber(v) { return /^-?\d+(\.\d+)?$/.test(v); }

  function calculate(weightRaw, heightRaw) {
    var w = weightRaw.trim();
    var h = heightRaw.trim();
    if (!w || !h) return { ok: false, message: 'Enter your weight and height.' };
    if (!isNumber(w) || !isNumber(h)) return { ok: false, message: 'Use numbers only, e.g. 70 or 72.5.' };
    var kg = Number(w);
    var cm = Number(h);
    if (kg < 1 || kg > 500) return { ok: false, message: 'Weight must be between 1 and 500 kg.' };
    if (cm < 50 || cm > 272) return { ok: false, message: 'Height must be between 50 and 272 cm.' };
    var bmi = kg / Math.pow(cm / 100, 2);
    return { ok: true, value: bmi.toFixed(1), category: category(bmi) };
  }

  function describe(result) {
    return result.ok ? 'BMI ' + result.value + ' · ' + result.category : 'Error: "' + result.message + '"';
  }

  var lastResult = null;

  function render(result) {
    lastResult = result;
    out.textContent = '';
    out.classList.toggle('is-error', !result.ok);
    if (result.ok) {
      var value = document.createElement('span');
      value.className = 'bmi-value';
      value.textContent = 'BMI ' + result.value;
      var cat = document.createElement('span');
      cat.className = 'bmi-cat';
      cat.textContent = result.category;
      out.appendChild(value);
      out.appendChild(cat);
    } else {
      out.textContent = result.message;
    }
  }

  appForm.addEventListener('submit', function (e) {
    e.preventDefault();
    render(calculate(weightInput.value, heightInput.value));
  });

  /* ---------- Test cases ---------- */
  var tests = [
    { id: 'TC-001', name: 'Valid input returns BMI and category', w: '70', h: '175', expected: 'BMI 22.9 · Normal' },
    { id: 'TC-002', name: 'Empty fields show an error', w: '', h: '', expected: 'Error: "Enter your weight and height."' },
    { id: 'TC-003', name: 'Negative weight is rejected', w: '-60', h: '170', expected: 'Error: "Weight must be between 1 and 500 kg."' },
    { id: 'TC-004', name: 'Letters are rejected', w: 'seventy', h: '175', expected: 'Error: "Use numbers only, e.g. 70 or 72.5."' },
    { id: 'TC-005', name: 'Lower boundary: 18.5 counts as Normal', w: '74', h: '200', expected: 'BMI 18.5 · Normal' },
    { id: 'TC-006', name: 'Upper boundary: 25.0 counts as Overweight', w: '100', h: '200', expected: 'BMI 25.0 · Overweight' }
  ];
  tests.forEach(function (t) { t.status = 'pending'; t.actual = ''; });

  var list = document.getElementById('tcs');
  var runAllBtn = document.getElementById('run-all');
  var resetBtn = document.getElementById('reset-tests');
  var bugCard = document.getElementById('bug-report');
  var bugChip = bugCard.querySelector('.chip');
  var busy = false;
  var bugState = 'none'; // none → open → fixed

  function stepsFor(t) {
    return [
      t.w ? 'Enter weight: ' + t.w : 'Leave weight empty',
      t.h ? 'Enter height: ' + t.h : 'Leave height empty',
      'Press Calculate'
    ];
  }

  function buildList() {
    tests.forEach(function (t) {
      var li = document.createElement('li');
      li.className = 'tc';
      li.id = 'row-' + t.id;
      var detailsId = 'details-' + t.id;

      var row = document.createElement('div');
      row.className = 'tc-row';

      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'tc-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', detailsId);
      var idEl = document.createElement('span'); idEl.className = 'tc-id'; idEl.textContent = t.id;
      var nameEl = document.createElement('span'); nameEl.className = 'tc-name'; nameEl.textContent = t.name;
      toggle.appendChild(idEl); toggle.appendChild(nameEl);

      var side = document.createElement('div');
      side.className = 'tc-side';
      var chip = document.createElement('span'); chip.className = 'chip chip--pend'; chip.textContent = 'Pending';
      var run = document.createElement('button');
      run.type = 'button'; run.className = 'btn btn-small tc-run'; run.textContent = 'Run';
      run.setAttribute('aria-label', 'Run ' + t.id + ': ' + t.name);
      side.appendChild(chip); side.appendChild(run);

      row.appendChild(toggle); row.appendChild(side);

      var dl = document.createElement('dl');
      dl.className = 'tc-details'; dl.id = detailsId; dl.hidden = true;
      var stepsWrap = document.createElement('div');
      var stepsDt = document.createElement('dt'); stepsDt.textContent = 'Steps';
      var stepsDd = document.createElement('dd');
      var ol = document.createElement('ol');
      stepsFor(t).forEach(function (s) { var sli = document.createElement('li'); sli.textContent = s; ol.appendChild(sli); });
      stepsDd.appendChild(ol); stepsWrap.appendChild(stepsDt); stepsWrap.appendChild(stepsDd);
      var expWrap = document.createElement('div');
      var expDt = document.createElement('dt'); expDt.textContent = 'Expected';
      var expDd = document.createElement('dd'); expDd.className = 'tc-actual'; expDd.textContent = t.expected;
      expWrap.appendChild(expDt); expWrap.appendChild(expDd);
      var actWrap = document.createElement('div');
      var actDt = document.createElement('dt'); actDt.textContent = 'Actual';
      var actDd = document.createElement('dd'); actDd.className = 'tc-actual'; actDd.textContent = 'Not run yet';
      actWrap.appendChild(actDt); actWrap.appendChild(actDd);
      dl.appendChild(stepsWrap); dl.appendChild(expWrap); dl.appendChild(actWrap);

      toggle.addEventListener('click', function () {
        var open = dl.hidden;
        dl.hidden = !open;
        toggle.setAttribute('aria-expanded', String(open));
      });
      run.addEventListener('click', function () { runSingle(t); });

      li.appendChild(row); li.appendChild(dl);
      list.appendChild(li);
      t.el = { li: li, chip: chip, actual: actDd, details: dl, toggle: toggle };
    });
  }

  function renderTest(t) {
    var map = { pending: ['pend', 'Pending'], running: ['run', 'Running'], pass: ['pass', 'Pass'], fail: ['fail', 'Fail'] };
    t.el.chip.className = 'chip chip--' + map[t.status][0];
    t.el.chip.textContent = map[t.status][1];
    t.el.actual.textContent = t.actual || 'Not run yet';
    t.el.li.classList.toggle('is-running', t.status === 'running');
  }

  function renderSummary() {
    var pass = 0, fail = 0, pend = 0;
    tests.forEach(function (t) {
      if (t.status === 'pass') pass++;
      else if (t.status === 'fail') fail++;
      else pend++;
    });
    document.getElementById('sum-pass').textContent = pass;
    document.getElementById('sum-fail').textContent = fail;
    document.getElementById('sum-pend').textContent = pend;
    var executed = pass + fail;
    document.getElementById('sum-rate').textContent = executed ? Math.round((pass / executed) * 100) + '%' : '—';
  }

  function renderBug() {
    bugCard.hidden = bugState === 'none';
    bugCard.classList.toggle('is-fixed', bugState === 'fixed');
    bugChip.className = 'chip ' + (bugState === 'fixed' ? 'chip--pass' : 'chip--fail');
    bugChip.textContent = bugState === 'fixed' ? 'Fixed · verified' : 'Open';
  }

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, reduceMotion ? 0 : ms); });
  }

  function typeInto(input, text) {
    input.value = '';
    input.classList.add('is-typing');
    if (reduceMotion || !text) {
      input.value = text;
      return wait(80).then(function () { input.classList.remove('is-typing'); });
    }
    var i = 0;
    return new Promise(function (resolve) {
      (function next() {
        if (i >= text.length) { input.classList.remove('is-typing'); resolve(); return; }
        input.value += text[i++];
        setTimeout(next, 45);
      })();
    });
  }

  function execute(t) {
    t.status = 'running';
    t.actual = '';
    t.el.li.classList.remove('flash-fail', 'flash-pass');
    appPanel.classList.add('is-scanning');
    renderTest(t);
    renderSummary();
    return typeInto(weightInput, t.w)
      .then(function () { return typeInto(heightInput, t.h); })
      .then(function () { return wait(150); })
      .then(function () {
        appForm.requestSubmit ? appForm.requestSubmit() : render(calculate(weightInput.value, heightInput.value));
        return wait(350);
      })
      .then(function () {
        t.actual = describe(lastResult);
        t.status = t.actual === t.expected ? 'pass' : 'fail';
        if (t.id === 'TC-005') {
          if (t.status === 'fail') bugState = 'open';
          else if (bugState === 'open') bugState = 'fixed';
        }
        if (t.status === 'fail') {
          t.el.details.hidden = false;
          t.el.toggle.setAttribute('aria-expanded', 'true');
        }
        appPanel.classList.remove('is-scanning');
        void t.el.li.offsetWidth; // restart the flash animation
        t.el.li.classList.add(t.status === 'pass' ? 'flash-pass' : 'flash-fail');
        renderTest(t);
        renderSummary();
        renderBug();
      });
  }

  function setBusy(state) {
    busy = state;
    runAllBtn.disabled = state;
    resetBtn.disabled = state;
    tests.forEach(function (t) { t.el.li.querySelector('.tc-run').disabled = state; });
  }

  function runSingle(t) {
    if (busy) return;
    setBusy(true);
    execute(t).then(function () { setBusy(false); });
  }

  runAllBtn.addEventListener('click', function () {
    if (busy) return;
    setBusy(true);
    tests.reduce(function (chain, t) {
      return chain.then(function () { return execute(t); });
    }, Promise.resolve()).then(function () { setBusy(false); });
  });

  resetBtn.addEventListener('click', function () {
    tests.forEach(function (t) { t.status = 'pending'; t.actual = ''; renderTest(t); });
    bugState = 'none';
    weightInput.value = '';
    heightInput.value = '';
    out.textContent = '';
    out.classList.remove('is-error');
    renderSummary();
    renderBug();
  });

  // A new build means earlier results no longer count: everything needs a retest.
  document.querySelectorAll('input[name="build"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      if (!radio.checked) return;
      build = radio.value;
      tests.forEach(function (t) { t.status = 'pending'; t.actual = ''; renderTest(t); });
      out.textContent = '';
      out.classList.remove('is-error');
      renderSummary();
    });
  });

  buildList();
  renderSummary();
})();
