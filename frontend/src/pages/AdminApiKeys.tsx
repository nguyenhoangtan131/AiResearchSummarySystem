import { CheckCircle2, Copy, ExternalLink, KeyRound, Pencil, PlayCircle, Plus, RefreshCw, Save, ShieldAlert, Trash2, X, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import AdminSidebar from '../features/admin-dashboard/components/AdminSidebar';
import type { UserTier } from '../features/admin-dashboard/types';
import { adminApi, authApi } from '../services/api';
import { canShowAdminUiDuringBootstrap, hasExplicitAdminAccess } from '../utils/adminAccess';

type Provider = 'gemini' | 'serper';

type ManagedApiKey = {
  id: string;
  maskedValue: string;
  active: boolean;
};

type ApiKeyGroup = {
  provider: Provider;
  label: string;
  description: string;
  activeKeyId?: string | null;
  projectCode?: string | null;
  keys: ManagedApiKey[];
};

type ProviderState = Record<Provider, string>;
type ProviderBusyState = Partial<Record<Provider, string>>;
type ProviderMessageState = Partial<Record<Provider, { ok: boolean; text: string }>>;

type GeminiModelStatus = {
  name: string;
  displayName: string;
  isAvailable: boolean;
  active: boolean;
  reason?: string | null;
  lastCheckedAt?: string | null;
};

type GeminiModelSettings = {
  activeModel: string;
  defaultModel: string;
  models: GeminiModelStatus[];
};

type ReportTypeItem = {
  id: string;
  name: string;
  sortOrder: number;
};

const emptyDrafts: ProviderState = {
  gemini: '',
  serper: '',
};

const keyGuides: Record<Provider, { url: string; steps: string[] }> = {
  gemini: {
    url: 'https://aistudio.google.com/app/apikey',
    steps: [
      'Mở Google AI Studio.',
      'Vào API keys và chọn Create API key.',
      'Chọn hoặc import đúng project đã bật billing nếu cần quota cao.',
      'Nếu cần liên kết project, dùng mã dự án hiển thị trong card để đối chiếu.',
      'Sao chép key rồi dán vào ô Thêm key mới.',
    ],
  },
  serper: {
    url: 'https://serper.dev/api-key',
    steps: [
      'Mở Serper dashboard.',
      'Đăng nhập hoặc tạo tài khoản.',
      'Vào API Key trong dashboard.',
      'Sao chép key rồi dán vào ô Thêm key mới.',
    ],
  },
};

function ApiKeyGroupCard({
  group,
  draftValue,
  busyAction,
  message,
  onDraftChange,
  onTestNew,
  onAdd,
  onTestExisting,
  onApply,
}: {
  group: ApiKeyGroup;
  draftValue: string;
  busyAction?: string;
  message?: { ok: boolean; text: string };
  onDraftChange: (provider: Provider, value: string) => void;
  onTestNew: (provider: Provider) => void;
  onAdd: (provider: Provider) => void;
  onTestExisting: (provider: Provider, keyId: string) => void;
  onApply: (provider: Provider, keyId: string) => void;
}) {
  const isBusy = Boolean(busyAction);
  const guide = keyGuides[group.provider];
  const [copiedProjectCode, setCopiedProjectCode] = useState(false);

  const copyProjectCode = async () => {
    if (!group.projectCode) {
      return;
    }
    await navigator.clipboard.writeText(group.projectCode);
    setCopiedProjectCode(true);
    window.setTimeout(() => setCopiedProjectCode(false), 1500);
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">
              {group.provider === 'gemini' ? 'Gemini' : 'Serper'}
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">{group.label}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{group.description}</p>
          </div>
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
            group.activeKeyId ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {group.activeKeyId ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            {group.activeKeyId ? 'Đang có key áp dụng' : 'Chưa áp dụng key'}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-6">
        {group.keys.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            Chưa có key nào trong danh sách.
          </div>
        ) : (
          <div className="space-y-3">
            {group.keys.map((keyItem) => (
              <div
                key={keyItem.id}
                className={`flex flex-col gap-3 rounded-2xl border px-4 py-4 lg:flex-row lg:items-center lg:justify-between ${
                  keyItem.active ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div>
                  <p className="font-mono text-sm font-semibold text-slate-900">{keyItem.maskedValue}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {keyItem.active ? 'Key đang được hệ thống sử dụng' : 'Key đã lưu trong danh sách'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onTestExisting(group.provider, keyItem.id)}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <PlayCircle size={14} />
                    Thử key
                  </button>
                  <button
                    type="button"
                    onClick={() => onApply(group.provider, keyItem.id)}
                    disabled={isBusy || keyItem.active}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition ${
                      !isBusy && !keyItem.active
                        ? 'bg-slate-950 text-white hover:-translate-y-0.5 hover:bg-slate-800'
                        : 'cursor-not-allowed bg-slate-200 text-slate-400'
                    }`}
                  >
                    <CheckCircle2 size={14} />
                    Áp dụng
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <label className="text-sm font-semibold text-slate-900">Thêm key mới</label>
          <input
            type="password"
            value={draftValue}
            onChange={(event) => onDraftChange(group.provider, event.target.value)}
            className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400"
            placeholder={`Dán ${group.label} mới`}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onTestNew(group.provider)}
              disabled={isBusy || !draftValue.trim()}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PlayCircle size={14} />
              Test key mới
            </button>
            <button
              type="button"
              onClick={() => onAdd(group.provider)}
              disabled={isBusy || !draftValue.trim()}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition ${
                !isBusy && draftValue.trim()
                  ? 'bg-slate-950 text-white hover:-translate-y-0.5 hover:bg-slate-800'
                  : 'cursor-not-allowed bg-slate-200 text-slate-400'
              }`}
            >
              <Plus size={14} />
              Test và thêm key
            </button>
          </div>
        </div>

        {message && (
          <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm leading-6 ${
            message.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}>
            {message.ok ? (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            ) : (
              <XCircle size={18} className="mt-0.5 shrink-0" />
            )}
            <div>
              <p className="font-semibold">{message.ok ? 'Kiểm tra thành công' : 'Không thể sử dụng key'}</p>
              <p className="mt-0.5">{message.text}</p>
            </div>
          </div>
        )}

        {busyAction && (
          <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
            {busyAction}
          </div>
        )}

        <div className="flex flex-wrap items-end justify-between gap-3">
          {group.provider === 'gemini' ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Mã dự án</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800">
                  {group.projectCode || 'Chưa cấu hình'}
                </code>
                <button
                  type="button"
                  onClick={() => void copyProjectCode()}
                  disabled={!group.projectCode}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Copy size={13} />
                  {copiedProjectCode ? 'Đã sao chép' : 'Sao chép'}
                </button>
              </div>
            </div>
          ) : (
            <div />
          )}
          <div className="group relative">
            <a
              href={guide.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-50 hover:text-cyan-900"
            >
              Xem cách lấy
              <ExternalLink size={13} />
            </a>
            <div className="pointer-events-none absolute right-0 bottom-full z-20 mb-3 w-80 translate-y-1 rounded-2xl border border-slate-200 bg-white p-4 text-left text-xs leading-5 text-slate-600 opacity-0 shadow-[0_18px_48px_rgba(15,23,42,0.16)] transition group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
              <div className="absolute right-5 -bottom-2 h-4 w-4 rotate-45 border-r border-b border-slate-200 bg-white" />
              <p className="font-semibold text-slate-950">Cách lấy {group.label}</p>
              <ol className="mt-2 space-y-1">
                {guide.steps.map((step, index) => (
                  <li key={step}>
                    {index + 1}. {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function GeminiModelCard({
  settings,
  isBusy,
  message,
  onRefresh,
  onApply,
}: {
  settings: GeminiModelSettings | null;
  isBusy: boolean;
  message?: { ok: boolean; text: string };
  onRefresh: () => void;
  onApply: (modelName: string) => void;
}) {
  const availableModels = settings?.models.filter((model) => model.isAvailable) || [];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">
              Model
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">Quản lý Gemini model</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Kiểm tra model khả dụng theo key, project và quota hiện tại. Hệ thống chỉ cho áp dụng model đã khả dụng.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isBusy}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              !isBusy
                ? 'cursor-pointer bg-slate-950 text-white hover:-translate-y-0.5 hover:bg-slate-800'
                : 'cursor-not-allowed bg-slate-200 text-slate-400'
            }`}
          >
            <RefreshCw size={16} className={isBusy ? 'animate-spin' : ''} />
            {isBusy ? 'Đang kiểm tra...' : 'Cập nhật model'}
          </button>
        </div>
      </div>

      <div className="space-y-4 p-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
          Model mặc định: <span className="font-semibold text-slate-900">{settings?.defaultModel || 'gemini-3-flash-preview'}</span>
          <br />
          Model đang áp dụng: <span className="font-semibold text-slate-900">{settings?.activeModel || settings?.defaultModel || 'gemini-3-flash-preview'}</span>
        </div>

        {availableModels.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            Chưa có model khả dụng. Bấm Cập nhật model để kiểm tra từ Google.
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {availableModels.map((model) => (
              <div
                key={model.name}
                className={`rounded-2xl border px-4 py-4 ${
                  model.active ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-mono text-sm font-semibold text-slate-900">{model.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{model.displayName}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Khả dụng
                  </span>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">{model.reason || 'Model khả dụng với quota hiện tại.'}</p>
                <button
                  type="button"
                  onClick={() => onApply(model.name)}
                  disabled={isBusy || model.active}
                  className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition ${
                    !isBusy && !model.active
                      ? 'bg-slate-950 text-white hover:-translate-y-0.5 hover:bg-slate-800'
                      : 'cursor-not-allowed bg-slate-200 text-slate-400'
                  }`}
                >
                  <CheckCircle2 size={14} />
                  {model.active ? 'Đang áp dụng' : 'Áp dụng model'}
                </button>
              </div>
            ))}
          </div>
        )}

        {message && (
          <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm leading-6 ${
            message.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}>
            {message.ok ? (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            ) : (
              <XCircle size={18} className="mt-0.5 shrink-0" />
            )}
            <div>
              <p className="font-semibold">{message.ok ? 'Đã cập nhật model' : 'Không thể cập nhật model'}</p>
              <p className="mt-0.5">{message.text}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ReportTypeCard({
  reportTypes,
  draftName,
  editingId,
  editingName,
  busyText,
  message,
  onDraftNameChange,
  onAdd,
  onStartEdit,
  onEditingNameChange,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: {
  reportTypes: ReportTypeItem[];
  draftName: string;
  editingId: string;
  editingName: string;
  busyText?: string;
  message?: { ok: boolean; text: string };
  onDraftNameChange: (value: string) => void;
  onAdd: () => void;
  onStartEdit: (item: ReportTypeItem) => void;
  onEditingNameChange: (value: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (item: ReportTypeItem) => void;
  onDelete: (item: ReportTypeItem) => void;
}) {
  const isBusy = Boolean(busyText);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">
          Thể loại
        </p>
        <h2 className="mt-2 text-xl font-bold text-slate-950">Quản lý thể loại bài viết</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Danh sách này được dùng trực tiếp ở bước Thiết lập bài viết. Admin có thể thêm, sửa hoặc xóa trước khi người dùng tạo bố cục.
        </p>
      </div>

      <div className="space-y-4 p-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <label className="text-sm font-semibold text-slate-900">Thêm thể loại mới</label>
          <div className="mt-3 flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              value={draftName}
              onChange={(event) => onDraftNameChange(event.target.value)}
              className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400"
              placeholder="Ví dụ: Báo cáo phân tích thị trường"
            />
            <button
              type="button"
              onClick={onAdd}
              disabled={isBusy || !draftName.trim()}
              className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition ${
                !isBusy && draftName.trim()
                  ? 'bg-slate-950 text-white hover:-translate-y-0.5 hover:bg-slate-800'
                  : 'cursor-not-allowed bg-slate-200 text-slate-400'
              }`}
            >
              <Plus size={16} />
              Thêm
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="grid grid-cols-[72px_minmax(0,1fr)_150px] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <span>STT</span>
            <span>Thể loại</span>
            <span className="text-right">Thao tác</span>
          </div>
          {reportTypes.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500">Chưa có thể loại nào.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {reportTypes.map((item, index) => {
                const isEditing = editingId === item.id;
                return (
                  <div key={item.id} className="grid grid-cols-[72px_minmax(0,1fr)_150px] items-center gap-3 px-4 py-3">
                    <span className="text-sm font-semibold text-slate-500">{index + 1}</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(event) => onEditingNameChange(event.target.value)}
                        className="min-w-0 rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-cyan-400"
                      />
                    ) : (
                      <span className="min-w-0 break-words text-sm font-semibold text-slate-900">{item.name}</span>
                    )}
                    <div className="flex justify-end gap-2">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onSaveEdit(item)}
                            disabled={isBusy || !editingName.trim()}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                            aria-label="Lưu thể loại"
                          >
                            <Save size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={onCancelEdit}
                            disabled={isBusy}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:-translate-y-0.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label="Hủy sửa"
                          >
                            <X size={15} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => onStartEdit(item)}
                            disabled={isBusy}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:-translate-y-0.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label="Sửa thể loại"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(item)}
                            disabled={isBusy}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-100 bg-rose-50 text-rose-600 transition hover:-translate-y-0.5 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label="Xóa thể loại"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {message && (
          <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm leading-6 ${
            message.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}>
            {message.ok ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <XCircle size={18} className="mt-0.5 shrink-0" />}
            <p>{message.text}</p>
          </div>
        )}

        {busyText && (
          <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
            {busyText}
          </div>
        )}
      </div>
    </section>
  );
}

export default function AdminApiKeys() {
  const [userAccess, setUserAccess] = useState<{
    canOpenAdminUi: boolean;
    hasRealAdminAccess: boolean;
  }>({
    canOpenAdminUi: false,
    hasRealAdminAccess: false,
  });
  const [groups, setGroups] = useState<ApiKeyGroup[]>([]);
  const [drafts, setDrafts] = useState<ProviderState>(emptyDrafts);
  const [busy, setBusy] = useState<ProviderBusyState>({});
  const [messages, setMessages] = useState<ProviderMessageState>({});
  const [modelSettings, setModelSettings] = useState<GeminiModelSettings | null>(null);
  const [isModelBusy, setIsModelBusy] = useState(false);
  const [modelMessage, setModelMessage] = useState<{ ok: boolean; text: string } | undefined>();
  const [reportTypes, setReportTypes] = useState<ReportTypeItem[]>([]);
  const [reportTypeDraft, setReportTypeDraft] = useState('');
  const [editingReportTypeId, setEditingReportTypeId] = useState('');
  const [editingReportTypeName, setEditingReportTypeName] = useState('');
  const [reportTypeBusy, setReportTypeBusy] = useState('');
  const [reportTypeMessage, setReportTypeMessage] = useState<{ ok: boolean; text: string } | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');

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
    } else {
      applyUserAccess(null);
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

  useEffect(() => {
    if (!userAccess.canOpenAdminUi) {
      setIsLoading(false);
      return;
    }

    let active = true;
    const loadKeys = async () => {
      setIsLoading(true);
      setPageError('');
      try {
        const [{ data }, modelResponse, reportTypeResponse] = await Promise.all([
          adminApi.getApiKeys(),
          adminApi.getGeminiModels(),
          adminApi.getReportTypes(),
        ]);
        if (active) {
          setGroups(Array.isArray(data.groups) ? data.groups : []);
          setModelSettings(modelResponse.data);
          setReportTypes(Array.isArray(reportTypeResponse.data.reportTypes) ? reportTypeResponse.data.reportTypes : []);
        }
      } catch (loadError: any) {
        if (active) {
          setPageError(loadError?.response?.data?.detail || 'Không tải được danh sách API key.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadKeys();

    return () => {
      active = false;
    };
  }, [userAccess.canOpenAdminUi]);

  const updateDraft = (provider: Provider, value: string) => {
    setDrafts((current) => ({ ...current, [provider]: value }));
  };

  const setProviderBusy = (provider: Provider, text: string) => {
    setBusy((current) => ({ ...current, [provider]: text }));
  };

  const clearProviderBusy = (provider: Provider) => {
    setBusy((current) => {
      const next = { ...current };
      delete next[provider];
      return next;
    });
  };

  const setProviderMessage = (provider: Provider, ok: boolean, text: string) => {
    setMessages((current) => ({ ...current, [provider]: { ok, text } }));
  };

  const applyResponse = (provider: Provider, data: any) => {
    setGroups(Array.isArray(data.groups) ? data.groups : []);
    setProviderMessage(provider, Boolean(data.ok), data.message || (data.ok ? 'Thành công.' : 'Thao tác thất bại.'));
  };

  const testNewKey = async (provider: Provider) => {
    const apiKey = drafts[provider].trim();
    if (!apiKey) {
      setProviderMessage(provider, false, 'Hãy nhập key trước khi test.');
      return;
    }

    setProviderBusy(provider, 'Đang test key mới...');
    try {
      const { data } = await adminApi.testApiKey(provider, { apiKey });
      applyResponse(provider, data);
    } catch (error: any) {
      setProviderMessage(provider, false, error?.response?.data?.detail || 'Key không hợp lệ.');
    } finally {
      clearProviderBusy(provider);
    }
  };

  const addKey = async (provider: Provider) => {
    const apiKey = drafts[provider].trim();
    if (!apiKey) {
      setProviderMessage(provider, false, 'Hãy nhập key trước khi thêm.');
      return;
    }

    setProviderBusy(provider, 'Đang test và thêm key...');
    try {
      const { data } = await adminApi.addApiKey(provider, { apiKey });
      applyResponse(provider, data);
      if (data.ok) {
        setDrafts((current) => ({ ...current, [provider]: '' }));
      }
    } catch (error: any) {
      setProviderMessage(provider, false, error?.response?.data?.detail || 'Key không hợp lệ.');
    } finally {
      clearProviderBusy(provider);
    }
  };

  const testExistingKey = async (provider: Provider, keyId: string) => {
    setProviderBusy(provider, 'Đang thử key đã lưu...');
    try {
      const { data } = await adminApi.testApiKey(provider, { keyId });
      applyResponse(provider, data);
    } catch (error: any) {
      setProviderMessage(provider, false, error?.response?.data?.detail || 'Key không hợp lệ.');
    } finally {
      clearProviderBusy(provider);
    }
  };

  const applyKey = async (provider: Provider, keyId: string) => {
    setProviderBusy(provider, 'Đang test và áp dụng key...');
    try {
      const { data } = await adminApi.applyApiKey(provider, { keyId });
      applyResponse(provider, data);
    } catch (error: any) {
      setProviderMessage(provider, false, error?.response?.data?.detail || 'Key không hợp lệ.');
    } finally {
      clearProviderBusy(provider);
    }
  };

  const refreshModels = async () => {
    setIsModelBusy(true);
    setModelMessage(undefined);
    try {
      const { data } = await adminApi.refreshGeminiModels();
      setModelSettings({
        activeModel: data.activeModel,
        defaultModel: data.defaultModel,
        models: Array.isArray(data.models) ? data.models : [],
      });
      setModelMessage({ ok: Boolean(data.ok), text: data.message || 'Đã cập nhật danh sách model.' });
    } catch (error: any) {
      setModelMessage({ ok: false, text: error?.response?.data?.detail || 'Không thể cập nhật model.' });
    } finally {
      setIsModelBusy(false);
    }
  };

  const applyModel = async (modelName: string) => {
    setIsModelBusy(true);
    setModelMessage(undefined);
    try {
      const { data } = await adminApi.applyGeminiModel({ modelName });
      setModelSettings({
        activeModel: data.activeModel,
        defaultModel: data.defaultModel,
        models: Array.isArray(data.models) ? data.models : [],
      });
      setModelMessage({ ok: Boolean(data.ok), text: data.message || 'Đã áp dụng model.' });
    } catch (error: any) {
      setModelMessage({ ok: false, text: error?.response?.data?.detail || 'Không thể áp dụng model.' });
    } finally {
      setIsModelBusy(false);
    }
  };

  const applyReportTypeResponse = (data: any) => {
    setReportTypes(Array.isArray(data.reportTypes) ? data.reportTypes : []);
    setReportTypeMessage({ ok: Boolean(data.ok), text: data.message || 'Đã cập nhật danh sách thể loại.' });
  };

  const addReportType = async () => {
    const name = reportTypeDraft.trim();
    if (!name) {
      setReportTypeMessage({ ok: false, text: 'Hãy nhập tên thể loại trước khi thêm.' });
      return;
    }

    setReportTypeBusy('Đang thêm thể loại...');
    setReportTypeMessage(undefined);
    try {
      const { data } = await adminApi.createReportType({ name });
      applyReportTypeResponse(data);
      if (data.ok) {
        setReportTypeDraft('');
      }
    } catch (error: any) {
      setReportTypeMessage({ ok: false, text: error?.response?.data?.detail || 'Không thể thêm thể loại.' });
    } finally {
      setReportTypeBusy('');
    }
  };

  const startEditReportType = (item: ReportTypeItem) => {
    setEditingReportTypeId(item.id);
    setEditingReportTypeName(item.name);
    setReportTypeMessage(undefined);
  };

  const cancelEditReportType = () => {
    setEditingReportTypeId('');
    setEditingReportTypeName('');
  };

  const saveReportType = async (item: ReportTypeItem) => {
    const name = editingReportTypeName.trim();
    if (!name) {
      setReportTypeMessage({ ok: false, text: 'Tên thể loại không được để trống.' });
      return;
    }

    setReportTypeBusy('Đang lưu thể loại...');
    setReportTypeMessage(undefined);
    try {
      const { data } = await adminApi.updateReportType(item.id, {
        name,
        sortOrder: item.sortOrder,
      });
      applyReportTypeResponse(data);
      cancelEditReportType();
    } catch (error: any) {
      setReportTypeMessage({ ok: false, text: error?.response?.data?.detail || 'Không thể cập nhật thể loại.' });
    } finally {
      setReportTypeBusy('');
    }
  };

  const deleteReportType = async (item: ReportTypeItem) => {
    const confirmed = window.confirm(`Xóa thể loại "${item.name}" khỏi danh sách tạo bài?`);
    if (!confirmed) {
      return;
    }

    setReportTypeBusy('Đang xóa thể loại...');
    setReportTypeMessage(undefined);
    try {
      const { data } = await adminApi.deleteReportType(item.id);
      applyReportTypeResponse(data);
      if (editingReportTypeId === item.id) {
        cancelEditReportType();
      }
    } catch (error: any) {
      setReportTypeMessage({ ok: false, text: error?.response?.data?.detail || 'Không thể xóa thể loại.' });
    } finally {
      setReportTypeBusy('');
    }
  };

  if (!userAccess.canOpenAdminUi) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
            Yêu cầu quyền admin
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            Bạn chưa có quyền quản lý API key
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
        <AdminSidebar />

        <main className="min-w-0 flex-1 space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">
                  Cấu hình vận hành
                </p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                  Quản lý API key và thể loại
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                  Lưu key Gemini, Serper và điều chỉnh danh sách thể loại mà người dùng chọn khi tạo bài.
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

          {pageError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-700">
              {pageError}
            </div>
          )}

          {isLoading ? (
            <div className="rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center text-sm italic text-slate-500 shadow-sm">
              Đang tải danh sách API key...
            </div>
          ) : (
            <div className="grid gap-6">
              {groups.map((group) => (
                <ApiKeyGroupCard
                  key={group.provider}
                  group={group}
                  draftValue={drafts[group.provider]}
                  busyAction={busy[group.provider]}
                  message={messages[group.provider]}
                  onDraftChange={updateDraft}
                  onTestNew={testNewKey}
                  onAdd={addKey}
                  onTestExisting={testExistingKey}
                  onApply={applyKey}
                />
              ))}
              <ReportTypeCard
                reportTypes={reportTypes}
                draftName={reportTypeDraft}
                editingId={editingReportTypeId}
                editingName={editingReportTypeName}
                busyText={reportTypeBusy}
                message={reportTypeMessage}
                onDraftNameChange={setReportTypeDraft}
                onAdd={addReportType}
                onStartEdit={startEditReportType}
                onEditingNameChange={setEditingReportTypeName}
                onCancelEdit={cancelEditReportType}
                onSaveEdit={saveReportType}
                onDelete={deleteReportType}
              />
              <GeminiModelCard
                settings={modelSettings}
                isBusy={isModelBusy}
                message={modelMessage}
                onRefresh={refreshModels}
                onApply={applyModel}
              />
            </div>
          )}

          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-4 py-2 text-sm text-cyan-800">
            <KeyRound size={16} />
            Key chỉ được lưu hoặc áp dụng sau khi endpoint test trả về thành công.
          </div>
        </main>
      </div>
    </div>
  );
}
