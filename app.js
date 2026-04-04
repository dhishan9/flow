// ============================================================================
//  CODE TO FLOWCHART - COMPLETE APP.JS (with Pan, Zoom, History, Parser)
// ============================================================================
//  This file handles:
//    - Tree-sitter parsing (Python & C)
//    - Mermaid flowchart generation
//    - Auto‑save & history panel (localStorage)
//    - Dark mode toggle
//    - Interactive pan & zoom (mouse drag + scroll + buttons)
// ============================================================================

console.log("🚀 App.js is loaded and running!");

// ========================== HISTORY MANAGER ==========================
// Stores last 10 flowcharts in localStorage, displays them in sidebar.
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

        const isDuplicate = history.some(item => item.code === code && item.language === language);
        if (!isDuplicate) {
            history.unshift(newItem);
            if (history.length > this.maxHistoryItems) history = history.slice(0, this.maxHistoryItems);
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
        input.dispatchEvent(new Event('input'));
        setTimeout(() => document.getElementById('updateBtn').click(), 100);
        this.showNotification('✅ Loaded: ' + item.preview);
    }

    renderHistory() {
        const historyContainer = document.getElementById('historyContainer');
        const historyCount = document.getElementById('historyCount');
        if (!historyContainer) return;
        const history = this.getHistory();
        if (historyCount) historyCount.textContent = `${history.length}/${this.maxHistoryItems}`;
        if (history.length === 0) {
            historyContainer.innerHTML = `<div class="text-center py-8">
                <span class="material-symbols-outlined text-3xl text-on-surface-variant/30">history</span>
                <p class="text-xs text-on-surface-variant/50 mt-2">No history yet</p>
                <p class="text-[10px] text-on-surface-variant/30">Your flowcharts will appear here</p>
            </div>`;
            return;
        }
        historyContainer.innerHTML = `<div class="space-y-2">
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
            ${history.length > 0 ? `<button id="clearAllHistory" class="w-full mt-4 text-center text-xs text-on-surface-variant/60 hover:text-error transition-colors py-2">Clear All History</button>` : ''}
        </div>`;
        document.querySelectorAll('.delete-history').forEach(btn => {
            btn.addEventListener('click', (e) => { e.stopPropagation(); this.deleteHistoryItem(parseInt(btn.dataset.id)); });
        });
        document.querySelectorAll('.load-history-item').forEach(el => {
            el.addEventListener('click', () => { this.loadHistoryItem(JSON.parse(el.dataset.id)); });
        });
        const clearBtn = document.getElementById('clearAllHistory');
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearHistory());
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'fixed bottom-4 right-4 bg-surface-container-highest text-on-surface px-4 py-2 rounded-lg shadow-lg text-sm z-50 animate-slide-in';
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ========================== C PREPROCESSOR ==========================
// Removes preprocessor directives (#include, #define, #if, #endif) so Tree-sitter parses cleanly.
function preprocessCCode(code) {
    let cleaned = code.replace(/^#include.*$/gm, '');
    cleaned = cleaned.replace(/^#define.*$/gm, '');
    cleaned = cleaned.replace(/^#if.*$/gm, '');
    cleaned = cleaned.replace(/^#endif.*$/gm, '');
    return cleaned;
}

// ========================== MERMAID GENERATOR ==========================
// Converts Tree-sitter AST into Mermaid flowchart syntax.
function generateMermaid(rootNode) {
    let code = "graph TD\n";
    let idCounter = 0;

    // Bulletproof text cleaner: removes characters that break Mermaid syntax.
    function clean(text) {
        if (!text) return "Node";
        let str = text.split('\n')[0];
        str = str.replace(/["'`\\/\[\]{}()|]/g, " ");
        str = str.replace(/\s+/g, " ").trim();
        if (str.length > 40) str = str.substring(0, 40) + "...";
        return str || "Action";
    }

    let functions = [];
    let mainNodes = [];
    for (let i = 0; i < rootNode.childCount; i++) {
        const child = rootNode.child(i);
        if (!child.isNamed) continue;
        if (child.type === 'function_definition') functions.push(child);
        else mainNodes.push(child);
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
                    if (c.type === 'elif_clause' || c.type === 'else_clause') pythonAlts.push(c);
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
                if (isIO) flowCode += `  ${currentId}[/${labelText}/]\n`;
                else if (isCall) flowCode += `  ${currentId}[[${labelText}]]\n`;
                else flowCode += `  ${currentId}[${labelText}]\n`;
                addEdge(parentId, currentId, edgeLabel);
                return currentId;
            }

            let currentParent = parentId;
            let currentEdgeLabel = edgeLabel;
            for (let i = 0; i < n.childCount; i++) {
                const child = n.child(i);
                if (!child.isNamed || child.type === 'function_definition') continue;
                if (i > 0 && ['while_statement', 'for_statement'].includes(n.child(i-1).type)) currentEdgeLabel = "False";
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
                if (!hasOutgoingEdge.has(n)) flowCode += `  ${n} --> ${stopId}\n`;
            }
        }
        return flowCode + "\n";
    }

    let cMainFunc = null;
    let otherFuncs = [];
    for (let func of functions) {
        const funcName = func.childForFieldName('name') ? func.childForFieldName('name').text : "";
        if (funcName === 'main') cMainFunc = func;
        else otherFuncs.push(func);
    }

    let resultCode = code;
    if (cMainFunc) {
        const body = cMainFunc.childForFieldName('body');
        let bodyNodes = [];
        if (body) for(let i=0; i<body.childCount; i++) if (body.child(i).isNamed) bodyNodes.push(body.child(i));
        resultCode += buildFlow("Main", bodyNodes, true);
    } else if (mainNodes.length > 0) {
        resultCode += buildFlow("Main", mainNodes, true);
    }
    for (let func of otherFuncs) {
        const funcName = func.childForFieldName('name') ? clean(func.childForFieldName('name').text) : "Func";
        const body = func.childForFieldName('body');
        let bodyNodes = [];
        if (body) for(let i=0; i<body.childCount; i++) if (body.child(i).isNamed) bodyNodes.push(body.child(i));
        resultCode += buildFlow(funcName, bodyNodes, false);
    }
    return resultCode;
}

// ========================== PAN & ZOOM (Interactive SVG) ==========================
// These variables track the current transform (position and scale) of the flowchart SVG.
let currentTransform = { x: 0, y: 0, scale: 1 };
let isPanning = false;
let startPan = { x: 0, y: 0 };

// Attaches drag (pan) and wheel (zoom) behavior to the SVG element.
function attachPanZoom(svgElement) {
    if (!svgElement) return;
    const container = svgElement.parentElement; // #chart-container
    if (!container) return;
    if (container._panZoomActive) return; // avoid duplicate listeners
    container._panZoomActive = true;

    function applyTransform() {
        svgElement.style.transform = `translate(${currentTransform.x}px, ${currentTransform.y}px) scale(${currentTransform.scale})`;
        svgElement.style.transformOrigin = '0 0';
    }

    function zoomAt(clientX, clientY, delta) {
        const rect = svgElement.getBoundingClientRect();
        const mouseX = (clientX - rect.left) / currentTransform.scale;
        const mouseY = (clientY - rect.top) / currentTransform.scale;
        const newScale = currentTransform.scale * (delta > 0 ? 1.1 : 0.9);
        if (newScale < 0.2 || newScale > 5) return;
        const newX = clientX - rect.left - mouseX * newScale;
        const newY = clientY - rect.top - mouseY * newScale;
        currentTransform.scale = newScale;
        currentTransform.x = newX;
        currentTransform.y = newY;
        applyTransform();
    }

    const onWheel = (e) => {
        e.preventDefault();
        zoomAt(e.clientX, e.clientY, e.deltaY > 0 ? -1 : 1);
    };
    container.addEventListener('wheel', onWheel, { passive: false });

    const onMouseDown = (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        isPanning = true;
        startPan = { x: e.clientX - currentTransform.x, y: e.clientY - currentTransform.y };
        container.style.cursor = 'grabbing';
    };
    const onMouseMove = (e) => {
        if (!isPanning) return;
        e.preventDefault();
        currentTransform.x = e.clientX - startPan.x;
        currentTransform.y = e.clientY - startPan.y;
        applyTransform();
    };
    const onMouseUp = () => {
        isPanning = false;
        container.style.cursor = 'grab';
    };
    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    container._cleanup = () => {
        container.removeEventListener('wheel', onWheel);
        container.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        container._panZoomActive = false;
    };

    svgElement.style.transition = 'transform 0.05s linear';
    svgElement.style.cursor = 'grab';
    container.style.cursor = 'grab';
    applyTransform();
}

function detachPanZoom(container) {
    if (container && container._cleanup) {
        container._cleanup();
    }
}

// Button-controlled zoom functions (used by the on‑screen buttons)
function zoomIn() {
    const svg = document.querySelector('#chart-container svg');
    if (!svg) return;
    const newScale = currentTransform.scale * 1.2;
    if (newScale > 5) return;
    const container = svg.parentElement;
    const rect = container.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const oldScale = currentTransform.scale;
    currentTransform.scale = newScale;
    currentTransform.x = cx - (cx - currentTransform.x) * (newScale / oldScale);
    currentTransform.y = cy - (cy - currentTransform.y) * (newScale / oldScale);
    svg.style.transform = `translate(${currentTransform.x}px, ${currentTransform.y}px) scale(${currentTransform.scale})`;
}

function zoomOut() {
    const svg = document.querySelector('#chart-container svg');
    if (!svg) return;
    const newScale = currentTransform.scale / 1.2;
    if (newScale < 0.2) return;
    const container = svg.parentElement;
    const rect = container.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const oldScale = currentTransform.scale;
    currentTransform.scale = newScale;
    currentTransform.x = cx - (cx - currentTransform.x) * (newScale / oldScale);
    currentTransform.y = cy - (cy - currentTransform.y) * (newScale / oldScale);
    svg.style.transform = `translate(${currentTransform.x}px, ${currentTransform.y}px) scale(${currentTransform.scale})`;
}

function resetView() {
    currentTransform = { x: 0, y: 0, scale: 1 };
    const svg = document.querySelector('#chart-container svg');
    if (svg) {
        svg.style.transform = `translate(0px, 0px) scale(1)`;
    }
}

// ========================== MAIN INITIALIZATION ==========================
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

        // Sidebar toggle
        const sidebar = document.getElementById('sidebar');
        const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
        let isSidebarOpen = true;
        if (toggleSidebarBtn && sidebar) {
            toggleSidebarBtn.addEventListener('click', () => {
                isSidebarOpen = !isSidebarOpen;
                sidebar.style.width = isSidebarOpen ? '16rem' : '0px';
                sidebar.style.opacity = isSidebarOpen ? '1' : '0';
            });
        }

        const historyManager = new HistoryManager();
        historyManager.renderHistory();

        if (themeToggle) {
            themeToggle.addEventListener('click', () => document.documentElement.classList.toggle('dark'));
        }
        if (newProjectBtn) {
            newProjectBtn.addEventListener('click', () => {
                input.value = '';
                langSelect.value = 'python';
                triggerAutoSave();
                historyManager.showNotification('🆕 New project created');
            });
        }

        const savedDraft = localStorage.getItem('autosave_draft');
        if (savedDraft) {
            const draftData = JSON.parse(savedDraft);
            input.value = draftData.code;
            langSelect.value = draftData.language;
            console.log("📥 Auto-saved draft loaded!");
        }

        mermaid.initialize({ startOnLoad: false, theme: 'base', flowchart: { useMaxWidth: false } });

        function triggerAutoSave() {
            localStorage.setItem('autosave_draft', JSON.stringify({ code: input.value, language: langSelect.value }));
        }
        input.addEventListener('input', triggerAutoSave);
        langSelect.addEventListener('change', triggerAutoSave);

        // Zoom button listeners
        document.getElementById('zoomInBtn')?.addEventListener('click', zoomIn);
        document.getElementById('zoomOutBtn')?.addEventListener('click', zoomOut);
        document.getElementById('resetViewBtn')?.addEventListener('click', resetView);

        btn.addEventListener('click', () => {
            const currentCode = input.value;
            const currentLang = langSelect.value;
            const preview = currentCode.split('\n')[0].substring(0, 40);
            if (currentCode.trim()) historyManager.saveToHistory(currentCode, currentLang, preview);

            loader.classList.remove('hidden');
            chartContainer.innerHTML = '';
            // Reset transform before new diagram
            currentTransform = { x: 0, y: 0, scale: 1 };

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
                    if (mermaidElement) mermaidElement.removeAttribute('data-processed');
                    await mermaid.run();

                    // After rendering, attach pan/zoom to the new SVG
                    const svg = chartContainer.querySelector('svg');
                    if (svg) {
                        const parent = svg.parentElement;
                        detachPanZoom(parent);
                        attachPanZoom(svg);
                    }
                } catch (err) {
                    console.error("Error generating flowchart:", err);
                    chartContainer.innerHTML = `<div class="flex flex-col items-center justify-center text-center h-full">
                        <span class="material-symbols-outlined text-4xl text-error">error</span>
                        <p class="text-error text-sm mt-4">Error generating flowchart</p>
                        <p class="text-on-surface-variant text-xs mt-2">${err.message}</p>
                    </div>`;
                } finally {
                    loader.classList.add('hidden');
                }
            }, 100);
        });

        // Auto-generate on page load
        setTimeout(() => btn.click(), 500);
    } catch (e) {
        console.error("❌ ERROR:", e);
    }
}

// Start everything
init();
