
import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { TeachingPlan } from './types';
import * as mammoth from 'mammoth';

// --- 用户数据定义 ---
const ALLOWED_USERS = [
  { username: 'Irene', password: 'CAMtest', role: 'admin' },
  { username: 'user01', password: 'camtest', role: 'user' },
  { username: 'user02', password: 'testtest', role: 'user' },
];

// --- 初始状态定义 ---
const INITIAL_STATE: TeachingPlan = {
  basic: { level: '', unit: '', lessonNo: '', duration: '', className: '', studentCount: '', date: '' },
  objectives: {
    vocab: { core: '', basic: '', satellite: '' },
    patterns: { core: '', basic: '', satellite: '' },
    expansion: { culture: '', daily: '', habits: '' },
  },
  materials: { cards: '', realia: '', multimedia: '', rewards: '' },
  games: [{ name: '', goal: '', prep: '', rules: '' }],
  steps: Array(5).fill(null).map((_, i) => ({
    step: '', duration: '', design: '', instructions: '', notes: '', blackboard: ''
  })),
  connection: { review: '', preview: '', homework: '', prep: '' },
  feedback: {
    student: { content: '', time: '', plan: '' },
    parent: { content: '', time: '', plan: '' },
    partner: { content: '', time: '', plan: '' },
  },
};

// --- Schema 定义 (用于强制 AI 输出正确格式) ---
const TEACHING_PLAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    basic: {
      type: Type.OBJECT,
      properties: {
        level: { type: Type.STRING },
        unit: { type: Type.STRING },
        lessonNo: { type: Type.STRING },
        duration: { type: Type.STRING },
        className: { type: Type.STRING },
        studentCount: { type: Type.STRING },
        date: { type: Type.STRING },
      }
    },
    objectives: {
      type: Type.OBJECT,
      properties: {
        vocab: {
          type: Type.OBJECT,
          properties: { core: { type: Type.STRING }, basic: { type: Type.STRING }, satellite: { type: Type.STRING } }
        },
        patterns: {
          type: Type.OBJECT,
          properties: { core: { type: Type.STRING }, basic: { type: Type.STRING }, satellite: { type: Type.STRING } }
        },
        expansion: {
          type: Type.OBJECT,
          properties: { culture: { type: Type.STRING }, daily: { type: Type.STRING }, habits: { type: Type.STRING } }
        }
      }
    },
    materials: {
      type: Type.OBJECT,
      properties: { cards: { type: Type.STRING }, realia: { type: Type.STRING }, multimedia: { type: Type.STRING }, rewards: { type: Type.STRING } }
    },
    games: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { name: { type: Type.STRING }, goal: { type: Type.STRING }, prep: { type: Type.STRING }, rules: { type: Type.STRING } }
      }
    },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          step: { type: Type.STRING },
          duration: { type: Type.STRING },
          design: { type: Type.STRING },
          instructions: { type: Type.STRING },
          notes: { type: Type.STRING },
          blackboard: { type: Type.STRING }
        }
      }
    },
    connection: {
      type: Type.OBJECT,
      properties: { review: { type: Type.STRING }, preview: { type: Type.STRING }, homework: { type: Type.STRING } }
    },
    feedback: {
      type: Type.OBJECT,
      properties: {
        student: { type: Type.OBJECT, properties: { content: { type: Type.STRING }, time: { type: Type.STRING }, plan: { type: Type.STRING } } },
        parent: { type: Type.OBJECT, properties: { content: { type: Type.STRING }, time: { type: Type.STRING }, plan: { type: Type.STRING } } },
        partner: { type: Type.OBJECT, properties: { content: { type: Type.STRING }, time: { type: Type.STRING }, plan: { type: Type.STRING } } },
      }
    }
  }
};

// --- 子组件定义 ---

const AutoResizingTextarea = memo(({ value, onChange, isPreview, className, placeholder = "" }: { 
  value: string, 
  onChange: (v: string) => void, 
  isPreview: boolean, 
  className: string,
  placeholder?: string
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value, isPreview]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target;
    onChange(el.value);
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  return (
    <div className="relative w-full inline-block align-top">
      <textarea
        ref={textareaRef}
        rows={1}
        readOnly={isPreview}
        placeholder={isPreview ? "" : placeholder}
        className={`w-full outline-none border-none resize-none bg-transparent overflow-hidden leading-relaxed transition-all block ${className} print:hidden`}
        value={value}
        onChange={handleChange}
      />
      <div className={`hidden print:block whitespace-pre-wrap break-words min-h-[1em] leading-relaxed ${className}`}>
        {value || (isPreview ? "" : "")}
      </div>
    </div>
  );
});

const SectionTitle = memo(({ num, title, onClear, isPreview }: { 
  num: string, 
  title: string, 
  onClear?: () => void, 
  isPreview: boolean
}) => (
  <div className="flex items-center mb-6 mt-4 group/title print:mb-3 print:mt-1">
    <div className="w-1.5 h-6 bg-indigo-500 rounded-full mr-4 print:h-4 print:mr-2"></div>
    <div className="flex items-baseline">
      <span className="text-indigo-500 font-bold text-xl mr-2 opacity-50 print:text-lg">{num}.</span>
      <h2 className="text-lg font-bold font-zh text-slate-800 tracking-wide print:text-base">{title}</h2>
    </div>
    {!isPreview && onClear && (
      <button 
        onClick={onClear}
        className="ml-4 opacity-0 group-hover/title:opacity-100 transition-opacity text-slate-400 hover:text-red-500 flex items-center gap-1 text-[10px] font-bold font-zh no-print"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        清空
      </button>
    )}
    <div className="flex-1 ml-6 h-[1px] bg-slate-100 print:ml-4"></div>
  </div>
));

const EditableLine = memo(({ label, value, onChange, isPreview, placeholder = "点击填写..." }: { label: string, value: string, onChange: (v: string) => void, isPreview: boolean, placeholder?: string }) => {
  return (
    <div className={`group flex items-start py-2.5 border-b border-slate-50 transition-all print:py-1 ${isPreview ? 'border-transparent' : 'hover:border-indigo-100'}`}>
      <div className="flex-shrink-0 font-bold text-xs font-zh min-w-[140px] text-slate-400 pt-1 uppercase tracking-wider print:min-w-[100px] print:text-[10px]">
        {label}
      </div>
      <div className="flex-1 ml-4 print:ml-2">
        <AutoResizingTextarea 
          value={value} 
          onChange={onChange} 
          isPreview={isPreview} 
          placeholder={placeholder}
          className="font-content text-base text-slate-800 placeholder-slate-200 focus:text-indigo-900 print:text-sm"
        />
      </div>
    </div>
  );
});

const LoginScreen = ({ onLogin }: { onLogin: (user: string) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = ALLOWED_USERS.find(u => u.username === username && u.password === password);
    if (user) {
      onLogin(user.username);
    } else {
      setError('用户名或密码错误');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-100 flex items-center justify-center z-[100] px-4">
      <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 font-zh mb-2">教案系统登录</h2>
          <p className="text-slate-400 text-sm">账号数据自动跨设备多端同步</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none font-zh text-slate-700 transition-all" 
              placeholder="请输入用户名" 
              required 
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none font-zh text-slate-700 transition-all" 
              placeholder="请输入密码" 
              required 
            />
          </div>
          {error && <p className="text-red-500 text-xs font-bold bg-red-50 p-2 rounded-lg text-center animate-shake">{error}</p>}
          <button type="submit" className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95 shadow-indigo-100">立即登录</button>
        </form>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(() => localStorage.getItem('cam-current-user'));
  const [data, setData] = useState<TeachingPlan>(INITIAL_STATE);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [isPreview, setIsPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('cam-current-user', currentUser);
      const userKey = `cam-data-sync-v2-${currentUser}`;
      const saved = localStorage.getItem(userKey);
      if (saved) setData(JSON.parse(saved));
      else setData(INITIAL_STATE);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    setSyncStatus('syncing');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      localStorage.setItem(`cam-data-sync-v2-${currentUser}`, JSON.stringify(data));
      setSyncStatus('synced');
      const { level, unit, lessonNo } = data.basic;
      document.title = `02.${level || ''} ${unit || ''}${lessonNo || ''} Teaching Plan`;
    }, 800);
  }, [data, currentUser]);

  const updateByPath = useCallback((path: string, value: any) => {
    setData(prev => {
      const keys = path.split('.');
      const next = { ...prev };
      let current: any = next;
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        current[key] = Array.isArray(current[key]) ? [...current[key]] : { ...current[key] };
        current = current[key];
      }
      current[keys[keys.length - 1]] = value;
      return next;
    });
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsProcessing(true);
    setProcessingMsg('正在准备文件...');
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let promptPart: any;
      
      if (file.name.toLowerCase().endsWith('.docx')) {
        setProcessingMsg('正在提取文档文字...');
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        promptPart = { text: `请基于以下文字内容提取完整教案：\n${result.value}` };
      } else {
        setProcessingMsg('正在解析图像数据...');
        const reader = new FileReader();
        const base64 = await new Promise<string>((res) => {
          reader.onload = () => res((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
        promptPart = { 
          inlineData: { mimeType: file.type, data: base64 },
        };
      }

      setProcessingMsg('正在智能匹配教案模板字段...');
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { 
          parts: [
            { text: "你是一位资深的少儿英语教研专家。请严格识别并提取所提供内容中的教案信息。必须包含核心目标、卫星句型、互动游戏（名称/目的/准备/规则）以及教学实施的各个环节。请按指定的 JSON 结构返回，不要输出任何解释性文字。" },
            promptPart 
          ] 
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: TEACHING_PLAN_SCHEMA,
          temperature: 0.1, // 降低随机性，提高提取准确率
        }
      });

      const text = response.text || "{}";
      const extracted = JSON.parse(text);
      
      // 合并数据，保留现有结构
      setData(prev => ({ 
        ...prev, 
        ...extracted,
        // 确保数组不为空
        games: extracted.games?.length ? extracted.games : prev.games,
        steps: extracted.steps?.length ? extracted.steps : prev.steps
      }));
      setProcessingMsg('导入成功！');
      setTimeout(() => setProcessingMsg(''), 1500);
    } catch (e) { 
      console.error(e);
      alert("智能提取失败。原因可能是文件内容过于模糊或 API 连接异常，请稍后重试。"); 
    } finally { 
      setIsProcessing(false); 
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addGame = () => updateByPath('games', [...data.games, { name: '', goal: '', prep: '', rules: '' }]);
  const removeGame = (i: number) => updateByPath('games', data.games.filter((_, idx) => idx !== i));
  const addStep = () => updateByPath('steps', [...data.steps, { step: '', duration: '', design: '', instructions: '', notes: '', blackboard: '' }]);
  const removeStep = (i: number) => updateByPath('steps', data.steps.filter((_, idx) => idx !== i));

  if (!currentUser) return <LoginScreen onLogin={setCurrentUser} />;

  return (
    <div className={`min-h-screen transition-all py-12 px-4 print:p-0 print:bg-white ${isPreview ? 'bg-slate-800' : 'bg-slate-50'}`}>
      
      {/* 智能处理状态遮罩 */}
      {isProcessing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center flex-col text-white">
          <div className="w-16 h-16 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mb-6"></div>
          <p className="text-xl font-bold font-zh tracking-widest animate-pulse">{processingMsg}</p>
          <p className="text-slate-400 text-sm mt-2">AI 正在努力工作中，请稍候...</p>
        </div>
      )}

      {/* 侧边控制栏 */}
      <div className={`no-print fixed top-8 right-8 flex flex-col gap-3 z-50 ${isPreview ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="bg-white/95 p-4 rounded-2xl border shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{currentUser}</span>
            <span className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-green-400' : 'bg-amber-400 animate-pulse'}`}></span>
          </div>
          <button onClick={() => setCurrentUser(null)} className="text-red-400 text-[10px] font-bold uppercase underline">切换账号</button>
        </div>
        <button onClick={() => window.print()} className="bg-slate-900 text-white px-6 py-3 rounded-xl shadow-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all">导出 PDF</button>
        <button disabled={isProcessing} onClick={() => fileInputRef.current?.click()} className="bg-indigo-500 text-white px-6 py-3 rounded-xl shadow-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
          智能导入同步
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".docx,image/*,application/pdf" />
        </button>
        <button onClick={() => setIsPreview(!isPreview)} className="bg-white border text-slate-700 px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">{isPreview ? '退出预览' : '预览模式'}</button>
      </div>

      <div className={`paper mx-auto bg-white transition-all relative ${isPreview ? 'p-[15mm] shadow-2xl' : 'p-[20mm] rounded-3xl shadow-lg'} print:p-[10mm] print:shadow-none print:rounded-none`} style={{ maxWidth: '210mm' }}>
        
        {/* Header */}
        <div className="text-center mb-12 print:mb-6">
          <h1 className="text-3xl font-bold font-zh text-slate-900 tracking-[0.2em] print:text-2xl">少儿英语线下课课堂教案</h1>
          <p className="text-indigo-400 font-content text-[10px] font-bold opacity-60 mt-1 uppercase">JIANYINGLINGHANG Training & Development</p>
        </div>

        {/* 01 Basic Info */}
        <section className="mb-10 print:mb-6">
          <SectionTitle num="01" title="基础课程信息" onClear={() => updateByPath('basic', INITIAL_STATE.basic)} isPreview={isPreview} />
          <div className="grid grid-cols-2 border border-slate-200 rounded-xl overflow-hidden print:border-slate-300 print:rounded-none">
            {[
              { label: '课程级别', path: 'basic.level' }, { label: '单元', path: 'basic.unit' },
              { label: '课号', path: 'basic.lessonNo' }, { label: '时长', path: 'basic.duration' },
              { label: '授课班级', path: 'basic.className' }, { label: '人数', path: 'basic.studentCount' },
              { label: '日期', path: 'basic.date' },
            ].map((item, idx) => (
              <div key={item.path} className={`flex border-slate-100 ${idx % 2 === 0 ? 'border-r' : ''} ${idx < 6 ? 'border-b' : ''} ${idx === 6 ? 'col-span-2' : ''} print:border-slate-300`}>
                <div className="w-[90px] bg-slate-50/50 p-2.5 font-zh font-bold text-[10px] text-slate-400 flex items-center justify-center text-center uppercase shrink-0 print:w-[70px]">
                  {item.label}
                </div>
                <div className="flex-1 p-2 print:p-1">
                  <input readOnly={isPreview} className="w-full text-center font-content text-base text-slate-700 bg-transparent" value={(data.basic as any)[item.path.split('.')[1]]} onChange={e => updateByPath(item.path, e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 02 Objectives */}
        <section className="mb-10 print:mb-6">
          <SectionTitle num="02" title="核心教学目标" onClear={() => updateByPath('objectives', INITIAL_STATE.objectives)} isPreview={isPreview} />
          <div className="space-y-8 print:space-y-4">
            <div>
              <h3 className="text-xs font-bold text-indigo-400 mb-2 opacity-80 uppercase tracking-widest">（一）词汇目标 / Vocabulary</h3>
              <EditableLine label="核心单词 (4 skills)" value={data.objectives.vocab.core} onChange={v => updateByPath('objectives.vocab.core', v)} isPreview={isPreview} />
              <EditableLine label="基础单词 (3 skills)" value={data.objectives.vocab.basic} onChange={v => updateByPath('objectives.vocab.basic', v)} isPreview={isPreview} />
              <EditableLine label="卫星单词 (2 skills)" value={data.objectives.vocab.satellite} onChange={v => updateByPath('objectives.vocab.satellite', v)} isPreview={isPreview} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-indigo-400 mb-2 opacity-80 uppercase tracking-widest">（二）句型目标 / Sentences</h3>
              <EditableLine label="核心句型" value={data.objectives.patterns.core} onChange={v => updateByPath('objectives.patterns.core', v)} isPreview={isPreview} />
              <EditableLine label="基础句型" value={data.objectives.patterns.basic} onChange={v => updateByPath('objectives.patterns.basic', v)} isPreview={isPreview} />
              <EditableLine label="卫星句型" value={data.objectives.patterns.satellite} onChange={v => updateByPath('objectives.patterns.satellite', v)} isPreview={isPreview} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-indigo-400 mb-2 opacity-80 uppercase tracking-widest">（三）拓展目标 / Expansion</h3>
              <EditableLine label="文化拓展" value={data.objectives.expansion.culture} onChange={v => updateByPath('objectives.expansion.culture', v)} isPreview={isPreview} />
              <EditableLine label="日常表达" value={data.objectives.expansion.daily} onChange={v => updateByPath('objectives.expansion.daily', v)} isPreview={isPreview} />
              <EditableLine label="行为习惯" value={data.objectives.expansion.habits} onChange={v => updateByPath('objectives.expansion.habits', v)} isPreview={isPreview} />
            </div>
          </div>
        </section>

        {/* 03 教具与互动 */}
        <section className="mb-10 print:mb-6">
          <SectionTitle num="03" title="教具与互动准备" isPreview={isPreview} />
          <div className="space-y-8 print:space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">（一）教具清单</h3>
              <div className="space-y-1">
                <EditableLine label="词汇卡片" value={data.materials.cards} onChange={v => updateByPath('materials.cards', v)} isPreview={isPreview} />
                <EditableLine label="实物教具" value={data.materials.realia} onChange={v => updateByPath('materials.realia', v)} isPreview={isPreview} />
                <EditableLine label="多媒体课件" value={data.materials.multimedia} onChange={v => updateByPath('materials.multimedia', v)} isPreview={isPreview} />
                <EditableLine label="奖励道具" value={data.materials.rewards} onChange={v => updateByPath('materials.rewards', v)} isPreview={isPreview} />
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-widest">（二）互动游戏</h3>
              <div className="space-y-5 print:space-y-2">
                {data.games.map((game, i) => (
                  <div key={i} className="p-4 bg-slate-50/50 border rounded-xl relative print:p-0 print:border-none print:bg-transparent">
                    {!isPreview && <button onClick={() => removeGame(i)} className="absolute top-2 right-2 text-red-300 text-[8px] uppercase hover:text-red-500">Remove</button>}
                    <div className="text-[9px] font-bold text-indigo-300 uppercase mb-2">Game {i+1}</div>
                    <EditableLine label="游戏名称" value={game.name} onChange={v => { const g = [...data.games]; g[i].name = v; updateByPath('games', g); }} isPreview={isPreview} />
                    <EditableLine label="游戏目的" value={game.goal} onChange={v => { const g = [...data.games]; g[i].goal = v; updateByPath('games', g); }} isPreview={isPreview} />
                    <EditableLine label="游戏准备" value={game.prep} onChange={v => { const g = [...data.games]; g[i].prep = v; updateByPath('games', g); }} isPreview={isPreview} />
                    <EditableLine label="游戏规则" value={game.rules} onChange={v => { const g = [...data.games]; g[i].rules = v; updateByPath('games', g); }} isPreview={isPreview} />
                  </div>
                ))}
                {!isPreview && <button onClick={addGame} className="w-full py-2 border border-dashed border-indigo-100 text-indigo-300 text-[10px] font-bold rounded-xl hover:bg-indigo-50 transition-all">+ 添加互动游戏</button>}
              </div>
            </div>
          </div>
        </section>

        {/* 04 教学环节实施 */}
        <section className="mb-10 print:mb-6">
          <SectionTitle num="04" title="教学环节实施" isPreview={isPreview} />
          <div className="space-y-6 print:space-y-3">
            {data.steps.map((step, i) => (
              <div key={i} className="page-break-inside-avoid">
                <div className="flex items-center gap-2 mb-2 print:mb-1">
                  <span className="font-bold text-slate-800 text-sm">{i+1}.</span>
                  <AutoResizingTextarea value={step.step} onChange={v => { const s = [...data.steps]; s[i].step = v; updateByPath('steps', s); }} isPreview={isPreview} className="font-content text-base font-bold text-slate-800" placeholder="环节名称" />
                  {!isPreview && <button onClick={() => removeStep(i)} className="ml-auto text-red-300 text-[8px] uppercase hover:text-red-500">Delete</button>}
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden print:border-slate-300 print:rounded-none">
                  <table className="w-full border-collapse">
                    <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                      {[
                        { label: '时长', field: 'duration', className: 'text-indigo-500 font-bold' },
                        { label: '环节设计', field: 'design' },
                        { label: '课堂指令', field: 'instructions', className: 'text-slate-500' },
                        { label: '难点注意', field: 'notes', className: 'text-red-400' },
                        { label: '板书设计', field: 'blackboard' },
                      ].map((row) => (
                        <tr key={row.field} className="align-top">
                          <td className="p-3 w-[100px] bg-slate-50/50 border-r border-slate-100 font-zh font-bold text-[10px] text-slate-400 text-center uppercase pt-4 print:p-1.5 print:w-[75px] print:pt-2">
                            {row.label}
                          </td>
                          <td className="p-3 print:p-1.5">
                            <AutoResizingTextarea value={(step as any)[row.field]} onChange={v => { const s = [...data.steps]; (s[i] as any)[row.field] = v; updateByPath('steps', s); }} isPreview={isPreview} className={`text-slate-800 leading-relaxed print:text-[13px] ${row.className || ''}`} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            {!isPreview && <button onClick={addStep} className="w-full py-3 bg-white border border-dashed border-indigo-200 text-indigo-400 rounded-2xl text-xs font-bold transition-all hover:bg-indigo-50">+ 增加教学环节</button>}
          </div>
        </section>

        {/* 05 Connection */}
        <section className="mb-10 print:mb-6">
          <SectionTitle num="05" title="教学内容衔接" isPreview={isPreview} />
          <div className="space-y-0.5">
            <EditableLine label="课堂复习 / Review" value={data.connection.review} onChange={v => updateByPath('connection.review', v)} isPreview={isPreview} />
            <EditableLine label="内容预告 / Preview" value={data.connection.preview} onChange={v => updateByPath('connection.preview', v)} isPreview={isPreview} />
            <EditableLine label="家庭作业 / Homework" value={data.connection.homework} onChange={v => updateByPath('connection.homework', v)} isPreview={isPreview} />
          </div>
        </section>

        {/* 06 课后沟通 */}
        <section className="mb-10 print:mb-6">
          <SectionTitle num="06" title="课后沟通备忘录" isPreview={isPreview} />
          <div className="border border-slate-200 rounded-xl overflow-hidden print:border-slate-300 print:rounded-none">
            <table className="w-full border-collapse text-[10px]">
              <thead className="bg-slate-50 border-b print:bg-slate-100">
                <tr className="font-bold text-slate-400">
                  <th className="p-2 w-[15%] border-r">维度</th>
                  <th className="p-2 w-[55%] text-left border-r">反馈内容 / Feedback</th>
                  <th className="p-2 w-[15%] border-r">时间</th>
                  <th className="p-2 w-[15%]">后续计划</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {[
                  { id: 'student', label: '学员反馈' },
                  { id: 'parent', label: '家长沟通' },
                  { id: 'partner', label: '搭档协作' },
                ].map(row => (
                  <tr key={row.id} className="align-top">
                    <td className="p-2 text-center font-bold text-slate-500 pt-3 border-r">{row.label}</td>
                    <td className="p-2 border-r"><AutoResizingTextarea value={(data.feedback as any)[row.id].content} onChange={v => updateByPath(`feedback.${row.id}.content`, v)} isPreview={isPreview} className="text-sm print:text-xs" /></td>
                    <td className="p-2 border-r"><AutoResizingTextarea value={(data.feedback as any)[row.id].time} onChange={v => updateByPath(`feedback.${row.id}.time`, v)} isPreview={isPreview} className="text-center text-[8px]" /></td>
                    <td className="p-2"><AutoResizingTextarea value={(data.feedback as any)[row.id].plan} onChange={v => updateByPath(`feedback.${row.id}.plan`, v)} isPreview={isPreview} className="text-[8px] text-indigo-400" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t text-center opacity-30 print:mt-6 print:pt-4">
          <p className="text-slate-400 font-content text-[8px] uppercase font-bold tracking-widest">JIANYINGLINGHANG · CONFIDENTIAL</p>
          <p className="text-slate-300 text-[7px] mt-1 font-zh tracking-widest">内部教研材料 · 严禁外传</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; padding: 0; }
          .paper { border: none !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 10mm !important; }
          @page { margin: 10mm; size: A4; }
          .page-break-inside-avoid { page-break-inside: avoid !important; }
        }
        .paper { min-height: 297mm; }
        textarea { white-space: pre-wrap; word-break: break-word; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};

export default App;
