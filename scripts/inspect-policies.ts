/**
 * inspect-policies.ts
 * 특정 Policy.id 들을 정확히 어떤 값이 들어있는지 덤프한다.
 *
 * 사용:
 *   npx tsx scripts/inspect-policies.ts 1352 1903 428 991
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function stripHtml(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

async function main() {
  const args = process.argv.slice(2).map((x) => Number(x)).filter((n) => Number.isFinite(n));
  if (!args.length) {
    console.error('사용법: npx tsx scripts/inspect-policies.ts <id> [<id> ...]');
    process.exit(1);
  }

  const policies = await prisma.policy.findMany({
    where: { id: { in: args } },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      excerpt: true,
      content: true,
      eligibility: true,
      applicationMethod: true,
      requiredDocuments: true,
      metaDesc: true,
      focusKeyword: true,
      deadline: true,
    },
  });

  const found = new Map(policies.map((p) => [p.id, p]));

  for (const id of args) {
    const p = found.get(id);
    console.log('='.repeat(70));
    if (!p) {
      console.log(`id=${id} → NOT FOUND`);
      continue;
    }
    const cLen = stripHtml(p.content).length;
    const eLen = (p.excerpt || '').length;
    const elgLen = (p.eligibility || '').length;
    const appLen = (p.applicationMethod || '').length;

    const reason: string[] = [];
    if (cLen < 200) reason.push(`content(stripped)=${cLen} < 200`);
    if (eLen < 20) reason.push(`excerpt=${eLen} < 20`);
    if (elgLen < 20) reason.push(`eligibility=${elgLen} < 20`);
    if (appLen < 20) reason.push(`applicationMethod=${appLen} < 20`);

    console.log(`id=${p.id}  status=${p.status}`);
    console.log(`title            : ${p.title}`);
    console.log(`slug             : ${p.slug}`);
    console.log(`excerpt(${eLen}자) : ${(p.excerpt || '').slice(0, 80)}${eLen > 80 ? '…' : ''}`);
    console.log(`eligibility(${elgLen}자) : ${(p.eligibility || '').slice(0, 80)}${elgLen > 80 ? '…' : ''}`);
    console.log(`applicationMethod(${appLen}자) : ${(p.applicationMethod || '').slice(0, 80)}${appLen > 80 ? '…' : ''}`);
    console.log(`content raw=${(p.content || '').length}자, stripped=${cLen}자`);
    console.log(`content(stripped preview) : ${stripHtml(p.content).slice(0, 120)}…`);
    console.log(`deadline          : ${p.deadline || '(없음)'}`);
    console.log(`meta              : ${(p.metaDesc || '').slice(0, 80)}`);
    console.log(`focusKeyword      : ${p.focusKeyword}`);
    console.log(`판정              : ${reason.length ? 'needsGen → [' + reason.join(', ') + ']' : 'OK ✅'}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
