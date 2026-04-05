'use client';
import { useState, useEffect } from 'react';

export default function AppSmartBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('app-banner-dismissed');
    if (!dismissed) setShow(true);
  }, []);

  const dismiss = () => {
    setShow(false);
    sessionStorage.setItem('app-banner-dismissed', '1');
  };

  if (!show) return null;

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2.5 flex items-center gap-3 md:hidden">
      <button onClick={dismiss} className="text-white/70 hover:text-white text-lg leading-none">&times;</button>
      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0">
        <span className="text-blue-600 font-bold text-xs">\uC815\uCC45</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">\uC815\uCC45\uC9C0\uAE08 \uC571\uC73C\uB85C \uB354 \uD3B8\uD558\uAC8C!</p>
        <p className="text-xs text-white/70">\uB9DE\uCDA4 \uC54C\uB9BC \u00B7 \uBE60\uB978 \uAC80\uC0C9 \u00B7 \uC624\uD504\uB77C\uC778 \uC9C0\uC6D0</p>
      </div>
      <a href="#" className="bg-white text-blue-600 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 hover:bg-blue-50 transition-colors">
        \uC124\uCE58
      </a>
    </div>
  );
}
