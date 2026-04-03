
# Code to Flowchart

> **Transform your Python and C code into beautiful, interactive flowcharts instantly**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Made with Tree-sitter](https://img.shields.io/badge/Made%20with-Tree--sitter-blue.svg)](https://tree-sitter.github.io/tree-sitter/)
[![UI TailwindCSS](https://img.shields.io/badge/UI-TailwindCSS-06B6D4.svg)](https://tailwindcss.com/)
[![Diagrams Mermaid.js](https://img.shields.io/badge/Diagrams-Mermaid.js-FF3670.svg)](https://mermaid.js.org/)

## Features

| Feature | Description |
|---------|-------------|
| 🔍 **Real-time Parsing** | Uses Tree-sitter for accurate AST parsing of Python and C |
| 🎨 **Beautiful UI** | Dark mode optimized with smooth animations and responsive design |
| 💾 **Auto-save** | Never lose your work — drafts are saved automatically |
| 📜 **History Panel** | Access your last 10 flowcharts with one click |
| 📤 **File Support** | Upload code files directly (coming soon) |
| 🔗 **Live Preview** | Flowchart updates in real-time as you code |
| 🌙 **Dark Mode** | Easy on the eyes for those late-night coding sessions |

## Tech Stack

- **Frontend**: HTML5, TailwindCSS, JavaScript (ES6+)
- **Parsing**: [Tree-sitter](https://tree-sitter.github.io/tree-sitter/) (Python & C grammars)
- **Visualization**: [Mermaid.js](https://mermaid.js.org/)
- **Storage**: LocalStorage API
- **Icons**: Material Symbols

## Installation

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- No server required — runs entirely in the browser!

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/dhishan9/flow.git
   cd flow
   ```

2. **Set up Tree-sitter parsers**
   ```bash
   mkdir -p parsers
   ```
   Place `tree-sitter-python.wasm` and `tree-sitter-c.wasm` in the `parsers/` folder.

3. **Open the application**
   - Simply open `flow.html` in your browser
   - Or serve locally:
     ```bash
     python -m http.server 8000
     ```

4. **Start visualizing!**
   - Paste your Python or C code
   - Click "Update Flowchart"
   - Watch your logic come to life

## Usage Examples

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

## How It Works

1. **Code Input** → Your code is captured from the editor
2. **AST Parsing** → Tree-sitter builds an Abstract Syntax Tree
3. **Node Traversal** → The tree is traversed and each node is classified
4. **Mermaid Generation** → Nodes and edges are converted to Mermaid syntax
5. **Rendering** → Mermaid renders the interactive flowchart

## Project Structure

```
flow/
├── flow.html           # Main application UI
├── app.js              # Core logic (parsing, rendering, history)
├── parsers/            # Tree-sitter WASM files
│   ├── tree-sitter-python.wasm
│   └── tree-sitter-c.wasm
├── README.md
└── LICENSE
```

## Roadmap

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
- [ ] Shareable links
- [ ] Code syntax highlighting
- [ ] Real-time update as you type
- [ ] Multi-file project support

## Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Tree-sitter](https://tree-sitter.github.io/tree-sitter/)
- [Mermaid.js](https://mermaid.js.org/)
- [TailwindCSS](https://tailwindcss.com/)

## Contact

**Dhishan** — CSE Student

- GitHub: [@dhishan9](https://github.com/dhishan9)
- Project Link: [https://github.com/dhishan9/flow](https://github.com/dhishan9/flow)

---

<p align="center">
Made with ☕ and 🧠 by Dhishan
</p>
## Live Demo

Try it here: [https://dhishan9.github.io/flow/](https://dhishan9.github.io/flow/flow.html)

---

## License

MIT © [Dhishan](https://github.com/dhishan9)
