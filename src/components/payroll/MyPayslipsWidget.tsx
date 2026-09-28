import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Eye,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PayrollRecord } from '../../types';

export const MyPayslipsWidget: React.FC = () => {
  const { user } = useAuth();
  const [payslips, setPayslips] = useState<PayrollRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);

  const fetchMyPayslips = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('tagpuan_token');
      const res = await fetch('/api/payroll/my-payslips', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPayslips(data.records || []);
      }
    } catch (err) {
      console.error('Failed to load personal payslips:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyPayslips();
  }, []);

  const handleExportText = (record: PayrollRecord) => {
    const grossStr = `₱${record.gross_payable_amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const adjStr = record.adjustments !== 0
      ? (record.adjustments > 0
          ? `+₱${record.adjustments.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : `-₱${Math.abs(record.adjustments).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
      : '₱0.00';
    const netStr = `₱${record.final_amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const breakHours = record.deducted_break_hours ?? (record.breakdown_items || []).reduce((acc, item) => acc + (item.deducted_break_hours || 0), 0);

    const text = `=====================================================
TAGPUAN FOOD HUB - OFFICIAL EMPLOYEE PAYSLIP
Republic of the Philippines
=====================================================
Branch:       ${record.branch_name}
Pay Period:   ${record.period_name || 'Current Period'}
Status:       ${record.status}
Generated:    ${new Date(record.created_at).toLocaleString()}
-----------------------------------------------------
EMPLOYEE DETAILS:
Name:         ${record.employee_name}
Role:         ${record.employee_role}
Employee ID:  ${record.employee_id}
Branch:       ${record.branch_name}
-----------------------------------------------------
HOURS & ATTENDANCE SUMMARY:
Total Shifts: ${record.total_shifts}
Gross Hours:  ${record.gross_hours} hrs
Break Deduct: -${breakHours} hrs (1-hour unpaid break per shift >= 5h)
Payable Hours:${record.payable_hours} hrs
-----------------------------------------------------
SHIFT BREAKDOWN:
${(record.breakdown_items || []).map((it, idx) => `[Shift ${idx + 1}] ${it.date} | In: ${new Date(it.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | Out: ${new Date(it.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | Gross: ${it.gross_hours}h | Break: -${it.deducted_break_hours}h | Payable: ${it.payable_hours}h | Pay: ₱${it.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join('\n')}
-----------------------------------------------------
COMPENSATION SUMMARY (PHP ₱):
Gross Basic Earnings:     ${grossStr}
Allowances / Adjustments: ${adjStr} ${record.adjustment_note ? `(${record.adjustment_note})` : ''}
NET TAKE-HOME PAY:         ${netStr}
=====================================================
CERTIFICATION & SIGNATURES:

Prepared By:  ${record.prepared_by_name || 'Store Branch Manager'}
Title:        Branch Manager / Operations Supervisor
Signature:    ______________________________________

Approved By:  ${record.approved_by_name || (record.status === 'APPROVED' ? 'Tagpuan Food Hub Management' : 'Pending Owner Approval')}
Title:        Owner / Tagpuan Food Hub Management
Signature:    ______________________________________
=====================================================`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Payslip_${record.employee_name.replace(/\s+/g, '_')}_${record.period_name?.replace(/\s+/g, '_') || 'Current'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#CDEBC5] text-[#111111] flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[#111111] flex items-center gap-2">
              <span>My Approved Payslips</span>
              <span className="px-2 py-0.5 text-[10px] font-bold font-mono bg-emerald-100 text-emerald-800 rounded-full">
                Self-Service Scope
              </span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Strictly confidential compensation slips for {user?.full_name} ({user?.role}).
            </p>
          </div>
        </div>

        <button
          onClick={fetchMyPayslips}
          className="text-xs font-bold text-zinc-600 hover:text-black transition"
        >
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-zinc-400 text-xs">
          Loading your approved payslips...
        </div>
      ) : payslips.length === 0 ? (
        <div className="py-8 text-center bg-[#f8fafc] rounded-xl border border-dashed border-[#e2e8f0]">
          <CheckCircle2 className="w-8 h-8 text-zinc-400 mx-auto mb-2 opacity-50" />
          <p className="text-xs font-bold text-zinc-600">No approved payslips available yet</p>
          <p className="text-[11px] text-zinc-400 mt-1 max-w-sm mx-auto">
            Payslips will appear here once generated by your Store Branch Manager and given final authorization by the Owner.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {payslips.map(slip => (
            <div
              key={slip.id}
              className="p-4 rounded-xl border border-[#e5e7eb] hover:border-zinc-400 transition bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-extrabold text-[#111111]">
                    {slip.period_name || 'Pay Cycle'}
                  </span>
                  <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {slip.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span>{slip.total_shifts} Shifts Worked</span>
                  <span>•</span>
                  <span>{slip.payable_hours} Payable Hours</span>
                  <span>•</span>
                  <span>{slip.branch_name}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-mono text-zinc-400 block">Take-Home Pay</span>
                  <span className="font-mono text-sm font-black text-[#111111]">
                    ₱{slip.final_amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedPayslip(slip)}
                  className="px-3 py-1.5 rounded-lg bg-[#111111] text-white text-xs font-bold hover:bg-zinc-800 transition flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Individual Payslip Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fadeIn">
          <div className="printable-payslip bg-white rounded-2xl border border-[#e5e7eb] shadow-2xl w-full max-w-2xl overflow-hidden max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-[#e5e7eb] bg-[#fafafa]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 text-[10px] font-extrabold font-mono uppercase bg-[#111111] text-[#CDEBC5] rounded">
                      TAGPUAN FOOD HUB
                    </span>
                    <span className="text-[10px] font-bold text-zinc-500 font-mono uppercase tracking-wider">
                      EMPLOYEE PAYSLIP (CONFIDENTIAL)
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold text-[#111111]">
                    {selectedPayslip.employee_name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                    <span><strong>Branch:</strong> {selectedPayslip.branch_name}</span>
                    <span>•</span>
                    <span><strong>Period:</strong> {selectedPayslip.period_name || 'Active Cycle'}</span>
                    <span>•</span>
                    <span><strong>Position:</strong> {selectedPayslip.employee_role}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPayslip(null)}
                  className="no-print p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Shift Attendance Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[11px] font-bold text-[#111111] uppercase tracking-wider font-mono">
                    Shift Attendance Record ({selectedPayslip.breakdown_items?.length || 0} shifts)
                  </h4>
                  <span className="text-[11px] text-zinc-500">
                    Gross: <strong>{selectedPayslip.gross_hours}h</strong> | Break Deduct: <strong>-{selectedPayslip.deducted_break_hours}h</strong> | Payable: <strong className="text-emerald-700">{selectedPayslip.payable_hours}h</strong>
                  </span>
                </div>
                <div className="border border-[#e5e7eb] rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-[#f8fafc] text-zinc-500 font-mono text-[10px] uppercase border-b border-[#e5e7eb]">
                      <tr>
                        <th className="p-2.5 font-bold">Date</th>
                        <th className="p-2.5 font-bold">Clock In</th>
                        <th className="p-2.5 font-bold">Clock Out</th>
                        <th className="p-2.5 font-bold text-center">Gross</th>
                        <th className="p-2.5 font-bold text-center">Break (-1h)</th>
                        <th className="p-2.5 font-bold text-center">Payable</th>
                        <th className="p-2.5 font-bold text-right">Shift Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f5f9]">
                      {selectedPayslip.breakdown_items && selectedPayslip.breakdown_items.length > 0 ? (
                        selectedPayslip.breakdown_items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-[#f8fafc]">
                            <td className="p-2.5 font-medium text-zinc-900">{item.date}</td>
                            <td className="p-2.5 font-mono text-zinc-600">
                              {new Date(item.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="p-2.5 font-mono text-zinc-600">
                              {new Date(item.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="p-2.5 font-mono text-center">{item.gross_hours}h</td>
                            <td className="p-2.5 font-mono text-center text-zinc-500">
                              {item.deducted_break_hours > 0 ? `-${item.deducted_break_hours}h` : '0h'}
                            </td>
                            <td className="p-2.5 font-mono text-center font-bold text-emerald-700">
                              {item.payable_hours}h
                            </td>
                            <td className="p-2.5 font-mono font-bold text-right text-[#111111]">
                              ₱{item.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-zinc-500 italic">
                            No shift logs recorded for this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Adjustments section */}
              {selectedPayslip.adjustments !== 0 && (
                <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#111111]">Allowances / Deductions / Adjustments:</span>
                    {selectedPayslip.adjustment_note && (
                      <p className="text-zinc-500 text-[11px] mt-0.5">{selectedPayslip.adjustment_note}</p>
                    )}
                  </div>
                  <span className={`font-mono font-bold text-sm ${selectedPayslip.adjustments > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {selectedPayslip.adjustments > 0
                      ? `+₱${selectedPayslip.adjustments.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : `-₱${Math.abs(selectedPayslip.adjustments).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                </div>
              )}

              {/* Compensation Summary in Philippine Peso */}
              <div className="p-4 rounded-xl bg-[#111111] text-white space-y-2">
                <div className="flex justify-between text-zinc-300">
                  <span>Gross Basic Shift Earnings:</span>
                  <span className="font-mono font-bold">
                    ₱{selectedPayslip.gross_payable_amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-300">
                  <span>Incentives & Adjustments:</span>
                  <span className="font-mono font-bold">
                    {selectedPayslip.adjustments >= 0
                      ? `+₱${selectedPayslip.adjustments.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : `-₱${Math.abs(selectedPayslip.adjustments).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                </div>
                <div className="pt-2 border-t border-zinc-800 flex justify-between items-baseline text-[#CDEBC5]">
                  <span className="font-extrabold text-sm uppercase tracking-wide">Net Take-Home Pay (PHP):</span>
                  <span className="font-mono text-xl font-black">
                    ₱{selectedPayslip.final_amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Official Signatures Section */}
              <div className="pt-2 border-t border-dashed border-zinc-300">
                <div className="grid grid-cols-2 gap-4">
                  {/* Prepared By Signature Line */}
                  <div className="border border-zinc-200 rounded-xl p-3.5 bg-zinc-50 flex flex-col justify-between">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold mb-3">
                      Prepared By:
                    </p>
                    <div className="h-10 flex items-end justify-center border-b border-zinc-400 pb-1 mb-1.5">
                      <span className="font-serif italic text-zinc-800 text-xs">
                        {selectedPayslip.prepared_by_name || 'Store Branch Manager'}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-zinc-900 text-center">
                      {selectedPayslip.prepared_by_name || 'Store Branch Manager'}
                    </p>
                    <p className="text-[10px] text-zinc-500 text-center">Branch Manager / Operations Supervisor</p>
                    <p className="text-[9px] text-zinc-400 text-center font-mono mt-0.5">
                      Issued: {new Date(selectedPayslip.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Approved By Signature Line */}
                  <div className="border border-zinc-200 rounded-xl p-3.5 bg-zinc-50 flex flex-col justify-between">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold mb-3">
                      Approved By:
                    </p>
                    <div className="h-10 flex items-end justify-center border-b border-zinc-400 pb-1 mb-1.5">
                      <span className="font-serif italic text-zinc-800 text-xs">
                        {selectedPayslip.approved_by_name || (selectedPayslip.status === 'APPROVED' ? 'Tagpuan Management' : 'Pending Owner Approval')}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-zinc-900 text-center">
                      {selectedPayslip.approved_by_name || (selectedPayslip.status === 'APPROVED' ? 'Tagpuan Food Hub Management' : 'Tagpuan Owner / Management')}
                    </p>
                    <p className="text-[10px] text-zinc-500 text-center">Owner / Executive Approver</p>
                    <p className="text-[9px] text-zinc-400 text-center font-mono mt-0.5">
                      {selectedPayslip.approved_at
                        ? `Approved: ${new Date(selectedPayslip.approved_at).toLocaleDateString()}`
                        : (selectedPayslip.status === 'APPROVED' ? 'Approved & Authorized' : 'Pending Authorization')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="no-print p-4 border-t border-[#e5e7eb] flex items-center justify-between bg-[#fafafa]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-zinc-300 text-zinc-800 text-xs font-bold hover:bg-zinc-50 shadow-sm transition"
                >
                  <Printer className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Print Payslip</span>
                </button>

                <button
                  onClick={() => handleExportText(selectedPayslip)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-zinc-300 text-zinc-800 text-xs font-bold hover:bg-zinc-50 shadow-sm transition"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Download Text Slip</span>
                </button>
              </div>

              <button
                onClick={() => setSelectedPayslip(null)}
                className="px-5 py-2 rounded-xl bg-[#111111] text-white text-xs font-bold hover:bg-zinc-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
