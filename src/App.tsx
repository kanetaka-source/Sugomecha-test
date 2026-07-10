import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { AdminShell } from './components/AdminShell'
import { RequireAuth } from './components/RequireAuth'
import LoginPage from './pages/LoginPage'
import PasswordResetPage from './pages/PasswordResetPage'
import DashboardPage from './pages/DashboardPage'
import SeisekiPage from './pages/SeisekiPage'
import JikoHyokaPage from './pages/JikoHyokaPage'
import MachiPage from './pages/MachiPage'
import MachiDetailPage from './pages/MachiDetailPage'
import ShikakuPage from './pages/ShikakuPage'
import ProgressPage from './pages/ProgressPage'
import ProfilePage from './pages/ProfilePage'
import RankingPage from './pages/RankingPage'
import ExamPage from './pages/ExamPage'
import KenshuDetailPage from './pages/KenshuDetailPage'
import AdminHomePage from './pages/AdminHomePage'
import KyotenMasterPage from './pages/KyotenMasterPage'
import BumonMasterPage from './pages/BumonMasterPage'
import ShainListPage from './pages/ShainListPage'
import ShainFormPage from './pages/ShainFormPage'
import KenshuCourseMasterPage from './pages/KenshuCourseMasterPage'
import KenshuSectionListPage from './pages/KenshuSectionListPage'
import KenshuSectionFormPage from './pages/KenshuSectionFormPage'
import KenshuItemListPage from './pages/KenshuItemListPage'
import KenshuItemFormPage from './pages/KenshuItemFormPage'
import KenshuMaterialListPage from './pages/KenshuMaterialListPage'
import KenshuMaterialFormPage from './pages/KenshuMaterialFormPage'
import ShikakuMasterPage from './pages/ShikakuMasterPage'
import KengenListPage from './pages/KengenListPage'
import KengenDetailPage from './pages/KengenDetailPage'
import HoyuShikakuListPage from './pages/HoyuShikakuListPage'
import HoyuShikakuDetailPage from './pages/HoyuShikakuDetailPage'
import ShikenMasterListPage from './pages/ShikenMasterListPage'
import ShikenMasterDetailPage from './pages/ShikenMasterDetailPage'
import HikkiShinseiPage from './pages/HikkiShinseiPage'
import TensuPage from './pages/TensuPage'
import AdminMasterPlaceholderPage from './pages/AdminMasterPlaceholderPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/password-reset', element: <PasswordResetPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'seiseki', element: <SeisekiPage /> },
      { path: 'jiko-hyoka', element: <JikoHyokaPage /> },
      { path: 'machi', element: <MachiPage /> },
      { path: 'machi/:itemId', element: <MachiDetailPage /> },
      { path: 'shikaku', element: <ShikakuPage /> },
      { path: 'shinchoku', element: <ProgressPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'ranking', element: <RankingPage /> },
      { path: 'exam/:sectionId', element: <ExamPage /> },
      { path: 'kenshu-detail/:itemId', element: <KenshuDetailPage /> },
      // 追加画面はここに登録していく (Claude Code で展開)
    ],
  },
  {
    path: '/admin',
    element: (
      <RequireAuth>
        <AdminShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <AdminHomePage /> },
      // 業務メニュー
      { path: 'hikki-shinsei', element: <HikkiShinseiPage /> },
      { path: 'tensu', element: <TensuPage /> },
      // DB連携済みのマスタ
      { path: 'kyoten', element: <KyotenMasterPage /> },
      { path: 'bumon', element: <BumonMasterPage /> },
      { path: 'shain', element: <ShainListPage /> },
      { path: 'shain/new', element: <ShainFormPage /> },
      { path: 'shain/:id', element: <ShainFormPage /> },
      { path: 'kenshu-course', element: <KenshuCourseMasterPage /> },
      { path: 'kenshu-section', element: <KenshuSectionListPage /> },
      { path: 'kenshu-section/new', element: <KenshuSectionFormPage /> },
      { path: 'kenshu-section/:id', element: <KenshuSectionFormPage /> },
      { path: 'kenshu-item', element: <KenshuItemListPage /> },
      { path: 'kenshu-item/new', element: <KenshuItemFormPage /> },
      { path: 'kenshu-item/:id', element: <KenshuItemFormPage /> },
      { path: 'kenshu-material', element: <KenshuMaterialListPage /> },
      { path: 'kenshu-material/new', element: <KenshuMaterialFormPage /> },
      { path: 'kenshu-material/:id', element: <KenshuMaterialFormPage /> },
      { path: 'shikaku-master', element: <ShikakuMasterPage /> },
      { path: 'kengen', element: <KengenListPage /> },
      { path: 'kengen/:employeeId', element: <KengenDetailPage /> },
      { path: 'hoyu-shikaku', element: <HoyuShikakuListPage /> },
      { path: 'hoyu-shikaku/:employeeId', element: <HoyuShikakuDetailPage /> },
      { path: 'shiken', element: <ShikenMasterListPage /> },
      { path: 'shiken/:sectionId', element: <ShikenMasterDetailPage /> },
      // 各マスタ画面は順次実装。現状はプレースホルダ
      { path: ':section', element: <AdminMasterPlaceholderPage /> },
    ],
  },
])
