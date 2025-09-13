import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
// Serve static frontend from this directory so frontend and API share origin
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(__dirname));

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sih';
const client = new MongoClient(mongoUri);
let db;

async function init() {
  if (!db) {
    await client.connect();
    db = client.db();
  }
}

// Middleware to require Firebase UID header
function requireAuth(req, res, next) {
  const uid = req.header('x-user-id');
  if (!uid) return res.status(401).json({ error: 'Missing x-user-id' });
  req.userId = uid;
  next();
}

// Save or update profile
app.post('/api/profile', requireAuth, async (req, res) => {
  await init();
  const { name, email, district } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });
  await db.collection('farmers').updateOne(
    { _id: req.userId },
    { $set: { name, email, district, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );
  res.json({ ok: true });
});

// Read profile
app.get('/api/profile', requireAuth, async (req, res) => {
  await init();
  const doc = await db.collection('farmers').findOne({ _id: req.userId });
  res.json(doc || {});
});

// Add crop
app.post('/api/crops', requireAuth, async (req, res) => {
  await init();
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const result = await db.collection('crops').insertOne({
    userId: req.userId,
    name,
    createdAt: new Date()
  });
  res.json({ id: result.insertedId });
});

// List crops
app.get('/api/crops', requireAuth, async (req, res) => {
  await init();
  const items = await db
    .collection('crops')
    .find({ userId: req.userId })
    .sort({ createdAt: -1 })
    .toArray();
  res.json(items.map(({ _id, ...rest }) => ({ id: _id.toString(), ...rest })));
});

const port = process.env.PORT || 5173;
app.listen(port, () => console.log(`API running on http://localhost:${port}`));



