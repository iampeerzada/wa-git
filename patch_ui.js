const fs = require('fs');
let ui = fs.readFileSync('/app/applet/components/MetaAutomations.tsx', 'utf8');

const targetSelect = `<select className="w-full bg-[#2a3942] border border-gray-700 p-2 rounded-lg text-white" value={formData.match_type} onChange={e => setFormData({...formData, match_type: e.target.value})}>
              <option value="exact">Exact Match</option>
              <option value="contains">Contains</option>
            </select>`;

const newSelect = `<select className="w-full bg-[#2a3942] border border-gray-700 p-2 rounded-lg text-white" value={formData.match_type} onChange={e => setFormData({...formData, match_type: e.target.value})}>
              <option value="exact">Exact Match</option>
              <option value="contains">Contains</option>
              <option value="welcome">Welcome Message (First Msg)</option>
            </select>`;

ui = ui.replace(targetSelect, newSelect);

const targetKeyword = `<div>
            <label className="block text-sm font-medium mb-1">Trigger Keyword</label>
            <input required type="text" className="w-full bg-[#2a3942] border border-gray-700 p-2 rounded-lg text-white" value={formData.keyword} onChange={e => setFormData({...formData, keyword: e.target.value})} />
          </div>`;

const newKeyword = `{formData.match_type !== 'welcome' && (
          <div>
            <label className="block text-sm font-medium mb-1">Trigger Keyword</label>
            <input required type="text" className="w-full bg-[#2a3942] border border-gray-700 p-2 rounded-lg text-white" value={formData.keyword} onChange={e => setFormData({...formData, keyword: e.target.value})} />
          </div>
          )}`;

ui = ui.replace(targetKeyword, newKeyword);

fs.writeFileSync('/app/applet/components/MetaAutomations.tsx', ui);
console.log("Patched UI");
