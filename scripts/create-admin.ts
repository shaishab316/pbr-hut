import { hashPassword } from '../src/common/helpers/hash.helper';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const [, , email, password] = process.argv;

if (!email || !password) {
  console.error('Usage: ts-node scripts/create-admin.ts <email> <password>');
  process.exit(1);
}

const confirm = (msg: string) =>
  new Promise<boolean>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(`${msg} (y/n): `, (ans) => {
      rl.close();
      resolve(ans === 'y');
    });
  });

async function main() {
  const hashed = await hashPassword(password);
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    if (!(await confirm(`Create admin: ${email}?`))) process.exit(0);
    await prisma.user.create({
      data: { email, passwordHash: hashed, role: 'ADMIN' },
    });
    console.log('Admin created');
    return;
  }

  if (user.role !== 'ADMIN') {
    if (
      !(await confirm(`${email} is not admin. Promote and update password?`))
    ) {
      process.exit(0);
    }
    await prisma.user.update({
      where: { email },
      data: { passwordHash: hashed, role: 'ADMIN' },
    });
    console.log('Promoted to admin');
    return;
  }

  if (!(await confirm(`${email} already admin. Replace password?`))) {
    process.exit(0);
  }
  await prisma.user.update({
    where: { email },
    data: { passwordHash: hashed },
  });
  console.log('Password updated');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
    process.exit(0);
  });
