import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, LayoutGrid, List, MoreVertical, Palette, Trash2, ExternalLink, Clock, Edit2 } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const DashboardPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      const res = await axios.get('http://localhost:5000/api/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(res.data);
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const createNewProject = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/projects', 
        { title: 'Untitled Design' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/draw/${res.data.id}`);
    } catch (err) {
      console.error('Error creating project:', err);
      const id = Math.random().toString(36).substring(7);
      navigate(`/draw/${id}`);
    }
  };

  const deleteProject = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/projects/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(prev => prev.filter((p: any) => p.id !== id));
      setMenuOpenId(null);
    } catch (err) {
      console.error('Error deleting project:', err);
    }
  };

  const renameProject = async (id: string, currentTitle: string) => {
    const newTitle = window.prompt('Enter new project name:', currentTitle);
    if (!newTitle || newTitle === currentTitle) return;

    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:5000/api/projects/${id}`, 
        { title: newTitle },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProjects(prev => prev.map((p: any) => p.id === id ? { ...p, title: newTitle } : p));
      setMenuOpenId(null);
    } catch (err) {
      console.error('Error renaming project:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12" onClick={() => setMenuOpenId(null)}>
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/20 rotate-3 flex-shrink-0">
              <Palette size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">DrawAI</h1>
              <p className="text-zinc-500 font-medium">Your creative workspace</p>
            </div>
          </div>
          
          <button 
            onClick={createNewProject}
            className="bg-white text-black px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)] group"
          >
            <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" />
            Create Project
          </button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Create New Card */}
          <motion.div 
            whileHover={{ y: -8, borderColor: '#a855f7' }}
            onClick={(e) => { e.stopPropagation(); createNewProject(); }}
            className="aspect-[1.4/1] bg-zinc-900/20 border-2 border-dashed border-zinc-800/50 rounded-[2.5rem] flex flex-col items-center justify-center gap-5 cursor-pointer hover:bg-purple-500/5 transition-all group"
          >
            <div className="w-16 h-16 bg-zinc-900 rounded-3xl flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-600/20 transition-all shadow-inner">
              <Plus size={32} className="text-zinc-600 group-hover:text-purple-400" />
            </div>
            <div className="text-center">
              <span className="block font-bold text-lg text-zinc-400 group-hover:text-purple-300">New Design</span>
              <span className="text-xs text-zinc-600">Start from a blank canvas</span>
            </div>
          </motion.div>

          {projects.map((project: any) => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              isMenuOpen={menuOpenId === project.id}
              onMenuToggle={(e) => { 
                e.stopPropagation(); 
                setMenuOpenId(menuOpenId === project.id ? null : project.id); 
              }}
              onOpen={() => navigate(`/draw/${project.id}`)}
              onDelete={() => deleteProject(project.id)}
              onRename={() => renameProject(project.id, project.title)}
            />
          ))}
        </div>

        {loading && (
          <div className="flex justify-center mt-32">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin shadow-2xl shadow-purple-500/50" />
          </div>
        )}

        {!loading && projects.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mt-20 py-32 bg-zinc-900/10 rounded-[3.5rem] border border-zinc-800/30 backdrop-blur-sm">
            <Palette size={64} className="mx-auto text-zinc-800 mb-6" />
            <p className="text-zinc-500 text-xl font-medium">No projects yet. Your masterpieces will appear here!</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const ProjectCard = ({ project, isMenuOpen, onMenuToggle, onOpen, onDelete, onRename }: any) => (
  <motion.div 
    whileHover={{ y: -8 }}
    onClick={onOpen}
    className={`aspect-[1.4/1] bg-[#0d0d0d] border border-zinc-800/80 rounded-[2.5rem] group cursor-pointer hover:border-zinc-700/50 hover:shadow-2xl hover:shadow-purple-500/5 transition-all relative flex flex-col ${isMenuOpen ? 'z-50' : 'z-0'}`}
  >
    {/* Preview Area */}
    <div className="relative h-[65%] w-full bg-gradient-to-br from-zinc-900 to-black rounded-t-[2.5rem] overflow-hidden flex items-center justify-center">
       <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity">
         <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#a855f7_0%,transparent_50%)]" />
       </div>
       <Palette size={50} className="text-zinc-800 group-hover:text-purple-500/30 group-hover:scale-110 transition-all duration-500" />
    </div>

    {/* Menu Button & Dropdown (OUTSIDE overflow containers) */}
    <div className="absolute top-5 right-5 z-[100]">
      <button 
        onClick={onMenuToggle}
        className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isMenuOpen ? 'bg-purple-600 text-white scale-110 shadow-lg shadow-purple-500/40' : 'bg-black/40 text-zinc-400 hover:bg-black/60 hover:text-white backdrop-blur-md border border-white/5'}`}
      >
        <MoreVertical size={18} />
      </button>
      
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, x: 10, y: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 10, y: -10 }}
            className="absolute right-0 mt-3 w-40 bg-[#1a1a1a] border border-zinc-800 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,1)] z-[110] overflow-hidden backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={onOpen} className="w-full px-5 py-4 text-sm font-bold flex items-center gap-3 hover:bg-zinc-800 transition-colors text-white border-b border-zinc-800/50">
              <ExternalLink size={16} className="text-purple-400" /> Open
            </button>
            <button onClick={onRename} className="w-full px-5 py-4 text-sm font-bold flex items-center gap-3 hover:bg-zinc-800 transition-colors text-white border-b border-zinc-800/50">
              <Edit2 size={16} className="text-blue-400" /> Rename
            </button>
            <button onClick={onDelete} className="w-full px-5 py-4 text-sm font-bold flex items-center gap-3 hover:bg-red-600 transition-colors text-white">
              <Trash2 size={16} /> Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

    {/* Content Area */}
    <div className="p-6 flex flex-col justify-between flex-1 bg-gradient-to-b from-[#0d0d0d] to-black rounded-b-[2.5rem]">
      <h3 className="font-bold text-xl text-white truncate group-hover:text-purple-400 transition-colors">{project.title || 'Untitled Design'}</h3>
      <div className="flex justify-between items-center mt-2">
        <div className="flex items-center gap-2 text-zinc-500">
          <Clock size={14} />
          <span className="text-xs font-medium">{new Date(project.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        </div>
        <div className="flex -space-x-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-black shadow-lg" />
        </div>
      </div>
    </div>
  </motion.div>
);

export default DashboardPage;
