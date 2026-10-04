(() => {
 if(!window.gsap)return;
 const media=gsap.matchMedia();
 const seen=new WeakSet();
 let heroPlayed=false;
 const initialize=()=>media.add({all:'(min-width:0px)',reduced:'(prefers-reduced-motion:reduce)',fine:'(hover:hover) and (pointer:fine)'},context=>{
  const {reduced,fine}=context.conditions;
  const remove=[],observers=[];
  const on=(el,event,fn)=>{el.addEventListener(event,fn);remove.push(()=>el.removeEventListener(event,fn));};
  // Content remains readable during the entrance; no loading intro or hidden hero.
  const hero=document.querySelector('.hero-opening');
  if(!reduced&&!heroPlayed&&hero&&window.scrollY<200){
   heroPlayed=true;
   const name=hero.querySelector('h1'),quote=hero.querySelector('.hero-intro'),portrait=hero.querySelector('.portrait');
   gsap.timeline({defaults:{duration:.36,ease:'power2.out'}})
    .fromTo(name,{y:4,opacity:.76},{y:0,opacity:1,clearProps:'transform,opacity'},0)
    .fromTo(quote,{y:3,opacity:.78},{y:0,opacity:1,clearProps:'transform,opacity'},.07)
    .fromTo(portrait,{y:3,opacity:.86},{y:0,opacity:1,duration:.42,clearProps:'transform,opacity'},.12);
  }
  // A few landmarks, rather than identical reveals on every section.
  // Timelines are created inside matchMedia; observer callbacks only play them.
  const landmarks=new Map();
  const once=(el,kind)=>{
   if(!el||reduced||seen.has(el))return;
   const tl=gsap.timeline({paused:true});
   if(kind==='route')tl.fromTo(el,{scaleX:0},{scaleX:1,duration:.55,ease:'power2.out',clearProps:'transform'});
   else tl.fromTo(el,{opacity:.76,y:kind==='atlas'?0:kind==='chapter'?3:5},{opacity:1,y:0,duration:kind==='chapter'?.28:.4,ease:'power2.out',clearProps:'opacity,transform'});
   landmarks.set(el,tl);
  };
  once(document.querySelector('.world-section .section-heading'),'atlas');
  once(document.querySelector('.photography .section-heading'),'photography');
  for(const el of document.querySelectorAll('.chapter-index'))once(el,'chapter');
  for(const el of document.querySelectorAll('.route-line b'))once(el,'route');
  const play=el=>{const tl=landmarks.get(el);if(tl){seen.add(el);tl.play();landmarks.delete(el);}};
  if(landmarks.size){
   if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){play(entry.target);observer.unobserve(entry.target);}},{threshold:.25});
    landmarks.forEach((_,el)=>observer.observe(el));observers.push(observer);
    // Keyboard traversal never waits for a visual entrance.
    on(document,'focusin',e=>{for(const [el,tl] of landmarks)if(el.contains(e.target)){seen.add(el);tl.progress(1);landmarks.delete(el);observer.unobserve(el);}});
   }else landmarks.forEach((tl,el)=>{seen.add(el);tl.progress(1);});
  }
  for(const link of document.querySelectorAll('.photo-link')){
   const img=link.querySelector('img'),label=link.querySelector('.photo-overlay');
   if(!img||!label)continue;
   const tl=gsap.timeline({paused:true,defaults:{duration:.26,ease:'power2.out'}}).to(img,{scale:reduced?1:1.012,yPercent:reduced?0:-.25},0);
   // Reveal real place/date metadata, never a duplicate of the photograph title.
   if(link.parentElement.querySelector('figcaption small'))tl.fromTo(label,{autoAlpha:0,y:reduced?0:3},{autoAlpha:1,y:0},.04);
   let hover=false,focus=link===document.activeElement;
   const update=()=>{const active=hover||focus;link.classList.toggle('js-interacting',active&&!reduced);if(reduced)tl.progress(active?1:0);else active?tl.play():tl.reverse();};
   on(link,'pointerenter',()=>{if(fine){hover=true;update();}});on(link,'pointerleave',()=>{hover=false;update();});on(link,'focus',()=>{focus=true;update();});on(link,'blur',()=>{focus=false;update();});update();
  }
  for(const chapter of document.querySelectorAll('.life-chapter')){
   const img=chapter.querySelector('img');
   const tl=gsap.timeline({paused:true}).to(img,{scale:reduced?1:1.012,duration:.3,ease:'power2.out'});
   let hover=false,focus=false;
   const update=()=>{if(reduced)tl.progress(0);else hover||focus?tl.play():tl.reverse();};
   on(chapter,'pointerenter',()=>{if(fine){hover=true;update();}});
   on(chapter,'pointerleave',()=>{hover=false;update();});
   on(chapter,'focusin',()=>{focus=true;update();});
   on(chapter,'focusout',e=>{if(!chapter.contains(e.relatedTarget)){focus=false;update();}});update();
  }
  return ()=>{remove.forEach(fn=>fn());observers.forEach(o=>o.disconnect());document.querySelectorAll('.js-interacting').forEach(el=>el.classList.remove('js-interacting'));};
 },document.body);
 initialize();window.addEventListener('pagehide',()=>media.revert());window.addEventListener('pageshow',e=>{if(e.persisted)initialize();});
})();
