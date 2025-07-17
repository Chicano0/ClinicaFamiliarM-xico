const express = require('express');
const path = require('path');
const { MongoClient, ServerApiVersion } = require('mongodb');
const session = require('express-session');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const app = express();
const port = 3000;

const uri = "mongodb+srv://baenagaymer:molotov18@pacientes.ueptauh.mongodb.net/?retryWrites=true&w=majority&appName=pacientes";

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Configuración del transportador de correo
const transporter = nodemailer.createTransport({

    service: 'gmail',
    auth: {
        user: 'soporteverifiacion@gmail.com',
        pass: 'pxdrpuoozmaxvmko'
    }
});

// Función para generar código de verificación
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Función para enviar correo de verificación de registro
async function sendVerificationEmail(email, code, name) {
    const mailOptions = {
        from: 'soporteverifiacion@gmail.com',
        to: email,
        subject: 'Verificación de Cuenta - Clínica Familiar México',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #000000 0%, #000000 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="margin: 0; font-size: 24px;">⚕️ Clínica Familiar México</h1>
                    <p style="margin: 10px 0 0 0; font-size: 16px;">Verificación de Cuenta</p>
                </div>
                
                <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #2d3748; margin-bottom: 20px;">¡Hola ${name}!</h2>
                    
                    <p style="color: #4a5568; line-height: 1.6; margin-bottom: 25px;">
                        Gracias por registrarte en nuestra plataforma. Para completar tu registro y activar tu cuenta, necesitamos verificar tu correo electrónico.
                    </p>
                    
                    <div style="background: #f7fafc; border: 2px solid #3182ce; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
                        <p style="color: #2d3748; margin-bottom: 10px; font-weight: 600;">Tu código de verificación es:</p>
                        <div style="font-size: 32px; font-weight: bold; color: #3182ce; letter-spacing: 3px; font-family: monospace;">
                            ${code}
                        </div>
                    </div>
                    
                    <p style="color: #4a5568; line-height: 1.6; margin-bottom: 20px;">
                        Este código expirará en <strong>10 minutos</strong>. Si no solicitaste este registro, puedes ignorar este correo.
                    </p>
                    
                    <div style="background: #f0fff4; border: 1px solid #9ae6b4; border-radius: 8px; padding: 15px; margin: 20px 0;">
                        <p style="color: #22543d; margin: 0; font-size: 14px;">
                            🔒 Por tu seguridad, nunca compartas este código con nadie.
                        </p>
                    </div>
                    
                    <p style="color: #718096; font-size: 14px; margin-top: 30px;">
                        Si tienes problemas, contacta nuestro soporte técnico.
                    </p>
                </div>
                
                <div style="text-align: center; padding: 20px; color: #718096; font-size: 12px;">
                    <p>© 2025 Clínica Familiar México. Todos los derechos reservados.</p>
                </div>
            </div>
        `
    };
    
    try {
        await transporter.sendMail(mailOptions);
        console.log('Correo de verificación enviado exitosamente a:', email);
        return true;
    } catch (error) {
        console.error('Error al enviar correo de verificación:', error);
        return false;
    }
}

// Función para enviar correo con código para login (mensaje distinto)
async function sendLoginVerificationEmail(email, code, name) {
    const mailOptions = {
        from: 'soporteverifiacion@gmail.com',
        to: email,
        subject: 'Código de Autenticación - Clínica Familiar México',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #000000 0%, #000000 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="margin: 0; font-size: 24px;">⚕️ Clínica Familiar México</h1>
                    <p style="margin: 10px 0 0 0; font-size: 16px;">Código de Autenticación</p>
                </div>
                
                <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #2d3748; margin-bottom: 20px;">¡Hola ${name}!</h2>
                    
                    <p style="color: #4a5568; line-height: 1.6; margin-bottom: 25px;">
                        Este es tu código para autenticarse en la plataforma. <strong>No es el mismo código usado para registrarse.</strong> Por favor, ingrésalo para completar el inicio de sesión.
                    </p>
                    
                    <div style="background: #f7fafc; border: 2px solid #3182ce; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
                        <p style="color: #2d3748; margin-bottom: 10px; font-weight: 600;">Tu código de autenticación es:</p>
                        <div style="font-size: 32px; font-weight: bold; color: #3182ce; letter-spacing: 3px; font-family: monospace;">
                            ${code}
                        </div>
                    </div>
                    
                    <p style="color: #4a5568; line-height: 1.6; margin-bottom: 20px;">
                        Este código expirará en <strong>10 minutos</strong>. Si no solicitaste este inicio de sesión, puedes ignorar este correo.
                    </p>
                    
                    <div style="background: #f0fff4; border: 1px solid #9ae6b4; border-radius: 8px; padding: 15px; margin: 20px 0;">
                        <p style="color: #22543d; margin: 0; font-size: 14px;">
                            🔒 Por tu seguridad, nunca compartas este código con nadie.
                        </p>
                    </div>
                    
                    <p style="color: #718096; font-size: 14px; margin-top: 30px;">
                        Si tienes problemas, contacta nuestro soporte técnico.
                    </p>
                </div>
                
                <div style="text-align: center; padding: 20px; color: #718096; font-size: 12px;">
                    <p>© 2025 Clínica Familiar México. Todos los derechos reservados.</p>
                </div>
            </div>
        `
    };
    
    try {
        await transporter.sendMail(mailOptions);
        console.log('Correo de autenticación enviado exitosamente a:', email);
        return true;
    } catch (error) {
        console.error('Error al enviar correo de autenticación:', error);
        return false;
    }
}

// Conexión a MongoDB
async function connectToMongo() {
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("Conexión exitosa a MongoDB!");
    } catch (error) {
        console.error("Error al conectar a MongoDB Atlas:", error);
    }
}

connectToMongo();

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuración de sesión
app.use(session({
    secret: 'tu_secreto_muy_seguro_y_largo_aqui',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 24 horas
        httpOnly: true,
        secure: false,
        sameSite: 'strict'
    }
}));

// Middleware de autenticación
function requireAuth(req, res, next) {
    if (req.session && req.session.username) {
        return next();
    }
    if (req.originalUrl.includes('/citas.html') || req.originalUrl.includes('/info.html')) {
        return res.redirect('/login.html?error=session');
    }
    res.redirect('/?error=auth&message=' + encodeURIComponent('Por favor, inicia sesión para acceder.'));
}

// Rutas públicas
app.get('/', (req, res) => {
    if (req.session.username) {
        return res.redirect('/citas.html');
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/register.html', (req, res) => {
    if (req.session.username) {
        return res.redirect('/citas.html');
    }
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/login.html', (req, res) => {
    if (req.session.username) {
        return res.redirect('/citas.html');
    }
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/verificar.html', (req, res) => {
    if (!req.session.pendingUser) {
        return res.redirect('/register.html?error=session_expired');
    }
    res.sendFile(path.join(__dirname, 'public', 'verificar.html'));
});

// Página para ingresar código en login
app.get('/authenticatorlogin.html', (req, res) => {
    if (!req.session.loginPendingUser) {
        return res.redirect('/login.html?error=sin_login');
    }
    res.sendFile(path.join(__dirname, 'public', 'authenticatorlogin.html'));
});

// Rutas protegidas
app.get('/citas.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'citas.html'));
});

app.get('/info.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'info.html'));
});

// API Endpoints
app.get('/api/mis-citas', requireAuth, async (req, res) => {
    const username = req.session.username;

    try {
        const database = client.db("pacientes");
        const citasCollection = database.collection("citas");
        const userCitas = await citasCollection.find({ username: username }).toArray();
        res.json(userCitas);
    } catch (error) {
        console.error("Error al obtener citas del usuario:", error);
        res.status(500).json({ message: 'Error interno del servidor al obtener citas.' });
    }
});

// Sistema de login con verificación por código
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const database = client.db("pacientes");
        const usersCollection = database.collection("users");
        const user = await usersCollection.findOne({ username: username });

        if (user && await bcrypt.compare(password, user.password)) {
            // Verificar si la cuenta está verificada
            if (!user.verificado) {
                return res.redirect('/login.html?error=no_verificado&message=' + encodeURIComponent('Tu cuenta no ha sido verificada. Revisa tu correo electrónico.'));
            }

            // Generar código de autenticación para login
            const loginCode = generateVerificationCode();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

            // Guardar en sesión temporal para validar después
            req.session.loginPendingUser = {
                username: user.username,
                email: user.correo,
                code: loginCode,
                expiresAt: expiresAt,
                nombre_completo: user.nombre_completo
            };

            // Enviar código al correo usando la función con mensaje distinto
            const emailSent = await sendLoginVerificationEmail(user.correo, loginCode, user.nombre_completo);
            if (!emailSent) {
                return res.redirect('/login.html?error=email&message=' + encodeURIComponent('Error al enviar el código. Inténtalo de nuevo.'));
            }

            // Redirigir a la página para ingresar código
            return res.redirect('/authenticatorlogin.html?message=' + encodeURIComponent('Código enviado a tu correo.'));
        } else {
            return res.redirect('/login.html?error=credenciales&message=' + encodeURIComponent('Usuario o contraseña incorrectos.'));
        }
    } catch (error) {
        console.error("Error durante el proceso de login:", error);
        return res.redirect('/login.html?error=servidor&message=' + encodeURIComponent('Error interno del servidor.'));
    }
});

// Endpoint para verificar el código de login
app.post('/verify-login-code', (req, res) => {
    const { code } = req.body;

    if (!req.session.loginPendingUser) {
        return res.json({ success: false, message: 'Sesión expirada. Por favor inicia sesión nuevamente.' });
    }

    const pending = req.session.loginPendingUser;

    if (pending.expiresAt < new Date()) {
        delete req.session.loginPendingUser;
        return res.json({ success: false, message: 'Código expirado. Por favor inicia sesión nuevamente.' });
    }

    if (code === pending.code) {
        // Código correcto: crear sesión definitiva
        req.session.username = pending.username;
        delete req.session.loginPendingUser;
        return res.json({ success: true, message: 'Login exitoso.', redirect: '/citas.html' });
    } else {
        return res.json({ success: false, message: 'Código incorrecto.' });
    }
});

// NUEVA RUTA PARA REENVIAR CÓDIGO DE LOGIN
app.post('/resend-login-code', async (req, res) => {
    if (!req.session.loginPendingUser) {
        return res.status(400).json({ success: false, message: 'No hay sesión de login pendiente.' });
    }

    try {
        const pending = req.session.loginPendingUser;
        // Generar nuevo código
        const newCode = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

        // Actualizar sesión
        req.session.loginPendingUser.code = newCode;
        req.session.loginPendingUser.expiresAt = expiresAt;

        // Enviar correo con nuevo código
        const emailSent = await sendLoginVerificationEmail(pending.email, newCode, pending.nombre_completo);

        if (!emailSent) {
            return res.status(500).json({ success: false, message: 'Error al enviar el código.' });
        }

        return res.json({ success: true, message: 'Nuevo código enviado a tu correo.' });
    } catch (error) {
        console.error('Error reenviando código de login:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// Validaciones para el registro
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
        .isLength({ min: 18, max: 18 }).withMessage('CURP debe tener 18 caracteres'),
    body('telefono')
        .trim()
        .notEmpty().withMessage('Teléfono obligatorio')
        .matches(/^[0-9]{10}$/).withMessage('Teléfono debe tener 10 dígitos'),
    body('username')
        .trim()
        .notEmpty().withMessage('Username obligatorio')
        .isLength({ min: 4, max: 20 }).withMessage('Username debe tener entre 4 y 20 caracteres')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username solo puede tener letras, números y guiones bajos'),
    body('password')
        .notEmpty().withMessage('Contraseña obligatoria')
        .isLength({ min: 6 }).withMessage('Contraseña mínima de 6 caracteres')
];

// Sistema de registro con verificación por email
app.post('/register', validarRegistro, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg).join(', ');
        return res.redirect(`/register.html?error=validacion&message=${encodeURIComponent(errorMessages)}`);
    }

    const { correo, nombre_completo, curp, telefono, username, password } = req.body;

    try {
        const database = client.db("pacientes");
        const usersCollection = database.collection("users");
        const tempUsersCollection = database.collection("temp_users");

        // Verificar si usuario o correo ya existen
        const existingUser = await usersCollection.findOne({ 
            $or: [{ username: username }, { correo: correo }, { curp: curp }] 
        });
        
        if (existingUser) {
            let message = 'El usuario ya existe';
            if (existingUser.correo === correo) message = 'El correo ya está registrado';
            else if (existingUser.curp === curp) message = 'La CURP ya está registrada';
            return res.redirect(`/register.html?error=existente&message=${encodeURIComponent(message)}`);
        }

        // Generar código de verificación
        const code = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

        // Guardar usuario temporal
        await tempUsersCollection.insertOne({
            correo,
            nombre_completo,
            curp,
            telefono,
            username,
            password: await bcrypt.hash(password, 10),
            verificado: false,
            code,
            expiresAt
        });

        // Guardar en sesión temporal para verificar
        req.session.pendingUser = { correo, nombre_completo, code, expiresAt };

        // Enviar correo
        const emailSent = await sendVerificationEmail(correo, code, nombre_completo);

        if (!emailSent) {
            return res.redirect('/register.html?error=email&message=' + encodeURIComponent('Error al enviar correo.'));
        }

        res.redirect('/verificar.html?message=' + encodeURIComponent('Código enviado a tu correo.'));
    } catch (error) {
        console.error('Error en registro:', error);
        res.redirect('/register.html?error=servidor&message=' + encodeURIComponent('Error interno del servidor.'));
    }
});

// Endpoint para verificar código en registro
app.post('/verify-code', async (req, res) => {
    const { code } = req.body;

    if (!req.session.pendingUser) {
        return res.json({ success: false, message: 'Sesión expirada. Por favor regístrate nuevamente.' });
    }

    const pending = req.session.pendingUser;

    if (pending.expiresAt < new Date()) {
        delete req.session.pendingUser;
        return res.json({ success: false, message: 'Código expirado. Por favor regístrate nuevamente.' });
    }

    if (code === pending.code) {
        // Mover usuario temporal a colección definitiva
        try {
            const database = client.db("pacientes");
            const usersCollection = database.collection("users");
            const tempUsersCollection = database.collection("temp_users");

            const tempUser = await tempUsersCollection.findOne({ correo: pending.correo });
            if (!tempUser) {
                return res.json({ success: false, message: 'Usuario temporal no encontrado.' });
            }

            // Insertar en users
            await usersCollection.insertOne({
                correo: tempUser.correo,
                nombre_completo: tempUser.nombre_completo,
                curp: tempUser.curp,
                telefono: tempUser.telefono,
                username: tempUser.username,
                password: tempUser.password,
                verificado: true,
                createdAt: new Date()
            });

            // Eliminar de temp_users
            await tempUsersCollection.deleteOne({ correo: pending.correo });

            // Limpiar sesión
            delete req.session.pendingUser;

            return res.json({ success: true, message: 'Cuenta verificada exitosamente.' });
        } catch (error) {
            console.error('Error verificando cuenta:', error);
            return res.json({ success: false, message: 'Error interno del servidor.' });
        }
    } else {
        return res.json({ success: false, message: 'Código incorrecto.' });
    }
});

// Ruta para cerrar sesión
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Ruta para agendar cita (protegida con requireAuth)
app.post('/agendar-cita', requireAuth, async (req, res) => {
    const { tipo_cita, fecha_cita, hora_cita, doctor, notas } = req.body;
    const username = req.session.username;

    try {
        const nuevaCita = {
            username,
            tipo_cita,
            fecha_cita,
            hora_cita,
            doctor: doctor || "No especificado",
            notas: notas || "Sin notas",
            createdAt: new Date()
        };

        await client.db("pacientes").collection("citas").insertOne(nuevaCita);
        res.redirect('/citas.html?success=true&message=' + encodeURIComponent('Tu cita ha sido agendada.'));
    } catch (error) {
        console.error("Error al agendar cita:", error);
        res.redirect('/citas.html?error=true&message=' + encodeURIComponent('No se pudo agendar tu cita.'));
    }
});

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});

// Cerrar conexión MongoDB al cerrar el servidor
process.on('SIGINT', async () => {
    console.log('Cerrando conexión a MongoDB...');
    if (client) await client.close();
    console.log('Conexión cerrada.');
    process.exit(0);
});