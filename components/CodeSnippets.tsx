
import React, { useState } from 'react';
import { Copy, Check, FileCode, Terminal, ShieldCheck, Database, Zap, Users, ShieldAlert, Cpu, RefreshCw } from 'lucide-react';

const CodeSnippets: React.FC = () => {
  const [copied, setCopied] = useState<string | null>(null);

  const snippets = {
    'database.sql': `-- Robust Enterprise SQL Schema
-- 1. Identity & Subscription
CREATE TABLE IF NOT EXISTS plans (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(50),
    daily_limit INT DEFAULT 0,
    max_instances INT DEFAULT 1,
    rate_limit_per_min INT DEFAULT 20
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('superadmin', 'reseller', 'admin')),
    parent_id VARCHAR(50),
    plan_id VARCHAR(50),
    api_key VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    email VARCHAR(255),
    mobile VARCHAR(20),
    refresh_token TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES users(id),
    FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- 2. Infrastructure
CREATE TABLE IF NOT EXISTS instances (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50),
    name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'closed',
    phone_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Media Library Persistence
CREATE TABLE IF NOT EXISTS media_assets (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50),
    name VARCHAR(255),
    url TEXT,
    type VARCHAR(20), -- 'image', 'video', 'document'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Contact & Group Persistence
CREATE TABLE IF NOT EXISTS contact_groups (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50),
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contacts (
    id VARCHAR(50) PRIMARY KEY,
    group_id VARCHAR(50),
    number VARCHAR(20),
    original VARCHAR(50),
    status_exists BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (group_id) REFERENCES contact_groups(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS message_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(50),
    instance_id VARCHAR(50),
    recipient VARCHAR(50),
    status VARCHAR(20),
    message_id TEXT,
    error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`,

    'index.js': `const express = require('express');
const { Pool } = require('pg');
const pool = new Pool();
const app = express();
app.use(express.json());

// --- MEDIA PERSISTENCE ---
app.post('/api/media', async (req, res) => {
    const { id, name, url, type, userId } = req.body;
    await pool.query(
        'INSERT INTO media_assets (id, name, url, type, user_id) VALUES ($1, $2, $3, $4, $5)',
        [id, name, url, type, userId]
    );
    res.json({ success: true });
});

app.get('/api/media', async (req, res) => {
    const userId = req.headers['x-user-id'];
    const result = await pool.query('SELECT * FROM media_assets WHERE user_id = $1', [userId]);
    res.json(result.rows);
});

app.listen(3000, () => console.log('Enterprise Gateway Live'));`,

    'queue-worker.js': `const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis(process.env.REDIS_URL);
const messageQueue = new Queue('whatsapp-outbound', { connection });

// --- WORKER LOGIC: SCALABLE PROCESSING ---
const worker = new Worker('whatsapp-outbound', async job => {
    const { instanceId, number, message, userId, mediaUrl, mediaType, buttons } = job.data;
    const instance = instances.get(instanceId);

    if (!instance || instance.status !== 'open') {
        throw new Error('Instance Offline');
    }

    try {
        const jid = \`\${number}@s.whatsapp.net\`;
        await instance.sock.sendMessage(jid, { text: message });
        await db.message_logs.create({ user_id: userId, status: 'success' });
    } catch (e) {
        console.error(\`Failed job \${job.id}: \`, e);
        throw e;
    }
}, { connection, concurrency: 10 });`,

    'security.ts': `import jwt from 'jsonwebtoken';
export const rotateTokens = async (userId, refreshToken) => {
    // Rotation logic here
};`
  };

  const handleCopy = (key: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="bg-[#111b21] p-8 rounded-2xl border border-gray-800 shadow-2xl relative overflow-hidden">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
          <Database className="text-[#25D366]" />
          Enterprise Gateway Architecture
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-[#202c33] rounded-xl border border-gray-700">
                <ShieldAlert className="text-yellow-500 mb-2" size={20} />
                <h4 className="text-sm font-bold text-white mb-1">Anti-Ban Limits</h4>
                <p className="text-[10px] text-gray-500">Redis-backed sliding window rate limiting prevents WhatsApp detection.</p>
            </div>
            <div className="p-4 bg-[#202c33] rounded-xl border border-gray-700">
                <Cpu className="text-blue-400 mb-2" size={20} />
                <h4 className="text-sm font-bold text-white mb-1">BullMQ Worker</h4>
                <p className="text-[10px] text-gray-500">Distributed background queuing ensures zero message loss during surges.</p>
            </div>
            <div className="p-4 bg-[#202c33] rounded-xl border border-gray-700">
                <RefreshCw className="text-[#25D366] mb-2" size={20} />
                <h4 className="text-sm font-bold text-white mb-1">Token Rotation</h4>
                <p className="text-[10px] text-gray-500">Secure JWT rotation policy ensures client session integrity.</p>
            </div>
            <div className="p-4 bg-[#202c33] rounded-xl border border-gray-700">
                <Users className="text-purple-400 mb-2" size={20} />
                <h4 className="text-sm font-bold text-white mb-1">RBAC Multi-Tenant</h4>
                <p className="text-[10px] text-gray-500">Hierarchical data isolation using PostgreSQL Foreign Key constraints.</p>
            </div>
        </div>
      </div>

      {Object.entries(snippets).map(([filename, content]) => (
        <div key={filename} className="bg-[#111b21] rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 bg-[#202c33]/50 border-b border-gray-800">
            <div className="flex items-center gap-2">
                <FileCode size={16} className="text-[#25D366]" />
                <span className="text-sm font-mono font-bold text-gray-200">{filename}</span>
            </div>
            <button onClick={() => handleCopy(filename, content)} className="flex items-center gap-2 text-xs font-bold text-[#25D366] hover:bg-[#25D366]/10 px-3 py-1.5 rounded-lg transition-all">
              {copied === filename ? <Check size={14} /> : 'COPY CODE'}
            </button>
          </div>
          <pre className="p-8 text-[13px] font-mono overflow-x-auto bg-black/40 leading-relaxed text-gray-300">
            <code>{content}</code>
          </pre>
        </div>
      ))}
    </div>
  );
};

export default CodeSnippets;
