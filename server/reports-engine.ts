import { db } from './db';
import { aiAgent } from './ai-agent';
import {
  UserRole,
  ReportType,
  ReportDatePreset,
  UnifiedReportResponse,
  ReportColumn,
  ReportDashboardSummary
} from '../src/types/index';

export class ReportsEngine {
  // Check role authorization for report types
  public static verifyReportAccess(role: UserRole, type: ReportType): boolean {
    if (role === 'OWNER') return true;
    if (role === 'MANAGER') return true;

    if (role === 'CASHIER' || role === 'CREW') {
      const allowed: ReportType[] = ['sales', 'cashier', 'attendance', 'payroll', 'loyalty', 'kds'];
      return allowed.includes(type);
    }

    if (role === 'WAREHOUSEMAN') {
      const allowed: ReportType[] = ['inventory', 'inventory-history', 'purchasing', 'request-orders', 'deliveries'];
      return allowed.includes(type);
    }

    if (role === 'KITCHEN') {
      return type === 'kds';
    }

    return false;
  }

  // Generate any of the 17 reports
  public static generateReport(
    actorRole: UserRole,
    actorBranchId: string | null,
    actorEmail: string,
    params: {
      type: ReportType;
      period?: ReportDatePreset;
      start_date?: string;
      end_date?: string;
      branch_id?: string;
      sort_by?: string;
      sort_order?: 'asc' | 'desc';
    }
  ): UnifiedReportResponse {
    if (!this.verifyReportAccess(actorRole, params.type)) {
      throw new Error(`Forbidden: Role ${actorRole} is not authorized to access ${params.type} report.`);
    }

    // Strict RLS & Branch Resolution
    let effectiveBranchId: string | null = null;
    let branchName = 'All Branches';

    if (actorRole === 'OWNER') {
      if (params.branch_id && params.branch_id !== 'ALL') {
        effectiveBranchId = params.branch_id;
        const b = db.getBranchById(effectiveBranchId);
        branchName = b ? b.name : 'Unknown Branch';
      }
    } else {
      // Force user's assigned branch for all non-owners
      effectiveBranchId = actorBranchId;
      const b = effectiveBranchId ? db.getBranchById(effectiveBranchId) : null;
      branchName = b ? b.name : 'Assigned Branch';
    }

    const period = params.period || 'TODAY';
    const { start, end } = db.getDateFilterRange(period, params.start_date, params.end_date);
    const startTime = start.getTime();
    const endTime = end.getTime();
    const startDateStr = start.toISOString().split('T')[0];
    const endDateStr = end.toISOString().split('T')[0];
    const nowIso = new Date().toISOString();

    switch (params.type) {
      // 1. SALES REPORT
      case 'sales': {
        const rawSales = db.getSalesTransactions('OWNER', null);
        const filteredSales = rawSales.filter(st => {
          if (effectiveBranchId && st.branch_id !== effectiveBranchId) return false;
          const t = new Date(st.created_at).getTime();
          return t >= startTime && t <= endTime;
        });

        // Compute metrics
        let totalSales = 0;
        let completedOrders = 0;
        let cancelledOrders = 0;
        let voidedOrders = 0;
        let refundedOrders = 0;

        const paymentBreakdown: Record<string, { count: number; amount: number }> = {
          CASH: { count: 0, amount: 0 },
          GCASH: { count: 0, amount: 0 },
          MAYA: { count: 0, amount: 0 },
          QRPH: { count: 0, amount: 0 },
          BANK_TRANSFER: { count: 0, amount: 0 }
        };

        const rows = filteredSales.map(s => {
          if (s.status === 'COMPLETED') {
            totalSales += s.net_amount;
            completedOrders++;
            const method = s.payment_method || 'CASH';
            if (!paymentBreakdown[method]) {
              paymentBreakdown[method] = { count: 0, amount: 0 };
            }
            paymentBreakdown[method].count++;
            paymentBreakdown[method].amount += s.net_amount;
          } else if ((s.status as string) === 'CANCELLED' || s.status === 'VOIDED') {
            voidedOrders++;
          } else if (s.status === 'REFUNDED') {
            refundedOrders++;
          }

          return {
            id: s.id,
            date: s.created_at,
            receipt_number: s.receipt_number,
            branch_name: s.branch_name,
            cashier_name: s.cashier_name,
            source: s.source,
            items_count: s.items_count,
            subtotal: s.gross_amount,
            discount: s.discount_amount,
            net_amount: s.net_amount,
            payment_method: s.payment_method,
            status: s.status
          };
        });

        const totalOrders = rows.length;
        const averageOrderValue = completedOrders > 0 ? totalSales / completedOrders : 0;

        const columns: ReportColumn[] = [
          { id: 'receipt_number', label: 'Receipt #', align: 'left', sortable: true },
          { id: 'date', label: 'Date & Time', format: 'datetime', align: 'left', sortable: true },
          { id: 'branch_name', label: 'Branch', align: 'left', sortable: true },
          { id: 'cashier_name', label: 'Cashier / Crew', align: 'left' },
          { id: 'source', label: 'Channel', format: 'badge', align: 'center' },
          { id: 'items_count', label: 'Items', format: 'number', align: 'center' },
          { id: 'subtotal', label: 'Gross', format: 'currency', align: 'right' },
          { id: 'discount', label: 'Discount', format: 'currency', align: 'right' },
          { id: 'net_amount', label: 'Net Sales', format: 'currency', align: 'right', sortable: true },
          { id: 'payment_method', label: 'Payment', format: 'badge', align: 'center' },
          { id: 'status', label: 'Status', format: 'badge', align: 'center' }
        ];

        return {
          report_type: 'sales',
          report_name: 'Sales Summary Report',
          period,
          start_date: startDateStr,
          end_date: endDateStr,
          branch_id: effectiveBranchId || 'ALL',
          branch_name: branchName,
          generated_at: nowIso,
          generated_by: actorEmail,
          summary: {
            total_sales: totalSales,
            total_orders: totalOrders,
            completed_orders: completedOrders,
            average_order_value: averageOrderValue,
            cancelled_orders: cancelledOrders,
            voided_orders: voidedOrders,
            refunded_orders: refundedOrders,
            payment_breakdown: paymentBreakdown
          },
          columns,
          rows
        };
      }

      // 2. PAYMENT REPORT
      case 'payments': {
        const rawPayments = db.getPayments(actorRole, actorBranchId);
        const filteredPayments = rawPayments.filter(p => {
          if (effectiveBranchId && p.branch_id !== effectiveBranchId) return false;
          const t = new Date(p.created_at).getTime();
          return t >= startTime && t <= endTime;
        });

        const methods: Record<string, { count: number; amount: number }> = {
          CASH: { count: 0, amount: 0 },
          GCASH: { count: 0, amount: 0 },
          MAYA: { count: 0, amount: 0 },
          QRPH: { count: 0, amount: 0 },
          BANK_TRANSFER: { count: 0, amount: 0 }
        };

        let totalPaymentAmount = 0;
        let successfulPaymentsCount = 0;

        const rows = filteredPayments.map(p => {
          const isSuccess = p.status === 'COMPLETED' || p.payment_status === 'PAID' || !p.status;
          if (isSuccess) {
            totalPaymentAmount += p.amount;
            successfulPaymentsCount++;
            const m = p.payment_method;
            if (!methods[m]) methods[m] = { count: 0, amount: 0 };
            methods[m].count++;
            methods[m].amount += p.amount;
          }

          return {
            id: p.id,
            date: p.created_at,
            payment_reference: p.reference_number || p.id.slice(0, 8),
            order_id: p.order_id,
            branch_name: p.branch_name || 'Branch',
            payment_method: p.payment_method,
            amount: p.amount,
            status: p.status || p.payment_status || 'COMPLETED',
            account_number: p.account_number || '-',
            notes: p.notes || '-'
          };
        });

        // Compare payment totals against existing Sales Summary
        const salesSummary = db.getSalesSummary(actorRole, actorBranchId, {
          branch_id: effectiveBranchId || undefined,
          date_preset: period,
          start_date: params.start_date,
          end_date: params.end_date
        });

        const salesTotal = salesSummary.net_sales;
        const discrepancyAmount = Math.round((totalPaymentAmount - salesTotal) * 100) / 100;
        const hasDiscrepancy = Math.abs(discrepancyAmount) > 0.5;

        const columns: ReportColumn[] = [
          { id: 'payment_reference', label: 'Payment Ref', align: 'left' },
          { id: 'date', label: 'Date & Time', format: 'datetime', align: 'left', sortable: true },
          { id: 'branch_name', label: 'Branch', align: 'left' },
          { id: 'payment_method', label: 'Channel', format: 'badge', align: 'center', sortable: true },
          { id: 'amount', label: 'Amount', format: 'currency', align: 'right', sortable: true },
          { id: 'status', label: 'Status', format: 'badge', align: 'center' },
          { id: 'account_number', label: 'Account / Trace', align: 'left' }
        ];

        return {
          report_type: 'payments',
          report_name: 'Payment Audit & Channel Report',
          period,
          start_date: startDateStr,
          end_date: endDateStr,
          branch_id: effectiveBranchId || 'ALL',
          branch_name: branchName,
          generated_at: nowIso,
          generated_by: actorEmail,
          summary: {
            total_payments_recorded: totalPaymentAmount,
            successful_count: successfulPaymentsCount,
            sales_summary_total: salesTotal,
            discrepancy_amount: discrepancyAmount,
            has_discrepancy: hasDiscrepancy,
            methods_breakdown: methods
          },
          columns,
          rows,
          metadata: {
            discrepancy_warning: hasDiscrepancy
              ? `Payment total (₱${totalPaymentAmount.toFixed(2)}) differs from Net Sales (₱${salesTotal.toFixed(2)}) by ₱${discrepancyAmount.toFixed(2)}.`
              : 'Payments match completed sales figures.'
          }
        };
      }

      // 3. PRODUCT SALES REPORT
      case 'products': {
        const rawSales = db.getSalesTransactions('OWNER', null);
        const filteredSales = rawSales.filter(st => {
          if (effectiveBranchId && st.branch_id !== effectiveBranchId) return false;
          if (st.status !== 'COMPLETED') return false;
          const t = new Date(st.created_at).getTime();
          return t >= startTime && t <= endTime;
        });

        const orderIds = new Set(filteredSales.map(s => s.order_id));
        const allOrderItems = db.getOrderItems();

        // Aggregate by Product
        const productStats = new Map<string, {
          product_id: string;
          product_name: string;
          category: string;
          quantity_sold: number;
          gross_sales: number;
          discounts: number;
          net_sales: number;
        }>();

        allOrderItems.forEach(item => {
          if (orderIds.has(item.order_id)) {
            const pid = item.product_id;
            if (!productStats.has(pid)) {
              productStats.set(pid, {
                product_id: pid,
                product_name: item.product_name,
                category: item.category || 'General',
                quantity_sold: 0,
                gross_sales: 0,
                discounts: 0,
                net_sales: 0
              });
            }
            const stat = productStats.get(pid)!;
            const gross = item.unit_price * item.quantity;
            stat.quantity_sold += item.quantity;
            stat.gross_sales += gross;
            stat.net_sales += gross; // specific line discounts when applied
          }
        });

        let rows = Array.from(productStats.values());

        // Sorting
        const sortBy = params.sort_by || 'highest-sales';
        if (sortBy === 'highest-sales') {
          rows.sort((a, b) => b.net_sales - a.net_sales);
        } else if (sortBy === 'lowest-sales') {
          rows.sort((a, b) => a.net_sales - b.net_sales);
        } else if (sortBy === 'highest-quantity') {
          rows.sort((a, b) => b.quantity_sold - a.quantity_sold);
        } else if (sortBy === 'lowest-quantity') {
          rows.sort((a, b) => a.quantity_sold - b.quantity_sold);
        }

        const totalQty = rows.reduce((acc, r) => acc + r.quantity_sold, 0);
        const totalNetSales = rows.reduce((acc, r) => acc + r.net_sales, 0);

        const columns: ReportColumn[] = [
          { id: 'product_name', label: 'Product', align: 'left', sortable: true },
          { id: 'category', label: 'Category', format: 'badge', align: 'center', sortable: true },
          { id: 'quantity_sold', label: 'Quantity Sold', format: 'number', align: 'right', sortable: true },
          { id: 'gross_sales', label: 'Gross Sales', format: 'currency', align: 'right', sortable: true },
          { id: 'discounts', label: 'Discounts', format: 'currency', align: 'right' },
          { id: 'net_sales', label: 'Net Sales', format: 'currency', align: 'right', sortable: true }
        ];

        return {
          report_type: 'products',
          report_name: 'Product Sales Performance Report',
          period,
          start_date: startDateStr,
          end_date: endDateStr,
          branch_id: effectiveBranchId || 'ALL',
          branch_name: branchName,
          generated_at: nowIso,
          generated_by: actorEmail,
          summary: {
            unique_products_sold: rows.length,
            total_quantity_sold: totalQty,
            total_net_sales: totalNetSales
          },
          columns,
          rows
        };
      }

      // 4. BRANCH REPORT (Owner compares branches; manager sees assigned branch)
      case 'branches': {
        const branches = db.getBranches(actorRole, actorBranchId);
        const rawSales = db.getSalesTransactions('OWNER', null).filter(st => {
          const t = new Date(st.created_at).getTime();
          return t >= startTime && t <= endTime && st.status === 'COMPLETED';
        });

        const rawExpenses = db.getExpenses(actorRole, actorBranchId, {
          start_date: startDateStr,
          end_date: endDateStr
        }).filter(e => e.status === 'APPROVED');

        const rows = branches.map(b => {
          const bSales = rawSales.filter(s => s.branch_id === b.id);
          const bExpenses = rawExpenses.filter(e => e.branch_id === b.id);

          const ordersCount = bSales.length;
          const totalSales = bSales.reduce((acc, s) => acc + s.net_amount, 0);
          const avgOrder = ordersCount > 0 ? totalSales / ordersCount : 0;

          const cash = bSales.filter(s => s.payment_method === 'CASH').reduce((acc, s) => acc + s.net_amount, 0);
          const gcash = bSales.filter(s => s.payment_method === 'GCASH').reduce((acc, s) => acc + s.net_amount, 0);
          const maya = bSales.filter(s => s.payment_method === 'MAYA').reduce((acc, s) => acc + s.net_amount, 0);
          const qrph = bSales.filter(s => s.payment_method === 'QRPH').reduce((acc, s) => acc + s.net_amount, 0);
          const bank = bSales.filter(s => s.payment_method === 'BANK_TRANSFER').reduce((acc, s) => acc + s.net_amount, 0);

          const expensesAmount = bExpenses.reduce((acc, e) => acc + e.amount, 0);
          const hasReliableData = true;
          const netFigure = hasReliableData ? totalSales - expensesAmount : null;

          return {
            id: b.id,
            branch_name: b.name,
            code: b.code || b.id.slice(0, 6),
            is_active: b.is_active,
            orders_count: ordersCount,
            total_sales: totalSales,
            average_order: avgOrder,
            cash_sales: cash,
            digital_sales: gcash + maya + qrph + bank,
            total_expenses: expensesAmount,
            net_operating: netFigure !== null ? netFigure : 'Data unavailable'
          };
        });

        rows.sort((a, b) => (typeof b.total_sales === 'number' ? b.total_sales : 0) - (typeof a.total_sales === 'number' ? a.total_sales : 0));

        const grandSales = rows.reduce((acc, r) => acc + r.total_sales, 0);
        const grandOrders = rows.reduce((acc, r) => acc + r.orders_count, 0);
        const grandExpenses = rows.reduce((acc, r) => acc + r.total_expenses, 0);

        const columns: ReportColumn[] = [
          { id: 'branch_name', label: 'Branch Name', align: 'left', sortable: true },
          { id: 'code', label: 'Code', align: 'center' },
          { id: 'orders_count', label: 'Orders', format: 'number', align: 'right', sortable: true },
          { id: 'total_sales', label: 'Gross Sales', format: 'currency', align: 'right', sortable: true },
          { id: 'average_order', label: 'Avg Order', format: 'currency', align: 'right' },
          { id: 'cash_sales', label: 'Cash Sales', format: 'currency', align: 'right' },
          { id: 'digital_sales', label: 'Digital Sales', format: 'currency', align: 'right' },
          { id: 'total_expenses', label: 'Expenses', format: 'currency', align: 'right' },
          { id: 'net_operating', label: 'Net Operating', format: 'currency', align: 'right', sortable: true }
        ];

        return {
          report_type: 'branches',
          report_name: 'Multi-Branch Comparative Financial Report',
          period,
          start_date: startDateStr,
          end_date: endDateStr,
          branch_id: effectiveBranchId || 'ALL',
          branch_name: branchName,
          generated_at: nowIso,
          generated_by: actorEmail,
          summary: {
            total_branches: rows.length,
            grand_total_sales: grandSales,
            grand_total_orders: grandOrders,
            grand_total_expenses: grandExpenses,
            grand_net_operating: grandSales - grandExpenses
          },
          columns,
          rows
        };
      }

      // 5. INVENTORY REPORT
      case 'inventory': {
        const inventoryItems = db.getBranchInventory(actorRole, actorBranchId, effectiveBranchId || undefined);
        const allTransactions = db.getInventoryTransactions(actorRole, actorBranchId, effectiveBranchId || undefined).filter(tx => {
          const t = new Date(tx.created_at).getTime();
          return t >= startTime && t <= endTime;
        });

        // Group transaction movements by ingredient_id
        const txMovementMap = new Map<string, { inQty: number; outQty: number; adjQty: number; transQty: number }>();
        allTransactions.forEach(tx => {
          if (!txMovementMap.has(tx.ingredient_id)) {
            txMovementMap.set(tx.ingredient_id, { inQty: 0, outQty: 0, adjQty: 0, transQty: 0 });
          }
          const m = txMovementMap.get(tx.ingredient_id)!;
          if (tx.transaction_type === 'RECEIVING' || tx.transaction_type === 'STOCK_IN' || tx.transaction_type === 'DELIVERY' || tx.transaction_type === 'TRANSFER') {
            m.inQty += tx.quantity;
          } else if (tx.transaction_type === 'STOCK_OUT' || tx.transaction_type === 'RECIPE_DEDUCTION' || tx.transaction_type === 'TRANSFER_OUT' || tx.transaction_type === 'REJECT') {
            m.outQty += tx.quantity;
          } else if (tx.transaction_type === 'ADJUSTMENT') {
            m.adjQty += tx.quantity;
          }
        });

        let inStockCount = 0;
        let lowStockCount = 0;
        let needsOrderCount = 0;

        const rows = inventoryItems.map(item => {
          let status: 'IN STOCK' | 'LOW STOCK' | 'NEEDS ORDER' = 'IN STOCK';
          if (item.current_stock <= 0) {
            status = 'NEEDS ORDER';
            needsOrderCount++;
          } else if (item.current_stock <= item.reorder_level) {
            status = 'LOW STOCK';
            lowStockCount++;
          } else {
            inStockCount++;
          }

          const movements = txMovementMap.get(item.ingredient_id) || { inQty: 0, outQty: 0, adjQty: 0, transQty: 0 };

          return {
            id: item.id,
            ingredient_name: item.ingredient_name,
            category: item.category || 'Kitchen Goods',
            unit: item.unit,
            current_stock: Math.round(item.current_stock * 100) / 100,
            threshold: item.reorder_level,
            status,
            stock_in: Math.round(movements.inQty * 100) / 100,
            stock_out: Math.round(movements.outQty * 100) / 100,
            adjustments: Math.round(movements.adjQty * 100) / 100,
            current_balance: Math.round(item.current_stock * 100) / 100
          };
        });

        const columns: ReportColumn[] = [
          { id: 'ingredient_name', label: 'Item Name', align: 'left', sortable: true },
          { id: 'category', label: 'Category', format: 'badge', align: 'center' },
          { id: 'unit', label: 'Unit', align: 'center' },
          { id: 'current_stock', label: 'Current Stock', format: 'number', align: 'right', sortable: true },
          { id: 'threshold', label: 'Threshold', format: 'number', align: 'right' },
          { id: 'status', label: 'Stock Status', format: 'badge', align: 'center', sortable: true },
          { id: 'stock_in', label: 'Stock In', format: 'number', align: 'right' },
          { id: 'stock_out', label: 'Stock Out', format: 'number', align: 'right' },
          { id: 'adjustments', label: 'Adjustments', format: 'number', align: 'right' },
          { id: 'current_balance', label: 'Current Balance', format: 'number', align: 'right' }
        ];

        return {
          report_type: 'inventory',
          report_name: 'Branch Inventory & Stock Health Report',
          period,
          start_date: startDateStr,
          end_date: endDateStr,
          branch_id: effectiveBranchId || 'ALL',
          branch_name: branchName,
          generated_at: nowIso,
          generated_by: actorEmail,
          summary: {
            total_items_tracked: rows.length,
            in_stock_count: inStockCount,
            low_stock_count: lowStockCount,
            needs_order_count: needsOrderCount
          },
          columns,
          rows
        };
      }

      // 6. INVENTORY HISTORY (Owner and authorized roles)
      case 'inventory-history': {
        const transactions = db.getInventoryTransactions(actorRole, actorBranchId, effectiveBranchId || undefined).filter(t => {
          const tm = new Date(t.created_at).getTime();
          return tm >= startTime && tm <= endTime;
        });

        const rows = transactions.map(t => ({
          id: t.id,
          date: t.created_at,
          ingredient_name: t.ingredient_name,
          transaction_type: t.transaction_type,
          quantity: t.quantity,
          reference: t.reason || '-',
          branch_name: t.branch_name,
          user_email: t.user_email,
          previous_balance: t.previous_stock,
          new_balance: t.new_stock
        }));

        const columns: ReportColumn[] = [
          { id: 'date', label: 'Date / Time', format: 'datetime', align: 'left', sortable: true },
          { id: 'ingredient_name', label: 'Item', align: 'left', sortable: true },
          { id: 'transaction_type', label: 'Type', format: 'badge', align: 'center', sortable: true },
          { id: 'quantity', label: 'Qty', format: 'number', align: 'right' },
          { id: 'previous_balance', label: 'Prev Balance', format: 'number', align: 'right' },
          { id: 'new_balance', label: 'New Balance', format: 'number', align: 'right' },
          { id: 'branch_name', label: 'Branch / Location', align: 'left' },
          { id: 'reference', label: 'Reference / Reason', align: 'left' },
          { id: 'user_email', label: 'User', align: 'left' }
        ];

        return {
          report_type: 'inventory-history',
          report_name: 'Inventory Movement & Audit Ledger',
          period,
          start_date: startDateStr,
          end_date: endDateStr,
          branch_id: effectiveBranchId || 'ALL',
          branch_name: branchName,
          generated_at: nowIso,
          generated_by: actorEmail,
          summary: {
            total_movements_logged: rows.length
          },
          columns,
          rows
        };
      }

      // 7. PURCHASING REPORT
      case 'purchasing': {
        const pos = db.getPurchaseOrders(actorRole);
        const reqOrders = db.getRequestOrders(actorRole, actorBranchId, {
          branch_id: effectiveBranchId || undefined
        });

        const filteredPOs = pos.filter(p => {
          const t = new Date(p.created_at).getTime();
          return t >= startTime && t <= endTime;
        });

        const filteredReqs = reqOrders.filter(r => {
          const t = new Date(r.request_date).getTime();
          return t >= startTime && t <= endTime;
        });

        const rows = [
          ...filteredPOs.map(p => ({
            id: p.id,
            reference: p.po_number,
            type: 'PO (COMMISSARY)',
            branch: 'Central Warehouse',
            supplier: p.supplier_name,
            items: p.items.map(i => `${i.ingredient_name} (${i.quantity} ${i.unit})`).join(', '),
            total_quantity: p.items.reduce((acc, i) => acc + i.quantity, 0),
            status: p.status,
            amount: p.total_cost || p.total_amount || p.subtotal || 0,
            date: p.created_at
          })),
          ...filteredReqs.map(r => ({
            id: r.id,
            reference: r.request_number,
            type: 'REQ (BRANCH)',
            branch: r.branch_name,
            supplier: 'Central Commissary',
            items: r.items.map(i => `${i.ingredient_name} (${i.requested_quantity} ${i.unit})`).join(', '),
            total_quantity: r.items.reduce((acc, i) => acc + i.requested_quantity, 0),
            status: r.status,
            amount: 0,
            date: r.request_date
          }))
        ];

        rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const totalPoAmount = filteredPOs.reduce((acc, p) => acc + (p.total_cost || p.total_amount || p.subtotal || 0), 0);

        const columns: ReportColumn[] = [
          { id: 'reference', label: 'Reference #', align: 'left', sortable: true },
          { id: 'date', label: 'Date', format: 'date', align: 'left', sortable: true },
          { id: 'type', label: 'Type', format: 'badge', align: 'center' },
          { id: 'branch', label: 'Branch / Dest', align: 'left' },
          { id: 'supplier', label: 'Supplier / Origin', align: 'left' },
          { id: 'items', label: 'Items Ordered', align: 'left' },
          { id: 'total_quantity', label: 'Units', format: 'number', align: 'right' },
          { id: 'amount', label: 'Amount', format: 'currency', align: 'right' },
          { id: 'status', label: 'Status', format: 'badge', align: 'center' }
        ];

        return {
          report_type: 'purchasing',
          report_name: 'Purchasing & Order Procurement Report',
          period,
          start_date: startDateStr,
          end_date: endDateStr,
          branch_id: effectiveBranchId || 'ALL',
          branch_name: branchName,
          generated_at: nowIso,
          generated_by: actorEmail,
          summary: {
            total_purchase_orders: filteredPOs.length,
            total_po_spend: totalPoAmount,
            total_branch_requests: filteredReqs.length
          },
          columns,
          rows
        };
      }

      // 8. REQUEST ORDER REPORT
      case 'request-orders': {
        const reqOrders = db.getRequestOrders(actorRole, actorBranchId, {
          branch_id: effectiveBranchId || undefined
        });

        const filtered = reqOrders.filter(r => {
          const t = new Date(r.request_date).getTime();
          return t >= startTime && t <= endTime;
        });

        const rows = filtered.map(r => ({
          id: r.id,
          request_number: r.request_number,
          branch_name: r.branch_name,
          requester_name: r.requester_name,
          target_date: r.target_fulfillment_date || '-',
          status: r.status,
          total_items: r.items.length,
          total_quantity: r.items.reduce((acc, i) => acc + i.requested_quantity, 0),
          approved_quantity: r.items.reduce((acc, i) => acc + (i.approved_quantity || 0), 0),
          date: r.request_date,
          reviewed_by: r.reviewed_by_name || '-'
        }));

        const columns: ReportColumn[] = [
          { id: 'request_number', label: 'Request #', align: 'left', sortable: true },
          { id: 'date', label: 'Request Date', format: 'datetime', align: 'left', sortable: true },
          { id: 'branch_name', label: 'Branch', align: 'left' },
          { id: 'requester_name', label: 'Requested By', align: 'left' },
          { id: 'total_items', label: 'Line Items', format: 'number', align: 'center' },
          { id: 'total_quantity', label: 'Req Units', format: 'number', align: 'right' },
          { id: 'approved_quantity', label: 'Appr Units', format: 'number', align: 'right' },
          { id: 'status', label: 'Status', format: 'badge', align: 'center' },
          { id: 'reviewed_by', label: 'Reviewed By', align: 'left' }
        ];

        return {
          report_type: 'request-orders',
          report_name: 'Branch Stock Request Orders Report',
          period,
          start_date: startDateStr,
          end_date: endDateStr,
          branch_id: effectiveBranchId || 'ALL',
          branch_name: branchName,
          generated_at: nowIso,
          generated_by: actorEmail,
          summary: {
            total_requests: rows.length,
            pending_requests: rows.filter(r => r.status === 'SUBMITTED').length,
            approved_requests: rows.filter(r => r.status === 'APPROVED').length
          },
          columns,
          rows
        };
      }

      // 9. DELIVERY REPORT
      case 'deliveries': {
        const deliveries = db.getDeliveries(actorRole, actorBranchId, {
          branch_id: effectiveBranchId || undefined
        });

        const filtered = deliveries.filter(d => {
          const t = new Date(d.created_at).getTime();
          return t >= startTime && t <= endTime;
        });

        const rows = filtered.map(d => {
          const reqQty = d.items.reduce((acc, i) => acc + i.requested_quantity, 0);
          const appQty = d.items.reduce((acc, i) => acc + i.approved_quantity, 0);
          const prepQty = d.items.reduce((acc, i) => acc + i.prepared_quantity, 0);
          const delQty = d.items.reduce((acc, i) => acc + i.delivered_quantity, 0);
          const recQty = d.items.reduce((acc, i) => acc + i.received_quantity, 0);
          const shortQty = d.items.reduce((acc, i) => acc + (i.short_quantity || 0), 0);

          return {
            id: d.id,
            delivery_number: d.delivery_number,
            request_number: d.request_number,
            origin: d.origin_warehouse_name || d.source_warehouse_name || 'Central Commissary',
            destination_branch: d.destination_branch_name,
            dispatched_at: d.dispatched_at || '-',
            received_at: d.received_at || '-',
            status: d.status,
            requested_qty: reqQty,
            approved_qty: appQty,
            prepared_qty: prepQty,
            delivered_qty: delQty,
            received_qty: recQty,
            short_qty: shortQty,
            is_partial: d.status === 'PARTIALLY_DELIVERED' || shortQty > 0
          };
        });

        const columns: ReportColumn[] = [
          { id: 'delivery_number', label: 'Delivery #', align: 'left', sortable: true },
          { id: 'request_number', label: 'Request #', align: 'left' },
          { id: 'destination_branch', label: 'Destination Branch', align: 'left' },
          { id: 'dispatched_at', label: 'Dispatched', format: 'datetime', align: 'left' },
          { id: 'received_at', label: 'Received', format: 'datetime', align: 'left' },
          { id: 'status', label: 'Delivery Status', format: 'badge', align: 'center' },
          { id: 'requested_qty', label: 'Requested', format: 'number', align: 'right' },
          { id: 'approved_qty', label: 'Approved', format: 'number', align: 'right' },
          { id: 'delivered_qty', label: 'Delivered', format: 'number', align: 'right' },
          { id: 'received_qty', label: 'Received', format: 'number', align: 'right' },
          { id: 'short_qty', label: 'Shortage', format: 'number', align: 'right', sortable: true }
        ];

        return {
          report_type: 'deliveries',
          report_name: 'Logistics & Commissary Delivery Fulfillment Report',
          period,
          start_date: startDateStr,
          end_date: endDateStr,
          branch_id: effectiveBranchId || 'ALL',
          branch_name: branchName,
          generated_at: nowIso,
          generated_by: actorEmail,
          summary: {
            total_deliveries: rows.length,
            completed_deliveries: rows.filter(r => r.status === 'DELIVERED').length,
            partial_deliveries: rows.filter(r => r.is_partial).length,
            total_shortage_units: rows.reduce((acc, r) => acc + r.short_qty, 0)
          },
          columns,
          rows
        };
      }

      // 10. CASHIER REPORT
      case 'cashier': {
        const shifts = db.getCashierShifts(actorRole, actorBranchId, {
          branch_id: effectiveBranchId || undefined,
          start_date: startDateStr,
          end_date: endDateStr
        });

        const remittances = db.getRemittances(actorRole, actorBranchId, {
          branch_id: effectiveBranchId || undefined,
          start_date: startDateStr,
          end_date: endDateStr
        });

        const remMap = new Map<string, typeof remittances[0]>();
        remittances.forEach(r => remMap.set(r.shift_id, r));

        const rows = shifts.map(s => {
          const rem = remMap.get(s.id);
          const variance = s.variance || 0;

          return {
            id: s.id,
            cashier_name: s.cashier_name,
            branch_name: s.branch_name,
            shift_number: s.shift_number,
            opened_at: s.opened_at,
            closed_at: s.closed_at || 'Active Shift',
            opening_cash: s.opening_cash,
            expected_cash: s.expected_cash,
            actual_cash: s.actual_cash !== null ? s.actual_cash : s.expected_cash,
            remittance_amount: rem ? rem.remitted_amount : 0,
            remittance_status: rem ? rem.status : 'PENDING_REMITTANCE',
            variance,
            status: s.status
          };
        });

        const totalExpected = rows.reduce((acc, r) => acc + r.expected_cash, 0);
        const totalActual = rows.reduce((acc, r) => acc + r.actual_cash, 0);
        const totalVariance = totalActual - totalExpected;

        const columns: ReportColumn[] = [
          { id: 'cashier_name', label: 'Cashier Name', align: 'left', sortable: true },
          { id: 'branch_name', label: 'Branch', align: 'left' },
          { id: 'shift_number', label: 'Shift #', align: 'left' },
          { id: 'opened_at', label: 'Opened At', format: 'datetime', align: 'left' },
          { id: 'opening_cash', label: 'Opening Cash', format: 'currency', align: 'right' },
          { id: 'expected_cash', label: 'Expected Cash', format: 'currency', align: 'right' },
          { id: 'actual_cash', label: 'Actual Cash', format: 'currency', align: 'right' },
          { id: 'remittance_amount', label: 'Remitted', format: 'currency', align: 'right' },
          { id: 'variance', label: 'Variance', format: 'currency', align: 'right', sortable: true },
          { id: 'remittance_status', label: 'Remittance Status', format: 'badge', align: 'center' }
        ];

        return {
          report_type: 'cashier',
          report_name: 'Cashier Shift & Drawer Remittance Report',
          period,
          start_date: startDateStr,
          end_date: endDateStr,
          branch_id: effectiveBranchId || 'ALL',
          branch_name: branchName,
          generated_at: nowIso,
          generated_by: actorEmail,
          summary: {
            total_shifts: rows.length,
            total_expected_cash: totalExpected,
            total_actual_cash: totalActual,
            total_variance: totalVariance,
            shifts_with_variance: rows.filter(r => Math.abs(r.variance) > 0).length
          },
          columns,
          rows
        };
      }

      // 11. EXPENSE REPORT
      case 'expenses': {
        const expenses = db.getExpenses(actorRole, actorBranchId, {
          branch_id: effectiveBranchId || undefined,
          start_date: startDateStr,
          end_date: endDateStr
        });

        const categoryTotals: Record<string, number> = {};
        let totalExpenses = 0;

        const rows = expenses.map(e => {
          totalExpenses += e.amount;
          categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;

          return {
            id: e.id,
            expense_number: e.expense_number,
            date: e.date,
            branch_name: e.branch_name,
            category: e.category,
            description: e.description,
            amount: e.amount,
            payment_method: e.payment_method,
            status: e.status,
            recorded_by: e.created_by_name || 'Staff',
            approved_by: e.approved_by_name || '-'
          };
        });

        const columns: ReportColumn[] = [
          { id: 'date', label: 'Date', format: 'date', align: 'left', sortable: true },
          { id: 'expense_number', label: 'Expense #', align: 'left' },
          { id: 'branch_name', label: 'Branch', align: 'left' },
          { id: 'category', label: 'Category', format: 'badge', align: 'center', sortable: true },
          { id: 'description', label: 'Description', align: 'left' },
          { id: 'amount', label: 'Amount', format: 'currency', align: 'right', sortable: true },
          { id: 'payment_method', label: 'Payment', format: 'badge', align: 'center' },
          { id: 'recorded_by', label: 'Recorded By', align: 'left' },
          { id: 'status', label: 'Status', format: 'badge', align: 'center' }
        ];

        return {
          report_type: 'expenses',
          report_name: 'Operational Expenses Audit Report',
          period,
          start_date: startDateStr,
          end_date: endDateStr,
          branch_id: effectiveBranchId || 'ALL',
          branch_name: branchName,
          generated_at: nowIso,
          generated_by: actorEmail,
          summary: {
            total_expenses: totalExpenses,
            count: rows.length,
            category_breakdown: categoryTotals
          },
          columns,
          rows
        };
      }

      // 12. RECONCILIATION REPORT
      case 'reconciliation': {
        const recons = db.getFinancialReconciliation(actorRole, actorBranchId, {
          branch_id: effectiveBranchId || undefined,
          date_preset: period,
          start_date: params.start_date,
          end_date: params.end_date
        });

        const rows = recons.map(r => ({
          id: r.id,
          date: r.date,
          branch_name: r.branch_name,
          net_sales: r.net_sales,
          payment_total: r.payment_total,
          expected_cash: r.expected_cash,
          actual_cash: r.actual_cash,
          remitted_amount: r.remitted_amount,
          expenses: r.approved_expenses,
          sales_vs_payments_variance: r.sales_vs_payments_variance,
          cash_variance: r.cash_variance,
          status: r.status,
          is_reconciled: r.is_reconciled ? 'YES' : 'PENDING'
        }));

        const totalSales = rows.reduce((acc, r) => acc + r.net_sales, 0);
        const totalPayments = rows.reduce((acc, r) => acc + r.payment_total, 0);
        const totalExpected = rows.reduce((acc, r) => acc + r.expected_cash, 0);
        const totalActual = rows.reduce((acc, r) => acc + r.actual_cash, 0);
        const netVariance = totalActual - totalExpected;

        const columns: ReportColumn[] = [
          { id: 'date', label: 'Date', format: 'date', align: 'left', sortable: true },
          { id: 'branch_name', label: 'Branch', align: 'left' },
          { id: 'net_sales', label: 'Net Sales', format: 'currency', align: 'right' },
          { id: 'payment_total', label: 'Total Payments', format: 'currency', align: 'right' },
          { id: 'expected_cash', label: 'Expected Cash', format: 'currency', align: 'right' },
          { id: 'actual_cash', label: 'Actual Cash', format: 'currency', align: 'right' },
          { id: 'remitted_amount', label: 'Remitted', format: 'currency', align: 'right' },
          { id: 'expenses', label: 'Expenses', format: 'currency', align: 'right' },
          { id: 'cash_variance', label: 'Variance', format: 'currency', align: 'right', sortable: true },
          { id: 'status', label: 'Balance State', format: 'badge', align: 'center' }
        ];

        return {
          report_type: 'reconciliation',
          report_name: 'Financial Multi-Source Reconciliation Report',
          period,
          start_date: startDateStr,
          end_date: endDateStr,
          branch_id: effectiveBranchId || 'ALL',
          branch_name: branchName,
          generated_at: nowIso,
          generated_by: actorEmail,
          summary: {
            total_net_sales: totalSales,
            total_payments: totalPayments,
            total_expected_cash: totalExpected,
            total_actual_cash: totalActual,
            total_cash_variance: netVariance,
            unbalanced_days_count: rows.filter(r => r.status !== 'BALANCED').length
          },
          columns,
          rows
        };
      }

      // 13. ATTENDANCE REPORT
      case 'attendance': {
        const attendanceList = db.getAttendance(actorRole, actorBranchId, 'SYSTEM', {
          branch_id: effectiveBranchId || undefined,
          start_date: startDateStr,
          end_date: endDateStr
        });

        const rows = attendanceList.map(a => {
          let status: 'COMPLETE' | 'INCOMPLETE' | 'MISSING CLOCK OUT' | 'MISSING CLOCK IN' = 'COMPLETE';
          if (!a.clock_in) status = 'MISSING CLOCK IN';
          else if (!a.clock_out) status = 'MISSING CLOCK OUT';
          else if ((a.payable_hours || 0) <= 0 && a.total_minutes <= 0) status = 'INCOMPLETE';

          const elapsedHrs = a.gross_hours !== undefined ? a.gross_hours : (a.total_minutes ? Math.round((a.total_minutes / 60) * 10) / 10 : 0);
          const breakHrs = a.deducted_break_hours || (elapsedHrs >= 5 ? 1 : 0);
          const payHrs = a.payable_hours !== undefined ? a.payable_hours : Math.max(0, elapsedHrs - breakHrs);

          return {
            id: a.id,
            employee_name: a.employee_name || 'Employee',
            role: a.employee_role || a.role || 'CREW',
            branch_name: a.branch_name || 'Branch',
            date: a.date,
            clock_in: a.clock_in || '-',
            clock_out: a.clock_out || 'Active Shift',
            elapsed_hours: elapsedHrs,
            break_deduction: breakHrs,
            payable_hours: payHrs,
            status
          };
        });

        const totalPayableHours = rows.reduce((acc, r) => acc + r.payable_hours, 0);

        const columns: ReportColumn[] = [
          { id: 'date', label: 'Date', format: 'date', align: 'left', sortable: true },
          { id: 'employee_name', label: 'Employee', align: 'left', sortable: true },
          { id: 'role', label: 'Role', format: 'badge', align: 'center' },
          { id: 'branch_name', label: 'Branch', align: 'left' },
          { id: 'clock_in', label: 'Clock In', format: 'datetime', align: 'left' },
          { id: 'clock_out', label: 'Clock Out', format: 'datetime', align: 'left' },
          { id: 'elapsed_hours', label: 'Elapsed (Hrs)', format: 'number', align: 'right' },
          { id: 'break_deduction', label: 'Break (Hrs)', format: 'number', align: 'right' },
          { id: 'payable_hours', label: 'Payable (Hrs)', format: 'number', align: 'right', sortable: true },
          { id: 'status', label: 'Status', format: 'badge', align: 'center' }
        ];

        return {
          report_type: 'attendance',
          report_name: 'Employee Attendance & Shift Hours Report',
          period,
          start_date: startDateStr,
          end_date: endDateStr,
          branch_id: effectiveBranchId || 'ALL',
          branch_name: branchName,
          generated_at: nowIso,
          generated_by: actorEmail,
          summary: {
            total_records: rows.length,
            total_payable_hours: totalPayableHours,
            missing_clock_out_count: rows.filter(r => r.status === 'MISSING CLOCK OUT').length
          },
          columns,
          rows
        };
      }

      // 14. PAYROLL REPORT
      case 'payroll': {
        const payrollList = db.getPayrollRecords(actorRole, actorBranchId, 'SYSTEM', {
          branch_id: effectiveBranchId || undefined
        });

        // Filter by period date overlap if created_at in range
        const rows = payrollList.map(p => ({
          id: p.id,
          employee_name: p.employee_name,
          role: p.employee_role,
          branch_name: p.branch_name,
          period_name: p.period_name || 'Payroll Cycle',
          payable_hours: p.payable_hours,
          rate_applied: p.payable_hours > 0 ? (p.gross_payable_amount / p.payable_hours) : 0,
          gross_pay: p.gross_payable_amount,
          adjustments: p.adjustments,
          final_pay: p.final_amount,
          status: p.status
        }));

        const totalPayout = rows.reduce((acc, r) => acc + r.final_pay, 0);

        const columns: ReportColumn[] = [
          { id: 'employee_name', label: 'Employee', align: 'left', sortable: true },
          { id: 'role', label: 'Role', format: 'badge', align: 'center' },
          { id: 'branch_name', label: 'Branch', align: 'left' },
          { id: 'period_name', label: 'Period', align: 'left' },
          { id: 'payable_hours', label: 'Hours', format: 'number', align: 'right' },
          { id: 'rate_applied', label: 'Rate/Hr', format: 'currency', align: 'right' },
          { id: 'gross_pay', label: 'Gross Pay', format: 'currency', align: 'right' },
          { id: 'adjustments', label: 'Adjustments', format: 'currency', align: 'right' },
          { id: 'final_pay', label: 'Final Net Pay', format: 'currency', align: 'right', sortable: true },
          { id: 'status', label: 'Status', format: 'badge', align: 'center' }
        ];

        return {
          report_type: 'payroll',
          report_name: 'Payroll Disbursements & Wage Ledger Report',
          period,
          start_date: startDateStr,
          end_date: endDateStr,
          branch_id: effectiveBranchId || 'ALL',
          branch_name: branchName,
          generated_at: nowIso,
          generated_by: actorEmail,
          summary: {
            total_records: rows.length,
            total_disbursements: totalPayout
          },
          columns,
          rows
        };
      }

      // 15. LOYALTY REPORT
      case 'loyalty': {
        const customers = db.getLoyaltyCustomers(actorRole, actorBranchId, {
          branch_id: effectiveBranchId || undefined
        });

        const transactions = db.getLoyaltyTransactions(actorRole, actorBranchId, {
          branch_id: effectiveBranchId || undefined
        });

        const redemptions = db.getLoyaltyRedemptions(actorRole, actorBranchId, {
          branch_id: effectiveBranchId || undefined
        });

        // Compute points earned and redeemed per customer in period
        const custTxMap = new Map<string, { earned: number; redeemed: number; redemptionsCount: number }>();
        transactions.forEach(tx => {
          const t = new Date(tx.created_at).getTime();
          if (t >= startTime && t <= endTime) {
            if (!custTxMap.has(tx.customer_id)) {
              custTxMap.set(tx.customer_id, { earned: 0, redeemed: 0, redemptionsCount: 0 });
            }
            const s = custTxMap.get(tx.customer_id)!;
            if (tx.transaction_type === 'EARN') s.earned += tx.points;
            else if (tx.transaction_type === 'REDEEM') s.redeemed += tx.points;
          }
        });

        redemptions.forEach(r => {
          const t = new Date(r.redeemed_at).getTime();
          if (t >= startTime && t <= endTime) {
            if (!custTxMap.has(r.customer_id)) {
              custTxMap.set(r.customer_id, { earned: 0, redeemed: 0, redemptionsCount: 0 });
            }
            custTxMap.get(r.customer_id)!.redemptionsCount++;
          }
        });

        const rows = customers.map(c => {
          const txs = custTxMap.get(c.id) || { earned: 0, redeemed: 0, redemptionsCount: 0 };
          return {
            id: c.id,
            customer_name: c.customer_name || c.name || 'Customer',
            phone: c.phone_number || c.phone || '-',
            branch_name: c.registered_branch_name || 'Main',
            points_earned: txs.earned,
            points_redeemed: txs.redeemed,
            current_balance: c.current_points ?? c.points_balance ?? 0,
            redemptions: txs.redemptionsCount
          };
        });

        const columns: ReportColumn[] = [
          { id: 'customer_name', label: 'Customer Name', align: 'left', sortable: true },
          { id: 'phone', label: 'Phone Number', align: 'left' },
          { id: 'branch_name', label: 'Registered Branch', align: 'left' },
          { id: 'points_earned', label: 'Points Earned', format: 'number', align: 'right', sortable: true },
          { id: 'points_redeemed', label: 'Points Redeemed', format: 'number', align: 'right', sortable: true },
          { id: 'current_balance', label: 'Current Balance', format: 'number', align: 'right', sortable: true },
          { id: 'redemptions', label: 'Rewards Claimed', format: 'number', align: 'center' }
        ];

        return {
          report_type: 'loyalty',
          report_name: 'Customer Loyalty & Points Rewards Report',
          period,
          start_date: startDateStr,
          end_date: endDateStr,
          branch_id: effectiveBranchId || 'ALL',
          branch_name: branchName,
          generated_at: nowIso,
          generated_by: actorEmail,
          summary: {
            total_customers_enrolled: rows.length,
            total_points_earned_in_period: rows.reduce((acc, r) => acc + r.points_earned, 0),
            total_points_redeemed_in_period: rows.reduce((acc, r) => acc + r.points_redeemed, 0)
          },
          columns,
          rows
        };
      }

      // 16. KDS REPORT
      case 'kds': {
        const rawOrders = db.getRawOrders();
        const filteredOrders = rawOrders.filter(o => {
          if (effectiveBranchId && o.branch_id !== effectiveBranchId) return false;
          const t = new Date(o.created_at).getTime();
          return t >= startTime && t <= endTime;
        });

        let normalCount = 0;
        let delayedCount = 0;
        let over15MinCount = 0;

        const rows = filteredOrders.map(o => {
          const orderTime = new Date(o.created_at).getTime();
          const readyTime = o.ready_at ? new Date(o.ready_at).getTime() : (o.completed_at ? new Date(o.completed_at).getTime() : nowIso ? new Date(nowIso).getTime() : orderTime);
          const durationMins = Math.max(0, Math.round(((readyTime - orderTime) / 60000) * 10) / 10);

          let speedFlag = 'Normal (<10m)';
          if (durationMins >= 15) {
            speedFlag = '15+ Min Delayed';
            over15MinCount++;
          } else if (durationMins >= 10) {
            speedFlag = 'Delayed (10-14m)';
            delayedCount++;
          } else {
            normalCount++;
          }

          return {
            id: o.id,
            order_number: o.order_number,
            branch_name: o.branch_name,
            source: o.source,
            order_time: o.created_at,
            preparing_time: o.started_at || o.preparing_at || '-',
            ready_time: o.ready_at || '-',
            delivered_time: o.completed_at || o.delivered_at || '-',
            duration_minutes: durationMins,
            status: o.kitchen_status || o.status,
            speed_flag: speedFlag
          };
        });

        rows.sort((a, b) => b.duration_minutes - a.duration_minutes);

        const avgDuration = rows.length > 0 ? rows.reduce((acc, r) => acc + r.duration_minutes, 0) / rows.length : 0;

        const columns: ReportColumn[] = [
          { id: 'order_number', label: 'Order #', align: 'left', sortable: true },
          { id: 'order_time', label: 'Order Placed', format: 'datetime', align: 'left' },
          { id: 'branch_name', label: 'Branch', align: 'left' },
          { id: 'source', label: 'Channel', format: 'badge', align: 'center' },
          { id: 'duration_minutes', label: 'Prep Time (Mins)', format: 'number', align: 'right', sortable: true },
          { id: 'speed_flag', label: 'KDS Benchmark', format: 'badge', align: 'center', sortable: true },
          { id: 'status', label: 'Kitchen Status', format: 'badge', align: 'center' }
        ];

        return {
          report_type: 'kds',
          report_name: 'Kitchen Display (KDS) Speed of Service Report',
          period,
          start_date: startDateStr,
          end_date: endDateStr,
          branch_id: effectiveBranchId || 'ALL',
          branch_name: branchName,
          generated_at: nowIso,
          generated_by: actorEmail,
          summary: {
            total_orders_tracked: rows.length,
            average_prep_minutes: Math.round(avgDuration * 10) / 10,
            normal_orders_count: normalCount,
            delayed_orders_count: delayedCount,
            over_15_minutes_count: over15MinCount
          },
          columns,
          rows
        };
      }

      // 17. AUDIT LOG REPORT
      case 'audit': {
        const rawLogs = db.getAuditLogs(actorRole, actorBranchId, 'SYSTEM');
        const filtered = rawLogs.filter(l => {
          if (effectiveBranchId && l.branch_id && l.branch_id !== effectiveBranchId) return false;
          const t = new Date(l.timestamp).getTime();
          return t >= startTime && t <= endTime;
        });

        const rows = filtered.map(l => ({
          id: l.id,
          timestamp: l.timestamp,
          user_email: l.user_email,
          role: l.role,
          branch_id: l.branch_id || 'System / Global',
          module: l.entity_type,
          action: l.action,
          record_id: l.entity_id || '-',
          details: JSON.stringify(l.metadata || {})
        }));

        const columns: ReportColumn[] = [
          { id: 'timestamp', label: 'Date / Time', format: 'datetime', align: 'left', sortable: true },
          { id: 'user_email', label: 'User', align: 'left', sortable: true },
          { id: 'role', label: 'Role', format: 'badge', align: 'center' },
          { id: 'module', label: 'Module', format: 'badge', align: 'center', sortable: true },
          { id: 'action', label: 'Action', align: 'left', sortable: true },
          { id: 'record_id', label: 'Record ID', align: 'left' },
          { id: 'details', label: 'Metadata / Changes', align: 'left' }
        ];

        return {
          report_type: 'audit',
          report_name: 'System Security & Transaction Audit Log Report',
          period,
          start_date: startDateStr,
          end_date: endDateStr,
          branch_id: effectiveBranchId || 'ALL',
          branch_name: branchName,
          generated_at: nowIso,
          generated_by: actorEmail,
          summary: {
            total_audit_events: rows.length
          },
          columns,
          rows
        };
      }

      // 18. AI REPORT
      case 'ai': {
        const rawAlerts = aiAgent.getAIAlerts(actorRole, actorBranchId);
        const filtered = rawAlerts.filter(a => {
          if (effectiveBranchId && a.branch_id && a.branch_id !== effectiveBranchId && a.branch_id !== 'ALL') return false;
          const t = new Date(a.date_time || a.created_at || Date.now()).getTime();
          return t >= startTime && t <= endTime;
        });

        const rows = filtered.map(a => ({
          id: a.id,
          date: a.date_time || a.created_at || nowIso,
          title: a.title,
          severity: a.priority,
          branch_name: a.branch_name,
          source: a.category,
          status: a.status,
          recommendation: a.recommended_action || '-',
          resolution: a.notes || '-'
        }));

        const columns: ReportColumn[] = [
          { id: 'date', label: 'Detected At', format: 'datetime', align: 'left', sortable: true },
          { id: 'title', label: 'Alert Title', align: 'left', sortable: true },
          { id: 'severity', label: 'Severity', format: 'badge', align: 'center', sortable: true },
          { id: 'branch_name', label: 'Branch', align: 'left' },
          { id: 'source', label: 'Source Module', format: 'badge', align: 'center' },
          { id: 'status', label: 'Status', format: 'badge', align: 'center', sortable: true },
          { id: 'recommendation', label: 'AI Recommendation', align: 'left' }
        ];

        return {
          report_type: 'ai',
          report_name: 'Autonomous AI Anomaly & Audit Exceptions Report',
          period,
          start_date: startDateStr,
          end_date: endDateStr,
          branch_id: effectiveBranchId || 'ALL',
          branch_name: branchName,
          generated_at: nowIso,
          generated_by: actorEmail,
          summary: {
            total_alerts_detected: rows.length,
            critical_alerts: rows.filter(r => r.severity === 'CRITICAL').length,
            resolved_alerts: rows.filter(r => r.status === 'RESOLVED').length
          },
          columns,
          rows
        };
      }

      default:
        throw new Error(`Unsupported report type: ${params.type}`);
    }
  }

  // Generate Report Center 9-card dashboard summary
  public static getDashboardSummary(
    actorRole: UserRole,
    actorBranchId: string | null,
    params: {
      period?: ReportDatePreset;
      start_date?: string;
      end_date?: string;
      branch_id?: string;
    }
  ): ReportDashboardSummary {
    let effectiveBranchId: string | null = null;
    let branchName = 'All Branches';

    if (actorRole === 'OWNER') {
      if (params.branch_id && params.branch_id !== 'ALL') {
        effectiveBranchId = params.branch_id;
        const b = db.getBranchById(effectiveBranchId);
        branchName = b ? b.name : 'Unknown Branch';
      }
    } else {
      effectiveBranchId = actorBranchId;
      const b = effectiveBranchId ? db.getBranchById(effectiveBranchId) : null;
      branchName = b ? b.name : 'Assigned Branch';
    }

    const period = params.period || 'TODAY';
    const { start, end } = db.getDateFilterRange(period, params.start_date, params.end_date);
    const startTime = start.getTime();
    const endTime = end.getTime();
    const startDateStr = start.toISOString().split('T')[0];
    const endDateStr = end.toISOString().split('T')[0];

    // 1. Total Sales & Orders
    const sales = db.getSalesTransactions('OWNER', null).filter(s => {
      if (effectiveBranchId && s.branch_id !== effectiveBranchId) return false;
      const t = new Date(s.created_at).getTime();
      return t >= startTime && t <= endTime && s.status === 'COMPLETED';
    });
    const totalSales = sales.reduce((acc, s) => acc + s.net_amount, 0);
    const ordersCount = sales.length;

    // 2. Low Stock Count
    const inventory = db.getBranchInventory(actorRole, actorBranchId, effectiveBranchId || undefined);
    const lowStockCount = inventory.filter(i => i.current_stock <= i.reorder_level).length;

    // 3. Pending Requests
    const reqs = db.getRequestOrders(actorRole, actorBranchId, {
      branch_id: effectiveBranchId || undefined
    });
    const pendingRequestsCount = reqs.filter(r => r.status === 'SUBMITTED').length;

    // 4. Cash Variances
    const shifts = db.getCashierShifts(actorRole, actorBranchId, {
      branch_id: effectiveBranchId || undefined,
      start_date: startDateStr,
      end_date: endDateStr
    });
    const cashVariancesCount = shifts.filter(s => s.variance && Math.abs(s.variance) > 0).length;

    // 5. Payroll Alerts
    const payrollRecords = db.getPayrollRecords(actorRole, actorBranchId, 'SYSTEM', {
      branch_id: effectiveBranchId || undefined
    });
    const payrollAlertsCount = payrollRecords.filter(p => p.status === 'DRAFT' || p.status === 'FOR_REVIEW').length;

    // 6. Loyalty Redemptions
    const redemptions = db.getLoyaltyRedemptions(actorRole, actorBranchId, {
      branch_id: effectiveBranchId || undefined
    });
    const loyaltyRedemptionsCount = redemptions.filter(r => {
      const t = new Date(r.redeemed_at).getTime();
      return t >= startTime && t <= endTime;
    }).length;

    // 7. Kitchen Delays (10+ minutes)
    const rawOrders = db.getRawOrders().filter(o => {
      if (effectiveBranchId && o.branch_id !== effectiveBranchId) return false;
      const t = new Date(o.created_at).getTime();
      return t >= startTime && t <= endTime;
    });
    const kitchenDelaysCount = rawOrders.filter(o => {
      const orderTime = new Date(o.created_at).getTime();
      const readyTime = o.ready_at ? new Date(o.ready_at).getTime() : Date.now();
      const mins = (readyTime - orderTime) / 60000;
      return mins >= 10;
    }).length;

    // 8. Audit Alerts
    const alerts = aiAgent.getAIAlerts(actorRole, actorBranchId).filter(a => {
      if (effectiveBranchId && a.branch_id && a.branch_id !== effectiveBranchId && a.branch_id !== 'ALL') return false;
      return a.status !== 'RESOLVED';
    });
    const auditAlertsCount = alerts.length;

    return {
      period,
      branch_id: effectiveBranchId || 'ALL',
      branch_name: branchName,
      total_sales: totalSales,
      orders_count: ordersCount,
      low_stock_count: lowStockCount,
      pending_requests_count: pendingRequestsCount,
      cash_variances_count: cashVariancesCount,
      payroll_alerts_count: payrollAlertsCount,
      loyalty_redemptions_count: loyaltyRedemptionsCount,
      kitchen_delays_count: kitchenDelaysCount,
      audit_alerts_count: auditAlertsCount
    };
  }
}
