(() => {
  const root=document.querySelector('.world-chart');
  if(!root||!window.gsap)return;
  const svg=root.querySelector('.globe-map');
  const stage=root.querySelector('.map-stage');
  const world=svg.querySelector('.atlas-world');
  const tooltip=root.querySelector('.atlas-tooltip');
  const anchor=root.querySelector('.tooltip-position');
  const readout=document.querySelector('#atlas-coordinate');
  const photoLink=document.querySelector('#atlas-photo-link');
  const markers=[...root.querySelectorAll('.place-marker')];
  const flights=JSON.parse(root.querySelector('.atlas-flights').textContent);
  const outbound=new Map();
  for(const flight of flights){if(!outbound.has(flight.from))outbound.set(flight.from,[]);outbound.get(flight.from).push(flight);}
  const layer=svg.querySelector('.flight-layer');
  const media=gsap.matchMedia();
  const initialize=()=>media.add({all:'(min-width: 0px)',reduceMotion:'(prefers-reduced-motion: reduce)'},context=>{
    const reduce=context.conditions.reduceMotion;
    const listeners=[];
    const on=(target,event,fn)=>{target.addEventListener(event,fn);listeners.push(()=>target.removeEventListener(event,fn));};
    const animations=new Map();
    const destinationLights=new Map();
    for(const marker of markers){
      const light=marker.querySelector('.marker-bright').cloneNode(true);
      light.setAttribute('class','destination-bright');
      marker.querySelector('.marker-body').append(light);
      destinationLights.set(marker.dataset.city,light);
    }
    let routeSession=null;
    const disposeRoutes=session=>{
      if(!session)return;
      session.driver?.kill();session.timeline?.kill();session.group.remove();
      session.lights.forEach(light=>gsap.set(light,{opacity:0}));
      if(routeSession===session)routeSession=null;
    };
    const showRoutes=marker=>{
      // Retract the current session before drawing the latest requested origin.
      // Rapid switches replace the pending request, never overlapping city networks.
      if(routeSession){
        const old=routeSession;
        if(!reduce&&old.timeline.time()>0){
          old.driver?.kill();old.timeline.pause();
          old.driver=old.timeline.tweenTo(0,{duration:marker ? .18 : .28,ease:'power2.out',onComplete:()=>{
            disposeRoutes(old);
            if(marker&&active===marker)showRoutes(marker);
          }});
          return;
        }
        disposeRoutes(old);
      }
      if(!marker)return;
      const routes=outbound.get(marker.dataset.city)||[];
      if(!routes.length)return;
      const group=document.createElementNS('http://www.w3.org/2000/svg','g');
      layer.append(group);
      const session={group,lights:[],timeline:gsap.timeline({paused:true})};
      routeSession=session;
      // Geometry is precomputed at build time. pathLength normalizes all draw lengths to 1.
      routes.forEach((route,i)=>{
        const path=document.createElementNS('http://www.w3.org/2000/svg','path');
        path.setAttribute('class','flight-route');path.setAttribute('d',route.d);
        path.setAttribute('data-from',route.from);path.setAttribute('data-to',route.to);
        path.setAttribute('pathLength','1');path.setAttribute('stroke-dasharray','1 1');
        path.setAttribute('stroke-dashoffset',reduce?'0':'1');group.append(path);
        const light=destinationLights.get(route.to);session.lights.push(light);
        if(reduce){gsap.set(light,{opacity:.25});}
        else{
          const at=i*.022;
          session.timeline.to(path,{attr:{'stroke-dashoffset':0},duration:.64,ease:'power2.inOut'},at)
            .to(light,{opacity:.25,duration:.12,ease:'power2.out'},at+.61);
        }
      });
      if(!reduce)session.timeline.play();
    };
    let hovered=null,focused=null,pinned=null,active=null;
    gsap.set(tooltip,{autoAlpha:0,y:4});
    // Reduced-motion users seek these paused timelines directly to their endpoints.
    const reveal=gsap.timeline({paused:true}).to(tooltip,{autoAlpha:1,y:-2,duration:.18,ease:'power2.out'});
    const placeTooltip=marker=>{
      if(!marker)return;
      // Read geometry only on selection, scrolling, or resizing; never every frame.
      const matrix=world.getScreenCTM(),rect=stage.getBoundingClientRect();
      if(!matrix)return;
      const point=new DOMPoint(Number(marker.dataset.x),Number(marker.dataset.y)).matrixTransform(matrix);
      anchor.style.visibility=point.x<rect.left||point.x>rect.right||point.y<rect.top||point.y>rect.bottom?'hidden':'';
      const width=tooltip.offsetWidth;
      const x=Math.max(width/2+8,Math.min(rect.width-width/2-8,point.x-rect.left));
      gsap.set(anchor,{x:x+stage.scrollLeft,y:point.y-rect.top+stage.scrollTop-15});
    };
    const update=()=>{
      const next=hovered||focused||pinned;
      if(next===active)return;
      if(active){active.removeAttribute('aria-describedby');const old=animations.get(active);reduce?old.progress(0):old.reverse();active.classList.remove('is-active');}
      active=next;
      showRoutes(active);
      if(active){
        if(photoLink){photoLink.href=active.getAttribute('href');photoLink.textContent=`Open ${active.dataset.place} photos \u2197`;photoLink.hidden=false;}
        tooltip.textContent=active.dataset.place;active.setAttribute('aria-describedby','atlas-tooltip');
        tooltip.style.setProperty('--tooltip-color',getComputedStyle(active).getPropertyValue('--marker'));
        placeTooltip(active);
        active.classList.add('is-active');
        
        const animation=animations.get(active);reduce?animation.progress(1):animation.play();
        reduce?reveal.progress(1):reveal.restart();
        if(readout){const lat=Number(active.dataset.lat),lon=Number(active.dataset.lon);readout.textContent=`${Math.abs(lat).toFixed(2)}\u00b0 ${lat<0?'S':'N'} / ${Math.abs(lon).toFixed(2)}\u00b0 ${lon<0?'W':'E'}`;}
      }else{reduce?reveal.progress(0):reveal.reverse();if(readout)readout.textContent='Explore a star';}
    };
    for(const marker of markers){
      const body=marker.querySelector('.marker-body');
      const bright=marker.querySelector('.marker-bright');
      gsap.set(body,{svgOrigin:`${marker.dataset.x} ${marker.dataset.y}`});
      animations.set(marker,gsap.timeline({paused:true,defaults:{duration:.22,ease:'power2.out'}})
        .to(body,{scale:1.22},0).to(bright,{opacity:.5},0));
      on(marker,'pointerenter',e=>{if(e.pointerType==='touch'||stage.classList.contains('is-gesturing'))return;hovered=marker;update();});
      on(marker,'pointerleave',()=>{if(hovered===marker)hovered=null;update();});
      on(marker,'focus',()=>{stage.dispatchEvent(new CustomEvent('atlasfocus',{detail:{x:+marker.dataset.x,y:+marker.dataset.y}}));hovered=null;focused=marker;update();});
      on(marker,'blur',()=>{if(focused===marker)focused=null;if(pinned===marker)pinned=null;update();});
      const toggle=()=>{
        hovered=null;
        if(pinned===marker){pinned=null;focused=null;marker.blur();update();}
        else{pinned=marker;marker.focus({preventScroll:true});focused=marker;update();}
      };
      // Cancel compatibility-click focus; activation still waits for an undragged release.
      on(marker,'pointerdown',e=>e.preventDefault());
      on(marker,'pointerup',e=>{if(e.pointerType!=='mouse'&&!stage.classList.contains('is-gesturing')){e.preventDefault();toggle();}});
      on(marker,'click',e=>{if(e.detail>0)e.preventDefault();});
      on(marker,'keydown',e=>{if(e.key===' '){e.preventDefault();toggle();}});
    }
    const close=()=>{const previous=active;hovered=null;focused=null;pinned=null;update();previous?.blur();};
    on(root,'keydown',e=>{if(e.key==='Escape')close();});
    on(stage,'scroll',()=>placeTooltip(active));
    on(stage,'atlasviewchange',()=>placeTooltip(active));
    on(stage,'atlasgesturestart',()=>{hovered=null;update();});
    on(stage,'atlasemptytap',close);
    on(stage,'atlasphotoclick',e=>{const href=e.detail.marker.getAttribute('href');if(href)location.assign(href);});
    on(window,'resize',()=>placeTooltip(active));
    on(window,'scroll',()=>placeTooltip(active));
    on(document,'pointerdown',e=>{if(!e.target.closest('.place-marker,.map-stage,.atlas-view-controls'))close();});
    let observer;
    if(!reduce){
      const halos=markers.filter(m=>m.querySelector('.marker-halo'));
      const pulse=gsap.timeline({paused:true});
      halos.forEach((m,i)=>{const halo=m.querySelector('.marker-halo');gsap.set(halo,{svgOrigin:`${m.dataset.x} ${m.dataset.y}`});pulse.to(halo,{scale:1.12,opacity:.2,duration:.25,ease:'sine.out'},i*.09).to(halo,{scale:1,opacity:.1,duration:.4,ease:'sine.inOut'},i*.09+.25);});
      observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){pulse.play();observer.disconnect();}},{threshold:.4});observer.observe(svg);
    }
    // Preference changes and back/forward restoration keep the focused city usable.
    if(markers.includes(document.activeElement)){focused=document.activeElement;update();}
    return ()=>{observer?.disconnect();disposeRoutes(routeSession);destinationLights.forEach(light=>light.remove());layer.replaceChildren();if(readout)readout.textContent='Explore a star';listeners.forEach(remove=>remove());markers.forEach(m=>{m.classList.remove('is-active');m.removeAttribute('aria-describedby');});tooltip.textContent='';};
  },root);
  initialize();
  window.addEventListener('pagehide',()=>media.revert());
  window.addEventListener('pageshow',e=>{if(e.persisted)initialize();});
})();
