import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  IconHome, IconPencil, IconGraphLine, IconBuilding, IconIdCard, IconShieldCheck, IconGradCap, IconLogout,
} from './icons'
import { logout } from '../lib/auth'
import { getCurrentUser } from '../lib/currentUser'
import { examApplicationsApi } from '../lib/api'
import logoIzumi from '../assets/logo-izumi.png'
import headerBg from '../assets/header-bg.png'

// 管理者ナビ（一般ユーザーとは別メニュー）
const nav = [
  { to: '/admin', label: 'ホーム', Icon: IconHome, end: true },
  { to: '/admin/hikki-shinsei', label: '筆記試験申請', Icon: IconPencil },
  { to: '/admin/tensu', label: '点数一覧', Icon: IconGraphLine },
  { to: '/admin/kyoten', label: '拠点マスタ', Icon: IconBuilding },
  { to: '/admin/shikaku-master', label: '資格マスタ', Icon: IconIdCard },
  { to: '/admin/kengen', label: '権限マスタ', Icon: IconShieldCheck },
  { to: '/admin/kenshu-course', label: '研修コースマスタ', Icon: IconGradCap },
]

export function AdminShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentUser = getCurrentUser()

  // 筆記試験申請メニューのバッジ：申請中（未承認）の件数
  const [pendingExam, setPendingExam] = useState(0)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const apps = await examApplicationsApi.list({ status: '申請中' })
        if (alive) setPendingExam(apps.length)
      } catch {
        /* 件数取得の失敗はバッジ非表示に留める */
      }
    }
    load()
    // 承認などで件数が変わったら再取得
    const onChanged = () => load()
    window.addEventListener('exam-apps-changed', onChanged)
    return () => {
      alive = false
      window.removeEventListener('exam-apps-changed', onChanged)
    }
  }, [location.pathname])

  function onLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="relative min-h-screen bg-canvas">
      {/* ヘッダー〜本文上部までまたぐ背景 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 overflow-hidden">
        <img
          src={headerBg}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover object-center opacity-[0.22]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#9798c7]/45 via-[#c7c8dc]/30 to-canvas" />
      </div>

      <header className="relative">
        <div className="mx-auto max-w-5xl">
          {/* 上段: ロゴ + 画面コード検索 + ユーザー */}
          <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-1">
            <div className="flex items-center gap-2">
              <img src={logoIzumi} alt="IZUMI" className="h-8 w-8 object-contain" />
              <span className="font-logo text-xl font-extrabold tracking-wider">
                <span className="text-brand-deep">SU</span>
                <span className="text-brand-light">GO</span>
                <span className="text-brand-deep"> MECHA</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* 画面コード検索 */}
              <div className="flex items-center gap-1 rounded-md border border-brand/60 bg-surface/70 px-2 py-1">
                <input
                  placeholder="画面コード:00-000-000"
                  className="w-36 bg-transparent text-[11px] text-ink outline-none placeholder:text-muted"
                />
                <button className="rounded bg-magenta px-2 py-1 text-[11px] font-bold text-white hover:brightness-95">
                  検索
                </button>
              </div>
              {/* ユーザー + ログアウト */}
              <div className="flex items-center gap-2 rounded-md border border-brand/60 bg-surface/70 px-2 py-1 text-xs">
                <span className="text-ink">{currentUser?.name ?? 'ゲスト'}</span>
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1 rounded bg-brand px-2 py-1 text-[11px] font-bold text-white hover:bg-brand-deep"
                >
                  <IconLogout className="h-3.5 w-3.5" />
                  Log out
                </button>
              </div>
            </div>
          </div>

          {/* 下段: ナビ */}
          <nav className="flex items-stretch justify-between px-2 pb-1">
            {nav.map(({ to, label, Icon, end }) => {
              // 筆記試験申請メニューに申請中件数バッジ
              const badge = to === '/admin/hikki-shinsei' ? pendingExam : 0
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `relative flex flex-1 flex-col items-center gap-1 rounded-lg py-2 text-[11px] transition-colors ${
                      isActive
                        ? 'bg-brand/10 font-bold text-brand'
                        : 'text-ink/70 hover:bg-brand/5 hover:text-brand'
                    }`
                  }
                >
                  <div className="relative">
                    <Icon className="h-6 w-6" />
                    {badge > 0 && (
                      <span
                        title={`申請中 ${badge}件`}
                        className="absolute -right-2.5 -top-1.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-danger px-1 text-[9px] font-bold leading-none text-white"
                      >
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </div>
                  {label}
                </NavLink>
              )
            })}
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
