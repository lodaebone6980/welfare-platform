import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET: List all API sources
export async function GET() {
  try {
    const sources = await prisma.apiSource.findMany({
      orderBy: { id: 'asc' },
    });
    return NextResponse.json({ ok: true, sources });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'unknown' }, { status: 500 });
  }
}

// POST: Create a new API source
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, url, type, status } = body ?? {};

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ ok: false, error: 'name is required' }, { status: 400 });
    }
    if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      return NextResponse.json({ ok: false, error: 'url must start with http(s)://' }, { status: 400 });
    }
    const existing = await prisma.apiSource.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return NextResponse.json({ ok: false, error: 'name already exists' }, { status: 409 });
    }

    const source = await prisma.apiSource.create({
      data: {
        name: name.trim(),
        url: url.trim(),
        type: (type && String(type).toUpperCase()) || 'REST',
        status: status || 'active',
      },
    });
    return NextResponse.json({ ok: true, source }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'unknown' }, { status: 500 });
  }
}
