import { Router } from "express";
import pool from "../../database/Config.js";

const router = Router();

/**
 * @swagger
 * /api/kenf/management/users/confirm:
 *   post:
 *     summary: Confirm a user's account
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: The user's email address
 *               confirmationCode:
 *                 type: string
 *                 description: The confirmation code sent to the user's email
 *             example:
 *               email: "john.doe@example.com"
 *               confirmationCode: "XYZ45678"
 *     responses:
 *       200:
 *         description: Account successfully confirmed
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Invalid confirmation code or user not found
 *       500:
 *         description: Internal server error
 */

router.post('/confirm', async (req, res) => {
    const { email, confirmationCode } = req.body;

    if (!email || !confirmationCode) {
        return res.status(400).json({
            status: 400,
            message: "Email and confirmation code are required",
        });
    }

    try {
        const [result] = await pool.query(
            "SELECT * FROM users WHERE email = ? AND confirmation_code = ?",
            [email, confirmationCode]
        );

        if (result.length === 0) {
            return res.status(404).json({
                status: 404,
                message: "Invalid confirmation code or user not found",
            });
        }

        await pool.query(
            "UPDATE users SET is_confirmed = TRUE WHERE email = ?",
            [email]
        );

        return res.status(200).json({
            status: 200,
            message: "Account confirmed successfully",
            data: {
                email,
                is_confirmed: true,
            },
        });
    } catch (error) {
        console.error("Database error:", error);
        return res.status(500).json({
            status: 500,
            message: "Something went wrong",
        });
    }
});

export default router;
