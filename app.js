console.log("🚀 App.js is loaded and running!");

// ========== HISTORY MANAGEMENT CLASS ==========
class HistoryManager {
    constructor() {
        this.maxHistoryItems = 10;
        this.storageKey = 'flowchart_history';
    }

    getHistory() {
        const history = localStorage.getItem(this.storageKey);
        return history ? JSON.parse(history) : [];
    }

    saveToHistory(code, language, preview) {
        let history = this.getHistory();
        
        const newItem = {
            id: Date.now(),
            code: code,
            language: language,
            preview: preview || code.substring(0, 50) + (code.length > 50 ? '...' : ''),
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString()
        };

        const isDuplicate = history.some(item => 
            item.code === code && item.language === language
        );

        if (!isDuplicate) {
            history.unshift(newItem);
            
            if (history.length > this.maxHistoryItems) {
                history = history.slice(0, this.maxHistoryItems);
            }
            
            localStorage.setItem(this.storageKey, JSON.stringify(history));
            this.renderHistory();
        }
    }

    deleteHistoryItem(id) {
        let history = this.getHistory();
        history = history.filter(item => item.id !== id);
        localStorage.setItem(this.storageKey, JSON.stringify(history));
        this.renderHistory();
    }

    clearHistory() {
        if (confirm('Are you sure you want to clear all history?')) {
            localStorage.removeItem(this.storageKey);
            this.renderHistory();
        }
    }

    loadHistoryItem(item) {
        const input = document.getElementById('inputCode');
        const langSelect = document.getElementById('langSelect');
        
        input.value = item.code;
        langSelect.value = item.language;
        
        const event = new Event('input');
        input.dispatchEvent(event);
        
        setTimeout(() => {
            document.getElementById('updateBtn').click();
        }, 100);
        
        this.showNotification('✅ Loaded: ' + item.preview);
    }

    renderHistory() {
        const historyContainer = document.getElementById('historyContainer');
        const historyCount = document.getElementById('historyCount');
        if (!historyContainer) return;

        const history = this.getHistory();
        
        if (historyCount) {
            historyCount.textContent = `${history.length}/${this.maxHistoryItems}`;
        }
        
        if (history.length === 0) {
            historyContainer.innerHTML = `
                <div class="text-center py-8">
                    <span class="material-symbols-outlined text-3xl text-on-surface-variant/30">history</span>
                    <p class="text-xs text-on-surface-variant/50 mt-2">No history yet</p>
                    <p class="text-[10px] text-on-surface-variant/30">Your flowcharts will appear here</p>
                </div>
            `;
            return;
        }

        historyContainer.innerHTML = `
            <div class="space-y-2">
                ${history.map(item => `
                    <div class="group bg-surface-container-highest/30 hover:bg-surface-container-highest rounded-lg p-3 transition-all cursor-pointer" data-id="${item.id}">
                        <div class="flex items-start justify-between gap-2">
                            <div class="flex-1 min-w-0 load-history-item" data-id='${JSON.stringify(item)}'>
                                <p class="text-xs font-medium text-on-surface truncate">${this.escapeHtml(item.preview)}</p>
                                <div class="flex items-center gap-2 mt-1">
                                    <span class="text-[10px] text-primary/70 uppercase font-bold">${item.language}</span>
                                    <span class="text-[9px] text-on-surface-variant/50">${item.date}</span>
                                </div>
                            </div>
                            <button class="delete-history opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant/50 hover:text-error p-1" data-id="${item.id}">
                                <span class="material-symbols-outlined text-sm">delete</span>
                            </button>
                        </div>
                    </div>
                `).join('')}
                ${history.length > 0 ? `
                    <button id="clearAllHistory" class="w-full mt-4 text-center text-xs text-on-surface-variant/60 hover:text-error transition-colors py-2">
                        Clear All History
                    </button>
                ` : ''}
            </div>
        `;

        document.querySelectorAll('.delete-history').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id);
                this.deleteHistoryItem(id);
            });
        });

        document.querySelectorAll('.load-history-item').forEach(el => {
            el.addEventListener('click', () => {
                const item = JSON.parse(el.dataset.id);
                this.loadHistoryItem(item);
            });
        });

        const clearBtn = document.getElementById('clearAllHistory');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearHistory());
        }
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'fixed bottom-4 right-4 bg-surface-container-highest text-on-surface px-4 py-2 rounded-lg shadow-lg text-sm z-50 animate-slide-in';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 2000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ========== PREPROCESS C CODE ==========
function preprocessCCode(code) {
    let cleaned = code.replace(/^#include.*$/gm, '');
    cleaned = cleaned.replace(/^#define.*$/gm, '');
    cleaned = cleaned.replace(/^#if.*$/gm, '');
    cleaned = cleaned.replace(/^#endif.*$/gm, '');
    return cleaned;
}

// ========== OUR CUSTOM SMART MERMAID GENERATOR ==========
function generateMermaid(rootNode) {
    let code = "graph TD\n"; 
    let idCounter = 0;

    // THE FIX: Bulletproof text cleaner
    function clean(text) {
        if (!text) return "Node";
        let str = text.split('\n')[0];
        // Aggressively remove quotes, brackets, and slashes that crash Mermaid
        str = str.replace(/["'`\\/\[\]{}()|]/g, " ");
        // Collapse multiple spaces into one
        str = str.replace(/\s+/g, " ").trim();
        // Truncate if too long
        if (str.length > 40) str = str.substring(0, 40) + "...";
        return str || "Action";
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

        let startLabel = isMain ? "Start" : `${clean(name)}`;
        flowCode += `  ${startId}([${startLabel}])\n`;

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
                flowCode += `  ${currentId}([${labelText}])\n`; 
                addEdge(parentId, currentId, edgeLabel);
                return currentId;
            }

            if (type === 'if_statement') {
                registeredNodes.add(currentId);
                const conditionNode = n.childForFieldName('condition') || (n.childCount > 1 ? n.child(1) : null);
                const conditionText = conditionNode ? clean(conditionNode.text) : "condition";
                flowCode += `  ${currentId}{${conditionText}}\n`;
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
                            flowCode += `  ${elifId}{${elifText}}\n`;
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
                     conditionText = "for " + labelText.substring(0, 15);
                }
                flowCode += `  ${currentId}{${conditionText}}\n`;
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
                
                // THE FIX: Removed internal quotes to prevent parser crashes
                if (isIO) {
                    flowCode += `  ${currentId}[/${labelText}/]\n`; 
                } else if (isCall) {
                    flowCode += `  ${currentId}[[${labelText}]]\n`; 
                } else {
                    flowCode += `  ${currentId}[${labelText}]\n`;   
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
            flowCode += `  ${stopId}([Stop])\n`;
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

// ========== MAIN INIT FUNCTION ==========
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
        const newProjectBtn = document.getElementById('newProjectBtn');

        // Sidebar logic
        const sidebar = document.getElementById('sidebar');
        const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
        let isSidebarOpen = true;

        if (toggleSidebarBtn && sidebar) {
            toggleSidebarBtn.addEventListener('click', () => {
                isSidebarOpen = !isSidebarOpen;
                if (isSidebarOpen) {
                    sidebar.style.width = '16rem';
                    sidebar.style.opacity = '1';
                } else {
                    sidebar.style.width = '0px';
                    sidebar.style.opacity = '0';
                }
            });
        }

        // Initialize history manager
        const historyManager = new HistoryManager();
        historyManager.renderHistory();

        // Dark mode logic
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                document.documentElement.classList.toggle('dark');
            });
        }

        // New Project button
        if (newProjectBtn) {
            newProjectBtn.addEventListener('click', () => {
                input.value = '';
                langSelect.value = 'python';
                triggerAutoSave();
                historyManager.showNotification('🆕 New project created');
            });
        }

        // Auto-load logic
        const savedDraft = localStorage.getItem('autosave_draft');
        if (savedDraft) {
            const draftData = JSON.parse(savedDraft);
            input.value = draftData.code;
            langSelect.value = draftData.language;
            console.log("📥 Auto-saved draft loaded!");
        }

        mermaid.initialize({ 
            startOnLoad: false, 
            theme: 'base',
            flowchart: { useMaxWidth: false } 
        });

        // Auto-save logic
        function triggerAutoSave() {
            const currentData = {
                code: input.value,
                language: langSelect.value
            };
            localStorage.setItem('autosave_draft', JSON.stringify(currentData));
        }

        input.addEventListener('input', triggerAutoSave);
        langSelect.addEventListener('change', triggerAutoSave);

        // Generation logic
        btn.addEventListener('click', () => {
            const currentCode = input.value;
            const currentLang = langSelect.value;
            const preview = currentCode.split('\n')[0].substring(0, 40);
            
            // Save to history
            if (currentCode.trim()) {
                historyManager.saveToHistory(currentCode, currentLang, preview);
            }
            
            loader.classList.remove('hidden');
            chartContainer.innerHTML = '';

            setTimeout(async () => {
                try {
                    let codeToParse = input.value;
                    
                    if (langSelect.value === 'c') {
                        parser.setLanguage(langC);
                        codeToParse = preprocessCCode(codeToParse);
                    } else {
                        parser.setLanguage(langPython);
                    }

                    const tree = parser.parse(codeToParse);
                    let diagramText = generateMermaid(tree.rootNode);
                    
                    chartContainer.innerHTML = `<div style="display:inline-block; text-align:left;"><pre class="mermaid">${diagramText}</pre></div>`;
                    
                    const mermaidElement = chartContainer.querySelector('.mermaid');
                    if (mermaidElement) {
                        mermaidElement.removeAttribute('data-processed');
                    }
                    await mermaid.run();
                } catch (err) {
                    console.error("Error generating flowchart:", err);
                    chartContainer.innerHTML = `
                        <div class="flex flex-col items-center justify-center text-center h-full">
                            <span class="material-symbols-outlined text-4xl text-error">error</span>
                            <p class="text-error text-sm mt-4">Error generating flowchart</p>
                            <p class="text-on-surface-variant text-xs mt-2">${err.message}</p>
                        </div>
                    `;
                } finally {
                    loader.classList.add('hidden');
                }
            }, 100);
        });

        // Auto-generate on page load
        setTimeout(() => {
            btn.click();
        }, 500);

    } catch (e) { 
        console.error("❌ ERROR:", e); 
    }
}

// Start the app
init();
