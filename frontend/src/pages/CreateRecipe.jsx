import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Clock, ChefHat, Users, Plus } from 'lucide-react';
import {
  CUISINE_OPTIONS,
  CATEGORY_OPTIONS,
  DIET_OPTIONS,
  DIFFICULTY_OPTIONS,
} from '../constants/tags';
import { createRecipe } from '../api/recipes';
import { useToast } from '../context/ToastContext';
import IngredientRow from '../components/IngredientRow';
import StepRow from '../components/StepRow';
import ImageUrlInput from '../components/ImageUrlInput';

const blankIngredient = () => ({ quantity: '', unit: '', name: '' });

export default function CreateRecipe() {
  const navigate = useNavigate();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [category, setCategory] = useState('');
  const [diets, setDiets] = useState([]);
  const [difficulty, setDifficulty] = useState('');
  const [prepTime, setPrepTime] = useState(15);
  const [cookTime, setCookTime] = useState(30);
  const [servings, setServings] = useState(4);

  const [ingredients, setIngredients] = useState([blankIngredient()]);
  const [steps, setSteps] = useState(['']);

  const [submitting, setSubmitting] = useState(false);

  const toggleDiet = (value) =>
    setDiets((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );

  const updateIngredient = (i, next) =>
    setIngredients((prev) => prev.map((row, idx) => (idx === i ? next : row)));
  const addIngredient = () =>
    setIngredients((prev) => [...prev, blankIngredient()]);
  const removeIngredient = (i) =>
    setIngredients((prev) =>
      prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev
    );

  const updateStep = (i, value) =>
    setSteps((prev) => prev.map((s, idx) => (idx === i ? value : s)));
  const addStep = () => setSteps((prev) => [...prev, '']);
  const removeStep = (i) =>
    setSteps((prev) =>
      prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev
    );

  const firstError = () => {
    if (!title.trim())       return 'Recipe title is required';
    if (!description.trim()) return 'Description is required';
    if (!cuisine)            return 'Pick a cuisine';
    if (!category)           return 'Pick a category';
    if (!difficulty)         return 'Pick a difficulty';
    if (ingredients.every((i) => !i.name.trim())) return 'Add at least one ingredient';
    if (steps.every((s) => !s.trim()))            return 'Add at least one cooking step';
    return null;
  };

  const handlePublish = async () => {
    const err = firstError();
    if (err) {
      toast.error(err);
      return;
    }

    setSubmitting(true);
    try {
      const recipe = await createRecipe({
        title: title.trim(),
        description: description.trim(),
        image_url: imageUrl || null,
        cuisine,
        category,
        difficulty,
        prep_time: Number(prepTime) || 0,
        cook_time: Number(cookTime) || 0,
        servings: Number(servings) || 1,
        diets,
        ingredients: ingredients.filter((i) => i.name.trim()),
        steps: steps.map((s) => s.trim()).filter(Boolean),
      });

      toast.success('Recipe published');
      navigate(recipe?.id ? `/recipes/${recipe.id}` : '/profile');
    } catch {
      // already toasted by the interceptor
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        <PageHeading />

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <SectionHeader icon={<Star className="w-5 h-5 text-[#1B3A2D]" strokeWidth={1.5} />}>
                Basic Information
              </SectionHeader>

              <Field label="Recipe Title" required>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Grandma's Famous Chocolate Chip Cookies"
                  className={INPUT_CLASS}
                />
              </Field>

              <Field label="Description" required>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us what makes this recipe special..."
                  rows={4}
                  className={`${INPUT_CLASS} resize-none`}
                />
              </Field>

              <Field label="Recipe Image URL">
                <ImageUrlInput value={imageUrl} onChange={setImageUrl} />
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Cuisine" required>
                  <select
                    value={cuisine}
                    onChange={(e) => setCuisine(e.target.value)}
                    className={INPUT_CLASS}
                  >
                    <option value="">Select cuisine</option>
                    {CUISINE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Category" required>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={INPUT_CLASS}
                  >
                    <option value="">Select category</option>
                    {CATEGORY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Dietary Tags">
                <div className="flex flex-wrap gap-2">
                  {DIET_OPTIONS.map((o) => {
                    const active = diets.includes(o.value);
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => toggleDiet(o.value)}
                        className={
                          'px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-colors ' +
                          (active
                            ? 'bg-[#1B3A2D] text-white border-[#1B3A2D]'
                            : 'bg-white text-[#1A1A1A] border-[#D0D0D0] hover:border-[#1B3A2D]')
                        }
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </Card>

            <Card>
              <SectionHeader
                action={
                  <AddButton onClick={addIngredient}>Add Ingredient</AddButton>
                }
              >
                Ingredients
              </SectionHeader>

              <div className="space-y-3">
                {ingredients.map((ing, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-6 pt-2.5 text-[14px] text-[#6B6B6B] text-right">
                      {i + 1}.
                    </span>
                    <div className="flex-1">
                      <IngredientRow
                        ingredient={ing}
                        index={i}
                        onChange={updateIngredient}
                        onRemove={removeIngredient}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <SectionHeader
                action={<AddButton onClick={addStep}>Add Step</AddButton>}
              >
                Cooking Instructions
              </SectionHeader>

              <div className="space-y-3">
                {steps.map((s, i) => (
                  <StepRow
                    key={i}
                    step={s}
                    index={i}
                    onChange={updateStep}
                    onRemove={removeStep}
                  />
                ))}
              </div>
            </Card>
          </div>

          <aside className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-[#EBEBEB] p-6 sticky top-24">
              <h2 className="text-[16px] font-bold text-[#1A1A1A] mb-5">Recipe Details</h2>

              <Field label="Difficulty" required>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="">Select difficulty</option>
                  {DIFFICULTY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>

              <Field
                label="Prep Time (minutes)"
                icon={<Clock className="w-4 h-4 text-[#6B6B6B]" strokeWidth={1.5} />}
              >
                <input
                  type="number"
                  min="0"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  className={INPUT_CLASS}
                />
              </Field>

              <Field
                label="Cook Time (minutes)"
                icon={<ChefHat className="w-4 h-4 text-[#6B6B6B]" strokeWidth={1.5} />}
              >
                <input
                  type="number"
                  min="0"
                  value={cookTime}
                  onChange={(e) => setCookTime(e.target.value)}
                  className={INPUT_CLASS}
                />
              </Field>

              <Field
                label="Servings"
                icon={<Users className="w-4 h-4 text-[#6B6B6B]" strokeWidth={1.5} />}
              >
                <input
                  type="number"
                  min="1"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  className={INPUT_CLASS}
                />
              </Field>

              <button
                type="button"
                onClick={handlePublish}
                disabled={submitting}
                className="w-full mt-2 py-3 bg-[#1B3A2D] text-white rounded-lg text-[14px] font-semibold hover:bg-[#142B22] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Publishing…' : 'Publish Recipe'}
              </button>

              <button
                type="button"
                onClick={() => navigate(-1)}
                disabled={submitting}
                className="w-full mt-2 py-3 bg-white text-[#1A1A1A] border border-[#D0D0D0] rounded-lg text-[14px] font-semibold hover:bg-[#FAF8F5] transition-colors"
              >
                Cancel
              </button>

              <ul className="mt-6 space-y-2 text-[13px] text-[#6B6B6B] list-disc list-outside pl-5">
                <li>Your recipe will be visible to all users</li>
                <li>You can edit it anytime from your profile</li>
                <li>Verified chefs earn royalties when users shop their recipes</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

const INPUT_CLASS =
  'w-full px-3 py-2.5 text-[14px] text-[#1A1A1A] border border-[#D0D0D0] rounded-lg placeholder-[#9E9E9E] focus:outline-none focus:border-[#1B3A2D] transition-colors bg-white';

function PageHeading() {
  return (
    <div className="flex items-center gap-4 mb-8">
      <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm border border-[#EBEBEB]">
        <ChefHat className="w-7 h-7 text-[#1B3A2D]" strokeWidth={1.5} />
      </div>
      <div>
        <h1 className="text-[28px] font-bold text-[#1A1A1A] leading-tight">
          Create New Recipe
        </h1>
        <p className="text-[14px] text-[#6B6B6B] mt-1">
          Share your culinary creation with the Recipe Room community
        </p>
      </div>
    </div>
  );
}

function Card({ children }) {
  return (
    <section className="bg-white rounded-2xl border border-[#EBEBEB] p-6">
      {children}
    </section>
  );
}

function SectionHeader({ icon, action, children }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-[16px] font-bold text-[#1A1A1A]">{children}</h2>
      </div>
      {action}
    </div>
  );
}

function Field({ label, required, icon, children }) {
  return (
    <div className="mb-4 last:mb-0">
      <label className="flex items-center gap-1.5 text-[13px] font-medium text-[#1A1A1A] mb-1.5">
        {icon}
        {label}
        {required && <span className="text-[#B71C1C]">*</span>}
      </label>
      {children}
    </div>
  );
}

function AddButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 bg-[#1B3A2D] text-white rounded-lg text-[13px] font-medium hover:bg-[#142B22] transition-colors"
    >
      <Plus className="w-4 h-4" strokeWidth={2} />
      {children}
    </button>
  );
}
