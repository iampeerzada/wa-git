const fs = require('fs');
let code = fs.readFileSync('/app/applet/components/MetaAutomations.tsx', 'utf8');

// Replace AutomationNode definition
const oldDef = `  const AutomationNode = ({ node, level = 0 }) => {`;
const newDef = `  const AutomationNode = ({ node, level = 0, path = [] }) => {
    const currentPath = [...path, node.name || 'Unnamed Option'];`;

code = code.replace(oldDef, newDef);

// Add the path rendering inside the node's main area
const oldTitleArea = `<div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-semibold text-white text-base">{node.name || 'Unnamed Option'}</span>`;
const newTitleArea = `<div className="text-[11px] text-gray-500 font-mono mb-1 flex items-center gap-1">
              {path.length > 0 ? (
                  <>Path: {path.map((p, i) => <React.Fragment key={i}><span className="text-gray-400">{p}</span> ➔ </React.Fragment>)}<span className="text-blue-400">{node.name || 'Unnamed Option'}</span></>
              ) : (
                  <span className="text-blue-400">Root Node: {node.name || 'Unnamed Option'}</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-semibold text-white text-base">{node.name || 'Unnamed Option'}</span>`;

code = code.replace(oldTitleArea, newTitleArea);

// Replace the recursive call to pass the path
const oldRecurse = `<AutomationNode key={child.id} node={child} level={level + 1} />`;
const newRecurse = `<AutomationNode key={child.id} node={child} level={level + 1} path={currentPath} />`;

code = code.replace(oldRecurse, newRecurse);

fs.writeFileSync('/app/applet/components/MetaAutomations.tsx', code);
console.log("Patched MetaAutomations.tsx to show tree path");
