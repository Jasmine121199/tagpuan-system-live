import {
  Profile,
  Branch,
  AuditLog,
  AppNotification,
  CreateUserInput,
  UserRole,
  Employee,
  AttendanceRecord,
  PayrollRule,
  PayrollPeriod,
  PayrollRecord,
  PayrollStatus,
  Product,
  AIMatchImageResponse,
  MenuCategory,
  Ingredient,
  Recipe,
  BranchInventory,
  InventoryTransaction,
  InventoryLowStockEvent,
  DeductionValidationResult,
  AIAlert,
  AIBusinessStatus,
  AIBusinessReport,
  AIChatMessage,
  AIAgentSettings,
  SystemSettings,
  MasterControlOverview,
  PaymentConfiguration,
  ReportType,
  ReportDatePreset,
  UnifiedReportResponse,
  ReportDashboardSummary,
  MasterImportType,
  ImportValidationResult,
  ImportAuditRecord,
  DataIntegrityCheckResult,
  DataManagementStatus,
  ExportLogRecord,
  CreateKioskOrderInput,
  KioskMenuData,
  CartItemInput,
  ModifierGroup,
  Order,
  AIStockRecommendation,
  RequestOrder,
  CreateRequestOrderInput,
  OwnerEditRequestOrderInput,
  DispatchRequestOrderInput,
  BranchKioskPinDirectoryItem,
  LoyaltyCustomer,
  LoyaltyTransaction,
  LoyaltyRedemption,
  CreateLoyaltyCustomerInput,
  AdjustLoyaltyPointsInput,
  RedeemLoyaltyRewardInput,
  LoyaltySummary,
  DailyProductSalesSummary,
  DailyIngredientUsageAuditReport,
  CashRemittance,
  DailySalesReport
} from '../types/index';
import { supabaseAdapter, isSupabaseConfigured } from './supabase';

const API_BASE = '/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    // Restore token from localStorage or sessionStorage across all supported key variants
    this.token =
      localStorage.getItem('tagpuan_auth_token') ||
      sessionStorage.getItem('tagpuan_auth_token') ||
      localStorage.getItem('tagpuan_token') ||
      sessionStorage.getItem('tagpuan_token');

    // Ensure backwards-compatible keys stay populated
    if (this.token) {
      try {
        localStorage.setItem('tagpuan_token', this.token);
        localStorage.setItem('tagpuan_auth_token', this.token);
      } catch {
        // Safe fallback in restricted storage contexts
      }
    }
  }

  public setToken(token: string | null, rememberMe: boolean = false): void {
    this.token = token;
    if (token) {
      localStorage.setItem('tagpuan_auth_token', token);
      localStorage.setItem('tagpuan_token', token);
      if (rememberMe) {
        localStorage.setItem('tagpuan_remember', 'true');
        sessionStorage.removeItem('tagpuan_auth_token');
        sessionStorage.removeItem('tagpuan_token');
      } else {
        sessionStorage.setItem('tagpuan_auth_token', token);
        sessionStorage.setItem('tagpuan_token', token);
      }
    } else {
      localStorage.removeItem('tagpuan_auth_token');
      localStorage.removeItem('tagpuan_token');
      localStorage.removeItem('tagpuan_remember');
      sessionStorage.removeItem('tagpuan_auth_token');
      sessionStorage.removeItem('tagpuan_token');
    }
  }

  public getToken(): string | null {
    if (!this.token) {
      this.token =
        localStorage.getItem('tagpuan_auth_token') ||
        sessionStorage.getItem('tagpuan_auth_token') ||
        localStorage.getItem('tagpuan_token') ||
        sessionStorage.getItem('tagpuan_token');
    }
    return this.token;
  }

  public getAuthHeaders(): Record<string, string> {
    const t = this.getToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const contentType = response.headers.get('content-type') || '';
    let data: any;

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        if (!response.ok) {
          throw new Error(`Server returned HTTP ${response.status} (${response.statusText}): ${text.slice(0, 150)}`);
        }
        throw new Error(`Unexpected non-JSON response from ${endpoint} (HTTP ${response.status}): ${text.slice(0, 150)}`);
      }
    }

    if (!response.ok) {
      throw new Error(data?.error || data?.message || `Request failed with status ${response.status}`);
    }

    return data as T;
  }

  // --- AUTH ---
  public async login(email: string, password: string, rememberMe: boolean): Promise<{ user: Profile; token: string; expires_at: number }> {
    const res = await this.request<{ user: Profile; token: string; expires_at: number }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe })
    });
    this.setToken(res.token, rememberMe);
    return res;
  }

  public async logout(): Promise<void> {
    try {
      if (this.token) {
        await this.request('/auth/logout', { method: 'POST' });
      }
    } finally {
      this.setToken(null);
    }
  }

  public async getCurrentUser(): Promise<Profile | null> {
    if (!this.token) return null;
    try {
      const res = await this.request<{ user: Profile }>('/auth/me');
      return res.user;
    } catch {
      this.setToken(null);
      return null;
    }
  }

  public async forgotPassword(email: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  public async verifyResetEmail(email: string): Promise<{ exists: boolean; email: string; full_name: string; role: UserRole; branch_name?: string }> {
    return this.request<{ exists: boolean; email: string; full_name: string; role: UserRole; branch_name?: string }>('/auth/verify-reset-email', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  public async instantResetPassword(email: string, newPassword: string): Promise<{ success: boolean; message: string; profile?: Profile }> {
    return this.request<{ success: boolean; message: string; profile?: Profile }>('/auth/instant-reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, newPassword })
    });
  }

  public async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword })
    });
  }

  public async getFirstOwnerStatus(): Promise<{ hasOwner: boolean }> {
    return this.request<{ hasOwner: boolean }>('/auth/first-owner-status');
  }

  public async bootstrapFirstOwner(data: { email: string; password: string; full_name: string; masterKey?: string }): Promise<{ user: Profile; token: string }> {
    const res = await this.request<{ user: Profile; token: string; expires_at: number }>('/auth/bootstrap-first-owner', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    this.setToken(res.token, true);
    return res;
  }

  // --- BRANCHES ---
  public async getBranches(): Promise<Branch[]> {
    if (isSupabaseConfigured()) {
      try {
        const sbBranches = await supabaseAdapter.getBranches();
        if (sbBranches && sbBranches.length > 0) {
          return sbBranches;
        }
      } catch (err) {
        console.warn('[ApiClient:getBranches] Supabase direct query error, falling back to REST/local:', err);
      }
    }
    try {
      const res = await this.request<{ branches: Branch[] }>('/branches');
      return res.branches || [];
    } catch {
      try {
        const kioskBranches = await this.getKioskBranches();
        return kioskBranches.map(b => ({
          id: b.id,
          name: b.name,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
      } catch {
        return [];
      }
    }
  }

  public async getBranch(id: string): Promise<Branch> {
    const res = await this.request<{ branch: Branch }>(`/branches/${id}`);
    return res.branch;
  }

  public async updateBranch(id: string, data: Partial<Branch>): Promise<Branch> {
    const res = await this.request<{ branch: Branch; message?: string }>(`/branches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.branch;
  }

  public async toggleBranchStatus(id: string, operating_status: 'OPEN' | 'MAINTENANCE' | 'CLOSED', is_active: boolean = true): Promise<Branch> {
    const res = await this.request<{ branch: Branch; message?: string }>(`/branches/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ operating_status, is_active })
    });
    return res.branch;
  }

  // --- USERS ---
  public async getUsers(): Promise<Profile[]> {
    const res = await this.request<{ users: Profile[] }>('/users');
    return res.users;
  }

  public async createUser(data: CreateUserInput): Promise<{ profile: Profile }> {
    return this.request<{ profile: Profile }>('/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async toggleUserStatus(userId: string, is_active: boolean): Promise<{ user: Profile }> {
    return this.request<{ user: Profile }>(`/users/${userId}/toggle-status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active })
    });
  }

  public async assignUserBranch(userId: string, branch_id: string | null): Promise<{ user: Profile }> {
    return this.request<{ user: Profile }>(`/users/${userId}/assign-branch`, {
      method: 'PATCH',
      body: JSON.stringify({ branch_id })
    });
  }

  public async setupMyKioskPin(kiosk_pin: string): Promise<{ user: Profile }> {
    return this.request<{ user: Profile }>('/users/me/kiosk-pin', {
      method: 'POST',
      body: JSON.stringify({ kiosk_pin })
    });
  }

  public async updateUserKioskPin(userId: string, kiosk_pin: string): Promise<{ user: Profile }> {
    return this.request<{ user: Profile }>(`/users/${userId}/kiosk-pin`, {
      method: 'PATCH',
      body: JSON.stringify({ kiosk_pin })
    });
  }

  public async deleteUser(userId: string): Promise<{ success: boolean; message: string; deletedId: string }> {
    return this.request<{ success: boolean; message: string; deletedId: string }>(`/users/${userId}`, {
      method: 'DELETE'
    });
  }

  // --- EMPLOYEES (PHASE 2) ---
  public async getEmployees(branchId?: string, status?: string): Promise<Employee[]> {
    const params = new URLSearchParams();
    if (branchId) params.append('branch_id', branchId);
    if (status) params.append('status', status);
    const res = await this.request<{ employees: Employee[] }>(`/employees?${params.toString()}`);
    return res.employees;
  }

  public async createEmployee(data: Partial<Employee>): Promise<Employee> {
    const res = await this.request<{ employee: Employee }>('/employees', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.employee;
  }

  public async updateEmployee(id: string, data: Partial<Employee>): Promise<Employee> {
    const res = await this.request<{ employee: Employee }>(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.employee;
  }

  // --- ATTENDANCE (PHASE 2) ---
  public async getAttendance(filters?: { branch_id?: string; employee_id?: string; start_date?: string; end_date?: string }): Promise<AttendanceRecord[]> {
    if (isSupabaseConfigured()) {
      try {
        const sbAttendance = await supabaseAdapter.getAttendance(filters?.branch_id);
        if (sbAttendance && sbAttendance.length > 0) {
          return sbAttendance;
        }
      } catch (err) {
        console.warn('[ApiClient:getAttendance] Supabase query error, falling back to REST/local:', err);
      }
    }
    const params = new URLSearchParams();
    if (filters?.branch_id) params.append('branch_id', filters.branch_id);
    if (filters?.employee_id) params.append('employee_id', filters.employee_id);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    const res = await this.request<{ attendance: AttendanceRecord[] }>(`/attendance?${params.toString()}`);
    return res.attendance;
  }

  public async clockIn(branchId: string, employeeId?: string): Promise<AttendanceRecord> {
    const res = await this.request<{ record: AttendanceRecord }>('/attendance/clock-in', {
      method: 'POST',
      body: JSON.stringify({ branch_id: branchId, employee_id: employeeId })
    });
    return res.record;
  }

  public async clockOut(branchId: string, employeeId?: string): Promise<AttendanceRecord> {
    const res = await this.request<{ record: AttendanceRecord }>('/attendance/clock-out', {
      method: 'POST',
      body: JSON.stringify({ branch_id: branchId, employee_id: employeeId })
    });
    return res.record;
  }

  // --- PAYROLL (PHASE 2) ---
  public async getPayrollRules(): Promise<PayrollRule> {
    const res = await this.request<{ rules: PayrollRule }>('/payroll/rules');
    return res.rules;
  }

  public async updatePayrollRules(data: Partial<PayrollRule>): Promise<PayrollRule> {
    const res = await this.request<{ rules: PayrollRule }>('/payroll/rules', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.rules;
  }

  public async getPayrollPeriods(): Promise<PayrollPeriod[]> {
    const res = await this.request<{ periods: PayrollPeriod[] }>('/payroll/periods');
    return res.periods;
  }

  public async createPayrollPeriod(data: { name: string; start_date: string; end_date: string }): Promise<PayrollPeriod> {
    const res = await this.request<{ period: PayrollPeriod }>('/payroll/periods', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.period;
  }

  public async calculatePayroll(periodId: string, branchId?: string): Promise<{ records: PayrollRecord[]; totalAmount: number; employeeCount: number }> {
    return this.request('/payroll/calculate', {
      method: 'POST',
      body: JSON.stringify({ period_id: periodId, branch_id: branchId })
    });
  }

  public async getPayrollRecords(filters?: { period_id?: string; branch_id?: string; status?: string }): Promise<PayrollRecord[]> {
    const params = new URLSearchParams();
    if (filters?.period_id) params.append('period_id', filters.period_id);
    if (filters?.branch_id) params.append('branch_id', filters.branch_id);
    if (filters?.status) params.append('status', filters.status);
    const res = await this.request<{ records: PayrollRecord[] }>(`/payroll/records?${params.toString()}`);
    return res.records;
  }

  public async updatePayrollStatus(id: string, status: PayrollStatus): Promise<PayrollRecord> {
    const res = await this.request<{ record: PayrollRecord }>(`/payroll/records/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    return res.record;
  }

  public async adjustPayrollRecord(id: string, adjustments: number, note: string): Promise<PayrollRecord> {
    const res = await this.request<{ record: PayrollRecord }>(`/payroll/records/${id}/adjust`, {
      method: 'PATCH',
      body: JSON.stringify({ adjustments, note })
    });
    return res.record;
  }

  // --- PRODUCTS (PHASE 3) ---
  public async getProducts(filters?: { category?: string; search?: string; activeOnly?: boolean }): Promise<Product[]> {
    if (isSupabaseConfigured()) {
      try {
        const sbProducts = await supabaseAdapter.getMenuItems();
        if (sbProducts && sbProducts.length > 0) {
          let list = sbProducts;
          if (filters?.category) {
            list = list.filter(p => p.category === filters.category);
          }
          if (filters?.search) {
            const s = filters.search.toLowerCase();
            list = list.filter(p => p.product_name?.toLowerCase().includes(s) || p.product_code?.toLowerCase().includes(s));
          }
          if (filters?.activeOnly) {
            list = list.filter(p => p.is_active);
          }
          return list;
        }
      } catch (err) {
        console.warn('[ApiClient:getProducts] Supabase query error, falling back to REST/local:', err);
      }
    }
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.activeOnly) params.append('activeOnly', 'true');
    const res = await this.request<{ products: Product[] }>(`/products?${params.toString()}`);
    return res.products;
  }

  public async getProductById(id: string): Promise<Product> {
    const res = await this.request<{ product: Product }>(`/products/${id}`);
    return res.product;
  }

  public async createProduct(data: Partial<Product>): Promise<Product> {
    const res = await this.request<{ product: Product }>('/products', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.product;
  }

  public async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const res = await this.request<{ product: Product }>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.product;
  }

  public async updateProductPrice(id: string, selling_price: number): Promise<Product> {
    const res = await this.request<{ product: Product }>(`/products/${id}/price`, {
      method: 'PATCH',
      body: JSON.stringify({ selling_price })
    });
    return res.product;
  }

  public async toggleProductStatus(id: string, is_active: boolean): Promise<Product> {
    const res = await this.request<{ product: Product }>(`/products/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active })
    });
    return res.product;
  }

  public async toggleProductAvailability(id: string, is_available: boolean): Promise<Product> {
    const res = await this.request<{ product: Product }>(`/products/${id}/availability`, {
      method: 'PATCH',
      body: JSON.stringify({ is_available })
    });
    return res.product;
  }

  public async updateProductBranchAvailability(id: string, unavailable_branches: string[]): Promise<Product> {
    const res = await this.request<{ product: Product }>(`/products/${id}/branch-availability`, {
      method: 'PATCH',
      body: JSON.stringify({ unavailable_branches })
    });
    return res.product;
  }

  public async deleteProduct(id: string): Promise<{ product: Product; archived: boolean; message: string }> {
    return this.request<{ product: Product; archived: boolean; message: string }>(`/products/${id}`, {
      method: 'DELETE'
    });
  }

  public async uploadProductImage(id: string, image_data: string): Promise<Product> {
    const res = await this.request<{ product: Product }>(`/products/${id}/image`, {
      method: 'POST',
      body: JSON.stringify({ image_data })
    });
    return res.product;
  }

  public async removeProductImage(id: string): Promise<Product> {
    const res = await this.request<{ product: Product }>(`/products/${id}/image`, {
      method: 'DELETE'
    });
    return res.product;
  }

  public async aiMatchProductImage(imageData: string, mimeType?: string): Promise<AIMatchImageResponse> {
    return this.request<AIMatchImageResponse>('/products/ai-match-image', {
      method: 'POST',
      body: JSON.stringify({ image_data: imageData, mime_type: mimeType })
    });
  }

  public async reassignProductImage(
    sourceProductId: string,
    targetProductId: string,
    imageData?: string,
    clearSource: boolean = false
  ): Promise<{ success: boolean; product: Product; message: string }> {
    return this.request<{ success: boolean; product: Product; message: string }>(
      `/products/${sourceProductId}/reassign-image`,
      {
        method: 'POST',
        body: JSON.stringify({ target_product_id: targetProductId, image_data: imageData, clear_source: clearSource })
      }
    );
  }

  public async reorderProducts(orders: { id: string; display_order: number }[]): Promise<Product[]> {
    const res = await this.request<{ products: Product[] }>('/products/reorder', {
      method: 'POST',
      body: JSON.stringify({ orders })
    });
    return res.products;
  }

  // --- CATEGORIES ---
  public async getCategories(): Promise<MenuCategory[]> {
    const res = await this.request<{ categories: MenuCategory[] }>('/categories');
    return res.categories;
  }

  public async createCategory(data: { name: string; code?: string; display_order?: number }): Promise<MenuCategory> {
    const res = await this.request<{ category: MenuCategory }>('/categories', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.category;
  }

  public async updateCategory(id: string, data: Partial<MenuCategory>): Promise<MenuCategory> {
    const res = await this.request<{ category: MenuCategory }>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.category;
  }

  public async reorderCategories(orders: { id: string; display_order: number }[]): Promise<MenuCategory[]> {
    const res = await this.request<{ categories: MenuCategory[] }>('/categories/reorder', {
      method: 'POST',
      body: JSON.stringify({ orders })
    });
    return res.categories;
  }

  // --- MODIFIERS (PHASE 4) ---
  public async getModifierGroups(): Promise<ModifierGroup[]> {
    const res = await this.request<{ groups: ModifierGroup[] }>('/pos/modifiers');
    return res.groups;
  }

  public async createModifierGroup(data: Omit<ModifierGroup, 'id'>): Promise<ModifierGroup> {
    const res = await this.request<{ group: ModifierGroup }>('/pos/modifiers', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.group;
  }

  public async updateModifierGroup(id: string, data: Partial<ModifierGroup>): Promise<ModifierGroup> {
    const res = await this.request<{ group: ModifierGroup }>(`/pos/modifiers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.group;
  }

  public async deleteModifierGroup(id: string): Promise<void> {
    await this.request(`/pos/modifiers/${id}`, {
      method: 'DELETE'
    });
  }

  // --- INGREDIENTS (PHASE 3) ---
  public async getIngredients(filters?: { category?: string; search?: string }): Promise<Ingredient[]> {
    if (isSupabaseConfigured()) {
      try {
        const sbIngredients = await supabaseAdapter.getIngredients();
        if (sbIngredients && sbIngredients.length > 0) {
          let list = sbIngredients;
          if (filters?.category) {
            list = list.filter(i => i.category === filters.category);
          }
          if (filters?.search) {
            const s = filters.search.toLowerCase();
            list = list.filter(i => i.item_name?.toLowerCase().includes(s) || i.item_code?.toLowerCase().includes(s));
          }
          return list;
        }
      } catch (err) {
        console.warn('[ApiClient:getIngredients] Supabase query error, falling back to REST/local:', err);
      }
    }
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);
    const res = await this.request<{ ingredients: Ingredient[] }>(`/ingredients?${params.toString()}`);
    return res.ingredients;
  }

  public async getIngredientById(id: string): Promise<Ingredient> {
    const res = await this.request<{ ingredient: Ingredient }>(`/ingredients/${id}`);
    return res.ingredient;
  }

  // --- BRANCH STOCK REQUEST ORDERS ---
  public async getRequestOrders(filters?: { branch_id?: string; status?: string }): Promise<RequestOrder[]> {
    const params = new URLSearchParams();
    if (filters?.branch_id && filters.branch_id !== 'ALL') params.append('branch_id', filters.branch_id);
    if (filters?.status && filters.status !== 'ALL') params.append('status', filters.status);
    const res = await this.request<{ requestOrders: RequestOrder[] }>(`/request-orders?${params.toString()}`);
    return res.requestOrders;
  }

  public async createRequestOrder(data: CreateRequestOrderInput): Promise<{ requestOrder: RequestOrder }> {
    return this.request<{ requestOrder: RequestOrder }>('/request-orders', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async reviewRequestOrder(
    id: string,
    action: 'APPROVE' | 'REJECT' | 'EDIT',
    editData?: OwnerEditRequestOrderInput
  ): Promise<{ requestOrder: RequestOrder }> {
    return this.request<{ requestOrder: RequestOrder }>(`/request-orders/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, editData })
    });
  }

  public async directFulfillRequestOrder(id: string): Promise<{ request: RequestOrder; message: string }> {
    return this.request<{ request: RequestOrder; message: string }>(`/request-orders/${id}/direct-fulfill`, {
      method: 'POST'
    });
  }

  // Step 2: Warehouseman & Master Owner Dispatch Request Order En Route
  public async dispatchRequestOrder(id: string, data?: DispatchRequestOrderInput): Promise<{ request: RequestOrder; message: string }> {
    return this.request<{ request: RequestOrder; message: string }>(`/request-orders/${id}/dispatch`, {
      method: 'POST',
      body: JSON.stringify(data || {})
    });
  }

  // Step 3: Branch Manager & Master Owner Confirm Physical Delivery Receipt
  public async confirmReceiveRequestOrder(id: string, data?: { receiving_notes?: string }): Promise<{ request: RequestOrder; message: string }> {
    return this.request<{ request: RequestOrder; message: string }>(`/request-orders/${id}/confirm-receive`, {
      method: 'POST',
      body: JSON.stringify(data || {})
    });
  }

  // Loyalty & Rewards Automatic Profile Capture
  public async lookupOrCaptureLoyaltyCustomer(data: { name?: string; phone: string; branch_id?: string }): Promise<{
    success: boolean;
    customer: any;
    current_points: number;
    can_redeem: boolean;
  }> {
    return this.request<{
      success: boolean;
      customer: any;
      current_points: number;
      can_redeem: boolean;
    }>('/loyalty/lookup-or-capture', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // 1-Click Free Meal Redemption (200 points)
  public async kioskRedeemLoyaltyReward(data: {
    customer_id: string;
    branch_id?: string;
    order_id?: string;
    product_id?: string;
    processed_by_name?: string;
  }): Promise<{ success: boolean; redemption: any; remaining_points: number; message: string }> {
    return this.request<{ success: boolean; redemption: any; remaining_points: number; message: string }>(
      '/loyalty/kiosk-redeem',
      {
        method: 'POST',
        body: JSON.stringify(data)
      }
    );
  }

  public async createIngredient(data: Partial<Ingredient>): Promise<Ingredient> {
    const res = await this.request<{ ingredient: Ingredient }>('/ingredients', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.ingredient;
  }

  public async updateIngredient(id: string, data: Partial<Ingredient>): Promise<Ingredient> {
    const res = await this.request<{ ingredient: Ingredient }>(`/ingredients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.ingredient;
  }

  // --- RECIPES (PHASE 3) ---
  public async getRecipes(): Promise<Recipe[]> {
    const res = await this.request<{ recipes: Recipe[] }>('/recipes');
    return res.recipes;
  }

  public async getRecipeByProductId(productId: string): Promise<Recipe> {
    const res = await this.request<{ recipe: Recipe }>(`/recipes/product/${productId}`);
    return res.recipe;
  }

  public async getRecipeById(id: string): Promise<Recipe> {
    const res = await this.request<{ recipe: Recipe }>(`/recipes/${id}`);
    return res.recipe;
  }

  public async saveRecipe(data: {
    product_id: string;
    name?: string;
    description?: string;
    is_active?: boolean;
    items: {
      ingredient_id: string;
      quantity_consumed: number;
      unit: string;
      extraction_code?: string | null;
    }[];
  }): Promise<Recipe> {
    const res = await this.request<{ recipe: Recipe }>('/recipes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.recipe;
  }

  // --- BRANCH INVENTORY (PHASE 3) ---
  public async getBranchInventory(filters?: { branch_id?: string; status?: string; category?: string; search?: string }): Promise<BranchInventory[]> {
    const params = new URLSearchParams();
    if (filters?.branch_id) params.append('branch_id', filters.branch_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);
    const res = await this.request<{ inventory: BranchInventory[] }>(`/inventory?${params.toString()}`);
    return res.inventory;
  }

  public async getInventorySummary(branch_id?: string): Promise<{ totalItems: number; inStock: number; lowStock: number; outOfStock: number; branchName?: string }> {
    const params = new URLSearchParams();
    if (branch_id) params.append('branch_id', branch_id);
    const res = await this.request<{ summary: any }>(`/inventory/summary?${params.toString()}`);
    return res.summary;
  }

  public async updateInventoryConfig(id: string, data: { cost_price?: number; reorder_level?: number; maximum_stock?: number; unit?: string }): Promise<BranchInventory> {
    const res = await this.request<{ inventory: BranchInventory }>(`/inventory/${id}/config`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    return res.inventory;
  }

  // --- STOCK MOVEMENTS (PHASE 3) ---
  public async stockIn(data: { branch_id: string; ingredient_id: string; quantity: number; reason?: string }): Promise<{ inventory: BranchInventory; transaction: InventoryTransaction }> {
    return this.request('/inventory/stock-in', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async adjustStock(data: { branch_id: string; ingredient_id: string; new_stock: number; reason: string }): Promise<{ inventory: BranchInventory; transaction: InventoryTransaction }> {
    return this.request('/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async recordRejectedStock(data: { branch_id: string; ingredient_id: string; rejected_quantity: number; reason: string }): Promise<{ transaction: InventoryTransaction }> {
    return this.request('/inventory/reject', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async getInventoryTransactions(filters?: { branch_id?: string; ingredient_id?: string; type?: string }): Promise<InventoryTransaction[]> {
    if (isSupabaseConfigured()) {
      try {
        const sbTx = await supabaseAdapter.getInventoryTransactions(filters?.branch_id);
        if (sbTx && sbTx.length > 0) {
          return sbTx;
        }
      } catch (err) {
        console.warn('[ApiClient:getInventoryTransactions] Supabase query error, falling back to REST/local:', err);
      }
    }
    const params = new URLSearchParams();
    if (filters?.branch_id) params.append('branch_id', filters.branch_id);
    if (filters?.ingredient_id) params.append('ingredient_id', filters.ingredient_id);
    if (filters?.type) params.append('type', filters.type);
    const res = await this.request<{ transactions: InventoryTransaction[] }>(`/inventory/transactions?${params.toString()}`);
    return res.transactions;
  }

  // --- LOW STOCK & NOTIFICATIONS (PHASE 3) ---
  public async getLowStockEvents(filters?: { branch_id?: string; status?: string }): Promise<InventoryLowStockEvent[]> {
    const params = new URLSearchParams();
    if (filters?.branch_id) params.append('branch_id', filters.branch_id);
    if (filters?.status) params.append('status', filters.status);
    const res = await this.request<{ events: InventoryLowStockEvent[] }>(`/inventory/low-stock-events?${params.toString()}`);
    return res.events;
  }

  public async resolveLowStockEvent(id: string): Promise<InventoryLowStockEvent> {
    const res = await this.request<{ event: InventoryLowStockEvent }>(`/inventory/low-stock-events/${id}/resolve`, {
      method: 'PATCH'
    });
    return res.event;
  }

  // --- RECIPE DEDUCTION ENGINE (PHASE 3) ---
  public async validateProductDeduction(data: { branch_id: string; product_id: string; order_quantity: number }): Promise<DeductionValidationResult> {
    const res = await this.request<{ validation: DeductionValidationResult }>('/inventory/validate-deduction', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.validation;
  }

  public async deductProductInventory(data: { branch_id: string; product_id: string; order_quantity: number; reason?: string }): Promise<{ success: boolean; result: DeductionValidationResult; transactions: InventoryTransaction[] }> {
    return this.request('/inventory/deduct', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // --- AUDIT LOGS ---
  public async getAuditLogs(): Promise<AuditLog[]> {
    const res = await this.request<{ logs: AuditLog[] }>('/audit-logs');
    return res.logs;
  }

  // --- NOTIFICATIONS ---
  public async getNotifications(): Promise<AppNotification[]> {
    const res = await this.request<{ notifications: AppNotification[] }>('/notifications');
    return res.notifications;
  }

  public async markNotificationRead(id: string): Promise<void> {
    await this.request(`/notifications/${id}/read`, { method: 'PATCH' });
  }

  public async markAllNotificationsRead(): Promise<void> {
    await this.request('/notifications/mark-all-read', { method: 'POST' });
  }

  // --- SECURITY STATUS ---
  public async getSchemaStatus(): Promise<any> {
    return this.request('/security/schema-status');
  }

  // --- PHASE 12: AI COMMAND CENTER & REPORTING ---
  public async getAIBusinessStatus(filters?: { branch_id?: string; date_preset?: string; start_date?: string; end_date?: string }): Promise<AIBusinessStatus> {
    const params = new URLSearchParams();
    if (filters?.branch_id) params.append('branch_id', filters.branch_id);
    if (filters?.date_preset) params.append('date_preset', filters.date_preset);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    const res = await this.request<{ status: AIBusinessStatus }>(`/ai/status?${params.toString()}`);
    return res.status;
  }

  public async getAIAlerts(filters?: { branch_id?: string; category?: string; priority?: string; status?: string; date_preset?: string; start_date?: string; end_date?: string }): Promise<AIAlert[]> {
    const params = new URLSearchParams();
    if (filters?.branch_id) params.append('branch_id', filters.branch_id);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.date_preset) params.append('date_preset', filters.date_preset);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    const res = await this.request<{ alerts: AIAlert[] }>(`/ai/alerts?${params.toString()}`);
    return res.alerts;
  }

  public async reviewAIAlert(id: string, notes?: string): Promise<AIAlert> {
    const res = await this.request<{ alert: AIAlert }>(`/ai/alerts/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ notes })
    });
    return res.alert;
  }

  public async resolveAIAlert(id: string, notes?: string): Promise<AIAlert> {
    const res = await this.request<{ alert: AIAlert }>(`/ai/alerts/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ notes })
    });
    return res.alert;
  }

  public async createDraftRequestFromAI(data: { alertId?: string; branchId: string; ingredientId: string; quantity: number }): Promise<any> {
    return this.request('/ai/alerts/draft-request', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async getAIBusinessReport(filters: { period: string; branch_id?: string; start_date?: string; end_date?: string }): Promise<AIBusinessReport> {
    const params = new URLSearchParams();
    params.append('period', filters.period);
    if (filters.branch_id) params.append('branch_id', filters.branch_id);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    const res = await this.request<{ report: AIBusinessReport }>(`/ai/report?${params.toString()}`);
    return res.report;
  }

  public async sendAIBusinessReportEmail(report: AIBusinessReport, recipientEmail?: string): Promise<{ success: boolean; message: string }> {
    return this.request('/ai/report/email', {
      method: 'POST',
      body: JSON.stringify({ report, recipientEmail })
    });
  }

  public async sendAIChatMessage(message: string, branchId?: string): Promise<{ reply: string; suggested_queries: string[]; data_points?: Record<string, any> }> {
    return this.request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, branchId })
    });
  }

  // ==========================================
  // PHASE 13: OWNER MASTER CONTROL CENTER
  // ==========================================

  public async getMasterControlOverview(): Promise<MasterControlOverview> {
    const res = await this.request<{ overview: MasterControlOverview }>('/admin/overview');
    return res.overview;
  }

  // Branches
  public async getAdminBranches(): Promise<Branch[]> {
    const res = await this.request<{ branches: Branch[] }>('/admin/branches');
    return res.branches;
  }

  public async createAdminBranch(data: { name: string; address?: string; phone?: string; manager_name?: string; is_active?: boolean }): Promise<Branch> {
    const res = await this.request<{ branch: Branch }>('/admin/branches', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.branch;
  }

  public async updateAdminBranch(id: string, data: { name?: string; address?: string; phone?: string; manager_name?: string; is_active?: boolean }): Promise<Branch> {
    const res = await this.request<{ branch: Branch }>(`/admin/branches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.branch;
  }

  public async toggleAdminBranchStatus(id: string, is_active: boolean): Promise<Branch> {
    const res = await this.request<{ branch: Branch }>(`/admin/branches/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active })
    });
    return res.branch;
  }

  // Users & Staff
  public async getAdminUsers(): Promise<(Profile & { employee_code?: string | null; employee_id?: string | null; status?: string })[]> {
    const res = await this.request<{ users: (Profile & { employee_code?: string | null; employee_id?: string | null; status?: string })[] }>('/admin/users');
    return res.users;
  }

  public async createAdminUser(data: { email: string; password?: string; full_name: string; role: UserRole; branch_id?: string | null }): Promise<{ user: Profile; temporaryPassword?: string }> {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async updateAdminUser(id: string, data: { full_name?: string; role?: UserRole; branch_id?: string | null; is_active?: boolean }): Promise<Profile> {
    const res = await this.request<{ user: Profile }>(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.user;
  }

  public async resetAdminUserPassword(id: string, new_password: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/admin/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ new_password })
    });
  }

  public async toggleAdminUserStatus(id: string, is_active: boolean): Promise<Profile> {
    const res = await this.request<{ user: Profile }>(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active })
    });
    return res.user;
  }

  public async updateAdminUserKioskPin(id: string, kiosk_pin: string): Promise<Profile> {
    const res = await this.request<{ user: Profile }>(`/admin/users/${id}/kiosk-pin`, {
      method: 'PATCH',
      body: JSON.stringify({ kiosk_pin })
    });
    return res.user;
  }

  // MASTER OWNER KIOSK ACCESS VAULT
  public async getBranchKioskPinDirectory(): Promise<BranchKioskPinDirectoryItem[]> {
    const res = await this.request<{ directory: BranchKioskPinDirectoryItem[] }>('/admin/branch-kiosk-pins');
    return res.directory || [];
  }

  public async createBranchKioskPin(data: { branch_id: string; kiosk_pin: string; terminal_name?: string }): Promise<{ branch_id: string; kiosk_pin: string; terminal_name: string; message: string }> {
    return this.request<{ branch_id: string; kiosk_pin: string; terminal_name: string; message: string }>('/admin/branch-kiosk-pins', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async resetBranchKioskPin(data: { branch_id: string; new_pin: string; manager_id?: string; terminal_name?: string }): Promise<{ branch_id: string; new_pin: string; manager_name: string; message: string }> {
    return this.request<{ branch_id: string; new_pin: string; manager_name: string; message: string }>('/admin/branch-kiosk-pins/reset', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async deleteBranchKioskPin(branchId: string): Promise<{ branch_id: string; branch_name: string; message: string }> {
    return this.request<{ branch_id: string; branch_name: string; message: string }>(`/admin/branch-kiosk-pins/${branchId}`, {
      method: 'DELETE'
    });
  }

  public async deleteAdminUser(id: string): Promise<{ success: boolean; message: string; deletedId: string }> {
    return this.request<{ success: boolean; message: string; deletedId: string }>(`/admin/users/${id}`, {
      method: 'DELETE'
    });
  }

  public async verifyKioskPin(pin: string, branchId?: string): Promise<{ authorized: boolean; role: string; authorizedBy: string; branch_id?: string | null }> {
    const res = await fetch('/api/kiosk/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, branch_id: branchId })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'PIN verification failed');
    }
    return data;
  }

  // Products & Menu
  public async getAdminProducts(): Promise<Product[]> {
    const res = await this.request<{ products: Product[] }>('/admin/products');
    return res.products;
  }

  public async createAdminProduct(data: Partial<Product>): Promise<Product> {
    const res = await this.request<{ product: Product }>('/admin/products', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.product;
  }

  public async updateAdminProduct(id: string, data: Partial<Product>): Promise<Product> {
    const res = await this.request<{ product: Product }>(`/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.product;
  }

  public async updateAdminProductPrice(id: string, new_price: number): Promise<Product> {
    const res = await this.request<{ product: Product }>(`/admin/products/${id}/price`, {
      method: 'PATCH',
      body: JSON.stringify({ new_price })
    });
    return res.product;
  }

  public async toggleAdminProductStatus(id: string, is_active: boolean): Promise<Product> {
    const res = await this.request<{ product: Product }>(`/admin/products/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active })
    });
    return res.product;
  }

  // Inventory Thresholds & Recipes
  public async getAdminIngredientThresholds(): Promise<Ingredient[]> {
    const res = await this.request<{ ingredients: Ingredient[] }>('/admin/inventory/thresholds');
    return res.ingredients;
  }

  public async updateAdminIngredientThreshold(id: string, data: { reorder_level: number; maximum_stock?: number }): Promise<Ingredient> {
    const res = await this.request<{ ingredient: Ingredient }>(`/admin/inventory/thresholds/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    return res.ingredient;
  }

  public async getAdminRecipes(): Promise<Recipe[]> {
    const res = await this.request<{ recipes: Recipe[] }>('/admin/recipes');
    return res.recipes;
  }

  public async saveAdminRecipe(data: any): Promise<Recipe> {
    const res = await this.request<{ recipe: Recipe }>('/admin/recipes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.recipe;
  }

  // Payment & QR Configurations
  public async getAdminPaymentConfigs(): Promise<PaymentConfiguration[]> {
    const res = await this.request<{ configs: PaymentConfiguration[] }>('/admin/payments/configs');
    return res.configs;
  }

  public async updateAdminPaymentConfig(id: string, data: Partial<PaymentConfiguration>): Promise<PaymentConfiguration> {
    const res = await this.request<{ config: PaymentConfiguration }>(`/admin/payments/configs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.config;
  }

  public async toggleAdminPaymentConfig(id: string, is_active: boolean): Promise<PaymentConfiguration> {
    const res = await this.request<{ config: PaymentConfiguration }>(`/admin/payments/configs/${id}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active })
    });
    return res.config;
  }

  // AI Agent Settings
  public async getAdminAISettings(): Promise<AIAgentSettings> {
    const res = await this.request<{ settings: AIAgentSettings }>('/admin/ai/settings');
    return res.settings;
  }

  public async updateAdminAISettings(data: Partial<AIAgentSettings>): Promise<AIAgentSettings> {
    const res = await this.request<{ settings: AIAgentSettings }>('/admin/ai/settings', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.settings;
  }

  // System Settings
  public async getAdminSystemSettings(): Promise<SystemSettings> {
    const res = await this.request<{ settings: SystemSettings }>('/admin/settings');
    return res.settings;
  }

  public async updateAdminSystemSettings(data: Partial<SystemSettings>): Promise<SystemSettings> {
    const res = await this.request<{ settings: SystemSettings }>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.settings;
  }

  public async testN8NWebhook(): Promise<{ success: boolean; message?: string; error?: string }> {
    return this.request<{ success: boolean; message?: string; error?: string }>('/admin/webhooks/test', {
      method: 'POST'
    });
  }

  // Audit Logs
  public async getAdminAuditLogs(filters?: { action?: string; entity_type?: string; branch_id?: string; search?: string; limit?: number }): Promise<{ logs: AuditLog[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.action) params.append('action', filters.action);
    if (filters?.entity_type) params.append('entity_type', filters.entity_type);
    if (filters?.branch_id) params.append('branch_id', filters.branch_id);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    return this.request(`/admin/audit-logs?${params.toString()}`);
  }

  // Phase 14: Unified Reports
  public async getReport(params: {
    type: ReportType;
    period?: ReportDatePreset;
    start_date?: string;
    end_date?: string;
    branch_id?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }): Promise<UnifiedReportResponse> {
    const q = new URLSearchParams();
    q.append('type', params.type);
    if (params.period) q.append('period', params.period);
    if (params.start_date) q.append('start_date', params.start_date);
    if (params.end_date) q.append('end_date', params.end_date);
    if (params.branch_id) q.append('branch_id', params.branch_id);
    if (params.sort_by) q.append('sort_by', params.sort_by);
    if (params.sort_order) q.append('sort_order', params.sort_order);
    return this.request(`/reports?${q.toString()}`);
  }

  public async getReportDashboardSummary(params?: {
    period?: ReportDatePreset;
    start_date?: string;
    end_date?: string;
    branch_id?: string;
  }): Promise<ReportDashboardSummary> {
    const q = new URLSearchParams();
    if (params?.period) q.append('period', params.period);
    if (params?.start_date) q.append('start_date', params.start_date);
    if (params?.end_date) q.append('end_date', params.end_date);
    if (params?.branch_id) q.append('branch_id', params.branch_id);
    const res = await this.request<{ summary: ReportDashboardSummary }>(`/reports/dashboard-summary?${q.toString()}`);
    return res.summary;
  }

  public async logReportExport(data: {
    report_type: string;
    format: 'CSV' | 'XLSX' | 'PDF' | 'PRINT';
    branch_id?: string;
    branch_name?: string;
    period?: string;
    row_count: number;
    file_name: string;
  }): Promise<{ success: boolean; log: ExportLogRecord }> {
    return this.request('/reports/log-export', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Phase 14: Data Management & Integrity
  public async getDataManagementStatus(): Promise<DataManagementStatus> {
    const res = await this.request<{ status: DataManagementStatus }>('/data-management/status');
    return res.status;
  }

  public async runDataIntegrityCheck(): Promise<DataIntegrityCheckResult> {
    const res = await this.request<{ check: DataIntegrityCheckResult }>('/data-management/integrity-check');
    return res.check;
  }

  public async validateImport(type: MasterImportType, rows: any[]): Promise<ImportValidationResult> {
    const res = await this.request<{ validation: ImportValidationResult }>('/data-management/validate-import', {
      method: 'POST',
      body: JSON.stringify({ type, rows })
    });
    return res.validation;
  }

  public async executeImport(type: MasterImportType, fileName: string, rows: any[]): Promise<ImportAuditRecord> {
    const res = await this.request<{ success: boolean; audit: ImportAuditRecord }>('/data-management/execute-import', {
      method: 'POST',
      body: JSON.stringify({ type, file_name: fileName, rows })
    });
    return res.audit;
  }

  // --- LOYALTY & REWARDS ---
  public async getLoyaltyCustomers(branch_id?: string): Promise<LoyaltyCustomer[]> {
    if (isSupabaseConfigured()) {
      try {
        const sbCustomers = await supabaseAdapter.getLoyaltyCustomers();
        if (sbCustomers && sbCustomers.length > 0) {
          if (branch_id && branch_id !== 'ALL') {
            return sbCustomers.filter(c => c.registered_branch_id === branch_id);
          }
          return sbCustomers;
        }
      } catch (err) {
        console.warn('[ApiClient:getLoyaltyCustomers] Supabase query error, falling back to REST/local:', err);
      }
    }
    const q = branch_id ? `?branch_id=${branch_id}` : '';
    const res = await this.request<{ customers: LoyaltyCustomer[] }>(`/loyalty/customers${q}`);
    return res.customers || [];
  }

  public async adjustCustomerPoints(data: { customer_id: string; points_delta: number; reason: string }): Promise<any> {
    return this.request('/loyalty/customers/adjust-points', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Phase 16: Customer Kiosk & Unified Order Flow
  public async getKioskBranches(): Promise<{ id: string; name: string }[]> {
    const res = await this.request<{ branches: { id: string; name: string }[] }>('/kiosk/branches');
    return res.branches;
  }

  public async getKioskMenu(branchId: string): Promise<KioskMenuData> {
    return this.request<KioskMenuData>(`/kiosk/menu?branch_id=${encodeURIComponent(branchId)}`);
  }

  public async validateKioskCart(branchId: string, items: CartItemInput[]): Promise<{ valid: boolean; calculatedSubtotal: number }> {
    return this.request<{ valid: boolean; calculatedSubtotal: number }>('/kiosk/validate-cart', {
      method: 'POST',
      body: JSON.stringify({ branch_id: branchId, items })
    });
  }

  public async submitKioskOrder(input: CreateKioskOrderInput): Promise<{ order: Order }> {
    return this.request<{ order: Order }>('/kiosk/orders', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  public async getKioskOrderByNumber(orderNumber: string): Promise<{ order: Order }> {
    return this.request<{ order: Order }>(`/kiosk/orders/${encodeURIComponent(orderNumber)}`);
  }

  public async cancelKioskOrder(orderId: string, reason?: string): Promise<{ order: Order; message: string }> {
    return this.request<{ order: Order; message: string }>(`/kiosk/orders/${encodeURIComponent(orderId)}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  public async payKioskOrder(orderId: string, data: {
    payment_method: string;
    amount_received?: number;
    reference_number?: string;
    customer_name?: string;
    customer_phone?: string;
    idempotency_key?: string;
  }): Promise<{ success: boolean; order: Order; receipt: any }> {
    return this.request<{ success: boolean; order: Order; receipt: any }>(`/kiosk/orders/${encodeURIComponent(orderId)}/pay`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async getSalesSummary(filters?: {
    branch_id?: string;
    cashier_id?: string;
    date_preset?: string;
    start_date?: string;
    end_date?: string;
    payment_method?: string;
    source?: string;
  }): Promise<{ summary: any }> {
    const params = new URLSearchParams();
    if (filters?.branch_id && filters.branch_id !== 'ALL') params.append('branch_id', filters.branch_id);
    if (filters?.cashier_id) params.append('cashier_id', filters.cashier_id);
    if (filters?.date_preset) params.append('date_preset', filters.date_preset);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.payment_method) params.append('payment_method', filters.payment_method);
    if (filters?.source) params.append('source', filters.source);
    return this.request<{ summary: any }>(`/financial/sales-summary?${params.toString()}`);
  }

  public async getOrders(filters?: {
    branch_id?: string;
    status?: string;
    search?: string;
    date?: string;
    cashier_id?: string;
    source?: string;
  }): Promise<{ orders: Order[] }> {
    if (isSupabaseConfigured()) {
      try {
        const sbOrders = await supabaseAdapter.getOrders(filters?.branch_id);
        if (sbOrders && sbOrders.length > 0) {
          let list = sbOrders;
          if (filters?.status && filters.status !== 'ALL') {
            list = list.filter(o => o.status === filters.status);
          }
          if (filters?.source && filters.source !== 'ALL') {
            list = list.filter(o => o.source === filters.source);
          }
          if (filters?.search) {
            const s = filters.search.toLowerCase();
            list = list.filter(o =>
              o.order_number?.toLowerCase().includes(s) ||
              o.customer_name?.toLowerCase().includes(s)
            );
          }
          return { orders: list };
        }
      } catch (err) {
        console.warn('[ApiClient:getOrders] Supabase query error, falling back to REST/local:', err);
      }
    }
    const params = new URLSearchParams();
    if (filters?.branch_id) params.append('branch_id', filters.branch_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.date) params.append('date', filters.date);
    if (filters?.cashier_id) params.append('cashier_id', filters.cashier_id);
    if (filters?.source) params.append('source', filters.source);
    return this.request<{ orders: Order[] }>(`/pos/orders?${params.toString()}`);
  }

  // --- AI STOCK RECOMMENDATIONS & 1-CLICK COMMISSARY DISPATCH ---
  public async getAIStockRecommendations(targetBranchId?: string): Promise<AIStockRecommendation[]> {
    const params = new URLSearchParams();
    if (targetBranchId) params.append('target_branch_id', targetBranchId);
    const res = await this.request<{ recommendations: AIStockRecommendation[] }>(`/ai/stock-recommendations?${params.toString()}`);
    return res.recommendations;
  }

  public async approveAndDispatchAIRestock(data: {
    branch_id: string;
    ingredient_id: string;
    quantity?: number;
    driver_name?: string;
    vehicle_info?: string;
  }): Promise<{ message: string; requestOrder: any; delivery: any }> {
    return this.request<{ message: string; requestOrder: any; delivery: any }>('/ai/stock-requests/approve-and-dispatch', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // --- DUAL-LEVEL DAILY SALES & INGREDIENT USAGE BREAKDOWN ---
  public async getDailyProductSales(params: {
    branch_id?: string;
    date_preset?: string;
    date?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<DailyProductSalesSummary> {
    const q = new URLSearchParams();
    if (params.branch_id) q.set('branch_id', params.branch_id);
    if (params.date_preset) q.set('date_preset', params.date_preset);
    if (params.date) q.set('date', params.date);
    if (params.start_date) q.set('start_date', params.start_date);
    if (params.end_date) q.set('end_date', params.end_date);
    return this.request<DailyProductSalesSummary>(`/financial/daily-product-sales?${q.toString()}`);
  }

  public async getDailyIngredientUsageAudit(params: {
    branch_id?: string;
    date?: string;
    date_preset?: string;
  }): Promise<DailyIngredientUsageAuditReport> {
    const q = new URLSearchParams();
    if (params.branch_id) q.set('branch_id', params.branch_id);
    if (params.date) q.set('date', params.date);
    if (params.date_preset) q.set('date_preset', params.date_preset);
    return this.request<DailyIngredientUsageAuditReport>(`/inventory/daily-usage-audit?${q.toString()}`);
  }

  // Cash Remittances with defensive null fallback and logging
  public async getRemittances(params?: {
    branch_id?: string;
    cashier_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<{ remittances: CashRemittance[] }> {
    if (isSupabaseConfigured()) {
      try {
        const sbRem = await supabaseAdapter.getRemittances(params?.branch_id);
        if (sbRem && sbRem.length > 0) {
          let list = sbRem;
          if (params?.status && params.status !== 'ALL') {
            list = list.filter(r => r.status === params.status);
          }
          if (params?.cashier_id) {
            list = list.filter(r => r.cashier_id === params.cashier_id);
          }
          return { remittances: list };
        }
      } catch (err) {
        console.warn('[ApiClient:getRemittances] Supabase query error, falling back to REST/local:', err);
      }
    }
    const q = new URLSearchParams();
    if (params?.branch_id && params.branch_id !== 'ALL') q.set('branch_id', params.branch_id);
    if (params?.cashier_id) q.set('cashier_id', params.cashier_id);
    if (params?.status) q.set('status', params.status);
    if (params?.start_date) q.set('start_date', params.start_date);
    if (params?.end_date) q.set('end_date', params.end_date);

    try {
      console.log('[ApiClient:getRemittances] Requesting remittances with params:', q.toString());
      let res: any;
      try {
        res = await this.request<{ remittances: CashRemittance[] }>(`/financial/remittances?${q.toString()}`);
      } catch (e) {
        res = await this.request<{ remittances: CashRemittance[] }>(`/remittances?${q.toString()}`);
      }
      const list = Array.isArray(res) ? res : (res?.remittances || res?.data || []);
      console.log(`[ApiClient:getRemittances] Received ${list.length} remittances`);
      return { remittances: list };
    } catch (err) {
      console.warn('[ApiClient:getRemittances] Error fetching remittances, returning empty array:', err);
      return { remittances: [] };
    }
  }

  // Daily Sales Reports with defensive null fallback and logging
  public async getDailySalesReports(params?: {
    branch_id?: string;
    date_preset?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<{ reports: DailySalesReport[] }> {
    const q = new URLSearchParams();
    if (params?.branch_id && params.branch_id !== 'ALL') q.set('branch_id', params.branch_id);
    if (params?.date_preset) q.set('date_preset', params.date_preset);
    if (params?.start_date) q.set('start_date', params.start_date);
    if (params?.end_date) q.set('end_date', params.end_date);

    try {
      console.log('[ApiClient:getDailySalesReports] Requesting daily sales with params:', q.toString());
      let res: any;
      try {
        res = await this.request<{ reports: DailySalesReport[] }>(`/reports/daily-sales?${q.toString()}`);
      } catch (e) {
        res = await this.request<{ reports: DailySalesReport[] }>(`/financial/daily-sales?${q.toString()}`);
      }
      const list = Array.isArray(res) ? res : (res?.reports || res?.sales || res?.data || []);
      console.log(`[ApiClient:getDailySalesReports] Received ${list.length} daily sales reports`);
      return { reports: list };
    } catch (err) {
      console.warn('[ApiClient:getDailySalesReports] Error fetching daily sales, returning empty array:', err);
      return { reports: [] };
    }
  }

  // One-Click System Initialization / Factory Reset for Live Production Deployment
  public async cleanProductionReset(): Promise<{ success: boolean; message: string; stats?: any }> {
    console.log('[ApiClient:cleanProductionReset] Executing production clean reset...');
    return this.request<{ success: boolean; message: string; stats?: any }>('/admin/clean-production-reset', {
      method: 'POST'
    });
  }
}

export const api = new ApiClient();

export const getAuthToken = (): string | null => {
  return (
    api.getToken() ||
    localStorage.getItem('tagpuan_auth_token') ||
    sessionStorage.getItem('tagpuan_auth_token') ||
    localStorage.getItem('tagpuan_token') ||
    sessionStorage.getItem('tagpuan_token')
  );
};

export const normalizeCategory = (cat?: string): string => {
  if (!cat) return '';
  return cat.trim().toUpperCase().replace(/[-\s_]/g, '').replace('FAVOURITE', 'FAVORITE');
};
