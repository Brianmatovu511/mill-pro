const prisma = require('../db');

const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0,0,0,0); return d; };
const sum = (arr, k) => arr.reduce((a, x) => a + (Number(x[k]) || 0), 0);
const round = (n, d=1) => Math.round(n * Math.pow(10,d)) / Math.pow(10,d);

/**
 * Builds a comprehensive ~5-15KB JSON snapshot of a company's operational data.
 * This is sent to Claude as context so it can answer questions accurately.
 */
async function buildSnapshot(companyId) {
  const since7   = daysAgo(7);
  const since30  = daysAgo(30);
  const since60  = daysAgo(60);
  const since365 = daysAgo(365);

  const [
    company, users, employees, customers, taskTypes,
    sales30d, salesPrev30, batches30d, batchesPrev30,
    expenses30d, payments30d, purchases30d, workLogs30d,
    recentSales, recentBatches, stockAdj30d,
  ] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.user.findMany({ where: { companyId, active: true }, select: { id: true, name: true, role: true, lastLogin: true } }),
    prisma.employee.findMany({ where: { companyId, active: true }, select: { id: true, name: true, role: true } }),
    prisma.customer.findMany({ where: { companyId }, select: { id: true, name: true } }),
    prisma.taskType.findMany({ where: { companyId, active: true }, select: { id: true, name: true, payMode: true, rate: true } }),
    prisma.sale.findMany({ where: { companyId, date: { gte: since30 } }, include: { items: true } }),
    prisma.sale.findMany({ where: { companyId, date: { gte: since60, lt: since30 } } }),
    prisma.productionBatch.findMany({ where: { companyId, date: { gte: since30 } } }),
    prisma.productionBatch.findMany({ where: { companyId, date: { gte: since60, lt: since30 } } }),
    prisma.expense.findMany({ where: { companyId, date: { gte: since30 } } }),
    prisma.payment.findMany({ where: { companyId, date: { gte: since30 } } }),
    prisma.purchase.findMany({ where: { companyId, date: { gte: since30 } } }),
    prisma.workLog.findMany({ where: { companyId, date: { gte: since30 } }, include: { employee: { select: { name: true } }, taskType: { select: { name: true } } } }),
    prisma.sale.findMany({ where: { companyId }, orderBy: { date: 'desc' }, take: 10, include: { items: true } }),
    prisma.productionBatch.findMany({ where: { companyId }, orderBy: { date: 'desc' }, take: 10 }),
    prisma.stockAdjustment.findMany({ where: { companyId, date: { gte: since30 } } }),
  ]);

  if (!company) return null;

  // ── Aggregations ──
  const rev30        = sum(sales30d, 'total');
  const revPrev30    = sum(salesPrev30, 'total');
  const collected30  = sum(sales30d, 'paidAmount');
  const exp30        = sum(expenses30d, 'amount');
  const payroll30    = sum(payments30d, 'amount');
  const purchased30  = sum(purchases30d, 'totalCost');
  const profit30     = rev30 - exp30 - payroll30 - purchased30;

  const sales7d      = sales30d.filter(s => new Date(s.date) >= since7);
  const rev7         = sum(sales7d, 'total');

  const maizeIn30    = sum(batches30d, 'maizeIn');
  const flourOut30   = sum(batches30d, 'flourOut');
  const branOut30    = sum(batches30d, 'branOut');
  const waste30      = sum(batches30d, 'wasteKg');
  const yieldPct     = maizeIn30 > 0 ? round((flourOut30 / maizeIn30) * 100) : 0;
  const branPct      = maizeIn30 > 0 ? round((branOut30 / maizeIn30) * 100) : 0;
  const wastePct     = maizeIn30 > 0 ? round((waste30 / maizeIn30) * 100) : 0;

  const maizeInPrev  = sum(batchesPrev30, 'maizeIn');
  const flourPrev    = sum(batchesPrev30, 'flourOut');
  const yieldPrev    = maizeInPrev > 0 ? round((flourPrev / maizeInPrev) * 100) : 0;

  const payrollRatio = rev30 > 0 ? round((payroll30 / rev30) * 100) : 0;

  // Top customers (last 30d)
  const customerTotals = {};
  sales30d.forEach(s => {
    const k = s.customer || 'Walk-in';
    customerTotals[k] = (customerTotals[k] || 0) + Number(s.total || 0);
  });
  const topCustomers = Object.entries(customerTotals)
    .sort((a,b) => b[1]-a[1]).slice(0,5)
    .map(([name, total]) => ({ name, revenue_30d: Math.round(total) }));

  // Top products by quantity sold (30d)
  const productTotals = {};
  sales30d.forEach(s => s.items.forEach(it => {
    const k = it.itemType;
    productTotals[k] = productTotals[k] || { qty: 0, revenue: 0 };
    productTotals[k].qty     += Number(it.quantity || 0);
    productTotals[k].revenue += Number(it.lineTotal || 0);
  }));
  const topProducts = Object.entries(productTotals)
    .sort((a,b) => b[1].revenue - a[1].revenue).slice(0,5)
    .map(([item, v]) => ({ item, quantity_sold: round(v.qty), revenue_30d: Math.round(v.revenue) }));

  // Top employees by earnings (30d)
  const empTotals = {};
  workLogs30d.forEach(w => {
    const k = w.employee?.name || 'Unknown';
    empTotals[k] = empTotals[k] || { earned: 0, tasks: 0 };
    empTotals[k].earned += Number(w.totalPay || 0);
    empTotals[k].tasks  += 1;
  });
  const topEmployees = Object.entries(empTotals)
    .sort((a,b) => b[1].earned - a[1].earned).slice(0,5)
    .map(([name, v]) => ({ name, earned_30d: Math.round(v.earned), tasks_logged: v.tasks }));

  // Expenses by category
  const expByCategory = {};
  expenses30d.forEach(e => { expByCategory[e.category] = (expByCategory[e.category] || 0) + Number(e.amount || 0); });
  const topExpenseCategories = Object.entries(expByCategory)
    .sort((a,b) => b[1]-a[1]).slice(0,6)
    .map(([category, amount]) => ({ category, amount_30d: Math.round(amount) }));

  // Daily revenue last 14 days for trend
  const last14 = [];
  for (let i = 13; i >= 0; i--) {
    const d = daysAgo(i); const next = daysAgo(i-1);
    const day = sales30d.filter(s => new Date(s.date) >= d && new Date(s.date) < next);
    last14.push({ date: d.toISOString().slice(0,10), revenue: Math.round(sum(day, 'total')) });
  }

  // Inventory (purchases + production minus sales since founding — approximation)
  const allPurchases = await prisma.purchase.aggregate({ where: { companyId }, _sum: { quantity: true } });
  const allBatches   = await prisma.productionBatch.aggregate({ where: { companyId }, _sum: { maizeIn: true, flourOut: true, branOut: true } });
  const allSalesItems = await prisma.saleItem.aggregate({
    where: { sale: { companyId } },
    _sum: { quantity: true },
  });
  const allStockAdj = await prisma.stockAdjustment.aggregate({ where: { companyId }, _sum: { quantity: true } });

  // Customer concentration
  const top1Pct = topCustomers[0] ? round((topCustomers[0].revenue_30d / Math.max(rev30,1)) * 100) : 0;
  const top5Pct = topCustomers.length > 0 ? round((topCustomers.slice(0,5).reduce((a,c)=>a+c.revenue_30d,0) / Math.max(rev30,1)) * 100) : 0;

  return {
    generated_at: new Date().toISOString(),
    company: {
      name:       company.name,
      code:       company.code,
      currency:   company.currency,
      address:    company.address,
      created_at: company.createdAt,
      age_days:   Math.floor((Date.now() - new Date(company.createdAt)) / (1000*60*60*24)),
    },
    headline_kpis: {
      revenue_last_7_days:    Math.round(rev7),
      revenue_last_30_days:   Math.round(rev30),
      revenue_prev_30_days:   Math.round(revPrev30),
      revenue_change_pct_mom: revPrev30 > 0 ? round(((rev30 - revPrev30) / revPrev30) * 100) : null,
      collected_30d:          Math.round(collected30),
      outstanding_credit_30d: Math.round(rev30 - collected30),
      profit_30d_estimate:    Math.round(profit30),
      total_expenses_30d:     Math.round(exp30),
      total_payroll_30d:      Math.round(payroll30),
      total_purchases_30d:    Math.round(purchased30),
    },
    production: {
      batches_30d:        batches30d.length,
      maize_in_30d_kg:    Math.round(maizeIn30),
      flour_out_30d_kg:   Math.round(flourOut30),
      bran_out_30d_kg:    Math.round(branOut30),
      waste_30d_kg:       Math.round(waste30),
      yield_pct_30d:      yieldPct,
      bran_pct_30d:       branPct,
      waste_pct_30d:      wastePct,
      yield_prev_30d:     yieldPrev,
      yield_change_pp:    yieldPrev > 0 ? round(yieldPct - yieldPrev) : null,
      industry_yield_norm: { low: 73, average: 76, excellent: 80 },
    },
    workforce: {
      total_users:        users.length,
      total_employees:    employees.length,
      payroll_30d:        Math.round(payroll30),
      payroll_to_revenue_pct_30d: payrollRatio,
      industry_payroll_ratio_norm: { low: 12, average: 18, high_concern: 25 },
      top_employees_30d:  topEmployees,
      task_types: taskTypes.slice(0, 8).map(t => ({ name: t.name, mode: t.payMode, rate: t.rate })),
    },
    sales: {
      orders_30d:         sales30d.length,
      avg_order_value:    sales30d.length > 0 ? Math.round(rev30 / sales30d.length) : 0,
      top_customers_30d:  topCustomers,
      top_products_30d:   topProducts,
      customer_count:     customers.length,
      top_1_customer_pct: top1Pct,
      top_5_customer_pct: top5Pct,
      revenue_daily_last_14d: last14,
    },
    expenses: {
      total_30d:          Math.round(exp30),
      top_categories_30d: topExpenseCategories,
    },
    inventory_estimate: {
      maize_kg_on_hand:   Math.round((allPurchases._sum.quantity || 0) - (allBatches._sum.maizeIn || 0) + (allStockAdj._sum.quantity || 0)),
      flour_kg_on_hand:   Math.round((allBatches._sum.flourOut || 0) - (allSalesItems._sum.quantity || 0)),
      bran_kg_on_hand:    Math.round((allBatches._sum.branOut  || 0)),
      stock_adjustments_30d: stockAdj30d.length,
      note: "Inventory levels are computed (purchases + production − sales). Use stock adjustments to correct.",
    },
    recent_activity: {
      latest_sales:    recentSales.slice(0,5).map(s => ({ date: s.date, customer: s.customer, total: Math.round(s.total) })),
      latest_batches:  recentBatches.slice(0,5).map(b => ({ date: b.date, maize_kg: b.maizeIn, flour_kg: b.flourOut, machine: b.machine, shift: b.shift })),
    },
  };
}

module.exports = { buildSnapshot };
