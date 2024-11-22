import express from 'express';
import pool from '../../database/Config.js';
import jwt from 'jsonwebtoken';
import emailTransporter from "../../utils/EmailSender.js";
import bcrypt from "bcrypt";

const router = express.Router();

/**
 * @swagger
 * /api/kenf/management/users/forgot-password:
 *   post:
 *     summary: Send password reset link to user's email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *             required:
 *               - email
 *     responses:
 *       200:
 *         description: Password reset email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Password reset email sent"
 *       400:
 *         description: Invalid request, missing email or invalid format
 *       404:
 *         description: User not found with the provided email
 *       500:
 *         description: Internal server error
 */


router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    try {
        const [user] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });

        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
        const message = {
            to: email,
            text: `Click the following link to reset your password: ${resetLink}`,
        };

        await emailTransporter('Password Reset Request', message, email);

        return res.status(200).json({ message: 'Password reset email sent' });
    } catch (error) {
        console.error('Error sending reset email:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @swagger
 * /api/kenf/management/users/reset-password:
 *   post:
 *     summary: Reset the user's password using the provided reset token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 example: "jwt_reset_token_here"
 *               newPassword:
 *                 type: string
 *                 example: "newPassword123"
 *             required:
 *               - token
 *               - newPassword
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Password has been reset successfully"
 *       400:
 *         description: Invalid or expired token
 *       404:
 *         description: User not found or token is invalid
 *       500:
 *         description: Internal server error
 */

router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token and new password are required' });
    }

    try {

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const { email } = decoded;

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const [result] = await pool.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({ message: 'Password has been reset successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        return res.status(400).json({ message: 'Invalid or expired token' });
    }
});

export default router;
