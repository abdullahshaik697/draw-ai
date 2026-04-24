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
      orderBy: { updatedAt: 'desc' },
      include: {
        owner: { select: { name: true, email: true } }
      }
    });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching projects', error });
  }
});

app.post('/api/projects', authenticate, async (req: AuthRequest, res) => {
  try {
    const { title } = req.body;
    const project = await prisma.project.create({
      data: {
        title: title || 'Untitled Project',
        ownerId: req.userId!,
        data: [] // Initial empty canvas
      }
    });
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: 'Error creating project', error });
  }
});

app.get('/api/projects/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: { owner: { select: { name: true } } }
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching project', error });
  }
});

app.patch('/api/projects/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    
    // Check ownership
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.ownerId !== req.userId) return res.status(403).json({ message: 'Unauthorized' });

    const updated = await prisma.project.update({
      where: { id },
      data: { title }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error renaming project', error });
  }
});

app.delete('/api/projects/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    // Check ownership
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.ownerId !== req.userId) return res.status(403).json({ message: 'Unauthorized' });

    await prisma.project.delete({ where: { id } });
    res.json({ message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting project', error });
  }
});

// Socket.io for Real-time Drawing, Presence, AI, & Comments
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-project', async (projectId: string) => {
    socket.join(projectId);
    console.log(`User ${socket.id} joined project ${projectId}`);
    
    // Load project data from DB
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    if (project && project.data) {
      socket.emit('load-project', project.data);
    }

    // Send existing comments to the user who just joined
    const comments = await prisma.comment.findMany({
      where: { projectId },
      include: { author: { select: { name: true } } }
    });
    socket.emit('load-comments', comments);
  });

  socket.on('draw', async (data: { projectId: string, drawingData: any, fullState?: any[] }) => {
    socket.to(data.projectId).emit('draw-update', data.drawingData);
    
    // Persist full state to DB if provided
    if (data.fullState) {
      try {
        await prisma.project.update({
          where: { id: data.projectId },
          data: { data: data.fullState }
        });
      } catch (err) {
        console.error('Error saving project state:', err);
      }
    }
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
