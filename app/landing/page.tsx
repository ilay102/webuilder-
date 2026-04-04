'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import TubesBackground from '@/components/ui/neon-flow';

/* ─── Tokens ─────────────────────────────────────────────── */
const NG = '#8eff71';
const NC = '#00eefc';
const NP = '#ff59e3';

/* ─── Fixed full-page neon canvas ───────────────────────── */
function NeonCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef  = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0, H = 0, raf = 0;

    interface Tube { color:string; pts:{x:number;y:number}[]; w:number; speed:number; opacity:number; offset:number }
    const COLORS = [NG,NC,NP,'#53fc84','#00d9ff','#ff2de0','#6fff50','#7efcff','#ff80f0'];

    function buildTubes(): Tube[] {
      return Array.from({length:9},(_,i)=>{
        const color = COLORS[i%COLORS.length];
        const startY = H*(0.02+(i/9)*0.96);
        const amp    = H*(0.05+Math.random()*0.13);
        const freq   = 0.4+Math.random()*1.3;
        const pts    = Array.from({length:50},(__,s)=>{
          const t=s/49;
          return { x:-W*0.15+t*W*1.3, y:startY+Math.sin(t*Math.PI*freq+i*0.9)*amp+Math.cos(t*Math.PI*1.5+i*0.6)*amp*0.4 };
        });
        return { color, pts, w:1+Math.random()*2, speed:0.003+Math.random()*0.004, opacity:0.4+Math.random()*0.45, offset:i*0.28 };
      });
    }

    let tubes:Tube[] = [];

    const resize = ()=>{
      W = window.innerWidth;
      H = Math.max(document.body.scrollHeight,window.innerHeight);
      canvas.width  = W*devicePixelRatio;
      canvas.height = H*devicePixelRatio;
      canvas.style.width  = W+'px';
      canvas.style.height = H+'px';
      ctx.scale(devicePixelRatio,devicePixelRatio);
      tubes = buildTubes();
    };
    resize();

    const onMouse=(e:MouseEvent)=>{ mouseRef.current={x:e.clientX, y:e.clientY+window.scrollY}; };
    window.addEventListener('mousemove',onMouse);
    window.addEventListener('resize',resize);

    // Throttle to ~30fps — smooth but not heavy
    let t=0, last=0;
    const FPS = 30, INTERVAL = 1000/FPS;

    const drawTube=(pts:{x:number;y:number}[], lw:number, alpha:number, color:string)=>{
      ctx.globalAlpha=alpha; ctx.strokeStyle=color; ctx.lineWidth=lw;
      ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y);
      for(let i=1;i<pts.length-1;i++){
        const mx2=(pts[i].x+pts[i+1].x)/2, my2=(pts[i].y+pts[i+1].y)/2;
        ctx.quadraticCurveTo(pts[i].x,pts[i].y,mx2,my2);
      }
      ctx.stroke();
    };

    const loop=(now:number)=>{
      raf=requestAnimationFrame(loop);
      if(now-last < INTERVAL) return;
      last=now; t++;
      ctx.clearRect(0,0,W,H);
      ctx.lineCap='round'; ctx.lineJoin='round';
      const mx=(mouseRef.current.x/W-0.5)*60;
      const my=(mouseRef.current.y/H-0.5)*40;
      for(const tube of tubes){
        const ph=t*tube.speed*30+tube.offset*8;
        const pts=tube.pts.map((p,i)=>{
          const f=i/tube.pts.length;
          return { x:p.x+Math.sin(ph+f*Math.PI*2.3)*14+mx*f*0.8, y:p.y+Math.cos(ph*0.7+f*Math.PI)*20+my*f*0.8 };
        });
        // Glow via layered strokes — no ctx.filter (avoids software renderer)
        drawTube(pts, tube.w*9,  tube.opacity*0.06, tube.color);
        drawTube(pts, tube.w*6,  tube.opacity*0.10, tube.color);
        drawTube(pts, tube.w*3,  tube.opacity*0.25, tube.color);
        drawTube(pts, tube.w*1.2,tube.opacity*0.75, tube.color);
        drawTube(pts, tube.w*0.5,tube.opacity,       '#ffffff');
      }
    };
    raf=requestAnimationFrame(loop);
    return ()=>{ cancelAnimationFrame(raf); window.removeEventListener('mousemove',onMouse); window.removeEventListener('resize',resize); };
  },[]);

  return <canvas ref={canvasRef} style={{position:'fixed',top:0,left:0,zIndex:0,pointerEvents:'none',transform:'translateZ(0)'}} />;
}

/* ─── Counter ────────────────────────────────────────────── */
function useCounter(target:number){
  const [val,setVal]=useState(0);
  const ref=useRef<any>(null);
  const inView=useInView(ref,{once:true});
  useEffect(()=>{
    if(!inView)return;
    let v=0; const step=target/(1600/16);
    const id=setInterval(()=>{ v+=step; if(v>=target){setVal(target);clearInterval(id);}else setVal(Math.floor(v)); },16);
    return()=>clearInterval(id);
  },[inView,target]);
  return{val,ref};
}

/* ─── Speedometer ────────────────────────────────────────── */
function Speedometer({pct}:{pct:number}){
  const r=48, cx=60, cy=64;
  const d = `M ${cx-r},${cy} A ${r},${r} 0 0,1 ${cx+r},${cy}`;
  return(
    <svg viewBox="0 0 120 76" className="w-44 h-24">
      <defs>
        <linearGradient id="gSpd" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ef4444"/>
          <stop offset="45%" stopColor="#f59e0b"/>
          <stop offset="100%" stopColor={NG}/>
        </linearGradient>
      </defs>
      {/* Track */}
      <path d={d} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="9" strokeLinecap="round"/>
      {/* Colored fill using pathLength 0→pct */}
      <motion.path d={d} fill="none" stroke="url(#gSpd)" strokeWidth="9" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: pct / 100 }}
        viewport={{ once: true }}
        transition={{ duration: 1.6, ease: 'easeOut' }}
      />
      {/* Glow dot at center base */}
      <circle cx={cx} cy={cy} r="5" fill={NG} style={{filter:`drop-shadow(0 0 6px ${NG})`}}/>
    </svg>
  );
}

/* ─── System Online ──────────────────────────────────────── */
function SystemOnline(){
  return(
    <div className="relative flex items-center justify-center w-28 h-28">
      {[0,1,2].map(i=>(
        <motion.div key={i} className="absolute rounded-full border"
          style={{width:112-i*22,height:112-i*22,borderColor:`${NC}${['22','44','77'][i]}`}}
          animate={{scale:[1,1.04,1],opacity:[0.5,1,0.5]}} transition={{duration:2+i*0.5,repeat:Infinity,delay:i*0.3}}/>
      ))}
      <div className="relative z-10 flex flex-col items-center justify-center w-14 h-14 rounded-full"
        style={{background:`${NC}18`,border:`1px solid ${NC}66`}}>
        <motion.div className="w-2 h-2 rounded-full mb-0.5" style={{background:NC,boxShadow:`0 0 8px ${NC}`}}
          animate={{opacity:[1,0.2,1]}} transition={{duration:1.2,repeat:Infinity}}/>
        <span className="text-[8px] font-bold tracking-wider" style={{color:NC,fontFamily:'Space Grotesk,monospace'}}>ONLINE</span>
      </div>
    </div>
  );
}

/* ─── Dot grid ───────────────────────────────────────────── */
const DOTS=[1,0,1,1,0,1,0,1,1,0,1,0, 0,1,1,0,1,0,1,0,1,1,0,1, 1,1,0,1,0,1,1,0,0,1,1,0, 0,1,0,1,1,1,0,1,0,1,0,1, 1,0,1,0,1,0,1,1,0,1,1,0];
function DotGrid(){
  return(
    <div className="grid gap-1.5" style={{gridTemplateColumns:'repeat(12,1fr)',width:140}}>
      {DOTS.map((bright,i)=>(
        <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{background:bright?NP:`${NP}33`}}
          initial={{opacity:0}} whileInView={{opacity:1}} viewport={{once:true}} transition={{delay:i*0.012,duration:0.3}}/>
      ))}
    </div>
  );
}

/* ─── Glass card (more transparent = neon shows through) ── */
function GCard({children,className='',glow=NG}:{children:React.ReactNode;className?:string;glow?:string}){
  return(
    <motion.div whileHover={{scale:1.02}} transition={{duration:0.2}}
      className={`relative group rounded-xl overflow-hidden ${className}`}
      style={{background:'rgba(6,6,6,0.62)',backdropFilter:'blur(18px)',WebkitBackdropFilter:'blur(18px)',border:'1px solid rgba(255,255,255,0.09)'}}>
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{boxShadow:`inset 0 0 0 1px ${glow}66, 0 0 50px ${glow}22`}}/>
      {children}
    </motion.div>
  );
}

/* ─── Service icon — large, centered, glowing ────────────── */
function ServiceIcon({children,color}:{children:React.ReactNode;color:string}){
  return(
    <div className="relative flex items-center justify-center w-24 h-24 mx-auto">
      {/* radial glow behind icon */}
      <div className="absolute inset-0 rounded-full" style={{background:`radial-gradient(circle, ${color}30 0%, transparent 72%)`}}/>
      {children}
    </div>
  );
}

/* ─── Service card icons (large, matching reference) ─────── */
function IconWebDev(){return(
  <svg viewBox="0 0 80 80" className="w-20 h-20">
    <defs>
      <linearGradient id="wdG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={NG}/><stop offset="100%" stopColor={NC}/>
      </linearGradient>
    </defs>
    {/* < bracket */}
    <polyline points="28,20 12,40 28,60" fill="none" stroke="url(#wdG)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
    {/* > bracket */}
    <polyline points="52,20 68,40 52,60" fill="none" stroke="url(#wdG)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
    {/* / slash */}
    <line x1="46" y1="18" x2="34" y2="62" stroke={NP} strokeWidth="4" strokeLinecap="round" opacity="0.9"/>
  </svg>
);}

function IconAI(){return(
  <svg viewBox="0 0 80 80" className="w-20 h-20">
    <defs>
      <linearGradient id="aiG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={NG}/><stop offset="100%" stopColor={NC}/>
      </linearGradient>
    </defs>
    {/* outer nodes */}
    {([[40,10],[70,28],[62,65],[18,65],[10,28]] as [number,number][]).map(([x,y],i)=>(
      <circle key={i} cx={x} cy={y} r={i===0?7:6} fill="none" stroke="url(#aiG)" strokeWidth="2"/>
    ))}
    {/* inner small nodes */}
    {([[55,38],[40,52],[25,38],[32,22],[52,22]] as [number,number][]).map(([x,y],i)=>(
      <circle key={i} cx={x} cy={y} r="4" fill="none" stroke={NP} strokeWidth="1.5" opacity="0.7"/>
    ))}
    {/* connections outer→inner */}
    {([[40,10,55,38],[70,28,55,38],[70,28,52,22],[40,10,52,22],[40,10,32,22],[10,28,32,22],[10,28,25,38],[18,65,25,38],[18,65,40,52],[62,65,40,52],[62,65,55,38]] as [number,number,number,number][]).map(([x1,y1,x2,y2],i)=>(
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={NG} strokeWidth="1" opacity="0.35"/>
    ))}
    {/* center */}
    <circle cx="40" cy="40" r="5" fill={NG} opacity="0.9"/>
    <circle cx="40" cy="40" r="9" fill="none" stroke={NG} strokeWidth="1" opacity="0.3"/>
  </svg>
);}

function IconChat(){return(
  <svg viewBox="0 0 80 80" className="w-20 h-20">
    <defs>
      <linearGradient id="cbG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={NC}/><stop offset="100%" stopColor={NP}/>
      </linearGradient>
    </defs>
    {/* speech bubble */}
    <path d="M10,8 H70 A6,6 0 0,1 76,14 V52 A6,6 0 0,1 70,58 H44 L32,72 L32,58 H10 A6,6 0 0,1 4,52 V14 A6,6 0 0,1 10,8 Z"
      fill="none" stroke="url(#cbG)" strokeWidth="3"/>
    {/* camera lens ring */}
    <circle cx="40" cy="33" r="14" fill="none" stroke="url(#cbG)" strokeWidth="2.5"/>
    <circle cx="40" cy="33" r="8" fill="none" stroke={NP} strokeWidth="2" opacity="0.8"/>
    <circle cx="40" cy="33" r="3.5" fill={NP} opacity="0.9"/>
    {/* lens glint */}
    <circle cx="44" cy="29" r="2" fill="white" opacity="0.3"/>
  </svg>
);}

/* ─── Method step icons (large technical illustrations) ───── */
function IconConsultation(){return(
  <svg viewBox="0 0 72 72" className="w-16 h-16">
    {/* Central hub */}
    <circle cx="36" cy="36" r="8" fill="none" stroke={NC} strokeWidth="2"/>
    <circle cx="36" cy="36" r="3" fill={NC} opacity="0.8"/>
    {/* Satellite nodes */}
    {([[36,12],[58,24],[58,48],[36,60],[14,48],[14,24]] as [number,number][]).map(([x,y],i)=>(
      <g key={i}>
        <line x1="36" y1="36" x2={x} y2={y} stroke={NC} strokeWidth="1.2" opacity="0.35"/>
        <circle cx={x} cy={y} r="5" fill="none" stroke={NC} strokeWidth="1.8" opacity="0.7"/>
        <circle cx={x} cy={y} r="2" fill={NC} opacity="0.5"/>
      </g>
    ))}
    {/* Outer ring */}
    <circle cx="36" cy="36" r="22" fill="none" stroke={NC} strokeWidth="0.8" opacity="0.2" strokeDasharray="4 3"/>
  </svg>
);}
function IconArchitecture(){return(
  <svg viewBox="0 0 72 72" className="w-16 h-16">
    {/* Blueprint grid lines */}
    <line x1="8" y1="20" x2="64" y2="20" stroke={NG} strokeWidth="0.8" opacity="0.2"/>
    <line x1="8" y1="36" x2="64" y2="36" stroke={NG} strokeWidth="0.8" opacity="0.2"/>
    <line x1="8" y1="52" x2="64" y2="52" stroke={NG} strokeWidth="0.8" opacity="0.2"/>
    <line x1="20" y1="8" x2="20" y2="64" stroke={NG} strokeWidth="0.8" opacity="0.2"/>
    <line x1="36" y1="8" x2="36" y2="64" stroke={NG} strokeWidth="0.8" opacity="0.2"/>
    <line x1="52" y1="8" x2="52" y2="64" stroke={NG} strokeWidth="0.8" opacity="0.2"/>
    {/* Nodes */}
    <rect x="14" y="14" width="12" height="12" rx="2" fill="none" stroke={NG} strokeWidth="2" opacity="0.8"/>
    <rect x="30" y="30" width="12" height="12" rx="2" fill="none" stroke={NG} strokeWidth="2" opacity="0.9"/>
    <rect x="46" y="46" width="12" height="12" rx="2" fill="none" stroke={NG} strokeWidth="2" opacity="0.8"/>
    <rect x="46" y="14" width="12" height="12" rx="2" fill="none" stroke={NC} strokeWidth="2" opacity="0.7"/>
    {/* Connectors */}
    <line x1="26" y1="20" x2="30" y2="30" stroke={NG} strokeWidth="1.5" opacity="0.5"/>
    <line x1="42" y1="36" x2="46" y2="46" stroke={NG} strokeWidth="1.5" opacity="0.5"/>
    <line x1="52" y1="26" x2="36" y2="36" stroke={NC} strokeWidth="1.2" opacity="0.4"/>
    {/* Center dot */}
    <circle cx="36" cy="36" r="2.5" fill={NG}/>
  </svg>
);}
function IconImplementation(){return(
  <svg viewBox="0 0 72 72" className="w-16 h-16">
    {/* Screen */}
    <rect x="4" y="8" width="42" height="32" rx="3" fill="none" stroke={NP} strokeWidth="2" opacity="0.7"/>
    <line x1="4" y1="16" x2="46" y2="16" stroke={NP} strokeWidth="1" opacity="0.3"/>
    {/* Code lines */}
    <line x1="10" y1="22" x2="28" y2="22" stroke={NG} strokeWidth="2" strokeLinecap="round"/>
    <line x1="10" y1="27" x2="22" y2="27" stroke={NC} strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
    <line x1="10" y1="32" x2="32" y2="32" stroke={NP} strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
    <line x1="10" y1="37" x2="18" y2="37" stroke={NG} strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
    {/* Database cylinder */}
    <ellipse cx="56" cy="46" rx="11" ry="5" fill="none" stroke={NC} strokeWidth="2" opacity="0.8"/>
    <rect x="45" y="46" width="22" height="16" fill="none"/>
    <line x1="45" y1="46" x2="45" y2="58" stroke={NC} strokeWidth="2" opacity="0.7"/>
    <line x1="67" y1="46" x2="67" y2="58" stroke={NC} strokeWidth="2" opacity="0.7"/>
    <ellipse cx="56" cy="58" rx="11" ry="5" fill="none" stroke={NC} strokeWidth="2" opacity="0.8"/>
    <ellipse cx="56" cy="52" rx="11" ry="5" fill="none" stroke={NC} strokeWidth="1" opacity="0.3"/>
    {/* Gear/cog */}
    <circle cx="30" cy="54" r="8" fill="none" stroke={NP} strokeWidth="2" opacity="0.8"/>
    <circle cx="30" cy="54" r="3" fill={NP} opacity="0.6"/>
    {[0,45,90,135,180,225,270,315].map((a,i)=>(
      <line key={i} x1={30+8*Math.cos(a*Math.PI/180)} y1={54+8*Math.sin(a*Math.PI/180)}
        x2={30+11*Math.cos(a*Math.PI/180)} y2={54+11*Math.sin(a*Math.PI/180)}
        stroke={NP} strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
    ))}
  </svg>
);}
function IconOptimization(){return(
  <svg viewBox="0 0 72 72" className="w-16 h-16">
    {/* Circular arrow */}
    <path d="M36,12 A24,24 0 1,1 12,36" fill="none" stroke={NG} strokeWidth="2.5" strokeLinecap="round" opacity="0.85"/>
    <path d="M36,12 A24,24 0 0,0 12,36" fill="none" stroke={NC} strokeWidth="2.5" strokeLinecap="round" opacity="0.6"/>
    {/* Arrow head */}
    <polyline points="28,6 36,12 30,20" fill="none" stroke={NG} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    {/* Inner nodes on circle */}
    {([[36,12],[60,36],[36,60],[12,36]] as [number,number][]).map(([x,y],i)=>(
      <circle key={i} cx={x} cy={y} r="4" fill="none" stroke={i%2===0?NG:NC} strokeWidth="2" opacity="0.8"/>
    ))}
    {/* Center cross-lines */}
    <line x1="36" y1="24" x2="36" y2="48" stroke={NG} strokeWidth="1" opacity="0.3"/>
    <line x1="24" y1="36" x2="48" y2="36" stroke={NG} strokeWidth="1" opacity="0.3"/>
    <circle cx="36" cy="36" r="5" fill="none" stroke={NG} strokeWidth="1.5" opacity="0.6"/>
    <circle cx="36" cy="36" r="2" fill={NG}/>
  </svg>
);}

/* ═══════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════ */
export default function LandingPage(){
  const s85=useCounter(85);
  const s24=useCounter(24);
  const s1 =useCounter(1);

  useEffect(()=>{
    document.body.style.cssText='height:auto!important;overflow:auto!important;';
    document.documentElement.style.cssText='height:auto!important;';
    return()=>{ document.body.style.cssText=''; document.documentElement.style.cssText=''; };
  },[]);

  return(
    <div className="min-h-screen text-white" style={{fontFamily:'Inter,sans-serif',background:'#000'}}>

      {/* Fixed neon canvas — behind everything except hero */}
      <NeonCanvas/>

      <div style={{position:'relative',zIndex:1}}>

        {/* ── NAV ───────────────────────────────────── */}
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 md:px-20 py-5"
          style={{background:'rgba(0,0,0,0.45)',backdropFilter:'blur(20px)'}}>
          <span className="text-sm font-black tracking-[0.25em] uppercase" style={{color:NG,fontFamily:'Space Grotesk,monospace'}}>ILAY</span>
          <nav className="hidden md:flex gap-8 text-[12px] text-white/50 tracking-widest uppercase" style={{fontFamily:'Space Grotesk,monospace'}}>
            {['Process','Services','Results','About'].map(l=>(
              <a key={l} href="#" className="hover:text-white transition-colors">{l}</a>
            ))}
          </nav>
          <div className="w-2 h-2 rounded-full" style={{background:NG,boxShadow:`0 0 10px ${NG}`}}/>
        </header>

        {/* ── HERO — CDN Three.js tubes cursor effect ── */}
        <TubesBackground className="min-h-screen flex items-center justify-center" enableClickInteraction>
          <div className="flex flex-col items-center justify-center min-h-screen text-center px-6 pt-24 pb-20 pointer-events-auto">
            <motion.h1
              initial={{opacity:0,y:50}} animate={{opacity:1,y:0}}
              transition={{duration:1.1,ease:[0.22,1,0.36,1]}}
              className="text-[clamp(4rem,10vw,9rem)] font-black leading-[0.9] tracking-[-0.02em]"
              style={{fontFamily:'Georgia,"Times New Roman",serif',textShadow:'0 2px 80px rgba(0,0,0,0.7)'}}>
              Ilay Automation
            </motion.h1>
            <motion.p initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
              transition={{duration:0.8,delay:0.25}}
              className="mt-6 text-2xl md:text-3xl text-white/70 font-light tracking-wide">
              Your Automation Starts Here
            </motion.p>
          </div>
        </TubesBackground>

        {/* ── SERVICES ──────────────────────────────── */}
        <section className="py-24 px-6 md:px-16 max-w-6xl mx-auto">
          <motion.div initial={{opacity:0,y:30}} whileInView={{opacity:1,y:0}}
            viewport={{once:true}} transition={{duration:0.7}} className="text-center mb-16">
            <h2 className="text-[clamp(1.5rem,3vw,2.6rem)] font-black tracking-[-0.02em] uppercase">
              Architecting the{' '}
              <span style={{color:NG,fontStyle:'italic'}}>Intelligent</span> Web
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {icon:<IconWebDev/>, label:'WEB DEV',       title:'HIGH-SPEED WEB ARCHITECTURE.', meta:'PATHGEN: 31:09', color:NC},
              {icon:<IconAI/>,     label:'AI AUTOMATION', title:'SEAMLESS AI WORKFLOWS.',        meta:'PATHGEN: 54:00', color:NG},
              {icon:<IconChat/>,   label:'CHATBOTS',      title:'CONVERSATIONAL AGENTS.',        meta:'PATHGEN: 11:03', color:NP},
            ].map((s,i)=>(
              <motion.div key={s.label} initial={{opacity:0,y:40}} whileInView={{opacity:1,y:0}}
                viewport={{once:true}} transition={{duration:0.6,delay:i*0.1}}>
                <GCard glow={s.color} className="p-7 flex flex-col items-center text-center gap-5 h-full">
                  <ServiceIcon color={s.color}>{s.icon}</ServiceIcon>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-wide mb-2">{s.label}</h3>
                    <p className="text-xs text-white/50 leading-relaxed uppercase tracking-wider" style={{fontFamily:'Space Grotesk,monospace'}}>{s.title}</p>
                  </div>
                </GCard>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{opacity:0}} whileInView={{opacity:1}} viewport={{once:true}} className="text-center mt-8">
            <span className="text-[11px] tracking-[0.2em] text-white/25 uppercase" style={{fontFamily:'Space Grotesk,monospace'}}>
              EXPLORE OUR ECOSYSTEM ▸
            </span>
          </motion.div>
        </section>

        {/* ── METHOD ────────────────────────────────── */}
        <section className="py-24 px-6 md:px-16" style={{background:'rgba(4,4,4,0.65)',backdropFilter:'blur(10px)'}}>
          <div className="max-w-6xl mx-auto">
            <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} className="mb-12">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-black tracking-[-0.02em]">
                    THE KINETIC <span style={{color:NP,fontStyle:'italic'}}>METHOD</span>
                  </h2>
                  <p className="text-xs text-white/30 mt-1" style={{fontFamily:'Space Grotesk,monospace'}}>A precision sequence from concept to optimization.</p>
                </div>
                <span className="text-[clamp(2.5rem,5vw,4.5rem)] font-black text-white/[0.04] leading-none select-none hidden md:block"
                  style={{fontFamily:'Space Grotesk,monospace'}}>01—04</span>
              </div>
            </motion.div>

            <div className="relative">
              {/* Connecting neon line */}
              <div className="absolute top-14 left-0 right-0 h-0.5 hidden md:block" style={{zIndex:0}}>
                <motion.div className="h-full" style={{background:`linear-gradient(90deg,${NC},${NG},${NP},${NG})`}}
                  initial={{scaleX:0,originX:0}} whileInView={{scaleX:1}}
                  viewport={{once:true}} transition={{duration:1.3,ease:'easeOut'}}/>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
                {[
                  {num:'STEP 01',label:'CONSULTATION',  icon:<IconConsultation/>,   color:NC, desc:'Deep analysis of existing operational logic and data architecture.'},
                  {num:'STEP 02',label:'ARCHITECTURE',  icon:<IconArchitecture/>,   color:NG, desc:'Mapping out system pathways and logic flows for seamless integration.'},
                  {num:'STEP 03',label:'IMPLEMENTATION',icon:<IconImplementation/>, color:NP, desc:'Executing code deployment within our high-performance glass-tier environment.'},
                  {num:'STEP 04',label:'OPTIMIZATION',  icon:<IconOptimization/>,   color:NG, desc:'Continuous refinement through real-time scanning feedback loops.'},
                ].map((step,i)=>(
                  <motion.div key={step.num} initial={{opacity:0,y:30}} whileInView={{opacity:1,y:0}}
                    viewport={{once:true}} transition={{duration:0.55,delay:i*0.12}}>
                    <GCard glow={step.color} className="p-5 flex flex-col">
                      {/* Large icon at top */}
                      <div className="flex justify-center items-center mb-4 py-2"
                        style={{background:`${step.color}0d`,borderRadius:'10px'}}>
                        {step.icon}
                      </div>
                      <span className="text-[10px] tracking-widest text-white/25 mb-1" style={{fontFamily:'Space Grotesk,monospace'}}>{step.num}</span>
                      <p className="text-sm font-black uppercase tracking-wide mb-2" style={{color:step.color}}>{step.label}</p>
                      <p className="text-xs text-white/45 leading-relaxed">{step.desc}</p>
                    </GCard>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS ─────────────────────────────────── */}
        <section className="py-24 px-6 md:px-16">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              <motion.div initial={{opacity:0,y:30}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.6}}>
                <GCard glow={NG} className="p-8">
                  <div className="flex items-end gap-1 mb-2">
                    <span ref={s85.ref} className="text-[4.5rem] font-black leading-none tracking-tighter" style={{color:NG}}>{s85.val}</span>
                    <span className="text-2xl font-black mb-2" style={{color:NG}}>%</span>
                  </div>
                  <p className="text-[10px] tracking-[0.2em] text-white/35 uppercase mb-5" style={{fontFamily:'Space Grotesk,monospace'}}>EFFICIENCY INCREASE</p>
                  <div className="flex justify-center"><Speedometer pct={85}/></div>
                </GCard>
              </motion.div>

              <motion.div initial={{opacity:0,y:30}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.6,delay:0.1}}>
                <GCard glow={NC} className="p-8">
                  <div className="flex items-end gap-1 mb-2">
                    <span ref={s24.ref} className="text-[4.5rem] font-black leading-none tracking-tighter" style={{color:NC}}>{s24.val}</span>
                    <span className="text-2xl font-black mb-2" style={{color:NC}}>/7</span>
                  </div>
                  <p className="text-[10px] tracking-[0.2em] text-white/35 uppercase mb-5" style={{fontFamily:'Space Grotesk,monospace'}}>ACTIVE AUTOMATION</p>
                  <div className="flex flex-col items-center gap-3">
                    <SystemOnline/>
                    <span className="text-[9px] tracking-[0.25em] text-white/25 uppercase" style={{fontFamily:'Space Grotesk,monospace'}}>SYSTEM ONLINE</span>
                  </div>
                </GCard>
              </motion.div>

              <motion.div initial={{opacity:0,y:30}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.6,delay:0.2}}>
                <GCard glow={NP} className="p-8">
                  <div className="flex items-end gap-1 mb-2">
                    <span ref={s1.ref} className="text-[4.5rem] font-black leading-none tracking-tighter" style={{color:NP}}>{s1.val}</span>
                    <span className="text-2xl font-black mb-2" style={{color:NP}}>M+</span>
                  </div>
                  <p className="text-[10px] tracking-[0.2em] text-white/35 uppercase mb-5" style={{fontFamily:'Space Grotesk,monospace'}}>REQUESTS HANDLED</p>
                  <div className="flex justify-center"><DotGrid/></div>
                </GCard>
              </motion.div>
            </div>
            <motion.p initial={{opacity:0}} whileInView={{opacity:1}} viewport={{once:true}}
              className="text-center mt-8 text-[10px] tracking-[0.25em] text-white/20 uppercase"
              style={{fontFamily:'Space Grotesk,monospace'}}>TRUSTED BY GLOBAL ARCHITECTS</motion.p>
          </div>
        </section>

        {/* ── CTA — unchanged ───────────────────────── */}
        <section className="min-h-[65vh] flex flex-col items-center justify-center text-center px-6 py-20">
          <motion.div initial={{opacity:0,y:40}} whileInView={{opacity:1,y:0}}
            viewport={{once:true}} transition={{duration:0.9,ease:[0.22,1,0.36,1]}}>
            <h2 className="text-[clamp(3.5rem,10vw,8rem)] font-black leading-[0.9] tracking-[-0.03em] uppercase"
              style={{textShadow:'0 0 100px rgba(0,0,0,0.8)'}}>
              READY TO<br/>
              <span style={{color:NG,fontStyle:'italic'}}>AUTOMATE?</span>
            </h2>
            <p className="mt-6 text-white/40 max-w-sm mx-auto leading-relaxed uppercase tracking-widest"
              style={{fontFamily:'Space Grotesk,monospace',fontSize:'0.65rem'}}>
              SECURE YOUR POSITION IN THE INTELLIGENT WEB. LET'S<br/>
              BUILD THE FUTURE OF YOUR OPERATIONS TODAY.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="mailto:hello@ilayautomation.com"
                className="px-8 py-3.5 font-bold rounded-md tracking-widest uppercase transition-all hover:brightness-110 hover:scale-105"
                style={{background:`linear-gradient(45deg,${NG},#2ff801)`,color:'#064200',
                  fontFamily:'Space Grotesk,monospace',fontSize:'0.7rem',boxShadow:`0 0 30px ${NG}55`}}>
                LAUNCH YOUR SYSTEM
              </a>
              <a href="#" className="px-8 py-3.5 font-bold rounded-md tracking-widest uppercase text-white/60 hover:text-white transition-all"
                style={{border:'1px solid rgba(255,255,255,0.2)',fontFamily:'Space Grotesk,monospace',fontSize:'0.7rem'}}>
                VIEW DOCS
              </a>
            </div>
          </motion.div>
        </section>

        {/* ── FOOTER ────────────────────────────────── */}
        <footer className="flex items-center justify-between px-10 md:px-20 py-8"
          style={{background:'rgba(0,0,0,0.6)',backdropFilter:'blur(20px)',borderTop:'1px solid rgba(255,255,255,0.04)'}}>
          <span className="text-sm font-black tracking-[0.25em] uppercase" style={{color:NG,fontFamily:'Space Grotesk,monospace'}}>ILAY</span>
          <nav className="hidden md:flex gap-6 text-[11px] text-white/25 tracking-[0.15em] uppercase" style={{fontFamily:'Space Grotesk,monospace'}}>
            {['Process','Services','Results','About'].map(l=>(
              <a key={l} href="#" className="hover:text-white/60 transition-colors">{l}</a>
            ))}
          </nav>
          <svg viewBox="0 0 24 24" className="w-6 h-6">
            <polygon points="12,2 14,10 22,12 14,14 12,22 10,14 2,12 10,10" fill="rgba(255,255,255,0.15)"/>
          </svg>
        </footer>

      </div>
    </div>
  );
}
