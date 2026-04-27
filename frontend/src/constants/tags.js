// Single source of truth for all tag/filter values.
// Used by: Navbar, FilterSidebar, CreateRecipe, and backend B04 filter endpoint.

export const RECIPE_DROPDOWN = [
  {
    title: 'Popular',
    param: 'popular',
    options: [
      { label: 'Comfort Food',       value: 'comfort-food' },
      { label: 'Quick & Easy',       value: 'quick-easy' },
      { label: 'Seasonal',           value: 'seasonal' },
      { label: 'One Pot',            value: 'one-pot' },
      { label: 'Healthy',            value: 'healthy' },
      { label: 'Salad',              value: 'salad' },
      { label: 'Sauces & Dressings', value: 'sauces-dressings' },
    ],
  },
  {
    title: 'Meal',
    param: 'meal',
    options: [
      { label: 'Breakfast', value: 'breakfast' },
      { label: 'Brunch',    value: 'brunch' },
      { label: 'Lunch',     value: 'lunch' },
      { label: 'Dinner',    value: 'dinner' },
      { label: 'Dessert',   value: 'dessert' },
      { label: 'Snack',     value: 'snack' },
    ],
  },
  {
    title: 'Diet',
    param: 'diet',
    options: [
      { label: 'Vegetarian',  value: 'vegetarian' },
      { label: 'Low-Carb',    value: 'low-carb' },
      { label: 'Dairy-Free',  value: 'dairy-free' },
      { label: 'Vegan',       value: 'vegan' },
      { label: 'Keto',        value: 'keto' },
      { label: 'Gluten-Free', value: 'gluten-free' },
      { label: 'Nut-Free',    value: 'nut-free' },
      { label: 'Paleo',       value: 'paleo' },
    ],
  },
  {
    title: 'Ingredient',
    param: 'ingredient',
    options: [
      { label: 'Chicken',        value: 'chicken' },
      { label: 'Beef',           value: 'beef' },
      { label: 'Rice',           value: 'rice' },
      { label: 'Tofu & Tempeh',  value: 'tofu-tempeh' },
      { label: 'Salmon',         value: 'salmon' },
      { label: 'Pork',           value: 'pork' },
      { label: 'Fish & Seafood', value: 'fish-seafood' },
      { label: 'Potatoes',       value: 'potatoes' },
    ],
  },
  {
    title: 'Dish Type',
    param: 'dish_type',
    options: [
      { label: 'Side Dish',          value: 'side-dish' },
      { label: 'Appetizers',         value: 'appetizers' },
      { label: 'Pasta',              value: 'pasta' },
      { label: 'Sandwiches & Wraps', value: 'sandwiches-wraps' },
      { label: 'Drinks',             value: 'drinks' },
      { label: 'Soups & Stews',      value: 'soups-stews' },
      { label: 'Spreads & Dips',     value: 'spreads-dips' },
      { label: 'Bread',              value: 'bread' },
    ],
  },
  {
    title: 'Cuisine',
    param: 'cuisine',
    options: [
      { label: 'Italian',       value: 'italian' },
      { label: 'Japanese',      value: 'japanese' },
      { label: 'Mexican',       value: 'mexican' },
      { label: 'French',        value: 'french' },
      { label: 'Thai',          value: 'thai' },
      { label: 'American',      value: 'american' },
      { label: 'Mediterranean', value: 'mediterranean' },
      { label: 'Chinese',       value: 'chinese' },
      { label: 'Indian',        value: 'indian' },
      { label: 'Korean',        value: 'korean' },
    ],
  },
];

export const POPULAR_OPTIONS    = RECIPE_DROPDOWN[0].options;
export const MEAL_OPTIONS       = RECIPE_DROPDOWN[1].options;
export const DIET_OPTIONS       = RECIPE_DROPDOWN[2].options;
export const INGREDIENT_OPTIONS = RECIPE_DROPDOWN[3].options;
export const DISH_TYPE_OPTIONS  = RECIPE_DROPDOWN[4].options;
export const CUISINE_OPTIONS    = RECIPE_DROPDOWN[5].options;

export const ALL_TAG_OPTIONS = RECIPE_DROPDOWN.flatMap(s => s.options);

export const DIFFICULTY_OPTIONS = [
  { label: 'Easy',   value: 'easy' },
  { label: 'Medium', value: 'medium' },
  { label: 'Hard',   value: 'hard' },
];

export const CATEGORY_OPTIONS = [
  { label: 'Main Course', value: 'main-course' },
  { label: 'Dessert',     value: 'dessert' },
  { label: 'Appetizer',   value: 'appetizer' },
  { label: 'Salad',       value: 'salad' },
  { label: 'Breakfast',   value: 'breakfast' },
  { label: 'Snack',       value: 'snack' },
  { label: 'Soup',        value: 'soup' },
  { label: 'Beverage',    value: 'beverage' },
];
