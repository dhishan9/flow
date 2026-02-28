console.log("🚀 App.js is loaded and running!");

async function init() {
    try {
        await TreeSitter.init({
            locateFile(scriptName) { return 'parsers/' + scriptName; }
        });
        const parser = new TreeSitter();
        
        const langPython = await TreeSitter.Language.load('parsers/tree-sitter-python.wasm');
        const langC = await TreeSitter.Language.load('parsers/tree-sitter-c.wasm');

        const btn = document.getElementById('updateBtn');
        const input = document.getElementById('inputCode');
        const langSelect = document.getElementById('langSelect');
        const loader = document.getElementById('loader-overlay');
        const chartContainer = document.getElementById('chart-container');
        const themeToggle = document.getElementById('themeToggle');

        // --- DARK MODE LOGIC ---
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                document.documentElement.classList.toggle('dark');
            });
        }

        // --- AUTO-LOAD LOGIC ---
        const savedDraft = localStorage.getItem('autosave_draft');
        if (savedDraft) {
            const draftData = JSON.parse(savedDraft);
            input.value = draftData.code;
            langSelect.value = draftData.language;
            console.log("📥 Auto-saved draft loaded!");
        }

        mermaid.initialize({ 
            startOnLoad: false, 
            theme: 'base', // 'base' works better with Tailwind's dark/light modes
            flowchart: { useMaxWidth: false } 
        });

        // --- AUTO-SAVE LOGIC ---
        function triggerAutoSave() {
            const currentData = {
                code: input.value,
                language: langSelect.value
            };
            localStorage.setItem('autosave_draft', JSON.stringify(currentData));
        }

        input.addEventListener('input', triggerAutoSave);
        langSelect.addEventListener('change', triggerAutoSave);

        // --- GENERATION LOGIC ---
        btn.addEventListener('click', () => {
            // Tailwind uses 'hidden' class to hide things
            loader.classList.remove('hidden'); 
            chartContainer.innerHTML = ''; 

            setTimeout(async () => {
                try {
                    if (langSelect.value === 'c') {
                        parser.setLanguage(langC);
                    } else {
                        parser.setLanguage(langPython);
                    }

                    const tree = parser.parse(input.value);
                    let diagramText = generateMermaid(tree.rootNode);
                    
                    chartContainer.innerHTML = `<div style="display:inline-block; text-align:left;"><pre class="mermaid">${diagramText}</pre></div>`;
                    
                    chartContainer.querySelector('.mermaid').removeAttribute('data-processed'); 
                    await mermaid.run();
                } catch (err) {
                    console.error("Error generating flowchart:", err);
                } finally {
                    loader.classList.add('hidden');
                }
            }, 100); 
        });

    } catch (e) { 
        console.error("❌ ERROR:", e); 
    }
}

function generateMermaid(rootNode) {
    let code = "graph TD\n"; 
    let idCounter = 0;

    function clean(text) {
        if (!text) return "Node";
        return text.split('\n')[0].replace(/["'{}()\[\]]/g, "").trim(); 
    }

    let functions = [];
    let mainNodes = [];

    for (let i = 0; i < rootNode.childCount; i++) {
        const child = rootNode.child(i);
        if (!child.isNamed) continue;

        if (child.type === 'function_definition') {
            functions.push(child);
        } else {
            mainNodes.push(child);
        }
    }

    function buildFlow(name, nodesArray, isMain) {
        let flowCode = ""; 
        let prefix = `flow_${idCounter++}`;
        let startId = `${prefix}_START`;
        let stopId = `${prefix}_STOP`;

        let startLabel = isMain ? "Start" : `${name}()`;
        flowCode += `  ${startId}(["${startLabel}"])\n`;

        let edges = [];
        let registeredNodes = new Set();
        registeredNodes.add(startId);

        function addEdge(from, to, label = "") {
            if (!from || !to) return;
            const link = label ? `-->|${label}|` : "-->";
            flowCode += `  ${from} ${link} ${to}\n`;
            edges.push(from); 
        }

        function walk(n, parentId = null, edgeLabel = "") {
            if (!n) return parentId;
            const type = n.type;
            const currentId = `${prefix}_node_${idCounter++}`;
            const rawText = n.text || "";
            const labelText = clean(rawText);

            if (type === 'return_statement') {
                registeredNodes.add(currentId);
                flowCode += `  ${currentId}(["${labelText}"])\n`; 
                addEdge(parentId, currentId, edgeLabel);
                return currentId;
            }

            if (type === 'if_statement') {
                registeredNodes.add(currentId);
                const conditionNode = n.childForFieldName('condition') || (n.childCount > 1 ? n.child(1) : null);
                const conditionText = conditionNode ? clean(conditionNode.text) : "condition";
                flowCode += `  ${currentId}{"${conditionText}"}\n`;
                addEdge(parentId, currentId, edgeLabel);

                const consequence = n.childForFieldName('consequence');
                if (consequence) walk(consequence, currentId, "True");

                let pythonAlts = [];
                for (let i = 0; i < n.childCount; i++) {
                    const c = n.child(i);
                    if (c.type === 'elif_clause' || c.type === 'else_clause') {
                        pythonAlts.push(c);
                    }
                }

                if (pythonAlts.length > 0) {
                    let prevDiamond = currentId;
                    for (let alt of pythonAlts) {
                        if (alt.type === 'elif_clause') {
                            const elifId = `${prefix}_node_${idCounter++}`;
                            registeredNodes.add(elifId);
                            const elifCond = alt.childForFieldName('condition') || (alt.childCount > 1 ? alt.child(1) : null);
                            const elifText = elifCond ? clean(elifCond.text) : "condition";
                            flowCode += `  ${elifId}{"${elifText}"}\n`;
                            addEdge(prevDiamond, elifId, "False");
                            
                            const elifCons = alt.childForFieldName('consequence');
                            if (elifCons) walk(elifCons, elifId, "True");
                            prevDiamond = elifId; 
                        } else if (alt.type === 'else_clause') {
                            let passLabel = "False";
                            for (let j = 0; j < alt.childCount; j++) {
                                const c = alt.child(j);
                                if (!c.isNamed) continue;
                                walk(c, prevDiamond, passLabel);
                                passLabel = ""; 
                            }
                        }
                    }
                } else {
                    const cAlt = n.childForFieldName('alternative');
                    if (cAlt) walk(cAlt, currentId, "False");
                }

                return currentId; 
            }

            if (type === 'while_statement' || type === 'for_statement') {
                registeredNodes.add(currentId);
                let conditionText = "loop";
                if (type === 'while_statement') {
                     const conditionNode = n.child(1);
                     conditionText = conditionNode ? clean(conditionNode.text) : "while";
                } else {
                     conditionText = "for: " + labelText.substring(0, 15);
                }
                flowCode += `  ${currentId}{"${conditionText}"}\n`;
                addEdge(parentId, currentId, edgeLabel);

                const body = n.childForFieldName('body');
                if (body) {
                    const endOfBodyId = walk(body, currentId, "True");
                    addEdge(endOfBodyId, currentId); 
                }
                return currentId; 
            }

            if (['expression_statement', 'assignment', 'declaration'].includes(type)) {
                registeredNodes.add(currentId);
                const isIO = rawText.includes('print') || rawText.includes('input') || rawText.includes('scanf');
                const isCall = rawText.includes('(') && rawText.includes(')') && !isIO && type === 'expression_statement';
                
                if (isIO) {
                    flowCode += `  ${currentId}[/"${labelText}"/]\n`; 
                } else if (isCall) {
                    flowCode += `  ${currentId}[["${labelText}"]]\n`; 
                } else {
                    flowCode += `  ${currentId}["${labelText}"]\n`;   
                }
                addEdge(parentId, currentId, edgeLabel);
                return currentId;
            }

            let currentParent = parentId;
            let currentEdgeLabel = edgeLabel;
            
            for (let i = 0; i < n.childCount; i++) {
                const child = n.child(i);
                if (!child.isNamed || child.type === 'function_definition') continue; 
                
                if (i > 0 && ['while_statement', 'for_statement'].includes(n.child(i-1).type)) {
                    currentEdgeLabel = "False";
                }

                const nextParent = walk(child, currentParent, currentEdgeLabel);
                if (nextParent !== currentParent) {
                    currentEdgeLabel = ""; 
                    currentParent = nextParent;
                }
            }
            return currentParent;
        }

        let currentParentId = startId;
        for (let node of nodesArray) {
            currentParentId = walk(node, currentParentId) || currentParentId;
        }

        if (isMain) {
            flowCode += `  ${stopId}(["Stop"])\n`;
            let hasOutgoingEdge = new Set(edges);
            for (let n of registeredNodes) {
                if (!hasOutgoingEdge.has(n)) {
                    flowCode += `  ${n} --> ${stopId}\n`;
                }
            }
        }

        return flowCode + "\n";
    }

    let cMainFunc = null;
    let otherFuncs = [];

    for (let func of functions) {
        const funcName = func.childForFieldName('name') ? func.childForFieldName('name').text : "";
        if (funcName === 'main') {
            cMainFunc = func;
        } else {
            otherFuncs.push(func);
        }
    }

    if (cMainFunc) {
        const body = cMainFunc.childForFieldName('body');
        let bodyNodes = [];
        if (body) {
            for(let i=0; i<body.childCount; i++) if (body.child(i).isNamed) bodyNodes.push(body.child(i));
        }
        code += buildFlow("Main", bodyNodes, true);
    } else if (mainNodes.length > 0) {
        code += buildFlow("Main", mainNodes, true);
    }

    for (let func of otherFuncs) {
        const funcName = func.childForFieldName('name') ? clean(func.childForFieldName('name').text) : "Func";
        const body = func.childForFieldName('body');
        let bodyNodes = [];
        if (body) {
            for(let i=0; i<body.childCount; i++) if (body.child(i).isNamed) bodyNodes.push(body.child(i));
        }
        code += buildFlow(funcName, bodyNodes, false);
    }

    return code;
}

init();