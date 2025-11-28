// prisma/seed.js
const { PrismaClient, Role, SportType } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  // Admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@sportfy.com' },
    update: {},
    create: {
      name: 'Admin Sportfy',
      email: 'admin@sportfy.com',
      password: adminPassword,
      role: Role.ADMIN,
      phone: '081234567890'
    }
  });

  // Tidak seed court, admin akan menambah manual
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
