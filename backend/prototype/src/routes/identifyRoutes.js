import express from 'express';
import { identifyController } from '../Controller/Identification/identifyController.js';

const router = express.Router();

router.post('/', identifyController.handleRequest);

export default router;
