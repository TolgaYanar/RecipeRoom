function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);

  // Default error response
  let status = 500;
  let message = 'Internal Server Error';

  // Handle known error types
  if (err.message.includes('Database query failed')) {
    status = 500;
    message = 'Database error';
  } else if (err.message.includes('Invalid')) {
    status = 400;
    message = err.message;
  } else if (err.message.includes('Forbidden')) {
    status = 403;
    message = err.message;
  } else if (err.message.includes('Authentication required')) {
    status = 401;
    message = err.message;
  }

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
