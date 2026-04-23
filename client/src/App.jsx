import { useState, useEffect, useCallback, useRef } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { authAPI, companyAPI, usersAPI, employeesAPI, taskTypesAPI, workLogsAPI, paymentsAPI, batchesAPI, purchasesAPI, expensesAPI, salesAPI, ordersAPI, customersAPI, stockAdjAPI, inventoryAPI, dashboardAPI, financeAPI, auditAPI, backupAPI, reportsAPI, pendingAPI } from './api';

const fmt = (n) => new Intl.NumberFormat('en-UG').format(Math.round(n || 0));
const fmtD = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDT = (d) => d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const td = () => new Date().toISOString().split('T')[0];
const ws = () => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().split('T')[0]; };
const mst = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
const pc = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0;

const downloadCSV = (filename, headers, rows) => {
  const esc = v => `"${String(v==null?'':v).replace(/"/g,'""')}"`;
  const csv = [headers, ...rows].map(r => r.map(esc).join(',')).join('\r\n');
  const blob = new Blob(['﻿'+csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
};
const printSection = (html, title) => {
  const w = window.open('','_blank','width=900,height=700');
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:sans-serif;padding:30px;color:#222}h1{margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:8px 12px;text-align:left}th{background:#f5f5f5;font-weight:700}tr:nth-child(even){background:#fafafa}.total{font-weight:700;background:#fffbe6}@media print{button{display:none}}</style></head><body>${html}<br/><button onclick="window.print()">Print</button></body></html>`);
  w.document.close();
};


const T = { bg:'#F5F1EA',card:'#FFFFFF',side:'#0C150C',sA:'#264226',p:'#BF8C1A',pL:'#FDF3DC',ac:'#C74B1A',acL:'#FDE8DB',g:'#247529',gL:'#E3F5E4',r:'#B71C1C',rL:'#FFEBEE',txt:'#151A15',t2:'#5E6E5E',t3:'#98A698',brd:'#DED8CC',inp:'#F2ECE2',bl:'#1255A0',blL:'#E3F2FD',pu:'#6A1B9A',tl:'#00796B' };
const FH = "'Playfair Display',serif";
const PM_LABEL = { PER_UNIT:'Per Unit', PER_HOUR:'Per Hour', PER_SHIFT:'Per Shift' };
const ORD_COL = { Pending:T.p, Processing:T.bl, Packed:T.pu, Dispatched:T.ac, Completed:T.g, Cancelled:T.r };
const PAY_METHODS = ['Cash','Mobile Money','Bank Transfer'];
const EXP_CATS = ['Maize Purchase','Packaging','Fuel/Electricity','Transport','Maintenance','Rent','Salaries','Other'];
const ORD_STATUS = ['Pending','Processing','Packed','Dispatched','Completed','Cancelled'];

const I = ({d,sz=18,c='currentColor'}) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
const IC = { home:"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",users:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",clip:"M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2 M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z",box:"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12",cart:"M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6",dollar:"M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",receipt:"M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0",factory:"M2 20h20 M5 20V8l5 4V8l5 4V4h3v16",truck:"M1 3h15v13H1z M16 8h4l3 3v5h-7V8z M5.5 18.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M18.5 18.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",log:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",settings:"M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",plus:"M12 5v14 M5 12h14",edit:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",trash:"M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",check:"M20 6L9 17l-5-5",x:"M18 6L6 18 M6 6l12 12",dl:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3",lock:"M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M7 11V7a5 5 0 0 1 10 0v4",logout:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",alert:"M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01",bar:"M18 20V10 M12 20V4 M6 20v-6",pay:"M21 4H3v16h18V4z M1 10h22",eye:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",shield:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",clock:"M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6v6l4 2",backup:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12",trend:"M23 6l-9.5 9.5-5-5L1 18",star:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" };

// ── UI Primitives ──
const Btn = ({children,v='p',sz='md',onClick,style,disabled,title}) => { const vs={p:{background:T.p,color:'#fff'},ac:{background:T.ac,color:'#fff'},g:{background:T.g,color:'#fff'},r:{background:T.r,color:'#fff'},gh:{background:'transparent',color:T.txt,border:`1px solid ${T.brd}`},ol:{background:'transparent',color:T.p,border:`2px solid ${T.p}`},bl:{background:T.bl,color:'#fff'}}; return <button title={title} onClick={onClick} disabled={disabled} style={{display:'inline-flex',alignItems:'center',gap:5,border:'none',borderRadius:8,cursor:disabled?'not-allowed':'pointer',fontWeight:600,transition:'all .2s',fontSize:sz==='sm'?12:sz==='lg'?15:13,padding:sz==='sm'?'5px 10px':sz==='lg'?'13px 24px':'9px 16px',opacity:disabled?.4:1,whiteSpace:'nowrap',...vs[v],...style}}>{children}</button>; };
const Inp = ({label,error,...p}) => <div style={{display:'flex',flexDirection:'column',gap:3}}>{label&&<label style={{fontSize:12,fontWeight:600,color:T.t2}}>{label}</label>}<input {...p} style={{padding:'9px 12px',borderRadius:8,border:`1.5px solid ${error?T.r:T.brd}`,background:T.inp,fontSize:13,outline:'none',...p.style}}/>{error&&<span style={{fontSize:11,color:T.r}}>{error}</span>}</div>;
const Sel = ({label,options=[],...p}) => <div style={{display:'flex',flexDirection:'column',gap:3}}>{label&&<label style={{fontSize:12,fontWeight:600,color:T.t2}}>{label}</label>}<select {...p} style={{padding:'9px 12px',borderRadius:8,border:`1.5px solid ${T.brd}`,background:T.inp,fontSize:13,outline:'none',...p.style}}>{options.map(o=><option key={o.v??o} value={o.v??o}>{o.l??o}</option>)}</select></div>;
const Card = ({children,style}) => <div className="fi" style={{background:T.card,borderRadius:14,padding:20,boxShadow:'0 1px 4px rgba(0,0,0,.04)',border:`1px solid ${T.brd}`,...style}}>{children}</div>;
const Stat = ({label,value,sub,color=T.p,icon}) => <Card style={{display:'flex',flexDirection:'column',gap:3}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:10,fontWeight:700,color:T.t2,textTransform:'uppercase',letterSpacing:.8}}>{label}</span>{icon&&<div style={{width:30,height:30,borderRadius:8,background:`${color}14`,display:'flex',alignItems:'center',justifyContent:'center'}}><I d={icon} sz={15} c={color}/></div>}</div><span style={{fontSize:21,fontWeight:800,fontFamily:FH,color,lineHeight:1.2}}>{value}</span>{sub&&<span style={{fontSize:11,color:T.t3}}>{sub}</span>}</Card>;
const Badge = ({children,c=T.p}) => <span style={{display:'inline-block',padding:'2px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:`${c}16`,color:c}}>{children}</span>;
const Modal = ({open,onClose,title,children,wide}) => { if(!open)return null; return <div style={{position:'fixed',inset:0,zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.55)',padding:16}} onClick={onClose}><div className="su" onClick={e=>e.stopPropagation()} style={{background:T.card,borderRadius:16,padding:24,width:wide?'min(860px,96%)':'min(480px,96%)',maxHeight:'90vh',overflow:'auto',boxShadow:'0 25px 80px rgba(0,0,0,.2)'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}><h3 style={{fontFamily:FH,fontSize:19,fontWeight:700}}>{title}</h3><button onClick={onClose} style={{background:`${T.brd}55`,border:'none',cursor:'pointer',borderRadius:8,padding:6,display:'flex'}}><I d={IC.x} sz={18}/></button></div>{children}</div></div>; };
const Tbl = ({cols,data,actions}) => <div style={{overflowX:'auto',borderRadius:10,border:`1px solid ${T.brd}`}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr style={{background:T.inp}}>{cols.map(c=><th key={c.k} style={{padding:'10px 13px',textAlign:'left',fontWeight:700,fontSize:10,textTransform:'uppercase',letterSpacing:.6,color:T.t2,whiteSpace:'nowrap'}}>{c.l}</th>)}{actions&&<th style={{padding:'10px 13px',textAlign:'right',fontSize:10,color:T.t2}}>Actions</th>}</tr></thead><tbody>{data.length===0?<tr><td colSpan={cols.length+(actions?1:0)} style={{padding:36,textAlign:'center',color:T.t3}}>No records yet</td></tr>:data.map((r,i)=><tr key={r.id||i} style={{borderTop:`1px solid ${T.brd}`}} onMouseEnter={e=>e.currentTarget.style.background='#FAFAF5'} onMouseLeave={e=>e.currentTarget.style.background=''}>{cols.map(c=><td key={c.k} style={{padding:'9px 13px',whiteSpace:'nowrap'}}>{c.r?c.r(r):r[c.k]}</td>)}{actions&&<td style={{padding:'9px 13px',textAlign:'right'}}>{actions(r)}</td>}</tr>)}</tbody></table></div>;
const PH = ({title,sub,action}) => <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:10}}><div><h2 style={{fontFamily:FH,fontSize:24,fontWeight:800}}>{title}</h2>{sub&&<p style={{fontSize:13,color:T.t2,marginTop:2}}>{sub}</p>}</div>{action}</div>;
const G4 = ({children,style}) => <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(195px,1fr))',gap:12,...style}}>{children}</div>;
const G2 = ({children,style}) => <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,...style}}>{children}</div>;
const Fx = ({children,gap=10,...s}) => <div style={{display:'flex',gap,flexWrap:'wrap',alignItems:'flex-end',...s}}>{children}</div>;
const FG = ({children}) => <div style={{display:'flex',flexDirection:'column',gap:14}}>{children}</div>;
const Spinner = () => <div style={{width:40,height:40,border:`3px solid ${T.brd}`,borderTop:`3px solid ${T.p}`,borderRadius:'50%',animation:'spin .7s linear infinite',margin:'40px auto'}}/>;
const Toast = ({msg,type}) => { if(!msg)return null; return <div style={{position:'fixed',bottom:24,right:24,zIndex:9999,background:type==='error'?T.r:T.g,color:'#fff',padding:'12px 20px',borderRadius:10,fontSize:14,fontWeight:600,boxShadow:'0 8px 30px rgba(0,0,0,.2)',animation:'slideUp .3s ease-out'}}>{msg}</div>; };

// ══════════════════════════════════════════
// MARKETING / HOME PAGE  — 3D EDITION
// ══════════════════════════════════════════
function MarketingPage({ onSignIn, onRegister }) {
  const [scrolled, setScrolled] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoResult, setDemoResult] = useState(null);
  const [demoLogs, setDemoLogs]     = useState([]);
  const [demoError, setDemoError]   = useState('');
  const canvasRef = useRef(null);
  const mouseRef  = useRef({ x: 0.5, y: 0.5 });
  const rafRef    = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Particle canvas ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = canvas.width  = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    const onResize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener('resize', onResize);

    const NUM = 120;
    const pts = Array.from({ length: NUM }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.6 + 0.4,
      hue: Math.random() < 0.5 ? 130 : 45,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.hue === 130 ? 'rgba(26,122,32,0.55)' : 'rgba(201,150,30,0.5)';
        ctx.fill();
      }
      // connect close pairs
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx*dx + dy*dy);
          if (d < 110) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(201,150,30,${0.12 * (1 - d / 110)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    const onMove = (e) => {
      mouseRef.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
    };
    window.addEventListener('mousemove', onMove);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  // 3D tilt helper
  const tilt3D = (e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width  - 0.5;
    const y = (e.clientY - r.top)  / r.height - 0.5;
    el.style.transform = `perspective(700px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg) scale(1.03)`;
  };
  const untilt = (e) => { e.currentTarget.style.transform = ''; };

  const loadDemoLogs = async () => {
    try {
      const r = await fetch('/api/demo/activities');
      const { logs } = await r.json();
      setDemoLogs(logs || []);
    } catch (_) {}
  };

  const logDemoActivity = async () => {
    setDemoLoading(true); setDemoError(''); setDemoResult(null);
    try {
      const r = await fetch('/api/demo/activity', { method: 'POST' });
      if (!r.ok) throw new Error(`Server error ${r.status}`);
      const { log } = await r.json();
      setDemoResult(log);
      await loadDemoLogs();
    } catch (e) {
      setDemoError(e.message);
    } finally {
      setDemoLoading(false);
    }
  };

  useEffect(() => { loadDemoLogs(); }, []);

  const GRN = '#1A7A20'; const GOLD = '#C9961E'; const DARK = '#07100A'; const DARK2 = '#0F1C12';
  const MID = '#152218'; const CREAM = '#FDF8F0'; const LGOLD = '#FDF3DC';

  const features = [
    { icon: IC.factory,  title: 'Production Tracking',    desc: 'Log every batch — maize in, flour out, bran yield, waste. Monitor shift performance and machine efficiency in real time.' },
    { icon: IC.pay,      title: 'Payroll Management',      desc: 'Auto-calculate wages by task type (per unit, per hour, per shift). Track payments and view full earnings statements per employee.' },
    { icon: IC.box,      title: 'Inventory Control',       desc: 'Real-time stock levels for raw maize, flour, bran and packaging. Get low-stock alerts before you run out.' },
    { icon: IC.bar,      title: 'Financial Reports',       desc: '6-month revenue trends, cost breakdowns, profit margins and expense analytics — at a glance, always up to date.' },
    { icon: IC.cart,     title: 'Sales & Orders',          desc: 'Record sales with itemised receipts, manage customer orders from pending to dispatch, track payment status.' },
    { icon: IC.shield,   title: 'Role-based Access',       desc: 'Owner controls everything. Admin enters data with approval workflows. Supervisors get a read-only view. No accidents.' },
  ];

  const steps = [
    { n:'01', title:'Register Your Company', desc:'Set up your mill in minutes. Get a unique company code to share with your team.' },
    { n:'02', title:'Add Your Team',         desc:'Create accounts for owners, admins and supervisors. Each role sees exactly what they need.' },
    { n:'03', title:'Start Tracking',        desc:'Log production, record sales, manage payroll — and watch your business clarity grow daily.' },
  ];

  const roadmap = [
    { icon:'📱', title:'Mobile App',            when:'Q3 2026', desc:'Native Android & iOS app for on-the-go management.' },
    { icon:'📲', title:'SMS Notifications',     when:'Q3 2026', desc:'Payment alerts and low-stock warnings via SMS.' },
    { icon:'🏢', title:'Multi-branch Support',  when:'Q4 2026', desc:'Manage multiple mill locations under one account.' },
    { icon:'🤖', title:'AI Production Insights',when:'Q1 2027', desc:'Smart suggestions to improve yield and reduce waste.' },
    { icon:'💬', title:'WhatsApp Integration',  when:'Q1 2027', desc:'Send receipts and reports directly via WhatsApp.' },
    { icon:'🏦', title:'Bank Reconciliation',   when:'Q2 2027', desc:'Automatically match payments to bank statements.' },
  ];

  const navStyle = {
    position:'fixed', top:0, left:0, right:0, zIndex:100,
    background: scrolled ? 'rgba(7,16,10,0.96)' : 'transparent',
    backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
    borderBottom: scrolled ? '1px solid rgba(201,150,30,0.15)' : 'none',
    transition: 'all 0.35s cubic-bezier(.4,0,.2,1)',
    padding: '0 5%',
    display:'flex', alignItems:'center', justifyContent:'space-between', height:68,
  };

  const Anchor = ({id, children}) => <a href={`#${id}`} style={{color:'rgba(255,255,255,0.6)',fontSize:14,fontWeight:500,textDecoration:'none',transition:'color .2s',padding:'4px 0',letterSpacing:.3}}
    onMouseEnter={e=>e.target.style.color='#fff'} onMouseLeave={e=>e.target.style.color='rgba(255,255,255,0.6)'}>{children}</a>;

  const Section = ({id, children, bg=CREAM, style={}}) => <section id={id} style={{background:bg,padding:'100px 5%',...style}}>{children}</section>;

  const SectionTitle = ({tag, title, sub, light}) => <div style={{textAlign:'center',marginBottom:60}}>
    {tag&&<div style={{display:'inline-block',padding:'6px 18px',borderRadius:30,background:light?'rgba(201,150,30,0.12)':'rgba(26,122,32,0.10)',border:`1px solid ${light?'rgba(201,150,30,0.35)':'rgba(26,122,32,0.25)'}`,color:light?GOLD:GRN,fontSize:11,fontWeight:700,letterSpacing:1.8,textTransform:'uppercase',marginBottom:16}}>{tag}</div>}
    <h2 style={{fontFamily:FH,fontSize:'clamp(26px,4vw,42px)',fontWeight:900,color:light?'#fff':DARK,marginBottom:14,lineHeight:1.15,letterSpacing:-.5}}>{title}</h2>
    {sub&&<p style={{fontSize:16,color:light?'rgba(255,255,255,0.5)':'#5E6E5E',maxWidth:580,margin:'0 auto',lineHeight:1.75}}>{sub}</p>}
  </div>;

  // ── 3D Dashboard Mockup ──
  const DashMockup = () => (
    <div style={{
      borderRadius:20,overflow:'hidden',
      boxShadow:'0 60px 180px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.07), inset 0 1px 0 rgba(255,255,255,0.08)',
      background:'#1a2a1c',
      transform:'perspective(1200px) rotateX(4deg) rotateY(-6deg) rotateZ(0.5deg)',
      transformStyle:'preserve-3d',
      maxWidth:780,margin:'0 auto',
      transition:'transform .6s ease',
    }}
    onMouseEnter={e=>{ e.currentTarget.style.transform='perspective(1200px) rotateX(2deg) rotateY(-3deg) rotateZ(0deg) scale(1.02)'; }}
    onMouseLeave={e=>{ e.currentTarget.style.transform='perspective(1200px) rotateX(4deg) rotateY(-6deg) rotateZ(0.5deg)'; }}
    >
      <div style={{background:'linear-gradient(90deg,#0F1C12,#132016)',padding:'10px 14px',display:'flex',alignItems:'center',gap:7,borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
        <div style={{width:11,height:11,borderRadius:'50%',background:'#FF5F56',boxShadow:'0 0 6px #FF5F5688'}}/><div style={{width:11,height:11,borderRadius:'50%',background:'#FFBD2E',boxShadow:'0 0 6px #FFBD2E88'}}/><div style={{width:11,height:11,borderRadius:'50%',background:'#27C93F',boxShadow:'0 0 6px #27C93F88'}}/>
        <div style={{flex:1,margin:'0 12px',background:'rgba(255,255,255,0.05)',borderRadius:5,height:20,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:10,color:'rgba(255,255,255,0.25)'}}>millpro.app · Dashboard</span></div>
      </div>
      <div style={{display:'flex',height:380}}>
        <div style={{width:52,background:'#0C150C',padding:'12px 5px',display:'flex',flexDirection:'column',gap:4}}>
          <div style={{width:34,height:34,borderRadius:8,background:`linear-gradient(135deg,${GOLD},#C74B1A)`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:10,fontSize:16,boxShadow:`0 4px 14px ${GOLD}44`}}>🌽</div>
          {[IC.home,IC.users,IC.clock,IC.factory,IC.box,IC.receipt,IC.bar,IC.settings].map((ic,i)=><div key={i} style={{width:36,height:30,borderRadius:6,background:i===0?'rgba(38,66,38,0.8)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto'}}><svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={i===0?'#fff':'rgba(255,255,255,0.3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={ic}/></svg></div>)}
        </div>
        <div style={{flex:1,padding:'16px 18px',background:'#F5F1EA',overflow:'hidden'}}>
          <div style={{fontFamily:FH,fontSize:15,fontWeight:800,color:'#151A15',marginBottom:12}}>Welcome, James — Monday, 7 Apr 2026</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12}}>
            {[{l:'Employees',v:'14',c:GOLD},{l:'Week Payroll',v:'UGX 847K',c:'#C74B1A'},{l:'Month Sales',v:'UGX 4.2M',c:GRN},{l:'Flour Stock',v:'1,240 kg',c:'#1255A0'}].map((s,i)=><div key={i} style={{background:'#fff',borderRadius:8,padding:'10px 12px',border:'1px solid #DED8CC',boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
              <div style={{fontSize:8,fontWeight:700,color:'#5E6E5E',textTransform:'uppercase',letterSpacing:.5,marginBottom:4}}>{s.l}</div>
              <div style={{fontSize:13,fontWeight:800,color:s.c,fontFamily:FH}}>{s.v}</div>
            </div>)}
          </div>
          <div style={{background:'#fff',borderRadius:8,padding:'10px 12px',border:'1px solid #DED8CC',marginBottom:8}}>
            <div style={{fontSize:9,fontWeight:700,color:'#5E6E5E',marginBottom:8,textTransform:'uppercase',letterSpacing:.5}}>6-Month Revenue</div>
            <div style={{display:'flex',alignItems:'flex-end',gap:6,height:60}}>
              {[42,58,51,75,68,88].map((h,i)=><div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                <div style={{width:'100%',height:h*0.6,borderRadius:'3px 3px 0 0',background:`linear-gradient(to top,${GRN},#4CAF50)`,opacity:0.85}}/>
                <div style={{fontSize:7,color:'#98A698'}}>{'NDJFMA'[i]}</div>
              </div>)}
            </div>
          </div>
          <div style={{background:'#fff',borderRadius:8,padding:'8px 12px',border:'1px solid #DED8CC'}}>
            <div style={{fontSize:9,fontWeight:700,color:'#5E6E5E',marginBottom:6,textTransform:'uppercase',letterSpacing:.5}}>Recent Work</div>
            {[{n:'John Opio',t:'Milling Machine',p:'UGX 18,000'},{n:'Sarah Auma',t:'Packaging',p:'UGX 4,500'},{n:'Moses Okello',t:'Offloading',p:'UGX 3,500'}].map((r,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:i<2?'1px solid #F0EBE0':''}}><div style={{fontSize:9,fontWeight:600,color:'#151A15'}}>{r.n} <span style={{color:'#98A698',fontWeight:400}}>· {r.t}</span></div><div style={{fontSize:9,fontWeight:700,color:GRN}}>{r.p}</div></div>)}
          </div>
        </div>
      </div>
    </div>
  );

  // Floating 3D orbs for hero
  const Orb = ({top,left,size,color,delay}) => (
    <div style={{position:'absolute',top,left,width:size,height:size,borderRadius:'50%',background:`radial-gradient(circle at 35% 35%,${color},transparent 70%)`,filter:'blur(40px)',opacity:.55,animation:`mp3dFloat ${6+delay}s ease-in-out infinite`,animationDelay:`${delay}s`,pointerEvents:'none'}}/>
  );

  return <div style={{fontFamily:"'Inter',system-ui,sans-serif",overflowX:'hidden'}}>
    <style>{`
      @keyframes mp3dFloat { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-24px) scale(1.04)} }
      @keyframes mp3dRotate { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
      @keyframes mp3dPulse { 0%,100%{opacity:.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} }
      @keyframes mp3dSlideUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
      @keyframes mp3dGlow { 0%,100%{box-shadow:0 0 30px rgba(201,150,30,0.3)} 50%{box-shadow:0 0 60px rgba(201,150,30,0.7),0 0 120px rgba(201,150,30,0.3)} }
      @keyframes mp3dMesh { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
      .mp-feat-card { transition:transform .3s cubic-bezier(.4,0,.2,1),box-shadow .3s,border-color .3s; cursor:default; transform-style:preserve-3d; }
      .mp-feat-card:hover { box-shadow:0 24px 64px rgba(0,0,0,0.14),0 0 0 1px rgba(26,122,32,0.4); }
      .mp-role-card { transition:transform .3s cubic-bezier(.4,0,.2,1),box-shadow .3s; transform-style:preserve-3d; }
      .mp-role-card:hover { box-shadow:0 32px 80px rgba(0,0,0,0.18); }
      .mp-step-card { transition:transform .3s cubic-bezier(.4,0,.2,1); }
      .mp-step-card:hover { transform:translateY(-8px) scale(1.03); }
      .mp-road-card { transition:transform .25s,box-shadow .25s; }
      .mp-road-card:hover { transform:translateY(-5px) scale(1.02); box-shadow:0 20px 50px rgba(0,0,0,0.1); }
      .mp-demo-btn { transition:transform .2s,box-shadow .2s; }
      .mp-demo-btn:hover:not(:disabled) { transform:translateY(-3px) scale(1.02); }
      .mp-cta-btn { transition:transform .2s,box-shadow .2s; }
      .mp-cta-btn:hover { transform:translateY(-3px); }
    `}</style>

    {/* ── NAV ── */}
    <nav style={navStyle}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <span style={{fontSize:26,filter:'drop-shadow(0 0 8px rgba(201,150,30,0.6))'}}>🌽</span>
        <span style={{fontFamily:FH,fontSize:20,fontWeight:800,color:'#fff',letterSpacing:-0.5}}>MillPro</span>
        <span style={{fontSize:10,background:`linear-gradient(135deg,${GOLD},#E8B84B)`,color:'#000',borderRadius:4,padding:'2px 8px',fontWeight:800,letterSpacing:.8}}>Enterprise</span>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:32}}>
        <Anchor id="features">Features</Anchor>
        <Anchor id="how">How it Works</Anchor>
        <Anchor id="roadmap">Roadmap</Anchor>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <button onClick={onSignIn} style={{padding:'8px 22px',borderRadius:8,border:'1px solid rgba(255,255,255,0.18)',background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.85)',fontSize:13,fontWeight:600,cursor:'pointer',transition:'all .2s',backdropFilter:'blur(8px)'}} onMouseEnter={e=>{e.target.style.background='rgba(255,255,255,0.1)';e.target.style.borderColor='rgba(255,255,255,0.3)';}} onMouseLeave={e=>{e.target.style.background='rgba(255,255,255,0.04)';e.target.style.borderColor='rgba(255,255,255,0.18)';}}>Sign In</button>
        <button onClick={onRegister} className="mp-cta-btn" style={{padding:'9px 22px',borderRadius:8,border:'none',background:`linear-gradient(135deg,${GRN},#2E8B35)`,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',boxShadow:`0 4px 18px rgba(26,122,32,0.5)`}}>Get Started Free</button>
      </div>
    </nav>

    {/* ── HERO ── */}
    <section style={{minHeight:'100vh',background:`linear-gradient(160deg,${DARK} 0%,#081409 30%,${DARK2} 60%,${MID} 100%)`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'120px 5% 80px',textAlign:'center',position:'relative',overflow:'hidden'}}>
      {/* Particle canvas */}
      <canvas ref={canvasRef} style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:0,opacity:.7}}/>
      {/* 3D floating orbs */}
      <Orb top="12%" left="8%"  size={500} color={`${GRN}30`}   delay={0}/>
      <Orb top="55%" left="75%" size={420} color={`${GOLD}22`}  delay={1.5}/>
      <Orb top="70%" left="5%"  size={300} color={`${GOLD}18`}  delay={3}/>
      <Orb top="20%" left="72%" size={260} color={`${GRN}20`}   delay={2}/>
      {/* Rotating grid overlay */}
      <div style={{position:'absolute',inset:0,backgroundImage:`linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)`,backgroundSize:'60px 60px',pointerEvents:'none',zIndex:0}}/>

      <div style={{position:'relative',zIndex:1,maxWidth:840,margin:'0 auto',animation:'mp3dSlideUp .9s ease both'}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:9,padding:'8px 20px',borderRadius:30,background:'rgba(201,150,30,0.08)',border:'1px solid rgba(201,150,30,0.28)',marginBottom:32,backdropFilter:'blur(8px)'}}>
          <span style={{width:7,height:7,borderRadius:'50%',background:GOLD,boxShadow:`0 0 8px ${GOLD}`,display:'inline-block',animation:'mp3dPulse 2s ease infinite'}}/>
          <span style={{fontSize:12,color:GOLD,fontWeight:600,letterSpacing:1}}>Built for East African Milling Companies</span>
        </div>
        <h1 style={{fontFamily:FH,fontSize:'clamp(38px,6.5vw,76px)',fontWeight:900,color:'#fff',lineHeight:1.05,marginBottom:26,letterSpacing:-2,textShadow:'0 4px 40px rgba(0,0,0,0.5)'}}>
          Run Your Mill.<br/>
          <span style={{background:`linear-gradient(135deg,${GOLD} 0%,#F5D06B 50%,${GOLD} 100%)`,backgroundSize:'200% auto',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',animation:'mp3dMesh 4s linear infinite'}}>Master Your Numbers.</span>
        </h1>
        <p style={{fontSize:'clamp(15px,2vw,18px)',color:'rgba(255,255,255,0.5)',lineHeight:1.8,maxWidth:600,margin:'0 auto 44px'}}>
          The all-in-one management system for maize and grain milling companies. Track production, manage payroll, record sales, and gain full financial clarity — from any device.
        </p>
        <div style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap',marginBottom:68}}>
          <button onClick={onRegister} className="mp-cta-btn" style={{padding:'16px 36px',borderRadius:12,background:`linear-gradient(135deg,${GRN},#2E8B35)`,color:'#fff',fontSize:15,fontWeight:700,border:'none',cursor:'pointer',boxShadow:`0 8px 32px ${GRN}55,0 2px 0 rgba(255,255,255,0.1) inset`}}>Start Free Today →</button>
          <button onClick={onSignIn} style={{padding:'16px 36px',borderRadius:12,background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.85)',fontSize:15,fontWeight:600,border:'1px solid rgba(255,255,255,0.16)',cursor:'pointer',transition:'all .25s',backdropFilter:'blur(8px)'}} onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.1)';}} onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.05)';}}>Sign In to Your Account</button>
          <a href="#demo" style={{padding:'16px 36px',borderRadius:12,background:`rgba(201,150,30,0.1)`,color:GOLD,fontSize:15,fontWeight:600,border:`1px solid rgba(201,150,30,0.35)`,cursor:'pointer',transition:'all .25s',textDecoration:'none',display:'inline-flex',alignItems:'center',gap:8,backdropFilter:'blur(8px)'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(201,150,30,0.2)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(201,150,30,0.1)'}>🌽 Try Live Demo</a>
        </div>
        {/* Stats bar */}
        <div style={{display:'flex',gap:0,justifyContent:'center',flexWrap:'wrap',borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:36,background:'rgba(255,255,255,0.02)',borderRadius:'0 0 20px 20px',backdropFilter:'blur(4px)'}}>
          {[{v:'10+',l:'Report Types'},{v:'3',l:'User Roles'},{v:'Real-time',l:'Inventory'},{v:'Cloud',l:'Hosted & Secure'}].map((s,i)=><div key={i} style={{padding:'0 36px',borderRight:i<3?'1px solid rgba(255,255,255,0.07)':'none',textAlign:'center'}}>
            <div style={{fontSize:'clamp(20px,3vw,30px)',fontWeight:900,color:'#fff',fontFamily:FH,lineHeight:1,textShadow:`0 0 20px ${GOLD}44`}}>{s.v}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginTop:5,fontWeight:500,letterSpacing:.5}}>{s.l}</div>
          </div>)}
        </div>
      </div>

      {/* 3D Dashboard preview */}
      <div style={{position:'relative',zIndex:1,width:'100%',maxWidth:920,margin:'80px auto 0',padding:'0 2%'}}>
        <DashMockup/>
        <div style={{position:'absolute',inset:0,background:`linear-gradient(to top,${DARK2} 0%,transparent 45%)`,pointerEvents:'none',borderRadius:20}}/>
      </div>
    </section>

    {/* ── FEATURES ── */}
    <Section id="features" bg={CREAM}>
      <SectionTitle tag="Powerful Features" title="Everything a Mill Needs, Nothing It Doesn't" sub="Purpose-built for grain milling — not a generic business app. Every feature is designed around how real mills operate."/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(310px,1fr))',gap:22,maxWidth:1100,margin:'0 auto'}}>
        {features.map((f,i)=>(
          <div key={i} className="mp-feat-card"
            style={{background:'#fff',borderRadius:20,padding:'32px 28px',border:'1px solid #E8E2D8',position:'relative',overflow:'hidden'}}
            onMouseMove={tilt3D} onMouseLeave={untilt}>
            {/* shimmer top edge */}
            <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${GRN}55,transparent)`,opacity:0,transition:'opacity .3s'}} className="mp-feat-shimmer"/>
            <div style={{width:52,height:52,borderRadius:14,background:`linear-gradient(135deg,${GRN}18,${GRN}06)`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:18,border:`1px solid ${GRN}20`,boxShadow:`0 4px 20px ${GRN}14`}}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={GRN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={f.icon}/></svg>
            </div>
            <h3 style={{fontFamily:FH,fontSize:19,fontWeight:800,color:DARK,marginBottom:10}}>{f.title}</h3>
            <p style={{fontSize:14,color:'#5E6E5E',lineHeight:1.75}}>{f.desc}</p>
          </div>
        ))}
      </div>
    </Section>

    {/* ── HOW IT WORKS ── */}
    <Section id="how" bg={`linear-gradient(160deg,${DARK} 0%,${DARK2} 50%,${MID} 100%)`} style={{padding:'100px 5%',position:'relative',overflow:'hidden'}}>
      {/* bg grid */}
      <div style={{position:'absolute',inset:0,backgroundImage:`linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)`,backgroundSize:'80px 80px',pointerEvents:'none'}}/>
      <SectionTitle tag="Get Started in Minutes" title="Simple Setup, Powerful Results" sub="No technical expertise needed. If you can use a smartphone, you can run MillPro." light/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:28,maxWidth:960,margin:'0 auto',position:'relative',zIndex:1}}>
        {steps.map((s,i)=>(
          <div key={i} className="mp-step-card" style={{textAlign:'center',padding:'44px 28px',borderRadius:24,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',backdropFilter:'blur(8px)',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:-30,right:-30,width:120,height:120,borderRadius:'50%',background:`radial-gradient(circle,${GOLD}18,transparent 70%)`,pointerEvents:'none'}}/>
            <div style={{width:68,height:68,borderRadius:'50%',background:`linear-gradient(135deg,${GOLD},#E8B84B)`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px',fontSize:22,fontWeight:900,color:'#000',fontFamily:FH,boxShadow:`0 8px 30px ${GOLD}55,0 2px 0 rgba(255,255,255,0.3) inset`}}>{s.n}</div>
            <h3 style={{fontFamily:FH,fontSize:20,fontWeight:800,color:'#fff',marginBottom:12,textShadow:'0 2px 10px rgba(0,0,0,0.4)'}}>{s.title}</h3>
            <p style={{fontSize:14,color:'rgba(255,255,255,0.45)',lineHeight:1.75}}>{s.desc}</p>
          </div>
        ))}
      </div>
      <div style={{textAlign:'center',marginTop:56,position:'relative',zIndex:1}}>
        <button onClick={onRegister} className="mp-cta-btn" style={{padding:'16px 44px',borderRadius:12,background:`linear-gradient(135deg,${GOLD},#E8B84B)`,color:'#000',fontSize:15,fontWeight:800,border:'none',cursor:'pointer',boxShadow:`0 8px 30px ${GOLD}55,0 2px 0 rgba(255,255,255,0.4) inset`}}>Register Your Mill Now — It's Free</button>
      </div>
    </Section>

    {/* ── WHO IT'S FOR ── */}
    <Section bg={LGOLD} style={{padding:'90px 5%'}}>
      <SectionTitle tag="Built For You" title="Who Uses MillPro?" sub="Designed for every person in a milling operation, from the owner to the operator."/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:24,maxWidth:980,margin:'0 auto'}}>
        {[
          { emoji:'👑', role:'Mill Owners', color:GOLD, points:['Full financial visibility','Approve or reject admin actions','Access all reports and exports','Manage all user accounts'] },
          { emoji:'💼', role:'Admin / Managers', color:GRN, points:['Record daily production batches','Log employee work and pay wages','Record sales and customer orders','Enter purchases and expenses'] },
          { emoji:'👷', role:'Supervisors', color:'#1255A0', points:['Real-time production view','See inventory levels','Monitor employee activity','Read-only — no accidental changes'] },
        ].map((r,i)=>(
          <div key={i} className="mp-role-card"
            style={{background:'#fff',borderRadius:22,padding:'32px 28px',border:`2px solid ${r.color}18`,position:'relative',overflow:'hidden'}}
            onMouseMove={tilt3D} onMouseLeave={untilt}>
            <div style={{position:'absolute',top:0,right:0,width:100,height:100,borderRadius:'50%',background:`radial-gradient(circle,${r.color}12,transparent 70%)`,pointerEvents:'none'}}/>
            <div style={{fontSize:42,marginBottom:14,filter:`drop-shadow(0 4px 12px ${r.color}44)`}}>{r.emoji}</div>
            <h3 style={{fontFamily:FH,fontSize:20,fontWeight:800,color:DARK,marginBottom:16}}>{r.role}</h3>
            {r.points.map((p,j)=><div key={j} style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:10}}>
              <span style={{width:20,height:20,borderRadius:'50%',background:`${r.color}15`,border:`1px solid ${r.color}30`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>
                <span style={{color:r.color,fontWeight:800,fontSize:11}}>✓</span>
              </span>
              <span style={{fontSize:13.5,color:'#5E6E5E',lineHeight:1.55}}>{p}</span>
            </div>)}
          </div>
        ))}
      </div>
    </Section>

    {/* ── LIVE DEMO ── */}
    <Section id="demo" bg={DARK2} style={{padding:'100px 5%',position:'relative',overflow:'hidden'}}>
      {/* animated mesh bg */}
      <div style={{position:'absolute',inset:0,background:`conic-gradient(from 0deg at 50% 50%,${DARK2},${MID},${DARK2},${DARK},${DARK2})`,opacity:.6,pointerEvents:'none'}}/>
      <div style={{position:'absolute',inset:0,backgroundImage:`linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)`,backgroundSize:'50px 50px',pointerEvents:'none'}}/>
      <SectionTitle tag="See It Work" title="One Button. Real Database." sub="No login. No setup. Press the button and watch a production record appear in the database instantly." light/>
      <div style={{maxWidth:640,margin:'0 auto',textAlign:'center',position:'relative',zIndex:1}}>
        {/* Glowing orb behind button */}
        <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:280,height:280,borderRadius:'50%',background:`radial-gradient(circle,${GOLD}20,transparent 70%)`,filter:'blur(30px)',pointerEvents:'none',animation:`mp3dPulse 3s ease infinite`}}/>
        <button
          onClick={logDemoActivity}
          disabled={demoLoading}
          className="mp-demo-btn"
          style={{padding:'22px 60px',borderRadius:16,background:demoLoading?'rgba(80,80,80,0.6)':`linear-gradient(135deg,${GOLD},#E8B84B,${GOLD})`,backgroundSize:'200% auto',color:'#000',fontSize:18,fontWeight:800,border:'none',cursor:demoLoading?'not-allowed':'pointer',boxShadow:demoLoading?'none':`0 12px 40px ${GOLD}55,0 2px 0 rgba(255,255,255,0.35) inset`,letterSpacing:.3,width:'100%',maxWidth:400,position:'relative',animation:demoLoading?'none':`mp3dMesh 3s linear infinite`}}>
          {demoLoading ? '⚙️ Logging to DB…' : '🌽 Log Production Activity'}
        </button>

        {demoError && (
          <div style={{marginTop:20,padding:'14px 22px',borderRadius:12,background:'rgba(183,28,28,0.12)',border:'1px solid rgba(183,28,28,0.25)',color:'#ff8a80',fontSize:13,fontWeight:600,backdropFilter:'blur(8px)'}}>
            {demoError}
          </div>
        )}

        {demoResult && (
          <div style={{marginTop:20,padding:'18px 24px',borderRadius:12,background:'rgba(36,117,41,0.12)',border:'1px solid rgba(36,117,41,0.25)',color:'#81c784',fontSize:14,fontWeight:600,backdropFilter:'blur(8px)',animation:'mp3dSlideUp .4s ease'}}>
            ✅ Saved to DB — Maize: <strong>{demoResult.maizeKg} kg</strong> → Flour: <strong>{demoResult.flourKg} kg</strong> · Efficiency: <strong style={{color:GOLD}}>{demoResult.efficiency}%</strong>
          </div>
        )}

        {demoLogs.length > 0 && (
          <div style={{marginTop:32,borderRadius:16,overflow:'hidden',border:'1px solid rgba(255,255,255,0.07)',backdropFilter:'blur(8px)',background:'rgba(255,255,255,0.02)'}}>
            <div style={{background:'rgba(255,255,255,0.04)',padding:'12px 18px',fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:1.2,display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',textAlign:'left',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
              <span>#</span><span>Maize (kg)</span><span>Flour (kg)</span><span>Efficiency</span>
            </div>
            {demoLogs.slice(0,5).map((l,i)=>(
              <div key={l.id} style={{padding:'11px 18px',fontSize:13.5,display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',textAlign:'left',borderTop:i>0?'1px solid rgba(255,255,255,0.04)':'none',background:i%2===0?'rgba(255,255,255,0.015)':'transparent',color:'rgba(255,255,255,0.7)',transition:'background .15s'}}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(201,150,30,0.06)'}
                onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'rgba(255,255,255,0.015)':'transparent'}>
                <span style={{color:GOLD,fontWeight:700}}>{i+1}</span>
                <span>{l.maizeKg}</span>
                <span>{l.flourKg}</span>
                <span style={{color:'#81c784',fontWeight:600}}>{l.efficiency}%</span>
              </div>
            ))}
          </div>
        )}

        <p style={{marginTop:22,fontSize:11.5,color:'rgba(255,255,255,0.2)',letterSpacing:.3}}>
          Each press writes a real record to PostgreSQL via the Express backend — no mock data.
        </p>
      </div>
    </Section>

    {/* ── ROADMAP ── */}
    <Section id="roadmap" bg={CREAM} style={{padding:'100px 5%'}}>
      <SectionTitle tag="What's Coming" title="The Future of MillPro" sub="We're constantly building. Here's what's on the horizon for milling companies across East Africa."/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:20,maxWidth:1100,margin:'0 auto'}}>
        {roadmap.map((r,i)=>(
          <div key={i} className="mp-road-card" style={{background:'#fff',borderRadius:18,padding:'24px 22px',border:'1px solid #E8E2D8',display:'flex',gap:16,alignItems:'flex-start',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,width:4,height:'100%',background:`linear-gradient(to bottom,${GOLD},${GRN})`,borderRadius:'18px 0 0 18px'}}/>
            <div style={{fontSize:32,lineHeight:1,flexShrink:0,filter:'drop-shadow(0 2px 8px rgba(0,0,0,0.12))'}}>{r.icon}</div>
            <div style={{flex:1}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <h4 style={{fontFamily:FH,fontSize:15,fontWeight:800,color:DARK}}>{r.title}</h4>
                <span style={{fontSize:9,color:GOLD,fontWeight:700,background:`${GOLD}12`,border:`1px solid ${GOLD}25`,padding:'3px 9px',borderRadius:12,whiteSpace:'nowrap'}}>{r.when}</span>
              </div>
              <p style={{fontSize:13,color:'#5E6E5E',lineHeight:1.65}}>{r.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>

    {/* ── FINAL CTA ── */}
    <section style={{background:`linear-gradient(160deg,${GRN} 0%,#0F5214 50%,#092B0D 100%)`,padding:'100px 5%',textAlign:'center',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:'-20%',left:'-5%',width:600,height:600,borderRadius:'50%',background:`radial-gradient(circle,rgba(255,255,255,0.05),transparent 70%)`,pointerEvents:'none',animation:'mp3dFloat 8s ease-in-out infinite'}}/>
      <div style={{position:'absolute',bottom:'-20%',right:'-5%',width:500,height:500,borderRadius:'50%',background:`radial-gradient(circle,rgba(201,150,30,0.08),transparent 70%)`,pointerEvents:'none',animation:'mp3dFloat 10s ease-in-out infinite',animationDelay:'2s'}}/>
      <div style={{position:'absolute',inset:0,backgroundImage:`linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)`,backgroundSize:'60px 60px',pointerEvents:'none'}}/>
      <div style={{position:'relative',zIndex:1}}>
        <div style={{fontSize:56,marginBottom:18,filter:`drop-shadow(0 0 20px ${GOLD}88)`,animation:'mp3dPulse 3s ease infinite'}}>🌽</div>
        <h2 style={{fontFamily:FH,fontSize:'clamp(28px,4vw,50px)',fontWeight:900,color:'#fff',marginBottom:16,letterSpacing:-0.5,textShadow:'0 4px 30px rgba(0,0,0,0.3)'}}>Ready to Transform Your Mill?</h2>
        <p style={{fontSize:17,color:'rgba(255,255,255,0.6)',marginBottom:44,maxWidth:500,margin:'0 auto 44px',lineHeight:1.75}}>Join milling companies across East Africa who already use MillPro to run smarter, leaner operations.</p>
        <div style={{display:'flex',gap:16,justifyContent:'center',flexWrap:'wrap'}}>
          <button onClick={onRegister} className="mp-cta-btn" style={{padding:'17px 44px',borderRadius:12,background:'#fff',color:GRN,fontSize:15,fontWeight:800,border:'none',cursor:'pointer',boxShadow:'0 8px 32px rgba(0,0,0,0.25),0 2px 0 rgba(255,255,255,0.5) inset'}}>Register Your Company →</button>
          <button onClick={onSignIn} style={{padding:'17px 44px',borderRadius:12,background:'rgba(255,255,255,0.07)',color:'rgba(255,255,255,0.85)',fontSize:15,fontWeight:600,border:'1px solid rgba(255,255,255,0.25)',cursor:'pointer',transition:'all .25s',backdropFilter:'blur(8px)'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.14)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.07)'}>Sign In</button>
        </div>
      </div>
    </section>

    {/* ── FOOTER ── */}
    <footer style={{background:'#040c05',padding:'40px 5%',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:16,borderTop:'1px solid rgba(255,255,255,0.05)'}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <span style={{fontSize:24,filter:`drop-shadow(0 0 8px ${GOLD}66)`}}>🌽</span>
        <span style={{fontFamily:FH,fontSize:17,fontWeight:800,color:'#fff'}}>MillPro Enterprise</span>
        <span style={{fontSize:10,color:'rgba(255,255,255,0.25)',marginLeft:4}}>v2.2</span>
      </div>
      <div style={{fontSize:12,color:'rgba(255,255,255,0.25)',letterSpacing:.3}}>© {new Date().getFullYear()} MillPro Enterprise. Built for East African Milling.</div>
      <div style={{display:'flex',gap:22}}>
        <button onClick={onSignIn} style={{background:'none',border:'none',color:'rgba(255,255,255,0.35)',cursor:'pointer',fontSize:12,fontWeight:500,transition:'color .2s'}} onMouseEnter={e=>e.target.style.color='#fff'} onMouseLeave={e=>e.target.style.color='rgba(255,255,255,0.35)'}>Sign In</button>
        <button onClick={onRegister} style={{background:'none',border:'none',color:GOLD,cursor:'pointer',fontSize:12,fontWeight:700,transition:'opacity .2s'}} onMouseEnter={e=>e.target.style.opacity='.7'} onMouseLeave={e=>e.target.style.opacity='1'}>Get Started</button>
      </div>
    </footer>
  </div>;
}


// ══════════════════════════════════════════
// APP
// ══════════════════════════════════════════
export default function App() { return <AuthProvider><AppRouter /></AuthProvider>; }

function AppRouter() {
  const { user, loading, login, logout } = useAuth();
  const [appState, setAppState] = useState('checking');
  const [selCompany, setSelCompany] = useState(null);
  const [selUsers,   setSelUsers]   = useState([]);
  const [regCode,    setRegCode]    = useState(null); // code shown after registration
  const [toast, setToast] = useState(null);
  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),2500); };

  useEffect(() => {
    if (loading) return;
    if (user) { setAppState('main'); return; }
    setAppState('home');
  }, [loading, user]);

  const handleLookup = (company, users) => { setSelCompany(company); setSelUsers(users); setAppState('login'); };
  const handleRegDone = (code) => { setRegCode(code); setAppState('landing'); showToast('Company created! Sign in with your code.'); };

  if (loading || appState === 'checking') return <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:T.bg}}><Spinner/></div>;
  if (appState === 'home')     return <><MarketingPage onSignIn={()=>setAppState('landing')} onRegister={()=>setAppState('register')}/>{toast&&<Toast {...toast}/>}</>;
  if (appState === 'landing')  return <><Landing onRegister={()=>setAppState('register')} onLogin={handleLookup} regCode={regCode} onClearCode={()=>setRegCode(null)} onBack={()=>setAppState('home')}/>{toast&&<Toast {...toast}/>}</>;
  if (appState === 'register') return <><Register onDone={handleRegDone} onBack={()=>setAppState('landing')} showToast={showToast}/>{toast&&<Toast {...toast}/>}</>;
  if (appState === 'login')    return <><LoginPage company={selCompany} users={selUsers} onSuccess={(token,userData)=>{login(token,userData);setAppState('main');showToast(`Welcome, ${userData.name}!`);}} onBack={()=>setAppState('landing')} showToast={showToast}/>{toast&&<Toast {...toast}/>}</>;
  if (appState === 'main' && user) return <><MainApp user={user} onLogout={()=>{logout();setAppState('home');}} showToast={showToast}/>{toast&&<Toast {...toast}/>}</>;
  return null;
}

// ══════════════════════════════════════════
// LANDING — enter company code to sign in
// ══════════════════════════════════════════
function Landing({onRegister, onLogin, regCode, onClearCode, onBack}) {
  const [code, setCode] = useState('');
  const [err,  setErr]  = useState('');
  const [loading, setLoading] = useState(false);

  const lookup = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return setErr('Enter your company code');
    setLoading(true); setErr('');
    try {
      const res = await authAPI.lookup(c);
      onLogin(res.data.company, res.data.users);
    } catch(e) { setErr(e.response?.data?.error || 'Company not found'); }
    setLoading(false);
  };

  return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(160deg,#0A120A 0%,#14261A 40%,#0F1A12 100%)',padding:20}}>
    <div className="su" style={{textAlign:'center',maxWidth:480,width:'100%'}}>
      <div style={{fontSize:64,marginBottom:8}}>🌽</div>
      <h1 style={{fontFamily:FH,fontSize:38,fontWeight:900,color:'#fff',letterSpacing:-1,marginBottom:4}}>MillPro</h1>
      <p style={{color:'rgba(255,255,255,.45)',fontSize:15,marginBottom:36}}>Enterprise Milling Management System</p>

      {regCode&&<div style={{marginBottom:20,padding:'18px 24px',borderRadius:16,background:'rgba(36,117,41,.15)',border:'1px solid rgba(36,117,41,.4)'}}>
        <div style={{fontSize:12,color:'rgba(255,255,255,.5)',marginBottom:6,textTransform:'uppercase',letterSpacing:1}}>Your company code</div>
        <div style={{fontSize:36,fontWeight:900,color:'#fff',fontFamily:'monospace',letterSpacing:6,marginBottom:8}}>{regCode}</div>
        <div style={{fontSize:12,color:'rgba(255,255,255,.45)'}}>Write this down — you need it to sign in every time.</div>
        <button onClick={onClearCode} style={{marginTop:10,background:'none',border:'none',color:'rgba(255,255,255,.35)',cursor:'pointer',fontSize:11}}>Dismiss</button>
      </div>}

      <div style={{background:'rgba(255,255,255,.05)',borderRadius:18,padding:28,border:'1px solid rgba(255,255,255,.08)',marginBottom:16}}>
        <p style={{color:'rgba(255,255,255,.6)',fontSize:13,marginBottom:14}}>Enter your company code to sign in</p>
        <div style={{display:'flex',gap:8,marginBottom:err?8:0}}>
          <input value={code} onChange={e=>{setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''));setErr('');}}
            onKeyDown={e=>e.key==='Enter'&&lookup()}
            placeholder="e.g. JGM001" maxLength={8}
            style={{flex:1,padding:'13px 16px',borderRadius:12,border:`1.5px solid ${err?'#B71C1C':'rgba(255,255,255,.15)'}`,background:'rgba(255,255,255,.08)',color:'#fff',fontSize:18,fontWeight:700,letterSpacing:3,textAlign:'center',fontFamily:'monospace',outline:'none'}}/>
          <button onClick={lookup} disabled={loading} style={{padding:'13px 22px',borderRadius:12,background:`linear-gradient(135deg,${T.g},${T.tl})`,color:'#fff',border:'none',cursor:'pointer',fontWeight:700,fontSize:14,whiteSpace:'nowrap',opacity:loading?.6:1}}>{loading?'…':'Sign In →'}</button>
        </div>
        {err&&<p style={{color:'#FF7043',fontSize:12,marginTop:4,textAlign:'left'}}>{err}</p>}
      </div>

      <button onClick={onRegister} style={{display:'flex',alignItems:'center',gap:10,padding:'14px 24px',borderRadius:14,border:`1.5px solid rgba(255,255,255,.12)`,background:'rgba(255,255,255,.04)',color:'rgba(255,255,255,.7)',cursor:'pointer',fontSize:13,fontWeight:600,width:'100%',justifyContent:'center',transition:'all .2s'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.08)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.04)'}>
        <I d={IC.plus} sz={16} c="rgba(255,255,255,.7)"/> Register a New Milling Company
      </button>
      {onBack&&<button onClick={onBack} style={{background:'none',border:'none',color:'rgba(255,255,255,.3)',cursor:'pointer',fontSize:12,padding:'10px 0',marginTop:4}}>← Back to home</button>}
    </div>
  </div>;
}

// ══════════════════════════════════════════
// REGISTER
// ══════════════════════════════════════════
function Register({onDone,onBack,showToast}) {
  const [step,setStep]=useState(0);
  const [f,setF]=useState({companyName:'',companyPhone:'',companyAddress:'',companyCode:'',currency:'UGX',ownerName:'',ownerEmail:'',ownerPassword:'',adminName:'',adminEmail:'',adminPassword:''});
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState('');
  const [result,setResult]=useState(null);

  const finish = async () => {
    setLoading(true); setErr('');
    try {
      const r = await authAPI.register(f);
      setResult(r.data);
    } catch(e) { setErr(e.response?.data?.error||'Registration failed'); }
    setLoading(false);
  };

  if (result) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(160deg,#0A120A 0%,#14261A 40%,#0F1A12 100%)',padding:20}}>
    <div className="su" style={{background:T.card,borderRadius:22,padding:40,width:'min(480px,96%)',textAlign:'center',boxShadow:'0 30px 100px rgba(0,0,0,.35)'}}>
      <div style={{fontSize:52,marginBottom:8}}>🎉</div>
      <h2 style={{fontFamily:FH,fontSize:22,fontWeight:800,marginBottom:4}}>{result.companyName}</h2>
      <p style={{color:T.t2,fontSize:13,marginBottom:24}}>Your company has been set up successfully!</p>
      <div style={{background:T.side,borderRadius:16,padding:24,marginBottom:20}}>
        <div style={{fontSize:11,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:1.5,marginBottom:10}}>Your Company Sign-In Code</div>
        <div style={{fontSize:44,fontWeight:900,color:'#fff',fontFamily:'monospace',letterSpacing:8,marginBottom:12}}>{result.companyCode}</div>
        <div style={{fontSize:12,color:'rgba(255,255,255,.5)',lineHeight:1.6}}>Share this code with your team.<br/>Everyone uses it to find your company when signing in.</div>
      </div>
      <Btn v="g" sz="lg" onClick={()=>onDone(result.companyCode)} style={{justifyContent:'center',width:'100%'}}>Go to Sign In →</Btn>
    </div>
  </div>;

  return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(160deg,#0A120A 0%,#14261A 40%,#0F1A12 100%)',padding:20}}>
    <div className="su" style={{background:T.card,borderRadius:22,padding:40,width:'min(540px,96%)',boxShadow:'0 30px 100px rgba(0,0,0,.35)'}}>
      <div style={{textAlign:'center',marginBottom:28}}>
        <span style={{fontSize:42}}>🌽</span>
        <h1 style={{fontFamily:FH,fontSize:24,fontWeight:800,marginTop:4}}>Set Up Your Mill</h1>
        <div style={{display:'flex',gap:4,justifyContent:'center',marginTop:14}}>{[0,1,2].map(i=><div key={i} style={{height:4,borderRadius:2,width:i===step?40:16,background:i<=step?T.p:T.brd,transition:'all .35s'}}/>)}</div>
      </div>
      {err&&<div style={{padding:10,background:T.rL,borderRadius:8,color:T.r,fontSize:13,marginBottom:14}}>{err}</div>}

      {step===0&&<FG>
        <Inp label="Company Name *" value={f.companyName} onChange={e=>setF({...f,companyName:e.target.value})} placeholder="e.g. Mukasa Maize Millers"/>
        <Inp label="Phone" value={f.companyPhone} onChange={e=>setF({...f,companyPhone:e.target.value})} placeholder="+256 700 000 000"/>
        <Inp label="Address" value={f.companyAddress} onChange={e=>setF({...f,companyAddress:e.target.value})} placeholder="Town, District"/>
        <Sel label="Currency" value={f.currency} onChange={e=>setF({...f,currency:e.target.value})} options={[{v:'UGX',l:'UGX — Ugandan Shilling'},{v:'KES',l:'KES — Kenyan Shilling'},{v:'TZS',l:'TZS — Tanzanian Shilling'},{v:'USD',l:'USD — US Dollar'}]}/>
        <div>
          <Inp label="Custom Sign-In Code (optional)" value={f.companyCode} onChange={e=>setF({...f,companyCode:e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8)})} placeholder="Leave blank for auto-generated" style={{letterSpacing:2,fontFamily:'monospace',textTransform:'uppercase'}}/>
          <p style={{fontSize:11,color:T.t2,marginTop:4}}>3–8 letters & numbers, e.g. <strong>MKS001</strong>. Auto-generated if blank.</p>
        </div>
        <Fx gap={8}><Btn v="gh" onClick={onBack}>← Back</Btn><Btn disabled={!f.companyName.trim()} onClick={()=>setStep(1)} style={{flex:1,justifyContent:'center'}}>Continue →</Btn></Fx>
      </FG>}

      {step===1&&<FG>
        <div style={{padding:12,background:T.pL,borderRadius:10,fontSize:13,color:T.p,lineHeight:1.5}}>
          <strong>Owner account</strong> — full access: reports, finance, payroll approval, user management
        </div>
        <Inp label="Owner Name *" value={f.ownerName} onChange={e=>setF({...f,ownerName:e.target.value})}/>
        <Inp label="Email *" type="email" value={f.ownerEmail} onChange={e=>setF({...f,ownerEmail:e.target.value})} placeholder="owner@company.com"/>
        <Inp label="Password *" type="password" value={f.ownerPassword} onChange={e=>setF({...f,ownerPassword:e.target.value})} placeholder="Min 8 characters"/>
        <Fx gap={8}><Btn v="gh" onClick={()=>setStep(0)}>← Back</Btn><Btn disabled={!f.ownerName||!f.ownerEmail||f.ownerPassword.length<8} onClick={()=>setStep(2)} style={{flex:1,justifyContent:'center'}}>Continue →</Btn></Fx>
      </FG>}

      {step===2&&<FG>
        <div style={{padding:12,background:T.acL,borderRadius:10,fontSize:13,color:T.ac,lineHeight:1.5}}>
          <strong>Admin account (optional)</strong> — data entry: purchases, production, sales, work logs
        </div>
        <Inp label="Admin Name" value={f.adminName} onChange={e=>setF({...f,adminName:e.target.value})}/>
        <Inp label="Email" type="email" value={f.adminEmail} onChange={e=>setF({...f,adminEmail:e.target.value})}/>
        <Inp label="Password" type="password" value={f.adminPassword} onChange={e=>setF({...f,adminPassword:e.target.value})} placeholder="Min 8 characters"/>
        <Fx gap={8}><Btn v="gh" onClick={()=>setStep(1)}>← Back</Btn><Btn v="g" disabled={loading} onClick={finish} sz="lg" style={{flex:1,justifyContent:'center'}}>{loading?'Creating…':'🚀 Launch '+f.companyName}</Btn></Fx>
      </FG>}
    </div>
  </div>;
}


// ══════════════════════════════════════════
// LOGIN — click user tile → enter password
// ══════════════════════════════════════════
function LoginPage({company,users:initialUsers=[],onSuccess,onBack,showToast}) {
  const [users,setUsers]=useState(initialUsers);
  const [sel,setSel]=useState(null);
  const [pass,setPass]=useState('');
  const [err,setErr]=useState('');
  const [loading,setLoading]=useState(false);

  const selectUser=(u)=>{setSel(u);setErr('');setPass('');};

  const tryLogin=async()=>{
    if(!sel||!pass)return;
    setLoading(true);setErr('');
    try{
      const res=await authAPI.login({userId:sel.id,password:pass});
      onSuccess(res.data.token,res.data.user);
    }catch(e){setErr(e.response?.data?.error||'Incorrect password. Please try again.');}
    setLoading(false);
  };

  const roleColor={OWNER:T.p,ADMIN:T.bl,SUPERVISOR:T.g};

  return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(160deg,#0A120A 0%,#14261A 40%,#0F1A12 100%)',padding:16}}>
    <div className="su" style={{background:T.card,borderRadius:22,padding:36,width:'min(480px,96%)',textAlign:'center',boxShadow:'0 30px 100px rgba(0,0,0,.35)'}}>
      <div style={{width:56,height:56,borderRadius:16,background:`linear-gradient(135deg,${T.g},${T.tl})`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',fontSize:28}}>🌽</div>
      <h1 style={{fontFamily:FH,fontSize:22,fontWeight:800,marginBottom:4}}>{company?.name||'MillPro'}</h1>
      <p style={{color:T.t2,fontSize:13,marginBottom:24}}>{sel?'Enter your password':'Select your account to continue'}</p>

      {!sel&&<>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10,marginBottom:20}}>
          {users.map(u=><button key={u.id} onClick={()=>selectUser(u)} style={{padding:'16px 10px',borderRadius:14,border:`2px solid ${T.brd}`,background:T.bg,cursor:'pointer',textAlign:'center',transition:'all .2s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=roleColor[u.role]||T.p;e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,.08)';}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.brd;e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='';}}>
            <div style={{width:42,height:42,borderRadius:'50%',background:`linear-gradient(135deg,${roleColor[u.role]||T.p},${T.ac})`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px',fontSize:18,color:'#fff',fontWeight:800}}>{u.name[0]}</div>
            <div style={{fontWeight:700,fontSize:13,marginBottom:2}}>{u.name}</div>
            <div style={{fontSize:10,color:roleColor[u.role]||T.p,fontWeight:700,textTransform:'uppercase',letterSpacing:.5}}>{u.role}</div>
          </button>)}
        </div>
        {users.length===0&&<p style={{color:T.t2,fontSize:13,marginBottom:20}}>No users found for this company.</p>}
      </>}

      {sel&&<>
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderRadius:14,border:`2px solid ${roleColor[sel.role]||T.p}`,background:T.pL,textAlign:'left',marginBottom:16}}>
          <div style={{width:44,height:44,borderRadius:'50%',background:`linear-gradient(135deg,${roleColor[sel.role]||T.p},${T.ac})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,color:'#fff',fontWeight:800,flexShrink:0}}>{sel.name[0]}</div>
          <div style={{flex:1}}><div style={{fontWeight:700,fontSize:15}}>{sel.name}</div><div style={{fontSize:11,color:T.t2}}>{sel.role}</div></div>
          <button onClick={()=>{setSel(null);setPass('');setErr('');}} style={{background:'rgba(0,0,0,.06)',border:'none',cursor:'pointer',borderRadius:8,padding:'5px 10px',fontSize:12,color:T.t2,fontWeight:600}}>Change</button>
        </div>
        {err&&<div style={{padding:10,background:T.rL,borderRadius:10,color:T.r,fontSize:13,marginBottom:14,textAlign:'left'}}>{err}</div>}
        <FG>
          <Inp label="Password" type="password" value={pass} autoFocus onChange={e=>{setPass(e.target.value);setErr('');}} onKeyDown={e=>e.key==='Enter'&&tryLogin()} placeholder="Enter your password"/>
          <Btn onClick={tryLogin} disabled={loading||!pass} style={{justifyContent:'center'}} sz="lg" v="g">{loading?'Signing in…':'Sign In →'}</Btn>
        </FG>
      </>}

      <button onClick={onBack} style={{background:'none',border:'none',color:T.t2,cursor:'pointer',fontSize:13,padding:'12px 8px',marginTop:8}}>← Back to home</button>
    </div>
  </div>;
}

// ══════════════════════════════════════════
// MAIN APP SHELL
// ══════════════════════════════════════════
function MainApp({user,onLogout,showToast}) {
  const [page,setPage]=useState('dashboard');
  const [sideOpen,setSideOpen]=useState(true);
  const [pendingCount,setPendingCount]=useState(0);
  const cur = user.companyCurrency || 'UGX';

  useEffect(()=>{
    if(user.role!=='OWNER')return;
    const fetchCount=()=>pendingAPI.count().then(r=>setPendingCount(r.data.count)).catch(()=>{});
    fetchCount();
    const iv=setInterval(fetchCount,30000);
    return ()=>clearInterval(iv);
  },[user.role,page]);

  const nav=[
    {id:'dashboard', l:'Dashboard',   ic:IC.home,    rl:['ADMIN','OWNER','SUPERVISOR']},
    {id:'employees', l:'Employees',   ic:IC.users,   rl:['ADMIN','OWNER','SUPERVISOR']},
    {id:'taskTypes', l:'Task Types',  ic:IC.clip,    rl:['ADMIN','OWNER']},
    {id:'worklogs',  l:'Work Logs',   ic:IC.clock,   rl:['ADMIN','OWNER','SUPERVISOR']},
    {id:'payroll',   l:'Payroll',     ic:IC.pay,     rl:['ADMIN','OWNER']},
    {id:'production',l:'Production',  ic:IC.factory, rl:['ADMIN','OWNER','SUPERVISOR']},
    {id:'inventory', l:'Inventory',   ic:IC.box,     rl:['ADMIN','OWNER','SUPERVISOR']},
    {id:'purchases', l:'Purchases',   ic:IC.truck,   rl:['ADMIN','OWNER']},
    {id:'expenses',  l:'Expenses',    ic:IC.dollar,  rl:['ADMIN','OWNER']},
    {id:'orders',    l:'Orders',      ic:IC.cart,    rl:['ADMIN','OWNER','SUPERVISOR']},
    {id:'sales',     l:'Sales',       ic:IC.receipt, rl:['ADMIN','OWNER','SUPERVISOR']},
    {id:'customers', l:'Customers',   ic:IC.users,   rl:['ADMIN','OWNER']},
    {id:'stockadj',  l:'Stock Adj.',  ic:IC.box,     rl:['ADMIN','OWNER']},
    {id:'reports',   l:'Reports',     ic:IC.trend,   rl:['OWNER','ADMIN']},
    {id:'finance',   l:'Finance',     ic:IC.bar,     rl:['OWNER','ADMIN']},
    {id:'approvals', l:'Approvals',   ic:IC.alert,   rl:['OWNER']},
    {id:'audit',     l:'Audit Log',   ic:IC.shield,  rl:['OWNER','ADMIN']},
    {id:'settings',  l:'Settings',    ic:IC.settings,rl:['ADMIN','OWNER']},
  ].filter(n=>n.rl.includes(user.role));

  const P = {cur,user,showToast,setPage};

  return <div style={{display:'flex',height:'100vh',overflow:'hidden'}}>
    <aside style={{width:sideOpen?224:56,minWidth:sideOpen?224:56,background:T.side,color:'#fff',display:'flex',flexDirection:'column',transition:'all .25s',overflow:'hidden'}}>
      <div style={{padding:sideOpen?'14px 12px':'14px 8px',display:'flex',alignItems:'center',gap:9,borderBottom:'1px solid rgba(255,255,255,.07)',cursor:'pointer'}} onClick={()=>setSideOpen(!sideOpen)}>
        <div style={{width:34,height:34,borderRadius:8,background:`linear-gradient(135deg,${T.p},${T.ac})`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:17}}>🌽</div>
        {sideOpen&&<div><div style={{fontFamily:FH,fontWeight:700,fontSize:13,whiteSpace:'nowrap'}}>{user.companyName}</div><div style={{fontSize:10,opacity:.4}}>MillPro Enterprise</div></div>}
      </div>
      <nav style={{flex:1,padding:'6px 5px',display:'flex',flexDirection:'column',gap:1,overflowY:'auto'}}>
        {nav.map(n=><button key={n.id} onClick={()=>setPage(n.id)} style={{display:'flex',alignItems:'center',gap:9,padding:sideOpen?'8px 10px':'8px 0',justifyContent:sideOpen?'flex-start':'center',background:page===n.id?T.sA:'transparent',border:'none',color:page===n.id?'#fff':'rgba(255,255,255,.7)',borderRadius:7,cursor:'pointer',fontSize:13,fontWeight:page===n.id?600:400,whiteSpace:'nowrap',width:'100%'}}><I d={n.ic} sz={16}/>{sideOpen&&<span style={{flex:1,textAlign:'left'}}>{n.l}</span>}{sideOpen&&n.id==='approvals'&&pendingCount>0&&<span style={{background:T.r,color:'#fff',borderRadius:10,fontSize:10,fontWeight:700,padding:'1px 6px',minWidth:18,textAlign:'center'}}>{pendingCount}</span>}{!sideOpen&&n.id==='approvals'&&pendingCount>0&&<span style={{position:'absolute',top:2,right:2,width:8,height:8,background:T.r,borderRadius:'50%'}}/>}</button>)}
      </nav>
      <div style={{padding:'6px 5px',borderTop:'1px solid rgba(255,255,255,.07)'}}>
        {sideOpen&&<div style={{padding:'6px 10px',fontSize:11,color:'rgba(255,255,255,.4)'}}><div style={{fontWeight:600,color:'rgba(255,255,255,.7)'}}>{user.name}</div>{user.role}</div>}
        <button onClick={onLogout} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',justifyContent:sideOpen?'flex-start':'center',background:'none',border:'none',color:'rgba(255,255,255,.5)',cursor:'pointer',fontSize:13,width:'100%',borderRadius:6}}><I d={IC.logout} sz={15}/>{sideOpen&&'Sign Out'}</button>
      </div>
    </aside>
    <main style={{flex:1,overflow:'auto',padding:'22px 28px'}}>
      {page==='dashboard'&&<DashboardPage {...P}/>}
      {page==='employees'&&<EmployeesPage {...P}/>}
      {page==='taskTypes'&&<CrudPage title="Task Types" api={taskTypesAPI} columns={[{k:'name',l:'Task',r:r=><strong>{r.name}</strong>},{k:'payMode',l:'Pay Mode',r:r=><Badge c={T.bl}>{PM_LABEL[r.payMode]||r.payMode}</Badge>},{k:'rate',l:`Rate (${cur})`,r:r=><strong>{cur} {fmt(r.rate)}</strong>},{k:'nightBonus',l:'Night Bonus',r:r=>r.nightBonus?`+${cur} ${fmt(r.nightBonus)}`:'—'}]} fields={[{k:'name',l:'Name *',type:'text'},{k:'payMode',l:'Pay Mode',type:'select',opts:[{v:'PER_UNIT',l:'Per Unit'},{v:'PER_HOUR',l:'Per Hour'},{v:'PER_SHIFT',l:'Per Shift'}]},{k:'rate',l:`Rate (${cur})`,type:'number'},{k:'nightBonus',l:'Night Bonus',type:'number'}]} {...P}/>}
      {page==='worklogs'&&<WorkLogsPage {...P}/>}
      {page==='payroll'&&<PayrollPage {...P}/>}
      {page==='production'&&<ProductionPage {...P}/>}
      {page==='inventory'&&<InventoryPage {...P}/>}
      {page==='purchases'&&<CrudPage title="Purchases" api={purchasesAPI} noEdit columns={[{k:'date',l:'Date',r:r=>fmtD(r.date)},{k:'supplier',l:'Supplier',r:r=><strong>{r.supplier||'—'}</strong>},{k:'itemType',l:'Item',r:r=><Badge c={r.itemType==='MAIZE'?T.p:T.bl}>{r.itemType}</Badge>},{k:'quantity',l:'Qty',r:r=>fmt(r.quantity)},{k:'unitCost',l:'Unit',r:r=>`${cur} ${fmt(r.unitCost)}`},{k:'totalCost',l:'Total',r:r=><strong>{cur} {fmt(r.totalCost)}</strong>}]} fields={[{k:'date',l:'Date',type:'date',def:td()},{k:'supplier',l:'Supplier',type:'text'},{k:'itemType',l:'Item',type:'select',opts:[{v:'MAIZE',l:'Raw Maize'},{v:'PACKAGING',l:'Packaging'},{v:'OTHER',l:'Other'}]},{k:'quantity',l:'Quantity',type:'number'},{k:'unitCost',l:`Unit Cost (${cur})`,type:'number'}]} {...P}/>}
      {page==='expenses'&&<CrudPage title="Expenses" api={expensesAPI} noEdit columns={[{k:'date',l:'Date',r:r=>fmtD(r.date)},{k:'category',l:'Category',r:r=><Badge c={T.ac}>{r.category}</Badge>},{k:'amount',l:'Amount',r:r=><strong>{cur} {fmt(r.amount)}</strong>},{k:'notes',l:'Notes',r:r=>r.notes||'—'},{k:'createdBy',l:'By'}]} fields={[{k:'date',l:'Date',type:'date',def:td()},{k:'category',l:'Category',type:'select',opts:EXP_CATS},{k:'amount',l:`Amount (${cur})`,type:'number'},{k:'notes',l:'Notes',type:'text'}]} {...P}/>}
      {page==='orders'&&<OrdersPage {...P}/>}
      {page==='sales'&&<SalesPage {...P}/>}
      {page==='finance'&&<FinancePage {...P}/>}
      {page==='audit'&&<AuditPage {...P}/>}
      {page==='approvals'&&<ApprovalsPage {...P} onApprove={()=>setPendingCount(c=>Math.max(0,c-1))}/>}
      {page==='settings'&&<SettingsPage {...P}/>}
      {page==='customers'&&<CustomersPage {...P}/>}
      {page==='stockadj'&&<StockAdjPage {...P}/>}
      {page==='reports'&&<ReportsPage {...P}/>}
    </main>
  </div>;
}

// ══════════════════════════════════════════
// GENERIC CRUD PAGE
// ══════════════════════════════════════════
function CrudPage({title,api,columns,fields,cur,user,showToast,noEdit}) {
  const [data,setData]=useState([]); const [loading,setLoading]=useState(true); const [m,setM]=useState(false); const [ed,setEd]=useState(null);
  const defForm=()=>fields.reduce((a,f)=>({...a,[f.k]:f.def||''}),{});
  const [f,setF]=useState(defForm());
  const load=useCallback(()=>{api.list().then(r=>{setData(r.data);setLoading(false);}).catch(()=>setLoading(false));},[]);
  useEffect(()=>{load();},[load]);
  const canWrite = user?.role !== 'SUPERVISOR';
  const isAdmin  = user?.role === 'ADMIN';
  const open=(item)=>{if(item&&!noEdit){setEd(item);setF({...item});}else{setEd(null);setF(defForm());}setM(true);};
  const save=async()=>{try{if(ed){const r=await api.update(ed.id,f);setM(false);if(r.status===202){showToast('Edit request submitted for owner approval');}else{load();showToast('Updated');}}else{await api.create(f);load();setM(false);showToast('Created');}}catch(e){showToast(e.response?.data?.error||'Error','error');}};
  const del=async(id)=>{if(!confirm(isAdmin?'Request delete? Owner approval required.':'Delete this record?'))return;try{const r=await api.delete(id);if(r.status===202){showToast('Delete request submitted for owner approval');}else{load();showToast('Deleted');}}catch{showToast('Error','error');}};
  if(loading)return <Spinner/>;
  return <div className="fi"><PH title={title} sub={`${data.length} records`} action={<Fx gap={6}>{data.length>0&&<Btn v="gh" sz="sm" title="Export CSV" onClick={()=>{const hdrs=fields.map(f=>f.l);const rows=data.map(r=>fields.map(f=>{const v=r[f.k];if(f.type==='date')return fmtD(v);if(v==null)return'—';if(typeof v==='boolean')return v?'Yes':'No';return v;}));downloadCSV(`${title.replace(/\s+/g,'_')}_${td()}.csv`,hdrs,rows);}}><I d={IC.dl} sz={14}/> Export</Btn>}{canWrite&&<Btn onClick={()=>open(null)}><I d={IC.plus} sz={15} c="#fff"/> Add</Btn>}</Fx>}/><Tbl cols={columns} data={data} actions={canWrite?r=><Fx gap={3}>{!noEdit&&<Btn v="gh" sz="sm" title={isAdmin?'Request Edit':'Edit'} onClick={()=>open(r)}><I d={IC.edit} sz={13}/></Btn>}<Btn v="gh" sz="sm" title={isAdmin?'Request Delete':'Delete'} onClick={()=>del(r.id)}><I d={IC.trash} sz={13} c={isAdmin?T.ac:T.r}/></Btn></Fx>:undefined}/><Modal open={m} onClose={()=>setM(false)} title={ed?(isAdmin?`Request Edit: ${title}`:`Edit ${title}`):`New ${title}`}><FG>{fields.map(fl=>{if(fl.type==='select')return <Sel key={fl.k} label={fl.l} value={f[fl.k]||''} onChange={e=>setF({...f,[fl.k]:e.target.value})} options={fl.opts}/>;return <Inp key={fl.k} label={fl.l} type={fl.type||'text'} value={f[fl.k]||''} onChange={e=>setF({...f,[fl.k]:e.target.value})}/>})}{ed&&isAdmin&&<div style={{padding:'8px 12px',borderRadius:8,background:T.pL,fontSize:12,color:T.p}}>This edit will be submitted for owner approval before taking effect.</div>}<Btn onClick={save}><I d={IC.check} sz={15} c="#fff"/> {ed?(isAdmin?'Submit Request':'Update'):'Save'}</Btn></FG></Modal></div>;
}

// ══════════════════════════════════════════
// PAGE IMPLEMENTATIONS
// ══════════════════════════════════════════
function DashboardPage({cur,user,setPage}) {
  const [d,setD]=useState(null);
  useEffect(()=>{dashboardAPI.get().then(r=>setD(r.data)).catch(()=>{});},[]);
  if(!d)return <Spinner/>;
  const lowF=d.inventory?.FLOUR<100,lowM=d.inventory?.RAW_MAIZE<100;
  return <div className="fi"><PH title={`Welcome, ${user.name}`} sub={new Date().toLocaleDateString('en-UG',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}/>{(lowF||lowM)&&<Card style={{marginBottom:14,background:T.rL}}><Fx gap={6}><I d={IC.alert} c={T.r}/><span style={{fontWeight:600,color:T.r}}>Low stock{lowF?` — Flour: ${fmt(d.inventory.FLOUR)}kg`:''}{lowM?` — Maize: ${fmt(d.inventory.RAW_MAIZE)}kg`:''}</span></Fx></Card>}<G4 style={{marginBottom:16}}><Stat label="Employees" value={d.employees} icon={IC.users} color={T.p}/><Stat label="Week Payroll" value={`${cur} ${fmt(d.weekPayroll)}`} sub="This week" icon={IC.pay} color={T.ac}/><Stat label="Wages Owed" value={`${cur} ${fmt(d.wagesOwed||0)}`} sub="Unpaid" icon={IC.alert} color={(d.wagesOwed||0)>0?T.r:T.g}/><Stat label="Month Sales" value={`${cur} ${fmt(d.monthSales)}`} sub="This month" icon={IC.receipt} color={T.g}/><Stat label="Net Profit" value={`${cur} ${fmt(d.netProfit)}`} sub="This month" icon={IC.dollar} color={d.netProfit>=0?T.g:T.r}/><Stat label="Yield" value={d.yieldRate?`${d.yieldRate}%`:'—'} sub="Maize→Flour" icon={IC.factory} color={T.bl}/><Stat label="Flour Stock" value={`${fmt(d.inventory?.FLOUR||0)} kg`} icon={IC.box} color={lowF?T.r:T.g}/><Stat label="Orders" value={d.pendingOrders} sub="Active" icon={IC.cart} color={d.pendingOrders>0?T.p:T.g}/></G4><G2><Card><Fx style={{justifyContent:'space-between',marginBottom:10}}><h3 style={{fontFamily:FH,fontSize:15,fontWeight:700}}>Recent Work</h3><Btn v="gh" sz="sm" onClick={()=>setPage('worklogs')}>All</Btn></Fx>{(d.recentWorkLogs||[]).map(w=><div key={w.id} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:`1px solid ${T.brd}`,fontSize:13}}><div><strong>{w.employee?.name}</strong> <span style={{color:T.t2}}>· {w.taskType?.name}</span></div><Badge c={T.g}>{cur} {fmt(w.totalPay)}</Badge></div>)}{!d.recentWorkLogs?.length&&<p style={{color:T.t3,fontSize:13}}>No records</p>}</Card><Card><Fx style={{justifyContent:'space-between',marginBottom:10}}><h3 style={{fontFamily:FH,fontSize:15,fontWeight:700}}>Recent Batches</h3><Btn v="gh" sz="sm" onClick={()=>setPage('production')}>All</Btn></Fx>{(d.recentBatches||[]).map(b=><div key={b.id} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:`1px solid ${T.brd}`,fontSize:13}}><div><strong>{fmt(b.maizeIn)}→{fmt(b.flourOut)}kg</strong> <span style={{color:T.t2}}>· {fmtD(b.date)}</span></div><Badge c={T.bl}>{b.maizeIn>0?((b.flourOut/b.maizeIn)*100).toFixed(0):0}%</Badge></div>)}{!d.recentBatches?.length&&<p style={{color:T.t3,fontSize:13}}>No records</p>}</Card></G2></div>;
}

function WorkLogsPage({cur,user,showToast}) { const [data,setData]=useState([]); const [emps,setEmps]=useState([]); const [tts,setTTs]=useState([]); const [loading,setLoading]=useState(true); const [m,setM]=useState(false); const [f,setF]=useState({employeeId:'',taskTypeId:'',date:td(),shift:'Day',quantity:'',hours:'',notes:''}); const [fl,setFL]=useState({employeeId:'',taskTypeId:'',from:'',to:''}); const load=()=>Promise.all([workLogsAPI.list(fl),employeesAPI.list(),taskTypesAPI.list()]).then(([w,e,t])=>{setData(w.data);setEmps(e.data);setTTs(t.data);setLoading(false);}); useEffect(()=>{load();},[fl.employeeId,fl.taskTypeId,fl.from,fl.to]); const canWrite=user?.role!=='SUPERVISOR';const isAdmin=user?.role==='ADMIN';
  const save=async()=>{try{await workLogsAPI.create(f);load();setM(false);showToast('Logged');}catch(e){showToast(e.response?.data?.error||'Error','error');}}; const total=data.reduce((s,w)=>s+(w.totalPay||0),0); if(loading)return <Spinner/>; return <div className="fi"><PH title="Work Logs" action={<Fx gap={6}><Btn v="gh" sz="sm" onClick={()=>downloadCSV(`WorkLogs_${td()}.csv`,['Date','Employee','Task','Shift','Qty/Hrs',`Pay (${cur})`],data.map(w=>[fmtD(w.date),w.employee?.name,w.taskType?.name,w.shift,w.quantity||w.hours||1,w.totalPay]))}><I d={IC.dl} sz={14}/> Export</Btn>{canWrite&&<Btn onClick={()=>{setF({employeeId:emps[0]?.id||'',taskTypeId:tts[0]?.id||'',date:td(),shift:'Day',quantity:'',hours:'',notes:''});setM(true);}} disabled={!emps.length}><I d={IC.plus} sz={15} c="#fff"/> Log Work</Btn>}</Fx>}/><Card style={{marginBottom:14,padding:12}}><Fx gap={10}><Sel label="Employee" value={fl.employeeId} onChange={e=>setFL({...fl,employeeId:e.target.value})} options={[{v:'',l:'All'},...emps.map(e=>({v:e.id,l:e.name}))]}/><Sel label="Task" value={fl.taskTypeId} onChange={e=>setFL({...fl,taskTypeId:e.target.value})} options={[{v:'',l:'All'},...tts.map(t=>({v:t.id,l:t.name}))]}/><Inp label="From" type="date" value={fl.from} onChange={e=>setFL({...fl,from:e.target.value})}/><Inp label="To" type="date" value={fl.to} onChange={e=>setFL({...fl,to:e.target.value})}/><div style={{paddingTop:18}}><Badge c={T.g}>Total: {cur} {fmt(total)}</Badge></div></Fx></Card><Tbl cols={[{k:'date',l:'Date',r:r=>fmtD(r.date)},{k:'emp',l:'Employee',r:r=><strong>{r.employee?.name}</strong>},{k:'task',l:'Task',r:r=><Badge c={T.p}>{r.taskType?.name}</Badge>},{k:'shift',l:'Shift',r:r=><Badge c={r.shift==='Night'?T.pu:T.bl}>{r.shift}</Badge>},{k:'qty',l:'Qty/Hrs',r:r=>r.quantity||r.hours||'—'},{k:'totalPay',l:'Pay',r:r=><strong style={{color:T.g}}>{cur} {fmt(r.totalPay)}</strong>}]} data={data} actions={canWrite?r=><Btn v="gh" sz="sm" title={isAdmin?'Request Delete':'Delete'} onClick={async()=>{if(!confirm(isAdmin?'Request delete? Needs owner approval.':'Delete?'))return;const r2=await workLogsAPI.delete(r.id);if(r2.status===202)showToast('Delete request submitted for owner approval');else load();}}><I d={IC.trash} sz={13} c={isAdmin?T.ac:T.r}/></Btn>:undefined}/><Modal open={m} onClose={()=>setM(false)} title="Log Work"><FG><Sel label="Employee *" value={f.employeeId} onChange={e=>setF({...f,employeeId:e.target.value})} options={emps.filter(e=>e.active!==false).map(e=>({v:e.id,l:e.name}))}/><Sel label="Task *" value={f.taskTypeId} onChange={e=>setF({...f,taskTypeId:e.target.value})} options={tts.map(t=>({v:t.id,l:`${t.name} (${cur} ${fmt(t.rate)})`}))}/><Fx gap={10}><Inp label="Date" type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})} style={{flex:1}}/><Sel label="Shift" value={f.shift} onChange={e=>setF({...f,shift:e.target.value})} options={['Day','Night']}/></Fx><Fx gap={10}><Inp label="Quantity" type="number" value={f.quantity} onChange={e=>setF({...f,quantity:e.target.value})} style={{flex:1}}/><Inp label="Hours" type="number" value={f.hours} onChange={e=>setF({...f,hours:e.target.value})} style={{flex:1}}/></Fx><Inp label="Notes" value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/><Btn v="g" onClick={save}><I d={IC.check} sz={15} c="#fff"/> Save</Btn></FG></Modal></div>; }

function PayrollPage({cur,user,showToast}) { const [emps,setEmps]=useState([]); const [payments,setPmts]=useState([]); const [workLogs,setWL]=useState([]); const [loading,setLoading]=useState(true); const [m,setM]=useState(false); const [f,setF]=useState({employeeId:'',amount:'',method:'Cash',type:'WEEKLY',date:td(),notes:''}); const [period,setPeriod]=useState({from:ws(),to:td()}); const canWrite=user?.role!=='SUPERVISOR';
  const load=()=>Promise.all([employeesAPI.list(),paymentsAPI.list(period),workLogsAPI.list(period)]).then(([e,p,w])=>{setEmps(e.data);setPmts(p.data);setWL(w.data);setLoading(false);}); useEffect(()=>{load();},[period.from,period.to]); const empData=emps.map(e=>{const earned=workLogs.filter(w=>w.employeeId===e.id).reduce((s,w)=>s+(w.totalPay||0),0);const paid=payments.filter(p=>p.employeeId===e.id).reduce((s,p)=>s+p.amount,0);return{...e,earned,paid,owed:earned-paid,tasks:workLogs.filter(w=>w.employeeId===e.id).length};}).filter(e=>e.earned>0||e.paid>0); const save=async()=>{try{await paymentsAPI.create(f);load();setM(false);showToast('Payment saved');}catch{showToast('Error','error');}}; const openPay=(emp)=>{setF({employeeId:emp?.id||emps[0]?.id||'',amount:emp?String(Math.max(0,emp.owed)):'',method:'Cash',type:'WEEKLY',date:td(),notes:''});setM(true);}; if(loading)return <Spinner/>; return <div className="fi"><PH title="Payroll" action={<Fx gap={6}><Btn v='gh' sz='sm' onClick={()=>downloadCSV(`Payroll_${period.from}_${period.to}.csv`,['Employee','Tasks',`Earned (${cur})`,`Paid (${cur})`,`Owed (${cur})`],empData.map(e=>[e.name,e.tasks,e.earned,e.paid,e.owed]))}><I d={IC.dl} sz={14}/> Export</Btn><Btn onClick={()=>openPay(null)}><I d={IC.plus} sz={15} c="#fff"/> Record Payment</Btn></Fx>}/><Card style={{marginBottom:14,padding:12}}><Fx gap={10}><Inp label="From" type="date" value={period.from} onChange={e=>setPeriod({...period,from:e.target.value})}/><Inp label="To" type="date" value={period.to} onChange={e=>setPeriod({...period,to:e.target.value})}/><Btn v="gh" sz="sm" onClick={()=>setPeriod({from:ws(),to:td()})} style={{marginTop:18}}>Week</Btn><Btn v="gh" sz="sm" onClick={()=>setPeriod({from:mst(),to:td()})} style={{marginTop:18}}>Month</Btn></Fx></Card><Tbl cols={[{k:'name',l:'Employee',r:r=><strong>{r.name}</strong>},{k:'tasks',l:'Tasks'},{k:'earned',l:'Earned',r:r=><span style={{color:T.g}}>{cur} {fmt(r.earned)}</span>},{k:'paid',l:'Paid',r:r=>`${cur} ${fmt(r.paid)}`},{k:'owed',l:'Owed',r:r=><strong style={{color:r.owed>0?T.r:T.g}}>{cur} {fmt(r.owed)}</strong>}]} data={empData} actions={r=>r.owed>0?<Btn v="g" sz="sm" onClick={()=>openPay(r)}>Pay</Btn>:<Badge c={T.g}>OK</Badge>}/><Modal open={m} onClose={()=>setM(false)} title="Payment"><FG><Sel label="Employee" value={f.employeeId} onChange={e=>setF({...f,employeeId:e.target.value})} options={emps.map(e=>({v:e.id,l:e.name}))}/><Inp label={`Amount (${cur})`} type="number" value={f.amount} onChange={e=>setF({...f,amount:e.target.value})}/><Fx gap={10}><Sel label="Method" value={f.method} onChange={e=>setF({...f,method:e.target.value})} options={PAY_METHODS}/><Sel label="Type" value={f.type} onChange={e=>setF({...f,type:e.target.value})} options={[{v:'INSTANT',l:'Instant'},{v:'WEEKLY',l:'Weekly'}]}/></Fx><Inp label="Date" type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/><Btn v="g" onClick={save}><I d={IC.check} sz={15} c="#fff"/> Save</Btn></FG></Modal></div>; }

function ProductionPage({cur,user,showToast}) { const [data,setData]=useState([]); const [loading,setLoading]=useState(true); const [m,setM]=useState(false); const [f,setF]=useState({date:td(),maizeIn:'',flourOut:'',branOut:'',wasteKg:'',shift:'Day',machine:'',notes:''}); const canWrite=user?.role!=='SUPERVISOR';const isAdmin=user?.role==='ADMIN';
  const load=()=>batchesAPI.list().then(r=>{setData(r.data);setLoading(false);}); useEffect(()=>{load();},[]);const save=async()=>{try{await batchesAPI.create(f);load();setM(false);showToast('Saved');}catch{showToast('Error','error');}}; const tI=data.reduce((s,b)=>s+(b.maizeIn||0),0),tF=data.reduce((s,b)=>s+(b.flourOut||0),0),tB=data.reduce((s,b)=>s+(b.branOut||0),0); if(loading)return <Spinner/>; return <div className="fi"><PH title="Production" action={<Fx gap={6}><Btn v='gh' sz='sm' onClick={()=>downloadCSV(`Batches_${td()}.csv`,['Date','Batch#','Maize In (kg)','Flour Out (kg)','Bran (kg)','Waste (kg)','Yield %','Shift','Machine'],data.map(b=>[fmtD(b.date),b.batchNumber||'—',b.maizeIn,b.flourOut,b.branOut,b.wasteKg||0,b.maizeIn>0?((b.flourOut/b.maizeIn)*100).toFixed(1):0,b.shift,b.machine||'—']))}><I d={IC.dl} sz={14}/> Export</Btn><Btn onClick={()=>{setF({date:td(),maizeIn:'',flourOut:'',branOut:'',wasteKg:'',shift:'Day',machine:'',notes:''});setM(true);}}><I d={IC.plus} sz={15} c="#fff"/> New Batch</Btn></Fx>}/><G4 style={{marginBottom:14}}><Stat label="Maize In" value={`${fmt(tI)} kg`} color={T.p} icon={IC.box}/><Stat label="Flour Out" value={`${fmt(tF)} kg`} color={T.g} icon={IC.factory}/><Stat label="Bran" value={`${fmt(tB)} kg`} color={T.ac} icon={IC.box}/><Stat label="Yield" value={tI>0?`${((tF/tI)*100).toFixed(1)}%`:'—'} color={T.bl} icon={IC.bar}/></G4><Tbl cols={[{k:'date',l:'Date',r:r=>fmtD(r.date)},{k:'batchNumber',l:'Batch #',r:r=>r.batchNumber||'—'},{k:'maizeIn',l:'Maize',r:r=><strong>{fmt(r.maizeIn)}</strong>},{k:'flourOut',l:'Flour',r:r=><strong style={{color:T.g}}>{fmt(r.flourOut)}</strong>},{k:'branOut',l:'Bran',r:r=>fmt(r.branOut)},{k:'wasteKg',l:'Waste',r:r=>fmt(r.wasteKg||0)},{k:'yield',l:'Yield',r:r=><Badge c={T.bl}>{r.maizeIn>0?((r.flourOut/r.maizeIn)*100).toFixed(1):0}%</Badge>}]} data={data} actions={canWrite?r=><Btn v="gh" sz="sm" title={isAdmin?'Request Delete':'Delete'} onClick={async()=>{if(!confirm(isAdmin?'Request delete? Owner approval needed.':'Delete?'))return;const r2=await batchesAPI.delete(r.id);if(r2.status===202)showToast('Delete request submitted for owner approval');else load();}}><I d={IC.trash} sz={13} c={isAdmin?T.ac:T.r}/></Btn>:undefined}/><Modal open={m} onClose={()=>setM(false)} title="New Batch"><FG><Inp label="Date" type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/><Fx gap={10}><Inp label="Maize In (kg) *" type="number" value={f.maizeIn} onChange={e=>setF({...f,maizeIn:e.target.value})} style={{flex:1}}/><Inp label="Flour Out (kg) *" type="number" value={f.flourOut} onChange={e=>setF({...f,flourOut:e.target.value})} style={{flex:1}}/></Fx><Fx gap={10}><Inp label="Bran (kg)" type="number" value={f.branOut} onChange={e=>setF({...f,branOut:e.target.value})} style={{flex:1}}/><Inp label="Waste (kg)" type="number" value={f.wasteKg} onChange={e=>setF({...f,wasteKg:e.target.value})} style={{flex:1}}/></Fx><Fx gap={10}><Sel label="Shift" value={f.shift} onChange={e=>setF({...f,shift:e.target.value})} options={['Day','Night']}/><Inp label="Machine" value={f.machine} onChange={e=>setF({...f,machine:e.target.value})} style={{flex:1}}/></Fx><Btn v="g" onClick={save}><I d={IC.check} sz={15} c="#fff"/> Save</Btn></FG></Modal></div>; }

function InventoryPage({cur}) { const [d,setD]=useState(null); useEffect(()=>{dashboardAPI.get().then(r=>setD(r.data.inventory));},[]);if(!d)return <Spinner/>; return <div className="fi"><PH title="Inventory" sub="Auto-calculated from purchases, production, sales" action={d&&<Btn v='gh' sz='sm' onClick={()=>downloadCSV(`Inventory_${td()}.csv`,['Item','Stock Level'],Object.entries(d).map(([k,v])=>[k,v]))}><I d={IC.dl} sz={14}/> Export</Btn>}/><G4>{[{k:'RAW_MAIZE',l:'Raw Maize (kg)'},{k:'FLOUR',l:'Flour (kg)'},{k:'BRAN',l:'Bran (kg)'},{k:'PACKAGING',l:'Packaging'}].map(it=><Stat key={it.k} label={it.l} value={fmt(d[it.k]||0)} color={(d[it.k]||0)<100?T.r:T.g} icon={IC.box} sub={(d[it.k]||0)<100?'⚠ Low':'OK'}/>)}</G4></div>; }

function OrdersPage({cur,user,showToast}) { const [data,setData]=useState([]); const [loading,setLoading]=useState(true); const [m,setM]=useState(false); const [ed,setEd]=useState(null); const [f,setF]=useState({customer:'',phone:'',product:'',quantity:'',unitPrice:'',date:td(),status:'Pending',notes:''}); const load=()=>ordersAPI.list().then(r=>{setData(r.data);setLoading(false);}); useEffect(()=>{load();},[]);const open=(o)=>{if(o){setEd(o);setF({customer:o.customer,phone:o.phone||'',product:o.product||'',quantity:String(o.quantity||''),unitPrice:String(o.unitPrice||''),date:o.date?.split('T')[0]||td(),status:o.status,notes:o.notes||''});}else{setEd(null);setF({customer:'',phone:'',product:'',quantity:'',unitPrice:'',date:td(),status:'Pending',notes:''});}setM(true);}; const canWrite=user?.role!=='SUPERVISOR';const isAdmin=user?.role==='ADMIN';
  const save=async()=>{try{if(ed){const r=await ordersAPI.update(ed.id,f);setM(false);if(r.status===202){showToast('Edit request submitted for owner approval');}else{load();showToast('Updated');}}else{await ordersAPI.create(f);load();setM(false);showToast('Created');}}catch{showToast('Error','error');}};
  const next={Pending:'Processing',Processing:'Packed',Packed:'Dispatched',Dispatched:'Completed'}; if(loading)return <Spinner/>; return <div className="fi"><PH title="Orders" action={<Fx gap={6}><Btn v="gh" sz="sm" onClick={()=>downloadCSV(`Orders_${td()}.csv`,['Date','Order #','Customer','Product','Qty','Total','Status'],data.map(o=>[fmtD(o.date),o.orderNo||'—',o.customer,o.product||'—',o.quantity,`${cur} ${fmt(o.total)}`,o.status]))}><I d={IC.dl} sz={14}/> Export</Btn><Btn onClick={()=>open(null)}><I d={IC.plus} sz={15} c="#fff"/> New</Btn></Fx>}/><Tbl cols={[{k:'date',l:'Date',r:r=>fmtD(r.date)},{k:'orderNo',l:'Order #',r:r=>r.orderNo||'—'},{k:'customer',l:'Customer',r:r=><strong>{r.customer}</strong>},{k:'product',l:'Product'},{k:'qty',l:'Qty',r:r=>fmt(r.quantity)},{k:'total',l:'Total',r:r=><strong>{cur} {fmt(r.total)}</strong>},{k:'status',l:'Status',r:r=><Badge c={ORD_COL[r.status]||T.t2}>{r.status}</Badge>}]} data={data} actions={canWrite?r=><Fx gap={3}>{next[r.status]&&<Btn v="g" sz="sm" onClick={async()=>{if(isAdmin){const r2=await ordersAPI.update(r.id,{...r,status:next[r.status]});if(r2.status===202){showToast('Status update submitted for owner approval');return;}}else{await ordersAPI.update(r.id,{...r,status:next[r.status]});load();}showToast(`→ ${next[r.status]}`);}}>{next[r.status]}→</Btn>}<Btn v="gh" sz="sm" title={isAdmin?'Request Edit':'Edit'} onClick={()=>open(r)}><I d={IC.edit} sz={13}/></Btn><Btn v="gh" sz="sm" title={isAdmin?'Request Delete':'Delete'} onClick={async()=>{if(!confirm(isAdmin?'Request delete? Owner approval needed.':'Delete?'))return;const r2=await ordersAPI.delete(r.id);if(r2.status===202)showToast('Delete request submitted for owner approval');else load();}}><I d={IC.trash} sz={13} c={isAdmin?T.ac:T.r}/></Btn></Fx>:undefined}/><Modal open={m} onClose={()=>setM(false)} title={ed?'Edit':'New Order'}><FG><Inp label="Customer *" value={f.customer} onChange={e=>setF({...f,customer:e.target.value})}/><Inp label="Phone" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/><Inp label="Product" value={f.product} onChange={e=>setF({...f,product:e.target.value})}/><Fx gap={10}><Inp label="Qty" type="number" value={f.quantity} onChange={e=>setF({...f,quantity:e.target.value})} style={{flex:1}}/><Inp label={`Price (${cur})`} type="number" value={f.unitPrice} onChange={e=>setF({...f,unitPrice:e.target.value})} style={{flex:1}}/></Fx><Sel label="Status" value={f.status} onChange={e=>setF({...f,status:e.target.value})} options={ORD_STATUS}/><Btn onClick={save}><I d={IC.check} sz={15} c="#fff"/> {ed?'Update':'Create'}</Btn></FG></Modal></div>; }

function SalesPage({cur,user,showToast}) { const [data,setData]=useState([]); const [loading,setLoading]=useState(true); const [m,setM]=useState(false); const [f,setF]=useState({customer:'',phone:'',date:td(),payMethod:'Cash',items:[{type:'FLOUR',qty:'',unitPrice:''}],notes:''}); const canWrite=user?.role!=='SUPERVISOR';const isAdmin=user?.role==='ADMIN';
  const load=()=>salesAPI.list().then(r=>{setData(r.data);setLoading(false);}); useEffect(()=>{load();},[]);const addItem=()=>setF({...f,items:[...f.items,{type:'FLOUR',qty:'',unitPrice:''}]});const updItem=(i,k,v)=>{const ni=[...f.items];ni[i]={...ni[i],[k]:v};setF({...f,items:ni});}; const save=async()=>{try{await salesAPI.create(f);load();setM(false);showToast('Sale recorded');}catch(e){showToast(e.response?.data?.error||'Error','error');}}; if(loading)return <Spinner/>; return <div className="fi"><PH title="Sales & Receipts" action={<Fx gap={6}><Btn v="gh" sz="sm" onClick={()=>downloadCSV(`Sales_${td()}.csv`,['Date','Receipt','Customer','Payment Method',`Total (${cur})`],data.map(s=>[fmtD(s.date),s.receiptNo,s.customer,s.payMethod,s.total]))}><I d={IC.dl} sz={14}/> Export</Btn><Btn onClick={()=>{setF({customer:'',phone:'',date:td(),payMethod:'Cash',items:[{type:'FLOUR',qty:'',unitPrice:''}],notes:''});setM(true);}}><I d={IC.plus} sz={15} c="#fff"/> Record Sale</Btn></Fx>}/><Tbl cols={[{k:'date',l:'Date',r:r=>fmtD(r.date)},{k:'receiptNo',l:'Receipt',r:r=><span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>{r.receiptNo}</span>},{k:'customer',l:'Customer',r:r=><strong>{r.customer}</strong>},{k:'payMethod',l:'Payment'},{k:'total',l:'Total',r:r=><strong style={{color:T.g}}>{cur} {fmt(r.total)}</strong>}]} data={data} actions={canWrite?r=><Btn v="gh" sz="sm" title={isAdmin?'Request Delete':'Delete'} onClick={async()=>{if(!confirm(isAdmin?'Request delete? Owner approval needed.':'Delete?'))return;const r2=await salesAPI.delete(r.id);if(r2.status===202)showToast('Delete request submitted for owner approval');else load();}}><I d={IC.trash} sz={13} c={isAdmin?T.ac:T.r}/></Btn>:undefined}/><Modal open={m} onClose={()=>setM(false)} title="Record Sale" wide><FG><Fx gap={10}><Inp label="Customer *" value={f.customer} onChange={e=>setF({...f,customer:e.target.value})} style={{flex:1}}/><Inp label="Phone" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})} style={{flex:1}}/></Fx><Fx gap={10}><Inp label="Date" type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/><Sel label="Payment" value={f.payMethod} onChange={e=>setF({...f,payMethod:e.target.value})} options={PAY_METHODS}/></Fx><div>{f.items.map((it,i)=><Fx key={i} gap={6} style={{marginBottom:6}}><Sel value={it.type} onChange={e=>updItem(i,'type',e.target.value)} options={[{v:'FLOUR',l:'Flour'},{v:'BRAN',l:'Bran'},{v:'OTHER',l:'Other'}]}/><Inp placeholder="Qty" type="number" value={it.qty} onChange={e=>updItem(i,'qty',e.target.value)} style={{width:90}}/><Inp placeholder="Price" type="number" value={it.unitPrice} onChange={e=>updItem(i,'unitPrice',e.target.value)} style={{width:110}}/></Fx>)}<Btn v="gh" sz="sm" onClick={addItem}><I d={IC.plus} sz={14}/> Add</Btn></div><Btn v="g" onClick={save} sz="lg" style={{justifyContent:'center'}}><I d={IC.check} sz={15} c="#fff"/> Complete Sale</Btn></FG></Modal></div>; }

function FinancePage({cur}) { const [d,setD]=useState(null); const [period,setPeriod]=useState('month'); const ps=period==='today'?td():period==='week'?ws():period==='month'?mst():period==='year'?`${new Date().getFullYear()}-01-01`:undefined; useEffect(()=>{financeAPI.get(ps?{from:ps}:{}).then(r=>setD(r.data));},[period]); if(!d)return <Spinner/>; return <div className="fi"><PH title="Finance & P&L" action={<Fx gap={4}>
              {['today','week','month','year','all'].map(p=><Btn key={p} v={period===p?'p':'gh'} sz="sm" onClick={()=>setPeriod(p)}>{p==='all'?'All':p[0].toUpperCase()+p.slice(1)}</Btn>)}
              {d&&<Btn v="gh" sz="sm" title="Export CSV" onClick={()=>downloadCSV(`Finance_${period}_${td()}.csv`,['Metric',`Amount (${cur})`],[['Revenue',d.revenue],['Purchases',d.purchases],['Expenses',d.expenses],['Labour (Wages Paid)',d.labour],['Total Costs',d.totalCosts],['Net Profit',d.netProfit],['Profit Margin %',d.margin],['Flour Yield %',d.yieldRate||0],['Maize In (kg)',d.maizeIn||0],['Flour Out (kg)',d.flourOut||0]])}><I d={IC.dl} sz={14}/> CSV</Btn>}
              {d&&<Btn v="gh" sz="sm" title="Print Statement" onClick={()=>printSection(`<h1>Finance Report — ${period}</h1><p>Printed: ${new Date().toLocaleDateString()}</p><table><tr><th>Metric</th><th>Amount (${cur})</th></tr><tr><td>Revenue</td><td>${fmt(d.revenue)}</td></tr><tr><td>Purchases</td><td>${fmt(d.purchases)}</td></tr><tr><td>Expenses</td><td>${fmt(d.expenses)}</td></tr><tr><td>Labour (Wages Paid)</td><td>${fmt(d.labour)}</td></tr><tr><td>Total Costs</td><td>${fmt(d.totalCosts)}</td></tr><tr class="total"><td>Net Profit</td><td>${fmt(d.netProfit)}</td></tr><tr><td>Profit Margin</td><td>${d.margin}%</td></tr><tr><td>Flour Yield</td><td>${d.yieldRate||0}%</td></tr></table>`,'Finance Report')}><I d={IC.log} sz={14}/> Print</Btn>}
            </Fx>}/><G4 style={{marginBottom:16}}><Stat label="Revenue" value={`${cur} ${fmt(d.revenue)}`} color={T.g} icon={IC.receipt}/><Stat label="Purchases" value={`${cur} ${fmt(d.purchases)}`} color={T.p} icon={IC.truck}/><Stat label="Expenses" value={`${cur} ${fmt(d.expenses)}`} color={T.ac} icon={IC.dollar}/><Stat label="Labour" value={`${cur} ${fmt(d.labour)}`} color={T.bl} icon={IC.users}/><Stat label="Costs" value={`${cur} ${fmt(d.totalCosts)}`} color={T.r} icon={IC.alert}/><Stat label="Net Profit" value={`${cur} ${fmt(d.netProfit)}`} color={d.netProfit>=0?T.g:T.r} icon={IC.bar}/><Stat label="Margin" value={`${d.margin}%`} color={d.margin>=0?T.g:T.r} icon={IC.trend}/><Stat label="Yield" value={d.yieldRate?`${d.yieldRate}%`:'—'} color={T.bl} icon={IC.factory}/></G4>{d.revenue>0&&<Card style={{marginBottom:16}}><h3 style={{fontFamily:FH,fontSize:15,fontWeight:700,marginBottom:10}}>Cost Breakdown</h3><div style={{height:28,borderRadius:14,background:T.brd,overflow:'hidden',display:'flex',marginBottom:8}}>{d.purchases>0&&<div style={{width:`${pc(d.purchases,d.revenue)}%`,background:T.p}}/>}{d.labour>0&&<div style={{width:`${pc(d.labour,d.revenue)}%`,background:T.bl}}/>}{d.expenses>0&&<div style={{width:`${pc(d.expenses,d.revenue)}%`,background:T.ac}}/>}{d.netProfit>0&&<div style={{flex:1,background:T.g}}/>}</div></Card>}</div>; }

function AuditPage() { const [data,setData]=useState([]); const [loading,setLoading]=useState(true); useEffect(()=>{auditAPI.list().then(r=>{setData(r.data);setLoading(false);});},[]);if(loading)return <Spinner/>; return <div className="fi"><PH title="Audit Log"/><Tbl cols={[{k:'createdAt',l:'Time',r:r=>fmtDT(r.createdAt)},{k:'user',l:'User',r:r=><strong>{r.user?.name||'System'}</strong>},{k:'action',l:'Action',r:r=><Badge c={r.action==='CREATE'?T.g:r.action==='DELETE'?T.r:r.action==='LOGIN'?T.pu:T.bl}>{r.action}</Badge>},{k:'entity',l:'Module'},{k:'details',l:'Details',r:r=><span style={{color:T.t2,maxWidth:260,display:'inline-block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.details||'—'}</span>}]} data={data}/></div>; }

function SettingsPage({cur,showToast,user}) {
  const [co,setCo]=useState(null);const [users,setUsers]=useState([]);const [tab,setTab]=useState('company');
  const [um,setUm]=useState(false);const [eu,setEu]=useState(null);
  const [uf,setUf]=useState({name:'',email:'',phone:'',password:'',role:'SUPERVISOR',active:true});
  const [pwf,setPwf]=useState({n1:'',n2:''});
  useEffect(()=>{companyAPI.get().then(r=>setCo(r.data));if(user.role==='OWNER')usersAPI.list().then(r=>setUsers(r.data)).catch(()=>{});},[]);
  const [cf,setCf]=useState({});
  useEffect(()=>{if(co)setCf({name:co.name||'',phone:co.phone||'',address:co.address||'',currency:co.currency||'UGX'});},[co]);
  const saveCo=async()=>{try{await companyAPI.update(cf);showToast('Company info saved');}catch{showToast('Error','error');}};
  const backup=async()=>{try{const r=await backupAPI.export();const blob=new Blob([JSON.stringify(r.data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`MillPro_Backup_${td()}.json`;a.click();showToast('Backup downloaded');}catch{showToast('Error','error');}};
  const openUser=(u)=>{if(u){setEu(u);setUf({name:u.name,email:u.email||'',phone:u.phone||'',password:'',role:u.role,active:u.active});}else{setEu(null);setUf({name:'',email:'',phone:'',password:'',role:'SUPERVISOR',active:true});}setUm(true);};
  const saveUser=async()=>{try{if(eu){await usersAPI.update(eu.id,{...uf,password:uf.password||undefined});}else{if(!uf.password)return showToast('Password required','error');if(uf.password.length<8)return showToast('Min 8 characters','error');await usersAPI.create(uf);}usersAPI.list().then(r=>setUsers(r.data));setUm(false);showToast(eu?'User updated':'User created');}catch(e){showToast(e.response?.data?.error||'Error','error');}};
  const toggleActive=async(u)=>{try{await usersAPI.update(u.id,{active:!u.active});usersAPI.list().then(r=>setUsers(r.data));showToast(u.active?'User deactivated':'User activated');}catch{showToast('Error','error');}};
  const changePw=async()=>{if(pwf.n1!==pwf.n2)return showToast('Passwords do not match','error');if(pwf.n1.length<8)return showToast('Min 8 characters','error');try{await usersAPI.update(user.id,{password:pwf.n1});setPwf({n1:'',n2:''});showToast('Password changed');}catch{showToast('Error','error');}};
  if(!co)return <Spinner/>;
  const rc={OWNER:T.p,ADMIN:T.bl,SUPERVISOR:T.g};
  return <div className="fi"><PH title="Settings"/>
    <div style={{display:'flex',gap:2,marginBottom:16,background:T.inp,borderRadius:10,padding:3,maxWidth:520}}>
      {[{id:'company',l:'Company'},...(user.role==='OWNER'?[{id:'users',l:'Users'}]:[]),{id:'profile',l:'My Profile'},{id:'data',l:'Backup'}].map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:'8px 14px',borderRadius:8,border:'none',cursor:'pointer',fontSize:13,fontWeight:600,background:tab===t.id?T.card:'transparent',color:tab===t.id?T.txt:T.t2}}>{t.l}</button>)}
    </div>
    {tab==='company'&&<div style={{maxWidth:500}}>
      {co?.code&&<Card style={{marginBottom:12,background:T.side,color:'#fff'}}>
        <div style={{fontSize:11,opacity:.5,textTransform:'uppercase',letterSpacing:1.5,marginBottom:6}}>Your Company Sign-In Code</div>
        <div style={{fontSize:32,fontWeight:900,fontFamily:'monospace',letterSpacing:6,marginBottom:6}}>{co.code}</div>
        <div style={{fontSize:12,opacity:.45}}>Share this with your team — they need it to sign in.</div>
      </Card>}
      <Card><FG>
      <Inp label="Company Name" value={cf.name} onChange={e=>setCf({...cf,name:e.target.value})}/>
      <Inp label="Phone" value={cf.phone} onChange={e=>setCf({...cf,phone:e.target.value})}/>
      <Inp label="Address" value={cf.address} onChange={e=>setCf({...cf,address:e.target.value})}/>
      <Sel label="Currency" value={cf.currency} onChange={e=>setCf({...cf,currency:e.target.value})} options={['UGX','KES','TZS','USD','EUR']}/>
      <Btn onClick={saveCo}><I d={IC.check} sz={15} c="#fff"/> Save Changes</Btn>
    </FG></Card></div>}
    {tab==='users'&&<div style={{maxWidth:660}}>
      <Fx style={{justifyContent:'flex-end',marginBottom:10}}><Btn onClick={()=>openUser(null)}><I d={IC.plus} sz={15} c="#fff"/> Add User</Btn></Fx>
      <Card>{users.map(u=><div key={u.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:`1px solid ${T.brd}`}}>
        <Fx gap={10} style={{alignItems:'center'}}>
          <div style={{width:38,height:38,borderRadius:'50%',background:`linear-gradient(135deg,${rc[u.role]||T.p},${T.ac})`,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:15,flexShrink:0}}>{u.name[0]}</div>
          <div><div style={{fontWeight:600,fontSize:14}}>{u.name} {!u.active&&<Badge c={T.r}>Inactive</Badge>}</div><div style={{fontSize:12,color:T.t2}}>{u.email||'—'} · <Badge c={rc[u.role]||T.p}>{u.role}</Badge></div></div>
        </Fx>
        <Fx gap={4}>
          <Btn v="gh" sz="sm" onClick={()=>openUser(u)}><I d={IC.edit} sz={13}/></Btn>
          {u.id!==user.id&&<Btn v="gh" sz="sm" title={u.active?'Deactivate':'Activate'} onClick={()=>toggleActive(u)}><I d={u.active?IC.x:IC.check} sz={13} c={u.active?T.r:T.g}/></Btn>}
        </Fx>
      </div>)}</Card>
      <Modal open={um} onClose={()=>setUm(false)} title={eu?'Edit User':'Add New User'}><FG>
        <Inp label="Full Name *" value={uf.name} onChange={e=>setUf({...uf,name:e.target.value})}/>
        <Inp label="Email" type="email" value={uf.email} onChange={e=>setUf({...uf,email:e.target.value})}/>
        <Inp label="Phone" value={uf.phone} onChange={e=>setUf({...uf,phone:e.target.value})}/>
        <Sel label="Role" value={uf.role} onChange={e=>setUf({...uf,role:e.target.value})} options={[{v:'OWNER',l:'Owner'},{v:'ADMIN',l:'Admin'},{v:'SUPERVISOR',l:'Supervisor'}]}/>
        <Inp label={eu?'New Password (leave blank to keep)':'Password *'} type="password" value={uf.password} onChange={e=>setUf({...uf,password:e.target.value})} placeholder="Min 8 characters"/>
        {eu&&<Sel label="Status" value={uf.active?'true':'false'} onChange={e=>setUf({...uf,active:e.target.value==='true'})} options={[{v:'true',l:'Active'},{v:'false',l:'Inactive'}]}/>}
        <Btn v="g" onClick={saveUser}><I d={IC.check} sz={15} c="#fff"/> {eu?'Update User':'Create User'}</Btn>
      </FG></Modal>
    </div>}
    {tab==='profile'&&<div style={{maxWidth:420}}><Card>
      <h3 style={{fontFamily:FH,fontSize:16,fontWeight:700,marginBottom:4}}>Change Password</h3>
      <p style={{fontSize:13,color:T.t2,marginBottom:14}}>Signed in as <strong>{user.name}</strong> ({user.role})</p>
      <FG>
        <Inp label="New Password *" type="password" value={pwf.n1} onChange={e=>setPwf({...pwf,n1:e.target.value})} placeholder="Min 8 characters"/>
        <Inp label="Confirm New Password *" type="password" value={pwf.n2} onChange={e=>setPwf({...pwf,n2:e.target.value})}/>
        <Btn onClick={changePw}><I d={IC.lock} sz={15} c="#fff"/> Update Password</Btn>
      </FG>
    </Card></div>}
    {tab==='data'&&<div style={{maxWidth:520}}><Card>
      <h3 style={{fontFamily:FH,fontSize:16,fontWeight:700,marginBottom:8}}>Data Backup</h3>
      <p style={{fontSize:13,color:T.t2,marginBottom:14}}>Download a full JSON backup of all your company data — employees, sales, production, payroll, and more.</p>
      <Btn v="g" onClick={backup}><I d={IC.dl} sz={15} c="#fff"/> Download Full Backup</Btn>
    </Card></div>}
  </div>;
}

// ══════════════════════════════════════════
// EMPLOYEES PAGE (with statement modal)
// ══════════════════════════════════════════
function EmployeesPage({cur,user,showToast}) {
  const [data,setData]=useState([]);const [loading,setLoading]=useState(true);const [m,setM]=useState(false);const [ed,setEd]=useState(null);
  const [f,setF]=useState({name:'',phone:'',role:'',active:true});
  const [stm,setStm]=useState(false);const [stEmp,setStEmp]=useState(null);const [stData,setStData]=useState(null);
  const [stRange,setStRange]=useState({from:mst(),to:td()});
  const canWrite=user?.role!=='SUPERVISOR';const isAdmin=user?.role==='ADMIN';
  const load=()=>employeesAPI.list().then(r=>{setData(r.data);setLoading(false);});
  useEffect(()=>{load();},[]);
  const open=(emp)=>{if(emp){setEd(emp);setF({name:emp.name,phone:emp.phone||'',role:emp.role||'',active:emp.active!==false});}else{setEd(null);setF({name:'',phone:'',role:'',active:true});}setM(true);};
  const save=async()=>{try{if(ed){const r=await employeesAPI.update(ed.id,f);setM(false);if(r.status===202){showToast('Edit request submitted for owner approval');}else{load();showToast('Updated');}}else{await employeesAPI.create(f);load();setM(false);showToast('Employee added');}}catch(e){showToast(e.response?.data?.error||'Error','error');}};
  const del=async(id)=>{if(!confirm(isAdmin?'Request delete? This needs owner approval.':'Delete this employee and all their records?'))return;try{const r=await employeesAPI.delete(id);if(r.status===202){showToast('Delete request submitted for owner approval');}else{load();showToast('Deleted');}}catch{showToast('Cannot delete — has linked records','error');}};
  const openStmt=async(emp)=>{setStEmp(emp);setStData(null);setStm(true);const r=await employeesAPI.statement(emp.id,stRange.from,stRange.to);setStData(r.data);};
  useEffect(()=>{if(stEmp&&stm)employeesAPI.statement(stEmp.id,stRange.from,stRange.to).then(r=>setStData(r.data));},[stRange.from,stRange.to]);
  if(loading)return <Spinner/>;
  const active=data.filter(e=>e.active!==false).length;
  return <div className="fi">
    <PH title="Employees" sub={`${active} active · ${data.length} total`} action={canWrite?<Btn onClick={()=>open(null)}><I d={IC.plus} sz={15} c="#fff"/> Add Employee</Btn>:undefined}/>
    <Tbl cols={[{k:'name',l:'Name',r:r=><strong>{r.name}</strong>},{k:'phone',l:'Phone',r:r=>r.phone||'—'},{k:'role',l:'Role/Position',r:r=>r.role||'—'},{k:'active',l:'Status',r:r=><Badge c={r.active!==false?T.g:T.r}>{r.active!==false?'Active':'Inactive'}</Badge>}]} data={data} actions={r=><Fx gap={3}>
      <Btn v="gh" sz="sm" title="Earnings Statement" onClick={()=>openStmt(r)}><I d={IC.receipt} sz={13} c={T.bl}/></Btn>
      {canWrite&&<Btn v="gh" sz="sm" title={isAdmin?'Request Edit':'Edit'} onClick={()=>open(r)}><I d={IC.edit} sz={13}/></Btn>}
      {canWrite&&<Btn v="gh" sz="sm" title={isAdmin?'Request Delete':'Delete'} onClick={()=>del(r.id)}><I d={IC.trash} sz={13} c={isAdmin?T.ac:T.r}/></Btn>}
    </Fx>}/>
    <Modal open={m} onClose={()=>setM(false)} title={ed?(isAdmin?'Request Edit: Employee':'Edit Employee'):'New Employee'}><FG>
      <Inp label="Full Name *" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/>
      <Inp label="Phone" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/>
      <Inp label="Role / Position" value={f.role} onChange={e=>setF({...f,role:e.target.value})} placeholder="e.g. Milling Operator"/>
      <Sel label="Status" value={f.active?'true':'false'} onChange={e=>setF({...f,active:e.target.value==='true'})} options={[{v:'true',l:'Active'},{v:'false',l:'Inactive'}]}/>
      {ed&&isAdmin&&<div style={{padding:'8px 12px',borderRadius:8,background:T.pL,fontSize:12,color:T.p}}>This edit will be submitted for owner approval.</div>}<Btn v="g" onClick={save}><I d={IC.check} sz={15} c="#fff"/> {ed?(isAdmin?'Submit Request':'Update'):'Save'}</Btn>
    </FG></Modal>
    <Modal open={stm} onClose={()=>{setStm(false);setStEmp(null);setStData(null);}} title={`Earnings Statement — ${stEmp?.name||''}`} wide>
      <Fx gap={10} style={{marginBottom:14}}>
        <Inp label="From" type="date" value={stRange.from} onChange={e=>setStRange({...stRange,from:e.target.value})}/>
        <Inp label="To" type="date" value={stRange.to} onChange={e=>setStRange({...stRange,to:e.target.value})}/>
      </Fx>
      {!stData?<Spinner/>:<>
        <G4 style={{marginBottom:14}}>
          <Stat label="Total Earned" value={`${cur} ${fmt(stData.totalEarned)}`} color={T.g} icon={IC.dollar}/>
          <Stat label="Total Paid" value={`${cur} ${fmt(stData.totalPaid)}`} color={T.bl} icon={IC.pay}/>
          <Stat label="Balance Owed" value={`${cur} ${fmt(stData.balance)}`} color={stData.balance>0?T.r:T.g} icon={IC.alert}/>
          <Stat label="Work Entries" value={stData.workLogs?.length||0} color={T.p} icon={IC.log}/>
        </G4>
        {stData.workLogs?.length>0&&<><Fx style={{justifyContent:'space-between',alignItems:'center',marginBottom:8}}><h4 style={{fontFamily:FH,fontSize:14,fontWeight:700}}>Work History</h4><Btn v='gh' sz='sm' onClick={()=>downloadCSV(`Statement_${stEmp?.name}_${stRange.from}_${stRange.to}.csv`,['Date','Task','Shift','Qty/Hrs',`Pay (${cur})`],stData.workLogs.map(w=>[fmtD(w.date),w.taskType?.name,w.shift,w.quantity||w.hours||1,w.totalPay]))}><I d={IC.dl} sz={14}/> Export</Btn></Fx>
        <Tbl cols={[{k:'date',l:'Date',r:r=>fmtD(r.date)},{k:'task',l:'Task',r:r=><Badge c={T.p}>{r.taskType?.name}</Badge>},{k:'shift',l:'Shift',r:r=><Badge c={r.shift==='Night'?T.pu:T.bl}>{r.shift}</Badge>},{k:'qty',l:'Qty/Hrs',r:r=>r.quantity||r.hours||'1'},{k:'totalPay',l:'Pay',r:r=><strong style={{color:T.g}}>{cur} {fmt(r.totalPay)}</strong>}]} data={stData.workLogs}/></>}
        {stData.payments?.length>0&&<><h4 style={{fontFamily:FH,fontSize:14,fontWeight:700,margin:'14px 0 8px'}}>Payments Received</h4>
        <Tbl cols={[{k:'date',l:'Date',r:r=>fmtD(r.date)},{k:'method',l:'Method'},{k:'amount',l:'Amount',r:r=><strong style={{color:T.bl}}>{cur} {fmt(r.amount)}</strong>},{k:'notes',l:'Notes',r:r=>r.notes||'—'}]} data={stData.payments}/></>}
      </>}
    </Modal>
  </div>;
}

// ══════════════════════════════════════════
// CUSTOMERS PAGE
// ══════════════════════════════════════════
function CustomersPage({cur,user,showToast}) {
  const [data,setData]=useState([]);const [loading,setLoading]=useState(true);const [m,setM]=useState(false);const [ed,setEd]=useState(null);
  const [f,setF]=useState({name:'',phone:'',email:'',address:''});
  const canWrite=user?.role!=='SUPERVISOR';const isAdmin=user?.role==='ADMIN';
  const load=()=>customersAPI.list().then(r=>{setData(r.data);setLoading(false);});
  useEffect(()=>{load();},[]);
  const open=(c)=>{if(c){setEd(c);setF({name:c.name,phone:c.phone||'',email:c.email||'',address:c.address||''});}else{setEd(null);setF({name:'',phone:'',email:'',address:''});}setM(true);};
  const save=async()=>{try{if(ed){const r=await customersAPI.update(ed.id,f);setM(false);if(r.status===202)showToast('Edit request submitted for owner approval');else{load();showToast('Updated');}}else{await customersAPI.create(f);load();setM(false);showToast('Customer added');}}catch(e){showToast(e.response?.data?.error||'Error','error');}}
  const del=async(id)=>{if(!confirm(isAdmin?'Request delete? Owner approval needed.':'Delete this customer?'))return;try{const r=await customersAPI.delete(id);if(r.status===202)showToast('Delete request submitted for owner approval');else{load();showToast('Deleted');}}catch{showToast('Cannot delete — has linked records','error');}}
  if(loading)return <Spinner/>;
  return <div className="fi">
    <PH title="Customers" sub={`${data.length} registered customers`} action={canWrite?<Btn onClick={()=>open(null)}><I d={IC.plus} sz={15} c="#fff"/> Add Customer</Btn>:undefined}/>
    <Tbl cols={[{k:'name',l:'Name',r:r=><strong>{r.name}</strong>},{k:'phone',l:'Phone',r:r=>r.phone||'—'},{k:'email',l:'Email',r:r=>r.email||'—'},{k:'address',l:'Address',r:r=>r.address||'—'},{k:'createdAt',l:'Since',r:r=>fmtD(r.createdAt)}]} data={data} actions={r=><Fx gap={3}>
      <Btn v="gh" sz="sm" onClick={()=>open(r)}><I d={IC.edit} sz={13}/></Btn>
      <Btn v="gh" sz="sm" onClick={()=>del(r.id)}><I d={IC.trash} sz={13} c={T.r}/></Btn>
    </Fx>}/>
    <Modal open={m} onClose={()=>setM(false)} title={ed?'Edit Customer':'New Customer'}><FG>
      <Inp label="Name *" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/>
      <Inp label="Phone" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/>
      <Inp label="Email" type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/>
      <Inp label="Address" value={f.address} onChange={e=>setF({...f,address:e.target.value})}/>
      <Btn v="g" onClick={save}><I d={IC.check} sz={15} c="#fff"/> {ed?'Update':'Save Customer'}</Btn>
    </FG></Modal>
  </div>;
}

// ══════════════════════════════════════════
// STOCK ADJUSTMENTS PAGE
// ══════════════════════════════════════════
function StockAdjPage({cur,user,showToast}) {
  const [data,setData]=useState([]);const [inv,setInv]=useState(null);const [loading,setLoading]=useState(true);const [m,setM]=useState(false);
  const [f,setF]=useState({date:td(),itemType:'FLOUR',quantity:'',reason:'',notes:''});
  const canWrite=user?.role!=='SUPERVISOR';
  const load=()=>Promise.all([stockAdjAPI.list(),inventoryAPI.get()]).then(([a,i])=>{setData(a.data);setInv(i.data);setLoading(false);});
  useEffect(()=>{load();},[]);
  const save=async()=>{try{await stockAdjAPI.create(f);load();setM(false);showToast('Adjustment saved');}catch(e){showToast(e.response?.data?.error||'Error','error');}};
  if(loading)return <Spinner/>;
  return <div className="fi">
    <PH title="Stock Adjustments" sub="Manual corrections for spoilage, loss, or stock count differences" action={<Btn onClick={()=>{setF({date:td(),itemType:'FLOUR',quantity:'',reason:'',notes:''});setM(true);}}><I d={IC.plus} sz={15} c="#fff"/> New Adjustment</Btn>}/>
    {inv&&<G4 style={{marginBottom:14}}>
      {[{k:'RAW_MAIZE',l:'Raw Maize (kg)'},{k:'FLOUR',l:'Flour (kg)'},{k:'BRAN',l:'Bran (kg)'},{k:'PACKAGING',l:'Packaging (bags)'}].map(it=><Stat key={it.k} label={it.l} value={fmt(inv[it.k]||0)} color={(inv[it.k]||0)<100?T.r:T.g} icon={IC.box} sub={(inv[it.k]||0)<100?'⚠ Low stock':'Current stock'}/>)}
    </G4>}
    <Tbl cols={[{k:'date',l:'Date',r:r=>fmtD(r.date)},{k:'itemType',l:'Item',r:r=><Badge c={T.bl}>{r.itemType}</Badge>},{k:'quantity',l:'Qty',r:r=><strong style={{color:r.quantity>0?T.g:T.r}}>{r.quantity>0?'+':''}{fmt(r.quantity)}</strong>},{k:'reason',l:'Reason'},{k:'notes',l:'Notes',r:r=>r.notes||'—'},{k:'createdBy',l:'By'}]} data={data}/>
    <Modal open={m} onClose={()=>setM(false)} title="New Stock Adjustment"><FG>
      <div style={{padding:10,background:T.acL,borderRadius:8,fontSize:13,color:T.ac,lineHeight:1.5}}>Use <strong>positive</strong> numbers to add stock, <strong>negative</strong> to deduct (e.g. -50 for damage/spoilage)</div>
      <Inp label="Date" type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/>
      <Sel label="Item Type" value={f.itemType} onChange={e=>setF({...f,itemType:e.target.value})} options={[{v:'RAW_MAIZE',l:'Raw Maize'},{v:'FLOUR',l:'Flour'},{v:'BRAN',l:'Bran'},{v:'PACKAGING',l:'Packaging'}]}/>
      <Inp label="Quantity (+ to add, − to remove)" type="number" value={f.quantity} onChange={e=>setF({...f,quantity:e.target.value})}/>
      <Inp label="Reason *" value={f.reason} onChange={e=>setF({...f,reason:e.target.value})} placeholder="e.g. Stock count correction, Spoilage, Water damage"/>
      <Inp label="Notes" value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/>
      <Btn v="g" onClick={save} disabled={!f.reason||!f.quantity}><I d={IC.check} sz={15} c="#fff"/> Save Adjustment</Btn>
    </FG></Modal>
  </div>;
}


// ══════════════════════════════════════════
// APPROVALS PAGE (OWNER only)
// ══════════════════════════════════════════
function ApprovalsPage({cur,user,showToast,onApprove}) {
  const [data,setData]=useState([]);
  const [loading,setLoading]=useState(true);
  const [filter,setFilter]=useState('PENDING');
  const [note,setNote]=useState('');
  const [acting,setActing]=useState(null);

  const load=()=>{pendingAPI.list().then(r=>{setData(r.data);setLoading(false);}).catch(()=>setLoading(false));};
  useEffect(()=>{load();},[]);

  const handle=async(id,action)=>{
    setActing(id);
    try{
      if(action==='approve') await pendingAPI.approve(id,note);
      else await pendingAPI.reject(id,note);
      showToast(action==='approve'?'Approved and executed':'Request rejected');
      if(action==='approve') onApprove();
      load();
    }catch(e){showToast(e.response?.data?.error||'Error','error');}
    setActing(null);setNote('');
  };

  const filtered=data.filter(d=>d.status===filter);
  const counts={PENDING:data.filter(d=>d.status==='PENDING').length,APPROVED:data.filter(d=>d.status==='APPROVED').length,REJECTED:data.filter(d=>d.status==='REJECTED').length};

  const statusColor={PENDING:T.p,APPROVED:T.g,REJECTED:T.r};
  const actionColor={DELETE:T.r,EDIT:T.bl};

  if(loading)return <Spinner/>;
  return <div className="fi">
    <PH title="Approval Queue" sub="Review edit and delete requests from admin users"/>
    <Fx gap={8} style={{marginBottom:16}}>
      {['PENDING','APPROVED','REJECTED'].map(s=><Btn key={s} v={filter===s?'p':'gh'} sz="sm" onClick={()=>setFilter(s)}>{s} <span style={{background:'rgba(255,255,255,.2)',borderRadius:10,padding:'0 6px',marginLeft:4,fontSize:10}}>{counts[s]}</span></Btn>)}
    </Fx>
    {filtered.length===0&&<Card><p style={{color:T.t3,textAlign:'center',padding:24}}>No {filter.toLowerCase()} requests</p></Card>}
    {filtered.map(pa=><Card key={pa.id} style={{marginBottom:12,border:`1.5px solid ${pa.status==='PENDING'?T.brd:statusColor[pa.status]+'33'}`}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10}}>
        <div style={{flex:1}}>
          <Fx gap={8} style={{marginBottom:6,alignItems:'center'}}>
            <Badge c={actionColor[pa.action]||T.p}>{pa.action}</Badge>
            <span style={{fontWeight:700,fontSize:14}}>{pa.entity}</span>
            <Badge c={statusColor[pa.status]}>{pa.status}</Badge>
          </Fx>
          <div style={{fontSize:13,color:T.t2,marginBottom:4}}>
            <strong style={{color:T.txt}}>{pa.requester?.name}</strong> ({pa.requester?.role}) &nbsp;·&nbsp; {fmtDT(pa.createdAt)}
          </div>
          {pa.entityLabel&&<div style={{fontSize:12,color:T.t3}}>Record: <strong>{pa.entityLabel}</strong></div>}
          {pa.action==='EDIT'&&pa.entityData&&<details style={{marginTop:8}}>
            <summary style={{fontSize:12,color:T.bl,cursor:'pointer'}}>View proposed changes</summary>
            <pre style={{fontSize:11,background:T.inp,borderRadius:6,padding:10,marginTop:6,overflow:'auto',maxHeight:160}}>{JSON.stringify(pa.entityData,null,2)}</pre>
          </details>}
          {pa.reviewedBy&&<div style={{fontSize:12,color:T.t3,marginTop:4}}>Reviewed by <strong>{pa.reviewer?.name}</strong> · {fmtDT(pa.reviewedAt)}{pa.reviewNote&&` · "${pa.reviewNote}"`}</div>}
        </div>
        {pa.status==='PENDING'&&<div style={{display:'flex',flexDirection:'column',gap:8,minWidth:200}}>
          <Inp placeholder="Optional note…" value={note} onChange={e=>setNote(e.target.value)} style={{fontSize:12,padding:'6px 10px'}}/>
          <Fx gap={6}>
            <Btn v="g" sz="sm" disabled={acting===pa.id} onClick={()=>handle(pa.id,'approve')} style={{flex:1,justifyContent:'center'}}><I d={IC.check} sz={13} c="#fff"/> Approve</Btn>
            <Btn v="r" sz="sm" disabled={acting===pa.id} onClick={()=>handle(pa.id,'reject')} style={{flex:1,justifyContent:'center'}}><I d={IC.x} sz={13} c="#fff"/> Reject</Btn>
          </Fx>
        </div>}
      </div>
    </Card>)}
  </div>;
}

// ══════════════════════════════════════════
// REPORTS & ANALYTICS PAGE
// ══════════════════════════════════════════
function ReportsPage({cur}) {
  const [data,setData]=useState(null);const [loading,setLoading]=useState(true);
  useEffect(()=>{
    Promise.all([reportsAPI.monthly(),reportsAPI.customers(),reportsAPI.employees()])
      .then(([m,c,e])=>setData({months:m.data.months,customers:c.data.customers,employees:e.data.employees}))
      .catch(()=>{}).finally(()=>setLoading(false));
  },[]);
  if(loading)return <Spinner/>;
  if(!data)return <div style={{color:T.t2,padding:20,textAlign:'center'}}>Could not load reports data.</div>;

  const SvgBar=({items,color=T.g,h=110})=>{
    const max=Math.max(...items.map(d=>d.v),1);const n=items.length;const sw=100/n;
    return <div><svg viewBox={`0 0 100 ${h}`} preserveAspectRatio="none" style={{width:'100%',height:h,display:'block'}}>
      {items.map((d,i)=>{const bh=Math.max(2,(d.v/max)*(h-18));return <rect key={i} x={i*sw+0.6} y={h-18-bh} width={sw-1.2} height={bh} fill={color} opacity={0.85} rx={1.5}/>;})}
    </svg><div style={{display:'flex',marginTop:2}}>{items.map((d,i)=><span key={i} style={{flex:1,textAlign:'center',fontSize:9,color:T.t3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',padding:'0 1px'}}>{d.l}</span>)}</div></div>;
  };

  const SvgLine=({items,color=T.bl,h=100})=>{
    const vals=items.map(d=>d.v);const max=Math.max(...vals,1);const n=items.length;
    if(n<2)return <SvgBar items={items} color={color} h={h}/>;
    const pts=vals.map((v,i)=>{const x=(i/(n-1))*96+2;const y=h-18-Math.max(2,(v/max)*(h-22));return `${x},${y}`;}).join(' ');
    const dots=vals.map((v,i)=>{const x=(i/(n-1))*96+2;const y=h-18-Math.max(2,(v/max)*(h-22));return {x,y,v};});
    return <div><svg viewBox={`0 0 100 ${h}`} preserveAspectRatio="none" style={{width:'100%',height:h,display:'block'}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
      {dots.map((d,i)=><circle key={i} cx={d.x} cy={d.y} r={2.5} fill={color}/>)}
    </svg><div style={{display:'flex',marginTop:2}}>{items.map((d,i)=><span key={i} style={{flex:1,textAlign:'center',fontSize:9,color:T.t3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',padding:'0 1px'}}>{d.l}</span>)}</div></div>;
  };

  const HBar=({label,value,max,color=T.g,sub})=>{
    const pct=max>0?Math.min(100,Math.round((value/max)*100)):0;
    return <div style={{marginBottom:10}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:13}}>
        <span style={{fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,marginRight:8}}>{label}</span>
        <span style={{color,fontWeight:700,whiteSpace:'nowrap'}}>{cur} {fmt(value)}{sub&&<span style={{color:T.t2,fontWeight:400,fontSize:11}}> · {sub}</span>}</span>
      </div>
      <div style={{height:8,borderRadius:4,background:T.inp}}><div style={{height:'100%',borderRadius:4,background:color,width:`${pct}%`,transition:'width .5s ease'}}/></div>
    </div>;
  };

  const months=data.months||[];const cust=data.customers||[];const emps=data.employees||[];
  const totalRev=months.reduce((s,m)=>s+m.revenue,0);
  const totalProfit=months.reduce((s,m)=>s+m.profit,0);
  const avgYield=months.filter(m=>m.yield>0).length>0?months.filter(m=>m.yield>0).reduce((s,m)=>s+m.yield,0)/months.filter(m=>m.yield>0).length:0;
  const maxCust=Math.max(...cust.map(c=>c.revenue),1);const maxEmp=Math.max(...emps.map(e=>e.earned),1);

  return <div className="fi">
    <PH title="Reports & Analytics" sub="Business intelligence — last 6 months of performance data"/>
    <G4 style={{marginBottom:16}}>
      <Stat label="6-Month Revenue" value={`${cur} ${fmt(totalRev)}`} color={T.g} icon={IC.receipt}/>
      <Stat label="6-Month Profit" value={`${cur} ${fmt(totalProfit)}`} color={totalProfit>=0?T.g:T.r} icon={IC.bar}/>
      <Stat label="Avg Flour Yield" value={avgYield>0?`${avgYield.toFixed(1)}%`:'—'} color={T.bl} icon={IC.factory} sub="Maize → Flour"/>
      <Stat label="Top Customer" value={cust[0]?.name?.split(' ')[0]||'—'} sub={cust[0]?`${cur} ${fmt(cust[0].revenue)}`:'No data'} color={T.p} icon={IC.star}/>
    </G4>

    <G2 style={{marginBottom:14}}>
      <Card>
        <h3 style={{fontFamily:FH,fontSize:15,fontWeight:700,marginBottom:2}}>Monthly Revenue</h3>
        <p style={{fontSize:11,color:T.t2,marginBottom:10}}>Total sales income per month</p>
        <SvgBar items={months.map(m=>({l:m.label,v:m.revenue}))} color={T.g}/>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:10,fontSize:12,color:T.t2}}>
          <span>Total: <strong style={{color:T.g}}>{cur} {fmt(totalRev)}</strong></span>
          <span>Avg/mo: <strong>{cur} {fmt(months.length?totalRev/months.length:0)}</strong></span>
        </div>
      </Card>
      <Card>
        <h3 style={{fontFamily:FH,fontSize:15,fontWeight:700,marginBottom:2}}>Monthly Profit / Loss</h3>
        <p style={{fontSize:11,color:T.t2,marginBottom:10}}>Revenue minus all costs (purchases + expenses + labour)</p>
        <SvgBar items={months.map(m=>({l:m.label,v:Math.max(0,m.profit)}))} color={totalProfit>=0?T.g:T.r}/>
        <div style={{marginTop:10}}>
          {months.map(m=><div key={m.label} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'2px 0'}}>
            <span style={{color:T.t2}}>{m.label}</span>
            <span style={{fontWeight:700,color:m.profit>=0?T.g:T.r}}>{cur} {fmt(m.profit)}</span>
          </div>)}
        </div>
      </Card>
    </G2>

    <G2 style={{marginBottom:14}}>
      <Card>
        <h3 style={{fontFamily:FH,fontSize:15,fontWeight:700,marginBottom:2}}>Flour Yield Trend</h3>
        <p style={{fontSize:11,color:T.t2,marginBottom:10}}>Percentage of maize converted to flour per month</p>
        <SvgLine items={months.map(m=>({l:m.label,v:m.yield||0}))} color={T.bl}/>
        <div style={{marginTop:10,fontSize:12,textAlign:'center',color:T.t2}}>6-month average: <strong style={{color:T.bl}}>{avgYield>0?avgYield.toFixed(1):0}%</strong></div>
      </Card>
      <Card>
        <h3 style={{fontFamily:FH,fontSize:15,fontWeight:700,marginBottom:2}}>Revenue vs Costs</h3>
        <p style={{fontSize:11,color:T.t2,marginBottom:10}}>Side-by-side comparison each month</p>
        {months.map(m=>{const mv=Math.max(m.revenue,m.costs,1);return <div key={m.label} style={{marginBottom:8}}>
          <div style={{fontSize:11,fontWeight:700,marginBottom:3,color:T.t2}}>{m.label}</div>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
            <div style={{width:44,fontSize:10,color:T.g,textAlign:'right',fontWeight:600}}>Rev</div>
            <div style={{flex:1,height:10,borderRadius:3,background:T.inp,overflow:'hidden'}}><div style={{height:'100%',background:T.g,width:`${(m.revenue/mv)*100}%`,borderRadius:3}}/></div>
            <div style={{width:80,fontSize:10,textAlign:'right'}}>{cur} {fmt(m.revenue)}</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <div style={{width:44,fontSize:10,color:T.r,textAlign:'right',fontWeight:600}}>Cost</div>
            <div style={{flex:1,height:10,borderRadius:3,background:T.inp,overflow:'hidden'}}><div style={{height:'100%',background:T.r,width:`${(m.costs/mv)*100}%`,borderRadius:3}}/></div>
            <div style={{width:80,fontSize:10,textAlign:'right'}}>{cur} {fmt(m.costs)}</div>
          </div>
        </div>;})}
      </Card>
    </G2>

    <G2>
      <Card>
        <h3 style={{fontFamily:FH,fontSize:15,fontWeight:700,marginBottom:14}}>Top Customers by Revenue</h3>
        {cust.length===0?<p style={{color:T.t3,fontSize:13,textAlign:'center',padding:20}}>No sales data yet</p>:cust.slice(0,8).map((c,i)=><HBar key={c.name} label={`${i+1}. ${c.name}`} value={c.revenue} max={maxCust} color={T.g} sub={`${c.orders} order${c.orders!==1?'s':''}`}/>)}
      </Card>
      <Card>
        <h3 style={{fontFamily:FH,fontSize:15,fontWeight:700,marginBottom:14}}>Top Employees by Earnings</h3>
        {emps.length===0?<p style={{color:T.t3,fontSize:13,textAlign:'center',padding:20}}>No work log data yet</p>:emps.slice(0,8).map((e,i)=><HBar key={e.id||i} label={`${i+1}. ${e.name}`} value={e.earned} max={maxEmp} color={T.bl} sub={`${e.tasks} task${e.tasks!==1?'s':''}`}/>)}
      </Card>
    </G2>
  </div>;
}
