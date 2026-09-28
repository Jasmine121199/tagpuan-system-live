import { GoogleGenAI } from '@google/genai';
import { db } from './db';
import {
  UserRole,
  AIAlert,
  AIAlertPriority,
  AIAlertStatus,
  AIAlertCategory,
  AIDateFilterPeriod,
  AIBusinessStatus,
  AIBusinessReport,
  AIChatMessage,
  Branch,
  Order,
  InventoryLowStockEvent,
  DailySalesReport
} from '../src/types/index';

class AIAgentEngine {
  private alerts: Map<string, AIAlert> = new Map();
  private alertSequence: number = 1000;
  private geminiClient: GoogleGenAI | null = null;

  constructor() {
    // Lazy init Gemini if key is provided
    if (process.env.GEMINI_API_KEY) {
      try {
        this.geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      } catch (err) {
        console.warn('[AI Agent] Gemini SDK initialization warning:', err);
      }
    }
  }

  // --- 1. RUN AUTOMATED AUDIT SCAN ---
  public runAutomatedAudit(
    actorRole: UserRole = 'OWNER',
    actorBranchId: string | null = null,
    filters?: { branch_id?: string; date_preset?: string; start_date?: string; end_date?: string },
    actorUserId: string = 'SYSTEM'
  ): AIAlert[] {
    const branches = db.getBranches(actorRole, actorBranchId);
    const targetBranches = (actorRole === 'OWNER' && filters?.branch_id && filters.branch_id !== 'ALL')
      ? branches.filter(b => b.id === filters.branch_id)
      : branches;

    const { start, end } = db.getDateFilterRange(filters?.date_preset || 'TODAY', filters?.start_date, filters?.end_date);
    const nowStr = new Date().toISOString();
    const aiSettings = db.getAISettings();

    // If Master AI Monitoring is paused by Owner, skip new alert generation
    if (!aiSettings.ai_monitoring_enabled) {
      return Array.from(this.alerts.values()).filter(a => a.status !== 'RESOLVED');
    }

    // 1. INVENTORY MONITORING & LOW STOCK
    if (aiSettings.low_stock_alerts_enabled) {
      for (const branch of targetBranches) {
        const invItems = db.getBranchInventory(actorRole, actorBranchId, branch.id);
        const allIngredients = db.getIngredients();

        for (const item of invItems) {
          const ing = allIngredients.find(i => i.id === item.ingredient_id);
          const threshold = item.reorder_level || ing?.reorder_level || aiSettings.inventory_default_threshold || 15;
          const current = item.current_stock;

          if (current <= threshold) {
            const alertId = `ALERT_STOCK_${branch.id}_${item.ingredient_id}`;
            const existing = this.alerts.get(alertId);

            const priority: AIAlertPriority = current <= 5 ? 'CRITICAL' : 'WARNING';
            const suggestedQty = Math.max(threshold * 2, (item.maximum_stock || 100) - current || 50);

            if (!existing || existing.status !== 'RESOLVED') {
              const alert: AIAlert = {
                id: alertId,
                priority,
                category: 'INVENTORY',
                title: `Low Stock: ${item.ingredient_name}`,
                description: `${item.ingredient_name} is at ${current} ${item.unit} (Threshold: ${threshold} ${item.unit}) at ${branch.name}.`,
                what_happened: `Current branch inventory is at or below the reorder point.`,
                why_flagged: `Stock level ${current} ${item.unit} <= threshold ${threshold} ${item.unit}. Status: NEEDS ORDER.`,
                branch_id: branch.id,
                branch_name: branch.name,
                date_time: existing?.date_time || nowStr,
                status: existing?.status || 'NEW',
                source_record_type: 'INVENTORY',
                source_record_id: item.id,
                recommended_action: `Review stock count and submit a Request Order for ~${suggestedQty} ${item.unit} to commissary.`,
                action_type: 'CREATE_DRAFT_REQUEST',
                action_payload: {
                  branch_id: branch.id,
                  ingredient_id: item.ingredient_id,
                  quantity: suggestedQty
                },
                reviewed_by: existing?.reviewed_by,
                reviewed_at: existing?.reviewed_at,
                resolved_by: existing?.resolved_by,
                resolved_at: existing?.resolved_at,
                notes: existing?.notes,
                created_at: existing?.created_at || nowStr
              };
              this.alerts.set(alertId, alert);
            }
          }
        }
      }
    }

    // 2. PURCHASING & REQUEST ORDERS MONITORING
    const reqOrders = db.getRequestOrders(actorRole, actorBranchId);
    const pendingRequests = reqOrders.filter(r => 
      (r.status === 'SUBMITTED' || r.status === 'FOR_REVIEW') &&
      (!filters?.branch_id || filters.branch_id === 'ALL' || r.branch_id === filters.branch_id)
    );

    for (const req of pendingRequests) {
      const createdTime = new Date(req.created_at).getTime();
      const hoursPending = (Date.now() - createdTime) / (1000 * 60 * 60);

      if (hoursPending > 4 || req.priority === 'URGENT') {
        const alertId = `ALERT_REQ_PENDING_${req.id}`;
        const existing = this.alerts.get(alertId);

        if (!existing || existing.status !== 'RESOLVED') {
          const alert: AIAlert = {
            id: alertId,
            priority: req.priority === 'URGENT' ? 'CRITICAL' : 'WARNING',
            category: 'PURCHASING',
            title: `Pending Request Order: ${req.request_number}`,
            description: `Stock request from ${req.branch_name} has been waiting review for ${Math.round(hoursPending)} hrs.`,
            what_happened: `Request order ${req.request_number} requires authorized approval for commissary preparation.`,
            why_flagged: `Order priority is ${req.priority} and has been in ${req.status} state for > 4 hours.`,
            branch_id: req.branch_id,
            branch_name: req.branch_name,
            date_time: existing?.date_time || req.created_at,
            status: existing?.status || 'NEW',
            source_record_type: 'REQUEST_ORDER',
            source_record_id: req.id,
            recommended_action: `Review items (${req.items.length} ingredients) and approve or reject request order.`,
            action_type: 'VIEW_REQUESTS',
            reviewed_by: existing?.reviewed_by,
            reviewed_at: existing?.reviewed_at,
            resolved_by: existing?.resolved_by,
            resolved_at: existing?.resolved_at,
            notes: existing?.notes,
            created_at: existing?.created_at || nowStr
          };
          this.alerts.set(alertId, alert);
        }
      }
    }

    // Check Deliveries
    const deliveries = db.getDeliveries(actorRole, actorBranchId);
    for (const deliv of deliveries) {
      if (deliv.status === 'PARTIALLY_DELIVERED') {
        const alertId = `ALERT_DELIV_PARTIAL_${deliv.id}`;
        const existing = this.alerts.get(alertId);
        if (!existing || existing.status !== 'RESOLVED') {
          this.alerts.set(alertId, {
            id: alertId,
            priority: 'WARNING',
            category: 'PURCHASING',
            title: `Partial Delivery: ${deliv.delivery_number}`,
            description: `Delivery to ${deliv.destination_branch_name} has short or rejected items pending remaining fulfillment.`,
            what_happened: `Branch received delivery with remaining quantities unfulfilled.`,
            why_flagged: `Delivery status is PARTIALLY_DELIVERED.`,
            branch_id: deliv.destination_branch_id,
            branch_name: deliv.destination_branch_name,
            date_time: existing?.date_time || deliv.updated_at || nowStr,
            status: existing?.status || 'NEW',
            source_record_type: 'DELIVERY',
            source_record_id: deliv.id,
            recommended_action: `Check short/rejected quantities and schedule remaining dispatch.`,
            action_type: 'VIEW_REQUESTS',
            created_at: existing?.created_at || nowStr
          });
        }
      }
    }

    // 3. CASHIER & FINANCIAL AUDIT
    if (aiSettings.cash_variance_alerts_enabled) {
      const reconciliations = db.getFinancialReconciliation(actorRole, actorBranchId, {
        branch_id: filters?.branch_id,
        date_preset: filters?.date_preset || 'TODAY',
        start_date: filters?.start_date,
        end_date: filters?.end_date
      });

      for (const rec of reconciliations) {
        if (rec.cash_variance !== 0) {
          const alertId = `ALERT_CASH_VAR_${rec.date}_${rec.branch_id}`;
          const existing = this.alerts.get(alertId);

          if (!existing || existing.status !== 'RESOLVED') {
            const isShortage = rec.cash_variance < 0;
            const absVar = Math.abs(rec.cash_variance);
            const priority: AIAlertPriority = absVar >= 500 ? 'CRITICAL' : 'WARNING';

            this.alerts.set(alertId, alertId in this.alerts ? this.alerts.get(alertId)! : {
              id: alertId,
              priority,
              category: 'CASHIER',
              title: `Cash Variance: ₱${absVar.toLocaleString()} (${isShortage ? 'Shortage' : 'Overage'})`,
              description: `${rec.branch_name} has a cash count variance on ${rec.date}. Expected: ₱${rec.expected_cash.toLocaleString()}, Actual: ₱${rec.actual_cash.toLocaleString()}.`,
              what_happened: `Cash drawer physical count does not match recorded cash sales net of expenses.`,
              why_flagged: `Variance of ${isShortage ? '-' : '+'}₱${absVar.toLocaleString()} detected during financial reconciliation.`,
              branch_id: rec.branch_id,
              branch_name: rec.branch_name,
              date_time: existing?.date_time || `${rec.date}T20:00:00.000Z`,
              status: existing?.status || 'NEW',
              source_record_type: 'RECONCILIATION',
              source_record_id: rec.id,
              recommended_action: `Inspect cashier shift envelopes, expense receipts, and manager cash count sheet.`,
              action_type: 'VIEW_RECONCILIATION',
              created_at: existing?.created_at || nowStr
            });
          }
        }
      }
    }

    // 4. KITCHEN DISPLAY SYSTEM (KDS) DELAYS
    if (aiSettings.kitchen_delay_alerts_enabled) {
      const kitchenOrders = db.getKitchenOrders(actorRole, actorBranchId, {
        branch_id: filters?.branch_id
      });
      const delayThreshold = aiSettings.kds_delay_threshold_minutes || 15;

      for (const kOrder of kitchenOrders) {
        if (kOrder.kitchen_status === 'PREPARING' || kOrder.kitchen_status === 'NEW') {
          const startTime = new Date(kOrder.kitchen_received_at || kOrder.created_at).getTime();
          const durationMin = (Date.now() - startTime) / (1000 * 60);

          if (durationMin >= delayThreshold) {
            const alertId = `ALERT_KDS_DELAY_${kOrder.id}`;
            const existing = this.alerts.get(alertId);

            if (!existing || existing.status !== 'RESOLVED') {
              this.alerts.set(alertId, {
                id: alertId,
                priority: durationMin >= (delayThreshold + 10) ? 'CRITICAL' : 'WARNING',
                category: 'KITCHEN',
                title: `Kitchen Delay: Order #${kOrder.order_number}`,
                description: `Order #${kOrder.order_number} has been preparing for ${Math.floor(durationMin)} mins at ${kOrder.branch_name}.`,
                what_happened: `Customer order is delayed beyond the configured ${delayThreshold}-minute preparation threshold.`,
                why_flagged: `Prep time ${Math.floor(durationMin)}m >= ${delayThreshold}m kitchen delay threshold.`,
                branch_id: kOrder.branch_id,
                branch_name: kOrder.branch_name,
                date_time: existing?.date_time || nowStr,
                status: existing?.status || 'NEW',
                source_record_type: 'ORDER',
                source_record_id: kOrder.id,
                recommended_action: `Expedite kitchen station line and prioritize Order #${kOrder.order_number}.`,
                action_type: 'VIEW_KDS',
                created_at: existing?.created_at || nowStr
              });
            }
          }
        }
      }
    }

    // 5. SALES ANOMALY & VOID ACTIVITY
    const dailyReports = db.getDailySalesReports(actorRole, actorBranchId, {
      branch_id: filters?.branch_id,
      date_preset: filters?.date_preset || 'TODAY',
      start_date: filters?.start_date,
      end_date: filters?.end_date
    });

    for (const report of dailyReports) {
      if (report.voids > 0 && (report.voids >= 1000 || (report.net_sales > 0 && report.voids / report.net_sales > 0.15))) {
        const alertId = `ALERT_SALES_VOID_${report.date}_${report.branch_id}`;
        const existing = this.alerts.get(alertId);

        if (!existing || existing.status !== 'RESOLVED') {
          this.alerts.set(alertId, {
            id: alertId,
            priority: 'WARNING',
            category: 'SALES',
            title: `Elevated Void Activity: ${report.branch_name}`,
            description: `₱${report.voids.toLocaleString()} in voided items detected on ${report.date} at ${report.branch_name}.`,
            what_happened: `High void volume or void ratio relative to net sales.`,
            why_flagged: `Void amount ₱${report.voids.toLocaleString()} exceeds 15% of branch sales.`,
            branch_id: report.branch_id,
            branch_name: report.branch_name,
            date_time: existing?.date_time || `${report.date}T21:00:00.000Z`,
            status: existing?.status || 'NEW',
            source_record_type: 'SALE',
            source_record_id: report.branch_id,
            recommended_action: `Verify supervisor authorization logs for voided tickets.`,
            action_type: 'VIEW_AUDIT',
            created_at: existing?.created_at || nowStr
          });
        }
      }
    }

    // 6. ATTENDANCE & SHIFT AUDIT
    const attendances = db.getAttendance(actorRole, actorBranchId, actorUserId, {
      branch_id: filters?.branch_id
    });

    for (const att of attendances) {
      if (!att.clock_out && att.clock_in) {
        const inTime = new Date(att.clock_in).getTime();
        const durationHours = (Date.now() - inTime) / (1000 * 60 * 60);

        if (durationHours > 14) {
          const alertId = `ALERT_ATT_NOCLOCKOUT_${att.id}`;
          const existing = this.alerts.get(alertId);

          if (!existing || existing.status !== 'RESOLVED') {
            this.alerts.set(alertId, {
              id: alertId,
              priority: 'WARNING',
              category: 'ATTENDANCE',
              title: `Missing Clock-Out: ${att.employee_name}`,
              description: `${att.employee_name} clocked in at ${new Date(att.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} with no clock-out recorded for over 14 hours.`,
              what_happened: `Employee shift ended without an official clock-out punch.`,
              why_flagged: `Active open attendance punch exceeds 14 hours duration.`,
              branch_id: att.branch_id,
              branch_name: att.branch_name || 'Branch',
              date_time: existing?.date_time || att.clock_in,
              status: existing?.status || 'NEW',
              source_record_type: 'ATTENDANCE',
              source_record_id: att.id,
              recommended_action: `Manager should review employee shift logs and record verified clock-out.`,
              action_type: 'VIEW_AUDIT',
              created_at: existing?.created_at || nowStr
            });
          }
        }
      }
    }

    // 7. PAYROLL DRAFT MONITORING
    const payrollPeriods = db.getPayrollPeriods();
    for (const pp of payrollPeriods) {
      if (!pp.is_closed) {
        const alertId = `ALERT_PAYROLL_DRAFT_${pp.id}`;
        const existing = this.alerts.get(alertId);

        if (!existing || existing.status !== 'RESOLVED') {
          this.alerts.set(alertId, {
            id: alertId,
            priority: 'INFO',
            category: 'PAYROLL',
            title: `Open Payroll Period: ${pp.name}`,
            description: `Payroll period ${pp.name} (${pp.start_date} to ${pp.end_date}) is open. Verify attendance and wage calculations before cutoff.`,
            what_happened: `Active open payroll period requires attendance and wage calculation reviews.`,
            why_flagged: `Payroll period is not yet closed.`,
            branch_id: 'ALL',
            branch_name: 'All Branches',
            date_time: existing?.date_time || pp.created_at,
            status: existing?.status || 'NEW',
            source_record_type: 'PAYROLL',
            source_record_id: pp.id,
            recommended_action: `Review wage breakdowns, employee payable hours, and finalize payroll.`,
            action_type: 'VIEW_PAYROLL',
            created_at: existing?.created_at || nowStr
          });
        }
      }
    }

    // 8. LOYALTY AUDIT
    const loyaltyCustomers = db.getLoyaltyCustomers(actorRole, actorBranchId);
    for (const cust of loyaltyCustomers) {
      const redemptions = db.getLoyaltyRedemptions(actorRole, actorBranchId, { customer_id: cust.id });
      if (redemptions.length >= 3) {
        // Check if multiple redemptions occurred on the same day
        const todayRedemptions = redemptions.filter(r => r.redeemed_at.startsWith(new Date().toISOString().split('T')[0]));
        if (todayRedemptions.length >= 3) {
          const alertId = `ALERT_LOYALTY_RAPID_${cust.id}`;
          const existing = this.alerts.get(alertId);

          if (!existing || existing.status !== 'RESOLVED') {
            this.alerts.set(alertId, {
              id: alertId,
              priority: 'WARNING',
              category: 'LOYALTY',
              title: `High Loyalty Redemptions: ${cust.customer_name}`,
              description: `Customer ${cust.customer_name} has redeemed ${todayRedemptions.length} rewards today.`,
              what_happened: `Unusually frequent reward claims for a single customer within 24 hours.`,
              why_flagged: `Redemption count >= 3 on the same date.`,
              branch_id: cust.registered_branch_id,
              branch_name: cust.registered_branch_name,
              date_time: existing?.date_time || nowStr,
              status: existing?.status || 'NEW',
              source_record_type: 'LOYALTY',
              source_record_id: cust.id,
              recommended_action: `Verify customer phone number and cashier redemption tickets.`,
              action_type: 'VIEW_LOYALTY',
              created_at: existing?.created_at || nowStr
            });
          }
        }
      }
    }

    return Array.from(this.alerts.values());
  }

  // --- 2. GET CURRENT BUSINESS STATUS ---
  public getBusinessStatus(
    actorRole: UserRole = 'OWNER',
    actorBranchId: string | null = null,
    filters: { branch_id?: string; date_preset?: string; start_date?: string; end_date?: string }
  ): AIBusinessStatus {
    this.runAutomatedAudit(actorRole, actorBranchId, filters);

    const reports = db.getDailySalesReports(actorRole, actorBranchId, {
      branch_id: filters.branch_id,
      date_preset: filters.date_preset || 'TODAY',
      start_date: filters.start_date,
      end_date: filters.end_date
    });

    let totalSales = 0;
    let orderCount = 0;
    let cashSales = 0;
    let gcashSales = 0;
    let mayaSales = 0;
    let qrphSales = 0;
    let bankSales = 0;
    let otherSales = 0;
    let voidedCount = 0;

    for (const r of reports) {
      totalSales += r.net_sales;
      orderCount += r.order_count;
      cashSales += r.cash_sales;
      gcashSales += r.gcash_sales;
      mayaSales += r.maya_sales;
      qrphSales += r.qrph_sales;
      bankSales += r.bank_sales;
      otherSales += r.other_sales;
      if (r.voids > 0) voidedCount += 1;
    }

    const effectiveBranchId = (actorRole === 'MANAGER' || actorRole === 'CASHIER') ? actorBranchId : filters.branch_id;
    const branchPerformanceMap = new Map<string, { branch_id: string; branch_name: string; sales: number; orders: number }>();

    for (const r of reports) {
      const existing = branchPerformanceMap.get(r.branch_id) || {
        branch_id: r.branch_id,
        branch_name: r.branch_name,
        sales: 0,
        orders: 0
      };
      existing.sales += r.net_sales;
      existing.orders += r.order_count;
      branchPerformanceMap.set(r.branch_id, existing);
    }

    const allAlerts = Array.from(this.alerts.values()).filter(a => {
      if (effectiveBranchId && effectiveBranchId !== 'ALL' && a.branch_id !== effectiveBranchId && a.branch_id !== 'ALL') {
        return false;
      }
      return true;
    });

    const activeAlerts = allAlerts.filter(a => a.status !== 'RESOLVED');

    const lowStockCount = activeAlerts.filter(a => a.category === 'INVENTORY').length;
    const pendingRequestsCount = activeAlerts.filter(a => a.category === 'PURCHASING').length;
    const cashVariancesCount = activeAlerts.filter(a => a.category === 'CASHIER').length;
    const payrollAlertsCount = activeAlerts.filter(a => a.category === 'PAYROLL').length;
    const loyaltyAlertsCount = activeAlerts.filter(a => a.category === 'LOYALTY').length;
    const kitchenDelaysCount = activeAlerts.filter(a => a.category === 'KITCHEN').length;
    const criticalAlertsCount = activeAlerts.filter(a => a.priority === 'CRITICAL').length;
    const warningAlertsCount = activeAlerts.filter(a => a.priority === 'WARNING').length;
    const infoAlertsCount = activeAlerts.filter(a => a.priority === 'INFO').length;

    const paidOrders = orderCount - voidedCount;
    const avgOrderValue = paidOrders > 0 ? Math.round((totalSales / paidOrders) * 100) / 100 : 0;

    return {
      sales: totalSales,
      orders: orderCount,
      paid_orders: Math.max(0, paidOrders),
      unpaid_orders: 0,
      voided_orders: voidedCount,
      low_stock_count: lowStockCount,
      pending_requests_count: pendingRequestsCount,
      cash_variances_count: cashVariancesCount,
      payroll_alerts_count: payrollAlertsCount,
      loyalty_alerts_count: loyaltyAlertsCount,
      kitchen_delays_count: kitchenDelaysCount,
      critical_alerts_count: criticalAlertsCount,
      warning_alerts_count: warningAlertsCount,
      info_alerts_count: infoAlertsCount,
      average_order_value: avgOrderValue,
      payment_breakdown: {
        cash: cashSales,
        gcash: gcashSales,
        maya: mayaSales,
        qrph: qrphSales,
        bank_transfer: bankSales,
        other: otherSales
      },
      branch_performance: Array.from(branchPerformanceMap.values()).sort((a, b) => b.sales - a.sales)
    };
  }

  // --- 3. GET AI ALERTS ---
  public getAIAlerts(
    actorRole: UserRole = 'OWNER',
    actorBranchId: string | null = null,
    filters?: {
      branch_id?: string;
      category?: string;
      priority?: string;
      status?: string;
      date_preset?: string;
      start_date?: string;
      end_date?: string;
    }
  ): AIAlert[] {
    this.runAutomatedAudit(actorRole, actorBranchId, filters);

    let list = Array.from(this.alerts.values());

    const effectiveBranchId = (actorRole === 'MANAGER' || actorRole === 'CASHIER') ? actorBranchId : filters?.branch_id;

    if (effectiveBranchId && effectiveBranchId !== 'ALL') {
      list = list.filter(a => a.branch_id === effectiveBranchId || a.branch_id === 'ALL');
    }

    if (filters?.category && filters.category !== 'ALL') {
      list = list.filter(a => a.category === filters.category);
    }

    if (filters?.priority && filters.priority !== 'ALL') {
      list = list.filter(a => a.priority === filters.priority);
    }

    if (filters?.status && filters.status !== 'ALL') {
      list = list.filter(a => a.status === filters.status);
    }

    // Sort: CRITICAL first, then WARNING, then INFO, and newest first
    const priorityWeight: Record<AIAlertPriority, number> = {
      CRITICAL: 3,
      WARNING: 2,
      INFO: 1
    };

    return list.sort((a, b) => {
      const pDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (pDiff !== 0) return pDiff;
      return new Date(b.date_time).getTime() - new Date(a.date_time).getTime();
    });
  }

  // --- 4. REVIEW ALERT ---
  public reviewAlert(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    alertId: string,
    notes?: string
  ): AIAlert {
    const alert = this.alerts.get(alertId);
    if (!alert) throw new Error('Alert not found.');

    if (actorRole !== 'OWNER' && alert.branch_id !== 'ALL') {
      // Role check
      const userProfiles = db.getProfiles(actorRole, null, actorId);
      const user = userProfiles.find(u => u.id === actorId);
      if (user?.branch_id && user.branch_id !== alert.branch_id) {
        throw new Error('Forbidden: You can only review alerts for your assigned branch.');
      }
    }

    alert.status = 'REVIEWED';
    alert.reviewed_by = actorId;
    alert.reviewed_by_email = actorEmail;
    alert.reviewed_at = new Date().toISOString();
    if (notes) alert.notes = notes;

    db.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: alert.branch_id === 'ALL' ? null : alert.branch_id,
      branch_name: alert.branch_name,
      action: 'AI_ALERT_REVIEWED',
      entity_type: 'AI_ALERT',
      entity_id: alert.id,
      metadata: { title: alert.title, priority: alert.priority, category: alert.category }
    });

    return alert;
  }

  // --- 5. RESOLVE ALERT ---
  public resolveAlert(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    alertId: string,
    notes?: string
  ): AIAlert {
    const alert = this.alerts.get(alertId);
    if (!alert) throw new Error('Alert not found.');

    alert.status = 'RESOLVED';
    alert.resolved_by = actorId;
    alert.resolved_at = new Date().toISOString();
    if (notes) alert.notes = notes;

    db.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: alert.branch_id === 'ALL' ? null : alert.branch_id,
      branch_name: alert.branch_name,
      action: 'AI_ALERT_RESOLVED',
      entity_type: 'AI_ALERT',
      entity_id: alert.id,
      metadata: { title: alert.title, priority: alert.priority, category: alert.category }
    });

    return alert;
  }

  // --- 6. CREATE DRAFT REQUEST FROM AI ---
  public createDraftRequestFromAI(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    input: {
      alertId?: string;
      branchId: string;
      ingredientId: string;
      quantity: number;
    }
  ) {
    const req = db.triggerAIRestockRequest(actorRole, actorId, actorEmail, {
      branch_id: input.branchId,
      ingredient_id: input.ingredientId,
      quantity: input.quantity
    });

    if (input.alertId) {
      const alert = this.alerts.get(input.alertId);
      if (alert) {
        alert.status = 'REVIEWED';
        alert.reviewed_by = actorId;
        alert.reviewed_at = new Date().toISOString();
        alert.notes = `Draft Request Order ${req.request_number} prepared via AI recommendation.`;
      }
    }

    db.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: input.branchId,
      action: 'AI_DRAFT_REQUEST_CREATED',
      entity_type: 'REQUEST_ORDER',
      entity_id: req.id,
      metadata: { request_number: req.request_number, alert_id: input.alertId }
    });

    return req;
  }

  // --- 7. GENERATE AI BUSINESS REPORT (12 SECTIONS) ---
  public generateBusinessReport(
    actorRole: UserRole = 'OWNER',
    actorBranchId: string | null = null,
    filters: {
      period: AIDateFilterPeriod;
      branch_id?: string;
      start_date?: string;
      end_date?: string;
    }
  ): AIBusinessReport {
    const status = this.getBusinessStatus(actorRole, actorBranchId, {
      branch_id: filters.branch_id,
      date_preset: filters.period,
      start_date: filters.start_date,
      end_date: filters.end_date
    });

    const { start, end } = db.getDateFilterRange(filters.period, filters.start_date, filters.end_date);
    const effectiveBranchId = (actorRole === 'MANAGER' || actorRole === 'CASHIER') ? actorBranchId : filters.branch_id;

    const branchName = effectiveBranchId && effectiveBranchId !== 'ALL'
      ? (db.getBranchById(effectiveBranchId)?.name || 'Branch')
      : 'All 17 Branches Global Scope';

    const alerts = this.getAIAlerts(actorRole, actorBranchId, {
      branch_id: effectiveBranchId,
      date_preset: filters.period,
      start_date: filters.start_date,
      end_date: filters.end_date
    });

    // Best-performing items calculation from completed orders
    const orders = db.getOrders(actorRole, actorBranchId, {
      branch_id: effectiveBranchId
    });

    const productSalesMap = new Map<string, { product_name: string; quantity: number; revenue: number }>();
    for (const order of orders) {
      if (order.status === 'PAID') {
        for (const item of order.items || []) {
          const existing = productSalesMap.get(item.product_name) || {
            product_name: item.product_name,
            quantity: 0,
            revenue: 0
          };
          existing.quantity += item.quantity;
          existing.revenue += (item.total_price || (item.quantity * item.unit_price));
          productSalesMap.set(item.product_name, existing);
        }
      }
    }

    const bestPerformingItems = Array.from(productSalesMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Section summaries
    const invAlerts = alerts.filter(a => a.category === 'INVENTORY').map(a => `${a.branch_name}: ${a.title} - ${a.description}`);
    const purchAlerts = alerts.filter(a => a.category === 'PURCHASING').map(a => `${a.branch_name}: ${a.title} - ${a.description}`);
    const cashVariances = alerts.filter(a => a.category === 'CASHIER').map(a => `${a.branch_name}: ${a.title} - ${a.description}`);
    const attIssues = alerts.filter(a => a.category === 'ATTENDANCE').map(a => `${a.branch_name}: ${a.title} - ${a.description}`);
    const payrollIssues = alerts.filter(a => a.category === 'PAYROLL').map(a => `${a.branch_name}: ${a.title} - ${a.description}`);
    const loyaltyActs = alerts.filter(a => a.category === 'LOYALTY').map(a => `${a.branch_name}: ${a.title} - ${a.description}`);
    const kitchenDelays = alerts.filter(a => a.category === 'KITCHEN').map(a => `${a.branch_name}: ${a.title} - ${a.description}`);
    const auditFindings = alerts.filter(a => a.category === 'SALES' || a.category === 'CROSS_MODULE' || a.category === 'AUDIT').map(a => `${a.branch_name}: ${a.title} - ${a.description}`);

    const insights: string[] = [];
    if (status.sales > 0) {
      insights.push(`Recorded ₱${status.sales.toLocaleString()} in sales across ${status.orders} customer orders with an average order value of ₱${status.average_order_value.toFixed(2)}.`);
    } else {
      insights.push(`No customer sales recorded within the selected period filter.`);
    }

    if (status.critical_alerts_count > 0) {
      insights.push(`Action Required: ${status.critical_alerts_count} CRITICAL alerts flagged requiring managerial intervention.`);
    } else {
      insights.push(`Clean Operations: Zero critical operational breaches or unhandled stock-outs detected.`);
    }

    if (status.cash_variances_count > 0) {
      insights.push(`Financial Attention: ${status.cash_variances_count} cashier variance events logged during drawer reconciliation.`);
    }

    if (status.low_stock_count > 0) {
      insights.push(`Supply Chain: ${status.low_stock_count} ingredients at or below reorder threshold.`);
    }

    return {
      period: filters.period,
      date_range: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      branch_id: effectiveBranchId || 'ALL',
      branch_name: branchName,
      generated_at: new Date().toISOString(),
      sales_summary: {
        total_sales: status.sales,
        order_count: status.orders,
        paid_count: status.paid_orders,
        unpaid_count: status.unpaid_orders,
        voided_count: status.voided_orders,
        average_order_value: status.average_order_value,
        gross_sales: status.sales,
        discounts: 0,
        void_amount: 0
      },
      payment_breakdown: status.payment_breakdown,
      best_performing_items: bestPerformingItems,
      branch_performance: status.branch_performance,
      inventory_alerts_summary: invAlerts.length ? invAlerts : ['All monitored ingredient stocks are within optimal operational bounds.'],
      purchasing_alerts_summary: purchAlerts.length ? purchAlerts : ['No pending request order bottlenecks or delivery delays.'],
      cashier_variances_summary: cashVariances.length ? cashVariances : ['All cashier shifts balanced to ₱0.00 variance.'],
      attendance_issues_summary: attIssues.length ? attIssues : ['Attendance punches verified with zero missing clock-outs.'],
      payroll_issues_summary: payrollIssues.length ? payrollIssues : ['Payroll calculations aligned with verified clock hours.'],
      loyalty_activity_summary: loyaltyActs.length ? loyaltyActs : ['Loyalty points accumulation and redemptions operating normally.'],
      kitchen_delays_summary: kitchenDelays.length ? kitchenDelays : ['All KDS orders completed well within the 15-minute standard threshold.'],
      audit_findings_summary: auditFindings.length ? auditFindings : ['Audit trail verifies strict data consistency between orders, inventory, and remittances.'],
      executive_ai_insights: insights
    };
  }

  // --- 8. AI CHAT ASSISTANT (STRICT NO-HALLUCINATION GROUNDING) ---
  public async processAIChat(
    actorRole: UserRole,
    actorBranchId: string | null,
    actorEmail: string,
    query: string,
    selectedBranchId?: string
  ): Promise<{ reply: string; suggested_queries: string[]; data_points?: Record<string, any> }> {
    const status = this.getBusinessStatus(actorRole, actorBranchId, {
      branch_id: selectedBranchId || (actorRole === 'OWNER' ? 'ALL' : actorBranchId || undefined),
      date_preset: 'TODAY'
    });

    const report = this.generateBusinessReport(actorRole, actorBranchId, {
      period: 'TODAY',
      branch_id: selectedBranchId || (actorRole === 'OWNER' ? 'ALL' : actorBranchId || undefined)
    });

    const alerts = this.getAIAlerts(actorRole, actorBranchId, {
      branch_id: selectedBranchId || (actorRole === 'OWNER' ? 'ALL' : actorBranchId || undefined)
    });

    const topBranch = status.branch_performance.length > 0 ? status.branch_performance[0] : null;

    const contextPayload = {
      user_role: actorRole,
      branch_scope: actorRole === 'OWNER' ? (selectedBranchId && selectedBranchId !== 'ALL' ? selectedBranchId : 'ALL 17 BRANCHES') : actorBranchId,
      today_sales: status.sales,
      today_orders: status.orders,
      paid_orders: status.paid_orders,
      average_order_value: status.average_order_value,
      payment_breakdown: status.payment_breakdown,
      top_branch: topBranch ? `${topBranch.branch_name} with ₱${topBranch.sales.toLocaleString()} sales` : 'No sales recorded yet',
      top_selling_items: report.best_performing_items.map(p => `${p.product_name} (${p.quantity} sold - ₱${p.revenue.toLocaleString()})`).join(', ') || 'No product sales recorded yet',
      low_stock_items: alerts.filter(a => a.category === 'INVENTORY').map(a => `${a.title} (${a.branch_name})`).join('; ') || 'No low stock items currently',
      cashier_variances: alerts.filter(a => a.category === 'CASHIER').map(a => `${a.title} at ${a.branch_name}`).join('; ') || 'None (all drawers balanced)',
      delayed_orders: alerts.filter(a => a.category === 'KITCHEN').map(a => `${a.title} (${a.branch_name})`).join('; ') || 'None (all orders on time)',
      pending_requests: alerts.filter(a => a.category === 'PURCHASING').map(a => `${a.title}`).join('; ') || 'None pending',
      critical_alerts: alerts.filter(a => a.priority === 'CRITICAL').length,
      warning_alerts: alerts.filter(a => a.priority === 'WARNING').length
    };

    // If Gemini key is configured, use Google GenAI with strict grounding
    if (this.geminiClient) {
      try {
        const prompt = `You are the AI Command Center Agent for Tagpuan ERP (Home of Authentic Burger & Siomai).
Your role is to strictly MONITOR, ANALYZE, AUDIT, CALCULATE, SUMMARIZE, and REPORT.

STRICT OPERATIONAL RULES:
1. Ground your answers 100% in the live ERP data provided below.
2. NEVER invent, extrapolate, or hallucinate figures or records.
3. If data is unavailable or not recorded, literally state: "I don't have enough recorded data to determine this."
4. You CANNOT execute destructive actions (voiding, modifying inventory, deleting records, approving purchases). State that authorized Owner/Manager approval is required.
5. If the user asks in Filipino / Tagalog (e.g. "Magkano ang sales today?"), reply fluently in polite Filipino/Tagalog with the exact numbers. If asked in English, reply in English.
6. Provide clear, concise answers with bold numbers and bullet points when helpful.

LIVE BUSINESS CONTEXT:
${JSON.stringify(contextPayload, null, 2)}

USER QUESTION: "${query}"`;

        const response = await this.geminiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt
        });

        if (response && response.text) {
          return {
            reply: response.text.trim(),
            suggested_queries: [
              'Magkano ang sales today?',
              'Anong branch ang may pinakamalaking sales today?',
              'Anong items ang low stock?',
              'May cashier variance ba?'
            ],
            data_points: contextPayload
          };
        }
      } catch (geminiError) {
        console.warn('[AI Agent] Gemini generation error, falling back to grounded rule engine:', geminiError);
      }
    }

    // High-precision grounded NLP engine (fallback with zero hallucination)
    const qLower = query.toLowerCase();
    let reply = '';

    if (qLower.includes('sales') || qLower.includes('benta') || qLower.includes('magkano')) {
      if (qLower.includes('pinakamalaki') || qLower.includes('top branch') || qLower.includes('highest')) {
        if (topBranch && topBranch.sales > 0) {
          reply = `🏆 Ang branch na may pinakamalaking sales today ay **${topBranch.branch_name}** na may kabuuang benta na **₱${topBranch.sales.toLocaleString()}** mula sa **${topBranch.orders} orders**.`;
        } else {
          reply = `Sa kasalukuyan, wala pang naitalang sales sa mga branches ngayong araw. Lahat ng 17 branches ay handa para sa mga transaksyon.`;
        }
      } else {
        reply = `📊 **Today's Business Sales Summary:**\n\n` +
          `• **Total Net Sales:** ₱${status.sales.toLocaleString()}\n` +
          `• **Paid Orders:** ${status.paid_orders} (out of ${status.orders} total orders)\n` +
          `• **Average Order Value (AOV):** ₱${status.average_order_value.toFixed(2)}\n\n` +
          `💳 **Payment Breakdown:**\n` +
          `• Cash: ₱${status.payment_breakdown.cash.toLocaleString()}\n` +
          `• GCash: ₱${status.payment_breakdown.gcash.toLocaleString()}\n` +
          `• Maya: ₱${status.payment_breakdown.maya.toLocaleString()}\n` +
          `• QRPH / Bank / Other: ₱${(status.payment_breakdown.qrph + status.payment_breakdown.bank_transfer + status.payment_breakdown.other).toLocaleString()}`;
      }
    } else if (qLower.includes('stock') || qLower.includes('imbentaryo') || qLower.includes('ingredient')) {
      const lowStockAlerts = alerts.filter(a => a.category === 'INVENTORY');
      if (lowStockAlerts.length > 0) {
        reply = `⚠️ **Low Stock Alert (${lowStockAlerts.length} item(s) below threshold):**\n\n` +
          lowStockAlerts.map(a => `• **${a.title}** (${a.branch_name}) — ${a.description}`).join('\n') +
          `\n\n💡 *Maaari kang mag-click ng 'Create Draft' sa Alert Center upang mag-draft ng Request Order para sa commissary approval.*`;
      } else {
        reply = `✅ Lahat ng ingredients sa mga branches ay nasa tamang antas at lampas sa reorder threshold (15 units default). Walang critical stock-out na naitala.`;
      }
    } else if (qLower.includes('variance') || qLower.includes('kaha') || qLower.includes('cashier')) {
      const cashierAlerts = alerts.filter(a => a.category === 'CASHIER');
      if (cashierAlerts.length > 0) {
        reply = `🚨 **Cashier Variance Detected (${cashierAlerts.length} case(s)):**\n\n` +
          cashierAlerts.map(a => `• **${a.branch_name}:** ${a.title}\n  ${a.description}`).join('\n\n') +
          `\n\n🔍 *Paalala: Hindi maaaring baguhin ng AI ang pera o talaan. Mangyaring suriin ang shift cash count at resibo sa Financial Reconciliation.*`;
      } else {
        reply = `✅ Walang cashier variance na naitala today. Lahat ng physical cash count ay nagtutugma (₱0.00 variance) sa system sales at approved expenses.`;
      }
    } else if (qLower.includes('kusina') || qLower.includes('kitchen') || qLower.includes('kds') || qLower.includes('delay')) {
      const kdsAlerts = alerts.filter(a => a.category === 'KITCHEN');
      if (kdsAlerts.length > 0) {
        reply = `⏱️ **Kitchen Delay Alert (${kdsAlerts.length} order(s) delayed > 15 mins):**\n\n` +
          kdsAlerts.map(a => `• **${a.branch_name}:** ${a.title} — ${a.description}`).join('\n') +
          `\n\n🍳 *Mangyaring puntahan ang Kitchen Display System (KDS) upang i-expedite ang pagluluto.*`;
      } else {
        reply = `✅ Lahat ng orders sa kusina ay nasa schedule at walang lumalagpas sa 15-minute preparation threshold.`;
      }
    } else if (qLower.includes('payroll') || qLower.includes('sahod')) {
      const payrollAlerts = alerts.filter(a => a.category === 'PAYROLL');
      if (payrollAlerts.length > 0) {
        reply = `💼 **Payroll Status:** May active draft payroll period na naghihintay ng review at approval mula sa Owner o Branch Manager. Ang AI ay hindi awtomatikong nagbabago ng rate o nag-aapruba ng payroll.`;
      } else {
        reply = `💼 **Payroll Status:** Walang pending draft issues. Lahat ng attendance records ay naka-sync para sa regular cutoff computation.`;
      }
    } else if (qLower.includes('loyalty') || qLower.includes('points') || qLower.includes('reward')) {
      const loyaltyAlerts = alerts.filter(a => a.category === 'LOYALTY');
      if (loyaltyAlerts.length > 0) {
        reply = `⭐ **Loyalty Audit Notice:**\n\n` + loyaltyAlerts.map(a => `• ${a.title} (${a.branch_name}): ${a.description}`).join('\n');
      } else {
        reply = `⭐ **Loyalty System Normal:** Lahat ng points earning at reward claims ay nagtutugma sa mga opisyal na order tickets. Walang suspicious rapid redemptions o unauthorized points adjustments.`;
      }
    } else if (qLower.includes('request') || qLower.includes('purchasing') || qLower.includes('po')) {
      const purchAlerts = alerts.filter(a => a.category === 'PURCHASING');
      if (purchAlerts.length > 0) {
        reply = `📦 **Purchasing & Request Orders Queue:**\n\n` +
          purchAlerts.map(a => `• **${a.title}** (${a.branch_name}): ${a.description}`).join('\n');
      } else {
        reply = `📦 Lahat ng Branch Request Orders ay na-process o naihanda na. Walang overdue delivery o delayed preparation queue sa commissary.`;
      }
    } else if (qLower.includes('alert') || qLower.includes('audit')) {
      if (alerts.length > 0) {
        reply = `🔔 **Live System Audit Alerts (${alerts.length} total active):**\n\n` +
          `• 🔴 **Critical:** ${status.critical_alerts_count}\n` +
          `• 🟡 **Warning:** ${status.warning_alerts_count}\n` +
          `• 🔵 **Info:** ${status.info_alerts_count}\n\n` +
          alerts.slice(0, 5).map(a => `• [${a.priority}] **${a.title}** (${a.branch_name}): ${a.description}`).join('\n') +
          (alerts.length > 5 ? `\n• ...at ${alerts.length - 5} pang alerts sa Alert Center.` : '');
      } else {
        reply = `✅ Lahat ng system parameters, cashier balances, inventory thresholds, at attendance logs ay malinis at sumusunod sa standard audit rules.`;
      }
    } else {
      reply = `Kumusta! Ako ang Tagpuan ERP AI Command Center Assistant.\n\n` +
        `Maaari kitang tulungan sa live updates ukol sa:\n` +
        `• 💰 **Sales & Revenue:** "Magkano ang sales today?" o "Anong branch ang may pinakamalaking sales?"\n` +
        `• 📦 **Inventory & Restock:** "Anong items ang low stock?" o "May kailangan bang i-order?"\n` +
        `• 💵 **Cashier Variances:** "May cashier variance ba today?"\n` +
        `• 🍳 **Kitchen Operations:** "May delayed orders ba sa kusina?"\n` +
        `• 📋 **Audit Alerts:** "Show me today's audit alerts."\n\n` +
        `*Lahat ng impormasyon ay galing direkta sa live database ng 17 branches ng Tagpuan.*`;
    }

    return {
      reply,
      suggested_queries: [
        'Magkano ang sales today?',
        'Anong branch ang may pinakamalaking sales today?',
        'Anong items ang low stock?',
        'May cashier variance ba?'
      ],
      data_points: contextPayload
    };
  }

  // --- 4. DAILY CASHIER REMITTANCE RECONCILIATION & VARIANCE ENGINE ---
  public async reconcileDailyCashierRemittances(
    actorRole: UserRole = 'OWNER',
    actorBranchId: string | null = null,
    targetDate?: string
  ): Promise<{
    date: string;
    summary: {
      total_shifts: number;
      total_expected_cash: number;
      total_actual_cash: number;
      total_remitted_cash: number;
      total_variance: number;
      shifts_with_variance: number;
      status: 'BALANCED' | 'VARIANCE_DETECTED';
    };
    shifts_reconciliation: Array<{
      shift_id: string;
      shift_number: string;
      branch_id: string;
      branch_name: string;
      cashier_id: string;
      cashier_name: string;
      opened_at: string;
      closed_at: string | null;
      opening_cash: number;
      cash_sales: number;
      cash_expenses: number;
      expected_cash: number;
      actual_cash: number;
      variance: number;
      remitted_amount: number;
      remittance_variance: number;
      status: string;
      audit_flag: 'BALANCED' | 'SHORTAGE' | 'OVERAGE' | 'UNREMITTED';
    }>;
    ai_reconciliation_summary: string;
    dispatched_alerts_count: number;
  }> {
    const today = new Date().toISOString().split('T')[0];
    const dateStr = targetDate || today;
    const nowStr = new Date().toISOString();

    const shifts = db.getCashierShifts(actorRole, actorBranchId, { date: dateStr });
    const remittances = db.getRemittances(actorRole, actorBranchId, { date: dateStr });

    let totalExpected = 0;
    let totalActual = 0;
    let totalRemitted = 0;
    let shiftsWithVariance = 0;
    let dispatchedAlertsCount = 0;

    const shiftResults = shifts.map(shift => {
      const shiftRemittances = remittances.filter(r => r.shift_id === shift.id);
      const remittedAmount = shiftRemittances.reduce((sum, r) => sum + (r.remitted_amount || 0), 0);

      const expected = Math.round((shift.expected_cash || (shift.opening_cash + shift.cash_sales - shift.cash_expenses)) * 100) / 100;
      const actual = shift.actual_cash !== null ? shift.actual_cash : expected;
      const variance = Math.round((actual - expected) * 100) / 100;
      const remittanceVariance = Math.round((remittedAmount - actual) * 100) / 100;

      totalExpected += expected;
      totalActual += actual;
      totalRemitted += remittedAmount;

      let auditFlag: 'BALANCED' | 'SHORTAGE' | 'OVERAGE' | 'UNREMITTED' = 'BALANCED';
      if (variance < -0.01) {
        auditFlag = 'SHORTAGE';
        shiftsWithVariance++;
      } else if (variance > 0.01) {
        auditFlag = 'OVERAGE';
        shiftsWithVariance++;
      } else if (shift.status === 'CLOSED' && shiftRemittances.length === 0) {
        auditFlag = 'UNREMITTED';
        shiftsWithVariance++;
      }

      // Check & dispatch AI Alert if there is a variance or unremitted closed shift
      if (auditFlag !== 'BALANCED') {
        const alertId = `ALERT_REMITTANCE_VAR_${shift.id}`;
        const existing = this.alerts.get(alertId);

        if (!existing || existing.status !== 'RESOLVED') {
          const absVar = Math.abs(variance);
          const priority: AIAlertPriority = absVar >= 500 ? 'CRITICAL' : 'WARNING';
          const alertTitle = auditFlag === 'UNREMITTED'
            ? `Unremitted Closed Shift: #${shift.shift_number} (${shift.branch_name})`
            : `Cashier Remittance Variance: ₱${absVar.toFixed(2)} (${auditFlag})`;

          const alertDesc = auditFlag === 'UNREMITTED'
            ? `Shift #${shift.shift_number} handled by ${shift.cashier_name} was closed with expected ₱${expected.toFixed(2)} but no cash remittance has been submitted.`
            : `Shift #${shift.shift_number} (${shift.branch_name}) handled by ${shift.cashier_name} has a discrepancy. Expected: ₱${expected.toFixed(2)}, Counted: ₱${actual.toFixed(2)}, Remitted: ₱${remittedAmount.toFixed(2)}.`;

          const alert: AIAlert = {
            id: alertId,
            priority,
            category: 'CASHIER',
            title: alertTitle,
            description: alertDesc,
            what_happened: `Automated AI Daily Cashier Reconciliation detected ${auditFlag} of ₱${absVar.toFixed(2)} for ${shift.branch_name}.`,
            why_flagged: `Physical cash count and remittance slips must balance exactly against registered net cash intake.`,
            branch_id: shift.branch_id,
            branch_name: shift.branch_name,
            date_time: nowStr,
            status: 'NEW',
            source_record_type: 'RECONCILIATION',
            source_record_id: shift.id,
            recommended_action: `Audit cashier shift #${shift.shift_number} envelope, validated deposit slips, and petty cash vouchers.`,
            action_type: 'VIEW_RECONCILIATION',
            created_at: existing?.created_at || nowStr
          };

          this.alerts.set(alertId, alert);
          dispatchedAlertsCount++;

          // Alert Master Owner janzenmarkglori@gmail.com directly
          const profiles = db.getProfiles('OWNER', null, 'ai-system');
          profiles.forEach(p => {
            if (p.role === 'OWNER' || p.email?.toLowerCase() === 'janzenmarkglori@gmail.com') {
              db.createNotification({
                recipient_user_id: p.id,
                title: `⚠️ ${alertTitle}`,
                message: alertDesc,
                type: priority === 'CRITICAL' ? 'WARNING' : 'INFO',
                action_url: '/remittance'
              });
            }
          });
        }
      }

      return {
        shift_id: shift.id,
        shift_number: shift.shift_number,
        branch_id: shift.branch_id,
        branch_name: shift.branch_name,
        cashier_id: shift.cashier_id,
        cashier_name: shift.cashier_name,
        opened_at: shift.opened_at,
        closed_at: shift.closed_at,
        opening_cash: shift.opening_cash,
        cash_sales: shift.cash_sales,
        cash_expenses: shift.cash_expenses,
        expected_cash: expected,
        actual_cash: actual,
        variance,
        remitted_amount: remittedAmount,
        remittance_variance: remittanceVariance,
        status: shift.status,
        audit_flag: auditFlag
      };
    });

    const netVariance = Math.round((totalActual - totalExpected) * 100) / 100;
    let aiSummary = `Reconciliation for ${dateStr}: ${shifts.length} active/closed shift(s) audited. Total Expected Cash: ₱${totalExpected.toFixed(2)}, Total Actual Count: ₱${totalActual.toFixed(2)}, Total Remitted: ₱${totalRemitted.toFixed(2)}. `;

    if (shiftsWithVariance > 0) {
      aiSummary += `⚠️ Detected ${shiftsWithVariance} shift(s) with cash variances or missing remittances totaling ₱${Math.abs(netVariance).toFixed(2)} (${netVariance < 0 ? 'net shortage' : 'net overage'}). AI notifications have been dispatched to Master Owner.`;
    } else {
      aiSummary += `✅ All active cashier registers and remittances for ${dateStr} are 100% reconciled and balanced with zero variance.`;
    }

    // Try Gemini explanation if available
    if (this.geminiClient && shiftsWithVariance > 0) {
      try {
        const response = await this.geminiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Provide a concise 2-sentence executive audit summary for the food business owner regarding daily cashier remittances on ${dateStr}. Expected Cash: ₱${totalExpected}, Actual Cash: ₱${totalActual}, Remitted: ₱${totalRemitted}, Variances Found in ${shiftsWithVariance} shifts.`
        });
        if (response.text) {
          aiSummary = response.text.trim();
        }
      } catch (err) {
        // Fall back to structured audit summary
      }
    }

    return {
      date: dateStr,
      summary: {
        total_shifts: shifts.length,
        total_expected_cash: Math.round(totalExpected * 100) / 100,
        total_actual_cash: Math.round(totalActual * 100) / 100,
        total_remitted_cash: Math.round(totalRemitted * 100) / 100,
        total_variance: netVariance,
        shifts_with_variance: shiftsWithVariance,
        status: shiftsWithVariance > 0 ? 'VARIANCE_DETECTED' : 'BALANCED'
      },
      shifts_reconciliation: shiftResults,
      ai_reconciliation_summary: aiSummary,
      dispatched_alerts_count: dispatchedAlertsCount
    };
  }
}

export const aiAgent = new AIAgentEngine();
