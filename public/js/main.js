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
  // Cards that share a row or grid come in one after another (at most 4 steps of 90ms).
  function stagger(els) {
    els.forEach(function (el) {
      var sibs = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.classList.contains('reveal'); });
      var i = sibs.indexOf(el);
      if (i > 0) el.style.setProperty('--reveal-delay', Math.min(i, 4) * 90 + 'ms');
    });
  }

  var revealTargets = document.querySelectorAll('.section-head, .flow-step, .catch, .toolkit-block, .case, .lab-app, .lab-session, .review-col, .project, .next, .timeline li, .contact-form');
  if (!motionQuery.matches && 'IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -15% 0px' });
    revealTargets.forEach(function (el) { el.classList.add('reveal'); });
    try {
      stagger(Array.prototype.slice.call(revealTargets));
      revealTargets.forEach(function (el) { revealObserver.observe(el); });
    } catch (err) {
      // Safety net: if the reveal setup fails for any reason, never leave content invisible.
      revealTargets.forEach(function (el) { el.classList.add('is-in'); });
    }
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

  var loaderShown = root.classList.contains('show-loader');
  function afterLoader(fn) { setTimeout(fn, loaderShown ? 1300 : 200); }
  if (document.readyState === 'complete') afterLoader(runChecks);
  else window.addEventListener('load', function () { afterLoader(runChecks); });

  /* ================= Motion layer ================= */
  var reduce = motionQuery.matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* Loader: tap or press any key to skip */
  var loader = document.getElementById('loader');
  if (loader && loaderShown) {
    var removeLoader = function () {
      if (loader.parentNode) loader.parentNode.removeChild(loader);
      root.classList.remove('show-loader');
    };
    var skip = function () { loader.classList.add('is-done'); setTimeout(removeLoader, 320); };
    loader.addEventListener('click', skip);
    document.addEventListener('keydown', skip, { once: true });
    loader.addEventListener('animationend', function (e) {
      if (e.target === loader) removeLoader();
    });
    // Failsafe: timers keep running even when CSS animations don't,
    // so the loader can never be left covering the page.
    setTimeout(removeLoader, 1600);
  }

  /* Name "decodes" into place, like a system booting */
  function decode(el, delay) {
    var target = el.textContent;
    var glyphs = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#/<>';
    // Timed by the clock, not by frame count, so it always finishes on schedule
    // even when the browser slows timers down (background tabs, low battery).
    var settleAt = target.split('').map(function (_, i) { return 6 + i * 3; });
    var start = 0;
    var frame = 0;
    setTimeout(function tick() {
      if (!start) start = Date.now();
      frame = Math.floor((Date.now() - start) / 38);
      var frag = document.createDocumentFragment();
      var settled = '';
      var done = true;
      for (var i = 0; i < target.length; i++) {
        if (frame >= settleAt[i]) { settled += target[i]; continue; }
        done = false;
        if (settled) { frag.appendChild(document.createTextNode(settled)); settled = ''; }
        var span = document.createElement('span');
        span.className = 'dc';
        span.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
        frag.appendChild(span);
      }
      if (settled) frag.appendChild(document.createTextNode(settled));
      el.replaceChildren(frag);
      if (!done) setTimeout(tick, 38);
    }, delay);
  }
  if (!reduce) {
    document.querySelectorAll('[data-decode]').forEach(function (el, i) {
      decode(el, (loaderShown ? 1100 : 150) + i * 180);
    });
  }

  /* HUD: live time in Accra (GMT) and the viewport size */
  var hudTime = document.getElementById('hud-time');
  var hudView = document.getElementById('hud-view');
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function tickHud() {
    var d = new Date();
    hudTime.textContent = 'GMT ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds());
    hudView.textContent = 'Viewport ' + window.innerWidth + ' × ' + window.innerHeight;
  }
  if (hudTime && hudView) {
    tickHud();
    setInterval(tickHud, 1000);
    window.addEventListener('resize', tickHud);
  }

  /* Grid lights up around the cursor (desktop only) */
  var hero = document.querySelector('.hero');
  var glow = document.querySelector('.hero-grid-glow');
  if (hero && glow && finePointer && !reduce) {
    var raf = null;
    hero.addEventListener('pointermove', function (e) {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        var r = hero.getBoundingClientRect();
        glow.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        glow.style.setProperty('--my', (e.clientY - r.top) + 'px');
        raf = null;
      });
    });
    hero.addEventListener('pointerleave', function () {
      glow.style.setProperty('--mx', '-500px');
      glow.style.setProperty('--my', '-500px');
    });
  }

  /* Stats count up when they come into view */
  var counters = document.querySelectorAll('[data-count]');
  if (!reduce && 'IntersectionObserver' in window) {
    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var end = Number(el.getAttribute('data-count'));
        el.textContent = '0';
        var start = performance.now();
        var dur = 1100;
        (function step(now) {
          var t = Math.min(1, (now - start) / dur);
          var eased = 1 - Math.pow(1 - t, 3);
          el.textContent = Math.round(end * eased);
          if (t < 1) requestAnimationFrame(step);
        })(start);
        countObserver.unobserve(el);
      });
    }, { threshold: 0.5 });
    // The real numbers stay in the HTML until the count-up actually starts,
    // so nobody ever sees "0+" (no JS, slow scroll, or half off-screen).
    counters.forEach(function (el) { countObserver.observe(el); });
  }

  /* Workflow: a signal passes through each step and holds at my checkpoints */
  var flow = document.getElementById('flow');
  var replayBtn = document.getElementById('flow-replay');
  var steps = flow ? Array.prototype.slice.call(flow.children) : [];
  var signalTimer = null;
  function runSignal() {
    clearTimeout(signalTimer);
    steps.forEach(function (s) { s.classList.remove('is-signal', 'is-done'); });
    var i = 0;
    (function next() {
      if (i > 0) { steps[i - 1].classList.remove('is-signal'); steps[i - 1].classList.add('is-done'); }
      if (i >= steps.length) return;
      var step = steps[i];
      step.classList.add('is-signal');
      i++;
      signalTimer = setTimeout(next, step.classList.contains('is-human') ? 1100 : 550);
    })();
  }
  if (flow && !reduce) {
    replayBtn.addEventListener('click', runSignal);
    if ('IntersectionObserver' in window) {
      var flowObserver = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { setTimeout(runSignal, 600); flowObserver.disconnect(); }
      }, { threshold: 0.35 });
      flowObserver.observe(flow);
    }
  } else if (replayBtn) {
    replayBtn.hidden = true;
  }

  /* Magnetic primary buttons (mouse and trackpad only) */
  if (finePointer && !reduce) {
    document.querySelectorAll('.btn-primary').forEach(function (btn) {
      btn.classList.add('is-magnetic');
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) / (r.width / 2);
        var y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
        btn.style.transform = 'translate(' + (x * 5).toFixed(1) + 'px,' + (y * 4).toFixed(1) + 'px)';
      });
      btn.addEventListener('pointerleave', function () { btn.style.transform = ''; });
    });
  }
})();
