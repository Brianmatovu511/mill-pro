const prisma = require('../db');

/**
 * Computes current stock levels for a company by replaying every movement that
 * affects inventory: purchases add raw materials, production converts maize into
 * flour/bran, sales remove finished goods, and manual stock adjustments correct
 * the balance.
 *
 * This calculation previously lived — byte-for-byte identical — in both the
 * inventory and dashboard routes. It is centralized here so the stock formula
 * has exactly one definition.
 *
 * @param {string} companyId
 * @returns {Promise<{ RAW_MAIZE:number, FLOUR:number, BRAN:number, PACKAGING:number }>}
 */
async function computeInventory(companyId) {
  const [purchases, batches, saleItems, adjustments] = await Promise.all([
    prisma.purchase.findMany({ where: { companyId }, select: { itemType: true, quantity: true } }),
    prisma.productionBatch.findMany({ where: { companyId }, select: { maizeIn: true, flourOut: true, branOut: true } }),
    prisma.saleItem.findMany({ where: { sale: { companyId } }, select: { itemType: true, quantity: true } }),
    prisma.stockAdjustment.findMany({ where: { companyId }, select: { itemType: true, quantity: true } }),
  ]);

  const inventory = { RAW_MAIZE: 0, FLOUR: 0, BRAN: 0, PACKAGING: 0 };

  purchases.forEach((p) => {
    if (p.itemType === 'MAIZE') inventory.RAW_MAIZE += p.quantity;
    else if (p.itemType === 'PACKAGING') inventory.PACKAGING += p.quantity;
  });
  batches.forEach((b) => {
    inventory.RAW_MAIZE -= b.maizeIn;
    inventory.FLOUR += b.flourOut;
    inventory.BRAN += b.branOut;
  });
  saleItems.forEach((i) => {
    if (i.itemType === 'FLOUR') inventory.FLOUR -= i.quantity;
    else if (i.itemType === 'BRAN') inventory.BRAN -= i.quantity;
  });
  adjustments.forEach((a) => {
    if (inventory[a.itemType] !== undefined) inventory[a.itemType] += a.quantity;
  });

  return inventory;
}

module.exports = { computeInventory };
