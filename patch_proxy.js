const fs = require('fs');
let code = fs.readFileSync('/app/applet/server.cjs', 'utf8');

const targetBlock = `            agent: new (require('https')).Agent({ 
                family: 4,
                rejectUnauthorized: false,
                minVersion: 'TLSv1.2',
                ciphers: 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384'
            }),`;

const replacement = `            agent: process.env.PROXY_URL ? new (require('https-proxy-agent').HttpsProxyAgent)(process.env.PROXY_URL) : new (require('https')).Agent({ 
                family: 4,
                rejectUnauthorized: false,
                minVersion: 'TLSv1.2',
                ciphers: 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384'
            }),`;

code = code.replace(targetBlock, replacement);
fs.writeFileSync('/app/applet/server.cjs', code);
console.log("Patched server.cjs with proxy support");
