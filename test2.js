const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
    const inst = await pool.query("SELECT * FROM instances WHERE provider='meta' LIMIT 1");
    if (inst.rows.length === 0) return;
    const instance = inst.rows[0];
    
    // Attempt with header_url
    const payload = {
        name: "test_tpl_image_4",
        language: "en",
        category: "MARKETING",
        components: [
            {
                type: "HEADER",
                format: "IMAGE",
                example: {
                    header_url: ["https://ifastx.in/sample.jpg"]
                }
            },
            {
                type: "BODY",
                text: "Hello World"
            }
        ]
    };
    
    const res = await fetch(`https://graph.facebook.com/v20.0/${instance.meta_waba_id}/message_templates`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${instance.meta_access_token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });
    
    console.log(await res.json());
    process.exit(0);
}
run();
