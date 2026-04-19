'use client';

type Props = {
  title: string;
  description?: string;
  features?: string[];
  eta?: string;
  icon?: string;
};

export default function ComingSoon({ title, description, features, eta, icon = '🚧' }: Props) {
  return (
    <div className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-[1600px] mx-auto w-full">
      <h1 className="text-xl lg:text-2xl xl:text-3xl font-semibold text-gray-800 mb-2">{title}</h1>
      {description && (
        <p className="text-sm lg:text-base text-gray-600 mb-6 lg:mb-8">{description}</p>
      )}

      <div className="bg-white rounded-xl p-6 lg:p-8 border border-gray-200 shadow-sm">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-2xl lg:text-3xl">
            {icon}
          </div>
          <div className="flex-1">
            <p className="text-base lg:text-lg font-medium text-gray-800 mb-1">
              준비중인 메뉴입니다
            </p>
            <p className="text-sm text-gray-500">
              예정 기능 목록은 아래와 같습니다{eta ? ` · 공개 예정: ${eta}` : ''}.
            </p>
          </div>
        </div>

        {features && features.length > 0 && (
          <div className="border-t border-gray-100 pt-5">
            <p className="text-xs lg:text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
              Roadmap
            </p>
            <ul className="space-y-2.5">
              {features.map((f, i) => (
                <li key={i} className="flex items-start gap-3 text-sm lg:text-base text-gray-700">
                  <span className="inline-flex w-5 h-5 lg:w-6 lg:h-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 text-xs lg:text-sm font-semibold">
                    {i + 1}
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
