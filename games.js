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
    /* No floating hint here. The instruction is painted into the turmeric
       itself, so it rubs away with the layer instead of colliding with the
       card text as that shows through. */
    hint.textContent = '';

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

      // the instruction is part of the paste, so it comes off with it
      c.save();
      c.textAlign = 'center';
      c.fillStyle = 'rgba(104, 66, 6, .82)';
      c.font = 'italic 21px "Cormorant Garamond", Georgia, serif';
      c.fillText('Rub off the turmeric', w / 2, 46);
      c.fillStyle = 'rgba(104, 66, 6, .5)';
      c.font = 'italic 15px "Cormorant Garamond", Georgia, serif';
      c.fillText('to see the day', w / 2, 68);
      c.restore();

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
   *
   * Press and hold each knot spot in turn. Hold beats swipe here: the target
   * is visible and aimable, it forgives imprecision, it works one-handed, and
   * a filling ring shows progress the whole way instead of leaving the guest
   * guessing whether the gesture registered.
   * ------------------------------------------------------------------ */
  const KNOTS = 3;
  const HOLD_MS = 700;
  const SPOT_R = 13;
  const SPOT_C = 2 * Math.PI * SPOT_R;

  function knots(ctx_) {
    const { veil, stage, hint, complete } = ctx_;
    veil.style.setProperty('--veil-bg', '#C08F33');
    hint.textContent = 'Hold to tie the first knot';

    const wrap = document.createElement('div');
    wrap.className = 'knot-wrap';

    const svg = svgEl('svg', { viewBox: '0 0 200 150', class: 'knot-svg' });

    // the cord visibly cinches tighter with every knot
    const SAG = [116, 103, 91, 80];
    let tied = 0;

    const thread = svgEl('path', {
      fill: 'none', stroke: '#E8C25A', 'stroke-width': '4', 'stroke-linecap': 'round',
    });
    const thread2 = svgEl('path', {
      fill: 'none', stroke: '#B8871F', 'stroke-width': '1.4',
      'stroke-linecap': 'round', 'stroke-dasharray': '3 5', opacity: '.8',
    });
    svg.append(thread, thread2);

    const pendant = svgEl('g', { class: 'thali' });
    pendant.innerHTML =
      '<circle cx="0" cy="7" r="3.4" fill="none" stroke="#8A5F1E" stroke-width="1.7"/>' +
      '<path d="M0 10.5 q-9 9-9 18 q0 8 9 8 q9 0 9-8 q0-9-9-18Z"' +
      ' fill="#D9A648" stroke="#8A5F1E" stroke-width="1.7"/>' +
      '<path d="M0 21 l4 5 -4 5 -4 -5 Z" fill="#8A5F1E"/>' +
      '<circle cx="0" cy="32.5" r="1.5" fill="#8A5F1E"/>';
    svg.appendChild(pendant);

    const spots = [];
    for (let i = 0; i < KNOTS; i++) {
      const g = svgEl('g', { class: 'knot-spot' });
      g.innerHTML =
        '<circle class="knot-halo" r="' + SPOT_R + '" fill="rgba(255,255,255,.16)"/>' +
        '<circle class="knot-target" r="' + SPOT_R + '" fill="none"' +
        ' stroke="rgba(255,255,255,.8)" stroke-width="2" stroke-dasharray="4 5"/>' +
        '<circle class="knot-ring" r="' + SPOT_R + '" fill="none" stroke="#FFF3CE"' +
        ' stroke-width="3.6" stroke-linecap="round" transform="rotate(-90)"' +
        ' stroke-dasharray="' + SPOT_C.toFixed(1) + '" stroke-dashoffset="' + SPOT_C.toFixed(1) + '"/>' +
        '<g class="knot-tied">' +
        '<ellipse rx="7.5" ry="6" fill="#E8C25A" stroke="#8A5F1E" stroke-width="1.5"/>' +
        '<path d="M-6 -3 q6 4 12 -1 M-6 3 q6 -4 12 1" fill="none" stroke="#8A5F1E"' +
        ' stroke-width="1.5" stroke-linecap="round"/>' +
        '</g>';
      svg.appendChild(g);
      spots.push(g);
    }

    // 1 · 2 · 3, so the length of the task is never a mystery
    const dots = document.createElement('div');
    dots.className = 'knot-dots';
    for (let i = 0; i < KNOTS; i++) {
      const d = document.createElement('span');
      d.className = 'knot-dot';
      d.textContent = String(i + 1);
      dots.appendChild(d);
    }

    const cap = document.createElement('p');
    cap.className = 'game-cap';
    cap.textContent = 'Three knots, tied by family, bind two lives.';

    wrap.append(svg, dots, cap);
    stage.appendChild(wrap);

    let at = [];

    function layout() {
      const d = 'M18 26 Q100 ' + SAG[tied] + ' 182 26';
      thread.setAttribute('d', d);
      thread2.setAttribute('d', d);

      const len = thread.getTotalLength();
      at = [0.3, 0.5, 0.7].map((f) => thread.getPointAtLength(len * f));
      spots.forEach((g, i) => {
        g.setAttribute('transform', 'translate(' + at[i].x + ',' + at[i].y + ')');
        g.classList.toggle('is-tied', i < tied);
        g.classList.toggle('is-active', i === tied);
      });

      const low = thread.getPointAtLength(len * 0.5);
      pendant.setAttribute('transform', 'translate(' + low.x + ',' + low.y + ')');
    }
    layout();

    function paintDots() {
      [...dots.children].forEach((d, i) => {
        d.classList.toggle('is-done', i < tied);
        d.classList.toggle('is-now', i === tied);
      });
    }
    paintDots();

    function toSvg(e) {
      const m = svg.getScreenCTM();
      if (!m) return null;
      const p = svg.createSVGPoint();
      p.x = e.clientX;
      p.y = e.clientY;
      return p.matrixTransform(m.inverse());
    }

    let holdTimer = null, holding = -1, done = false;
    const ringOf = (i) => spots[i].querySelector('.knot-ring');

    function startHold(i) {
      if (done || holding === i) return;
      holding = i;
      spots[i].classList.add('is-holding');
      const ring = ringOf(i);
      ring.style.transitionDuration = HOLD_MS + 'ms';
      ring.style.strokeDashoffset = '0';
      holdTimer = setTimeout(() => tie(i), HOLD_MS);
    }

    function cancelHold() {
      if (holding < 0) return;
      const ring = ringOf(holding);
      ring.style.transitionDuration = '180ms';
      ring.style.strokeDashoffset = String(SPOT_C);
      spots[holding].classList.remove('is-holding');
      clearTimeout(holdTimer);
      holdTimer = null;
      holding = -1;
    }

    function tie(i) {
      clearTimeout(holdTimer);
      holdTimer = null;
      holding = -1;
      spots[i].classList.remove('is-holding');

      tied++;
      tone({ freq: 520, to: 300, type: 'triangle', dur: .18, gain: .22 });
      layout();
      paintDots();

      if (tied >= KNOTS) {
        done = true;
        hint.textContent = 'The knot is tied 🙏';
        cap.textContent = 'Bound, with the blessings of both families.';
        pendant.classList.add('is-settled');
        setTimeout(complete, 700);
      } else {
        hint.textContent = tied === 1 ? 'Two more knots' : 'One more knot';
      }
    }

    function onDown(e) {
      if (done) return;
      const p = toSvg(e);
      const target = at[tied];
      if (!p || !target) return;
      // generous radius — the ritual is the point, not the aim
      if (Math.hypot(p.x - target.x, p.y - target.y) < 34) {
        try { svg.setPointerCapture(e.pointerId); } catch (_) { /* not capturable */ }
        startHold(tied);
      }
    }

    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('pointerup', cancelHold);
    svg.addEventListener('pointercancel', cancelHold);
    svg.addEventListener('pointerleave', cancelHold);

    return {
      destroy() {
        clearTimeout(holdTimer);
        wrap.remove();
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

    /* The couple in full wedding dress, drawn once. "Blessedness" is a filter
       over the whole group — desaturated and dim to begin with, warming to
       full colour as the akshata lands. One drawing, not two layers that have
       to be kept in step. */

    /* Varmala: flowers packed tightly enough along a U to read as one strand.
       Spaced out on an arc they just look like scattered confetti. */
    function garland(cx, cy, drop) {
      const x0 = cx - 13, x1 = cx + 13, cxx = cx, cyy = cy + drop;
      let out = '<g>';
      for (let i = 0; i <= 17; i++) {
        const t = i / 17, u = 1 - t;
        const x = u * u * x0 + 2 * u * t * cxx + t * t * x1;
        const y = u * u * cy + 2 * u * t * cyy + t * t * cy;
        out += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) +
               '" r="2.9" fill="' + (i % 3 === 0 ? '#FFF7E4' : '#E8A33D') + '"/>';
      }
      return out + '</g>';
    }

    const figures = svgEl('g', { class: 'akshata-figures' });
    figures.innerHTML = [
      // ------------------------- bride -------------------------
      '<path d="M56 96 Q52 122 48 146 L100 146 Q96 122 92 96 Z" fill="#C4453F"/>',
      '<path d="M48.6 137 L99.4 137 L100 146 L48 146 Z" fill="#E7B94A"/>',
      '<path d="M62 70 L86 70 L92 98 L58 98 Z" fill="#A8302E"/>',
      '<path d="M85 66 Q99 88 95 118 L82 112 Q90 88 79 70 Z" fill="#D9564F"/>',
      '<path d="M85 66 Q99 88 95 118 L91 116 Q95 90 82 68 Z" fill="#E7B94A"/>',
      '<path d="M69 60 h10 v10 h-10 Z" fill="#C98A5E"/>',
      '<ellipse cx="74" cy="50" rx="11.5" ry="13" fill="#C98A5E"/>',
      '<path d="M62.5 52 q0-15 11.5-15 q11.5 0 11.5 15 q-6-7-11.5-7 q-5.5 0-11.5 7 Z" fill="#2A1A12"/>',
      '<circle cx="87" cy="55" r="6.5" fill="#2A1A12"/>',
      '<path d="M74 37 v-6" stroke="#E7B94A" stroke-width="1.4" fill="none"/>',
      '<circle cx="74" cy="30" r="2.4" fill="#E7B94A"/>',
      '<circle cx="74" cy="45" r="1.7" fill="#8E2436"/>',
      '<circle cx="63.5" cy="57" r="2.6" fill="#E7B94A"/>',
      '<path d="M67 70 q7 9 14 0" fill="none" stroke="#E7B94A" stroke-width="2.4"/>',

      // ------------------------- groom -------------------------
      '<path d="M112 98 L146 98 L150 146 L108 146 Z" fill="#FBF5E6"/>',
      '<path d="M108.4 137 L149.6 137 L150 146 L108 146 Z" fill="#E7B94A"/>',
      '<path d="M114 68 L142 68 L147 100 L109 100 Z" fill="#F5EDDC"/>',
      '<path d="M140 66 q-9 22-5 44 l-11-3 q6-21 3-40 Z" fill="#E7C778"/>',
      '<path d="M123 58 h10 v10 h-10 Z" fill="#B87A4E"/>',
      '<ellipse cx="128" cy="47" rx="11.5" ry="13" fill="#B87A4E"/>',
      '<path d="M116.5 49 q0-15 11.5-15 q11.5 0 11.5 15 q-6-8-11.5-8 q-5.5 0-11.5 8 Z" fill="#2A1A12"/>',

      garland(74, 72, 34),
      garland(128, 70, 34),
    ].join('');
    figures.style.filter = 'saturate(.12) brightness(.72)';
    figures.style.opacity = '.6';
    svg.appendChild(figures);

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

    /* Grains always rain over the couple. Spawning them at the touch point
       meant tapping near the bowl showered rice down the empty left edge. */
    function spawn(y, n) {
      for (let i = 0; i < n; i++) {
        grains.push({
          x: box.w * 0.5 + (Math.random() - .5) * box.w * 0.46,
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
      spawn(4, 12);

      blessings++;
      const pct = Math.min(1, blessings / BLESSINGS);
      figures.style.filter =
        'saturate(' + (0.12 + 0.88 * pct).toFixed(2) + ') ' +
        'brightness(' + (0.72 + 0.28 * pct).toFixed(2) + ')';
      figures.style.opacity = (0.6 + 0.4 * pct).toFixed(2);
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

  /* ------------------------------------------------------------------ *
   * BHAAT — fill the thaal
   *
   * The mama arrives with his arms full. Tap a gift to send it to the
   * platter, or drag it there. Tap is the primary gesture (one-handed, no
   * aim required); dragging is supported because the gifts look draggable
   * and anyone who tries it should be rewarded rather than ignored.
   * ------------------------------------------------------------------ */
  const GIFTS = [
    { kind: 'bangles',  from: [34, 44],  to: [76, 142] },
    { kind: 'sari',     from: [82, 30],  to: [100, 136] },
    { kind: 'sweets',   from: [130, 34], to: [124, 142] },
    { kind: 'envelope', from: [168, 52], to: [88, 128] },
    { kind: 'garland',  from: [104, 74], to: [113, 128] },
  ];

  function giftShape(kind) {
    switch (kind) {
      case 'bangles':
        return '<circle r="9" fill="none" stroke="#E8A33D" stroke-width="3.4"/>' +
               '<circle cy="7" r="8" fill="none" stroke="#B23A48" stroke-width="3.4"/>';
      case 'sari':
        return '<path d="M-13 -9 h26 v18 h-26 Z" fill="#C4453F" stroke="#7A2E12" stroke-width="1.8"/>' +
               '<path d="M-13 -2 h26" stroke="#E7B94A" stroke-width="2.4"/>';
      case 'sweets':
        return '<circle cx="-6" cy="3" r="7" fill="#E8C25A" stroke="#7A2E12" stroke-width="1.6"/>' +
               '<circle cx="6" cy="3" r="7" fill="#E8C25A" stroke="#7A2E12" stroke-width="1.6"/>' +
               '<circle cx="0" cy="-6" r="7" fill="#EFD37E" stroke="#7A2E12" stroke-width="1.6"/>';
      case 'envelope':
        return '<path d="M-13 -8 h26 v16 h-26 Z" fill="#FBF5E6" stroke="#7A2E12" stroke-width="1.8"/>' +
               '<path d="M-13 -8 l13 9 l13 -9" fill="none" stroke="#7A2E12" stroke-width="1.6"/>' +
               '<circle cx="0" cy="4" r="3" fill="#C4453F"/>';
      default: { // garland — a ring of marigolds
        let out = '<g>';
        for (let k = 0; k < 9; k++) {
          const a = (k / 9) * Math.PI * 2;
          out += '<circle cx="' + (Math.cos(a) * 9).toFixed(1) +
                 '" cy="' + (Math.sin(a) * 9).toFixed(1) +
                 '" r="3.1" fill="' + (k % 3 === 0 ? '#FFF7E4' : '#E8A33D') +
                 '" stroke="#7A2E12" stroke-width="1"/>';
        }
        return out + '</g>';
      }
    }
  }

  function thaal(ctx_) {
    const { veil, stage, hint, complete } = ctx_;
    veil.style.setProperty('--veil-bg', '#B4562F');
    hint.textContent = 'Tap each gift to fill the thaal';

    const wrap = document.createElement('div');
    wrap.className = 'thaal-wrap';

    /* The gifts are HTML laid over the platter rather than nodes inside the
       SVG. Moving an SVG node leaves smear trails on mobile — the browser
       does not reliably repaint the area it vacated — whereas an HTML element
       moved by transform gets its own composited layer and comes away clean. */
    const board = document.createElement('div');
    board.className = 'thaal-board';

    const svg = svgEl('svg', { viewBox: '0 0 200 190', class: 'thaal-svg' });
    const plate = svgEl('g', { class: 'thaal-plate' });
    plate.innerHTML =
      '<ellipse cx="100" cy="158" rx="66" ry="18" fill="#B8871F"/>' +
      '<ellipse cx="100" cy="152" rx="66" ry="18" fill="#E8C25A" stroke="#7A2E12" stroke-width="2"/>' +
      '<ellipse cx="100" cy="151" rx="50" ry="12" fill="#F3E0AE"/>';
    svg.appendChild(plate);
    board.appendChild(svg);

    const nodes = GIFTS.map((g, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'gift';
      b.dataset.i = String(i);
      b.setAttribute('aria-label', 'Put the ' + g.kind + ' on the thaal');
      b.innerHTML = '<span class="gift-in" style="animation-delay:' + (i * 0.4).toFixed(1) +
        's"><svg viewBox="-16 -16 32 32" aria-hidden="true">' + giftShape(g.kind) + '</svg></span>';
      board.appendChild(b);
      return b;
    });

    const meter = document.createElement('div');
    meter.className = 'thaal-meter';
    const fill = document.createElement('span');
    fill.className = 'thaal-fill';
    meter.appendChild(fill);

    const cap = document.createElement('p');
    cap.className = 'game-cap';
    cap.textContent = 'A brother comes bearing all his sister’s family could need.';

    wrap.append(board, meter, cap);
    stage.appendChild(wrap);

    let given = 0, done = false, k = 1;
    const placed = nodes.map(() => false);

    // viewBox units -> css pixels
    function put(el, x, y) {
      el.style.transform = 'translate(' + (x * k).toFixed(1) + 'px,' + (y * k).toFixed(1) + 'px)';
    }

    function layout() {
      k = (board.clientWidth || 280) / 200;
      // scale with the board, but never below a comfortable touch target
      const size = Math.max(40, 34 * k);
      nodes.forEach((el, i) => {
        el.style.width = size.toFixed(1) + 'px';
        el.style.height = size.toFixed(1) + 'px';
        el.style.marginLeft = (-size / 2).toFixed(1) + 'px';
        el.style.marginTop = (-size / 2).toFixed(1) + 'px';
        const p = placed[i] ? GIFTS[i].to : GIFTS[i].from;
        put(el, p[0], p[1]);
      });
    }
    layout();

    function toBoard(e) {
      const r = board.getBoundingClientRect();
      // the modal is mid scale-in on open, so correct for a scaled rect
      const sx = r.width ? board.clientWidth / r.width : 1;
      return { x: (e.clientX - r.left) * sx / k, y: (e.clientY - r.top) * sx / k };
    }

    function accept(i) {
      if (placed[i] || done) return;
      placed[i] = true;
      given++;

      const el = nodes[i];
      el.classList.remove('is-dragging');
      el.classList.add('is-placed');
      put(el, GIFTS[i].to[0], GIFTS[i].to[1]);

      tone({ freq: 660 + given * 70, to: 380, type: 'triangle', dur: .16, gain: .18 });
      fill.style.width = Math.round((given / GIFTS.length) * 100) + '%';

      if (given >= GIFTS.length) {
        done = true;
        hint.textContent = 'The thaal is full 🙏';
        plate.classList.add('is-full');
        setTimeout(complete, 700);
      } else {
        const left = GIFTS.length - given;
        hint.textContent = left + (left === 1 ? ' gift to go' : ' gifts to go');
      }
    }

    let dragI = -1, grab = null, moved = 0;

    function onDown(e) {
      if (done) return;
      const g = e.target.closest('.gift');
      if (!g) return;
      const i = Number(g.dataset.i);
      if (placed[i]) return;
      const p = toBoard(e);
      dragI = i;
      moved = 0;
      grab = { x: p.x - GIFTS[i].from[0], y: p.y - GIFTS[i].from[1] };
      g.classList.add('is-dragging');
      try { board.setPointerCapture(e.pointerId); } catch (_) { /* not capturable */ }
    }

    function onMove(e) {
      if (dragI < 0) return;
      const p = toBoard(e);
      moved++;
      put(nodes[dragI], p.x - grab.x, p.y - grab.y);
    }

    function onUp(e) {
      if (dragI < 0) return;
      const i = dragI;
      dragI = -1;
      const el = nodes[i];
      el.classList.remove('is-dragging');

      // a tap counts as "send it" — no aim required
      if (moved < 3) { accept(i); return; }

      const p = toBoard(e);
      if (p.y > 118 && Math.abs(p.x - 100) < 78) accept(i);
      else put(el, GIFTS[i].from[0], GIFTS[i].from[1]);
    }

    board.addEventListener('pointerdown', onDown);
    board.addEventListener('pointermove', onMove);
    board.addEventListener('pointerup', onUp);
    board.addEventListener('pointercancel', onUp);

    const onResize = () => layout();
    window.addEventListener('resize', onResize);

    return {
      destroy() {
        window.removeEventListener('resize', onResize);
        wrap.remove();
        veil.style.removeProperty('--veil-bg');
      },
    };
  }

  const SIGHTS = [
    { label: 'Fort',       icon: 'fort',   at: [56, 58] },
    { label: 'Palm grove', icon: 'palm',   at: [144, 50] },
    { label: 'Temple',     icon: 'temple', at: [150, 116] },
    { label: 'River',      icon: 'river',  at: [54, 122] },
  ];

  function sights(ctx_) {
    const { veil, stage, hint, complete } = ctx_;
    veil.style.setProperty('--veil-bg', '#6E7B3C');
    hint.textContent = 'Tap the glowing pins';

    const wrap = document.createElement('div');
    wrap.className = 'sights-wrap';

    const svg = svgEl('svg', { viewBox: '0 0 200 170', class: 'sights-svg' });
    svg.innerHTML =
      '<rect x="8" y="12" width="184" height="146" rx="16" fill="#EFE8CC"/>' +
      // river
      '<path d="M12 132 q34-20 64-7 q30 13 56-9 q20-16 56-8" fill="none"' +
      ' stroke="#8FB6C9" stroke-width="8" stroke-linecap="round"/>' +
      // roads
      '<g stroke="#CFC49C" stroke-width="2.4" stroke-dasharray="5 7" fill="none">' +
      '<path d="M18 66 H184M100 18 V150"/></g>' +
      // greenery
      '<g fill="#A8BC86">' +
      '<circle cx="34" cy="36" r="7"/><circle cx="46" cy="30" r="5"/>' +
      '<circle cx="170" cy="80" r="6"/><circle cx="120" cy="146" r="6"/>' +
      '<circle cx="74" cy="92" r="5"/></g>';

    const pins = SIGHTS.map((sight, i) => {
      const w = 26 + sight.label.length * 5.4;
      const g = svgEl('g', { class: 'pin', 'data-i': String(i) });
      g.style.transform = 'translate(' + sight.at[0] + 'px,' + sight.at[1] + 'px)';
      g.innerHTML =
        '<circle class="pin-hit" r="24" fill="transparent"/>' +
        // before: a glowing pin with nothing to give away
        '<g class="pin-mark">' +
        '<circle class="pin-halo" r="13" fill="#FFF7E4"/>' +
        '<circle class="pin-glow" r="14" fill="#FFF7E4"/>' +
        '<path class="pin-body" d="M0 4 q-8-10-8-16 a8 8 0 0 1 16 0 q0 6-8 16 Z"' +
        ' fill="#8E2436" stroke="#5E1622" stroke-width="1.6"/>' +
        '<circle cx="0" cy="-12" r="3.2" fill="#FFF7E4"/>' +
        '</g>' +
        // after: the sight itself, named
        '<g class="pin-found">' +
        '<circle cx="0" cy="-18" r="17.5" fill="#FCF9F1" stroke="#8E2436" stroke-width="2"/>' +
        '<g transform="translate(0,-18)">' + SIGHT_ICONS[sight.icon] + '</g>' +
        '<rect x="' + (-w / 2).toFixed(1) + '" y="3" width="' + w.toFixed(1) +
        '" height="16" rx="8" fill="#FCF9F1"/>' +
        '<text x="0" y="14.5" text-anchor="middle">' + sight.label + '</text>' +
        '</g>';
      svg.appendChild(g);
      return g;
    });

    const count = document.createElement('p');
    count.className = 'game-count';

    const cap = document.createElement('p');
    cap.className = 'game-cap';
    cap.textContent = 'Between the sangeet and the vows, a day for the town.';

    wrap.append(svg, count, cap);
    stage.appendChild(wrap);

    let found = 0, done = false;
    const got = pins.map(() => false);

    function paint() {
      count.textContent = found + ' of ' + SIGHTS.length + ' found';
    }
    paint();

    function onDown(e) {
      if (done) return;
      const g = e.target.closest('.pin');
      if (!g) return;
      const i = Number(g.dataset.i);
      if (got[i]) return;

      got[i] = true;
      found++;
      g.classList.add('is-found');
      tone({ freq: 540 + found * 90, to: 320, type: 'triangle', dur: .16, gain: .18 });
      paint();

      if (found >= SIGHTS.length) {
        done = true;
        hint.textContent = 'All four found 🌴';
        setTimeout(complete, 700);
      }
    }

    svg.addEventListener('pointerdown', onDown);

    return {
      destroy() {
        wrap.remove();
        veil.style.removeProperty('--veil-bg');
      },
    };
  }
  sights.idleSkip = true;

  /* ------------------------------------------------------------------ *
   * DJ NIGHT — drop the beat
   * Tap the disc to layer the track, or hold it to build to the drop.
   * ------------------------------------------------------------------ */
  const BEAT_TAPS = 6;
  const HOLD_DROP_MS = 2000;
  const BARS = 11;

  function beat(ctx_) {
    const { veil, stage, hint, complete } = ctx_;
    veil.style.setProperty('--veil-bg', '#6E3A5E');
    hint.textContent = 'Tap the disc to build the beat';

    const wrap = document.createElement('div');
    wrap.className = 'beat-wrap';

    const svg = svgEl('svg', { viewBox: '0 0 200 170', class: 'beat-svg' });

    // equaliser
    const bars = [];
    const eq = svgEl('g', { class: 'eq' });
    for (let i = 0; i < BARS; i++) {
      const r = svgEl('rect', {
        class: 'eq-bar',
        x: String(18 + i * 16.4), y: '112', width: '10', height: '38', rx: '5',
        fill: i % 2 ? '#E8A33D' : '#F3D882',
      });
      eq.appendChild(r);
      bars.push(r);
    }
    svg.appendChild(eq);

    // the disc
    const disc = svgEl('g', { class: 'beat-disc' });
    disc.innerHTML =
      '<circle class="disc-halo" cx="100" cy="58" r="40" fill="#FFF3CE" opacity=".2"/>' +
      '<circle cx="100" cy="58" r="31" fill="#3B2247" stroke="#F3D882" stroke-width="3"/>' +
      '<circle cx="100" cy="58" r="13" fill="#F3D882"/>' +
      '<circle cx="100" cy="58" r="4" fill="#3B2247"/>' +
      '<path d="M112 50 l14 8 l-14 8 Z" fill="#FFF3CE" opacity=".9"/>';
    svg.appendChild(disc);

    const count = document.createElement('p');
    count.className = 'game-count';

    const cap = document.createElement('p');
    cap.className = 'game-cap';
    cap.textContent = 'One last night on the floor before the vows.';

    wrap.append(svg, count, cap);
    stage.appendChild(wrap);

    let energy = 0, done = false, holdTimer = null, heldFrom = 0;

    function paint() {
      count.textContent = Math.min(energy, BEAT_TAPS) + ' of ' + BEAT_TAPS;
    }
    paint();

    function flare(scale) {
      if (reduceMotion) return;
      bars.forEach((b) => {
        const k = scale * (0.45 + Math.random() * 0.85);
        b.style.transform = 'scaleY(' + Math.max(0.25, k).toFixed(2) + ')';
      });
    }

    function drop() {
      if (done) return;
      done = true;
      clearTimeout(holdTimer);
      svg.classList.remove('is-building');
      svg.classList.add('is-drop');
      flare(2.6);
      hint.textContent = 'Drop! 🎶';
      count.textContent = BEAT_TAPS + ' of ' + BEAT_TAPS;
      tone({ freq: 110, to: 42, type: 'sine', dur: .7, gain: .4 });
      setTimeout(complete, 820);
    }

    function tap() {
      if (done) return;
      energy++;
      paint();
      flare(0.8 + energy * 0.22);
      // each layer lands a little higher and a little louder
      tone({
        freq: 180 + energy * 55, to: 90, type: 'triangle',
        dur: .18, gain: Math.min(.34, .12 + energy * .035),
      });
      if (energy >= BEAT_TAPS) drop();
      else hint.textContent = 'Keep going — ' + (BEAT_TAPS - energy) + ' to the drop';
    }

    function onDown(e) {
      if (done) return;
      if (!e.target.closest('.beat-disc')) return;
      heldFrom = performance.now();
      svg.classList.add('is-building');
      holdTimer = setTimeout(drop, HOLD_DROP_MS);
      try { svg.setPointerCapture(e.pointerId); } catch (_) { /* not capturable */ }
    }

    function onUp() {
      if (done || !heldFrom) return;
      clearTimeout(holdTimer);
      holdTimer = null;
      svg.classList.remove('is-building');
      // a short press is a tap; a long one would already have dropped
      if (performance.now() - heldFrom < HOLD_DROP_MS) tap();
      heldFrom = 0;
    }

    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('pointerup', onUp);
    svg.addEventListener('pointercancel', onUp);

    return {
      destroy() {
        clearTimeout(holdTimer);
        wrap.remove();
        veil.style.removeProperty('--veil-bg');
      },
    };
  }
  beat.idleSkip = true;

  return { thaal, scratch, trace, dhol, sights, beat, knots, akshata };
})();
