import { CalendarDays, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';

import AdminOverviewCards from '../features/admin-dashboard/components/AdminOverviewCards';
import AdminSidebar from '../features/admin-dashboard/components/AdminSidebar';
import AdminUsageTable from '../features/admin-dashboard/components/AdminUsageTable';
import { useAdminDashboard } from '../features/admin-dashboard/hooks/useAdminDashboard';
import { formatDashboardDate } from '../features/admin-dashboard/utils';
import type { UserTier } from '../features/admin-dashboard/types';
import { authApi } from '../services/api';
import { canShowAdminUiDuringBootstrap, hasExplicitAdminAccess } from '../utils/adminAccess';

export default function AdminDashboard() {
  const [userAccess, setUserAccess] = useState<{
    canOpenAdminUi: boolean;
    hasRealAdminAccess: boolean;
    tier: UserTier | null;
  }>({
    canOpenAdminUi: false,
    hasRealAdminAccess: false,
    tier: null,
  });
  const { selectedDate, setSelectedDate, dashboard, isLoading, error } =
    useAdminDashboard();

  useEffect(() => {
    let active = true;

    const applyUserAccess = (user: { tier?: UserTier } | null) => {
      if (!active) {
        return;
      }

      setUserAccess({
        canOpenAdminUi: canShowAdminUiDuringBootstrap(user),
        hasRealAdminAccess: hasExplicitAdminAccess(user),
        tier: user?.tier ?? null,
      });
    };

    const savedUser = localStorage.getItem('user_info');
    if (savedUser) {
      try {
        applyUserAccess(JSON.parse(savedUser) as { tier?: UserTier });
      } catch (parseError) {
        console.error('Không đọc được user_info:', parseError);
      }
    } else {
      applyUserAccess(null);
    }

    const syncUserSession = async () => {
      try {
        const response = await authApi.getMe();
        const userInfo = response.data;
        localStorage.setItem('user_info', JSON.stringify(userInfo));
        applyUserAccess(userInfo);
      } catch (error) {
        console.error('Không đồng bộ được tier user:', error);
      }
    };

    void syncUserSession();

    return () => {
      active = false;
    };
  }, []);

  if (!userAccess.canOpenAdminUi) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-amber-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
            Admin Access Required
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            Bạn không có quyền vào Dashboard Admin
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Trang này chỉ nên hiển thị khi tài khoản có <code>tier = admin</code>. Ở frontend mình đã ẩn menu với user thường và chặn mềm khi truy cập trực tiếp URL. Khi làm backend admin, các endpoint <code>/api/admin/*</code> cũng sẽ trả về <code>403 Forbidden</code> nếu tier không hợp lệ.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-8">
      <div className="mx-auto flex max-w-7xl gap-6">
        <AdminSidebar />

        <main className="min-w-0 flex-1 space-y-6">
          <section className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">
                  Dashboard Admin
                </p>
                <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
                  Quản trị hệ thống Gemini
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                  Theo dõi lượng token, số lần gọi LLM và chi phí quy đổi theo từng ngày. Cấu trúc trang này đã tách sẵn theo feature để sau đó nối API `/api/admin/*` dễ hơn.
                </p>
              </div>

              <label className="inline-flex min-w-[240px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                <CalendarDays size={18} className="text-slate-500" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="w-full border-none bg-transparent p-0 text-sm text-slate-900 outline-none focus:ring-0"
                />
              </label>
            </div>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-4 py-2 text-sm text-cyan-800">
              <ShieldAlert size={16} />
              Đang xem dữ liệu ngày {formatDashboardDate(selectedDate)}
            </div>
            {!userAccess.hasRealAdminAccess && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                Frontend đang bật quyền xem tạm thời vì backend chưa trả về <code>tier</code> trong <code>user_info</code>. Khi backend auth đã trả về tier thật, mình sẽ khóa lại đúng chuẩn chỉ cho <code>admin</code>.
              </div>
            )}
          </section>

          {error && (
            <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-700">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-10 text-center text-sm italic text-slate-500 shadow-sm">
              Đang tải dữ liệu dashboard admin...
            </div>
          )}

          {!isLoading && dashboard && (
            <>
              <AdminOverviewCards overview={dashboard.overview} />
              <AdminUsageTable
                users={dashboard.users}
                totalRecords={dashboard.totalRecords}
                selectedDate={dashboard.selectedDate}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
