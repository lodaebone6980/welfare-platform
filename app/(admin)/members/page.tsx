export const metadata = {
  title: '\uD68C\uC6D0 \uAD00\uB9AC',
};

export default function MembersPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">\uD68C\uC6D0 \uAD00\uB9AC</h1>
        <p className="text-xs text-gray-500 mt-1">\uAC00\uC785 \uD68C\uC6D0 \uBAA9\uB85D \u00B7 \uAC80\uC0C9 \u00B7 \uC0C1\uC138 \uC870\uD68C</p>
      </div>

      <div className="p-5 rounded-xl border border-amber-200 bg-amber-50">
        <div className="flex items-start gap-3">
          <span className="text-lg" aria-hidden>\uD83D\uDEE0\uFE0F</span>
          <div>
            <h2 className="text-sm font-semibold text-amber-900">\uC900\uBE44 \uC911\uC785\uB2C8\uB2E4</h2>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              \uD604\uC7AC \uD68C\uC6D0\uAC00\uC785 \uAE30\uB2A5\uC774 \uD65C\uC131\uD654\uB418\uC5B4 \uC788\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.
              \uC774\uBA54\uC77C\u00B7\uAD6C\uAE00\u00B7\uCE74\uCE74\uC624 \uB85C\uADF8\uC778 \uC5F0\uB3D9 \uD6C4 \uC774 \uD398\uC774\uC9C0\uC5D0 \uD68C\uC6D0 \uBAA9\uB85D\uC774 \uD45C\uC2DC\uB429\uB2C8\uB2E4.
            </p>
            <ul className="text-xs text-amber-800 mt-3 list-disc pl-5 space-y-1">
              <li>Prisma \uC2A4\uD0A4\uB9C8\uC5D0 <code className="bg-white px-1 rounded">User</code> / <code className="bg-white px-1 rounded">Account</code> / <code className="bg-white px-1 rounded">Session</code> \uBAA8\uB378 \uCD94\uAC00</li>
              <li>NextAuth \uC5D0 <code className="bg-white px-1 rounded">PrismaAdapter</code> \uC5F0\uACB0</li>
              <li>Google/Kakao OAuth \uD074\uB77C\uC774\uC5B8\uD2B8 ID/Secret \uBC1C\uAE09 \uBC0F \uD658\uACBD\uBCC0\uC218 \uB4F1\uB85D</li>
              <li>\uC774\uBA54\uC77C \uB85C\uADF8\uC778 \uB9C1\uD06C \uC804\uC1A1 \uC2DC Resend(or Sendgrid) API \uD0A4 \uD544\uC694</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
