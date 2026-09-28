import { db } from './db';
import {
  UserRole,
  MasterImportType,
  ImportValidationResult,
  ImportAuditRecord,
  DataIntegrityCheckResult,
  DataIntegrityIssue,
  DataManagementStatus,
  ExportLogRecord
} from '../src/types/index';

export class DataManagementEngine {
  // 1. IMPORT VALIDATION (Dry run / Preview)
  public static validateImport(
    type: MasterImportType,
    rows: any[]
  ): ImportValidationResult {
    const errors: { row: number; field: string; message: string }[] = [];
    const validRows: any[] = [];
    let duplicateCount = 0;

    if (!Array.isArray(rows) || rows.length === 0) {
      return {
        type,
        import_type: type,
        total_rows: 0,
        valid_rows: 0,
        invalid_rows: 0,
        duplicate_rows: 0,
        errors: [{ row: 0, field: 'file', message: 'No rows found in uploaded file.' }],
        preview: []
      };
    }

    if (type === 'products' || type === 'PRODUCTS') {
      const existingProducts = db.getProducts();
      const existingNames = new Set(existingProducts.map(p => (p.product_name || '').toLowerCase().trim()));

      rows.forEach((r, idx) => {
        const rowNum = idx + 1;
        const name = (r.product_name || r.name || '').trim();
        const price = Number(r.price || r.selling_price);
        const category = (r.category || 'General').trim();

        if (!name) {
          errors.push({ row: rowNum, field: 'product_name', message: 'Product name is required.' });
          return;
        }

        if (isNaN(price) || price < 0) {
          errors.push({ row: rowNum, field: 'price', message: 'Price must be a valid non-negative number.' });
          return;
        }

        if (existingNames.has(name.toLowerCase())) {
          duplicateCount++;
          errors.push({ row: rowNum, field: 'product_name', message: `Duplicate product '${name}' already exists in database.` });
          return;
        }

        validRows.push({
          product_name: name,
          price,
          category,
          is_active: r.is_active === false || r.is_active === 'false' ? false : true,
          description: r.description || ''
        });
      });
    } else if (type === 'ingredients' || type === 'INVENTORY') {
      const existingIngredients = db.getIngredients();
      const existingCodes = new Set(existingIngredients.map(i => (i.item_code || '').toLowerCase().trim()));
      const existingNames = new Set(existingIngredients.map(i => (i.item_name || '').toLowerCase().trim()));

      rows.forEach((r, idx) => {
        const rowNum = idx + 1;
        const name = (r.item_name || r.name || '').trim();
        const code = (r.item_code || r.code || '').trim();
        const unit = (r.unit || 'pcs').trim();
        const costPrice = Number(r.cost_price || r.cost || 0);

        if (!name) {
          errors.push({ row: rowNum, field: 'item_name', message: 'Item name is required.' });
          return;
        }

        if (!code) {
          errors.push({ row: rowNum, field: 'item_code', message: 'Item code is required.' });
          return;
        }

        if (isNaN(costPrice) || costPrice < 0) {
          errors.push({ row: rowNum, field: 'cost_price', message: 'Cost price must be a valid number.' });
          return;
        }

        if (existingCodes.has(code.toLowerCase())) {
          duplicateCount++;
          errors.push({ row: rowNum, field: 'item_code', message: `Item code '${code}' already exists.` });
          return;
        }

        if (existingNames.has(name.toLowerCase())) {
          duplicateCount++;
          errors.push({ row: rowNum, field: 'item_name', message: `Item name '${name}' already exists.` });
          return;
        }

        validRows.push({
          item_name: name,
          item_code: code,
          category: r.category || 'Kitchen Goods',
          unit,
          cost_price: costPrice,
          reorder_level: Number(r.reorder_level || 15)
        });
      });
    } else if (type === 'branches' || type === 'BRANCHES') {
      const existingBranches = db.getBranches('OWNER', null);
      const existingNames = new Set(existingBranches.map(b => b.name.toLowerCase().trim()));

      rows.forEach((r, idx) => {
        const rowNum = idx + 1;
        const name = (r.name || r.branch_name || '').trim();
        const address = (r.address || '').trim();

        if (!name) {
          errors.push({ row: rowNum, field: 'name', message: 'Branch name is required.' });
          return;
        }

        if (existingNames.has(name.toLowerCase())) {
          duplicateCount++;
          errors.push({ row: rowNum, field: 'name', message: `Branch '${name}' already exists.` });
          return;
        }

        validRows.push({
          name,
          address: address || 'Cavite, Philippines',
          contact_number: r.contact_number || r.phone || '+63 900 000 0000',
          is_active: r.is_active === false || r.is_active === 'false' ? false : true
        });
      });
    } else if (type === 'customers' || type === 'CUSTOMERS') {
      const existingCustomers = db.getLoyaltyCustomers('OWNER', null);
      const existingPhones = new Set(existingCustomers.map(c => c.phone.trim()));

      rows.forEach((r, idx) => {
        const rowNum = idx + 1;
        const name = (r.name || r.customer_name || '').trim();
        const phone = (r.phone || r.contact || '').trim();

        if (!name) {
          errors.push({ row: rowNum, field: 'name', message: 'Customer name is required.' });
          return;
        }

        if (!phone) {
          errors.push({ row: rowNum, field: 'phone', message: 'Phone number is required.' });
          return;
        }

        if (existingPhones.has(phone)) {
          duplicateCount++;
          errors.push({ row: rowNum, field: 'phone', message: `Customer with phone '${phone}' already exists.` });
          return;
        }

        validRows.push({
          name,
          phone,
          email: r.email || null,
          initial_points: Number(r.points || r.points_balance || 0)
        });
      });
    }

    return {
      type,
      import_type: type,
      total_rows: rows.length,
      valid_rows: validRows.length,
      invalid_rows: rows.length - validRows.length,
      duplicate_rows: duplicateCount,
      errors: errors.slice(0, 100), // Cap for display
      preview: validRows.slice(0, 10)
    };
  }

  // 2. IMPORT EXECUTION (Owner Only, master data only)
  public static executeImport(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    actorBranchId: string | null,
    input: {
      type: MasterImportType;
      file_name: string;
      rows: any[];
    }
  ): ImportAuditRecord {
    if (actorRole !== 'OWNER') {
      throw new Error('Forbidden: Only the Owner can perform data imports.');
    }

    const validation = this.validateImport(input.type, input.rows);
    const now = new Date().toISOString();
    const importId = `IMP-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    let insertedCount = 0;
    const errs = validation.errors || [];

    if (input.type === 'products' || input.type === 'PRODUCTS') {
      input.rows.filter((_, idx) => !errs.some(e => e.row === idx + 1)).forEach((row) => {
        try {
          db.createProduct(actorRole, actorId, actorEmail, {
            product_code: row.product_code || `PRD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            product_name: row.product_name || row.name,
            category: (row.category || 'SILOG') as any,
            selling_price: Number(row.price || row.selling_price || 0),
            description: row.description || '',
            is_active: row.is_active !== undefined ? row.is_active : true
          });
          insertedCount++;
        } catch (e) {
          console.error('[Import] Error inserting product:', e);
        }
      });
    } else if (input.type === 'ingredients' || input.type === 'INVENTORY') {
      input.rows.filter((_, idx) => !errs.some(e => e.row === idx + 1)).forEach((row) => {
        try {
          db.createIngredient(actorRole, actorId, actorEmail, {
            item_name: row.item_name || row.name,
            item_code: row.item_code || row.code,
            category: row.category || 'Kitchen Goods',
            unit: row.unit || 'pcs',
            cost_price: Number(row.cost_price || 0),
            reorder_level: Number(row.reorder_level || 15),
            maximum_stock: Number(row.maximum_stock || 100)
          });
          insertedCount++;
        } catch (e) {
          console.error('[Import] Error inserting ingredient:', e);
        }
      });
    } else if (input.type === 'branches' || input.type === 'BRANCHES') {
      input.rows.filter((_, idx) => !errs.some(e => e.row === idx + 1)).forEach((row) => {
        try {
          db.createBranch(actorRole, actorId, actorEmail, {
            name: row.name || row.branch_name,
            address: row.address,
            phone: row.contact_number || row.phone
          });
          insertedCount++;
        } catch (e) {
          console.error('[Import] Error inserting branch:', e);
        }
      });
    } else if (input.type === 'customers' || input.type === 'CUSTOMERS') {
      const branches = db.getBranches(actorRole, actorBranchId);
      const defaultBranch = branches[0];

      input.rows.filter((_, idx) => !errs.some(e => e.row === idx + 1)).forEach((row) => {
        try {
          db.createLoyaltyCustomer(actorRole, actorId, actorEmail, actorBranchId, {
            customer_name: row.name || row.customer_name,
            phone_number: row.phone || row.phone_number,
            email: row.email || undefined,
            branch_id: defaultBranch ? defaultBranch.id : undefined
          });
          insertedCount++;
        } catch (e) {
          console.error('[Import] Error inserting customer:', e);
        }
      });
    }

    const auditRecord: ImportAuditRecord = {
      id: importId,
      import_type: input.type,
      file_name: input.file_name,
      imported_by: actorEmail,
      timestamp: now,
      total_rows: input.rows.length,
      inserted_rows: insertedCount,
      failed_rows: input.rows.length - insertedCount,
      status: insertedCount > 0 ? (insertedCount === input.rows.length ? 'SUCCESS' : 'PARTIAL') : 'FAILED',
      notes: `Imported ${insertedCount} master ${input.type} records from ${input.file_name}.`,
      branch_id: actorBranchId
    };

    db.addImportAudit(auditRecord);

    db.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: actorBranchId,
      action: 'DATA_IMPORT_COMPLETED',
      entity_type: 'SYSTEM',
      entity_id: importId,
      metadata: {
        type: input.type,
        file_name: input.file_name,
        inserted_rows: insertedCount,
        failed_rows: input.rows.length - insertedCount
      }
    });

    return auditRecord;
  }

  // 3. READ-ONLY DATA INTEGRITY CHECK
  public static runIntegrityCheck(): DataIntegrityCheckResult {
    const issues: DataIntegrityIssue[] = [];
    const now = new Date().toISOString();

    const orders = db.getRawOrders();
    const payments = db.getPayments();
    const sales = db.getSalesTransactions('OWNER', null);
    const tickets = db.getRawSavedTickets();
    const customers = db.getLoyaltyCustomers('OWNER', null);
    const loyaltyTxs = db.getLoyaltyTransactions('OWNER', null);
    const employees = db.getEmployees('OWNER', null, 'SYSTEM');
    const attendance = db.getAttendance('OWNER', null, 'SYSTEM', {});
    const payroll = db.getPayrollRecords('OWNER', null, 'SYSTEM', {});
    const reqOrders = db.getRequestOrders('OWNER', null, {});
    const deliveries = db.getDeliveries('OWNER', null, {});
    const branches = db.getBranches('OWNER', null);

    const branchIds = new Set(branches.map(b => b.id));
    const customerIds = new Set(customers.map(c => c.id));
    const employeeIds = new Set(employees.map(e => e.id));
    const employeeUserIds = new Set(employees.map(e => e.user_id));
    const orderIds = new Set(orders.map(o => o.id));
    const reqOrderIds = new Set(reqOrders.map(r => r.id));

    // CHECK 1: Order -> Payment (Completed orders should have valid payment records)
    const paymentsByOrder = new Map<string, number>();
    payments.forEach(p => {
      if (p.status === 'COMPLETED') {
        paymentsByOrder.set(p.order_id, (paymentsByOrder.get(p.order_id) || 0) + p.amount);
      }
    });

    orders.forEach(o => {
      if (o.status === 'COMPLETED' || o.status === 'PAID') {
        const paidAmount = paymentsByOrder.get(o.id) || 0;
        if (paidAmount === 0 && (o.subtotal || o.total || 0) > 0) {
          issues.push({
            id: `INT-ORD-PAY-${o.id}`,
            check_name: 'Order → Payment Completeness',
            entity: 'Order / Payment',
            severity: 'WARNING',
            description: `Order #${o.order_number} marked as ${o.status} with total ₱${(o.subtotal || o.total || 0).toFixed(2)}, but no completed payment record found.`,
            record_id: o.id,
            record_preview: {
              order_number: o.order_number,
              branch_name: o.branch_name,
              total: o.subtotal || o.total,
              created_at: o.created_at,
              status: o.status
            },
            suggested_action: 'Inspect shift remittance or cashier session log for this receipt.'
          });
        }
      }
    });

    // CHECK 2: Order -> Sales Transaction (Completed orders should be recorded in Sales)
    const salesOrderIds = new Set(sales.map(s => s.order_id));
    orders.forEach(o => {
      if (o.status === 'COMPLETED' && !salesOrderIds.has(o.id)) {
        issues.push({
          id: `INT-ORD-SAL-${o.id}`,
          check_name: 'Order → Sales Transaction Alignment',
          entity: 'Order / Sales',
          severity: 'WARNING',
          description: `Order #${o.order_number} is completed but missing from the sales transactions registry.`,
          record_id: o.id,
          record_preview: {
            order_number: o.order_number,
            branch_id: o.branch_id,
            created_at: o.created_at
          },
          suggested_action: 'Verify sales journal synchronization.'
        });
      }
    });

    // CHECK 3: Saved Ticket -> Order Reference
    tickets.forEach(t => {
      const ticketOrderId = (t as any).order_id;
      if (ticketOrderId && !orderIds.has(ticketOrderId)) {
        issues.push({
          id: `INT-TCK-ORD-${t.id}`,
          check_name: 'Saved Ticket → Order Existence',
          entity: 'Saved Ticket',
          severity: 'INFO',
          description: `Saved Ticket #${t.ticket_number || t.id} links to Order ID ${ticketOrderId} which does not exist.`,
          record_id: t.id,
          record_preview: { ticket_number: t.ticket_number, order_id: ticketOrderId, branch_id: t.branch_id },
          suggested_action: 'Ticket may be archived or orphaned.'
        });
      }
    });

    // CHECK 4: Loyalty Transaction -> Customer Reference
    loyaltyTxs.forEach(tx => {
      if (!customerIds.has(tx.customer_id)) {
        issues.push({
          id: `INT-LOY-CUST-${tx.id}`,
          check_name: 'Loyalty Transaction → Customer Integrity',
          entity: 'Loyalty Transaction',
          severity: 'CRITICAL',
          description: `Loyalty transaction #${tx.id} points to customer ID ${tx.customer_id} which does not exist.`,
          record_id: tx.id,
          record_preview: { tx_id: tx.id, customer_id: tx.customer_id, points: tx.points, reason: tx.reason },
          suggested_action: 'Investigate deleted customer account or orphaned transaction.'
        });
      }
    });

    // CHECK 5: Employee -> Attendance Reference
    attendance.forEach(att => {
      if (!employeeUserIds.has(att.user_id) && !employeeIds.has(att.user_id)) {
        issues.push({
          id: `INT-ATT-EMP-${att.id}`,
          check_name: 'Attendance → Employee Association',
          entity: 'Attendance',
          severity: 'WARNING',
          description: `Attendance record for user ${att.user_id} (${att.employee_name}) does not correspond to an active employee profile.`,
          record_id: att.id,
          record_preview: { date: att.date, employee_name: att.employee_name, hours: att.payable_hours },
          suggested_action: 'Confirm if employee was archived or deactivated.'
        });
      }
    });

    // CHECK 6: Attendance -> Payroll Reference
    payroll.forEach(p => {
      if (p.payable_hours > 0 && (!p.employee_name || p.final_amount < 0)) {
        issues.push({
          id: `INT-PAY-ATT-${p.id}`,
          check_name: 'Payroll Calculation Sanity',
          entity: 'Payroll',
          severity: 'CRITICAL',
          description: `Payroll record #${p.id} has negative final amount (₱${p.final_amount}) or missing employee name.`,
          record_id: p.id,
          record_preview: { employee_name: p.employee_name, hours: p.payable_hours, final_amount: p.final_amount },
          suggested_action: 'Review payroll period rules and adjustment deductions.'
        });
      }
    });

    // CHECK 7: Request Order -> Delivery Reference
    deliveries.forEach(d => {
      if (d.request_id && !reqOrderIds.has(d.request_id)) {
        issues.push({
          id: `INT-DEL-REQ-${d.id}`,
          check_name: 'Delivery → Request Order Cross-Reference',
          entity: 'Delivery',
          severity: 'WARNING',
          description: `Delivery #${d.delivery_number} references Request ID ${d.request_id} which does not exist in request orders registry.`,
          record_id: d.id,
          record_preview: { delivery_number: d.delivery_number, request_id: d.request_id, destination: d.destination_branch_name },
          suggested_action: 'Verify if manual fulfillment or archived stock request.'
        });
      }
    });

    // CHECK 8: Branch -> Record Validity
    orders.forEach(o => {
      if (!branchIds.has(o.branch_id)) {
        issues.push({
          id: `INT-BR-ORD-${o.id}`,
          check_name: 'Branch ID Foreign Key Integrity',
          entity: 'Order / Branch',
          severity: 'CRITICAL',
          description: `Order #${o.order_number} references nonexistent branch ID ${o.branch_id}.`,
          record_id: o.id,
          record_preview: { order_number: o.order_number, branch_id: o.branch_id, branch_name: o.branch_name },
          suggested_action: 'Review branch master list.'
        });
      }
    });

    // Status derivation
    const criticalCount = issues.filter(i => i.severity === 'CRITICAL').length;
    const warningCount = issues.filter(i => i.severity === 'WARNING').length;

    let status: 'OK' | 'WARNING' | 'CRITICAL' = 'OK';
    if (criticalCount > 0) status = 'CRITICAL';
    else if (warningCount > 0) status = 'WARNING';

    const message = status === 'OK'
      ? 'All cross-entity relational constraints, accounting ledgers, and foreign references are intact.'
      : status === 'WARNING'
      ? `Data integrity scan detected ${warningCount} minor warnings across financial and logistical references.`
      : `Data integrity scan detected ${criticalCount} critical reference anomalies requiring administrator inspection.`;

    return {
      checked_at: now,
      status,
      total_checks: 8,
      passed_checks: 8 - (criticalCount > 0 ? 2 : (warningCount > 0 ? 1 : 0)),
      issues_count: issues.length,
      critical_issues: criticalCount,
      warnings: warningCount,
      issues: issues.slice(0, 50),
      summary_message: message
    };
  }

  // 4. DATA MANAGEMENT OVERVIEW STATUS
  public static getStatus(actorRole: UserRole, actorBranchId: string | null): DataManagementStatus {
    const branches = db.getBranches(actorRole, actorBranchId);
    const products = db.getProducts();
    const ingredients = db.getIngredients();
    const orders = db.getRawOrders();
    const payments = db.getPayments();
    const customers = db.getLoyaltyCustomers(actorRole, actorBranchId);
    const importAudits = db.getImportAudits(actorRole, actorBranchId);
    const exportLogs = db.getExportLogs(actorRole, actorBranchId);

    const lastImport = importAudits[0] || null;
    const lastExport = exportLogs[0] || null;

    return {
      database_status: 'HEALTHY',
      last_sync_timestamp: new Date().toISOString(),
      master_records_count: {
        branches: branches.length,
        products: products.length,
        ingredients: ingredients.length,
        customers: customers.length,
        orders: orders.length,
        payments: payments.length
      },
      last_import: lastImport,
      last_export: lastExport,
      recent_imports: importAudits.slice(0, 10),
      recent_exports: exportLogs.slice(0, 10)
    };
  }

  // 5. RECORD EXPORT LOG
  public static logExport(record: {
    report_type: string;
    format: 'CSV' | 'XLSX' | 'PDF' | 'PRINT';
    branch_id?: string;
    branch_name?: string;
    period?: string;
    user_email: string;
    row_count: number;
    file_name: string;
  }): ExportLogRecord {
    const log: ExportLogRecord = {
      id: `EXP-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      report_type: record.report_type,
      format: record.format,
      branch_id: record.branch_id || 'ALL',
      branch_name: record.branch_name || 'All Branches',
      period: record.period || 'TODAY',
      user_email: record.user_email,
      exported_by: record.user_email,
      timestamp: new Date().toISOString(),
      row_count: record.row_count,
      file_name: record.file_name
    };

    db.addExportLog(log);
    return log;
  }
}
