import { useState } from 'react';

export default function StarRating({ value = 0, max = 5, onChange, size = 'md' }) {
  const [hover, setHover] = useState(null);
  const display = hover ?? value;
  const sizeClass = { sm: 'text-sm', md: 'text-xl', lg: 'text-2xl' }[size];
  const interactive = !!onChange;

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          className={`${sizeClass} transition ${i < display ? 'text-[#F5C518]' : 'text-gray-300'} ${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
          onClick={() => onChange?.(i + 1)}
          onMouseEnter={() => interactive && setHover(i + 1)}
          onMouseLeave={() => interactive && setHover(null)}
        >
          ★
        </button>
      ))}
    </div>
  );
}
