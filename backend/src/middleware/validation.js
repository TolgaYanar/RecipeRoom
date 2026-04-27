const { body, param, validationResult } = require('express-validator');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'validation',
      fields: errors.array().reduce((acc, err) => {
        acc[err.path] = err.msg;
        return acc;
      }, {})
    });
  }
  next();
};

// Validation schemas
const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('username')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Username must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  handleValidationErrors
];

const validateHomeCookRegistration = [
  ...validateUserRegistration.slice(0, -1),
  body('target_daily_calories')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Target daily calories must be a non-negative integer'),
  body('primary_diet_goal')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Primary diet goal must be at most 100 characters'),
  handleValidationErrors
];

const validateSupplierRegistration = [
  ...validateUserRegistration.slice(0, -1),
  body('business_name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Business name must be between 1 and 100 characters'),
  body('address')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Address must be between 1 and 200 characters'),
  body('contact_number')
    .trim()
    .isLength({ min: 7, max: 20 })
    .withMessage('Contact number must be between 7 and 20 characters'),
  handleValidationErrors
];

const validateAdminRegistration = [
  ...validateUserRegistration.slice(0, -1),
  body('admin_level')
    .isInt({ min: 1 })
    .withMessage('Admin level must be a positive integer'),
  handleValidationErrors
];

const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

const validateUserProfileUpdate = [
  body('username')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Username must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  handleValidationErrors
];

const validateMealListCreate = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be at most 500 characters'),
  handleValidationErrors
];

const validateMealListUpdate = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be at most 500 characters'),
  handleValidationErrors
];

const validateAddRecipeToList = [
  body('recipe_id')
    .isInt({ min: 1 })
    .withMessage('Recipe ID must be a positive integer'),
  handleValidationErrors
];

const validateIngredientCreate = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be at most 500 characters'),
  handleValidationErrors
];

const validateIngredientUpdate = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be at most 500 characters'),
  handleValidationErrors
];

const validateContentModerate = [
  param('type')
    .isIn(['recipe', 'review'])
    .withMessage('Type must be recipe or review'),
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
  handleValidationErrors
];

const validateUserIdParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer'),
  handleValidationErrors
];

const validateListIdParam = [
  param('listId')
    .isInt({ min: 1 })
    .withMessage('List ID must be a positive integer'),
  handleValidationErrors
];

const validateRecipeIdParam = [
  param('recipeId')
    .isInt({ min: 1 })
    .withMessage('Recipe ID must be a positive integer'),
  handleValidationErrors
];

const validateIngredientIdParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Ingredient ID must be a positive integer'),
  handleValidationErrors
];

const validateChefIdParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Chef ID must be a positive integer'),
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateHomeCookRegistration,
  validateSupplierRegistration,
  validateAdminRegistration,
  validateUserLogin,
  validateUserProfileUpdate,
  validateMealListCreate,
  validateMealListUpdate,
  validateAddRecipeToList,
  validateIngredientCreate,
  validateIngredientUpdate,
  validateContentModerate,
  validateUserIdParam,
  validateListIdParam,
  validateRecipeIdParam,
  validateIngredientIdParam,
  validateChefIdParam
};