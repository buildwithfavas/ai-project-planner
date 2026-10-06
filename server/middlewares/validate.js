const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    const errorMessages = error.errors
      ? error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
      : error.message;

    return res.status(400).json({
      success: false,
      error: `Validation Error: ${errorMessages}`
    });
  }
};

module.exports = { validate };
