import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  Users,
  Utensils,
  Boxes,
  QrCode,
  Bot,
  Sliders,
  FileText,
  RefreshCw,
  Plus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  KeyRound,
  Edit2,
  DollarSign,
  TrendingUp,
  Settings2,
  HelpCircle,
  Check,
  X,
  Search,
  Filter,
  Layers,
  Sparkles,
  Lock,
  Cpu,
  Power,
  Trash2,
  Copy,
  Printer,
  EyeOff,
  Key,
  ShieldAlert,
  Download,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  MasterControlOverview,
  Branch,
  Profile,
  Product,
  Ingredient,
  PaymentConfiguration,
  AIAgentSettings,
  SystemSettings,
  AuditLog,
  UserRole,
  BranchKioskPinDirectoryItem
} from '../../types/index';
import { BranchKioskQRModal } from '../kiosk/BranchKioskQRModal';

type ControlTab =
  | 'overview'
  | 'kiosk-vault'
  | 'branches'
  | 'users'
  | 'products'
  | 'inventory'
  | 'payments'
  | 'ai'
  | 'system'
  | 'audit';

export const MasterControlCenter: React.FC = () => {
  const { user, isOwner } = useAuth();
  const [activeTab, setActiveTab] = useState<ControlTab>('overview');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Core Data States
  const [overview, setOverview] = useState<MasterControlOverview | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<(Profile & { employee_code?: string | null; employee_id?: string | null; status?: string })[]>(() => {
    try {
      const saved = localStorage.getItem('tagpuan_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((u: any) => u.email?.toLowerCase() !== 'owner@tagpuan.ph');
        }
      }
    } catch (e) {}
    return [];
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [payments, setPayments] = useState<PaymentConfiguration[]>([]);
  const [aiSettings, setAiSettings] = useState<AIAgentSettings | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookTestStatus, setWebhookTestStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [auditFilterAction, setAuditFilterAction] = useState('ALL');

  // Modals & Action States
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [selectedBranchForQR, setSelectedBranchForQR] = useState<any | null>(null);
  const [branchForm, setBranchForm] = useState({
    name: '',
    address: '',
    phone: '',
    manager_name: '',
    is_active: true
  });

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [userForm, setUserForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'CREW' as UserRole,
    branch_id: ''
  });

  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [targetUserForPassword, setTargetUserForPassword] = useState<Profile | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');

  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [targetProductForPrice, setTargetProductForPrice] = useState<Product | null>(null);
  const [newPriceValue, setNewPriceValue] = useState<number>(0);

  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);
  const [targetIngredient, setTargetIngredient] = useState<Ingredient | null>(null);
  const [thresholdForm, setThresholdForm] = useState({ reorder_level: 15, maximum_stock: 100 });

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentConfiguration | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    account_name: '',
    account_number: '',
    qr_image_url: '',
    is_active: true
  });

  // --- MASTER OWNER KIOSK PIN VAULT STATE ---
  const [kioskPinDirectory, setKioskPinDirectory] = useState<BranchKioskPinDirectoryItem[]>([]);
  const [isLoadingPins, setIsLoadingPins] = useState<boolean>(false);
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});
  const [copiedBranchId, setCopiedBranchId] = useState<string | null>(null);
  const [copyAllSuccess, setCopyAllSuccess] = useState<boolean>(false);
  const [pinSearchQuery, setPinSearchQuery] = useState<string>('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [revealAllPins, setRevealAllPins] = useState<boolean>(false);
  const [resetPinModal, setResetPinModal] = useState<{
    isOpen: boolean;
    branch: BranchKioskPinDirectoryItem | null;
    newPin: string;
    terminalName: string;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    branch: null,
    newPin: '',
    terminalName: '',
    isSubmitting: false
  });
  const [isAddPinModalOpen, setIsAddPinModalOpen] = useState<boolean>(false);
  const [newPinForm, setNewPinForm] = useState<{
    branch_id: string;
    terminal_name: string;
    kiosk_pin: string;
    isSubmitting: boolean;
  }>({
    branch_id: '',
    terminal_name: '',
    kiosk_pin: '1234',
    isSubmitting: false
  });
  const [deletePinModal, setDeletePinModal] = useState<{
    isOpen: boolean;
    branch: BranchKioskPinDirectoryItem | null;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    branch: null,
    isSubmitting: false
  });

  // --- PRODUCTION INITIALIZATION / FACTORY RESET STATE ---
  const [isCleanResetModalOpen, setIsCleanResetModalOpen] = useState<boolean>(false);
  const [cleanResetStep, setCleanResetStep] = useState<1 | 2>(1);
  const [cleanResetConfirmationText, setCleanResetConfirmationText] = useState<string>('');
  const [isExecutingReset, setIsExecutingReset] = useState<boolean>(false);

  const handleOpenCleanResetModal = () => {
    setCleanResetStep(1);
    setCleanResetConfirmationText('');
    setIsCleanResetModalOpen(true);
  };

  const handleExecuteCleanReset = async () => {
    setIsExecutingReset(true);
    setErrorMessage(null);
    try {
      await api.cleanProductionReset();
      setSuccessMessage('🧹 Clean Production State Active! All sample/test transactions cleared. Starting sales metrics set to ₱0.00.');
      setIsCleanResetModalOpen(false);
      await loadMasterData();
    } catch (err: any) {
      console.error('[MasterControlCenter] Clean reset failed:', err);
      setErrorMessage(err.message || 'Failed to execute production reset.');
    } finally {
      setIsExecutingReset(false);
    }
  };

  const loadKioskPinDirectory = async () => {
    try {
      setIsLoadingPins(true);
      const data = await api.getBranchKioskPinDirectory();
      setKioskPinDirectory(data || []);
    } catch (err: any) {
      console.error('Failed to load branch kiosk PIN directory:', err);
    } finally {
      setIsLoadingPins(false);
    }
  };

  // Load all master administration data
  const loadMasterData = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const [
        overviewRes,
        branchesRes,
        usersRes,
        productsRes,
        ingredientsRes,
        paymentsRes,
        aiSettingsRes,
        systemSettingsRes,
        auditLogsRes
      ] = await Promise.all([
        api.getMasterControlOverview(),
        api.getAdminBranches(),
        api.getAdminUsers(),
        api.getAdminProducts(),
        api.getAdminIngredientThresholds(),
        api.getAdminPaymentConfigs(),
        api.getAdminAISettings(),
        api.getAdminSystemSettings(),
        api.getAdminAuditLogs({ limit: 100 })
      ]);

      setOverview(overviewRes);
      setBranches(branchesRes);
      setUsers(usersRes);
      try {
        localStorage.setItem('tagpuan_users', JSON.stringify(usersRes));
        localStorage.setItem('tagpuan_admin_users', JSON.stringify(usersRes));
      } catch (e) {}
      setProducts(productsRes);
      setIngredients(ingredientsRes);
      setPayments(paymentsRes);
      setAiSettings(aiSettingsRes);
      setSystemSettings(systemSettingsRes);
      setAuditLogs(auditLogsRes.logs || []);

      // Also refresh Kiosk PIN vault in the background
      loadKioskPinDirectory();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load master control center data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner) {
      loadMasterData();
    }
  }, [isOwner]);

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  if (!isOwner) {
    return (
      <div className="p-8 max-w-xl mx-auto my-12 bg-white rounded-2xl border border-red-200 shadow-sm text-center">
        <Lock className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-zinc-900">Access Restricted</h2>
        <p className="text-sm text-zinc-600 mt-2">
          The Owner Master Control Center is strictly reserved for the root OWNER role.
          Your current access privileges do not allow administrative reconfiguration.
        </p>
      </div>
    );
  }

  // --- BRANCH ACTIONS ---
  const handleOpenCreateBranch = () => {
    setEditingBranch(null);
    setBranchForm({ name: '', address: '', phone: '', manager_name: '', is_active: true });
    setIsBranchModalOpen(true);
  };

  const handleOpenEditBranch = (b: Branch) => {
    setEditingBranch(b);
    setBranchForm({
      name: b.name,
      address: b.address || '',
      phone: b.phone || '',
      manager_name: b.manager_name || '',
      is_active: b.is_active
    });
    setIsBranchModalOpen(true);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!branchForm.name.trim()) throw new Error('Branch name is required.');
      if (editingBranch) {
        await api.updateAdminBranch(editingBranch.id, branchForm);
        showNotification(`Branch "${branchForm.name}" updated successfully.`);
      } else {
        await api.createAdminBranch(branchForm);
        showNotification(`New branch "${branchForm.name}" created with inventory initialized.`);
      }
      setIsBranchModalOpen(false);
      loadMasterData();
    } catch (err: any) {
      alert(err.message || 'Failed to save branch.');
    }
  };

  const handleToggleBranchStatus = async (b: Branch) => {
    const nextState = !b.is_active;
    const confirmMsg = nextState
      ? `Reactivate branch "${b.name}"? Staff will regain POS access.`
      : `Deactivate branch "${b.name}"? This halts active operations and staff logins for this location.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.toggleAdminBranchStatus(b.id, nextState);
      showNotification(`Branch "${b.name}" is now ${nextState ? 'ACTIVE' : 'INACTIVE'}.`);
      loadMasterData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle branch status.');
    }
  };

  // --- USER ACTIONS ---
  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setUserForm({ full_name: '', email: '', password: '', role: 'CREW', branch_id: branches[0]?.id || '' });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (u: Profile) => {
    setEditingUser(u);
    setUserForm({
      full_name: u.full_name,
      email: u.email,
      password: '',
      role: u.role,
      branch_id: u.branch_id || ''
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.updateAdminUser(editingUser.id, {
          full_name: userForm.full_name,
          role: userForm.role,
          branch_id: userForm.role === 'OWNER' ? null : (userForm.branch_id || null)
        });
        showNotification(`User account for ${userForm.full_name} updated.`);
      } else {
        if (!userForm.email || !userForm.password || !userForm.full_name) {
          throw new Error('Name, Email, and Password are required for new accounts.');
        }
        await api.createAdminUser({
          email: userForm.email,
          password: userForm.password,
          full_name: userForm.full_name,
          role: userForm.role,
          branch_id: userForm.role === 'OWNER' ? null : (userForm.branch_id || null)
        });
        showNotification(`User "${userForm.full_name}" successfully registered.`);
      }
      setIsUserModalOpen(false);
      loadMasterData();
    } catch (err: any) {
      alert(err.message || 'Failed to save user account.');
    }
  };

  const handleToggleUserStatus = async (u: Profile) => {
    const nextState = !u.is_active;
    const confirmMsg = nextState
      ? `Reactivate account for ${u.full_name}?`
      : `Deactivate account for ${u.full_name}? The user will be barred from authenticating.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.toggleAdminUserStatus(u.id, nextState);
      showNotification(`Account ${u.full_name} is now ${nextState ? 'ACTIVE' : 'DEACTIVATED'}.`);
      loadMasterData();
    } catch (err: any) {
      alert(err.message || 'Failed to update user status.');
    }
  };

  const handleOpenResetPassword = (u: Profile) => {
    setTargetUserForPassword(u);
    setNewPasswordValue('');
    setIsResetPasswordModalOpen(true);
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserForPassword) return;
    if (!newPasswordValue || newPasswordValue.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }
    try {
      await api.resetAdminUserPassword(targetUserForPassword.id, newPasswordValue);
      showNotification(`Password for ${targetUserForPassword.email} has been updated.`);
      setIsResetPasswordModalOpen(false);
      loadMasterData();
    } catch (err: any) {
      alert(err.message || 'Failed to reset password.');
    }
  };

  const handleDeleteUser = async (targetUser: Profile) => {
    if (!isOwner) return;

    console.log(`[MasterControlCenter] Initiating deletion for user: ${targetUser.id} (${targetUser.email})`);

    // 1. Remove from array immediately
    const updatedUsers = users.filter((u) => u.id !== targetUser.id);
    setUsers(updatedUsers);

    // 2. Save updated array to localStorage immediately
    try {
      localStorage.setItem('tagpuan_users', JSON.stringify(updatedUsers));
      localStorage.setItem('tagpuan_admin_users', JSON.stringify(updatedUsers));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }

    // 3. Show notification
    showNotification(`User account "${targetUser.full_name}" has been permanently deleted.`);

    // 4. Call backend to persist deletion with explicit token attachment
    try {
      const token =
        localStorage.getItem('tagpuan_auth_token') ||
        sessionStorage.getItem('tagpuan_auth_token') ||
        localStorage.getItem('tagpuan_token') ||
        sessionStorage.getItem('tagpuan_token') ||
        localStorage.getItem('token') ||
        sessionStorage.getItem('token');

      const response = await fetch(`/api/users/${targetUser.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `Server responded with status ${response.status}`);
      }

      console.log(`[MasterControlCenter] User ${targetUser.id} deleted successfully:`, data);
    } catch (err: any) {
      console.error(`[MasterControlCenter] Failed to delete user ${targetUser.id} on server:`, err);
      alert(err.message || 'Failed to delete user on server.');
      loadMasterData();
    }
  };

  // --- PRODUCT & PRICE ACTIONS ---
  const handleOpenPriceModal = (p: Product) => {
    setTargetProductForPrice(p);
    setNewPriceValue(p.selling_price);
    setIsPriceModalOpen(true);
  };

  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProductForPrice) return;
    if (newPriceValue <= 0) {
      alert('Selling price must be greater than zero.');
      return;
    }
    try {
      await api.updateAdminProductPrice(targetProductForPrice.id, Number(newPriceValue));
      showNotification(`Updated price for ${targetProductForPrice.product_name} to ₱${newPriceValue}. Past transactions remain immutable.`);
      setIsPriceModalOpen(false);
      loadMasterData();
    } catch (err: any) {
      alert(err.message || 'Failed to update price.');
    }
  };

  const handleToggleProductStatus = async (p: Product) => {
    const nextState = !p.is_active;
    try {
      await api.toggleAdminProductStatus(p.id, nextState);
      showNotification(`Product "${p.product_name}" is now ${nextState ? 'ACTIVE' : 'INACTIVE'}.`);
      loadMasterData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle product status.');
    }
  };

  // --- INVENTORY THRESHOLDS ---
  const handleOpenThresholdModal = (ing: Ingredient) => {
    setTargetIngredient(ing);
    setThresholdForm({
      reorder_level: ing.reorder_level,
      maximum_stock: ing.maximum_stock
    });
    setIsThresholdModalOpen(true);
  };

  const handleSaveThreshold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetIngredient) return;
    try {
      await api.updateAdminIngredientThreshold(targetIngredient.id, {
        reorder_level: Number(thresholdForm.reorder_level),
        maximum_stock: Number(thresholdForm.maximum_stock)
      });
      showNotification(`Inventory threshold for ${targetIngredient.item_name} updated and propagated across all 17 branches.`);
      setIsThresholdModalOpen(false);
      loadMasterData();
    } catch (err: any) {
      alert(err.message || 'Failed to update threshold.');
    }
  };

  // --- PAYMENT CONFIGS ---
  const handleOpenEditPayment = (cfg: PaymentConfiguration) => {
    setEditingPayment(cfg);
    setPaymentForm({
      account_name: cfg.account_name || '',
      account_number: cfg.account_number || '',
      qr_image_url: cfg.qr_image_url || '',
      is_active: cfg.is_active
    });
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    try {
      await api.updateAdminPaymentConfig(editingPayment.id, paymentForm);
      showNotification(`Payment channel ${editingPayment.payment_method} updated.`);
      setIsPaymentModalOpen(false);
      loadMasterData();
    } catch (err: any) {
      alert(err.message || 'Failed to update payment configuration.');
    }
  };

  const handleTogglePaymentMethod = async (cfg: PaymentConfiguration) => {
    const nextState = !cfg.is_active;
    try {
      await api.toggleAdminPaymentConfig(cfg.id, nextState);
      showNotification(`${cfg.payment_method} is now ${nextState ? 'ENABLED' : 'DISABLED'} for customer payments.`);
      loadMasterData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle payment method.');
    }
  };

  // --- AI AGENT CONFIGURATION ---
  const handleSaveAISettings = async (updated: Partial<AIAgentSettings>) => {
    try {
      const res = await api.updateAdminAISettings(updated);
      setAiSettings(res);
      showNotification('AI Agent parameters saved with authoritative logging.');
      loadMasterData();
    } catch (err: any) {
      alert(err.message || 'Failed to update AI settings.');
    }
  };

  // --- SYSTEM SETTINGS ---
  const handleSaveSystemSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!systemSettings) return;
    try {
      const res = await api.updateAdminSystemSettings(systemSettings);
      setSystemSettings(res);
      showNotification('System preferences & receipt headers updated successfully.');
      loadMasterData();
    } catch (err: any) {
      alert(err.message || 'Failed to save system settings.');
    }
  };

  const handleTestWebhook = async () => {
    setIsTestingWebhook(true);
    setWebhookTestStatus(null);
    try {
      if (systemSettings) {
        await api.updateAdminSystemSettings(systemSettings);
      }
      const res = await api.testN8NWebhook();
      setWebhookTestStatus({
        success: res.success,
        message: res.message || 'Webhook successfully dispatched to n8n!'
      });
      showNotification('n8n Webhook connection verified successfully!');
    } catch (err: any) {
      setWebhookTestStatus({
        success: false,
        message: err.message || 'Failed to dispatch test webhook to n8n'
      });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  // --- MASTER OWNER KIOSK PIN VAULT HANDLERS ---
  const handleTogglePinVisibility = (branchId: string) => {
    setVisiblePins(prev => ({ ...prev, [branchId]: !prev[branchId] }));
  };

  const handleCopyPin = (pin: string, branchId: string) => {
    navigator.clipboard.writeText(pin);
    setCopiedBranchId(branchId);
    setTimeout(() => setCopiedBranchId(null), 2500);
    showNotification(`Kiosk Access PIN (${pin}) copied to clipboard.`);
  };

  const handleCopyAllPins = () => {
    const timestamp = new Date().toLocaleString();
    let text = `=======================================================\n`;
    text += `TAGPUAN FOOD HUB - MASTER 17-BRANCH KIOSK PIN DIRECTORY\n`;
    text += `CONFIDENTIAL FRANCHISE AUDIT RECORD | Exported: ${timestamp}\n`;
    text += `Restricted Exclusively to Root MASTER OWNER\n`;
    text += `=======================================================\n\n`;

    kioskPinDirectory.forEach((b, idx) => {
      text += `${idx + 1}. [${b.branch_code}] ${b.branch_name}\n`;
      text += `   - Manager: ${b.manager_name} (${b.manager_email || 'No email'})\n`;
      text += `   - Kiosk Terminal PIN: ${b.kiosk_pin}\n`;
      text += `   - Outlet Address: ${b.address} | Phone: ${b.phone}\n\n`;
    });

    text += `=======================================================\n`;
    text += `Total Outlets: ${kioskPinDirectory.length} branches\n`;
    text += `End of Confidential Record.\n`;

    navigator.clipboard.writeText(text);
    setCopyAllSuccess(true);
    setTimeout(() => setCopyAllSuccess(false), 3000);
    showNotification(`Master Backup of all ${kioskPinDirectory.length} branch PINs copied to clipboard.`);
  };

  const handleOpenResetPin = (branch: BranchKioskPinDirectoryItem) => {
    setResetPinModal({
      isOpen: true,
      branch,
      newPin: branch.kiosk_pin && branch.kiosk_pin !== 'DEACTIVATED' ? branch.kiosk_pin : '1234',
      terminalName: branch.terminal_name || `${branch.branch_name} Kiosk #1`,
      isSubmitting: false
    });
  };

  const handleGenerateRandomPin = () => {
    const random = Math.floor(1000 + Math.random() * 9000).toString();
    setResetPinModal(prev => ({ ...prev, newPin: random }));
  };

  const handleSaveResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPinModal.branch) return;
    const cleanPin = resetPinModal.newPin.trim();
    if (!/^\d{4,6}$/.test(cleanPin)) {
      alert('Kiosk PIN must be a 4 to 6-digit numeric sequence.');
      return;
    }
    try {
      setResetPinModal(prev => ({ ...prev, isSubmitting: true }));
      const res = await api.resetBranchKioskPin({
        branch_id: resetPinModal.branch.branch_id,
        new_pin: cleanPin,
        manager_id: resetPinModal.branch.manager_id || undefined,
        terminal_name: resetPinModal.terminalName.trim() || undefined
      });
      showNotification(res.message || `PIN for ${resetPinModal.branch.branch_name} reset to ${cleanPin}.`);
      setResetPinModal({ isOpen: false, branch: null, newPin: '', terminalName: '', isSubmitting: false });
      loadKioskPinDirectory();
    } catch (err: any) {
      alert(err.message || 'Failed to update branch kiosk PIN.');
      setResetPinModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleOpenAddPinModal = () => {
    const defaultBranchId = branches[0]?.id || kioskPinDirectory[0]?.branch_id || '';
    const selectedBranch = branches.find(b => b.id === defaultBranchId) || (kioskPinDirectory[0] ? { name: kioskPinDirectory[0].branch_name } : null);
    setNewPinForm({
      branch_id: defaultBranchId,
      terminal_name: selectedBranch ? `${selectedBranch.name} Kiosk #1` : 'Kiosk Terminal #1',
      kiosk_pin: Math.floor(1000 + Math.random() * 9000).toString(),
      isSubmitting: false
    });
    setIsAddPinModalOpen(true);
  };

  const handleSaveAddPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPinForm.branch_id) {
      alert('Please select a branch.');
      return;
    }
    const cleanPin = newPinForm.kiosk_pin.trim();
    if (!/^\d{4,6}$/.test(cleanPin)) {
      alert('Kiosk PIN must be a 4 to 6-digit numeric sequence.');
      return;
    }
    try {
      setNewPinForm(prev => ({ ...prev, isSubmitting: true }));
      const res = await api.createBranchKioskPin({
        branch_id: newPinForm.branch_id,
        kiosk_pin: cleanPin,
        terminal_name: newPinForm.terminal_name.trim() || undefined
      });
      showNotification(res.message || 'Kiosk Terminal PIN created successfully.');
      setIsAddPinModalOpen(false);
      loadKioskPinDirectory();
    } catch (err: any) {
      alert(err.message || 'Failed to create kiosk terminal PIN.');
      setNewPinForm(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleOpenDeletePin = (branch: BranchKioskPinDirectoryItem) => {
    setDeletePinModal({
      isOpen: true,
      branch,
      isSubmitting: false
    });
  };

  const handleConfirmDeletePin = async () => {
    if (!deletePinModal.branch) return;
    try {
      setDeletePinModal(prev => ({ ...prev, isSubmitting: true }));
      const res = await api.deleteBranchKioskPin(deletePinModal.branch.branch_id);
      showNotification(res.message || `Kiosk PIN credentials for ${deletePinModal.branch.branch_name} removed.`);
      setDeletePinModal({ isOpen: false, branch: null, isSubmitting: false });
      loadKioskPinDirectory();
    } catch (err: any) {
      alert(err.message || 'Failed to remove kiosk terminal PIN.');
      setDeletePinModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Toast Notification */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-[#166534] text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 border border-emerald-500 animate-bounce">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#111111] text-white uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              Owner Master Root
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              <Sparkles className="w-3 h-3" />
              Phase 13 Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight mt-2">
            Owner Master Control Center
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Central administration hub for branch configurations, user roles, pricing governance, inventory rules, and AI parameters.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadMasterData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-sm font-medium transition shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh State</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation Pill Bar */}
      <div className="bg-white border border-[#e5e7eb] rounded-2xl p-2 shadow-sm overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {[
            { id: 'overview', label: 'Overview & Health', icon: Sliders },
            { id: 'kiosk-vault', label: 'Kiosk Passwords & PIN Vault', icon: KeyRound, isVault: true },
            { id: 'branches', label: '17 Branches', icon: Building2 },
            { id: 'users', label: 'Users & Roles', icon: Users },
            { id: 'products', label: 'Products & Pricing', icon: Utensils },
            { id: 'inventory', label: 'Inventory Rules', icon: Boxes },
            { id: 'payments', label: 'Payments & QR', icon: QrCode },
            { id: 'ai', label: 'AI Agent Settings', icon: Bot },
            { id: 'system', label: 'System Preferences', icon: Settings2 },
            { id: 'audit', label: 'Audit Trail', icon: FileText }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ControlTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-[#111111] text-white shadow-sm'
                    : (tab as any).isVault
                    ? 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${(tab as any).isVault && !isActive ? 'text-amber-600' : ''}`} />
                <span>{tab.label}</span>
                {(tab as any).isVault && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-amber-400 text-black' : 'bg-amber-200 text-amber-900'
                  }`}>
                    17
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENT AREAS */}

      {/* 1. OVERVIEW & SYSTEM HEALTH TAB */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-6">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Branches</span>
                <Building2 className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-zinc-900">{overview.total_branches}</span>
                <span className="text-xs font-semibold text-emerald-600">({overview.active_branches} Active)</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Staff Users</span>
                <Users className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-zinc-900">{overview.total_users}</span>
                <span className="text-xs font-semibold text-emerald-600">({overview.active_users} Active)</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Menu Items</span>
                <Utensils className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-zinc-900">{overview.total_products}</span>
                <span className="text-xs font-semibold text-zinc-500">Products</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Ingredients</span>
                <Boxes className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-zinc-900">{overview.total_ingredients}</span>
                <span className="text-xs font-semibold text-zinc-500">Tracked</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Payment QR</span>
                <QrCode className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-zinc-900">{overview.active_payment_methods}</span>
                <span className="text-xs font-semibold text-emerald-600">Channels</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">AI Monitoring</span>
                <Bot className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${overview.ai_monitoring_status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                <span className="text-sm font-bold text-zinc-900">{overview.ai_monitoring_status}</span>
              </div>
            </div>
          </div>

          {/* Quick Administration Command Panel */}
          <div className="bg-white rounded-2xl border border-[#e5e7eb] p-6 shadow-sm">
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-zinc-700" />
              <span>Owner Quick Administrative Actions</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-1 mb-5">
              Instant shortcuts to modify central ERP modules with real-time audit verification.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                onClick={handleOpenCreateBranch}
                className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 transition text-left group"
              >
                <div>
                  <span className="text-xs font-bold text-zinc-900 block group-hover:text-[#111111]">Register New Branch</span>
                  <span className="text-[11px] text-zinc-500">Add branch & initialize inventory</span>
                </div>
                <Plus className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900" />
              </button>

              <button
                onClick={handleOpenCreateUser}
                className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 transition text-left group"
              >
                <div>
                  <span className="text-xs font-bold text-zinc-900 block group-hover:text-[#111111]">Add Staff Account</span>
                  <span className="text-[11px] text-zinc-500">Create login & assign branch role</span>
                </div>
                <Plus className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900" />
              </button>

              <button
                onClick={() => setActiveTab('products')}
                className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 transition text-left group"
              >
                <div>
                  <span className="text-xs font-bold text-zinc-900 block group-hover:text-[#111111]">Govern Menu Pricing</span>
                  <span className="text-[11px] text-zinc-500">Update item selling prices</span>
                </div>
                <DollarSign className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900" />
              </button>

              <button
                onClick={() => setActiveTab('ai')}
                className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 transition text-left group"
              >
                <div>
                  <span className="text-xs font-bold text-zinc-900 block group-hover:text-[#111111]">Configure AI Agent</span>
                  <span className="text-[11px] text-zinc-500">Enable/pause alerts & thresholds</span>
                </div>
                <Bot className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900" />
              </button>
            </div>
          </div>

          {/* System Environment & RLS Security Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Security & Role Isolation Model</span>
              </h3>
              <div className="mt-3 space-y-2 text-xs text-zinc-600">
                <div className="flex justify-between py-1.5 border-b border-zinc-100">
                  <span className="text-zinc-500">Multi-Tenancy Isolation:</span>
                  <span className="font-semibold text-zinc-900">Branch-Scoped Row-Level Security</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-100">
                  <span className="text-zinc-500">Database Engine:</span>
                  <span className="font-semibold text-zinc-900">Tagpuan In-Memory DB + Persistent Snapshots</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-100">
                  <span className="text-zinc-500">Historical Sales Immutability:</span>
                  <span className="font-semibold text-emerald-700">Enforced (Price updates don't alter past sales)</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-zinc-500">Server Authorization:</span>
                  <span className="font-semibold text-emerald-700">Authoritative Token + requireRole('OWNER')</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-zinc-700" />
                <span>Enterprise Environment Overview</span>
              </h3>
              <div className="mt-3 space-y-2 text-xs text-zinc-600">
                <div className="flex justify-between py-1.5 border-b border-zinc-100">
                  <span className="text-zinc-500">ERP Version:</span>
                  <span className="font-semibold text-zinc-900">{systemSettings?.system_version || 'v13.0.0'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-100">
                  <span className="text-zinc-500">Timezone:</span>
                  <span className="font-semibold text-zinc-900">{systemSettings?.timezone || 'Asia/Manila (PHT)'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-100">
                  <span className="text-zinc-500">Currency Symbol:</span>
                  <span className="font-semibold text-zinc-900">{systemSettings?.currency_symbol || '₱'}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-zinc-500">Tax / VAT Rate:</span>
                  <span className="font-semibold text-zinc-900">
                    {systemSettings?.tax_enabled ? `${systemSettings.tax_percentage}% (Active)` : 'Exempt (0%)'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MASTER OWNER KIOSK TERMINAL PASSWORDS & PIN DIRECTORY VAULT */}
      {activeTab === 'kiosk-vault' && (
        <div className="space-y-6">
          {/* Vault Header Banner */}
          <div className="bg-gradient-to-r from-zinc-900 via-neutral-900 to-zinc-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-zinc-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <KeyRound className="w-48 h-48" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-black bg-amber-400 text-black uppercase tracking-wider mb-3">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  CONFIDENTIAL • MASTER OWNER KIOSK VAULT
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Kiosk Terminal Passwords & PIN Directory
                </h2>
                <p className="text-zinc-300 text-xs sm:text-sm mt-2 leading-relaxed">
                  Centralized secure credentials for all 17 Tagpuan Food Hub branch POS terminals.
                  Branch Managers and authorized Cashiers use these master PINs to authenticate manager voids,
                  cancel tickets, and perform register balance resets.
                </p>
              </div>

              {/* Master Actions Group */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                <button
                  type="button"
                  id="btn-add-kiosk-pin"
                  onClick={handleOpenAddPinModal}
                  className="px-4 py-2.5 rounded-xl bg-[#CDEBC5] hover:bg-[#b8e2ae] text-[#111111] font-black text-xs sm:text-sm flex items-center gap-2 transition shadow-lg cursor-pointer active:scale-95"
                  title="Create a new access PIN/password for any of the 17 branches"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add New Kiosk Terminal PIN</span>
                </button>

                <button
                  type="button"
                  id="btn-copy-all-pins"
                  onClick={handleCopyAllPins}
                  className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs sm:text-sm flex items-center gap-2 transition shadow-lg cursor-pointer active:scale-95"
                  title="Export and copy all 17 branch PINs to clipboard for emergency master backup"
                >
                  {copyAllSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-950" />
                      Copied All 17 PINs!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy All PINs (Master Backup)
                    </>
                  )}
                </button>

                <button
                  type="button"
                  id="btn-print-security-card"
                  onClick={() => setIsPrintModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/20 flex items-center gap-2 transition cursor-pointer active:scale-95 backdrop-blur-xs"
                  title="Open Printable Security Cards for franchise audits"
                >
                  <Printer className="w-4 h-4" />
                  Printable Security Card
                </button>

                <button
                  type="button"
                  onClick={() => setRevealAllPins(!revealAllPins)}
                  className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 flex items-center gap-1.5 transition cursor-pointer"
                  title="Toggle all PIN numbers on/off"
                >
                  {revealAllPins ? (
                    <>
                      <EyeOff className="w-4 h-4 text-amber-300" />
                      Hide All
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 text-amber-300" />
                      Reveal All
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={loadKioskPinDirectory}
                  disabled={isLoadingPins}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold border border-white/20 transition cursor-pointer"
                  title="Refresh PIN Directory"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingPins ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Search & Audit Statistics Header */}
          <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={pinSearchQuery}
                onChange={e => setPinSearchQuery(e.target.value)}
                placeholder="Search by branch name, code, manager, or city..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                17 / 17 Terminals Synchronized
              </span>
              <span>
                Showing {kioskPinDirectory.filter(b =>
                  b.branch_name.toLowerCase().includes(pinSearchQuery.toLowerCase()) ||
                  b.branch_code.toLowerCase().includes(pinSearchQuery.toLowerCase()) ||
                  b.manager_name.toLowerCase().includes(pinSearchQuery.toLowerCase()) ||
                  b.address.toLowerCase().includes(pinSearchQuery.toLowerCase())
                ).length} branches
              </span>
            </div>
          </div>

          {/* Kiosk Vault Table */}
          {isLoadingPins ? (
            <div className="bg-white p-12 rounded-2xl border border-zinc-200 text-center flex flex-col items-center justify-center">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mb-2" />
              <p className="text-xs text-zinc-500 font-mono">Decrypting terminal security keys...</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 uppercase font-mono font-bold text-[10px]">
                    <tr>
                      <th className="px-5 py-3.5">#</th>
                      <th className="px-5 py-3.5">Branch Name</th>
                      <th className="px-5 py-3.5">Terminal Name / Identifier</th>
                      <th className="px-5 py-3.5">Assigned Kiosk PIN / Access Password</th>
                      <th className="px-5 py-3.5">Last Updated</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {kioskPinDirectory
                      .filter(b =>
                        b.branch_name.toLowerCase().includes(pinSearchQuery.toLowerCase()) ||
                        (b.branch_code && b.branch_code.toLowerCase().includes(pinSearchQuery.toLowerCase())) ||
                        (b.terminal_name && b.terminal_name.toLowerCase().includes(pinSearchQuery.toLowerCase())) ||
                        (b.terminal_id && b.terminal_id.toLowerCase().includes(pinSearchQuery.toLowerCase())) ||
                        (b.manager_name && b.manager_name.toLowerCase().includes(pinSearchQuery.toLowerCase())) ||
                        (b.address && b.address.toLowerCase().includes(pinSearchQuery.toLowerCase()))
                      )
                      .map((item, idx) => {
                        const isVisible = revealAllPins || visiblePins[item.branch_id];
                        const isCopied = copiedBranchId === item.branch_id;
                        const isDeactivated = item.kiosk_pin === 'DEACTIVATED' || !item.is_active;
                        return (
                          <tr key={item.branch_id} className="hover:bg-amber-50/40 transition">
                            <td className="px-5 py-4 font-mono font-bold text-zinc-400">
                              {String(idx + 1).padStart(2, '0')}
                            </td>
                            {/* Branch Name */}
                            <td className="px-5 py-4">
                              <div className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
                                <span>{item.branch_name}</span>
                                {item.branch_code && (
                                  <span className="font-mono text-[10px] font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                                    {item.branch_code}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-2">
                                <span>Mgr: {item.manager_name || 'Assigned Manager'}</span>
                                {item.is_active ? (
                                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                    ONLINE
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold text-zinc-500 bg-zinc-100 px-1.5 py-0.2 rounded">
                                    OFFLINE
                                  </span>
                                )}
                              </div>
                            </td>
                            {/* Terminal Name / Identifier */}
                            <td className="px-5 py-4">
                              <div className="font-semibold text-zinc-900 text-xs">
                                {item.terminal_name || `${item.branch_name} Kiosk #1`}
                              </div>
                              <div className="font-mono text-[10px] text-zinc-500 mt-0.5">
                                {item.terminal_id || `TERM-${item.branch_id.substring(0, 8).toUpperCase()}`}
                              </div>
                            </td>
                            {/* Assigned Kiosk PIN / Access Password */}
                            <td className="px-5 py-4">
                              {isDeactivated ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-500 text-[11px] font-mono font-bold border border-zinc-200">
                                  DEACTIVATED
                                </span>
                              ) : (
                                <div className="inline-flex items-center gap-2 bg-zinc-100 border border-zinc-300 rounded-xl px-3 py-1.5 font-mono">
                                  <KeyRound className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                                  <span className="font-black text-sm tracking-widest text-zinc-900 min-w-[50px] text-center">
                                    {isVisible ? item.kiosk_pin : '••••'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleTogglePinVisibility(item.branch_id)}
                                    className="p-1 hover:text-zinc-900 text-zinc-400 transition cursor-pointer"
                                    title={isVisible ? 'Mask PIN' : 'Reveal PIN'}
                                  >
                                    {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyPin(item.kiosk_pin, item.branch_id)}
                                    className="p-1 hover:text-amber-800 text-zinc-500 transition cursor-pointer"
                                    title="Copy PIN to clipboard"
                                  >
                                    {isCopied ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              )}
                            </td>
                            {/* Last Updated */}
                            <td className="px-5 py-4 font-mono text-[11px] text-zinc-500">
                              {item.updated_at
                                ? new Date(item.updated_at).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : 'Synchronized'}
                            </td>
                            {/* Actions */}
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                                <button
                                  type="button"
                                  id={`btn-vault-qr-${item.branch_id}`}
                                  onClick={() =>
                                    setSelectedBranchForQR({
                                      id: item.branch_id,
                                      name: item.branch_name,
                                      code: item.branch_code || '',
                                      address: item.address || '',
                                      phone: item.phone || ''
                                    })
                                  }
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                                  title="Generate printable Customer Kiosk QR poster"
                                >
                                  <QrCode className="w-3 h-3 text-amber-800" />
                                  <span className="hidden sm:inline">QR Standee</span>
                                </button>
                                <button
                                  type="button"
                                  id={`btn-reset-pin-${item.branch_id}`}
                                  onClick={() => handleOpenResetPin(item)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#111111] hover:bg-black text-[#CDEBC5] transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                                  title="Edit Kiosk PIN / Access Password"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span>Edit PIN</span>
                                </button>
                                <button
                                  type="button"
                                  id={`btn-delete-pin-${item.branch_id}`}
                                  onClick={() => handleOpenDeletePin(item)}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                                  title="Delete deactivated kiosk terminal credentials"
                                >
                                  <Trash2 className="w-3 h-3 text-red-600" />
                                  <span className="hidden sm:inline">Delete PIN</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. BRANCHES CONTROL TAB */}
      {activeTab === 'branches' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search branch by name or location..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-1 focus:ring-zinc-900 focus:outline-none"
              />
            </div>

            <button
              onClick={handleOpenCreateBranch}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#111111] text-white text-xs font-bold hover:bg-zinc-800 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Branch</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches
              .filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(b => (
                <div
                  key={b.id}
                  className={`bg-white rounded-2xl border p-5 shadow-sm flex flex-col justify-between transition ${
                    b.is_active ? 'border-zinc-200' : 'border-red-200 bg-red-50/20'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        b.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-700'
                      }`}>
                        {b.is_active ? 'OPERATIONAL' : 'INACTIVE'}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400">ID: {b.id.slice(0, 8)}...</span>
                    </div>

                    <h3 className="text-base font-bold text-zinc-900 mt-2">{b.name}</h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      {b.address || 'Address not registered yet'}
                    </p>

                    <div className="mt-4 pt-3 border-t border-zinc-100 space-y-1.5 text-xs">
                      <div className="flex justify-between text-zinc-500">
                        <span>Branch Manager:</span>
                        <span className="font-medium text-zinc-800">{b.manager_name || 'Unassigned'}</span>
                      </div>
                      <div className="flex justify-between text-zinc-500">
                        <span>Contact Phone:</span>
                        <span className="font-medium text-zinc-800">{b.phone || 'None'}</span>
                      </div>
                      <div className="flex justify-between text-zinc-500">
                        <span>Assigned Staff:</span>
                        <span className="font-medium text-zinc-800">
                          {users.filter(u => u.branch_id === b.id && u.is_active).length} Users
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedBranchForQR(b)}
                      className="py-1.5 px-2.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                      title="Generate printable Customer Kiosk QR poster"
                    >
                      <QrCode className="w-3.5 h-3.5 text-amber-800" />
                      <span>Print Table QR Poster</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditBranch(b)}
                      className="flex-1 py-1.5 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-semibold flex items-center justify-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Info</span>
                    </button>

                    <button
                      onClick={() => handleToggleBranchStatus(b)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        b.is_active
                          ? 'border border-red-200 text-red-600 hover:bg-red-50'
                          : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      {b.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 3. USERS & ROLES CONTROL TAB */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search staff by name, email, or role..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-1 focus:ring-zinc-900 focus:outline-none"
              />
            </div>

            <button
              onClick={handleOpenCreateUser}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#111111] text-white text-xs font-bold hover:bg-zinc-800 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create User Account</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Employee / User</th>
                    <th className="px-4 py-3">Assigned Role</th>
                    <th className="px-4 py-3">Branch Location</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Owner Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {users
                    .filter(u => {
                      if (u.email?.toLowerCase() === 'owner@tagpuan.ph') {
                        const hasOtherOwner = users.some(
                          o => o.role === 'OWNER' && o.email?.toLowerCase() !== 'owner@tagpuan.ph'
                        );
                        if (hasOtherOwner) return false;
                      }
                      return true;
                    })
                    .filter(u =>
                      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      u.role.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map(u => (
                      <tr key={u.id} className="hover:bg-zinc-50/80 transition">
                        <td className="px-4 py-3">
                          <div className="font-bold text-zinc-900">{u.full_name}</div>
                          <div className="text-[11px] text-zinc-500">{u.email}</div>
                          {u.employee_code && (
                            <span className="text-[10px] font-mono text-zinc-400">Code: {u.employee_code}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            u.role === 'OWNER'
                              ? 'bg-purple-100 text-purple-800'
                              : u.role === 'MANAGER'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-zinc-100 text-zinc-800'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-600 font-medium">
                          {u.role === 'OWNER' ? 'Global Access' : (u.branch_name || 'Unassigned')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                            u.is_active ? 'text-emerald-700' : 'text-zinc-400'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                            {u.is_active ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenResetPassword(u)}
                              title="Direct Password Reset"
                              className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100 transition"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEditUser(u)}
                              title="Edit User Role / Branch"
                              className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100 transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              disabled={u.role === 'OWNER' && users.filter(o => o.role === 'OWNER' && o.is_active).length <= 1}
                              title={u.is_active ? 'Deactivate Account' : 'Activate Account'}
                              className={`p-1.5 rounded-lg border transition ${
                                u.is_active
                                  ? 'border-red-200 text-red-600 hover:bg-red-50'
                                  : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                              } ${u.role === 'OWNER' && users.filter(o => o.role === 'OWNER' && o.is_active).length <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u)}
                              title="Delete User Account"
                              className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. PRODUCTS & PRICING CONTROL TAB */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <span className="font-bold">Price Governance Rule:</span> Modifying selling prices updates all new orders across all branches.
              Historical orders, completed receipts, and previous sales transactions remain immutable to safeguard accounting integrity.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-zinc-400">{p.product_code}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      p.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-500'
                    }`}>
                      {p.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-zinc-900 mt-2">{p.product_name}</h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{p.category}</p>

                  <div className="mt-4 p-3 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Current Selling Price:</span>
                    <span className="text-lg font-black text-zinc-900">₱{p.selling_price.toLocaleString()}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenPriceModal(p)}
                    className="flex-1 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center justify-center gap-1 transition"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Update Price</span>
                  </button>

                  <button
                    onClick={() => handleToggleProductStatus(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      p.is_active
                        ? 'border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                        : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    {p.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. INVENTORY THRESHOLDS CONTROL TAB */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Central Ingredient Reorder Thresholds</h2>
              <p className="text-xs text-zinc-500">
                Updating an ingredient threshold here instantly recalculates minimum stock triggers across all 17 branch inventories.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Ingredient Name</th>
                    <th className="px-4 py-3">Item Code</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Cost Price</th>
                    <th className="px-4 py-3">Reorder Threshold</th>
                    <th className="px-4 py-3">Max Stock</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {ingredients.map(ing => (
                    <tr key={ing.id} className="hover:bg-zinc-50 transition">
                      <td className="px-4 py-3 font-bold text-zinc-900">{ing.item_name}</td>
                      <td className="px-4 py-3 font-mono text-zinc-500">{ing.item_code}</td>
                      <td className="px-4 py-3 text-zinc-600">{ing.unit}</td>
                      <td className="px-4 py-3 text-zinc-900 font-semibold">₱{ing.cost_price.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
                          {ing.reorder_level} {ing.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{ing.maximum_stock} {ing.unit}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleOpenThresholdModal(ing)}
                          className="px-3 py-1 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-100 text-xs font-semibold transition"
                        >
                          Modify Threshold
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. PAYMENTS & QR CONTROL TAB */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
            <h2 className="text-sm font-bold text-zinc-900">Official Payment Channels & QR Configuration</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Manage GCash, Maya, and QRPH account numbers and merchant QR codes presented at POS and Customer Self-Ordering Kiosks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {payments.map(cfg => (
              <div key={cfg.id} className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-zinc-900 tracking-wide">{cfg.payment_method}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      cfg.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-500'
                    }`}>
                      {cfg.is_active ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex justify-between text-zinc-500">
                      <span>Account Name:</span>
                      <span className="font-semibold text-zinc-900">{cfg.account_name || 'Tagpuan Store'}</span>
                    </div>
                    <div className="flex justify-between text-zinc-500">
                      <span>Account / Mobile:</span>
                      <span className="font-mono font-bold text-zinc-900">{cfg.account_number || 'N/A'}</span>
                    </div>
                  </div>

                  {cfg.qr_image_url && (
                    <div className="mt-4 p-3 bg-zinc-50 rounded-xl border border-zinc-100 flex flex-col items-center">
                      <img
                        src={cfg.qr_image_url}
                        alt={`${cfg.payment_method} QR`}
                        className="w-32 h-32 object-contain rounded-lg border border-zinc-200 bg-white"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-[10px] text-zinc-400 mt-1 font-mono">Active POS Scan Image</span>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenEditPayment(cfg)}
                    className="flex-1 py-1.5 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-semibold flex items-center justify-center gap-1 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Channel</span>
                  </button>

                  <button
                    onClick={() => handleTogglePaymentMethod(cfg)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      cfg.is_active
                        ? 'border border-red-200 text-red-600 hover:bg-red-50'
                        : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    {cfg.is_active ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. AI AGENT SETTINGS TAB */}
      {activeTab === 'ai' && aiSettings && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
            <div>
              <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-600" />
                <span>AI Agent Governance & Autonomous Audit Controls</span>
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                The Owner can pause, enable, or configure specific anomaly triggers and monitoring thresholds.
              </p>
            </div>

            <button
              onClick={() => handleSaveAISettings({ ai_monitoring_enabled: !aiSettings.ai_monitoring_enabled })}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                aiSettings.ai_monitoring_enabled
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{aiSettings.ai_monitoring_enabled ? 'AI Monitoring Active' : 'AI Monitoring Paused'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Anomaly Trigger Toggles</h3>

              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                <div>
                  <span className="text-xs font-bold text-zinc-900 block">Low Stock Alerts</span>
                  <span className="text-[11px] text-zinc-500">Generates warning when branch stock hits threshold</span>
                </div>
                <input
                  type="checkbox"
                  checked={aiSettings.low_stock_alerts_enabled}
                  onChange={e => handleSaveAISettings({ low_stock_alerts_enabled: e.target.checked })}
                  className="w-4 h-4 accent-zinc-900 rounded"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                <div>
                  <span className="text-xs font-bold text-zinc-900 block">Cash Drawer Variance Alerts</span>
                  <span className="text-[11px] text-zinc-500">Detects cashier shortage or overage &gt; ₱0</span>
                </div>
                <input
                  type="checkbox"
                  checked={aiSettings.cash_variance_alerts_enabled}
                  onChange={e => handleSaveAISettings({ cash_variance_alerts_enabled: e.target.checked })}
                  className="w-4 h-4 accent-zinc-900 rounded"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                <div>
                  <span className="text-xs font-bold text-zinc-900 block">Kitchen (KDS) Delay Alerts</span>
                  <span className="text-[11px] text-zinc-500">Monitors prep tickets exceeding target minutes</span>
                </div>
                <input
                  type="checkbox"
                  checked={aiSettings.kitchen_delay_alerts_enabled}
                  onChange={e => handleSaveAISettings({ kitchen_delay_alerts_enabled: e.target.checked })}
                  className="w-4 h-4 accent-zinc-900 rounded"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                <div>
                  <span className="text-xs font-bold text-zinc-900 block">Payroll & Attendance Anomaly</span>
                  <span className="text-[11px] text-zinc-500">Flags shifts without clock-out or duration anomalies</span>
                </div>
                <input
                  type="checkbox"
                  checked={aiSettings.payroll_alerts_enabled}
                  onChange={e => handleSaveAISettings({ payroll_alerts_enabled: e.target.checked })}
                  className="w-4 h-4 accent-zinc-900 rounded"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Operating Thresholds</h3>

              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3">
                <div>
                  <label className="text-xs font-bold text-zinc-900 block mb-1">
                    KDS Delay Threshold (Minutes)
                  </label>
                  <p className="text-[11px] text-zinc-500 mb-2">Orders in preparation longer than this generate an alert.</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={5}
                      max={60}
                      value={aiSettings.kds_delay_threshold_minutes}
                      onChange={e => setAiSettings({ ...aiSettings, kds_delay_threshold_minutes: Number(e.target.value) })}
                      className="w-24 px-3 py-1.5 rounded-lg border border-zinc-300 text-xs font-bold"
                    />
                    <button
                      onClick={() => handleSaveAISettings({ kds_delay_threshold_minutes: aiSettings.kds_delay_threshold_minutes })}
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold"
                    >
                      Update
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-200">
                  <label className="text-xs font-bold text-zinc-900 block mb-1">
                    Default Inventory Reorder Point
                  </label>
                  <p className="text-[11px] text-zinc-500 mb-2">Baseline threshold for ingredients without custom levels.</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={aiSettings.inventory_default_threshold}
                      onChange={e => setAiSettings({ ...aiSettings, inventory_default_threshold: Number(e.target.value) })}
                      className="w-24 px-3 py-1.5 rounded-lg border border-zinc-300 text-xs font-bold"
                    />
                    <button
                      onClick={() => handleSaveAISettings({ inventory_default_threshold: aiSettings.inventory_default_threshold })}
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold"
                    >
                      Update
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. SYSTEM SETTINGS TAB */}
      {activeTab === 'system' && systemSettings && (
        <div className="space-y-6">
          <form onSubmit={handleSaveSystemSettings} className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-zinc-700" />
              <span>System Preferences & POS Thermal Receipts</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Customize company headers, customer receipt footers, tax rules, and default operational preferences.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-900 block mb-1">Business Name</label>
                <input
                  type="text"
                  value={systemSettings.business_name}
                  onChange={e => setSystemSettings({ ...systemSettings, business_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-1 focus:ring-zinc-900 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-900 block mb-1">POS Receipt Header</label>
                <input
                  type="text"
                  value={systemSettings.receipt_header}
                  onChange={e => setSystemSettings({ ...systemSettings, receipt_header: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-1 focus:ring-zinc-900 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-900 block mb-1">POS Receipt Footer Note</label>
                <textarea
                  rows={2}
                  value={systemSettings.receipt_footer}
                  onChange={e => setSystemSettings({ ...systemSettings, receipt_footer: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-1 focus:ring-zinc-900 focus:outline-none font-medium"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-900 block mb-1">Currency Symbol</label>
                <input
                  type="text"
                  value={systemSettings.currency_symbol}
                  onChange={e => setSystemSettings({ ...systemSettings, currency_symbol: e.target.value })}
                  className="w-32 px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-1 focus:ring-zinc-900 focus:outline-none font-mono"
                />
              </div>

              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-zinc-900 block">Value Added Tax (VAT)</span>
                    <span className="text-[11px] text-zinc-500">Calculate tax breakdown on POS checkouts</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={systemSettings.tax_enabled}
                    onChange={e => setSystemSettings({ ...systemSettings, tax_enabled: e.target.checked })}
                    className="w-4 h-4 accent-zinc-900 rounded"
                  />
                </div>

                {systemSettings.tax_enabled && (
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600 block mb-1">Tax Percentage (%)</label>
                    <input
                      type="number"
                      value={systemSettings.tax_percentage}
                      onChange={e => setSystemSettings({ ...systemSettings, tax_percentage: Number(e.target.value) })}
                      className="w-32 px-3 py-1.5 rounded-lg border border-zinc-300 text-xs font-bold"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* n8n Automation & Webhook Integration Section */}
            <div className="md:col-span-2 p-5 rounded-2xl bg-zinc-900 text-white border border-zinc-800 space-y-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      n8n Automation & Webhook Integration
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Live Triggers
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Dispatches structured JSON payloads to external workflows (Telegram alerts, Google Sheets audit ledger, Gmail notifications).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestWebhook}
                    disabled={isTestingWebhook || !systemSettings.n8n_webhook_url}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {isTestingWebhook ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Dispatching Test...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Send Test Webhook</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {webhookTestStatus && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  webhookTestStatus.success
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                }`}>
                  {webhookTestStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                  <span>{webhookTestStatus.message}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">
                  n8n Webhook URL (Production Endpoint)
                </label>
                <input
                  type="url"
                  placeholder="https://n8n.your-domain.com/webhook/tagpuan-events"
                  value={systemSettings.n8n_webhook_url || ''}
                  onChange={e => setSystemSettings({ ...systemSettings, n8n_webhook_url: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-white placeholder-zinc-500 font-mono focus:ring-1 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              {/* Event Triggers List */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-zinc-800/80 border border-zinc-700/80">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="text-xs font-bold text-zinc-200 font-mono">sales.daily_summary</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Shift close & EOD sales, order metrics, cash drawer balance, and recipe ingredient deductions.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-800/80 border border-zinc-700/80">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span className="text-xs font-bold text-zinc-200 font-mono">inventory.low_stock</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Instant alerts when patties, buns, or siomai hit reorder thresholds or reach 0 depleted stock.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-800/80 border border-zinc-700/80">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    <span className="text-xs font-bold text-zinc-200 font-mono">remittance.submitted</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Cashier & Manager shift reconciliation, cash breakdown, physical counts, and vault variances.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#111111] text-white text-xs font-bold hover:bg-zinc-800 transition shadow-sm"
            >
              Save System Preferences
            </button>
          </div>
        </form>

        {/* PRODUCTION DEPLOYMENT & CLEAN STATE INITIALIZATION CARD */}
        <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50/70 via-white to-zinc-50 p-6 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-black shadow-md shadow-emerald-700/20 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-zinc-900 tracking-tight">
                    Production Readiness & Clean State Initialization
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Live Store Opening
                  </span>
                </div>
                <p className="text-xs text-zinc-600 mt-1 max-w-2xl leading-relaxed">
                  Reset all mock POS/Kiosk transactions, test cashier shifts, fake remittances, dummy audit logs, and test attendance. 
                  Preserves all 17 branches, full burger & siomai menu items, recipes, raw ingredients catalogue, and core user accounts.
                  Sets starting sales metrics and daily revenue counters to <strong>₱0.00</strong>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenCleanResetModal}
              className="px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black transition shadow-md hover:shadow-lg flex items-center gap-2 shrink-0 cursor-pointer active:scale-95"
            >
              <span>🧹 Clean Test Data & Prep for Live Deployment</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-emerald-100 font-mono text-[11px]">
            <div className="p-3 rounded-xl bg-white border border-emerald-200/80 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-zinc-900">Master Config Preserved</p>
                <p className="text-[10px] text-zinc-500">17 Branches, Menu, Recipes, Ingredients, Users</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white border border-emerald-200/80 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-zinc-900">Starting Sales Counter</p>
                <p className="text-[10px] text-zinc-500">Clean ₱0.00 base ready for real revenue</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white border border-emerald-200/80 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-zinc-900">Atomic Inventory Sync</p>
                <p className="text-[10px] text-zinc-500">Real-time deductions on POS & Kiosk checkout</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* 9. AUDIT TRAIL TAB */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Administrative Audit Trail</h2>
              <p className="text-xs text-zinc-500">Authoritative log of all Owner and administrative state modifications.</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={auditFilterAction}
                onChange={e => setAuditFilterAction(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-700 focus:outline-none"
              >
                <option value="ALL">All Actions</option>
                <option value="BRANCH_CREATED">Branch Created</option>
                <option value="BRANCH_UPDATED">Branch Updated</option>
                <option value="PRODUCT_PRICE_UPDATED">Price Updated</option>
                <option value="INVENTORY_THRESHOLD_UPDATED">Inventory Threshold</option>
                <option value="AI_SETTINGS_UPDATED">AI Settings</option>
                <option value="PAYMENT_CONFIG_UPDATED">Payment Config</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Actor Email</th>
                    <th className="px-4 py-3">Entity Type</th>
                    <th className="px-4 py-3">Details / Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {auditLogs
                    .filter(l => auditFilterAction === 'ALL' || l.action === auditFilterAction)
                    .map(log => (
                      <tr key={log.id} className="hover:bg-zinc-50/80 transition">
                        <td className="px-4 py-3 font-mono text-[11px] text-zinc-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-800">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-zinc-900">{log.user_email}</td>
                        <td className="px-4 py-3 text-zinc-600 font-mono text-[11px]">{log.entity_type}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-zinc-500 max-w-md truncate">
                          {JSON.stringify(log.metadata || {})}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Branch Modal */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900">
                {editingBranch ? 'Edit Branch Profile' : 'Register New Branch'}
              </h3>
              <button onClick={() => setIsBranchModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Branch Name</label>
                <input
                  type="text"
                  required
                  value={branchForm.name}
                  onChange={e => setBranchForm({ ...branchForm, name: e.target.value })}
                  placeholder="e.g., Tagpuan Marikina Heights"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Street Address</label>
                <input
                  type="text"
                  value={branchForm.address}
                  onChange={e => setBranchForm({ ...branchForm, address: e.target.value })}
                  placeholder="Full location address"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={branchForm.phone}
                    onChange={e => setBranchForm({ ...branchForm, phone: e.target.value })}
                    placeholder="0917-000-0000"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">Branch Manager</label>
                  <input
                    type="text"
                    value={branchForm.manager_name}
                    onChange={e => setBranchForm({ ...branchForm, manager_name: e.target.value })}
                    placeholder="Manager name"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#111111] text-white text-xs font-bold hover:bg-zinc-800 transition"
                >
                  Save Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900">
                {editingUser ? 'Modify User Role & Assignment' : 'Create Staff User Account'}
              </h3>
              <button onClick={() => setIsUserModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={userForm.full_name}
                  onChange={e => setUserForm({ ...userForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Login Email</label>
                <input
                  type="email"
                  required
                  disabled={!!editingUser}
                  value={userForm.email}
                  onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-1 focus:ring-zinc-900 focus:outline-none disabled:bg-zinc-100"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">Initial Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={userForm.password}
                    onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">Role</label>
                  <select
                    value={userForm.role}
                    onChange={e => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-1 focus:ring-zinc-900 focus:outline-none font-medium"
                  >
                    <option value="CREW">CREW</option>
                    <option value="CASHIER">CASHIER</option>
                    <option value="KITCHEN">KITCHEN</option>
                    <option value="WAREHOUSEMAN">WAREHOUSEMAN</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="OWNER">OWNER</option>
                  </select>
                </div>

                {userForm.role !== 'OWNER' && (
                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-1">Assigned Branch</label>
                    <select
                      value={userForm.branch_id}
                      onChange={e => setUserForm({ ...userForm, branch_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-1 focus:ring-zinc-900 focus:outline-none font-medium"
                    >
                      <option value="">Unassigned</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#111111] text-white text-xs font-bold hover:bg-zinc-800 transition"
                >
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {isResetPasswordModalOpen && targetUserForPassword && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900">Direct Password Reset</h3>
              <button onClick={() => setIsResetPasswordModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-500">
              Set a new authoritative password for <strong>{targetUserForPassword.email}</strong>.
            </p>

            <form onSubmit={handleSaveNewPassword} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">New Password (min 6 chars)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPasswordValue}
                  onChange={e => setNewPasswordValue(e.target.value)}
                  placeholder="Enter new strong password"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Price Update Modal */}
      {isPriceModalOpen && targetProductForPrice && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900">Update Selling Price</h3>
              <button onClick={() => setIsPriceModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs">
              <div className="font-bold text-zinc-900">{targetProductForPrice.product_name}</div>
              <div className="text-zinc-500 font-mono text-[11px]">Code: {targetProductForPrice.product_code}</div>
              <div className="mt-1 text-zinc-600">Current Price: <strong>₱{targetProductForPrice.selling_price}</strong></div>
            </div>

            <form onSubmit={handleSavePrice} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">New Selling Price (₱)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  value={newPriceValue}
                  onChange={e => setNewPriceValue(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm font-bold focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPriceModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#111111] text-white text-xs font-bold hover:bg-zinc-800 transition"
                >
                  Confirm Price Change
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Threshold Modal */}
      {isThresholdModalOpen && targetIngredient && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900">Modify Reorder Threshold</h3>
              <button onClick={() => setIsThresholdModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs">
              <div className="font-bold text-zinc-900">{targetIngredient.item_name}</div>
              <div className="text-zinc-500 font-mono text-[11px]">{targetIngredient.item_code} · Unit: {targetIngredient.unit}</div>
            </div>

            <form onSubmit={handleSaveThreshold} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Reorder Point ({targetIngredient.unit})</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={thresholdForm.reorder_level}
                  onChange={e => setThresholdForm({ ...thresholdForm, reorder_level: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm font-bold focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Maximum Stock Target ({targetIngredient.unit})</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={thresholdForm.maximum_stock}
                  onChange={e => setThresholdForm({ ...thresholdForm, maximum_stock: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm font-bold focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsThresholdModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#111111] text-white text-xs font-bold hover:bg-zinc-800 transition"
                >
                  Update Across 17 Branches
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Configuration Modal */}
      {isPaymentModalOpen && editingPayment && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900">Configure {editingPayment.payment_method}</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Account / Merchant Name</label>
                <input
                  type="text"
                  required
                  value={paymentForm.account_name}
                  onChange={e => setPaymentForm({ ...paymentForm, account_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Account Number / Phone</label>
                <input
                  type="text"
                  value={paymentForm.account_number}
                  onChange={e => setPaymentForm({ ...paymentForm, account_number: e.target.value })}
                  placeholder="e.g., 0917-888-9999"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">QR Image URL</label>
                <input
                  type="text"
                  value={paymentForm.qr_image_url}
                  onChange={e => setPaymentForm({ ...paymentForm, qr_image_url: e.target.value })}
                  placeholder="https://... or data:image/..."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="paymentActiveCheckbox"
                  checked={paymentForm.is_active}
                  onChange={e => setPaymentForm({ ...paymentForm, is_active: e.target.checked })}
                  className="w-4 h-4 accent-zinc-900 rounded"
                />
                <label htmlFor="paymentActiveCheckbox" className="text-xs font-semibold text-zinc-700">
                  Enable for customer and cashier checkouts
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#111111] text-white text-xs font-bold hover:bg-zinc-800 transition"
                >
                  Save Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MASTER OWNER KIOSK PIN EDIT / RESET MODAL */}
      {resetPinModal.isOpen && resetPinModal.branch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-zinc-900">
                    Edit Kiosk Access PIN
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {resetPinModal.branch.branch_name} ({resetPinModal.branch.branch_code})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetPinModal({ isOpen: false, branch: null, newPin: '', terminalName: '', isSubmitting: false })}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Security Overwrite Notice
              </div>
              <p className="text-[11px] leading-relaxed">
                Updating this PIN immediately invalidates previous credentials for {resetPinModal.branch.branch_name}.
                Branch Manager <strong className="font-bold">{resetPinModal.branch.manager_name}</strong> will need this new PIN for manager overrides and terminal sign-in.
              </p>
            </div>

            <form onSubmit={handleSaveResetPin} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">
                  Terminal Name / Identifier
                </label>
                <input
                  type="text"
                  value={resetPinModal.terminalName}
                  onChange={e => setResetPinModal({ ...resetPinModal, terminalName: e.target.value })}
                  placeholder="e.g. Main Kiosk #1"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-1 focus:ring-zinc-900 focus:outline-none font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                    New Numeric PIN (4 to 6 Digits)
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPin}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-800 underline cursor-pointer"
                  >
                    🎲 Generate Random
                  </button>
                </div>
                <input
                  type="text"
                  required
                  pattern="[0-9]{4,6}"
                  maxLength={6}
                  value={resetPinModal.newPin}
                  onChange={e => setResetPinModal({ ...resetPinModal, newPin: e.target.value.replace(/\D/g, '') })}
                  placeholder="e.g. 1234 or 8821"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-300 text-center font-mono text-2xl font-black tracking-widest text-zinc-900 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-zinc-50"
                />
                <p className="text-[10px] text-zinc-400 text-center mt-1">
                  Only numbers allowed (4-6 digits). Current: {resetPinModal.branch.kiosk_pin}.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setResetPinModal({ isOpen: false, branch: null, newPin: '', terminalName: '', isSubmitting: false })}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetPinModal.isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#111111] hover:bg-black text-[#CDEBC5] text-xs font-black transition flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  {resetPinModal.isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Saving PIN...
                    </>
                  ) : (
                    <>
                      <Key className="w-3.5 h-3.5" />
                      Save & Propagate PIN
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MASTER OWNER ADD NEW KIOSK TERMINAL PIN MODAL */}
      {isAddPinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#CDEBC5] text-[#111111] flex items-center justify-center font-black">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-zinc-900">
                    + Add New Kiosk Terminal PIN
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Assign terminal access credentials to any of the 17 branches
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPinModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddPin} className="space-y-4">
              {/* Branch Selector */}
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">
                  Target Branch Outlet (1 of 17)
                </label>
                <select
                  value={newPinForm.branch_id}
                  onChange={e => {
                    const bId = e.target.value;
                    const bObj = branches.find(b => b.id === bId) || kioskPinDirectory.find(b => b.branch_id === bId);
                    setNewPinForm({
                      ...newPinForm,
                      branch_id: bId,
                      terminal_name: bObj ? `${(bObj as any).name || (bObj as any).branch_name} Kiosk #1` : newPinForm.terminal_name
                    });
                  }}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none bg-zinc-50 font-semibold"
                >
                  <option value="">Select Branch...</option>
                  {(branches.length > 0 ? branches : kioskPinDirectory).map(b => {
                    const bId = 'id' in b ? b.id : b.branch_id;
                    const bName = 'name' in b ? b.name : b.branch_name;
                    const bCode = 'code' in b ? b.code : b.branch_code;
                    return (
                      <option key={bId} value={bId}>
                        {bName} {bCode ? `(${bCode})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Terminal Name / Identifier */}
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">
                  Terminal Name / Identifier
                </label>
                <input
                  type="text"
                  required
                  value={newPinForm.terminal_name}
                  onChange={e => setNewPinForm({ ...newPinForm, terminal_name: e.target.value })}
                  placeholder="e.g. Counter Kiosk #1, Drive-Thru Terminal"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-1 focus:ring-zinc-900 focus:outline-none font-medium"
                />
              </div>

              {/* Assigned Kiosk PIN */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                    Assigned Kiosk PIN (4 to 6 Digits)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const random = Math.floor(1000 + Math.random() * 9000).toString();
                      setNewPinForm(prev => ({ ...prev, kiosk_pin: random }));
                    }}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                  >
                    🎲 Generate Random
                  </button>
                </div>
                <input
                  type="text"
                  required
                  pattern="[0-9]{4,6}"
                  maxLength={6}
                  value={newPinForm.kiosk_pin}
                  onChange={e => setNewPinForm({ ...newPinForm, kiosk_pin: e.target.value.replace(/\D/g, '') })}
                  placeholder="e.g. 1234 or 8821"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-300 text-center font-mono text-2xl font-black tracking-widest text-zinc-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-zinc-50"
                />
                <p className="text-[10px] text-zinc-400 text-center mt-1">
                  Only numbers allowed (4-6 digits). This PIN grants kiosk override and manager access.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsAddPinModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newPinForm.isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#111111] hover:bg-black text-[#CDEBC5] text-xs font-black transition flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  {newPinForm.isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Creating PIN...
                    </>
                  ) : (
                    <>
                      <Key className="w-3.5 h-3.5" />
                      Create Terminal PIN
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MASTER OWNER DELETE KIOSK TERMINAL PIN CONFIRMATION MODAL */}
      {deletePinModal.isOpen && deletePinModal.branch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-black">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-zinc-900">
                    Delete Kiosk Terminal Credentials
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {deletePinModal.branch.branch_name} ({deletePinModal.branch.branch_code})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeletePinModal({ isOpen: false, branch: null, isSubmitting: false })}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-red-50 rounded-2xl border border-red-200 text-xs text-red-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                Confirm Credential Removal
              </div>
              <p className="text-[11px] leading-relaxed">
                Are you sure you want to remove the kiosk terminal PIN credentials for <strong className="font-bold">{deletePinModal.branch.branch_name}</strong>?
                This deactivates manager access codes and terminal authentication for this branch until a new PIN is provisioned.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setDeletePinModal({ isOpen: false, branch: null, isSubmitting: false })}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePin}
                disabled={deletePinModal.isSubmitting}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {deletePinModal.isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Confirm & Delete PIN
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE SECURITY CARD VIEW MODAL (FRANCHISE AUDIT RECORD) */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-zinc-200 space-y-6 my-auto max-h-[92vh] overflow-y-auto">
            {/* Header with Print button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-200 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-zinc-900 text-amber-300">
                    FRANCHISE AUDIT FORM
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">
                    Ref: TFH-PIN-VAULT-17
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-zinc-900 mt-1">
                  Tagpuan Food Hub · Terminal Security Credentials Card
                </h2>
                <p className="text-xs text-zinc-500">
                  CONFIDENTIAL • Issued by Master Owner: Mary Jasmine Adlaon • {new Date().toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-black flex items-center gap-2 shadow-sm cursor-pointer active:scale-95"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  Print Cards (Audit Copy)
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-2 rounded-xl border border-zinc-200 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Grid of Security Cards for all 17 branches */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
              {kioskPinDirectory.map((branch, idx) => (
                <div
                  key={branch.branch_id}
                  className="p-4 rounded-2xl border-2 border-zinc-300 bg-zinc-50/60 flex flex-col justify-between space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between border-b border-zinc-200 pb-2">
                    <div>
                      <div className="text-[10px] font-mono text-zinc-400">
                        OUTLET #{String(idx + 1).padStart(2, '0')} · {branch.branch_code}
                      </div>
                      <div className="text-sm font-black text-zinc-900">
                        {branch.branch_name}
                      </div>
                    </div>
                    <span className="text-[10px] font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300 font-mono">
                      SEC-LEVEL 4
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block">Manager</span>
                      <span className="font-semibold text-zinc-800">{branch.manager_name}</span>
                      <span className="text-[10px] text-zinc-500 block truncate">{branch.phone}</span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-zinc-200 text-center flex flex-col justify-center">
                      <span className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">
                        MANAGER KIOSK PIN
                      </span>
                      <span className="text-lg font-mono font-black text-zinc-900 tracking-widest">
                        {branch.kiosk_pin}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-dashed border-zinc-300 flex items-center justify-between text-[10px] text-zinc-400">
                    <span>Authorized: Void / Cancel / Reset</span>
                    <span>Sign: _________________</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-zinc-100 border border-zinc-200 text-center text-xs text-zinc-500 font-mono">
              Tagpuan Food Hub Franchise Governance System · 17 Certified Operating Branches · Confidential
            </div>
          </div>
        </div>
      )}

      {/* Branch Table / Counter Kiosk QR Modal */}
      {selectedBranchForQR && (
        <BranchKioskQRModal
          branch={selectedBranchForQR}
          isOpen={!!selectedBranchForQR}
          onClose={() => setSelectedBranchForQR(null)}
        />
      )}

      {/* DOUBLE CONFIRMATION MODAL: PRODUCTION CLEAN RESET */}
      {isCleanResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col my-auto">
            {/* Modal Header */}
            <div className="bg-[#111111] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-zinc-900 flex items-center justify-center font-black">
                  <AlertTriangle className="w-5 h-5 text-zinc-900" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">
                    {cleanResetStep === 1
                      ? 'Step 1 of 2: Production Initialization Review'
                      : 'Step 2 of 2: Final Authorization & Store Opening'}
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Tagpuan Home of Authentic Burger & Siomai ERP
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCleanResetModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            {cleanResetStep === 1 ? (
              <div className="p-6 space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-black text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    <span>Clean Production State Action</span>
                  </div>
                  <p className="text-amber-800 leading-relaxed text-[11px]">
                    This action prepares the entire Tagpuan franchise system for live customer orders and official store opening by clearing out all mock transactions.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <h4 className="font-bold text-zinc-900 uppercase text-[10px] tracking-wider font-mono">
                    1. Data that will be WIPED & RESET:
                  </h4>
                  <ul className="space-y-1.5 pl-2 text-zinc-600 font-mono text-[11px]">
                    <li className="flex items-center gap-2 text-rose-700 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                      All test POS and Kiosk orders & order status history
                    </li>
                    <li className="flex items-center gap-2 text-rose-700 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                      Fake cashier shifts, turn-overs, and remittances
                    </li>
                    <li className="flex items-center gap-2 text-rose-700 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                      Test employee attendance clock-in/out records
                    </li>
                    <li className="flex items-center gap-2 text-rose-700 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                      Sample expenses and dummy audit trails
                    </li>
                    <li className="flex items-center gap-2 text-zinc-900 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      Sales counters reset to starting ₱0.00
                    </li>
                  </ul>
                </div>

                <div className="space-y-2.5 pt-2 border-t border-zinc-100">
                  <h4 className="font-bold text-zinc-900 uppercase text-[10px] tracking-wider font-mono">
                    2. Master Configuration that will be PRESERVED:
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-700">
                    <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-200 font-medium">
                      ✓ All 17 Tagpuan Branches
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-200 font-medium">
                      ✓ Full Menu & Recipes (Burgers, Siomai, Fries, Drinks)
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-200 font-medium">
                      ✓ Raw Ingredients Catalogue & Production Stock
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-200 font-medium">
                      ✓ User Accounts (Owner, Managers, Cashiers)
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-200">
                  <button
                    type="button"
                    onClick={() => setIsCleanResetModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-zinc-600 font-bold hover:bg-zinc-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setCleanResetStep(2)}
                    className="px-5 py-2.5 rounded-xl bg-[#111111] hover:bg-black text-[#CDEBC5] font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <span>Proceed to Final Confirmation</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 space-y-2">
                  <div className="flex items-center gap-2 text-rose-900 font-black text-sm">
                    <ShieldAlert className="w-4 h-4 text-rose-700" />
                    <span>FINAL CONFIRMATION REQUIRED</span>
                  </div>
                  <p className="text-rose-800 leading-relaxed text-[11px]">
                    To prevent accidental resets, please confirm that you want to wipe test runs and transition this store to actual live production.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-zinc-800">
                    Type <span className="font-mono bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-300 text-rose-700 font-black">DEPLOY PRODUCTION</span> to authorize:
                  </label>
                  <input
                    type="text"
                    value={cleanResetConfirmationText}
                    onChange={(e) => setCleanResetConfirmationText(e.target.value)}
                    placeholder="DEPLOY PRODUCTION"
                    className="w-full p-2.5 rounded-xl border border-zinc-300 font-mono text-xs font-bold text-zinc-900 uppercase focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-4 border-t border-zinc-200">
                  <button
                    type="button"
                    onClick={() => setCleanResetStep(1)}
                    disabled={isExecutingReset}
                    className="px-4 py-2 rounded-xl text-zinc-600 font-bold hover:bg-zinc-100 transition cursor-pointer"
                  >
                    &larr; Back
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteCleanReset}
                    disabled={cleanResetConfirmationText.trim().toUpperCase() !== 'DEPLOY PRODUCTION' || isExecutingReset}
                    className="px-6 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-black transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    {isExecutingReset ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Initializing Production State...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        <span>🧹 Execute Factory Reset & Open Store</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
