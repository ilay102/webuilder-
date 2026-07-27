'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import TubesBackground from '@/components/ui/neon-flow';

/* ─── Tokens ─────────────────────────────────────────────── */
const NG = '#8eff71';
const NC = '#00eefc';
const NP = '#ff59e3';

/* ─── Lightweight Ambient GPU Background ───────────────── */
function AmbientBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" style={{ transform: 'translateZ(0)' }}>
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-25 blur-[100px]"
        style={{ background: 'radial-gradient(circle, #8eff71 0%, #00eefc 40%, transparent 75%)' }} />
    </div>
  );
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

/* ─── High Performance Card ── */
function GCard({children,className='',glow=NG}:{children:React.ReactNode;className?:string;glow?:string}){
  return(
    <motion.div whileHover={{scale:1.015}} transition={{duration:0.2}}
      className={`relative group rounded-xl overflow-hidden ${className}`}
      style={{background:'rgba(12,12,12,0.85)',border:'1px solid rgba(255,255,255,0.08)',transform:'translateZ(0)',willChange:'transform'}}>
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{boxShadow:`inset 0 0 0 1px ${glow}44, 0 0 30px ${glow}15`}}/>
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

      {/* Lightweight GPU Ambient Background */}
      <AmbientBackground/>

      <div style={{position:'relative',zIndex:1}}>

        {/* ── NAV ───────────────────────────────────── */}
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 md:px-20 py-5"
          style={{background:'rgba(0,0,0,0.85)',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <span className="text-sm font-black tracking-[0.25em] uppercase" style={{color:NG,fontFamily:'Space Grotesk,monospace'}}>ILAY</span>
          <nav className="hidden md:flex gap-8 text-[12px] text-white/50 tracking-widest uppercase" style={{fontFamily:'Space Grotesk,monospace'}}>
            {[
              { label: 'Process', href: '#process' },
              { label: 'Services', href: '#services' },
              { label: 'Results', href: '#results' },
              { label: 'About', href: '#contact' },
            ].map(item => (
              <a key={item.label} href={item.href} className="hover:text-white transition-colors">{item.label}</a>
            ))}
          </nav>
          <div className="w-2 h-2 rounded-full" style={{background:NG,boxShadow:`0 0 10px ${NG}`}}/>
        </header>

        {/* ── TOP HERO HEADER WITH NEON TUBES EFFECT ────────── */}
        <TubesBackground className="py-24 flex items-center justify-center relative overflow-hidden" enableClickInteraction>
          <div className="flex flex-col items-center justify-center text-center px-6 pt-16 pb-12 pointer-events-auto max-w-5xl mx-auto">
            {/* 1. Animated Title & Subtitle */}
            <motion.h1
              initial={{opacity:0,y:50}} animate={{opacity:1,y:0}}
              transition={{duration:1.1,ease:[0.22,1,0.36,1]}}
              className="text-[clamp(3.8rem,9.5vw,8.5rem)] font-black leading-[0.95] tracking-[-0.02em] mb-4"
              style={{fontFamily:'Georgia,"Times New Roman",serif',textShadow:'0 2px 80px rgba(0,0,0,0.7)'}}>
              Ilay Automation
            </motion.h1>
            <motion.p initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
              transition={{duration:0.8,delay:0.25}}
              className="text-xl md:text-3xl text-white/70 font-light tracking-wide mb-6">
              Your Automation Starts Here
            </motion.p>

            {/* Glow Line */}
            <motion.div initial={{scaleX:0}} animate={{scaleX:1}} transition={{duration:1,delay:0.4}}
              className="w-48 h-1 rounded-full"
              style={{background:`linear-gradient(90deg, transparent, ${NG}, ${NC}, transparent)`}}/>
          </div>
        </TubesBackground>

        {/* ── AI SMART SECRETARY SECTION ────────── */}
        <section className="py-16 px-6 max-w-5xl mx-auto text-center" dir="rtl">
          {/* Badge */}
          <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.6}}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-6"
            style={{background:'rgba(142,255,113,0.08)',border:'1px solid rgba(142,255,113,0.3)',backdropFilter:'blur(10px)'}}>
            <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{background:NG,boxShadow:`0 0 10px ${NG}`}}/>
            <span className="text-sm font-bold tracking-wide" style={{color:NG,fontFamily:'Inter,sans-serif'}}>
              מזכירת AI חכמה בוואטסאפ לעסקים
            </span>
          </motion.div>

          {/* Main Hook (Heading) */}
          <motion.h2
            initial={{opacity:0,y:40}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
            transition={{duration:0.9,ease:[0.22,1,0.36,1]}}
            className="text-[clamp(2.3rem,6vw,5rem)] font-black leading-[1.15] tracking-tight mb-6"
            style={{fontFamily:'Inter,"Rubik","Heebo",sans-serif',textShadow:'0 2px 80px rgba(0,0,0,0.8)'}}>
            אפס התעסקות בטלפון.{' '}
            <span style={{background:`linear-gradient(135deg, ${NG} 0%, ${NC} 100%)`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
              100% שקט נפשי
            </span>{' '}
            בעסק ובבית.
          </motion.h2>

          {/* Sub-heading */}
          <motion.p initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
            transition={{duration:0.8,delay:0.2}}
            className="text-lg md:text-2xl text-white/80 font-normal leading-relaxed max-w-3xl mx-auto mb-12">
            המזכירה החכמה שלנו בוואטסאפ עונה ללקוחות, מספקת מידע וסוגרת תורים ביומן 24/7 – בלי שתצטרך לגעת בטלפון באמצע טיפול, עבודה או בזמן הפרטי שלך.
          </motion.p>

          {/* Key Benefits Cards Grid */}
          <motion.div initial={{opacity:0,y:30}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
            transition={{duration:0.8,delay:0.3}}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-4xl mx-auto mb-16 text-right">
            {[
              { icon: '🛑', title: 'אפס הודעות בערבים ובסופ"ש', desc: 'המזכירה מטפלת בפניות וסוגרת הכל לבד.', color: NP },
              { icon: '⚡', title: 'מענה חם, אנושי ורגיש', desc: 'שומר על היחס האישי ולא נשמע כמו בוט יבש.', color: NC },
              { icon: '📅', title: 'סנכרון מלא ליומן', desc: 'התורים נרשמים ומעודכנים אוטומטית.', color: NG },
              { icon: '☕', title: 'שקט נפשי בהפסקות', desc: 'קמים בבוקר ורואים יומן מלא בלי להתעסק בנייד.', color: NC },
            ].map((item, idx) => (
              <div key={idx} className="p-6 rounded-2xl flex items-start gap-4 transition-all duration-300 hover:border-white/20"
                style={{background:'rgba(12,12,12,0.65)',backdropFilter:'blur(16px)',border:`1px solid ${item.color}33`}}>
                <span className="text-3xl p-3 rounded-xl shrink-0" style={{background:`${item.color}15`,border:`1px solid ${item.color}30`}}>
                  {item.icon}
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1" style={{fontFamily:'Inter,"Rubik",sans-serif'}}>{item.title}</h3>
                  <p className="text-sm text-white/60 leading-normal">{item.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* PROMINENT / WAY BIGGER CONTACT DETAILS */}
          <motion.div initial={{opacity:0,scale:0.95}} whileInView={{opacity:1,scale:1}} viewport={{once:true}} transition={{duration:0.8}}
            className="flex flex-col items-center justify-center gap-6 w-full max-w-3xl mx-auto p-8 rounded-3xl"
            style={{background:'rgba(10,10,10,0.85)',border:'1px solid rgba(255,255,255,0.12)',backdropFilter:'blur(20px)',boxShadow:`0 0 50px ${NG}15`}}>
            
            <span className="text-xs font-bold tracking-[0.25em] text-white/40 uppercase" style={{fontFamily:'Space Grotesk,monospace'}}>
              יצירת קשר ישיר
            </span>

            {/* BIG WHATSAPP BUTTON */}
            <a href="https://wa.me/972534638880?text=%D7%97%D7%99%D7%99%20%D7%90%D7%99%D7%9C%D7%90%D7%99,%20%D7%90%D7%A0%D7%99%20%D7%A8%D7%95%D7%A6%D7%94%20%D7%9C%D7%A9%D7%9E%D7%95%D7%A2%20%D7%A2%D7%9C%20%D7%94%D7%9E%D7%96%D7%9B%D7%99%D7%A8%D7%94%20%D7%94%D7%97%D7%9B%D7%9E%D7%94"
              target="_blank" rel="noopener noreferrer"
              className="w-full py-5 px-8 rounded-2xl flex items-center justify-center gap-4 transition-all duration-300 hover:scale-105 shadow-xl"
              style={{background:`linear-gradient(135deg, ${NG} 0%, #29f000 100%)`,color:'#043000',boxShadow:`0 0 40px ${NG}55`}}>
              <span className="text-3xl">💬</span>
              <div className="flex flex-col items-start text-right">
                <span className="text-xs font-extrabold uppercase tracking-wider opacity-80" style={{fontFamily:'Inter,sans-serif'}}>שלחו הודעה בוואטסאפ</span>
                <span className="text-2xl md:text-3xl font-black tracking-wider" style={{fontFamily:'Space Grotesk,Inter,monospace'}}>053-4638880</span>
              </div>
            </a>

            {/* BIG GMAIL BUTTON */}
            <a href="mailto:ilay10lankin@gmail.com"
              className="w-full py-4 px-8 rounded-2xl flex items-center justify-center gap-4 transition-all duration-300 hover:bg-white/10 hover:border-cyan-400/50"
              style={{background:'rgba(255,255,255,0.05)',border:`1px solid ${NC}55`}}>
              <span className="text-2xl">✉️</span>
              <div className="flex flex-col items-start text-right">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-white/50" style={{fontFamily:'Inter,sans-serif'}}>שלחו אימייל ישיר</span>
                <span className="text-lg md:text-xl font-bold tracking-wide text-white" style={{fontFamily:'Space Grotesk,monospace'}}>ilay10lankin@gmail.com</span>
              </div>
            </a>

          </motion.div>
        </section>

        {/* ── SERVICES ──────────────────────────────── */}
        <section id="services" className="py-24 px-6 md:px-16 max-w-6xl mx-auto">
          <motion.div initial={{opacity:0,y:30}} whileInView={{opacity:1,y:0}}
            viewport={{once:true}} transition={{duration:0.7}} className="text-center mb-16">
            <h2 className="text-[clamp(1.5rem,3vw,2.6rem)] font-black tracking-[-0.02em] uppercase">
              Architecting the{' '}
              <span style={{color:NG,fontStyle:'italic'}}>Intelligent</span> Web
            </h2>
            {/* Added Hebrew Subtitle */}
            <p className="mt-4 text-xl md:text-2xl font-bold text-white/90" dir="rtl" style={{fontFamily:'Inter,"Rubik",sans-serif'}}>
              בניית אתרים חכמים וחדשניים עם ניהול יומן וצאטבוט.
            </p>
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
        <section id="process" className="py-24 px-6 md:px-16" style={{background:'rgba(4,4,4,0.65)',backdropFilter:'blur(10px)'}}>
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
        <section id="results" className="py-24 px-6 md:px-16">
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

        {/* ── CTA — CONTACT ───────────────────────── */}
        <section id="contact" className="min-h-[65vh] flex flex-col items-center justify-center text-center px-6 py-20">
          <motion.div initial={{opacity:0,y:40}} whileInView={{opacity:1,y:0}}
            viewport={{once:true}} transition={{duration:0.9,ease:[0.22,1,0.36,1]}}>
            <h2 className="text-[clamp(3rem,8vw,7rem)] font-black leading-[0.9] tracking-[-0.03em] uppercase"
              style={{textShadow:'0 0 100px rgba(0,0,0,0.8)'}}>
              מוכנים לקבל<br/>
              <span style={{color:NG,fontStyle:'italic'}}>שקט נפשי?</span>
            </h2>
            <p className="mt-6 text-white/60 max-w-md mx-auto leading-relaxed text-sm"
              style={{fontFamily:'Inter,sans-serif'}}>
              קבלו שבוע ניסיון ללא התחייבות. המזכירה החכמה תתחיל לעבוד בשבילכם כבר היום.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="https://wa.me/972534638880?text=%D7%97%D7%99%D7%99%20%D7%90%D7%99%D7%9C%D7%90%D7%99,%20%D7%90%D7%A0%D7%99%20%D7%A8%D7%95%D7%A6%D7%94%20%D7%A9%D7%91%D7%95%D7%A2%20%D7%A0%D7%99%D7%A1%D7%99%D7%95%D7%9F%20%D7%9C%D7%9C%D7%90%20%D7%97%D7%95%D7%91%D7%94"
                target="_blank" rel="noopener noreferrer"
                className="px-8 py-4 font-bold rounded-xl tracking-wide transition-all hover:scale-105"
                style={{background:`linear-gradient(45deg,${NG},#2ff801)`,color:'#064200',
                  fontFamily:'Inter,sans-serif',fontSize:'0.9rem',boxShadow:`0 0 30px ${NG}55`}}>
                דברו איתי בווצאפ: 053-4638880 📱
              </a>
              <a href="mailto:ilay10lankin@gmail.com" className="px-8 py-4 font-bold rounded-xl tracking-wide text-white/80 hover:text-white transition-all"
                style={{border:'1px solid rgba(255,255,255,0.2)',fontFamily:'Inter,sans-serif',fontSize:'0.9rem'}}>
                ilay10lankin@gmail.com ✉️
              </a>
            </div>
          </motion.div>
        </section>

        {/* ── FOOTER ────────────────────────────────── */}
        <footer className="flex items-center justify-between px-10 md:px-20 py-8"
          style={{background:'rgba(0,0,0,0.6)',backdropFilter:'blur(20px)',borderTop:'1px solid rgba(255,255,255,0.04)'}}>
          <span className="text-sm font-black tracking-[0.25em] uppercase" style={{color:NG,fontFamily:'Space Grotesk,monospace'}}>ILAY</span>
          <nav className="hidden md:flex gap-6 text-[11px] text-white/25 tracking-[0.15em] uppercase" style={{fontFamily:'Space Grotesk,monospace'}}>
            {[
              { label: 'Process', href: '#process' },
              { label: 'Services', href: '#services' },
              { label: 'Results', href: '#results' },
              { label: 'About', href: '#contact' },
            ].map(item => (
              <a key={item.label} href={item.href} className="hover:text-white/60 transition-colors">{item.label}</a>
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
