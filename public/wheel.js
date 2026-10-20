import { prizeIconAsset } from './prize-icons.js';

export function spinTarget(current, index, count) {
  const desired = ((-index * 360 / count) % 360 + 360) % 360;
  const normalized = ((current % 360) + 360) % 360;
  return current + 1800 + ((desired - normalized + 360) % 360);
}
const colors = ['#f8ccd3','#f8dfbc','#e8ead0','#f4c0cb','#f8e8d3','#dfe8db','#edd8e9','#f3dda4'];
const ns = 'http://www.w3.org/2000/svg';
function svgNode(tag, attrs, text) {
  const node = document.createElementNS(ns,tag);
  for (const [key,value] of Object.entries(attrs)) node.setAttribute(key,String(value));
  if (text) node.textContent=text;
  return node;
}
export function renderWheel(svg, items) {
  svg.replaceChildren();
  if (!items.length) {
    svg.append(svgNode('circle',{cx:220,cy:220,r:215,fill:'#f4e7dc'}));
    svg.append(svgNode('text',{x:220,y:110,'text-anchor':'middle',fill:'#8a7567','font-size':17},'先挑几份小惊喜吧'));
    return;
  }
  const count = items.length; const slice = 360 / count; const radius = 216;
  const point = angle => [220 + radius * Math.sin(angle*Math.PI/180),220-radius*Math.cos(angle*Math.PI/180)];
  items.forEach((item,index) => {
    const angle = index * slice;
    if(count === 1) svg.append(svgNode('circle',{cx:220,cy:220,r:radius,fill:colors[0]}));
    else {
      const start=point(angle-slice/2),end=point(angle+slice/2);
      svg.append(svgNode('path',{d:`M220 220 L${start.join(' ')} A${radius} ${radius} 0 ${slice>180?1:0} 1 ${end.join(' ')} Z`,fill:colors[index%colors.length],stroke:'#fff9ef','stroke-width':2}));
    }
    const group=svgNode('g',{transform:`translate(220 220) rotate(${angle})`});
    const limit = count>16 ? 3 : count>10 ? 4 : 7;
    const label = [...item.title].length>limit ? [...item.title].slice(0,limit).join('')+'…' : item.title;
    const title=svgNode('title',{},item.title); group.append(title);
    const asset=prizeIconAsset(item.emoji);
    if(asset) {
      const size=count>16?22:32;
      group.append(svgNode('image',{href:asset,x:-size/2,y:-182-size/2,width:size,height:size}));
    } else group.append(svgNode('text',{x:0,y:-170,'text-anchor':'middle','font-size':count>16?21:29},item.emoji));
    group.append(svgNode('text',{x:0,y:-135,'text-anchor':'middle','font-size':count>16?11:count>10?13:16,'font-weight':600,fill:'#674b47'},label));
    svg.append(group);
  });
}
