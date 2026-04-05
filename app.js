// ============================================================================
//  CODE TO FLOWCHART - COMPLETE APP.JS (with Wrapper-based Pan/Zoom, History, Parser)
// ============================================================================
//  This file handles:
//    - Tree-sitter parsing (Python & C)
//    - Mermaid flowchart generation
//    - Auto‑save & history panel (localStorage)
//    - Dark mode toggle
//    - Interactive Wrapper-based pan & zoom (mouse drag + scroll + buttons)
// ============================================================================

console.log("🚀 App.js is loaded and running!");

// ========================== HISTORY MANAGER ==========================
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
    
    // Update CodeMirror editor (global reference)
    if (window.globalEditor && window.globalEditor.setValue) {
        window.globalEditor.setValue(item.code);
    }
    
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
// Helper to update CodeMirror editor when history loads
function updateCodeMirrorEditor(code) {
    // Try to access the global editor variable (CodeMirror 5)
    if (typeof editor !== 'undefined' && editor && editor.setValue) {
        editor.setValue(code);
    }
    // Alternative: find the CodeMirror instance via DOM
    const cmDiv = document.querySelector('.CodeMirror');
    if (cmDiv && cmDiv.CodeMirror) {
        cmDiv.CodeMirror.setValue(code);
    }
}
// ========================== C PREPROCESSOR ==========================
function preprocessCCode(code) {
    let cleaned = code.replace(/^#include.*$/gm, '');
    cleaned = cleaned.replace(/^#define.*$/gm, '');
    cleaned = cleaned.replace(/^#if.*$/gm, '');
    cleaned = cleaned.replace(/^#endif.*$/gm, '');
    return cleaned;
}

// ========================== MERMAID GENERATOR ==========================
function generateMermaid(rootNode) {
    let code = "graph TD\n";
    let idCounter = 0;

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

// ========================== PAN & ZOOM (Wrapper-based) ==========================
let currentTransform = { x: 0, y: 0, scale: 1 };
let isPanning = false;
let startPan = { x: 0, y: 0 };

function attachPanZoom(wrapperElement) {
    if (!wrapperElement) return;
    const container = wrapperElement.parentElement; // #chart-container
    if (!container) return;
    if (container._panZoomActive) return;
    container._panZoomActive = true;

    const transformTarget = wrapperElement;
    let initialPinchDistance = 0;
    let initialScale = 1;
    let panStart = null;
function getPinchDistance(touches) {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
}
    function applyTransform() {
        transformTarget.style.transform = `translate(${currentTransform.x}px, ${currentTransform.y}px) scale(${currentTransform.scale})`;
    }

    function zoomAt(clientX, clientY, delta) {
        // delta: +1 = zoom in, -1 = zoom out
        const zoomFactor = delta === 1 ? 1.1 : 0.9;
        const newScale = currentTransform.scale * zoomFactor;
        if (newScale < 0.2 || newScale > 5) return;

        const containerRect = container.getBoundingClientRect();
        const mouseX = clientX - containerRect.left;
        const mouseY = clientY - containerRect.top;

        // Point in the wrapper's local coordinate system (before zoom)
        const localX = (mouseX - currentTransform.x) / currentTransform.scale;
        const localY = (mouseY - currentTransform.y) / currentTransform.scale;

        currentTransform.x = mouseX - localX * newScale;
        currentTransform.y = mouseY - localY * newScale;
        currentTransform.scale = newScale;

        applyTransform();
    }

    const onWheel = (e) => {
        e.preventDefault();
        zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1 : -1);
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
    container.removeEventListener('touchstart', onTouchStart);
    container.removeEventListener('touchmove', onTouchMove);
    container.removeEventListener('touchend', onTouchEnd);
    container._panZoomActive = false;
};

    transformTarget.style.transition = 'transform 0.05s linear';
    container.style.cursor = 'grab';
    applyTransform();
    // Add touch events for mobile (keep existing mouse/wheel code)
const onTouchStart = (e) => {
    if (e.touches.length === 1) {
        e.preventDefault();
        isPanning = true;
        startPan = { x: e.touches[0].clientX - currentTransform.x, y: e.touches[0].clientY - currentTransform.y };
        container.style.cursor = 'grabbing';
    }
};
const onTouchMove = (e) => {
    if (!isPanning) return;
    e.preventDefault();
    currentTransform.x = e.touches[0].clientX - startPan.x;
    currentTransform.y = e.touches[0].clientY - startPan.y;
    applyTransform();
};
const onTouchEnd = () => {
    isPanning = false;
    container.style.cursor = 'grab';
};
container.addEventListener('touchstart', onTouchStart, { passive: false });
container.addEventListener('touchmove', onTouchMove, { passive: false });
container.addEventListener('touchend', onTouchEnd);
}

function detachPanZoom(container) {
    if (container && container._cleanup) {
        container._cleanup();
    }
}

// Button zoom (centered on view)
function zoomIn() {
    const wrapper = document.querySelector('.zoom-pan-wrapper');
    if (!wrapper) return;
    const container = wrapper.parentElement;
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const newScale = currentTransform.scale * 1.2;
    if (newScale > 5) return;
    const localX = (centerX - rect.left - currentTransform.x) / currentTransform.scale;
    const localY = (centerY - rect.top - currentTransform.y) / currentTransform.scale;
    currentTransform.x = (centerX - rect.left) - localX * newScale;
    currentTransform.y = (centerY - rect.top) - localY * newScale;
    currentTransform.scale = newScale;
    wrapper.style.transform = `translate(${currentTransform.x}px, ${currentTransform.y}px) scale(${currentTransform.scale})`;
}

function zoomOut() {
    const wrapper = document.querySelector('.zoom-pan-wrapper');
    if (!wrapper) return;
    const container = wrapper.parentElement;
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const newScale = currentTransform.scale / 1.2;
    if (newScale < 0.2) return;
    const localX = (centerX - rect.left - currentTransform.x) / currentTransform.scale;
    const localY = (centerY - rect.top - currentTransform.y) / currentTransform.scale;
    currentTransform.x = (centerX - rect.left) - localX * newScale;
    currentTransform.y = (centerY - rect.top) - localY * newScale;
    currentTransform.scale = newScale;
    wrapper.style.transform = `translate(${currentTransform.x}px, ${currentTransform.y}px) scale(${currentTransform.scale})`;
}

function resetView() {
    currentTransform = { x: 0, y: 0, scale: 1 };
    const wrapper = document.querySelector('.zoom-pan-wrapper');
    if (wrapper) {
        wrapper.style.transform = `translate(0px, 0px) scale(1)`;
    }
}

// ========================== MAIN INIT ==========================
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
let isSidebarOpen = false;

if (toggleSidebarBtn && sidebar) {
    toggleSidebarBtn.addEventListener('click', () => {
        isSidebarOpen = !isSidebarOpen;
        if (window.innerWidth <= 768) {
            if (isSidebarOpen) {
                sidebar.classList.add('mobile-open');
            } else {
                sidebar.classList.remove('mobile-open');
            }
        } else {
            sidebar.style.width = isSidebarOpen ? '16rem' : '0px';
            sidebar.style.opacity = isSidebarOpen ? '1' : '0';
        }
    });
}

        const historyManager = new HistoryManager();
        historyManager.renderHistory();

        // --- Define auto-save function FIRST ---
        function triggerAutoSave() {
            localStorage.setItem('autosave_draft', JSON.stringify({ code: input.value, language: langSelect.value }));
        }

        // --- Auto-save draft is NOT loaded on page refresh (only history) ---
// We keep auto-save for changes, but initial load comes from history.
console.log("🔄 Skipping auto-save draft on load, using history instead.");

        // --- Load most recent history (overwrites draft) ---
const history = historyManager.getHistory();
if (history.length > 0) {
    const lastItem = history[0];
    input.value = lastItem.code;
    langSelect.value = lastItem.language;
    // Immediately update the editor if it exists
    if (window.updateEditorContent) {
        window.updateEditorContent(lastItem.code, lastItem.language);
    } else {
        // Editor not ready yet – store for later
        window._pendingEditorUpdate = { code: lastItem.code, language: lastItem.language };
    }
    // Overwrite the auto-save draft to match history
    triggerAutoSave();
    console.log("📜 Loaded most recent history item:", lastItem.preview);
} else {
    // No history, ensure default code is saved as draft
    triggerAutoSave();
}

        // --- Mermaid and event listeners ---
        mermaid.initialize({ startOnLoad: false, theme: 'base', flowchart: { useMaxWidth: false } });

        input.addEventListener('input', triggerAutoSave);
        langSelect.addEventListener('change', () => {
            triggerAutoSave();
            if (window.updateEditorLanguage) {
                window.updateEditorLanguage(langSelect.value);
            }
        });

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

        // Button listeners
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

                    const wrapper = document.createElement('div');
                    wrapper.className = 'zoom-pan-wrapper';
                    wrapper.style.display = 'inline-block';
                    wrapper.style.transformOrigin = '0 0';
                    wrapper.innerHTML = `<pre class="mermaid">${diagramText}</pre>`;
                    chartContainer.appendChild(wrapper);

                    const mermaidElement = wrapper.querySelector('.mermaid');
                    if (mermaidElement) mermaidElement.removeAttribute('data-processed');
                    await mermaid.run();

                    detachPanZoom(chartContainer);
                    attachPanZoom(wrapper);
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

        setTimeout(() => btn.click(), 500);
    } catch (e) {
        console.error("❌ ERROR:", e);
    }
}

init();
