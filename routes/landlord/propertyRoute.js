import { Router } from "express";
import jwt from "jsonwebtoken";
import pool from '../../database/Config.js';
import generateRandomCode from "../../utils/confirmation_code/generateCode.js";

const router = Router();

/**
 * @swagger
 * /api/kenf/management/landlord/add:
 *   post:
 *     summary: Add a new property under a landlord
 *     tags: [Properties]
 *     security:
 *        - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               property_name:
 *                 type: string
 *               property_type:
 *                 type: string
 *               location:
 *                 type: string
 *               number_of_units:
 *                 type: integer
 *               price_range:
 *                 type: string
 *               amenities:
 *                 type: object
 *             required:
 *               - property_name
 *               - property_type
 *               - location
 *               - number_of_units
 *               - price_range
 *               - amenities
 *     responses:
 *       201:
 *         description: Property added successfully
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
 *                   example: 'Property added successfully'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.post('/add', async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ status: 401, message: 'Unauthorized, token missing' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const propertyUniqueID = generateRandomCode(10);

        const [landlords] = await pool.query('SELECT * FROM landlords WHERE user_id = ?', [decoded.userId]);

        if (!landlords.length) {
            return res.status(401).json({ status: 401, message: 'Unauthorized, not a landlord' });
        }

        const landlord = landlords[0];

        const { property_name, property_type, location, number_of_units, price_range, amenities } = req.body;

        if (!property_name || !property_type || !location || !number_of_units || !price_range || !amenities) {
            return res.status(400).json({ status: 400, message: 'Missing required fields' });
        }

        const query = `
            INSERT INTO properties (landlord_id, property_name, property_type, location, number_of_units,
                                    price_range, amenities, property_unique_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [landlord.user_national_id, property_name, property_type, location, number_of_units, price_range, JSON.stringify(amenities), propertyUniqueID];

        const [result] = await pool.query(query, values);

        return res.status(201).json({
            status: 201,
            message: 'Property added successfully',
            data: { id: result.insertId, property_name, property_type, location }
        });

    } catch (error) {
        console.error('Error adding property:', error);
        return res.status(500).json({ status: 500, message: 'Something went wrong' });
    }
});

export default router;
