const fs = require('fs');
let code = fs.readFileSync('server.cjs', 'utf8');

const walletApis = `
app.get('/api/wallet/ledger', authenticate, async (req, res) => {
    try {
        const query = req.user.role === 'superadmin' && req.query.userId 
            ? 'SELECT * FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100'
            : 'SELECT * FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100';
            
        const userId = req.user.role === 'superadmin' && req.query.userId ? req.query.userId : req.user.id;
        
        const result = await pool.query(query, [userId]);
        const balanceRes = await pool.query('SELECT wallet_balance FROM users WHERE id = $1', [userId]);
        
        res.json({ 
            balance: balanceRes.rows.length > 0 ? parseFloat(balanceRes.rows[0].wallet_balance) : 0,
            ledger: result.rows 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/wallet/fund', authenticate, async (req, res) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Unauthorized' });
    const { userId, amount, description } = req.body;
    try {
        await pool.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [amount, userId]);
        await pool.query(
            'INSERT INTO wallet_transactions (user_id, amount, type, description, status) VALUES ($1, $2, $3, $4, $5)',
            [userId, amount, amount >= 0 ? 'credit' : 'debit', description || 'Manual Adjustment', 'completed']
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/wallet/settings', authenticate, async (req, res) => {
    try {
        const keys = ['baileys_credit_cost', 'meta_template_credit_cost', 'meta_regular_credit_cost'];
        const result = await pool.query('SELECT key, value FROM system_settings WHERE key = ANY($1)', [keys]);
        res.json({ settings: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/wallet/settings', authenticate, async (req, res) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Unauthorized' });
    const { settings } = req.body;
    try {
        for (const [key, value] of Object.entries(settings)) {
            await pool.query('UPDATE system_settings SET value = $1 WHERE key = $2', [value, key]);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
`;

code = code.replace("app.get('/api/billing/plans'", walletApis + "\napp.get('/api/billing/plans'");
fs.writeFileSync('server.cjs', code);
