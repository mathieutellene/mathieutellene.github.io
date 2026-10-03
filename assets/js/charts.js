/* Animated charts for the case studies: replays real training logs.
   Without JavaScript (or with reduced motion) the final state stays visible. */
(function(){
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pct = function(v){ return (v * 100).toFixed(1) + '%'; };

  function onView(el, fn){
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting) { io.disconnect(); fn(); } });
    }, {threshold: .35});
    io.observe(el);
  }

  /* ---------- epoch replay (Keras history) ---------- */
  document.querySelectorAll('[data-epochs]').forEach(function(fig){
    var src = document.getElementById(fig.dataset.epochs);
    if (!src) return;
    var D = JSON.parse(src.textContent), N = D.acc.length;
    var svg = fig.querySelector('svg.chart'), g = D.geo;
    var X = function(e){ return g.x0 + (e - 1) / (N - 1) * (g.x1 - g.x0); };
    var YA = function(v){ return g.a0 - (v - g.amin) / (g.amax - g.amin) * (g.a0 - g.a1); };
    var YL = function(v){ return g.l0 - Math.min(v, g.lmax) / g.lmax * (g.l0 - g.l1); };
    var series = {acc: YA, vacc: YA, loss: YL, vloss: YL}, pts = {}, path = {}, dot = {};
    Object.keys(series).forEach(function(k){
      pts[k] = D[k].map(function(v, i){ return X(i + 1).toFixed(1) + ',' + series[k](v).toFixed(1); });
      path[k] = svg.querySelector('[data-s="' + k + '"]');
      dot[k] = svg.querySelector('[data-d="' + k + '"]');
    });
    var ph = svg.querySelector('.ch-ph');
    var cks = [].slice.call(svg.querySelectorAll('.ch-ck'));
    var beats = [].slice.call(svg.querySelectorAll('.tc-beat'));
    var area = svg.querySelector('.ch-area[data-from]');
    var out = {};
    fig.querySelectorAll('[data-k]').forEach(function(el){ out[el.dataset.k] = el; });
    var toast = fig.querySelector('.tc-ck'), btn = fig.querySelector('.tc-btn'), range = fig.querySelector('.tc-range');
    var last = 0, toastT = 0;

    function draw(n){
      n = Math.max(1, Math.min(N, n | 0));
      Object.keys(path).forEach(function(k){
        path[k].setAttribute('d', 'M' + pts[k].slice(0, n).join('L'));
        var p = pts[k][n - 1].split(',');
        dot[k].setAttribute('cx', p[0]); dot[k].setAttribute('cy', p[1]);
      });
      var x = X(n).toFixed(1);
      ph.setAttribute('x1', x); ph.setAttribute('x2', x);
      cks.forEach(function(c){ c.classList.toggle('off', +c.dataset.e > n); });
      beats.forEach(function(b){ b.classList.toggle('off', +b.dataset.e > n); });
      if (area) area.setAttribute('width', Math.max(0, X(n) - X(+area.dataset.from)).toFixed(1));
      out.ep.textContent = n;
      out.acc.textContent = pct(D.acc[n - 1]);
      out.vacc.textContent = pct(D.vacc[n - 1]);
      out.vloss.textContent = D.vloss[n - 1].toFixed(2);
      if (range) range.value = n;
      if (n > last && toast) {
        for (var e = last + 1; e <= n; e++) if (D.ck.indexOf(e) >= 0) {
          toast.classList.add('on'); clearTimeout(toastT);
          toastT = setTimeout(function(){ toast.classList.remove('on'); }, 650);
          break;
        }
      }
      last = n;
    }

    /* time to epoch: the first K epochs (where most of the learning happens) get T1 of the T ms */
    var tl = D.tl || {}, T = tl.T || 15000, T1 = tl.T1 || 5200, K = Math.min(tl.K || 30, N - 1);
    function epochAt(t){
      if (t <= T1) return 1 + (K - 1) * (t / T1);
      return K + (N - K) * Math.min(1, (t - T1) / (T - T1));
    }
    var raf = 0, t0 = 0, playing = false, offset = 0;
    var icons = {
      play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>Play',
      pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>Pause',
      replay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>Replay'
    };
    function setBtn(s){ if (btn) { btn.innerHTML = icons[s]; btn.dataset.state = s; } }
    function frame(t){
      var el = offset + (t - t0), e = epochAt(el);
      draw(e);
      if (el < T) raf = requestAnimationFrame(frame);
      else { playing = false; setBtn('replay'); }
    }
    function play(from){
      cancelAnimationFrame(raf);
      offset = from || 0; t0 = performance.now(); playing = true; setBtn('pause');
      raf = requestAnimationFrame(frame);
    }
    function pause(){ cancelAnimationFrame(raf); playing = false; setBtn('play'); }
    function timeOf(n){ return n <= K ? (n - 1) / (K - 1) * T1 : T1 + (n - K) / (N - K) * (T - T1); }

    if (btn) btn.addEventListener('click', function(){
      var s = btn.dataset.state;
      if (s === 'pause') pause();
      else if (s === 'replay') { last = 0; play(0); }
      else play(timeOf(last));
    });
    if (range) range.addEventListener('input', function(){
      pause(); last = +range.value; draw(last);
      if (last >= N) setBtn('replay');
    });

    if (reduce) { draw(N); setBtn('replay'); return; }
    draw(1); setBtn('play');
    onView(fig, function(){ play(0); });
  });

  /* ---------- grid search replay (best model so far) ---------- */
  document.querySelectorAll('[data-grid]').forEach(function(fig){
    var src = document.getElementById(fig.dataset.grid);
    if (!src) return;
    var D = JSON.parse(src.textContent), N = D.n, g = D.geo;
    var svg = fig.querySelector('svg.chart');
    var X = function(i){ return g.x0 + (i - 1) / (N - 1) * (g.x1 - g.x0); };
    var Y = function(v){ return g.y0 - v / g.vmax * (g.y0 - g.y1); };
    var lines = D.series.map(function(s){ return {s: s, el: svg.querySelector('[data-s="' + s.key + '"]')}; });
    var ph = svg.querySelector('.ch-ph');
    var dots = [].slice.call(svg.querySelectorAll('.ch-ck'));
    var beats = [].slice.call(svg.querySelectorAll('.tc-beat'));
    var out = {};
    fig.querySelectorAll('[data-k]').forEach(function(el){ out[el.dataset.k] = el; });
    var toast = fig.querySelector('.tc-ck'), btn = fig.querySelector('.tc-btn'), range = fig.querySelector('.tc-range');
    var imp = [];
    D.series.forEach(function(s){ s.pts.forEach(function(p){ imp.push(p[0]); }); });
    var last = 0, toastT = 0;

    function draw(n){
      n = Math.max(1, Math.min(N, n | 0));
      lines.forEach(function(l){
        var d = '', best = null;
        l.s.pts.forEach(function(p){
          if (p[0] > n) return;
          d += best === null ? 'M' + X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1) : 'H' + X(p[0]).toFixed(1) + 'V' + Y(p[1]).toFixed(1);
          best = p[1];
        });
        l.el.setAttribute('d', d + 'H' + X(n).toFixed(1));
        if (out[l.s.key]) out[l.s.key].textContent = best;
      });
      var x = X(n).toFixed(1);
      ph.setAttribute('x1', x); ph.setAttribute('x2', x);
      dots.forEach(function(c){ c.classList.toggle('off', +c.dataset.e > n); });
      beats.forEach(function(b){ b.classList.toggle('off', +b.dataset.e > n); });
      out.n.textContent = n.toLocaleString('en-US');
      if (range) range.value = n;
      if (n > last && toast) {
        for (var k = 0; k < imp.length; k++) if (imp[k] > last && imp[k] <= n && imp[k] > 1) {
          toast.classList.add('on'); clearTimeout(toastT);
          toastT = setTimeout(function(){ toast.classList.remove('on'); }, 600);
          break;
        }
      }
      last = n;
    }
    var T = 11000, raf = 0, t0 = 0, offset = 0;
    var icons = {
      play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>Play',
      pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>Pause',
      replay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>Replay'
    };
    function setBtn(s){ if (btn) { btn.innerHTML = icons[s]; btn.dataset.state = s; } }
    function frame(t){
      var el = offset + (t - t0), k = Math.min(1, el / T);
      draw(1 + (N - 1) * k);
      if (k < 1) raf = requestAnimationFrame(frame); else setBtn('replay');
    }
    function play(from){ cancelAnimationFrame(raf); offset = from || 0; t0 = performance.now(); setBtn('pause'); raf = requestAnimationFrame(frame); }
    function pause(){ cancelAnimationFrame(raf); setBtn('play'); }
    if (btn) btn.addEventListener('click', function(){
      var s = btn.dataset.state;
      if (s === 'pause') pause();
      else if (s === 'replay') { last = 0; play(0); }
      else play((last - 1) / (N - 1) * T);
    });
    if (range) range.addEventListener('input', function(){
      pause(); last = +range.value; draw(last); if (last >= N) setBtn('replay');
    });
    if (reduce) { draw(N); setBtn('replay'); return; }
    draw(1); setBtn('play');
    onView(fig, function(){ play(0); });
  });
  /* ---------- Erlang C calculator ---------- */
  document.querySelectorAll('[data-erlang]').forEach(function(box){
    var inp = {}, out = {};
    box.querySelectorAll('[data-i]').forEach(function(el){ inp[el.dataset.i] = el; });
    box.querySelectorAll('[data-o]').forEach(function(el){ out[el.dataset.o] = el; });
    var T = 20, TARGET = 0.9, NS = 'http://www.w3.org/2000/svg';
    function sl(n, a, aht){
      if (n <= a) return 0;
      var term = 1, sum = 0;
      for (var k = 0; k < n; k++) { if (k > 0) term *= a / k; sum += term; }
      term *= a / n;
      var num = term * n / (n - a), pw = num / (sum + num);
      return Math.max(0, Math.min(1, 1 - pw * Math.exp(-(n - a) * T / aht)));
    }
    function need(a, aht){ var n = Math.floor(a) + 1; while (sl(n, a, aht) < TARGET && n < 2000) n++; return n; }
    var svg = out.bars, bars = svg ? [].slice.call(svg.querySelectorAll('rect')) : [], labs = svg ? [].slice.call(svg.querySelectorAll('text.ch-tick[text-anchor="middle"]')) : [];
    function update(){
      var vol = +inp.vol.value, aht = +inp.aht.value, shr = +inp.shr.value;
      var a = vol * aht / 3600, n = need(a, aht), g = Math.ceil(n / (1 - shr / 100));
      out.vol.textContent = vol; out.aht.textContent = aht + ' s'; out.shr.textContent = shr.toFixed(1) + '%';
      out.a.textContent = a.toFixed(2) + ' erlangs'; out.net.textContent = n; out.gross.textContent = g;
      out.sl.textContent = (sl(n, a, aht) * 100).toFixed(1) + '%';
      var first = Math.max(1, Math.floor(a) + 1), y0 = 140, y1 = 14;
      bars.forEach(function(r, i){
        var m = first + i, v = sl(m, a, aht), h = v * (y0 - y1);
        r.setAttribute('y', (y0 - h).toFixed(1)); r.setAttribute('height', h.toFixed(1));
        r.setAttribute('class', m === n ? 'ch-bar' : 'ch-bar dim');
        var t = r.querySelector('title'); if (t) t.textContent = m + ' agents: ' + (v * 100).toFixed(1) + '%';
        if (labs[i]) labs[i].textContent = m;
      });
    }
    Object.keys(inp).forEach(function(k){ inp[k].addEventListener('input', update); });
    update();
  });

  /* ---------- inside the network: one photo through the layers ---------- */
  document.querySelectorAll('[data-nn]').forEach(function(fig){
    if (reduce) return;
    var btn = fig.querySelector('.tc-btn');
    fig.classList.add('nn-js');
    function run(){ fig.classList.remove('play'); void fig.getBoundingClientRect(); requestAnimationFrame(function(){ fig.classList.add('play'); }); }
    if (btn) btn.addEventListener('click', run);
    onView(fig, run);
  });
})();
