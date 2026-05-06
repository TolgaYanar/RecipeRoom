import { useState } from 'react';
import { X, Wallet } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { topUpBalance } from '../api/users';

const PRESETS = [25, 50, 100, 250];

export default function TopUpModal({ userId, currentBalance = 0, onClose, onUpdated }) {
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (value) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error('Enter a positive amount');
      return;
    }
    setSubmitting(true);
    try {
      const r = await topUpBalance(userId, n);
      toast.success(`+$${n.toFixed(2)} added`);
      onUpdated(Number(r.balance));
    } catch {
      // already toasted by the interceptor
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-[420px] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#1B3A2D]" strokeWidth={1.5} />
            <h2 className="text-[16px] font-bold text-[#1A1A1A]">Add Balance</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[#F5F5F5]"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-[#6B6B6B]" strokeWidth={1.5} />
          </button>
        </header>

        <div className="bg-[#FAF8F5] border border-[#EBEBEB] rounded-lg px-3 py-2 mb-4 flex items-center justify-between">
          <span className="text-[13px] text-[#6B6B6B]">Current balance</span>
          <span className="text-[15px] font-bold text-[#1A1A1A]">${Number(currentBalance).toFixed(2)}</span>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-3">
          {PRESETS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => submit(v)}
              disabled={submitting}
              className="py-2 bg-white border border-[#D0D0D0] rounded-lg text-[13px] font-semibold text-[#1A1A1A] hover:border-[#1B3A2D] disabled:opacity-50"
            >
              +${v}
            </button>
          ))}
        </div>

        <label className="block text-[12px] font-semibold text-[#1A1A1A] mb-1.5">Or custom amount</label>
        <div className="flex items-center gap-2">
          <span className="text-[14px] text-[#6B6B6B]">$</span>
          <input
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="flex-1 px-3 py-2 text-[14px] border border-[#D0D0D0] rounded-lg focus:outline-none focus:border-[#1B3A2D]"
          />
          <button
            type="button"
            onClick={() => submit(amount)}
            disabled={submitting || !amount}
            className="px-4 py-2 bg-[#1B3A2D] text-white rounded-lg text-[13px] font-semibold disabled:opacity-50 hover:bg-[#142B22]"
          >
            {submitting ? '…' : 'Add'}
          </button>
        </div>

        <p className="text-[11px] text-[#9E9E9E] mt-3">
          Demo wallet — no real card is charged.
        </p>
      </div>
    </div>
  );
}
