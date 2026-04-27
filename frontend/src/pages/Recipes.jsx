import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import RecipeGrid from '../components/RecipeGrid';
import FilterSidebar from '../components/FilterSidebar';
import Pagination from '../components/Pagination';
import { getRecipes } from '../api/recipes';

const PAGE_SIZE = 9;

export default function Recipes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [recipes, setRecipes] = useState(null);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  const q    = searchParams.get('q')    || '';
  const page = Number(searchParams.get('page')) || 1;

  const filters = {
    cookingTime: searchParams.get('cookingTime') || '',
    difficulty:  searchParams.get('difficulty')  || '',
    minRating:   searchParams.get('minRating')   || '',
    ingredient:  searchParams.get('ingredient')  || '',
    cuisine:     searchParams.get('cuisine')     || '',
    category:    searchParams.get('category')    || '',
    dietary:     (searchParams.get('dietary') || '').split(',').filter(Boolean),
  };

  // Hoist the dietary key so it can sit in a useEffect dep without tripping the linter
  const dietaryKey = filters.dietary.join(',');

  useEffect(() => {
    const params = {
      page,
      limit: PAGE_SIZE,
    };
    if (q)                  params.q          = q;
    if (filters.cookingTime) params.cookingTime = filters.cookingTime;
    if (filters.difficulty)  params.difficulty  = filters.difficulty;
    if (filters.minRating)   params.minRating   = filters.minRating;
    if (filters.ingredient)  params.ingredient  = filters.ingredient;
    if (filters.cuisine)     params.cuisine     = filters.cuisine;
    if (filters.category)    params.category    = filters.category;
    if (dietaryKey)          params.dietary     = dietaryKey;

    getRecipes(params)
      .then((data) => {
        if (Array.isArray(data)) {
          setRecipes(data);
          setMeta({ total: data.length, totalPages: 1 });
        } else {
          setRecipes(data?.items ?? []);
          setMeta({
            total:      data?.total ?? 0,
            totalPages: data?.totalPages ?? 1,
          });
        }
      })
      .catch(() => {
        setRecipes([]);
        setMeta({ total: 0, totalPages: 1 });
      });
  }, [
    q, page,
    filters.cookingTime, filters.difficulty, filters.minRating,
    filters.ingredient,  filters.cuisine,    filters.category,
    dietaryKey,
  ]);

  const setQuery = (next) => {
    const p = new URLSearchParams(searchParams);
    if (next) p.set('q', next); else p.delete('q');
    p.delete('page');
    setSearchParams(p, { replace: true });
  };

  const goToPage = (next) => {
    const p = new URLSearchParams(searchParams);
    if (next > 1) p.set('page', next); else p.delete('page');
    setSearchParams(p, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resultLabel = recipes === null
    ? 'Loading recipes…'
    : `${meta.total || recipes.length} recipe${(meta.total || recipes.length) === 1 ? '' : 's'} found`;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        <header className="mb-6">
          <h1 className="text-[32px] font-bold text-[#1A1A1A] leading-tight">
            Explore Recipes
          </h1>
          <p className="text-[14px] text-[#6B6B6B] mt-1.5">
            Find the perfect recipe for any occasion with our advanced filters
          </p>
        </header>

        <div className="relative mb-4">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9E9E]"
            strokeWidth={1.5}
          />
          <input
            type="text"
            value={q}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipes..."
            className="w-full pl-11 pr-4 py-3 text-[14px] text-[#1A1A1A] border border-[#D0D0D0] rounded-xl placeholder-[#9E9E9E] focus:outline-none focus:border-[#1B3A2D] transition-colors bg-white"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={
            'flex items-center gap-2 px-4 py-2 rounded-lg text-[14px] font-medium transition-colors mb-4 ' +
            (showFilters
              ? 'bg-[#1B3A2D] text-white border border-[#1B3A2D]'
              : 'bg-white text-[#1A1A1A] border border-[#D0D0D0] hover:border-[#1B3A2D]')
          }
        >
          <SlidersHorizontal className="w-4 h-4" strokeWidth={1.5} />
          Filters
        </button>

        {showFilters && (
          <div className="mb-6">
            <FilterSidebar filters={filters} onChange={() => {}} />
          </div>
        )}

        <p className="text-[14px] text-[#6B6B6B] mb-6">{resultLabel}</p>

        <RecipeGrid
          recipes={recipes ?? []}
          loading={recipes === null}
          emptyMessage="No recipes match your filters."
        />

        {meta.totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <Pagination
              page={Math.min(page, meta.totalPages)}
              totalPages={meta.totalPages}
              onChange={goToPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
