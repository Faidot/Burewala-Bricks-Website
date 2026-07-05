// Burewala Bricks — shared front-end effects.
// Progressive enhancement only: everything is visible & readable without JS.

export function initFx(scope) {
  const root = scope || document;
  const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const grab = (sel) => {
    const els = [];
    root.querySelectorAll(sel).forEach((el) => {
      if (!el.__bbFx) { el.__bbFx = true; els.push(el); }
    });
    return els;
  };

  const reveals = grab('[data-reveal]');
  const counters = grab('[data-count]');
  const draws = grab('[data-draw]');
  const pxEls = grab('[data-parallax]');

  if (reduced) return () => {};

  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      io.unobserve(el);
      if (el.hasAttribute('data-count')) runCounter(el);
      else if (el.hasAttribute('data-draw')) runDraw(el);
      else runReveal(el);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  reveals.concat(counters, draws).forEach((el) => io.observe(el));

  // Gentle parallax on [data-parallax="0.12"] elements.
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const vh = window.innerHeight;
      pxEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -120 || r.top > vh + 120) return;
        const f = parseFloat(el.getAttribute('data-parallax')) || 0.12;
        const mid = r.top + r.height / 2 - vh / 2;
        el.style.transform = 'translate3d(0,' + (-mid * f).toFixed(1) + 'px,0)';
      });
    });
  };
  if (pxEls.length) {
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  return () => {
    io.disconnect();
    if (pxEls.length) window.removeEventListener('scroll', onScroll);
  };
}

function runReveal(el) {
  const kind = el.getAttribute('data-reveal') || 'up';
  const delay = parseFloat(el.getAttribute('data-reveal-delay') || '0');
  const dur = parseFloat(el.getAttribute('data-reveal-dur') || '950');
  const E = 'cubic-bezier(.16,1,.3,1)';
  if (kind === 'wipe') {
    el.animate(
      [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)' }],
      { duration: dur, delay, easing: E, fill: 'backwards' }
    );
    return;
  }
  let from;
  if (kind === 'left') from = { opacity: 0, transform: 'translate3d(-44px,0,0)' };
  else if (kind === 'right') from = { opacity: 0, transform: 'translate3d(44px,0,0)' };
  else if (kind === 'zoom') from = { opacity: 0, transform: 'scale(1.05)' };
  else if (kind === 'fade') from = { opacity: 0, transform: 'none' };
  else from = { opacity: 0, transform: 'translate3d(0,36px,0)' };
  el.animate([from, { opacity: 1, transform: 'none' }], { duration: dur, delay, easing: E, fill: 'backwards' });
}

function runCounter(el) {
  const target = parseFloat(el.getAttribute('data-count'));
  if (isNaN(target)) return;
  const dec = parseInt(el.getAttribute('data-count-dec') || '0', 10);
  const dur = 1700;
  const t0 = performance.now();
  const frame = (t) => {
    const p = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = (target * e).toFixed(dec);
    if (p < 1) requestAnimationFrame(frame);
    else el.textContent = target.toFixed(dec);
  };
  requestAnimationFrame(frame);
}

function runDraw(el) {
  const tag = (el.tagName || '').toLowerCase();
  const paths = tag === 'svg' ? el.querySelectorAll('path, polyline, line') : [el];
  paths.forEach((p, i) => {
    let L = 0;
    try { L = p.getTotalLength(); } catch (e) { return; }
    if (!L) return;
    p.style.strokeDasharray = String(L);
    p.style.strokeDashoffset = String(L);
    p.animate(
      [{ strokeDashoffset: L }, { strokeDashoffset: 0 }],
      { duration: 1900, delay: i * 220, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'forwards' }
    );
  });
}

// Floating ember particles on a <canvas>. Returns a cleanup fn.
export function embers(canvas, opts) {
  if (!canvas) return () => {};
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  const ctx = canvas.getContext('2d');
  const N = (opts && opts.count) || 42;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0, h = 0, raf = 0, running = true, visible = true;

  const size = () => {
    w = canvas.width = Math.max(1, canvas.offsetWidth * dpr);
    h = canvas.height = Math.max(1, canvas.offsetHeight * dpr);
  };
  size();
  window.addEventListener('resize', size);

  const spawn = (anywhere) => ({
    x: Math.random() * w,
    y: anywhere ? Math.random() * h : h + 12,
    r: (Math.random() * 1.5 + 0.5) * dpr,
    vy: (Math.random() * 0.55 + 0.16) * dpr,
    vx: (Math.random() - 0.5) * 0.25 * dpr,
    a: Math.random() * 0.5 + 0.12,
    tw: Math.random() * 0.02 + 0.005,
    t: Math.random() * Math.PI * 2,
  });
  const ps = [];
  for (let i = 0; i < N; i++) ps.push(spawn(true));

  const tick = () => {
    if (!running) return;
    if (visible) {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        p.t += p.tw;
        p.y -= p.vy;
        p.x += p.vx + Math.sin(p.t) * 0.22 * dpr;
        if (p.y < -14 || p.x < -14 || p.x > w + 14) { ps[i] = spawn(false); continue; }
        const al = p.a * (0.55 + 0.45 * Math.sin(p.t * 3));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fillStyle = 'rgba(255,138,66,' + Math.max(0, al).toFixed(3) + ')';
        ctx.shadowColor = 'rgba(255,110,40,0.85)';
        ctx.shadowBlur = 5 * dpr;
        ctx.fill();
      }
    }
    raf = requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver((es) => { visible = !!(es[0] && es[0].isIntersecting); });
  io.observe(canvas);
  tick();

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    io.disconnect();
    window.removeEventListener('resize', size);
  };
}
