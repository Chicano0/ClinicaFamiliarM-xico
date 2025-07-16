const express = require('express');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = 3000;


app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.use(session({
    secret: 'tu_clave_secreta_segura',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60,
        httpOnly: true
    }
}));


const uri = "mongodb+srv://baenagaymer:molotov18@pacientes.ueptauh.mongodb.net/?retryWrites=true&w=majority&appName=pacientes";
const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

async function connectToMongo() {
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("Conectado a MongoDB Atlas correctamente.");
    } catch (error) {
        console.error("Error al conectar a MongoDB Atlas:", error);
    }
}
connectToMongo();


function protegerRuta(req, res, next) {
    if (req.session && req.session.usuario) {
        res.setHeader('Cache-Control', 'no-store');
        return next();
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.redirect('/login.html');
}

function isAuthenticated(req, res, next) {
    if (req.session && req.session.username) {
        return next();
    }
    res.redirect('/?error=auth&message=' + encodeURIComponent('Por favor, inicia sesión para acceder.'));
}


app.get('/citas.html', protegerRuta, (req, res) => {
    res.sendFile(__dirname + '/public/citas.html');
});

app.get('/info.html', protegerRuta, (req, res) => {
    res.sendFile(__dirname + '/public/info.html');
});


app.get('/', (req, res) => {
    if (req.session.username) return res.redirect('/citas.html');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/register.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});


app.get('/api/mis-citas', isAuthenticated, async (req, res) => {
    try {
        const citas = await client.db("pacientes").collection("citas")
            .find({ username: req.session.username }).toArray();
        res.json(citas);
    } catch (error) {
        console.error("Error al obtener citas del usuario:", error);
        res.status(500).json({ message: 'Error interno del servidor al obtener citas.' });
    }
});


app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await client.db("pacientes").collection("users").findOne({ username });

        if (user) {
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                req.session.username = username;
                req.session.usuario = { id: user._id, username: user.username };
                return res.redirect('/citas.html');
            }
        }
        
        return res.redirect('/login.html?error=true&message=' + encodeURIComponent('Usuario o contraseña incorrectos.'));
    } catch (error) {
        console.error("Error en login:", error);
        res.redirect('/login.html?error=true&message=' + encodeURIComponent('Error interno del servidor.'));
    }
});


app.post('/register', async (req, res) => {
    const { correo, nombre_completo, curp, telefono, username, password } = req.body;

    try {
        const usersCollection = client.db("pacientes").collection("users");
        const existente = await usersCollection.findOne({ $or: [ { username }, { correo }, { curp } ] });
        if (existente) {
            return res.redirect('/register.html?error=true&message=' + encodeURIComponent('El usuario, correo o CURP ya está registrado.'));
        }

        // Hash de la contraseña con bcrypt
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const nuevoUsuario = { 
            correo, 
            nombre_completo, 
            curp, 
            telefono, 
            username, 
            password: hashedPassword 
        };
        
        await usersCollection.insertOne(nuevoUsuario);
        res.redirect('/register.html?success=true');

    } catch (error) {
        console.error("Error en registro:", error);
        res.redirect('/register.html?error=true&message=' + encodeURIComponent('Error interno del servidor.'));
    }
});


app.post('/agendar-cita', isAuthenticated, async (req, res) => {
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


app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
            return res.redirect('/');
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});


app.use(express.static(path.join(__dirname, 'public')));


app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});


app.listen(port, () => {
    console.log(`Servidor en http://localhost:${port}`);
});


process.on('SIGINT', async () => {
    console.log('Cerrando conexión a MongoDB...');
    if (client) await client.close();
    console.log('Conexión cerrada.');
    process.exit(0);
});