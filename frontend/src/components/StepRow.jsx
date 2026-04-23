import { X } from 'lucide-react';

export default function StepRow({ step, index, onChange, onRemove }) {
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 w-8 h-8 rounded-full bg-[#1B3A2D] text-white flex items-center justify-center text-[13px] font-bold mt-1.5">
        {index + 1}
      </div>
      <textarea
        value={step ?? ''}
        onChange={(e) => onChange(index, e.target.value)}
        placeholder={`Describe step ${index + 1}…`}
        rows={3}
        className="flex-1 px-3 py-2 text-[14px] text-[#1A1A1A] leading-relaxed border border-[#D0D0D0] rounded-lg placeholder-[#9E9E9E] focus:outline-none focus:border-[#1B3A2D] transition-colors resize-none"
      />
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-[#9E9E9E] hover:text-[#B71C1C] hover:bg-[#FFEBEE] transition-all mt-1.5"
      >
        <X className="w-4 h-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
