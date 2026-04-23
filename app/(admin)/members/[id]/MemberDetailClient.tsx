'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Member = {
  id: string
  email: string | null
  name: string | null
  image: string | null
  role: string
  emailVerified: string | null
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
  blockedAt: string | null
  blockedReason: string | null
  providers: { provider: string; providerAccountId: string; scope: string | null }[]
  latestSessionExpires: string | null
}

const PROVIDER_LABEL: Record<string, string> = {
  kakao: '카카오',
  google: '구글',
  email: '이메일',
  credentials: '관리자',
  'admin-credentials': '관리자',
}

const ROLE_LABEL: Record<string, string> = {
  USER: '일반',
  ADMIN: '관리자',
  BLOCKED: '차단',
}

function fmt(iso: string | null) {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function MemberDetailClient({ initialMember }: { initialMember: Member }) {
  const router = useRouter()
  const [member, setMember] = useState<Member>(initialMember)
  const [role, setRole] = useState(member.role)
  const [blockedReason, setBlockedReason] = useState(member.blockedReason ?? '')
  const [name, setName] = useState(member.name ?? '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/admin/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          name: name || null,
          blockedReason: role === 'BLOCKED' ? blockedReason : '',
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const j = await res.json()
      setMember((m) => ({
        ...m,
        role: j.user.role,
        name: j.user.name,
        blockedAt: j.user.role === 'BLOCKED' ? new Date().toISOString() : null,
        blockedReason: role === 'BLOCKED' ? blockedReason : null,
      }))
      setMsg('저장되었습니다.')
      router.refresh()
    } catch (e: any) {
      setMsg('저장 실패: ' + (e?.message || 'unknown'))
    } finally {
      setSaving(false)
    }
  }

  async function deleteMember() {
    const ok = confirm(
      `정말로 이 회원을 탈퇴 처리하시겠습니까?\n\n${member.email || member.id}\n\n이 작업은 되돌릴 수 없습니다.`,
    )
    if (!ok) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/members/${member.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      alert('탈퇴 처리되었습니다.')
      router.push('/members')
    } catch (e: any) {
      alert('탈퇴 처리 실패: ' + (e?.message || 'unknown'))
    } finally {
      setSaving(false)
    }
  }

  const kakao = member.providers.find((p) => p.provider === 'kakao')

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {member.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={member.image} alt="" className="h-16 w-16 rounded-full" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-2xl font-semibold text-gray-600">
              {(member.name || member.email || '?').slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{member.name || '(이름 없음)'}</h1>
            <p className="text-sm text-gray-500">{member.email || '-'}</p>
            <div className="mt-1 flex gap-2 text-xs">
              <RoleBadge role={member.role} />
              {member.emailVerified && (
                <span className="rounded bg-green-50 px-1.5 py-0.5 text-green-700">이메일 인증</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={deleteMember}
            disabled={saving}
            className="rounded-md border border-red-200 bg-white px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            탈퇴 처리
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 좌측: 편집 폼 */}
        <section className="lg:col-span-2 rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-800">관리 작업</h2>
          <div className="mt-4 space-y-4">
            <Field label="이름">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="권한">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {Object.keys(ROLE_LABEL).map((r) => (
                  <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                ))}
              </select>
              {role === 'BLOCKED' && (
                <p className="mt-1 text-xs text-red-600">저장 즉시 이 회원의 세션이 모두 해제됩니다.</p>
              )}
            </Field>
            {role === 'BLOCKED' && (
              <Field label="차단 사유 (내부 메모)">
                <textarea
                  value={blockedReason}
                  onChange={(e) => setBlockedReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="어뷰즈·신고·정책 위반 등"
                />
              </Field>
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
              {msg && <span className="text-xs text-gray-500">{msg}</span>}
            </div>
          </div>
        </section>

        {/* 우측: 메타 정보 */}
        <aside className="space-y-4">
          <section className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-800">활동</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row k="가입일"        v={fmt(member.createdAt)} />
              <Row k="마지막 수정"   v={fmt(member.updatedAt)} />
              <Row k="최근 로그인"   v={fmt(member.lastLoginAt)} />
              <Row k="세션 만료"     v={fmt(member.latestSessionExpires)} />
              {member.blockedAt && <Row k="차단 시점" v={fmt(member.blockedAt)} danger />}
            </dl>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-800">연결된 계정</h2>
            {member.providers.length === 0 ? (
              <p className="mt-3 text-xs text-gray-400">연결된 소셜 계정이 없습니다 (이메일 가입).</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {member.providers.map((p) => (
                  <li key={p.provider} className="rounded border border-gray-100 p-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{PROVIDER_LABEL[p.provider] || p.provider}</span>
                      <span className="text-xs text-gray-400">{p.providerAccountId.slice(0, 12)}…</span>
                    </div>
                    {p.scope && (
                      <div className="mt-1 text-[11px] text-gray-500 break-all">
                        scope: {p.scope}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {kakao && (
            <section className="rounded-lg border border-yellow-200 bg-yellow-50 p-5">
              <h2 className="text-sm font-semibold text-yellow-900">카카오 연동</h2>
              <dl className="mt-2 space-y-2 text-xs text-yellow-900">
                <Row k="Kakao ID" v={kakao.providerAccountId} />
                <Row
                  k="채널 추가 동의"
                  v={kakao.scope?.includes('plusfriends') ? '동의함' : '미동의 또는 scope 미설정'}
                />
              </dl>
              <p className="mt-3 text-[11px] text-yellow-900/80">
                plusfriends scope 가 포함된 회원에게만 카카오톡 채널 친구톡/알림톡 발송이 현실적으로 가능합니다.
                실제 발송에는 비즈메시지 리셀러(예: NHN Cloud, 알리고) 계약이 필요합니다.
              </p>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  )
}

function Row({ k, v, danger }: { k: string; v: string; danger?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-500">{k}</dt>
      <dd className={danger ? 'text-red-600' : 'text-gray-800'}>{v}</dd>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const cls =
    role === 'ADMIN'   ? 'bg-blue-50 text-blue-700' :
    role === 'BLOCKED' ? 'bg-red-50 text-red-700' :
                         'bg-gray-100 text-gray-700'
  return <span className={`rounded px-1.5 py-0.5 ${cls}`}>{ROLE_LABEL[role] || role}</span>
}
