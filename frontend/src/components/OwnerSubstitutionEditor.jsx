import { useEffect, useRef, useState } from 'react';
import SubstitutionManager from './SubstitutionManager';
import LoadingSpinner from './LoadingSpinner';
import {
  getRecipeSubstitutions,
  addRecipeSubstitution,
  deleteRecipeSubstitution,
} from '../api/recipes';

// live wrapper for SubstitutionManager — used on RecipeDetail when the
// logged-in user owns the recipe. each add/remove writes straight to
// /recipes/:id/substitutions
export default function OwnerSubstitutionEditor({ recipeId, ingredients }) {
  // null while loading; [] once a fetch resolves
  const [value, setValue]   = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  // ruleKey -> server-side row id, needed for DELETE
  const idMap = useRef(new Map());

  useEffect(() => {
    let cancelled = false;
    getRecipeSubstitutions(recipeId)
      .then((data) => {
        if (cancelled) return;
        const arr = Array.isArray(data) ? data : (data?.items ?? []);
        const next = arr.map(normalize);
        const map = new Map();
        next.forEach((rule, i) => {
          map.set(ruleKey(rule), arr[i]?.id ?? arr[i]?.sub_id ?? null);
        });
        idMap.current = map;
        setValue(next);
      })
      .catch(() => { if (!cancelled) setValue([]); });
    return () => { cancelled = true; };
  }, [recipeId, reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);
  const loading = value === null;

  const apply = async (next) => {
    const current = value ?? [];
    const before = new Map(current.map((r) => [ruleKey(r), r]));
    const after  = new Map(next   .map((r) => [ruleKey(r), r]));

    const added   = [...after .entries()].filter(([k]) => !before.has(k)).map(([, r]) => r);
    const removed = [...before.entries()].filter(([k]) => !after .has(k));

    setValue(next);

    try {
      for (const rule of added) {
        const created = await addRecipeSubstitution(recipeId, {
          source_ingredient_id: rule.source_ingredient_id,
          sub_ingredient_id:    rule.sub_ingredient_id,
        });
        idMap.current.set(ruleKey(rule), created?.id ?? null);
      }
      for (const [k] of removed) {
        const subId = idMap.current.get(k);
        if (subId != null) await deleteRecipeSubstitution(recipeId, subId);
        idMap.current.delete(k);
      }
    } catch {
      // interceptor toasts; resync from server so UI reflects truth
      reload();
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#EBEBEB] p-6">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#EBEBEB] p-6">
      <h2 className="text-[16px] font-bold text-[#1A1A1A] mb-1">Allowed Substitutions</h2>
      <p className="text-[13px] text-[#6B6B6B] mb-4">
        Whitelist swaps shoppers can pick when buying ingredients for this recipe.
      </p>
      <SubstitutionManager
        ingredients={ingredients}
        value={value}
        onChange={apply}
      />
    </div>
  );
}

function normalize(r) {
  return {
    source_ingredient_id:   r.source_ingredient_id   ?? null,
    source_ingredient_name: r.source_ingredient_name ?? r.source_name ?? '',
    sub_ingredient_id:      r.sub_ingredient_id      ?? null,
    sub_ingredient_name:    r.sub_ingredient_name    ?? r.sub_name    ?? '',
  };
}

function ruleKey(r) {
  const src = r.source_ingredient_id ?? `n:${(r.source_ingredient_name || '').toLowerCase()}`;
  const sub = r.sub_ingredient_id    ?? `n:${(r.sub_ingredient_name    || '').toLowerCase()}`;
  return `${src}::${sub}`;
}
