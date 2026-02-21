// src/components/layout/navbar.tsx
export const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-8">
        {/* Logo Section */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white">A</div>
          <span className="text-xl font-bold tracking-tight text-slate-900">ARSS</span>
        </div>

        {/* Menu Section - Ẩn trên mobile bằng 'hidden' */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Dự án</a>
          <a href="#" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Lịch sử</a>
          <a href="#" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Tài liệu</a>
        </div>

        {/* Action Button */}
        <button className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-all active:scale-95">
          Bắt đầu ngay
        </button>
      </div>
    </nav>
  );
};