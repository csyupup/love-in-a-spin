// Fixing the body also blocks background touch scrolling on mobile Safari.
// Keep the page at its previous visual position while the native dialog is open.
export function createScrollLock(pageWindow=window,pageDocument=document) {
  const body=pageDocument.body,root=pageDocument.documentElement;
  const bodyKeys=['position','top','left','right','width','overflow','paddingRight','overscrollBehavior'];
  const rootKeys=['overflow','overscrollBehavior','scrollBehavior'];
  let saved=null;
  return {
    lock() {
      if(saved)return;
      saved={x:pageWindow.scrollX,y:pageWindow.scrollY,body:Object.fromEntries(bodyKeys.map(key=>[key,body.style[key]])),root:Object.fromEntries(rootKeys.map(key=>[key,root.style[key]]))};
      const scrollbar=Math.max(0,pageWindow.innerWidth-root.clientWidth);
      const padding=parseFloat(pageWindow.getComputedStyle(body).paddingRight)||0;
      Object.assign(body.style,{position:'fixed',top:`-${saved.y}px`,left:`-${saved.x}px`,right:'0',width:'100%',overflow:'hidden',paddingRight:`${padding+scrollbar}px`,overscrollBehavior:'none'});
      Object.assign(root.style,{overflow:'hidden',overscrollBehavior:'none',scrollBehavior:'auto'});
    },
    unlock() {
      if(!saved)return;
      const previous=saved;saved=null;
      Object.assign(body.style,previous.body);
      root.style.overflow=previous.root.overflow;
      root.style.overscrollBehavior=previous.root.overscrollBehavior;
      pageWindow.scrollTo(previous.x,previous.y);
      root.style.scrollBehavior=previous.root.scrollBehavior;
    },
  };
}
