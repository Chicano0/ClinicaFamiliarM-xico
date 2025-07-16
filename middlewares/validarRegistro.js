const { body, validationResult } = require('express-validator');

const validarRegistro = [
  body('nombre_completo')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ min: 2, max: 100 }).withMessage('Nombre debe tener entre 2 y 100 caracteres'),

  body('correo')
    .trim()
    .notEmpty().withMessage('Correo es obligatorio')
    .isEmail().withMessage('Formato de correo inválido'),

  body('curp')
    .trim()
    .notEmpty().withMessage('CURP obligatorio')
    .matches(/^[A-Z]{4}[0-9]{6}[HM][A-Z]{2}[A-Z]{3}[0-9A-Z]{2}$/).withMessage('CURP inválido'),

  body('telefono')
    .trim()
    .notEmpty().withMessage('Teléfono obligatorio')
    .matches(/^[0-9]{10}$/).withMessage('Teléfono debe tener 10 dígitos'),

  body('username')
    .trim()
    .notEmpty().withMessage('Username obligatorio')
    .isLength({ min: 4, max: 20 }).withMessage('Username debe tener entre 4 y 20 caracteres')
    .matches(/^[a-zA-Z0-9]+$/).withMessage('Username solo puede tener letras y números'),

  body('password')
    .notEmpty().withMessage('Contraseña obligatoria')
    .isLength({ min: 8 }).withMessage('Contraseña mínima de 8 caracteres')
    .matches(/[a-z]/).withMessage('Debe tener minúsculas')
    .matches(/[A-Z]/).withMessage('Debe tener mayúsculas')
    .matches(/[0-9]/).withMessage('Debe tener números'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Aquí puedes manejar errores como quieras:
      // Por ejemplo, mandar a la página de registro con errores por query params
      const errorMsgs = errors.array().map(e => e.msg).join(', ');
      return res.redirect('/register.html?error=true&message=' + encodeURIComponent(errorMsgs));
    }
    next();
  }
];

module.exports = validarRegistro;
