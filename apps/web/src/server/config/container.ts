/**
 * Lightweight dependency-injection container. Singletons are lazily
 * constructed and cached in module scope (safe: Vercel reuses module scope
 * across warm invocations, and everything here is stateless).
 *
 * Tests replace dependencies by constructing services directly with mocks —
 * every service takes its collaborators via constructor.
 */
import { EventRepository } from '../repositories/event.repository';
import { EventSplitRepository } from '../repositories/event-split.repository';
import { FeeConfigRepository } from '../repositories/fee-config.repository';
import { IncomeRepository } from '../repositories/income.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { RazorpaySubscriptionRepository } from '../repositories/razorpay-subscription.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { UserRepository } from '../repositories/user.repository';
import { AuditService } from '../services/audit.service';
import { AuthService } from '../services/auth.service';
import { BalanceService } from '../services/balance.service';
import { BudgetSplitService } from '../services/budget-split.service';
import { CronService } from '../services/cron.service';
import { DashboardService } from '../services/dashboard.service';
import { DuesService } from '../services/dues.service';
import { DocumentRepository, DocumentService } from '../services/document.service';
import { EventService } from '../services/event.service';
import { ExpenseRepository, ExpenseService } from '../services/expense.service';
import { ExportService } from '../services/export.service';
import { IncomeService } from '../services/income.service';
import { ReportService } from '../services/report.service';
import { SearchService } from '../services/search.service';
import { SettingsService } from '../services/settings.service';
import { MemberService } from '../services/member.service';
import { NotificationService } from '../services/notification.service';
import { PaymentService } from '../services/payment.service';
import { RealtimeService } from '../services/realtime.service';
import { SubscriptionService } from '../services/subscription.service';
import { WebhookService } from '../services/webhook.service';

type Factory<T> = () => T;

class Container {
  private readonly instances = new Map<string, unknown>();

  resolve<T>(key: string, factory: Factory<T>): T {
    if (!this.instances.has(key)) {
      this.instances.set(key, factory());
    }
    return this.instances.get(key) as T;
  }
}

const container = new Container();

/* Repositories */
export const getUserRepository = () =>
  container.resolve('UserRepository', () => new UserRepository());
export const getRefreshTokenRepository = () =>
  container.resolve('RefreshTokenRepository', () => new RefreshTokenRepository());
export const getPaymentRepository = () =>
  container.resolve('PaymentRepository', () => new PaymentRepository());
export const getFeeConfigRepository = () =>
  container.resolve('FeeConfigRepository', () => new FeeConfigRepository());
export const getIncomeRepository = () =>
  container.resolve('IncomeRepository', () => new IncomeRepository());
export const getEventRepository = () =>
  container.resolve('EventRepository', () => new EventRepository());
export const getEventSplitRepository = () =>
  container.resolve('EventSplitRepository', () => new EventSplitRepository());
export const getRazorpaySubscriptionRepository = () =>
  container.resolve(
    'RazorpaySubscriptionRepository',
    () => new RazorpaySubscriptionRepository()
  );

/* Services */
export const getAuditService = () =>
  container.resolve('AuditService', () => new AuditService());
export const getRealtimeService = () =>
  container.resolve('RealtimeService', () => new RealtimeService());
export const getNotificationService = () =>
  container.resolve('NotificationService', () => new NotificationService(getRealtimeService()));
export const getAuthService = () =>
  container.resolve(
    'AuthService',
    () => new AuthService(getUserRepository(), getRefreshTokenRepository(), getAuditService())
  );
export const getBalanceService = () =>
  container.resolve('BalanceService', () => new BalanceService());
export const getBudgetSplitService = () =>
  container.resolve(
    'BudgetSplitService',
    () =>
      new BudgetSplitService(
        getEventRepository(),
        getEventSplitRepository(),
        getUserRepository(),
        getNotificationService()
      )
  );
export const getMemberService = () =>
  container.resolve('MemberService', () => {
    const service = new MemberService(getUserRepository(), getAuditService());
    // Core business rule: membership changes recalculate open event splits.
    service.onActiveMembershipChange((communityId, trigger) =>
      getBudgetSplitService().recalculateAll(communityId, trigger)
    );
    return service;
  });
export const getEventService = () =>
  container.resolve(
    'EventService',
    () =>
      new EventService(
        getEventRepository(),
        getEventSplitRepository(),
        getUserRepository(),
        getBalanceService(),
        getBudgetSplitService(),
        getAuditService(),
        getNotificationService()
      )
  );
export const getPaymentService = () =>
  container.resolve(
    'PaymentService',
    () =>
      new PaymentService(
        getPaymentRepository(),
        getUserRepository(),
        getIncomeRepository(),
        getEventRepository(),
        getEventSplitRepository(),
        getAuditService(),
        getNotificationService(),
        getRealtimeService()
      )
  );
export const getSubscriptionService = () =>
  container.resolve(
    'SubscriptionService',
    () =>
      new SubscriptionService(
        getRazorpaySubscriptionRepository(),
        getUserRepository(),
        getFeeConfigRepository(),
        getAuditService()
      )
  );
export const getExpenseRepository = () =>
  container.resolve('ExpenseRepository', () => new ExpenseRepository());
export const getDocumentRepository = () =>
  container.resolve('DocumentRepository', () => new DocumentRepository());
export const getExpenseService = () =>
  container.resolve(
    'ExpenseService',
    () => new ExpenseService(getExpenseRepository(), getEventRepository(), getAuditService())
  );
export const getIncomeService = () =>
  container.resolve(
    'IncomeService',
    () => new IncomeService(getIncomeRepository(), getAuditService())
  );
export const getDocumentService = () =>
  container.resolve(
    'DocumentService',
    () => new DocumentService(getDocumentRepository(), getAuditService())
  );
export const getReportService = () =>
  container.resolve(
    'ReportService',
    () => new ReportService(getFeeConfigRepository(), getAuditService(), getNotificationService())
  );
export const getExportService = () =>
  container.resolve('ExportService', () => new ExportService(getReportService()));
export const getDashboardService = () =>
  container.resolve(
    'DashboardService',
    () => new DashboardService(getBalanceService(), getFeeConfigRepository())
  );
export const getDuesService = () =>
  container.resolve('DuesService', () => new DuesService(getFeeConfigRepository()));
export const getCronService = () =>
  container.resolve(
    'CronService',
    () => new CronService(getFeeConfigRepository(), getNotificationService(), getReportService())
  );
export const getSearchService = () =>
  container.resolve('SearchService', () => new SearchService());
export const getSettingsService = () =>
  container.resolve(
    'SettingsService',
    () => new SettingsService(getFeeConfigRepository(), getAuditService())
  );
export const getWebhookService = () =>
  container.resolve(
    'WebhookService',
    () =>
      new WebhookService(
        getPaymentRepository(),
        getRazorpaySubscriptionRepository(),
        getUserRepository(),
        getPaymentService(),
        getNotificationService(),
        getAuditService()
      )
  );
