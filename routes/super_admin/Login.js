import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import pool from "../../database/Config.js";

const router = Router();

/**
 * @swagger
 * /api/kenf/management/users/login:
 *   post:
 *     summary: User login (email or phone number)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: The user's email or phone number
 *               password:
 *                 type: string
 *                 description: The user's password
 *             example:
 *               identifier: "john.doe@example.com"
 *               password: "password123"
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: User not found or incorrect credentials
 *       500:
 *         description: Internal server error
 */

router.post('/login', async (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({
            status: 400,
            message: "Email/Phone number and password are required",
        });
    }

    try {
        const isEmail = /\S+@\S+\.\S+/.test(identifier);
        const column = isEmail ? 'email' : 'phone_number';

        const [rows] = await pool.query(
            `SELECT * FROM users WHERE ${column} = ?`,
            [identifier]
        );

        // Ensure there's a valid result before accessing it
        if (!rows || rows.length === 0) {
            return res.status(404).json({
                status: 404,
                message: "User not found or incorrect credentials",
            });
        }

        const user = rows[0];

        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(404).json({
                status: 404,
                message: "Incorrect password",
            });
        }

        if (!user.is_confirmed) {
            return res.status(403).json({
                status: 403,
                message: "Account not confirmed. Please check your email for confirmation",
            });
        }

        const token = jwt.sign(
            { userId: user.user_id, email: user.email, phone_number: user.phone_number, role: user.role,
                     first_name: user.first_name, last_name: user.last_name},
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        return res.status(200).json({
            status: 200,
            message: "Login successful",
            data: {
                userId: user.user_id,
                email: user.email,
                phone_number: user.phone_number,
                token,
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
