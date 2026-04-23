import { useState } from 'react';
import { ImageIcon } from 'lucide-react';

const PLACEHOLDER = 'https://placehold.co/600x400/FAF8F5/9E9E9E?text=Recipe+Photo';

export default function ImageUrlInput({ value, onChange }) {
  const [imgError, setImgError] = useState(false);

  const handleChange = (e) => {
    setImgError(false);
    onChange(e.target.value);
  };

  return (
    <div className="space-y-3">
      <input
        type="url"
        value={value}
        onChange={handleChange}
        placeholder="https://example.com/photo.jpg"
        className="w-full px-3 py-2.5 text-[14px] text-[#1A1A1A] border border-[#D0D0D0] rounded-lg placeholder-[#9E9E9E] focus:outline-none focus:border-[#1B3A2D] transition-colors"
      />
      {value && (
        <div className="rounded-xl overflow-hidden border border-[#EBEBEB] aspect-video bg-[#FAF8F5] flex items-center justify-center">
          {imgError ? (
            <div className="flex flex-col items-center gap-2 text-[#9E9E9E]">
              <ImageIcon className="w-8 h-8" strokeWidth={1.5} />
              <span className="text-[13px]">Could not load image</span>
            </div>
          ) : (
            <img
              src={value}
              alt="Recipe preview"
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          )}
        </div>
      )}
    </div>
  );
}
