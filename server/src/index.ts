import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import authRoutes from './routes/auth';
import { authenticate, AuthRequest } from './middleware/auth';
import prisma from './lib/prisma';
import { getAiSuggestion } from './lib/ai';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Protected routes
app.get('/api/dashboard', authenticate, async (req: AuthRequest, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: req.userId },
          { collaborators: { some: { id: req.userId } } }
        ]
      },
      include: {
        owner: { select: { name: true, email: true } }
      }
    });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching projects', error });
  }
});

// Socket.io for Real-time Drawing, Presence, AI, & Comments
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-project', async (projectId: string) => {
    socket.join(projectId);
    console.log(`User ${socket.id} joined project ${projectId}`);
    
    // Send existing comments to the user who just joined
    const comments = await prisma.comment.findMany({
      where: { projectId },
      include: { author: { select: { name: true } } }
    });
    socket.emit('load-comments', comments);
  });

  socket.on('draw', (data: { projectId: string, drawingData: any }) => {
    socket.to(data.projectId).emit('draw-update', data.drawingData);
  });

  socket.on('presence', (data: { projectId: string, x: number, y: number, color: string, name: string }) => {
    socket.to(data.projectId).emit('presence-update', { 
      userId: socket.id, 
      ...data 
    });
  });

  // Comments
  socket.on('comment', async (data: { projectId: string, comment: any }) => {
    socket.to(data.projectId).emit('comment-update', data.comment);
  });

  // AI Assistance & Shape Recognition
  socket.on('ai-message', async (data: { projectId: string, message: string }) => {
    const response = await getAiSuggestion(data.message);
    try {
      const parsed = JSON.parse(response);
      socket.emit('ai-response', { 
        content: parsed.content || "I've identified the shape!", 
        shape: parsed.shape 
      });
    } catch (e) {
      socket.emit('ai-response', { content: response });
    }
  });

  socket.on('disconnecting', () => {
    const rooms = Array.from(socket.rooms);
    rooms.forEach(room => {
      if (room !== socket.id) {
        socket.to(room).emit('user-disconnected', socket.id);
      }
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
