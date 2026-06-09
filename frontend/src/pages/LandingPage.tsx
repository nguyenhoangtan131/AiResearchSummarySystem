import { ArrowRight, BookOpenText, CheckCircle2, FileText, PenLine, SearchCheck, ShieldCheck, Sparkles } from 'lucide-react';
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
];

const templatePreviewImages = [
  {
    title: 'Mẫu báo cáo học thuật có cấu trúc rõ ràng',
    src: template1Image,
    wrapperClassName: 'lg:translate-x-20 lg:translate-y-14 lg:-rotate-[6deg] lg:origin-bottom-right lg:z-0',
  },
  {
    title: 'Mẫu bài nghiên cứu hoàn chỉnh',
    src: template2Image,
    wrapperClassName: 'lg:z-10 lg:scale-[1.18]',
  },
  {
    title: 'Mẫu tổng hợp nguồn và nội dung chương',
    src: template3Image,
    wrapperClassName: 'lg:-translate-x-20 lg:translate-y-14 lg:rotate-[6deg] lg:origin-bottom-left lg:z-0',
  },
];

const processSteps = [
  {
    step: '01',
    title: 'Thiết lập đề tài',
    description: 'Nhập chủ đề, chọn loại bài và để hệ thống dựng khung chương đầu tiên thay vì bắt đầu bằng một prompt rời rạc.',
    icon: FileText,
  },
  {
    step: '02',
    title: 'Duyệt blueprint từng chương',
    description: 'AI đề xuất mục tiêu chương, hướng mở đầu, điểm kết và dòng chảy lập luận để bạn chọn trước khi viết.',
    icon: Sparkles,
  },
  {
    step: '03',
    title: 'Chốt nội dung đầu vào',
    description: 'Bạn có thể sửa tiêu đề, tóm tắt, hướng dẫn viết và nguồn tham khảo để AI chỉ viết theo dữ liệu đã xác nhận.',
    icon: PenLine,
  },
  {
    step: '04',
    title: 'Sinh bài và theo dõi usage',
    description: 'Hệ thống sinh bài hoàn chỉnh, lưu lại token, số lần gọi model và chi phí theo từng bước để dễ kiểm soát.',
    icon: BookOpenText,
  },
];

const featureCards = [
  {
    title: 'Không viết one-shot',
    description: 'Bài nghiên cứu được chia thành các quyết định nhỏ: bố cục, tiêu đề chương, brief, guide, source và nội dung cuối.',
    icon: ShieldCheck,
  },
  {
    title: 'Có nguồn trước khi viết',
    description: 'Hệ thống hỗ trợ tìm nguồn học thuật theo từng chương, giúp nội dung sinh ra bám vào dữ liệu tham khảo cụ thể.',
    icon: SearchCheck,
  },
  {
    title: 'Cho phép chỉnh tay sâu',
    description: 'Người dùng có thể ghi đè đề xuất AI, nhập lý do lựa chọn và buộc hệ thống dùng phiên bản đã chốt.',
    icon: PenLine,
  },
  {
    title: 'Phù hợp vận hành thật',
    description: 'Admin dashboard đã có nền tảng theo dõi usage theo ngày, người dùng, bài viết và từng nhóm thao tác.',
    icon: CheckCircle2,
  },
];

const heroStats = [
  'Blueprint trước khi viết',
  'Nguồn theo từng chương',
  'Theo dõi token và chi phí',
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
    <div className="min-h-screen bg-[#060914] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#060914]/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex cursor-pointer items-center gap-3 rounded-full border border-white/10 bg-white/6 px-4 py-2 transition hover:border-cyan-300/40 hover:bg-white/10"
          >
            <BookOpenText size={20} className="text-cyan-300" />
            <span className="text-lg font-bold tracking-tight text-white">AI RESEARCH</span>
          </button>

          <nav className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/6 p-1 md:flex">
            {landingSections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => handleScrollToSection(section.id)}
                className="cursor-pointer rounded-full px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-cyan-200"
              >
                {section.label}
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={handleGetStarted}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 shadow-[0_18px_42px_rgba(34,211,238,0.26)] transition hover:-translate-y-0.5 hover:bg-cyan-200"
          >
            {isLoggingIn ? 'Đang mở Google...' : 'Bắt đầu'}
            <ArrowRight size={16} />
          </button>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden border-b border-white/10">
          <img
            src={template1Image}
            alt="Mẫu bài nghiên cứu được tạo bởi AI Research"
            className="absolute inset-y-0 right-0 -z-20 hidden h-full w-[58%] object-cover object-top opacity-42 lg:block"
          />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,_#060914_0%,_rgba(6,9,20,0.96)_36%,_rgba(6,9,20,0.76)_64%,_rgba(6,9,20,0.94)_100%)]" />
          <div className="mx-auto grid min-h-[calc(100vh-76px)] max-w-7xl content-center gap-10 px-5 py-20 lg:grid-cols-[1.02fr_0.78fr] lg:py-24">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-cyan-300/28 bg-cyan-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-cyan-100">
                Hệ thống viết bài nghiên cứu có kiểm soát
              </span>

              <h1 className="mt-8 text-5xl font-black leading-[1.05] text-white md:text-7xl">
                Tạo bài nghiên cứu theo từng bước, không viết may rủi.
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-200 md:text-xl">
                Duyệt bố cục, chỉnh từng chương, chọn nguồn tham khảo rồi mới sinh nội dung. AI Research giúp bạn giữ
                tốc độ của AI nhưng vẫn kiểm soát được logic học thuật và chất lượng đầu ra.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={handleGetStarted}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-cyan-300 px-7 py-4 text-base font-bold text-slate-950 shadow-[0_22px_52px_rgba(34,211,238,0.3)] transition hover:-translate-y-0.5 hover:bg-cyan-200"
                >
                  {isLoggingIn ? 'Đang mở Google...' : 'Bắt đầu với Google'}
                  <ArrowRight size={18} />
                </button>

                <button
                  type="button"
                  onClick={() => handleScrollToSection('san-pham-mau')}
                  className="cursor-pointer rounded-full border border-white/14 bg-white/7 px-7 py-4 text-base font-semibold text-white transition hover:border-cyan-300/40 hover:bg-white/12"
                >
                  Xem mẫu đầu ra
                </button>
              </div>

              <div className="mt-10 flex flex-wrap gap-3">
                {heroStats.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/7 px-4 py-2 text-sm font-semibold text-slate-200"
                  >
                    <CheckCircle2 size={15} className="text-cyan-300" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="self-end lg:justify-self-end">
              <div className="max-w-md border-l border-cyan-300/35 bg-slate-950/72 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.42)] backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">Quy trình chính</p>
                <p className="mt-3 text-2xl font-black text-white">Setup, Chapters, Result</p>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Mỗi bài đi qua các lớp kiểm soát rõ ràng: chọn khung, chốt chương, chọn nguồn và sinh bản cuối.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="quy-trinh" className="mx-auto max-w-7xl px-5 py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-300">Quy trình 4 bước</p>
            <h2 className="mt-4 text-4xl font-black leading-tight text-white md:text-5xl">
              Tách bài nghiên cứu thành các quyết định dễ kiểm soát.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Thay vì để AI viết một lần rồi sửa lại từ đầu, hệ thống buộc nội dung đi qua các điểm duyệt quan trọng.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2">
            {processSteps.map((step) => {
              const Icon = step.icon;

              return (
                <article
                  key={step.step}
                  className="group border border-white/10 bg-white/[0.055] p-7 shadow-[0_18px_50px_rgba(2,6,23,0.24)] transition hover:-translate-y-1 hover:border-cyan-300/28 hover:bg-white/[0.075]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">Bước {step.step}</p>
                      <h3 className="mt-3 text-2xl font-bold text-white">{step.title}</h3>
                    </div>
                    <div className="border border-cyan-300/22 bg-cyan-300/10 p-3 text-cyan-300 transition group-hover:bg-cyan-300 group-hover:text-slate-950">
                      <Icon size={22} />
                    </div>
                  </div>
                  <p className="mt-5 text-base leading-7 text-slate-300">{step.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="loi-ich" className="border-y border-white/10 bg-white/[0.035] py-24">
          <div className="mx-auto max-w-7xl px-5">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-300">Giá trị nổi bật</p>
                <h2 className="mt-4 text-4xl font-black leading-tight text-white md:text-5xl">
                  Đủ nhanh cho MVP, đủ chặt để dùng thật.
                </h2>
              </div>
              <p className="text-lg leading-8 text-slate-300">
                Trọng tâm của sản phẩm là kiểm soát chất lượng sinh nội dung: người dùng luôn biết AI đang viết dựa trên
                phần nào, nguồn nào và quyết định nào đã được chốt.
              </p>
            </div>

            <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {featureCards.map((card) => {
                const Icon = card.icon;

                return (
                  <article
                    key={card.title}
                    className="border border-white/10 bg-slate-950/64 p-6 shadow-[0_18px_44px_rgba(2,6,23,0.22)]"
                  >
                    <Icon size={24} className="text-cyan-300" />
                    <h3 className="mt-5 text-xl font-bold text-white">{card.title}</h3>
                    <p className="mt-4 text-sm leading-7 text-slate-300">{card.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="san-pham-mau" className="mx-auto max-w-7xl px-5 py-24">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-300">Sản phẩm mẫu</p>
              <h2 className="mt-4 text-4xl font-black leading-tight text-white md:text-5xl">
                Bản cuối có cấu trúc như một bài nghiên cứu hoàn chỉnh.
              </h2>
            </div>
            <button
              type="button"
              onClick={handleGetStarted}
              className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-300/10 px-6 py-3 text-sm font-bold text-cyan-100 transition hover:-translate-y-0.5 hover:bg-cyan-300 hover:text-slate-950"
            >
              {isLoggingIn ? 'Đang mở Google...' : 'Tạo bài mới'}
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="mt-16 grid gap-6 lg:grid-cols-3 lg:items-end">
            {templatePreviewImages.map((template) => (
              <article
                key={template.title}
                className={`group relative transition duration-300 hover:-translate-y-1 ${template.wrapperClassName ?? ''}`}
              >
                <div className="overflow-hidden border border-white/12 bg-white shadow-[0_40px_90px_rgba(2,6,23,0.34)]">
                  <img
                    src={template.src}
                    alt={template.title}
                    className="h-[680px] w-full object-cover object-top md:h-[760px]"
                  />
                </div>
                <p className="mt-4 text-center text-sm font-semibold text-slate-300">{template.title}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-white/10 bg-[#08101d] py-20">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-300">Sẵn sàng bắt đầu</p>
              <h2 className="mt-4 text-3xl font-black leading-tight text-white md:text-5xl">
                Vào hệ thống và tạo bài nghiên cứu đầu tiên.
              </h2>
              <p className="mt-5 text-base leading-7 text-slate-300">
                Đăng nhập bằng Google để vào workspace, tiếp tục bài cũ hoặc tạo một flow nghiên cứu mới.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGetStarted}
              className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-full bg-white px-7 py-4 text-base font-bold text-slate-950 shadow-[0_22px_52px_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5 hover:bg-cyan-200"
            >
              {isLoggingIn ? 'Đang mở Google...' : 'Bắt đầu với Google'}
              <ArrowRight size={18} />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
