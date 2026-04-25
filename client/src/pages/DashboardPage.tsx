import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, LayoutGrid, List, MoreVertical, Palette, Trash2, ExternalLink, Clock, Edit2, User } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const DashboardPage = () => {
  const [projects, setProjects] = useState([]);
  const [userData, setUserData] = useState<{ name: string, email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/login'); return; }
      const res = await axios.get('http://localhost:5000/api/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(res.data.projects);
      setUserData(res.data.user);
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 401) { localStorage.removeItem('token'); navigate('/login'); }
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchDashboardData(); }, []);

  const createNewProject = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/projects', { title: 'Untitled Design' }, { headers: { Authorization: `Bearer ${token}` } });
      navigate(`/draw/${res.data.id}`);
    } catch (err) { navigate(`/draw/${Math.random().toString(36).substring(7)}`); }
  };

  const deleteProject = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/projects/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setProjects(prev => prev.filter((p: any) => p.id !== id));
      setMenuOpenId(null);
    } catch (err) { console.error('Error deleting project:', err); }
  };

  const renameProject = async (id: string, currentTitle: string) => {
    const newTitle = window.prompt('Enter new project name:', currentTitle);
    if (!newTitle || newTitle === currentTitle) return;
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:5000/api/projects/${id}`, { title: newTitle }, { headers: { Authorization: `Bearer ${token}` } });
      setProjects(prev => prev.map((p: any) => p.id === id ? { ...p, title: newTitle } : p));
      setMenuOpenId(null);
    } catch (err) { console.error('Error renaming project:', err); }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12" onClick={() => setMenuOpenId(null)}>
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/20 rotate-3 flex-shrink-0">
              <Palette size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">DrawAI</h1>
              <p className="text-zinc-500 font-medium">Your creative workspace</p>
            </div>
          </div>

          <div className="flex items-center gap-6 bg-white/5 p-2 pr-6 rounded-[2rem] border border-white/5 backdrop-blur-xl">
             <div className="w-12 h-12 rounded-full bg-gradient-to-br from-zinc-800 to-black border border-white/10 flex items-center justify-center text-zinc-400">
               <User size={24} />
             </div>
             <div className="flex flex-col">
               <span className="text-sm font-black uppercase tracking-widest text-white">{userData?.name || 'Designer'}</span>
               <span className="text-[10px] font-bold text-zinc-500 truncate max-w-[150px]">{userData?.email || 'Loading profile...'}</span>
             </div>
             <div className="h-8 w-[1px] bg-white/10 mx-2" />
             <button onClick={createNewProject} className="bg-white text-black hover:bg-zinc-200 px-6 py-3 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-white/5 flex items-center gap-2">
               <Plus size={16} /> New Project
             </button>
          </div>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => <div key={i} className="h-64 bg-white/5 rounded-3xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <AnimatePresence>
              {projects.map((project: any) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group relative aspect-[1.4/1] bg-[#0d0d0d] rounded-[2.5rem] border border-white/5 p-8 hover:border-purple-500/50 hover:bg-[#111] transition-all duration-500"
                  style={{ zIndex: menuOpenId === project.id ? 50 : 1 }}
                >
                  {project.isShared && (
                    <div className="absolute top-6 left-6 px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-full flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Shared</span>
                    </div>
                  )}

                  <div className="flex flex-col h-full justify-between">
                    <div className="flex justify-end relative">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === project.id ? null : project.id); }}
                        className="p-3 text-zinc-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
                      >
                        <MoreVertical size={20} />
                      </button>

                      <AnimatePresence>
                        {menuOpenId === project.id && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -10 }}
                            className="absolute top-14 right-0 w-56 bg-[#1a1a1a] border border-white/10 rounded-3xl p-3 shadow-2xl z-[100] backdrop-blur-2xl"
                          >
                            <button onClick={() => navigate(`/draw/${project.id}`)} className="w-full flex items-center gap-3 p-3 text-zinc-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all font-bold text-xs">
                              <ExternalLink size={16} /> Open Design
                            </button>
                            
                            {!project.isShared && (
                              <>
                                <button onClick={() => renameProject(project.id, project.title)} className="w-full flex items-center gap-3 p-3 text-zinc-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all font-bold text-xs">
                                  <Edit2 size={16} /> Rename
                                </button>
                                <div className="h-[1px] bg-white/5 my-2" />
                                <button onClick={() => deleteProject(project.id)} className="w-full flex items-center gap-3 p-3 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all font-bold text-xs">
                                  <Trash2 size={16} /> Delete Forever
                                </button>
                              </>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-xl font-black text-white group-hover:text-purple-400 transition-colors truncate pr-8">{project.title}</h3>
                        <div className="flex items-center gap-2 text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
                          <Clock size={12} />
                          <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center text-[10px] font-black text-zinc-500">
                          {project.owner.name[0]}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-tighter text-zinc-500">
                          {project.owner.name}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {projects.length === 0 && (
              <div className="col-span-full py-32 flex flex-col items-center justify-center text-zinc-700 space-y-6">
                <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center border border-dashed border-white/10">
                  <Plus size={40} className="opacity-20" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-black uppercase tracking-[0.3em] mb-2">Workspace Empty</p>
                  <p className="text-xs font-medium opacity-50">Start your creative journey by creating a new project</p>
                </div>
                <button onClick={createNewProject} className="px-8 py-4 bg-white text-black rounded-[2rem] font-black text-xs uppercase tracking-widest hover:scale-105 transition-all">
                  Create First Project
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
