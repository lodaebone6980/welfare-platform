import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '\uC54C\uB9BC',
  description: '\uB098\uC758 \uB9DE\uCDA4 \uBCF5\uC9C0 \uC815\uCC45 \uC54C\uB9BC',
};

export default function NotificationsPage() {
  return (
    <div className="pb-24 px-4 pt-6">
      <h1 className="text-xl font-bold mb-6">\uD83D\uDD14 \uC54C\uB9BC</h1>
      <div className="bg-blue-50 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">\uD83D\uDCF1</div>
        <p className="text-gray-700 font-medium mb-2">\uC571\uC744 \uC124\uCE58\uD558\uBA74 \uB9DE\uCDA4 \uC54C\uB9BC\uC744 \uBC1B\uC744 \uC218 \uC788\uC5B4\uC694!</p>
        <p className="text-gray-500 text-sm mb-4">\uC0C8\uB85C\uC6B4 \uC9C0\uC6D0\uAE08, \uB9C8\uAC10 \uC784\uBC15 \uC815\uCC45 \uB4F1\uC744 \uB193\uCE58\uC9C0 \uB9C8\uC138\uC694</p>
        <div className="flex gap-3 justify-center">
          <a href="#" className="bg-black text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
            App Store
          </a>
          <a href="#" className="bg-black text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302L17.698 13l-2.302-2.302 2.302-2.19zM5.864 2.658L16.8 8.99l-2.302 2.302L5.864 2.658z"/></svg>
            Google Play
          </a>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm shrink-0">\uD83D\uDCE2</div>
          <div>
            <p className="text-sm font-medium text-gray-800">\uC571 \uCD9C\uC2DC \uC608\uC815 \uC548\uB0B4</p>
            <p className="text-xs text-gray-500 mt-0.5">\uC815\uCC45\uC9C0\uAE08 \uC571\uC774 \uACE7 \uCD9C\uC2DC\uB429\uB2C8\uB2E4. \uCD9C\uC2DC \uC2DC \uC54C\uB824\uB4DC\uB9B4\uAC8C\uC694!</p>
            <p className="text-xs text-gray-400 mt-1">2025.04.05</p>
          </div>
        </div>
      </div>
    </div>
  );
}
