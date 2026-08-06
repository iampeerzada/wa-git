const fs = require('fs');
let code = fs.readFileSync('components/ProvisionInstanceModal.tsx', 'utf8');

code = code.replace(
    'window.FB.login(function (response) {',
    `alert("Starting Facebook Login using NEW Config ID (1661168568318692) and Response Type: code");\n    window.FB.login(function (response) {`
);

fs.writeFileSync('components/ProvisionInstanceModal.tsx', code);
