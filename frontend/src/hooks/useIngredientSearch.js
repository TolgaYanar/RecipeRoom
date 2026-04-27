import { useEffect, useState } from 'react';
import { searchIngredients } from '../api/ingredients';

// Shared debounced LIKE search against /api/ingredients/search.
// Used by IngredientRow's name autocomplete and the substitute picker
// inside SubstitutionManager — both want the same behavior so it lives
// in one place. Caller keys the dropdown chrome to its own context.
export default function useIngredientSearch(term, { excludeNames = [] } = {}) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!term) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      searchIngredients(term)
        .then((data) => {
          if (cancelled) return;
          const arr = Array.isArray(data) ? data : (data?.items ?? []);
          const block = new Set(excludeNames.filter(Boolean).map((n) => n.toLowerCase()));
          setResults(arr.filter((r) => !block.has((r.name || '').toLowerCase())));
        })
        .catch(() => { if (!cancelled) setResults([]); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 200);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [term, excludeNames]);

  return { results: term ? results : [], loading };
}
