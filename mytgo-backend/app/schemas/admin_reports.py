from pydantic import BaseModel, Field


class ReportRange(BaseModel):
    from_: str = Field(alias="from")
    to: str
    timezone: str


class ReportSummary(BaseModel):
    total_appointments: int
    total_valet_requests: int


class StatusDistributionItem(BaseModel):
    status: str
    label: str
    group: str
    count: int
    percentage: float


class ReportStatusDistribution(BaseModel):
    appointments: list[StatusDistributionItem]
    valet_requests: list[StatusDistributionItem]


class CompletedJobs(BaseModel):
    appointments: int
    valet_deliveries: int
    total: int


class RevenueFormatted(BaseModel):
    approved_quote_amount: str
    completed_amount: str
    pending_quote_amount: str
    average_completed_amount: str


class Revenue(BaseModel):
    currency: str
    approved_quote_amount_cents: int
    completed_amount_cents: int
    pending_quote_amount_cents: int
    average_completed_amount_cents: int
    formatted: RevenueFormatted


class ActiveUsersByRole(BaseModel):
    role: str
    label: str
    count: int


class Operations(BaseModel):
    active_appointments: int
    active_valet_transfers: int
    unassigned_appointments: int
    unassigned_valet_transfers: int
    appointment_cancellation_rate: float
    valet_cancellation_rate: float
    active_users_by_role: list[ActiveUsersByRole]


class ReportMeta(BaseModel):
    generated_at: str
    data_freshness: str
    notes: list[str]


class AdminReportOverview(BaseModel):
    range: ReportRange
    summary: ReportSummary
    status_distribution: ReportStatusDistribution
    completed_jobs: CompletedJobs
    revenue: Revenue
    operations: Operations
    meta: ReportMeta
