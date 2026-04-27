import { useState } from 'react';
import { Plus, X, Search } from 'lucide-react';
import useIngredientSearch from '../hooks/useIngredientSearch';

// controlled — parent owns the rules list and decides how to persist.
// CreateRecipe bundles them into the recipe POST; the owner-view wrapper
// on RecipeDetail writes them straight to /recipes/:id/substitutions.
export default function SubstitutionManager({ ingredients = [], value = [], onChange }) {
  const named = ingredients.filter((i) => i?.name?.trim());

  if (named.length === 0) {
    return (
      <div className="text-[13px] text-[#6B6B6B] py-5 text-center border border-dashed border-[#D0D0D0] rounded-lg">
        Add ingredients first, then come back here to whitelist allowed substitutes.
      </div>
    );
  }

  const rulesFor = (ing) =>
    value.filter((r) => sameIngredient(r, 'source', ing));

  const addRule = (source, picked) => {
    onChange([
      ...value,
      {
        source_ingredient_id:   source.id ?? source.ingredient_id ?? null,
        source_ingredient_name: source.name,
        sub_ingredient_id:      picked.ingredient_id ?? picked.id ?? null,
        sub_ingredient_name:    picked.name,
      },
    ]);
  };

  const removeRule = (rule) => {
    onChange(value.filter((r) => r !== rule));
  };

  return (
    <div className="space-y-2.5">
      {named.map((ing, i) => (
        <SubstitutionRow
          key={ing.id ?? ing.ingredient_id ?? `${ing.name}-${i}`}
          source={ing}
          rules={rulesFor(ing)}
          onAdd={(picked) => addRule(ing, picked)}
          onRemove={removeRule}
        />
      ))}
    </div>
  );
}

function SubstitutionRow({ source, rules, onAdd, onRemove }) {
  const [picking, setPicking] = useState(false);

  // hide the source ingredient and already-picked subs from the picker —
  // the schema trigger blocks the same rule server-side anyway
  const exclude = [source.name, ...rules.map((r) => r.sub_ingredient_name)];

  return (
    <div className="border border-[#EBEBEB] rounded-lg p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[14px] font-semibold text-[#1A1A1A]">{source.name}</span>
        {!picking && (
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium text-[#1B3A2D] border border-[#D0D0D0] rounded-md hover:border-[#1B3A2D] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            Add Substitute
          </button>
        )}
      </div>

      {rules.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {rules.map((rule, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-[#F5F8F6] border border-[#D0D0D0] rounded-full text-[12px] text-[#1A1A1A]"
            >
              {rule.sub_ingredient_name}
              <button
                type="button"
                onClick={() => onRemove(rule)}
                className="text-[#9E9E9E] hover:text-[#B71C1C] transition-colors"
                aria-label={`Remove ${rule.sub_ingredient_name}`}
              >
                <X className="w-3 h-3" strokeWidth={1.5} />
              </button>
            </span>
          ))}
        </div>
      )}

      {picking && (
        <SubstitutePicker
          excludeNames={exclude}
          onPick={(picked) => { onAdd(picked); setPicking(false); }}
          onCancel={() => setPicking(false)}
        />
      )}
    </div>
  );
}

function SubstitutePicker({ excludeNames, onPick, onCancel }) {
  const [q, setQ] = useState('');
  const term = q.trim();
  const { results, loading } = useIngredientSearch(term, { excludeNames });

  return (
    <div className="border border-[#EBEBEB] rounded-lg p-2 bg-[#FAFAFA]">
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9E9E9E]" strokeWidth={1.5} />
        <input
          autoFocus
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search ingredients..."
          className="w-full pl-8 pr-3 py-1.5 text-[13px] border border-[#D0D0D0] rounded-md focus:outline-none focus:border-[#1B3A2D] bg-white"
        />
      </div>

      {loading ? (
        <div className="text-[12px] text-[#6B6B6B] px-2 py-1">Searching…</div>
      ) : results.length > 0 ? (
        <ul className="max-h-[160px] overflow-auto">
          {results.map((r) => (
            <li key={r.ingredient_id ?? r.id ?? r.name}>
              <button
                type="button"
                onClick={() => onPick(r)}
                className="w-full text-left px-2 py-1.5 text-[13px] text-[#1A1A1A] hover:bg-white rounded-md"
              >
                {r.name}
              </button>
            </li>
          ))}
        </ul>
      ) : term ? (
        <div className="text-[12px] text-[#6B6B6B] px-2 py-1">No matches.</div>
      ) : null}

      <div className="flex justify-end mt-1">
        <button
          type="button"
          onClick={onCancel}
          className="text-[12px] text-[#6B6B6B] hover:text-[#1A1A1A] px-2 py-1"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Match a rule's source against an ingredient — prefer ID, fall back to name.
function sameIngredient(rule, side, ing) {
  const rid   = rule[`${side}_ingredient_id`];
  const rname = rule[`${side}_ingredient_name`];
  const iid   = ing.id ?? ing.ingredient_id;
  if (rid != null && iid != null) return rid === iid;
  return (rname || '').toLowerCase() === (ing.name || '').toLowerCase();
}
