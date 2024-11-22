import { Router } from 'express';
import pool from '../../database/Config.js';

const router = Router();

/**
 * Fetch valid roles from the database
 * @returns {Array} List of valid role names
 */
async function getValidRolesFromDb() {
    try {
        const [rows] = await pool.promise().query('SELECT role_name FROM roles');
        return rows.map(row => row.role_name);
    } catch (error) {
        console.error('Error fetching roles from the database:', error.message);
        throw new Error('Error fetching roles from the database');
    }
}

/**
 * Validate if the provided role is valid
 * @param {string} role - Role to check
 * @returns {boolean} True if the role is valid, else false
 */
async function isValidRole(role) {
    try {
        const validRoles = await getValidRolesFromDb();
        return validRoles.includes(role);
    } catch (error) {
        console.error('Error validating role:', error.message);
        return false;
    }
}

/**
 * @swagger
 * /permissions/add-permission:
 *   post:
 *     summary: Adds a permission to a role
 *     description: Adds a permission to the specified role after validating that the role exists in the database.
 *     security:
 *       - BearerAuth: []
 *     tags:
 *       - Permissions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role_id:
 *                 type: string
 *                 description: Role identifier
 *                 example: "landlord"
 *               permission_name:
 *                 type: string
 *                 description: Permission name to be assigned
 *                 example: "view_dashboard"
 *     responses:
 *       200:
 *         description: Permission successfully added to the role
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Permission added to the role successfully."
 *                 role_id:
 *                   type: string
 *                   example: "landlord"
 *                 permission_name:
 *                   type: string
 *                   example: "view_dashboard"
 *       400:
 *         description: Invalid role or bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid role. Please provide a valid role."
 *       500:
 *         description: Server error while adding permission
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error adding permission to the role."
 */

router.post('/add-permission', async (req, res) => {
    const { role_id, permission_name } = req.body;

    // Validate role dynamically from the database
    const roleIsValid = await isValidRole(role_id);
    if (!roleIsValid) {
        return res.status(400).json({ message: 'Invalid role. Please provide a valid role.' });
    }

    try {
        await pool.promise().query('INSERT INTO permissions (role_id, permission_name) VALUES (?, ?)', [role_id, permission_name]);
        return res.status(200).json({
            message: 'Permission added to the role successfully.',
            role_id,
            permission_name,
        });
    } catch (error) {
        console.error('Error adding permission:', error.message);
        return res.status(500).json({ message: 'Error adding permission to the role.' });
    }
});

export default router;
