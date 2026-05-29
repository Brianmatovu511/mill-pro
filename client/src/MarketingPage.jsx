// ════════════════════════════════════════════════════════════════
// MarketingPage — public welcome / landing page
//
// This is a port of the Claude Design "brima" handoff (Welcome.html).
// The design is a self-contained HTML/CSS/JS prototype; we render it
// via dangerouslySetInnerHTML and run its prototype scripts inside a
// scoped useEffect so React owns mount/unmount.
//
// Action buttons in the markup carry data-action="signin" or
// data-action="register"; the effect wires those to the props.
// All other anchors (#demo, #how, #) stay as in-page scroll anchors.
// ════════════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=DM+Sans:wght@300..700&family=JetBrains+Mono:wght@400;500&display=swap');

.mp-root{
  --grn:#1A7A20; --grn2:#2E8B35; --grn-d:#0A150D; --grn-dd:#050C07;
  --gold:#C9961E; --gold-l:#E8B84B; --gold-soft:#F4D88A;
  --cream:#FDF8F0; --cream-warm:#F5EBD6; --paper:#F2EAD6;
  --ink:#0A0F0B; --ink-soft:#23291F;
  --serif:'Playfair Display', serif;
  --sans:'DM Sans', system-ui, sans-serif;
  --mono:'JetBrains Mono', ui-monospace, monospace;
  background:var(--cream);color:var(--ink);font-family:var(--sans);
  -webkit-font-smoothing:antialiased;
  cursor:none;
  min-height:100vh;
  overflow-x:hidden;
}
.mp-root *{box-sizing:border-box;margin:0;padding:0}
.mp-root a{color:inherit;text-decoration:none}

/* ───── Custom cursor ─────────────────────────────────────────── */
.mp-root .cursor{position:fixed;left:0;top:0;width:14px;height:14px;border-radius:50%;
  background:var(--gold);pointer-events:none;mix-blend-mode:difference;z-index:9999;
  transform:translate(-50%,-50%);transition:width .25s cubic-bezier(.2,.8,.2,1),height .25s cubic-bezier(.2,.8,.2,1),background .25s}
.mp-root .cursor.ring{width:46px;height:46px;background:transparent;border:1.5px solid var(--gold-l);mix-blend-mode:normal}
.mp-root .cursor.drag{width:80px;height:80px;background:var(--grn);mix-blend-mode:normal;color:#FDF8F0}
.mp-root .cursor .label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:10px;letter-spacing:1px;color:var(--gold-soft);opacity:0;text-transform:uppercase}
.mp-root .cursor.drag .label{opacity:1;color:var(--cream)}
@media (hover:none){.mp-root{cursor:auto}.mp-root .cursor{display:none}}

/* ───── Nav ───────────────────────────────────────────────────── */
.mp-root .nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;
  padding:22px clamp(20px,4vw,56px);transition:background .4s, backdrop-filter .4s, border-color .4s;
  border-bottom:1px solid transparent}
.mp-root .nav.scrolled{background:rgba(253,248,240,.78);backdrop-filter:blur(18px) saturate(140%);border-bottom:1px solid rgba(10,15,11,.06)}
.mp-root .brand{display:flex;align-items:center;gap:12px;font-family:var(--serif);font-weight:800;font-size:22px;letter-spacing:-.4px}
.mp-root .brand .glyph{width:32px;height:32px;border-radius:50%;background:radial-gradient(circle at 35% 30%, var(--gold-l), var(--gold) 55%, var(--grn) 130%);
  box-shadow:inset 0 0 0 2px rgba(0,0,0,.08), 0 6px 22px rgba(201,150,30,.35);position:relative}
.mp-root .brand .glyph::after{content:"";position:absolute;inset:7px;border-radius:50%;background:radial-gradient(circle at 30% 30%, rgba(255,255,255,.6), transparent 55%)}
.mp-root .nav-links{display:flex;gap:30px;font-size:13px;color:rgba(10,15,11,.6);font-weight:500}
.mp-root .nav-links a{position:relative;padding:6px 2px;transition:color .3s;cursor:none}
.mp-root .nav-links a::after{content:"";position:absolute;left:0;right:100%;bottom:-2px;height:1px;background:var(--ink);transition:right .35s cubic-bezier(.2,.8,.2,1)}
.mp-root .nav-links a:hover{color:var(--ink)}
.mp-root .nav-links a:hover::after{right:0}
.mp-root .nav-cta{display:flex;align-items:center;gap:10px}
.mp-root .btn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:999px;font-size:13px;font-weight:600;letter-spacing:.2px;
  border:1px solid transparent;transition:transform .3s cubic-bezier(.2,.8,.2,1), background .3s, color .3s;will-change:transform;cursor:none}
.mp-root .btn.ghost{color:var(--ink);border-color:rgba(10,15,11,.15)}
.mp-root .btn.ghost:hover{background:var(--ink);color:var(--cream)}
.mp-root .btn.solid{background:var(--ink);color:var(--cream)}
.mp-root .btn.solid:hover{background:var(--grn)}
.mp-root .btn .arr{display:inline-block;transition:transform .35s cubic-bezier(.2,.8,.2,1)}
.mp-root .btn:hover .arr{transform:translateX(4px)}
@media(max-width:780px){.mp-root .nav-links{display:none}}

/* ───── Hero ──────────────────────────────────────────────────── */
.mp-root .hero{position:relative;min-height:100vh;display:flex;flex-direction:column;justify-content:flex-end;
  padding:140px clamp(20px,4vw,56px) 0;overflow:hidden}
.mp-root .hero-bg{position:absolute;inset:0;background:
  radial-gradient(1200px 800px at var(--mx,30%) var(--my,30%), rgba(201,150,30,.18), transparent 55%),
  radial-gradient(900px 600px at calc(100% - var(--mx,30%)) 70%, rgba(26,122,32,.10), transparent 60%),
  linear-gradient(180deg, var(--cream) 0%, var(--cream-warm) 100%);
  transition:background .15s linear}
.mp-root .grain-canvas{position:absolute;inset:0;pointer-events:none;opacity:.35;z-index:1}
.mp-root .hero-photo{position:absolute;inset:0;z-index:0;overflow:hidden}
.mp-root .hero-photo img{width:100%;height:100%;object-fit:cover;object-position:left center;
  filter:saturate(1.05) contrast(1.02);transform:scale(1.04);will-change:transform;transition:transform 1.2s ease-out}
.mp-root .hero-photo-tint{position:absolute;inset:0;background:
  linear-gradient(90deg, rgba(253,248,240,.12) 0%, rgba(253,248,240,.45) 40%, rgba(253,248,240,.85) 70%, rgba(253,248,240,.97) 100%),
  linear-gradient(180deg, rgba(253,248,240,.6) 0%, transparent 25%, transparent 75%, rgba(253,248,240,.6) 100%)}
.mp-root .hero{perspective:1600px;text-align:right}
.mp-root .hero > div{transform-style:preserve-3d}
.mp-root .hero .eyebrow,.mp-root .hero .headline,.mp-root .hero .hero-bottom{margin-left:auto}
.mp-root .hero .eyebrow{justify-content:flex-end}
.mp-root .hero .headline{text-align:right;max-width:1100px;margin-left:auto}
.mp-root .hero .hero-bottom{justify-content:flex-end;flex-direction:row-reverse;text-align:left}
.mp-root .hero .hero-lede{text-align:right;margin-left:auto}
.mp-root .hero .hero-actions{justify-content:flex-end}
.mp-root .hero-grid{position:absolute;inset:0;background-image:
  linear-gradient(rgba(10,15,11,.04) 1px, transparent 1px),
  linear-gradient(90deg, rgba(10,15,11,.04) 1px, transparent 1px);
  background-size:84px 84px;mask-image:radial-gradient(ellipse at 50% 30%, black 30%, transparent 75%)}

.mp-root .eyebrow{position:relative;z-index:2;display:inline-flex;align-items:center;gap:14px;
  font-family:var(--mono);font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:rgba(10,15,11,.55);margin-bottom:34px}
.mp-root .eyebrow .dot{width:7px;height:7px;border-radius:50%;background:var(--grn);box-shadow:0 0 0 0 var(--grn);animation:mp-pulse 2.4s infinite}
@keyframes mp-pulse{0%{box-shadow:0 0 0 0 rgba(26,122,32,.55)}70%{box-shadow:0 0 0 14px rgba(26,122,32,0)}100%{box-shadow:0 0 0 0 rgba(26,122,32,0)}}

.mp-root .headline{position:relative;z-index:3;font-family:var(--serif);font-weight:500;
  font-size:clamp(56px, 12vw, 200px);line-height:.92;letter-spacing:-.04em;color:var(--ink);
  transform-style:preserve-3d}
.mp-root .headline .line{display:block;overflow:visible}
.mp-root .headline .word{display:inline-block;transform:translateY(110%) translateZ(0);opacity:0;
  animation:mp-rise .9s cubic-bezier(.2,.8,.2,1) forwards;will-change:transform}
.mp-root .headline .word.i{font-style:italic;font-weight:400;color:var(--grn)}
.mp-root .headline .word.g{font-style:italic;font-weight:400;
  background:linear-gradient(120deg, var(--gold) 10%, var(--gold-l) 45%, var(--gold) 90%);
  -webkit-background-clip:text;background-clip:text;color:transparent;
  background-size:200% 100%;animation:mp-rise .9s cubic-bezier(.2,.8,.2,1) forwards, mp-shimmer 6s linear infinite}
@keyframes mp-shimmer{to{background-position:200% 0}}
.mp-root .headline .word:nth-child(1){animation-delay:.05s}
.mp-root .headline .word:nth-child(2){animation-delay:.15s}
.mp-root .headline .word:nth-child(3){animation-delay:.25s}
.mp-root .headline .word:nth-child(4){animation-delay:.35s}
.mp-root .headline .word:nth-child(5){animation-delay:.45s}
@keyframes mp-rise{to{transform:translateY(0);opacity:1}}

.mp-root .hero-bottom{position:relative;z-index:2;display:flex;justify-content:space-between;align-items:flex-end;
  gap:40px;padding:60px 0 36px;flex-wrap:wrap}
.mp-root .hero-lede{max-width:460px;font-size:17px;line-height:1.55;color:rgba(10,15,11,.7);font-weight:400;
  opacity:0;transform:translateY(20px);animation:mp-rise .9s .65s cubic-bezier(.2,.8,.2,1) forwards}
.mp-root .hero-lede em{font-family:var(--serif);font-style:italic;color:var(--grn);font-weight:500}
.mp-root .hero-actions{display:flex;align-items:center;gap:14px;
  opacity:0;transform:translateY(20px);animation:mp-rise .9s .8s cubic-bezier(.2,.8,.2,1) forwards}
.mp-root .btn-magnet{position:relative;display:inline-flex;align-items:center;gap:12px;padding:18px 28px;border-radius:999px;
  font-size:14px;font-weight:600;background:var(--ink);color:var(--cream);overflow:hidden;will-change:transform;cursor:none}
.mp-root .btn-magnet .ink-fill{position:absolute;inset:0;background:radial-gradient(circle at var(--bx,50%) var(--by,50%), var(--grn) 0%, transparent 70%);opacity:0;transition:opacity .35s}
.mp-root .btn-magnet:hover .ink-fill{opacity:1}
.mp-root .btn-magnet span{position:relative;z-index:2}
.mp-root .btn-magnet .arr{position:relative;z-index:2;width:28px;height:28px;border-radius:50%;background:var(--gold);color:var(--ink);display:inline-flex;align-items:center;justify-content:center;font-size:14px;transition:transform .4s cubic-bezier(.2,.8,.2,1)}
.mp-root .btn-magnet:hover .arr{transform:rotate(-45deg)}
.mp-root .btn-text{display:inline-flex;align-items:center;gap:10px;font-size:14px;color:var(--ink);font-weight:500;padding:18px 14px;border-bottom:1px solid transparent;transition:border-color .3s;cursor:none}
.mp-root .btn-text:hover{border-color:var(--ink)}

.mp-root .scroll-hint{position:absolute;bottom:24px;right:clamp(20px,4vw,56px);font-family:var(--mono);font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(10,15,11,.4);display:flex;align-items:center;gap:10px;writing-mode:vertical-rl;transform:rotate(180deg)}
.mp-root .scroll-hint::before{content:"";width:1px;height:42px;background:linear-gradient(to bottom, transparent, var(--ink) 80%);animation:mp-line 2.2s ease-in-out infinite}
@keyframes mp-line{0%,100%{transform:scaleY(.3);transform-origin:top}50%{transform:scaleY(1);transform-origin:top}}

/* ───── Marquee ───────────────────────────────────────────────── */
.mp-root .marquee{background:var(--ink);color:var(--cream);padding:26px 0;overflow:hidden;border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06)}
.mp-root .marquee-track{display:flex;gap:60px;white-space:nowrap;animation:mp-scroll 38s linear infinite;will-change:transform}
.mp-root .marquee-item{font-family:var(--serif);font-size:clamp(28px,4vw,52px);font-weight:500;display:flex;align-items:center;gap:60px;letter-spacing:-.02em}
.mp-root .marquee-item .star{display:inline-block;width:22px;height:22px;color:var(--gold);transform:rotate(0);animation:mp-spin 14s linear infinite}
.mp-root .marquee-item .it{font-style:italic;font-weight:400;color:var(--gold-l)}
@keyframes mp-scroll{to{transform:translateX(-50%)}}
@keyframes mp-spin{to{transform:rotate(360deg)}}

/* ───── Section base ──────────────────────────────────────────── */
.mp-root section{position:relative}
.mp-root .tag{display:inline-flex;align-items:center;gap:10px;font-family:var(--mono);font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(10,15,11,.55);margin-bottom:24px}
.mp-root .tag::before{content:"";width:24px;height:1px;background:currentColor}
.mp-root .section-title{font-family:var(--serif);font-weight:500;font-size:clamp(34px,5.5vw,76px);line-height:1;letter-spacing:-.03em;color:var(--ink);max-width:980px}
.mp-root .section-title em{font-style:italic;color:var(--grn);font-weight:400}
.mp-root .section-title .gold{font-style:italic;color:var(--gold);font-weight:400}

/* ───── Drag gallery ─────────────────────────────────────────── */
.mp-root .gallery-wrap{padding:120px 0 80px;background:var(--cream);position:relative}
.mp-root .gallery-head{padding:0 clamp(20px,4vw,56px);display:flex;justify-content:space-between;align-items:flex-end;gap:40px;margin-bottom:60px;flex-wrap:wrap}
.mp-root .gallery-head p{max-width:380px;font-size:15px;line-height:1.6;color:rgba(10,15,11,.6)}
.mp-root .gallery-rail{position:relative;cursor:grab;user-select:none;-webkit-user-select:none;padding-left:clamp(20px,4vw,56px)}
.mp-root .gallery-rail.grabbing{cursor:grabbing}
.mp-root .gallery-track{display:flex;gap:24px;will-change:transform;padding-right:clamp(20px,4vw,56px);transform-style:preserve-3d;perspective:1500px}
.mp-root .card{flex:0 0 380px;height:480px;border-radius:24px;padding:32px;position:relative;overflow:hidden;
  background:#fff;border:1px solid rgba(10,15,11,.06);
  display:flex;flex-direction:column;justify-content:space-between;
  transform-style:preserve-3d;will-change:transform;
  transition:box-shadow .5s, border-color .5s;
  box-shadow:0 1px 0 rgba(10,15,11,.03)}
.mp-root .card:hover{box-shadow:0 50px 120px -30px rgba(10,15,11,.28);border-color:rgba(10,15,11,.1)}
.mp-root .card .num,.mp-root .card .name,.mp-root .card .desc{transform:translateZ(40px)}
.mp-root .card .visual{transform:translateZ(70px)}
.mp-root .card.dark{background:linear-gradient(160deg, var(--grn-d), var(--grn-dd));color:var(--cream);border-color:rgba(255,255,255,.06)}
.mp-root .card.gold{background:linear-gradient(160deg, var(--gold), #B07A12);color:var(--ink)}
.mp-root .card.cream{background:var(--paper)}
.mp-root .card .num{font-family:var(--mono);font-size:12px;letter-spacing:1px;color:rgba(10,15,11,.4)}
.mp-root .card.dark .num{color:rgba(255,255,255,.4)}
.mp-root .card .name{font-family:var(--serif);font-size:34px;line-height:1.05;letter-spacing:-.02em;font-weight:500;margin-top:auto}
.mp-root .card .name em{font-style:italic;font-weight:400;color:var(--grn)}
.mp-root .card.dark .name em{color:var(--gold-l)}
.mp-root .card.gold .name em{color:var(--grn-d)}
.mp-root .card .desc{font-size:14px;line-height:1.55;color:rgba(10,15,11,.62);margin-top:14px;max-width:280px}
.mp-root .card.dark .desc{color:rgba(255,255,255,.55)}
.mp-root .card.gold .desc{color:rgba(10,15,11,.7)}
.mp-root .card .visual{position:absolute;right:-30px;top:-30px;width:240px;height:240px;opacity:.85}
.mp-root .gallery-progress{position:relative;margin:48px clamp(20px,4vw,56px) 0;height:1px;background:rgba(10,15,11,.1)}
.mp-root .gallery-progress .bar{position:absolute;top:-1px;left:0;height:3px;background:var(--ink);width:30%;border-radius:2px;transition:width .15s, transform .2s}
.mp-root .gallery-progress-meta{display:flex;justify-content:space-between;align-items:center;padding:0 clamp(20px,4vw,56px);margin-top:16px;font-family:var(--mono);font-size:11px;letter-spacing:1px;color:rgba(10,15,11,.5);text-transform:uppercase}

/* ───── Pinned scroll ─────────────────────────────────────────── */
.mp-root .pinned{position:relative;background:var(--ink);color:var(--cream);min-height:100vh;padding:100px clamp(20px,4vw,56px) 90px;overflow:hidden}
.mp-root .pinned-stage{position:relative;display:flex;align-items:center;justify-content:center;width:100%}
.mp-root .pinned-bg{position:absolute;inset:0;
  background:
    radial-gradient(900px 600px at 70% 50%, rgba(26,122,32,.18), transparent 65%),
    radial-gradient(700px 500px at 20% 80%, rgba(201,150,30,.12), transparent 70%),
    linear-gradient(180deg, #0F1A12 0%, var(--ink) 60%, #050A06 100%);
  pointer-events:none}
.mp-root .pinned-orb{display:none}
.mp-root .pinned-grid{position:absolute;inset:0;opacity:.18;
  background-image:linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px),
                   linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px);
  background-size:120px 120px;mask-image:radial-gradient(ellipse at center, black 20%, transparent 70%)}
.mp-root .pinned-inner{position:relative;display:grid;grid-template-columns:1fr 1.1fr;gap:80px;align-items:center;width:100%;max-width:1280px;margin:auto}
.mp-root .pinned-text{position:relative;min-height:300px}
.mp-root .pinned-step{position:absolute;inset:0;opacity:0;transform:translateY(20px);transition:opacity .55s, transform .55s;pointer-events:none}
.mp-root .pinned-step.on{opacity:1;transform:translateY(0);position:relative;pointer-events:auto}
.mp-root .pinned-tabs{display:flex;gap:8px;margin-top:36px}
.mp-root .pinned-tab{flex:1;height:3px;background:rgba(255,255,255,.12);border-radius:2px;overflow:hidden;cursor:pointer;border:none;padding:0}
.mp-root .pinned-tab .pf{display:block;height:100%;background:var(--gold);width:0;transition:width .3s linear}
.mp-root .pinned-tab.active .pf{animation:mp-pftick 6s linear forwards}
@keyframes mp-pftick{from{width:0}to{width:100%}}
.mp-root .pinned-step .step-num{font-family:var(--mono);font-size:12px;letter-spacing:3px;color:var(--gold);margin-bottom:22px}
.mp-root .pinned-step h3{font-family:var(--serif);font-size:clamp(40px,5vw,64px);font-weight:500;line-height:1.04;letter-spacing:-.025em;margin-bottom:22px}
.mp-root .pinned-step h3 em{font-style:italic;color:var(--gold-l);font-weight:400}
.mp-root .pinned-step p{font-size:16px;line-height:1.65;color:rgba(255,255,255,.55);max-width:460px}
.mp-root .pinned-counter{position:absolute;top:60px;left:clamp(20px,4vw,56px);font-family:var(--mono);font-size:11px;letter-spacing:2px;color:rgba(255,255,255,.45);z-index:3}
.mp-root .pinned-counter b{color:var(--gold);font-weight:500}
.mp-root .pinned-progress{position:absolute;bottom:60px;left:clamp(20px,4vw,56px);right:clamp(20px,4vw,56px);height:1px;background:rgba(255,255,255,.1);z-index:3}
.mp-root .pinned-progress .fill{height:1px;background:var(--gold);width:0;transition:width .15s}

.mp-root .stack{position:relative;width:100%;aspect-ratio:5/4;perspective:1400px;transform-style:preserve-3d}
.mp-root .panel{position:absolute;inset:0;border-radius:18px;background:#0F1C12;border:1px solid rgba(201,150,30,.2);
  box-shadow:0 60px 120px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.05);
  padding:18px;color:var(--cream);transition:transform .8s cubic-bezier(.2,.8,.2,1), opacity .55s}
.mp-root .panel.p1{transform:translate(-8%, -6%) rotate(-4deg);background:#10231A}
.mp-root .panel.p2{transform:translate(0,0) rotate(0deg);background:#0E1B12}
.mp-root .panel.p3{transform:translate(8%, 6%) rotate(3deg);background:#0A150D}
.mp-root .panel-head{display:flex;align-items:center;gap:6px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,.06)}
.mp-root .panel-head .dot{width:9px;height:9px;border-radius:50%;background:#3a4435}
.mp-root .panel-head .dot.r{background:#FF5F56}
.mp-root .panel-head .dot.y{background:#FFBD2E}
.mp-root .panel-head .dot.g{background:#27C93F}
.mp-root .panel-head .url{margin-left:14px;font-family:var(--mono);font-size:10px;color:rgba(255,255,255,.4);letter-spacing:1px}
.mp-root .panel-body{padding:14px 4px}
.mp-root .panel-title{font-family:var(--serif);font-size:18px;color:var(--gold-l);margin-bottom:14px}
.mp-root .kpi-row{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}
.mp-root .kpi{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05);border-radius:10px;padding:10px}
.mp-root .kpi label{font-size:9px;font-family:var(--mono);letter-spacing:1.5px;color:rgba(255,255,255,.4);text-transform:uppercase}
.mp-root .kpi .v{font-family:var(--serif);font-size:22px;color:var(--cream);margin-top:6px}
.mp-root .kpi .v.gold{color:var(--gold-l)}
.mp-root .bars{display:flex;gap:6px;align-items:flex-end;height:90px;margin-top:8px}
.mp-root .bars .b{flex:1;background:linear-gradient(180deg, var(--gold), var(--gold) 30%, rgba(201,150,30,.15));border-radius:4px 4px 1px 1px;min-height:8px;transform-origin:bottom;animation:mp-bar 1.4s cubic-bezier(.2,.8,.2,1) infinite alternate}
.mp-root .bars .b:nth-child(2){animation-delay:.1s;background:linear-gradient(180deg, var(--grn2), rgba(46,139,53,.18))}
.mp-root .bars .b:nth-child(3){animation-delay:.2s}
.mp-root .bars .b:nth-child(4){animation-delay:.3s;background:linear-gradient(180deg, var(--grn2), rgba(46,139,53,.18))}
.mp-root .bars .b:nth-child(5){animation-delay:.4s}
.mp-root .bars .b:nth-child(6){animation-delay:.5s;background:linear-gradient(180deg, var(--grn2), rgba(46,139,53,.18))}
.mp-root .bars .b:nth-child(7){animation-delay:.6s}
@keyframes mp-bar{from{transform:scaleY(.6)}to{transform:scaleY(1.05)}}
.mp-root .list-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px dashed rgba(255,255,255,.06);font-size:12px;color:rgba(255,255,255,.7)}
.mp-root .list-row .pill{background:rgba(46,139,53,.18);color:#9ed8a4;font-family:var(--mono);font-size:9px;padding:2px 8px;border-radius:999px;letter-spacing:.5px}
.mp-root .list-row .pill.g{background:rgba(201,150,30,.18);color:var(--gold-l)}
@media(max-width:900px){
  .mp-root .pinned-inner{grid-template-columns:1fr;gap:40px}
  .mp-root .stack{aspect-ratio:6/5}
}

/* ───── Numbers interlude ─────────────────────────────────────── */
.mp-root .numbers{position:relative;background:linear-gradient(180deg, var(--ink) 0%, #060B07 50%, var(--ink) 100%);
  color:var(--cream);padding:160px clamp(20px,4vw,56px) 140px;overflow:hidden}
.mp-root .numbers-bg{position:absolute;inset:0;
  background:
    radial-gradient(900px 500px at 80% 20%, rgba(201,150,30,.18), transparent 60%),
    radial-gradient(700px 600px at 10% 90%, rgba(26,122,32,.18), transparent 60%);
  pointer-events:none}
.mp-root .numbers::before,.mp-root .numbers::after{content:"";position:absolute;left:0;right:0;height:1px;background:linear-gradient(90deg, transparent, rgba(201,150,30,.45), transparent)}
.mp-root .numbers::before{top:0}.mp-root .numbers::after{bottom:0}
.mp-root .numbers-inner{position:relative;max-width:1320px;margin:0 auto}
.mp-root .numbers-head{margin-bottom:90px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:22px}
.mp-root .numbers-head .tag::before{background:rgba(253,248,240,.4)}
.mp-root .numbers-head .section-title em{color:var(--gold-l)}
.mp-root .numbers-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-top:1px solid rgba(255,255,255,.08);border-bottom:1px solid rgba(255,255,255,.08)}
.mp-root .num-cell{padding:50px 30px 50px;border-right:1px solid rgba(255,255,255,.08);position:relative;overflow:hidden}
.mp-root .num-cell:last-child{border-right:none}
.mp-root .num-cell::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 110%, rgba(201,150,30,.2), transparent 60%);opacity:0;transition:opacity .6s}
.mp-root .num-cell:hover::before{opacity:1}
.mp-root .num-label{font-family:var(--mono);font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:rgba(253,248,240,.5);margin-bottom:24px;position:relative;z-index:2}
.mp-root .num-big{font-family:var(--serif);font-weight:500;font-size:clamp(54px,7vw,110px);line-height:1;letter-spacing:-.04em;
  background:linear-gradient(180deg, #FFEAB0 0%, var(--gold) 50%, #8E6210 100%);
  -webkit-background-clip:text;background-clip:text;color:transparent;
  position:relative;z-index:2;font-feature-settings:"lnum" 1, "tnum" 1}
.mp-root .num-sub{font-size:13px;color:rgba(253,248,240,.5);margin-top:18px;line-height:1.55;position:relative;z-index:2;max-width:260px}
@media(max-width:980px){
  .mp-root .numbers-grid{grid-template-columns:repeat(2,1fr)}
  .mp-root .num-cell:nth-child(2){border-right:none}
  .mp-root .num-cell:nth-child(1),.mp-root .num-cell:nth-child(2){border-bottom:1px solid rgba(255,255,255,.08)}
}
@media(max-width:560px){
  .mp-root .numbers-grid{grid-template-columns:1fr}
  .mp-root .num-cell{border-right:none;border-bottom:1px solid rgba(255,255,255,.08)}
  .mp-root .num-cell:last-child{border-bottom:none}
}
.mp-root .numbers-marquee{margin-top:80px;overflow:hidden;mask-image:linear-gradient(90deg, transparent, black 10%, black 90%, transparent)}
.mp-root .nm-track{display:flex;gap:40px;font-family:var(--serif);font-style:italic;font-size:clamp(48px,8vw,120px);font-weight:400;color:transparent;-webkit-text-stroke:1px rgba(232,184,75,.55);white-space:nowrap;animation:mp-nm 32s linear infinite}
.mp-root .nm-track .dot{color:var(--gold);-webkit-text-stroke:0;font-style:normal}
@keyframes mp-nm{to{transform:translateX(-50%)}}

/* ───── Reveal scroll ─────────────────────────────────────────── */
.mp-root .reveal{padding:140px clamp(20px,4vw,56px);background:var(--cream-warm);overflow:hidden}
.mp-root .reveal-head{display:grid;grid-template-columns:1.1fr 1fr;gap:60px;align-items:flex-end;margin-bottom:80px}
.mp-root .reveal-head .lede{font-size:16px;line-height:1.65;color:rgba(10,15,11,.65);max-width:440px;font-weight:400}
.mp-root .reveal-head .lede strong{color:var(--ink);font-weight:600}
@media(max-width:900px){.mp-root .reveal-head{grid-template-columns:1fr;gap:24px}}
.mp-root .reveal-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:18px}
.mp-root .r-card{position:relative;border-radius:20px;padding:32px;background:#fff;border:1px solid rgba(10,15,11,.06);
  display:flex;flex-direction:column;justify-content:space-between;min-height:300px;
  opacity:0;transform:translateY(40px);transition:opacity .9s, transform .9s cubic-bezier(.2,.8,.2,1)}
.mp-root .r-card.in{opacity:1;transform:translateY(0)}
.mp-root .r-card .lbl{font-family:var(--mono);font-size:10px;letter-spacing:2px;color:var(--grn);text-transform:uppercase;margin-bottom:18px}
.mp-root .r-card h4{font-family:var(--serif);font-size:30px;line-height:1.08;letter-spacing:-.02em;font-weight:500;margin-bottom:12px}
.mp-root .r-card h4 em{font-style:italic;color:var(--grn);font-weight:400}
.mp-root .r-card p{font-size:14px;line-height:1.6;color:rgba(10,15,11,.6);margin-bottom:20px}
.mp-root .r-card.feat{grid-column:span 6;background:linear-gradient(150deg, var(--grn-d), var(--grn-dd));color:var(--cream);min-height:420px;overflow:hidden}
.mp-root .r-card.feat .lbl{color:var(--gold-l)}
.mp-root .r-card.feat p{color:rgba(255,255,255,.55)}
.mp-root .r-card.feat h4{font-size:46px}
.mp-root .r-card.feat h4 em{color:var(--gold-l)}
.mp-root .r-card.gold{grid-column:span 6;background:linear-gradient(150deg, var(--gold), #B07A12);min-height:420px}
.mp-root .r-card.gold .lbl{color:var(--grn-d)}
.mp-root .r-card.gold h4 em{color:#fff}
.mp-root .r-card.s4{grid-column:span 4}
.mp-root .r-card.s8{grid-column:span 8}
.mp-root .r-card.s3{grid-column:span 3}
.mp-root .r-card.s6{grid-column:span 6}
@media(max-width:900px){.mp-root .r-card{grid-column:span 12 !important}}
.mp-root .r-card .meter{position:relative;height:6px;border-radius:3px;background:rgba(10,15,11,.06);margin-top:24px;overflow:hidden}
.mp-root .r-card .meter span{display:block;height:100%;background:var(--ink);border-radius:3px;width:0;transition:width 1.6s cubic-bezier(.2,.8,.2,1)}
.mp-root .r-card.in .meter span{width:var(--w,72%)}
.mp-root .r-card.feat .meter{background:rgba(255,255,255,.1)}
.mp-root .r-card.feat .meter span{background:var(--gold-l)}
.mp-root .dial{display:flex;align-items:flex-end;gap:6px;height:90px;margin-top:auto}
.mp-root .dial .b{flex:1;background:var(--ink);border-radius:3px;min-height:4px;transform:scaleY(0);transform-origin:bottom;transition:transform 1s cubic-bezier(.2,.8,.2,1)}
.mp-root .r-card.in .dial .b{transform:scaleY(1)}
.mp-root .r-card.feat .dial .b{background:var(--gold-l)}
.mp-root .r-card.gold .dial .b{background:var(--grn-d)}
.mp-root .feat-orb{position:absolute;right:-100px;bottom:-100px;width:380px;height:380px;border-radius:50%;
  background:radial-gradient(circle at 30% 30%, var(--gold-l) 0%, var(--gold) 30%, transparent 65%);
  filter:blur(2px);opacity:.5;animation:mp-float 12s ease-in-out infinite}
@keyframes mp-float{0%,100%{transform:translate(0,0)}50%{transform:translate(-30px,-20px)}}

/* ───── Gesture canvas ───────────────────────────────────────── */
.mp-root .canvas-section{position:relative;background:var(--ink);color:var(--cream);padding:140px clamp(20px,4vw,56px) 160px;overflow:hidden}
.mp-root .canvas-head{max-width:920px;margin-bottom:80px}
.mp-root .canvas-head .section-title{color:var(--cream)}
.mp-root .canvas-head .section-title em{color:var(--gold-l)}
.mp-root .canvas-head p{color:rgba(255,255,255,.55);font-size:16px;line-height:1.65;max-width:520px;margin-top:24px}
.mp-root .field{position:relative;height:520px;border-radius:24px;border:1px dashed rgba(255,255,255,.12);
  background:radial-gradient(circle at 50% 50%, rgba(255,255,255,.03), transparent 70%);overflow:hidden;cursor:none}
.mp-root .token{position:absolute;border-radius:18px;padding:18px 22px;background:#0F1C12;border:1px solid rgba(201,150,30,.18);
  box-shadow:0 30px 60px rgba(0,0,0,.5);font-family:var(--mono);font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--gold-l);
  user-select:none;cursor:grab;will-change:transform;transition:box-shadow .3s}
.mp-root .token.grabbing{cursor:grabbing;box-shadow:0 50px 100px rgba(0,0,0,.7), 0 0 0 1px var(--gold)}
.mp-root .token b{display:block;font-family:var(--serif);font-size:24px;color:var(--cream);text-transform:none;letter-spacing:-.01em;font-weight:500;margin-top:6px}
.mp-root .token .meta{display:block;color:rgba(255,255,255,.4);font-family:var(--mono);font-size:9px;letter-spacing:1.5px;margin-top:8px}
.mp-root .field-hint{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;font-family:var(--mono);font-size:11px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.3)}
.mp-root .field-hint .arrows{display:block;font-size:18px;color:var(--gold);margin-bottom:10px;letter-spacing:6px}

/* ───── Corn band ─────────────────────────────────────────────── */
.mp-root .corn-band{position:relative;width:100%;min-height:100vh;background:#050807;overflow:hidden;display:flex;align-items:center;color:var(--cream)}
.mp-root .corn-photo{position:absolute;inset:0;z-index:0}
.mp-root .corn-photo img{width:100%;height:100%;object-fit:cover;object-position:center 60%;
  filter:saturate(1.05) contrast(1.05) brightness(.92);
  transform:scale(1.06);transition:transform 6s ease-out;will-change:transform}
.mp-root .corn-band:hover .corn-photo img{transform:scale(1.1)}
.mp-root .corn-vignette{position:absolute;inset:0;background:
  linear-gradient(90deg, rgba(5,8,7,.92) 0%, rgba(5,8,7,.55) 35%, rgba(5,8,7,.15) 60%, rgba(5,8,7,.55) 100%),
  linear-gradient(180deg, rgba(5,8,7,.7) 0%, transparent 25%, transparent 70%, rgba(5,8,7,.85) 100%),
  radial-gradient(ellipse at 75% 60%, transparent 30%, rgba(5,8,7,.5) 80%)}
.mp-root .corn-grain-overlay{position:absolute;inset:0;opacity:.15;pointer-events:none;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  mix-blend-mode:overlay}
.mp-root .corn-overlay{position:relative;z-index:2;padding:120px clamp(20px,4vw,56px);max-width:780px;width:100%}
.mp-root .corn-tag{font-family:var(--mono);font-size:11px;letter-spacing:3px;color:var(--gold-l);margin-bottom:32px}
.mp-root .corn-title{font-family:var(--serif);font-weight:500;font-size:clamp(60px,9vw,140px);line-height:.92;letter-spacing:-.035em;color:var(--cream);margin-bottom:36px}
.mp-root .corn-title .cl{display:block;overflow:hidden}
.mp-root .corn-title .cw{display:inline-block}
.mp-root .corn-title .it{font-style:italic;color:var(--gold-l);font-weight:400}
.mp-root .corn-title .gd{font-style:italic;font-weight:400;
  background:linear-gradient(120deg, var(--gold) 10%, var(--gold-l) 50%, var(--gold) 90%);
  -webkit-background-clip:text;background-clip:text;color:transparent;
  background-size:200% 100%;animation:mp-shimmer 6s linear infinite}
.mp-root .corn-lede{font-family:var(--serif);font-size:clamp(18px,1.6vw,22px);line-height:1.55;color:rgba(253,248,240,.78);font-style:italic;font-weight:400;max-width:520px;margin-bottom:54px}
.mp-root .corn-lede em{color:var(--gold-l);font-style:normal;font-family:var(--sans);font-weight:500;font-size:.92em}
.mp-root .corn-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:30px;max-width:640px;
  border-top:1px solid rgba(232,184,75,.25);padding-top:28px}
.mp-root .corn-stat .cs-num{font-family:var(--serif);font-size:clamp(38px,4.5vw,64px);line-height:1;letter-spacing:-.02em;color:var(--cream);font-weight:500;
  background:linear-gradient(160deg, var(--cream) 30%, var(--gold-l));
  -webkit-background-clip:text;background-clip:text;color:transparent}
.mp-root .corn-stat .cs-unit{font-size:.55em;color:var(--gold);-webkit-text-fill-color:var(--gold)}
.mp-root .corn-stat .cs-lbl{font-family:var(--mono);font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(253,248,240,.45);margin-top:14px;line-height:1.5}
.mp-root .corn-stat .cs-lbl em{font-style:italic;color:var(--gold-l);text-transform:none;font-family:var(--serif);font-size:13px;letter-spacing:0;display:block;margin-top:2px}
.mp-root .corn-marker{position:absolute;font-family:var(--mono);font-size:10px;letter-spacing:3px;color:rgba(232,184,75,.7);z-index:3;display:flex;align-items:center;gap:14px}
.mp-root .corn-marker::before{content:"";width:32px;height:1px;background:currentColor}
.mp-root .corn-marker-tl{top:46px;left:clamp(20px,4vw,56px)}
.mp-root .corn-marker-br{bottom:46px;right:clamp(20px,4vw,56px)}
.mp-root .corn-marker-br::after{content:"";width:32px;height:1px;background:currentColor}
.mp-root .corn-marker-br::before{display:none}
@media(max-width:780px){
  .mp-root .corn-stats{grid-template-columns:1fr;gap:22px}
  .mp-root .corn-photo img{object-position:center}
  .mp-root .corn-vignette{background:linear-gradient(180deg, rgba(5,8,7,.85) 0%, rgba(5,8,7,.45) 40%, rgba(5,8,7,.85) 100%)}
}

/* ───── CTA + Footer ─────────────────────────────────────────── */
.mp-root .cta{padding:160px clamp(20px,4vw,56px);background:var(--cream);position:relative;overflow:hidden;text-align:center}
.mp-root .cta-orb{position:absolute;top:50%;left:50%;width:120vmin;height:120vmin;border-radius:50%;
  background:radial-gradient(circle at 35% 35%, var(--gold-soft), var(--gold) 40%, var(--grn) 110%);
  transform:translate(-50%,-50%) scale(.4);opacity:.18;filter:blur(20px);animation:mp-cta 6s ease-in-out infinite}
@keyframes mp-cta{0%,100%{transform:translate(-50%,-50%) scale(.4);opacity:.15}50%{transform:translate(-50%,-50%) scale(.5);opacity:.25}}
.mp-root .cta h2{position:relative;font-family:var(--serif);font-weight:500;font-size:clamp(50px,8vw,140px);line-height:.95;letter-spacing:-.04em}
.mp-root .cta h2 em{font-style:italic;color:var(--grn);font-weight:400}
.mp-root .cta h2 .gold{font-style:italic;
  background:linear-gradient(120deg, var(--gold) 10%, var(--gold-l) 50%, var(--gold) 90%);
  -webkit-background-clip:text;background-clip:text;color:transparent;font-weight:400}
.mp-root .cta p{position:relative;max-width:540px;margin:30px auto 50px;font-size:17px;line-height:1.6;color:rgba(10,15,11,.65)}
.mp-root .cta-row{position:relative;display:inline-flex;align-items:center;gap:18px;flex-wrap:wrap;justify-content:center}
.mp-root footer{background:var(--ink);color:rgba(255,255,255,.6);padding:60px clamp(20px,4vw,56px) 30px;position:relative}
.mp-root .footer-row{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:20px;padding-bottom:30px;border-bottom:1px solid rgba(255,255,255,.08)}
.mp-root .footer-row .brand{color:var(--cream)}
.mp-root .footer-meta{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;padding-top:20px;font-family:var(--mono);font-size:11px;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,.35)}
.mp-root .footer-meta a:hover{color:var(--gold-l)}

.mp-root ::selection{background:var(--gold);color:var(--ink)}
`;

const HTML = `
<div class="cursor" data-cursor-el><span class="label">drag</span></div>

<nav class="nav" data-nav-el>
  <a class="brand" href="#" data-cursor="ring">
    <span class="glyph"></span>
    <span>MillPro</span>
  </a>
  <div class="nav-links">
    <a href="#product" data-cursor="ring">Product</a>
    <a href="#how" data-cursor="ring">How it works</a>
    <a href="#modules" data-cursor="ring">Modules</a>
    <a href="#demo" data-cursor="ring">Live demo</a>
  </div>
  <div class="nav-cta">
    <a class="btn ghost" href="#" data-cursor="ring" data-action="signin">Sign in</a>
    <a class="btn solid" href="#" data-cursor="ring" data-action="register">Start free <span class="arr">→</span></a>
  </div>
</nav>

<section class="hero" id="hero">
  <div class="hero-bg" data-hero-bg></div>
  <div class="hero-photo" aria-hidden="true">
    <img src="/assets/corn-hero-2.jpg" alt="" />
    <div class="hero-photo-tint"></div>
  </div>
  <div class="hero-grid"></div>
  <canvas class="grain-canvas" data-grain></canvas>

  <div style="position:relative;z-index:2">
    <div class="eyebrow"><span class="dot"></span> Built for East Africa's Mills · v2.2</div>

    <h1 class="headline" aria-label="Grain, in motion.">
      <span class="line"><span class="word">Grain,</span></span>
      <span class="line"><span class="word i">in</span> <span class="word g">motion.</span></span>
    </h1>

    <div class="hero-bottom">
      <p class="hero-lede">
        MillPro turns every batch, shift and shilling into something you can <em>see</em>.
        Production tracking, payroll, sales and finance — woven into one calm, accountable system.
      </p>
      <div class="hero-actions">
        <a href="#demo" class="btn-magnet" data-magnet data-cursor="ring">
          <span class="ink-fill"></span>
          <span>Open the live demo</span>
          <span class="arr">↗</span>
        </a>
        <a href="#how" class="btn-text" data-cursor="ring">
          <span>See how it works</span>
          <span style="font-family:var(--mono);font-size:11px;color:rgba(10,15,11,.4)">03 STEPS</span>
        </a>
      </div>
    </div>
  </div>

  <div class="scroll-hint">SCROLL · S01</div>
</section>

<div class="marquee" aria-hidden="true">
  <div class="marquee-track">
    <div class="marquee-item">Production tracked <span class="star">✦</span> <span class="it">batch by batch</span> <span class="star">✦</span> Payroll, automated <span class="star">✦</span> <span class="it">no more spreadsheets</span> <span class="star">✦</span> Sales recorded <span class="star">✦</span> <span class="it">in shillings & cents</span> <span class="star">✦</span></div>
    <div class="marquee-item">Production tracked <span class="star">✦</span> <span class="it">batch by batch</span> <span class="star">✦</span> Payroll, automated <span class="star">✦</span> <span class="it">no more spreadsheets</span> <span class="star">✦</span> Sales recorded <span class="star">✦</span> <span class="it">in shillings & cents</span> <span class="star">✦</span></div>
  </div>
</div>

<section class="gallery-wrap" id="modules">
  <div class="gallery-head">
    <div>
      <div class="tag">Modules · 06</div>
      <h2 class="section-title">Every part of the mill, <em>finally</em> in one place.</h2>
    </div>
    <p>Drag to explore the modules. Each one was shaped on the floor of a working mill in Jinja, Mbale, Soroti — not on a whiteboard.</p>
  </div>

  <div class="gallery-rail" data-rail data-cursor="drag">
    <div class="gallery-track" data-track>

      <article class="card cream" data-cursor="drag">
        <div class="num">01 / Production</div>
        <svg class="visual" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="46" stroke="rgba(10,15,11,.08)"/>
          <circle cx="50" cy="50" r="34" stroke="rgba(10,15,11,.08)"/>
          <circle cx="50" cy="50" r="22" stroke="rgba(10,15,11,.08)"/>
          <circle cx="50" cy="50" r="6" fill="#1A7A20"/>
        </svg>
        <div>
          <h3 class="name">Batches, <em>watched.</em></h3>
          <p class="desc">Maize in, flour out, bran yield, waste per shift. Efficiency rises as soon as you can see it.</p>
        </div>
      </article>

      <article class="card dark" data-cursor="drag">
        <div class="num" style="color:rgba(255,255,255,.5)">02 / Payroll</div>
        <svg class="visual" viewBox="0 0 100 100" fill="none">
          <path d="M10 80 L30 60 L50 70 L70 40 L90 50" stroke="#E8B84B" stroke-width="2"/>
          <circle cx="30" cy="60" r="3" fill="#E8B84B"/><circle cx="50" cy="70" r="3" fill="#E8B84B"/><circle cx="70" cy="40" r="3" fill="#E8B84B"/>
        </svg>
        <div>
          <h3 class="name">Wages that <em>compute themselves.</em></h3>
          <p class="desc">Per unit, per hour, per shift. Every employee earns what they earned — automatically.</p>
        </div>
      </article>

      <article class="card gold" data-cursor="drag">
        <div class="num" style="color:rgba(10,15,11,.55)">03 / Inventory</div>
        <svg class="visual" viewBox="0 0 100 100" fill="none">
          <rect x="20" y="50" width="14" height="30" fill="rgba(10,15,11,.15)"/>
          <rect x="38" y="35" width="14" height="45" fill="rgba(10,15,11,.25)"/>
          <rect x="56" y="20" width="14" height="60" fill="rgba(10,15,11,.35)"/>
          <rect x="74" y="42" width="14" height="38" fill="rgba(10,15,11,.2)"/>
        </svg>
        <div>
          <h3 class="name">Stock that <em>warns you first.</em></h3>
          <p class="desc">Real-time levels for raw maize, flour, bran and packaging. Alerts before you're out, not after.</p>
        </div>
      </article>

      <article class="card cream" data-cursor="drag">
        <div class="num">04 / Finance</div>
        <svg class="visual" viewBox="0 0 100 100" fill="none">
          <path d="M50 10 A40 40 0 0 1 90 50 L50 50 Z" fill="#1A7A20" opacity=".7"/>
          <path d="M50 50 L90 50 A40 40 0 0 1 50 90 Z" fill="#C9961E" opacity=".7"/>
          <path d="M50 50 L50 90 A40 40 0 0 1 10 50 Z" fill="#0A150D" opacity=".5"/>
          <path d="M10 50 A40 40 0 0 1 50 10 L50 50 Z" fill="#2E8B35" opacity=".5"/>
        </svg>
        <div>
          <h3 class="name">Money, <em>illustrated.</em></h3>
          <p class="desc">6-month revenue trends, cost breakdowns, profit margins. Always current. Always honest.</p>
        </div>
      </article>

      <article class="card dark" data-cursor="drag">
        <div class="num" style="color:rgba(255,255,255,.5)">05 / Sales</div>
        <svg class="visual" viewBox="0 0 100 100" fill="none">
          <path d="M15 80 Q35 30 55 55 T95 25" stroke="#E8B84B" stroke-width="2" fill="none"/>
          <path d="M15 80 Q35 30 55 55 T95 25 L95 80 Z" fill="#E8B84B" opacity=".15"/>
        </svg>
        <div>
          <h3 class="name">Orders, from <em>pending to dispatched.</em></h3>
          <p class="desc">Itemised receipts, customer history, payment status. The whole chain, visible.</p>
        </div>
      </article>

      <article class="card cream" data-cursor="drag">
        <div class="num">06 / Roles</div>
        <svg class="visual" viewBox="0 0 100 100" fill="none">
          <circle cx="35" cy="40" r="12" fill="#1A7A20" opacity=".7"/>
          <circle cx="60" cy="55" r="12" fill="#C9961E" opacity=".7"/>
          <circle cx="45" cy="68" r="12" fill="#0A150D" opacity=".5"/>
        </svg>
        <div>
          <h3 class="name">Permission, by <em>design.</em></h3>
          <p class="desc">Owner approves. Admin enters. Supervisors see. No accidents, no overreach.</p>
        </div>
      </article>

    </div>
  </div>

  <div class="gallery-progress"><div class="bar" data-gallery-bar></div></div>
  <div class="gallery-progress-meta">
    <span>↤ DRAG TO EXPLORE</span>
    <span><span data-gallery-idx>01</span> / 06</span>
  </div>
</section>

<section class="pinned" id="how">
  <div class="pinned-stage">
    <div class="pinned-bg"></div>
    <div class="pinned-orb o1"></div>
    <div class="pinned-orb o2"></div>
    <div class="pinned-grid"></div>

    <div class="pinned-inner">
      <div class="pinned-text">
        <div class="pinned-step on" data-step="0">
          <div class="step-num">— STEP 01 —</div>
          <h3>Register your <em>mill.</em></h3>
          <p>Two minutes. A name, a location, a unique 6-character code. That's the door — share it with your team and they walk in.</p>
        </div>
        <div class="pinned-step" data-step="1">
          <div class="step-num">— STEP 02 —</div>
          <h3>Cast your <em>roles.</em></h3>
          <p>Owners decide. Admins record. Supervisors observe. Approval queues catch every edit. Quiet accountability, end to end.</p>
        </div>
        <div class="pinned-step" data-step="2">
          <div class="step-num">— STEP 03 —</div>
          <h3>Watch clarity <em>compound.</em></h3>
          <p>Every batch, payment, order and receipt feeds the same picture. By month two, the spreadsheets feel like a memory.</p>
        </div>
        <div class="pinned-tabs">
          <button class="pinned-tab active" data-tab="0" aria-label="Step 1"><span class="pf"></span></button>
          <button class="pinned-tab" data-tab="1" aria-label="Step 2"><span class="pf"></span></button>
          <button class="pinned-tab" data-tab="2" aria-label="Step 3"><span class="pf"></span></button>
        </div>
      </div>

      <div class="stack-host">
        <div class="stack" data-stack data-tilt>
          <div class="panel p1">
            <div class="panel-head"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span><span class="url">mill · production · today</span></div>
            <div class="panel-body">
              <div class="panel-title">Batches today · 14</div>
              <div class="kpi-row">
                <div class="kpi"><label>Maize in</label><div class="v">8 240<span style="font-size:11px;color:rgba(255,255,255,.4);margin-left:4px">kg</span></div></div>
                <div class="kpi"><label>Flour out</label><div class="v gold">6 720<span style="font-size:11px;color:rgba(255,255,255,.4);margin-left:4px">kg</span></div></div>
                <div class="kpi"><label>Yield</label><div class="v gold">81.5%</div></div>
              </div>
              <div class="bars"><div class="b" style="height:54%"></div><div class="b" style="height:72%"></div><div class="b" style="height:48%"></div><div class="b" style="height:88%"></div><div class="b" style="height:64%"></div><div class="b" style="height:92%"></div><div class="b" style="height:76%"></div></div>
            </div>
          </div>
          <div class="panel p2">
            <div class="panel-head"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span><span class="url">mill · payroll · week 19</span></div>
            <div class="panel-body">
              <div class="panel-title">Pending payments</div>
              <div class="list-row"><span>Asha N. — 142 sacks</span><span class="pill">UGX 568 000</span></div>
              <div class="list-row"><span>Mukasa O. — 38 hrs</span><span class="pill">UGX 304 000</span></div>
              <div class="list-row"><span>Achieng P. — 6 shifts</span><span class="pill g">UGX 420 000</span></div>
              <div class="list-row" style="border-bottom:none"><span>Walusimbi K. — 88 sacks</span><span class="pill">UGX 352 000</span></div>
            </div>
          </div>
          <div class="panel p3">
            <div class="panel-head"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span><span class="url">mill · finance · may</span></div>
            <div class="panel-body">
              <div class="panel-title">Revenue trend</div>
              <div class="bars"><div class="b" style="height:42%"></div><div class="b" style="height:60%"></div><div class="b" style="height:54%"></div><div class="b" style="height:78%"></div><div class="b" style="height:66%"></div><div class="b" style="height:90%"></div></div>
              <div class="kpi-row" style="margin-top:18px">
                <div class="kpi"><label>Revenue</label><div class="v gold">UGX 38.4m</div></div>
                <div class="kpi"><label>Margin</label><div class="v">22.8%</div></div>
                <div class="kpi"><label>Δ vs Apr</label><div class="v" style="color:#9ed8a4">+14%</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="numbers" id="numbers">
  <div class="numbers-bg"></div>
  <div class="numbers-inner">
    <div class="numbers-head">
      <div class="tag" style="color:rgba(253,248,240,.55)">Live · across our mills</div>
      <h2 class="section-title" style="color:var(--cream)">In <em>numbers</em>, every <span class="gold">working day.</span></h2>
    </div>

    <div class="numbers-grid">
      <div class="num-cell">
        <div class="num-label">Maize processed</div>
        <div class="num-big" data-count="48720" data-suffix=" t"><span>0</span> t</div>
        <div class="num-sub">across 142 partner mills · since launch</div>
      </div>
      <div class="num-cell">
        <div class="num-label">Wages computed</div>
        <div class="num-big" data-count="3.84" data-decimals="2" data-prefix="UGX " data-suffix=" bn"><span>0</span></div>
        <div class="num-sub">paid to the right person, on the right day</div>
      </div>
      <div class="num-cell">
        <div class="num-label">Average yield gain</div>
        <div class="num-big" data-count="6.2" data-decimals="1" data-suffix="%"><span>0</span></div>
        <div class="num-sub">first 90 days · vs prior season</div>
      </div>
      <div class="num-cell">
        <div class="num-label">Spreadsheets retired</div>
        <div class="num-big" data-count="2188" data-suffix=""><span>0</span></div>
        <div class="num-sub">and not a single one missed</div>
      </div>
    </div>

    <div class="numbers-marquee" aria-hidden="true">
      <div class="nm-track">
        <span>Jinja</span><span class="dot">•</span><span>Mbale</span><span class="dot">•</span><span>Soroti</span><span class="dot">•</span><span>Lira</span><span class="dot">•</span><span>Mbarara</span><span class="dot">•</span><span>Gulu</span><span class="dot">•</span><span>Tororo</span><span class="dot">•</span><span>Masaka</span><span class="dot">•</span><span>Iganga</span><span class="dot">•</span><span>Kasese</span><span class="dot">•</span>
        <span>Jinja</span><span class="dot">•</span><span>Mbale</span><span class="dot">•</span><span>Soroti</span><span class="dot">•</span><span>Lira</span><span class="dot">•</span><span>Mbarara</span><span class="dot">•</span><span>Gulu</span><span class="dot">•</span><span>Tororo</span><span class="dot">•</span><span>Masaka</span><span class="dot">•</span><span>Iganga</span><span class="dot">•</span><span>Kasese</span><span class="dot">•</span>
      </div>
    </div>
  </div>
</section>

<section class="corn-band" aria-label="The grain itself">
  <div class="corn-photo">
    <img src="/assets/corn-hero.jpg" alt="Maize kernels on a wooden spoon beside fresh cobs" loading="lazy" />
    <div class="corn-vignette"></div>
    <div class="corn-grain-overlay"></div>
  </div>

  <div class="corn-overlay">
    <div class="corn-tag">— THE MATERIAL —</div>
    <h2 class="corn-title">
      <span class="cl"><span class="cw">Every</span></span>
      <span class="cl"><span class="cw it">kernel,</span></span>
      <span class="cl"><span class="cw">a</span> <span class="cw gd">number.</span></span>
    </h2>
    <p class="corn-lede">
      Behind the dashboards, the floor. Behind the floor, the grain.
      MillPro keeps faith with what's <em>actually</em> being milled —
      shift after shift, sack after sack.
    </p>

    <div class="corn-stats">
      <div class="corn-stat">
        <div class="cs-num">81<span class="cs-unit">.5%</span></div>
        <div class="cs-lbl">Average yield · <em>tracked live</em></div>
      </div>
      <div class="corn-stat">
        <div class="cs-num">2.4<span class="cs-unit">m</span></div>
        <div class="cs-lbl">Kg milled <em>through MillPro</em></div>
      </div>
      <div class="corn-stat">
        <div class="cs-num">14<span class="cs-unit">d</span></div>
        <div class="cs-lbl">From sign-up <em>to first audit</em></div>
      </div>
    </div>
  </div>

  <div class="corn-marker corn-marker-tl">N° 02 · GRAIN</div>
  <div class="corn-marker corn-marker-br">JINJA · MBALE · SOROTI</div>
</section>

<section class="reveal" id="product">
  <div class="reveal-head">
    <div>
      <div class="tag">The system · in detail</div>
      <h2 class="section-title">Calm tools, <em>quiet</em> accountability, <span class="gold">honest</span> numbers.</h2>
    </div>
    <p class="lede">
      <strong>MillPro is not a dashboard.</strong> It's a discipline — a way of running a mill where every grain
      logged on the floor reaches the books on the same day, with no hand-off, no errors, no drift.
    </p>
  </div>

  <div class="reveal-grid">
    <div class="r-card feat reveal-on">
      <div class="feat-orb"></div>
      <div>
        <div class="lbl">— 01 — Production</div>
        <h4>From the <em>weighbridge</em> to the ledger, in a single keystroke.</h4>
        <p>Log maize-in, flour-out, bran yield and waste at the moment of the batch. Yield is computed live; supervisors see drift before lunch.</p>
      </div>
      <div class="dial">
        <div class="b" style="height:40%"></div><div class="b" style="height:62%"></div><div class="b" style="height:54%"></div>
        <div class="b" style="height:78%"></div><div class="b" style="height:48%"></div><div class="b" style="height:90%"></div>
        <div class="b" style="height:72%"></div><div class="b" style="height:96%"></div><div class="b" style="height:64%"></div>
      </div>
    </div>

    <div class="r-card gold reveal-on">
      <div>
        <div class="lbl">— 02 — Payroll</div>
        <h4>Wages that compute <em>themselves.</em></h4>
        <p>Per-unit, per-hour, per-shift — no more end-of-week guesswork. Pay-slips export to print or PDF in two clicks.</p>
      </div>
      <div class="dial">
        <div class="b" style="height:60%"></div><div class="b" style="height:72%"></div><div class="b" style="height:80%"></div>
        <div class="b" style="height:54%"></div><div class="b" style="height:86%"></div><div class="b" style="height:64%"></div>
      </div>
    </div>

    <div class="r-card s4 reveal-on">
      <div class="lbl">— 03 — Inventory</div>
      <h4>Stock <em>warns</em> first.</h4>
      <p>Low-stock alerts on flour, bran and packaging — before, not after.</p>
      <div class="meter" style="--w:72%"><span></span></div>
    </div>

    <div class="r-card s4 reveal-on">
      <div class="lbl">— 04 — Sales</div>
      <h4><em>Pending</em> to dispatched, in one rail.</h4>
      <p>Customer orders move through six clear stages with itemised receipts at each.</p>
      <div class="meter" style="--w:88%"><span></span></div>
    </div>

    <div class="r-card s4 reveal-on">
      <div class="lbl">— 05 — Roles</div>
      <h4>Approval, <em>by design.</em></h4>
      <p>Owner / Admin / Supervisor — every edit and delete is a request, not a fact.</p>
      <div class="meter" style="--w:96%"><span></span></div>
    </div>

    <div class="r-card s8 reveal-on">
      <div class="lbl">— 06 — Audit & FHIR</div>
      <h4>Every action <em>remembered</em> — every record, traceable.</h4>
      <p>Correlation IDs on every request. A full audit log of who did what, when, from where. FHIR-R4 Observation export for inspection-ready reports.</p>
      <div class="dial">
        <div class="b" style="height:40%"></div><div class="b" style="height:50%"></div><div class="b" style="height:62%"></div><div class="b" style="height:48%"></div>
        <div class="b" style="height:74%"></div><div class="b" style="height:56%"></div><div class="b" style="height:84%"></div><div class="b" style="height:66%"></div>
        <div class="b" style="height:92%"></div><div class="b" style="height:70%"></div><div class="b" style="height:78%"></div><div class="b" style="height:88%"></div>
      </div>
    </div>

    <div class="r-card s4 reveal-on">
      <div class="lbl">— 07 — Reports</div>
      <h4>CSV. PDF. <em>Done.</em></h4>
      <p>Export any view — work logs, finance, payroll, sales, inventory — for the auditor, the bank, or the boss.</p>
      <div class="meter" style="--w:65%"><span></span></div>
    </div>
  </div>
</section>

<section class="canvas-section" id="demo">
  <div class="canvas-head">
    <div class="tag" style="color:rgba(255,255,255,.6)">Try it · gestural</div>
    <h2 class="section-title">Push things <em>around.</em><br>The numbers don't break.</h2>
    <p>Drag the tokens — they're the same primitives the live system runs on. We engineered them to feel like things, not buttons.</p>
  </div>

  <div class="field" data-field>
    <div class="field-hint">
      <span class="arrows">↖ ↗ ↘ ↙</span>
      drag the cards
    </div>
    <div class="token" data-token style="left:8%;top:18%">
      Production · live
      <b>8 240 <span style="font-family:var(--mono);font-size:14px;color:var(--gold)">kg</span></b>
      <span class="meta">maize in · today</span>
    </div>
    <div class="token" data-token style="left:38%;top:8%">
      Payroll · week 19
      <b>UGX 1.96m</b>
      <span class="meta">42 employees · pending</span>
    </div>
    <div class="token" data-token style="left:62%;top:30%">
      Yield · shift A
      <b>81.5<span style="font-family:var(--mono);font-size:14px;color:var(--gold)">%</span></b>
      <span class="meta">+2.1pp vs avg</span>
    </div>
    <div class="token" data-token style="left:18%;top:54%">
      Stock · flour
      <b>14.8 <span style="font-family:var(--mono);font-size:14px;color:var(--gold)">t</span></b>
      <span class="meta">3 days at current burn</span>
    </div>
    <div class="token" data-token style="left:54%;top:62%">
      Orders · open
      <b>23</b>
      <span class="meta">7 dispatched today</span>
    </div>
  </div>
</section>

<section class="cta">
  <div class="cta-orb"></div>
  <h2>The mill, <em>finally,</em><br>in <span class="gold">your hands.</span></h2>
  <p>Sign up in two minutes. Get a private company code. Onboard your team. Watch the picture compose itself.</p>
  <div class="cta-row">
    <a class="btn-magnet" href="#" data-magnet data-cursor="ring" data-action="register">
      <span class="ink-fill"></span>
      <span>Start free · 14 days</span>
      <span class="arr">↗</span>
    </a>
    <a class="btn-text" href="#" data-cursor="ring" data-action="signin">
      <span>Already have a code? Sign in</span>
      <span style="font-family:var(--mono);font-size:11px;color:rgba(10,15,11,.4)">→</span>
    </a>
  </div>
</section>

<footer>
  <div class="footer-row">
    <a class="brand" href="#"><span class="glyph"></span><span>MillPro</span></a>
    <div style="display:flex;gap:30px;font-size:13px">
      <a href="#product" data-cursor="ring">Product</a>
      <a href="#how" data-cursor="ring">How it works</a>
      <a href="#modules" data-cursor="ring">Modules</a>
      <a href="#demo" data-cursor="ring">Live demo</a>
      <a href="#" data-cursor="ring" data-action="signin">Sign in</a>
    </div>
  </div>
  <div class="footer-meta">
    <span>© 2026 MillPro Enterprise · Built in Kampala</span>
    <span>v 2.2.0 · uptime 99.97% · status <span style="color:#9ed8a4">● operational</span></span>
  </div>
</footer>
`;

// ─── Prototype scripts (ported from Welcome.html), scoped to root ───
function runScripts(root) {
  const cleanups = [];
  const rafs = [];
  const intervals = [];
  const winListeners = [];

  const addWin = (ev, fn, opts) => {
    window.addEventListener(ev, fn, opts);
    winListeners.push([ev, fn, opts]);
  };

  const $ = (sel) => root.querySelector(sel);
  const $$ = (sel) => Array.from(root.querySelectorAll(sel));

  // ── Cursor ──
  const cursor = $('[data-cursor-el]');
  if (cursor) {
    let cx = window.innerWidth / 2, cy = window.innerHeight / 2, tx = cx, ty = cy;
    let alive = true;
    const onMove = (e) => { tx = e.clientX; ty = e.clientY; };
    addWin('mousemove', onMove);
    const loop = () => {
      if (!alive) return;
      cx += (tx - cx) * 0.22;
      cy += (ty - cy) * 0.22;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%)`;
      rafs.push(requestAnimationFrame(loop));
    };
    rafs.push(requestAnimationFrame(loop));
    cleanups.push(() => { alive = false; });

    $$('[data-cursor="ring"]').forEach((el) => {
      const e1 = () => cursor.classList.add('ring');
      const e2 = () => { cursor.classList.remove('ring'); cursor.classList.remove('drag'); };
      el.addEventListener('mouseenter', e1);
      el.addEventListener('mouseleave', e2);
      cleanups.push(() => { el.removeEventListener('mouseenter', e1); el.removeEventListener('mouseleave', e2); });
    });
    $$('[data-cursor="drag"]').forEach((el) => {
      const e1 = () => cursor.classList.add('drag');
      const e2 = () => cursor.classList.remove('drag');
      el.addEventListener('mouseenter', e1);
      el.addEventListener('mouseleave', e2);
      cleanups.push(() => { el.removeEventListener('mouseenter', e1); el.removeEventListener('mouseleave', e2); });
    });
  }

  // ── Nav scrolled state ──
  const nav = $('[data-nav-el]');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
    addWin('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ── Hero parallax bg + grain ──
  const heroBg = $('[data-hero-bg]');
  if (heroBg) {
    const onMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      heroBg.style.setProperty('--mx', x + '%');
      heroBg.style.setProperty('--my', y + '%');
    };
    addWin('mousemove', onMove);
  }

  const grain = $('[data-grain]');
  if (grain && grain.getContext) {
    const gctx = grain.getContext('2d');
    let gw = 0, gh = 0, particles = [], alive = true;
    const sizeGrain = () => {
      const r = grain.parentElement.getBoundingClientRect();
      gw = grain.width = r.width * devicePixelRatio;
      gh = grain.height = r.height * devicePixelRatio;
      grain.style.width = r.width + 'px';
      grain.style.height = r.height + 'px';
    };
    const buildParticles = () => {
      particles = [];
      const count = Math.floor((gw * gh) / (45000 * devicePixelRatio));
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * gw, y: Math.random() * gh,
          r: (Math.random() * 1.6 + 0.4) * devicePixelRatio,
          vx: (Math.random() - 0.5) * 0.18 * devicePixelRatio,
          vy: (Math.random() - 0.5) * 0.18 * devicePixelRatio,
          hue: Math.random() < 0.55 ? 'gold' : (Math.random() < 0.5 ? 'grn' : 'ink'),
        });
      }
    };
    let mxNorm = 0, myNorm = 0;
    const onMove = (e) => {
      mxNorm = (e.clientX / window.innerWidth - 0.5) * 2;
      myNorm = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    addWin('mousemove', onMove);
    const draw = () => {
      if (!alive) return;
      gctx.clearRect(0, 0, gw, gh);
      for (const p of particles) {
        p.x += p.vx + mxNorm * 0.3 * devicePixelRatio;
        p.y += p.vy + myNorm * 0.3 * devicePixelRatio;
        if (p.x < 0) p.x = gw; if (p.x > gw) p.x = 0;
        if (p.y < 0) p.y = gh; if (p.y > gh) p.y = 0;
        gctx.beginPath();
        gctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        gctx.fillStyle = p.hue === 'gold' ? 'rgba(201,150,30,.35)' : p.hue === 'grn' ? 'rgba(26,122,32,.28)' : 'rgba(10,15,11,.28)';
        gctx.fill();
      }
      rafs.push(requestAnimationFrame(draw));
    };
    sizeGrain(); buildParticles(); draw();
    const onResize = () => { sizeGrain(); buildParticles(); };
    addWin('resize', onResize);
    cleanups.push(() => { alive = false; });
  }

  // ── Magnetic buttons ──
  $$('[data-magnet]').forEach((el) => {
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${x * 0.18}px, ${y * 0.32}px)`;
      const fill = el.querySelector('.ink-fill');
      if (fill) {
        fill.style.setProperty('--bx', ((e.clientX - r.left) / r.width * 100) + '%');
        fill.style.setProperty('--by', ((e.clientY - r.top) / r.height * 100) + '%');
      }
    };
    const onLeave = () => { el.style.transform = ''; };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    cleanups.push(() => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave); });
  });

  // ── Drag gallery ──
  const rail = $('[data-rail]');
  const track = $('[data-track]');
  const galleryBar = $('[data-gallery-bar]');
  const galleryIdx = $('[data-gallery-idx]');
  if (rail && track && galleryBar && galleryIdx) {
    const drag = { active: false, startX: 0, currentX: 0, lastX: 0, lastT: 0, vx: 0, x: 0, max: 0 };
    const recalcMax = () => { drag.max = Math.max(0, track.scrollWidth - rail.clientWidth - 40); };
    const applyTrack = () => {
      drag.x = Math.min(0, Math.max(-drag.max, drag.x));
      track.style.transform = `translateX(${drag.x}px)`;
      const pct = drag.max > 0 ? (-drag.x) / drag.max : 0;
      galleryBar.style.width = (Math.max(.08, pct + .08) * 100) + '%';
      const cardCount = 6;
      const idx = Math.min(cardCount, Math.max(1, Math.round(pct * (cardCount - 1)) + 1));
      galleryIdx.textContent = String(idx).padStart(2, '0');
    };
    recalcMax(); applyTrack();
    addWin('resize', recalcMax);
    const onDown = (e) => {
      drag.active = true; drag.startX = e.clientX; drag.lastX = e.clientX;
      drag.lastT = performance.now(); drag.currentX = drag.x; drag.vx = 0;
      rail.classList.add('grabbing');
      try { rail.setPointerCapture(e.pointerId); } catch (_) {}
    };
    const onMove = (e) => {
      if (!drag.active) return;
      const dx = e.clientX - drag.startX;
      drag.x = drag.currentX + dx;
      const t = performance.now();
      drag.vx = (e.clientX - drag.lastX) / Math.max(1, t - drag.lastT) * 16;
      drag.lastX = e.clientX; drag.lastT = t;
      applyTrack();
    };
    const endDrag = () => {
      if (!drag.active) return;
      drag.active = false;
      rail.classList.remove('grabbing');
      const tick = () => {
        if (Math.abs(drag.vx) < 0.2) return;
        drag.x += drag.vx;
        drag.vx *= 0.93;
        if (drag.x > 0 || drag.x < -drag.max) drag.vx *= 0.4;
        applyTrack();
        rafs.push(requestAnimationFrame(tick));
      };
      tick();
    };
    const onWheel = (e) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
      e.preventDefault();
      drag.x -= e.deltaX;
      applyTrack();
    };
    rail.addEventListener('pointerdown', onDown);
    rail.addEventListener('pointermove', onMove);
    rail.addEventListener('pointerup', endDrag);
    rail.addEventListener('pointercancel', endDrag);
    rail.addEventListener('pointerleave', endDrag);
    rail.addEventListener('wheel', onWheel, { passive: false });
    cleanups.push(() => {
      rail.removeEventListener('pointerdown', onDown);
      rail.removeEventListener('pointermove', onMove);
      rail.removeEventListener('pointerup', endDrag);
      rail.removeEventListener('pointercancel', endDrag);
      rail.removeEventListener('pointerleave', endDrag);
      rail.removeEventListener('wheel', onWheel);
    });
  }

  // ── Pinned scroll auto-cycle ──
  const steps = $$('.pinned-step');
  const tabs = $$('.pinned-tab');
  const stack = $('[data-stack]');
  const panels = stack ? Array.from(stack.querySelectorAll('.panel')) : [];
  const layouts = [
    ['translate(-12%,-8%) rotate(-7deg) scale(.95)', 'translate(0,0) rotate(0) scale(1)', 'translate(10%,8%) rotate(4deg) scale(.92)'],
    ['translate(-10%,8%) rotate(-3deg) scale(.92)', 'translate(8%,-10%) rotate(4deg) scale(.94)', 'translate(0,0) rotate(-1deg) scale(1)'],
    ['translate(8%,-12%) rotate(5deg) scale(.92)', 'translate(-12%,6%) rotate(-3deg) scale(.94)', 'translate(0,0) rotate(0) scale(1)'],
  ];
  if (steps.length && tabs.length) {
    let idx = 0;
    const show = (i) => {
      idx = i;
      steps.forEach((s, k) => s.classList.toggle('on', k === i));
      tabs.forEach((t, k) => { t.classList.remove('active'); void t.offsetWidth; if (k === i) t.classList.add('active'); });
      panels.forEach((p, k) => { if (layouts[i][k]) p.style.transform = layouts[i][k]; });
    };
    const id = setInterval(() => show((idx + 1) % 3), 6000);
    intervals.push(id);
    tabs.forEach((t, k) => {
      const fn = () => { show(k); clearInterval(id); intervals.splice(intervals.indexOf(id), 1); const id2 = setInterval(() => show((idx + 1) % 3), 6000); intervals.push(id2); };
      t.addEventListener('click', fn);
      cleanups.push(() => t.removeEventListener('click', fn));
    });
  }

  // ── Reveal cards on scroll ──
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in'); });
    }, { threshold: 0.15 });
    $$('.r-card').forEach((c) => io.observe(c));
    cleanups.push(() => io.disconnect());

    // ── Number counters ──
    const countIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        if (el.dataset.done) return;
        el.dataset.done = '1';
        const target = parseFloat(el.dataset.count);
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';
        const span = el.querySelector('span');
        const dur = 1800;
        const start = performance.now();
        const fmt = (n) => {
          const fixed = n.toFixed(decimals);
          const [int, dec] = fixed.split('.');
          const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
          return prefix + (dec !== undefined ? `${grouped}.${dec}` : grouped) + suffix;
        };
        const step = (t) => {
          const p = Math.min(1, (t - start) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          if (span) span.textContent = fmt(target * eased);
          if (p < 1) rafs.push(requestAnimationFrame(step));
          else el.textContent = fmt(target);
        };
        rafs.push(requestAnimationFrame(step));
      });
    }, { threshold: 0.4 });
    $$('[data-count]').forEach((el) => countIO.observe(el));
    cleanups.push(() => countIO.disconnect());
  }

  // ── Draggable tokens ──
  const field = $('[data-field]');
  if (field) {
    $$('[data-token]').forEach((token) => {
      const t = { active: false, startX: 0, startY: 0, x: 0, y: 0, baseX: 0, baseY: 0 };
      const setBase = () => {
        const r = field.getBoundingClientRect();
        const tr = token.getBoundingClientRect();
        t.baseX = tr.left - r.left;
        t.baseY = tr.top - r.top;
        token.style.left = '0px'; token.style.top = '0px';
        token.style.transform = `translate(${t.baseX}px, ${t.baseY}px)`;
      };
      const init = () => requestAnimationFrame(setBase);
      init();
      const onResize = () => init();
      addWin('resize', onResize);
      const onDown = (e) => {
        t.active = true; t.startX = e.clientX; t.startY = e.clientY;
        t.x = t.baseX; t.y = t.baseY;
        token.classList.add('grabbing');
        token.style.zIndex = 10;
        try { token.setPointerCapture(e.pointerId); } catch (_) {}
      };
      const onMove = (e) => {
        if (!t.active) return;
        const dx = e.clientX - t.startX;
        const dy = e.clientY - t.startY;
        const r = field.getBoundingClientRect();
        const tr = token.getBoundingClientRect();
        let nx = t.x + dx, ny = t.y + dy;
        nx = Math.max(0, Math.min(r.width - tr.width, nx));
        ny = Math.max(0, Math.min(r.height - tr.height, ny));
        token.style.transform = `translate(${nx}px, ${ny}px) rotate(${Math.max(-6, Math.min(6, dx * 0.04))}deg)`;
      };
      const release = () => {
        if (!t.active) return;
        t.active = false;
        token.classList.remove('grabbing');
        const m = token.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
        if (m) { t.baseX = parseFloat(m[1]); t.baseY = parseFloat(m[2]); }
        token.style.transform = `translate(${t.baseX}px, ${t.baseY}px)`;
      };
      token.addEventListener('pointerdown', onDown);
      token.addEventListener('pointermove', onMove);
      token.addEventListener('pointerup', release);
      token.addEventListener('pointercancel', release);
      cleanups.push(() => {
        token.removeEventListener('pointerdown', onDown);
        token.removeEventListener('pointermove', onMove);
        token.removeEventListener('pointerup', release);
        token.removeEventListener('pointercancel', release);
      });
    });
  }

  // ── Tilt on stack ──
  $$('[data-tilt]').forEach((el) => {
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(1400px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg)`;
    };
    const onLeave = () => { el.style.transform = 'perspective(1400px) rotateX(0) rotateY(0)'; };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    cleanups.push(() => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave); });
  });

  // ── 3D tilt on gallery cards ──
  $$('.card').forEach((card) => {
    const onMove = (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(1100px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) translateZ(20px)`;
    };
    const onLeave = () => { card.style.transform = 'perspective(1100px) rotateY(0) rotateX(0) translateZ(0)'; };
    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);
    cleanups.push(() => { card.removeEventListener('mousemove', onMove); card.removeEventListener('mouseleave', onLeave); });
  });

  // ── Smooth-scroll for in-page anchors (#how, #demo, #product, #modules) ──
  $$('a[href^="#"]').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href || href === '#') return;
    const fn = (e) => {
      const target = root.querySelector(href);
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    };
    a.addEventListener('click', fn);
    cleanups.push(() => a.removeEventListener('click', fn));
  });

  return () => {
    rafs.forEach((id) => cancelAnimationFrame(id));
    intervals.forEach((id) => clearInterval(id));
    winListeners.forEach(([ev, fn, opts]) => window.removeEventListener(ev, fn, opts));
    cleanups.forEach((fn) => { try { fn(); } catch (_) {} });
  };
}

export default function MarketingPage({ onSignIn, onRegister }) {
  const ref = useRef(null);
  const onSignInRef = useRef(onSignIn);
  const onRegisterRef = useRef(onRegister);
  onSignInRef.current = onSignIn;
  onRegisterRef.current = onRegister;

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const cleanups = [];

    const wire = (action, getHandler) => {
      root.querySelectorAll(`[data-action="${action}"]`).forEach((el) => {
        const fn = (e) => { e.preventDefault(); e.stopPropagation(); getHandler()?.(); };
        el.addEventListener('click', fn);
        cleanups.push(() => el.removeEventListener('click', fn));
      });
    };
    wire('signin', () => onSignInRef.current);
    wire('register', () => onRegisterRef.current);

    const teardown = runScripts(root);
    cleanups.push(teardown);

    return () => {
      cleanups.forEach((fn) => { try { fn(); } catch (_) {} });
    };
  }, []);

  return (
    <div className="mp-root" ref={ref}>
      <style>{CSS}</style>
      <div dangerouslySetInnerHTML={{ __html: HTML }} />
    </div>
  );
}
