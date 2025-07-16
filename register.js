const express = require('express');
const path = require('path');
const { MongoClient, ServerApiVersion } = require('mongodb');
const session = require('express-session');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
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

// Configuración de sesión mejorada
app.use(session({
    secret: 'tu_secreto_muy_seguro_y_largo_aqui',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
        secure: false, // Cambiar a true en producción con HTTPS
        sameSite: 'strict'
    }
}));

// Middleware de autenticación mejorado
function requireAuth(req, res, next) {
    if (req.session && req.session.username) {
        return next();
    }
    // Redirigir a login.html específicamente cuando se intente acceder a rutas protegidas
    if (req.originalUrl.includes('/citas.html') || req.originalUrl.includes('/info.html')) {
        return res.redirect('/login.html?error=session');
    }
    res.redirect('/?error=auth&message=' + encodeURIComponent('Por favor, inicia sesión para acceder.'));
}

// Ruta para login.html (nueva)
app.get('/login.html', (req, res) => {
    if (req.session.username) {
        return res.redirect('/citas.html');
    }
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Rutas públicas
app.get('/', (req, res) => {
    if (req.session.username) {
        return res.redirect('/citas.html');
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/register.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Rutas protegidas (requieren autenticación)
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

// Sistema de login mejorado
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const database = client.db("pacientes");
        const usersCollection = database.collection("users");
        const user = await usersCollection.findOne({ username: username });

        if (user && await bcrypt.compare(password, user.password)) {
            console.log('Login exitoso para:', username);
            req.session.username = username;
            
            // Redirigir a la página que intentaban acceder originalmente o a citas.html
            const redirectTo = req.session.returnTo || '/citas.html';
            delete req.session.returnTo;
            
            return res.redirect(redirectTo);
        } else {
            console.log('Login fallido para:', username);
            res.redirect('/login.html?error=credenciales');
        }
    } catch (error) {
        console.error("Error durante el proceso de login:", error);
        res.redirect('/login.html?error=servidor');
    }
});

// Sistema de registro con validaciones
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
        .matches(/[0-9]/).withMessage('Debe tener números')
];

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

        // Verificar si usuario o correo ya existen
        const existingUser = await usersCollection.findOne({ 
            $or: [{ username: username }, { correo: correo }, { curp: curp }] 
        });
        
        if (existingUser) {
            let message = 'El usuario ya existe';
            if (existingUser.correo === correo) message = 'El correo electrónico ya está registrado';
            if (existingUser.curp === curp) message = 'La CURP ya está registrada';
            
            return res.redirect(`/register.html?error=existente&message=${encodeURIComponent(message)}`);
        }

        // Hashear contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            correo,
            nombre_completo,
            curp,
            telefono,
            username,
            password: hashedPassword,
            createdAt: new Date()
        };

        await usersCollection.insertOne(newUser);
        res.redirect('/register.html?success=true');
    } catch (error) {
        console.error("Error durante el proceso de registro:", error);
        res.redirect('/register.html?error=servidor&message=Error interno del servidor');
    }
});

// Resto de tus endpoints y configuración...
app.post('/agendar-cita', requireAuth, async (req, res) => {
    const { tipo_cita, fecha_cita, hora_cita, doctor, notas } = req.body;
    const username = req.session.username;

    try {
        const database = client.db("pacientes");
        const citasCollection = database.collection("citas");

        const newAppointment = {
            username: username,
            tipo_cita,
            fecha_cita,
            hora_cita,
            doctor: doctor || "No especificado",
            notas: notas || "Sin notas",
            createdAt: new Date(),
            status: 'pendiente'
        };

        await citasCollection.insertOne(newAppointment);
        res.redirect('/citas.html?success=true');
    } catch (error) {
        console.error("Error al agendar cita:", error);
        res.redirect('/citas.html?error=true');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error al destruir la sesión:', err);
        }
        res.clearCookie('connect.sid');
        res.redirect('/login.html');
    });
});

// Middleware para archivos estáticos
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, path) => {
        if (path.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000');
        }
    }
}));

// Manejo de errores
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).sendFile(path.join(__dirname, 'public', '500.html'));
});

// Iniciar servidor
app.listen(port, () => {
    console.log(`Servidor de Express en http://localhost:${port}`);
});

process.on('SIGINT', async () => {
    await client.close();
    process.exit(0);
});