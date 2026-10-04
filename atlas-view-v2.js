(() => {
 const stage=document.querySelector('.map-stage'),svg=stage?.querySelector('.globe-map');
 const world=svg?.querySelector('.atlas-world'),controls=document.querySelector('.atlas-view-controls');
 if(!world||!controls||!window.gsap)return;
 const W=1240,H=700,MIN=1,MAX=4.5,view={k:1,x:0,y:0};
 const media=gsap.matchMedia();
 const initialize=()=>media.add({all:'(min-width:0px)',reduced:'(prefers-reduced-motion:reduce)'},context=>{
  const reduced=context.conditions.reduced,listeners=[],pointers=new Map();
  const on=(el,name,fn,options)=>{el.addEventListener(name,fn,options);listeners.push(()=>el.removeEventListener(name,fn,options));};
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const local=(x,y)=>new DOMPoint(x,y).matrixTransform(svg.getScreenCTM().inverse());
  const bounds=()=>{const r=stage.getBoundingClientRect(),s=svg.getBoundingClientRect();return {a:local(r.left,s.top),b:local(r.right,s.bottom)};};
  const constrain=(state)=>{
   if(state.k<=MIN)return {...state,k:MIN,x:0,y:0};
   const {a,b}=bounds();return {...state,x:clamp(state.x,b.x-W*state.k,a.x),y:clamp(state.y,b.y-H*state.k,a.y)};
  };
  let target={...view},gesture=null,frame=0;
  const render=()=>{
   world.setAttribute('transform',`translate(${view.x} ${view.y}) scale(${view.k})`);
   stage.classList.toggle('is-zoomed',view.k>1.001);
   svg.dataset.viewScale=String(view.k);
   controls.querySelector('.atlas-scale').value=`${Math.round(view.k*100)}%`;
   controls.querySelector('[data-map-view="out"]').disabled=view.k<=MIN+.001;
   controls.querySelector('[data-map-view="in"]').disabled=view.k>=MAX-.001;
   stage.dispatchEvent(new Event('atlasviewchange'));
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;render();});};
  const move=(next,smooth=true)=>{
   target=constrain(next);gsap.killTweensOf(view);
   if(smooth&&!reduced)gsap.to(view,{...target,duration:.18,ease:'power2.out',onUpdate:render});
   else{Object.assign(view,target);schedule();}
  };
  const zoom=(scale,p,smooth=true)=>{
   const k=clamp(scale,MIN,MAX),wx=(p.x-view.x)/view.k,wy=(p.y-view.y)/view.k;
   move({k,x:p.x-wx*k,y:p.y-wy*k},smooth);
  };
  const center=()=>{const {a,b}=bounds();return {x:(a.x+b.x)/2,y:(a.y+b.y)/2};};
  const reset=()=>{stage.scrollLeft=0;move({k:1,x:0,y:0});};
  on(svg,'wheel',e=>{
   if(gesture||e.shiftKey||Math.abs(e.deltaX)>Math.abs(e.deltaY)||!e.deltaY)return;
   const dy=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?stage.clientHeight:1);
   const k=clamp(target.k*Math.exp(-clamp(dy,-180,180)*(e.ctrlKey ? .005 : .0018)),MIN,MAX);
   // Do not trap page scrolling at the zoom limits. The listener exists only on the SVG.
   if(Math.abs(k-target.k)<.0001)return;
   e.preventDefault();zoom(k,local(e.clientX,e.clientY));
  },{passive:false});
  for(const button of controls.querySelectorAll('button')){
   on(button,'pointerdown',e=>e.preventDefault());
   on(button,'click',()=>{const action=button.dataset.mapView;if(action==='reset')reset();else zoom(view.k*(action==='in'?1.4:1/1.4),center());});
  }
  const startGesture=()=>{
   gsap.killTweensOf(view);target={...view};stage.classList.add('is-gesturing');
   stage.dispatchEvent(new Event('atlasgesturestart'));
   for(const id of pointers.keys())try{svg.setPointerCapture(id);}catch{}
  };
  const pinch=()=>{
   const [a,b]=[...pointers.values()].slice(0,2),mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
   return {distance:Math.hypot(a.x-b.x,a.y-b.y),p:local(mid.x,mid.y)};
  };
  on(svg,'pointerdown',e=>{
   if(e.button!==0)return;
   if(view.k>1.001)e.preventDefault();
   pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,target:e.target,type:e.pointerType});
   // Mouse drags must still be tracked when the first move crosses the SVG edge.
   // Touch keeps its implicit marker capture until it becomes a gesture, preserving taps.
   if(view.k>1.001&&e.pointerType==='mouse')svg.setPointerCapture(e.pointerId);
   if(pointers.size===2){e.preventDefault();startGesture();const p=pinch();gesture={type:'pinch',distance:p.distance,k:view.k,wx:(p.p.x-view.x)/view.k,wy:(p.p.y-view.y)/view.k};}
  });
  on(svg,'pointermove',e=>{
   const point=pointers.get(e.pointerId);if(!point)return;
   const previousX=point.x,before=local(point.x,point.y);point.x=e.clientX;point.y=e.clientY;
   if(pointers.size>=2){
    e.preventDefault();const p=pinch(),k=clamp(gesture.k*p.distance/Math.max(1,gesture.distance),MIN,MAX);
    move({k,x:p.p.x-gesture.wx*k,y:p.p.y-gesture.wy*k},false);return;
   }
   const distance=Math.hypot(point.x-point.startX,point.y-point.startY);
   if(!gesture&&view.k>1.001&&distance>5){gesture={type:'pan'};startGesture();}
   if(!gesture&&view.k<=1.001&&point.type!=='mouse'&&distance>5&&Math.abs(point.x-point.startX)>Math.abs(point.y-point.startY)){
    gesture={type:'native'};startGesture();
   }
   if(gesture?.type==='pan'){
    e.preventDefault();const p=local(point.x,point.y);move({...view,x:view.x+p.x-before.x,y:view.y+p.y-before.y},false);
   }
   if(gesture?.type==='native'){e.preventDefault();stage.scrollLeft-=point.x-previousX;}
  });
  const finish=e=>{
   const point=pointers.get(e.pointerId);if(!point)return;
   const moved=Math.hypot(e.clientX-point.startX,e.clientY-point.startY)>5;
   const wasGesture=Boolean(gesture);pointers.delete(e.pointerId);
   if(!wasGesture&&!moved&&e.type==='pointerup'){
    const marker=point.target.closest('.place-marker');
    if(!marker)stage.dispatchEvent(new Event('atlasemptytap'));
    else if(point.type==='mouse')stage.dispatchEvent(new CustomEvent('atlasphotoclick',{detail:{marker}}));
   }
   try{if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);}catch{}
   if(pointers.size===1&&wasGesture){const p=[...pointers.values()][0];p.startX=p.x;p.startY=p.y;gesture={type:view.k>1.001?'pan':'native'};}
   else if(!pointers.size){gesture=null;stage.classList.remove('is-gesturing');}
  };
  on(svg,'pointerup',finish);on(svg,'pointercancel',finish);
  on(svg,'lostpointercapture',e=>{if(pointers.has(e.pointerId))finish(e);});
  on(stage,'atlasfocus',e=>{
   if(gesture)return;const {x,y}=e.detail,{a,b}=bounds(),px=view.x+x*view.k,py=view.y+y*view.k;
   if(view.k<=MIN){if(px<a.x||px>b.x){const r=svg.getBoundingClientRect();stage.scrollLeft=clamp(x/W*r.width-stage.clientWidth/2,0,stage.scrollWidth-stage.clientWidth);}return;}
   const margin=28;
   move({...view,x:view.x+(px<a.x+margin?a.x+margin-px:px>b.x-margin?b.x-margin-px:0),y:view.y+(py<a.y+margin?a.y+margin-py:py>b.y-margin?b.y-margin-py:0)});
  });
  on(window,'resize',()=>move({...view},false));
  controls.hidden=false;stage.classList.add('is-interactive');Object.assign(view,constrain(view));render();
  return ()=>{
   gsap.killTweensOf(view);cancelAnimationFrame(frame);listeners.forEach(fn=>fn());
   for(const id of pointers.keys())try{if(svg.hasPointerCapture(id))svg.releasePointerCapture(id);}catch{}
   pointers.clear();stage.classList.remove('is-interactive','is-zoomed','is-gesturing');world.removeAttribute('transform');controls.hidden=true;delete svg.dataset.viewScale;
  };
 },stage);
 initialize();window.addEventListener('pagehide',()=>media.revert());window.addEventListener('pageshow',e=>{if(e.persisted)initialize();});
})();
