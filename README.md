# 🎨 DrawAI - Premium Collaborative Design Engine

DrawAI is a high-fidelity, real-time collaborative vector drawing platform built for modern teams. It combines the power of a professional design tool with the seamless synchronization of a collaborative workspace.

![Premium Design](https://img.shields.io/badge/Aesthetics-Premium-blueviolet?style=for-the-badge)
![Security](https://img.shields.io/badge/Security-Hardened-green?style=for-the-badge)
![Real-time](https://img.shields.io/badge/Collaboration-Real--time-orange?style=for-the-badge)

## 🚀 Key Features

### 🛠️ Advanced Vector Engine
- **Versatile Toolset**: Pen, Rectangles, Circles, Triangles, Lines, Arrows, and rich Text support.
- **Smart Selection**: Selecting an element automatically syncs the toolbar to its properties (color, stroke width).
- **Infinite Navigation**: High-performance Zoom-to-Cursor and Panning (Middle-click or Spacebar).
- **Proportional Scaling**: Hold `Shift` for perfect squares, circles, and aspect-ratio locked resizing.

### 👥 Collaborative Workspace
- **Access Management**: Invite teammates by email and manage permissions from a unified dashboard.
- **Real-time Sync**: Experience buttery-smooth canvas updates and presence tracking.
- **Discussion Panel**: Contextual real-time chat for seamless team communication.
- **Role-based Security**: Only owners can rename, delete, or manage project access.

### 🔄 Advanced History System
- **Full-State Undo/Redo**: Every action—including color changes, resizing, and moving—is fully reversible.
- **Snapshots**: Smart debouncing ensures a smooth history timeline without performance lag.

### 🛡️ Hardened Security
- **Authenticated WebSockets**: Every real-time connection is verified via JWT to prevent unauthorized access.
- **Strict Access Control**: Server-side verification for every project interaction (API & Socket).
- **Security Headers**: Integrated Helmet.js protection against common web vulnerabilities.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Framer Motion, Lucide Icons, Axios.
- **Backend**: Node.js, Express, Socket.io, JWT.
- **Database**: PostgreSQL (Neon), Prisma ORM.
- **Security**: Helmet, BCryptJS, JWT-Auth.

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **V** | Select Tool |
| **H / Space** | Hand Tool (Pan) |
| **P / B** | Brush (Pen) Tool |
| **T** | Text Tool |
| **Ctrl + Z** | Undo Action |
| **Ctrl + Y** | Redo Action |
| **Ctrl + A** | Select All Elements |
| **Ctrl + D** | Duplicate Selection |
| **Delete / Backspace**| Remove Selected Elements |
| **Arrows** | Nudge Selection (1px / 10px with Shift) |
| **Ctrl + Wheel** | Zoom in / out |

## 🏗️ Installation & Setup

1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd drawing_app
   ```

2. **Server Configuration**:
   ```bash
   cd server
   npm install
   # Create a .env file with DATABASE_URL, DIRECT_URL, JWT_SECRET, and GROQ_API_KEY
   npx prisma generate
   npm run dev
   ```

3. **Client Configuration**:
   ```bash
   cd client
   npm install
   npm run dev
   ```

## 📄 License
This project is licensed under the ISC License. Built with ❤️ for creative teams.

Made with ❤️ by abdullahshaik697
