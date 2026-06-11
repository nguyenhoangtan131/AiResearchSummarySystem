import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Home from './pages/Home';
import ResearchResult from './pages/ResearchResult';
import History from './pages/History';
import AdminDashboard from './pages/AdminDashboard';
import AdminUserDetail from './pages/AdminUserDetail';
import AdminArticleDetail from './pages/AdminArticleDetail';
import AdminApiKeys from './pages/AdminApiKeys';
import Navbar from './components/layout/navbar';
import LandingPage from './pages/LandingPage';
import { authApi } from './services/api';
import { clearStoredUser, getStoredUser, saveStoredUser, type AppUser } from './utils/session';

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="rounded-[28px] border border-white/10 bg-white/5 px-8 py-6 text-center shadow-[0_24px_60px_rgba(2,6,23,0.4)]">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-300">AI Research</p>
        <p className="mt-3 text-lg text-slate-200">Đang kiểm tra phiên làm việc...</p>
      </div>
    </div>
  );
}

function RequireAuth({ user, children }: { user: AppUser | null; children: JSX.Element }) {
  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  const [user, setUser] = useState<AppUser | null>(() => getStoredUser());
  const [isBootstrappingSession, setIsBootstrappingSession] = useState(true);

  const persistUserInfo = (userInfo: AppUser | null) => {
    if (userInfo) {
      saveStoredUser(userInfo);
      setUser(userInfo);
      return;
    }

    clearStoredUser();
    setUser(null);
  };

  useEffect(() => {
    let isCancelled = false;

    const bootstrapSession = async () => {
      try {
        const response = await authApi.getMe();

        if (!isCancelled) {
          persistUserInfo(response.data as AppUser);
        }
      } catch (error: any) {
        if (!isCancelled && error?.response?.status === 401) {
          persistUserInfo(null);
        }
      } finally {
        if (!isCancelled) {
          setIsBootstrappingSession(false);
        }
      }
    };

    void bootstrapSession();

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Lỗi xóa session backend', error);
    } finally {
      persistUserInfo(null);
    }
  };

  if (isBootstrappingSession) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 font-sans">
        {user ? <Navbar user={user} onLogout={handleLogout} /> : null}
        <Routes>
          <Route
            path="/"
            element={user ? <Navigate to="/home" replace /> : <LandingPage onAuthenticated={persistUserInfo} />}
          />
          <Route
            path="/home"
            element={
              <RequireAuth user={user}>
                <Home />
              </RequireAuth>
            }
          />
          <Route path="/advanced-generator" element={<Navigate to="/home" replace />} />
          <Route
            path="/history"
            element={
              <RequireAuth user={user}>
                <History />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <RequireAuth user={user}>
                <AdminDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/api-keys"
            element={
              <RequireAuth user={user}>
                <AdminApiKeys />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/users/:userId"
            element={
              <RequireAuth user={user}>
                <AdminUserDetail />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/articles/:articleId"
            element={
              <RequireAuth user={user}>
                <AdminArticleDetail />
              </RequireAuth>
            }
          />
          <Route
            path="/article/:id"
            element={
              <RequireAuth user={user}>
                <ResearchResult />
              </RequireAuth>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
