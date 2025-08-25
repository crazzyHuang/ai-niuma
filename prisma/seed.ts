import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create a default user
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
    },
  });

  // Create Agents
  await prisma.agent.upsert({ where: { roleTag: 'EMPATHY' }, update: {}, create: { name: '共情者', provider: 'mock', roleTag: 'EMPATHY', order: 1, prompt: '先理解与共情...' } });
  await prisma.agent.upsert({ where: { roleTag: 'PRACTICAL' }, update: {}, create: { name: '建议师', provider: 'mock', roleTag: 'PRACTICAL', order: 2, prompt: '给3条可立即尝试的小建议...' } });
  await prisma.agent.upsert({ where: { roleTag: 'FOLLOWUP' }, update: {}, create: { name: '关怀师', provider: 'mock', roleTag: 'FOLLOWUP', order: 3, prompt: '提供一条温柔的第二天问候模板...' } });

  // Create a Flow for "Living Care"
  await prisma.flow.upsert({
    where: { mode: 'empathy' },
    update: {},
    create: {
      name: '生活关怀流程',
      mode: 'empathy',
      enabled: true,
      steps: [
        { roleTag: 'EMPATHY', provider: 'mock' },
        { roleTag: 'PRACTICAL', provider: 'mock' },
        { roleTag: 'FOLLOWUP', provider: 'mock' },
      ],
    },
  });

  console.log('Seed data created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });