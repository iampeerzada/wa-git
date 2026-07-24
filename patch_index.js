const fs = require('fs');
let code = fs.readFileSync('/app/applet/index.html', 'utf8');

const scriptTag = `<script async defer crossorigin="anonymous" src="https://connect.facebook.net/en_US/sdk.js"></script>
    <style>`;

code = code.replace('<style>', scriptTag);
fs.writeFileSync('/app/applet/index.html', code);
console.log("Patched index.html");
