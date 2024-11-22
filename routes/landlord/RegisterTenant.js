// routes/tenantRouter.js
import { Router } from 'express';
import pool from '../../database/Config.js';
import authenticate from '../../middleware/authMiddleware.js';
import emailTransporter from '../../utils/EmailSender.js';

const router = Router();


/**
 * @swagger
 * /api/kenf/management/tenant/create:
 *   post:
 *     summary: Create a new tenant
 *     tags: [Tenant]
 *     security:
 *       - BearerAuth: []
 *       - RoleAuth: ["landlord", "caretaker"]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tenantFullName:
 *                 type: string
 *                 description: Tenant's full name
 *               phoneNumber:
 *                 type: string
 *                 description: Tenant's phone number
 *               email:
 *                 type: string
 *                 description: Tenant's email
 *               national_id:
 *                 type: string
 *                 description: Tenant's national ID
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *                 description: Tenant's date of birth
 *               property_address:
 *                 type: string
 *                 description: Address of the rented property
 *               lease_start_date:
 *                 type: string
 *                 format: date
 *                 description: Lease start date
 *               lease_end_date:
 *                 type: string
 *                 format: date
 *                 description: Lease end date
 *               monthly_rent:
 *                 type: number
 *                 format: float
 *                 description: Monthly rent amount
 *               payment_method:
 *                 type: string
 *                 description: Payment method for rent
 *               security_deposit:
 *                 type: number
 *                 format: float
 *                 description: Security deposit amount
 *               tenant_references:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of tenant references
 *               emergency_contact_name:
 *                 type: string
 *                 description: Emergency contact person's name
 *               emergency_contact_number:
 *                 type: string
 *                 description: Emergency contact phone number
 *               emergency_contact_relationship:
 *                 type: string
 *                 description: Relationship to emergency contact
 *     responses:
 *       201:
 *         description: Tenant created successfully
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
 *                   example: Tenant profile created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     full_name:
 *                       type: string
 *                       example: John Doe
 *                     phone_number:
 *                       type: string
 *                       example: "+254717325657"
 *                     property_address:
 *                       type: string
 *                       example: "123 Main St, Apartment 101"
 *                     lease_start_date:
 *                       type: string
 *                       format: date
 *                       example: "2024-01-01"
 *                     lease_end_date:
 *                       type: string
 *                       format: date
 *                       example: "2025-01-01"
 *       400:
 *         description: Missing required fields or duplicate national ID
 *       500:
 *         description: Internal server error
 */

router.post('/create', authenticate('landlord'), async (req, res) => {
    const {
        tenantFullName,
        phoneNumber,
        email,
        national_id,
        date_of_birth,
        property_address,
        lease_start_date,
        lease_end_date,
        monthly_rent,
        payment_method,
        security_deposit,
        tenant_references,
        emergency_contact_name,
        emergency_contact_number,
        emergency_contact_relationship,
    } = req.body;


    const missingFields = [
        !tenantFullName && 'tenantFullName',
        !phoneNumber && 'phoneNumber',
        !national_id && 'national_id',
        !date_of_birth && 'date_of_birth',
        !property_address && 'property_address',
        !lease_start_date && 'lease_start_date',
        !lease_end_date && 'lease_end_date',
        !monthly_rent && 'monthly_rent',
        !payment_method && 'payment_method',
    ].filter(Boolean);

    if (missingFields.length > 0) {
        return res.status(400).json({
            status: 400,
            message: 'Missing required fields',
            missingFields,
        });
    }

    const checkDuplicateQuery = `
        SELECT *
        FROM tenants
        WHERE user_id = ? AND (phone_number = ? OR email = ? OR national_id = ?)
    `;
    const [existingDuplicates] = await pool.query(checkDuplicateQuery, [req.user.userId, phoneNumber, email, national_id]);

    if (existingDuplicates.length > 0) {
        return res.status(400).json({
            status: 400,
            message: 'A tenant with this phone number, email, or national ID already exists.',
        });
    }

    const query = `
        INSERT INTO tenants
        (user_id, full_name, email, phone_number, national_id, date_of_birth, property_address, lease_start_date, lease_end_date, monthly_rent, payment_method, security_deposit, tenant_references, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        req.user.userId,
        tenantFullName,
        email,
        phoneNumber,
        national_id,
        date_of_birth,
        property_address,
        lease_start_date,
        lease_end_date,
        monthly_rent,
        payment_method,
        security_deposit,
        JSON.stringify(tenant_references),
        emergency_contact_name,
        emergency_contact_number,
        emergency_contact_relationship,
    ];

    try {
        const [result] = await pool.query(query, values);

        const subject = `Welcome to ${process.env.APP_NAME}!`;
        const message = `Hello ${tenantFullName}, your tenant account has been created successfully.`;
        const email = req.user.email;

        try {
            await emailTransporter(subject, message, email);
        } catch (emailError) {
            console.error('Error sending confirmation email:', emailError);
        }

        return res.status(201).json({
            status: 201,
            message: 'Tenant profile created successfully',
            data: {
                id: result.insertId,
                full_name: tenantFullName,
                phone_number: phoneNumber,
                property_address,
                lease_start_date,
                lease_end_date,
            },
        });
    } catch (error) {
        console.error('Error creating tenant profile:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                status: 400,
                message: 'A tenant with this information already exists',
            });
        }

        return res.status(500).json({
            status: 500,
            message: 'Something went wrong while creating the tenant profile',
        });
    }
});

export default router;
