import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import { authenticate, AuthRequest } from './middleware/auth';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// Security Middlewares
app.use(helmet()); // Sets various HTTP headers for security
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Helper: Check if user has access to project
const checkProjectAccess = async (projectId: string, userId: string) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { collaborators: { select: { id: true } } }
  });
  if (!project) return false;
  const isOwner = project.ownerId === userId;
  const isCollaborator = project.collaborators.some(c => c.id === userId);
  return isOwner || isCollaborator;
};

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
        owner: { select: { id: true, name: true, email: true } },
        collaborators: { select: { id: true, name: true, email: true } }
      }
    });

    const mappedProjects = projects.map(p => ({
      ...p,
      isShared: p.ownerId !== req.userId
    }));

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { name: true, email: true }
    });

    res.json({ user, projects: mappedProjects });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard data', error });
  }
});

app.post('/api/projects', authenticate, async (req: AuthRequest, res) => {
  try {
    const { title } = req.body;
    const project = await prisma.project.create({
      data: {
        title: title || 'Untitled Project',
        ownerId: req.userId!,
        data: []
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
    
    // Security: Check access before returning project data
    const hasAccess = await checkProjectAccess(id, req.userId!);
    if (!hasAccess) return res.status(403).json({ message: 'Access denied' });

    const project = await prisma.project.findUnique({
      where: { id },
      include: { 
        owner: { select: { id: true, name: true, email: true } },
        collaborators: { select: { id: true, name: true, email: true } }
      }
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
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.ownerId !== req.userId) return res.status(403).json({ message: 'Unauthorized' });

    await prisma.comment.deleteMany({ where: { projectId: id } });
    await prisma.project.delete({ where: { id } });
    res.json({ message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting project', error });
  }
});

app.post('/api/projects/:id/collaborators', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    // Security: Only owner can add collaborators
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project || project.ownerId !== req.userId) return res.status(403).json({ message: 'Unauthorized' });

    const userToAdd = await prisma.user.findUnique({ where: { email } });
    if (!userToAdd) return res.status(404).json({ message: 'User not found' });

    const updated = await prisma.project.update({
      where: { id },
      data: { collaborators: { connect: { id: userToAdd.id } } }
    });

    res.json({ message: 'Collaborator added', project: updated });
  } catch (error) {
    res.status(500).json({ message: 'Error adding collaborator', error });
  }
});

app.delete('/api/projects/:id/collaborators/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id, userId } = req.params;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project || project.ownerId !== req.userId) return res.status(403).json({ message: 'Unauthorized' });

    await prisma.project.update({
      where: { id },
      data: { collaborators: { disconnect: { id: userId } } }
    });

    res.json({ message: 'Access revoked' });
  } catch (error) {
    res.status(500).json({ message: 'Error removing collaborator', error });
  }
});

// Socket.io Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  
  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) return next(new Error('Authentication error'));
    (socket as any).userId = decoded.userId;
    next();
  });
});

// Socket.io Handlers
io.on('connection', (socket) => {
  const userId = (socket as any).userId;
  console.log(`Authenticated user connected: ${userId}`);

  socket.on('join-project', async (projectId: string) => {
    // Security: Verify access before allowing room join
    const hasAccess = await checkProjectAccess(projectId, userId);
    if (!hasAccess) {
      socket.emit('error', 'Access denied');
      return;
    }

    socket.join(projectId);
    
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (project && project.data) socket.emit('load-project', project.data);

    const comments = await prisma.comment.findMany({
      where: { projectId },
      include: { author: { select: { name: true } } }
    });
    socket.emit('load-comments', comments);
  });

  socket.on('draw', async (data: { projectId: string, drawingData: any, fullState?: any[] }) => {
    // Security: Basic check to ensure user is in the room they're drawing in
    if (!socket.rooms.has(data.projectId)) return;
    
    socket.to(data.projectId).emit('draw-update', data.drawingData);
    if (data.fullState) {
      try {
        await prisma.project.update({
          where: { id: data.projectId },
          data: { data: data.fullState }
        });
      } catch (err) { console.error('Error saving project state:', err); }
    }
  });

  socket.on('comment', async (data: { projectId: string, content: string }) => {
    if (!socket.rooms.has(data.projectId)) return;
    try {
      const comment = await prisma.comment.create({
        data: { text: data.content, x: 0, y: 0, projectId: data.projectId, authorId: userId },
        include: { author: { select: { name: true } } }
      });
      io.to(data.projectId).emit('comment-update', comment);
    } catch (err) { console.error('Error saving comment:', err); }
  });

  socket.on('disconnect', () => { console.log('User disconnected:', userId); });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });
