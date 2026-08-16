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

    const NS = 'http://www.w3.org/2000/svg';
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

    let audio = null;
    function thump() {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audio = audio || new AC();
        if (audio.state === 'suspended') audio.resume();
        const t = audio.currentTime;

        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(190, t);
        osc.frequency.exponentialRampToValueAtTime(70, t + .16);
        gain.gain.setValueAtTime(.35, t);
        gain.gain.exponentialRampToValueAtTime(.001, t + .22);
        osc.connect(gain).connect(audio.destination);
        osc.start(t);
        osc.stop(t + .25);
      } catch (_) { /* audio is a bonus, never a blocker */ }
    }

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
        if (audio) { audio.close().catch(() => {}); audio = null; }
      },
    };
  }

  return { scratch, trace, dhol };
})();
