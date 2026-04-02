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
  try {
    const database = await db();
    const contacts = database.collection("contacts");
    const admins = database.collection("admins");

    // =========================
    // SETUP ADMIN
    // =========================
    if (req.url.startsWith('/api/setup')) {
      const exists = await admins.findOne({ username: "admin" });

      if (!exists) {
        const hash = await bcrypt.hash("admin123", 10);
        await admins.insertOne({ username: "admin", password: hash });
      }

      return res.json({ done: true });
    }

    // =========================
    // LOGIN
    // =========================
    if (req.url.startsWith('/api/login')) {
      let body = '';

      if (typeof req.body === "object") {
        body = req.body;
      } else {
        await new Promise(resolve => {
          req.on('data', c => body += c);
          req.on('end', resolve);
        });
        body = JSON.parse(body || "{}");
      }

      const { username, password } = body;
      const user = await admins.findOne({ username });

      if (user && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ username }, SECRET, { expiresIn: '2h' });
        return res.json({ token });
      }

      return res.status(401).json({ error: "Unauthorized" });
    }

    // =========================
    // Save contact (ANTI DOUBLON)
if (req.method === 'POST' && req.url === '/api/contact') {
  let body = '';

  req.on('data', c => body += c);

  req.on('end', async () => {
    try {
      const data = JSON.parse(body);

      // 🚫 CHECK DOUBLON
      const exists = await contacts.findOne({ phone: data.phone });

      if (exists) {
        return res.status(400).json({ error: "Number already exists" });
      }

      await contacts.insertOne({
        ...data,
        createdAt: new Date()
      });

      res.json({ success: true });

    } catch (err) {
      console.error("SAVE ERROR:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  return;
}

    // =========================
    // STATS
    // =========================
    if (req.url.startsWith('/api/stats')) {
  try {
    const total = await contacts.countDocuments();

    const latestRaw = await contacts
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    // 🔒 Nettoyage + sécurité
    const latest = latestRaw.map(c => ({
      phone: c.phone
        ? c.phone.slice(0, 5) + "******"
        : "hidden"
    }));

    return res.json({
      total,
      latest
    });

  } catch (err) {
    console.error("STATS ERROR:", err);
    return res.status(500).json({ error: "Stats failed" });
  }
}
    // =========================
    // ADMIN DASHBOARD
    // =========================
    if (req.url.startsWith('/api/admin')) {
      const user = auth(req);
      if (!user) return res.status(403).json({ error: "Forbidden" });

      const total = await contacts.countDocuments();

      const countries = await contacts.aggregate([
        { $group: { _id: "$country", count: { $sum: 1 } } }
      ]).toArray();

      return res.json({ total, countries });
    }

    // =========================
    // VCF DOWNLOAD
    // =========================
    if (req.url.startsWith('/api/vcf')) {
      const user = auth(req);
      if (!user) return res.status(403).json({ error: "Forbidden" });

      const all = await contacts.find().toArray();

      let vcf = '';

      all.forEach(c => {
        vcf += `BEGIN:VCARD\nVERSION:3.0\nFN:${c.name || ''}\nTEL:${c.phone || ''}\nEMAIL:${c.email || ''}\nEND:VCARD\n`;
      });

      res.setHeader('Content-Type', 'text/vcard');
      res.setHeader('Content-Disposition', 'attachment; filename=contacts.vcf');

      return res.send(vcf);
    }

    // =========================
    // DEFAULT
    // =========================
    res.status(200).json({ message: "API OK" });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};
