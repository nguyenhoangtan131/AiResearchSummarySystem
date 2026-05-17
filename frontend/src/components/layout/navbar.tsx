import React from 'react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { authApi } from '../../services/api';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { Settings, Shield } from 'lucide-react';
import { canShowAdminUiDuringBootstrap } from '../../utils/adminAccess';
interface User {
  full_name: string;
  email: string;
  tier?: 'free' | 'tier 1' | 'admin';
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const canAccessAdminUi = canShowAdminUiDuringBootstrap(user);

  const persistUserInfo = (userInfo: User | null) => {
    if (userInfo) {
      localStorage.setItem('user_info', JSON.stringify(userInfo));
      setUser(userInfo);
      return;
    }

    localStorage.removeItem('user_info');
    setUser(null);
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user_info');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (parseError) {
        console.error('Không đọc được user_info đã lưu:', parseError);
      }
    }

    const syncUserSession = async () => {
      if (!savedUser) {
        return;
      }

      try {
        const response = await authApi.getMe();
        const userInfo = response.data;
        persistUserInfo(userInfo);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 401) {
            persistUserInfo(null);
            return;
          }

          if (error.code === 'ERR_NETWORK') {
            console.warn('Backend auth hiện không reachable, tạm giữ state user cục bộ.');
            return;
          }
        }

        console.error('Không đồng bộ được user hiện tại:', error);
      }
    };

    void syncUserSession();
  }, []);

  useEffect(() => {
    setIsAdminMenuOpen(false);
  }, [location.pathname]);

  const handleLoginSuccess = async (codeResponse: any) => {
    try {
      const res = await authApi.loginWithGoogle(codeResponse.access_token); 
      const userInfo = res.data.user || res.data; 
      persistUserInfo(userInfo);
      navigate('/history', { replace: true });

      try {
        const meResponse = await authApi.getMe();
        persistUserInfo(meResponse.data);
      } catch (syncError) {
        if (axios.isAxiosError(syncError) && syncError.code === 'ERR_NETWORK') {
          console.warn('Đăng nhập đã lưu local state, nhưng chưa đồng bộ được session backend ngay lúc này.');
        } else {
          console.error('Đăng nhập xong nhưng chưa lấy lại được hồ sơ phiên:', syncError);
        }
      }
    } catch (err) {
      console.error("Lỗi đăng nhập:", err);
    }
  };
  const login = useGoogleLogin({
    onSuccess: handleLoginSuccess,
    onError: () => console.log('Login Failed'),
  });
  (window as any).triggerGoogleLogin = login;
  const  handleLogout = async () => {
    try {
      await authApi.logout();
    }catch (err) {
      console.error("Lỗi xóa session backend", err);
    } finally {
      persistUserInfo(null);
      navigate('/', { replace: true });
    }
  }

  return (
    <nav className="border-b border-slate-800 bg-slate-950/95 text-white shadow-[0_16px_40px_rgba(15,23,42,0.35)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div
          className="group inline-flex cursor-pointer items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-white/10 hover:shadow-[rgba(0,0,0,0.3)_0px_19px_38px,rgba(0,0,0,0.22)_0px_15px_12px]"
          onClick={() => navigate('/')}
        >
          <span className="text-lg">🔬</span>
          <span className="text-xl font-bold tracking-tight text-white transition duration-300 group-hover:text-cyan-300 group-hover:[text-shadow:0_0_6px_rgba(34,211,238,0.72),0_0_16px_rgba(34,211,238,0.42),0_0_28px_rgba(34,211,238,0.24)]">
            AI RESEARCH
          </span>
          <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.9)] transition duration-300 group-hover:scale-125 group-hover:shadow-[0_0_28px_rgba(34,211,238,0.95)]" />
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 md:flex">
            <Link
              to="/"
              className={`relative rounded-full px-4 py-2 text-sm font-semibold transition duration-200 ${
                location.pathname === '/'
                  ? 'bg-cyan-300/16 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(34,211,238,0.16)]'
                  : 'cursor-pointer text-slate-200 hover:-translate-y-0.5 hover:bg-white/8 hover:text-cyan-300 hover:[text-shadow:0_0_6px_rgba(34,211,238,0.72),0_0_16px_rgba(34,211,238,0.42),0_0_28px_rgba(34,211,238,0.24)] hover:shadow-[rgba(0,0,0,0.3)_0px_19px_38px,rgba(0,0,0,0.22)_0px_15px_12px]'
              }`}
            >
              Trang chủ
            </Link>
            <Link
              to="/history"
              className={`relative rounded-full px-4 py-2 text-sm font-semibold transition duration-200 ${
                location.pathname === '/history'
                  ? 'bg-cyan-300/16 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(34,211,238,0.16)]'
                  : 'cursor-pointer text-slate-200 hover:-translate-y-0.5 hover:bg-white/8 hover:text-cyan-300 hover:[text-shadow:0_0_6px_rgba(34,211,238,0.72),0_0_16px_rgba(34,211,238,0.42),0_0_28px_rgba(34,211,238,0.24)] hover:shadow-[rgba(0,0,0,0.3)_0px_19px_38px,rgba(0,0,0,0.22)_0px_15px_12px]'
              }`}
            >
              Lịch sử nghiên cứu
            </Link>
          </div>

          <div className="ml-2 flex min-w-37.5 items-center justify-end gap-2">
            {user ? (
              <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/6 py-1.5 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <span className="max-w-30 truncate text-sm font-semibold text-white">
                  {user.full_name}
                </span>
                <div className="h-4 w-px bg-white/15"></div>
                <button
                  onClick={handleLogout}
                  className="cursor-pointer rounded-full px-2 py-1 text-xs font-bold uppercase tracking-wider text-cyan-300 transition duration-200 hover:-translate-y-0.5 hover:bg-white/10 hover:text-cyan-300 hover:[text-shadow:0_0_6px_rgba(34,211,238,0.72),0_0_16px_rgba(34,211,238,0.42),0_0_28px_rgba(34,211,238,0.24)] hover:shadow-[rgba(0,0,0,0.3)_0px_19px_38px,rgba(0,0,0,0.22)_0px_15px_12px]"
                >
                  Thoát
                </button>
              </div>
            ) : (
              <button
                onClick={() => login()}
                className="cursor-pointer rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition duration-200 hover:-translate-y-0.5 hover:bg-cyan-300 hover:shadow-[0_14px_30px_rgba(34,211,238,0.35)]"
                >
                  Đăng nhập Google
                </button>
            )}

            {canAccessAdminUi && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsAdminMenuOpen((current) => !current)}
                  className={`inline-flex cursor-pointer items-center justify-center rounded-full border px-3 py-2 transition duration-200 ${
                    location.pathname === '/admin/dashboard' || isAdminMenuOpen
                      ? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-300 shadow-[0_0_0_1px_rgba(34,211,238,0.16)]'
                      : 'border-white/10 bg-white/6 text-slate-200 hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-white/10 hover:text-cyan-300'
                  }`}
                  aria-label="Mở menu quản trị"
                  aria-haspopup="menu"
                  aria-expanded={isAdminMenuOpen}
                >
                  <Settings size={18} />
                </button>

                {isAdminMenuOpen && (
                  <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-64 overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/98 p-2 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur">
                    <div className="border-b border-white/8 px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
                        Quản trị hệ thống
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        Lối vào khu quản trị hệ thống
                      </p>
                    </div>

                    <Link
                      to="/admin/dashboard"
                      className="mt-2 flex items-start gap-3 rounded-[18px] px-3 py-3 text-left transition hover:bg-white/8"
                    >
                      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-2 text-cyan-300">
                        <Shield size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          Admin Dashboard
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          Theo dõi token, chi phí và lịch sử gọi Gemini theo ngày.
                        </p>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
