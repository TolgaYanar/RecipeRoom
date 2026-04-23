import RecipeCard from './RecipeCard';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';

export default function RecipeGrid({ recipes, loading, emptyMessage = 'No recipes found.' }) {
  if (loading) return <LoadingSpinner size="lg" />;
  if (!recipes?.length) return <EmptyState message={emptyMessage} icon="🍽️" />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.recipe_id} recipe={recipe} />
      ))}
    </div>
  );
}
