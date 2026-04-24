import React, { useRef, useEffect, useState } from 'react';
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
  Briefcase, Coffee, Sun, Moon, Maximize2, Save, Check, Edit3
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
interface Cursor { id: string; x: number; y: number; color: string; name: string; }

const DrawingPage = () => {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const isRemoteUpdate = useRef(false);
  
  const [projectTitle, setProjectTitle] = useState('Untitled Design');
  const [elements, setElements] = useState<Element[]>([]);
  const [redoStack, setRedoStack] = useState<Element[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [textInput, setTextInput] = useState<{ id: string, x: number, y: number, value: string } | null>(null);
  
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [tool, setTool] = useState('pen');
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
  const [assetSearch, setAssetSearch] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Fetch project details on mount
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }
        const res = await axios.get(`http://localhost:5000/api/projects/${projectId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProjectTitle(res.data.title);
      } catch (err: any) {
        console.error('Error fetching project:', err);
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
        } else if (err.response?.status === 404) {
          navigate('/dashboard');
        }
      }
    };
    fetchProject();
  }, [projectId, navigate]);

  // Sync color AND stroke width to selected elements
  useEffect(() => {
    if (selectedIds.length > 0) {
      setElements(prev => prev.map(el => selectedIds.includes(el.id) ? { ...el, color, lineWidth } : el));
    }
  }, [color, lineWidth]);

  useEffect(() => { if (textInput && textInputRef.current) textInputRef.current.focus(); }, [textInput]);

  const undo = () => { if (elements.length === 0) return; const last = elements[elements.length - 1]; setRedoStack(prev => [...prev, last]); setElements(prev => prev.slice(0, -1)); };
  const redo = () => { if (redoStack.length === 0) return; const last = redoStack[redoStack.length - 1]; setRedoStack(prev => prev.slice(0, -1)); setElements(prev => [...prev, last]); };
  
  const duplicate = () => {
    const newElements: Element[] = []; const newIds: string[] = [];
    selectedIds.forEach(id => {
      const el = elements.find(e => e.id === id);
      if (el) {
        const newEl = { ...el, id: Math.random().toString(36), x: (el.x || 0) + 20, y: (el.y || 0) + 20 };
        if (el.points) newEl.points = el.points.map(p => ({ x: p.x + 20, y: p.y + 20 }));
        newElements.push(newEl); newIds.push(newEl.id);
      }
    });
    setElements(prev => [...prev, ...newElements]); setSelectedIds(newIds);
  };

  const renameProject = async () => {
    const newTitle = window.prompt('Enter new project name:', projectTitle);
    if (!newTitle || newTitle === projectTitle) return;

    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:5000/api/projects/${projectId}`, 
        { title: newTitle },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProjectTitle(newTitle);
    } catch (err) {
      console.error('Error renaming project:', err);
    }
  };

  const moveElements = (dx: number, dy: number) => {
    setElements(prev => prev.map(el => {
      if (!selectedIds.includes(el.id)) return el;
      if (el.type === 'pen' && el.points) return { ...el, points: el.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
      return { ...el, x: (el.x || 0) + dx, y: (el.y || 0) + dy };
    }));
  };

  const handleManualSave = () => {
    if (!socketRef.current) return;
    setSaveStatus('saving');
    socketRef.current.emit('draw', { projectId, drawingData: {}, fullState: elements });
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  useEffect(() => {
    socketRef.current = io('http://localhost:5000');
    socketRef.current.emit('join-project', projectId);
    
    // Load existing project data from DB
    socketRef.current.on('load-project', (data: Element[]) => {
      isRemoteUpdate.current = true;
      setElements(data);
      setTimeout(() => isRemoteUpdate.current = false, 100);
    });

    socketRef.current.on('draw-update', (el: Element) => {
      isRemoteUpdate.current = true;
      setElements(prev => {
        const idx = prev.findIndex(e => e.id === el.id);
        if (idx > -1) { const newArr = [...prev]; newArr[idx] = el; return newArr; }
        return [...prev, el];
      });
      setTimeout(() => isRemoteUpdate.current = false, 100);
    });
    
    return () => { socketRef.current?.disconnect(); };
  }, [projectId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (textInput || document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      
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
          case 'e': case 'E': setTool('eraser'); break;
          case 't': case 'T': setTool('text'); break;
          case 'm': case 'M': setTool('magic'); break;
          case 'Backspace': case 'Delete': 
            if (selectedIds.length > 0) { 
              setElements(prev => prev.filter(el => !selectedIds.includes(el.id))); 
              setSelectedIds([]); 
            }
            break;
          case 'ArrowUp': e.preventDefault(); moveElements(0, -step); break;
          case 'ArrowDown': e.preventDefault(); moveElements(0, step); break;
          case 'ArrowLeft': e.preventDefault(); moveElements(-step, 0); break;
          case 'ArrowRight': e.preventDefault(); moveElements(step, 0); break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [elements, selectedIds, textInput]);

  useEffect(() => {
    const handleResize = () => render();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [elements, currentElement, zoom, offset, selectedIds, textInput, lineWidth]);

  // Persist full state to DB when elements change locally
  useEffect(() => {
    if (socketRef.current && elements.length > 0 && !isRemoteUpdate.current) {
      socketRef.current.emit('draw', { projectId, drawingData: {}, fullState: elements });
    }
  }, [elements]);

  useEffect(() => { render(); }, [elements, currentElement, zoom, offset, selectedIds, textInput, lineWidth]);

  const render = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    const parent = canvas.parentElement;
    if (parent) { canvas.width = parent.clientWidth; canvas.height = parent.clientHeight; }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, canvas.width, canvas.height);
    ctx.translate(offset.x, offset.y); ctx.scale(zoom, zoom);
    elements.forEach(el => { if (el.id !== textInput?.id) drawElement(ctx, el); });
    if (currentElement) drawElement(ctx, currentElement);
    if (selectedIds.length > 0) { selectedIds.forEach(id => { const el = elements.find(e => e.id === id); if (el) drawSelectionBox(ctx, el); }); }
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save(); ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1;
    const gridSize = 40 * zoom;
    const offsetX = offset.x % gridSize; const offsetY = offset.y % gridSize;
    ctx.beginPath();
    for (let x = offsetX; x < width; x += gridSize) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
    for (let y = offsetY; y < height; y += gridSize) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
    ctx.stroke(); ctx.restore();
  };

  const drawElement = (ctx: CanvasRenderingContext2D, el: Element) => {
    ctx.strokeStyle = el.color; ctx.lineWidth = el.lineWidth; ctx.fillStyle = el.color; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
    const size = el.lineWidth * 6;
    if (el.type === 'pen' && el.points) { el.points.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); }); } 
    else if (el.type === 'rect' && el.x !== undefined) { ctx.rect(el.x, el.y!, el.width!, el.height!); } 
    else if (el.type === 'circle' && el.x !== undefined) { ctx.arc(el.x, el.y!, Math.abs(el.radius || 0), 0, Math.PI * 2); } 
    else if (el.type === 'triangle' && el.x !== undefined) { ctx.moveTo(el.x + el.width!/2, el.y!); ctx.lineTo(el.x + el.width!, el.y! + el.height!); ctx.lineTo(el.x, el.y! + el.height!); ctx.closePath(); } 
    else if (el.type === 'line' && el.x !== undefined) { ctx.moveTo(el.x, el.y!); ctx.lineTo(el.x + el.width!, el.y! + el.height!); } 
    else if (el.type === 'arrow' && el.x !== undefined) {
      const x2 = el.x + el.width!, y2 = el.y! + el.height!, headlen = 10, angle = Math.atan2(el.height!, el.width!);
      ctx.moveTo(el.x, el.y!); ctx.lineTo(x2, y2); ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI/6), y2 - headlen * Math.sin(angle - Math.PI/6)); ctx.moveTo(x2, y2); ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI/6), y2 - headlen * Math.sin(angle + Math.PI/6));
    } 
    else if (el.type === 'text' && el.x !== undefined) { 
      ctx.font = `bold ${size}px Inter`;
      const lines = (el.text || '').split('\n');
      lines.forEach((line, i) => { ctx.fillText(line, el.x!, el.y! + (i * size * 1.2)); });
    }
    else if (el.type === 'icon' && el.x !== undefined && el.iconName) {
      const path = ICON_PATHS[el.iconName];
      if (path) {
        ctx.save();
        ctx.lineWidth = el.lineWidth / 2;
        ctx.translate(el.x, el.y);
        const scaleX = (el.width || 50) / 24;
        const scaleY = (el.height || 50) / 24;
        ctx.scale(scaleX, scaleY);
        ctx.stroke(new Path2D(path));
        ctx.restore();
      }
    }
    ctx.stroke();
  };

  const getElementBounds = (el: Element) => {
    const size = el.lineWidth * 6;
    if (el.type === 'pen' && el.points) {
      const xs = el.points.map(p => p.x); const ys = el.points.map(p => p.y);
      return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    }
    if (el.type === 'circle') { const r = Math.abs(el.radius || 0); return { x: el.x! - r, y: el.y! - r, w: r * 2, h: r * 2 }; }
    if (el.type === 'text') { const lines = (el.text || '').split('\n'); const maxLineW = Math.max(...lines.map(l => l.length)) * (size * 0.6); return { x: el.x!, y: el.y! - size, w: maxLineW, h: lines.length * size * 1.2 }; }
    if (el.type === 'icon') { return { x: el.x!, y: el.y!, w: el.width || 50, h: el.height || 50 }; }
    return { x: el.x || 0, y: el.y || 0, w: el.width || 0, h: el.height || 0 };
  };

  const drawSelectionBox = (ctx: CanvasRenderingContext2D, el: Element) => {
    const { x, y, w, h } = getElementBounds(el);
    ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
    ctx.strokeRect(x - 5, y - 5, Math.abs(w) + 10, Math.abs(h) + 10);
    ctx.setLineDash([]); ctx.fillStyle = '#a855f7';
    if (selectedIds[0] === el.id) ctx.fillRect(x + Math.abs(w) + 2, y + Math.abs(h) + 2, 8, 8);
  };

  const getScreenToCanvas = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current; if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: (clientX - rect.left - offset.x) / zoom, y: (clientY - rect.top - offset.y) / zoom };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || tool === 'hand') { setIsPanning(true); return; }
    const { x, y } = getScreenToCanvas(e.clientX, e.clientY);
    if (tool === 'select') {
      if (selectedIds.length === 1) {
        const el = elements.find(e => e.id === selectedIds[0]);
        if (el) {
          const bounds = getElementBounds(el);
          const handleX = bounds.x + Math.abs(bounds.w) + 2; const handleY = bounds.y + Math.abs(bounds.h) + 2;
          if (x >= handleX && x <= handleX + 25 && y >= handleY && y <= handleY + 25) { setIsResizing(true); return; }
        }
      }
      const hit = elements.findLast(el => { const b = getElementBounds(el); return x >= b.x - 10 && x <= b.x + Math.abs(b.w) + 10 && y >= b.y - 10 && y <= b.y + Math.abs(b.h) + 10; });
      if (hit) { if (e.shiftKey) setSelectedIds(p => p.includes(hit.id) ? p.filter(id => id !== hit.id) : [...p, hit.id]); else { if (!selectedIds.includes(hit.id)) setSelectedIds([hit.id]); } setIsDragging(true); setDragOffset({ x, y }); }
      else { setSelectedIds([]); } return;
    }
    if (tool === 'eraser') { const hit = elements.findLast(el => { const b = getElementBounds(el); return x >= b.x - 15 && x <= b.x + Math.abs(b.w) + 15 && y >= b.y - 15 && y <= b.y + Math.abs(b.h) + 15; }); if (hit) setElements(prev => prev.filter(e => e.id !== hit.id)); return; }
    if (tool === 'text') { if (textInput) { submitText(); return; } setTextInput({ id: Math.random().toString(36), x, y, value: '' }); return; }
    setIsDrawing(true);
    const newEl: Element = { id: Math.random().toString(36), type: (tool === 'magic' ? 'pen' : tool) as any, points: (tool === 'pen' || tool === 'magic') ? [{ x, y }] : undefined, x: (tool !== 'pen' && tool !== 'magic') ? x : undefined, y: (tool !== 'pen' && tool !== 'magic') ? y : undefined, width: 0, height: 0, radius: 0, color, lineWidth };
    setCurrentElement(newEl);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) { setOffset(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY })); return; }
    let { x, y } = getScreenToCanvas(e.clientX, e.clientY);
    
    // Broadcast presence
    if (socketRef.current) {
        socketRef.current.emit('presence', { projectId, x, y, color, name: 'User' });
    }

    if (isResizing && selectedIds.length === 1) {
      setElements(prev => prev.map(el => {
        if (el.id !== selectedIds[0]) return el;
        if (el.type === 'circle') return { ...el, radius: Math.sqrt(Math.pow(x-el.x!, 2) + Math.pow(y-el.y!, 2)) };
        if (el.type === 'text') { const newWidth = x - el.x!; const lines = (el.text || '').split('\n'); const maxLineChars = Math.max(...lines.map(l => l.length)) || 1; const newFontSize = newWidth / (maxLineChars * 0.6); return { ...el, lineWidth: Math.max(newFontSize / 6, 1) }; }
        
        let newWidth = x - el.x!;
        let newHeight = y - el.y!;
        
        if (e.shiftKey && el.type !== 'pen') {
          const originalRatio = (el.width || 1) / (el.height || 1);
          if (Math.abs(newWidth) > Math.abs(newHeight)) {
            newHeight = newWidth / originalRatio;
          } else {
            newWidth = newHeight * originalRatio;
          }
        }
        
        return { ...el, width: newWidth, height: newHeight };
      })); return;
    }
    if (isDragging && selectedIds.length > 0) { const dx = x - dragOffset.x; const dy = y - dragOffset.y; moveElements(dx, dy); setDragOffset({ x, y }); return; }
    if (isDrawing && currentElement) {
      if (e.shiftKey) {
         if (currentElement.type === 'line' || currentElement.type === 'arrow') { const dx = Math.abs(x - currentElement.x!); const dy = Math.abs(y - currentElement.y!); if (dx > dy) y = currentElement.y!; else x = currentElement.x!; }
         else if (currentElement.type === 'rect' || currentElement.type === 'icon') { const size = Math.max(Math.abs(x - currentElement.x!), Math.abs(y - currentElement.y!)); x = currentElement.x! + size * Math.sign(x - currentElement.x!); y = currentElement.y! + size * Math.sign(y - currentElement.y!); }
      }
      if (currentElement.type === 'pen') setCurrentElement({ ...currentElement, points: [...(currentElement.points || []), { x, y }] });
      else setCurrentElement({ ...currentElement, width: x - (currentElement.x || 0), height: y - (currentElement.y || 0), radius: Math.sqrt(Math.pow(x-currentElement.x!, 2) + Math.pow(y-currentElement.y!, 2)) });
      
      // Real-time broadcast (temporary preview)
      socketRef.current?.emit('draw', { projectId, drawingData: currentElement });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false); setIsDragging(false); setIsResizing(false);
    if (!isDrawing || !currentElement) return;
    setIsDrawing(false); setRedoStack([]); setElements(prev => [...prev, currentElement]);
    setCurrentElement(null);
  };

  const submitText = () => {
    if (textInput && textInput.value.trim()) { const newEl: Element = { id: textInput.id, type: 'text', x: textInput.x, y: textInput.y, text: textInput.value, color, lineWidth: 4 }; setElements(prev => [...prev, newEl]); }
    setTextInput(null);
  };

  const addIcon = (name: string) => {
    const { x, y } = getScreenToCanvas(window.innerWidth/2, window.innerHeight/2);
    const newEl: Element = { id: Math.random().toString(36), type: 'icon', x: x - 30, y: y - 30, width: 60, height: 60, iconName: name, color, lineWidth };
    setElements(prev => [...prev, newEl]); setSelectedIds([newEl.id]); setIsAssetsOpen(false);
  };

  return (
    <div className="h-screen bg-[#0a0a0a] overflow-hidden flex flex-col select-none" onWheel={(e) => { if (e.ctrlKey) setZoom(prev => Math.min(Math.max(prev * (e.deltaY > 0 ? 0.9 : 1.1), 0.1), 5)); else setOffset(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY })); }}>
      <header className="h-16 bg-[#141414]/80 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors flex-shrink-0"><ChevronLeft size={20} /></button>
          <div className="h-8 w-[1px] bg-zinc-800 flex-shrink-0" />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white truncate max-w-[200px]">{projectTitle}</h2>
              <button onClick={renameProject} className="text-zinc-500 hover:text-white transition-colors"><Edit3 size={14} /></button>
            </div>
            <span className="text-[10px] text-zinc-500 font-medium">Design Project</span>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-800 mx-4">
           <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-zinc-800">
             <ToolIcon icon={<MousePointer2 size={18} />} active={tool === 'select'} onClick={() => setTool('select')} label="Select" />
             <ToolIcon icon={<Palette size={18} />} active={tool === 'pen'} onClick={() => setTool('pen')} label="Brush" />
             <ToolIcon icon={<Eraser size={18} />} active={tool === 'eraser'} onClick={() => setTool('eraser')} label="Eraser" />
             <ToolIcon icon={<Wand2 size={18} />} active={tool === 'magic'} onClick={() => setTool('magic')} label="AI Magic" />
           </div>
           <div className="w-[1px] h-4 bg-zinc-800" />
           <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-zinc-800">
             <ToolIcon icon={<Undo2 size={18} />} onClick={undo} label="Undo" active={false} />
             <ToolIcon icon={<Redo2 size={18} />} onClick={redo} label="Redo" active={false} />
           </div>
           <div className="w-[1px] h-4 bg-zinc-800" />
           <div className="flex items-center gap-2 px-2">
             <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-6 h-6 bg-transparent border-none cursor-pointer" title="Stroke Color" />
           </div>
           <div className="w-[1px] h-4 bg-zinc-800" />
           <div className="flex items-center gap-3 px-3 group/stroke">
             <Maximize2 size={14} className="text-zinc-500 group-hover/stroke:text-purple-400 transition-colors" />
             <input type="range" min="1" max="20" value={lineWidth} onChange={(e) => setLineWidth(parseInt(e.target.value))} className="w-20 accent-purple-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer" title="Stroke Width" />
             <span className="text-[10px] font-bold text-zinc-500 w-4">{lineWidth}</span>
           </div>
           <div className="w-[1px] h-4 bg-zinc-800" />
           <div className="flex items-center gap-1 px-1 bg-black/20 rounded-lg">
             <button onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.1))} className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"><ZoomOut size={16} /></button>
             <span className="text-[10px] font-bold text-zinc-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
             <button onClick={() => setZoom(prev => Math.min(prev + 0.1, 5))} className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"><ZoomIn size={16} /></button>
           </div>
           <div className="w-[1px] h-4 bg-zinc-800" />
           <button onClick={() => setTool('hand')} className={`p-2 rounded-xl ${tool === 'hand' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}><Move size={18} /></button>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button 
            onClick={handleManualSave} 
            className={`p-2.5 rounded-xl flex items-center gap-2 font-bold text-xs transition-all ${saveStatus === 'saved' ? 'bg-green-600 text-white' : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800'}`}
          >
            {saveStatus === 'saving' ? <Loader2 size={16} className="animate-spin" /> : saveStatus === 'saved' ? <Check size={16} /> : <Save size={16} />}
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save'}
          </button>
          <button onClick={() => setIsAssetsOpen(!isAssetsOpen)} className={`p-2.5 rounded-xl flex items-center gap-2 font-bold text-xs ${isAssetsOpen ? 'bg-purple-600 text-white' : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800'}`}><ImageIcon size={16} /> Assets</button>
          <button onClick={() => setIsAiSidebarOpen(!isAiSidebarOpen)} className={`p-2.5 rounded-xl flex items-center gap-2 font-bold text-xs ${isAiSidebarOpen ? 'bg-purple-600 text-white' : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800'}`}><Sparkles size={16} /> AI Assistant</button>
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden relative">
        <aside className="w-16 bg-[#111] border-r border-zinc-800 flex flex-col items-center py-6 gap-6 z-40">
           <ShapeBtn icon={<Square size={20} />} onClick={() => setTool('rect')} active={tool === 'rect'} />
           <ShapeBtn icon={<Circle size={20} />} onClick={() => setTool('circle')} active={tool === 'circle'} />
           <ShapeBtn icon={<Triangle size={20} />} onClick={() => setTool('triangle')} active={tool === 'triangle'} />
           <ShapeBtn icon={<ArrowRight size={20} />} onClick={() => setTool('arrow')} active={tool === 'arrow'} />
           <ShapeBtn icon={<Minus size={20} />} onClick={() => setTool('line')} active={tool === 'line'} />
           <ShapeBtn icon={<Type size={20} />} onClick={() => setTool('text')} active={tool === 'text'} />
        </aside>
        <main className="flex-1 relative overflow-hidden bg-[#0a0a0a]">
          {textInput && (
            <div className="absolute z-[100] p-3 bg-zinc-900 border-2 border-purple-500 rounded-xl shadow-[0_0_50px_rgba(168,85,247,0.4)]" style={{ left: (textInput.x * zoom) + offset.x, top: (textInput.y * zoom) + offset.y, transform: 'translate(-50%, -50%)' }}>
               <div className="flex flex-col gap-2">
                  <textarea ref={textInputRef} className="bg-transparent text-white outline-none min-w-[250px] min-h-[100px] font-bold text-lg resize-none" value={textInput.value} onChange={(e) => setTextInput({ ...textInput, value: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitText(); } }} placeholder="Write your text..." />
                  <div className="flex justify-end gap-2 border-t border-zinc-800 pt-2">
                    <button onClick={() => setTextInput(null)} className="px-3 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-md">Cancel</button>
                    <button onClick={submitText} className="px-3 py-1 text-[10px] bg-purple-600 hover:bg-purple-500 text-white rounded-md font-bold">Add Text</button>
                  </div>
               </div>
            </div>
          )}
          <canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} className="block w-full h-full" style={{ cursor: tool === 'hand' ? 'grab' : (tool === 'eraser' ? 'not-allowed' : (isResizing ? 'nwse-resize' : (isDragging ? 'grabbing' : 'crosshair'))) }} />
        </main>
        <AnimatePresence>
          {isAiSidebarOpen && (
             <motion.aside initial={{ x: 320 }} animate={{ x: 0 }} exit={{ x: 320 }} className="w-80 bg-[#141414] border-l border-zinc-800 flex flex-col z-50 shadow-2xl">
               <div className="p-6 border-b border-zinc-800 flex items-center justify-between font-bold"><div className="flex items-center gap-2"><Sparkles size={18} className="text-purple-500" /> AI Assistant</div><button onClick={() => setIsAiSidebarOpen(false)}><X size={18} /></button></div>
               <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div className="text-xs p-4 rounded-2xl bg-zinc-900 text-zinc-400 border border-zinc-800">Select any shape to refine it using AI!</div>
               </div>
            </motion.aside>
          )}
          {isAssetsOpen && (
            <motion.aside initial={{ x: 320 }} animate={{ x: 0 }} exit={{ x: 320 }} className="w-80 bg-[#141414] border-l border-zinc-800 flex flex-col z-50 shadow-2xl">
               <div className="p-6 border-b border-zinc-800"><div className="flex items-center justify-between font-bold mb-4"><span>Assets library</span><button onClick={() => setIsAssetsOpen(false)}><X size={18} /></button></div>
                  <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} /><input type="text" placeholder="Search icons..." className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:border-purple-500 outline-none transition-colors" value={assetSearch} onChange={(e) => setAssetSearch(e.target.value)} /></div>
               </div>
               <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-3">
                  {Object.keys(ICON_COMPONENTS).filter(name => name.toLowerCase().includes(assetSearch.toLowerCase())).map((name, idx) => {
                    const IconComp = ICON_COMPONENTS[name];
                    return (
                    <button key={idx} onClick={() => addIcon(name)} className="aspect-square bg-zinc-900/50 border border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-purple-500 hover:bg-purple-500/10 transition-all group">
                       <div className="text-zinc-400 group-hover:text-purple-400 transition-colors scale-110"><IconComp size={20} /></div>
                       <span className="text-[8px] text-zinc-600 group-hover:text-zinc-400 uppercase tracking-tighter">{name}</span>
                    </button>
                  )})}
               </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const ToolIcon = ({ icon, active, onClick, label }: any) => (
  <button onClick={onClick} className={`p-2.5 rounded-lg flex items-center gap-2 transition-all relative group ${active ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>
    {icon}
    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">{label}</span>
  </button>
);

const ShapeBtn = ({ icon, onClick, active }: any) => (
  <button onClick={onClick} className={`p-3 rounded-xl transition-all active:scale-95 ${active ? 'bg-white text-black' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}>{icon}</button>
);

export default DrawingPage;
