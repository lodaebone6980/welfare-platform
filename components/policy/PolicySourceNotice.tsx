import { getPolicySourceUrl, type PolicyQualityInput, type PolicyQualityReport } from '@/lib/policy-quality';

type Props = {
  policy: PolicyQualityInput & {
    updatedAt?: Date | string | null;
    publishedAt?: Date | string | null;
  };
  quality: PolicyQualityReport;
};

function formatDate(value?: Date | string | null): string {
  if (!value) return '확인 필요';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '확인 필요';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export default function PolicySourceNotice({ policy, quality }: Props) {
  const sourceUrl = getPolicySourceUrl(policy);
  const reviewedAt = formatDate(policy.updatedAt || policy.publishedAt);

  return (
    <aside className="mb-8 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
      <h2 className="mb-3 text-base font-bold text-gray-900">출처 및 검수 정보</h2>
      <dl className="grid gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-xs font-medium text-gray-500">마지막 확인</dt>
          <dd className="mt-1 font-semibold text-gray-900">{reviewedAt}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500">공식 출처</dt>
          <dd className="mt-1">
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="font-semibold text-blue-700 underline"
              >
                공식 안내 확인
              </a>
            ) : (
              <span className="font-semibold text-amber-700">보강 필요</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500">콘텐츠 상태</dt>
          <dd className={quality.indexable ? 'mt-1 font-semibold text-emerald-700' : 'mt-1 font-semibold text-amber-700'}>
            {quality.indexable ? '색인 가능' : '검수 보강 대상'}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        지원금길잡이는 정부 공식 기관이 아닌 민간 정보 서비스입니다. 실제 신청 자격, 금액, 접수 기간은 접수 전 반드시
        공식 안내에서 다시 확인해 주세요.
      </p>
    </aside>
  );
}
