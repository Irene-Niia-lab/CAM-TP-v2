
import React, { useState, useEffect, useRef, memo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { TeachingPlan, Game, ImplementationStep } from './types';
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

const SectionTitle = memo(({ num, title, onClear, isPreview, extraAction }: { 
  num: string, 
  title: string, 
  onClear?: () => void, 
  isPreview: boolean,
  extraAction?: React.ReactNode
}) => (
  <div className="flex items-center mb-6 mt-4 group/title print:mb-4 print:mt-2">
    <div className="w-1.5 h-6 bg-indigo-500 rounded-full mr-4 print:h-4 print:mr-2"></div>
    <div className="flex items-baseline">
      <span className="text-indigo-500 font-bold text-xl mr-2 opacity-50 print:text-lg">{num}.</span>
      <h2 className="text-lg font-bold font-zh text-slate-800 tracking-wide print:text-base">{title}</h2>
    </div>
    {!isPreview && extraAction && (
      <div className="ml-4 no-print flex items-center">
        {extraAction}
      </div>
    )}
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
    <div className={`group flex items-start py-2 border-b border-slate-50 transition-all print:py-1 ${isPreview ? 'border-transparent' : 'hover:border-indigo-100'}`}>
      <div className="flex-shrink-0 font-bold text-xs font-zh min-w-[140px] text-slate-400 pt-1 uppercase tracking-wider print:min-w-[110px]">
        {label}
      </div>
      <div className="flex-1 ml-4">
        <AutoResizingTextarea 
          value={value} 
          onChange={onChange} 
          isPreview={isPreview} 
          placeholder={placeholder}
          className="font-content text-base text-slate-800 placeholder-slate-200 focus:text-indigo-900"
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
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800 font-zh mb-2">教案系统登录</h2>
          <p className="text-slate-400 text-sm">请输入授权账号进行访问</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:border-indigo-300 focus:ring-0 outline-none transition-all font-content text-slate-700"
              placeholder="请输入用户名"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:border-indigo-300 focus:ring-0 outline-none transition-all font-content text-slate-700"
              placeholder="请输入密码"
              required
            />
          </div>
          {error && <p className="text-red-500 text-xs font-bold ml-1">{error}</p>}
          <button 
            type="submit" 
            className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95"
          >
            登录登录
          </button>
        </form>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(() => localStorage.getItem('cam-user'));
  const [data, setData] = useState<TeachingPlan>(() => {
    const saved = localStorage.getItem('teaching-plan-v13');
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });
  
  const [isPreview, setIsPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('cam-user', currentUser);
    } else {
      localStorage.removeItem('cam-user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('teaching-plan-v13', JSON.stringify(data));
    const { level, unit, lessonNo } = data.basic;
    const formatPart = (val: string, prefix: string) => {
      const clean = (val || '').trim();
      if (!clean) return '';
      if (clean.toUpperCase().startsWith(prefix.toUpperCase())) return clean;
      return `${prefix}${clean}`;
    };
    const pLevel = formatPart(level, 'PU');
    const pUnit = formatPart(unit, 'U');
    const pLesson = formatPart(lessonNo, 'L');
    const fileName = `02.${pLevel} ${pUnit}${pLesson} Teaching Plan`.replace(/\s+/g, ' ').trim();
    document.title = fileName;
  }, [data]);

  const updateByPath = (path: string, value: any) => {
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
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let contentPart: any;

      if (file.name.toLowerCase().endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        contentPart = { text: `以下是教案文档的内容，请根据此内容提取信息：\n\n${result.value}` };
      } 
      else {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
        contentPart = { inlineData: { mimeType: file.type, data: base64 } };
      }

      const prompt = `你是一个专业的教案数据提取专家。请从提供的文档或图片中将内容提取出来并按指定的 JSON 结构返回。
要求：
1. 严禁修改原文，完整保留文字、标点。
2. 环节名称提取到 'step'。
3. 如果缺失则保留空字符串。
4. 必须仅返回合法的 JSON 字符串，不要包含 Markdown 标记。

JSON 结构示例：
{
  "basic": {"level": "", "unit": "", "lessonNo": "", "duration": "", "className": "", "studentCount": "", "date": ""},
  "objectives": {
    "vocab": {"core": "", "basic": "", "satellite": ""},
    "patterns": {"core": "", "basic": "", "satellite": ""},
    "expansion": {"culture": "", "daily": "", "habits": ""}
  },
  "materials": {"cards": "", "realia": "", "multimedia": "", "rewards": ""},
  "games": [{"name": "", "goal": "", "prep": "", "rules": ""}],
  "steps": [{"step": "", "duration": "", "design": "", "instructions": "", "notes": "", "blackboard": ""}],
  "connection": {"review": "", "preview": "", "homework": "", "prep": ""},
  "feedback": {
    "student": {"content": "", "time": "", "plan": ""},
    "parent": {"content": "", "time": "", "plan": ""},
    "partner": {"content": "", "time": "", "plan": ""}
  }
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              contentPart
            ]
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      const textOutput = response.text;
      if (!textOutput) throw new Error("AI 返回内容为空。");

      const jsonString = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      const extractedData = JSON.parse(jsonString);
      
      if (extractedData.steps && extractedData.steps.length < 5) {
        const currentCount = extractedData.steps.length;
        for (let i = currentCount; i < 5; i++) {
          extractedData.steps.push({ step: '', duration: '', design: '', instructions: '', notes: '', blackboard: '' });
        }
      }
      
      setData({ ...INITIAL_STATE, ...extractedData });
    } catch (error: any) {
      console.error("智能提取失败:", error);
      alert(`智能导入失败：网络错误或 API 调用限制，请重试。`);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addGame = () => {
    setData(prev => ({ ...prev, games: [...prev.games, { name: '', goal: '', prep: '', rules: '' }] }));
  };

  const removeGame = (index: number) => {
    if (data.games.length <= 1) return;
    setData(prev => ({ ...prev, games: prev.games.filter((_, i) => i !== index) }));
  };

  const addStep = () => {
    setData(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        { step: '', duration: '', design: '', instructions: '', notes: '', blackboard: '' }
      ]
    }));
  };

  const removeStep = (index: number) => {
    if (data.steps.length <= 1) return;
    setData(prev => {
      const newSteps = prev.steps.filter((_, i) => i !== index);
      return { ...prev, steps: newSteps };
    });
  };

  const handleLogout = () => {
    if (confirm('确认退出登录吗？')) {
      setCurrentUser(null);
    }
  };

  if (!currentUser) {
    return <LoginScreen onLogin={setCurrentUser} />;
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 py-12 px-4 print:p-0 print:bg-white ${isPreview ? 'bg-slate-800' : 'bg-slate-50'}`}>
      
      {/* Controls */}
      <div className={`no-print fixed top-8 right-8 flex flex-col gap-3 z-50 transition-all duration-300 ${isPreview ? 'opacity-0 pointer-events-none translate-x-10' : 'opacity-100'}`}>
        <div className="bg-white/90 backdrop-blur p-4 rounded-2xl border border-slate-200 shadow-xl mb-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Current User</p>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-bold text-slate-700 font-zh">{currentUser}</span>
            <button 
              onClick={handleLogout}
              className="text-red-400 hover:text-red-500 text-[10px] font-bold uppercase underline underline-offset-4"
            >
              Logout
            </button>
          </div>
        </div>

        <button 
          onClick={() => window.print()} 
          className="bg-slate-900 hover:bg-indigo-600 text-white px-6 py-3 rounded-xl shadow-xl hover:scale-105 transition-all font-bold text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
          导出正式教案
        </button>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          className="hidden" 
          accept="image/*,application/pdf,.doc,.docx"
        />
        
        <button 
          disabled={isProcessing}
          onClick={() => fileInputRef.current?.click()}
          className={`bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-xl shadow-xl hover:scale-105 transition-all font-bold text-sm flex items-center gap-2 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isProcessing ? (
            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
          )}
          {isProcessing ? '正在智能提取...' : '智能导入文档'}
        </button>

        <button 
          onClick={() => setIsPreview(true)} 
          className="bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-xl shadow-md hover:border-indigo-200 hover:text-indigo-600 transition-all font-bold text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          预览模式
        </button>
        <button onClick={() => { if(confirm('重置所有内容吗？')) setData(INITIAL_STATE); }} className="bg-white/80 backdrop-blur border border-slate-200 text-slate-300 px-6 py-2 rounded-xl hover:text-red-400 transition-all text-[10px] font-medium uppercase tracking-widest">
          RESET ALL
        </button>
      </div>

      {isPreview && (
        <div className="no-print fixed top-0 left-0 w-full flex justify-center py-4 bg-slate-900/50 backdrop-blur-md z-[60]">
          <button onClick={() => setIsPreview(false)} className="bg-white text-slate-900 px-6 py-2 rounded-full font-bold text-xs shadow-2xl flex items-center gap-2">
            退出预览模式
          </button>
        </div>
      )}

      <div className={`paper mx-auto bg-white transition-all duration-500 relative ${isPreview ? 'p-[15mm] rounded-none shadow-2xl scale-[0.98]' : 'p-[20mm] rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.03)]'}`} style={{ maxWidth: '210mm' }}>
        
        {/* Header */}
        <div className="text-center mb-12 relative z-10 print:mb-6">
          <h1 className="text-3xl font-bold font-zh text-slate-900 tracking-[0.2em] print:text-2xl">少儿英语线下课课堂教案</h1>
          <div className="mt-3 flex flex-col items-center justify-center gap-1">
            <p className="text-indigo-400 font-content text-[10px] tracking-[0.2em] uppercase font-bold opacity-70">JIANYINGLINGHANG Training & Development Department</p>
          </div>
        </div>

        {/* 01 Basic Info */}
        <section className="mb-10 relative z-10 print:mb-6">
          <SectionTitle num="01" title="基础课程信息" onClear={() => updateByPath('basic', INITIAL_STATE.basic)} isPreview={isPreview} />
          <div className={`grid grid-cols-2 border border-slate-200 rounded-xl overflow-hidden ${isPreview ? 'rounded-none border-slate-400' : 'rounded-xl'} print:border-slate-300`}>
            {[
              { label: '课程级别', path: 'basic.level', placeholder: '如: PU2' },
              { label: '单元', path: 'basic.unit', placeholder: '如: U3' },
              { label: '课号', path: 'basic.lessonNo', placeholder: '如: L1' },
              { label: '时长', path: 'basic.duration', placeholder: '如: 45min' },
              { label: '授课班级', path: 'basic.className', placeholder: '填写班号' },
              { label: '人数', path: 'basic.studentCount', placeholder: '填写人数' },
              { label: '日期', path: 'basic.date', placeholder: 'YYYY-MM-DD' },
            ].map((item, idx) => (
              <div key={item.path} className={`flex border-slate-100 ${idx % 2 === 0 ? 'border-r' : ''} ${idx < 6 ? 'border-b' : ''} ${idx === 6 ? 'col-span-2' : ''} ${isPreview ? 'border-slate-400' : ''} print:border-slate-300`}>
                <div className="w-[90px] bg-slate-50/50 p-3 font-zh font-bold text-[10px] text-slate-400 flex items-center justify-center text-center uppercase tracking-tighter shrink-0 print:p-1.5 print:w-[70px]">
                  {item.label}
                </div>
                <div className="flex-1 p-2 print:p-1">
                  <input 
                    readOnly={isPreview} 
                    placeholder={isPreview ? "" : item.placeholder}
                    className="w-full outline-none border-none font-content text-center text-base text-slate-700 bg-transparent placeholder-slate-200" 
                    value={(data.basic as any)[item.path.split('.')[1]]} 
                    onChange={e => updateByPath(item.path, e.target.value)} 
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 02 Objectives */}
        <section className="mb-10 relative z-10 print:mb-6">
          <SectionTitle num="02" title="核心教学目标" onClear={() => updateByPath('objectives', INITIAL_STATE.objectives)} isPreview={isPreview} />
          <div className="flex flex-col space-y-8 print:space-y-4">
            <div>
              <h3 className="text-xs font-bold font-zh text-indigo-400 mb-3 uppercase tracking-wider opacity-80 print:mb-1">（一）词汇目标 / Vocabulary</h3>
              <EditableLine label="核心单词 (4 skills)" value={data.objectives.vocab.core} onChange={v => updateByPath('objectives.vocab.core', v)} isPreview={isPreview} />
              <EditableLine label="基础单词 (3 skills)" value={data.objectives.vocab.basic} onChange={v => updateByPath('objectives.vocab.basic', v)} isPreview={isPreview} />
              <EditableLine label="卫星单词 (2 skills)" value={data.objectives.vocab.satellite} onChange={v => updateByPath('objectives.vocab.satellite', v)} isPreview={isPreview} />
            </div>
            <div>
              <h3 className="text-xs font-bold font-zh text-indigo-400 mb-3 uppercase tracking-wider opacity-80 print:mb-1">（二）句型目标 / Sentences</h3>
              <EditableLine label="核心句型" value={data.objectives.patterns.core} onChange={v => updateByPath('objectives.patterns.core', v)} isPreview={isPreview} />
              <EditableLine label="基础句型" value={data.objectives.patterns.basic} onChange={v => updateByPath('objectives.patterns.basic', v)} isPreview={isPreview} />
              <EditableLine label="卫星句型" value={data.objectives.patterns.satellite} onChange={v => updateByPath('objectives.patterns.satellite', v)} isPreview={isPreview} />
            </div>
            <div>
              <h3 className="text-xs font-bold font-zh text-indigo-400 mb-3 uppercase tracking-wider opacity-80 print:mb-1">（三）拓展目标 / Expansion</h3>
              <EditableLine label="文化拓展" value={data.objectives.expansion.culture} onChange={v => updateByPath('objectives.expansion.culture', v)} isPreview={isPreview} />
              <EditableLine label="日常表达" value={data.objectives.expansion.daily} onChange={v => updateByPath('objectives.expansion.daily', v)} isPreview={isPreview} />
              <EditableLine label="行为习惯" value={data.objectives.expansion.habits} onChange={v => updateByPath('objectives.expansion.habits', v)} isPreview={isPreview} />
            </div>
          </div>
        </section>

        {/* 03 Games & Materials */}
        <section className="mb-10 relative z-10 print:mb-6">
          <SectionTitle num="03" title="教具与互动准备" onClear={() => { updateByPath('materials', INITIAL_STATE.materials); updateByPath('games', INITIAL_STATE.games); }} isPreview={isPreview} />
          <div className="flex flex-col space-y-10 print:space-y-4">
            <div>
              <h3 className="text-xs font-bold font-zh text-slate-400 mb-3 uppercase tracking-wider print:mb-1">（一）教具清单</h3>
              <div className="space-y-1">
                <EditableLine label="词汇卡片" value={data.materials.cards} onChange={v => updateByPath('materials.cards', v)} isPreview={isPreview} />
                <EditableLine label="实物教具" value={data.materials.realia} onChange={v => updateByPath('materials.realia', v)} isPreview={isPreview} />
                <EditableLine label="多媒体设备" value={data.materials.multimedia} onChange={v => updateByPath('materials.multimedia', v)} isPreview={isPreview} />
                <EditableLine label="奖励道具" value={data.materials.rewards} onChange={v => updateByPath('materials.rewards', v)} isPreview={isPreview} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3 print:mb-1">
                <h3 className="text-xs font-bold font-zh text-slate-400 uppercase tracking-wider">（二）互动游戏</h3>
              </div>
              <div className="space-y-5 print:space-y-2">
                {data.games.map((game, i) => (
                  <div key={i} className={`group/game relative p-4 bg-slate-50/50 border border-slate-100 transition-all ${isPreview ? 'rounded-none border-slate-400 bg-transparent p-0' : 'rounded-xl shadow-sm'} print:p-0 print:border-none print:shadow-none`}>
                    {!isPreview && data.games.length > 1 && (
                      <button onClick={() => removeGame(i)} className="absolute top-3 right-3 no-print text-red-300 hover:text-red-500 font-bold text-[9px] uppercase">Remove</button>
                    )}
                    <div className="text-[9px] font-bold text-indigo-300 mb-2 tracking-widest uppercase flex items-center gap-2 print:mb-1">Game {i+1}</div>
                    <div className="space-y-0.5">
                      <EditableLine label="游戏名称" value={game.name} onChange={v => { const g = [...data.games]; g[i].name = v; updateByPath('games', g); }} isPreview={isPreview} />
                      <EditableLine label="游戏目的" value={game.goal} onChange={v => { const g = [...data.games]; g[i].goal = v; updateByPath('games', g); }} isPreview={isPreview} />
                      <EditableLine label="游戏准备" value={game.prep} onChange={v => { const g = [...data.games]; g[i].prep = v; updateByPath('games', g); }} isPreview={isPreview} />
                      <EditableLine label="游戏规则" value={game.rules} onChange={v => { const g = [...data.games]; g[i].rules = v; updateByPath('games', g); }} isPreview={isPreview} />
                    </div>
                  </div>
                ))}
                
                {!isPreview && (
                  <div className="no-print flex justify-end mt-4">
                    <button 
                      onClick={addGame} 
                      className="group/add flex items-center gap-2 bg-white border border-dashed border-indigo-200 text-indigo-400 px-4 py-2 rounded-xl text-xs font-bold hover:border-indigo-400 hover:text-indigo-600 transition-all shadow-sm"
                    >
                      <svg className="w-4 h-4 transition-transform group-hover/add:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                      </svg>
                      ADD NEW GAME
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 04 Implementation */}
        <section className="mb-10 relative z-10 print:mb-6">
          <SectionTitle 
            num="04" 
            title="教学环节实施" 
            onClear={() => updateByPath('steps', INITIAL_STATE.steps)} 
            isPreview={isPreview}
          />
          <div className="space-y-6 print:space-y-4">
            {data.steps.map((step, i) => (
              <div key={i} className="group/step relative page-break-inside-avoid print:page-break-inside-avoid">
                <div className="flex items-start gap-2 mb-2 min-h-[1.5em] print:mb-1">
                  <span className="font-bold text-slate-800 text-sm pt-0.5 select-none shrink-0">{i + 1}.</span>
                  <div className="flex-1 flex items-start justify-between">
                    <div className="flex-1 max-w-[90%]">
                      <AutoResizingTextarea 
                        value={step.step} 
                        onChange={v => { const s = [...data.steps]; s[i].step = v; updateByPath('steps', s); }}
                        isPreview={isPreview}
                        className="font-content text-base font-bold text-slate-800 tracking-tight"
                        placeholder="环节名称 (如: Greeting)"
                      />
                    </div>
                    {!isPreview && data.steps.length > 1 && (
                      <button 
                        onClick={() => removeStep(i)} 
                        className="no-print opacity-0 group-hover/step:opacity-100 text-red-300 hover:text-red-500 font-bold text-[8px] uppercase transition-opacity ml-4 pt-1"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                <div className={`border border-slate-200 overflow-hidden shadow-sm ${isPreview ? 'rounded-none border-slate-400' : 'rounded-xl'} print:border-slate-300 print:shadow-none`}>
                  <table className="w-full border-collapse">
                    <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                      {[
                        { label: '时长', field: 'duration', placeholder: '如: 3 mins', className: 'font-content text-indigo-500 font-bold text-base' },
                        { label: '环节设计', field: 'design', placeholder: '描述老师和小朋友的互动环节...', className: 'font-content text-base' },
                        { label: '课堂指令/用语', field: 'instructions', placeholder: 'Teacher\'s talk: ...', className: 'font-content text-slate-500 text-base' },
                        { label: '难点/注意点', field: 'notes', placeholder: '注意事项...', className: 'font-content text-red-400 text-base' },
                        { label: '板书设计', field: 'blackboard', placeholder: '板书内容...', className: 'font-content text-base' },
                      ].map((row) => (
                        <tr key={row.field} className="align-top print:align-middle">
                          <td className="p-3 w-[120px] bg-slate-50/50 border-r border-slate-100 font-zh font-bold text-xs text-slate-400 uppercase tracking-tighter pt-4 text-center print:p-1.5 print:w-[80px] print:text-[10px] print:pt-1.5">
                            {row.label}
                          </td>
                          <td className="p-3 print:p-1.5">
                            <AutoResizingTextarea 
                              value={(step as any)[row.field]} 
                              onChange={v => { const s = [...data.steps]; (s[i] as any)[row.field] = v; updateByPath('steps', s); }}
                              isPreview={isPreview}
                              className={`text-slate-800 leading-relaxed ${row.className || ''}`}
                              placeholder={row.placeholder}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {!isPreview && (
              <div className="no-print flex justify-end mt-12 pb-4">
                <button 
                  onClick={addStep} 
                  className="group/add flex items-center gap-3 bg-indigo-500 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-600 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <svg className="w-5 h-5 transition-transform group-hover/add:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/>
                  </svg>
                  ADD NEXT STEP
                </button>
              </div>
            )}
          </div>
        </section>

        {/* 05 Connection */}
        <section className="mb-10 relative z-10 print:mb-6">
          <SectionTitle num="05" title="教学内容衔接" onClear={() => updateByPath('connection', INITIAL_STATE.connection)} isPreview={isPreview} />
          <div className="space-y-0.5">
            <EditableLine label="课堂复习 / Review" value={data.connection.review} onChange={v => updateByPath('connection.review', v)} isPreview={isPreview} />
            <EditableLine label="内容预告 / Preview" value={data.connection.preview} onChange={v => updateByPath('connection.preview', v)} isPreview={isPreview} />
            <EditableLine label="家庭作业 / Homework" value={data.connection.homework} onChange={v => updateByPath('connection.homework', v)} isPreview={isPreview} />
            <EditableLine label="下次课课前准备 / Prep" value={data.connection.prep} onChange={v => updateByPath('connection.prep', v)} isPreview={isPreview} />
          </div>
        </section>

        {/* 06 Post-class Communication */}
        <section className="mb-10 relative z-10 print:mb-6">
          <SectionTitle num="06" title="课后沟通备忘录" onClear={() => updateByPath('feedback', INITIAL_STATE.feedback)} isPreview={isPreview} />
          <div className={`border border-slate-200 overflow-hidden shadow-sm ${isPreview ? 'rounded-none border-slate-400' : 'rounded-xl'} print:border-slate-300 print:shadow-none`}>
            <table className="w-full border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 print:bg-slate-100">
                <tr className="font-zh text-xs font-bold text-slate-400 uppercase print:text-[10px]">
                  <th className="p-2 w-[15%] text-center border-r border-slate-200">维度</th>
                  <th className="p-2 w-[55%] text-left border-r border-slate-200">反馈内容 / Feedback</th>
                  <th className="p-2 w-[15%] text-center border-r border-slate-200">时间</th>
                  <th className="p-2 w-[15%] text-center">后续计划</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-content">
                {[
                  { id: 'student', label: '学员反馈' },
                  { id: 'parent', label: '家长沟通' },
                  { id: 'partner', label: '搭档协作' },
                ].map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="p-2 text-center bg-slate-50/30 border-r border-slate-200 font-zh font-bold text-[11px] text-slate-500 pt-3 print:p-1 print:text-[10px]">{row.label}</td>
                    <td className="p-2 border-r border-slate-200 print:p-1">
                      <AutoResizingTextarea 
                        value={(data.feedback as any)[row.id].content} 
                        onChange={v => updateByPath(`feedback.${row.id}.content`, v)}
                        isPreview={isPreview}
                        className="text-base text-slate-800 print:text-sm"
                        placeholder="..."
                      />
                    </td>
                    <td className="p-2 border-r border-slate-200 print:p-1">
                      <AutoResizingTextarea 
                        value={(data.feedback as any)[row.id].time} 
                        onChange={v => updateByPath(`feedback.${row.id}.time`, v)}
                        isPreview={isPreview}
                        className="text-center text-[10px] text-slate-400 print:text-[9px]"
                        placeholder="Time"
                      />
                    </td>
                    <td className="p-2 print:p-1">
                      <AutoResizingTextarea 
                        value={(data.feedback as any)[row.id].plan} 
                        onChange={v => updateByPath(`feedback.${row.id}.plan`, v)}
                        isPreview={isPreview}
                        className="text-[10px] text-indigo-400 print:text-[9px]"
                        placeholder="Action plan"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-16 pt-6 border-t border-slate-100 text-center relative z-10 opacity-30 print:mt-8 print:pt-4">
          <p className="text-slate-400 font-content text-[8px] tracking-[0.3em] uppercase font-bold">JIANYINGLINGHANG Training & Development Department</p>
          <p className="text-slate-300 text-[7px] mt-1 font-zh tracking-widest">内部教研材料 · 严禁外传</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; padding: 0; }
          .paper { border: none !important; box-shadow: none !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 10mm !important; border-radius: 0 !important; transform: none !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          input, textarea { background: transparent !important; color: inherit !important; border: none !important; }
          @page { margin: 10mm; size: A4; }
          textarea::placeholder { color: transparent !important; }
          .page-break-inside-avoid { page-break-inside: avoid !important; }
        }
        textarea::-webkit-scrollbar { width: 0; height: 0; }
        .paper { min-height: 297mm; }
        textarea { white-space: pre-wrap; word-break: break-word; }
        tr { page-break-inside: avoid; }
      `}</style>
    </div>
  );
};

export default App;
