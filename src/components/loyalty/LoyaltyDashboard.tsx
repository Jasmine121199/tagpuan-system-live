import React, { useState, useEffect, useMemo } from 'react';
import { ErrorBoundary } from '../common/ErrorBoundary';
import {
  LoyaltyCustomer,
  LoyaltyTransaction,
  LoyaltyRedemption,
  SavedTicket,
  LoyaltySummary,
  Product,
  Branch
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Award,
  Search,
  Plus,
  Gift,
  History,
  TrendingUp,
  CreditCard,
  UserCheck,
  Building2,
  Clock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Filter,
  RefreshCw,
  Sliders,
  Sparkles,
  Tag,
  Ticket,
  DollarSign,
  Receipt,
  FileSpreadsheet,
  Trash2,
  X
} from 'lucide-react';

const LoyaltyDashboardInner: React.FC = () => {
  const { user, isOwner, isManager } = useAuth();

  // Primary Data State
  const [customers, setCustomers] = useState<LoyaltyCustomer[]>([]);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [redemptions, setRedemptions] = useState<LoyaltyRedemption[]>([]);
  const [savedTickets, setSavedTickets] = useState<SavedTicket[]>([]);
  const [summary, setSummary] = useState<LoyaltySummary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'CUSTOMERS' | 'LEDGER' | 'REDEMPTIONS' | 'SAVED_TICKETS'>('CUSTOMERS');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    user?.role === 'OWNER' ? 'ALL' : (user?.branch_id || 'branch-1')
  );
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<string>('ALL');

  // Modals State
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<LoyaltyCustomer | null>(null);

  // Form Inputs
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerInitialPoints, setNewCustomerInitialPoints] = useState<number>(0);
  const [newCustomerBranchId, setNewCustomerBranchId] = useState<string>(
    user?.branch_id || 'branch-1'
  );

  const [adjustPointsDelta, setAdjustPointsDelta] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('');

  const [redeemProductId, setRedeemProductId] = useState('');
  const [redeemNotes, setRedeemNotes] = useState('');
  const [claimedRewardTicket, setClaimedRewardTicket] = useState<any | null>(null);

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initial Load
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('tagpuan_token');
      const headers = { Authorization: `Bearer ${token}` };

      const branchParam = selectedBranchId !== 'ALL' ? `?branch_id=${selectedBranchId}` : '';

      // Parallel Data Fetching
      const [custRes, txRes, redRes, ticketsRes, sumRes, prodRes, branchRes] = await Promise.all([
        fetch(`/api/loyalty/customers${branchParam}`, { headers }).catch(() => null),
        fetch(`/api/loyalty/transactions${branchParam}`, { headers }).catch(() => null),
        fetch(`/api/loyalty/redemptions${branchParam}`, { headers }).catch(() => null),
        fetch(`/api/loyalty/tickets${branchParam}`, { headers }).catch(() => null),
        fetch(`/api/loyalty/summary${branchParam}`, { headers }).catch(() => null),
        fetch(`/api/products`, { headers }).catch(() => null),
        fetch(`/api/branches`, { headers }).catch(() => null)
      ]);

      const custData = custRes?.ok ? await custRes.json().catch(() => ({})) : {};
      const txData = txRes?.ok ? await txRes.json().catch(() => ({})) : {};
      const redData = redRes?.ok ? await redRes.json().catch(() => ({})) : {};
      const ticketsData = ticketsRes?.ok ? await ticketsRes.json().catch(() => ({})) : {};
      const sumData = sumRes?.ok ? await sumRes.json().catch(() => ({})) : {};
      const prodData = prodRes?.ok ? await prodRes.json().catch(() => ({})) : {};
      const branchData = branchRes?.ok ? await branchRes.json().catch(() => ({})) : {};

      setCustomers(Array.isArray(custData?.customers) ? custData.customers : []);
      setTransactions(Array.isArray(txData?.transactions) ? txData.transactions : []);
      setRedemptions(Array.isArray(redData?.redemptions) ? redData.redemptions : []);
      setSavedTickets(Array.isArray(ticketsData?.tickets) ? ticketsData.tickets : []);
      setSummary(sumData?.summary || null);
      setProducts(Array.isArray(prodData?.products) ? prodData.products.filter((p: Product) => p?.is_active) : []);
      setBranches(Array.isArray(branchData?.branches) ? branchData.branches : []);
    } catch (err: any) {
      console.error('Error loading loyalty data:', err);
      setCustomers([]);
      setTransactions([]);
      setRedemptions([]);
      setSavedTickets([]);
      setStatusMessage({ type: 'error', text: 'Failed to load loyalty data from server.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedBranchId]);

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    let list = Array.isArray(customers) ? customers : [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        c =>
          (c?.customer_name || '').toLowerCase().includes(q) ||
          (c?.phone_number && c.phone_number.includes(q)) ||
          (c?.email && c.email.toLowerCase().includes(q))
      );
    }
    return list;
  }, [customers, searchQuery]);

  // Filtered Ledger
  const filteredTransactions = useMemo(() => {
    let list = Array.isArray(transactions) ? transactions : [];
    if (ledgerTypeFilter !== 'ALL') {
      list = list.filter(t => t?.transaction_type === ledgerTypeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        t =>
          (t?.customer_name || '').toLowerCase().includes(q) ||
          (t?.order_number && t.order_number.toLowerCase().includes(q)) ||
          (t?.reason && t.reason.toLowerCase().includes(q)) ||
          (t?.reward_product_name && t.reward_product_name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [transactions, ledgerTypeFilter, searchQuery]);

  // Create Customer Handler
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) {
      setStatusMessage({ type: 'error', text: 'Customer name is required.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('tagpuan_token');
      const response = await fetch('/api/loyalty/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          customer_name: newCustomerName.trim(),
          phone_number: newCustomerPhone.trim() || undefined,
          email: newCustomerEmail.trim() || undefined,
          initial_points: Number(newCustomerInitialPoints) || 0,
          registered_branch_id: newCustomerBranchId
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create customer.');

      setStatusMessage({
        type: 'success',
        text: `Loyalty customer "${data.customer.customer_name}" successfully registered!`
      });
      setIsAddCustomerModalOpen(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerEmail('');
      setNewCustomerInitialPoints(0);
      fetchData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error creating loyalty customer.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Adjust Points Handler
  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (adjustPointsDelta === 0) {
      setStatusMessage({ type: 'error', text: 'Adjustment points delta cannot be zero.' });
      return;
    }
    if (!adjustReason.trim()) {
      setStatusMessage({ type: 'error', text: 'A clear reason is required for points adjustment audit.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('tagpuan_token');
      const response = await fetch('/api/loyalty/customers/adjust-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          customer_id: selectedCustomer.id,
          points_delta: Number(adjustPointsDelta),
          reason: adjustReason.trim(),
          branch_id: selectedCustomer.registered_branch_id
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to adjust points.');

      setStatusMessage({
        type: 'success',
        text: `Adjusted ${adjustPointsDelta > 0 ? `+${adjustPointsDelta}` : adjustPointsDelta} pts for ${selectedCustomer.customer_name}.`
      });
      setIsAdjustModalOpen(false);
      setSelectedCustomer(null);
      setAdjustPointsDelta(0);
      setAdjustReason('');
      fetchData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Adjustment failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Redeem Reward Handler (200 pts for free menu item)
  const handleRedeemReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (!redeemProductId) {
      setStatusMessage({ type: 'error', text: 'Please select a menu product to redeem.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('tagpuan_token');
      const response = await fetch('/api/loyalty/rewards/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          customer_id: selectedCustomer.id,
          product_id: redeemProductId,
          branch_id: selectedCustomer.registered_branch_id,
          notes: redeemNotes.trim() || undefined
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to redeem reward.');

      const productObj = products.find(p => p.id === redeemProductId);
      const ticketNumber = data.reward_ticket_number || data.redemption?.reward_ticket_number || `REW-${Date.now().toString().slice(-6)}`;

      setClaimedRewardTicket({
        ticket_number: ticketNumber,
        product_name: data.redemption?.product_name || productObj?.name || 'Free Meal',
        retail_value: productObj?.selling_price || 0,
        customer_name: selectedCustomer.customer_name,
        customer_phone: selectedCustomer.phone_number,
        points_spent: 200,
        remaining_points: data.remaining_points,
        branch_name: user?.branch_name || 'Tagpuan Food Hub',
        cashier_name: user?.full_name || 'Cashier Register',
        timestamp: new Date().toISOString(),
        order_number: data.redemption?.order_number
      });

      setStatusMessage({
        type: 'success',
        text: `Reward Claimed! Ticket #${ticketNumber} issued for ${selectedCustomer.customer_name}. Remaining balance: ${data.remaining_points} pts.`
      });
      setIsRedeemModalOpen(false);
      setSelectedCustomer(null);
      setRedeemProductId('');
      setRedeemNotes('');
      fetchData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Redemption failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dismiss Saved Ticket
  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to dismiss this held ticket?')) return;
    try {
      const token = localStorage.getItem('tagpuan_token');
      const res = await fetch(`/api/loyalty/tickets/${ticketId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setStatusMessage({ type: 'success', text: 'Held ticket dismissed.' });
        fetchData();
      }
    } catch (err) {
      alert('Failed to dismiss ticket.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#111111] text-[#CDEBC5] flex items-center justify-center font-black shadow-xs">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-xl text-[#111111] tracking-tight">
                Loyalty & Rewards Program
              </h1>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#CDEBC5] text-[#111111] uppercase tracking-wide">
                Phase 10 Live
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-medium mt-0.5 flex items-center gap-2">
              <span>₱100 Paid Purchase = 2 Loyalty Points</span>
              <span>•</span>
              <span>200 Points = 1 Free Menu Product</span>
            </p>
          </div>
        </div>

        {/* Header Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Branch Filter (Owner Only) */}
          {isOwner && (
            <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-2.5 py-1.5 text-xs">
              <Building2 className="w-3.5 h-3.5 text-zinc-500" />
              <select
                value={selectedBranchId}
                onChange={e => setSelectedBranchId(e.target.value)}
                className="bg-transparent font-bold text-zinc-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All 17 Branches</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={fetchData}
            className="p-2 rounded-xl border border-zinc-200 text-zinc-600 hover:text-black hover:bg-zinc-50 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            id="btn-register-customer"
            onClick={() => setIsAddCustomerModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#111111] text-[#CDEBC5] hover:bg-zinc-800 font-bold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Register Customer</span>
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Overview Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Members */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Enrolled Members
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-[#111111] tracking-tight">
              {summary?.total_customers ?? (customers || []).length}
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Active Tagpuan Club Cards</p>
          </div>
        </div>

        {/* Lifetime Points Earned */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Points Distributed
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-emerald-700 tracking-tight">
              +{summary?.total_points_earned != null ? Number(summary.total_points_earned).toLocaleString() : '0'} pts
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Accrued from paid orders</p>
          </div>
        </div>

        {/* Free Rewards Claimed */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Free Rewards Claimed
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-purple-700 tracking-tight">
              {summary?.total_rewards_claimed ?? (redemptions || []).length} Free Items
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              {summary?.total_points_redeemed != null ? Number(summary.total_points_redeemed).toLocaleString() : '0'} pts redeemed
            </p>
          </div>
        </div>

        {/* Outstanding Active Point Liability */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Active Points Balance
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-amber-700 tracking-tight">
              {summary?.outstanding_points_liability != null ? Number(summary.outstanding_points_liability).toLocaleString() : '0'} pts
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              Available across all accounts
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs & Search */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-2 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab('CUSTOMERS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'CUSTOMERS'
                ? 'bg-[#111111] text-[#CDEBC5]'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Member Directory ({(customers || []).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LEDGER')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'LEDGER'
                ? 'bg-[#111111] text-[#CDEBC5]'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Points Ledger & Audit ({(transactions || []).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('REDEMPTIONS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'REDEMPTIONS'
                ? 'bg-[#111111] text-[#CDEBC5]'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>Redeemed Rewards ({(redemptions || []).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SAVED_TICKETS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'SAVED_TICKETS'
                ? 'bg-[#111111] text-[#CDEBC5]'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>Held Tickets ({(savedTickets || []).length})</span>
          </button>
        </div>

        {/* Universal Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search member, ticket, or phone..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#111111]"
          />
        </div>
      </div>

      {/* TAB 1: CUSTOMERS DIRECTORY */}
      {activeTab === 'CUSTOMERS' && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-[#111111]">
              Loyalty Customer Directory & Balances
            </h3>
            <span className="text-xs text-zinc-500 font-mono">
              Showing {filteredCustomers.length} member(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider text-[10px] font-bold border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Current Points</th>
                  <th className="py-3 px-4">Reward Status</th>
                  <th className="py-3 px-4">Registered Branch</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-400">
                      No loyalty members found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map(customer => {
                    const canRedeem = customer.current_points >= 200;
                    return (
                      <tr key={customer.id} className="hover:bg-zinc-50/80 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-zinc-900 text-sm">
                            {customer.customer_name}
                          </div>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            ID: {customer.id.substring(0, 8)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-zinc-700 font-medium">
                            {customer.phone_number || 'No Phone'}
                          </div>
                          {customer.email && (
                            <div className="text-[11px] text-zinc-400">{customer.email}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 font-black text-sm">
                            <span
                              className={`px-2.5 py-1 rounded-xl ${
                                canRedeem
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : 'bg-zinc-100 text-zinc-800'
                              }`}
                            >
                              ⭐ {customer.current_points} pts
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-400 mt-0.5">
                            Earned: {customer.total_points_earned} | Used:{' '}
                            {customer.total_points_redeemed}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {canRedeem ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-900 border border-purple-200">
                              <Sparkles className="w-3 h-3 text-purple-700" />
                              Ready for Free Reward!
                            </span>
                          ) : (
                            <span className="text-zinc-400 text-[11px]">
                              {200 - customer.current_points} pts to next reward
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-zinc-600 font-medium">
                          {customer.registered_branch_name}
                        </td>
                        <td className="py-3 px-4 text-zinc-500 font-mono text-[11px]">
                          {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Redeem Reward Button */}
                            <button
                              type="button"
                              id={`btn-claim-reward-${customer.id}`}
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setIsRedeemModalOpen(true);
                              }}
                              disabled={!canRedeem}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                canRedeem
                                  ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-xs active:scale-95'
                                  : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                              }`}
                              title={canRedeem ? 'Claim Free Reward (200 pts)' : 'Needs at least 200 points to redeem'}
                            >
                              <Gift className="w-3.5 h-3.5" />
                              <span>🎁 Claim Reward (200 pts)</span>
                            </button>

                            {/* Adjust Points Button (Owner & Manager) */}
                            {(isOwner || isManager) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCustomer(customer);
                                  setIsAdjustModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition"
                                title="Adjust Points (Owner/Manager)"
                              >
                                Adjust
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: IMMUTABLE POINTS LEDGER */}
      {activeTab === 'LEDGER' && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="font-extrabold text-sm text-[#111111]">
              Authoritative Points Transaction Ledger
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Filter Event:</span>
              <select
                value={ledgerTypeFilter}
                onChange={e => setLedgerTypeFilter(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-zinc-200 text-xs font-bold bg-zinc-50"
              >
                <option value="ALL">All Event Types</option>
                <option value="EARN">EARN (Sales Accrual)</option>
                <option value="REDEEM">REDEEM (Reward Claim)</option>
                <option value="REVERSAL">REVERSAL (Voided/Cancelled)</option>
                <option value="ADJUSTMENT">ADJUSTMENT (Manual)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider text-[10px] font-bold border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Points Delta</th>
                  <th className="py-3 px-4">Order / Reward Ref</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Staff / Processed By</th>
                  <th className="py-3 px-4">Reason / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-mono">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-zinc-400">
                      No points transactions recorded for this filter.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map(tx => {
                    const isPositive = tx.points > 0;
                    const badgeColor =
                      tx.transaction_type === 'EARN'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : tx.transaction_type === 'REDEEM'
                        ? 'bg-purple-100 text-purple-900 border-purple-300'
                        : tx.transaction_type === 'REVERSAL'
                        ? 'bg-red-100 text-red-900 border-red-300'
                        : 'bg-amber-100 text-amber-900 border-amber-300';

                    return (
                      <tr key={tx.id} className="hover:bg-zinc-50 transition">
                        <td className="py-3 px-4 text-zinc-500 text-[11px]">
                          {new Date(tx.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-sans font-bold text-zinc-900">
                          {tx.customer_name}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${badgeColor}`}
                          >
                            {tx.transaction_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-black text-sm">
                          <span className={isPositive ? 'text-emerald-700' : 'text-red-600'}>
                            {isPositive ? `+${tx.points}` : tx.points} pts
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-800">
                          {tx.order_number ? (
                            <span className="font-bold">#{tx.order_number}</span>
                          ) : tx.reward_product_name ? (
                            <span className="text-purple-700 font-sans font-semibold">
                              {tx.reward_product_name}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 px-4 font-sans text-zinc-600">
                          {tx.branch_name}
                        </td>
                        <td className="py-3 px-4 font-sans text-zinc-700">
                          {tx.processed_by_name || 'System Auto'}
                        </td>
                        <td className="py-3 px-4 font-sans text-zinc-500 text-[11px]">
                          {tx.reason || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: REDEMPTIONS LOG */}
      {activeTab === 'REDEMPTIONS' && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-[#111111]">
              Free Reward Claims & Product Redemptions
            </h3>
            <span className="text-xs text-zinc-500 font-mono">
              Total Redeemed: {(redemptions || []).length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider text-[10px] font-bold border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-4">Redemption Time</th>
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Reward Product Claimed</th>
                  <th className="py-3 px-4">Points Spent</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Cashier / Staff</th>
                  <th className="py-3 px-4">Order Ref</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {(redemptions || []).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-zinc-400">
                      No rewards claimed yet.
                    </td>
                  </tr>
                ) : (
                  (redemptions || []).map(r => (
                    <tr key={r?.id} className="hover:bg-zinc-50 transition">
                      <td className="py-3 px-4 font-mono text-zinc-500 text-[11px]">
                        {r?.redeemed_at ? new Date(r.redeemed_at).toLocaleString() : '—'}
                      </td>
                      <td className="py-3 px-4 font-bold text-zinc-900">
                        {r?.customer_name || 'Member'}
                      </td>
                      <td className="py-3 px-4 font-extrabold text-purple-900 flex items-center gap-1.5">
                        <Gift className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>{r?.product_name || 'Menu Reward'}</span>
                      </td>
                      <td className="py-3 px-4 font-black text-amber-800 font-mono">
                        -{r?.points_spent ?? 200} pts
                      </td>
                      <td className="py-3 px-4 text-zinc-600">{r?.branch_name || 'Branch'}</td>
                      <td className="py-3 px-4 text-zinc-700">{r?.cashier_name || 'Counter Staff'}</td>
                      <td className="py-3 px-4 font-mono text-zinc-600">
                        {r?.order_number ? `#${r.order_number}` : 'COUNTER'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-900">
                          {r?.status || 'COMPLETED'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SAVED / HELD TICKETS */}
      {activeTab === 'SAVED_TICKETS' && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-[#111111]">
              Saved & Held POS Tickets
            </h3>
            <span className="text-xs text-zinc-500">
              Cashiers can recall these tickets at the POS counter
            </span>
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(savedTickets || []).length === 0 ? (
              <div className="col-span-full py-12 text-center text-zinc-400">
                No tickets currently on hold.
              </div>
            ) : (
              (savedTickets || []).map(ticket => (
                <div
                  key={ticket?.id}
                  className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 space-y-3 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded-md bg-[#111111] text-[#CDEBC5] text-xs font-mono font-black">
                        #{ticket?.ticket_number || 'TICKET'}
                      </span>
                      <h4 className="font-black text-sm text-zinc-900 mt-1">
                        {ticket?.customer_name || 'Counter Customer'}
                      </h4>
                      <p className="text-[11px] text-zinc-500">
                        {ticket?.branch_name || 'Branch'} • {ticket?.created_at ? new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => ticket?.id && handleDeleteTicket(ticket.id)}
                      className="p-1 text-zinc-400 hover:text-red-600 transition"
                      title="Dismiss ticket"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-xs space-y-1 bg-white p-2.5 rounded-xl border border-zinc-200">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Held Items</p>
                    {ticket.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-zinc-700">
                        <span>{item.quantity}x {(item as any).product?.name || item.product_name}</span>
                        <span className="font-mono font-bold">₱{((item as any).totalPrice ?? item.subtotal ?? 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-zinc-200">
                    <span className="text-xs text-zinc-500 font-bold">Total:</span>
                    <span className="text-sm font-black text-[#111111] font-mono">
                      ₱{ticket.subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL: ENROLL NEW LOYALTY CUSTOMER */}
      {isAddCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-fadeIn">
            <div className="bg-[#111111] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#CDEBC5]" />
                <h3 className="font-bold text-sm">Enroll New Loyalty Member</h3>
              </div>
              <button
                onClick={() => setIsAddCustomerModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={e => setNewCustomerName(e.target.value)}
                  placeholder="e.g. Maria Santos"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs focus:ring-2 focus:ring-[#111111] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="text"
                  value={newCustomerPhone}
                  onChange={e => setNewCustomerPhone(e.target.value)}
                  placeholder="e.g. 0917-888-9999"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs focus:ring-2 focus:ring-[#111111] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={newCustomerEmail}
                  onChange={e => setNewCustomerEmail(e.target.value)}
                  placeholder="e.g. maria@gmail.com"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs focus:ring-2 focus:ring-[#111111] focus:outline-none"
                />
              </div>

              {isOwner && (
                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">
                    Registration Branch
                  </label>
                  <select
                    value={newCustomerBranchId}
                    onChange={e => setNewCustomerBranchId(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs font-bold bg-white focus:outline-none"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">
                  Initial Promotional Points (Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="2"
                  value={newCustomerInitialPoints}
                  onChange={e => setNewCustomerInitialPoints(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#111111] focus:outline-none"
                />
                <p className="text-[10px] text-zinc-400 mt-1">
                  Leave at 0 for standard member enrollment.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#111111] text-[#CDEBC5] text-xs font-bold hover:bg-zinc-800 disabled:opacity-50"
                >
                  {isSubmitting ? 'Enrolling...' : 'Enroll Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADJUST POINTS (OWNER & MANAGER) */}
      {isAdjustModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-fadeIn">
            <div className="bg-[#111111] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#CDEBC5]" />
                <h3 className="font-bold text-sm">Manual Points Adjustment</h3>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdjustPoints} className="p-5 space-y-4">
              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 text-xs space-y-1">
                <div className="flex justify-between font-bold">
                  <span className="text-zinc-600">Member:</span>
                  <span className="text-black">{selectedCustomer.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Current Balance:</span>
                  <span className="font-mono font-black text-amber-700">
                    {selectedCustomer.current_points} pts
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">
                  Points Delta (+ to add, - to deduct) *
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  value={adjustPointsDelta}
                  onChange={e => setAdjustPointsDelta(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-black focus:ring-2 focus:ring-[#111111] focus:outline-none"
                  placeholder="e.g. 50 or -20"
                />
                <p className="text-[10px] text-zinc-400 mt-1">
                  New Balance will be:{' '}
                  <strong>
                    {Math.max(0, selectedCustomer.current_points + adjustPointsDelta)} pts
                  </strong>
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">
                  Justification / Reason (Audited) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder="e.g. Loyalty anniversary promo bonus, customer service compensation"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs focus:ring-2 focus:ring-[#111111] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#111111] text-[#CDEBC5] text-xs font-bold hover:bg-zinc-800 disabled:opacity-50"
                >
                  {isSubmitting ? 'Adjusting...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REDEEM FREE PRODUCT (200 PTS) */}
      {isRedeemModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-fadeIn">
            <div className="bg-purple-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-purple-300" />
                <h3 className="font-bold text-sm">Claim Free Loyalty Product (200 pts)</h3>
              </div>
              <button
                onClick={() => setIsRedeemModalOpen(false)}
                className="text-purple-300 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRedeemReward} className="p-5 space-y-4">
              <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 text-xs space-y-1">
                <div className="flex justify-between font-bold">
                  <span className="text-purple-800">Member:</span>
                  <span className="text-purple-950 font-black">{selectedCustomer.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-800">Available Points:</span>
                  <span className="font-mono font-black text-purple-950">
                    {selectedCustomer.current_points} pts
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-purple-200 text-purple-900">
                  <span>Cost of Reward:</span>
                  <span className="font-black text-red-600">-200 pts</span>
                </div>
                <div className="flex justify-between text-purple-950 font-bold">
                  <span>Remaining after Claim:</span>
                  <span>{selectedCustomer.current_points - 200} pts</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">
                  Select Free Menu Item to Claim *
                </label>
                <select
                  required
                  value={redeemProductId}
                  onChange={e => setRedeemProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs font-bold bg-white focus:outline-none"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Valued at ₱{p.selling_price.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">
                  Redemption Notes (Optional)
                </label>
                <input
                  type="text"
                  value={redeemNotes}
                  onChange={e => setRedeemNotes(e.target.value)}
                  placeholder="e.g. Dine-in claim, birthday treat"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs focus:ring-2 focus:ring-[#111111] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRedeemModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Gift className="w-4 h-4" />
                  <span>{isSubmitting ? 'Processing...' : 'Deduct 200 pts & Claim'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Claimed Reward Ticket Success Modal */}
      {claimedRewardTicket && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-900 to-zinc-900 text-white p-4.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#CDEBC5] text-[#111111] flex items-center justify-center font-black">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                    <span>Reward Ticket Issued</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-800 text-[#CDEBC5] font-bold">
                      200 PTS CLAIM
                    </span>
                  </h3>
                  <p className="text-xs text-purple-200">Zero Drawer Cash Discrepancy</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setClaimedRewardTicket(null)}
                className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ticket Body */}
            <div className="p-5 space-y-4">
              {/* Ticket Badge */}
              <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-center space-y-1">
                <span className="text-[10px] uppercase font-bold text-purple-700 tracking-wider">
                  Official Kitchen Claim Ticket
                </span>
                <p className="text-2xl font-black font-mono text-purple-950 tracking-wide">
                  #{claimedRewardTicket.ticket_number}
                </p>
                <p className="text-xs font-bold text-purple-900">
                  {claimedRewardTicket.product_name}
                </p>
              </div>

              {/* Details List */}
              <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 divide-y divide-zinc-200/70 text-xs space-y-2">
                <div className="flex justify-between items-center pb-2">
                  <span className="text-zinc-500">Customer Member:</span>
                  <span className="font-bold text-zinc-900">
                    {claimedRewardTicket.customer_name} ({claimedRewardTicket.customer_phone})
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-zinc-500">Retail Value:</span>
                  <span className="font-mono font-bold text-zinc-900">
                    ₱{claimedRewardTicket.retail_value.toFixed(2)} (FREE MEAL)
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-zinc-500">Points Burned:</span>
                  <span className="font-mono font-bold text-purple-700">
                    -200 pts (Remaining: {claimedRewardTicket.remaining_points} pts)
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-zinc-500">Dispensed By:</span>
                  <span className="text-zinc-800 font-medium">
                    {claimedRewardTicket.cashier_name} • {claimedRewardTicket.branch_name}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-zinc-500">Claim Timestamp:</span>
                  <span className="font-mono text-zinc-500 text-[11px]">
                    {new Date(claimedRewardTicket.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Kitchen & Drawer Inventory Notice */}
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Automatic Stock Depletion</span>
                  <span>
                    Recipe ingredients have been automatically deducted from branch inventory. Registered as Zero-Cash promotional redemption.
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Print Ticket</span>
                </button>
                <button
                  type="button"
                  onClick={() => setClaimedRewardTicket(null)}
                  className="px-4 py-2 rounded-xl bg-[#111111] hover:bg-black text-[#CDEBC5] text-xs font-black transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const LoyaltyDashboard: React.FC = () => {
  return (
    <ErrorBoundary
      fallbackTitle="Loyalty & Rewards Program Temporarily Unavailable"
      fallbackMessage="The loyalty membership data could not be rendered. Click retry to refresh customer balances and point ledgers."
    >
      <LoyaltyDashboardInner />
    </ErrorBoundary>
  );
};

export const LoyaltyView = LoyaltyDashboard;
export default LoyaltyDashboard;
