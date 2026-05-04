const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/recipes', require('./routes/recipes'));
app.use('/api/ingredients', require('./routes/ingredients'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/highlights', require('./routes/highlights'));
app.use('/api/substitutions', require('./routes/substitutions'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/challenges', require('./routes/challenges'));


app.get('/api/health', (req, res) => {
  res.json({ status: 'RecipeRoom API is running' });
});

// Error handling middleware
app.use(require('./middleware/errorHandler'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`RecipeRoom backend running on port ${PORT}`);
});