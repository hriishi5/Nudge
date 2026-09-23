// ====================================================================
// Nudge: Zod Request Validation Middleware
// Validates incoming HTTP request body against specified Zod schema
// ====================================================================

export function validateBody(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated; // Assign cleanly parsed/typed data
      next();
    } catch (err) {
      if (err.errors) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed for request payload.',
          details: err.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid request body format.'
      });
    }
  };
}
