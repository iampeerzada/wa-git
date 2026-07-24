const fs = require('fs');
let code = fs.readFileSync('/app/applet/components/Templates.tsx', 'utf8');

code = code.replace(
    `const [headerText, setHeaderText] = useState('');`,
    `const [headerText, setHeaderText] = useState('');\n  const [headerMediaUrl, setHeaderMediaUrl] = useState('');`
);

const oldHeaderLogic = `            } else {
                // Media headers require example handler in meta api, we will omit for simple creation or provide a dummy
                // Meta API requires an example for media. Let's provide a generic sample url based on type
                let sampleUrl = "https://ifastx.in/sample.jpg";
                if (headerType === 'VIDEO') sampleUrl = "https://ifastx.in/sample.mp4";
                if (headerType === 'DOCUMENT') sampleUrl = "https://ifastx.in/sample.pdf";
                headerComp.example = { header_handle: [sampleUrl] };
            }`;

const newHeaderLogic = `            } else {
                let sampleUrl = headerMediaUrl;
                if (!sampleUrl) {
                    sampleUrl = "https://ifastx.in/sample.jpg";
                    if (headerType === 'VIDEO') sampleUrl = "https://ifastx.in/sample.mp4";
                    if (headerType === 'DOCUMENT') sampleUrl = "https://ifastx.in/sample.pdf";
                }
                headerComp.example = { header_handle: [sampleUrl] };
            }`;

code = code.replace(oldHeaderLogic, newHeaderLogic);

const oldReset = `setName(''); setBodyText(''); setHeaderText(''); setFooterText('');
            setHeaderType('NONE'); setButtons([]); setExamples({body: {}, header: {}});`;

const newReset = `setName(''); setBodyText(''); setHeaderText(''); setFooterText(''); setHeaderMediaUrl('');
            setHeaderType('NONE'); setButtons([]); setExamples({body: {}, header: {}});`;

code = code.replace(oldReset, newReset);

const oldEdit = `let h = comps.find(c => c.type === 'HEADER');
    if (h) {
      setHeaderType(h.format || 'NONE');
      setHeaderText(h.text || '');
    } else {
      setHeaderType('NONE');
      setHeaderText('');
    }`;

const newEdit = `let h = comps.find(c => c.type === 'HEADER');
    if (h) {
      setHeaderType(h.format || 'NONE');
      setHeaderText(h.text || '');
      setHeaderMediaUrl(h.example?.header_handle?.[0] || '');
    } else {
      setHeaderType('NONE');
      setHeaderText('');
      setHeaderMediaUrl('');
    }`;

code = code.replace(oldEdit, newEdit);

const oldUI = `{['IMAGE','VIDEO','DOCUMENT'].includes(headerType) && (
                          <div className="mt-2 text-xs text-gray-500">
                              A placeholder sample media URL will be sent for verification.
                          </div>
                      )}`;

const newUI = `{['IMAGE','VIDEO','DOCUMENT'].includes(headerType) && (
                          <div className="mt-3">
                              <input 
                                  type="url" 
                                  value={headerMediaUrl} 
                                  onChange={(e) => setHeaderMediaUrl(e.target.value)} 
                                  placeholder={\`Enter sample \${headerType.toLowerCase()} URL (e.g. https://...)\`}
                                  className="w-full bg-[#202c33] text-white border border-gray-700 rounded-lg px-4 py-2"
                              />
                              <p className="text-xs text-gray-500 mt-1">A sample media URL is required by Meta for verification. If left empty, a placeholder will be used.</p>
                          </div>
                      )}`;

code = code.replace(oldUI, newUI);

fs.writeFileSync('/app/applet/components/Templates.tsx', code);
console.log("Patched Templates.tsx to support headerMediaUrl");
