'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type FilterConditions = {
  age: string;
  income: string;
  household: string;
  region: string;
  employment: string;
  interests: string[];
  applyType: '' | 'always' | 'deadline';
};

type Policy = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  eligibility: string | null;
  applicationMethod: string | null;
  geoRegion: string | null;
  deadline: string | null;
  category: { name: string; slug: string } | null;
};

// 중간점(·) 표시용 치환
function displayCategoryName(name?: string | null): string {
  return (name || '').replace(/·/g, ' ');
}
// 상시신청 여부 판별
function isAlwaysOpen(deadline?: string | null): boolean {
  const d = (deadline || '').trim();
  return !d || /상시|수시|연중|상시모집|상시접수/.test(d);
}

const REGIONS = [
  '전체', '서울', '경기', '인천', '부산', '대구', '대전', '광주',
  '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'
];

const CATEGORY_COLORS: Record<string, string> = {
  '환급금': 'bg-green-100 text-green-800 border-green-200',
  '바우처': 'bg-purple-100 text-purple-800 border-purple-200',
  '지원금': 'bg-blue-100 text-blue-800 border-blue-200',
  '대출': 'bg-orange-100 text-orange-800 border-orange-200',
  '보조금': 'bg-teal-100 text-teal-800 border-teal-200',
  '교육': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  '주거': 'bg-rose-100 text-rose-800 border-rose-200',
  '의료': 'bg-red-100 text-red-800 border-red-200',
  '고용': 'bg-amber-100 text-amber-800 border-amber-200',
  '문화': 'bg-pink-100 text-pink-800 border-pink-200',
};

export default function RecommendPage() {
  const [step, setStep] = useState(1);
  const [conditions, setConditions] = useState<FilterConditions>({
    age: '',
    income: '',
    household: '',
    region: '전체',
    employment: '',
    interests: [],
    applyType: '',
  });
  const [results, setResults] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const toggleInterest = (interest: string) => {
    setConditions(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setStep(4);
    try {
      const params = new URLSearchParams();
      if (conditions.age) params.set('age', conditions.age);
      if (conditions.income) params.set('income', conditions.income);
      if (conditions.household) params.set('household', conditions.household);
      if (conditions.region && conditions.region !== '전체') params.set('region', conditions.region);
      if (conditions.employment) params.set('employment', conditions.employment);
      if (conditions.interests.length > 0) params.set('interests', conditions.interests.join(','));
      if (conditions.applyType) params.set('applyType', conditions.applyType);

      const resp = await fetch(`/api/recommend?${params.toString()}`);
      const data = await resp.json();
      setResults(data.policies || []);
      setTotalCount(data.total || 0);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
        <div className="max-w-3xl mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">🎯 나에게 맞는 정책 찾기</h1>
          <p className="opacity-80">간단한 조건을 입력하면 맞춤 복지 정책을 추천해드려요</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8 gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= s ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>{s}</div>
              {s < 3 && <div className={`w-12 h-1 mx-1 ${step > s ? 'bg-indigo-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 animate-fadeIn">
            <h2 className="text-xl font-bold mb-6">👤 기본 정보</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">연령대</label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {['청소년', '청년(19-34)', '중년(35-49)', '장년(50-64)', '어르신(65+)', '전체'].map(age => (
                    <button
                      key={age}
                      onClick={() => setConditions(prev => ({ ...prev, age }))}
                      className={`p-3 rounded-xl text-sm font-medium border-2 transition-all ${
                        conditions.age === age
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >{age}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">소득 수준</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { label: '기초수급', desc: '중위소득 30% 이하' },
                    { label: '차상위', desc: '중위소득 50% 이하' },
                    { label: '중위소득', desc: '중위소득 100% 이하' },
                    { label: '제한없음', desc: '소득 무관' },
                  ].map(income => (
                    <button
                      key={income.label}
                      onClick={() => setConditions(prev => ({ ...prev, income: income.label }))}
                      className={`p-3 rounded-xl text-left border-2 transition-all ${
                        conditions.income === income.label
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="block text-sm font-medium">{income.label}</span>
                      <span className="block text-xs text-gray-500">{income.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="mt-8 w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors"
            >다음 →</button>
          </div>
        )}

        {/* Step 2: Household & Region */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 animate-fadeIn">
            <h2 className="text-xl font-bold mb-6">🏠 가구 및 지역</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">가구 유형</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {['단독가구', '한부모가족', '맞벌이가구', '다자녀가구', '신혼부부', '전체'].map(h => (
                    <button
                      key={h}
                      onClick={() => setConditions(prev => ({ ...prev, household: h }))}
                      className={`p-3 rounded-xl text-sm font-medium border-2 transition-all ${
                        conditions.household === h
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >{h}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">거주 지역</label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {REGIONS.map(r => (
                    <button
                      key={r}
                      onClick={() => setConditions(prev => ({ ...prev, region: r }))}
                      className={`p-2 rounded-xl text-sm font-medium border-2 transition-all ${
                        conditions.region === r
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >{r}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-4 border-2 border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-gray-50">← 이전</button>
              <button onClick={() => setStep(3)} className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">다음 →</button>
            </div>
          </div>
        )}

        {/* Step 3: Employment & Interests */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 animate-fadeIn">
            <h2 className="text-xl font-bold mb-6">💼 직업 및 관심분야</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">직업 상태</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {['구직중', '재직자', '자영업자', '학생', '주부/육아', '전체'].map(e => (
                    <button
                      key={e}
                      onClick={() => setConditions(prev => ({ ...prev, employment: e }))}
                      className={`p-3 rounded-xl text-sm font-medium border-2 transition-all ${
                        conditions.employment === e
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >{e}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">관심 분야 (복수 선택 가능)</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {['환급금', '바우처', '지원금', '대출', '보조금', '교육', '주거', '의료', '고용', '문화'].map(i => (
                    <button
                      key={i}
                      onClick={() => toggleInterest(i)}
                      className={`p-3 rounded-xl text-sm font-medium border-2 transition-all ${
                        conditions.interests.includes(i)
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {conditions.interests.includes(i) ? '✅ ' : ''}{i}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">신청 유형</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: '전체', value: '' as const },
                    { label: '⏰ 마감기한', value: 'deadline' as const },
                    { label: '🔁 상시신청', value: 'always' as const },
                  ].map(t => (
                    <button
                      key={t.label}
                      onClick={() => setConditions(prev => ({ ...prev, applyType: t.value }))}
                      className={`p-3 rounded-xl text-sm font-medium border-2 transition-all ${
                        conditions.applyType === t.value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >{t.label}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-4 border-2 border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-gray-50">← 이전</button>
              <button onClick={handleSubmit} className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:opacity-90">🎯 맞춤 정책 찾기</button>
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 4 && (
          <div className="animate-fadeIn">
            {loading ? (
              <div className="text-center py-20">
                <div className="inline-block w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600 font-medium">맞춤 정책을 찾고 있어요...</p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold">🎉 추천 결과</h2>
                      <p className="text-gray-600 mt-1">총 <strong className="text-indigo-600">{totalCount}건</strong>의 맞춤 정책을 찾았어요</p>
                    </div>
                    <button
                      onClick={() => { setStep(1); setResults([]); }}
                      className="px-4 py-2 border-2 border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50"
                    >다시 검색</button>
                  </div>

                  {/* Selected conditions summary */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {conditions.age && <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm">{conditions.age}</span>}
                    {conditions.income && <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">{conditions.income}</span>}
                    {conditions.household && <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm">{conditions.household}</span>}
                    {conditions.region !== '전체' && <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">{conditions.region}</span>}
                    {conditions.employment && <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">{conditions.employment}</span>}
                    {conditions.interests.map(i => (
                      <span key={i} className="px-3 py-1 bg-pink-50 text-pink-700 rounded-full text-sm">{i}</span>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {results.map((policy) => {
                    const catName = displayCategoryName(policy.category?.name || '복지');
                    const rawName = policy.category?.name || '복지';
                    const color = CATEGORY_COLORS[rawName] || CATEGORY_COLORS[catName] || 'bg-gray-100 text-gray-800 border-gray-200';
                    const always = isAlwaysOpen(policy.deadline);
                    return (
                      <Link
                        key={policy.id}
                        href={`/welfare/${policy.slug}`}
                        className="block bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition-all border border-gray-100"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}>
                              {catName}
                            </span>
                            {always ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                🔁 상시신청
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                                ⏰ {policy.deadline}
                              </span>
                            )}
                          </div>
                          {policy.geoRegion && (
                            <span className="text-xs text-gray-500">📍 {policy.geoRegion}</span>
                          )}
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg mb-2">{policy.title}</h3>
                        {policy.excerpt && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-3">{policy.excerpt}</p>
                        )}
                        {policy.eligibility && (
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <p className="text-xs text-blue-600 font-medium mb-1">지원 대상</p>
                            <p className="text-sm text-gray-700 line-clamp-2">{policy.eligibility}</p>
                          </div>
                        )}
                      </Link>
                    );
                  })}

                  {results.length === 0 && !loading && (
                    <div className="text-center py-12 bg-white rounded-2xl">
                      <p className="text-gray-500 text-lg mb-2">조건에 맞는 정책이 없어요</p>
                      <p className="text-gray-400 text-sm">조건을 조금 넓혀보세요</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
