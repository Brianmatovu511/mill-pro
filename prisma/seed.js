const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌽 Seeding MillPro database with demo data...\n');

  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const ago = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(8, 0, 0, 0);
    return d;
  };

  // ══════════════════════════════
  // COMPANY
  // ══════════════════════════════
  const company = await prisma.company.create({
    data: {
      code: 'JGM001',
      name: 'Jinja Grain Millers Ltd',
      phone: '+256 772 456 789',
      address: 'Plot 12, Industrial Area, Jinja, Uganda',
      currency: 'UGX',
    },
  });

  // ══════════════════════════════
  // USERS
  // ══════════════════════════════
  const owner = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Robert Kiggundu',
      email: 'owner@jgm.ug',
      phone: '+256700100001',
      passwordHash: await bcrypt.hash('owner1234', 12),
      role: 'OWNER',
    },
  });

  await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Sarah Nakato',
      email: 'admin@jgm.ug',
      phone: '+256700100002',
      passwordHash: await bcrypt.hash('admin1234', 12),
      role: 'ADMIN',
    },
  });

  await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'James Opolot',
      email: 'super@jgm.ug',
      phone: '+256700100003',
      passwordHash: await bcrypt.hash('super1234', 12),
      role: 'SUPERVISOR',
    },
  });

  // ══════════════════════════════
  // TASK TYPES (10)
  // ══════════════════════════════
  const [mill, offload, onload, transfer, pack, security, quality, clean, branBag, maintenance] = await Promise.all([
    prisma.taskType.create({ data: { companyId: company.id, name: 'Milling Machine',   payMode: 'PER_SHIFT', rate: 18000, nightBonus: 6000 } }),
    prisma.taskType.create({ data: { companyId: company.id, name: 'Offloading',        payMode: 'PER_UNIT',  rate: 500 } }),
    prisma.taskType.create({ data: { companyId: company.id, name: 'Onloading',         payMode: 'PER_UNIT',  rate: 500 } }),
    prisma.taskType.create({ data: { companyId: company.id, name: 'Product Transfer',  payMode: 'PER_UNIT',  rate: 350 } }),
    prisma.taskType.create({ data: { companyId: company.id, name: 'Packaging',         payMode: 'PER_UNIT',  rate: 450 } }),
    prisma.taskType.create({ data: { companyId: company.id, name: 'Night Security',    payMode: 'PER_SHIFT', rate: 12000 } }),
    prisma.taskType.create({ data: { companyId: company.id, name: 'Quality Check',     payMode: 'PER_SHIFT', rate: 14000 } }),
    prisma.taskType.create({ data: { companyId: company.id, name: 'Cleaning',          payMode: 'PER_SHIFT', rate: 9000 } }),
    prisma.taskType.create({ data: { companyId: company.id, name: 'Bran Bagging',      payMode: 'PER_UNIT',  rate: 300 } }),
    prisma.taskType.create({ data: { companyId: company.id, name: 'Maintenance',       payMode: 'PER_SHIFT', rate: 22000 } }),
  ]);

  // ══════════════════════════════
  // EMPLOYEES (10)
  // ══════════════════════════════
  const empData = [
    { name: 'Moses Okello',      role: 'Milling Operator',   phone: '+256720100001' },
    { name: 'Grace Nambi',       role: 'Packager',           phone: '+256720100002' },
    { name: 'David Ssempa',      role: 'Driver / Loader',    phone: '+256720100003' },
    { name: 'Fatima Nakato',     role: 'Quality Inspector',  phone: '+256720100004' },
    { name: 'Peter Ouma',        role: 'Milling Operator',   phone: '+256720100005' },
    { name: 'Sarah Atim',        role: 'Cleaner',            phone: '+256720100006' },
    { name: 'Hassan Kiggundu',   role: 'Night Security',     phone: '+256720100007' },
    { name: 'Ruth Akello',       role: 'Packager',           phone: '+256720100008' },
    { name: 'Joseph Wandera',    role: 'Loader / Offloader', phone: '+256720100009' },
    { name: 'Agnes Nakafeero',   role: 'Supervisor',         phone: '+256720100010' },
  ];
  const employees = await Promise.all(
    empData.map(e => prisma.employee.create({ data: { companyId: company.id, ...e, active: true } }))
  );
  const [moses, grace, david, fatima, peter, sarah, hassan, ruth, joseph, agnes] = employees;

  // ══════════════════════════════
  // CUSTOMERS (5)
  // ══════════════════════════════
  const custData = [
    { name: 'Kampala Supermarkets Ltd', phone: '+256414123456', email: 'orders@kampalasuper.co.ug', address: 'Kampala Road, Kampala' },
    { name: 'Nakawuka Trading Co.',     phone: '+256772345678', email: 'nakawuka@gmail.com',         address: 'Nakawuka, Wakiso District' },
    { name: 'Gayaza Grocers',           phone: '+256701234567', email: 'gayazagrocers@yahoo.com',    address: 'Gayaza Town, Wakiso' },
    { name: 'Entebbe Foods Ltd',        phone: '+256414567890', email: 'procurement@entebbefoods.ug',address: 'Airport Road, Entebbe' },
    { name: 'Masaka Distributors',      phone: '+256756789012', email: 'masaka.dist@gmail.com',      address: 'Main Street, Masaka' },
  ];
  const customers = await Promise.all(
    custData.map(c => prisma.customer.create({ data: { companyId: company.id, ...c } }))
  );
  const [kampala, nakawuka, gayaza, entebbe, masaka] = customers;

  // ══════════════════════════════
  // PURCHASES (Maize + Packaging, ~45 days)
  // ══════════════════════════════
  const suppliers = ['Kamuli Grain Traders', 'Iganga Farmers Coop', 'Mbale Grain Depot', 'Tororo Agri Ltd', 'Soroti Grain Traders'];
  // Maize: every 2-3 days
  for (let day = 44; day >= 0; day -= rand(2, 3)) {
    const qty = rand(5000, 9500);
    const unitCost = rand(640, 760);
    await prisma.purchase.create({
      data: {
        companyId: company.id,
        date: ago(day),
        supplier: pick(suppliers),
        itemType: 'MAIZE',
        quantity: qty,
        unit: 'kg',
        unitCost,
        totalCost: qty * unitCost,
        notes: 'Raw maize delivery',
        createdBy: owner.name,
      },
    });
  }
  // Packaging bags: every ~2 weeks
  for (const day of [43, 29, 15, 1]) {
    const qty = rand(1000, 2500);
    const unitCost = rand(260, 320);
    await prisma.purchase.create({
      data: {
        companyId: company.id,
        date: ago(day),
        supplier: 'Kampala Packaging Supplies',
        itemType: 'PACKAGING',
        quantity: qty,
        unit: 'bags',
        unitCost,
        totalCost: qty * unitCost,
        notes: 'Woven polypropylene bags',
        createdBy: owner.name,
      },
    });
  }

  // ══════════════════════════════
  // PRODUCTION BATCHES (~45 days)
  // ══════════════════════════════
  for (let day = 44; day >= 0; day--) {
    const dow = ago(day).getDay();
    if (dow === 0) continue; // No Sundays
    const numBatches = dow === 6 ? 1 : (Math.random() > 0.3 ? 2 : 1);
    for (let b = 0; b < numBatches; b++) {
      const maizeIn  = rand(900, 2400);
      const yieldPct = 0.68 + Math.random() * 0.09;
      const flourOut = Math.round(maizeIn * yieldPct);
      const branPct  = 0.13 + Math.random() * 0.07;
      const branOut  = Math.round(maizeIn * branPct);
      const wasteKg  = Math.max(0, maizeIn - flourOut - branOut);
      await prisma.productionBatch.create({
        data: {
          companyId: company.id,
          batchNumber: `B${String(day).padStart(3, '0')}${b + 1}`,
          date: ago(day),
          maizeIn,
          flourOut,
          branOut,
          wasteKg,
          shift: b === 0 ? 'Day' : 'Night',
          machine: pick(['Mill-01', 'Mill-02', 'Mill-01', 'Mill-01']),
          fuelCost: rand(60000, 140000),
          packagingUsed: Math.round(flourOut / 50),
          createdBy: owner.name,
        },
      });
    }
  }

  // ══════════════════════════════
  // EXPENSES (~45 days)
  // ══════════════════════════════
  // Fuel/Electricity – weekly
  for (let day = 42; day >= 0; day -= 7) {
    await prisma.expense.create({ data: { companyId: company.id, date: ago(day), category: 'Fuel/Electricity', amount: rand(160000, 260000), notes: 'Generator fuel & electricity', createdBy: owner.name } });
  }
  // Transport – every 10 days
  for (let day = 40; day >= 0; day -= 10) {
    await prisma.expense.create({ data: { companyId: company.id, date: ago(day), category: 'Transport', amount: rand(75000, 145000), notes: 'Delivery & logistics', createdBy: owner.name } });
  }
  // Maintenance events
  for (const [d, notes, amt] of [
    [41, 'Mill-01 bearing replacement', 420000],
    [31, 'Conveyor belt repair',          155000],
    [22, 'Electrical wiring repairs',     235000],
    [14, 'Mill-02 full service',          180000],
    [ 6, 'Dust extraction service',        95000],
  ]) {
    await prisma.expense.create({ data: { companyId: company.id, date: ago(d), category: 'Maintenance', amount: amt, notes, createdBy: owner.name } });
  }
  // Rent – monthly
  for (const d of [44, 13]) {
    await prisma.expense.create({ data: { companyId: company.id, date: ago(d), category: 'Rent', amount: 2200000, notes: 'Monthly premises rent', recurring: true, createdBy: owner.name } });
  }
  // Salaries (office/admin staff)
  for (const d of [44, 14]) {
    await prisma.expense.create({ data: { companyId: company.id, date: ago(d), category: 'Salaries', amount: 1200000, notes: 'Office staff monthly salaries', createdBy: owner.name } });
  }
  // Other
  for (const [d, notes, amt] of [
    [38, 'Safety equipment (gloves, masks, boots)', 125000],
    [28, 'Stationery & office supplies',             48000],
    [21, 'Internet & telephone bills',               65000],
    [12, 'Signage & painting',                      145000],
    [ 4, 'First aid kit restock',                    42000],
  ]) {
    await prisma.expense.create({ data: { companyId: company.id, date: ago(d), category: 'Other', amount: amt, notes, createdBy: owner.name } });
  }

  // ══════════════════════════════
  // WORK LOGS (~45 days)
  // ══════════════════════════════
  for (let day = 44; day >= 0; day--) {
    const dow = ago(day).getDay();
    if (dow === 0) continue;

    // Moses – Day mill shift (90% attendance)
    if (Math.random() > 0.10) {
      await prisma.workLog.create({ data: { companyId: company.id, employeeId: moses.id, taskTypeId: mill.id, date: ago(day), shift: 'Day',   quantity: 1, hours: 0, totalPay: mill.rate,                    createdBy: owner.name } });
    }
    // Peter – Night mill shift Mon-Sat (85% attendance)
    if (dow <= 6 && Math.random() > 0.15) {
      await prisma.workLog.create({ data: { companyId: company.id, employeeId: peter.id, taskTypeId: mill.id, date: ago(day), shift: 'Night', quantity: 1, hours: 0, totalPay: mill.rate + mill.nightBonus,  createdBy: owner.name } });
    }
    // Hassan – Night security every night
    if (Math.random() > 0.04) {
      await prisma.workLog.create({ data: { companyId: company.id, employeeId: hassan.id, taskTypeId: security.id, date: ago(day), shift: 'Night', quantity: 1, hours: 0, totalPay: security.rate, createdBy: owner.name } });
    }
    // Grace & Ruth – Packaging (Mon-Sat, 80% days)
    if (Math.random() > 0.20) {
      const units = rand(80, 320);
      await prisma.workLog.create({ data: { companyId: company.id, employeeId: grace.id, taskTypeId: pack.id, date: ago(day), shift: 'Day', quantity: units, hours: 0, totalPay: units * pack.rate, createdBy: owner.name } });
      await prisma.workLog.create({ data: { companyId: company.id, employeeId: ruth.id,  taskTypeId: pack.id, date: ago(day), shift: 'Day', quantity: units, hours: 0, totalPay: units * pack.rate, createdBy: owner.name } });
    }
    // Fatima – Quality check Mon/Wed/Fri
    if ([1, 3, 5].includes(dow)) {
      await prisma.workLog.create({ data: { companyId: company.id, employeeId: fatima.id, taskTypeId: quality.id, date: ago(day), shift: 'Day', quantity: 1, hours: 0, totalPay: quality.rate, createdBy: owner.name } });
    }
    // Sarah – Cleaning Mon/Thu
    if ([1, 4].includes(dow)) {
      await prisma.workLog.create({ data: { companyId: company.id, employeeId: sarah.id, taskTypeId: clean.id, date: ago(day), shift: 'Day', quantity: 1, hours: 0, totalPay: clean.rate, createdBy: owner.name } });
    }
    // David & Joseph – Offloading when purchases arrive (~every 3 days)
    if (day % 3 === 0) {
      const bags = rand(50, 140);
      await prisma.workLog.create({ data: { companyId: company.id, employeeId: david.id,  taskTypeId: offload.id, date: ago(day), shift: 'Day', quantity: bags, hours: 0, totalPay: bags * offload.rate, createdBy: owner.name } });
      await prisma.workLog.create({ data: { companyId: company.id, employeeId: joseph.id, taskTypeId: offload.id, date: ago(day), shift: 'Day', quantity: bags, hours: 0, totalPay: bags * offload.rate, createdBy: owner.name } });
    }
    // Agnes – Product transfer Mon-Fri (70% days)
    if (dow >= 1 && dow <= 5 && Math.random() > 0.30) {
      const units = rand(60, 220);
      await prisma.workLog.create({ data: { companyId: company.id, employeeId: agnes.id, taskTypeId: transfer.id, date: ago(day), shift: 'Day', quantity: units, hours: 0, totalPay: units * transfer.rate, createdBy: owner.name } });
    }
  }

  // ══════════════════════════════
  // PAYMENTS (cover ~75% of earned wages — leaves ~25% owed)
  // ══════════════════════════════
  const allWL = await prisma.workLog.findMany({ where: { companyId: company.id }, select: { employeeId: true, totalPay: true } });
  const empTotals = {};
  for (const wl of allWL) {
    empTotals[wl.employeeId] = (empTotals[wl.employeeId] || 0) + wl.totalPay;
  }
  for (const [empId, total] of Object.entries(empTotals)) {
    const payable = Math.round(total * 0.75);
    if (payable < 5000) continue;
    const splits = rand(2, 3);
    const per = Math.round(payable / splits);
    for (let p = 0; p < splits; p++) {
      const amount = p === splits - 1 ? payable - per * (splits - 1) : per;
      await prisma.payment.create({
        data: {
          companyId: company.id,
          employeeId: empId,
          date: ago(8 + p * 7 + rand(0, 2)),
          amount,
          method: pick(['Cash', 'Cash', 'Mobile Money', 'Bank Transfer']),
          type: 'WEEKLY',
          notes: `Week ${p + 1} wages`,
          approved: true,
          approvedBy: owner.name,
          createdBy: owner.name,
        },
      });
    }
  }

  // ══════════════════════════════
  // SALES (last 45 days)
  // ══════════════════════════════
  let rcpIdx = 1000;
  const newRcp = () => `RCP-${Date.now().toString(36).slice(-4).toUpperCase()}-${String(rcpIdx++).padStart(4, '0')}`;

  const salesEntries = [
    { d:  1, cust: 'Kampala Supermarkets Ltd', cid: kampala.id, pm: 'Bank Transfer', items: [{ t:'FLOUR', q:500, p:2400 }, { t:'BRAN', q:150, p:650 }] },
    { d:  2, cust: 'Walk-in Customer',         cid: null,       pm: 'Cash',          items: [{ t:'FLOUR', q: 50, p:2500 }] },
    { d:  3, cust: 'Nakawuka Trading Co.',     cid: nakawuka.id,pm: 'Mobile Money',  items: [{ t:'FLOUR', q:300, p:2350 }] },
    { d:  5, cust: 'Gayaza Grocers',           cid: gayaza.id,  pm: 'Cash',          items: [{ t:'FLOUR', q:200, p:2400 }, { t:'BRAN', q: 80, p:680 }] },
    { d:  7, cust: 'Walk-in Customer',         cid: null,       pm: 'Cash',          items: [{ t:'FLOUR', q:100, p:2500 }] },
    { d:  9, cust: 'Entebbe Foods Ltd',        cid: entebbe.id, pm: 'Bank Transfer', items: [{ t:'FLOUR', q:800, p:2300 }, { t:'BRAN', q:250, p:600 }] },
    { d: 11, cust: 'Kampala Supermarkets Ltd', cid: kampala.id, pm: 'Bank Transfer', items: [{ t:'FLOUR', q:600, p:2400 }] },
    { d: 13, cust: 'Masaka Distributors',      cid: masaka.id,  pm: 'Bank Transfer', items: [{ t:'FLOUR', q:1000,p:2250 }, { t:'BRAN', q:300, p:580 }] },
    { d: 15, cust: 'Walk-in Customer',         cid: null,       pm: 'Cash',          items: [{ t:'FLOUR', q: 75, p:2500 }] },
    { d: 17, cust: 'Nakawuka Trading Co.',     cid: nakawuka.id,pm: 'Mobile Money',  items: [{ t:'FLOUR', q:400, p:2350 }] },
    { d: 19, cust: 'Gayaza Grocers',           cid: gayaza.id,  pm: 'Cash',          items: [{ t:'FLOUR', q:250, p:2400 }] },
    { d: 21, cust: 'Kampala Supermarkets Ltd', cid: kampala.id, pm: 'Bank Transfer', items: [{ t:'FLOUR', q:700, p:2400 }, { t:'BRAN', q:200, p:650 }] },
    { d: 23, cust: 'Walk-in Customer',         cid: null,       pm: 'Cash',          items: [{ t:'FLOUR', q: 50, p:2500 }, { t:'BRAN', q: 30, p:700 }] },
    { d: 25, cust: 'Entebbe Foods Ltd',        cid: entebbe.id, pm: 'Bank Transfer', items: [{ t:'FLOUR', q:500, p:2300 }] },
    { d: 27, cust: 'Masaka Distributors',      cid: masaka.id,  pm: 'Bank Transfer', items: [{ t:'FLOUR', q:800, p:2200 }, { t:'BRAN', q:250, p:570 }] },
    { d: 29, cust: 'Nakawuka Trading Co.',     cid: nakawuka.id,pm: 'Mobile Money',  items: [{ t:'FLOUR', q:350, p:2350 }] },
    { d: 31, cust: 'Kampala Supermarkets Ltd', cid: kampala.id, pm: 'Bank Transfer', items: [{ t:'FLOUR', q:650, p:2350 }, { t:'BRAN', q:180, p:620 }] },
    { d: 33, cust: 'Walk-in Customer',         cid: null,       pm: 'Cash',          items: [{ t:'FLOUR', q:100, p:2450 }] },
    { d: 35, cust: 'Gayaza Grocers',           cid: gayaza.id,  pm: 'Cash',          items: [{ t:'FLOUR', q:300, p:2300 }] },
    { d: 37, cust: 'Masaka Distributors',      cid: masaka.id,  pm: 'Bank Transfer', items: [{ t:'FLOUR', q:900, p:2200 }, { t:'BRAN', q:280, p:560 }] },
    { d: 39, cust: 'Entebbe Foods Ltd',        cid: entebbe.id, pm: 'Bank Transfer', items: [{ t:'FLOUR', q:400, p:2250 }] },
    { d: 41, cust: 'Kampala Supermarkets Ltd', cid: kampala.id, pm: 'Bank Transfer', items: [{ t:'FLOUR', q:550, p:2300 }, { t:'BRAN', q:160, p:600 }] },
    { d: 43, cust: 'Nakawuka Trading Co.',     cid: nakawuka.id,pm: 'Mobile Money',  items: [{ t:'FLOUR', q:280, p:2300 }] },
  ];

  for (const s of salesEntries) {
    const items = s.items.map(i => ({ itemType: i.t, quantity: i.q, unitPrice: i.p, lineTotal: i.q * i.p }));
    const total = items.reduce((sum, i) => sum + i.lineTotal, 0);
    await prisma.sale.create({
      data: {
        companyId: company.id,
        customerId: s.cid,
        date: ago(s.d),
        customer: s.cust,
        phone: '',
        receiptNo: newRcp(),
        payMethod: s.pm,
        total,
        paidAmount: total,
        createdBy: owner.name,
        items: { create: items },
      },
    });
  }

  // ══════════════════════════════
  // ORDERS (various statuses)
  // ══════════════════════════════
  const ordersData = [
    { d: 0, cust: 'Kampala Supermarkets Ltd', cid: kampala.id, product: 'Maize Flour 50kg bags', qty: 20,  up: 120000, status: 'Pending' },
    { d: 1, cust: 'Nakawuka Trading Co.',     cid: nakawuka.id,product: 'Maize Flour 10kg bags', qty: 50,  up:  25000, status: 'Processing' },
    { d: 2, cust: 'Gayaza Grocers',           cid: gayaza.id,  product: 'Maize Flour 2kg packs', qty: 200, up:   5500, status: 'Packed' },
    { d: 3, cust: 'Entebbe Foods Ltd',        cid: entebbe.id, product: 'Bran 50kg bags',        qty: 10,  up:  34000, status: 'Dispatched' },
    { d: 5, cust: 'Masaka Distributors',      cid: masaka.id,  product: 'Maize Flour 50kg bags', qty: 30,  up: 112000, status: 'Completed' },
    { d: 9, cust: 'Kampala Supermarkets Ltd', cid: kampala.id, product: 'Maize Flour 50kg bags', qty: 25,  up: 120000, status: 'Completed' },
    { d:14, cust: 'Walk-in Customer',         cid: null,       product: 'Maize Flour 2kg packs', qty: 50,  up:   5500, status: 'Completed' },
    { d:18, cust: 'Nakawuka Trading Co.',     cid: nakawuka.id,product: 'Bran 50kg bags',        qty:  8,  up:  34000, status: 'Completed' },
    { d:24, cust: 'Gayaza Grocers',           cid: gayaza.id,  product: 'Maize Flour 10kg bags', qty: 40,  up:  25000, status: 'Completed' },
    { d:30, cust: 'Entebbe Foods Ltd',        cid: entebbe.id, product: 'Maize Flour 50kg bags', qty: 15,  up: 115000, status: 'Completed' },
    { d:36, cust: 'Masaka Distributors',      cid: masaka.id,  product: 'Maize Flour 50kg bags', qty: 40,  up: 110000, status: 'Completed' },
  ];
  let ordIdx = 1;
  for (const o of ordersData) {
    await prisma.order.create({
      data: {
        companyId: company.id,
        customerId: o.cid,
        orderNo: `ORD-${String(ordIdx++).padStart(4,'0')}`,
        date: ago(o.d),
        customer: o.cust,
        product: o.product,
        quantity: o.qty,
        unitPrice: o.up,
        total: o.qty * o.up,
        status: o.status,
        createdBy: owner.name,
      },
    });
  }

  // Audit seed event
  await prisma.auditLog.create({
    data: {
      companyId: company.id,
      userId: owner.id,
      action: 'REGISTER',
      entity: 'Company',
      entityId: company.id,
      details: 'Jinja Grain Millers Ltd — initial setup & seed',
    },
  });

  console.log('\n✅ Seed complete!\n');
  console.log('   Company:     Jinja Grain Millers Ltd');
  console.log('   Owner:       owner@jgm.ug   /  owner1234');
  console.log('   Admin:       admin@jgm.ug   /  admin1234');
  console.log('   Supervisor:  super@jgm.ug   /  super1234');
  console.log('   Employees:   10 workers');
  console.log('   Customers:   5 accounts');
  console.log('   Data:        45 days of production, sales, expenses\n');
  console.log('🎉 Run: npm run dev\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
