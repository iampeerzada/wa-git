const fs = require('fs');
let code = fs.readFileSync('components/ProvisionInstanceModal.tsx', 'utf8');

const regex = /const launchWhatsAppSignup = \(\) => \{[\s\S]*?if \(\!isOpen\) return null;/m;

const replacement = `const launchWhatsAppSignup = () => {
    // A robust, manual popup approach that bypasses all Facebook JS SDK caching bugs
    const appId = '4126835067540230';
    const configId = '1661168568318692';
    
    // Using the official Facebook Login for Business URL
    const extras = encodeURIComponent(JSON.stringify({ "setup": {}, "sessionInfoVersion": "3" }));
    const redirectUri = encodeURIComponent(window.location.origin + '/');
    
    const oauthUrl = \`https://www.facebook.com/v26.0/dialog/oauth?client_id=\${appId}&redirect_uri=\${redirectUri}&response_type=code&config_id=\${configId}&extras=\${extras}&display=popup\`;
    
    // Open the manual popup
    const popup = window.open(oauthUrl, 'fb_oauth', 'width=800,height=700,scrollbars=yes');
    
    if (!popup) {
        alert("Popup was blocked by your browser. Please allow popups for this site.");
        return;
    }

    // Set up a listener to catch the redirect when it comes back to our origin
    const checkPopup = setInterval(() => {
        try {
            if (popup.closed) {
                clearInterval(checkPopup);
                return;
            }
            
            // Check if the popup has redirected back to our origin
            const popupUrl = popup.location.href;
            if (popupUrl.includes(window.location.origin) && popupUrl.includes('code=')) {
                clearInterval(checkPopup);
                const urlParams = new URLSearchParams(popup.location.search);
                const code = urlParams.get('code');
                popup.close();
                
                if (code) {
                    setLoading(true);
                    fetch('/api/meta/exchange-code', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': \\\`Bearer \\\${localStorage.getItem('wa_token')}\\\` },
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
                }
            } else if (popupUrl.includes('error=')) {
                clearInterval(checkPopup);
                alert("Facebook returned an error. Please try again.");
                popup.close();
            }
        } catch (e) {
            // Ignore DOMException for cross-origin tracking
        }
    }, 500);
  };

  if (!isOpen) return null;`;

code = code.replace(regex, replacement);
fs.writeFileSync('components/ProvisionInstanceModal.tsx', code);
