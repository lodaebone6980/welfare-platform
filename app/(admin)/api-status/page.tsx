import { prisma } from '@/lib/prisma';
import TriggerButton from '@/components/admin/TriggerButton';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function relativeTime(date: Date | null): string {
  if (!date) return '—';
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

function statusBadge(status: string) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    success: { bg: 'bg-emerald-50', fg: 'text-emerald-700', label: '성공' },
    error: { bg: 'bg-rose-50', fg: 'text-rose-700', label: '실패' },
    running: { bg: 'bg-amber-50', fg: 'text-amber-700', label: '진행중' },
    partial: { bg: 'bg-sky-50', fg: 'text-sky-700', label: '일부' },
  };
  const s = map[status] ?? { bg: 'bg-gray-50', fg: 'text-gray-600', label: status };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${s.bg} ${s.fg}`}>
      {s.label}
    </span>
  );
}

export default async function ApiStatusPage() {
  let sources: any[] = [];
  let runs: any[] = [];
  let migrationNeeded = false;

  try {
    sources = await prisma.apiSource.findMany({
      orderBy: { id: 'asc' },
    });
    runs = await prisma.collectionRun.findMany({
      take: 20,
      orderBy: { startedAt: 'desc' },
      include: { source: { select: { name: true } } },
    });
  } catch (e: any) {
    if (/CollectionRun|relation.*does not exist/i.test(String(e))) {
      migrationNeeded = true;
      try {
        sources = await prisma.apiSource.findMany({ orderBy: { id: 'asc' } });
      } catch {
        /* ignore */
      }
    } else {
      throw e;
    }
  }

  const policyCount = await prisma.policy.count();

  return (
    <div className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-[1600px] mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl lg:text-2xl xl:text-3xl font-semibold text-gray-800 mb-1">
            API 수집현황
          </h1>
          <p className="text-sm lg:text-base text-gray-600">
            공공데이터포털 각 소스의 수집 상태와 최근 실행 로그를 실시간으로 확인합니다.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">DB 보유 정책</p>
          <p className="text-2xl font-semibold text-gray-800">{policyCount.toLocaleString()}건</p>
        </div>
      </div>

      {migrationNeeded && (
        <div className="mb-6 p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          ⚠️ <strong>마이그레이션 필요</strong>: <code>CollectionRun</code> 테이블이 아직 생성되지 않았습니다.
          Supabase SQL 에디터에서 <code>prisma/migrations/20260419_collection_runs/migration.sql</code>을 실행하세요.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {sources.length === 0 && (
          <div className="col-span-full p-6 rounded-xl border border-gray-200 bg-white text-gray-500 text-sm">
            등록된 API 소스가 없습니다. 마이그레이션 SQL을 먼저 적용하세요.
          </div>
        )}
        {sources.map((s) => (
          <div
            key={s.id}
            className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow transition"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-800">{s.name}</h3>
                <span
                  className={`inline-flex px-2 py-0.5 rounded text-xs ${
                    s.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {s.status}
                </span>
              </div>
              <span className="text-xs text-gray-400">{s.type}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4 text-center">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">최근 성공</p>
                <p className="text-sm font-medium text-gray-800">
                  {relativeTime(s.lastSuccess)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">오늘 수집</p>
                <p className="text-sm font-medium text-gray-800">
                  {(s.todayCount ?? 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">누적</p>
                <p className="text-sm font-medium text-gray-800">
                  {(s.totalCount ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
            {s.lastError && (
              <p className="text-xs text-rose-600 mb-3">
                마지막 오류: {relativeTime(s.lastError)}
              </p>
            )}
            <TriggerButton
              source={s.name === '복지로' ? 'bokjiro' : s.name}
              disabled={s.status !== 'active'}
            />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">최근 수집 로그</h2>
          <span className="text-xs text-gray-500">최대 20건</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3 text-left font-medium">소스</th>
                <th className="px-5 py-3 text-left font-medium">시작</th>
                <th className="px-5 py-3 text-center font-medium">상태</th>
                <th className="px-5 py-3 text-right font-medium">수신</th>
                <th className="px-5 py-3 text-right font-medium">신규</th>
                <th className="px-5 py-3 text-right font-medium">갱신</th>
                <th className="px-5 py-3 text-right font-medium">소요</th>
                <th className="px-5 py-3 text-left font-medium">비고</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 && (
                <tr>
                  <td className="px-5 py-8 text-center text-gray-400" colSpan={8}>
                    아직 실행 이력이 없습니다. 위 카드의 "지금 수집" 버튼을 눌러보세요.
                  </td>
                </tr>
              )}
              {runs.map((r) => (
                <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium text-gray-800">{r.source?.name ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-600">
                    {new Date(r.startedAt).toLocaleString('ko-KR', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-5 py-3 text-center">{statusBadge(r.status)}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-gray-700">{r.fetched}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-emerald-700">
                    {r.created > 0 ? `+${r.created}` : r.created}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-sky-700">{r.updated}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-gray-500">
                    {r.durationMs ? `${(r.durationMs / 1000).toFixed(1)}s` : '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-500 truncate max-w-[320px]" title={r.errorMsg ?? ''}>
                    {r.errorMsg ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
