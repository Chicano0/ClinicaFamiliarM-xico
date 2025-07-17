const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/clinicafamil";
let client;
let db;

async function connectToMongo() {
  try {
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      retryWrites: true,
      retryReads: true
    });
    
    await client.connect();
    db = client.db(process.env.DB_NAME || "pacientes");
    console.log("Conexión exitosa a MongoDB");
    return db;
  } catch (error) {
    console.error("Error de conexión a MongoDB:", error);
    process.exit(1);
  }
}

function getDb() {
  if (!db) throw new Error('No hay conexión a la base de datos');
  return db;
}

async function closeConnection() {
  if (client) {
    await client.close();
  }
}

module.exports = {
  connectToMongo,
  getDb,
  closeConnection
};