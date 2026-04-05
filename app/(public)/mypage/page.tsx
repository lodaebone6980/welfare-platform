import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '\uB9C8\uC774\uD398\uC774\uC9C0',
  description: '\uB0B4 \uC815\uBCF4 \uBC0F \uC124\uC815',
};

export default function MyPage() {
  return (
    <div className="pb-24 px-4 pt-6">
      <h1 className="text-xl font-bold mb-6">\uB9C8\uC774\uD398\uC774\uC9C0</h1>
      
      {/* Login section */}
      <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl p-6 text-center mb-6">
        <p className="text-black font-bold text-lg mb-2">\uB85C\uADF8\uC778\uD558\uACE0 \uB9DE\uCDA4 \uC815\uCC45 \uBC1B\uAE30</p>
        <p className="text-black/70 text-sm mb-4">\uCE74\uCE74\uC624\uD1A1\uC73C\uB85C \uAC04\uD3B8\uD558\uAC8C \uC2DC\uC791\uD558\uC138\uC694</p>
        <button className="bg-black text-yellow-400 font-bold px-6 py-3 rounded-xl flex items-center gap-2 mx-auto hover:bg-gray-900 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#FEE500"><path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.728 1.818 5.122 4.545 6.467-.2.745-.725 2.697-.831 3.115-.13.512.188.505.395.367.162-.108 2.583-1.752 3.63-2.464.733.104 1.487.159 2.261.159 5.523 0 10-3.463 10-7.691S17.523 3 12 3z"/></svg>
          \uCE74\uCE74\uC624\uD1A1\uC73C\uB85C \uB85C\uADF8\uC778
        </button>
      </div>

      {/* Menu items */}
      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
        <a href="/recommend" className="flex items-center justify-between p-4 hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-lg">\uD83C\uDFAF</span>
            <span className="font-medium">\uB9DE\uCDA4 \uC815\uCC45 \uCD94\uCC9C</span>
          </div>
          <svg width="20" height="20" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
        </a>
        <a href="/welfare/categories" className="flex items-center justify-between p-4 hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-lg">\uD83D\uDCC2</span>
            <span className="font-medium">\uCE74\uD14C\uACE0\uB9AC\uBCC4 \uBCF4\uAE30</span>
          </div>
          <svg width="20" height="20" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
        </a>
        <a href="#" className="flex items-center justify-between p-4 hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-lg">\uD83D\uDD14</span>
            <span className="font-medium">\uC54C\uB9BC \uC124\uC815</span>
          </div>
          <svg width="20" height="20" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
        </a>
        <a href="#" className="flex items-center justify-between p-4 hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-lg">\u2753</span>
            <span className="font-medium">\uC790\uC8FC \uBB3B\uB294 \uC9C8\uBB38</span>
          </div>
          <svg width="20" height="20" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
        </a>
      </div>

      <p className="text-center text-xs text-gray-400 mt-8">\uC815\uCC45\uC9C0\uAE08 v1.0 | \u00A9 2025</p>
    </div>
  );
}
