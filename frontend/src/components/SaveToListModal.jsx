import { useEffect, useState } from 'react';
import { X, ListOrdered, Plus, Check } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import { useToast } from '../context/ToastContext';
import {
  getMealLists, createMealList, addToMealList, removeFromMealList,
} from '../api/users';

// Picker shown from RecipeDetail. Fetches the user's meal lists with a
// `contains_recipe` flag for the current recipe so checkboxes render
// preset, then fires add/remove on toggle.
export default function SaveToListModal({ userId, recipeId, onClose }) {
  const toast = useToast();
  const [lists, setLists] = useState(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [pending, setPending] = useState(new Set());

  const reload = () => {
    getMealLists(userId, recipeId)
      .then(setLists)
      .catch(() => setLists([]));
  };

  useEffect(() => { reload(); }, [userId, recipeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (listName, currentlyIn) => {
    setPending((p) => new Set(p).add(listName));
    try {
      if (currentlyIn) {
        await removeFromMealList(userId, listName, recipeId);
      } else {
        await addToMealList(userId, listName, { recipe_id: recipeId });
      }
      reload();
    } catch {
      // already toasted by the interceptor
    } finally {
      setPending((p) => {
        const next = new Set(p);
        next.delete(listName);
        return next;
      });
    }
  };

  const create = async () => {
    if (!name.trim()) return;
    try {
      await createMealList(userId, { name: name.trim() });
      // Add the recipe to the freshly-created list right away so the click
      // doesn't feel like a two-step ceremony.
      await addToMealList(userId, name.trim(), { recipe_id: recipeId });
      toast.success(`Saved to ${name.trim()}`);
      setName('');
      setCreating(false);
      reload();
    } catch {
      // already toasted by the interceptor
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-[420px] p-5 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-[#1B3A2D]" strokeWidth={1.5} />
            <h2 className="text-[16px] font-bold text-[#1A1A1A]">Save to list</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[#F5F5F5]"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-[#6B6B6B]" strokeWidth={1.5} />
          </button>
        </header>

        <div className="flex-1 overflow-auto -mx-1 px-1">
          {lists === null ? (
            <LoadingSpinner size="sm" />
          ) : lists.length === 0 ? (
            <p className="text-[13px] text-[#6B6B6B] py-2">
              No meal lists yet — create one below.
            </p>
          ) : (
            <ul className="space-y-1">
              {lists.map((l) => {
                const inList = !!l.contains_recipe;
                const busy = pending.has(l.list_name);
                return (
                  <li key={l.list_name}>
                    <button
                      type="button"
                      onClick={() => !busy && toggle(l.list_name, inList)}
                      disabled={busy}
                      className={
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-[14px] transition-colors ' +
                        (inList ? 'bg-[#F5F8F6]' : 'hover:bg-[#FAF8F5]')
                      }
                    >
                      <span
                        className={
                          'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ' +
                          (inList ? 'border-[#1B3A2D] bg-[#1B3A2D]' : 'border-[#D0D0D0]')
                        }
                      >
                        {inList && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </span>
                      <span className="flex-1 min-w-0 truncate text-[#1A1A1A]">{l.list_name}</span>
                      <span className="text-[11px] text-[#9E9E9E] shrink-0">
                        {l.recipe_count} recipe{Number(l.recipe_count) === 1 ? '' : 's'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-[#EBEBEB] mt-4 pt-4">
          {creating ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="New list name"
                className="flex-1 px-3 py-2 text-[14px] border border-[#D0D0D0] rounded-lg focus:outline-none focus:border-[#1B3A2D]"
                onKeyDown={(e) => e.key === 'Enter' && create()}
              />
              <button
                type="button"
                onClick={create}
                disabled={!name.trim()}
                className="px-3 py-2 bg-[#1B3A2D] text-white rounded-lg text-[13px] font-semibold disabled:opacity-50 hover:bg-[#142B22]"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => { setCreating(false); setName(''); }}
                className="px-3 py-2 bg-white border border-[#D0D0D0] rounded-lg text-[13px] font-semibold text-[#1A1A1A] hover:border-[#1B3A2D]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold text-[#1B3A2D] hover:underline"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              Create new list
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
