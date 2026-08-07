const fs = require('fs');
let code = fs.readFileSync('components/ProvisionInstanceModal.tsx', 'utf8');

const regex = /const launchWhatsAppSignup = \(\) => \{[\s\S]*?if \(\!isOpen\) return null;/m;

const replacement = `const launchWhatsAppSignup = () => {
    // The user requested to strictly use this manual embedded URL as the SDK is failing in production.
    const appId = '4126835067540230';
    const configId = '1383757723972613';
    
    const url = \`https://business.facebook.com/messaging/whatsapp/onboard/?app_id=\${appId}&config_id=\${configId}&extras=%7B%22sessionInfoVersion%22%3A%223%22%2C%22version%22%3A%22v4%22%7D\`;
    
    // Open the official Facebook onboarding popup
    window.open(url, '_blank', 'width=1000,height=800');
    
    // Alert the user on how to retrieve the details manually
    alert(
      "Facebook setup opened in a new window!\\n\\n" +
      "HOW TO GET YOUR CREDENTIALS:\\n" +
      "1. Complete the Facebook setup in the popup window.\\n" +
      "2. When finished, go to your Meta App Dashboard > WhatsApp > API Setup.\\n" +
      "3. Copy the 'Phone Number ID' and 'WhatsApp Business Account ID'.\\n" +
      "4. Generate a 'System User Access Token' (or Temporary Access Token).\\n" +
      "5. Paste them into the manual entry section right here on this page."
    );
  };

  if (!isOpen) return null;`;

code = code.replace(regex, replacement);
fs.writeFileSync('components/ProvisionInstanceModal.tsx', code);
