import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '알림',
  description: '정부 지원금 관련 최신 알림과 공지사항을 확인하세요.',
};

export default function NotificationsPage() {
  return (
    <div className="pb-24 px-4 pt-8">
      <h1 className="text-xl font-bold mb-6">알림</h1>
      <div className="bg-blue-50 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">📱</div>
        <p className="text-base font-medium text-gray-800 mb-2">
          아직 알림이 없습니다
        </p>
        <p className="text-sm text-gray-500 mb-4">
          관심 정책을 등록하면, 새로운 정책이나 마감 임박 알림을 받을 수 있어요.
        </p>
        <div className="flex gap-3 justify-center">
          <a href="#" className="bg-black text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
            App Store
          </a>
          <a href="#" className="bg-black text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M3.609 1.814L13.792 12.61 22.186a.996.996 0.01-.61-.352V2.734a1 1 0 0 1.609-.92zm10.89 10.893l2.302-10.937 6.333 8.635-8.635zm3.159-3.199l2.302 2.302L17.698 13h-2.302-2.302 2.302-2.19zM5.864 2.658L16.8 8.996l-2.302 2.302L5.864 2.658"/></svg>
            Google Play
          </a>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm shrink-0">📢</div>
          <div>
            <p className="text-sm font-medium text-gray-800">국민자료실 서비스 안내</p>
            <p className="text-xs text-gray-500 mt-0.5">국민자료실은 정부 및 지자체의 다양한 복지 정책, 지원금, 보조금 정보를 한곳에서 확인할 수 있는 서비스입니다.</p>
            <p className="text-xs text-gray-400 mt-1">2025.04.05</p>
          </div>
        </div>
      </div>
    </div>
  );
}
