import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { 
  Palette, MousePointer2, Square, Circle, Triangle, ArrowRight, 
  Undo2, Redo2, Download, ChevronLeft, Sparkles, Loader2, 
  Wand2, MessageSquare, X, Type, Minus, Search, ZoomIn, ZoomOut, 
  Move, Eraser, Image as ImageIcon, Plus, Globe, Layout, Smartphone,
  Zap, Wifi, Rocket as RocketIcon, Settings as SettingsIcon,
  Cpu as CpuIcon, Terminal, Mail, User, Heart, Star,
  Briefcase, Coffee, Sun, Moon, Maximize2, Save, Check, Edit3, Send, Users, Share2, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Import our external Icon Library
import { ICON_PATHS, ICON_COMPONENTS } from '../icons/iconLibrary';

interface Point { x: number; y: number; }
interface Element {
  id: string;
  type: 'pen' | 'rect' | 'circle' | 'triangle' | 'arrow' | 'line' | 'text' | 'image' | 'icon';
  points?: Point[];
  x?: number; y?: number;
  width?: number; height?: number;
  radius?: number;
  text?: string;
  iconName?: string;
  color: string;
  lineWidth: number;
}
interface Comment {
  id: string;
  text: string;
  author: { name: string };
  createdAt: string;
}
interface Collaborator {
  id: string;
  name: string;
  email: string;
}

const DrawingPage = () => {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const isRemoteUpdate = useRef(false);
  const requestRef = useRef<number | null>(null);
  const isUndoRedoAction = useRef(false);
  
  const [projectTitle, setProjectTitle] = useState('Untitled Design');
  const [owner, setOwner] = useState<{ id: string, name: string, email: string } | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [elements, setElements] = useState<Element[]>([]);
  const [history, setHistory] = useState<Element[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [textInput, setTextInput] = useState<{ id: string, x: number, y: number, value: string } | null>(null);
  
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [tool, setTool] = useState('pen');
  const [prevTool, setPrevTool] = useState('pen');
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [currentElement, setCurrentElement] = useState<Element | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [color, setColor] = useState('#ffffff');
  const [lineWidth, setLineWidth] = useState(3);
  
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false);
  const [isAssetsOpen, setIsAssetsOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [assetSearch, setAssetSearch] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [shareEmail, setShareEmail] = useState('');
  const [shareLoading, setShareLoading] = useState(false);

  // Sync color AND stroke width to selected elements ONLY when they change
  useEffect(() => {
    if (selectedIds.length > 0) {
      setElements(prev => prev.map(el => selectedIds.includes(el.id) ? { ...el, color, lineWidth } : el));
    }
  }, [color, lineWidth]); // Removed selectedIds from here

  // When selection changes, update the toolbar to match the selected element's properties
  useEffect(() => {
    if (selectedIds.length === 1) {
      const selectedEl = elements.find(el => el.id === selectedIds[0]);
      if (selectedEl) {
        // We use a small flag to prevent the update above from firing immediately
        // and overwriting the element with its own old values (no-op)
        setColor(selectedEl.color);
        setLineWidth(selectedEl.lineWidth);
      }
    }
  }, [selectedIds]);

  // History Snapshots
  useEffect(() => {
    if (isRemoteUpdate.current || isUndoRedoAction.current) return;
    const timer = setTimeout(() => {
      setHistory(prev => {
        const newHistory = prev.slice(0, historyIndex + 1);
        if (JSON.stringify(newHistory[newHistory.length - 1]) === JSON.stringify(elements)) return prev;
        const result = [...newHistory, [...elements]];
        setHistoryIndex(result.length - 1);
        return result;
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [elements, historyIndex]);

  // Fetch project details
  const fetchProject = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/login'); return; }
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      setCurrentUserId(payload.userId);

      const res = await axios.get(`http://localhost:5000/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjectTitle(res.data.title);
      setOwner(res.data.owner);
      setCollaborators(res.data.collaborators || []);
    } catch (err: any) {
      if (err.response?.status === 401) { localStorage.removeItem('token'); navigate('/login'); }
      else if (err.response?.status === 404) { navigate('/dashboard'); }
    }
  }, [projectId, navigate]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    socketRef.current = io('http://localhost:5000', {
      auth: { token }
    });
    
    socketRef.current.emit('join-project', projectId);
    socketRef.current.on('load-project', (data: Element[]) => { isRemoteUpdate.current = true; setElements(data); setHistory([[...data]]); setHistoryIndex(0); setTimeout(() => isRemoteUpdate.current = false, 100); });
    socketRef.current.on('draw-update', (el: Element) => { isRemoteUpdate.current = true; setElements(prev => { const idx = prev.findIndex(e => e.id === el.id); if (idx > -1) { const newArr = [...prev]; newArr[idx] = el; return newArr; } return [...prev, el]; }); setTimeout(() => isRemoteUpdate.current = false, 100); });
    socketRef.current.on('load-comments', (data: Comment[]) => setComments(data));
    socketRef.current.on('comment-update', (comment: Comment) => setComments(prev => [...prev, comment]));
    return () => { socketRef.current?.disconnect(); };
  }, [projectId]);

  const sendComment = () => {
    if (!newComment.trim() || !socketRef.current) return;
    const token = localStorage.getItem('token');
    socketRef.current.emit('comment', { projectId, content: newComment, userId: currentUserId });
    setNewComment('');
  };

  const shareProject = async () => {
    if (!shareEmail.trim()) return;
    setShareLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/projects/${projectId}/collaborators`, { email: shareEmail }, { headers: { Authorization: `Bearer ${token}` } });
      setShareEmail('');
      fetchProject(); // Refresh collaborator list
    } catch (err: any) { alert(err.response?.data?.message || 'Could not add collaborator.'); } finally { setShareLoading(false); }
  };

  const removeCollaborator = async (userId: string) => {
    if (!window.confirm('Are you sure you want to revoke access for this user?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/projects/${projectId}/collaborators/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchProject(); // Refresh collaborator list
    } catch (err: any) { alert(err.response?.data?.message || 'Could not remove collaborator.'); }
  };

  const renameProject = async () => {
    const newTitle = window.prompt('Enter new project name:', projectTitle);
    if (!newTitle || newTitle === projectTitle) return;
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:5000/api/projects/${projectId}`, { title: newTitle }, { headers: { Authorization: `Bearer ${token}` } });
      setProjectTitle(newTitle);
    } catch (err) { console.error(err); }
  };

  const handleManualSave = () => {
    if (!socketRef.current) return;
    setSaveStatus('saving');
    socketRef.current.emit('draw', { projectId, drawingData: {}, fullState: elements });
    setTimeout(() => { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); }, 500);
  };

  const undo = () => { if (historyIndex <= 0) return; isUndoRedoAction.current = true; const newIndex = historyIndex - 1; setElements([...history[newIndex]]); setHistoryIndex(newIndex); setTimeout(() => isUndoRedoAction.current = false, 50); };
  const redo = () => { if (historyIndex >= history.length - 1) return; isUndoRedoAction.current = true; const newIndex = historyIndex + 1; setElements([...history[newIndex]]); setHistoryIndex(newIndex); setTimeout(() => isUndoRedoAction.current = false, 50); };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (textInput || document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (e.code === 'Space' && !e.repeat && tool !== 'hand') { setPrevTool(tool); setTool('hand'); return; }
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
        if (e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
        if (e.key.toLowerCase() === 'a') { e.preventDefault(); setSelectedIds(elements.map(el => el.id)); }
        if (e.key.toLowerCase() === 'd') { e.preventDefault(); duplicate(); }
      } else {
        const step = e.shiftKey ? 10 : 1;
        switch (e.key) {
          case 'v': case 'V': setTool('select'); break;
          case 'p': case 'P': case 'b': case 'B': setTool('pen'); break;
          case 'h': case 'H': setTool('hand'); break;
          case 'e': case 'E': setTool('eraser'); break;
          case 't': case 'T': setTool('text'); break;
          case 'm': case 'M': setTool('magic'); break;
          case 'Backspace': case 'Delete': if (selectedIds.length > 0) { setElements(prev => prev.filter(el => !selectedIds.includes(el.id))); setSelectedIds([]); } break;
          case 'ArrowUp': e.preventDefault(); moveElements(0, -step); break;
          case 'ArrowDown': e.preventDefault(); moveElements(0, step); break;
          case 'ArrowLeft': e.preventDefault(); moveElements(-step, 0); break;
          case 'ArrowRight': e.preventDefault(); moveElements(step, 0); break;
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space' && tool === 'hand') setTool(prevTool); };
    window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [elements, selectedIds, textInput, tool, prevTool, historyIndex, history]);

  const drawElement = useCallback((ctx: CanvasRenderingContext2D, el: Element) => {
    ctx.strokeStyle = el.color; ctx.lineWidth = el.lineWidth; ctx.fillStyle = el.color; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
    const size = el.lineWidth * 6;
    if (el.type === 'pen' && el.points) { el.points.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); }); } 
    else if (el.type === 'rect' && el.x !== undefined) { ctx.rect(el.x, el.y!, el.width!, el.height!); } 
    else if (el.type === 'circle' && el.x !== undefined) { ctx.arc(el.x, el.y!, Math.abs(el.radius || 0), 0, Math.PI * 2); } 
    else if (el.type === 'triangle' && el.x !== undefined) { ctx.moveTo(el.x + el.width!/2, el.y!); ctx.lineTo(el.x + el.width!, el.y! + el.height!); ctx.lineTo(el.x, el.y! + el.height!); ctx.closePath(); } 
    else if (el.type === 'line' && el.x !== undefined) { ctx.moveTo(el.x, el.y!); ctx.lineTo(el.x + el.width!, el.y! + el.height!); } 
    else if (el.type === 'arrow' && el.x !== undefined) { const x2 = el.x + el.width!, y2 = el.y! + el.height!, headlen = 10, angle = Math.atan2(el.height!, el.width!); ctx.moveTo(el.x, el.y!); ctx.lineTo(x2, y2); ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI/6), y2 - headlen * Math.sin(angle - Math.PI/6)); ctx.moveTo(x2, y2); ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI/6), y2 - headlen * Math.sin(angle + Math.PI/6)); } 
    else if (el.type === 'text' && el.x !== undefined) { ctx.font = `bold ${size}px Inter`; const lines = (el.text || '').split('\n'); lines.forEach((line, i) => { ctx.fillText(line, el.x!, el.y! + (i * size * 1.2)); }); }
    else if (el.type === 'icon' && el.x !== undefined && el.iconName) { const path = ICON_PATHS[el.iconName]; if (path) { ctx.save(); ctx.lineWidth = el.lineWidth / 2; ctx.translate(el.x, el.y); ctx.scale((el.width || 50) / 24, (el.height || 50) / 24); ctx.stroke(new Path2D(path)); ctx.restore(); } }
    ctx.stroke();
  }, []);

  const getElementBounds = (el: Element) => {
    const size = el.lineWidth * 6;
    if (el.type === 'pen' && el.points) { const xs = el.points.map(p => p.x); const ys = el.points.map(p => p.y); return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }; }
    if (el.type === 'circle') { const r = Math.abs(el.radius || 0); return { x: el.x! - r, y: el.y! - r, w: r * 2, h: r * 2 }; }
    if (el.type === 'text') { const lines = (el.text || '').split('\n'); const maxLineW = Math.max(...lines.map(l => l.length)) * (size * 0.6); return { x: el.x!, y: el.y! - size, w: maxLineW, h: lines.length * size * 1.2 }; }
    return { x: el.x || 0, y: el.y || 0, w: el.width || 0, h: el.height || 0 };
  };

  const drawSelectionBox = (ctx: CanvasRenderingContext2D, el: Element) => { const { x, y, w, h } = getElementBounds(el); ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]); ctx.strokeRect(x - 5, y - 5, Math.abs(w) + 10, Math.abs(h) + 10); ctx.setLineDash([]); ctx.fillStyle = '#a855f7'; if (selectedIds[0] === el.id) ctx.fillRect(x + Math.abs(w) + 2, y + Math.abs(h) + 2, 8, 8); };
  
  const render = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const parent = canvas.parentElement; if (parent && (canvas.width !== parent.clientWidth || canvas.height !== parent.clientHeight)) { canvas.width = parent.clientWidth; canvas.height = parent.clientHeight; }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1;
    const gridSize = 40 * zoom; const offX = offset.x % gridSize; const offY = offset.y % gridSize;
    ctx.beginPath();
    for (let x = offX; x < canvas.width; x += gridSize) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
    for (let y = offY; y < canvas.height; y += gridSize) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
    ctx.stroke(); ctx.restore();
    ctx.save(); ctx.translate(offset.x, offset.y); ctx.scale(zoom, zoom);
    elements.forEach(el => { if (el.id !== textInput?.id) drawElement(ctx, el); });
    if (currentElement) drawElement(ctx, currentElement);
    if (selectedIds.length > 0) selectedIds.forEach(id => { const el = elements.find(e => e.id === id); if (el) drawSelectionBox(ctx, el); });
    ctx.restore();
  }, [elements, currentElement, zoom, offset, selectedIds, textInput, drawElement]);

  useEffect(() => { requestRef.current = requestAnimationFrame(render); return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); }; }, [render]);
  useEffect(() => { const handleResize = () => render(); window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize); }, [render]);
  useEffect(() => { if (socketRef.current && elements.length > 0 && !isRemoteUpdate.current) socketRef.current.emit('draw', { projectId, drawingData: {}, fullState: elements }); }, [elements]);

  const duplicate = () => { const newElements: Element[] = []; const newIds: string[] = []; selectedIds.forEach(id => { const el = elements.find(e => e.id === id); if (el) { const newEl = { ...el, id: Math.random().toString(36), x: (el.x || 0) + 20, y: (el.y || 0) + 20 }; if (el.points) newEl.points = el.points.map(p => ({ x: p.x + 20, y: p.y + 20 })); newElements.push(newEl); newIds.push(newEl.id); } }); setElements(prev => [...prev, ...newElements]); setSelectedIds(newIds); };
  const moveElements = (dx: number, dy: number) => { setElements(prev => prev.map(el => { if (!selectedIds.includes(el.id)) return el; if (el.type === 'pen' && el.points) return { ...el, points: el.points.map(p => ({ x: p.x + dx, y: p.y + dy })) }; return { ...el, x: (el.x || 0) + dx, y: (el.y || 0) + dy }; })); };
  const getScreenToCanvas = (clientX: number, clientY: number) => { const canvas = canvasRef.current; if (!canvas) return { x: 0, y: 0 }; const rect = canvas.getBoundingClientRect(); return { x: (clientX - rect.left - offset.x) / zoom, y: (clientY - rect.top - offset.y) / zoom }; };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || tool === 'hand') { setIsPanning(true); setDragOffset({ x: e.clientX, y: e.clientY }); return; }
    const { x, y } = getScreenToCanvas(e.clientX, e.clientY);
    if (tool === 'select') {
      if (selectedIds.length === 1) { const el = elements.find(e => e.id === selectedIds[0]); if (el) { const b = getElementBounds(el); const hX = b.x + Math.abs(b.w) + 2; const hY = b.y + Math.abs(b.h) + 2; if (x >= hX && x <= hX + 25 && y >= hY && y <= hY + 25) { setIsResizing(true); return; } } }
      const hit = elements.findLast(el => { const b = getElementBounds(el); return x >= b.x - 10 && x <= b.x + Math.abs(b.w) + 10 && y >= b.y - 10 && y <= b.y + Math.abs(b.h) + 10; });
      if (hit) { if (e.shiftKey) setSelectedIds(p => p.includes(hit.id) ? p.filter(id => id !== hit.id) : [...p, hit.id]); else if (!selectedIds.includes(hit.id)) setSelectedIds([hit.id]); setIsDragging(true); setDragOffset({ x, y }); } else setSelectedIds([]); return;
    }
    if (tool === 'eraser') { const hit = elements.findLast(el => { const b = getElementBounds(el); return x >= b.x - 15 && x <= b.x + Math.abs(b.w) + 15 && y >= b.y - 15 && y <= b.y + Math.abs(b.h) + 15; }); if (hit) setElements(prev => prev.filter(e => e.id !== hit.id)); return; }
    if (tool === 'text') { if (textInput) { submitText(); return; } setTextInput({ id: Math.random().toString(36), x, y, value: '' }); return; }
    setIsDrawing(true); const newEl: Element = { id: Math.random().toString(36), type: (tool === 'magic' ? 'pen' : tool) as any, points: (tool === 'pen' || tool === 'magic') ? [{ x, y }] : undefined, x: (tool !== 'pen' && tool !== 'magic') ? x : undefined, y: (tool !== 'pen' && tool !== 'magic') ? y : undefined, width: 0, height: 0, radius: 0, color, lineWidth }; setCurrentElement(newEl);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) { const dx = e.clientX - dragOffset.x; const dy = e.clientY - dragOffset.y; setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy })); setDragOffset({ x: e.clientX, y: e.clientY }); return; }
    let { x, y } = getScreenToCanvas(e.clientX, e.clientY);
    if (isResizing && selectedIds.length === 1) {
      setElements(prev => prev.map(el => {
        if (el.id !== selectedIds[0]) return el;
        if (el.type === 'circle') return { ...el, radius: Math.sqrt(Math.pow(x-el.x!, 2) + Math.pow(y-el.y!, 2)) };
        let nW = x - el.x!, nH = y - el.y!; if (e.shiftKey && el.type !== 'pen') { const r = (el.width || 1) / (el.height || 1); if (Math.abs(nW) > Math.abs(nH)) nH = nW / r; else nW = nH * r; }
        return { ...el, width: nW, height: nH };
      })); return;
    }
    if (isDragging && selectedIds.length > 0) { const { x: canvasX, y: canvasY } = getScreenToCanvas(e.clientX, e.clientY); moveElements(canvasX - dragOffset.x, canvasY - dragOffset.y); setDragOffset({ x: canvasX, y: canvasY }); return; }
    if (isDrawing && currentElement) {
      if (e.shiftKey) { if (currentElement.type === 'line' || currentElement.type === 'arrow') { if (Math.abs(x - currentElement.x!) > Math.abs(y - currentElement.y!)) y = currentElement.y!; else x = currentElement.x!; } else if (currentElement.type === 'rect' || currentElement.type === 'icon') { const s = Math.max(Math.abs(x - currentElement.x!), Math.abs(y - currentElement.y!)); x = currentElement.x! + s * Math.sign(x - currentElement.x!); y = currentElement.y! + s * Math.sign(y - currentElement.y!); } }
      if (currentElement.type === 'pen') setCurrentElement({ ...currentElement, points: [...(currentElement.points || []), { x, y }] }); else setCurrentElement({ ...currentElement, width: x - (currentElement.x || 0), height: y - (currentElement.y || 0), radius: Math.sqrt(Math.pow(x-currentElement.x!, 2) + Math.pow(y-currentElement.y!, 2)) });
    }
  };

  const handleMouseUp = () => { setIsPanning(false); setIsDragging(false); setIsResizing(false); if (!isDrawing || !currentElement) return; setIsDrawing(false); setElements(prev => [...prev, currentElement]); setCurrentElement(null); };
  const submitText = () => { if (textInput && textInput.value.trim()) setElements(prev => [...prev, { id: textInput.id, type: 'text', x: textInput.x, y: textInput.y, text: textInput.value, color, lineWidth }]); setTextInput(null); };
  const addIcon = (name: string) => { const { x, y } = getScreenToCanvas(window.innerWidth/2, window.innerHeight/2); const newEl: Element = { id: Math.random().toString(36), type: 'icon', x: x-30, y: y-30, width: 60, height: 60, iconName: name, color, lineWidth }; setElements(prev => [...prev, newEl]); setSelectedIds([newEl.id]); setIsAssetsOpen(false); };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) { e.preventDefault(); const zoomSpeed = 0.0015; const newZoom = Math.min(Math.max(zoom * (1 - e.deltaY * zoomSpeed), 0.1), 10); const canvas = canvasRef.current; if (!canvas) return; const rect = canvas.getBoundingClientRect(); const mouseX = e.clientX - rect.left; const mouseY = e.clientY - rect.top; const canvasMouseX = (mouseX - offset.x) / zoom; const canvasMouseY = (mouseY - offset.y) / zoom; setOffset({ x: mouseX - canvasMouseX * newZoom, y: mouseY - canvasMouseY * newZoom }); setZoom(newZoom); }
    else { setOffset(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY })); }
  };

  return (
    <div className="h-screen bg-[#0a0a0a] overflow-hidden flex flex-col select-none">
      <header className="h-20 bg-[#141414]/90 backdrop-blur-xl border-b border-white/5 px-8 z-50 grid grid-cols-3 items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2.5 hover:bg-white/10 rounded-2xl text-zinc-400 hover:text-white transition-all"><ChevronLeft size={20} /></button>
          <div className="h-8 w-[1px] bg-white/5" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white truncate max-w-[150px]">{projectTitle}</h2>
              <button onClick={renameProject} className="text-zinc-500 hover:text-white transition-colors"><Edit3 size={14} /></button>
            </div>
            <span className="text-[10px] text-zinc-600 font-bold tracking-widest uppercase">Workspace</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-2xl">
            <div className="flex items-center gap-1 pr-2 border-r border-white/5 mr-1">
              <button onClick={undo} disabled={historyIndex <= 0} className={`p-2 rounded-xl transition-all ${historyIndex <= 0 ? 'text-zinc-700' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}><Undo2 size={18} /></button>
              <button onClick={redo} disabled={historyIndex >= history.length - 1} className={`p-2 rounded-xl transition-all ${historyIndex >= history.length - 1 ? 'text-zinc-700' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}><Redo2 size={18} /></button>
            </div>
            <ToolIcon icon={<MousePointer2 size={18} />} active={tool === 'select'} onClick={() => setTool('select')} label="Select (V)" />
            <ToolIcon icon={<Move size={18} />} active={tool === 'hand'} onClick={() => setTool('hand')} label="Hand (H / Space)" />
            <ToolIcon icon={<Palette size={18} />} active={tool === 'pen'} onClick={() => setTool('pen')} label="Brush (P)" />
            <ToolIcon icon={<Eraser size={18} />} active={tool === 'eraser'} onClick={() => setTool('eraser')} label="Eraser (E)" />
            <div className="w-[1px] h-6 bg-white/5 mx-1" />
            <div className="flex items-center gap-3 px-3">
              <div className="relative group">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-8 h-8 bg-transparent border-none cursor-pointer p-0 rounded-lg overflow-hidden" title="Stroke Color" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-zinc-900" style={{ backgroundColor: color }} />
              </div>
              <div className="flex items-center gap-3 bg-black/20 px-3 py-1.5 rounded-xl border border-white/5">
                <Maximize2 size={12} className="text-zinc-500" />
                <input type="range" min="1" max="20" value={lineWidth} onChange={(e) => setLineWidth(parseInt(e.target.value))} className="w-20 accent-purple-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer" />
                <span className="text-[10px] font-black text-zinc-400 w-4">{lineWidth}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
           <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/5">
             <button onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.1))} className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white"><ZoomOut size={16} /></button>
             <span className="text-[10px] font-black text-zinc-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
             <button onClick={() => setZoom(prev => Math.min(prev + 0.1, 5))} className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white"><ZoomIn size={16} /></button>
           </div>
           <button onClick={() => setIsShareOpen(!isShareOpen)} className={`p-3 rounded-2xl flex items-center gap-2 font-bold text-xs transition-all ${isShareOpen ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-zinc-900/50 text-zinc-400 border border-white/5 hover:bg-zinc-800'}`}><Share2 size={16} /></button>
           <button onClick={() => setIsCommentsOpen(!isCommentsOpen)} className={`p-3 rounded-2xl flex items-center gap-2 font-bold text-xs transition-all ${isCommentsOpen ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-500/20' : 'bg-zinc-900/50 text-zinc-400 border border-white/5 hover:bg-zinc-800'}`}><MessageSquare size={16} /></button>
           <button onClick={handleManualSave} className={`px-5 py-3 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all ${saveStatus === 'saved' ? 'bg-green-600 text-white shadow-lg shadow-green-500/20' : 'bg-white text-black hover:bg-zinc-200 shadow-xl shadow-white/5'}`}>{saveStatus === 'saving' ? <Loader2 size={16} className="animate-spin" /> : saveStatus === 'saved' ? <Check size={16} /> : <Save size={16} />} {saveStatus === 'saving' ? 'Saving' : saveStatus === 'saved' ? 'Saved' : 'Save'}</button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <aside className="w-20 bg-[#111]/80 backdrop-blur-md border-r border-white/5 flex flex-col items-center py-8 gap-6 z-40">
           <ShapeBtn icon={<Square size={22} />} onClick={() => setTool('rect')} active={tool === 'rect'} />
           <ShapeBtn icon={<Circle size={22} />} onClick={() => setTool('circle')} active={tool === 'circle'} />
           <ShapeBtn icon={<Triangle size={22} />} onClick={() => setTool('triangle')} active={tool === 'triangle'} />
           <ShapeBtn icon={<ArrowRight size={22} />} onClick={() => setTool('arrow')} active={tool === 'arrow'} />
           <ShapeBtn icon={<Minus size={22} />} onClick={() => setTool('line')} active={tool === 'line'} />
           <ShapeBtn icon={<Type size={22} />} onClick={() => setTool('text')} active={tool === 'text'} />
           <div className="h-[1px] w-10 bg-white/5 my-2" />
           <ShapeBtn icon={<ImageIcon size={22} />} onClick={() => setIsAssetsOpen(!isAssetsOpen)} active={isAssetsOpen} />
           <ShapeBtn icon={<Sparkles size={22} />} onClick={() => setIsAiSidebarOpen(!isAiSidebarOpen)} active={isAiSidebarOpen} />
        </aside>

        <main className="flex-1 relative overflow-hidden bg-[#0a0a0a]">
          {textInput && (
            <div className="absolute z-[100] p-4 bg-[#1a1a1a] border-2 border-purple-500 rounded-3xl shadow-[0_0_80px_rgba(168,85,247,0.3)] backdrop-blur-xl" style={{ left: (textInput.x * zoom) + offset.x, top: (textInput.y * zoom) + offset.y, transform: 'translate(-20px, -20px)' }}>
               <div className="flex flex-col gap-3">
                  <textarea ref={textInputRef} className="bg-transparent text-white outline-none min-w-[300px] min-h-[120px] font-bold text-xl resize-none placeholder:text-zinc-700" value={textInput.value} onChange={(e) => setTextInput({ ...textInput, value: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitText(); } }} placeholder="Start typing your ideas..." autoFocus />
                  <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                    <button onClick={() => setTextInput(null)} className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-white transition-colors">Cancel</button>
                    <button onClick={submitText} className="px-6 py-2 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-black uppercase tracking-wider transition-all shadow-lg shadow-purple-500/20">Add Text</button>
                  </div>
               </div>
            </div>
          )}
          <canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onWheel={handleWheel} className="block w-full h-full" style={{ cursor: tool === 'hand' || isPanning ? 'grab' : 'crosshair' }} />
          
          <AnimatePresence>
            {isShareOpen && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute top-4 right-4 w-[400px] bg-[#1a1a1a] border border-white/5 rounded-[2.5rem] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.8)] z-[60] backdrop-blur-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-8"><h3 className="font-black text-lg flex items-center gap-3 uppercase tracking-tighter"><Users size={20} className="text-blue-500" /> Manage Access</h3><button onClick={() => setIsShareOpen(false)} className="p-2 hover:bg-white/5 rounded-xl"><X size={18} /></button></div>
                
                <div className="flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
                  {/* Invite Section */}
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Invite New Designer</label>
                    <div className="flex gap-2">
                      <input type="email" placeholder="design@team.com" className="flex-1 bg-black/40 border border-white/5 rounded-2xl py-4 px-5 text-sm focus:border-blue-500 outline-none transition-all" value={shareEmail} onChange={(e) => setShareEmail(e.target.value)} />
                      <button onClick={shareProject} disabled={shareLoading} className="bg-blue-600 hover:bg-blue-500 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20">{shareLoading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}</button>
                    </div>
                  </div>

                  {/* Access List */}
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">People with Access</label>
                    <div className="space-y-3">
                      {/* Owner */}
                      {owner && (
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-black text-xs">{owner.name[0]}</div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-white">{owner.name} <span className="text-[10px] text-blue-500 ml-2 uppercase tracking-widest">Owner</span></span>
                              <span className="text-[10px] text-zinc-500 font-medium">{owner.email}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Collaborators */}
                      {collaborators.map((collab) => (
                        <div key={collab.id} className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5 group hover:border-white/10 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-black text-xs">{collab.name[0]}</div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-white">{collab.name}</span>
                              <span className="text-[10px] text-zinc-500 font-medium">{collab.email}</span>
                            </div>
                          </div>
                          {owner?.id === currentUserId && (
                            <button onClick={() => removeCollaborator(collab.id)} className="p-2.5 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <AnimatePresence>
          {isCommentsOpen && (
            <motion.aside initial={{ x: 350 }} animate={{ x: 0 }} exit={{ x: 350 }} className="w-96 bg-[#141414]/90 backdrop-blur-2xl border-l border-white/5 flex flex-col z-50 shadow-[-50px_0_100px_rgba(0,0,0,0.5)]">
               <div className="p-8 border-b border-white/5 flex items-center justify-between font-black"><div className="flex items-center gap-3 text-yellow-500 uppercase tracking-tighter text-lg"><MessageSquare size={22} /> Discussion</div><button onClick={() => setIsCommentsOpen(false)} className="p-2 hover:bg-white/5 rounded-xl"><X size={18} /></button></div>
               <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {comments.map((c, i) => (
                    <div key={i} className="bg-white/5 border border-white/5 p-5 rounded-[2rem] space-y-3 hover:border-white/10 transition-all group">
                      <div className="flex justify-between items-center"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px] font-black text-purple-400">{c.author.name[0]}</div><span className="text-xs font-black text-white group-hover:text-purple-400 transition-colors">{c.author.name}</span></div><span className="text-[10px] text-zinc-600 font-bold">{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                      <p className="text-sm text-zinc-400 leading-relaxed font-medium">{c.text}</p>
                    </div>
                  ))}
                  {comments.length === 0 && <div className="text-center py-32 text-zinc-700 space-y-4"><MessageSquare size={48} className="mx-auto opacity-10" /><p className="text-[10px] font-black uppercase tracking-[0.2em]">Silence is golden</p></div>}
               </div>
               <div className="p-6 border-t border-white/5 bg-black/20">
                  <div className="relative flex items-center gap-2 bg-zinc-900 border border-white/5 rounded-[1.5rem] p-1.5 focus-within:border-yellow-600 transition-all"><input type="text" placeholder="Share your thoughts..." className="flex-1 bg-transparent border-none py-3 pl-4 text-sm text-white focus:outline-none placeholder:text-zinc-700" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendComment()} /><button onClick={sendComment} className="p-3 bg-yellow-600 text-white rounded-[1rem] hover:bg-yellow-500 transition-all shadow-lg shadow-yellow-500/20"><Send size={18} /></button></div>
               </div>
            </motion.aside>
          )}

          {isAssetsOpen && (
            <motion.aside initial={{ x: 350 }} animate={{ x: 0 }} exit={{ x: 350 }} className="w-96 bg-[#141414]/90 backdrop-blur-2xl border-l border-white/5 flex flex-col z-50 shadow-[-50px_0_100px_rgba(0,0,0,0.5)]">
               <div className="p-8 border-b border-white/5 flex items-center justify-between font-black"><span>Asset Explorer</span><button onClick={() => setIsAssetsOpen(false)}><X size={18} /></button></div>
               <div className="p-6 border-b border-white/5"><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} /><input type="text" placeholder="Search vectors..." className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm focus:border-purple-500 outline-none transition-all" value={assetSearch} onChange={(e) => setAssetSearch(e.target.value)} /></div></div>
               <div className="flex-1 overflow-y-auto p-6 grid grid-cols-3 gap-4">
                  {Object.keys(ICON_COMPONENTS).filter(name => name.toLowerCase().includes(assetSearch.toLowerCase())).map((name, idx) => {
                    const IconComp = ICON_COMPONENTS[name];
                    return (
                    <button key={idx} onClick={() => addIcon(name)} className="aspect-square bg-white/5 border border-white/5 rounded-[1.5rem] flex flex-col items-center justify-center gap-3 hover:border-purple-500 hover:bg-purple-500/10 transition-all group active:scale-95">
                       <div className="text-zinc-500 group-hover:text-purple-400 transition-colors scale-125"><IconComp size={24} /></div>
                       <span className="text-[9px] text-zinc-600 group-hover:text-zinc-400 font-bold uppercase tracking-tighter">{name}</span>
                    </button>
                  )})}
               </div>
            </motion.aside>
          )}

          {isAiSidebarOpen && (
            <motion.aside initial={{ x: 350 }} animate={{ x: 0 }} exit={{ x: 350 }} className="w-96 bg-[#141414]/90 backdrop-blur-2xl border-l border-white/5 flex flex-col z-50 shadow-[-50px_0_100px_rgba(0,0,0,0.5)] p-8">
               <div className="flex justify-between items-center mb-8 font-black uppercase tracking-tighter text-lg text-purple-500"><div className="flex items-center gap-3"><Sparkles size={22} /> AI Magic</div><button onClick={() => setIsAiSidebarOpen(false)}><X size={18} /></button></div>
               <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                 <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-500 animate-pulse"><Wand2 size={40} /></div>
                 <h4 className="font-black text-white uppercase tracking-widest text-xs">Magic in Progress</h4>
                 <p className="text-zinc-500 text-sm leading-relaxed">Select a rough sketch and click 'Refine' to let the AI transform it into a perfect vector shape.</p>
                 <button className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg shadow-purple-500/20">Refine Selection</button>
               </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const ToolIcon = ({ icon, active, onClick, label }: any) => (
  <button onClick={onClick} className={`p-3 rounded-xl flex items-center gap-2 transition-all relative group ${active ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}>
    {icon}
    <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-[10px] px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all shadow-xl z-50 whitespace-nowrap font-bold border border-white/5">{label}</span>
  </button>
);

const ShapeBtn = ({ icon, onClick, active }: any) => (
  <button onClick={onClick} className={`w-12 h-12 rounded-2xl transition-all flex items-center justify-center active:scale-90 ${active ? 'bg-white text-black shadow-xl shadow-white/10' : 'text-zinc-500 hover:text-white hover:bg-white/10'}`}>{icon}</button>
);

export default DrawingPage;
