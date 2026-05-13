import express from 'express';
import cors from 'cors';
import identifyRoutes from './routes/identifyRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

app.post('/', (req, res) => {
  res.json({ status: 'ok', message: 'WWF Animal Identifier Prototype API is running!' });
});

app.use('/identify', identifyRoutes);
app.use('/users', userRoutes);

app.use((err, req, res, next) => {
  if (err) {
    console.error(err.stack);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
  res.status(404).json({ error: 'Not Found' });
});

export default app;
