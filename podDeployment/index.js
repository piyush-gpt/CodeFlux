import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import deploymentRoutes from './routes/deployment.js'; 
import { startReplExpirationWatcher } from './controller/deploymentController.js';


const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
};
startReplExpirationWatcher();
// Apply CORS middleware
app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

app.use('/api', deploymentRoutes);
app.get('/', (req, res) => {
  res.send('Server is up!');
});

app.listen(4001, () => console.log('Server running on http://localhost:4000'));