// Applies pending Prisma migrations at container startup.
// Uses @prisma/client directly to avoid loading the full Prisma CLI
// (which requires dev-only packages not present in the runner stage).
"use strict";

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function hasMigrationApplied(name) {
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT id FROM "_prisma_migrations" WHERE migration_name = $1 AND finished_at IS NOT NULL LIMIT 1`,
      name,
    );
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

async function markMigrationApplied(name) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
     VALUES (gen_random_uuid()::text, '', NOW(), $1, NULL, NULL, NOW(), 1)
     ON CONFLICT (migration_name) DO UPDATE SET finished_at = NOW(), applied_steps_count = 1`,
    name,
  );
}

async function main() {
  // Migration: allow_duplicate_sku
  // Removes the unique index on (brandId, sku) so the same SKU can appear
  // multiple times per brand (Varejonline allows this).
  const migrationName = "20260504120000_allow_duplicate_sku";

  if (await hasMigrationApplied(migrationName)) {
    console.log(`[migrate] ${migrationName} already applied, skipping`);
    return;
  }

  console.log(`[migrate] Applying ${migrationName}...`);
  await prisma.$executeRawUnsafe(
    `DROP INDEX IF EXISTS "ProductBaseV2_brandId_sku_key"`,
  );
  await markMigrationApplied(migrationName);
  console.log(`[migrate] ${migrationName} applied successfully`);
}

main()
  .catch((err) => {
    console.error("[migrate] Failed:", err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
