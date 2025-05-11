const { validationResult, body, param } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Common validation rules
const commonRules = {
  id: param('id').isMongoId().withMessage('Invalid ID format'),
  email: body('email').isEmail().withMessage('Invalid email format'),
  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number and one special character')
};

// Auth validation rules
const authValidation = {
  register: [
    body('email').isEmail().withMessage('Invalid email format'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
    validate
  ],
  login: [
    body('email').isEmail().withMessage('Invalid email format'),
    body('password').exists().withMessage('Password is required'),
    validate
  ]
};

// Repl validation rules
const replValidation = {
  create: [
    body('title').isLength({ min: 1 }).withMessage('Title is required'),
    body('language').isIn(['javascript', 'python', 'cpp']).withMessage('Invalid language'),
    validate
  ],
  update: [
    param('id').isMongoId().withMessage('Invalid ID format'),
    body('title').optional().isLength({ min: 1 }).withMessage('Title cannot be empty'),
    body('language').optional().isIn(['javascript', 'python', 'cpp']).withMessage('Invalid language'),
    validate
  ],
  delete: [
    param('id').isMongoId().withMessage('Invalid ID format'),
    validate
  ]
};

// AI validation rules
const aiValidation = {
  assist: [
    body('prompt').isLength({ min: 1 }).withMessage('Prompt is required'),
    body('fileContent').exists().withMessage('File content is required'),
    body('filePath').exists().withMessage('File path is required'),
    body('language').exists().withMessage('Language is required'),
    validate
  ],
  complete: [
    body('fileContent').exists().withMessage('File content is required'),
    body('filePath').exists().withMessage('File path is required'),
    body('language').exists().withMessage('Language is required'),
    body('cursorPosition').isInt({ min: 0 }).withMessage('Invalid cursor position'),
    validate
  ],
  explain: [
    body('selectedCode').exists().withMessage('Selected code is required'),
    body('filePath').exists().withMessage('File path is required'),
    body('language').exists().withMessage('Language is required'),
    validate
  ]
};

module.exports = {
  validate,
  commonRules,
  authValidation,
  replValidation,
  aiValidation
}; 