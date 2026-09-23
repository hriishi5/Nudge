import app from './src/app.js';
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
===========================================================
🚀 NUDGE COMPLIANCE SERVER ACTIVE
📡 Listening on port: ${PORT}
🇮🇳 Section 43B(h) MSME Statutory Engine: Online
🛡️  Row Level Security & Tenancy Isolation: Enforced
===========================================================
  `);
});
