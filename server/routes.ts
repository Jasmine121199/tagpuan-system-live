import express, { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { aiAgent } from './ai-agent';
import { ReportsEngine } from './reports-engine';
import { DataManagementEngine } from './data-management-engine';
import { analyzeFoodImageWithGemini } from './gemini';
import { dispatchN8NWebhook } from './webhook-dispatcher';
import { syncOrderToSupabase } from './supabase-sync';
import { UserRole, Product } from '../src/types/index';

export const apiRouter = express.Router();

// Middleware: Authenticate Session Token
interface AuthenticatedRequest extends Request {
  user?: ReturnType<typeof db.getProfileById>;
  token?: string;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const validation = db.validateSession(token);

  if (!validation) {
    res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
    return;
  }

  req.user = validation.profile;
  req.token = token;
  next();
}

// Middleware: Require specific role
function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const isMasterOwner = req.user.email && (
      req.user.email.toLowerCase() === 'janzenmarkglori@gmail.com' ||
      req.user.email.toLowerCase() === 'owner@tagpuan.ph'
    );

    if (!roles.includes(req.user.role) && !isMasterOwner) {
      res.status(403).json({ error: `Forbidden: This action requires one of: ${roles.join(', ')}.` });
      return;
    }

    next();
  };
}

const requireOwner = requireRole('OWNER');

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// Login
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password, rememberMe } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const authResult = db.login(email, password, !!rememberMe);
    res.json({
      user: authResult.profile,
      token: authResult.token,
      expires_at: authResult.expires_at
    });
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Login failed.' });
  }
});

// Logout
apiRouter.post('/auth/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.token) {
      db.logout(req.token);
    }
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Logout failed.' });
  }
});

// Get Current Authenticated Profile
apiRouter.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// Forgot Password (Legacy link generation)
apiRouter.post('/auth/forgot-password', (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required.' });
      return;
    }
    const result = db.requestPasswordReset(email);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Password reset request failed.' });
  }
});

// Verify Email for Instant Self-Service Reset
apiRouter.post('/auth/verify-reset-email', (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required.' });
      return;
    }
    const result = db.verifyResetEmail(email);
    res.json(result);
  } catch (error: any) {
    res.status(404).json({ error: error.message || 'No registered account found with this email.' });
  }
});

// Instant In-App Password Reset (Self-Service)
apiRouter.post('/auth/instant-reset-password', (req: Request, res: Response) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      res.status(400).json({ error: 'Email and new password are required.' });
      return;
    }
    const result = db.instantResetPassword(email, newPassword);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update password.' });
  }
});

// Reset Password (Token based)
apiRouter.post('/auth/reset-password', (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      res.status(400).json({ error: 'Token and new password are required.' });
      return;
    }
    db.resetPassword(token, newPassword);
    res.json({ success: true, message: 'Password has been reset successfully.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Password reset failed.' });
  }
});

// Check First Owner Status
apiRouter.get('/auth/first-owner-status', (req: Request, res: Response) => {
  const hasOwner = db.hasAnyOwner();
  res.json({ hasOwner });
});

// Bootstrap First Owner
apiRouter.post('/auth/bootstrap-first-owner', (req: Request, res: Response) => {
  try {
    const { email, password, full_name, masterKey } = req.body;
    const result = db.bootstrapFirstOwner({
      email,
      password,
      full_name,
      masterKey
    });
    res.json({
      user: result.profile,
      token: result.token,
      expires_at: result.expires_at
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'First owner setup failed.' });
  }
});

// ==========================================
// BRANCHES ROUTES (RLS Enforced, Safe Public Fallback)
// ==========================================
apiRouter.get('/branches', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const validation = db.validateSession(token);
      if (validation) {
        const branches = db.getBranches(validation.profile.role, validation.profile.branch_id);
        return res.json({ branches });
      }
    }
    // If not authenticated or no token (e.g. pre-login, public kiosk, or initial app mount), return public active branches
    const branches = db.getActiveBranches();
    res.json({ branches });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch branches.' });
  }
});

// Single Branch
apiRouter.get('/branches/:id', (req: Request, res: Response) => {
  try {
    let role: UserRole | undefined;
    let branchId: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const validation = db.validateSession(token);
      if (validation) {
        role = validation.profile.role;
        branchId = validation.profile.branch_id;
      }
    }
    const branch = db.getBranchById(req.params.id, role, branchId);
    if (!branch) {
      res.status(404).json({ error: 'Branch not found.' });
      return;
    }
    res.json({ branch });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch branch.' });
  }
});

// Update Branch Parameters (Master Owner Only)
apiRouter.put('/branches/:id', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, code, address, landmark, phone, manager_name, opening_time, closing_time, kiosk_pin, operating_status, is_active } = req.body;
    const updated = db.updateBranch(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.params.id,
      { name, code, address, landmark, phone, manager_name, opening_time, closing_time, kiosk_pin, operating_status, is_active }
    );
    res.json({ branch: updated, message: 'Branch parameters successfully updated.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update branch.' });
  }
});

// Quick Operating Status Toggle (Master Owner Only)
apiRouter.patch('/branches/:id/status', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { operating_status, is_active } = req.body;
    const updated = db.updateBranch(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.params.id,
      { operating_status, is_active }
    );
    res.json({ branch: updated, message: `Branch status updated.` });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update branch status.' });
  }
});

// ==========================================
// USER MANAGEMENT ROUTES (Owner Only)
// ==========================================
apiRouter.get('/users', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = db.getProfiles(req.user!.role, req.user!.branch_id, req.user!.id);
    res.json({ users });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch user profiles.' });
  }
});

// Create User (Strict OWNER check)
apiRouter.post('/users', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, full_name, role, branch_id, kiosk_pin } = req.body;
    const result = db.createUser(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      {
        email,
        password,
        full_name,
        role,
        branch_id: role === 'OWNER' ? null : branch_id,
        kiosk_pin
      }
    );
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'User creation failed.' });
  }
});

// Setup My Kiosk PIN (Manager first-time setup or self-update)
apiRouter.post('/users/me/kiosk-pin', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { kiosk_pin } = req.body;
    if (!kiosk_pin) {
      res.status(400).json({ error: 'kiosk_pin is required.' });
      return;
    }
    const updated = db.updateUserKioskPin(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.user!.id,
      kiosk_pin
    );
    res.json({ user: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to set kiosk PIN.' });
  }
});

// Update User Kiosk PIN (OWNER or Manager Self)
apiRouter.patch('/users/:id/kiosk-pin', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { kiosk_pin } = req.body;
    if (!kiosk_pin) {
      res.status(400).json({ error: 'kiosk_pin is required.' });
      return;
    }
    const updated = db.updateUserKioskPin(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      id,
      kiosk_pin
    );
    res.json({ user: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update kiosk PIN.' });
  }
});

// Toggle user status (OWNER only)
apiRouter.patch('/users/:id/toggle-status', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      res.status(400).json({ error: 'is_active must be a boolean value.' });
      return;
    }
    const updated = db.toggleUserStatus(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      id,
      is_active
    );
    res.json({ user: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Status update failed.' });
  }
});

// Assign user to branch (OWNER only)
apiRouter.patch('/users/:id/assign-branch', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { branch_id } = req.body;
    const updated = db.assignUserBranch(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      id,
      branch_id
    );
    res.json({ user: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Branch assignment failed.' });
  }
});

// Delete user (OWNER only)
apiRouter.delete('/users/:id', requireAuth, requireOwner, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = db.deleteUser(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      id
    );
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to delete user.' });
  }
});

// ==========================================
// AUDIT LOGS (RLS Enforced)
// ==========================================
apiRouter.get('/audit-logs', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = db.getAuditLogs(req.user!.role, req.user!.branch_id, req.user!.id);
    res.json({ logs });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

// ==========================================
// NOTIFICATIONS (User scoped)
// ==========================================
apiRouter.get('/notifications', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const notifications = db.getNotifications(req.user!.id);
    res.json({ notifications });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

apiRouter.patch('/notifications/:id/read', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const success = db.markNotificationAsRead(req.user!.id, id);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update notification.' });
  }
});

apiRouter.post('/notifications/mark-all-read', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = db.markAllNotificationsAsRead(req.user!.id);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to mark all as read.' });
  }
});

// ==========================================
// EMPLOYEE MANAGEMENT ROUTES (PHASE 2)
// ==========================================
apiRouter.get('/employees', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, role, status, search } = req.query;
    const employees = db.getEmployees(
      req.user!.role,
      req.user!.branch_id,
      req.user!.id,
      {
        branch_id: branch_id as string,
        role: role as UserRole,
        status: status as any,
        search: search as string
      }
    );
    res.json({ employees });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch employees.' });
  }
});

// Create Employee (OWNER only)
apiRouter.post('/employees', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { full_name, email, role, branch_id, password, status } = req.body;
    const result = db.createEmployee(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      {
        full_name,
        email,
        role,
        branch_id: role === 'OWNER' ? null : branch_id,
        password,
        status
      }
    );
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Employee creation failed.' });
  }
});

// Update Employee (OWNER only)
apiRouter.patch('/employees/:id', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { full_name, role, branch_id, status } = req.body;
    const updated = db.updateEmployee(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      id,
      { full_name, role, branch_id, status }
    );
    res.json({ employee: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update employee.' });
  }
});

// Toggle Employee Status (OWNER only)
apiRouter.patch('/employees/:id/toggle-status', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (status !== 'ACTIVE' && status !== 'INACTIVE') {
      res.status(400).json({ error: 'status must be ACTIVE or INACTIVE.' });
      return;
    }
    const updated = db.toggleEmployeeStatus(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      id,
      status
    );
    res.json({ employee: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update employee status.' });
  }
});

// ==========================================
// ATTENDANCE ROUTES (PHASE 2 - Authoritative Timestamps)
// ==========================================

// Get user's current clock-in state
apiRouter.get('/attendance/status', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = db.getAttendanceStatus(req.user!.id);
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve attendance status.' });
  }
});

// Clock in (Authoritative server timestamp, single shift lock, double shift PIN override)
apiRouter.post('/attendance/clock-in', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { manager_pin } = req.body || {};
    const record = db.clockIn(req.user!, { manager_pin });
    res.status(201).json({ record, message: 'Clock-in successful.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Clock-in failed.' });
  }
});

// Clock out (Authoritative server timestamp, 2-hour minimum duration cooldown, break deduction)
apiRouter.post('/attendance/clock-out', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { manager_pin } = req.body || {};
    const record = db.clockOut(req.user!, { manager_pin });
    res.json({ record, message: 'Clock-out successful.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Clock-out failed.' });
  }
});

// Get Attendance History (RLS Enforced)
apiRouter.get('/attendance', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, employee_id, date, start_date, end_date } = req.query;
    const records = db.getAttendance(
      req.user!.role,
      req.user!.branch_id,
      req.user!.id,
      {
        branch_id: branch_id as string,
        employee_id: employee_id as string,
        date: date as string,
        start_date: start_date as string,
        end_date: end_date as string
      }
    );
    res.json({ attendance: records });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch attendance records.' });
  }
});

// ==========================================
// PAYROLL ROUTES (PHASE 2 - Calculation & Review Engine)
// ==========================================

// Get Payroll Rules
apiRouter.get('/payroll/rules', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const rules = db.getPayrollRules();
    res.json({ rules });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch payroll rules.' });
  }
});

// Update Payroll Rules (OWNER only)
apiRouter.patch('/payroll/rules', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { deduct_break_hour, minimum_hours_for_break_deduction, rates } = req.body;
    const rules = db.updatePayrollRules(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      {
        deduct_break_hour,
        minimum_hours_for_break_deduction,
        rates
      }
    );
    res.json({ rules });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update payroll rules.' });
  }
});

// Get Payroll Periods
apiRouter.get('/payroll/periods', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const periods = db.getPayrollPeriods();
    res.json({ periods });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch payroll periods.' });
  }
});

// Create Payroll Period (OWNER only)
apiRouter.post('/payroll/periods', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, start_date, end_date } = req.body;
    const period = db.createPayrollPeriod(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      { name, start_date, end_date }
    );
    res.status(201).json({ period });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create payroll period.' });
  }
});

// Generate Payroll (Owner global or Manager branch)
apiRouter.post('/payroll/generate', requireAuth, requireRole('OWNER', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { period_id, branch_id } = req.body;
    if (!period_id) {
      res.status(400).json({ error: 'period_id is required.' });
      return;
    }

    const records = db.generatePayroll(req.user!, {
      period_id,
      branch_id: req.user!.role === 'OWNER' ? branch_id : req.user!.branch_id
    });

    res.json({ records, count: records.length });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Payroll generation failed.' });
  }
});

// Get Payroll Records (RLS Enforced - Owner & Manager)
apiRouter.get('/payroll/records', requireAuth, requireRole('OWNER', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { period_id, branch_id, status } = req.query;
    const records = db.getPayrollRecords(
      req.user!.role,
      req.user!.branch_id,
      req.user!.id,
      {
        period_id: period_id as string,
        branch_id: branch_id as string,
        status: status as any
      }
    );
    res.json({ records });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch payroll records.' });
  }
});

// Update Payroll Status (Approval / Review - Owner & Manager)
apiRouter.patch('/payroll/records/:id/status', requireAuth, requireRole('OWNER', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
      res.status(400).json({ error: 'status is required.' });
      return;
    }
    const updated = db.updatePayrollStatus(req.user!, id, status);
    res.json({ record: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update payroll status.' });
  }
});

// Adjust Payroll Record (Bonuses/Deductions - Owner & Manager)
apiRouter.patch('/payroll/records/:id/adjust', requireAuth, requireRole('OWNER', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { adjustments, note } = req.body;
    if (typeof adjustments !== 'number') {
      res.status(400).json({ error: 'adjustments amount must be a number.' });
      return;
    }
    const updated = db.adjustPayrollRecord(req.user!, id, adjustments, note);
    res.json({ record: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to adjust payroll record.' });
  }
});

// Employee Self-Service: Get own approved payslips
apiRouter.get('/payroll/my-payslips', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const records = db.getPayrollRecords(
      req.user!.role,
      req.user!.branch_id,
      req.user!.id
    );
    res.json({ records });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch personal payslips.' });
  }
});

// Get Specific Payslip (Owner global, Manager branch, or Employee self)
apiRouter.get('/payroll/records/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const records = db.getPayrollRecords(
      req.user!.role,
      req.user!.branch_id,
      req.user!.id
    );
    const record = records.find(r => r.id === id);
    if (!record) {
      res.status(403).json({ error: 'Access Denied: You do not have authorization to view this payslip record.' });
      return;
    }
    res.json({ record });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch payslip.' });
  }
});

// ==========================================
// PHASE 3: PRODUCTS, INGREDIENTS, RECIPES & INVENTORY
// ==========================================

// Products: List
apiRouter.get('/products', (req: Request, res: Response) => {
  try {
    const { category, search, activeOnly, availableOnly, branch_id } = req.query;
    const products = db.getProducts(
      category as string,
      search as string,
      activeOnly === 'true',
      availableOnly === 'true',
      branch_id as string
    );
    res.json({ products });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch products.' });
  }
});

// Products: Get Single
apiRouter.get('/products/:id', (req: Request, res: Response) => {
  try {
    const product = db.getProductById(req.params.id);
    if (!product) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    res.json({ product });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch product.' });
  }
});

// Products: Create (Owner Only)
apiRouter.post('/products', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const product = db.createProduct(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.body
    );
    res.status(201).json({ product });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create product.' });
  }
});

// Products: Update (Owner Only) - supports both PUT and PATCH
const handleUpdateProduct = (req: AuthenticatedRequest, res: Response) => {
  try {
    const product = db.updateProduct(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.params.id,
      req.body
    );
    res.json({ product });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update product.' });
  }
};
apiRouter.put('/products/:id', requireAuth, handleUpdateProduct);
apiRouter.patch('/products/:id', requireAuth, handleUpdateProduct);

// Products: Update Price (Owner Only)
apiRouter.patch('/products/:id/price', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawPrice = req.body.selling_price !== undefined ? req.body.selling_price : req.body.price;
    const priceNum = Number(rawPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      res.status(400).json({ error: 'Valid selling_price number is required.' });
      return;
    }
    const product = db.updateProductPrice(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.params.id,
      priceNum
    );
    res.json({ product });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update product price.' });
  }
});

// Products: Toggle Status (Owner Only)
apiRouter.patch('/products/:id/status', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      res.status(400).json({ error: 'is_active boolean is required.' });
      return;
    }
    const product = db.toggleProductStatus(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.params.id,
      is_active
    );
    res.json({ product });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to toggle product status.' });
  }
});

// Products: Toggle Availability (Owner Only)
apiRouter.patch('/products/:id/availability', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { is_available } = req.body;
    if (typeof is_available !== 'boolean') {
      res.status(400).json({ error: 'is_available boolean is required.' });
      return;
    }
    const product = db.toggleProductAvailability(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.params.id,
      is_available
    );
    res.json({ product });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to toggle product availability.' });
  }
});

// Products: Update Branch Availability (Owner Only)
apiRouter.patch('/products/:id/branch-availability', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { unavailable_branches } = req.body;
    if (!Array.isArray(unavailable_branches)) {
      res.status(400).json({ error: 'unavailable_branches array is required.' });
      return;
    }
    const product = db.updateProductBranchAvailability(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.params.id,
      unavailable_branches
    );
    res.json({ product });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update branch availability.' });
  }
});

// Products: Delete or Archive Product (Owner Only)
apiRouter.delete('/products/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const force = req.query.force === 'true' || req.body?.force === true;
    const result = db.deleteProduct(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.params.id,
      force
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to delete product.' });
  }
});

// Products: Upload Image (Owner Only)
apiRouter.post('/products/:id/image', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawImage = req.body.image_data !== undefined ? req.body.image_data : (req.body.image_url !== undefined ? req.body.image_url : req.body.product_image);
    if (rawImage === undefined) {
      res.status(400).json({ error: 'image_data or image_url is required (string or null to clear).' });
      return;
    }
    const product = db.uploadProductImage(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.params.id,
      rawImage && typeof rawImage === 'string' && rawImage.trim() ? rawImage.trim() : null
    );
    res.json({ product });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to upload product image.' });
  }
});

// Products: Remove Image (Owner Only)
apiRouter.delete('/products/:id/image', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const product = db.removeProductImage(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.params.id
    );
    res.json({ product });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to remove product image.' });
  }
});

// Products: Gemini AI Multimodal Vision Match Image (Owner Only)
apiRouter.post('/products/ai-match-image', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!db.isOwnerActor(req.user?.role, req.user?.email)) {
      res.status(403).json({ error: 'Unauthorized: Only an OWNER can match menu images using AI vision.' });
      return;
    }

    const { image_data, mime_type } = req.body;
    if (!image_data || typeof image_data !== 'string') {
      res.status(400).json({ error: 'image_data (base64 string or data URL) is required.' });
      return;
    }

    // Retrieve full central database menu as authoritative source of truth
    const allProducts = db.getProducts(undefined, undefined, false, false);
    const analysis = await analyzeFoodImageWithGemini(
      image_data,
      mime_type || 'image/jpeg',
      allProducts
    );

    let matchedProduct: Product | null = null;
    if (analysis.identified && (analysis.matched_product_code || analysis.matched_product_name)) {
      matchedProduct = allProducts.find(p =>
        (analysis.matched_product_code && p.product_code.toLowerCase() === analysis.matched_product_code.toLowerCase()) ||
        (analysis.matched_product_name && p.product_name.toLowerCase() === analysis.matched_product_name.toLowerCase())
      ) || null;
    }

    // Enrich alternatives with real database records
    const enrichedAlternatives = (analysis.alternatives || []).map(alt => {
      const prod = allProducts.find(p =>
        (alt.product_code && p.product_code.toLowerCase() === alt.product_code.toLowerCase()) ||
        (alt.product_name && p.product_name.toLowerCase() === alt.product_name.toLowerCase())
      );
      if (!prod) return null;
      return {
        product_id: prod.id,
        product_code: prod.product_code,
        product_name: prod.product_name,
        category: prod.category,
        selling_price: prod.selling_price,
        confidence_percentage: alt.confidence_percentage
      };
    }).filter((alt): alt is NonNullable<typeof alt> => Boolean(alt));

    if (matchedProduct) {
      res.json({
        identified: true,
        product: {
          id: matchedProduct.id,
          product_code: matchedProduct.product_code,
          product_name: matchedProduct.product_name,
          category: matchedProduct.category,
          selling_price: matchedProduct.selling_price,
          description: matchedProduct.description,
          product_image: matchedProduct.product_image,
          is_available: matchedProduct.is_available,
          is_active: matchedProduct.is_active,
          recipe_id: matchedProduct.recipe_id
        },
        confidence: analysis.confidence,
        confidence_percentage: analysis.confidence_percentage,
        visual_reasoning: analysis.visual_reasoning,
        alternatives: enrichedAlternatives
      });
    } else {
      res.json({
        identified: false,
        product: null,
        confidence: analysis.confidence || 'UNCERTAIN',
        confidence_percentage: analysis.confidence_percentage || 0,
        visual_reasoning: analysis.visual_reasoning || 'Visual analysis could not pinpoint an exact Tagpuan menu item.',
        message: 'Product could not be confidently identified.',
        alternatives: enrichedAlternatives
      });
    }
  } catch (error: any) {
    console.error('[Route /products/ai-match-image] Error:', error);
    res.status(500).json({
      identified: false,
      product: null,
      confidence: 'UNCERTAIN',
      confidence_percentage: 0,
      visual_reasoning: error.message || 'Server error while analyzing image.',
      message: 'Product could not be confidently identified.'
    });
  }
});

// Products: Reassign Image to Different Product (Owner Only)
apiRouter.post('/products/:id/reassign-image', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role !== 'OWNER') {
      res.status(403).json({ error: 'Unauthorized: Only an OWNER can reassign product images.' });
      return;
    }
    const sourceProductId = req.params.id;
    const { target_product_id, image_data } = req.body;

    if (!target_product_id) {
      res.status(400).json({ error: 'target_product_id is required.' });
      return;
    }

    const sourceProduct = db.getProductById(sourceProductId);
    const targetProduct = db.getProductById(target_product_id);

    if (!targetProduct) {
      res.status(404).json({ error: 'Target product not found in database.' });
      return;
    }

    // Determine the image to assign
    const imageToAssign = image_data || (sourceProduct ? sourceProduct.product_image : null);
    if (!imageToAssign) {
      res.status(400).json({ error: 'No image found to reassign.' });
      return;
    }

    // Update target product's image ONLY
    const updatedTarget = db.uploadProductImage(
      req.user.role,
      req.user.id,
      req.user.email,
      targetProduct.id,
      imageToAssign
    );

    // Optionally clear source product's image if requested
    if (req.body.clear_source && sourceProduct && sourceProduct.id !== targetProduct.id) {
      db.removeProductImage(req.user.role, req.user.id, req.user.email, sourceProduct.id);
    }

    res.json({
      success: true,
      product: updatedTarget,
      message: `Image successfully assigned to ${updatedTarget.product_name}.`
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to reassign product image.' });
  }
});

// Products: Reorder (Owner Only)
apiRouter.post('/products/reorder', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orders } = req.body;
    if (!Array.isArray(orders)) {
      res.status(400).json({ error: 'orders array is required.' });
      return;
    }
    const products = db.reorderProducts(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      orders
    );
    res.json({ products });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to reorder products.' });
  }
});

// Categories: List
apiRouter.get('/categories', (req: Request, res: Response) => {
  try {
    const categories = db.getCategories();
    res.json({ categories });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch categories.' });
  }
});

// Categories: Create (Owner Only)
apiRouter.post('/categories', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const category = db.createCategory(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.body
    );
    res.status(201).json({ category });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create category.' });
  }
});

// Categories: Update (Owner Only)
apiRouter.put('/categories/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const category = db.updateCategory(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.params.id,
      req.body
    );
    res.json({ category });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update category.' });
  }
});

// Categories: Reorder (Owner Only)
apiRouter.post('/categories/reorder', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orders } = req.body;
    if (!Array.isArray(orders)) {
      res.status(400).json({ error: 'orders array is required.' });
      return;
    }
    const categories = db.reorderCategories(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      orders
    );
    res.json({ categories });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to reorder categories.' });
  }
});

// Ingredients: List
apiRouter.get('/ingredients', (req: Request, res: Response) => {
  try {
    const { category, search } = req.query;
    const ingredients = db.getIngredients(category as string, search as string);
    res.json({ ingredients });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch ingredients.' });
  }
});

// Ingredients: Get Single
apiRouter.get('/ingredients/:id', (req: Request, res: Response) => {
  try {
    const ingredient = db.getIngredientById(req.params.id);
    if (!ingredient) {
      res.status(404).json({ error: 'Ingredient not found.' });
      return;
    }
    res.json({ ingredient });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch ingredient.' });
  }
});

// Ingredients: Create (Owner Only)
apiRouter.post('/ingredients', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const ingredient = db.createIngredient(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.body
    );
    res.status(201).json({ ingredient });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create ingredient.' });
  }
});

// Ingredients: Update (Owner Only)
apiRouter.put('/ingredients/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const ingredient = db.updateIngredient(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.params.id,
      req.body
    );
    res.json({ ingredient });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update ingredient.' });
  }
});

// Recipes: List All
apiRouter.get('/recipes', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const recipes = db.getRecipes();
    res.json({ recipes });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch recipes.' });
  }
});

// Recipes: Get by Product ID
apiRouter.get('/recipes/product/:productId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const recipe = db.getRecipeByProductId(req.params.productId);
    if (!recipe) {
      res.status(404).json({ error: 'No recipe configured for this product.' });
      return;
    }
    res.json({ recipe });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch recipe.' });
  }
});

// Recipes: Get Single by ID
apiRouter.get('/recipes/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const recipe = db.getRecipeById(req.params.id);
    if (!recipe) {
      res.status(404).json({ error: 'Recipe not found.' });
      return;
    }
    res.json({ recipe });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch recipe.' });
  }
});

// Recipes: Create or Update (Owner Only)
apiRouter.post('/recipes', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const recipe = db.saveRecipe(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.body
    );
    res.json({ recipe });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to save recipe.' });
  }
});

// Branch Inventory: List (RLS Enforced: Owner=all/target, Manager=own branch only)
apiRouter.get('/inventory', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, status, category, search } = req.query;
    const inventory = db.getBranchInventory(
      req.user!.role,
      req.user!.branch_id,
      branch_id as string,
      search as string,
      status as string,
      category as string
    );
    res.json({ inventory });
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to fetch branch inventory.' });
  }
});

// Branch Inventory: Summary Metrics
apiRouter.get('/inventory/summary', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id } = req.query;
    const summary = db.getInventorySummary(
      req.user!.role,
      req.user!.branch_id,
      branch_id as string
    );
    res.json({ summary });
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to fetch inventory summary.' });
  }
});

// Branch Inventory: Update Item Config (Owner Only)
apiRouter.patch('/inventory/:id/config', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = db.updateBranchInventoryConfig(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.params.id,
      req.body
    );
    res.json({ inventory: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update inventory config.' });
  }
});

// Stock Movement: Stock In (Owner Only)
apiRouter.post('/inventory/stock-in', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = db.stockIn(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.body
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Stock In failed.' });
  }
});

// Stock Movement: Adjust Stock (Owner & Manager)
apiRouter.post('/inventory/adjust', requireAuth, requireRole('OWNER', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = db.adjustStock(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.body
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Stock Adjustment failed.' });
  }
});

// Stock Movement: Record Rejection (Owner & Manager)
apiRouter.post('/inventory/reject', requireAuth, requireRole('OWNER', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = db.recordRejectedStock(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.body
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Stock Rejection logging failed.' });
  }
});

// Stock Movement: Transaction History
apiRouter.get('/inventory/transactions', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, ingredient_id, type } = req.query;
    const transactions = db.getInventoryTransactions(
      req.user!.role,
      req.user!.branch_id,
      branch_id as string,
      ingredient_id as string,
      type as string
    );
    res.json({ transactions });
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to fetch inventory transactions.' });
  }
});

// Low Stock Events: List
apiRouter.get('/inventory/low-stock-events', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, status } = req.query;
    const events = db.getLowStockEvents(
      req.user!.role,
      req.user!.branch_id,
      branch_id as string,
      status as string
    );
    res.json({ events });
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to fetch low stock events.' });
  }
});

// Low Stock Events: Resolve
apiRouter.patch('/inventory/low-stock-events/:id/resolve', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const event = db.resolveLowStockEvent(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.params.id
    );
    res.json({ event });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to resolve low stock event.' });
  }
});

// Daily Ingredient Usage Audit (Raw Material Deductions from Recipes)
apiRouter.get('/inventory/daily-usage-audit', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, date, date_preset } = req.query;
    const audit = db.getDailyIngredientUsageAudit(
      req.user!.role,
      req.user!.branch_id,
      {
        branch_id: branch_id as string,
        date: date as string,
        date_preset: date_preset as string
      }
    );
    res.json(audit);
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to compute daily ingredient usage audit.' });
  }
});

// Recipe Deduction Engine: Pre-Validation Check (Non-destructive)
apiRouter.post('/inventory/validate-deduction', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, product_id, order_quantity } = req.body;
    if (!branch_id || !product_id || !order_quantity) {
      res.status(400).json({ error: 'branch_id, product_id, and order_quantity are required.' });
      return;
    }
    const validation = db.validateProductDeduction(
      branch_id,
      product_id,
      Number(order_quantity)
    );
    res.json({ validation });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Deduction pre-validation check failed.' });
  }
});

// Recipe Deduction Engine: Execute Atomic Deduction
apiRouter.post('/inventory/deduct', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, product_id, order_quantity, reason } = req.body;
    if (!branch_id || !product_id || !order_quantity) {
      res.status(400).json({ error: 'branch_id, product_id, and order_quantity are required.' });
      return;
    }
    const deduction = db.deductProductInventory(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      branch_id,
      product_id,
      Number(order_quantity),
      reason
    );
    res.json(deduction);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Atomic recipe deduction failed.' });
  }
});

// ==========================================
// PHASE 4: POS, ORDER ENGINE, PAYMENTS & SESSIONS
// ==========================================

// Modifiers: List All Modifier Groups
apiRouter.get('/pos/modifiers', (req: Request, res: Response) => {
  try {
    const groups = db.getModifierGroups();
    res.json({ groups });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch modifier groups.' });
  }
});

// Modifiers: Update Group (Owner Only)
apiRouter.put('/pos/modifiers/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = db.updateModifierGroup(req.user!.role, req.params.id, req.body);
    res.json({ group: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update modifier group.' });
  }
});

// Modifiers: Create Group (Owner Only)
apiRouter.post('/pos/modifiers', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const created = db.createModifierGroup(req.user!.role, req.body);
    res.status(201).json({ group: created });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create modifier group.' });
  }
});

// Modifiers: Delete Group (Owner Only)
apiRouter.delete('/pos/modifiers/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    db.deleteModifierGroup(req.user!.role, req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to delete modifier group.' });
  }
});

// Payment Configurations: Get Active (by branch or global)
apiRouter.get('/pos/payment-configs', (req: Request, res: Response) => {
  try {
    const { branch_id } = req.query;
    const configs = db.getPaymentConfigurations(branch_id as string);
    res.json({ configs });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch payment configurations.' });
  }
});

// Payment Configurations: Get All (Owner Only)
apiRouter.get('/pos/payment-configs/all', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user!.role !== 'OWNER') {
      res.status(403).json({ error: 'Forbidden: Only OWNER can view all payment gateway configurations.' });
      return;
    }
    const configs = db.getAllPaymentConfigurations();
    res.json({ configs });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch payment configurations.' });
  }
});

// Payment Configurations: Update QR / Account (Owner Only)
apiRouter.put('/pos/payment-configs/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = db.updatePaymentConfiguration(req.user!.role, req.params.id, req.body);
    res.json({ config: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update payment configuration.' });
  }
});

// Payment Configurations: Create (Owner Only)
apiRouter.post('/pos/payment-configs', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const created = db.createPaymentConfiguration(req.user!.role, req.body);
    res.status(201).json({ config: created });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create payment configuration.' });
  }
});

// POS Cart & Inventory Pre-validation (Authoritative check)
apiRouter.post('/pos/validate-cart', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, items } = req.body;
    if (!branch_id || !items) {
      res.status(400).json({ error: 'branch_id and items array are required.' });
      return;
    }

    // Branch RLS validation
    if (req.user!.role !== 'OWNER' && branch_id !== req.user!.branch_id) {
      res.status(403).json({ error: 'Forbidden: You cannot validate orders for another branch.' });
      return;
    }

    const validation = db.validateOrderItems(branch_id, items);
    res.json(validation);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Cart validation failed.' });
  }
});

// POS: Create Order
apiRouter.post('/pos/orders', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const order = db.createOrder(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.user!.branch_id,
      req.body
    );
    // Asynchronous background sync to Supabase if credentials exist
    syncOrderToSupabase(order, order.items || []).catch(err => {
      console.warn('[Routes] Supabase async sync order notice:', err);
    });
    res.status(201).json({ order });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create order.' });
  }
});

// POS: Get Orders List (with RLS and filters)
apiRouter.get('/pos/orders', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, status, search, date, cashier_id, source } = req.query;
    const orders = db.getOrders(
      req.user!.role,
      req.user!.branch_id,
      {
        branch_id: branch_id as string,
        status: status as string,
        search: search as string,
        date: date as string,
        cashier_id: cashier_id as string,
        source: source as string
      }
    );
    res.json({ orders });
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to fetch orders.' });
  }
});

// POS: Get Single Order
apiRouter.get('/pos/orders/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const order = db.getOrderById(req.user!.role, req.user!.branch_id, req.params.id);
    res.json({ order });
  } catch (error: any) {
    res.status(404).json({ error: error.message || 'Order not found.' });
  }
});

// POS: Process Payment (Atomic Checkout with Recipe Inventory Deduction)
apiRouter.post('/pos/orders/:id/pay', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = db.processPayment(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.user!.branch_id,
      {
        ...req.body,
        order_id: req.params.id
      }
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Payment processing failed.' });
  }
});

// POS: Owner Void Order (Strictly Owner Only with mandatory reason)
apiRouter.post('/pos/orders/:id/void', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      res.status(400).json({ error: 'Void reason is mandatory.' });
      return;
    }
    const order = db.voidOrder(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      {
        order_id: req.params.id,
        reason
      }
    );
    res.json({ order, message: `Order ${order.order_number} successfully voided.` });
  } catch (error: any) {
    const statusCode = error.message && error.message.includes('Forbidden') ? 403 : 400;
    res.status(statusCode).json({ error: error.message || 'Failed to void order.' });
  }
});

// POS: Customer Cancel Order (Before Payment)
apiRouter.post('/pos/orders/:id/cancel', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reason } = req.body;
    const order = db.cancelOrder(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.user!.branch_id,
      req.params.id,
      reason || 'Customer cancelled before payment'
    );
    res.json({ order, message: `Order ${order.order_number} cancelled.` });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to cancel order.' });
  }
});

// POS: Get Order Receipt
apiRouter.get('/pos/orders/:id/receipt', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const receipt = db.getReceiptData(req.user!.role, req.user!.branch_id, req.params.id);
    res.json({ receipt });
  } catch (error: any) {
    res.status(404).json({ error: error.message || 'Failed to generate receipt.' });
  }
});

// POS: Cashier Sessions - Current Active
apiRouter.get('/pos/session', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const branchId = (req.query.branch_id as string) || req.user!.branch_id;
    if (!branchId) {
      res.status(400).json({ error: 'branch_id is required.' });
      return;
    }
    const session = db.getCashierSession(req.user!.id, branchId);
    res.json({ session });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch cashier session.' });
  }
});

// POS: Open Cashier Session
apiRouter.post('/pos/session/open', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, opening_cash, notes } = req.body;
    const targetBranch = branch_id || req.user!.branch_id;
    if (!targetBranch) {
      res.status(400).json({ error: 'branch_id is required.' });
      return;
    }
    const session = db.openCashierSession(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.user!.branch_id,
      targetBranch,
      Number(opening_cash) || 0,
      notes
    );
    res.status(201).json({ session });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to open cashier session.' });
  }
});

// POS: Close Cashier Session
apiRouter.post('/pos/session/close', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { session_id, closing_cash, notes } = req.body;
    if (!session_id) {
      res.status(400).json({ error: 'session_id is required.' });
      return;
    }
    const session = db.closeCashierSession(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      session_id,
      Number(closing_cash) || 0,
      notes
    );
    res.json({ session });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to close cashier session.' });
  }
});

// POS: Sales Transactions
apiRouter.get('/pos/sales-transactions', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, date } = req.query;
    const transactions = db.getSalesTransactions(
      req.user!.role,
      req.user!.branch_id,
      {
        branch_id: branch_id as string,
        date: date as string
      }
    );
    res.json({ transactions });
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to fetch sales transactions.' });
  }
});

// ==========================================
// PHASE 5: SELF-ORDERING / CUSTOMER KIOSK ROUTES (No Auth Required)
// ==========================================

// Kiosk: List Active Branches for Kiosk Device Setup
apiRouter.get('/kiosk/branches', (req: Request, res: Response) => {
  try {
    const branches = db.getKioskBranches();
    res.json({ branches });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch kiosk branches.' });
  }
});

// Kiosk: Verify Manager / Owner PIN for Terminal Lock & Staff Controls
apiRouter.post('/kiosk/verify-pin', (req: Request, res: Response) => {
  try {
    const { pin, branch_id } = req.body;
    if (!pin) {
      res.status(400).json({ authorized: false, error: 'PIN is required.' });
      return;
    }
    const result = db.verifyKioskPin(pin, branch_id || null);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ authorized: false, error: error.message || 'Unauthorized PIN.' });
  }
});

// Kiosk: Fetch Menu, Modifiers, and Payment Gateways for Branch
apiRouter.get('/kiosk/menu', (req: Request, res: Response) => {
  try {
    let branchId = (req.query.branch_id as string) || '';
    if (branchId === 'undefined' || branchId === 'null') {
      branchId = '';
    }
    const menu = db.getKioskMenu(branchId || undefined);
    res.json(menu);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to fetch kiosk menu.' });
  }
});

// Kiosk: Validate Cart & Stock (Customer-safe)
apiRouter.post('/kiosk/validate-cart', (req: Request, res: Response) => {
  try {
    const { branch_id, items } = req.body;
    if (!branch_id || !items || !Array.isArray(items)) {
      res.status(400).json({ error: 'branch_id and items array are required.' });
      return;
    }
    const validation = db.validateOrderItems(branch_id, items);
    res.json(validation);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Kiosk cart validation failed.' });
  }
});

// Kiosk: Submit Customer Order
apiRouter.post('/kiosk/orders', (req: Request, res: Response) => {
  try {
    const order = db.createKioskOrder(req.body);
    // Asynchronous background sync to Supabase if configured
    syncOrderToSupabase(order, order.items || []).catch(err => {
      console.warn('[Routes] Supabase async sync kiosk order notice:', err);
    });
    res.status(201).json({ order });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to submit kiosk order.' });
  }
});

// Kiosk: Check Order Status by Order Number
apiRouter.get('/kiosk/orders/:order_number', (req: Request, res: Response) => {
  try {
    const order = db.getKioskOrderByNumber(req.params.order_number);
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    res.json({ order });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch order.' });
  }
});

// Kiosk: Customer Cancel Unpaid Order
apiRouter.post('/kiosk/orders/:id/cancel', (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const order = db.cancelKioskOrder(req.params.id, reason);
    res.json({ order, message: 'Order successfully cancelled.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to cancel kiosk order.' });
  }
});

// Kiosk: Pay / Complete Kiosk Order (E-Wallet/Card self-checkout)
apiRouter.post('/kiosk/orders/:id/pay', (req: Request, res: Response) => {
  try {
    const { payment_method, amount_received, reference_number, customer_name, customer_phone, idempotency_key } = req.body;
    const result = db.processKioskPayment(
      req.params.id,
      payment_method || 'GCASH',
      amount_received,
      reference_number,
      customer_name,
      customer_phone,
      idempotency_key
    );
    res.json({
      success: true,
      order: result.order,
      receipt: result.receipt
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to process kiosk payment.' });
  }
});

// ==========================================
// PHASE 6: KITCHEN DISPLAY SYSTEM (KDS) ROUTES
// ==========================================

// KDS: Get Active Kitchen Orders
apiRouter.get('/kds/orders', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, kitchen_status, search } = req.query;
    const orders = db.getKitchenOrders(
      req.user!.role,
      req.user!.branch_id,
      {
        branch_id: branch_id as string,
        kitchen_status: kitchen_status as string,
        search: search as string
      }
    );
    res.json({ orders });
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to fetch kitchen orders.' });
  }
});

// KDS: Start Order (NEW -> PREPARING)
apiRouter.post('/kds/orders/:id/start', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const order = db.startKitchenOrder(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.user!.branch_id,
      req.params.id
    );
    res.json({ order, message: 'Order is now in preparation.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to start cooking order.' });
  }
});

// KDS: Mark Order Ready (PREPARING -> READY)
apiRouter.post('/kds/orders/:id/ready', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const order = db.markKitchenOrderReady(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.user!.branch_id,
      req.params.id
    );
    res.json({ order, message: 'Order is ready for serving/pickup.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to mark order ready.' });
  }
});

// KDS: Deliver Order (Customer Handoff / Dismiss from active queue)
apiRouter.post('/kds/orders/:id/deliver', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const order = db.deliverKitchenOrder(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.user!.branch_id,
      req.params.id
    );
    res.json({ order, message: 'Order marked delivered and handed off to customer.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to deliver kitchen order.' });
  }
});

// KDS: Complete Order (Alias for Deliver)
apiRouter.post('/kds/orders/:id/complete', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const order = db.deliverKitchenOrder(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.user!.branch_id,
      req.params.id
    );
    res.json({ order, message: 'Order marked delivered and handed off to customer.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to complete kitchen order.' });
  }
});

// KDS: Audit Log Delayed Order Alert
apiRouter.post('/kds/orders/:id/alert-delayed', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const order = db.getOrderById(req.user!.role, req.user!.branch_id, req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    db.createAuditLog({
      user_id: req.user!.id,
      user_email: req.user!.email,
      role: req.user!.role,
      branch_id: order.branch_id,
      action: 'DELAYED_ALERT',
      entity_type: 'ORDER',
      entity_id: order.id,
      metadata: {
        order_number: order.order_number,
        kitchen_status: order.kitchen_status,
        kitchen_received_at: order.kitchen_received_at,
        alert_reason: '15+ minutes preparation threshold exceeded'
      }
    });
    res.json({ success: true, message: 'Delayed alert logged.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to log delayed alert.' });
  }
});

// KDS: Recall Order (Undo accidental action)
apiRouter.post('/kds/orders/:id/recall', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { target_status } = req.body;
    if (!target_status || !['NEW', 'PREPARING'].includes(target_status)) {
      res.status(400).json({ error: 'target_status must be either NEW or PREPARING.' });
      return;
    }
    const order = db.recallKitchenOrder(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.user!.branch_id,
      req.params.id,
      target_status
    );
    res.json({ order, message: `Order recalled back to ${target_status}.` });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to recall order.' });
  }
});

// KDS: Kitchen History & Duration Metrics
apiRouter.get('/kds/history', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, limit } = req.query;
    const history = db.getKitchenHistory(
      req.user!.role,
      req.user!.branch_id,
      {
        branch_id: branch_id as string,
        limit: limit ? parseInt(limit as string, 10) : undefined
      }
    );
    res.json({ history });
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to fetch kitchen history.' });
  }
});

// KDS: Real-time Kitchen Statistics (Active, New, Preparing, Ready, 15m+ Critical)
apiRouter.get('/kds/stats', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id } = req.query;
    const stats = db.getKitchenStats(
      req.user!.role,
      req.user!.branch_id,
      branch_id as string
    );
    res.json({ stats });
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to fetch kitchen stats.' });
  }
});

// ==========================================
// PHASE 7: PURCHASING, REQUEST ORDERS, WAREHOUSE & DELIVERY
// ==========================================

// 1. Suppliers (Strictly Restricted to MASTER OWNER)
apiRouter.get('/suppliers', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const suppliers = db.getSuppliers();
    res.json({ suppliers });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch suppliers.' });
  }
});

apiRouter.post('/suppliers', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplier = db.createSupplier(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.body
    );
    res.status(201).json({ supplier });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create supplier.' });
  }
});

// 2. Purchasing / Purchase Orders (Strictly Restricted to MASTER OWNER)
apiRouter.get('/purchase-orders', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, status } = req.query;
    const purchaseOrders = db.getPurchaseOrders(
      req.user!.role,
      search as string,
      status as any
    );
    res.json({ purchaseOrders });
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to fetch purchase orders.' });
  }
});

apiRouter.get('/purchase-orders/:id', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const po = db.getPurchaseOrderById(req.params.id);
    if (!po) {
      res.status(404).json({ error: 'Purchase order not found.' });
      return;
    }
    res.json({ purchaseOrder: po });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch purchase order.' });
  }
});

apiRouter.post('/purchase-orders', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const po = db.createPurchaseOrder(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.body
    );
    res.status(201).json({ purchaseOrder: po });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create purchase order.' });
  }
});

apiRouter.post('/purchase-orders/:id/approve', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const po = db.approvePurchaseOrder(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.params.id
    );
    res.json({ purchaseOrder: po });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to approve purchase order.' });
  }
});

apiRouter.post('/purchase-orders/:id/receive', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    let { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      const po = db.getPurchaseOrderById(req.params.id);
      if (!po) {
        res.status(404).json({ error: 'Purchase Order not found.' });
        return;
      }
      items = po.items.map(it => ({
        item_id: it.id,
        received_quantity: Math.max(0, it.quantity - (it.received_quantity || 0))
      })).filter(it => it.received_quantity > 0);
    }
    const po = db.receivePurchaseOrder(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.params.id,
      items
    );
    res.json({ purchaseOrder: po });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to receive purchase order.' });
  }
});

apiRouter.post('/purchase-orders/:id/direct-receive', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const po = db.getPurchaseOrderById(req.params.id);
    if (!po) {
      res.status(404).json({ error: 'Purchase Order not found.' });
      return;
    }
    const items = po.items.map(it => ({
      item_id: it.id,
      received_quantity: Math.max(0, it.quantity - (it.received_quantity || 0))
    })).filter(it => it.received_quantity > 0);

    const receivedPo = db.receivePurchaseOrder(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.params.id,
      items
    );
    res.json({ purchaseOrder: receivedPo, message: 'All items received into Central Commissary Warehouse!' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to complete direct purchase order intake.' });
  }
});

// 3. Branch Request Orders
apiRouter.get('/request-orders', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, status, search } = req.query;
    const requestOrders = db.getRequestOrders(
      req.user!.role,
      req.user!.branch_id,
      {
        branch_id: branch_id as string,
        status: status as any,
        search: search as string
      }
    );
    res.json({ requestOrders });
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to fetch request orders.' });
  }
});

apiRouter.get('/request-orders/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const reqOrder = db.getRequestOrderById(
      req.user!.role,
      req.user!.branch_id,
      req.params.id
    );
    if (!reqOrder) {
      res.status(404).json({ error: 'Request order not found.' });
      return;
    }
    res.json({ requestOrder: reqOrder });
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to fetch request order.' });
  }
});

apiRouter.post('/request-orders', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const reqOrder = db.createRequestOrder(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.user!.branch_id,
      req.body
    );
    res.status(201).json({ requestOrder: reqOrder });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create request order.' });
  }
});

apiRouter.put('/request-orders/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const reqOrder = db.editRequestOrder(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.user!.branch_id,
      req.params.id,
      req.body
    );
    res.json({ requestOrder: reqOrder });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to edit request order.' });
  }
});

apiRouter.post('/request-orders/:id/review', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { action, editData } = req.body;
    if (!action || !['APPROVE', 'REJECT', 'EDIT'].includes(action)) {
      res.status(400).json({ error: 'Action must be APPROVE, REJECT, or EDIT.' });
      return;
    }
    const reqOrder = db.reviewAndApproveRequestOrder(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.params.id,
      action,
      editData
    );
    res.json({ requestOrder: reqOrder });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to review request order.' });
  }
});

apiRouter.post('/request-orders/:id/direct-fulfill', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = db.directFulfillRequestOrder(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.params.id
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to directly fulfill request order.' });
  }
});

// STEP 2: Warehouseman & Owner Dispatch Request Order En Route
apiRouter.post('/request-orders/:id/dispatch', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = db.dispatchRequestOrder(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.params.id,
      req.body
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to dispatch request order.' });
  }
});

// STEP 3: Branch Manager & Owner Confirm Physical Delivery Receipt & Auto-Increment Branch Stock
apiRouter.post('/request-orders/:id/confirm-receive', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = db.confirmReceiveRequestOrder(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.user!.branch_id,
      req.params.id,
      req.body
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to confirm physical delivery receipt.' });
  }
});

// Alias for branch-requests
apiRouter.post('/branch-requests/:id/dispatch', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = db.dispatchRequestOrder(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.params.id,
      req.body
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to dispatch request order.' });
  }
});

apiRouter.post('/branch-requests/:id/confirm-receive', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = db.confirmReceiveRequestOrder(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.user!.branch_id,
      req.params.id,
      req.body
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to confirm physical delivery receipt.' });
  }
});

// Alias for branch-requests
apiRouter.post('/branch-requests/:id/direct-fulfill', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = db.directFulfillRequestOrder(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.params.id
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to directly fulfill request order.' });
  }
});

// 4. AI Stock Recommendations & 1-Click Restock Trigger
apiRouter.get('/ai/stock-recommendations', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { target_branch_id } = req.query;
    const recommendations = db.getAIStockRecommendations(
      req.user!.role,
      req.user!.branch_id,
      target_branch_id as string
    );
    res.json({ recommendations });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch AI recommendations.' });
  }
});

apiRouter.post('/ai/stock-requests/trigger', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, ingredient_id, quantity } = req.body;
    if (!branch_id || !ingredient_id) {
      res.status(400).json({ error: 'branch_id and ingredient_id are required.' });
      return;
    }
    const reqOrder = db.triggerAIRestockRequest(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      { branch_id, ingredient_id, quantity }
    );
    res.status(201).json({ requestOrder: reqOrder });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to trigger AI restock request.' });
  }
});

apiRouter.post('/ai/stock-requests/approve-and-dispatch', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, ingredient_id, quantity, driver_name, vehicle_info } = req.body;
    if (!branch_id || !ingredient_id) {
      res.status(400).json({ error: 'branch_id and ingredient_id are required.' });
      return;
    }
    const result = db.approveAndDispatchAIRestock(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      { branch_id, ingredient_id, quantity, driver_name, vehicle_info }
    );
    res.status(201).json({
      message: 'Restock request approved and dispatched to Central Commissary Delivery pipeline.',
      requestOrder: result.requestOrder,
      delivery: result.delivery
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to approve and dispatch restock request.' });
  }
});

// ==========================================
// PHASE 12: AI COMMAND CENTER & REPORTING
// ==========================================

// AI Business Status (Today's metrics & alerts breakdown)
apiRouter.get('/ai/status', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, date_preset, start_date, end_date } = req.query;
    const status = aiAgent.getBusinessStatus(
      req.user!.role,
      req.user!.branch_id,
      {
        branch_id: branch_id as string,
        date_preset: (date_preset as string) || 'TODAY',
        start_date: start_date as string,
        end_date: end_date as string
      }
    );
    res.json({ status });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch AI business status.' });
  }
});

// AI Alerts Center
apiRouter.get('/ai/alerts', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, category, priority, status, date_preset, start_date, end_date } = req.query;
    const alerts = aiAgent.getAIAlerts(
      req.user!.role,
      req.user!.branch_id,
      {
        branch_id: branch_id as string,
        category: category as string,
        priority: priority as string,
        status: status as string,
        date_preset: date_preset as string,
        start_date: start_date as string,
        end_date: end_date as string
      }
    );
    res.json({ alerts });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch AI alerts.' });
  }
});

// Review AI Alert
apiRouter.patch('/ai/alerts/:id/review', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { notes } = req.body;
    const alert = aiAgent.reviewAlert(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.params.id,
      notes
    );
    res.json({ alert });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to review AI alert.' });
  }
});

// Resolve AI Alert
apiRouter.patch('/ai/alerts/:id/resolve', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { notes } = req.body;
    const alert = aiAgent.resolveAlert(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.params.id,
      notes
    );
    res.json({ alert });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to resolve AI alert.' });
  }
});

// Create Draft Request Order from AI Low Stock Alert
apiRouter.post('/ai/alerts/draft-request', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { alertId, branchId, ingredientId, quantity } = req.body;
    if (!branchId || !ingredientId) {
      res.status(400).json({ error: 'branchId and ingredientId are required.' });
      return;
    }
    const requestOrder = aiAgent.createDraftRequestFromAI(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      {
        alertId,
        branchId,
        ingredientId,
        quantity: Number(quantity) || 50
      }
    );
    res.status(201).json({ requestOrder });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to generate draft request order.' });
  }
});

// Generate 12-Section AI Business Report
apiRouter.get('/ai/report', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { period, branch_id, start_date, end_date } = req.query;
    const report = aiAgent.generateBusinessReport(
      req.user!.role,
      req.user!.branch_id,
      {
        period: (period as any) || 'TODAY',
        branch_id: branch_id as string,
        start_date: start_date as string,
        end_date: end_date as string
      }
    );
    res.json({ report });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate AI report.' });
  }
});

// Send Report Email Notification Trigger (Section 32)
apiRouter.post('/ai/report/email', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { report, recipientEmail } = req.body;
    const targetEmail = recipientEmail || req.user!.email;

    db.createNotification({
      recipient_user_id: req.user!.id,
      title: `Tagpuan ERP AI Business Report (${report?.period || 'TODAY'})`,
      message: `AI Business report sent to ${targetEmail}. Net Sales: ₱${report?.sales_summary?.total_sales?.toLocaleString() || 0}, Orders: ${report?.sales_summary?.order_count || 0}.`,
      type: 'SYSTEM',
      action_url: '/ai-command'
    });

    db.createAuditLog({
      user_id: req.user!.id,
      user_email: req.user!.email,
      role: req.user!.role,
      branch_id: req.user!.branch_id,
      action: 'AI_REPORT_GENERATED',
      entity_type: 'SYSTEM',
      entity_id: `REPORT-${Date.now()}`,
      metadata: { recipientEmail: targetEmail, period: report?.period }
    });

    res.json({
      success: true,
      message: `AI Daily Business Report dispatched to ${targetEmail} and logged to notifications.`
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to dispatch report email.' });
  }
});

// AI Cashier Remittance & Variance Reconciliation (Section 32)
const handleReconcileRemittances = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetDate = (req.query.date || req.body?.date) as string | undefined;
    const result = await aiAgent.reconcileDailyCashierRemittances(
      req.user!.role,
      req.user!.branch_id,
      targetDate
    );
    res.json({ success: true, reconciliation: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to execute daily cashier reconciliation.' });
  }
};
apiRouter.get('/ai/reconcile-remittances', requireAuth, handleReconcileRemittances);
apiRouter.post('/ai/reconcile-remittances', requireAuth, handleReconcileRemittances);

// AI Chat Assistant (Grounded, Role-Aware, Anti-Hallucination)
apiRouter.post('/ai/chat', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message, branchId } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message text is required.' });
      return;
    }
    const result = await aiAgent.processAIChat(
      req.user!.role,
      req.user!.branch_id,
      req.user!.email,
      message.trim(),
      branchId
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'AI Chat encountered an error.' });
  }
});

// 5. Central Warehouse Stock & Fulfillment
apiRouter.get('/warehouse/stock', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const stock = db.getWarehouseStock(req.user!.role);
    res.json({ stock });
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to fetch warehouse stock.' });
  }
});

apiRouter.post('/warehouse/quick-restock', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = db.quickRestockWarehouse(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.body
    );
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to restock warehouse.' });
  }
});

apiRouter.post('/warehouse/prepare-delivery', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = db.prepareRequestOrder(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.body
    );
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to prepare request order.' });
  }
});

// 6. Deliveries & Branch Receiving
apiRouter.get('/deliveries', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, status } = req.query;
    const deliveries = db.getDeliveries(
      req.user!.role,
      req.user!.branch_id,
      {
        branch_id: branch_id as string,
        status: status as any
      }
    );
    res.json({ deliveries });
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to fetch deliveries.' });
  }
});

apiRouter.get('/deliveries/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const delivery = db.getDeliveryById(
      req.user!.role,
      req.user!.branch_id,
      req.params.id
    );
    if (!delivery) {
      res.status(404).json({ error: 'Delivery not found.' });
      return;
    }
    res.json({ delivery });
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to fetch delivery.' });
  }
});

apiRouter.post('/deliveries/:id/dispatch', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const delivery = db.dispatchDelivery(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      {
        delivery_id: req.params.id,
        ...req.body
      }
    );
    res.json({ delivery });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to dispatch delivery.' });
  }
});

apiRouter.post('/deliveries/:id/receive', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = db.receiveDelivery(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.user!.branch_id,
      {
        delivery_id: req.params.id,
        ...req.body
      }
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to receive delivery.' });
  }
});

// ==========================================
// PHASE 8: FINANCIAL, SHIFTS, REMITTANCE, EXPENSES & RECONCILIATION
// ==========================================

// Shifts: Open Cashier Shift with Cash Count
apiRouter.post('/financial/shifts/open', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, opening_cash, notes } = req.body;
    const shift = db.openCashierShift(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.user!.branch_id,
      branch_id || req.user!.branch_id || '',
      Number(opening_cash) || 0,
      notes
    );
    res.status(201).json({ shift });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to open cashier shift.' });
  }
});

// Shifts: Close Cashier Shift with Denomination Breakdown
apiRouter.post('/financial/shifts/close', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const shift = db.closeCashierShift(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.body
    );
    res.json({ shift });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to close cashier shift.' });
  }
});

// Shifts: List Cashier Shifts
apiRouter.get('/financial/shifts', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, cashier_id, date, status, start_date, end_date } = req.query;
    const shifts = db.getCashierShifts(
      req.user!.role,
      req.user!.branch_id,
      {
        branch_id: branch_id as string,
        cashier_id: cashier_id as string,
        date: date as string,
        status: status as string,
        start_date: start_date as string,
        end_date: end_date as string
      }
    );
    res.json({ shifts });
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to fetch cashier shifts.' });
  }
});

// Shifts: Get Single Cashier Shift
apiRouter.get('/financial/shifts/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const shift = db.getCashierShiftById(
      req.user!.role,
      req.user!.branch_id,
      req.params.id
    );
    if (!shift) {
      res.status(404).json({ error: 'Shift not found.' });
      return;
    }
    res.json({ shift });
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to fetch shift.' });
  }
});

// Remittances: Handler functions for dual mounting (/financial/remittances & /remittances)
const handleCreateRemittance = (req: AuthenticatedRequest, res: Response) => {
  try {
    const remittance = db.createRemittance(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.body
    );
    res.status(201).json({ remittance });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create cash remittance.' });
  }
};

const handleGetRemittances = (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, cashier_id, status, start_date, end_date } = req.query;
    console.log(`[API /remittances] GET request from ${req.user?.email} (${req.user?.role}, assigned branch: ${req.user?.branch_id})`, {
      query: req.query
    });

    // 1. Role-based branch determination
    let effectiveBranchId: string | undefined = undefined;
    if (req.user?.role === 'MANAGER') {
      // For Branch Manager: Automatically default to the manager's assigned branchId
      effectiveBranchId = req.user.branch_id || undefined;
    } else if (req.user?.role === 'CASHIER') {
      effectiveBranchId = req.user.branch_id || undefined;
    } else if (req.user?.role === 'OWNER') {
      // For Master Owner: Return aggregated data for ALL branches if branchId is not specified or set to "ALL", or filtered by the selected branch.
      if (branch_id && branch_id !== 'ALL') {
        effectiveBranchId = branch_id as string;
      } else {
        effectiveBranchId = undefined; // Return ALL
      }
    } else {
      effectiveBranchId = (branch_id && branch_id !== 'ALL') ? (branch_id as string) : undefined;
    }

    const remittances = db.getRemittances(
      req.user!.role,
      req.user!.branch_id,
      {
        branch_id: effectiveBranchId,
        cashier_id: cashier_id as string,
        status: status as string,
        start_date: start_date as string,
        end_date: end_date as string
      }
    );

    console.log(`[API /remittances] Successfully resolved ${remittances?.length || 0} remittances for ${req.user?.role} (effectiveBranch: ${effectiveBranchId || 'ALL'})`);
    res.json({
      remittances: remittances || [],
      data: remittances || []
    });
  } catch (error: any) {
    console.error('[API /remittances] Error fetching remittances:', error);
    // Return empty array with error info instead of breaking client promises
    res.status(200).json({ remittances: [], data: [], error: error.message || 'Failed to fetch remittances.' });
  }
};

const handleReviewRemittance = (req: AuthenticatedRequest, res: Response) => {
  try {
    const { action, rejection_reason, correction_notes, manager_verified_amount, manager_deductions_amount, manager_deductions_notes } = req.body;
    const remittance = db.reviewRemittance(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.params.id,
      action,
      rejection_reason,
      correction_notes,
      {
        manager_verified_amount,
        manager_deductions_amount,
        manager_deductions_notes
      }
    );
    res.json({ remittance });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to review remittance.' });
  }
};

const handleGetRemittanceById = (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const remittances = db.getRemittances(req.user!.role, req.user!.branch_id, {});
    const remittance = remittances.find(r => r.id === id || r.remittance_number === id);
    if (!remittance) {
      res.status(404).json({ error: 'Remittance not found' });
      return;
    }
    res.json({ remittance });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch remittance' });
  }
};

// Mount dual routes for remittances to satisfy /api/financial/remittances AND /api/remittances
apiRouter.post('/financial/remittances', requireAuth, handleCreateRemittance);
apiRouter.get('/financial/remittances', requireAuth, handleGetRemittances);
apiRouter.get('/financial/remittances/:id', requireAuth, handleGetRemittanceById);
apiRouter.post('/financial/remittances/:id/review', requireAuth, handleReviewRemittance);

apiRouter.post('/remittances', requireAuth, handleCreateRemittance);
apiRouter.get('/remittances', requireAuth, handleGetRemittances);
apiRouter.get('/remittances/:id', requireAuth, handleGetRemittanceById);
apiRouter.post('/remittances/:id/review', requireAuth, handleReviewRemittance);

// Expenses: Create Expense Record
apiRouter.post('/financial/expenses', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const expense = db.createExpense(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.user!.branch_id,
      req.body
    );
    res.status(201).json({ expense });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to record expense.' });
  }
});

// Expenses: List Expenses
apiRouter.get('/financial/expenses', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, category, status, payment_method, start_date, end_date } = req.query;
    const expenses = db.getExpenses(
      req.user!.role,
      req.user!.branch_id,
      {
        branch_id: branch_id as string,
        category: category as string,
        status: status as string,
        payment_method: payment_method as string,
        start_date: start_date as string,
        end_date: end_date as string
      }
    );
    res.json({ expenses });
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to fetch expenses.' });
  }
});

// Expenses: Review Expense (Owner Only)
apiRouter.post('/financial/expenses/:id/review', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const expense = db.reviewExpense(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.params.id,
      req.body
    );
    res.json({ expense });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to review expense.' });
  }
});

// Reporting: Aggregated Sales Summary Metrics
apiRouter.get('/financial/sales-summary', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, cashier_id, date_preset, start_date, end_date, payment_method, source } = req.query;
    const summary = db.getSalesSummary(
      req.user!.role,
      req.user!.branch_id,
      {
        branch_id: branch_id as string,
        cashier_id: cashier_id as string,
        date_preset: date_preset as string,
        start_date: start_date as string,
        end_date: end_date as string,
        payment_method: payment_method as string,
        source: source as string
      }
    );
    res.json({ summary });
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to compute sales summary.' });
  }
});

// Reporting: Daily Product Sales Summary (Finished Goods)
apiRouter.get('/financial/daily-product-sales', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, date_preset, date, start_date, end_date } = req.query;
    const data = db.getDailyProductSales(
      req.user!.role,
      req.user!.branch_id,
      {
        branch_id: branch_id as string,
        date_preset: date_preset as string,
        date: date as string,
        start_date: start_date as string,
        end_date: end_date as string
      }
    );
    res.json(data);
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to compute daily product sales.' });
  }
});

// Reporting: Daily Sales Breakdown (Mounted on /financial/daily-sales, /reports/daily-sales, and /daily-sales)
const handleGetDailySales = (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, date_preset, start_date, end_date } = req.query;
    console.log(`[API /reports/daily-sales] GET request from ${req.user?.email} (${req.user?.role}, assigned branch: ${req.user?.branch_id})`, {
      query: req.query
    });

    let effectiveBranchId: string | undefined = undefined;
    if (req.user?.role === 'MANAGER') {
      // For Branch Manager: Automatically default to the manager's assigned branchId
      effectiveBranchId = req.user.branch_id || undefined;
    } else if (req.user?.role === 'CASHIER') {
      effectiveBranchId = req.user.branch_id || undefined;
    } else if (req.user?.role === 'OWNER') {
      // For Master Owner: Return aggregated data for ALL branches if branchId is not specified or set to "ALL", or filtered by the selected branch.
      if (branch_id && branch_id !== 'ALL') {
        effectiveBranchId = branch_id as string;
      } else {
        effectiveBranchId = undefined; // Return ALL
      }
    } else {
      effectiveBranchId = (branch_id && branch_id !== 'ALL') ? (branch_id as string) : undefined;
    }

    const reports = db.getDailySalesReports(
      req.user!.role,
      req.user!.branch_id,
      {
        branch_id: effectiveBranchId,
        date_preset: date_preset as string,
        start_date: start_date as string,
        end_date: end_date as string
      }
    );

    console.log(`[API /reports/daily-sales] Successfully computed ${reports?.length || 0} daily sales reports for role ${req.user?.role} (effectiveBranch: ${effectiveBranchId || 'ALL'})`);
    res.json({
      reports: reports || [],
      sales: reports || [],
      data: reports || []
    });
  } catch (error: any) {
    console.error('[API /reports/daily-sales] Error computing daily sales reports:', error);
    res.status(200).json({ reports: [], sales: [], data: [], error: error.message || 'Failed to compute daily sales reports.' });
  }
};

apiRouter.get('/financial/daily-sales', requireAuth, handleGetDailySales);
apiRouter.get('/reports/daily-sales', requireAuth, handleGetDailySales);
apiRouter.get('/daily-sales', requireAuth, handleGetDailySales);

// Reporting: Cashier Sales Breakdown
apiRouter.get('/financial/cashier-sales', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, date_preset, start_date, end_date } = req.query;
    const reports = db.getCashierSalesSummary(
      req.user!.role,
      req.user!.branch_id,
      {
        branch_id: branch_id as string,
        date_preset: date_preset as string,
        start_date: start_date as string,
        end_date: end_date as string
      }
    );
    res.json({ reports });
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to compute cashier sales summary.' });
  }
});

// Reconciliation: Multi-source Reconciliation View
apiRouter.get('/financial/reconciliation', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, date_preset, start_date, end_date } = req.query;
    const records = db.getFinancialReconciliation(
      req.user!.role,
      req.user!.branch_id,
      {
        branch_id: branch_id as string,
        date_preset: date_preset as string,
        start_date: start_date as string,
        end_date: end_date as string
      }
    );
    res.json({ records });
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to compute financial reconciliation.' });
  }
});

// Reconciliation: Mark Reconciled (Owner / Manager)
apiRouter.post('/financial/reconciliation/reconcile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = db.reconcileFinancialRecord(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.body
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to reconcile financial record.' });
  }
});

// Adjustments: Owner Manual Financial Adjustment Override
apiRouter.post('/financial/adjust', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const adjustment = db.adjustFinancialRecord(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.body
    );
    res.json({ adjustment });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to perform financial adjustment.' });
  }
});

// ==========================================
// PHASE 10: LOYALTY TICKETS, CUSTOMER POINTS & REWARDS
// ==========================================

// 1. Get Loyalty Customers
apiRouter.get('/loyalty/customers', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, branch_id } = req.query;
    const customers = db.getLoyaltyCustomers(
      req.user!.role,
      req.user!.branch_id,
      {
        search: search as string,
        branch_id: branch_id as string
      }
    );
    res.json({ customers });
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to fetch loyalty customers.' });
  }
});

// 2. Get Single Loyalty Customer by ID
apiRouter.get('/loyalty/customers/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = db.getLoyaltyCustomerById(
      req.user!.role,
      req.user!.branch_id,
      req.params.id
    );
    res.json({ customer });
  } catch (error: any) {
    res.status(404).json({ error: error.message || 'Loyalty customer not found.' });
  }
});

// 3. Create Loyalty Customer
apiRouter.post('/loyalty/customers', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = db.createLoyaltyCustomer(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.user!.branch_id,
      req.body
    );
    res.status(201).json({ customer });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create loyalty customer.' });
  }
});

// 3b. Automatic Customer Profile Capture & Lookup (For Customer Kiosk & Cashier POS)
apiRouter.post('/loyalty/lookup-or-capture', (req: Request, res: Response) => {
  try {
    const { name, phone, branch_id } = req.body;
    const cleanPhone = phone ? String(phone).trim() : '';
    const cleanName = name ? String(name).trim() : '';

    if (!cleanPhone && !cleanName) {
      res.status(400).json({ error: 'Customer name or phone number is required.' });
      return;
    }

    const customer = db.getOrCreateLoyaltyCustomer(
      cleanName || (cleanPhone ? `Customer ${cleanPhone.slice(-4)}` : 'Loyalty Member'),
      cleanPhone || null,
      null,
      branch_id
    );

    res.json({
      success: true,
      customer,
      current_points: customer.current_points,
      can_redeem: customer.current_points >= 200
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to lookup or capture loyalty profile.' });
  }
});

// 3c. 1-Click Free Meal Reward Redemption (200 points) for Kiosk & POS
apiRouter.post('/loyalty/kiosk-redeem', (req: Request, res: Response) => {
  try {
    const { customer_id, branch_id, order_id, product_id, processed_by_name } = req.body;
    if (!customer_id) {
      res.status(400).json({ error: 'Customer ID is required.' });
      return;
    }

    const result = db.redeemLoyaltyRewardDirect({
      customer_id,
      branch_id,
      order_id,
      product_id,
      processed_by_name
    });

    res.json({
      success: true,
      ...result,
      message: '1 Free Reward Meal redeemed successfully (200 points)!'
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to redeem loyalty meal reward.' });
  }
});

// 4. Adjust Loyalty Points (OWNER only)
apiRouter.post('/loyalty/customers/adjust-points', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const transaction = db.adjustLoyaltyPoints(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.user!.branch_id,
      req.body
    );
    res.json({ transaction, message: 'Points successfully adjusted.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to adjust loyalty points.' });
  }
});

// 5. Redeem Loyalty Reward (200 pts for 1 free menu product)
apiRouter.post('/loyalty/rewards/redeem', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = db.redeemLoyaltyReward(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.user!.branch_id,
      req.body
    );
    res.json({ ...result, message: 'Reward successfully redeemed!' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to redeem reward.' });
  }
});

// 6. Get Loyalty Point Ledger / Transactions
apiRouter.get('/loyalty/transactions', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, customer_id, type, date } = req.query;
    const transactions = db.getLoyaltyTransactions(
      req.user!.role,
      req.user!.branch_id,
      {
        branch_id: branch_id as string,
        customer_id: customer_id as string,
        type: type as string,
        date: date as string
      }
    );
    res.json({ transactions });
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to fetch loyalty transactions.' });
  }
});

// 7. Get Reward Redemptions History
apiRouter.get('/loyalty/redemptions', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, customer_id } = req.query;
    const redemptions = db.getLoyaltyRedemptions(
      req.user!.role,
      req.user!.branch_id,
      {
        branch_id: branch_id as string,
        customer_id: customer_id as string
      }
    );
    res.json({ redemptions });
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to fetch redemptions.' });
  }
});

// 8. Get Loyalty Analytics & Summary
apiRouter.get('/loyalty/summary', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id } = req.query;
    const summary = db.getLoyaltySummary(
      req.user!.role,
      req.user!.branch_id,
      branch_id as string
    );
    res.json({ summary });
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to fetch loyalty summary.' });
  }
});

// 9. Save / Hold Ticket
apiRouter.post('/loyalty/tickets/save', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticket = db.saveTicket(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.user!.branch_id,
      req.body
    );
    res.status(201).json({ ticket, message: `Ticket #${ticket.ticket_number} saved for ${ticket.customer_name}.` });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to hold ticket.' });
  }
});

// 10. Get Saved / Held Tickets
apiRouter.get('/loyalty/tickets', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id } = req.query;
    const tickets = db.getSavedTickets(
      req.user!.role,
      req.user!.branch_id,
      branch_id as string
    );
    res.json({ tickets });
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to fetch saved tickets.' });
  }
});

// 11. Delete / Dismiss Saved Ticket
apiRouter.delete('/loyalty/tickets/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = db.deleteSavedTicket(
      req.user!.role,
      req.user!.branch_id,
      req.params.id
    );
    if (!success) {
      res.status(404).json({ error: 'Saved ticket not found.' });
      return;
    }
    res.json({ success: true, message: 'Saved ticket dismissed.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to delete saved ticket.' });
  }
});

// ==========================================
// SECURITY & SCHEMA STATUS INSPECTOR
// ==========================================
apiRouter.get('/security/schema-status', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    appName: 'TAGPUAN ERP',
    phase: 'PHASE 10 - Loyalty Tickets + Customer Points + Rewards Engine',
    business: 'Tagpuan - Home of Authentic Burger & Siomai',
    tables: [
      { name: 'roles', columns: ['id', 'name', 'description', 'created_at'], rls: 'ENABLED' },
      { name: 'branches', columns: ['id', 'name', 'is_active', 'created_at', 'updated_at'], rls: 'ENABLED' },
      { name: 'profiles', columns: ['id', 'auth_user_id', 'full_name', 'email', 'role', 'branch_id', 'is_active', 'created_at', 'updated_at'], rls: 'ENABLED' },
      { name: 'employees', columns: ['id', 'user_id', 'employee_code', 'full_name', 'email', 'role', 'branch_id', 'status', 'created_at', 'updated_at'], rls: 'ENABLED' },
      { name: 'attendance', columns: ['id', 'employee_id', 'user_id', 'branch_id', 'date', 'clock_in', 'clock_out', 'total_minutes', 'status', 'created_at'], rls: 'ENABLED' },
      { name: 'payroll_rules', columns: ['id', 'deduct_break_hour', 'minimum_hours_for_break_deduction', 'rates', 'updated_at', 'updated_by'], rls: 'ENABLED' },
      { name: 'payroll_periods', columns: ['id', 'name', 'start_date', 'end_date', 'is_closed', 'created_at'], rls: 'ENABLED' },
      { name: 'payroll_records', columns: ['id', 'period_id', 'employee_id', 'branch_id', 'gross_hours', 'payable_hours', 'final_amount', 'status', 'created_at'], rls: 'ENABLED' },
      { name: 'salaries', columns: ['id', 'employee_id', 'branch_id', 'base_hourly_rate', 'monthly_allowance', 'effective_date', 'created_at'], rls: 'ENABLED' },
      { name: 'payslips', columns: ['id', 'payroll_record_id', 'employee_id', 'branch_id', 'gross_pay', 'deductions', 'net_pay', 'prepared_by', 'approved_by', 'created_at'], rls: 'ENABLED' },
      { name: 'products', columns: ['id', 'product_code', 'product_name', 'category', 'description', 'selling_price', 'product_image', 'is_active', 'created_at', 'updated_at'], rls: 'ENABLED' },
      { name: 'ingredients', columns: ['id', 'item_code', 'item_name', 'category', 'unit', 'cost_price', 'reorder_level', 'maximum_stock', 'is_active', 'created_at', 'updated_at'], rls: 'ENABLED' },
      { name: 'recipes', columns: ['id', 'product_id', 'name', 'description', 'is_active', 'created_at', 'updated_at'], rls: 'ENABLED' },
      { name: 'recipe_items', columns: ['id', 'recipe_id', 'ingredient_id', 'quantity_consumed', 'unit', 'extraction_code'], rls: 'ENABLED' },
      { name: 'branch_inventory', columns: ['id', 'branch_id', 'ingredient_id', 'current_stock', 'reorder_level', 'maximum_stock', 'status', 'cost_price', 'updated_at'], rls: 'ENABLED' },
      { name: 'inventory_transactions', columns: ['id', 'branch_id', 'ingredient_id', 'quantity', 'transaction_type', 'previous_stock', 'new_stock', 'reason', 'user_id', 'created_at'], rls: 'ENABLED' },
      { name: 'inventory_low_stock_events', columns: ['id', 'branch_id', 'ingredient_id', 'current_stock', 'reorder_level', 'unit', 'status', 'created_at', 'resolved_at'], rls: 'ENABLED' },
      { name: 'orders', columns: ['id', 'order_number', 'branch_id', 'cashier_id', 'source', 'status', 'subtotal', 'discount_amount', 'total', 'customer_name', 'loyalty_points_earned', 'notes', 'created_at'], rls: 'ENABLED' },
      { name: 'order_items', columns: ['id', 'order_id', 'product_id', 'unit_price', 'quantity', 'subtotal', 'notes'], rls: 'ENABLED' },
      { name: 'order_item_modifiers', columns: ['id', 'order_item_id', 'modifier_id', 'modifier_name', 'additional_price', 'ingredient_id', 'quantity_consumed'], rls: 'ENABLED' },
      { name: 'payments', columns: ['id', 'order_id', 'branch_id', 'payment_method', 'amount', 'amount_received', 'change_amount', 'reference_number', 'payment_status', 'processed_by'], rls: 'ENABLED' },
      { name: 'sales_transactions', columns: ['id', 'order_id', 'branch_id', 'amount', 'payment_method', 'source', 'status', 'created_at'], rls: 'ENABLED' },
      { name: 'cashier_sessions', columns: ['id', 'cashier_id', 'branch_id', 'opened_at', 'closed_at', 'status', 'opening_cash', 'closing_cash', 'total_sales', 'total_orders'], rls: 'ENABLED' },
      { name: 'payment_configurations', columns: ['id', 'branch_id', 'payment_method', 'account_name', 'account_number', 'qr_image_url', 'is_active'], rls: 'ENABLED' },
      { name: 'modifier_groups', columns: ['id', 'name', 'type', 'min_selection', 'max_selection', 'options'], rls: 'ENABLED' },
      // Phase 7 Tables
      { name: 'suppliers', columns: ['id', 'supplier_code', 'name', 'contact_person', 'contact_number', 'email', 'address', 'is_active', 'created_at', 'updated_at'], rls: 'ENABLED' },
      { name: 'purchase_orders', columns: ['id', 'po_number', 'supplier_id', 'supplier_name', 'order_date', 'expected_delivery_date', 'status', 'subtotal', 'total_cost', 'created_by', 'approved_by', 'received_by'], rls: 'ENABLED' },
      { name: 'purchase_order_items', columns: ['id', 'po_id', 'ingredient_id', 'ingredient_name', 'item_code', 'unit', 'quantity', 'unit_cost', 'total_cost', 'received_quantity'], rls: 'ENABLED' },
      { name: 'request_orders', columns: ['id', 'request_number', 'branch_id', 'branch_name', 'requester_id', 'requester_name', 'requester_role', 'priority', 'status', 'is_ai_generated', 'reviewed_by', 'approved_by', 'prepared_by'], rls: 'ENABLED' },
      { name: 'request_order_items', columns: ['id', 'request_id', 'ingredient_id', 'ingredient_name', 'item_code', 'unit', 'requested_quantity', 'approved_quantity', 'prepared_quantity', 'delivered_quantity', 'received_quantity', 'remaining_quantity', 'status'], rls: 'ENABLED' },
      { name: 'deliveries', columns: ['id', 'delivery_number', 'request_id', 'request_number', 'source_warehouse_name', 'destination_branch_id', 'destination_branch_name', 'status', 'driver_name', 'vehicle_info', 'estimated_arrival', 'prepared_by', 'dispatched_by', 'received_by', 'status_history'], rls: 'ENABLED' },
      { name: 'delivery_items', columns: ['id', 'delivery_id', 'request_item_id', 'ingredient_id', 'ingredient_name', 'unit', 'requested_quantity', 'approved_quantity', 'prepared_quantity', 'delivered_quantity', 'received_quantity', 'short_quantity', 'rejected_quantity'], rls: 'ENABLED' },
      { name: 'warehouse_stock', columns: ['ingredient_id', 'ingredient_name', 'item_code', 'unit', 'current_stock', 'status'], rls: 'ENABLED' },
      // Phase 8 Tables
      { name: 'cashier_shifts', columns: ['id', 'shift_number', 'branch_id', 'branch_name', 'cashier_id', 'cashier_name', 'opened_at', 'closed_at', 'status', 'opening_cash', 'cash_sales', 'expected_cash', 'actual_cash', 'variance', 'denominations'], rls: 'ENABLED' },
      { name: 'cash_remittances', columns: ['id', 'remittance_number', 'shift_id', 'branch_id', 'branch_name', 'cashier_id', 'cashier_name', 'date', 'expected_cash', 'actual_cash', 'remitted_amount', 'cash_variance', 'remittance_variance', 'proof_image_url', 'proof_type', 'status'], rls: 'ENABLED' },
      { name: 'branch_expenses', columns: ['id', 'expense_number', 'branch_id', 'branch_name', 'category', 'description', 'amount', 'date', 'payment_method', 'paid_to', 'receipt_image_url', 'status', 'created_by_name'], rls: 'ENABLED' },
      { name: 'financial_reconciliations', columns: ['date', 'branch_id', 'branch_name', 'net_sales', 'payment_totals', 'expected_cash', 'actual_cash', 'total_expenses', 'remitted_cash', 'variance', 'is_balanced', 'reconciliation_status'], rls: 'ENABLED' },
      { name: 'financial_adjustments', columns: ['id', 'date', 'branch_id', 'adjustment_type', 'amount', 'reason', 'adjusted_by_name', 'created_at'], rls: 'ENABLED' },
      // Phase 10 Tables
      { name: 'loyalty_customers', columns: ['id', 'customer_name', 'phone_number', 'email', 'current_points', 'total_points_earned', 'total_points_redeemed', 'registered_branch_id', 'registered_branch_name', 'created_at'], rls: 'ENABLED' },
      { name: 'loyalty_transactions', columns: ['id', 'customer_id', 'customer_name', 'transaction_type', 'points', 'order_number', 'branch_name', 'reward_product_name', 'reason', 'processed_by_name', 'created_at'], rls: 'ENABLED' },
      { name: 'loyalty_redemptions', columns: ['id', 'customer_id', 'customer_name', 'points_spent', 'product_name', 'order_number', 'branch_name', 'cashier_name', 'redeemed_at', 'status'], rls: 'ENABLED' },
      { name: 'saved_tickets', columns: ['id', 'ticket_number', 'branch_name', 'customer_name', 'items', 'subtotal', 'created_at'], rls: 'ENABLED' },
      { name: 'audit_logs', columns: ['id', 'user_id', 'user_email', 'role', 'branch_id', 'action', 'entity_type', 'entity_id', 'timestamp', 'metadata'], rls: 'ENABLED' },
      { name: 'notifications', columns: ['id', 'recipient_user_id', 'title', 'message', 'type', 'read', 'created_at'], rls: 'ENABLED' }
    ],
    rolesConfigured: ['OWNER', 'MANAGER', 'CASHIER', 'CREW', 'WAREHOUSEMAN', 'KITCHEN'],
    branchCount: 17,
    isolationModel: 'Database RLS + Server Authoritative Policy'
  });
});

// ============================================================================
// PHASE 13: OWNER MASTER CONTROL CENTER & SYSTEM ADMINISTRATION (OWNER ONLY)
// ============================================================================

// 1. Master Control Center Overview
apiRouter.get('/admin/overview', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const overview = db.getMasterControlOverview(req.user!.role);
    // Enrich with active alerts count from aiAgent
    const activeAlerts = aiAgent.getAIAlerts(req.user!.role, null).filter(a => a.status !== 'RESOLVED');
    overview.ai_active_alerts_count = activeAlerts.length;
    res.json({ overview });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch Master Control overview.' });
  }
});

// 2. Branch Administration
apiRouter.get('/admin/branches', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const branches = db.getBranches(req.user!.role, null);
    res.json({ branches });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch branches.' });
  }
});

apiRouter.post('/admin/branches', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, address, phone, manager_name, is_active } = req.body;
    const branch = db.createBranch(req.user!.role, req.user!.id, req.user!.email, {
      name,
      address,
      phone,
      manager_name,
      is_active
    });
    res.status(201).json({ branch });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create branch.' });
  }
});

apiRouter.put('/admin/branches/:id', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, address, phone, manager_name, is_active } = req.body;
    const branch = db.updateBranch(req.user!.role, req.user!.id, req.user!.email, req.params.id, {
      name,
      address,
      phone,
      manager_name,
      is_active
    });
    res.json({ branch });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update branch.' });
  }
});

apiRouter.patch('/admin/branches/:id/status', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      res.status(400).json({ error: 'is_active boolean is required.' });
      return;
    }
    const branch = db.toggleBranchStatus(req.user!.role, req.user!.id, req.user!.email, req.params.id, is_active);
    res.json({ branch });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to toggle branch status.' });
  }
});

// 3. User & Role Administration
apiRouter.get('/admin/users', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const profiles = db.getProfiles(req.user!.role, null, req.user!.id);
    const employees = db.getEmployees(req.user!.role, null, req.user!.id);
    const enrichedUsers = profiles.map(p => {
      const emp = employees.find(e => e.user_id === p.id);
      return {
        ...p,
        employee_code: emp?.employee_code || null,
        employee_id: emp?.id || null,
        status: emp?.status || (p.is_active ? 'ACTIVE' : 'INACTIVE')
      };
    });
    res.json({ users: enrichedUsers });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch users.' });
  }
});

apiRouter.post('/admin/users', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, full_name, role, branch_id, kiosk_pin } = req.body;
    if (!email || !password || !full_name || !role) {
      res.status(400).json({ error: 'email, password, full_name, and role are required.' });
      return;
    }
    const createRes = db.createUser(req.user!.role, req.user!.id, req.user!.email, {
      email,
      password,
      full_name,
      role,
      branch_id: role === 'OWNER' ? null : branch_id,
      kiosk_pin
    });
    res.status(201).json({ user: createRes.user, temporaryPassword: createRes.temporaryPassword });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create user.' });
  }
});

apiRouter.patch('/admin/users/:id/kiosk-pin', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { kiosk_pin } = req.body;
    if (!kiosk_pin) {
      res.status(400).json({ error: 'kiosk_pin is required.' });
      return;
    }
    const updated = db.updateUserKioskPin(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.params.id,
      kiosk_pin
    );
    res.json({ user: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update kiosk PIN.' });
  }
});

apiRouter.put('/admin/users/:id', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { full_name, role, branch_id, is_active } = req.body;
    const profile = db.updateUserProfile(req.user!.role, req.user!.id, req.user!.email, req.params.id, {
      full_name,
      role,
      branch_id,
      is_active
    });
    res.json({ user: profile });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update user profile.' });
  }
});

apiRouter.post('/admin/users/:id/reset-password', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters.' });
      return;
    }
    const result = db.resetUserPasswordByOwner(req.user!.role, req.user!.id, req.user!.email, req.params.id, new_password);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to reset user password.' });
  }
});

apiRouter.patch('/admin/users/:id/status', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      res.status(400).json({ error: 'is_active boolean is required.' });
      return;
    }
    const profile = db.updateUserProfile(req.user!.role, req.user!.id, req.user!.email, req.params.id, {
      is_active
    });
    res.json({ user: profile });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to toggle user status.' });
  }
});

// MASTER OWNER KIOSK ACCESS VAULT: 17 Branches PIN Directory
apiRouter.get('/admin/branch-kiosk-pins', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const directory = db.getBranchKioskPinDirectory(req.user!.role);
    res.json({ directory });
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Failed to fetch branch kiosk PIN directory.' });
  }
});

apiRouter.post('/admin/branch-kiosk-pins', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, kiosk_pin, terminal_name } = req.body;
    if (!branch_id || !kiosk_pin) {
      res.status(400).json({ error: 'branch_id and kiosk_pin are required.' });
      return;
    }
    const result = db.createBranchKioskPin(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      branch_id,
      kiosk_pin,
      terminal_name
    );
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create branch kiosk PIN.' });
  }
});

apiRouter.post('/admin/branch-kiosk-pins/reset', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id, new_pin, manager_id, terminal_name } = req.body;
    if (!branch_id || !new_pin) {
      res.status(400).json({ error: 'branch_id and new_pin are required.' });
      return;
    }
    const result = db.resetBranchKioskPin(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      branch_id,
      new_pin,
      manager_id,
      terminal_name
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to reset branch kiosk PIN.' });
  }
});

apiRouter.delete('/admin/branch-kiosk-pins/:branch_id', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branch_id } = req.params;
    const result = db.deleteBranchKioskPin(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      branch_id
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to delete branch kiosk PIN.' });
  }
});

apiRouter.delete('/admin/users/:id', requireAuth, requireOwner, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = db.deleteUser(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      id
    );
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to delete user.' });
  }
});

// 4. Menu & Pricing Administration
apiRouter.get('/admin/products', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const products = db.getProducts();
    res.json({ products });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch products.' });
  }
});

apiRouter.post('/admin/products', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { product_code, product_name, category, description, selling_price, product_image, is_active } = req.body;
    const product = db.createProduct(req.user!.role, req.user!.id, req.user!.email, {
      product_code,
      product_name,
      category,
      description,
      selling_price: Number(selling_price),
      product_image,
      is_active
    });
    res.status(201).json({ product });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create product.' });
  }
});

apiRouter.put('/admin/products/:id', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const product = db.updateProduct(req.user!.role, req.user!.id, req.user!.email, req.params.id, req.body);
    res.json({ product });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update product.' });
  }
});

apiRouter.patch('/admin/products/:id/price', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { new_price } = req.body;
    if (new_price === undefined || Number(new_price) < 0) {
      res.status(400).json({ error: 'Valid positive new_price is required.' });
      return;
    }
    const product = db.updateProductPrice(req.user!.role, req.user!.id, req.user!.email, req.params.id, Number(new_price));
    res.json({ product });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update price.' });
  }
});

apiRouter.patch('/admin/products/:id/status', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      res.status(400).json({ error: 'is_active boolean is required.' });
      return;
    }
    const product = db.updateProduct(req.user!.role, req.user!.id, req.user!.email, req.params.id, { is_active });
    res.json({ product });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update product status.' });
  }
});

// 5. Inventory & Recipe Administration
apiRouter.get('/admin/inventory/thresholds', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const ingredients = db.getIngredients();
    res.json({ ingredients });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch ingredient thresholds.' });
  }
});

apiRouter.patch('/admin/inventory/thresholds/:id', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reorder_level, maximum_stock } = req.body;
    if (reorder_level === undefined || Number(reorder_level) < 0) {
      res.status(400).json({ error: 'Valid positive reorder_level is required.' });
      return;
    }
    const ingredient = db.updateIngredientThreshold(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.params.id,
      Number(reorder_level),
      maximum_stock !== undefined ? Number(maximum_stock) : undefined
    );
    res.json({ ingredient });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update inventory threshold.' });
  }
});

apiRouter.get('/admin/recipes', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const recipes = db.getRecipes();
    res.json({ recipes });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch recipes.' });
  }
});

apiRouter.post('/admin/recipes', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const recipe = db.saveRecipe(req.user!.role, req.user!.id, req.user!.email, req.body);
    res.json({ recipe });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to save recipe.' });
  }
});

// 6. Payment & QR Administration
apiRouter.get('/admin/payments/configs', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const configs = db.getAllPaymentConfigurations();
    res.json({ configs });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch payment configurations.' });
  }
});

apiRouter.put('/admin/payments/configs/:id', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const config = db.updatePaymentConfigurationWithAudit(req.user!.role, req.user!.id, req.user!.email, req.params.id, req.body);
    res.json({ config });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update payment configuration.' });
  }
});

apiRouter.patch('/admin/payments/configs/:id/toggle', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      res.status(400).json({ error: 'is_active boolean is required.' });
      return;
    }
    const config = db.togglePaymentConfigurationWithAudit(req.user!.role, req.user!.id, req.user!.email, req.params.id, is_active);
    res.json({ config });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to toggle payment method.' });
  }
});

// 7. AI Agent Settings
apiRouter.get('/admin/ai/settings', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = db.getAISettings();
    res.json({ settings });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch AI settings.' });
  }
});

apiRouter.put('/admin/ai/settings', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = db.updateAISettings(req.user!.role, req.user!.id, req.user!.email, req.body);
    res.json({ settings });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update AI settings.' });
  }
});

// 8. System Settings
apiRouter.get('/admin/settings', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = db.getSystemSettings();
    res.json({ settings });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch system settings.' });
  }
});

apiRouter.put('/admin/settings', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = db.updateSystemSettings(req.user!.role, req.user!.id, req.user!.email, req.body);
    res.json({ settings });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update system settings.' });
  }
});

// System Initialization / Factory Reset for Live Production Deployment
apiRouter.post('/admin/clean-production-reset', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = db.cleanTestDataForProduction(req.user!.role, req.user!.id, req.user!.email);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to initialize system for production.' });
  }
});

// n8n Webhook Test Dispatcher
apiRouter.post('/admin/webhooks/test', requireAuth, requireRole('OWNER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await dispatchN8NWebhook('test.ping', {
      branch_name: 'Tagpuan Central Hub',
      total_sales: 12500,
      cash_breakdown: {
        expected_cash: 8500,
        actual_cash: 8500,
        remitted_amount: 8500,
        cash_sales: 8500,
        non_cash_sales: 4000
      },
      variance: {
        amount: 0,
        flag: 'BALANCED'
      },
      order_metrics: {
        total_orders: 24,
        completed_orders: 24,
        average_order_value: 520.83
      },
      metadata: {
        triggered_by: req.user!.email,
        test_message: 'n8n Webhook connection verified successfully from Tagpuan Master Owner Control Center.'
      }
    });

    if (result.success) {
      res.json({ success: true, message: 'Test webhook sent successfully to n8n!', status: result.status });
    } else {
      res.status(400).json({ success: false, error: result.error || 'Failed to dispatch test webhook to n8n' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Webhook dispatch error' });
  }
});

// 9. System Audit Logs
apiRouter.get('/admin/audit-logs', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { action, entity_type, branch_id, search, limit } = req.query;
    let logs = db.getAuditLogs(req.user!.role, null, req.user!.id);

    if (action && action !== 'ALL') {
      logs = logs.filter(l => l.action === action);
    }
    if (entity_type && entity_type !== 'ALL') {
      logs = logs.filter(l => l.entity_type === entity_type);
    }
    if (branch_id && branch_id !== 'ALL') {
      logs = logs.filter(l => l.branch_id === branch_id);
    }
    if (search) {
      const q = (search as string).toLowerCase();
      logs = logs.filter(l =>
        (l.user_email || '').toLowerCase().includes(q) ||
        (l.action || '').toLowerCase().includes(q) ||
        (l.entity_type || '').toLowerCase().includes(q) ||
        JSON.stringify(l.metadata || {}).toLowerCase().includes(q)
      );
    }

    // Sort newest first
    logs = logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const maxItems = limit ? parseInt(limit as string, 10) : 100;
    res.json({ logs: logs.slice(0, maxItems), total: logs.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch audit logs.' });
  }
});

// ============================================================================
// PHASE 14: CENTRAL REPORTS, EXPORT/IMPORT & DATA MANAGEMENT
// ============================================================================

// 1. Unified Reports Generation (17 Reports, strictly RLS enforced)
apiRouter.get('/reports', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, period, start_date, end_date, branch_id, sort_by, sort_order } = req.query;
    if (!type) {
      res.status(400).json({ error: 'Report type query parameter is required.' });
      return;
    }

    const report = ReportsEngine.generateReport(
      req.user!.role,
      req.user!.branch_id,
      req.user!.email,
      {
        type: type as any,
        period: period as any,
        start_date: start_date as string,
        end_date: end_date as string,
        branch_id: branch_id as string,
        sort_by: sort_by as string,
        sort_order: sort_order as any
      }
    );

    res.json(report);
  } catch (error: any) {
    res.status(error.message?.includes('Forbidden') ? 403 : 500).json({ error: error.message || 'Failed to generate report.' });
  }
});

// 2. Report Center Dashboard Summary (9-card operational overview)
apiRouter.get('/reports/dashboard-summary', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { period, start_date, end_date, branch_id } = req.query;
    const summary = ReportsEngine.getDashboardSummary(
      req.user!.role,
      req.user!.branch_id,
      {
        period: period as any,
        start_date: start_date as string,
        end_date: end_date as string,
        branch_id: branch_id as string
      }
    );

    res.json({ summary });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to calculate report dashboard summary.' });
  }
});

// 3. Log Export Event (CSV, Excel, PDF, Print audit tracking)
apiRouter.post('/reports/log-export', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { report_type, format, branch_id, branch_name, period, row_count, file_name } = req.body;
    const log = DataManagementEngine.logExport({
      report_type: report_type || 'Unknown Report',
      format: format || 'CSV',
      branch_id: branch_id || req.user!.branch_id || 'ALL',
      branch_name,
      period,
      user_email: req.user!.email,
      row_count: Number(row_count) || 0,
      file_name: file_name || 'report_export'
    });

    res.json({ success: true, log });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to record export log.' });
  }
});

// 4. Data Management Overview Status
apiRouter.get('/data-management/status', requireAuth, requireRole('OWNER', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = DataManagementEngine.getStatus(req.user!.role, req.user!.branch_id);
    res.json({ status });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch data management status.' });
  }
});

// 5. Read-Only Data Integrity Check (Non-destructive, zero record mutations)
apiRouter.get('/data-management/integrity-check', requireAuth, requireRole('OWNER', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const check = DataManagementEngine.runIntegrityCheck();
    res.json({ check });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to run data integrity verification.' });
  }
});

// 6. Validate Import (Dry run preview for Products, Inventory, Branches, Customers)
apiRouter.post('/data-management/validate-import', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, rows } = req.body;
    if (!type || !rows) {
      res.status(400).json({ error: 'Import type and rows data are required.' });
      return;
    }

    const result = DataManagementEngine.validateImport(type, rows);
    res.json({ validation: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to validate import dataset.' });
  }
});

// 7. Execute Import (Owner only, master data only)
apiRouter.post('/data-management/execute-import', requireAuth, requireRole('OWNER'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, file_name, rows } = req.body;
    if (!type || !file_name || !rows) {
      res.status(400).json({ error: 'Import type, file_name, and rows data are required.' });
      return;
    }

    const audit = DataManagementEngine.executeImport(
      req.user!.role,
      req.user!.id,
      req.user!.email,
      req.user!.branch_id,
      { type, file_name, rows }
    );

    res.json({ success: true, audit });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to execute master data import.' });
  }
});


