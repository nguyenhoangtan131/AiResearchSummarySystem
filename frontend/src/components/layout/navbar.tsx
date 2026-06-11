import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Settings, Shield, Activity } from 'lucide-react';
import { canShowAdminUiDuringBootstrap } from '../../utils/adminAccess';
import type { AppUser } from '../../utils/session';
import { adminApi } from '../../services/api';

interface NavbarProps {
  user: AppUser;
  onLogout: () => void | Promise<void>;
}

export default function Navbar({ user, onLogout }: NavbarProps) {
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [isPingPongActive, setIsPingPongActive] = useState(false);
  const [isPingPongLoading, setIsPingPongLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const canAccessAdminUi = canShowAdminUiDuringBootstrap(user);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsAdminMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target as Node)) {
        setIsAdminMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isAdminMenuOpen && canAccessAdminUi) {
      const fetchStatus = async () => {
        try {
          const { data } = await adminApi.getPingPongStatus();
          setIsPingPongActive(Boolean(data.active));
        } catch (error) {
          console.error('Lỗi khi lấy trạng thái ping pong:', error);
        }
      };
      void fetchStatus();
    }
  }, [isAdminMenuOpen, canAccessAdminUi]);

  const handleTogglePingPong = async () => {
    setIsPingPongLoading(true);
    const nextState = !isPingPongActive;
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8010/api';
    let absoluteUrl = apiBase;
    if (apiBase.startsWith('/')) {
      absoluteUrl = window.location.origin + apiBase;
    }
    const pingUrl = `${absoluteUrl}/advanced/report-types`;

    try {
      const { data } = await adminApi.togglePingPong({
        active: nextState,
        url: pingUrl,
      });
      setIsPingPongActive(Boolean(data.active));
    } catch (error) {
      console.error('Lỗi khi bật/tắt ping pong:', error);
      alert('Không thể thay đổi trạng thái ping pong giữ server.');
    } finally {
      setIsPingPongLoading(false);
    }
  };

  return (
    <nav className="sticky top-0 z-[100] border-b border-slate-800 bg-slate-950/95 text-white shadow-[0_16px_40px_rgba(15,23,42,0.35)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div
          className="group inline-flex cursor-pointer items-center gap-1.5 md:gap-3 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 md:px-4 md:py-2 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-white/10 hover:shadow-[rgba(0,0,0,0.3)_0px_19px_38px,rgba(0,0,0,0.22)_0px_15px_12px]"
          onClick={() => navigate('/home')}
        >
          <span className="text-base md:text-lg">🔬</span>
          <span className="text-base md:text-xl font-bold tracking-tight text-white transition duration-300 group-hover:text-cyan-300 group-hover:[text-shadow:0_0_6px_rgba(34,211,238,0.72),0_0_16px_rgba(34,211,238,0.42),0_0_28px_rgba(34,211,238,0.24)]">
            AI RESEARCH
          </span>
          <span className="hidden sm:inline-block h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.9)] transition duration-300 group-hover:scale-125 group-hover:shadow-[0_0_28px_rgba(34,211,238,0.95)]" />
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 md:flex">
            <Link
              to="/home"
              className={`relative rounded-full px-4 py-2 text-sm font-semibold transition duration-200 ${
                location.pathname === '/home'
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

          <div className="ml-2 flex min-w-0 md:min-w-37.5 items-center justify-end gap-2">
            <div className="flex items-center gap-1 md:gap-3 rounded-full border border-white/10 bg-white/6 py-1 px-2.5 md:py-1.5 md:px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <span className="hidden md:inline max-w-30 truncate text-sm font-semibold text-white">
                {user.full_name}
              </span>
              <div className="hidden md:block h-4 w-px bg-white/15"></div>
              <button
                onClick={() => void onLogout()}
                className="cursor-pointer rounded-full px-2 py-1 text-xs font-bold uppercase tracking-wider text-cyan-300 transition duration-200 hover:-translate-y-0.5 hover:bg-white/10 hover:text-cyan-300 hover:[text-shadow:0_0_6px_rgba(34,211,238,0.72),0_0_16px_rgba(34,211,238,0.42),0_0_28px_rgba(34,211,238,0.24)] hover:shadow-[rgba(0,0,0,0.3)_0px_19px_38px,rgba(0,0,0,0.22)_0px_15px_12px]"
              >
                Thoát
              </button>
            </div>

            {canAccessAdminUi && (
              <div ref={adminMenuRef} className="relative z-[130]">
                <button
                  type="button"
                  onClick={() => setIsAdminMenuOpen((current) => !current)}
                  className={`inline-flex cursor-pointer items-center justify-center rounded-full border px-2.5 py-1.5 md:px-3 md:py-2 transition duration-200 ${
                    location.pathname.startsWith('/admin') || isAdminMenuOpen
                      ? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-300 shadow-[0_0_0_1px_rgba(34,211,238,0.16)]'
                      : 'border-white/10 bg-white/6 text-slate-200 hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-white/10 hover:text-cyan-300'
                  }`}
                  aria-label="Mở menu quản trị"
                  aria-haspopup="menu"
                  aria-expanded={isAdminMenuOpen}
                >
                  <Settings size={16} className="md:w-[18px] md:h-[18px]" />
                </button>

                {isAdminMenuOpen && (
                  <div className="absolute right-0 top-[calc(100%+0.75rem)] z-[140] w-64 overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/98 p-2 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur">
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

                    {/* Nút Ping-pong Giữ Server 24/7 */}
                    <div className="mt-1 border-t border-white/8 pt-2">
                      <div className="flex items-center justify-between rounded-[18px] px-3 py-2.5 transition hover:bg-white/4">
                        <div className="flex items-start gap-3">
                          <div className={`rounded-2xl border p-2 transition-colors ${
                            isPingPongActive
                              ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-300'
                              : 'border-white/10 bg-white/5 text-slate-400'
                          }`}>
                            <Activity size={16} className={isPingPongActive ? 'animate-pulse' : ''} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white">
                              Duy trì 24/7
                            </p>
                            <p className="mt-0.5 text-[9px] text-slate-400 truncate max-w-[120px]">
                              {isPingPongActive ? 'Đang tự động ping' : 'Tự động ping giữ server'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleTogglePingPong}
                          disabled={isPingPongLoading}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isPingPongActive ? 'bg-cyan-400' : 'bg-slate-700'
                          } ${isPingPongLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          aria-label="Bật/Tắt duy trì hoạt động 24/7"
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              isPingPongActive ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
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
