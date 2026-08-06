const fs = require('fs');
let code = fs.readFileSync('components/ProvisionInstanceModal.tsx', 'utf8');

const regex = /const launchWhatsAppSignup = \(\) => \{[\s\S]*?\}\);\s*\};\s*if \(\!isOpen\) return null;/;

const replacement = `const launchWhatsAppSignup = () => {
    const appId = '4126835067540230';
    const configId = '1661168568318692';
    const url = \`https://business.facebook.com/messaging/whatsapp/onboard/?app_id=\${appId}&config_id=\${configId}&extras=%7B%22sessionInfoVersion%22%3A%223%22%2C%22version%22%3A%22v4%22%7D\`;
    window.open(url, '_blank', 'width=800,height=700');
    
    // Alert the user on next steps since they are using the manual flow now
    alert("Facebook onboarding opened in a new window!\\n\\nAfter you finish the Facebook setup, copy your WABA ID, Phone Number ID, and Access Token from your Meta Dashboard and paste them into the manual entry section below.");
  };

  if (!isOpen) return null;`;

code = code.replace(regex, replacement);
fs.writeFileSync('components/ProvisionInstanceModal.tsx', code);
