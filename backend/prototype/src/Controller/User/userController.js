import { dbFind, dbCreate, dbUpdate, dbRemove } from '../../Database/index.js';

const SHEET = 'Users';

export const userController = {
  createNewUser: async (req, res) => {
    try {
      const { name, email, password } = req.body;
      const existing = await dbFind(SHEET, { Email: email });
      if (existing) {
        const err = new Error('Email already in use.');
        err.status = 409;
        throw err;
      }
      const user = await dbCreate(SHEET, { Name: name, Email: email, Password: password });
      const { Password: _, ...data } = user;
      return res.status(201).json({ success: true, data });
    } catch (err) {
      console.error('userController.createNewUser:', err);
      return res.status(err.status || 500).json({ success: false, error: err.message });
    }
  },

  retrieveUser: async (req, res) => {
    try {
      const { userId, email } = req.body;
      console.log('retrieveUser body:', JSON.stringify(req.body));
      const query = userId ? { 'User ID': userId } : { Email: email };
      console.log('retrieveUser query:', JSON.stringify(query));
      const user = await dbFind(SHEET, query);
      console.log('retrieveUser result:', user);
      if (!user) {
        const err = new Error('User not found.');
        err.status = 404;
        throw err;
      }
      const { Password: _, ...data } = user;
      return res.json({ success: true, data });
    } catch (err) {
      console.error('userController.retrieveUser:', err);
      return res.status(err.status || 500).json({ success: false, error: err.message });
    }
  },

  editUser: async (req, res) => {
    try {
      const { userId, name, email, password } = req.body;
      const resolvedUserId = userId ?? req.body['User ID'] ?? req.body.id;
      if (!resolvedUserId) {
        const err = new Error('userId is required.');
        err.status = 400;
        throw err;
      }
      const updates = {};
      if (name) updates['Name'] = name;
      if (email) {
        const existing = await dbFind(SHEET, { Email: email });
        if (existing && String(existing['User ID']).trim() !== String(resolvedUserId).trim()) {
          const err = new Error('Email already in use.');
          err.status = 409;
          throw err;
        }
        updates['Email'] = email;
      }
      if (password) updates['Password'] = password;
      const updated = await dbUpdate(SHEET, { 'User ID': String(resolvedUserId).trim() }, updates);
      if (!updated) {
        const err = new Error('User not found.');
        err.status = 404;
        throw err;
      }
      const { Password: _, ...data } = updated;
      return res.json({ success: true, data });
    } catch (err) {
      console.error('userController.editUser:', err);
      return res.status(err.status || 500).json({ success: false, error: err.message });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { email, newPassword } = req.body;
      const resolvedUserId = req.body.userId ?? req.body['User ID'] ?? req.body.id;
      const normalizedEmail = typeof email === 'string' ? email.trim() : email;

      if ((!normalizedEmail && !resolvedUserId) || !newPassword) {
        const err = new Error('Provide userId (or id) or email, and newPassword.');
        err.status = 400;
        throw err;
      }

      const findQuery = resolvedUserId
        ? { 'User ID': String(resolvedUserId).trim() }
        : { Email: normalizedEmail };
      const user = await dbFind(SHEET, findQuery);
      if (!user) {
        const err = new Error('User not found.');
        err.status = 404;
        throw err;
      }

      const updated = await dbUpdate(
        SHEET,
        { 'User ID': String(user['User ID']).trim() },
        { Password: newPassword }
      );
      if (!updated) {
        const err = new Error('Failed to reset password.');
        err.status = 500;
        throw err;
      }

      const verified = await dbFind(SHEET, { 'User ID': String(user['User ID']).trim() });
      if (!verified || String(verified.Password ?? '') !== String(newPassword)) {
        const err = new Error('Password update did not persist in Google Sheets.');
        err.status = 500;
        throw err;
      }
      return res.json({ success: true, data: { message: 'Password reset successfully.' } });
    } catch (err) {
      console.error('userController.resetPassword:', err);
      return res.status(err.status || 500).json({ success: false, error: err.message });
    }
  },

  deleteUser: async (req, res) => {
    try {
      const { userId } = req.body;
      const deleted = await dbRemove(SHEET, { 'User ID': userId });
      if (!deleted) {
        const err = new Error('User not found.');
        err.status = 404;
        throw err;
      }
      return res.json({ success: true, data: { message: 'User deleted.' } });
    } catch (err) {
      console.error('userController.deleteUser:', err);
      return res.status(err.status || 500).json({ success: false, error: err.message });
    }
  },
};
