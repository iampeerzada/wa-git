const fs = require('fs');
let code = fs.readFileSync('server.cjs', 'utf8');

const cronAdd = `
cron.schedule('0 0 * * *', async () => {
    try {
        console.log('[Cron] Resetting daily limits...');
        await pool.query('UPDATE subscriptions SET messages_sent_today = 0');
    } catch (err) {
        console.error('[Cron Error] Resetting daily limits:', err.message);
    }
});

cron.schedule('0 0 1 * *', async () => {
    try {
        console.log('[Cron] Resetting monthly limits...');
        await pool.query('UPDATE subscriptions SET messages_sent_this_month = 0');
    } catch (err) {}
});

cron.schedule('0 0 1 1 *', async () => {
    try {
        console.log('[Cron] Resetting yearly limits...');
        await pool.query('UPDATE subscriptions SET messages_sent_this_year = 0');
    } catch (err) {}
});
`;

code = code.replace("cron.schedule('10 0 * * *', async () => {", cronAdd + "\ncron.schedule('10 0 * * *', async () => {");
fs.writeFileSync('server.cjs', code);
