import { useState, useEffect, useCallback, useRef } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { authAPI, companyAPI, usersAPI, employeesAPI, taskTypesAPI, workLogsAPI, paymentsAPI, batchesAPI, purchasesAPI, expensesAPI, salesAPI, ordersAPI, customersAPI, stockAdjAPI, inventoryAPI, dashboardAPI, financeAPI, auditAPI, backupAPI, reportsAPI, pendingAPI, feedbackAPI, superAPI, aiAPI, invoicesAPI, newsAPI, communityAPI } from './api';
import MarketingPage from './MarketingPage';
import DailySummaryWidget from './components/DailySummaryWidget';

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

// ── Branded documents (receipts & invoices) ─────────────────────────────
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
const money = (cur, n) => `${cur} ${new Intl.NumberFormat('en-UG').format(Math.round(n || 0))}`;

// Opens a print-ready window and (optionally) auto-triggers the print dialog.
const openDoc = (html, { print = false } = {}) => {
  const w = window.open('', '_blank', 'width=420,height=720');
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  if (print) { w.focus(); w.onload = () => { try { w.print(); } catch (_) {} }; setTimeout(() => { try { w.focus(); w.print(); } catch (_) {} }, 600); }
  return true;
};

// Downloads a self-contained HTML document (opens & prints itself in any browser).
const downloadDoc = (filename, html) => {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};

// 80mm thermal-style receipt for a recorded sale.
const receiptHTML = (sale, co = {}) => {
  const cur = co.currency || 'UGX';
  const logo = (co.logo && co.logo.length <= 4) ? co.logo : '🌾';
  const items = (sale.items || []).map(it => `
    <tr><td>${esc(it.itemType)}<div class="sub">${new Intl.NumberFormat('en-UG').format(it.quantity)} × ${money(cur, it.unitPrice)}</div></td>
    <td class="r">${money(cur, it.lineTotal)}</td></tr>`).join('');
  const paid = sale.paidAmount != null ? sale.paidAmount : sale.total;
  const bal = (sale.total || 0) - (paid || 0);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt ${esc(sale.receiptNo)}</title>
<style>
  @page{size:80mm auto;margin:0}
  *{box-sizing:border-box}
  body{font-family:'Courier New',monospace;width:80mm;margin:0 auto;padding:10px 12px;color:#000;font-size:12px;line-height:1.45}
  .c{text-align:center}.r{text-align:right}.b{font-weight:700}
  .logo{font-size:30px;line-height:1}
  h1{font-size:16px;margin:4px 0 2px;letter-spacing:.5px}
  .muted{color:#333;font-size:11px}
  hr{border:none;border-top:1px dashed #000;margin:8px 0}
  table{width:100%;border-collapse:collapse}
  td{padding:3px 0;vertical-align:top}
  .sub{font-size:10px;color:#444}
  .tot{font-size:15px}
  .pill{display:inline-block;border:1px solid #000;border-radius:10px;padding:1px 8px;font-size:10px;margin-top:4px}
  .ft{margin-top:10px;font-size:10px}
  @media screen{body{box-shadow:0 0 0 1px #ddd;margin-top:16px;border-radius:6px}.noprint{display:block}}
  @media print{.noprint{display:none}}
  .btn{display:block;width:100%;margin:14px 0 4px;padding:10px;border:none;border-radius:8px;background:#247529;color:#fff;font-size:13px;font-weight:700;cursor:pointer}
</style></head><body>
  <div class="c"><div class="logo">${logo}</div><h1>${esc(co.name || 'MillPro Mill')}</h1>
  ${co.address ? `<div class="muted">${esc(co.address)}</div>` : ''}
  ${co.phone ? `<div class="muted">Tel: ${esc(co.phone)}</div>` : ''}</div>
  <hr>
  <div><span class="b">Receipt:</span> ${esc(sale.receiptNo)}</div>
  <div><span class="b">Date:</span> ${new Date(sale.date || Date.now()).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
  <div><span class="b">Customer:</span> ${esc(sale.customer || 'Walk-in')}</div>
  ${sale.phone ? `<div><span class="b">Phone:</span> ${esc(sale.phone)}</div>` : ''}
  ${sale.createdBy ? `<div><span class="b">Served by:</span> ${esc(sale.createdBy)}</div>` : ''}
  <hr>
  <table>${items}</table>
  <hr>
  <table>
    <tr class="b tot"><td>TOTAL</td><td class="r">${money(cur, sale.total)}</td></tr>
    <tr><td>Paid (${esc(sale.payMethod || 'Cash')})</td><td class="r">${money(cur, paid)}</td></tr>
    ${bal > 0 ? `<tr class="b"><td>Balance Due</td><td class="r">${money(cur, bal)}</td></tr>` : ''}
  </table>
  <div class="c"><span class="pill">${bal > 0 ? 'PARTIALLY PAID' : 'PAID'}</span></div>
  ${sale.notes ? `<hr><div class="muted">Note: ${esc(sale.notes)}</div>` : ''}
  <hr>
  <div class="c ft b">Thank you for your business!</div>
  <div class="c ft muted">Powered by MillPro Enterprise</div>
  <button class="btn noprint" onclick="window.print()">🖨 Print Receipt</button>
</body></html>`;
};

// A4 professional invoice.
const invoiceHTML = (inv, co = {}) => {
  const cur = co.currency || inv.currency || 'UGX';
  const logo = (co.logo && co.logo.length <= 4) ? co.logo : '🌾';
  const rows = (inv.items || []).map((it, i) => `
    <tr><td>${i + 1}</td><td>${esc(it.description || it.itemType)}</td>
    <td class="r">${new Intl.NumberFormat('en-UG').format(it.quantity)}</td>
    <td class="r">${money(cur, it.unitPrice)}</td>
    <td class="r">${money(cur, it.lineTotal)}</td></tr>`).join('');
  const sub = inv.subtotal != null ? inv.subtotal : (inv.items || []).reduce((s, i) => s + (i.lineTotal || 0), 0);
  const taxAmt = (sub * (inv.taxRate || 0)) / 100;
  const grand = inv.total != null ? inv.total : sub + taxAmt;
  const due = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${esc(inv.invoiceNo)}</title>
<style>
  @page{size:A4;margin:0}
  *{box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;margin:0;color:#1a1f1a;background:#fff}
  .page{max-width:800px;margin:0 auto;padding:48px 52px}
  .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #247529;padding-bottom:22px}
  .brand{display:flex;gap:12px;align-items:center}
  .logo{font-size:42px}
  .co h1{margin:0;font-size:22px;color:#0c150c}
  .co .m{color:#5e6e5e;font-size:12.5px;margin-top:3px;line-height:1.5}
  .doc{text-align:right}
  .doc h2{margin:0;font-size:30px;letter-spacing:2px;color:#247529}
  .doc .m{font-size:12.5px;color:#5e6e5e;margin-top:6px;line-height:1.7}
  .doc .m b{color:#1a1f1a}
  .parties{display:flex;justify-content:space-between;margin:26px 0}
  .parties .lbl{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#98a698;margin-bottom:6px;font-weight:700}
  .parties .nm{font-size:15px;font-weight:700}
  .parties .m{font-size:12.5px;color:#5e6e5e;line-height:1.6;margin-top:2px}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  thead th{background:#0c150c;color:#fff;font-size:11px;letter-spacing:.5px;text-transform:uppercase;padding:11px 12px;text-align:left}
  thead th.r{text-align:right}
  tbody td{padding:11px 12px;border-bottom:1px solid #ede8df;font-size:13px}
  tbody td.r{text-align:right}
  tbody tr:nth-child(even){background:#faf8f3}
  .totals{margin-top:18px;display:flex;justify-content:flex-end}
  .totals table{width:300px}
  .totals td{padding:7px 4px;font-size:13.5px;border:none}
  .totals .r{text-align:right}
  .totals .grand td{border-top:2px solid #247529;font-size:17px;font-weight:800;color:#247529;padding-top:11px}
  .notes{margin-top:30px;font-size:12.5px;color:#5e6e5e;border-top:1px solid #ede8df;padding-top:14px;line-height:1.6}
  .status{display:inline-block;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:800;letter-spacing:.5px}
  .footer{margin-top:40px;text-align:center;font-size:11px;color:#98a698}
  .noprint{position:fixed;top:14px;right:14px}
  .btn{padding:10px 18px;border:none;border-radius:8px;background:#247529;color:#fff;font-weight:700;cursor:pointer;font-size:13px;box-shadow:0 4px 14px rgba(0,0,0,.15)}
  @media print{.noprint{display:none}.page{padding:30px 36px}}
</style></head><body>
  <div class="noprint"><button class="btn" onclick="window.print()">🖨 Print / Save PDF</button></div>
  <div class="page">
    <div class="top">
      <div class="brand"><div class="logo">${logo}</div>
        <div class="co"><h1>${esc(co.name || 'MillPro Mill')}</h1>
          <div class="m">${co.address ? esc(co.address) + '<br>' : ''}${co.phone ? 'Tel: ' + esc(co.phone) : ''}</div></div>
      </div>
      <div class="doc"><h2>INVOICE</h2>
        <div class="m"><b>${esc(inv.invoiceNo)}</b><br>
          Issued: ${new Date(inv.date || Date.now()).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}<br>
          Due: ${due}<br>
          <span class="status" style="background:${inv.status==='PAID'?'#e3f5e4':'#fdf3dc'};color:${inv.status==='PAID'?'#247529':'#bf8c1a'}">${esc(inv.status || 'UNPAID')}</span>
        </div>
      </div>
    </div>
    <div class="parties">
      <div><div class="lbl">Bill To</div><div class="nm">${esc(inv.customer || 'Customer')}</div>
        <div class="m">${inv.customerPhone ? esc(inv.customerPhone) + '<br>' : ''}${inv.customerAddress ? esc(inv.customerAddress) : ''}</div></div>
      <div style="text-align:right"><div class="lbl">Amount Due</div>
        <div class="nm" style="font-size:24px;color:#247529">${money(cur, grand)}</div></div>
    </div>
    <table>
      <thead><tr><th style="width:30px">#</th><th>Description</th><th class="r">Qty</th><th class="r">Unit Price</th><th class="r">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals"><table>
      <tr><td>Subtotal</td><td class="r">${money(cur, sub)}</td></tr>
      ${inv.taxRate ? `<tr><td>Tax (${inv.taxRate}%)</td><td class="r">${money(cur, taxAmt)}</td></tr>` : ''}
      <tr class="grand"><td>Total</td><td class="r">${money(cur, grand)}</td></tr>
    </table></div>
    ${inv.notes ? `<div class="notes"><b>Notes:</b> ${esc(inv.notes)}</div>` : ''}
    <div class="notes"><b>Payment terms:</b> Please make payment by the due date. Thank you for your business.</div>
    <div class="footer">${esc(co.name || 'MillPro Mill')} · Generated by MillPro Enterprise</div>
  </div>
</body></html>`;
};


const T = { bg:'#F5F1EA',card:'#FFFFFF',side:'#0C150C',sA:'#264226',p:'#BF8C1A',pL:'#FDF3DC',ac:'#C74B1A',acL:'#FDE8DB',g:'#247529',gL:'#E3F5E4',r:'#B71C1C',rL:'#FFEBEE',txt:'#151A15',t2:'#5E6E5E',t3:'#98A698',brd:'#DED8CC',inp:'#F2ECE2',bl:'#1255A0',blL:'#E3F2FD',pu:'#6A1B9A',tl:'#00796B' };
const FH = "'Playfair Display',serif";
const PM_LABEL = { PER_UNIT:'Per Unit', PER_HOUR:'Per Hour', PER_SHIFT:'Per Shift' };
const ORD_COL = { Pending:T.p, Processing:T.bl, Packed:T.pu, Dispatched:T.ac, Completed:T.g, Cancelled:T.r };
const PAY_METHODS = ['Cash','Mobile Money','Bank Transfer'];
const EXP_CATS = ['Maize Purchase','Packaging','Fuel/Electricity','Transport','Maintenance','Rent','Salaries','Other'];
const ORD_STATUS = ['Pending','Processing','Packed','Dispatched','Completed','Cancelled'];

const I = ({d,sz=18,c='currentColor'}) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
const IC = { home:"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",users:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",clip:"M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2 M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z",box:"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12",cart:"M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6",dollar:"M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",receipt:"M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0",factory:"M2 20h20 M5 20V8l5 4V8l5 4V4h3v16",truck:"M1 3h15v13H1z M16 8h4l3 3v5h-7V8z M5.5 18.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M18.5 18.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",log:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",settings:"M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",plus:"M12 5v14 M5 12h14",edit:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",trash:"M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",check:"M20 6L9 17l-5-5",x:"M18 6L6 18 M6 6l12 12",dl:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3",lock:"M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M7 11V7a5 5 0 0 1 10 0v4",logout:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",alert:"M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01",bar:"M18 20V10 M12 20V4 M6 20v-6",pay:"M21 4H3v16h18V4z M1 10h22",eye:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",shield:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",clock:"M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6v6l4 2",backup:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12",trend:"M23 6l-9.5 9.5-5-5L1 18",star:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",sparkle:"M12 3v3 M12 18v3 M3 12h3 M18 12h3 M5.6 5.6l2.1 2.1 M16.3 16.3l2.1 2.1 M5.6 18.4l2.1-2.1 M16.3 7.7l2.1-2.1",send:"M22 2L11 13 M22 2l-7 20-4-9-9-4 20-7z",sparkles:"M12 2l1.5 4 4 1.5-4 1.5L12 13l-1.5-4-4-1.5 4-1.5L12 2z M19 13l.8 2.1 2.2.9-2.2.9-.8 2.1-.8-2.1-2.2-.9 2.2-.9.8-2.1z M5 15l.7 1.8 1.8.7-1.8.7L5 20l-.7-1.8-1.8-.7 1.8-.7L5 15z", invoice:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M9 9h1", print:"M6 9V2h12v7 M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2 M6 14h12v8H6z", globe:"M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z", news:"M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9h4 M18 14h-8 M15 18h-5 M10 6h8v4h-8z", chat:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", heart:"M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z", comment:"M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z", refresh:"M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0 0 20.49 15", send2:"M22 2L11 13 M22 2l-7 20-4-9-9-4 20-7z" };

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
// MARKETING / HOME PAGE  — IMMERSIVE 3D
// ══════════════════════════════════════════


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
  const [isSuperRoute] = useState(() => typeof window !== 'undefined' && window.location.pathname.startsWith('/super'));
  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),2500); };

  useEffect(() => {
    if (isSuperRoute) return;
    if (loading) return;
    if (user) { setAppState('main'); return; }
    setAppState('home');
  }, [loading, user, isSuperRoute]);

  // ── Super admin route bypasses normal company auth entirely ──
  if (isSuperRoute) return <><SuperRouter showToast={showToast}/>{toast&&<Toast {...toast}/>}</>;

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
const _AUTH_GOLD='#C9961E', _AUTH_GOLD2='#E8B84B', _AUTH_GRN='#1A7A20', _AUTH_GRN2='#2E8B35';
const AuthShell = ({children, maxWidth=460}) => (
  <div style={{
    minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',
    background:`radial-gradient(ellipse at 50% 20%,#122016 0%,#0A120A 55%,#050C07 100%)`,
    padding:'40px 24px',position:'relative',overflow:'hidden',
    fontFamily:"'Inter',system-ui,sans-serif"
  }}>
    <style>{`
      @keyframes mp-auth-rise { from{opacity:0;transform:translateY(24px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
      @keyframes mp-auth-pulse { 0%,100%{opacity:.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} }
      .mp-ai:focus { border-color:${_AUTH_GOLD} !important; box-shadow:0 0 0 4px ${_AUTH_GOLD}1f !important; background:rgba(255,255,255,0.06) !important; }
      .mp-ab { transition:transform .22s,box-shadow .22s,background .22s,border-color .22s; }
      .mp-ab:hover:not(:disabled) { transform:translateY(-2px); }
      .mp-ab-prim:hover:not(:disabled) { box-shadow:0 16px 44px ${_AUTH_GRN}66; }
      .mp-ab-gold:hover:not(:disabled) { box-shadow:0 14px 36px ${_AUTH_GOLD}55; }
      .mp-ab-ghost:hover:not(:disabled) { background:${_AUTH_GOLD}18 !important; border-color:${_AUTH_GOLD}66 !important; color:${_AUTH_GOLD2} !important; }
      .mp-al:hover { color:${_AUTH_GOLD2} !important; }
    `}</style>
    <div style={{position:'absolute',inset:'-10%',pointerEvents:'none',
      background:`
        radial-gradient(ellipse 720px 520px at 28% 28%,${_AUTH_GRN}33 0%,transparent 55%),
        radial-gradient(ellipse 620px 420px at 72% 72%,${_AUTH_GOLD}26 0%,transparent 55%)
      `,filter:'blur(40px)'}}/>
    <div style={{position:'absolute',inset:0,backgroundImage:`linear-gradient(${_AUTH_GOLD}07 1px,transparent 1px),linear-gradient(90deg,${_AUTH_GOLD}07 1px,transparent 1px)`,backgroundSize:'80px 80px',pointerEvents:'none'}}/>
    <div style={{position:'relative',width:'100%',maxWidth,animation:'mp-auth-rise .6s cubic-bezier(.2,.8,.2,1) both'}}>
      {children}
    </div>
  </div>
);

const AuthBrand = ({title='MillPro', sub='Enterprise Milling Management System'}) => (
  <div style={{textAlign:'center',marginBottom:32}}>
    <div style={{
      width:66,height:66,borderRadius:18,margin:'0 auto 20px',
      background:`linear-gradient(135deg,${_AUTH_GOLD},${_AUTH_GOLD2})`,
      display:'flex',alignItems:'center',justifyContent:'center',
      fontSize:30,fontWeight:900,color:'#000',fontFamily:FH,letterSpacing:-1,
      boxShadow:`0 16px 44px ${_AUTH_GOLD}66,inset 0 2px 0 rgba(255,255,255,0.4),0 0 0 1px ${_AUTH_GOLD2}`,
    }}>M</div>
    <h1 style={{fontFamily:FH,fontSize:32,fontWeight:900,color:'#fff',letterSpacing:-1,marginBottom:6}}>{title}</h1>
    <p style={{color:'rgba(255,255,255,.42)',fontSize:13.5,letterSpacing:.3}}>{sub}</p>
  </div>
);

const authGlass = {
  background:'linear-gradient(160deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))',
  borderRadius:22,padding:34,
  border:`1px solid ${_AUTH_GOLD}1f`,
  backdropFilter:'blur(18px)',
  boxShadow:`0 30px 80px rgba(0,0,0,0.55),inset 0 1px 0 rgba(255,255,255,0.05)`,
};
const authInp = {
  width:'100%',padding:'14px 16px',borderRadius:12,
  border:`1px solid rgba(255,255,255,0.10)`,
  background:'rgba(255,255,255,0.035)',color:'#fff',
  fontSize:14,outline:'none',transition:'all .25s',boxSizing:'border-box',
};
const authLbl = {
  fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.5)',
  textTransform:'uppercase',letterSpacing:1.2,marginBottom:8,display:'block'
};
const authBtnPrim = {
  width:'100%',padding:'15px 24px',borderRadius:12,border:'none',cursor:'pointer',
  background:`linear-gradient(135deg,${_AUTH_GRN},${_AUTH_GRN2})`,
  color:'#fff',fontWeight:700,fontSize:14.5,letterSpacing:.3,
  boxShadow:`0 8px 24px ${_AUTH_GRN}55,inset 0 1px 0 rgba(255,255,255,0.18)`,
};

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

  return <AuthShell>
    <AuthBrand/>

    {regCode && <div style={{
      marginBottom:22,padding:'22px 26px',borderRadius:18,
      background:`rgba(36,117,41,0.10)`,border:`1px solid ${_AUTH_GRN}55`,
      backdropFilter:'blur(12px)',boxShadow:`0 0 30px ${_AUTH_GRN}33`,textAlign:'center'
    }}>
      <div style={{fontSize:11,color:`${_AUTH_GRN2}`,marginBottom:8,textTransform:'uppercase',letterSpacing:1.4,fontWeight:700}}>Your Company Code</div>
      <div style={{fontSize:38,fontWeight:900,color:'#fff',fontFamily:'monospace',letterSpacing:6,marginBottom:10}}>{regCode}</div>
      <div style={{fontSize:12.5,color:'rgba(255,255,255,.55)',lineHeight:1.6}}>Save this — you'll need it to sign in every time.</div>
      <button onClick={onClearCode} className="mp-al" style={{marginTop:12,background:'none',border:'none',color:'rgba(255,255,255,.4)',cursor:'pointer',fontSize:11,letterSpacing:.5,fontWeight:600,transition:'color .2s'}}>Dismiss</button>
    </div>}

    <div style={authGlass}>
      <label style={authLbl}>Company Sign-In Code</label>
      <input value={code} className="mp-ai"
        onChange={e=>{setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''));setErr('');}}
        onKeyDown={e=>e.key==='Enter'&&lookup()}
        placeholder="e.g. JGM001" maxLength={8}
        style={{...authInp,
          padding:'18px 18px',fontSize:22,fontWeight:700,letterSpacing:6,textAlign:'center',
          fontFamily:'monospace',marginBottom:err?8:18,
          borderColor:err?'rgba(255,82,82,0.5)':'rgba(255,255,255,0.10)'}}/>
      {err && <p style={{color:'#ff7a7a',fontSize:12.5,margin:'0 0 14px',textAlign:'center',fontWeight:500,letterSpacing:.2}}>{err}</p>}
      <button onClick={lookup} disabled={loading} className="mp-ab mp-ab-prim" style={{...authBtnPrim,
        background:loading?'rgba(80,80,80,0.5)':authBtnPrim.background,
        cursor:loading?'not-allowed':'pointer',
        boxShadow:loading?'none':authBtnPrim.boxShadow}}>
        {loading?'Looking up…':'Continue →'}
      </button>
    </div>

    <button onClick={onRegister} className="mp-ab mp-ab-ghost" style={{
      display:'flex',alignItems:'center',gap:10,padding:'15px 24px',borderRadius:12,
      border:`1px solid ${_AUTH_GOLD}40`,background:`${_AUTH_GOLD}10`,
      color:_AUTH_GOLD2,cursor:'pointer',fontSize:13.5,fontWeight:600,
      width:'100%',justifyContent:'center',backdropFilter:'blur(12px)',marginTop:18
    }}>
      <I d={IC.plus} sz={15} c={_AUTH_GOLD2}/> Register a New Milling Company
    </button>

    {onBack && <button onClick={onBack} className="mp-al" style={{
      background:'none',border:'none',color:'rgba(255,255,255,.35)',
      cursor:'pointer',fontSize:12,padding:'16px 0 0',width:'100%',letterSpacing:.3,
      transition:'color .2s'
    }}>← Back to home</button>}
  </AuthShell>;
}

// ══════════════════════════════════════════
// REGISTER
// ══════════════════════════════════════════
// Hoisted out of Register: defined inline caused inputs to lose focus on each keystroke
// (component identity changed every render, remounting every <input>).
const DarkField = ({label, hint, children}) => (
  <div style={{display:'flex',flexDirection:'column',gap:6}}>
    <label style={authLbl}>{label}</label>
    {children}
    {hint && <p style={{fontSize:11.5,color:'rgba(255,255,255,0.4)',marginTop:2,letterSpacing:.2}}>{hint}</p>}
  </div>
);
const DarkInput = (props) => <input {...props} className="mp-ai" style={{...authInp,...props.style}}/>;
  const DarkSelect = ({options=[],...p}) => <select {...p} className="mp-ai" style={{...authInp,cursor:'pointer',appearance:'none',backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23C9961E' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,backgroundRepeat:'no-repeat',backgroundPosition:'right 16px center',paddingRight:40,...p.style}}>
    {options.map(o => <option key={o.v??o} value={o.v??o} style={{background:'#0F1C12',color:'#fff'}}>{o.l??o}</option>)}
  </select>;

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


  // ── Success screen ──
  if (result) return <AuthShell maxWidth={500}>
    <AuthBrand title={result.companyName} sub="Your mill is set up — welcome aboard"/>
    <div style={{...authGlass,textAlign:'center'}}>
      {/* Refined success mark */}
      <div style={{width:62,height:62,borderRadius:'50%',margin:'0 auto 22px',
        background:`radial-gradient(circle at 30% 30%,${_AUTH_GRN2},${_AUTH_GRN})`,
        display:'flex',alignItems:'center',justifyContent:'center',
        boxShadow:`0 12px 36px ${_AUTH_GRN}66,0 0 0 4px ${_AUTH_GRN}22,inset 0 2px 0 rgba(255,255,255,0.25)`}}>
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
      </div>
      <div style={{fontSize:11,color:_AUTH_GOLD,textTransform:'uppercase',letterSpacing:1.6,fontWeight:700,marginBottom:10}}>Your Company Sign-In Code</div>
      <div style={{
        fontSize:48,fontWeight:900,color:'#fff',fontFamily:'monospace',letterSpacing:8,
        marginBottom:14,padding:'22px 16px',
        background:`linear-gradient(135deg,${_AUTH_GOLD}15,${_AUTH_GOLD}05)`,
        border:`1px solid ${_AUTH_GOLD}40`,borderRadius:16,
        boxShadow:`0 0 40px ${_AUTH_GOLD}33,inset 0 1px 0 rgba(255,255,255,0.05)`,
        textShadow:`0 0 30px ${_AUTH_GOLD}88`
      }}>{result.companyCode}</div>
      <p style={{fontSize:13,color:'rgba(255,255,255,.55)',lineHeight:1.65,marginBottom:24}}>
        Share this code with your team — everyone uses it to find your company when signing in.
      </p>
      <button onClick={()=>onDone(result.companyCode)} className="mp-ab mp-ab-prim" style={authBtnPrim}>
        Go to Sign In →
      </button>
    </div>
  </AuthShell>;

  // ── Wizard ──
  const stepLabels=['Company','Owner','Admin'];
  return <AuthShell maxWidth={540}>
    <AuthBrand title="Set Up Your Mill" sub="Three quick steps to launch your company"/>

    <div style={authGlass}>
      {/* Step indicator */}
      <div style={{display:'flex',gap:10,justifyContent:'center',marginBottom:30,alignItems:'center'}}>
        {[0,1,2].map(i => <div key={i} style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{
            width:i===step?42:30,height:30,borderRadius:15,
            display:'flex',alignItems:'center',justifyContent:'center',
            background:i<step?`${_AUTH_GRN}`:i===step?`linear-gradient(135deg,${_AUTH_GOLD},${_AUTH_GOLD2})`:'rgba(255,255,255,0.05)',
            border:`1px solid ${i<=step?'transparent':'rgba(255,255,255,0.08)'}`,
            color:i<=step?'#000':'rgba(255,255,255,0.4)',
            fontSize:11,fontWeight:800,letterSpacing:.5,
            transition:'all .35s cubic-bezier(.2,.8,.2,1)',
            boxShadow:i===step?`0 6px 20px ${_AUTH_GOLD}55`:'none'
          }}>{i<step?'✓':stepLabels[i]}</div>
          {i<2 && <div style={{width:24,height:1,background:i<step?_AUTH_GRN:'rgba(255,255,255,0.08)',transition:'background .35s'}}/>}
        </div>)}
      </div>

      {err && <div style={{padding:'12px 16px',background:'rgba(183,28,28,0.10)',border:`1px solid rgba(255,82,82,0.3)`,borderRadius:10,color:'#ff8a80',fontSize:13,marginBottom:18,fontWeight:500}}>{err}</div>}

      {step===0 && <div style={{display:'flex',flexDirection:'column',gap:16}}>
        <DarkField label="Company Name *">
          <DarkInput value={f.companyName} onChange={e=>setF({...f,companyName:e.target.value})} placeholder="e.g. Mukasa Maize Millers"/>
        </DarkField>
        <DarkField label="Phone">
          <DarkInput value={f.companyPhone} onChange={e=>setF({...f,companyPhone:e.target.value})} placeholder="+256 700 000 000"/>
        </DarkField>
        <DarkField label="Address">
          <DarkInput value={f.companyAddress} onChange={e=>setF({...f,companyAddress:e.target.value})} placeholder="Town, District"/>
        </DarkField>
        <DarkField label="Currency">
          <DarkSelect value={f.currency} onChange={e=>setF({...f,currency:e.target.value})} options={[{v:'UGX',l:'UGX — Ugandan Shilling'},{v:'KES',l:'KES — Kenyan Shilling'},{v:'TZS',l:'TZS — Tanzanian Shilling'},{v:'USD',l:'USD — US Dollar'}]}/>
        </DarkField>
        <DarkField label="Custom Sign-In Code (optional)" hint="3–8 letters & numbers, e.g. MKS001 — auto-generated if blank.">
          <DarkInput value={f.companyCode} onChange={e=>setF({...f,companyCode:e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8)})} placeholder="Leave blank for auto-generated" style={{letterSpacing:3,fontFamily:'monospace',textTransform:'uppercase'}}/>
        </DarkField>
        <div style={{display:'flex',gap:10,marginTop:8}}>
          <button onClick={onBack} className="mp-ab mp-ab-ghost" style={{padding:'13px 22px',borderRadius:12,border:`1px solid rgba(255,255,255,0.1)`,background:'rgba(255,255,255,0.03)',color:'rgba(255,255,255,0.7)',cursor:'pointer',fontSize:13.5,fontWeight:600}}>← Back</button>
          <button disabled={!f.companyName.trim()} onClick={()=>setStep(1)} className="mp-ab mp-ab-prim" style={{...authBtnPrim,flex:1,opacity:!f.companyName.trim()?.4:1,cursor:!f.companyName.trim()?'not-allowed':'pointer'}}>Continue →</button>
        </div>
      </div>}

      {step===1 && <div style={{display:'flex',flexDirection:'column',gap:16}}>
        <div style={{padding:'14px 16px',background:`${_AUTH_GOLD}10`,border:`1px solid ${_AUTH_GOLD}33`,borderRadius:12,fontSize:13,color:_AUTH_GOLD2,lineHeight:1.55}}>
          <strong style={{color:'#fff',fontWeight:700}}>Owner account</strong> — full access: reports, finance, payroll approval, user management.
        </div>
        <DarkField label="Owner Name *"><DarkInput value={f.ownerName} onChange={e=>setF({...f,ownerName:e.target.value})}/></DarkField>
        <DarkField label="Email *"><DarkInput type="email" value={f.ownerEmail} onChange={e=>setF({...f,ownerEmail:e.target.value})} placeholder="owner@company.com"/></DarkField>
        <DarkField label="Password *" hint="Minimum 8 characters."><DarkInput type="password" value={f.ownerPassword} onChange={e=>setF({...f,ownerPassword:e.target.value})} placeholder="••••••••"/></DarkField>
        <div style={{display:'flex',gap:10,marginTop:8}}>
          <button onClick={()=>setStep(0)} className="mp-ab mp-ab-ghost" style={{padding:'13px 22px',borderRadius:12,border:`1px solid rgba(255,255,255,0.1)`,background:'rgba(255,255,255,0.03)',color:'rgba(255,255,255,0.7)',cursor:'pointer',fontSize:13.5,fontWeight:600}}>← Back</button>
          <button disabled={!f.ownerName||!f.ownerEmail||f.ownerPassword.length<8} onClick={()=>setStep(2)} className="mp-ab mp-ab-prim" style={{...authBtnPrim,flex:1,opacity:(!f.ownerName||!f.ownerEmail||f.ownerPassword.length<8)?.4:1,cursor:(!f.ownerName||!f.ownerEmail||f.ownerPassword.length<8)?'not-allowed':'pointer'}}>Continue →</button>
        </div>
      </div>}

      {step===2 && <div style={{display:'flex',flexDirection:'column',gap:16}}>
        <div style={{padding:'14px 16px',background:`${_AUTH_GRN}12`,border:`1px solid ${_AUTH_GRN}44`,borderRadius:12,fontSize:13,color:'#9DD8A0',lineHeight:1.55}}>
          <strong style={{color:'#fff',fontWeight:700}}>Admin account</strong> <span style={{opacity:.7}}>(optional)</span> — data entry: purchases, production, sales, work logs.
        </div>
        <DarkField label="Admin Name"><DarkInput value={f.adminName} onChange={e=>setF({...f,adminName:e.target.value})}/></DarkField>
        <DarkField label="Email"><DarkInput type="email" value={f.adminEmail} onChange={e=>setF({...f,adminEmail:e.target.value})}/></DarkField>
        <DarkField label="Password" hint="Minimum 8 characters."><DarkInput type="password" value={f.adminPassword} onChange={e=>setF({...f,adminPassword:e.target.value})} placeholder="••••••••"/></DarkField>
        <div style={{display:'flex',gap:10,marginTop:8}}>
          <button onClick={()=>setStep(1)} className="mp-ab mp-ab-ghost" style={{padding:'13px 22px',borderRadius:12,border:`1px solid rgba(255,255,255,0.1)`,background:'rgba(255,255,255,0.03)',color:'rgba(255,255,255,0.7)',cursor:'pointer',fontSize:13.5,fontWeight:600}}>← Back</button>
          <button disabled={loading} onClick={finish} className="mp-ab mp-ab-prim" style={{...authBtnPrim,flex:1,background:loading?'rgba(80,80,80,0.5)':authBtnPrim.background,cursor:loading?'not-allowed':'pointer',boxShadow:loading?'none':authBtnPrim.boxShadow}}>{loading?'Creating your company…':`Launch ${f.companyName||'My Mill'} →`}</button>
        </div>
      </div>}
    </div>
  </AuthShell>;
}


// ══════════════════════════════════════════
// LOGIN — click user tile → enter password
// ══════════════════════════════════════════
function LoginPage({company,users:initialUsers=[],onSuccess,onBack,showToast}) {
  const [users]=useState(initialUsers);
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

  const roleColor={OWNER:_AUTH_GOLD,ADMIN:'#1F8AE8',SUPERVISOR:_AUTH_GRN};

  return <AuthShell maxWidth={500}>
    <AuthBrand title={company?.name||'MillPro'} sub={sel?'Enter your password to continue':'Select your account to sign in'}/>

    <div style={authGlass}>
      {!sel && <>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12,marginBottom:8}}>
          {users.map(u=>{
            const c = roleColor[u.role]||_AUTH_GOLD;
            return <button key={u.id} onClick={()=>selectUser(u)} className="mp-ab" style={{
              padding:'22px 14px',borderRadius:16,
              border:`1px solid ${c}40`,
              background:`linear-gradient(160deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))`,
              cursor:'pointer',textAlign:'center',
              backdropFilter:'blur(8px)',
              boxShadow:`0 6px 20px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.05)`,
              transition:'all .25s cubic-bezier(.2,.8,.2,1)'
            }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=c;e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow=`0 14px 40px ${c}55,inset 0 1px 0 rgba(255,255,255,0.1)`;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=`${c}40`;e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=`0 6px 20px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.05)`;}}>
              <div style={{
                width:48,height:48,borderRadius:'50%',
                background:`linear-gradient(135deg,${c},${c}aa)`,
                display:'flex',alignItems:'center',justifyContent:'center',
                margin:'0 auto 10px',fontSize:19,color:'#fff',fontWeight:800,fontFamily:FH,
                boxShadow:`0 6px 18px ${c}66,inset 0 2px 0 rgba(255,255,255,0.25)`
              }}>{u.name[0].toUpperCase()}</div>
              <div style={{fontWeight:700,fontSize:13.5,marginBottom:4,color:'#fff'}}>{u.name}</div>
              <div style={{fontSize:9.5,color:c,fontWeight:700,textTransform:'uppercase',letterSpacing:1}}>{u.role}</div>
            </button>;
          })}
        </div>
        {users.length===0 && <p style={{color:'rgba(255,255,255,0.5)',fontSize:13.5,padding:'24px 0',textAlign:'center'}}>No users found for this company.</p>}
      </>}

      {sel && <>
        {/* Selected user pill */}
        <div style={{
          display:'flex',alignItems:'center',gap:14,padding:'16px 18px',borderRadius:14,
          border:`1px solid ${roleColor[sel.role]||_AUTH_GOLD}55`,
          background:`linear-gradient(135deg,${roleColor[sel.role]||_AUTH_GOLD}15,${roleColor[sel.role]||_AUTH_GOLD}05)`,
          textAlign:'left',marginBottom:20,
          boxShadow:`0 6px 20px ${roleColor[sel.role]||_AUTH_GOLD}22`
        }}>
          <div style={{
            width:46,height:46,borderRadius:'50%',
            background:`linear-gradient(135deg,${roleColor[sel.role]||_AUTH_GOLD},${roleColor[sel.role]||_AUTH_GOLD}aa)`,
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:20,color:'#fff',fontWeight:800,fontFamily:FH,flexShrink:0,
            boxShadow:`0 6px 18px ${roleColor[sel.role]||_AUTH_GOLD}55,inset 0 2px 0 rgba(255,255,255,0.25)`
          }}>{sel.name[0].toUpperCase()}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:15,color:'#fff'}}>{sel.name}</div>
            <div style={{fontSize:10.5,color:roleColor[sel.role]||_AUTH_GOLD,fontWeight:700,textTransform:'uppercase',letterSpacing:1.2,marginTop:2}}>{sel.role}</div>
          </div>
          <button onClick={()=>{setSel(null);setPass('');setErr('');}} className="mp-al" style={{background:'rgba(255,255,255,0.06)',border:`1px solid rgba(255,255,255,0.1)`,cursor:'pointer',borderRadius:9,padding:'7px 12px',fontSize:11.5,color:'rgba(255,255,255,0.7)',fontWeight:600,transition:'color .2s,background .2s'}}>Change</button>
        </div>

        {err && <div style={{padding:'12px 16px',background:'rgba(183,28,28,0.10)',border:`1px solid rgba(255,82,82,0.3)`,borderRadius:10,color:'#ff8a80',fontSize:13,marginBottom:16,textAlign:'left',fontWeight:500}}>{err}</div>}

        <label style={authLbl}>Password</label>
        <input type="password" className="mp-ai" value={pass} autoFocus
          onChange={e=>{setPass(e.target.value);setErr('');}}
          onKeyDown={e=>e.key==='Enter'&&tryLogin()}
          placeholder="••••••••"
          style={{...authInp,marginBottom:16,fontSize:15}}/>
        <button onClick={tryLogin} disabled={loading||!pass} className="mp-ab mp-ab-prim" style={{...authBtnPrim,
          background:(loading||!pass)?'rgba(80,80,80,0.5)':authBtnPrim.background,
          cursor:(loading||!pass)?'not-allowed':'pointer',
          boxShadow:(loading||!pass)?'none':authBtnPrim.boxShadow}}>
          {loading?'Signing in…':'Sign In →'}
        </button>
      </>}
    </div>

    <button onClick={onBack} className="mp-al" style={{background:'none',border:'none',color:'rgba(255,255,255,.35)',cursor:'pointer',fontSize:12,padding:'18px 0 0',width:'100%',letterSpacing:.3,transition:'color .2s'}}>← Back to home</button>
  </AuthShell>;
}

// ══════════════════════════════════════════
// MAIN APP SHELL
// ══════════════════════════════════════════
function MainApp({user,onLogout,showToast}) {
  const [page,setPage]=useState('dashboard');
  const [sideOpen,setSideOpen]=useState(true);
  const [pendingCount,setPendingCount]=useState(0);
  const [aiOpen,setAiOpen]=useState(false);
  // Hoisted AI conversation — shared between popup and full-page view
  const [aiMessages,setAiMessages]=useState(()=>{
    try { return JSON.parse(localStorage.getItem('millpro_ai_thread')||'[]'); } catch { return []; }
  });
  useEffect(()=>{ try{localStorage.setItem('millpro_ai_thread',JSON.stringify(aiMessages.slice(-30)))}catch(_){} },[aiMessages]);
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
    {id:'invoices',  l:'Invoices',    ic:IC.invoice, rl:['ADMIN','OWNER','SUPERVISOR']},
    {id:'customers', l:'Customers',   ic:IC.users,   rl:['ADMIN','OWNER']},
    {id:'stockadj',  l:'Stock Adj.',  ic:IC.box,     rl:['ADMIN','OWNER']},
    {id:'reports',   l:'Reports',     ic:IC.trend,   rl:['OWNER','ADMIN']},
    {id:'finance',   l:'Finance',     ic:IC.bar,     rl:['OWNER','ADMIN']},
    {id:'approvals', l:'Approvals',   ic:IC.alert,   rl:['OWNER']},
    {id:'audit',     l:'Audit Log',   ic:IC.shield,  rl:['OWNER','ADMIN']},
    {id:'ai',        l:'AI Advisor',  ic:IC.sparkles,rl:['OWNER','ADMIN','SUPERVISOR']},
    {id:'community', l:'Maize News',  ic:IC.globe,   rl:['OWNER','ADMIN','SUPERVISOR']},
    {id:'feedback',  l:'Feedback',    ic:IC.star,    rl:['OWNER','ADMIN','SUPERVISOR']},
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
      {page==='invoices'&&<InvoicesPage {...P}/>}
      {page==='community'&&<CommunityPage {...P}/>}
      {page==='finance'&&<FinancePage {...P}/>}
      {page==='audit'&&<AuditPage {...P}/>}
      {page==='ai'&&<AIAdvisorPage {...P} messages={aiMessages} setMessages={setAiMessages}/>}
      {page==='feedback'&&<FeedbackPage {...P}/>}
      {page==='approvals'&&<ApprovalsPage {...P} onApprove={()=>setPendingCount(c=>Math.max(0,c-1))}/>}
      {page==='settings'&&<SettingsPage {...P}/>}
      {page==='customers'&&<CustomersPage {...P}/>}
      {page==='stockadj'&&<StockAdjPage {...P}/>}
      {page==='reports'&&<ReportsPage {...P}/>}
    </main>

    {/* Floating AI Advisor — available on every page */}
    <AIFloatingPanel
      open={aiOpen}
      onOpen={()=>setAiOpen(true)}
      onClose={()=>setAiOpen(false)}
      onExpand={()=>{setAiOpen(false);setPage('ai');}}
      messages={aiMessages}
      setMessages={setAiMessages}
      showToast={showToast}
      hideOnPage={page === 'ai'}
    />
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
  return <div className="fi"><PH title={`Welcome, ${user.name}`} sub={new Date().toLocaleDateString('en-UG',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}/>{(lowF||lowM)&&<Card style={{marginBottom:14,background:T.rL}}><Fx gap={6}><I d={IC.alert} c={T.r}/><span style={{fontWeight:600,color:T.r}}>Low stock{lowF?` — Flour: ${fmt(d.inventory.FLOUR)}kg`:''}{lowM?` — Maize: ${fmt(d.inventory.RAW_MAIZE)}kg`:''}</span></Fx></Card>}<G4 style={{marginBottom:16}}><Stat label="Employees" value={d.employees} icon={IC.users} color={T.p}/><Stat label="Week Payroll" value={`${cur} ${fmt(d.weekPayroll)}`} sub="This week" icon={IC.pay} color={T.ac}/><Stat label="Wages Owed" value={`${cur} ${fmt(d.wagesOwed||0)}`} sub="Unpaid" icon={IC.alert} color={(d.wagesOwed||0)>0?T.r:T.g}/><Stat label="Month Sales" value={`${cur} ${fmt(d.monthSales)}`} sub="This month" icon={IC.receipt} color={T.g}/><Stat label="Net Profit" value={`${cur} ${fmt(d.netProfit)}`} sub="This month" icon={IC.dollar} color={d.netProfit>=0?T.g:T.r}/><Stat label="Yield" value={d.yieldRate?`${d.yieldRate}%`:'—'} sub="Maize→Flour" icon={IC.factory} color={T.bl}/><Stat label="Flour Stock" value={`${fmt(d.inventory?.FLOUR||0)} kg`} icon={IC.box} color={lowF?T.r:T.g}/><Stat label="Orders" value={d.pendingOrders} sub="Active" icon={IC.cart} color={d.pendingOrders>0?T.p:T.g}/></G4><div style={{marginBottom:16}}><DailySummaryWidget cur={cur}/></div><G2><Card><Fx style={{justifyContent:'space-between',marginBottom:10}}><h3 style={{fontFamily:FH,fontSize:15,fontWeight:700}}>Recent Work</h3><Btn v="gh" sz="sm" onClick={()=>setPage('worklogs')}>All</Btn></Fx>{(d.recentWorkLogs||[]).map(w=><div key={w.id} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:`1px solid ${T.brd}`,fontSize:13}}><div><strong>{w.employee?.name}</strong> <span style={{color:T.t2}}>· {w.taskType?.name}</span></div><Badge c={T.g}>{cur} {fmt(w.totalPay)}</Badge></div>)}{!d.recentWorkLogs?.length&&<p style={{color:T.t3,fontSize:13}}>No records</p>}</Card><Card><Fx style={{justifyContent:'space-between',marginBottom:10}}><h3 style={{fontFamily:FH,fontSize:15,fontWeight:700}}>Recent Batches</h3><Btn v="gh" sz="sm" onClick={()=>setPage('production')}>All</Btn></Fx>{(d.recentBatches||[]).map(b=><div key={b.id} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:`1px solid ${T.brd}`,fontSize:13}}><div><strong>{fmt(b.maizeIn)}→{fmt(b.flourOut)}kg</strong> <span style={{color:T.t2}}>· {fmtD(b.date)}</span></div><Badge c={T.bl}>{b.maizeIn>0?((b.flourOut/b.maizeIn)*100).toFixed(0):0}%</Badge></div>)}{!d.recentBatches?.length&&<p style={{color:T.t3,fontSize:13}}>No records</p>}</Card></G2></div>;
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

function SalesPage({cur,user,showToast}) { const [data,setData]=useState([]); const [loading,setLoading]=useState(true); const [m,setM]=useState(false); const [co,setCo]=useState(null); const [autoPrint,setAutoPrint]=useState(()=>{try{return localStorage.getItem('mp_autoprint')!=='0';}catch{return true;}}); const [f,setF]=useState({customer:'',phone:'',date:td(),payMethod:'Cash',items:[{type:'FLOUR',qty:'',unitPrice:''}],notes:''}); const canWrite=user?.role!=='SUPERVISOR';const isAdmin=user?.role==='ADMIN'; useEffect(()=>{companyAPI.get().then(r=>setCo(r.data)).catch(()=>{});},[]); const toggleAuto=()=>{const v=!autoPrint;setAutoPrint(v);try{localStorage.setItem('mp_autoprint',v?'1':'0');}catch{}}; const printReceipt=(sale)=>{const ok=openDoc(receiptHTML(sale,co||{currency:cur}),{print:true});if(!ok)showToast('Allow pop-ups to print receipts','error');};
  const load=()=>salesAPI.list().then(r=>{setData(r.data);setLoading(false);}); useEffect(()=>{load();},[]);const addItem=()=>setF({...f,items:[...f.items,{type:'FLOUR',qty:'',unitPrice:''}]});const updItem=(i,k,v)=>{const ni=[...f.items];ni[i]={...ni[i],[k]:v};setF({...f,items:ni});}; const save=async()=>{if(!f.customer.trim())return showToast('Customer name is required','error');if(!f.items.some(i=>parseFloat(i.qty)>0))return showToast('Add at least one item','error');try{const r=await salesAPI.create(f);load();setM(false);setF({customer:'',phone:'',date:td(),payMethod:'Cash',items:[{type:'FLOUR',qty:'',unitPrice:''}],notes:''});showToast('Sale recorded');if(autoPrint&&r?.data)setTimeout(()=>printReceipt(r.data),150);}catch(e){showToast(e.response?.data?.error||'Error','error');}}; if(loading)return <Spinner/>; return <div className="fi"><PH title="Sales & Receipts" sub={`${data.length} sale${data.length!==1?'s':''} · automatic receipt printing is ${autoPrint?'ON':'OFF'}`} action={<Fx gap={6}><Btn v="gh" sz="sm" title="Toggle automatic receipt printing on each new sale" onClick={toggleAuto} style={autoPrint?{borderColor:T.g,color:T.g}:{}}><I d={IC.print} sz={14}/> Auto-print {autoPrint?'ON':'OFF'}</Btn><Btn v="gh" sz="sm" onClick={()=>downloadCSV(`Sales_${td()}.csv`,['Date','Receipt','Customer','Payment Method',`Total (${cur})`],data.map(s=>[fmtD(s.date),s.receiptNo,s.customer,s.payMethod,s.total]))}><I d={IC.dl} sz={14}/> Export</Btn>{canWrite&&<Btn onClick={()=>{setF({customer:'',phone:'',date:td(),payMethod:'Cash',items:[{type:'FLOUR',qty:'',unitPrice:''}],notes:''});setM(true);}}><I d={IC.plus} sz={15} c="#fff"/> Record Sale</Btn>}</Fx>}/><Tbl cols={[{k:'date',l:'Date',r:r=>fmtD(r.date)},{k:'receiptNo',l:'Receipt',r:r=><span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>{r.receiptNo}</span>},{k:'customer',l:'Customer',r:r=><strong>{r.customer}</strong>},{k:'payMethod',l:'Payment'},{k:'total',l:'Total',r:r=><strong style={{color:T.g}}>{cur} {fmt(r.total)}</strong>}]} data={data} actions={r=><Fx gap={3}><Btn v="gh" sz="sm" title="Print receipt" onClick={()=>printReceipt(r)}><I d={IC.print} sz={13} c={T.bl}/></Btn>{canWrite&&<Btn v="gh" sz="sm" title={isAdmin?'Request Delete':'Delete'} onClick={async()=>{if(!confirm(isAdmin?'Request delete? Owner approval needed.':'Delete?'))return;const r2=await salesAPI.delete(r.id);if(r2.status===202)showToast('Delete request submitted for owner approval');else load();}}><I d={IC.trash} sz={13} c={isAdmin?T.ac:T.r}/></Btn>}</Fx>}/><Modal open={m} onClose={()=>setM(false)} title="Record Sale" wide><FG><Fx gap={10}><Inp label="Customer *" value={f.customer} onChange={e=>setF({...f,customer:e.target.value})} style={{flex:1}}/><Inp label="Phone" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})} style={{flex:1}}/></Fx><Fx gap={10}><Inp label="Date" type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/><Sel label="Payment" value={f.payMethod} onChange={e=>setF({...f,payMethod:e.target.value})} options={PAY_METHODS}/></Fx><div>{f.items.map((it,i)=><Fx key={i} gap={6} style={{marginBottom:6}}><Sel value={it.type} onChange={e=>updItem(i,'type',e.target.value)} options={[{v:'FLOUR',l:'Flour'},{v:'BRAN',l:'Bran'},{v:'OTHER',l:'Other'}]}/><Inp placeholder="Qty" type="number" value={it.qty} onChange={e=>updItem(i,'qty',e.target.value)} style={{width:90}}/><Inp placeholder="Price" type="number" value={it.unitPrice} onChange={e=>updItem(i,'unitPrice',e.target.value)} style={{width:110}}/></Fx>)}<Btn v="gh" sz="sm" onClick={addItem}><I d={IC.plus} sz={14}/> Add</Btn></div><Btn v="g" onClick={save} sz="lg" style={{justifyContent:'center'}}><I d={IC.check} sz={15} c="#fff"/> Complete Sale</Btn></FG></Modal></div>; }

// ══════════════════════════════════════════
// INVOICES — create, save & auto-download branded PDF/HTML
// ══════════════════════════════════════════
function InvoicesPage({cur,user,showToast}) {
  const [data,setData]=useState([]); const [loading,setLoading]=useState(true); const [m,setM]=useState(false); const [co,setCo]=useState(null); const [saving,setSaving]=useState(false);
  const blank=()=>({customer:'',customerPhone:'',customerAddress:'',date:td(),dueDate:'',status:'UNPAID',taxRate:'',notes:'',items:[{description:'Maize Flour',quantity:'',unitPrice:''}]});
  const [f,setF]=useState(blank());
  const canWrite=user?.role!=='SUPERVISOR';
  const load=useCallback(()=>{invoicesAPI.list().then(r=>{setData(r.data);setLoading(false);}).catch(()=>setLoading(false));},[]);
  useEffect(()=>{load();companyAPI.get().then(r=>setCo(r.data)).catch(()=>{});},[load]);
  const addItem=()=>setF(s=>({...s,items:[...s.items,{description:'',quantity:'',unitPrice:''}]}));
  const rmItem=(i)=>setF(s=>({...s,items:s.items.filter((_,x)=>x!==i)}));
  const upItem=(i,k,v)=>setF(s=>({...s,items:s.items.map((it,x)=>x===i?{...it,[k]:v}:it)}));
  const sub=f.items.reduce((s,i)=>s+(parseFloat(i.quantity)||0)*(parseFloat(i.unitPrice)||0),0);
  const taxAmt=sub*(parseFloat(f.taxRate)||0)/100; const grand=sub+taxAmt;
  const buildDoc=(inv)=>invoiceHTML(inv,co||{currency:cur});
  const download=(inv)=>downloadDoc(`Invoice_${(inv.invoiceNo||'draft').replace(/[^\w-]/g,'')}.html`,buildDoc(inv));
  const print=(inv)=>{const ok=openDoc(buildDoc(inv),{print:true});if(!ok)showToast('Allow pop-ups to print','error');};
  const save=async()=>{
    if(!f.customer.trim())return showToast('Customer name is required','error');
    if(!f.items.some(i=>parseFloat(i.quantity)>0))return showToast('Add at least one item','error');
    setSaving(true);
    try{
      const payload={...f,taxRate:parseFloat(f.taxRate)||0,items:f.items.map(i=>({description:i.description||'Item',quantity:parseFloat(i.quantity)||0,unitPrice:parseFloat(i.unitPrice)||0}))};
      const r=await invoicesAPI.create(payload);
      setM(false); setF(blank()); load();
      showToast('Invoice saved & downloaded');
      setTimeout(()=>download(r.data),150);
    }catch(e){showToast(e.response?.data?.error||'Failed to save invoice','error');}
    setSaving(false);
  };
  const del=async(id)=>{if(!confirm('Delete this invoice?'))return;try{await invoicesAPI.delete(id);load();showToast('Deleted');}catch{showToast('Error','error');}};
  if(loading)return <Spinner/>;
  const totalInv=data.reduce((s,i)=>s+(i.total||0),0); const unpaid=data.filter(i=>i.status!=='PAID').reduce((s,i)=>s+(i.total||0),0);
  return <div className="fi">
    <PH title="Invoices" sub="Create, save and download branded invoices for customers" action={canWrite&&<Btn onClick={()=>setM(true)}><I d={IC.plus} sz={15} c="#fff"/> New Invoice</Btn>}/>
    <G4 style={{marginBottom:16}}>
      <Stat label="Total Invoices" value={data.length} icon={IC.invoice} color={T.bl}/>
      <Stat label="Total Value" value={`${cur} ${fmt(totalInv)}`} icon={IC.dollar} color={T.g}/>
      <Stat label="Outstanding" value={`${cur} ${fmt(unpaid)}`} icon={IC.alert} color={unpaid>0?T.r:T.g}/>
      <Stat label="Paid" value={data.filter(i=>i.status==='PAID').length} icon={IC.check} color={T.g}/>
    </G4>
    <Tbl cols={[{k:'invoiceNo',l:'Invoice #',r:r=><Badge c={T.bl}>{r.invoiceNo}</Badge>},{k:'date',l:'Date',r:r=>fmtD(r.date)},{k:'customer',l:'Customer',r:r=><strong>{r.customer}</strong>},{k:'dueDate',l:'Due',r:r=>r.dueDate?fmtD(r.dueDate):'—'},{k:'total',l:'Total',r:r=><strong style={{color:T.g}}>{cur} {fmt(r.total)}</strong>},{k:'status',l:'Status',r:r=><Badge c={r.status==='PAID'?T.g:r.status==='OVERDUE'?T.r:T.p}>{r.status}</Badge>}]} data={data} actions={r=><Fx gap={3}><Btn v="gh" sz="sm" title="Download" onClick={()=>download(r)}><I d={IC.dl} sz={13} c={T.bl}/></Btn><Btn v="gh" sz="sm" title="Print / PDF" onClick={()=>print(r)}><I d={IC.print} sz={13}/></Btn>{canWrite&&<Btn v="gh" sz="sm" title="Delete" onClick={()=>del(r.id)}><I d={IC.trash} sz={13} c={T.r}/></Btn>}</Fx>}/>
    <Modal open={m} onClose={()=>setM(false)} title="New Invoice" wide><FG>
      <Fx gap={10}><Inp label="Customer *" value={f.customer} onChange={e=>setF({...f,customer:e.target.value})} style={{flex:1}}/><Inp label="Customer Phone" value={f.customerPhone} onChange={e=>setF({...f,customerPhone:e.target.value})} style={{flex:1}}/></Fx>
      <Inp label="Customer Address" value={f.customerAddress} onChange={e=>setF({...f,customerAddress:e.target.value})}/>
      <Fx gap={10}><Inp label="Issue Date" type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})} style={{flex:1}}/><Inp label="Due Date" type="date" value={f.dueDate} onChange={e=>setF({...f,dueDate:e.target.value})} style={{flex:1}}/><Sel label="Status" value={f.status} onChange={e=>setF({...f,status:e.target.value})} options={['UNPAID','PAID','OVERDUE']} style={{flex:1}}/></Fx>
      <div><label style={{fontSize:12,fontWeight:600,color:T.t2}}>Line Items</label>{f.items.map((it,i)=><Fx key={i} gap={6} style={{marginTop:6}}><Inp placeholder="Description" value={it.description} onChange={e=>upItem(i,'description',e.target.value)} style={{flex:2}}/><Inp placeholder="Qty" type="number" value={it.quantity} onChange={e=>upItem(i,'quantity',e.target.value)} style={{flex:1}}/><Inp placeholder="Unit Price" type="number" value={it.unitPrice} onChange={e=>upItem(i,'unitPrice',e.target.value)} style={{flex:1}}/>{f.items.length>1&&<Btn v="gh" sz="sm" onClick={()=>rmItem(i)}><I d={IC.trash} sz={13} c={T.r}/></Btn>}</Fx>)}<Btn v="gh" sz="sm" onClick={addItem} style={{marginTop:6}}><I d={IC.plus} sz={13}/> Add Item</Btn></div>
      <Fx gap={10}><Inp label="Tax Rate (%)" type="number" value={f.taxRate} onChange={e=>setF({...f,taxRate:e.target.value})} style={{flex:1}}/><Inp label="Notes" value={f.notes} onChange={e=>setF({...f,notes:e.target.value})} style={{flex:2}}/></Fx>
      <div style={{textAlign:'right',fontSize:13,color:T.t2}}>Subtotal: {cur} {fmt(sub)}{f.taxRate?` · Tax: ${cur} ${fmt(taxAmt)}`:''}</div>
      <div style={{textAlign:'right',fontSize:18,fontWeight:800,fontFamily:FH}}>Total: {cur} {fmt(grand)}</div>
      <Btn v="g" onClick={save} disabled={saving}><I d={IC.check} sz={15} c="#fff"/> {saving?'Saving…':'Save & Download'}</Btn>
    </FG></Modal>
  </div>;
}

// ══════════════════════════════════════════
// MAIZE NEWS + COMMUNITY FEED
// ══════════════════════════════════════════
const REACTIONS = ['👍','🔥','❤️','😮','🌽'];

function CommunityPage({cur,user,showToast}) {
  const [tab,setTab]=useState('news');
  return <div className="fi">
    <PH title="Maize News & Community" sub="Industry news from Uganda & the world, plus a space to connect with other mill operators"/>
    <div style={{display:'flex',gap:6,marginBottom:16,borderBottom:`1px solid ${T.brd}`}}>
      {[{id:'news',l:'Maize News',ic:IC.globe},{id:'feed',l:'Community Feed',ic:IC.chat}].map(t=>
        <button key={t.id} onClick={()=>setTab(t.id)} style={{display:'flex',alignItems:'center',gap:7,padding:'10px 16px',background:'none',border:'none',borderBottom:`2px solid ${tab===t.id?T.p:'transparent'}`,color:tab===t.id?T.txt:T.t2,fontWeight:tab===t.id?700:500,fontSize:14,cursor:'pointer',marginBottom:-1}}><I d={t.ic} sz={16} c={tab===t.id?T.p:T.t2}/>{t.l}</button>)}
    </div>
    {tab==='news'?<NewsTab showToast={showToast}/>:<FeedTab user={user} showToast={showToast}/>}
  </div>;
}

function NewsTab({showToast}) {
  const [data,setData]=useState(null); const [loading,setLoading]=useState(true); const [err,setErr]=useState(false); const [region,setRegion]=useState('ALL');
  const fetchNews=useCallback((refresh)=>{setLoading(true);setErr(false);newsAPI.list(refresh).then(r=>{setData(r.data);setLoading(false);}).catch(()=>{setErr(true);setLoading(false);});},[]);
  useEffect(()=>{fetchNews(false);},[fetchNews]);
  const items=(data?.items||[]).filter(i=>region==='ALL'||i.region===region);
  const regionColor=r=>r==='Uganda'?T.p:r==='Africa'?T.ac:T.bl;
  return <div className="fi">
    <Fx style={{justifyContent:'space-between',marginBottom:14}}>
      <div style={{display:'flex',gap:6}}>{['ALL','Uganda','Africa','World'].map(r=><button key={r} onClick={()=>setRegion(r)} style={{padding:'6px 13px',borderRadius:20,border:`1px solid ${region===r?T.p:T.brd}`,background:region===r?T.pL:T.card,color:region===r?T.p:T.t2,fontSize:12.5,fontWeight:600,cursor:'pointer'}}>{r}</button>)}</div>
      <Fx gap={8} style={{alignItems:'center'}}>{data?.updatedAt&&<span style={{fontSize:11,color:T.t3}}>Updated {fmtDT(data.updatedAt)}</span>}<Btn v="gh" sz="sm" onClick={()=>fetchNews(true)} disabled={loading}><I d={IC.refresh} sz={14}/> Refresh</Btn></Fx>
    </Fx>
    {loading?<Card style={{textAlign:'center',padding:50}}><Spinner/><p style={{color:T.t2,fontSize:13,marginTop:8}}>Gathering the latest maize & grain news…</p></Card>
    :err?<Card style={{textAlign:'center',padding:40}}><div style={{fontSize:38,marginBottom:8}}>📡</div><h3 style={{fontFamily:FH,fontSize:18}}>Couldn't load news right now</h3><p style={{color:T.t2,fontSize:13,margin:'6px 0 16px'}}>The news service may be busy. Please try again in a moment.</p><Btn onClick={()=>fetchNews(true)}><I d={IC.refresh} sz={14} c="#fff"/> Try Again</Btn></Card>
    :items.length===0?<Card style={{textAlign:'center',padding:40,color:T.t3}}>No news items for this region yet. Try Refresh.</Card>
    :<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14}}>
      {items.map((n,i)=><Card key={i} style={{display:'flex',flexDirection:'column',gap:8}}>
        <Fx style={{justifyContent:'space-between',alignItems:'center'}}><Badge c={regionColor(n.region)}>{n.region||'World'}</Badge>{n.date&&<span style={{fontSize:11,color:T.t3}}>{n.date}</span>}</Fx>
        <h3 style={{fontFamily:FH,fontSize:16.5,fontWeight:700,lineHeight:1.3}}>{n.title}</h3>
        <p style={{fontSize:13,color:T.t2,lineHeight:1.6,flex:1}}>{n.summary}</p>
        <Fx style={{justifyContent:'space-between',alignItems:'center',marginTop:2}}>
          <span style={{fontSize:11.5,color:T.t3,fontWeight:600}}>{n.source||'Industry report'}</span>
          {n.url&&<a href={n.url} target="_blank" rel="noopener noreferrer" style={{fontSize:12.5,color:T.bl,fontWeight:700,textDecoration:'none'}}>Read more →</a>}
        </Fx>
      </Card>)}
    </div>}
    <p style={{fontSize:11,color:T.t3,marginTop:16,textAlign:'center'}}>News is gathered and summarised by AI from public sources. Verify critical figures before acting on them.</p>
  </div>;
}

function FeedTab({user,showToast}) {
  const [posts,setPosts]=useState([]); const [loading,setLoading]=useState(true); const [body,setBody]=useState(''); const [posting,setPosting]=useState(false);
  const load=useCallback(()=>{communityAPI.list().then(r=>{setPosts(r.data);setLoading(false);}).catch(()=>setLoading(false));},[]);
  useEffect(()=>{load();},[load]);
  const submit=async()=>{if(!body.trim())return;setPosting(true);try{await communityAPI.create({body:body.trim()});setBody('');load();}catch{showToast('Failed to post','error');}setPosting(false);};
  const react=async(id,emoji)=>{try{await communityAPI.react(id,emoji);load();}catch{showToast('Failed','error');}};
  const del=async(id)=>{if(!confirm('Delete this post?'))return;try{await communityAPI.delete(id);load();}catch{showToast('Failed','error');}};
  if(loading)return <Spinner/>;
  return <div className="fi" style={{maxWidth:680,margin:'0 auto'}}>
    <Card style={{marginBottom:16}}>
      <Fx gap={10} style={{alignItems:'flex-start'}}>
        <div style={{width:38,height:38,borderRadius:'50%',background:`linear-gradient(135deg,${T.p},${T.ac})`,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,flexShrink:0}}>{user.name[0]}</div>
        <div style={{flex:1}}>
          <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Share an update, ask a question, or post a tip for other millers…" rows={3} style={{width:'100%',border:`1.5px solid ${T.brd}`,borderRadius:10,padding:'10px 12px',fontSize:14,resize:'vertical',outline:'none',fontFamily:'inherit',background:T.inp}}/>
          <Fx style={{justifyContent:'flex-end',marginTop:8}}><Btn onClick={submit} disabled={posting||!body.trim()}><I d={IC.send2} sz={14} c="#fff"/> {posting?'Posting…':'Post'}</Btn></Fx>
        </div>
      </Fx>
    </Card>
    {posts.length===0?<Card style={{textAlign:'center',padding:'46px 20px'}}><div style={{fontSize:40,marginBottom:8,opacity:.6}}>💬</div><h3 style={{fontFamily:FH,fontSize:18}}>No posts yet</h3><p style={{color:T.t2,fontSize:13.5,marginTop:6}}>Be the first to share something with the community.</p></Card>
    :<div style={{display:'flex',flexDirection:'column',gap:14}}>{posts.map(p=><PostCard key={p.id} post={p} user={user} onReact={react} onDelete={del} onChanged={load} showToast={showToast}/>)}</div>}
  </div>;
}

function PostCard({post,user,onReact,onDelete,onChanged,showToast}) {
  const [showC,setShowC]=useState(false); const [c,setC]=useState(''); const [sending,setSending]=useState(false);
  const mine=post.userId===user.id||user.role==='OWNER';
  const addComment=async()=>{if(!c.trim())return;setSending(true);try{await communityAPI.comment(post.id,c.trim());setC('');onChanged();setShowC(true);}catch{showToast('Failed','error');}setSending(false);};
  const delComment=async(id)=>{try{await communityAPI.delComment(id);onChanged();}catch{showToast('Failed','error');}};
  return <Card>
    <Fx style={{justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
      <Fx gap={10}>
        <div style={{width:38,height:38,borderRadius:'50%',background:`linear-gradient(135deg,${T.bl},${T.tl})`,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,flexShrink:0}}>{(post.userName||'?')[0]}</div>
        <div><div style={{fontWeight:700,fontSize:14}}>{post.userName} {post.companyName&&<span style={{fontWeight:400,color:T.t3,fontSize:12}}>· {post.companyName}</span>}</div><div style={{fontSize:11.5,color:T.t3}}>{post.userRole} · {fmtDT(post.createdAt)}</div></div>
      </Fx>
      {mine&&<Btn v="gh" sz="sm" title="Delete" onClick={()=>onDelete(post.id)}><I d={IC.trash} sz={13} c={T.r}/></Btn>}
    </Fx>
    <p style={{fontSize:14,lineHeight:1.6,color:T.txt,whiteSpace:'pre-wrap',marginBottom:12}}>{post.body}</p>
    <Fx gap={6} style={{alignItems:'center',borderTop:`1px solid ${T.brd}`,paddingTop:10}}>
      {REACTIONS.map(e=>{const count=post.reactions?.[e]||0;const active=post.myReaction===e;return <button key={e} onClick={()=>onReact(post.id,e)} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:16,border:`1px solid ${active?T.p:T.brd}`,background:active?T.pL:'transparent',cursor:'pointer',fontSize:13}}>{e}{count>0&&<span style={{fontSize:11,fontWeight:700,color:active?T.p:T.t2}}>{count}</span>}</button>;})}
      <button onClick={()=>setShowC(!showC)} style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:5,padding:'4px 9px',borderRadius:16,border:'none',background:'transparent',cursor:'pointer',fontSize:12.5,color:T.t2,fontWeight:600}}><I d={IC.comment} sz={14}/> {(post.comments?.length||0)} comment{(post.comments?.length||0)!==1?'s':''}</button>
    </Fx>
    {showC&&<div style={{marginTop:12,borderTop:`1px solid ${T.brd}`,paddingTop:12}}>
      {(post.comments||[]).map(cm=><Fx key={cm.id} gap={8} style={{marginBottom:10,alignItems:'flex-start'}}>
        <div style={{width:28,height:28,borderRadius:'50%',background:T.inp,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:12,color:T.t2,flexShrink:0}}>{(cm.userName||'?')[0]}</div>
        <div style={{flex:1,background:T.inp,borderRadius:10,padding:'7px 11px'}}><div style={{fontSize:12,fontWeight:700}}>{cm.userName} <span style={{fontWeight:400,color:T.t3,fontSize:10.5}}>· {fmtDT(cm.createdAt)}</span></div><div style={{fontSize:13,color:T.txt,marginTop:2,whiteSpace:'pre-wrap'}}>{cm.body}</div></div>
        {(cm.userId===user.id||user.role==='OWNER')&&<button onClick={()=>delComment(cm.id)} style={{background:'none',border:'none',cursor:'pointer',color:T.t3,padding:4}}><I d={IC.x} sz={13}/></button>}
      </Fx>)}
      <Fx gap={8} style={{marginTop:4}}><Inp placeholder="Write a comment…" value={c} onChange={e=>setC(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();addComment();}}} style={{flex:1}}/><Btn sz="sm" onClick={addComment} disabled={sending||!c.trim()}><I d={IC.send2} sz={13} c="#fff"/></Btn></Fx>
    </div>}
  </Card>;
}

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
// PROFESSIONAL CHART PRIMITIVES (dependency-free SVG)
// ══════════════════════════════════════════
const _abbr = n => {
  n = Math.round(n || 0); const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(a >= 1e10 ? 0 : 1).replace(/\.0$/, '') + 'B';
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (a >= 1e3) return (n / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K';
  return '' + n;
};
const _niceMax = m => {
  if (!isFinite(m) || m <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(m)));
  const r = m / p, s = r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10;
  return s * p;
};
let _gid = 0;
const useGid = pfx => { const r = useRef(null); if (!r.current) r.current = `${pfx}${++_gid}`; return r.current; };

// Shared SVG canvas geometry
const _W = 620, _VH = 300, _PADL = 52, _PADR = 16, _PADT = 26, _PADB = 30;
const _PLOTW = _W - _PADL - _PADR, _PLOTH = _VH - _PADT - _PADB;

const ChartTip = ({ show, x, y, children }) => !show ? null :
  <div style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-112%)', background: 'rgba(8,11,8,0.96)', border: `1px solid ${T.brd}`, borderRadius: 8, padding: '7px 10px', pointerEvents: 'none', boxShadow: '0 8px 24px rgba(0,0,0,.45)', whiteSpace: 'nowrap', zIndex: 5, backdropFilter: 'blur(4px)' }}>{children}</div>;

// Vertical bar chart — supports negative values (loss), gridlines, axis + value labels, hover tooltip
const BarChart = ({ data = [], color = T.g, negColor = T.r, unit = '', height = 220, valueFmt }) => {
  const [hi, setHi] = useState(-1);
  const gid = useGid('bar');
  const fF = valueFmt || (v => `${unit} ${fmt(v)}`.trim());
  if (!data.length) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.t3, fontSize: 13 }}>No data</div>;
  const vals = data.map(d => d.v);
  const top = _niceMax(Math.max(0, ...vals));
  const bot = Math.min(0, ...vals) < 0 ? -_niceMax(-Math.min(...vals)) : 0;
  const range = (top - bot) || 1;
  const yOf = v => _PADT + ((top - v) / range) * _PLOTH;
  const zeroY = yOf(0);
  const slot = _PLOTW / data.length, bw = Math.min(slot * 0.58, 54);
  const ticks = Array.from({ length: 5 }, (_, i) => bot + (range * i) / 4);
  return <div style={{ position: 'relative' }}>
    <svg viewBox={`0 0 ${_W} ${_VH}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img">
      <defs>
        <linearGradient id={`${gid}p`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="1" /><stop offset="100%" stopColor={color} stopOpacity="0.45" /></linearGradient>
        <linearGradient id={`${gid}n`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={negColor} stopOpacity="0.5" /><stop offset="100%" stopColor={negColor} stopOpacity="1" /></linearGradient>
      </defs>
      {ticks.map((t, i) => { const y = yOf(t); return <g key={i}>
        <line x1={_PADL} y1={y} x2={_W - _PADR} y2={y} stroke={T.brd} strokeWidth="1" strokeDasharray={t === 0 ? '0' : '3 4'} opacity={t === 0 ? 0.9 : 0.5} vectorEffect="non-scaling-stroke" />
        <text x={_PADL - 8} y={y + 3.5} textAnchor="end" fontSize="11" fill={T.t3}>{_abbr(t)}</text>
      </g>; })}
      <g style={{ animation: 'chRise .5s ease both' }}>
        {data.map((d, i) => {
          const x = _PADL + i * slot + (slot - bw) / 2, neg = d.v < 0;
          const y = neg ? zeroY : yOf(d.v), h = Math.max(1.5, Math.abs(yOf(d.v) - zeroY));
          return <rect key={i} x={x} y={y} width={bw} height={h} rx={4} fill={`url(#${gid}${neg ? 'n' : 'p'})`} opacity={hi === -1 || hi === i ? 1 : 0.4} style={{ transition: 'opacity .15s' }} />;
        })}
      </g>
      {data.map((d, i) => { const cx = _PADL + i * slot + slot / 2, neg = d.v < 0, y = yOf(d.v); return <text key={i} x={cx} y={neg ? y + 13 : y - 7} textAnchor="middle" fontSize="11" fontWeight="700" fill={neg ? negColor : color} opacity={hi === -1 || hi === i ? 1 : 0.4}>{_abbr(d.v)}</text>; })}
      {data.map((d, i) => <text key={i} x={_PADL + i * slot + slot / 2} y={_VH - 10} textAnchor="middle" fontSize="11" fill={T.t2}>{d.l}</text>)}
      {data.map((d, i) => <rect key={i} x={_PADL + i * slot} y={_PADT} width={slot} height={_PLOTH} fill="transparent" onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(-1)} />)}
    </svg>
    {hi >= 0 && <ChartTip show x={((_PADL + hi * slot + slot / 2) / _W) * 100} y={(yOf(data[hi].v) / _VH) * 100}>
      <div style={{ fontSize: 10, color: T.t2, marginBottom: 2 }}>{data[hi].l}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: data[hi].v < 0 ? negColor : color }}>{fF(data[hi].v)}</div>
    </ChartTip>}
  </div>;
};

// Grouped bar chart — two series side by side (e.g. Revenue vs Costs)
const GroupBarChart = ({ data = [], series = [], unit = '', height = 220 }) => {
  const [hi, setHi] = useState(-1);
  const gid = useGid('grp');
  if (!data.length) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.t3, fontSize: 13 }}>No data</div>;
  const all = data.flatMap(d => series.map(s => d[s.key] || 0));
  const top = _niceMax(Math.max(0, ...all)), range = top || 1;
  const yOf = v => _PADT + ((top - v) / range) * _PLOTH, baseY = yOf(0);
  const slot = _PLOTW / data.length, gw = Math.min(slot * 0.62, 64), bw = gw / series.length;
  const ticks = Array.from({ length: 5 }, (_, i) => (range * i) / 4);
  return <div style={{ position: 'relative' }}>
    <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end', marginBottom: 2 }}>
      {series.map(s => <span key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: T.t2 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />{s.name}</span>)}
    </div>
    <svg viewBox={`0 0 ${_W} ${_VH}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img">
      <defs>{series.map((s, k) => <linearGradient key={k} id={`${gid}${k}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={s.color} stopOpacity="1" /><stop offset="100%" stopColor={s.color} stopOpacity="0.45" /></linearGradient>)}</defs>
      {ticks.map((t, i) => { const y = yOf(t); return <g key={i}>
        <line x1={_PADL} y1={y} x2={_W - _PADR} y2={y} stroke={T.brd} strokeWidth="1" strokeDasharray={i === 0 ? '0' : '3 4'} opacity={i === 0 ? 0.9 : 0.5} vectorEffect="non-scaling-stroke" />
        <text x={_PADL - 8} y={y + 3.5} textAnchor="end" fontSize="11" fill={T.t3}>{_abbr(t)}</text>
      </g>; })}
      <g style={{ animation: 'chRise .5s ease both' }}>
        {data.map((d, i) => series.map((s, k) => { const x = _PADL + i * slot + (slot - gw) / 2 + k * bw, y = yOf(d[s.key] || 0); return <rect key={`${i}-${k}`} x={x + 1} y={y} width={bw - 2} height={Math.max(1.5, baseY - y)} rx={3} fill={`url(#${gid}${k})`} opacity={hi === -1 || hi === i ? 1 : 0.4} style={{ transition: 'opacity .15s' }} />; }))}
      </g>
      {data.map((d, i) => <text key={i} x={_PADL + i * slot + slot / 2} y={_VH - 10} textAnchor="middle" fontSize="11" fill={T.t2}>{d.l}</text>)}
      {data.map((d, i) => <rect key={i} x={_PADL + i * slot} y={_PADT} width={slot} height={_PLOTH} fill="transparent" onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(-1)} />)}
    </svg>
    {hi >= 0 && <ChartTip show x={((_PADL + hi * slot + slot / 2) / _W) * 100} y={8}>
      <div style={{ fontSize: 10, color: T.t2, marginBottom: 3 }}>{data[hi].l}</div>
      {series.map(s => <div key={s.key} style={{ fontSize: 12, fontWeight: 600, color: s.color, display: 'flex', gap: 8, justifyContent: 'space-between' }}><span>{s.name}</span><span>{unit} {fmt(data[hi][s.key] || 0)}</span></div>)}
    </ChartTip>}
  </div>;
};

// Smooth area + line chart (e.g. yield % trend)
const AreaChart = ({ data = [], color = T.bl, suffix = '', height = 220 }) => {
  const [hi, setHi] = useState(-1);
  const gid = useGid('area');
  if (!data.length) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.t3, fontSize: 13 }}>No data</div>;
  const vals = data.map(d => d.v);
  const top = _niceMax(Math.max(...vals, 1)), range = top || 1;
  const yOf = v => _PADT + ((top - v) / range) * _PLOTH;
  const n = data.length;
  const xOf = i => n === 1 ? _PADL + _PLOTW / 2 : _PADL + (i / (n - 1)) * _PLOTW;
  const pts = data.map((d, i) => ({ x: xOf(i), y: yOf(d.v) }));
  const smooth = ps => { if (ps.length < 2) return `M ${ps[0].x} ${ps[0].y}`; let d = `M ${ps[0].x} ${ps[0].y}`; for (let i = 0; i < ps.length - 1; i++) { const a = ps[i], b = ps[i + 1], cx = (a.x + b.x) / 2; d += ` C ${cx} ${a.y} ${cx} ${b.y} ${b.x} ${b.y}`; } return d; };
  const line = smooth(pts);
  const area = `${line} L ${pts[n - 1].x} ${yOf(0)} L ${pts[0].x} ${yOf(0)} Z`;
  const ticks = Array.from({ length: 5 }, (_, i) => (range * i) / 4);
  return <div style={{ position: 'relative' }}>
    <svg viewBox={`0 0 ${_W} ${_VH}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img">
      <defs><linearGradient id={`${gid}a`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.32" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      {ticks.map((t, i) => { const y = yOf(t); return <g key={i}>
        <line x1={_PADL} y1={y} x2={_W - _PADR} y2={y} stroke={T.brd} strokeWidth="1" strokeDasharray={i === 0 ? '0' : '3 4'} opacity={i === 0 ? 0.9 : 0.5} vectorEffect="non-scaling-stroke" />
        <text x={_PADL - 8} y={y + 3.5} textAnchor="end" fontSize="11" fill={T.t3}>{_abbr(t)}{suffix}</text>
      </g>; })}
      <path d={area} fill={`url(#${gid}a)`} style={{ animation: 'chFade .6s ease both' }} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ animation: 'chFade .6s ease both' }} />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={hi === i ? 5 : 3.5} fill={T.card} stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />)}
      {data.map((d, i) => <text key={i} x={xOf(i)} y={_VH - 10} textAnchor="middle" fontSize="11" fill={T.t2}>{d.l}</text>)}
      {data.map((d, i) => <rect key={i} x={xOf(i) - (_PLOTW / n) / 2} y={_PADT} width={_PLOTW / n} height={_PLOTH} fill="transparent" onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(-1)} />)}
    </svg>
    {hi >= 0 && <ChartTip show x={(xOf(hi) / _W) * 100} y={(yOf(data[hi].v) / _VH) * 100}>
      <div style={{ fontSize: 10, color: T.t2, marginBottom: 2 }}>{data[hi].l}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color }}>{fmt(data[hi].v)}{suffix}</div>
    </ChartTip>}
  </div>;
};

// Ranked horizontal bar (top customers / employees)
const RankBar = ({ rank, label, value, max, color = T.g, unit = '', sub }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return <div style={{ marginBottom: 11 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, fontSize: 13, gap: 8 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', flex: 1 }}>
        <span style={{ width: 19, height: 19, borderRadius: 5, background: `${color}1f`, color, fontSize: 10.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{rank}</span>
        <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      </span>
      <span style={{ color, fontWeight: 700, whiteSpace: 'nowrap' }}>{unit} {fmt(value)}{sub && <span style={{ color: T.t3, fontWeight: 400, fontSize: 11 }}> · {sub}</span>}</span>
    </div>
    <div style={{ height: 9, borderRadius: 5, background: T.inp, overflow: 'hidden' }}>
      <div style={{ height: '100%', borderRadius: 5, width: `${pct}%`, background: `linear-gradient(90deg,${color}aa,${color})`, transition: 'width .6s cubic-bezier(.4,0,.2,1)' }} />
    </div>
  </div>;
};

// ══════════════════════════════════════════
// REPORTS & ANALYTICS PAGE
// ══════════════════════════════════════════
function ReportsPage({ cur }) {
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true); const [range, setRange] = useState(6);
  useEffect(() => {
    Promise.all([reportsAPI.monthly(), reportsAPI.customers(), reportsAPI.employees()])
      .then(([m, c, e]) => setData({ months: m.data.months, customers: c.data.customers, employees: e.data.employees }))
      .catch(() => {}).finally(() => setLoading(false));
  }, []);
  if (loading) return <Spinner />;
  if (!data) return <div style={{ color: T.t2, padding: 20, textAlign: 'center' }}>Could not load reports data.</div>;

  const allMonths = data.months || [], cust = data.customers || [], emps = data.employees || [];
  const months = allMonths.slice(-range);
  const exportCSV = () => downloadCSV(`Analytics_${range}mo_${td()}.csv`, ['Month', 'Revenue', 'Costs', 'Profit', 'Yield %'], months.map(m => [m.label, m.revenue, m.costs, m.profit, m.yield || 0]));
  const totalRev = months.reduce((s, m) => s + m.revenue, 0);
  const totalProfit = months.reduce((s, m) => s + m.profit, 0);
  const totalCosts = months.reduce((s, m) => s + m.costs, 0);
  const yMonths = months.filter(m => m.yield > 0);
  const avgYield = yMonths.length ? yMonths.reduce((s, m) => s + m.yield, 0) / yMonths.length : 0;
  const margin = totalRev > 0 ? (totalProfit / totalRev) * 100 : 0;
  const maxCust = Math.max(...cust.map(c => c.revenue), 1), maxEmp = Math.max(...emps.map(e => e.earned), 1);
  // month-over-month revenue growth
  const lastRev = months.length ? months[months.length - 1].revenue : 0;
  const prevRev = months.length > 1 ? months[months.length - 2].revenue : 0;
  const growth = prevRev > 0 ? ((lastRev - prevRev) / prevRev) * 100 : null;

  return <div className="fi">
    <style>{`@keyframes chRise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}@keyframes chFade{from{opacity:0}to{opacity:1}}`}</style>
    <PH title="Reports & Analytics" sub={`Business intelligence — last ${range} months of performance data`} action={<Fx gap={6} style={{ alignItems: 'center' }}>
      <div style={{ display: 'flex', border: `1px solid ${T.brd}`, borderRadius: 8, overflow: 'hidden' }}>{[3, 6, 12].map(r => <button key={r} onClick={() => setRange(r)} disabled={r > allMonths.length && r !== 6} style={{ padding: '6px 12px', background: range === r ? T.p : T.card, color: range === r ? '#fff' : T.t2, border: 'none', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>{r}M</button>)}</div>
      <Btn v="gh" sz="sm" onClick={exportCSV}><I d={IC.dl} sz={14} /> CSV</Btn>
      <Btn v="gh" sz="sm" onClick={() => printSection(`<h1>Reports & Analytics</h1><p>Last ${range} months</p><table><tr><th>Month</th><th>Revenue</th><th>Costs</th><th>Profit</th><th>Yield %</th></tr>${months.map(m => `<tr><td>${m.label}</td><td>${cur} ${fmt(m.revenue)}</td><td>${cur} ${fmt(m.costs)}</td><td>${cur} ${fmt(m.profit)}</td><td>${(m.yield || 0).toFixed(1)}%</td></tr>`).join('')}<tr class="total"><td>Total</td><td>${cur} ${fmt(totalRev)}</td><td>${cur} ${fmt(totalCosts)}</td><td>${cur} ${fmt(totalProfit)}</td><td>—</td></tr></table>`, 'MillPro Analytics')}><I d={IC.print} sz={14} /> Print</Btn>
    </Fx>} />
    <G4 style={{ marginBottom: 16 }}>
      <Stat label="6-Month Revenue" value={`${cur} ${fmt(totalRev)}`} color={T.g} icon={IC.receipt} sub={growth != null ? `${growth >= 0 ? '▲' : '▼'} ${Math.abs(growth).toFixed(1)}% vs last mo` : 'Gross sales'} />
      <Stat label="6-Month Profit" value={`${cur} ${fmt(totalProfit)}`} color={totalProfit >= 0 ? T.g : T.r} icon={IC.bar} sub={`${margin.toFixed(1)}% margin`} />
      <Stat label="Avg Flour Yield" value={avgYield > 0 ? `${avgYield.toFixed(1)}%` : '—'} color={T.bl} icon={IC.factory} sub="Maize → Flour" />
      <Stat label="Top Customer" value={cust[0]?.name?.split(' ')[0] || '—'} sub={cust[0] ? `${cur} ${fmt(cust[0].revenue)}` : 'No data'} color={T.p} icon={IC.star} />
    </G4>

    <G2 style={{ marginBottom: 14 }}>
      <Card>
        <h3 style={{ fontFamily: FH, fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Monthly Revenue</h3>
        <p style={{ fontSize: 11, color: T.t2, marginBottom: 10 }}>Total sales income per month</p>
        <BarChart data={months.map(m => ({ l: m.label, v: m.revenue }))} color={T.g} unit={cur} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: T.t2 }}>
          <span>Total: <strong style={{ color: T.g }}>{cur} {fmt(totalRev)}</strong></span>
          <span>Avg/mo: <strong>{cur} {fmt(months.length ? totalRev / months.length : 0)}</strong></span>
        </div>
      </Card>
      <Card>
        <h3 style={{ fontFamily: FH, fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Monthly Profit / Loss</h3>
        <p style={{ fontSize: 11, color: T.t2, marginBottom: 10 }}>Revenue minus all costs (purchases + expenses + labour)</p>
        <BarChart data={months.map(m => ({ l: m.label, v: m.profit }))} color={T.g} negColor={T.r} unit={cur} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: T.t2 }}>
          <span>Net: <strong style={{ color: totalProfit >= 0 ? T.g : T.r }}>{cur} {fmt(totalProfit)}</strong></span>
          <span>Margin: <strong style={{ color: totalProfit >= 0 ? T.g : T.r }}>{margin.toFixed(1)}%</strong></span>
        </div>
      </Card>
    </G2>

    <G2 style={{ marginBottom: 14 }}>
      <Card>
        <h3 style={{ fontFamily: FH, fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Flour Yield Trend</h3>
        <p style={{ fontSize: 11, color: T.t2, marginBottom: 10 }}>Percentage of maize converted to flour per month</p>
        <AreaChart data={months.map(m => ({ l: m.label, v: m.yield || 0 }))} color={T.bl} suffix="%" />
        <div style={{ marginTop: 8, fontSize: 12, textAlign: 'center', color: T.t2 }}>6-month average: <strong style={{ color: T.bl }}>{avgYield > 0 ? avgYield.toFixed(1) : 0}%</strong></div>
      </Card>
      <Card>
        <h3 style={{ fontFamily: FH, fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Revenue vs Costs</h3>
        <p style={{ fontSize: 11, color: T.t2, marginBottom: 10 }}>Side-by-side comparison each month</p>
        <GroupBarChart data={months.map(m => ({ l: m.label, revenue: m.revenue, costs: m.costs }))} series={[{ key: 'revenue', name: 'Revenue', color: T.g }, { key: 'costs', name: 'Costs', color: T.r }]} unit={cur} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: T.t2 }}>
          <span>Revenue: <strong style={{ color: T.g }}>{cur} {fmt(totalRev)}</strong></span>
          <span>Costs: <strong style={{ color: T.r }}>{cur} {fmt(totalCosts)}</strong></span>
        </div>
      </Card>
    </G2>

    <G2>
      <Card>
        <h3 style={{ fontFamily: FH, fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Top Customers by Revenue</h3>
        {cust.length === 0 ? <p style={{ color: T.t3, fontSize: 13, textAlign: 'center', padding: 20 }}>No sales data yet</p> : cust.slice(0, 8).map((c, i) => <RankBar key={c.name} rank={i + 1} label={c.name} value={c.revenue} max={maxCust} color={T.g} unit={cur} sub={`${c.orders} order${c.orders !== 1 ? 's' : ''}`} />)}
      </Card>
      <Card>
        <h3 style={{ fontFamily: FH, fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Top Employees by Earnings</h3>
        {emps.length === 0 ? <p style={{ color: T.t3, fontSize: 13, textAlign: 'center', padding: 20 }}>No work log data yet</p> : emps.slice(0, 8).map((e, i) => <RankBar key={e.id || i} rank={i + 1} label={e.name} value={e.earned} max={maxEmp} color={T.bl} unit={cur} sub={`${e.tasks} task${e.tasks !== 1 ? 's' : ''}`} />)}
      </Card>
    </G2>
  </div>;
}

// ══════════════════════════════════════════
// FEEDBACK PAGE (Company → MillPro)
// ══════════════════════════════════════════
const FB_CATS = [
  { v:'GENERAL',         l:'General',         c:'#1255A0' },
  { v:'BUG',             l:'Bug Report',      c:'#B71C1C' },
  { v:'FEATURE_REQUEST', l:'Feature Request', c:'#247529' },
  { v:'COMPLAINT',       l:'Complaint',       c:'#C74B1A' },
  { v:'OTHER',           l:'Other',           c:'#6A1B9A' },
];
const FB_STATUS_COLOR = { OPEN:T.p, IN_PROGRESS:T.bl, RESOLVED:T.g, DISMISSED:T.t3 };

function FeedbackPage({user, showToast}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ category:'GENERAL', subject:'', message:'' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    feedbackAPI.list().then(r => { setItems(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!f.subject.trim() || !f.message.trim()) return showToast('Subject and message are required', 'error');
    setSaving(true);
    try {
      await feedbackAPI.create(f);
      setOpen(false);
      setF({ category:'GENERAL', subject:'', message:'' });
      load();
      showToast('Feedback sent — thank you!');
    } catch (e) { showToast(e.response?.data?.error || 'Failed to send', 'error'); }
    setSaving(false);
  };

  const del = async (id) => {
    if (!confirm('Delete this feedback?')) return;
    try { await feedbackAPI.delete(id); load(); showToast('Deleted'); }
    catch { showToast('Failed to delete', 'error'); }
  };

  if (loading) return <Spinner/>;

  const counts = items.reduce((a,i)=>{ a[i.status]=(a[i.status]||0)+1; return a; }, {});

  return <div className="fi">
    <PH title="Feedback" sub="Send suggestions, bugs or requests to the MillPro team — we read every message."
      action={<Btn onClick={()=>setOpen(true)}><I d={IC.plus} sz={15} c="#fff"/> New Feedback</Btn>}/>

    <G4 style={{marginBottom:18}}>
      <Stat label="Total Sent"  value={items.length} icon={IC.log}    color={T.bl}/>
      <Stat label="Open"        value={counts.OPEN || 0} icon={IC.alert} color={T.p}/>
      <Stat label="In Progress" value={counts.IN_PROGRESS || 0} icon={IC.clock} color={T.bl}/>
      <Stat label="Resolved"    value={counts.RESOLVED || 0} icon={IC.check} color={T.g}/>
    </G4>

    {items.length === 0 ? (
      <Card style={{textAlign:'center',padding:'48px 20px'}}>
        <div style={{fontSize:42,marginBottom:8,opacity:.6}}>💬</div>
        <h3 style={{fontFamily:FH,fontSize:19,marginBottom:6}}>No feedback yet</h3>
        <p style={{color:T.t2,fontSize:13.5,marginBottom:18,maxWidth:420,margin:'0 auto 18px'}}>
          Got an idea, found a bug, or have something to share? We'd love to hear from you.
        </p>
        <Btn onClick={()=>setOpen(true)}><I d={IC.plus} sz={15} c="#fff"/> Send your first feedback</Btn>
      </Card>
    ) : (
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {items.map(i => {
          const cat = FB_CATS.find(c => c.v === i.category) || FB_CATS[0];
          const sc  = FB_STATUS_COLOR[i.status] || T.t3;
          return <Card key={i.id} style={{borderLeft:`4px solid ${cat.c}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:14,marginBottom:10}}>
              <div style={{flex:1,minWidth:0}}>
                <Fx gap={8} style={{marginBottom:6}}>
                  <Badge c={cat.c}>{cat.l}</Badge>
                  <Badge c={sc}>{i.status.replace('_',' ')}</Badge>
                  <span style={{fontSize:11,color:T.t3}}>{fmtDT(i.createdAt)}</span>
                </Fx>
                <h3 style={{fontFamily:FH,fontSize:16,fontWeight:700,marginBottom:4}}>{i.subject}</h3>
                <div style={{fontSize:11.5,color:T.t2,marginBottom:8}}>by <strong>{i.userName}</strong> · {i.userRole}</div>
                <p style={{fontSize:13.5,color:T.txt,lineHeight:1.6,whiteSpace:'pre-wrap'}}>{i.message}</p>
                {i.response && <div style={{marginTop:12,padding:'12px 14px',background:T.gL,borderRadius:8,border:`1px solid ${T.g}33`}}>
                  <div style={{fontSize:10,color:T.g,fontWeight:700,letterSpacing:1,textTransform:'uppercase',marginBottom:5}}>MillPro Response · {fmtDT(i.respondedAt)}</div>
                  <p style={{fontSize:13,color:T.txt,lineHeight:1.55,whiteSpace:'pre-wrap'}}>{i.response}</p>
                </div>}
              </div>
              {(i.userId === user.id || user.role === 'OWNER') && (
                <Btn v="gh" sz="sm" onClick={()=>del(i.id)} title="Delete"><I d={IC.trash} sz={13} c={T.r}/></Btn>
              )}
            </div>
          </Card>;
        })}
      </div>
    )}

    <Modal open={open} onClose={()=>setOpen(false)} title="Send Feedback to MillPro" wide>
      <FG>
        <Sel label="Category" value={f.category} onChange={e=>setF({...f,category:e.target.value})}
          options={FB_CATS.map(c=>({v:c.v,l:c.l}))}/>
        <Inp label="Subject *" value={f.subject} onChange={e=>setF({...f,subject:e.target.value})} placeholder="Brief summary of your feedback"/>
        <div style={{display:'flex',flexDirection:'column',gap:3}}>
          <label style={{fontSize:12,fontWeight:600,color:T.t2}}>Message *</label>
          <textarea value={f.message} onChange={e=>setF({...f,message:e.target.value})} rows={6} placeholder="Tell us what's on your mind…"
            style={{padding:'10px 12px',borderRadius:8,border:`1.5px solid ${T.brd}`,background:T.inp,fontSize:13,outline:'none',resize:'vertical',fontFamily:'inherit'}}/>
        </div>
        <Btn v="g" disabled={saving} onClick={submit} sz="lg" style={{justifyContent:'center'}}>
          {saving ? 'Sending…' : 'Send Feedback →'}
        </Btn>
      </FG>
    </Modal>
  </div>;
}

// ══════════════════════════════════════════════════════════════════════
// ╔════════════════════════════════════════════════════════════════════╗
// ║  SUPER ADMIN — MillPro Platform Team Portal                        ║
// ╚════════════════════════════════════════════════════════════════════╝
// ══════════════════════════════════════════════════════════════════════

function SuperRouter({ showToast }) {
  const [admin, setAdmin] = useState(() => {
    try { return JSON.parse(localStorage.getItem('millpro_super_admin') || 'null'); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('millpro_super_token');
    if (!t) { setLoading(false); return; }
    superAPI.me().then(r => setAdmin(r.data)).catch(() => {
      localStorage.removeItem('millpro_super_token');
      localStorage.removeItem('millpro_super_admin');
      setAdmin(null);
    }).finally(() => setLoading(false));
  }, []);

  const handleLogin = (token, adminData) => {
    localStorage.setItem('millpro_super_token', token);
    localStorage.setItem('millpro_super_admin', JSON.stringify(adminData));
    setAdmin(adminData);
  };
  const handleLogout = () => {
    localStorage.removeItem('millpro_super_token');
    localStorage.removeItem('millpro_super_admin');
    setAdmin(null);
  };

  if (loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#050C07'}}><Spinner/></div>;
  if (!admin)  return <SuperLogin onLogin={handleLogin} showToast={showToast}/>;
  return <SuperApp admin={admin} setAdmin={setAdmin} onLogout={handleLogout} showToast={showToast}/>;
}

// ── Super Admin Login ──
function SuperLogin({ onLogin, showToast }) {
  const [email, setEmail] = useState('');
  const [pass,  setPass]  = useState('');
  const [err,   setErr]   = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !pass) return setErr('Enter your email and password');
    setLoading(true); setErr('');
    try {
      const r = await superAPI.login({ email, password: pass });
      onLogin(r.data.token, r.data.admin);
      showToast(`Welcome back, ${r.data.admin.name}`);
    } catch (e) { setErr(e.response?.data?.error || 'Sign in failed'); }
    setLoading(false);
  };

  return <AuthShell maxWidth={460}>
    <div style={{textAlign:'center',marginBottom:32}}>
      <div style={{
        width:66,height:66,borderRadius:18,margin:'0 auto 20px',
        background:`linear-gradient(135deg,${_AUTH_GOLD},${_AUTH_GOLD2})`,
        display:'flex',alignItems:'center',justifyContent:'center',
        fontSize:30,fontWeight:900,color:'#000',fontFamily:FH,letterSpacing:-1,
        boxShadow:`0 16px 44px ${_AUTH_GOLD}66,inset 0 2px 0 rgba(255,255,255,0.4),0 0 0 1px ${_AUTH_GOLD2}`,
      }}>M</div>
      <h1 style={{fontFamily:FH,fontSize:30,fontWeight:900,color:'#fff',letterSpacing:-1,marginBottom:6}}>Super Admin</h1>
      <p style={{color:'rgba(255,255,255,.42)',fontSize:13.5,letterSpacing:.3}}>MillPro Platform Console</p>
    </div>

    <div style={authGlass}>
      {err && <div style={{padding:'12px 16px',background:'rgba(183,28,28,0.10)',border:`1px solid rgba(255,82,82,0.3)`,borderRadius:10,color:'#ff8a80',fontSize:13,marginBottom:18,fontWeight:500}}>{err}</div>}
      <label style={authLbl}>Email</label>
      <input type="email" className="mp-ai" autoFocus value={email}
        onChange={e=>{setEmail(e.target.value);setErr('');}}
        onKeyDown={e=>e.key==='Enter'&&submit()}
        placeholder="admin@millpro.app"
        style={{...authInp,marginBottom:16,fontSize:14.5}}/>
      <label style={authLbl}>Password</label>
      <input type="password" className="mp-ai" value={pass}
        onChange={e=>{setPass(e.target.value);setErr('');}}
        onKeyDown={e=>e.key==='Enter'&&submit()}
        placeholder="••••••••"
        style={{...authInp,marginBottom:18,fontSize:14.5}}/>
      <button onClick={submit} disabled={loading} className="mp-ab mp-ab-prim" style={{...authBtnPrim,
        background:loading?'rgba(80,80,80,0.5)':authBtnPrim.background,
        cursor:loading?'not-allowed':'pointer',
        boxShadow:loading?'none':authBtnPrim.boxShadow}}>
        {loading?'Signing in…':'Sign In →'}
      </button>
    </div>

    <p style={{textAlign:'center',marginTop:18,fontSize:11,color:'rgba(255,255,255,0.25)',letterSpacing:.3}}>
      Restricted access · MillPro Enterprise team only
    </p>
  </AuthShell>;
}

// ── Super App Shell ──
function SuperApp({ admin, setAdmin, onLogout, showToast }) {
  const [page, setPage] = useState('overview');
  const nav = [
    { id:'overview',  l:'Overview',  ic:IC.home },
    { id:'companies', l:'Companies', ic:IC.users },
    { id:'create',    l:'Create Company', ic:IC.plus },
    { id:'feedback',  l:'Feedback',  ic:IC.star },
    { id:'account',   l:'Account',   ic:IC.settings },
  ];

  return <div style={{display:'flex',height:'100vh',overflow:'hidden',background:'#0A120A',color:'#E8E2D8',fontFamily:"'Inter',system-ui,sans-serif"}}>
    <style>{`
      .sa-nav-btn:hover { background:rgba(255,255,255,0.05); color:#fff !important; }
      .sa-nav-btn.active { background:linear-gradient(135deg,${_AUTH_GOLD}22,${_AUTH_GOLD}08); color:#fff !important; box-shadow:inset 3px 0 0 ${_AUTH_GOLD}; }
      .sa-card { background:linear-gradient(160deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015)); border:1px solid rgba(255,255,255,0.06); border-radius:14px; padding:20px; backdrop-filter:blur(8px); box-shadow:0 6px 24px rgba(0,0,0,0.3); }
      .sa-input { width:100%; padding:11px 14px; border-radius:10px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03); color:#fff; font-size:13.5px; outline:none; transition:all .2s; box-sizing:border-box; }
      .sa-input:focus { border-color:${_AUTH_GOLD}; box-shadow:0 0 0 3px ${_AUTH_GOLD}1f; background:rgba(255,255,255,0.05); }
      .sa-btn { padding:10px 18px; border-radius:10px; border:none; cursor:pointer; font-weight:700; font-size:13px; letterSpacing:.2px; transition:all .2s; }
      .sa-btn-prim { background:linear-gradient(135deg,${_AUTH_GRN},${_AUTH_GRN2}); color:#fff; box-shadow:0 6px 18px ${_AUTH_GRN}55; }
      .sa-btn-prim:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 10px 24px ${_AUTH_GRN}66; }
      .sa-btn-gold { background:linear-gradient(135deg,${_AUTH_GOLD},${_AUTH_GOLD2}); color:#000; box-shadow:0 6px 18px ${_AUTH_GOLD}55; }
      .sa-btn-gold:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 10px 24px ${_AUTH_GOLD}66; }
      .sa-btn-danger { background:rgba(183,28,28,0.18); color:#ff8a80; border:1px solid rgba(183,28,28,0.35); }
      .sa-btn-danger:hover { background:rgba(183,28,28,0.3); }
      .sa-btn-ghost { background:rgba(255,255,255,0.04); color:rgba(255,255,255,0.8); border:1px solid rgba(255,255,255,0.1); }
      .sa-btn-ghost:hover { background:rgba(255,255,255,0.08); border-color:${_AUTH_GOLD}66; color:${_AUTH_GOLD2}; }
      .sa-row:hover { background:rgba(255,255,255,0.02); }
      .sa-pill { display:inline-block; padding:3px 10px; border-radius:20px; font-size:10.5px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; }
    `}</style>

    {/* Sidebar */}
    <aside style={{width:230,minWidth:230,background:'#050C07',borderRight:`1px solid rgba(255,255,255,0.05)`,display:'flex',flexDirection:'column'}}>
      <div style={{padding:'18px 18px 16px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
          <div style={{width:36,height:36,borderRadius:9,background:`linear-gradient(135deg,${_AUTH_GOLD},${_AUTH_GOLD2})`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:FH,fontWeight:900,color:'#000',fontSize:17,boxShadow:`0 4px 14px ${_AUTH_GOLD}55`}}>M</div>
          <div>
            <div style={{fontFamily:FH,fontWeight:800,fontSize:14,color:'#fff'}}>MillPro</div>
            <div style={{fontSize:9.5,color:_AUTH_GOLD,letterSpacing:1.2,fontWeight:700,textTransform:'uppercase'}}>Super Admin</div>
          </div>
        </div>
      </div>
      <nav style={{flex:1,padding:'10px 8px',display:'flex',flexDirection:'column',gap:2}}>
        {nav.map(n => (
          <button key={n.id} onClick={()=>setPage(n.id)} className={`sa-nav-btn ${page===n.id?'active':''}`}
            style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',border:'none',background:'transparent',color:'rgba(255,255,255,0.6)',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,textAlign:'left',transition:'all .2s'}}>
            <I d={n.ic} sz={16}/> {n.l}
          </button>
        ))}
      </nav>
      <div style={{padding:'12px 14px',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
        <div style={{fontSize:11.5,color:'rgba(255,255,255,0.5)',marginBottom:2,fontWeight:600}}>{admin.name}</div>
        <div style={{fontSize:10.5,color:'rgba(255,255,255,0.3)',marginBottom:10}}>{admin.email}</div>
        <button onClick={onLogout} style={{display:'flex',alignItems:'center',gap:7,padding:'7px 10px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.6)',cursor:'pointer',fontSize:12,fontWeight:600,borderRadius:8,width:'100%',transition:'all .2s'}}
          onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.08)';e.currentTarget.style.color='#fff';}}
          onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.color='rgba(255,255,255,0.6)';}}>
          <I d={IC.logout} sz={13}/> Sign out
        </button>
      </div>
    </aside>

    {/* Main */}
    <main style={{flex:1,overflow:'auto',padding:'28px 36px'}}>
      {page==='overview'  && <SuperOverview showToast={showToast} setPage={setPage}/>}
      {page==='companies' && <SuperCompanies showToast={showToast}/>}
      {page==='create'    && <SuperCreateCompany showToast={showToast} onCreated={()=>setPage('companies')}/>}
      {page==='feedback'  && <SuperFeedback showToast={showToast}/>}
      {page==='account'   && <SuperAccount admin={admin} setAdmin={setAdmin} showToast={showToast}/>}
    </main>
  </div>;
}

// ── Overview ──
function SuperOverview({ showToast, setPage }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    superAPI.overview().then(r => { setData(r.data); setLoading(false); })
      .catch(e => { showToast(e.response?.data?.error || 'Failed to load overview', 'error'); setLoading(false); });
  }, []);
  if (loading) return <Spinner/>;
  if (!data)   return <p style={{color:'rgba(255,255,255,0.5)'}}>No data</p>;

  const c = data.counts;
  const stats = [
    { l:'Total Companies', v:c.totalCompanies, sub:`${c.activeCompanies} active · ${c.blockedCompanies} blocked`, color:_AUTH_GOLD, ic:IC.users },
    { l:'Active Users',    v:c.totalUsers,     sub:'across all companies', color:_AUTH_GRN2,    ic:IC.users },
    { l:'Mill Employees',  v:c.totalEmployees, sub:'tracked in MillPro',   color:'#1F8AE8',     ic:IC.users },
    { l:'Production Batches', v:c.totalBatches, sub:'logged all-time',     color:'#C74B1A',     ic:IC.factory },
    { l:'Sales Records',   v:c.totalSales,     sub:'all-time',             color:'#6A1B9A',     ic:IC.receipt },
    { l:'Open Feedback',   v:c.openFeedback,   sub:`of ${c.totalFeedback} total`, color:_AUTH_GOLD, ic:IC.alert },
  ];
  const maxGrowth = Math.max(1, ...data.growth.map(g => g.count));

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:26,flexWrap:'wrap',gap:12}}>
      <div>
        <h1 style={{fontFamily:FH,fontSize:28,fontWeight:900,color:'#fff',marginBottom:4,letterSpacing:-.5}}>Platform Overview</h1>
        <p style={{color:'rgba(255,255,255,0.45)',fontSize:13.5}}>MillPro Enterprise · live across all tenants</p>
      </div>
      <div style={{display:'flex',gap:8}}>
        <button onClick={()=>setPage('create')} className="sa-btn sa-btn-gold">+ Create Company</button>
        <button onClick={()=>setPage('feedback')} className="sa-btn sa-btn-ghost">View Feedback</button>
      </div>
    </div>

    {/* Stats grid */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:14,marginBottom:24}}>
      {stats.map(s => (
        <div key={s.l} className="sa-card" style={{borderTop:`2px solid ${s.color}`}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <span style={{fontSize:10.5,fontWeight:700,color:'rgba(255,255,255,0.45)',textTransform:'uppercase',letterSpacing:1}}>{s.l}</span>
            <div style={{width:30,height:30,borderRadius:8,background:`${s.color}1f`,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <I d={s.ic} sz={15} c={s.color}/>
            </div>
          </div>
          <div style={{fontFamily:FH,fontSize:26,fontWeight:800,color:'#fff',lineHeight:1.1,marginBottom:4}}>{fmt(s.v)}</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>{s.sub}</div>
        </div>
      ))}
    </div>

    {/* Growth + recent */}
    <div style={{display:'grid',gridTemplateColumns:'1.4fr 1fr',gap:16}}>
      <div className="sa-card">
        <h3 style={{fontFamily:FH,fontWeight:700,fontSize:15,color:'#fff',marginBottom:14}}>Company Growth · Last 6 Months</h3>
        <div style={{display:'flex',alignItems:'flex-end',gap:8,height:160,padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          {data.growth.map((g,i) => {
            const h = (g.count / maxGrowth) * 130;
            return <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.6)',fontWeight:600}}>{g.count}</div>
              <div style={{width:'100%',height:Math.max(4,h),borderRadius:'6px 6px 0 0',background:`linear-gradient(to top,${_AUTH_GOLD},${_AUTH_GOLD2})`,boxShadow:`0 0 12px ${_AUTH_GOLD}55`}}/>
              <div style={{fontSize:9.5,color:'rgba(255,255,255,0.35)'}}>{g.month.split('-')[1]}/{g.month.split('-')[0].slice(2)}</div>
            </div>;
          })}
        </div>
      </div>

      <div className="sa-card">
        <h3 style={{fontFamily:FH,fontWeight:700,fontSize:15,color:'#fff',marginBottom:14}}>Newest Companies</h3>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {data.recentCompanies.map(c => (
            <div key={c.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:'#fff'}}>{c.name}</div>
                <div style={{fontSize:10.5,color:'rgba(255,255,255,0.35)'}}>{c.code} · {fmtD(c.createdAt)}</div>
              </div>
              <span className="sa-pill" style={{background:c.status==='ACTIVE'?`${_AUTH_GRN}22`:`${T.r}22`,color:c.status==='ACTIVE'?'#9DD8A0':'#ff8a80'}}>{c.status}</span>
            </div>
          ))}
          {data.recentCompanies.length === 0 && <p style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>No companies yet</p>}
        </div>
      </div>
    </div>

    {/* Recent activity */}
    <div className="sa-card" style={{marginTop:16}}>
      <h3 style={{fontFamily:FH,fontWeight:700,fontSize:15,color:'#fff',marginBottom:14}}>Recent Sign-ins</h3>
      {data.recentLogins.length === 0
        ? <p style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>No activity yet</p>
        : <div style={{display:'flex',flexDirection:'column',gap:0}}>
          {data.recentLogins.map(u => (
            <div key={u.id} className="sa-row" style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',transition:'background .15s',borderRadius:6}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:`linear-gradient(135deg,${_AUTH_GOLD},${_AUTH_GOLD2})`,display:'flex',alignItems:'center',justifyContent:'center',color:'#000',fontWeight:800,fontFamily:FH,fontSize:13}}>{u.name[0].toUpperCase()}</div>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:'#fff'}}>{u.name} <span style={{color:'rgba(255,255,255,0.4)',fontWeight:400,fontSize:11.5,marginLeft:6}}>· {u.role}</span></div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>{u.company.name} ({u.company.code})</div>
                </div>
              </div>
              <span style={{fontSize:11,color:'rgba(255,255,255,0.5)'}}>{fmtDT(u.lastLogin)}</span>
            </div>
          ))}
        </div>
      }
    </div>
  </div>;
}

// ── Companies List + Detail ──
function SuperCompanies({ showToast }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    superAPI.listCompanies({ q: q || undefined, status: status || undefined })
      .then(r => { setList(r.data); setLoading(false); })
      .catch(e => { showToast(e.response?.data?.error || 'Failed to load', 'error'); setLoading(false); });
  }, [q, status]);
  useEffect(() => { load(); }, [load]);

  if (selected) return <SuperCompanyDetail id={selected} onBack={()=>{setSelected(null);load();}} showToast={showToast}/>;

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
      <div>
        <h1 style={{fontFamily:FH,fontSize:28,fontWeight:900,color:'#fff',marginBottom:4,letterSpacing:-.5}}>Companies</h1>
        <p style={{color:'rgba(255,255,255,0.45)',fontSize:13.5}}>{list.length} companies registered on MillPro</p>
      </div>
    </div>

    {/* Filters */}
    <div className="sa-card" style={{marginBottom:14,padding:'14px 18px',display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
      <input className="sa-input" placeholder="Search by name or code…" value={q} onChange={e=>setQ(e.target.value)} style={{flex:1,minWidth:200}}/>
      <select className="sa-input" value={status} onChange={e=>setStatus(e.target.value)} style={{maxWidth:170,cursor:'pointer'}}>
        <option value="" style={{background:'#0F1C12'}}>All status</option>
        <option value="ACTIVE" style={{background:'#0F1C12'}}>Active only</option>
        <option value="BLOCKED" style={{background:'#0F1C12'}}>Blocked only</option>
      </select>
    </div>

    {loading ? <Spinner/> : list.length === 0 ? (
      <div className="sa-card" style={{textAlign:'center',padding:'48px 20px'}}>
        <div style={{fontSize:36,marginBottom:8,opacity:.5}}>🏢</div>
        <p style={{color:'rgba(255,255,255,0.5)'}}>No companies match your filter</p>
      </div>
    ) : (
      <div className="sa-card" style={{padding:0,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
          <thead>
            <tr style={{background:'rgba(255,255,255,0.03)'}}>
              {['Company','Code','Status','Users','Employees','Sales','Joined',''].map(h => <th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:1}}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {list.map(c => (
              <tr key={c.id} className="sa-row" style={{borderTop:'1px solid rgba(255,255,255,0.04)',transition:'background .15s'}}>
                <td style={{padding:'12px 16px'}}>
                  <div style={{fontWeight:700,color:'#fff'}}>{c.name}</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>{c.phone || '—'}</div>
                </td>
                <td style={{padding:'12px 16px',fontFamily:'monospace',color:_AUTH_GOLD,fontWeight:700,letterSpacing:1.5}}>{c.code}</td>
                <td style={{padding:'12px 16px'}}>
                  <span className="sa-pill" style={{background:c.status==='ACTIVE'?`${_AUTH_GRN}22`:`${T.r}22`,color:c.status==='ACTIVE'?'#9DD8A0':'#ff8a80'}}>{c.status}</span>
                </td>
                <td style={{padding:'12px 16px',color:'rgba(255,255,255,0.85)'}}>{c._count.users}</td>
                <td style={{padding:'12px 16px',color:'rgba(255,255,255,0.85)'}}>{c._count.employees}</td>
                <td style={{padding:'12px 16px',color:'rgba(255,255,255,0.85)'}}>{c._count.sales}</td>
                <td style={{padding:'12px 16px',color:'rgba(255,255,255,0.6)',fontSize:12}}>{fmtD(c.createdAt)}</td>
                <td style={{padding:'12px 16px',textAlign:'right'}}>
                  <button onClick={()=>setSelected(c.id)} className="sa-btn sa-btn-ghost" style={{padding:'6px 14px',fontSize:11.5}}>View →</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>;
}

function SuperCompanyDetail({ id, onBack, showToast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resetUser, setResetUser] = useState(null);
  const [newPass, setNewPass] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    superAPI.getCompany(id).then(r => { setData(r.data); setLoading(false); })
      .catch(e => { showToast(e.response?.data?.error || 'Failed to load', 'error'); setLoading(false); });
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const toggleStatus = async () => {
    const newStatus = data.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    try {
      await superAPI.setStatus(id, newStatus, newStatus === 'BLOCKED' ? blockReason : undefined);
      showToast(`Company ${newStatus === 'BLOCKED' ? 'blocked' : 'unblocked'}`);
      setConfirmBlock(false); setBlockReason('');
      load();
    } catch (e) { showToast(e.response?.data?.error || 'Failed', 'error'); }
  };

  const doDelete = async () => {
    try {
      await superAPI.deleteCompany(id);
      showToast('Company deleted');
      onBack();
    } catch (e) { showToast(e.response?.data?.error || 'Failed', 'error'); }
  };

  const doReset = async () => {
    if (newPass.length < 8) return showToast('Password must be 8+ characters', 'error');
    try {
      await superAPI.resetUserPassword(resetUser.id, newPass);
      showToast(`Password reset for ${resetUser.name}`);
      setResetUser(null); setNewPass('');
    } catch (e) { showToast(e.response?.data?.error || 'Failed', 'error'); }
  };

  if (loading) return <Spinner/>;
  if (!data) return null;

  return <div>
    <button onClick={onBack} className="sa-btn sa-btn-ghost" style={{marginBottom:18}}>← Back to companies</button>

    {/* Header card */}
    <div className="sa-card" style={{marginBottom:16,padding:24,borderTop:`3px solid ${data.status==='ACTIVE'?_AUTH_GRN:T.r}`}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:18,flexWrap:'wrap'}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
            <h1 style={{fontFamily:FH,fontSize:26,fontWeight:900,color:'#fff',letterSpacing:-.5}}>{data.name}</h1>
            <span className="sa-pill" style={{background:data.status==='ACTIVE'?`${_AUTH_GRN}22`:`${T.r}22`,color:data.status==='ACTIVE'?'#9DD8A0':'#ff8a80'}}>{data.status}</span>
          </div>
          <div style={{display:'flex',gap:18,flexWrap:'wrap',color:'rgba(255,255,255,0.55)',fontSize:13}}>
            <span><strong style={{color:_AUTH_GOLD,fontFamily:'monospace',letterSpacing:1.5}}>{data.code}</strong></span>
            <span>📞 {data.phone || '—'}</span>
            <span>📍 {data.address || '—'}</span>
            <span>💱 {data.currency}</span>
            <span>📅 Joined {fmtD(data.createdAt)}</span>
          </div>
          {data.status === 'BLOCKED' && data.blockedReason && (
            <div style={{marginTop:10,padding:'10px 14px',background:'rgba(183,28,28,0.1)',border:`1px solid rgba(255,82,82,0.25)`,borderRadius:8,fontSize:12.5,color:'#ff8a80'}}>
              <strong>Blocked reason:</strong> {data.blockedReason} <span style={{opacity:.6}}>· {fmtDT(data.blockedAt)}</span>
            </div>
          )}
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {data.status === 'ACTIVE'
            ? <button onClick={()=>setConfirmBlock(true)} className="sa-btn sa-btn-danger">🚫 Block</button>
            : <button onClick={toggleStatus} className="sa-btn sa-btn-prim">✓ Unblock</button>}
          <button onClick={()=>setConfirmDelete(true)} className="sa-btn sa-btn-danger">🗑 Delete</button>
        </div>
      </div>
    </div>

    {/* Stat strip */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10,marginBottom:18}}>
      {[
        ['Users',     data._count.users,     _AUTH_GOLD],
        ['Employees', data._count.employees, _AUTH_GRN2],
        ['Batches',   data._count.batches,   '#C74B1A'],
        ['Sales',     data._count.sales,     '#6A1B9A'],
        ['Purchases', data._count.purchases, '#1F8AE8'],
        ['Expenses',  data._count.expenses,  '#B71C1C'],
        ['Customers', data._count.customers, '#00796B'],
        ['Orders',    data._count.orders,    '#C9961E'],
        ['Feedback',  data._count.feedback,  _AUTH_GOLD],
      ].map(([l,v,c]) => (
        <div key={l} className="sa-card" style={{padding:14,textAlign:'center'}}>
          <div style={{fontSize:9.5,fontWeight:700,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>{l}</div>
          <div style={{fontFamily:FH,fontSize:22,fontWeight:800,color:c}}>{fmt(v)}</div>
        </div>
      ))}
    </div>

    {/* Personnel */}
    <div className="sa-card" style={{marginBottom:16,padding:0,overflow:'hidden'}}>
      <div style={{padding:'14px 20px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <h3 style={{fontFamily:FH,fontWeight:700,fontSize:15,color:'#fff'}}>Personnel ({data.users.length})</h3>
        <p style={{fontSize:11.5,color:'rgba(255,255,255,0.4)',marginTop:2}}>Click "Reset password" to help a user who forgot theirs.</p>
      </div>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
        <thead>
          <tr style={{background:'rgba(255,255,255,0.02)'}}>
            {['Name','Role','Email','Phone','Last login','Joined',''].map(h => <th key={h} style={{padding:'10px 16px',textAlign:'left',fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:1}}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.users.map(u => {
            const rc = u.role==='OWNER'?_AUTH_GOLD:u.role==='ADMIN'?'#1F8AE8':_AUTH_GRN;
            return <tr key={u.id} className="sa-row" style={{borderTop:'1px solid rgba(255,255,255,0.04)'}}>
              <td style={{padding:'12px 16px',display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:`linear-gradient(135deg,${rc},${rc}aa)`,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontFamily:FH,fontSize:13,flexShrink:0}}>{u.name[0].toUpperCase()}</div>
                <div style={{fontWeight:600,color:'#fff'}}>{u.name}</div>
              </td>
              <td style={{padding:'12px 16px'}}><span className="sa-pill" style={{background:`${rc}22`,color:rc}}>{u.role}</span></td>
              <td style={{padding:'12px 16px',color:'rgba(255,255,255,0.7)'}}>{u.email || '—'}</td>
              <td style={{padding:'12px 16px',color:'rgba(255,255,255,0.7)'}}>{u.phone || '—'}</td>
              <td style={{padding:'12px 16px',color:'rgba(255,255,255,0.6)',fontSize:12}}>{u.lastLogin ? fmtDT(u.lastLogin) : 'Never'}</td>
              <td style={{padding:'12px 16px',color:'rgba(255,255,255,0.6)',fontSize:12}}>{fmtD(u.createdAt)}</td>
              <td style={{padding:'12px 16px',textAlign:'right'}}>
                <button onClick={()=>{setResetUser(u);setNewPass('');}} className="sa-btn sa-btn-ghost" style={{padding:'6px 12px',fontSize:11}}>🔑 Reset password</button>
              </td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>

    {/* Recent feedback */}
    {data.recentFeedback?.length > 0 && (
      <div className="sa-card" style={{padding:0,overflow:'hidden'}}>
        <div style={{padding:'14px 20px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <h3 style={{fontFamily:FH,fontWeight:700,fontSize:15,color:'#fff'}}>Recent Feedback from this company</h3>
        </div>
        <div style={{padding:'10px 20px 20px'}}>
          {data.recentFeedback.map(f => {
            const cat = FB_CATS.find(c => c.v === f.category) || FB_CATS[0];
            return <div key={f.id} style={{padding:'12px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
              <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:5}}>
                <span className="sa-pill" style={{background:`${cat.c}22`,color:cat.c}}>{cat.l}</span>
                <span style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>{f.userName} · {fmtDT(f.createdAt)}</span>
              </div>
              <div style={{fontWeight:700,color:'#fff',marginBottom:3,fontSize:14}}>{f.subject}</div>
              <div style={{fontSize:12.5,color:'rgba(255,255,255,0.6)',lineHeight:1.5}}>{f.message}</div>
            </div>;
          })}
        </div>
      </div>
    )}

    {/* Modals */}
    <Modal open={!!resetUser} onClose={()=>setResetUser(null)} title={`Reset password for ${resetUser?.name}`}>
      <FG>
        <p style={{fontSize:13,color:T.t2,lineHeight:1.55}}>Set a temporary password for this user. They should sign in and change it immediately.</p>
        <Inp label="New Password (min 8 chars)" type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="••••••••"/>
        <Btn v="g" sz="lg" onClick={doReset} disabled={newPass.length<8} style={{justifyContent:'center'}}>Reset Password</Btn>
      </FG>
    </Modal>

    <Modal open={confirmBlock} onClose={()=>setConfirmBlock(false)} title="Block this company?">
      <FG>
        <div style={{padding:'12px 14px',background:T.rL,border:`1px solid ${T.r}33`,borderRadius:10,fontSize:13,color:T.r}}>
          <strong>Warning:</strong> All users in this company will be unable to sign in until you unblock them. Existing data is preserved.
        </div>
        <Inp label="Reason (optional, shown internally only)" value={blockReason} onChange={e=>setBlockReason(e.target.value)} placeholder="e.g. Payment overdue, ToS violation"/>
        <Fx gap={10}>
          <Btn v="gh" onClick={()=>setConfirmBlock(false)}>Cancel</Btn>
          <Btn v="r" onClick={toggleStatus} style={{flex:1,justifyContent:'center'}}>Yes, Block Company</Btn>
        </Fx>
      </FG>
    </Modal>

    <Modal open={confirmDelete} onClose={()=>setConfirmDelete(false)} title="Permanently delete this company?">
      <FG>
        <div style={{padding:'12px 14px',background:T.rL,border:`1px solid ${T.r}55`,borderRadius:10,fontSize:13,color:T.r}}>
          <strong>This cannot be undone.</strong> All users, employees, batches, sales, payroll history and feedback for <strong>{data.name}</strong> will be permanently deleted.
        </div>
        <Fx gap={10}>
          <Btn v="gh" onClick={()=>setConfirmDelete(false)}>Cancel</Btn>
          <Btn v="r" onClick={doDelete} style={{flex:1,justifyContent:'center'}}>Yes, Delete Forever</Btn>
        </Fx>
      </FG>
    </Modal>
  </div>;
}

// ── Create Company (super-admin side) ──
// Hoisted (renamed inline Field -> SuperField) to keep input focus across re-renders.
const SuperField = ({label, hint, children}) => (
  <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:14}}>
    <label style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:1.2}}>{label}</label>
    {children}
    {hint && <p style={{fontSize:11.5,color:'rgba(255,255,255,0.4)'}}>{hint}</p>}
  </div>
);

function SuperCreateCompany({ showToast, onCreated }) {
  const [f, setF] = useState({ companyName:'',companyPhone:'',companyAddress:'',companyCode:'',currency:'UGX',ownerName:'',ownerEmail:'',ownerPassword:'',adminName:'',adminEmail:'',adminPassword:'' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async () => {
    if (!f.companyName || !f.ownerName || !f.ownerPassword || f.ownerPassword.length < 8) {
      return showToast('Company name, owner name and 8+ char password are required', 'error');
    }
    setLoading(true);
    try {
      const r = await superAPI.createCompany(f);
      setResult(r.data);
      showToast(`Company "${r.data.name}" created with code ${r.data.code}`);
    } catch (e) { showToast(e.response?.data?.error || 'Failed to create company', 'error'); }
    setLoading(false);
  };

  if (result) return <div style={{maxWidth:600,margin:'0 auto'}}>
    <div className="sa-card" style={{padding:36,textAlign:'center',borderTop:`3px solid ${_AUTH_GRN}`}}>
      <div style={{width:60,height:60,borderRadius:'50%',margin:'0 auto 18px',
        background:`radial-gradient(circle at 30% 30%,${_AUTH_GRN2},${_AUTH_GRN})`,
        display:'flex',alignItems:'center',justifyContent:'center',
        boxShadow:`0 12px 30px ${_AUTH_GRN}66`}}>
        <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
      </div>
      <h2 style={{fontFamily:FH,fontSize:22,fontWeight:800,color:'#fff',marginBottom:6}}>{result.name}</h2>
      <p style={{color:'rgba(255,255,255,0.5)',fontSize:13.5,marginBottom:22}}>Company has been created. Share these credentials with the company owner.</p>
      <div style={{
        padding:'24px 20px',background:`linear-gradient(135deg,${_AUTH_GOLD}15,${_AUTH_GOLD}05)`,
        border:`1px solid ${_AUTH_GOLD}40`,borderRadius:14,marginBottom:20,
        boxShadow:`0 0 30px ${_AUTH_GOLD}22`
      }}>
        <div style={{fontSize:10.5,color:_AUTH_GOLD,textTransform:'uppercase',letterSpacing:1.6,fontWeight:700,marginBottom:8}}>Company Sign-In Code</div>
        <div style={{fontSize:42,fontWeight:900,color:'#fff',fontFamily:'monospace',letterSpacing:8,textShadow:`0 0 30px ${_AUTH_GOLD}88`}}>{result.code}</div>
      </div>
      <div style={{display:'flex',gap:10,justifyContent:'center'}}>
        <button onClick={() => { setResult(null); setF({ companyName:'',companyPhone:'',companyAddress:'',companyCode:'',currency:'UGX',ownerName:'',ownerEmail:'',ownerPassword:'',adminName:'',adminEmail:'',adminPassword:'' }); }} className="sa-btn sa-btn-ghost">+ Create Another</button>
        <button onClick={onCreated} className="sa-btn sa-btn-prim">Go to Companies →</button>
      </div>
    </div>
  </div>;


  return <div style={{maxWidth:780,margin:'0 auto'}}>
    <h1 style={{fontFamily:FH,fontSize:28,fontWeight:900,color:'#fff',marginBottom:6,letterSpacing:-.5}}>Create Company</h1>
    <p style={{color:'rgba(255,255,255,0.45)',fontSize:13.5,marginBottom:22}}>Set up a company on behalf of a customer.</p>

    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <div className="sa-card" style={{padding:24}}>
        <h3 style={{fontFamily:FH,fontWeight:700,fontSize:15,color:_AUTH_GOLD,marginBottom:14}}>Company Details</h3>
        <SuperField label="Company Name *">
          <input className="sa-input" value={f.companyName} onChange={e=>setF({...f,companyName:e.target.value})} placeholder="e.g. Mukasa Maize Millers"/>
        </SuperField>
        <SuperField label="Phone">
          <input className="sa-input" value={f.companyPhone} onChange={e=>setF({...f,companyPhone:e.target.value})} placeholder="+256 700 000 000"/>
        </SuperField>
        <SuperField label="Address">
          <input className="sa-input" value={f.companyAddress} onChange={e=>setF({...f,companyAddress:e.target.value})} placeholder="Town, District"/>
        </SuperField>
        <SuperField label="Currency">
          <select className="sa-input" value={f.currency} onChange={e=>setF({...f,currency:e.target.value})} style={{cursor:'pointer'}}>
            {[['UGX','Ugandan Shilling'],['KES','Kenyan Shilling'],['TZS','Tanzanian Shilling'],['USD','US Dollar']].map(([v,l]) => <option key={v} value={v} style={{background:'#0F1C12'}}>{v} — {l}</option>)}
          </select>
        </SuperField>
        <SuperField label="Custom Sign-In Code" hint="3–8 letters/numbers, e.g. MKS001 — auto-generated if blank.">
          <input className="sa-input" value={f.companyCode} onChange={e=>setF({...f,companyCode:e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8)})} placeholder="Leave blank for auto-generated" style={{letterSpacing:3,fontFamily:'monospace',textTransform:'uppercase'}}/>
        </SuperField>
      </div>

      <div className="sa-card" style={{padding:24}}>
        <h3 style={{fontFamily:FH,fontWeight:700,fontSize:15,color:_AUTH_GRN2,marginBottom:14}}>Owner Account</h3>
        <SuperField label="Owner Name *"><input className="sa-input" value={f.ownerName} onChange={e=>setF({...f,ownerName:e.target.value})}/></SuperField>
        <SuperField label="Email *"><input className="sa-input" type="email" value={f.ownerEmail} onChange={e=>setF({...f,ownerEmail:e.target.value})} placeholder="owner@company.com"/></SuperField>
        <SuperField label="Password *" hint="Minimum 8 characters."><input className="sa-input" type="password" value={f.ownerPassword} onChange={e=>setF({...f,ownerPassword:e.target.value})} placeholder="••••••••"/></SuperField>

        <h3 style={{fontFamily:FH,fontWeight:700,fontSize:14,color:'#1F8AE8',marginTop:20,marginBottom:14}}>Admin Account <span style={{fontSize:11,color:'rgba(255,255,255,0.4)',fontWeight:500}}>(optional)</span></h3>
        <SuperField label="Admin Name"><input className="sa-input" value={f.adminName} onChange={e=>setF({...f,adminName:e.target.value})}/></SuperField>
        <SuperField label="Email"><input className="sa-input" type="email" value={f.adminEmail} onChange={e=>setF({...f,adminEmail:e.target.value})}/></SuperField>
        <SuperField label="Password"><input className="sa-input" type="password" value={f.adminPassword} onChange={e=>setF({...f,adminPassword:e.target.value})} placeholder="••••••••"/></SuperField>
      </div>
    </div>

    <div style={{textAlign:'right',marginTop:20}}>
      <button onClick={submit} disabled={loading} className="sa-btn sa-btn-gold" style={{padding:'14px 36px',fontSize:14}}>
        {loading ? 'Creating company…' : '🚀 Launch Company'}
      </button>
    </div>
  </div>;
}

// ── Feedback Inbox ──
function SuperFeedback({ showToast }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const [response, setResponse] = useState('');
  const [newStatus, setNewStatus] = useState('IN_PROGRESS');

  const load = useCallback(() => {
    setLoading(true);
    superAPI.listFeedback({ status: status || undefined, q: q || undefined })
      .then(r => { setList(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [status, q]);
  useEffect(() => { load(); }, [load]);

  const openItem = (item) => {
    setOpen(item);
    setResponse(item.response || '');
    setNewStatus(item.status === 'OPEN' ? 'IN_PROGRESS' : item.status);
  };

  const save = async () => {
    try {
      await superAPI.updateFeedback(open.id, { status: newStatus, response: response.trim() || undefined });
      showToast('Feedback updated');
      setOpen(null);
      load();
    } catch (e) { showToast(e.response?.data?.error || 'Failed', 'error'); }
  };

  const counts = list.reduce((a,i) => { a[i.status] = (a[i.status]||0)+1; return a; }, {});

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
      <div>
        <h1 style={{fontFamily:FH,fontSize:28,fontWeight:900,color:'#fff',marginBottom:4,letterSpacing:-.5}}>Feedback Inbox</h1>
        <p style={{color:'rgba(255,255,255,0.45)',fontSize:13.5}}>Messages from companies across all tenants</p>
      </div>
    </div>

    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10,marginBottom:14}}>
      {[
        ['Total',       list.length,                _AUTH_GOLD],
        ['Open',        counts.OPEN || 0,           '#C74B1A'],
        ['In Progress', counts.IN_PROGRESS || 0,    '#1F8AE8'],
        ['Resolved',    counts.RESOLVED || 0,       _AUTH_GRN],
        ['Dismissed',   counts.DISMISSED || 0,      '#6B7670'],
      ].map(([l,v,c]) => (
        <div key={l} className="sa-card" style={{padding:14,textAlign:'center',borderTop:`2px solid ${c}`}}>
          <div style={{fontSize:9.5,fontWeight:700,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>{l}</div>
          <div style={{fontFamily:FH,fontSize:22,fontWeight:800,color:c}}>{v}</div>
        </div>
      ))}
    </div>

    <div className="sa-card" style={{marginBottom:14,padding:'14px 18px',display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
      <input className="sa-input" placeholder="Search subject or message…" value={q} onChange={e=>setQ(e.target.value)} style={{flex:1,minWidth:200}}/>
      <select className="sa-input" value={status} onChange={e=>setStatus(e.target.value)} style={{maxWidth:170,cursor:'pointer'}}>
        <option value="" style={{background:'#0F1C12'}}>All status</option>
        <option value="OPEN" style={{background:'#0F1C12'}}>Open</option>
        <option value="IN_PROGRESS" style={{background:'#0F1C12'}}>In progress</option>
        <option value="RESOLVED" style={{background:'#0F1C12'}}>Resolved</option>
        <option value="DISMISSED" style={{background:'#0F1C12'}}>Dismissed</option>
      </select>
    </div>

    {loading ? <Spinner/> : list.length === 0 ? (
      <div className="sa-card" style={{textAlign:'center',padding:'48px 20px'}}>
        <div style={{fontSize:36,marginBottom:8,opacity:.5}}>📭</div>
        <p style={{color:'rgba(255,255,255,0.5)'}}>No feedback yet</p>
      </div>
    ) : (
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {list.map(f => {
          const cat = FB_CATS.find(c => c.v === f.category) || FB_CATS[0];
          const sc = FB_STATUS_COLOR[f.status] || T.t3;
          return <div key={f.id} className="sa-card" style={{borderLeft:`3px solid ${cat.c}`,cursor:'pointer'}} onClick={()=>openItem(f)}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:14,marginBottom:8}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:6,flexWrap:'wrap'}}>
                  <span className="sa-pill" style={{background:`${cat.c}22`,color:cat.c}}>{cat.l}</span>
                  <span className="sa-pill" style={{background:`${sc}22`,color:sc}}>{f.status.replace('_',' ')}</span>
                  <span style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>{fmtDT(f.createdAt)}</span>
                </div>
                <div style={{fontWeight:700,color:'#fff',fontSize:15,marginBottom:5}}>{f.subject}</div>
                <div style={{fontSize:11.5,color:'rgba(255,255,255,0.55)',marginBottom:8}}>
                  <strong style={{color:_AUTH_GOLD}}>{f.company.name}</strong> ({f.company.code}) · {f.userName} · {f.userRole}
                </div>
                <p style={{fontSize:13,color:'rgba(255,255,255,0.65)',lineHeight:1.55,maxHeight:60,overflow:'hidden'}}>{f.message}</p>
              </div>
              <button onClick={(e)=>{e.stopPropagation();openItem(f);}} className="sa-btn sa-btn-ghost" style={{padding:'6px 14px',fontSize:11.5,whiteSpace:'nowrap'}}>Respond →</button>
            </div>
          </div>;
        })}
      </div>
    )}

    <Modal open={!!open} onClose={()=>setOpen(null)} title={open?.subject || 'Feedback'} wide>
      {open && <FG>
        <div style={{padding:'12px 14px',background:T.bg,borderRadius:10,fontSize:12.5,color:T.t2}}>
          <div><strong style={{color:T.txt}}>{open.company.name}</strong> ({open.company.code})</div>
          <div>From {open.userName} · {open.userRole} · {fmtDT(open.createdAt)}</div>
        </div>
        <div>
          <label style={{fontSize:12,fontWeight:600,color:T.t2,marginBottom:5,display:'block'}}>Original Message</label>
          <div style={{padding:'12px 14px',background:T.inp,borderRadius:8,fontSize:13.5,lineHeight:1.6,whiteSpace:'pre-wrap',maxHeight:200,overflow:'auto'}}>{open.message}</div>
        </div>
        <Sel label="Status" value={newStatus} onChange={e=>setNewStatus(e.target.value)}
          options={[{v:'OPEN',l:'Open'},{v:'IN_PROGRESS',l:'In Progress'},{v:'RESOLVED',l:'Resolved'},{v:'DISMISSED',l:'Dismissed'}]}/>
        <div style={{display:'flex',flexDirection:'column',gap:3}}>
          <label style={{fontSize:12,fontWeight:600,color:T.t2}}>Response (visible to the company)</label>
          <textarea value={response} onChange={e=>setResponse(e.target.value)} rows={5} placeholder="Write a reply…"
            style={{padding:'10px 12px',borderRadius:8,border:`1.5px solid ${T.brd}`,background:T.inp,fontSize:13,outline:'none',resize:'vertical',fontFamily:'inherit'}}/>
        </div>
        <Btn v="g" onClick={save} sz="lg" style={{justifyContent:'center'}}>Save Update</Btn>
      </FG>}
    </Modal>
  </div>;
}

// ── Account Settings ──
function SuperAccount({ admin, setAdmin, showToast }) {
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (next.length < 8) return showToast('New password must be at least 8 characters', 'error');
    setLoading(true);
    try {
      await superAPI.changePassword({ currentPassword: cur, newPassword: next });
      showToast('Password updated');
      setCur(''); setNext('');
    } catch (e) { showToast(e.response?.data?.error || 'Failed', 'error'); }
    setLoading(false);
  };

  return <div style={{maxWidth:560}}>
    <h1 style={{fontFamily:FH,fontSize:28,fontWeight:900,color:'#fff',marginBottom:6,letterSpacing:-.5}}>Account</h1>
    <p style={{color:'rgba(255,255,255,0.45)',fontSize:13.5,marginBottom:22}}>Manage your super admin credentials</p>

    <div className="sa-card" style={{padding:24,marginBottom:16}}>
      <h3 style={{fontFamily:FH,fontWeight:700,fontSize:15,color:'#fff',marginBottom:14}}>Profile</h3>
      <div style={{display:'flex',gap:14,alignItems:'center',padding:'12px 0'}}>
        <div style={{width:54,height:54,borderRadius:14,background:`linear-gradient(135deg,${_AUTH_GOLD},${_AUTH_GOLD2})`,display:'flex',alignItems:'center',justifyContent:'center',color:'#000',fontWeight:900,fontFamily:FH,fontSize:22}}>{admin.name[0].toUpperCase()}</div>
        <div>
          <div style={{fontWeight:700,fontSize:16,color:'#fff'}}>{admin.name}</div>
          <div style={{fontSize:12.5,color:'rgba(255,255,255,0.55)'}}>{admin.email}</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginTop:2}}>Last sign-in: {admin.lastLogin ? fmtDT(admin.lastLogin) : 'First time'}</div>
        </div>
      </div>
    </div>

    <div className="sa-card" style={{padding:24}}>
      <h3 style={{fontFamily:FH,fontWeight:700,fontSize:15,color:'#fff',marginBottom:14}}>Change Password</h3>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:1.2,marginBottom:6,display:'block'}}>Current Password</label>
          <input className="sa-input" type="password" value={cur} onChange={e=>setCur(e.target.value)} placeholder="••••••••"/>
        </div>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:1.2,marginBottom:6,display:'block'}}>New Password</label>
          <input className="sa-input" type="password" value={next} onChange={e=>setNext(e.target.value)} placeholder="At least 8 characters"/>
        </div>
        <button onClick={submit} disabled={loading||!cur||!next} className="sa-btn sa-btn-prim" style={{alignSelf:'flex-start'}}>
          {loading ? 'Updating…' : 'Update Password'}
        </button>
      </div>
    </div>
  </div>;
}

// ══════════════════════════════════════════════════════════════════════
// ╔════════════════════════════════════════════════════════════════════╗
// ║  AI ADVISOR — Chat assistant + Weekly report                       ║
// ╚════════════════════════════════════════════════════════════════════╝
// ══════════════════════════════════════════════════════════════════════

// ── Lightweight markdown renderer (bold, italic, code, lists, headings) ──
function renderMD(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const out = []; let inList = null; let buf = [];
  const flush = () => { if (buf.length) { out.push(<ul key={`ul-${out.length}`} style={{margin:'6px 0 10px',paddingLeft:20}}>{buf}</ul>); buf = []; } inList = null; };
  const inline = (s) => {
    // Order matters
    let parts = [{ t: s }];
    const apply = (re, wrap) => {
      const next = [];
      parts.forEach(p => {
        if (typeof p !== 'object' || !p.t) return next.push(p);
        let i = 0; let m;
        while ((m = re.exec(p.t)) !== null) {
          if (m.index > i) next.push({ t: p.t.slice(i, m.index) });
          next.push(wrap(m[1]));
          i = m.index + m[0].length;
        }
        if (i < p.t.length) next.push({ t: p.t.slice(i) });
      });
      parts = next;
    };
    apply(/\*\*(.+?)\*\*/g, (x) => <strong key={Math.random()} style={{color:'#fff'}}>{x}</strong>);
    apply(/`([^`]+)`/g,    (x) => <code key={Math.random()} style={{background:'rgba(201,150,30,0.12)',color:'#E8B84B',padding:'1px 6px',borderRadius:4,fontSize:'.92em',fontFamily:'monospace'}}>{x}</code>);
    apply(/\*(.+?)\*/g,    (x) => <em key={Math.random()}>{x}</em>);
    return parts.map((p, i) => typeof p === 'object' && p.t ? <span key={i}>{p.t}</span> : p);
  };
  lines.forEach((raw, idx) => {
    const line = raw.replace(/\s+$/,'');
    const h2 = line.match(/^##\s+(.+)$/);
    const h3 = line.match(/^###\s+(.+)$/);
    const li = line.match(/^[-*]\s+(.+)$/);
    if (h2)      { flush(); out.push(<h3 key={idx} style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:800,marginTop:14,marginBottom:6,color:'#fff'}}>{inline(h2[1])}</h3>); }
    else if (h3) { flush(); out.push(<h4 key={idx} style={{fontSize:14,fontWeight:700,marginTop:10,marginBottom:4,color:'#E8B84B'}}>{inline(h3[1])}</h4>); }
    else if (li) { inList = 'ul'; buf.push(<li key={idx} style={{margin:'3px 0',lineHeight:1.55}}>{inline(li[1])}</li>); }
    else if (line.trim() === '') { flush(); }
    else { flush(); out.push(<p key={idx} style={{margin:'4px 0 8px',lineHeight:1.6}}>{inline(line)}</p>); }
  });
  flush();
  return out;
}

// ── Shared chat hook ──
function useAIChat(messages, setMessages, showToast) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  useEffect(() => {
    aiAPI.suggestions().then(r => setSuggestions(r.data.suggestions || [])).catch(()=>{});
  }, []);

  const send = async (textArg) => {
    const text = (textArg ?? input).trim();
    if (!text || sending) return;
    const next = [...messages, { role:'user', content: text }];
    setMessages(next);
    setInput('');
    setSending(true);
    try {
      const r = await aiAPI.chat({ messages: next.slice(-20), message: text });
      setMessages([...next, { role:'assistant', content: r.data.reply }]);
    } catch (e) {
      const err = e.response?.data?.error || 'Failed to reach AI advisor.';
      setMessages([...next, { role:'assistant', content: `⚠️ ${err}` }]);
      if (showToast) showToast(err, 'error');
    } finally { setSending(false); }
  };

  const clear = () => setMessages([]);
  return { input, setInput, send, sending, suggestions, clear };
}

// ── Full-page AI Advisor ──
function AIAdvisorPage({ user, showToast, messages, setMessages }) {
  const { input, setInput, send, sending, suggestions, clear } = useAIChat(messages, setMessages, showToast);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, sending]);

  const generateReport = async () => {
    setReportLoading(true); setReport(null);
    try {
      const r = await aiAPI.weeklyReport();
      setReport({ text: r.data.report, ts: r.data.generated_at });
    } catch (e) { showToast(e.response?.data?.error || 'Failed to generate report', 'error'); }
    setReportLoading(false);
  };

  return <div style={{maxWidth:1100,margin:'0 auto',display:'flex',flexDirection:'column',height:'calc(100vh - 44px)'}}>
    <style>{`
      @keyframes ai-bubble { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      @keyframes ai-blink { 0%,80%,100%{opacity:.3} 40%{opacity:1} }
      .ai-msg { animation:ai-bubble .25s ease both; }
      .ai-typing span { display:inline-block; width:6px; height:6px; border-radius:50%; background:#C9961E; margin:0 2px; animation:ai-blink 1.4s infinite both; }
      .ai-typing span:nth-child(2){animation-delay:.2s} .ai-typing span:nth-child(3){animation-delay:.4s}
      .ai-suggestion:hover { background:rgba(201,150,30,0.12) !important; border-color:#C9961E !important; transform:translateY(-2px); }
      .ai-input:focus { border-color:#C9961E !important; box-shadow:0 0 0 3px rgba(201,150,30,0.18) !important; }
      .ai-send-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 22px rgba(26,122,32,0.55); }
    `}</style>

    {/* Header */}
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16,gap:14,flexWrap:'wrap'}}>
      <div>
        <div style={{display:'flex',alignItems:'center',gap:11,marginBottom:5}}>
          <div style={{width:38,height:38,borderRadius:11,background:'linear-gradient(135deg,#C9961E,#E8B84B)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 6px 18px rgba(201,150,30,.4)'}}>
            <I d={IC.sparkles} sz={18} c="#000"/>
          </div>
          <div>
            <h1 style={{fontFamily:FH,fontSize:24,fontWeight:900,color:T.txt,letterSpacing:-.4}}>MillPro AI Advisor</h1>
            <p style={{fontSize:12.5,color:T.t2,marginTop:1}}>Your personal milling-industry consultant — powered by Claude</p>
          </div>
        </div>
      </div>
      <div style={{display:'flex',gap:8}}>
        {messages.length > 0 && <Btn v="gh" sz="sm" onClick={clear}><I d={IC.trash} sz={13}/> New chat</Btn>}
        <Btn v="ac" sz="sm" onClick={generateReport} disabled={reportLoading}>
          <I d={IC.sparkle} sz={14} c="#fff"/> {reportLoading?'Generating…':'Weekly Report'}
        </Btn>
      </div>
    </div>

    {/* Weekly Report Card */}
    {(report || reportLoading) && (
      <div style={{marginBottom:14,padding:24,borderRadius:16,
        background:'linear-gradient(160deg,#0F1C12,#152218)',
        color:'#E8E2D8',border:'1px solid rgba(201,150,30,0.2)',
        boxShadow:'0 16px 50px rgba(0,0,0,0.18)',position:'relative'}}>
        <div style={{position:'absolute',top:14,right:14,display:'flex',gap:6}}>
          <button onClick={()=>setReport(null)} title="Close" style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.6)',cursor:'pointer',borderRadius:6,padding:5,display:'flex'}}><I d={IC.x} sz={14}/></button>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
          <I d={IC.sparkles} sz={16} c="#E8B84B"/>
          <span style={{fontSize:11,color:'#E8B84B',fontWeight:700,letterSpacing:1.4,textTransform:'uppercase'}}>Weekly Executive Report</span>
          {report?.ts && <span style={{fontSize:11,color:'rgba(255,255,255,0.4)',marginLeft:6}}>· {fmtDT(report.ts)}</span>}
        </div>
        {reportLoading
          ? <div style={{padding:'20px 0',color:'rgba(255,255,255,0.55)',fontSize:13}}><span className="ai-typing"><span/><span/><span/></span> Analysing your data — this takes ~10–20 seconds…</div>
          : <div style={{fontSize:13.5,lineHeight:1.65,color:'rgba(255,255,255,0.85)'}}>{renderMD(report.text)}</div>}
      </div>
    )}

    {/* Chat surface */}
    <div style={{flex:1,display:'flex',flexDirection:'column',background:T.card,borderRadius:16,border:`1px solid ${T.brd}`,boxShadow:'0 4px 16px rgba(0,0,0,0.04)',overflow:'hidden',minHeight:0}}>
      <div ref={scrollRef} style={{flex:1,overflowY:'auto',padding:'24px 28px'}}>
        {messages.length === 0 ? (
          <div style={{textAlign:'center',padding:'40px 20px',maxWidth:600,margin:'0 auto'}}>
            <div style={{width:64,height:64,borderRadius:18,margin:'0 auto 18px',background:'linear-gradient(135deg,#C9961E,#E8B84B)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 12px 30px rgba(201,150,30,.4)'}}>
              <I d={IC.sparkles} sz={28} c="#000"/>
            </div>
            <h2 style={{fontFamily:FH,fontSize:22,fontWeight:800,marginBottom:6,color:T.txt}}>Ask me anything about your business</h2>
            <p style={{fontSize:13.5,color:T.t2,lineHeight:1.7,marginBottom:24}}>I have full access to your production, payroll, sales, expenses and inventory data.<br/>Try one of these to start:</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:8,textAlign:'left'}}>
              {suggestions.slice(0,6).map((s,i)=>(
                <button key={i} className="ai-suggestion" onClick={()=>send(s)} style={{padding:'14px 16px',borderRadius:12,border:`1px solid ${T.brd}`,background:T.bg,cursor:'pointer',fontSize:13,color:T.txt,textAlign:'left',transition:'all .2s',lineHeight:1.45}}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:14,maxWidth:780,margin:'0 auto'}}>
            {messages.map((m,i) => <AIMessage key={i} role={m.role} content={m.content}/>)}
            {sending && <AIMessage role="assistant" content={null} typing/>}
          </div>
        )}
      </div>

      {/* Input bar */}
      <div style={{borderTop:`1px solid ${T.brd}`,padding:'16px 24px',background:T.bg}}>
        <div style={{maxWidth:780,margin:'0 auto',display:'flex',gap:10,alignItems:'flex-end'}}>
          <textarea
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}}
            placeholder="Ask about your business — sales, profit, employees, inventory, anything…"
            rows={1}
            className="ai-input"
            style={{flex:1,padding:'13px 16px',borderRadius:12,border:`1.5px solid ${T.brd}`,background:T.card,fontSize:14,outline:'none',resize:'none',fontFamily:'inherit',lineHeight:1.5,minHeight:46,maxHeight:140,transition:'all .2s'}}/>
          <button onClick={()=>send()} disabled={sending||!input.trim()} className="ai-send-btn"
            style={{padding:'13px 18px',borderRadius:12,background:sending||!input.trim()?'#cccccc':`linear-gradient(135deg,${T.g},${T.tl})`,color:'#fff',border:'none',cursor:sending||!input.trim()?'not-allowed':'pointer',fontWeight:700,fontSize:13.5,display:'flex',alignItems:'center',gap:7,boxShadow:sending||!input.trim()?'none':`0 4px 14px rgba(36,117,41,0.4)`,transition:'all .2s'}}>
            <I d={IC.send} sz={15} c="#fff"/> Send
          </button>
        </div>
        <p style={{fontSize:11,color:T.t3,textAlign:'center',marginTop:8,maxWidth:780,margin:'8px auto 0'}}>
          AI responses use your live company data. May occasionally make mistakes — verify important decisions.
        </p>
      </div>
    </div>
  </div>;
}

// ── Single message bubble ──
function AIMessage({ role, content, typing }) {
  const isUser = role === 'user';
  return <div className="ai-msg" style={{display:'flex',gap:11,alignItems:'flex-start',flexDirection:isUser?'row-reverse':'row'}}>
    <div style={{flexShrink:0,width:34,height:34,borderRadius:10,
      background:isUser?T.bg:'linear-gradient(135deg,#C9961E,#E8B84B)',
      border:isUser?`1px solid ${T.brd}`:'none',
      display:'flex',alignItems:'center',justifyContent:'center',
      color:isUser?T.txt:'#000',fontWeight:700,fontSize:13,fontFamily:FH,
      boxShadow:isUser?'none':'0 4px 12px rgba(201,150,30,.35)'}}>
      {isUser ? 'U' : <I d={IC.sparkles} sz={16} c="#000"/>}
    </div>
    <div style={{
      maxWidth:'85%',padding:'12px 16px',borderRadius:14,fontSize:13.5,lineHeight:1.6,
      background:isUser?`linear-gradient(135deg,${T.g}10,${T.g}05)`:'#0F1C12',
      color:isUser?T.txt:'#E8E2D8',
      border:isUser?`1px solid ${T.g}33`:'1px solid rgba(201,150,30,0.15)',
      boxShadow:isUser?'none':'0 6px 18px rgba(0,0,0,0.08)',
      borderTopLeftRadius:isUser?14:4,borderTopRightRadius:isUser?4:14,
    }}>
      {typing ? <span className="ai-typing"><span/><span/><span/></span> : (isUser ? content : renderMD(content))}
    </div>
  </div>;
}

// ── Floating side popup ──
function AIFloatingPanel({ open, onOpen, onClose, onExpand, messages, setMessages, showToast, hideOnPage }) {
  const { input, setInput, send, sending, suggestions, clear } = useAIChat(messages, setMessages, showToast);
  const scrollRef = useRef(null);
  useEffect(() => { if (scrollRef.current && open) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, sending, open]);

  return <>
    <style>{`
      @keyframes ai-fab-pulse { 0%,100%{box-shadow:0 8px 24px rgba(201,150,30,.5),0 0 0 0 rgba(201,150,30,.55)} 70%{box-shadow:0 8px 24px rgba(201,150,30,.5),0 0 0 16px rgba(201,150,30,0)} }
      @keyframes ai-slide-in { from{transform:translateX(100%)} to{transform:translateX(0)} }
      @keyframes ai-overlay-fade { from{opacity:0} to{opacity:1} }
      .ai-fab:hover { transform:scale(1.08); }
    `}</style>

    {/* FAB — hide when on the AI page or when panel is open */}
    {!hideOnPage && !open && <button onClick={onOpen} className="ai-fab" title="Ask MillPro AI"
      style={{position:'fixed',bottom:24,right:24,zIndex:90,
        width:60,height:60,borderRadius:'50%',
        background:`linear-gradient(135deg,#C9961E,#E8B84B)`,
        border:'none',cursor:'pointer',
        display:'flex',alignItems:'center',justifyContent:'center',
        animation:'ai-fab-pulse 2.6s ease-in-out infinite',
        transition:'transform .25s'}}>
      <I d={IC.sparkles} sz={26} c="#000"/>
    </button>}

    {/* Slide-out panel */}
    {open && <>
      <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:95,background:'rgba(0,0,0,0.4)',backdropFilter:'blur(2px)',animation:'ai-overlay-fade .25s ease'}}/>
      <div style={{
        position:'fixed',top:0,right:0,bottom:0,zIndex:96,
        width:'min(420px, 95vw)',background:T.card,
        boxShadow:'-20px 0 60px rgba(0,0,0,0.25)',
        display:'flex',flexDirection:'column',
        animation:'ai-slide-in .35s cubic-bezier(.2,.8,.2,1)',
        borderLeft:`1px solid ${T.brd}`
      }}>
        {/* Header */}
        <div style={{padding:'14px 18px',borderBottom:`1px solid ${T.brd}`,display:'flex',alignItems:'center',gap:10,background:`linear-gradient(135deg,${T.bg},${T.card})`}}>
          <div style={{width:34,height:34,borderRadius:10,background:'linear-gradient(135deg,#C9961E,#E8B84B)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 12px rgba(201,150,30,.4)'}}>
            <I d={IC.sparkles} sz={16} c="#000"/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontFamily:FH,fontWeight:800,fontSize:14}}>AI Advisor</div>
            <div style={{fontSize:10.5,color:T.t2,letterSpacing:.4}}>Powered by Claude · live data</div>
          </div>
          {messages.length > 0 && <button onClick={clear} title="New chat" style={{background:'transparent',border:'none',cursor:'pointer',padding:6,borderRadius:6,color:T.t2}}><I d={IC.trash} sz={14}/></button>}
          <button onClick={onExpand} title="Open full view" style={{background:'transparent',border:'none',cursor:'pointer',padding:6,borderRadius:6,color:T.t2}}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6 M9 21H3v-6 M21 3l-7 7 M3 21l7-7"/></svg>
          </button>
          <button onClick={onClose} title="Close" style={{background:'transparent',border:'none',cursor:'pointer',padding:6,borderRadius:6,color:T.t2}}><I d={IC.x} sz={15}/></button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{flex:1,overflowY:'auto',padding:'18px',background:T.bg}}>
          {messages.length === 0 ? (
            <div style={{textAlign:'center',padding:'12px 8px'}}>
              <div style={{width:54,height:54,borderRadius:14,margin:'0 auto 14px',background:'linear-gradient(135deg,#C9961E,#E8B84B)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 8px 22px rgba(201,150,30,.4)'}}>
                <I d={IC.sparkles} sz={24} c="#000"/>
              </div>
              <h3 style={{fontFamily:FH,fontSize:16,fontWeight:800,marginBottom:5}}>Hi — how can I help?</h3>
              <p style={{fontSize:12,color:T.t2,marginBottom:16,lineHeight:1.55}}>I can answer anything about your sales, employees, production or finances.</p>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {suggestions.slice(0,4).map((s,i)=>(
                  <button key={i} className="ai-suggestion" onClick={()=>send(s)} style={{padding:'10px 12px',borderRadius:10,border:`1px solid ${T.brd}`,background:T.card,cursor:'pointer',fontSize:12.5,color:T.txt,textAlign:'left',lineHeight:1.4,transition:'all .2s'}}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {messages.map((m,i) => <AIMessage key={i} role={m.role} content={m.content}/>)}
              {sending && <AIMessage role="assistant" content={null} typing/>}
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{borderTop:`1px solid ${T.brd}`,padding:'12px 14px',background:T.card}}>
          <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
            <textarea
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}}
              placeholder="Ask anything…"
              rows={1}
              className="ai-input"
              style={{flex:1,padding:'10px 12px',borderRadius:10,border:`1.5px solid ${T.brd}`,background:T.bg,fontSize:13,outline:'none',resize:'none',fontFamily:'inherit',lineHeight:1.5,minHeight:40,maxHeight:120,transition:'all .2s'}}/>
            <button onClick={()=>send()} disabled={sending||!input.trim()} className="ai-send-btn"
              style={{padding:'10px 14px',borderRadius:10,background:sending||!input.trim()?'#cccccc':`linear-gradient(135deg,${T.g},${T.tl})`,color:'#fff',border:'none',cursor:sending||!input.trim()?'not-allowed':'pointer',display:'flex',alignItems:'center',transition:'all .2s'}}>
              <I d={IC.send} sz={14} c="#fff"/>
            </button>
          </div>
        </div>
      </div>
    </>}
  </>;
}
