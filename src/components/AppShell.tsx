import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  IconHome, IconClipboard, IconUsers, IconChart, IconBadge, IconGraphLine, IconLogout, IconUser,
} from './icons'
import { logout } from '../lib/auth'
import { getCurrentUser } from '../lib/currentUser'
import logoIzumi from '../assets/logo-izumi.png'
import headerBg from '../assets/header-bg.png'

const nav = [
  { to: '/dashboard', label: 'ホーム', Icon: IconHome },
  { to: '/kenshu', label: '研修', Icon: IconClipboard },
  { to: '/machi', label: '待ち人数', Icon: IconUsers },
  { to: '/seiseki', label: '成績', Icon: IconChart },
  { to: '/shikaku', label: '資格', Icon: IconBadge },
  { to: '/ranking', label: 'ランキング', Icon: IconGraphLine },
]

export function AppShell() {
  const navigate = useNavigate()
  const currentUser = getCurrentUser()

  function onLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="relative min-h-screen bg-canvas">
      {/* ヘッダー〜ステータス上部までまたぐ背景（境界を曖昧にする） */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 overflow-hidden">
        {/* 背景写真（中央・うっすら透かし） */}
        <img
          src={headerBg}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover object-center opacity-[0.22]"
        />
        {/* グレー〜ラベンダー（上）→ キャンバス色（下）へ。下端を溶かして境界を消す */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#9798c7]/45 via-[#c7c8dc]/30 to-canvas" />
      </div>

      <header className="relative">
        <div className="mx-auto max-w-5xl">
          {/* 上段: ロゴ + ユーザー */}
          <div className="flex items-center justify-between px-5 pt-3 pb-1">
            <div className="flex items-center gap-2">
              <img src={logoIzumi} alt="IZUMI" className="h-8 w-8 object-contain" />
              <span className="font-logo text-xl font-extrabold tracking-wider">
                <span className="text-brand-deep">SU</span>
                <span className="text-brand-light">GO</span>
                <span className="text-brand-deep"> MECHA</span>
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-brand/60 bg-surface/70 px-2 py-1 text-xs">
              <button
                onClick={() => navigate('/profile')}
                title="プロフィール"
                className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/10 text-brand hover:bg-brand/20"
              >
                <IconUser className="h-3.5 w-3.5" />
              </button>
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
          {/* 下段: ナビ */}
          <nav className="flex items-stretch justify-between px-2 pb-1">
            {nav.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex flex-1 flex-col items-center gap-1 rounded-lg py-2 text-[11px] transition-colors ${
                    isActive
                      ? 'bg-brand/10 font-bold text-brand'
                      : 'text-ink/70 hover:bg-brand/5 hover:text-brand'
                  }`
                }
              >
                <Icon className="h-6 w-6" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
