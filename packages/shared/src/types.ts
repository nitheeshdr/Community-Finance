/**
 * API response envelope and shared DTO types.
 * All amounts in DTOs are integer paise unless the field name says `Rupees`.
 */
import type {
  AuditAction,
  AuditEntity,
  CommunityStatus,
  CommunityType,
  DocumentType,
  EventCategory,
  EventFundingMode,
  EventStatus,
  ExpenseStatus,
  IncomeSource,
  NotificationType,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  SubscriptionStatus,
  UserRole,
  UserStatus,
} from './enums';

/* ------------------------------------------------------------------ */
/* Envelope                                                            */
/* ------------------------------------------------------------------ */

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export interface AuthUserDto {
  id: string;
  communityId: string;
  name: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  profileImage?: string;
  mustChangePassword: boolean;
}

export interface LoginResponseDto {
  user: AuthUserDto;
  accessToken: string;
  /** Refresh token is also set as an httpOnly cookie for web clients. */
  refreshToken: string;
  expiresIn: number;
}

export interface SessionDto {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  lastUsedAt: string;
  createdAt: string;
  current: boolean;
}

/* ------------------------------------------------------------------ */
/* Core entities                                                       */
/* ------------------------------------------------------------------ */

export interface CommunityDto {
  id: string;
  name: string;
  type: CommunityType;
  status: CommunityStatus;
  description?: string;
  address?: string;
  logo?: string;
  memberCount?: number;
  createdAt: string;
}

export interface FamilyMemberDto {
  name: string;
  relation: string;
  age?: number;
}

export interface MemberDto {
  id: string;
  communityId: string;
  name: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  address?: string;
  family: FamilyMemberDto[];
  profileImage?: string;
  /** Masked (XXXX-XXXX-1234); full value never leaves the server. */
  aadhaarMasked?: string;
  memberSince: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeeConfigDto {
  id: string;
  amount: number; // paise
  gracePeriodDays: number;
  dueDay: number;
  lateFee: number; // paise
  effectiveFrom: string;
  createdAt: string;
}

export interface PaymentDto {
  id: string;
  memberId: string;
  memberName?: string;
  type: PaymentType;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number; // paise
  period?: string;
  eventId?: string;
  eventName?: string;
  receiptNumber?: string;
  receiptUrl?: string;
  upiReference?: string;
  notes?: string;
  approvedBy?: string;
  approvedByName?: string;
  razorpayPaymentId?: string;
  paidAt?: string;
  createdAt: string;
}

export interface SubscriptionDto {
  id: string;
  memberId: string;
  memberName?: string;
  razorpaySubscriptionId: string;
  status: SubscriptionStatus;
  shortUrl?: string;
  nextChargeAt?: string;
  createdAt: string;
}

export interface EventDto {
  id: string;
  name: string;
  description?: string;
  category: EventCategory;
  status: EventStatus;
  date: string;
  endDate?: string;
  budget: number; // paise
  fundingMode: EventFundingMode;
  /** Empty array = all active members participate (SPLIT mode). */
  participantIds: string[];
  perHeadAmount: number; // paise
  /** COLLECT mode: the fixed amount assigned to each member (paise). */
  collectAmountPerMember?: number;
  collectedAmount: number; // paise
  spentAmount: number; // paise
  organizerId?: string;
  organizerName?: string;
  images: string[];
  budgetOverride: boolean;
  createdAt: string;
}

export interface EventPayLinkDto {
  paymentId: string;
  /** Razorpay hosted payment page for the member's remaining share. */
  shortUrl: string;
  amount: number; // paise
}

export interface EventSplitDto {
  id: string;
  eventId: string;
  memberId: string;
  memberName?: string;
  splitAmount: number; // paise
  paidAmount: number; // paise
  status: PaymentStatus;
  updatedAt: string;
}

export interface EventSplitHistoryDto {
  id: string;
  eventId: string;
  activeMemberCount: number;
  perHeadAmount: number; // paise
  budget: number; // paise
  trigger: string;
  createdAt: string;
}

export interface ExpenseDto {
  id: string;
  eventId: string;
  eventName?: string;
  name: string;
  category: string;
  amount: number; // paise
  vendor?: string;
  description?: string;
  paymentMode: PaymentMethod;
  status: ExpenseStatus;
  bills: string[];
  expenseDate?: string;
  createdBy: string;
  createdByName?: string;
  approvedBy?: string;
  approvedByName?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncomeDto {
  id: string;
  source: IncomeSource;
  amount: number; // paise
  method: PaymentMethod;
  donorName?: string;
  sponsorName?: string;
  description?: string;
  eventId?: string;
  eventName?: string;
  paymentId?: string;
  receivedAt: string;
  createdAt: string;
}

export interface DocumentDto {
  id: string;
  type: DocumentType;
  name: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  entity?: string;
  entityId?: string;
  uploadedBy: string;
  uploadedByName?: string;
  createdAt: string;
}

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface AuditLogDto {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  device?: string;
  browser?: string;
  os?: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Analytics / reports                                                 */
/* ------------------------------------------------------------------ */

export interface DashboardStatsDto {
  currentBalance: number; // paise
  monthlyCollection: number;
  monthlyExpenses: number;
  pendingCollection: number;
  totalMembers: number;
  activeMembers: number;
  paidMembersThisMonth: number;
  pendingMembersThisMonth: number;
  failedPaymentsThisMonth: number;
  upcomingEvents: EventDto[];
  collectionTrend: TrendPointDto[];
  expenseTrend: TrendPointDto[];
  topExpenseCategories: CategoryTotalDto[];
  monthlyComparison: PeriodComparisonDto;
  yearlyComparison: PeriodComparisonDto;
}

export interface TrendPointDto {
  period: string; // YYYY-MM or YYYY-MM-DD
  amount: number; // paise
}

export interface CategoryTotalDto {
  category: string;
  amount: number; // paise
  count: number;
}

export interface PeriodComparisonDto {
  current: number; // paise
  previous: number; // paise
  changePercent: number;
}

export interface FinancialReportDto {
  period: string;
  from: string;
  to: string;
  income: { total: number; bySource: CategoryTotalDto[] };
  expenses: { total: number; byCategory: CategoryTotalDto[] };
  openingBalance: number;
  closingBalance: number;
  collection: {
    expected: number;
    collected: number;
    pending: number;
    paidCount: number;
    pendingCount: number;
    failedCount: number;
  };
  memberStats: { total: number; active: number; inactive: number; suspended: number };
  eventStats: { total: number; active: number; closed: number; totalBudget: number };
  donations: { total: number; count: number };
  generatedAt: string;
  snapshot: boolean;
}

/* ------------------------------------------------------------------ */
/* Subscription dues                                                   */
/* ------------------------------------------------------------------ */

export type DueStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'UNPAID';

export interface MemberDueDto {
  memberId: string;
  name: string;
  phone: string;
  status: DueStatus;
  amount: number; // paise
}

export interface PeriodDuesDto {
  period: string;
  fee: number; // paise
  total: number;
  paid: number;
  unpaid: number;
  members: MemberDueDto[]; // unpaid-first
}

export interface MemberLedgerEntryDto {
  period: string; // YYYY-MM
  status: DueStatus;
  amount: number; // paise
  paidAt?: string;
  method?: string;
  receiptNumber?: string;
}

export interface MemberLedgerDto {
  memberId: string;
  name: string;
  phone: string;
  memberSince: string;
  totalPaid: number;
  paidMonths: number;
  unpaidMonths: number;
  entries: MemberLedgerEntryDto[]; // newest first
}

export interface GlobalSearchResultDto {
  members: Array<{ id: string; name: string; phone: string }>;
  events: Array<{ id: string; name: string; date: string }>;
  expenses: Array<{ id: string; name: string; amount: number }>;
  payments: Array<{ id: string; receiptNumber?: string; amount: number; memberName?: string }>;
  documents: Array<{ id: string; name: string; url: string }>;
}
