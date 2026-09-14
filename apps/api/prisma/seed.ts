import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

process.env.DATABASE_URL ??= 'mysql://giapha:giapha_dev_password@localhost:3306/giapha';
const prisma = new PrismaClient();

const ids = {
  tenant: '00000000-0000-4000-8000-000000000001',
  family: '00000000-0000-4000-8000-000000000101',
  an: '00000000-0000-4000-8000-000000000201',
  lan: '00000000-0000-4000-8000-000000000202',
  binh: '00000000-0000-4000-8000-000000000203',
  minh: '00000000-0000-4000-8000-000000000204',
  huong: '00000000-0000-4000-8000-000000000205',
  chi: '00000000-0000-4000-8000-000000000206',
  dung: '00000000-0000-4000-8000-000000000207',
} as const;

async function main(): Promise<void> {
  await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {
      name: 'Dòng họ Nguyễn Văn',
      description: 'Gia phả mẫu dùng để kiểm tra luồng đa tenant và sơ đồ phả hệ.',
      status: 'ACTIVE',
    },
    create: {
      id: ids.tenant,
      slug: 'demo',
      name: 'Dòng họ Nguyễn Văn',
      description: 'Gia phả mẫu dùng để kiểm tra luồng đa tenant và sơ đồ phả hệ.',
    },
  });

  await prisma.family.upsert({
    where: { tenantId_slug: { tenantId: ids.tenant, slug: 'dong-chinh' } },
    update: { name: 'Chi chính họ Nguyễn Văn', isPrimary: true },
    create: {
      id: ids.family,
      tenantId: ids.tenant,
      slug: 'dong-chinh',
      name: 'Chi chính họ Nguyễn Văn',
      description: 'Ba thế hệ trong bộ dữ liệu khởi tạo.',
      isPrimary: true,
    },
  });

  const people = [
    {
      id: ids.an,
      displayName: 'Nguyễn Văn An',
      gender: 'MALE',
      birthDate: '1938-02-12',
      generation: 0,
    },
    {
      id: ids.lan,
      displayName: 'Trần Thị Lan',
      gender: 'FEMALE',
      birthDate: '1941-08-23',
      generation: 0,
    },
    {
      id: ids.binh,
      displayName: 'Nguyễn Văn Bình',
      gender: 'MALE',
      birthDate: '1964-04-05',
      generation: 1,
    },
    {
      id: ids.minh,
      displayName: 'Nguyễn Thị Minh',
      gender: 'FEMALE',
      birthDate: '1968-11-17',
      generation: 1,
    },
    {
      id: ids.huong,
      displayName: 'Lê Thị Hương',
      gender: 'FEMALE',
      birthDate: '1967-06-30',
      generation: 1,
    },
    {
      id: ids.chi,
      displayName: 'Nguyễn Minh Chi',
      gender: 'FEMALE',
      birthDate: '1992-01-14',
      generation: 2,
    },
    {
      id: ids.dung,
      displayName: 'Nguyễn Văn Dũng',
      gender: 'MALE',
      birthDate: '1996-09-08',
      generation: 2,
    },
  ] as const;

  for (const person of people) {
    await prisma.person.upsert({
      where: { id: person.id },
      update: {
        displayName: person.displayName,
        gender: person.gender,
        birthDate: new Date(`${person.birthDate}T00:00:00.000Z`),
        generation: person.generation,
      },
      create: {
        ...person,
        birthDate: new Date(`${person.birthDate}T00:00:00.000Z`),
        tenantId: ids.tenant,
        familyId: ids.family,
      },
    });
  }

  const parentChildPairs = [
    [ids.an, ids.binh],
    [ids.lan, ids.binh],
    [ids.an, ids.minh],
    [ids.lan, ids.minh],
    [ids.binh, ids.chi],
    [ids.huong, ids.chi],
    [ids.binh, ids.dung],
    [ids.huong, ids.dung],
  ] as const;

  for (const [parentId, childId] of parentChildPairs) {
    await prisma.parentChildRelationship.upsert({
      where: { parentId_childId: { parentId, childId } },
      update: { type: 'BIOLOGICAL' },
      create: {
        tenantId: ids.tenant,
        familyId: ids.family,
        parentId,
        childId,
        type: 'BIOLOGICAL',
      },
    });
  }

  const couples = [
    [ids.an, ids.lan, '1961-01-01'],
    [ids.binh, ids.huong, '1989-01-01'],
  ] as const;

  for (const [partnerAId, partnerBId, startedAt] of couples) {
    await prisma.partnership.upsert({
      where: { partnerAId_partnerBId: { partnerAId, partnerBId } },
      update: { status: 'MARRIED' },
      create: {
        tenantId: ids.tenant,
        familyId: ids.family,
        partnerAId,
        partnerBId,
        status: 'MARRIED',
        startedAt: new Date(`${startedAt}T00:00:00.000Z`),
      },
    });
  }
}

main()
  .catch((error: unknown) => {
    console.error('Failed to seed the database:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
