require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error("Uso: node scripts/promote-super-admin.cjs email@exemplo.com");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      brandId: true,
    },
  });

  if (!existing) {
    throw new Error("Usuario nao encontrado");
  }

  const updated = await prisma.user.update({
    where: { id: existing.id },
    data: { role: "SUPER_ADMIN" },
    select: {
      id: true,
      email: true,
      role: true,
      brandId: true,
    },
  });

  console.log(JSON.stringify(updated, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
