const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

// Configuración de MongoDB
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/clinicafamil";
const client = new MongoClient(uri);

// Validaciones (exportadas para usarse en index.js)
const registerValidations = [
  body('correo').isEmail().normalizeEmail(),
  body('nombre_completo').trim().escape().isLength({ min: 5 }),
  body('curp').trim().isLength({ min: 18, max: 18 })
    .matches(/^[A-Z]{4}[0-9]{6}[H,M][A-Z]{5}[0-9]{2}$/),
  body('telefono').trim().isMobilePhone('es-MX'),
  body('username').trim().isAlphanumeric().isLength({ min: 4, max: 20 }),
  body('password').isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/)
];

// Controlador de registro
const registerController = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).redirect('/register.html?error=validation');
  }

  try {
    await client.connect();
    const database = client.db(process.env.DB_NAME || "pacientes");
    const existingUser = await database.collection("users").findOne({
      $or: [{ username: req.body.username }, { correo: req.body.correo }]
    });

    if (existingUser) {
      return res.redirect('/register.html?error=exists');
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 12);
    await database.collection("users").insertOne({
      ...req.body,
      password: hashedPassword,
      createdAt: new Date()
    });

    res.redirect('/register.html?success=true');
  } catch (error) {
    console.error("Error en registro:", error);
    res.status(500).redirect('/register.html?error=server');
  } finally {
    await client.close();
  }
};

module.exports = {
  registerValidations,
  registerController
};