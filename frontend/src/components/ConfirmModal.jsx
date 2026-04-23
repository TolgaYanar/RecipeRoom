import { useEffect } from 'react';

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  danger = false
}) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onCancel}
    >
      <div
        className="bg-white max-w-sm w-full mx-4 rounded-xl p-6"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.10)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[18px] font-semibold text-[#1A1A1A] mb-2">{title}</h3>
        {message && (
          <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-6">{message}</p>
        )}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-[14px] font-semibold text-[#1A1A1A] border border-[#EBEBEB] rounded-lg hover:bg-[#FAF8F5] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-[14px] font-semibold text-white rounded-lg transition-all hover:opacity-90"
            style={{ backgroundColor: danger ? '#B71C1C' : '#1B3A2D' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
