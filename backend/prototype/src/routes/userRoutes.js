import express from 'express';
import { userController } from '../Controller/User/userController.js';

const router = express.Router();

router.post('/', (req, res) => {
  const { purpose } = req.body;

  if (purpose === 'createNewUser') return userController.createNewUser(req, res);
  if (purpose === 'retrieveUser')  return userController.retrieveUser(req, res);
  if (purpose === 'editUser')      return userController.editUser(req, res);
  if (purpose === 'deleteUser')    return userController.deleteUser(req, res);

  return res.status(400).json({
    success: false,
    error: "Invalid purpose. Use 'createNewUser', 'retrieveUser', 'editUser', or 'deleteUser'.",
  });
});

export default router;
