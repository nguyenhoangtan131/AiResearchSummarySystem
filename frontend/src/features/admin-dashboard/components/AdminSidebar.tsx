import { BarChart3, FileText, HelpCircle, LogOut, UserSquare2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

type Props = {
  currentUserId?: string;
  currentArticleId?: string;
};

export default function AdminSidebar({ currentUserId, currentArticleId }: Props) {
  const location = useLocation();
  const items = [
    {
      to: '/admin/dashboard',
      label: 'Tổng quan usage',
      icon: BarChart3,
      isActive: location.pathname === '/admin/dashboard',
    },
    ...(currentUserId
      ? [
          {
            to: `/admin/users/${currentUserId}`,
            label: 'Hồ sơ người dùng',
            icon: UserSquare2,
            isActive: location.pathname.startsWith('/admin/users/'),
          },
        ]
      : []),
    ...(currentArticleId
      ? [
          {
            to: `/admin/articles/${currentArticleId}`,
            label: 'Chi tiết bài viết',
            icon: FileText,
            isActive: location.pathname.startsWith('/admin/articles/'),
          },
        ]
      : []),
  ];

  return (
    <aside className="sticky top-7 hidden h-[calc(100vh-3.5rem)] w-[252px] shrink-0 flex-col rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm xl:flex">
      <div className="border-b border-slate-100 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-700">
          Admin Console
        </p>
        <p className="mt-2 text-sm text-slate-500">Theo dõi usage và chi phí AI</p>
      </div>

      <nav className="mt-6 space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.isActive;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? 'bg-slate-950 text-cyan-300 shadow-[rgba(0,0,0,0.3)_0px_12px_24px]'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2 border-t border-slate-100 pt-5">
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-500">
          <HelpCircle size={18} />
          Trung tâm hỗ trợ
        </div>
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-500">
          <LogOut size={18} />
          Đăng xuất
        </div>
      </div>
    </aside>
  );
}
