from pydantic import BaseModel
from typing import Literal, Optional


class AdminDashboardOverview(BaseModel):
    totalCalls: int
    totalInputTokens: int
    totalOutputTokens: int
    totalEstimatedCostUsd: float


class AdminDashboardUserItem(BaseModel):
    userId: str
    fullName: str
    email: str
    articleCount: int
    llmCalls: int
    totalTokens: int
    estimatedCostUsd: float


class AdminDashboardResponse(BaseModel):
    selectedDate: str
    overview: AdminDashboardOverview
    users: list[AdminDashboardUserItem]
    totalRecords: int
    page: int
    pageSize: int


class AdminUserArticleItem(BaseModel):
    articleId: str
    title: str
    createdAt: str
    llmCalls: int
    totalTokens: int
    estimatedCostUsd: float


class AdminUserDetailResponse(BaseModel):
    userId: str
    fullName: str
    email: str
    tier: str
    totalArticles: int
    totalTokens: int
    totalEstimatedCostUsd: float
    totalLlmCalls: int
    articles: list[AdminUserArticleItem]


class AdminArticleStepBreakdownItem(BaseModel):
    stepKey: str
    label: str
    callCount: int
    inputTokens: int
    outputTokens: int
    totalTokens: int
    estimatedCostUsd: float
    averageLatencySeconds: float
    modelName: str


class AdminArticleDetailResponse(BaseModel):
    articleId: str
    articleTitle: str
    status: str
    totalTokens: int
    totalEstimatedCostUsd: float
    totalLlmCalls: int
    modelLabels: list[str]
    steps: list[AdminArticleStepBreakdownItem]


class AdminManagedApiKey(BaseModel):
    id: str
    maskedValue: str
    active: bool


class AdminApiKeyGroup(BaseModel):
    provider: Literal["gemini", "serper"]
    label: str
    description: str
    activeKeyId: Optional[str] = None
    projectCode: Optional[str] = None
    keys: list[AdminManagedApiKey]


class AdminApiKeySettingsResponse(BaseModel):
    groups: list[AdminApiKeyGroup]


class AdminApiKeyTestRequest(BaseModel):
    apiKey: Optional[str] = None
    keyId: Optional[str] = None


class AdminApiKeyAddRequest(BaseModel):
    apiKey: str


class AdminApiKeyApplyRequest(BaseModel):
    keyId: str


class AdminApiKeyOperationResponse(BaseModel):
    message: str
    ok: bool
    groups: list[AdminApiKeyGroup]


class AdminGeminiModelStatus(BaseModel):
    name: str
    displayName: str
    isAvailable: bool
    active: bool
    reason: Optional[str] = None
    lastCheckedAt: Optional[str] = None


class AdminGeminiModelSettingsResponse(BaseModel):
    activeModel: str
    defaultModel: str
    models: list[AdminGeminiModelStatus]


class AdminGeminiModelApplyRequest(BaseModel):
    modelName: str


class AdminGeminiModelOperationResponse(BaseModel):
    message: str
    ok: bool
    activeModel: str
    defaultModel: str
    models: list[AdminGeminiModelStatus]


class AdminReportTypeItem(BaseModel):
    id: str
    name: str
    sortOrder: int


class AdminReportTypeListResponse(BaseModel):
    reportTypes: list[AdminReportTypeItem]


class AdminReportTypeCreateRequest(BaseModel):
    name: str
    sortOrder: Optional[int] = None


class AdminReportTypeUpdateRequest(BaseModel):
    name: str
    sortOrder: Optional[int] = None


class AdminReportTypeOperationResponse(BaseModel):
    message: str
    ok: bool
    reportTypes: list[AdminReportTypeItem]


class AdminPingPongStatusResponse(BaseModel):
    active: bool
    url: Optional[str] = None


class AdminPingPongToggleRequest(BaseModel):
    active: bool
    url: Optional[str] = None


class AdminPingPongToggleResponse(BaseModel):
    message: str
    ok: bool
    active: bool
    url: Optional[str] = None

