// Site behaviour: theme, navigation, tabs, contact, scroll reveal and the live page checks.
(function () {
  'use strict';

  var root = document.documentElement;
  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Theme: Auto (device) → Light → Dark ---------- */
  var themeBtn = document.getElementById('theme-toggle');
  var themeLabel = document.getElementById('theme-label');
  var metaTheme = document.querySelector('meta[name="theme-color"]');

  function currentMode() {
    return root.getAttribute('data-theme') || 'auto';
  }
  function resolvedTheme() {
    var mode = currentMode();
    if (mode === 'auto') return darkQuery.matches ? 'dark' : 'light';
    return mode;
  }
  function renderTheme() {
    var mode = currentMode();
    var device = darkQuery.matches ? 'dark' : 'light';
    if (mode === 'auto') {
      themeLabel.textContent = 'Auto · ' + device;
      themeBtn.setAttribute('aria-label', 'Theme: following your device (' + device + '). Switch to light.');
    } else {
      themeLabel.textContent = mode === 'light' ? 'Light' : 'Dark';
      themeBtn.setAttribute('aria-label', 'Theme: ' + mode + '. Switch to ' + (mode === 'light' ? 'dark' : 'follow your device') + '.');
    }
    if (metaTheme) metaTheme.setAttribute('content', resolvedTheme() === 'dark' ? '#121417' : '#f1f0eb');
  }
  function setMode(mode) {
    if (mode === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', mode);
    try {
      if (mode === 'auto') localStorage.removeItem('theme');
      else localStorage.setItem('theme', mode);
    } catch (e) { /* storage unavailable: choice lasts for this visit only */ }
    renderTheme();
  }
  themeBtn.addEventListener('click', function () {
    var next = { auto: 'light', light: 'dark', dark: 'auto' }[currentMode()];
    setMode(next);
  });
  darkQuery.addEventListener('change', renderTheme);
  renderTheme();

  /* ---------- Mobile menu ---------- */
  var menuBtn = document.getElementById('menu-toggle');
  var nav = document.getElementById('site-nav');

  function closeMenu() {
    nav.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.textContent = 'Menu';
  }
  menuBtn.addEventListener('click', function () {
    var open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.textContent = open ? 'Close' : 'Menu';
  });
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      closeMenu();
      menuBtn.focus();
    }
  });

  /* ---------- Highlight the section in view ---------- */
  var navLinks = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
  if ('IntersectionObserver' in window) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          var active = link.getAttribute('href') === '#' + entry.target.id;
          link.classList.toggle('is-active', active);
          if (active) link.setAttribute('aria-current', 'true');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (link) {
      var target = document.querySelector(link.getAttribute('href'));
      if (target) sectionObserver.observe(target);
    });
  }

  /* ---------- Case study tabs (arrow keys move between tabs) ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  function selectTab(tab) {
    tabs.forEach(function (t) {
      var selected = t === tab;
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !selected;
    });
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab); });
    tab.addEventListener('keydown', function (e) {
      var next = null;
      if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') next = tabs[0];
      if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); selectTab(next); next.focus(); }
    });
  });

  /* ---------- Copy email ---------- */
  var copyBtn = document.getElementById('copy-email');
  var copyStatus = document.getElementById('copy-status');
  copyBtn.addEventListener('click', function () {
    var email = copyBtn.getAttribute('data-email');
    function done(msg) {
      copyStatus.textContent = msg;
      setTimeout(function () { copyStatus.textContent = ''; }, 2500);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email).then(
        function () { done('Copied'); },
        function () { done('Copy failed. Select the address instead.'); }
      );
    } else {
      done('Copy not supported. Select the address instead.');
    }
  });

  /* ---------- Contact form (Netlify Forms) ---------- */
  var form = document.getElementById('contact-form');
  var formStatus = document.getElementById('form-status');
  var submitBtn = document.getElementById('cf-submit');
  var rules = {
    'cf-name': function (v) { return v.trim() ? '' : 'Enter your name.'; },
    'cf-email': function (v) {
      if (!v.trim()) return 'Enter your email address.';
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Enter a valid email address, like name@example.com.';
    },
    'cf-message': function (v) { return v.trim().length >= 10 ? '' : 'Write a message of at least 10 characters.'; }
  };
  function validateField(id) {
    var input = document.getElementById(id);
    var msg = rules[id](input.value);
    var err = document.getElementById(id + '-error');
    err.textContent = msg;
    if (msg) {
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', id + '-error');
    } else {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
    }
    return !msg;
  }
  Object.keys(rules).forEach(function (id) {
    document.getElementById(id).addEventListener('blur', function () {
      if (this.value) validateField(id);
    });
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var firstInvalid = null;
    Object.keys(rules).forEach(function (id) {
      if (!validateField(id) && !firstInvalid) firstInvalid = document.getElementById(id);
    });
    formStatus.className = 'form-status';
    if (firstInvalid) {
      formStatus.textContent = 'Please fix the highlighted fields.';
      formStatus.classList.add('is-error');
      firstInvalid.focus();
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    formStatus.textContent = '';
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString()
    }).then(function (res) {
      if (!res.ok) throw new Error(res.status);
      form.reset();
      formStatus.textContent = 'Thanks. Your message was sent, and I\'ll reply by email.';
      formStatus.classList.add('is-ok');
    }).catch(function () {
      formStatus.textContent = 'Your message could not be sent. Please email me directly at sakyikelvin20@gmail.com.';
      formStatus.classList.add('is-error');
    }).then(function () {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send message';
    });
  });

  /* ---------- Scroll reveal (skipped when motion is reduced) ---------- */
  var revealTargets = document.querySelectorAll('.section-head, .flow-step, .catch, .toolkit-block, .case, .lab-app, .lab-session, .review-col, .project, .next, .timeline li, .contact-form');
  if (!motionQuery.matches && 'IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    revealTargets.forEach(function (el) {
      el.classList.add('reveal');
      revealObserver.observe(el);
    });
  }

  /* ---------- Live checks: real tests of this page, run on the visitor's device ---------- */
  function accessibleName(el) {
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label').trim();
    var by = el.getAttribute('aria-labelledby');
    if (by) {
      var ref = document.getElementById(by);
      if (ref) return ref.textContent.trim();
    }
    return el.textContent.trim();
  }

  var checks = {
    overflow: function () {
      var page = root.scrollWidth;
      var view = root.clientWidth;
      return { pass: page <= view + 1, detail: 'Screen ' + view + 'px · page ' + page + 'px' };
    },
    theme: function () {
      var mode = currentMode();
      var device = darkQuery.matches ? 'dark' : 'light';
      var bg = getComputedStyle(document.body).backgroundColor;
      var looksDark = (function () {
        var m = bg.match(/\d+/g);
        if (!m) return false;
        return (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) < 128;
      })();
      var expected = mode === 'auto' ? device : mode;
      var pass = (expected === 'dark') === looksDark;
      var detail = mode === 'auto' ? 'Device: ' + device + ' · page: ' + (looksDark ? 'dark' : 'light')
                                   : 'You chose ' + mode + ' · page: ' + (looksDark ? 'dark' : 'light');
      return { pass: pass, detail: detail };
    },
    motion: function () {
      var reduce = motionQuery.matches;
      var bar = document.querySelector('.hero-name span:last-child');
      var dur = parseFloat(getComputedStyle(bar, '::after').animationDuration) || 0;
      var pass = reduce ? dur <= 0.01 : true;
      return { pass: pass, detail: reduce ? 'Reduce motion is on · animations off' : 'No preference set · subtle motion on' };
    },
    names: function () {
      var els = document.querySelectorAll('a, button');
      var missing = 0;
      els.forEach(function (el) { if (!accessibleName(el)) missing++; });
      return { pass: missing === 0, detail: els.length + ' checked · ' + missing + ' missing' };
    },
    headings: function () {
      var hs = Array.prototype.slice.call(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      var h1s = 0, skips = 0, prev = 0;
      hs.forEach(function (h) {
        var level = Number(h.tagName[1]);
        if (level === 1) h1s++;
        if (prev && level > prev + 1) skips++;
        prev = level;
      });
      return { pass: h1s === 1 && skips === 0, detail: hs.length + ' headings · ' + h1s + ' × h1 · ' + skips + ' skipped levels' };
    }
  };

  var sessionStatus = document.getElementById('session-status');
  var rerunBtn = document.getElementById('rerun-checks');
  var checkItems = Array.prototype.slice.call(document.querySelectorAll('#live-checks li'));

  function setChip(chip, state, text) {
    chip.className = 'chip chip--' + state;
    chip.textContent = text;
  }

  function runChecks() {
    var delay = motionQuery.matches ? 0 : 280;
    var passed = 0;
    rerunBtn.disabled = true;
    setChip(sessionStatus, 'run', 'Running');
    checkItems.forEach(function (li) {
      setChip(li.querySelector('.chip'), 'pend', 'Pending');
      li.querySelector('.check-detail').textContent = '—';
    });
    checkItems.forEach(function (li, i) {
      setTimeout(function () {
        var result;
        try { result = checks[li.getAttribute('data-check')](); }
        catch (e) { result = { pass: false, detail: 'Check could not run' }; }
        li.querySelector('.check-detail').textContent = result.detail;
        setChip(li.querySelector('.chip'), result.pass ? 'pass' : 'fail', result.pass ? 'Pass' : 'Fail');
        if (result.pass) passed++;
        if (i === checkItems.length - 1) {
          setChip(sessionStatus, passed === checkItems.length ? 'pass' : 'fail', passed + '/' + checkItems.length + ' pass');
          rerunBtn.disabled = false;
        }
      }, delay * (i + 1));
    });
  }

  rerunBtn.addEventListener('click', runChecks);
  themeBtn.addEventListener('click', function () { setTimeout(runChecks, 50); });
  if (document.readyState === 'complete') runChecks();
  else window.addEventListener('load', runChecks);
})();
