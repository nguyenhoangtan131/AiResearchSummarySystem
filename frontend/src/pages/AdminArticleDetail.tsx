import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import AdminSidebar from '../features/admin-dashboard/components/AdminSidebar';
import type { UserTier } from '../features/admin-dashboard/types';
import AdminArticleSummary from '../features/admin-article-detail/components/AdminArticleSummary';
import AdminArticleTimeline from '../features/admin-article-detail/components/AdminArticleTimeline';
import { useAdminArticleDetail } from '../features/admin-article-detail/hooks/useAdminArticleDetail';
import { authApi } from '../services/api';
import { canShowAdminUiDuringBootstrap, hasExplicitAdminAccess } from '../utils/adminAccess';

export default function AdminArticleDetail() {
  const { articleId } = useParams();
  const [userAccess, setUserAccess] = useState<{
    canOpenAdminUi: boolean;
    hasRealAdminAccess: boolean;
  }>({
    canOpenAdminUi: false,
    hasRealAdminAccess: false,
  });
  const { articleDetail, isLoading, error } = useAdminArticleDetail(articleId);

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
        console.error('Khong doc duoc user_info:', parseError);
      }
    }

    const syncUserSession = async () => {
      try {
        const response = await authApi.getMe();
        const userInfo = response.data;
        localStorage.setItem('user_info', JSON.stringify(userInfo));
        applyUserAccess(userInfo);
      } catch (syncError) {
        console.error('Khong dong bo duoc tier user:', syncError);
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
            Ban khong co quyen vao khu admin
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Trang chi tiet article chi duoc mo khi tai khoan co <code>tier = admin</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-8">
      <div className="mx-auto flex max-w-7xl gap-6">
        <AdminSidebar currentArticleId={articleId} />

        <main className="min-w-0 flex-1 space-y-6">
          <section className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <Link
                  to="/admin/dashboard"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 transition hover:text-cyan-500"
                >
                  <ArrowLeft size={16} />
                  Dashboard Admin
                </Link>
                <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
                  Article execution detail
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                  Trang nay gom usage theo tung nhom buoc, de thay duoc buoc nao ton nhieu token va buoc nao bi goi nhieu lan nhat trong mot bai.
                </p>
              </div>

              {!userAccess.hasRealAdminAccess && (
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                  <ShieldAlert size={16} />
                  Dang dung quyen admin tam de review UI
                </div>
              )}
            </div>
          </section>

          {error && (
            <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-700">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-10 text-center text-sm italic text-slate-500 shadow-sm">
              Dang tai trang chi tiet article...
            </div>
          )}

          {!isLoading && articleDetail && (
            <>
              <AdminArticleSummary articleDetail={articleDetail} />
              <AdminArticleTimeline steps={articleDetail.executionSteps} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
