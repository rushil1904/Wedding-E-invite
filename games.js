/* ==========================================================================
   Three little ceremony games. Each one is mounted into the modal's "veil"
   layer, sitting on top of the finished reveal card. When the game is won the
   veil fades away and the card underneath is revealed.

   Every game exports  mount(ctx) -> { destroy() }
   ctx = { veil, stage, hint, event, complete }
   ========================================================================== */

window.Games = (function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------ *
   * Shared audio — one context for every game, created on the first
   * gesture (browsers refuse to start one before that). Sound is always a
   * bonus here, never a requirement, so every path fails quietly.
   * ------------------------------------------------------------------ */
  let ctx = null;

  function audioCtx() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = ctx || new AC();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (_) { return null; }
  }

  function tone(opts) {
    const ac = audioCtx();
    if (!ac) return;
    try {
      const o = opts || {};
      const dur = o.dur || 0.22;
      const t = ac.currentTime;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(o.freq || 220, t);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur * 0.8);
      gain.gain.setValueAtTime(o.gain || 0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain).connect(ac.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch (_) { /* never let audio break a game */ }
  }

  const NS = 'http://www.w3.org/2000/svg';
  function svgEl(name, attrs) {
    const el = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach((k) => el.setAttribute(k, attrs[k]));
    return el;
  }

  /* ------------------------------------------------------------------ *
   * HALDI — rub the turmeric off (canvas scratch-off)
   * ------------------------------------------------------------------ */
  function scratch(ctx) {
    const { veil, hint, complete } = ctx;
    veil.classList.add('veil--scratch');
    hint.textContent = 'Rub off the turmeric';

    const canvas = document.createElement('canvas');
    canvas.className = 'scratch-canvas';
    veil.appendChild(canvas);

    const c = canvas.getContext('2d', { willReadFrequently: true });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0, won = false, moves = 0;

    function paint() {
      // offsetWidth/Height, not getBoundingClientRect — the modal is mid
      // scale-in animation when we mount, and a scaled rect would size the
      // backing store wrong.
      w = Math.max(1, veil.offsetWidth);
      h = Math.max(1, veil.offsetHeight);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);

      const g = c.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#F2C15A');
      g.addColorStop(.5, '#E8A33D');
      g.addColorStop(1, '#D98F26');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);

      // ground-turmeric speckle so it reads as paste, not flat paint
      for (let i = 0; i < 900; i++) {
        const x = Math.random() * w, y = Math.random() * h;
        c.fillStyle = Math.random() > .5 ? 'rgba(255,225,150,.30)' : 'rgba(160,100,10,.16)';
        c.fillRect(x, y, 2.5, 2.5);
      }
      c.globalCompositeOperation = 'destination-out';
    }

    paint();

    let last = null;
    function pos(e) {
      const r = canvas.getBoundingClientRect();
      const sx = r.width ? canvas.offsetWidth / r.width : 1;
      const sy = r.height ? canvas.offsetHeight / r.height : 1;
      return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
    }
    function rub(p) {
      c.lineWidth = 44;
      c.lineCap = c.lineJoin = 'round';
      c.beginPath();
      if (last) c.moveTo(last.x, last.y); else c.moveTo(p.x - .1, p.y - .1);
      c.lineTo(p.x, p.y);
      c.stroke();
      last = p;
    }

    /** Rough share of the layer that has been rubbed away, on a coarse grid. */
    function cleared() {
      const data = c.getImageData(0, 0, canvas.width, canvas.height).data;
      const step = 8 * dpr * 4;
      let gone = 0, total = 0;
      for (let i = 3; i < data.length; i += step) {
        total++;
        if (data[i] < 40) gone++;
      }
      return total ? gone / total : 0;
    }

    let checkedAt = 0;
    function onDown(e) {
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* not capturable */ }
      last = null;
      rub(pos(e));
    }
    function onMove(e) {
      if (!e.buttons && e.pointerType === 'mouse') { last = null; return; }
      if (won) return;
      rub(pos(e));
      // reading the whole bitmap back is not cheap — sample sparingly
      const now = performance.now();
      if (++moves % 12 === 0 && now - checkedAt > 200) {
        checkedAt = now;
        if (cleared() > .6) { won = true; complete(); }
      }
    }
    function onUp() {
      last = null;
      // the throttle above can swallow the check on the very last stroke,
      // so always look once when the finger lifts
      if (!won && cleared() > .6) { won = true; complete(); }
    }

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    return {
      destroy() {
        canvas.remove();
        veil.classList.remove('veil--scratch');
      },
    };
  }

  /* ------------------------------------------------------------------ *
   * MEHNDI — trace the henna along the vine
   * ------------------------------------------------------------------ */
  const VINE = 'M28 132 C 28 96, 52 78, 78 88 S 118 118, 138 96 S 160 46, 132 34 C 112 26, 96 44, 108 58';

  function trace(ctx) {
    const { veil, stage, hint, complete } = ctx;
    veil.style.setProperty('--veil-bg', '#6E7B3C');
    hint.textContent = 'Trace the henna';

    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '14 16 172 130');
    svg.setAttribute('class', 'trace-svg');

    const guide = document.createElementNS(NS, 'path');
    guide.setAttribute('d', VINE);
    guide.setAttribute('fill', 'none');
    guide.setAttribute('stroke', 'rgba(255,255,255,.35)');
    guide.setAttribute('stroke-width', '9');
    guide.setAttribute('stroke-linecap', 'round');
    guide.setAttribute('stroke-dasharray', '2 9');

    const line = document.createElementNS(NS, 'path');
    line.setAttribute('d', VINE);
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', '#4A2C12');
    line.setAttribute('stroke-width', '7');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('class', 'trace-progress');

    svg.append(guide, line);
    stage.appendChild(svg);

    const total = line.getTotalLength();
    line.style.strokeDasharray = total;
    line.style.strokeDashoffset = total;

    // sample the path once so we can snap a fingertip to the nearest point on it
    const N = 200;
    const pts = [];
    for (let i = 0; i <= N; i++) pts.push(line.getPointAtLength((i / N) * total));

    // a dot showing where to start
    const start = document.createElementNS(NS, 'circle');
    start.setAttribute('cx', pts[0].x);
    start.setAttribute('cy', pts[0].y);
    start.setAttribute('r', '7');
    start.setAttribute('fill', '#FCEFC6');
    svg.appendChild(start);

    let idx = 0, won = false;

    function toSvg(e) {
      const m = svg.getScreenCTM();
      if (!m) return null;
      const p = svg.createSVGPoint();
      p.x = e.clientX;
      p.y = e.clientY;
      return p.matrixTransform(m.inverse());
    }

    function onMove(e) {
      if (won) return;
      if (!e.buttons && e.pointerType === 'mouse') return;
      const p = toSvg(e);
      if (!p) return;

      // only look a little way ahead of where the finger already got to,
      // so you can't jump straight to the end
      let bestI = -1, bestD = Infinity;
      for (let i = idx; i <= Math.min(N, idx + 20); i++) {
        const d = Math.hypot(pts[i].x - p.x, pts[i].y - p.y);
        if (d < bestD) { bestD = d; bestI = i; }
      }
      if (bestI > idx && bestD < 26) {
        idx = bestI;
        line.style.strokeDashoffset = total * (1 - idx / N);
        if (idx > 4) start.setAttribute('opacity', '0');
        if (idx >= N - 4) { won = true; complete(); }
      }
    }

    svg.addEventListener('pointerdown', onMove);
    svg.addEventListener('pointermove', onMove);

    return {
      destroy() {
        svg.remove();
        veil.style.removeProperty('--veil-bg');
      },
    };
  }

  /* ------------------------------------------------------------------ *
   * SANGEET — tap the dhol to the beat
   * ------------------------------------------------------------------ */
  const BEATS = 8;
  const BEAT_MS = 620;

  function dhol(ctx) {
    const { veil, stage, hint, complete } = ctx;
    veil.style.setProperty('--veil-bg', '#B23A48');
    hint.textContent = 'Tap the dhol to the beat';

    const wrap = document.createElement('div');
    wrap.className = 'dhol-wrap';

    const holder = document.createElement('div');
    holder.style.cssText = 'position:relative;display:flex;align-items:center;justify-content:center;';

    const btn = document.createElement('button');
    btn.className = 'dhol';
    btn.setAttribute('aria-label', 'Tap the dhol');
    btn.innerHTML = '<svg viewBox="0 0 120 120" width="132" height="132"><use href="#art-sangeet"></use></svg>';

    const pulse = document.createElement('span');
    pulse.className = 'dhol-pulse';
    if (reduceMotion) pulse.style.animation = 'none';

    holder.append(pulse, btn);

    const dots = document.createElement('div');
    dots.className = 'beat-dots';
    for (let i = 0; i < BEATS; i++) {
      const d = document.createElement('span');
      d.className = 'beat-dot';
      dots.appendChild(d);
    }

    wrap.append(holder, dots);
    stage.appendChild(wrap);

    function thump() { tone({ freq: 190, to: 70, dur: .22, gain: .35 }); }

    let hits = 0, lastAt = 0, won = false;

    function paintDots() {
      [...dots.children].forEach((d, i) => d.classList.toggle('is-on', i < hits));
    }

    function onTap() {
      if (won) return;
      const now = performance.now();
      // drop the beat for too long and the count starts over
      if (lastAt && now - lastAt > BEAT_MS * 2.6) hits = 0;
      lastAt = now;

      hits++;
      thump();
      btn.classList.add('is-hit');
      setTimeout(() => btn.classList.remove('is-hit'), 90);
      paintDots();

      if (hits >= BEATS) {
        won = true;
        hint.textContent = 'Wah! 🥁';
        setTimeout(complete, 260);
      } else {
        hint.textContent = 'Keep the beat — ' + (BEATS - hits) + ' to go';
      }
    }

    btn.addEventListener('click', onTap);

    return {
      destroy() {
        wrap.remove();
        veil.style.removeProperty('--veil-bg');
      },
    };
  }

  /* ------------------------------------------------------------------ *
   * MANGALYA SUTRA — tie the three knots (moonu mudichu)
   * Swipe across each knot in turn; the thread cinches tighter each time
   * and the thali settles once the third is tied.
   * ------------------------------------------------------------------ */
  const KNOTS = 3;

  function knots(ctx_) {
    const { veil, stage, hint, complete } = ctx_;
    veil.style.setProperty('--veil-bg', '#C08F33');
    hint.textContent = 'Swipe to tie the first knot';

    const svg = svgEl('svg', { viewBox: '0 0 200 150', class: 'knot-svg' });

    // sag shrinks with every knot — the thread visibly tightens
    const SAG = [116, 100, 86, 74];
    let tied = 0;

    const thread = svgEl('path', {
      fill: 'none', stroke: '#E8C25A', 'stroke-width': '4', 'stroke-linecap': 'round',
    });
    const thread2 = svgEl('path', {
      fill: 'none', stroke: '#B8871F', 'stroke-width': '1.4',
      'stroke-linecap': 'round', 'stroke-dasharray': '3 5', opacity: '.8',
    });
    svg.append(thread, thread2);

    // the thali hanging at the lowest point
    const pendant = svgEl('g', { class: 'thali' });
    pendant.append(
      svgEl('path', { d: 'M-9 0 q9-14 18 0 q-9 16-18 0Z', fill: '#D9A648', stroke: '#8A5F1E', 'stroke-width': '1.6' }),
      svgEl('circle', { cx: '0', cy: '2', r: '3', fill: '#8A5F1E' })
    );
    svg.appendChild(pendant);

    const marks = [];
    for (let i = 0; i < KNOTS; i++) {
      const g = svgEl('g', { class: 'knot' });
      g.append(
        svgEl('circle', { r: '7', fill: '#E8C25A', stroke: '#8A5F1E', 'stroke-width': '1.6' }),
        svgEl('path', { d: 'M-4 -1 q4 4 8 0', fill: 'none', stroke: '#8A5F1E', 'stroke-width': '1.4' })
      );
      svg.appendChild(g);
      marks.push(g);
    }
    stage.appendChild(svg);

    function layout() {
      const sag = SAG[tied];
      const d = 'M18 26 Q100 ' + sag + ' 182 26';
      thread.setAttribute('d', d);
      thread2.setAttribute('d', d);

      const len = thread.getTotalLength();
      const at = [0.3, 0.5, 0.7].map((f) => thread.getPointAtLength(len * f));
      marks.forEach((g, i) => {
        g.setAttribute('transform', 'translate(' + at[i].x + ',' + at[i].y + ')');
        g.classList.toggle('is-tied', i < tied);
        g.classList.toggle('is-active', i === tied);
      });

      const low = thread.getPointAtLength(len * 0.5);
      pendant.setAttribute('transform', 'translate(' + low.x + ',' + (low.y + 27) + ')');
      return at;
    }

    let spots = layout();

    function toSvg(e) {
      const m = svg.getScreenCTM();
      if (!m) return null;
      const p = svg.createSVGPoint();
      p.x = e.clientX;
      p.y = e.clientY;
      return p.matrixTransform(m.inverse());
    }

    let travelled = 0, overKnot = false, prev = null, done = false;

    function onDown(e) {
      travelled = 0;
      overKnot = false;
      prev = toSvg(e);
    }

    function onMove(e) {
      if (done) return;
      if (!e.buttons && e.pointerType === 'mouse') { prev = null; return; }
      const p = toSvg(e);
      if (!p) return;
      if (prev) travelled += Math.hypot(p.x - prev.x, p.y - prev.y);
      prev = p;

      const k = spots[tied];
      if (k && Math.hypot(p.x - k.x, p.y - k.y) < 30) overKnot = true;

      // a swipe, not a tap: it has to cross the knot AND cover some ground
      if (overKnot && travelled > 42) cinch();
    }

    function cinch() {
      tied++;
      travelled = 0;
      overKnot = false;
      tone({ freq: 520, to: 300, type: 'triangle', dur: .18, gain: .22 });

      spots = layout();

      if (tied >= KNOTS) {
        done = true;
        hint.textContent = 'Tied 🙏';
        pendant.classList.add('is-settled');
        setTimeout(complete, 620);
      } else {
        hint.textContent = tied === 1
          ? 'Two more knots'
          : 'One more knot';
      }
    }

    function onUp() { travelled = 0; overKnot = false; prev = null; }

    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerup', onUp);
    svg.addEventListener('pointercancel', onUp);

    return {
      destroy() {
        svg.remove();
        veil.style.removeProperty('--veil-bg');
      },
    };
  }

  /* ------------------------------------------------------------------ *
   * THE WEDDING — shower the akshata
   * Tap or flick over the couple to rain rice-and-turmeric blessings.
   * The couple takes on colour as the blessings accumulate.
   * ------------------------------------------------------------------ */
  const BLESSINGS = 10;

  function akshata(ctx_) {
    const { veil, stage, hint, complete } = ctx_;
    veil.style.setProperty('--veil-bg', '#8E2436');
    hint.textContent = 'Tap to shower the akshata';

    const wrap = document.createElement('div');
    wrap.className = 'akshata-wrap';

    const svg = svgEl('svg', { viewBox: '0 0 200 170', class: 'akshata-svg' });

    // couple, drawn once in outline and again in colour; the colour layer
    // fades up as the blessings land
    function couple(fillA, fillB, cls) {
      const g = svgEl('g', { class: cls || '' });
      // bride
      g.append(
        svgEl('circle', { cx: '78', cy: '58', r: '13', fill: fillA }),
        svgEl('path', { d: 'M60 138 q0-42 18-42 q18 0 18 42 Z', fill: fillA }),
        svgEl('path', { d: 'M78 74 q-14 8-16 30 q10-6 16-6 q6 0 16 6 q-2-22-16-30Z', fill: fillB, opacity: '.85' })
      );
      // groom
      g.append(
        svgEl('circle', { cx: '124', cy: '54', r: '13', fill: fillA }),
        svgEl('path', { d: 'M107 138 q0-44 17-44 q17 0 17 44 Z', fill: fillA }),
        svgEl('path', { d: 'M124 70 v40', stroke: fillB, 'stroke-width': '3', fill: 'none', opacity: '.7' })
      );
      return g;
    }

    svg.appendChild(couple('rgba(255,255,255,.26)', 'rgba(255,255,255,.16)', 'couple-base'));
    const blessed = couple('#E7B94A', '#C4453F', 'couple-blessed');
    blessed.setAttribute('opacity', '0');
    svg.appendChild(blessed);

    // bowl of akshata
    svg.append(
      svgEl('path', { d: 'M14 148 q18 22 42 0 Z', fill: '#D9A648', stroke: '#7A4A0E', 'stroke-width': '2' }),
      svgEl('ellipse', { cx: '35', cy: '148', rx: '21', ry: '6', fill: '#FFF7E4', stroke: '#7A4A0E', 'stroke-width': '2' })
    );

    const canvas = document.createElement('canvas');
    canvas.className = 'akshata-canvas';

    wrap.append(svg, canvas);
    stage.appendChild(wrap);

    const c = canvas.getContext('2d');
    let grains = [];
    let blessings = 0;
    let raf = 0;
    let done = false;

    function size() {
      const w = wrap.clientWidth || 260;
      const h = wrap.clientHeight || 220;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w, h };
    }
    let box = size();

    function spawn(x, y, n) {
      for (let i = 0; i < n; i++) {
        grains.push({
          x: x + (Math.random() - .5) * 40,
          y: y + (Math.random() - .5) * 16,
          vx: (Math.random() - .5) * 1.1,
          vy: 0.6 + Math.random() * 1.4,
          r: 1.4 + Math.random() * 1.6,
          life: 1,
          col: Math.random() > .35 ? '#FFF7E4' : '#E8A33D',
        });
      }
    }

    function frame() {
      raf = requestAnimationFrame(frame);
      c.clearRect(0, 0, box.w, box.h);
      grains = grains.filter((g) => g.y < box.h + 8 && g.life > 0);
      grains.forEach((g) => {
        g.vy += 0.055;
        g.x += g.vx;
        g.y += g.vy;
        if (g.y > box.h - 10) g.life -= .06;
        c.globalAlpha = Math.max(0, Math.min(1, g.life));
        c.fillStyle = g.col;
        c.beginPath();
        c.ellipse(g.x, g.y, g.r, g.r * 1.7, 0, 0, Math.PI * 2);
        c.fill();
      });
      c.globalAlpha = 1;
    }
    if (!reduceMotion) raf = requestAnimationFrame(frame);

    function bless(e) {
      if (done) return;
      const r = wrap.getBoundingClientRect();
      const x = e ? e.clientX - r.left : box.w / 2;
      spawn(x, 6, 12);

      blessings++;
      const pct = Math.min(1, blessings / BLESSINGS);
      blessed.setAttribute('opacity', String(pct));
      tone({ freq: 900 + Math.random() * 260, type: 'triangle', dur: .12, gain: .13 });

      if (blessings >= BLESSINGS) {
        done = true;
        hint.textContent = 'Blessed 🌾';
        setTimeout(complete, 560);
      } else {
        hint.textContent = 'Keep showering — ' + (BLESSINGS - blessings) + ' to go';
      }
    }

    function onDown(e) { bless(e); }
    let lastFlick = 0;
    function onMove(e) {
      if (!e.buttons && e.pointerType === 'mouse') return;
      const now = performance.now();
      if (now - lastFlick < 140) return;   // a flick keeps giving, but not per pixel
      lastFlick = now;
      bless(e);
    }

    wrap.addEventListener('pointerdown', onDown);
    wrap.addEventListener('pointermove', onMove);
    const onResize = () => { box = size(); };
    window.addEventListener('resize', onResize);

    return {
      destroy() {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', onResize);
        wrap.remove();
        veil.style.removeProperty('--veil-bg');
      },
    };
  }

  return { scratch, trace, dhol, knots, akshata };
})();
