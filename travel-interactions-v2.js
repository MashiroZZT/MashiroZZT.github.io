(() => {
  const root=document.querySelector('.world-chart');
  if(!root||!window.gsap)return;
  const svg=root.querySelector('.globe-map');
  const stage=root.querySelector('.map-stage');
  const tooltip=root.querySelector('.atlas-tooltip');
  const anchor=root.querySelector('.tooltip-position');
  const markers=[...root.querySelectorAll('.place-marker')];
  const media=gsap.matchMedia();
  const initialize=()=>media.add({all:'(min-width: 0px)',reduceMotion:'(prefers-reduced-motion: reduce)'},context=>{
    const reduce=context.conditions.reduceMotion;
    const listeners=[];
    const on=(target,event,fn)=>{target.addEventListener(event,fn);listeners.push(()=>target.removeEventListener(event,fn));};
    const animations=new Map();
    let hovered=null,focused=null,active=null;
    gsap.set(tooltip,{autoAlpha:0,y:5});
    // Reduced-motion users seek these paused timelines directly to their endpoints.
    const reveal=gsap.timeline({paused:true}).to(tooltip,{autoAlpha:1,y:-3,duration:.2,ease:'power2.out'});
    const placeTooltip=marker=>{
      if(!marker)return;
      // Read geometry only on selection, scrolling, or resizing; never every frame.
      const matrix=svg.getScreenCTM(),rect=stage.getBoundingClientRect();
      if(!matrix)return;
      const point=new DOMPoint(Number(marker.dataset.x),Number(marker.dataset.y)).matrixTransform(matrix);
      const width=tooltip.offsetWidth;
      const x=Math.max(width/2+8,Math.min(rect.width-width/2-8,point.x-rect.left));
      gsap.set(anchor,{x:x+stage.scrollLeft,y:point.y-rect.top+stage.scrollTop-15});
    };
    const update=()=>{
      const next=hovered||focused;
      if(next===active)return;
      if(active){const old=animations.get(active);reduce?old.progress(0):old.reverse();active.classList.remove('is-active');}
      active=next;
      if(active){
        tooltip.textContent=active.dataset.place;
        tooltip.style.setProperty('--tooltip-color',getComputedStyle(active).getPropertyValue('--marker'));
        placeTooltip(active);
        active.classList.add('is-active');
        const animation=animations.get(active);reduce?animation.progress(1):animation.play();
        reduce?reveal.progress(1):reveal.play();
      }else{reduce?reveal.progress(0):reveal.reverse();}
    };
    for(const marker of markers){
      const body=marker.querySelector('.marker-body');
      const bright=marker.querySelector('.marker-bright');
      gsap.set(body,{svgOrigin:`${marker.dataset.x} ${marker.dataset.y}`});
      animations.set(marker,gsap.timeline({paused:true,defaults:{duration:.22,ease:'power2.out'}})
        .to(body,{scale:1.22},0).to(bright,{opacity:.5},0));
      on(marker,'pointerenter',e=>{if(e.pointerType==='touch')return;hovered=marker;update();});
      on(marker,'pointerleave',()=>{if(hovered===marker)hovered=null;update();});
      on(marker,'focus',()=>{focused=marker;update();});
      on(marker,'blur',()=>{if(focused===marker)focused=null;update();});
      on(marker,'pointerdown',()=>marker.focus({preventScroll:true}));
    }
    on(root,'keydown',e=>{if(e.key==='Escape'){hovered=null;focused=null;update();document.activeElement?.blur();}});
    on(stage,'scroll',()=>placeTooltip(active));
    on(window,'resize',()=>placeTooltip(active));
    return ()=>{listeners.forEach(remove=>remove());markers.forEach(m=>m.classList.remove('is-active'));tooltip.textContent='';};
  },root);
  initialize();
  window.addEventListener('pagehide',()=>media.revert());
  window.addEventListener('pageshow',e=>{if(e.persisted)initialize();});
})();
