const express = require("express");
const router = express.Router();
const pool = require("../db");
const nodemailer = require('nodemailer');
const bcrypt = require("bcrypt");

// GET all users
router.get("/", async (req, res) => {
	try {
		const { rows } = await pool.query("SELECT * FROM users");
		res.json(rows);
	} catch (error) {
		console.error(error.message);
		res.status(500).send("Server Error");
	}
});

// GET a single user by id
router.get("/:id", async (req, res) => {
	try {
		const { id } = req.params;
		const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [
			id,
		]);
		if (rows.length === 0) {
			return res.status(404).send("User not found");
		}
		res.json(rows[0]);
	} catch (error) {
		console.error(error.message);
		res.status(500).send("Server Error");
	}
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'msr.brand20@gmail.com',
        pass: msr12345,
    }
});

const sendEmail = async (to, subject, text) => {
    const mailOptions = {
        from: 'msr.brand20@gmail.com',
        to: to,
        subject: subject,
        text: text
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

// POST a new user
router.post("/", async (req, res) => {
    try {
        const { username, email, role } = req.body;
        const password = generatePassword(); // Generating a random password

        // Vérifier si l'email existe déjà
        const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [
            email,
        ]);
        if (rows.length > 0) {
            return res.status(400).send("Email already exists");
        }

        // Hasher le mot de passe
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Insérer le nouvel utilisateur dans la base de données
        const newUserRows = await pool.query(
            "INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *",
            [username, email, password_hash, role],
        );

        // Send email with the generated password to the user's provided email address
        await sendEmail(email, 'Nouveau Mot de Passe', `Votre mot de passe est : ${password}`);

        res.status(201).json(newUserRows.rows[0]);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error");
    }
});

// PUT (update) a user by id
router.put("/:id", async (req, res) => {
	try {
		const { id } = req.params;
		const { username, email, password_hash, role } = req.body;
		const { rows } = await pool.query(
			"UPDATE users SET username = $1, email = $2, password_hash = $3, role = $4 WHERE id = $5 RETURNING *",
			[username, email, password_hash, role, id],
		);
		if (rows.length === 0) {
			return res.status(404).send("User not found");
		}
		res.json(rows[0]);
	} catch (error) {
		console.error(error.message);
		res.status(500).send("Server Error");
	}
});

// DELETE a user by id
router.delete("/:id", async (req, res) => {
	try {
		const { id } = req.params;
		const { rows } = await pool.query(
			"DELETE FROM users WHERE id = $1 RETURNING *",
			[id],
		);
		if (rows.length === 0) {
			return res.status(404).send("User not found");
		}
		res.json(rows[0]);
	} catch (error) {
		console.error(error.message);
		res.status(500).send("Server Error");
	}
});

module.exports = router;
