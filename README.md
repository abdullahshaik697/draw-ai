# 🎨 Collaborative Whiteboard Engine

A professional-grade, real-time collaborative whiteboard built with React, Vite, and Socket.io. This tool provides a high-fidelity design environment with precision drawing, asset management, and desktop-grade keyboard shortcuts.


## 🚀 Key Features

- **Advanced Drawing Tools**:
  - Precision Pen & Brush tools.
  - Geometry: Rectangles, Circles, Triangles.
  - Connectors: Dynamic Lines and Arrows.
  - Multiline Text support (Shift + Enter).
- **Professional Asset Library**:
  - Searchable SVG icon library (Rocket, CPU, Server, etc.).
  - Icons are treated as vector objects (resizable and colorable).
- **Design Interactions**:
  - **Zoom & Pan**: Smooth navigation across an infinite-feeling grid.
  - **Precision Resizing**: Individual handles for high-fidelity control.
  - **Color & Stroke Sync**: Live updates for selected elements.
- **Desktop-Grade Shortcuts**:
  - `Ctrl + D`: Duplicate Selection.
  - `Ctrl + A`: Select All.
  - `Ctrl + Z / Y`: Undo / Redo.
  - `Arrow Keys`: 1px Nudging (Shift for 10px).
  - `V, P, E, T, M`: Instant tool switching.
  - `Shift + Draw`: Snap to straight lines and perfect squares.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Framer Motion.
- **Canvas Engine**: HTML5 Canvas API with Path2D vector rendering.
- **Icons**: Lucide-React & Custom SVG Paths.

## 📦 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/drawing-app.git
cd drawing-app
```

### 2. Setup the Server
```bash
cd server
npm install
npm start
```

### 3. Setup the Client
```bash
cd client
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + D` | **Duplicate** selected elements |
| `Ctrl + A` | **Select All** elements |
| `Ctrl + Z / Y` | **Undo / Redo** actions |
| `Arrows` | **Nudge** selection (1px) |
| `Shift + Arrows` | **Move** selection (10px) |
| `V` | **Select** Tool |
| `P / B` | **Brush / Pen** Tool |
| `E` | **Eraser** Tool |
| `T` | **Text** Tool |
| `M` | **Magic AI** Tool |
| `Shift + Drag` | **Snap** to lines/squares |

## 📂 Project Structure

```text
├── client/
│   ├── src/
│   │   ├── pages/         # Core Whiteboard Page (DrawingPage.tsx)
│   │   ├── icons/         # Modular SVG Library (iconLibrary.ts)
│   │   └── components/    # Reusable UI Components
├── server/
│   └── server.js          # Socket.io & Real-time logic
└── README.md              # Documentation
```

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request for new features like:
- PostgreSQL/Prisma persistence.
- Image uploads.
- Export to PNG/SVG.
- More AI design suggestions.

---
Built with ❤️ by abdullahshaik697
