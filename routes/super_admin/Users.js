import { Router } from "express";
import generateRandomCode from "../../utils/confirmation_code/generateCode";
import Config from "../../database/Config";

const router = Router();

router.post('/users', async (req, res) => {
    try {
        const { first_name, middle_name, last_name, email, phone_number } = req.body;

        if (!first_name || !last_name || !email || !phone_number) {
            return res.status(400).json({
                status: 400,
                message: "Missing required fields",
            });
        }

        const privateId = generateRandomCode(6);
        const confirmationCode = generateRandomCode(8);

        const query = `
            INSERT INTO users (first_name, middle_name, last_name, email, phone_number, private_id, confirmation_code) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [first_name, middle_name, last_name, email, phone_number, privateId, confirmationCode];

        Config.query(query, values, (err, result) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({
                    status: 500,
                    message: "Internal server error",
                });
            }

            return res.status(201).json({
                status: 201,
                message: "User created successfully",
                data: {
                    id: result.insertId,
                    privateId,
                    confirmationCode,
                },
            });
        });
    } catch (error) {
        console.error("Unexpected error:", error);
        return res.status(500).json({
            status: 500,
            message: "Something went wrong",
        });
    }
});

export default router;
