---

# Code to Flowchart 🔄

> **Transform your Python and C code into beautiful, interactive flowcharts instantly**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Made with](https://img.shields.io/badge/Made%20with-Tree--sitter-blue)](https://tree-sitter.github.io/tree-sitter/)
[![UI](https://img.shields.io/badge/UI-TailwindCSS-06B6D4)](https://tailwindcss.com/)
[![Diagrams](https://img.shields.io/badge/Diagrams-Mermaid.js-FF3670)](https://mermaid.js.org/)

![Demo Preview](https://via.placeholder.com/800x400?text=Code+to+Flowchart+Demo) <!-- Add a real screenshot here later -->

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔍 **Real-time Parsing** | Uses Tree-sitter for accurate AST parsing of Python and C |
| 🎨 **Beautiful UI** | Dark mode optimized with smooth animations and responsive design |
| 💾 **Auto-save** | Never lose your work — drafts are saved automatically |
| 📜 **History Panel** | Access your last 10 flowcharts with one click |
| 📤 **File Support** | Upload code files directly (coming soon) |
| 🔗 **Live Preview** | Flowchart updates in real-time as you code |
| 🌙 **Dark Mode** | Easy on the eyes for those late-night coding sessions |

## 🚀 Live Demo

**[Try it live here!](https://yourusername.github.io/code-to-flowchart/)** <!-- Add your GitHub Pages link -->

## 📸 Screenshots

| Editor View | Flowchart Output |
|-------------|------------------|
| ![Editor](https://via.placeholder.com/400x300?text=Code+Editor) | ![Flowchart](https://via.placeholder.com/400x300?text=Flowchart) |

## 🛠️ Tech Stack

- **Frontend**: HTML5, TailwindCSS, JavaScript (ES6+)
- **Parsing**: [Tree-sitter](https://tree-sitter.github.io/tree-sitter/) (Python & C grammars)
- **Visualization**: [Mermaid.js](https://mermaid.js.org/)
- **Storage**: LocalStorage API
- **Icons**: Material Symbols

## 📦 Installation

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- No server required — runs entirely in the browser!

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/code-to-flowchart.git
   cd code-to-flowchart
   ```

2. **Set up Tree-sitter parsers**
   ```bash
   # Download the required parser files
   mkdir -p parsers
   # Place tree-sitter-python.wasm and tree-sitter-c.wasm in the parsers/ folder
   ```
   > **Note**: You can find the parser files in the [releases section](https://github.com/yourusername/code-to-flowchart/releases) or build them yourself using the Tree-sitter CLI.

3. **Open the application**
   - Simply open `flow.html` in your browser
   - Or serve locally with any static server:
     ```bash
     npx serve .
     # or
     python -m http.server 8000
     ```

4. **Start visualizing!**
   - Paste your Python or C code
   - Click "Update Flowchart"
   - Watch your logic come to life

## 🎯 Usage Examples

### Python Example
```python
def factorial_recursive(n):
    if n < 0:
        return "Not defined for negative numbers"
    elif n == 0 or n == 1:
        return 1
    else:
        return n * factorial_recursive(n - 1)

number = 5
print(f"The factorial of {number} is {factorial_recursive(number)}")
```

### C Example
```c
#include <stdio.h>

int main() {
    int n = 5, factorial = 1;
    
    for (int i = 1; i <= n; i++) {
        factorial *= i;
    }
    
    printf("Factorial of %d is %d\n", n, factorial);
    return 0;
}
```

## 🧠 How It Works

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Your Code  │ ──▶ │ Tree-sitter  │ ──▶ │   Mermaid   │
│  (Python/C) │     │   AST Parser │     │   Diagram   │
└─────────────┘     └──────────────┘     └─────────────┘
                            │                    │
                            ▼                    ▼
                    ┌──────────────┐     ┌─────────────┐
                    │ Node Traversal│     │  Interactive│
                    │ & Classification│   │  Flowchart  │
                    └──────────────┘     └─────────────┘
```

1. **Code Input** → Your code is captured from the editor
2. **AST Parsing** → Tree-sitter builds an Abstract Syntax Tree
3. **Node Traversal** → The tree is traversed and each node is classified (condition, loop, I/O, etc.)
4. **Mermaid Generation** → Nodes and edges are converted to Mermaid syntax
5. **Rendering** → Mermaid renders the interactive flowchart

## 📁 Project Structure

```
code-to-flowchart/
├── flow.html           # Main application UI
├── app.js              # Core logic (parsing, rendering, history)
├── parsers/            # Tree-sitter WASM files
│   ├── tree-sitter-python.wasm
│   └── tree-sitter-c.wasm
├── assets/             # Images, icons, etc.
├── README.md           # You are here
└── LICENSE             # MIT License
```

## 🔧 Roadmap

### ✅ Completed
- [x] Python parser integration
- [x] C parser integration
- [x] Dark mode UI
- [x] Auto-save drafts
- [x] History panel with localStorage
- [x] Basic flowchart generation

### 🚧 In Progress
- [ ] JavaScript/TypeScript support
- [ ] Zoom and pan on flowchart
- [ ] Export as PNG/SVG/PDF

### 📅 Planned
- [ ] Drag-and-drop file upload
- [ ] Shareable links (save to cloud)
- [ ] Code syntax highlighting
- [ ] Real-time update as you type
- [ ] Multi-file project support
- [ ] Flowchart customization (colors, layout)

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Areas for Contribution
- Add support for more languages (JavaScript, Java, Go, Rust)
- Improve node classification for complex structures
- Enhance flowchart styling and layout
- Add testing suite
- Performance optimizations

## 🐛 Known Issues

- Nested conditionals may produce overlapping edges (improving this)
- Very large codebases (>500 lines) may impact performance
- C preprocessor directives are stripped for cleaner parsing

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Tree-sitter](https://tree-sitter.github.io/tree-sitter/) for the incredible parsing engine
- [Mermaid.js](https://mermaid.js.org/) for beautiful diagram rendering
- [TailwindCSS](https://tailwindcss.com/) for the sleek UI
- All contributors and users of this project

## 📬 Contact

**Dhishan** — CSE Student & Developer

- GitHub: [@yourusername](https://github.com/yourusername)
- Project Link: [https://github.com/yourusername/code-to-flowchart](https://github.com/yourusername/code-to-flowchart)

---

<p align="center">
  Made with ☕ and 🧠 by Dhishan
</p>

---
