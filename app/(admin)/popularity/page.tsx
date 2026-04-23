import PopularitySyncClient from './_components/PopularitySyncClient';

// 이 페이지는 서버 DB 쿼리가 없고 정적 UI + 클라이언트 컴포넌트만 렌더링하므로
// force-dynamic 제거 → 정적으로 프리렌더되어 TTFB 수십 ms 수준

export default function PopularityAdminPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-[1600px] mx-auto w-full">
      <h1 className="text-2xl font-bold mb-1">외부 인기도 동기화</h1>
      <p className="text-sm text-gray-500 mb-5">
        네이버 뉴스 매칭 수를 기반으로 각 정책의{' '}
        <code className="text-xs bg-gray-100 px-1 rounded">externalScore</code>{' '}
        를 갱신합니다. &quot;가장 많이 보는 지원금&quot; 순위에 반영됩니다.
      </p>

      <div className="bg-white border rounded-xl p-4 mb-4">
        <h2 className="text-sm font-semibold mb-2">지금 갱신</h2>
        <p className="text-xs text-gray-500 mb-3">
          1회 호출당 오래된 정책 <b>300건</b>을 처리합니다. 네이버 API 쿼터
          보호를 위해 동시 3개·건당 0.5초 텀으로 동작해 약 1~3분 걸립니다.
          전체를 다 채우려면 여러 번 눌러주세요.
        </p>
        <PopularitySyncClient />
      </div>

      <details className="text-xs text-gray-500">
        <summary className="cursor-pointer">자동 실행 안내</summary>
        <p className="mt-2 leading-relaxed">
          이 작업은 매일 새벽(UTC 18:30 = KST 03:30)에 Vercel Cron 으로
          자동 실행됩니다. 수동 버튼은 초기 데이터 채우기나 즉시 반영이
          필요할 때 사용하세요.
        </p>
      </details>
    </div>
  );
}
