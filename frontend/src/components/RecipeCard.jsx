import { Link } from 'react-router-dom';
import { LuClock, LuChefHat } from 'react-icons/lu';
import StarRating from './StarRating';

export default function RecipeCard({ recipe }) {
  const {
    recipe_id,
    title,
    publisher_name,
    thumbnail_url,
    avg_rating = 0,
    review_count = 0,
    cooking_time,
    difficulty,
    is_verified_chef,
  } = recipe;

  return (
    <Link
      to={`/recipes/${recipe_id}`}
      className="group bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col"
    >
      {/* Thumbnail */}
      <div className="relative h-44 bg-gray-100 overflow-hidden">
        {thumbnail_url ? (
          <img
            src={thumbnail_url}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-5xl">
            🍽️
          </div>
        )}
        {difficulty && (
          <span className={`absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
            difficulty === 'easy'   ? 'bg-green-100 text-green-700' :
            difficulty === 'medium' ? 'bg-amber-100 text-amber-700' :
                                      'bg-red-100 text-red-700'
          }`}>
            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 group-hover:text-amber-700 transition-colors">
          {title}
        </h3>

        <div className="flex items-center gap-1 text-xs text-gray-500">
          <LuChefHat className="shrink-0" />
          <span className="truncate">
            {publisher_name}
            {is_verified_chef && <span className="ml-1 text-amber-500">✓</span>}
          </span>
        </div>

        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
          <div className="flex items-center gap-1">
            <StarRating value={Math.round(avg_rating)} size="sm" />
            <span className="text-xs text-gray-400">({review_count})</span>
          </div>
          {cooking_time > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <LuClock className="shrink-0" />
              <span>{cooking_time} min</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
