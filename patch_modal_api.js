const fs = require('fs');
let code = fs.readFileSync('/app/applet/components/ProvisionInstanceModal.tsx', 'utf8');

const oldAlerts = `        if (response.authResponse.accessToken) {
            setMetaAccessToken(response.authResponse.accessToken);
            alert("Facebook connected successfully! Please enter your WABA ID and Phone Number ID to complete.");
        } else {
            alert("Success! However, to complete the flow, you must exchange the code for an access token in your backend. Code: " + code);
        }`;

const newApiCall = `        if (code) {
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
        }`;

code = code.replace(oldAlerts, newApiCall);
fs.writeFileSync('/app/applet/components/ProvisionInstanceModal.tsx', code);
console.log("Patched modal with API call");
