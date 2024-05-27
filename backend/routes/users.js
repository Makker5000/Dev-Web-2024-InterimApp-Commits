require("dotenv").config();
const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require("bcrypt");
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_TOKEN);

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

// POST a new user
router.post("/", async (req, res) => {
	try {
		const { username, email, role, enterprise_id } = req.body;

		// Vérifier si l'email existe déjà
		const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [
			email,
		]);
		if (rows.length > 0) {
			return res.status(400).send("Email already exists");
		}

		const password = Math.random().toString(36).slice(2, 12); // Generating a random password
		// Hasher le mot de passe
		const saltRounds = 10;
		const password_hash = await bcrypt.hash(password, saltRounds);

		// Insérer le nouvel utilisateur dans la base de données
		const newUserRows = await pool.query(
			"INSERT INTO users (username, email, password_hash, role, enterprise_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
			[username, email, password_hash, role, enterprise_id],
		);

		// Send email with the generated password to the user's provided email address
		const { data, error } = await resend.emails.send({
			from: "Proxideal <noreply@ephec.kirato.dev>",
			to: [email],
			subject: "Nouveau Mot de Passe",
			html: `Votre mot de passe est : <strong>${password}</strong>`,
		});

		if (error) {
			console.log(res.status(400).json({ error }));
		}

		// res.status(200).json({ data });

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

    // Supprimer les enregistrements dans les tables dépendantes
    await pool.query("DELETE FROM user_info WHERE user_id = $1", [id]);
    // Ajoutez ici d'autres suppressions similaires pour les autres tables dépendantes si nécessaire

    // Supprimer l'utilisateur
    const { rows } = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING *",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).send("User not found");
    }
    res.status(204).send();
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
