import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import generateRandomCode from "../../utils/confirmation_code/generateCode.js";
import pool from '../../database/Config.js';
import emailTransporter from "../../utils/EmailSender.js";

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - first_name
 *         - last_name
 *         - email
 *         - phone_number
 *         - password
 *       properties:
 *         first_name:
 *           type: string
 *           description: The user's first name
 *         middle_name:
 *           type: string
 *           description: The user's middle name
 *         last_name:
 *           type: string
 *           description: The user's last name
 *         email:
 *           type: string
 *           description: The user's email address
 *         phone_number:
 *           type: string
 *           description: The user's phone number
 *         role:
 *           type: string
 *           description: The user's role
 *         password:
 *           type: string
 *           description: The user's password
 *       example:
 *         first_name: John
 *         middle_name: M
 *         last_name: Doe
 *         email: john.doe@example.com
 *         phone_number: "+254717325657"
 *         role: "landlord"
 *         password: "securePassword123"
 */

/**
 * @swagger
 * /api/kenf/management/users/register:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: User created successfully
 *                 data:
 *                   type: object
 *                   example: { id: 1, userId: "ABC123", confirmationCode: "XYZ45678", token: "jwt_token_here" }
 *       400:
 *         description: Bad request
 *       409:
 *         description: Conflict
 *       500:
 *         description: Internal server error
 */

router.post('/register', async (req, res) => {
    try {
        const { first_name, middle_name, last_name, email, phone_number, role, password } = req.body;

        if (!first_name || !last_name || !email || !phone_number || !role || !password) {
            return res.status(400).json({ status: 400, message: 'Missing required fields' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const userId = generateRandomCode(6);
        const confirmationCode = generateRandomCode(6);

        const query = `
            INSERT INTO users (first_name, middle_name, last_name, email, phone_number, role, password, user_id, confirmation_code)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [first_name, middle_name, last_name, email, phone_number, role, hashedPassword, userId, confirmationCode];

        const [result] = await pool.query(query, values);

        const token = jwt.sign({ id: result.insertId, email }, process.env.JWT_SECRET, { expiresIn: '1h' });

        const subject = `Welcome to ${process.env.APP_NAME}! Confirm Your Account`;
        const message = `Hello ${first_name} ${last_name}, your account has been created successfully. 
        Your account ID is ${userId}. Please confirm your account using this code: ${confirmationCode}`;

        try {
            await emailTransporter(subject, message, email);
        } catch (emailError) {
            console.error('Error sending confirmation email:', emailError);
        }

        return res.status(201).json({
            status: 201,
            message: 'User created successfully',
            data: { id: result.insertId, userId, role, token },
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.sqlMessage.includes('email')) {
                return res.status(409).json({ status: 409, message: 'Email is already in use.' });
            }
            if (error.sqlMessage.includes('phone_number')) {
                return res.status(409).json({ status: 409, message: 'Phone number is already in use.' });
            }
        }

        console.error('Unexpected error:', error);
        return res.status(500).json({ status: 500, message: 'Something went wrong' });
    }
});


export default router;
