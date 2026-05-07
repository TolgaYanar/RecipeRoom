import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Clock, ChefHat, Users, MapPin, Heart,
  MessageCircle, Bookmark, GitBranch, Star, ShoppingCart,
  Minus, Plus, BadgeCheck, Trash2,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import OwnerSubstitutionEditor from '../components/OwnerSubstitutionEditor';
import StarRating from '../components/StarRating';
import SubstitutionPicker from '../components/SubstitutionPicker';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext';
import { addRecipeToCart } from '../lib/cart';
import { useToast } from '../context/ToastContext';
import {
  getRecipe, getRecipeMedia, deleteRecipe,
  getRecipeLikeState, toggleRecipeLike,
  getRecipeSaveState, toggleRecipeSave,
} from '../api/recipes';
import { getReviews, createReview, getReviewLikes, toggleReviewLike } from '../api/reviews';
import { getFollowState, toggleFollow } from '../api/users';
import { addCookLog } from '../api/cookLog';

const DIFFICULTY_PILL = {
  easy:   'bg-[rgba(45,106,79,0.85)] text-white',
  medium: 'bg-[#F5C518] text-[#1A1A1A]',
  hard:   'bg-[rgba(183,28,28,0.85)] text-white',
};

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, openAuth } = useAuth();
  const toast = useToast();

  const [recipe,    setRecipe]    = useState(null);
  const [media,     setMedia]     = useState([]);
  const [reviews,   setReviews]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [notFound,  setNotFound]  = useState(false);

  const [servings, setServings] = useState(4);
  const [comment,  setComment]  = useState('');
  const [rating,   setRating]   = useState(5);
  const [posting,  setPosting]  = useState(false);
  const [shopOpen, setShopOpen]     = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const [liked,      setLiked]      = useState(false);
  const [likeCount,  setLikeCount]  = useState(0);
  const [saved,      setSaved]      = useState(false);
  const [following,  setFollowing]  = useState(false);

  useEffect(() => {
    getRecipe(id)
      .then((r) => {
        setRecipe(r);
        if (r?.servings) setServings(r.servings);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    Promise.all([
      getReviews(id).catch(() => []),
      getReviewLikes(id).catch(() => []),
    ]).then(([list, likes]) => setReviews(mergeLikes(list, likes)));
    getRecipeMedia(id)
      .then((data) => setMedia(Array.isArray(data) ? data : (data?.items ?? [])))
      .catch(() => setMedia([]));
  }, [id]);

  // per-user state — only meaningful when logged in
  useEffect(() => {
    if (!user) { setLiked(false); setLikeCount(0); setSaved(false); setFollowing(false); return; }
    let cancelled = false;
    getRecipeLikeState(id)
      .then((d) => { if (!cancelled) { setLiked(!!d.liked); setLikeCount(d.like_count ?? 0); } })
      .catch(() => {});
    getRecipeSaveState(id)
      .then((d) => { if (!cancelled) setSaved(!!d.saved); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [id, user]);

  // follow state depends on the recipe's author id, which arrives with the recipe
  useEffect(() => {
    if (!user || !recipe) return;
    const ownerId = recipe.publisher_id ?? recipe.user_id ?? recipe.author_id;
    if (!ownerId || Number(ownerId) === Number(user.user_id)) return;
    let cancelled = false;
    getFollowState(ownerId)
      .then((d) => { if (!cancelled) setFollowing(!!d.following); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [recipe, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (notFound || !recipe) {
    return (
      <div className="max-w-[1000px] mx-auto px-6 py-16 text-center">
        <h1 className="text-[24px] font-bold text-[#1A1A1A]">Recipe not found</h1>
        <Link to="/recipes" className="mt-4 inline-block text-[#1B3A2D] hover:underline">
          Back to recipes
        </Link>
      </div>
    );
  }

  const ingredients   = recipe.ingredients   ?? [];
  const steps         = recipe.steps         ?? [];
  const substitutions = recipe.substitutions ?? [];

  const ownerId = recipe.publisher_id ?? recipe.user_id ?? recipe.author_id;
  const isOwner = user && ownerId != null && Number(user.user_id) === Number(ownerId);
  const isAdmin = user?.user_type === 'Administrator';
  const canDelete = isOwner || isAdmin;

  const handleCookedThis = async () => {
    if (!user) { openAuth(); return; }
    try {
      await addCookLog(user.user_id, { recipe_id: Number(id) });
      toast.success('Logged to your cook log');
    } catch {
      // already toasted by the interceptor
    }
  };

  const handleDeleteRecipe = async () => {
    try {
      await deleteRecipe(Number(id));
      toast.success('Recipe deleted');
      navigate('/recipes');
    } catch {
      // already toasted by the interceptor
      setConfirmDel(false);
    }
  };

  const handleLikeRecipe = async () => {
    if (!user) { openAuth(); return; }
    setLiked((v) => !v);
    setLikeCount((n) => n + (liked ? -1 : 1));
    try {
      const r = await toggleRecipeLike(Number(id));
      setLiked(!!r.liked);
      setLikeCount(r.like_count ?? 0);
    } catch {
      setLiked((v) => !v);
      setLikeCount((n) => n + (liked ? 1 : -1));
    }
  };

  const handleSaveRecipe = async () => {
    if (!user) { openAuth(); return; }
    setSaved((v) => !v);
    try {
      const r = await toggleRecipeSave(Number(id));
      setSaved(!!r.saved);
    } catch {
      setSaved((v) => !v);
    }
  };

  const handleFollow = async () => {
    if (!user) { openAuth(); return; }
    const ownerId = recipe?.publisher_id ?? recipe?.user_id ?? recipe?.author_id;
    if (!ownerId) return;
    setFollowing((v) => !v);
    try {
      const r = await toggleFollow(ownerId);
      setFollowing(!!r.following);
    } catch {
      setFollowing((v) => !v);
    }
  };

  const handleAddToCart = () => {
    if (!user) { openAuth(); return; }
    setShopOpen(true);
  };

  const handleConfirmShop = (pickedItems) => {
    addRecipeToCart({
      recipe_id:     Number(id),
      title:         recipe.title,
      description:   recipe.description ?? '',
      image_url:     recipe.thumbnail_url ?? recipe.image_url ?? null,
      cuisine:       recipe.cuisine ?? null,
      difficulty:    recipe.difficulty ?? null,
      base_servings: recipe.servings ?? servings,
      servings,
      ingredients: pickedItems,
    });
    setShopOpen(false);
    toast.success('Added to cart');
  };

  const handleFork = () => {
    if (!user) { openAuth(); return; }
    navigate(`/create?fork=${id}`);
  };

  const handleCommentLike = async (target) => {
    if (!user) { openAuth(); return; }
    const key = reviewKey(target);
    // optimistic flip — interceptor toasts on error, we resync from the response
    setReviews((prev) => prev.map((c) => reviewKey(c) === key
      ? { ...c, liked_by_me: !c.liked_by_me, like_count: (c.like_count || 0) + (c.liked_by_me ? -1 : 1) }
      : c));
    try {
      const r = await toggleReviewLike({
        recipe_id:        Number(id),
        review_user_id:   target.user_id,
        review_timestamp: target.timestamp,
      });
      setReviews((prev) => prev.map((c) => reviewKey(c) === key
        ? { ...c, liked_by_me: r.liked, like_count: r.like_count }
        : c));
    } catch {
      // already toasted by the interceptor; revert
      setReviews((prev) => prev.map((c) => reviewKey(c) === key
        ? { ...c, liked_by_me: !c.liked_by_me, like_count: (c.like_count || 0) + (c.liked_by_me ? -1 : 1) }
        : c));
    }
  };

  const postComment = async () => {
    if (!comment.trim()) return;
    if (!user) { openAuth(); return; }
    setPosting(true);
    try {
      const text = comment.trim();
      const created = await createReview(Number(id), { score: rating, comment: text });
      setReviews((prev) => [normalizeReview(created, user, text), ...prev]);
      toast.success('Comment posted');
      setComment('');
      setRating(5);
    } catch {
      // already toasted by the interceptor
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1000px] mx-auto px-6 py-8">
        <Link
          to="/recipes"
          className="inline-flex items-center gap-2 text-[14px] text-[#6B6B6B] hover:text-[#1B3A2D] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          Back to recipes
        </Link>

        <MediaCarousel media={media} fallback={recipe.thumbnail_url} alt={recipe.title} />

        <h1 className="text-[36px] font-bold text-[#1A1A1A] leading-tight mb-2">
          {recipe.title}
        </h1>
        {recipe.description && (
          <p className="text-[15px] text-[#6B6B6B] leading-relaxed mb-5">
            {recipe.description}
          </p>
        )}

        <AuthorRow
          recipe={recipe}
          following={following}
          onFollow={handleFollow}
          showFollow={!!user && !isOwner}
        />

        <div className="flex items-center flex-wrap gap-2 mb-5">
          {recipe.cuisine  && <Tag>{recipe.cuisine}</Tag>}
          {recipe.category && <Tag>{prettyCategory(recipe.category)}</Tag>}
          {recipe.difficulty && (
            <span className={`${DIFFICULTY_PILL[(recipe.difficulty || '').toLowerCase()] || 'bg-[#F5F5F5] text-[#1A1A1A]'} text-[12px] font-semibold px-3 py-1 rounded-full`}>
              {capitalize(recipe.difficulty)}
            </span>
          )}
          {recipe.avg_rating != null && (
            <span className="bg-[#FFF7DC] text-[#1A1A1A] text-[12px] font-semibold px-3 py-1 rounded-full inline-flex items-center gap-1">
              <Star className="w-3 h-3" fill="#F5C518" strokeWidth={0} />
              {Number(recipe.avg_rating).toFixed(1)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-8 flex-wrap mb-6">
          {recipe.cooking_time != null && (
            <Stat
              icon={<Clock className="w-4 h-4 text-[#6B6B6B]" strokeWidth={1.5} />}
              label="Total Time"
              value={`${recipe.cooking_time} min`}
            />
          )}
          {recipe.prep_time != null && (
            <Stat
              icon={<ChefHat className="w-4 h-4 text-[#6B6B6B]" strokeWidth={1.5} />}
              label="Prep Time"
              value={`${recipe.prep_time} min`}
            />
          )}
          <ServingsStepper value={servings} onChange={setServings} />
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3 pb-6 border-b border-[#EBEBEB] mb-8">
          <div className="flex items-center gap-1">
            <ActionChip
              onClick={handleLikeRecipe}
              active={liked}
              icon={<Heart className="w-4 h-4" strokeWidth={1.5} fill={liked ? '#B71C1C' : 'none'} />}
            >
              {likeCount} Likes
            </ActionChip>
            <ActionChip icon={<MessageCircle className="w-4 h-4" strokeWidth={1.5} />}>
              {reviews.length} Comments
            </ActionChip>
            <ActionChip
              onClick={handleSaveRecipe}
              active={saved}
              icon={<Bookmark className="w-4 h-4" strokeWidth={1.5} fill={saved ? '#1B3A2D' : 'none'} />}
            >
              {saved ? 'Saved' : 'Save'}
            </ActionChip>
          </div>
          <div className="flex items-center gap-2">
            <PrimaryButton onClick={handleCookedThis} icon={<ChefHat className="w-4 h-4" strokeWidth={1.5} />}>
              I Cooked This
            </PrimaryButton>
            <PrimaryButton onClick={handleFork} icon={<GitBranch className="w-4 h-4" strokeWidth={1.5} />}>
              Fork This Recipe
            </PrimaryButton>
            {canDelete && (
              <button
                type="button"
                onClick={() => setConfirmDel(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#B71C1C] text-[#B71C1C] rounded-lg text-[13px] font-semibold hover:bg-[#FFEBEE] transition-colors"
              >
                <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                Delete
              </button>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <IngredientsCard
            ingredients={ingredients}
            substitutions={substitutions}
            onAddToCart={handleAddToCart}
          />
          <InstructionsCard steps={steps} />
        </div>

        {isOwner && (
          <div className="mb-8">
            <OwnerSubstitutionEditor recipeId={Number(id)} ingredients={ingredients} />
          </div>
        )}

        <CommentsSection
          comments={reviews}
          comment={comment}
          onChange={setComment}
          rating={rating}
          onRatingChange={setRating}
          onPost={postComment}
          posting={posting}
          onLikeComment={handleCommentLike}
        />
      </div>

      {shopOpen && (
        <SubstitutionPicker
          recipe={recipe}
          servings={servings}
          baseServings={recipe.servings ?? servings}
          onClose={() => setShopOpen(false)}
          onConfirm={handleConfirmShop}
        />
      )}

      <ConfirmModal
        isOpen={confirmDel}
        title="Delete this recipe?"
        message="This will permanently remove the recipe and its ingredients, steps, comments, and substitutions. This can't be undone."
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteRecipe}
        onCancel={() => setConfirmDel(false)}
      />
    </div>
  );
}

function MediaCarousel({ media, fallback, alt }) {
  // build the slide list — Recipe_Media first, otherwise fall back to thumbnail_url
  const slides = (Array.isArray(media) && media.length > 0)
    ? [...media].sort((a, b) => (b.is_thumbnail ? 1 : 0) - (a.is_thumbnail ? 1 : 0))
    : (fallback ? [{ url: fallback, type: 'image' }] : []);

  const [i, setI] = useState(0);
  const total = slides.length;
  const go = (dir) => setI((cur) => (cur + dir + total) % total);

  if (total === 0) {
    return (
      <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-[#FAF8F5] mb-6 flex items-center justify-center text-[#9E9E9E]">
        <ChefHat className="w-16 h-16" strokeWidth={1} />
      </div>
    );
  }

  const current = slides[i];
  const url = current.url ?? current.media_url ?? current.image_url;
  const isVideo = (current.type ?? current.media_type) === 'video';

  return (
    <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-[#FAF8F5] mb-6">
      {isVideo ? (
        <video src={url} controls className="w-full h-full object-cover" />
      ) : (
        <img src={url} alt={alt} className="w-full h-full object-cover" />
      )}

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white border border-[#EBEBEB] flex items-center justify-center"
            aria-label="Previous"
          >
            <ArrowLeft className="w-4 h-4 text-[#1A1A1A]" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white border border-[#EBEBEB] flex items-center justify-center"
            aria-label="Next"
          >
            <ArrowRight className="w-4 h-4 text-[#1A1A1A]" strokeWidth={1.5} />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setI(idx)}
                className={
                  'rounded-full transition-all ' +
                  (idx === i ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/60 hover:bg-white/80')
                }
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AuthorRow({ recipe, following, onFollow, showFollow }) {
  const handle =
    recipe.publisher_handle ??
    (recipe.publisher_name?.toLowerCase().replace(/\s+/g, '_') ?? '');

  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <img
          src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(recipe.publisher_name || '')}`}
          alt={recipe.publisher_name}
          className="w-11 h-11 rounded-full bg-[#FAF8F5]"
        />
        <div>
          <div className="flex items-center gap-1.5 text-[15px] font-semibold text-[#1A1A1A]">
            {recipe.publisher_name}
            {recipe.is_verified_chef && (
              <BadgeCheck className="w-4 h-4 text-[#1B3A2D]" strokeWidth={2} />
            )}
          </div>
          {handle && <div className="text-[13px] text-[#6B6B6B]">@{handle}</div>}
        </div>
      </div>
      {showFollow && (
        <button
          type="button"
          onClick={onFollow}
          className={
            'px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-colors ' +
            (following
              ? 'bg-[#1B3A2D] text-white hover:bg-[#142B22]'
              : 'border border-[#D0D0D0] text-[#1A1A1A] hover:border-[#1B3A2D]')
          }
        >
          {following ? 'Following' : 'Follow'}
        </button>
      )}
    </div>
  );
}

function ServingsStepper({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <Users className="w-4 h-4 text-[#6B6B6B]" strokeWidth={1.5} />
      <div>
        <div className="text-[12px] text-[#6B6B6B]">Servings</div>
        <div className="flex items-center gap-2 mt-1">
          <StepperButton onClick={() => onChange(Math.max(1, value - 1))}>
            <Minus className="w-3 h-3" strokeWidth={1.5} />
          </StepperButton>
          <span className="text-[14px] font-semibold w-6 text-center">{value}</span>
          <StepperButton onClick={() => onChange(value + 1)}>
            <Plus className="w-3 h-3" strokeWidth={1.5} />
          </StepperButton>
        </div>
      </div>
    </div>
  );
}

function StepperButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-7 h-7 rounded-full border border-[#D0D0D0] flex items-center justify-center hover:border-[#1B3A2D] transition-colors"
    >
      {children}
    </button>
  );
}

function IngredientsCard({ ingredients, substitutions, onAddToCart }) {
  return (
    <section className="bg-white border border-[#EBEBEB] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[18px] font-bold text-[#1A1A1A]">Ingredients</h2>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#E8F1EC] text-[#1B3A2D] text-[12px] font-semibold">
          <MapPin className="w-3 h-3" strokeWidth={1.5} />
          Local Available
        </span>
      </div>

      {ingredients.length === 0 ? (
        <p className="text-[13px] text-[#9E9E9E] mb-5">No ingredients listed.</p>
      ) : (
        <ul className="space-y-2 mb-5">
          {ingredients.map((ing, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[14px] text-[#1A1A1A]">
              <span className="w-1.5 h-1.5 mt-2 rounded-full bg-[#1B3A2D] shrink-0" />
              <span>{formatIngredient(ing)}</span>
            </li>
          ))}
        </ul>
      )}

      {substitutions.length > 0 && (
        <div className="space-y-2 mb-5">
          {substitutions.map((s, i) => {
            const from  = s.from  ?? s.source_ingredient_name;
            const to    = s.to    ?? s.sub_ingredient_name;
            const scale = s.scale ?? s.quantity_multiplier;
            const scaleNum = Number(scale);
            return (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 border border-[#EBEBEB] rounded-lg text-[13px]"
              >
                <span className="text-[#1A1A1A] font-medium">{from}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#1B3A2D]" strokeWidth={1.5} />
                <span className="text-[#1B3A2D] font-medium">{to}</span>
                {Number.isFinite(scaleNum) && scaleNum !== 1 && (
                  <span className="ml-auto text-[12px] text-[#6B6B6B] bg-[#FAF8F5] px-2 py-0.5 rounded">
                    ×{scaleNum}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-[#FAEFCB] border border-[#F0E2A8] rounded-xl px-4 py-3 text-[13px] text-[#5A4A1A] mb-5">
        All ingredients are available from local suppliers in your area. Click "Shop This Meal" to view sourcing options.
      </div>

      <button
        type="button"
        onClick={onAddToCart}
        className="w-full py-3 bg-[#1B3A2D] text-white rounded-lg text-[14px] font-semibold hover:bg-[#142B22] transition-colors inline-flex items-center justify-center gap-2"
      >
        <ShoppingCart className="w-4 h-4" strokeWidth={1.5} />
        Add to Cart
      </button>
    </section>
  );
}

function InstructionsCard({ steps }) {
  return (
    <section className="bg-white border border-[#EBEBEB] rounded-2xl p-6">
      <h2 className="text-[18px] font-bold text-[#1A1A1A] mb-4">Instructions</h2>
      {steps.length === 0 ? (
        <p className="text-[13px] text-[#9E9E9E]">No instructions yet.</p>
      ) : (
        <ol className="space-y-4">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3 text-[14px] text-[#1A1A1A] leading-relaxed">
              <span className="shrink-0 w-7 h-7 rounded-full bg-[#1B3A2D] text-white flex items-center justify-center text-[12px] font-bold">
                {i + 1}
              </span>
              <span>{typeof s === 'string' ? s : s.body}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function CommentsSection({ comments, comment, onChange, rating, onRatingChange, onPost, posting, onLikeComment }) {
  return (
    <section className="bg-white border border-[#EBEBEB] rounded-2xl p-6">
      <h2 className="text-[18px] font-bold text-[#1A1A1A] mb-5">
        Comments ({comments.length})
      </h2>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-[13px] text-[#6B6B6B]">Your rating:</span>
        <StarRating value={rating} onChange={onRatingChange} size="md" />
      </div>

      <textarea
        value={comment}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Share your thoughts or ask a question..."
        rows={3}
        className="w-full px-3 py-2.5 text-[14px] border border-[#D0D0D0] rounded-lg placeholder-[#9E9E9E] focus:outline-none focus:border-[#1B3A2D] transition-colors resize-none mb-3"
      />
      <button
        type="button"
        onClick={onPost}
        disabled={posting || !comment.trim()}
        className="px-4 py-2 bg-[#1B3A2D] text-white rounded-lg text-[13px] font-semibold hover:bg-[#142B22] disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-6"
      >
        {posting ? 'Posting…' : 'Post Comment'}
      </button>

      <div className="space-y-5">
        {comments.map((c, i) => (
          <div key={c.id ?? i} className="flex items-start gap-3 pt-5 border-t border-[#EBEBEB]">
            <img
              src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.author || '')}`}
              alt={c.author}
              className="w-9 h-9 rounded-full bg-[#FAF8F5] shrink-0"
            />
            <div className="flex-1">
              <div className="text-[13px] mb-1">
                <span className="font-semibold text-[#1A1A1A]">{c.author}</span>
                {c.handle && <span className="text-[#9E9E9E] ml-1">@{c.handle}</span>}
                {c.date && (
                  <>
                    <span className="text-[#9E9E9E] mx-1">·</span>
                    <span className="text-[#6B6B6B]">{c.date}</span>
                  </>
                )}
              </div>
              <p className="text-[14px] text-[#1A1A1A] leading-relaxed mb-1.5">{c.body}</p>
              <button
                type="button"
                onClick={() => onLikeComment?.(c)}
                className={
                  'inline-flex items-center gap-1.5 text-[12px] transition-colors ' +
                  (c.liked_by_me ? 'text-[#B71C1C]' : 'text-[#6B6B6B] hover:text-[#B71C1C]')
                }
              >
                <Heart
                  className="w-3.5 h-3.5"
                  strokeWidth={1.5}
                  fill={c.liked_by_me ? '#B71C1C' : 'none'}
                />
                {c.like_count ?? 0}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Tag({ children }) {
  return (
    <span className="bg-[#F5F0E8] text-[#1A1A1A] text-[12px] font-medium px-3 py-1 rounded-full">
      {children}
    </span>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <div className="text-[12px] text-[#6B6B6B]">{label}</div>
        <div className="text-[14px] font-semibold text-[#1A1A1A]">{value}</div>
      </div>
    </div>
  );
}

function ActionChip({ icon, children, onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] transition-colors ' +
        (active
          ? 'text-[#1B3A2D] font-semibold bg-[#F5F8F6]'
          : (onClick
            ? 'text-[#6B6B6B] hover:text-[#1B3A2D] hover:bg-[#FAF8F5]'
            : 'text-[#6B6B6B] cursor-default'))
      }
    >
      {icon}
      {children}
    </button>
  );
}

function PrimaryButton({ onClick, icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B3A2D] text-white rounded-lg text-[13px] font-semibold hover:bg-[#142B22] transition-colors"
    >
      {icon}
      {children}
    </button>
  );
}

// Backend may return a flat string or { quantity, unit, name } — handle both.
function formatIngredient(i) {
  if (typeof i === 'string') return i;
  return [i.quantity, i.unit, i.name].filter(Boolean).join(' ');
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function prettyCategory(value) {
  if (!value) return '';
  return value.split('-').map(capitalize).join(' ');
}

// Reviews API may return a row that doesn't yet match the comment-row shape.
// Keep the new comment optimistic with the user's own data so it renders.
function normalizeReview(created, user, fallbackBody = '') {
  return {
    id:           created?.id     ?? `tmp-${Date.now()}`,
    user_id:      created?.user_id ?? user?.user_id,
    timestamp:    created?.timestamp ?? new Date().toISOString(),
    author:       created?.author ?? user?.username ?? 'You',
    handle:       created?.handle ?? (user?.username || '').toLowerCase().replace(/\s+/g, '_'),
    date:         created?.date   ?? new Date().toLocaleDateString('en-GB'),
    body:         created?.body   ?? created?.comment ?? fallbackBody,
    like_count:   0,
    liked_by_me:  false,
  };
}

// composite key matching the Rates_Review PK shape
function reviewKey(c) {
  return `${c.user_id}:${c.timestamp}`;
}

function mergeLikes(reviews, likes) {
  const map = new Map();
  for (const l of (likes ?? [])) {
    map.set(`${l.review_user_id}:${l.review_timestamp}`, l);
  }
  return (reviews ?? []).map((c) => {
    const m = map.get(reviewKey(c));
    return {
      ...c,
      like_count:  m ? Number(m.like_count) : 0,
      liked_by_me: m ? Boolean(Number(m.liked_by_me)) : false,
    };
  });
}
