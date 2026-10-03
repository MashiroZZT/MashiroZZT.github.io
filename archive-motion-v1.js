(() => {
 if(!window.gsap)return;
 const media=gsap.matchMedia();
 const initialize=()=>media.add({all:'(min-width:0px)',reduced:'(prefers-reduced-motion:reduce)',fine:'(hover:hover) and (pointer:fine)'},context=>{
  const {reduced,fine}=context.conditions;
  const remove=[],observers=[];
  const on=(el,event,fn)=>{el.addEventListener(event,fn);remove.push(()=>el.removeEventListener(event,fn));};
  // Three primitives: brief entrance, reversible image/label response, once-only fine-line emphasis.
  const copy=[...document.querySelectorAll('.hero-copy >h1,.hero-copy >.hero-intro,.hero-copy >.hero-note,.hero-copy >.text-link')];
  if(!reduced&&copy.length&&window.scrollY<200){gsap.timeline({defaults:{duration:.34,ease:'power2.out'}}).from(copy,{y:7,autoAlpha:0,stagger:.055,clearProps:'transform,opacity,visibility'});}
  for(const link of document.querySelectorAll('.photo-link')){
   const img=link.querySelector('img'),label=link.querySelector('.photo-overlay');
   if(!img||!label)continue;
   const tl=gsap.timeline({paused:true,defaults:{duration:.26,ease:'power2.out'}}).to(img,{scale:reduced?1:1.018},0).fromTo(label,{autoAlpha:0,y:reduced?0:5},{autoAlpha:1,y:0},0);
   let hover=false,focus=false;
   const update=()=>{const active=hover||focus;link.classList.toggle('js-interacting',active&&!reduced);if(reduced)tl.progress(active?1:0);else active?tl.play():tl.reverse();};
   on(link,'pointerenter',()=>{if(fine){hover=true;update();}});on(link,'pointerleave',()=>{hover=false;update();});on(link,'focus',()=>{focus=true;update();});on(link,'blur',()=>{focus=false;update();});
  }
  if(!reduced){
   const targets=[...document.querySelectorAll('.route-line b')];
   const timelines=new Map(targets.map(el=>[el,gsap.fromTo(el,{scaleX:0},{scaleX:1,duration:.55,ease:'power2.out',paused:true})]));
   const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){timelines.get(entry.target)?.play();observer.unobserve(entry.target);}},{threshold:.6});
   targets.forEach(el=>observer.observe(el));observers.push(observer);
  }
  return ()=>{remove.forEach(fn=>fn());observers.forEach(o=>o.disconnect());document.querySelectorAll('.js-interacting').forEach(el=>el.classList.remove('js-interacting'));};
 },document.body);
 initialize();window.addEventListener('pagehide',()=>media.revert());window.addEventListener('pageshow',e=>{if(e.persisted)initialize();});
})();
