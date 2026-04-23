import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Star, Bookmark, ShoppingCart } from 'lucide-react';

const DIFFICULTY_STYLE = {
  easy:   'bg-[rgba(45,106,79,0.85)]',
  medium: 'bg-[rgba(193,125,0,0.85)]',
  hard:   'bg-[rgba(183,28,28,0.85)]',
};

export default function RecipeCard({ recipe }) {
  const {
    recipe_id,
    title,
    publisher_name,
    is_verified_chef,
    thumbnail_url,
    avg_rating,
    review_count = 0,
    cooking_time,
    difficulty,
    cuisine,
  } = recipe;

  const [saved, setSaved] = useState(false);
  const diffKey = difficulty?.toLowerCase();

  return (
    <Link
      to={`/recipes/${recipe_id}`}
      className="group block bg-white border border-[#EBEBEB] rounded-xl overflow-hidden hover:-translate-y-[3px] hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)] transition-all duration-200"
    >
      {/* Image — 4:3 ratio */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[#FAF8F5]">
        {thumbnail_url ? (
          <img
            src={thumbnail_url}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#9E9E9E]">
            <ShoppingCart className="w-10 h-10" strokeWidth={1} />
          </div>
        )}

        {/* Top-right: cuisine + difficulty badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          {cuisine && (
            <span className="bg-[rgba(0,0,0,0.55)] text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
              {cuisine}
            </span>
          )}
          {diffKey && DIFFICULTY_STYLE[diffKey] && (
            <span className={`${DIFFICULTY_STYLE[diffKey]} text-white text-[11px] font-semibold px-2.5 py-1 rounded-full`}>
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </span>
          )}
        </div>

        {/* Top-left: bookmark */}
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); setSaved(v => !v); }}
          className="absolute top-3 left-3 w-[30px] h-[30px] rounded-full bg-[rgba(0,0,0,0.35)] hover:bg-[rgba(0,0,0,0.55)] flex items-center justify-center transition-all"
        >
          <Bookmark
            className="w-4 h-4 transition-all"
            style={{ color: saved ? '#F5C518' : '#fff', fill: saved ? '#F5C518' : 'none' }}
            strokeWidth={1.5}
          />
        </button>
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="text-[16px] font-semibold text-[#1A1A1A] leading-[1.4] line-clamp-2 mb-1.5">
          {title}
        </h3>

        <p className="text-[13px] font-medium text-[#6B6B6B] mb-2.5">
          by <span className="text-[#4A4A4A]">
            {publisher_name}
            {is_verified_chef && <span className="ml-1 text-[#F5C518]">✓</span>}
          </span>
        </p>

        <div className="flex items-center gap-4 mb-3">
          {cooking_time > 0 && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-[14px] h-[14px] text-[#9E9E9E]" strokeWidth={1.5} />
              <span className="text-[13px] text-[#6B6B6B]">{cooking_time} min</span>
            </div>
          )}
          {avg_rating > 0 && (
            <div className="flex items-center gap-1.5">
              <Star className="w-[14px] h-[14px] text-[#F5C518]" style={{ fill: '#F5C518' }} strokeWidth={1.5} />
              <span className="text-[13px] font-semibold text-[#1A1A1A]">{Number(avg_rating).toFixed(1)}</span>
              <span className="text-[13px] text-[#9E9E9E]">({review_count})</span>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-[#EBEBEB] flex items-center justify-between">
          <span className="text-[13px] font-semibold text-[#1B3A2D] group-hover:underline transition-all">
            Shop This Meal
          </span>
          <ShoppingCart className="w-4 h-4 text-[#1B3A2D]" strokeWidth={1.5} />
        </div>
      </div>
    </Link>
  );
}
