import { Router } from "express";
import pool from "../../database/Config.js";
import authenticate from "../../middleware/authMiddleware.js";
import emailTransporter from "../../utils/EmailSender.js";

const router = Router();

/**
 * @swagger
 * /api/kenf/management/landlord/create:
 *   post:
 *     summary: Create a new landlord profile
 *     tags: [Landlords]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               national_id:
 *                  type: string
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
 *               bank_name:
 *                 type: string
 *               account_number:
 *                 type: string
 *               branch:
 *                 type: string
 *             required:
 *               - national_id
 *               - property_name
 *               - property_type
 *               - location
 *               - number_of_units
 *               - price_range
 *               - amenities
 *               - bank_name
 *               - account_number
 *               - branch
 *     responses:
 *       201:
 *         description: Landlord created successfully
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
 *                   example: 'Landlord profile created successfully'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Internal server error
 */

router.post('/create', authenticate('landlord'), async (req, res) => {
    const {
        national_id,
        property_name,
        property_type,
        location,
        number_of_units,
        price_range,
        amenities,
        bank_name,
        account_number,
        branch,
    } = req.body;

    const landlordFullName = `${req.user.first_name} ${req.user.last_name}`;
    const phoneNumber = req.user.phone_number;

    const missingFields = [
        !national_id && 'national_id',
        !property_name && 'property_name',
        !property_type && 'property_type',
        !location && 'location',
        !number_of_units && 'number_of_units',
        !price_range && 'price_range',
        !amenities && 'amenities',
        !bank_name && 'bank_name',
        !account_number && 'account_number',
        !branch && 'branch',
    ].filter(Boolean);

    if (missingFields.length > 0) {
        return res.status(400).json({
            status: 400,
            message: 'Missing required fields',
            missingFields,
        });
    }

    const checkNationalIdQuery = `SELECT * FROM landlords WHERE user_national_id = ?`;
    const [existingLandlord] = await pool.query(checkNationalIdQuery, [national_id]);

    if (existingLandlord.length > 0) {
        return res.status(400).json({
            status: 400,
            message: 'This national ID is already in use by another landlord.',
        });
    }

    const query = `
        INSERT INTO landlords
        (user_id, full_name, email, phone_number, user_national_id, property_name, property_type, location, number_of_units, price_range, amenities, bank_name, account_number, branch)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        req.user.userId,
        landlordFullName,
        req.user.email,
        phoneNumber,
        national_id,
        property_name,
        property_type,
        location,
        number_of_units,
        price_range,
        JSON.stringify(amenities),
        bank_name,
        account_number,
        branch,
    ];

    try {
        const [result] = await pool.query(query, values);

        const subject = `Welcome to ${process.env.APP_NAME}!`;
        const message = `Hello ${landlordFullName}, your account has been created successfully.`
        const email = req.user.email;

        try {
            await emailTransporter(subject, message, email);
        } catch (emailError) {
            console.error('Error sending confirmation email:', emailError);
        }

        return res.status(201).json({
            status: 201,
            message: 'Landlord profile created successfully',
            data: {
                id: result.insertId,
                full_name: landlordFullName,
                phone_number: phoneNumber,
                property_name,
                location,
            },
        });
    } catch (error) {
        console.error('Error creating landlord profile:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                status: 400,
                message: 'A landlord with this information already exists',
            });
        }

        return res.status(500).json({
            status: 500,
            message: 'Something went wrong while creating the landlord profile',
        });
    }
});


export default router;
