require('dotenv').config();
const express = require('express');
const db = require('./db'); // MySQL connection

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// Example route
app.get('/', (req, res) => {
  res.send('Backend is running');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
