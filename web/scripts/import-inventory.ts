/**
 * Imports the manufacturer "graveyard" order-list CSV into the Product table.
 *
 * Usage:
 *   npx tsx scripts/import-inventory.ts <path-to-csv> [--reset]
 *
 * All imported products start unpublished with price=null — an admin must
 * review, price, and publish each one (or bulk-publish) from /admin before
 * it appears on the storefront. Re-running the script is safe: it upserts
 * by SKU, so previously-set prices/publish state/images are preserved for
 * rows that still parse to the same SKU.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "../src/lib/prisma";
import { parseGraveyardCsv } from "../src/lib/import/parseGraveyardCsv";

async function main() {
  const args = process.argv.slice(2);
  const reset = args.includes("--reset");
  const csvPath = args.find((a) => !a.startsWith("--"));

  if (!csvPath) {
    console.error("Usage: npx tsx scripts/import-inventory.ts <path-to-csv> [--reset]");
    process.exit(1);
  }

  const csvText = readFileSync(resolve(csvPath), "utf-8");
  const items = parseGraveyardCsv(csvText);

  console.log(`Parsed ${items.length} products from ${csvPath}`);

  if (reset) {
    console.log("Resetting existing product data...");
    await prisma.orderItem.deleteMany({});
    await prisma.productImage.deleteMany({});
    await prisma.product.deleteMany({});
  }

  const tempIdToRealId = new Map<number, string>();
  let created = 0;
  let updated = 0;
  let orphanedChildren = 0;

  for (const item of items) {
    const parentId = item.parentTempId !== null ? tempIdToRealId.get(item.parentTempId) ?? null : null;
    if (item.isChild && item.parentTempId !== null && !parentId) {
      orphanedChildren += 1;
    }

    const record = await prisma.product.upsert({
      where: { sku: item.sku },
      create: {
        sku: item.sku,
        slug: item.slug,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        poNumber: item.poNumber,
        jobNumber: item.jobNumber,
        lineNumbers: item.lineNumbers,
        callSize: item.callSize,
        exteriorColor: item.exteriorColor,
        interiorColor: item.interiorColor,
        handing: item.handing,
        option1: item.option1,
        option2: item.option2,
        option3: item.option3,
        jambDepth: item.jambDepth,
        miscNotes: item.miscNotes,
        parentId,
      },
      update: {
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        poNumber: item.poNumber,
        jobNumber: item.jobNumber,
        lineNumbers: item.lineNumbers,
        callSize: item.callSize,
        exteriorColor: item.exteriorColor,
        interiorColor: item.interiorColor,
        handing: item.handing,
        option1: item.option1,
        option2: item.option2,
        option3: item.option3,
        jambDepth: item.jambDepth,
        miscNotes: item.miscNotes,
        parentId,
      },
    });

    if (record.createdAt.getTime() === record.updatedAt.getTime()) {
      created += 1;
    } else {
      updated += 1;
    }

    tempIdToRealId.set(item.tempId, record.id);
  }

  const categoryCounts = await prisma.product.groupBy({
    by: ["category"],
    _count: true,
  });

  console.log(`\nDone. Created: ${created}, Updated: ${updated}`);
  if (orphanedChildren > 0) {
    console.log(
      `Note: ${orphanedChildren} add-on/child rows (e.g. screens) had no matching parent line in their group and were imported as standalone products.`
    );
  }
  console.log("\nBy category:");
  for (const row of categoryCounts) {
    console.log(`  ${row.category}: ${row._count}`);
  }
  console.log(
    "\nAll products were imported unpublished with no price set. Go to /admin/products to review, price, and publish them."
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
