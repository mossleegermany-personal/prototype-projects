import express from 'express';
import { identifyController } from '../Controller/Identify/identifyController.js';

const router = express.Router();

router.post('/', identifyController.handleRequest);
router.get('/', identifyController.handleRequest);

export default router;
