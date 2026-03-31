const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const uri = process.env.MONGODB_URI;
const SECRET = process.env.JWT_SECRET;

let client;

async function db() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  return client.db("ibugbe");
}

function auth(req) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

module.exports = async (req, res) => {
  const database = await db();
  const contacts = database.collection("contacts");
  const admins = database.collection("admins");

  // Setup admin (run once)
  if (req.url === '/api/setup') {
    const hash = await bcrypt.hash("admin123", 10);
    await admins.insertOne({ username: "admin", password: hash });
    return res.json({ done: true });
  }

  // Login
  if (req.url === '/api/login') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      const { username, password } = JSON.parse(body);
      const user = await admins.findOne({ username });

      if (user && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ username }, SECRET, { expiresIn: '2h' });
        return res.json({ token });
      }
      res.status(401).json({ error: "Unauthorized" });
    });
    return;
  }

  // Save contact
  if (req.method === 'POST' && req.url === '/api/contact') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      const data = JSON.parse(body);
      await contacts.insertOne(data);
      res.json({ success: true });
    });
    return;
  }

  // Stats
  if (req.url === '/api/stats') {
    const total = await contacts.countDocuments();
    const latest = await contacts.find().sort({ _id: -1 }).limit(5).toArray();
    return res.json({ total, latest });
  }

  // Admin dashboard
  if (req.url === '/api/admin') {
    const user = auth(req);
    if (!user) return res.status(403).end();

    const total = await contacts.countDocuments();
    const countries = await contacts.aggregate([
      { $group: { _id: "$country", count: { $sum: 1 } } }
    ]).toArray();

    return res.json({ total, countries });
  }

  // VCF download
  if (req.url === '/api/vcf') {
    const user = auth(req);
    if (!user) return res.status(403).end();

    const all = await contacts.find().toArray();
    let vcf = '';

    all.forEach(c => {
      vcf += `BEGIN:VCARD\nFN:${c.name}\nTEL:${c.phone}\nEND:VCARD\n`;
    });

    res.setHeader('Content-Disposition', 'attachment; filename=contacts.vcf');
    res.send(vcf);
    return;
  }

  res.end("API OK");
};