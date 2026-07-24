const fs = require('fs');
let code = fs.readFileSync('/app/applet/components/ProvisionInstanceModal.tsx', 'utf8');

const fbCode = `  const launchWhatsAppSignup = () => {
    if (!window.FB) {
      alert("Facebook SDK is not loaded. Please wait or refresh the page.");
      return;
    }
    
    // Initialize if not already initialized
    window.FB.init({
      appId: '4126835067540230',
      cookie: true,
      xfbml: true,
      version: 'v20.0'
    });

    window.FB.login(function (response) {
      if (response.authResponse) {
        const code = response.authResponse.code;
        // The code can be sent to backend, or if you request token, you get accessToken.
        // The most secure way is to send the code to backend. For demo purposes here, we can set the token directly if returned.
        if (response.authResponse.accessToken) {
            setMetaAccessToken(response.authResponse.accessToken);
            alert("Facebook connected successfully! Please enter your WABA ID and Phone Number ID to complete.");
        } else {
            alert("Success! However, to complete the flow, you must exchange the code for an access token in your backend. Code: " + code);
        }
      } else {
        alert('User cancelled login or did not fully authorize.');
      }
    }, {
      config_id: '1551670126364630',
      response_type: 'code,token',
      override_default_response_type: true,
      extras: {
        "setup": {},
        "sessionInfoVersion": "3"
      }
    });
  };`;

code = code.replace(`  const [loading, setLoading] = useState(false);`, `  const [loading, setLoading] = useState(false);\n\n${fbCode}`);

const manualForm = `<div className="space-y-5">
                      <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-xl flex gap-4">
                         <div className="text-blue-400 shrink-0 mt-1">
                          <Info size={24} />
                        </div>
                        <div className="text-gray-300 text-sm leading-relaxed space-y-2">
                          <p>You need to create an app in the <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline font-semibold">Meta Developer Dashboard</a> and set up WhatsApp.</p>
                          <p className="text-gray-400">Ensure your app has the WhatsApp product added, and you have generated a permanent access token.</p>
                        </div>
                      </div>

                      <div>`;

const fbBtn = `<div className="space-y-5">
                      <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-xl flex gap-4">
                         <div className="text-blue-400 shrink-0 mt-1">
                          <Info size={24} />
                        </div>
                        <div className="text-gray-300 text-sm leading-relaxed space-y-2 flex-1">
                          <p className="font-bold text-white mb-2">Automated Meta Onboarding (Embedded Signup)</p>
                          <p>Connect your Facebook Account directly and we will securely retrieve your WhatsApp credentials.</p>
                          <button type="button" onClick={launchWhatsAppSignup} className="mt-3 bg-[#1877F2] hover:bg-[#166FE5] text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all">
                              <Globe size={18} /> Connect with Facebook
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 my-2">
                          <div className="h-px bg-gray-700 flex-1"></div>
                          <span className="text-xs text-gray-500 uppercase font-black tracking-widest">OR ENTER MANUALLY</span>
                          <div className="h-px bg-gray-700 flex-1"></div>
                      </div>

                      <div>`;

code = code.replace(manualForm, fbBtn);

fs.writeFileSync('/app/applet/components/ProvisionInstanceModal.tsx', code);
console.log("Patched ProvisionInstanceModal.tsx");
