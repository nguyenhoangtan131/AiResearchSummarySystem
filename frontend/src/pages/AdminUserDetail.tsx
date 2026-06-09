import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import AdminSidebar from '../features/admin-dashboard/components/AdminSidebar';
import type { UserTier } from '../features/admin-dashboard/types';
import AdminUserArticlesTable from '../features/admin-user-detail/components/AdminUserArticlesTable';
import AdminUserHeroCard from '../features/admin-user-detail/components/AdminUserHeroCard';
import { useAdminUserDetail } from '../features/admin-user-detail/hooks/useAdminUserDetail';
import { authApi } from '../services/api';
import { canShowAdminUiDuringBootstrap, hasExplicitAdminAccess } from '../utils/adminAccess';

export default function AdminUserDetail() {
  const { userId } = useParams();
  const [userAccess, setUserAccess] = useState<{
    canOpenAdminUi: boolean;
    hasRealAdminAccess: boolean;
  }>({
    canOpenAdminUi: false,
    hasRealAdminAccess: false,
  });
  const { userDetail, filteredArticles, isLoading, error, searchValue, setSearchValue } =
    useAdminUserDetail(userId);

  useEffect(() => {
    let active = true;

    const applyUserAccess = (user: { tier?: UserTier } | null) => {
      if (!active) {
        return;
      }

      setUserAccess({
        canOpenAdminUi: canShowAdminUiDuringBootstrap(user),
        hasRealAdminAccess: hasExplicitAdminAccess(user),
      });
    };

    const savedUser = localStorage.getItem('user_info');
    if (savedUser) {
      try {
        applyUserAccess(JSON.parse(savedUser) as { tier?: UserTier });
      } catch (parseError) {
        console.error('Không đọc được user_info:', parseError);
      }
    }

    const syncUserSession = async () => {
      try {
        const response = await authApi.getMe();
        const userInfo = response.data;
        localStorage.setItem('user_info', JSON.stringify(userInfo));
        applyUserAccess(userInfo);
      } catch (syncError) {
        console.error('Không đồng bộ được tier user:', syncError);
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
        <div className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
            Yêu cầu quyền admin
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            Bạn chưa có quyền mở hồ sơ người dùng
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Trang này chỉ dành cho tài khoản có quyền <code>admin</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.12),_transparent_26%),linear-gradient(180deg,_#f8fafc_0%,_#eef3f8_100%)] px-4 py-7">
      <div className="mx-auto flex max-w-[1280px] gap-6">
        <AdminSidebar currentUserId={userId} />

        <main className="min-w-0 flex-1 space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <Link
                  to="/admin/dashboard"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 transition hover:text-cyan-500"
                >
                  <ArrowLeft size={16} />
                  Quay lại bảng điều khiển
                </Link>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                  Hồ sơ usage người dùng
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                  Xem tổng token, lượt gọi model và từng bài nghiên cứu đã phát sinh chi phí của người dùng này.
                </p>
              </div>

              {!userAccess.hasRealAdminAccess && (
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                  <ShieldAlert size={16} />
                  Quyền xem tạm thời
                </div>
              )}
            </div>
          </section>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-700">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center text-sm italic text-slate-500 shadow-sm">
              Đang tải hồ sơ người dùng...
            </div>
          )}

          {!isLoading && userDetail && (
            <>
              <AdminUserHeroCard userDetail={userDetail} />
              <AdminUserArticlesTable
                articles={filteredArticles}
                totalArticles={userDetail.totalArticles}
                searchValue={searchValue}
                onSearchChange={setSearchValue}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
