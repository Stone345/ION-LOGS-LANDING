// IONLOGS landing page interactions. Plain JS, no dependencies. Every demo uses synthetic data.
(() => {
  "use strict";
  document.documentElement.classList.add("js");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const SVG = "http://www.w3.org/2000/svg";
  const svgEl = (tag, attrs = {}, parent) => {
    const el = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    if (parent) parent.appendChild(el);
    return el;
  };
  const fmt = (n) => n.toLocaleString("en-US");
  const clock = () => new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  /** Animates a number in `el` from its current value to `to`. */
  function countTo(el, to, ms = 1200) {
    const from = Number(String(el.textContent).replace(/[^\d-]/g, "")) || 0;
    if (reduce) return void (el.textContent = fmt(to));
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(from + (to - from) * e));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /** Runs `fn` once when `el` first scrolls into view. */
  function onView(el, fn, threshold = 0.3) {
    if (!el) return;
    if (!("IntersectionObserver" in window)) return fn();
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        fn();
      }
    }, { threshold });
    io.observe(el);
  }

  /* ───────────── Year, nav, reveal, reduced motion ───────────── */
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  const nav = $("#nav");
  const onScroll = () => nav.classList.toggle("is-solid", window.scrollY > 24);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    $$(".reveal").forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 70}ms`; io.observe(el); });
  } else {
    $$(".reveal").forEach((el) => el.classList.add("is-in"));
  }

  if (reduce) {
    const v = $(".hero__video");
    if (v) { v.removeAttribute("autoplay"); v.pause(); }
    $$("svg").forEach((s) => s.pauseAnimations && s.pauseAnimations());
  }

  /* ───────────── Hero mass spectrum ───────────── */
  (function spectrum() {
    const svg = $("#spectrum");
    if (!svg) return;
    const W = 1200, H = 140, BASE = 132;
    // Deterministic pseudo-random so the page looks the same on every load.
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    svgEl("line", { class: "base", x1: 0, x2: W, y1: BASE, y2: BASE }, svg);
    const peaks = [];
    for (let i = 0; i < 120; i++) {
      const x = 8 + rnd() * (W - 16);
      const h = Math.pow(rnd(), 3.2) * 70 + 3;
      peaks.push({ x, h });
    }
    // A few characteristic ions, tallest one highlighted.
    [[262, 62], [431, 96], [436, 34], [598, 48], [742, 72], [905, 28]].forEach(([x, h]) => peaks.push({ x, h, major: true }));
    const top = { x: 431, h: 112 };
    const bars = peaks.map((p) => svgEl("rect", { class: "pk", x: p.x, y: BASE - p.h, width: p.major ? 3 : 2, height: p.h }, svg));
    const hi = svgEl("rect", { class: "pk pk--hi", x: top.x - 1, y: BASE - top.h, width: 4, height: top.h }, svg);
    const lbl = svgEl("text", { class: "lbl", x: top.x + 10, y: BASE - top.h + 12 }, svg);
    lbl.textContent = "432.2";
    const cursor = svgEl("line", { class: "cursor", x1: 0, x2: 0, y1: 0, y2: BASE }, svg);

    const all = [...bars, hi];
    all.forEach((b, i) => {
      b.style.transform = "scaleY(0)";
      b.style.transition = `transform .9s cubic-bezier(.2,.8,.2,1) ${reduce ? 0 : 200 + (i % 40) * 18}ms`;
    });
    requestAnimationFrame(() => requestAnimationFrame(() => all.forEach((b) => (b.style.transform = "scaleY(1)"))));

    if (reduce) { cursor.remove(); return; }
    // Sweep a scan cursor across the m/z range; each pass "acquires" the next sample.
    const tick = $("[data-tick]");
    let sample = 7, t0 = performance.now();
    const PERIOD = 4200;
    const loop = (t) => {
      const p = ((t - t0) % PERIOD) / PERIOD;
      const x = p * W;
      cursor.setAttribute("x1", x); cursor.setAttribute("x2", x);
      if (t - t0 >= PERIOD) {
        t0 = t;
        sample = (sample % 24) + 1;
        if (tick) tick.textContent = String(sample).padStart(2, "0");
        bars.forEach((b, i) => {
          const k = 0.75 + rnd() * 0.5;
          b.style.transition = `transform .6s ease ${i % 30 * 10}ms`;
          b.style.transform = `scaleY(${k})`;
        });
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  })();

  /* ───────────── Round demo ───────────── */
  (function round() {
    const list = $("#round");
    if (!list) return;
    const rows = $$(".round__row", list);
    const progress = $("#round-progress");
    const exBox = $("#round-exceptions");
    const exCount = $("#round-exc-count");
    let exceptions = 0;

    const parse = (s) => {
      const v = s.trim().replace(",", ".").replace(/[−–]/g, "-");
      return v === "" || isNaN(Number(v)) ? null : Number(v);
    };
    const rangeText = (r) => `${r.dataset.min.replace("-", "−")} to ${r.dataset.max.replace("-", "−")} ${r.dataset.unit}`;
    const inRange = (r, v) => v >= Number(r.dataset.min) && v <= Number(r.dataset.max);
    const setStatus = (r, cls, text) => { const s = $(".status", r); s.className = `status ${cls}`; s.textContent = text; };
    const setMsg = (r, cls, text) => { const m = $(".round__msg", r); m.className = `round__msg ${cls}`; m.textContent = text; };
    const update = () => { progress.textContent = `${rows.filter((r) => r.dataset.saved).length} of ${rows.length} done`; };

    rows.forEach((r, i) => {
      const input = $("input", r);
      input.addEventListener("input", () => {
        const v = parse(input.value);
        if (v === null) return setMsg(r, "", input.value.trim() ? "Numbers only, e.g. 4.1" : "");
        if (!inRange(r, v)) setMsg(r, "is-warn", `▲ Outside ${rangeText(r)} — saving opens an exception.`);
        else if (r.dataset.saved && String(v) !== r.dataset.saved) setMsg(r, "", "Changing a saved value records a correction with a reason.");
        else setMsg(r, "", "Press Enter to save");
      });
      input.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        const v = parse(input.value);
        if (v === null) return setMsg(r, "is-bad", "Enter a reading first.");
        const correcting = r.dataset.saved && String(v) !== r.dataset.saved;
        if (r.dataset.saved && !correcting) { (rows[i + 1] && $("input", rows[i + 1]) || input).focus(); return; }
        r.dataset.revisions = String(Number(r.dataset.revisions || 0) + 1);
        r.dataset.saved = String(v);
        const ok = inRange(r, v);
        if (!ok && !r.dataset.exception) {
          r.dataset.exception = "1";
          exceptions += 1;
          exCount.textContent = String(exceptions);
          exBox.hidden = false;
        }
        setStatus(r, ok ? "status--ok" : "status--bad", ok ? "Done" : "Exception");
        const who = `Observed ${clock()} by you`;
        setMsg(r, ok ? "is-ok" : "is-bad",
          correcting ? `✓ Revision ${r.dataset.revisions} saved · original kept in history · ${who}`
            : ok ? `✓ Saved · ${who}` : `! Saved · exception opened · ${who}`);
        update();
        const next = rows[i + 1] && $("input", rows[i + 1]);
        if (next) next.focus({ preventScroll: true });
        else input.blur();
      });
    });

    $("#round-reset").addEventListener("click", () => {
      exceptions = 0; exBox.hidden = true;
      rows.forEach((r) => {
        delete r.dataset.saved; delete r.dataset.exception; delete r.dataset.revisions;
        $("input", r).value = ""; setStatus(r, "status--due", "Due"); setMsg(r, "", "");
      });
      update();
    });
  })();

  /* ───────────── Traceability graph ───────────── */
  (function trace() {
    const host = $("#trace-graph");
    if (!host) return;
    const NODES = [
      { id: "M-100", col: 0, sub: "Methanol" },
      { id: "S-20", col: 1, sub: "Calibrator" },
      { id: "MPB-31", col: 1, sub: "Mobile phase B" },
      { id: "WC-22", col: 2, sub: "Working cal." },
      ...["P-86", "P-87", "P-88", "P-89", "P-90", "P-91"].map((id) => ({ id, col: 3 })),
      { id: "LC2", col: 4, sub: "Instrument" },
      { id: "LC1", col: 4, sub: "Instrument" },
      { id: "17 result IDs", col: 4, sub: "Synthetic", wide: true },
    ];
    const EDGES = [
      ["M-100", "S-20"], ["M-100", "MPB-31"], ["S-20", "WC-22"],
      ["WC-22", "P-86"], ["MPB-31", "P-86"], ["WC-22", "P-87"], ["MPB-31", "P-87"], ["MPB-31", "P-88"],
      ["MPB-31", "P-89"], ["S-20", "P-90"], ["MPB-31", "P-90"], ["WC-22", "P-91"],
      ["P-86", "LC2"], ["P-87", "LC2"], ["P-88", "LC2"], ["P-89", "LC1"], ["P-90", "LC1"], ["P-91", "LC1"],
      ["P-87", "17 result IDs"], ["P-88", "17 result IDs"], ["P-89", "17 result IDs"], ["P-90", "17 result IDs"],
    ];
    const COLS = ["LOT", "DERIVED", "2 STEPS AWAY", "PLATES", "IMPACT"];
    const depth = { "M-100": 0 };
    for (let changed = true; changed;) {
      changed = false;
      for (const [a, b] of EDGES) if (depth[a] !== undefined && (depth[b] === undefined || depth[b] < depth[a] + 1)) { depth[b] = depth[a] + 1; changed = true; }
    }

    let svg, nodeEls = {}, edgeEls = [];
    function draw() {
      const vertical = host.clientWidth < 560;
      host.textContent = "";
      nodeEls = {}; edgeEls = [];
      const W = vertical ? 340 : 860, H = vertical ? 470 : 380;
      svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, "aria-hidden": "true" }, host);
      const gE = svgEl("g", {}, svg), gN = svgEl("g", {}, svg);
      const pos = {};
      for (let c = 0; c < COLS.length; c++) {
        const col = NODES.filter((n) => n.col === c);
        col.forEach((n, i) => {
          if (vertical) {
            const rowY = 34 + c * ((H - 60) / (COLS.length - 1));
            const slot = (W - 8) / col.length;
            const w = Math.min(n.wide ? 116 : 96, slot - 6);
            pos[n.id] = { x: 4 + slot * (i + 0.5), y: rowY, w, h: 34 };
          } else {
            const x = 60 + c * ((W - 120) / (COLS.length - 1));
            const slot = (H - 40) / col.length;
            const w = n.col === 3 ? 74 : n.wide ? 112 : 96;
            pos[n.id] = { x, y: 34 + slot * (i + 0.5), w, h: n.col === 3 ? 32 : 42 };
          }
        });
        if (!vertical) { const t = svgEl("text", { class: "tg-col", x: 60 + c * ((W - 120) / (COLS.length - 1)), y: 10 }, svg); t.textContent = COLS[c]; }
      }
      for (const [a, b] of EDGES) {
        const p = pos[a], q = pos[b];
        let d;
        if (vertical) {
          const y1 = p.y + p.h / 2, y2 = q.y - q.h / 2, m = (y2 - y1) / 2;
          d = `M${p.x},${y1} C${p.x},${y1 + m} ${q.x},${y2 - m} ${q.x},${y2}`;
        } else {
          const x1 = p.x + p.w / 2, x2 = q.x - q.w / 2, m = (x2 - x1) / 2;
          d = `M${x1},${p.y} C${x1 + m},${p.y} ${x2 - m},${q.y} ${x2},${q.y}`;
        }
        edgeEls.push({ a, el: svgEl("path", { class: "tg-edge", d }, gE) });
      }
      for (const n of NODES) {
        const p = pos[n.id];
        const g = svgEl("g", { class: `tg-node${n.id === "M-100" ? " is-root" : ""}` }, gN);
        svgEl("rect", { x: p.x - p.w / 2, y: p.y - p.h / 2, width: p.w, height: p.h, rx: 8 }, g);
        const showSub = !vertical && n.sub && p.h > 36;
        const t = svgEl("text", { x: p.x, y: showSub ? p.y - 7 : p.y }, g);
        t.textContent = vertical && n.wide ? "17 results" : n.id;
        if (showSub) { const s = svgEl("text", { class: "sub", x: p.x, y: p.y + 10 }, g); s.textContent = n.sub; }
        nodeEls[n.id] = g;
      }
      if (recalled) paint(false);
    }

    let recalled = false;
    const timers = [];
    function paint(animate) {
      timers.splice(0).forEach(clearTimeout);
      const step = animate && !reduce ? 320 : 0;
      for (const [id, g] of Object.entries(nodeEls)) {
        const fn = () => g.classList.toggle("is-hot", recalled);
        if (recalled && step) timers.push(setTimeout(fn, depth[id] * step)); else fn();
      }
      for (const { a, el } of edgeEls) {
        const fn = () => el.classList.toggle("is-hot", recalled);
        if (recalled && step) timers.push(setTimeout(fn, depth[a] * step + step / 2)); else fn();
      }
    }

    draw();
    let lastW = host.clientWidth;
    window.addEventListener("resize", () => { if (Math.abs(host.clientWidth - lastW) > 40) { lastW = host.clientWidth; draw(); } });

    const stats = $$(".trace__stats dd");
    onView(host, () => stats.forEach((dd) => countTo(dd, Number(dd.dataset.count), 1100)));

    const btn = $("#trace-recall"), status = $("#trace-status"), note = $("#trace-note");
    btn.addEventListener("click", () => {
      recalled = !recalled;
      paint(true);
      status.className = `status ${recalled ? "status--bad" : "status--ok"}`;
      status.textContent = recalled ? "Recalled" : "In date";
      btn.textContent = recalled ? "Reset demo" : "Recall M-100";
      note.classList.toggle("is-live", recalled);
      note.textContent = recalled ? "New use blocked · 6 plates flagged · 17 affected IDs ready as CSV" : "Synthetic demo data";
    });
  })();

  /* ───────────── Column wear gauge ───────────── */
  (function gauge() {
    const value = $("#gauge-value");
    if (!value) return;
    const SCALE = 1100, ARC = 750; // 270° of a 1000-unit circle
    const u = (n) => (n / SCALE) * ARC;
    const warn = $(".gauge__warn");
    warn.style.strokeDasharray = `0 ${u(900)} ${u(1000) - u(900)} 1000`;
    const ticks = $("#gauge-ticks");
    for (let n = 0; n <= SCALE; n += 100) {
      const a = (u(n) / 1000) * 2 * Math.PI;
      const major = n % 500 === 0;
      const r1 = major ? 66 : 70, r2 = 76;
      svgEl("line", { class: major ? "major" : "", x1: 110 + r1 * Math.cos(a), y1: 110 + r1 * Math.sin(a), x2: 110 + r2 * Math.cos(a), y2: 110 + r2 * Math.sin(a) }, ticks);
    }
    const num = $("#gauge-num"), msg = $("#gauge-msg"), status = $("#gauge-status"), run = $("#gauge-run");
    const set = (n) => {
      value.style.strokeDasharray = `${u(Math.min(n, SCALE))} 1000`;
      value.classList.toggle("is-over", n > 1000);
      countTo(num, n, 1500);
      const over = n > 1000;
      status.className = `status ${over ? "status--bad" : "status--warn"}`;
      status.textContent = over ? "Limit passed" : "Warning";
      msg.classList.toggle("is-bad", over);
      msg.textContent = over ? "Past its 1,000 limit · supervisors and admins alerted" : `${fmt(1000 - n)} left · about 5 days at the current pace`;
      run.disabled = over;
    };
    onView($(".gauge"), () => set(974), 0.4);
    run.addEventListener("click", () => set(1014));
    $("#gauge-reset").addEventListener("click", () => set(974));
  })();

  /* ───────────── Reports & evidence ───────────── */
  (function reports() {
    const tiles = $$(".tile");
    if (!tiles.length) return;
    const DATA = {
      tasks: { title: "Tasks completed", total: 1284, rows: [
        ["FRG-01", "Temperature check · 4.1 °C", "07:52", "Jordan Lee"],
        ["LC1", "Mobile phase levels adequate", "07:58", "Jordan Lee"],
        ["LC2", "Nitrogen supply pressure · 98 psi", "08:03", "Sam Patel"],
        ["FRZ-01", "Temperature check · −19.6 °C", "08:06", "Jordan Lee"],
        ["LC1", "System suitability · approved", "09:40", "Morgan Reyes"],
      ] },
      exceptions: { title: "Exceptions", total: 23, rows: [
        ["FRG-04", "9.2 °C · outside 2 to 8 °C · closed with note", "Oct 3", "Morgan Reyes"],
        ["LC2", "Missed waste check · acknowledged", "Oct 7", "Morgan Reyes"],
        ["C-7", "Column past warn level · acknowledged", "Oct 12", "Morgan Reyes"],
        ["FRZ-02", "−12.4 °C · re-check in range", "Oct 18", "Sam Patel"],
        ["M-88", "Expired lot used · override audited", "Oct 21", "Morgan Reyes"],
      ] },
      late: { title: "Late entries", total: 9, rows: [
        ["FRG-02", "Entered 2 h late · “cold room door alarm”", "Oct 2", "Sam Patel"],
        ["LC1", "Entered next day · “instrument down”", "Oct 9", "Jordan Lee"],
        ["FRZ-01", "Entered 3 h late · “weekend cover”", "Oct 11", "Riley Chen"],
        ["LC2", "Entered 1 h late · “QC rerun”", "Oct 15", "Jordan Lee"],
        ["FRG-01", "Entered 4 h late · “network outage”", "Oct 23", "Jordan Lee"],
      ] },
      dates: { title: "Date/time changes", total: 14, rows: [
        ["FRG-01", "Temperature check · 4.1 °C", "obs 07:52 · ent 09:14", "Jordan Lee"],
        ["LC1", "Mobile phase levels adequate", "obs 07:30 · ent 08:02", "Jordan Lee"],
        ["LC2", "Waste container below 75%", "obs Oct 4 · ent Oct 5", "Sam Patel"],
        ["FRZ-01", "Temperature check · −19.8 °C", "obs 07:41 · ent 10:20", "Sam Patel"],
        ["LC1", "Nitrogen supply pressure", "obs 13:05 · ent 13:48", "Jordan Lee"],
      ] },
      corrections: { title: "Corrections", total: 31, rows: [
        ["FRG-04", "5.2 → 5.0 °C · “transcription error”", "Oct 1", "Jordan Lee"],
        ["P-89", "18 → 20 injections · “recount”", "Oct 6", "Jordan Lee"],
        ["FRZ-01", "−19.0 → −19.8 °C · “misread display”", "Oct 14", "Sam Patel"],
        ["S-20", "Expiry corrected · “certificate date”", "Oct 17", "Morgan Reyes"],
        ["LC2", "Pressure 96 → 98 psi · “wrong gauge”", "Oct 26", "Sam Patel"],
      ] },
    };
    const title = $("#ev-title"), count = $("#ev-count"), body = $("#ev-rows");
    const show = (key) => {
      const d = DATA[key];
      tiles.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.metric === key)));
      title.textContent = d.title;
      count.textContent = `${fmt(d.total)} rows`;
      body.textContent = "";
      d.rows.forEach((r, i) => {
        const row = document.createElement("div");
        row.className = "ev-row";
        row.style.animationDelay = `${i * 50}ms`;
        [["k", r[0]], ["", r[1]], ["t", r[2]], ["muted", r[3]]].forEach(([cls, text]) => {
          const s = document.createElement("span");
          if (cls) s.className = cls;
          s.textContent = text;
          row.appendChild(s);
        });
        body.appendChild(row);
      });
      const more = document.createElement("div");
      more.className = "ev-more";
      more.textContent = `+ ${fmt(d.total - d.rows.length)} more rows · each links to its record and audit trail · CSV of these rows`;
      body.appendChild(more);
    };
    tiles.forEach((t) => t.addEventListener("click", () => show(t.dataset.metric)));
    show("dates");

    const run = $("#pkg-run"), bar = $("#pkg-bar"), meta = $("#pkg-meta");
    let state = "idle";
    run.addEventListener("click", () => {
      if (state === "running") return;
      if (state === "ready") {
        state = "signed";
        run.textContent = "Signed off";
        run.disabled = true;
        meta.textContent += ` · signed off by Morgan Reyes ${clock()}`;
        return;
      }
      state = "running";
      run.textContent = "Generating…";
      meta.classList.remove("is-ready");
      let p = 0;
      const total = reduce ? 1 : 26;
      const iv = setInterval(() => {
        p += 1;
        bar.style.width = `${(p / total) * 100}%`;
        meta.textContent = `Generating in the background · ${Math.round((p / total) * 100)}%`;
        if (p >= total) {
          clearInterval(iv);
          const hex = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("");
          meta.textContent = `ionlogs-inspection-2026-10.pdf · 42 pages · SHA-256 ${hex.slice(0, 12)}…${hex.slice(-8)}`;
          meta.classList.add("is-ready");
          run.textContent = "Sign off";
          state = "ready";
        }
      }, 90);
    });
  })();
})();
