const fs = require('fs');
let code = fs.readFileSync('components/ProvisionInstanceModal.tsx', 'utf8');

const regex = /const launchWhatsAppSignup = \(\) => \{[\s\S]*?if \(\!isOpen\) return null;/m;

const replacement = `const launchWhatsAppSignup = () => {
    if (!window.FB) {
      alert("Facebook SDK is not loaded. Please wait or refresh the page.");
      return;
    }
    
    window.FB.login(function (response) {
      if (response.authResponse) {
        const code = response.authResponse.code;
        if (code) {
            setLoading(true);
            fetch('/api/meta/exchange-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${localStorage.getItem('wa_token')}\` },
                body: JSON.stringify({ code })
            })
            .then(res => res.json())
            .then(data => {
                setLoading(false);
                if (data.error) {
                    alert('Meta Setup Error: ' + data.error);
                } else {
                    setMetaAccessToken(data.accessToken);
                    if (data.phoneNumberId) setMetaPhoneNumberId(data.phoneNumberId);
                    if (data.wabaId) setMetaWabaId(data.wabaId);
                    alert("Facebook connected successfully! Verify your details and submit.");
                }
            })
            .catch(err => {
                setLoading(false);
                alert('Connection error');
            });
        } else if (response.authResponse.accessToken) {
            setMetaAccessToken(response.authResponse.accessToken);
            alert("Facebook connected successfully! Please enter your WABA ID and Phone Number ID to complete.");
        }
      } else {
        alert('User cancelled login or did not fully authorize.');
      }
    }, {
      config_id: '1661168568318692',
      response_type: 'code',
      override_default_response_type: true,
      extras: {
        "setup": {},
        "sessionInfoVersion": "3"
      }
    });
  };

  if (!isOpen) return null;`;

code = code.replace(regex, replacement);
fs.writeFileSync('components/ProvisionInstanceModal.tsx', code);
