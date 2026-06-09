from pydantic import BaseModel


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
