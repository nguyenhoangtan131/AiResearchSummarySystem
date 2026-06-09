import { ArrowRight, BookOpenText, FileText, SearchCheck, Sparkles } from 'lucide-react';
import axios from 'axios';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { authApi } from '../services/api';
import type { AppUser } from '../utils/session';
import template1Image from '../assets/imgs/template_1.png';
import template2Image from '../assets/imgs/template_2.png';
import template3Image from '../assets/imgs/template_3.png';

interface LandingPageProps {
  onAuthenticated: (user: AppUser) => void;
}

const landingSections = [
  { id: 'quy-trinh', label: 'Quy trình' },
  { id: 'loi-ich', label: 'Lợi ích' },
  { id: 'san-pham-mau', label: 'Sản phẩm mẫu' },
  { id: 'tai-nguyen', label: 'Tài nguyên' },
];

const templatePreviewImages = [
  {
    title: 'Template 1',
    src: template1Image,
    wrapperClassName: 'lg:translate-x-24 lg:translate-y-18 lg:-rotate-[8deg] lg:origin-bottom-right lg:z-0',
  },
  {
    title: 'Template 2',
    src: template2Image,
    wrapperClassName: 'lg:z-10 lg:scale-[1.22]',
  },
  {
    title: 'Template 3',
    src: template3Image,
    wrapperClassName: 'lg:-translate-x-24 lg:translate-y-18 lg:rotate-[8deg] lg:origin-bottom-left lg:z-0',
  },
];

const heroPdfSampleImage = template1Image;

const processSteps = [
  {
    step: '01',
    title: 'Chọn đề tài và loại bài',
    description: 'Người dùng nhập chủ đề nghiên cứu, chọn loại báo cáo và bắt đầu bằng một khung làm việc rõ ràng thay vì prompt rời rạc.',
    icon: FileText,
  },
  {
    step: '02',
    title: 'AI gợi ý bố cục theo từng chương',
    description: 'Hệ thống đề xuất blueprint gồm mục tiêu chương, dòng chảy nội dung và cấu trúc nghiên cứu để bạn duyệt trước.',
    icon: Sparkles,
  },
  {
    step: '03',
    title: 'Chỉnh tiêu đề, tóm tắt, định hướng và nguồn',
    description: 'Bạn có thể sửa tay từng bước, nhập lý do lựa chọn và chốt dữ liệu thật trước khi generate nội dung.',
    icon: SearchCheck,
  },
  {
    step: '04',
    title: 'Sinh bài hoàn chỉnh có kiểm soát',
    description: 'AI chỉ viết dựa trên các giá trị đã xác nhận, giúp bài nghiên cứu nhất quán, bớt ảo giác và dễ truy vết hơn.',
    icon: BookOpenText,
  },
];

const featureCards = [
  {
    title: 'Quy trình có kiểm soát',
    description: 'Không one-shot. Mọi chương đều đi qua các bước: blueprint, title, brief, guide, source, writing.',
  },
  {
    title: 'Nguồn học thuật đi kèm',
    description: 'Hệ thống hỗ trợ tạo truy vấn học thuật và chọn nguồn tham khảo trước khi viết, thay vì thêm citation sau.',
  },
  {
    title: 'Cho phép chỉnh tay sâu',
    description: 'Người dùng có thể ghi đè AI, sửa trực tiếp nội dung từng block và buộc hệ thống dùng giá trị đã chốt.',
  },
  {
    title: 'Theo dõi token và chi phí',
    description: 'Admin dashboard xem được usage theo ngày, theo user, theo article và theo từng nhóm bước xử lý.',
  },
];

const resourceCards = [
  {
    title: 'Ảnh mẫu hero đã nối sẵn',
    description: 'Hero hiện đang dùng tạm template_1.png để phần landing page có ảnh ngay lúc này.',
    helper: 'Khi bạn thêm hero_pdf_sample.png, mình sẽ đổi hero sang file đó ngay.',
  },
  {
    title: 'PDF mẫu đầu ra',
    description: 'Dùng để gắn một bài PDF hoàn chỉnh mẫu cho người dùng bấm xem chất lượng đầu ra nghiên cứu.',
    helper: 'Khi bạn có file thật, chỉ cần thay link nút này sang PDF của bạn.',
  },
];

export default function LandingPage({ onAuthenticated }: LandingPageProps) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const navigate = useNavigate();

  const handleLoginSuccess = async (codeResponse: { access_token: string }) => {
    setIsLoggingIn(true);

    try {
      const response = await authApi.loginWithGoogle(codeResponse.access_token);
      const userInfo = (response.data.user || response.data) as AppUser;
      onAuthenticated(userInfo);

      try {
        const meResponse = await authApi.getMe();
        onAuthenticated(meResponse.data as AppUser);
      } catch (syncError) {
        if (!axios.isAxiosError(syncError) || syncError.code !== 'ERR_NETWORK') {
          console.error('Đăng nhập xong nhưng chưa đồng bộ được hồ sơ phiên:', syncError);
        }
      }

      navigate('/home', { replace: true });
    } catch (error) {
      console.error('Lỗi đăng nhập:', error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const login = useGoogleLogin({
    onSuccess: handleLoginSuccess,
    onError: () => {
      setIsLoggingIn(false);
      console.error('Login Failed');
    },
  });

  const handleScrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleGetStarted = () => {
    if (isLoggingIn) {
      return;
    }

    setIsLoggingIn(true);
    login();
  };

  return (
    <div className="min-h-screen bg-[#060b18] text-white">
      <div className="absolute inset-x-0 top-0 -z-0 h-[720px] bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.15),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(244,114,182,0.18),_transparent_30%),linear-gradient(180deg,_#0b1326_0%,_#060b18_64%)]" />

      <header className="sticky top-0 z-40 border-b border-white/8 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 transition hover:border-cyan-300/35 hover:bg-white/10"
          >
            <span className="text-lg">🔬</span>
            <span className="text-xl font-bold tracking-tight text-white">AI RESEARCH</span>
          </button>

          <nav className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 md:flex">
            {landingSections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => handleScrollToSection(section.id)}
                className="rounded-full px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-cyan-300"
              >
                {section.label}
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={handleGetStarted}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 via-pink-500 to-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-[0_18px_40px_rgba(236,72,153,0.3)] transition hover:-translate-y-0.5"
          >
            {isLoggingIn ? 'Đang mở Google...' : 'Get Started'}
            <ArrowRight size={16} />
          </button>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto flex max-w-7xl flex-col gap-12 px-6 pb-24 pt-20 lg:flex-row lg:items-center lg:pb-32 lg:pt-24">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
              He thong viet bai nghien cuu bang AI co kiem soat
            </span>

            <h1 className="mt-8 text-5xl font-black leading-tight text-white md:text-7xl">
              Tao bai nghien cuu
              <span className="block bg-gradient-to-r from-fuchsia-400 via-pink-300 to-cyan-300 bg-clip-text text-transparent">
                theo tung buoc
              </span>
              thay vi prompt mot lan roi cho may man
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
              Nguoi dung duyet blueprint, sua tieu de, tom tat, dinh huong viet va nguon trich dan truoc khi AI sinh
              noi dung. Ban van co toc do cua AI, nhung giu duoc quyen kiem soat chat luong hoc thuat.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handleGetStarted}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 via-pink-500 to-cyan-400 px-7 py-4 text-base font-bold text-slate-950 shadow-[0_20px_46px_rgba(236,72,153,0.28)] transition hover:-translate-y-0.5"
              >
                {isLoggingIn ? 'Đang mở Google...' : 'Bắt đầu với Google'}
                <ArrowRight size={18} />
              </button>

              <button
                type="button"
                onClick={() => handleScrollToSection('quy-trinh')}
                className="rounded-full border border-white/12 bg-white/5 px-7 py-4 text-base font-semibold text-white transition hover:border-cyan-300/35 hover:bg-white/10"
              >
                Xem cách hoạt động
              </button>
            </div>

            <div className="mt-10 flex flex-wrap gap-6 text-sm text-slate-300">
              <span>Khong viet bai one-shot</span>
              <span>Co nguon tham khao</span>
              <span>Cho sua tay tung block</span>
            </div>
          </div>

          <div className="flex-1">
            <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/5 p-6 shadow-[0_32px_80px_rgba(2,6,23,0.45)] backdrop-blur-xl">
              <div className="overflow-hidden rounded-[28px] bg-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
                <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
                  <img
                    src={heroPdfSampleImage}
                    alt="Preview PDF mẫu của hệ thống"
                    className="h-[420px] w-full object-cover object-top"
                  />
                </div>
              </div>

              <div className="absolute -bottom-6 -left-6 hidden w-64 rounded-[28px] border border-cyan-300/20 bg-slate-950/90 p-5 shadow-[0_18px_40px_rgba(8,47,73,0.35)] md:block">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Preview flow</p>
                <p className="mt-3 text-xl font-bold text-white">Blueprint → Source → Writing</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Vung hero nay da noi san file hero_pdf_sample.png, ban chi can thay bang anh that cua san pham khi san sang.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="quy-trinh" className="mx-auto max-w-7xl px-6 py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-300">Quy trinh 4 buoc</p>
            <h2 className="mt-4 text-4xl font-black text-white md:text-5xl">Moi bai nghien cuu di theo mot flow ro rang</h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Landing page nay can noi ro diem manh khac biet cua san pham: AI khong viet bua, ma ho tro ban ra quyet
              dinh tung lop de dua bai di dung huong.
            </p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            {processSteps.map((step) => {
              const Icon = step.icon;

              return (
                <article
                  key={step.step}
                  className="rounded-[30px] border border-white/8 bg-white/5 p-7 shadow-[0_18px_50px_rgba(2,6,23,0.28)] backdrop-blur"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">Buoc {step.step}</p>
                      <h3 className="mt-3 text-2xl font-bold text-white">{step.title}</h3>
                    </div>
                    <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-cyan-300">
                      <Icon size={22} />
                    </div>
                  </div>
                  <p className="mt-5 text-base leading-7 text-slate-300">{step.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="loi-ich" className="border-y border-white/8 bg-white/[0.03] py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-300">Gia tri noi bat</p>
              <h2 className="mt-4 text-4xl font-black text-white md:text-5xl">3-4 ly do de nguoi dung hieu tai sao he thong nay khac</h2>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {featureCards.map((card) => (
                <article
                  key={card.title}
                  className="rounded-[28px] border border-white/8 bg-slate-950/55 p-6 shadow-[0_18px_44px_rgba(2,6,23,0.24)]"
                >
                  <h3 className="text-xl font-bold text-white">{card.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-slate-300">{card.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="san-pham-mau" className="mx-auto max-w-7xl px-6 py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-300">Sản phẩm mẫu</p>
            <h2 className="mt-4 text-4xl font-black text-white md:text-5xl">Sản phẩm mẫu</h2>
          </div>

          <div className="mt-18 grid gap-6 lg:grid-cols-3 lg:items-end">
            {templatePreviewImages.map((template) => (
              <article
                key={template.title}
                className={`group relative transition duration-300 hover:-translate-y-1 ${template.wrapperClassName ?? ''}`}
              >
                <div className="overflow-hidden rounded-[34px] bg-white shadow-[0_40px_90px_rgba(2,6,23,0.34)]">
                  <img
                    src={template.src}
                    alt={template.title}
                    className="h-[760px] w-full object-cover object-top"
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="tai-nguyen" className="border-t border-white/8 bg-white/[0.03] py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-300">Tai nguyen thay the sau</p>
              <h2 className="mt-4 text-4xl font-black text-white md:text-5xl">Cho de ban gan anh that hoac file PDF mau sau nay</h2>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              {resourceCards.map((card) => (
                <article
                  key={card.title}
                  className="rounded-[28px] border border-white/8 bg-slate-950/55 p-7 shadow-[0_18px_44px_rgba(2,6,23,0.22)]"
                >
                  <h3 className="text-2xl font-bold text-white">{card.title}</h3>
                  <p className="mt-4 text-base leading-7 text-slate-300">{card.description}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{card.helper}</p>
                  <button
                    type="button"
                    className="mt-6 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-5 py-3 text-sm font-semibold text-cyan-200"
                  >
                    Nút placeholder để bạn thay link PDF thật sau
                  </button>
                </article>
              ))}
            </div>

            <div className="mt-14 rounded-[34px] border border-white/10 bg-gradient-to-r from-fuchsia-500/16 via-slate-950 to-cyan-400/16 p-10">
              <h3 className="text-3xl font-black text-white md:text-4xl">Khi san sang, bam Get Started de vao he thong</h3>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-200">
                Luong moi la: vao landing page trước, xem san pham, bam Get Started moi mo Google login. Dang nhap xong
                se vao thang app home; logout se quay ve landing page nay.
              </p>
              <button
                type="button"
                onClick={handleGetStarted}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-4 text-base font-bold text-slate-950 transition hover:-translate-y-0.5"
              >
                {isLoggingIn ? 'Đang mở Google...' : 'Get Started'}
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
