/* 16-second product introduction. Reference geometry and drawing imagery are the existing public module-6 sources. */
(()=>{'use strict';
const W=1920,H=1080,DURATION=16,FONT='"PingFang SC",-apple-system,BlinkMacSystemFont,sans-serif';
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);},out=x=>1-Math.pow(1-clamp(x),3),mix=(a,b,q)=>a+(b-a)*q;
let paper=null,ink=null,loading=null,reference={lines:[],center:[0,0,715]};
function text(c,s,x,y,size=22,color='#dceaf0',weight=300){c.font=`${weight} ${size}px ${FONT}`;c.textAlign='left';c.fillStyle=color;c.fillText(s,x,y);}
function path(c,points,color='#72b4c3',width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.stroke();}
function ring(c,x,y,r,color='#a0ded7',width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();}
function corners(c,x,y,w,h,color='#81b6c3',n=19){for(const[a,b,sx,sy]of[[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]])path(c,[[a+sx*n,b],[a,b],[a,b+sy*n]],color,1.2);}
function partial(c,points,progress,color,width=1){const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));let remain=lengths.reduce((a,b)=>a+b,0)*clamp(progress);c.beginPath();c.moveTo(...points[0]);for(let i=0;i<lengths.length;i++){const q=lengths[i]?Math.min(1,remain/lengths[i]):0;if(q<=0)break;c.lineTo(mix(points[i][0],points[i+1][0],q),mix(points[i][1],points[i+1][1],q));remain-=lengths[i];}c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function phaseAlpha(t,start,end){return ease((t-start)/.30)*(1-ease((t-(end-.24))/.24));}
function fade(c,a,fn){if(a<=0)return;c.save();c.globalAlpha*=clamp(a);fn();c.restore();}
function project(p,{cx=1432,cy=535,scale=2.75,yaw=-.74,elev=.18,flat=0}={}){const center=reference.center||[0,0,715.67],x=p[0]-center[0],y=(p[1]-center[1])*(1-flat),z=p[2]-center[2];return[cx+(-Math.sin(yaw)*x+Math.cos(yaw)*y)*scale,cy-(-Math.sin(elev)*Math.cos(yaw)*x-Math.sin(elev)*Math.sin(yaw)*y+Math.cos(elev)*z)*scale];}
function sourceWire(c,{progress=1,gloss=0,flat=0,cx=1432,cy=535,scale=2.75,yaw=-.74,elev=.18}={}){
 const pts=[],opts={cx,cy,scale,yaw,elev,flat};
 c.save();c.shadowColor=gloss>.5?'#a5a5ff7a':'#71ead27a';c.shadowBlur=gloss>.5?15:7;
 reference.lines.forEach((line,i)=>{const points=line.points.map(p=>project(p,opts)),a=ease((progress*1.25-i/reference.lines.length)/.25);if(!a)return;fade(c,a,()=>{path(c,points,gloss>.5?(i%3?'#a6b9e3':'#dfd8f4'):(i%6?'#76c9d2':'#c4eee2'),gloss>.5?3.4:(i%6?1.3:1.9));});pts.push(...points);});
 c.shadowBlur=0;pts.forEach((p,i)=>{if(i%8)return;fade(c,ease((progress-.6)/.4),()=>{c.fillStyle='#d4f4e4';c.beginPath();c.arc(...p,gloss>.5?2.4:2,0,Math.PI*2);c.fill();});});c.restore();return{points:pts,project:p=>project(p,opts)};
}
function orbit(c,cx=1432,cy=870,q=1,rx=220){c.save();c.globalAlpha*=q;c.strokeStyle='#365e71';c.lineWidth=1;c.beginPath();c.ellipse(cx,cy,rx,rx*.17,-.06,0,Math.PI*2);c.stroke();c.strokeStyle='#7bc8c074';c.beginPath();c.ellipse(cx,cy,rx*.9,rx*.13,-.06,Math.PI*.92,Math.PI*1.76);c.stroke();c.restore();}
function crop(c,b,x,y,w,h){const[sx,sy,sw,sh]=b,k=Math.min(w/sw,h/sh),dw=sw*k,dh=sh*k;c.fillStyle='#dce6e4';c.fillRect(x,y,w,h);c.drawImage(paper,sx*2,sy*2,sw*2,sh*2,x+(w-dw)/2,y+(h-dh)/2,dw,dh);}
function sheet(c,x,y,w,h,a=1){fade(c,a,()=>{c.save();c.shadowColor='#01080bc0';c.shadowBlur=26;c.fillStyle='#0a2330';c.fillRect(x-12,y-12,w+24,h+24);c.restore();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';crop(c,[200,431,376,564],x,y,w,h);corners(c,x-18,y-18,w+36,h+36,'#7aafb7',19);});}
function reticle(c,p,q=1,r=13,color='#dfc995'){fade(c,q,()=>{ring(c,...p,r,color,1.3);path(c,[[p[0]-r-8,p[1]],[p[0]-r+1,p[1]]],color);path(c,[[p[0]+r-1,p[1]],[p[0]+r+8,p[1]]],color);path(c,[[p[0],p[1]-r-8],[p[0],p[1]-r+1]],color);path(c,[[p[0],p[1]+r-1],[p[0],p[1]+r+8]],color);});}
function nodeAt(index,opts){const l=reference.lines[index%Math.max(1,reference.lines.length)];return l?project(l.points[0],opts):[1432,535];}
function label(c,number,en){text(c,`${number} / ${en}`,96,159,14,'#b2cdd5',500);path(c,[[96,187],[150,187]],'#91d8cc',2);}
async function load(){if(loading)return loading;loading=(async()=>{paper=new Image();paper.src='process/module6-full-technical-sheet.webp';const r=await fetch('process/module6-lines.json');if(!r.ok)throw Error('问题引入的结构参考线未载入');reference=await r.json();await paper.decode();ink=document.createElement('canvas');ink.width=paper.naturalWidth;ink.height=paper.naturalHeight;const d=ink.getContext('2d',{willReadFrequently:true});d.drawImage(paper,0,0);const pixels=d.getImageData(0,0,ink.width,ink.height);for(let i=0;i<pixels.data.length;i+=4){const a=1-(pixels.data[i]*.2126+pixels.data[i+1]*.7152+pixels.data[i+2]*.0722)/255;pixels.data[i]=145;pixels.data[i+1]=212;pixels.data[i+2]=220;pixels.data[i+3]=Math.round(a*235);}d.putImageData(pixels,0,0);})();return loading;}
function brandGlow(c,u){
 const a=out((u-2)/.3);fade(c,a,()=>{const strength=.8+.6*Math.exp(-Math.pow((u-2.35)/.32,2));c.save();c.shadowColor='#80ebde';c.shadowBlur=15*strength;text(c,'仝心圆',94,550,88,'#b4f0df',400);c.restore();
 const q=clamp((u-2.15)/1.1);path(c,[[96,582],[96+288*q,582]],'#bfddbb',2);if(q>0&&q<1){const g=c.createLinearGradient(70+365*q,0,140+365*q,0);g.addColorStop(0,'#ffffff00');g.addColorStop(.5,'#fff4ce');g.addColorStop(1,'#ffffff00');c.save();c.beginPath();c.rect(90,454,292,107);c.clip();text(c,'仝心圆',94,550,88,g,400);c.restore();}
 });
}
function promiseLine(c,u){fade(c,out((u-4)/.3),()=>{const y=778;const prefix='从图纸生成',suffix='精准的3D模型';c.font=`400 41px ${FONT}`;const a=c.measureText(prefix).width,b=c.measureText('100%').width;text(c,prefix,96,y,41,'#d7e8eb',400);c.save();c.shadowColor='#d9be7c';c.shadowBlur=10;text(c,'100%',96+a,y,41,'#f2d291',500);c.restore();text(c,suffix,96+a+b,y,41,'#d7e8eb',400);});}
function appearanceToCAD(c,u){
 const resolve=ease((u-4)/1.8),yaw=mix(-1.04,-.74,ease(u/2)),opts={cx:mix(1432,1625,resolve),cy:550,scale:mix(3.45,3.1,resolve),yaw};
 orbit(c,opts.cx,871,1,mix(241,190,resolve));fade(c,1-resolve,()=>sourceWire(c,{...opts,gloss:1}));
 fade(c,resolve,()=>{const paperX=930+34*(1-resolve);sheet(c,paperX,245,420,630);sourceWire(c,{...opts,progress:ease((u-4.1)/1.7)});});
 // A large native-resolution drawing panel establishes the input before its source-linked spatial linework.
 fade(c,resolve,()=>{const a=[1372,535],b=nodeAt(2,opts),elbow=[1420,535],q=ease((u-4.3)/1.3);partial(c,[a,elbow,b],q,'#d3c28f',1.4);reticle(c,b,q);const p=clamp((u-4.6)/1.25);if(p>0&&p<1){const from=p<.32?a:elbow,to=p<.32?elbow:b,f=p<.32?p/.32:(p-.32)/.68;c.fillStyle='#f5e2aa';c.beginPath();c.arc(mix(from[0],to[0],f),mix(from[1],to[1],f),3,0,Math.PI*2);c.fill();}
 [14,33,51].forEach((index,i)=>reticle(c,nodeAt(index,opts),ease((u-4.6-i*.24)/.55),10,'#8de2d4'));
 });
 fade(c,1-resolve,()=>text(c,'3D / VISUAL',opts.cx-82,921,15,'#a6b2d0',500));fade(c,resolve,()=>{text(c,'DRAWING',930,921,15,'#b0c8d0',500);text(c,'3D / CAD',1563,921,15,'#a8d9d3',500);});
}
function introduction(c,u){
 label(c,'01','BEYOND APPEARANCE');
 text(c,'大模型可以生成“逼真的3D模型”',94,320,43,'#dfebf0',300);
 brandGlow(c,u);promiseLine(c,u);appearanceToCAD(c,u);
}
function dimension(c,a,b,q){fade(c,q,()=>{path(c,[a,b],'#dfc995',1.3);for(const p of[a,b])path(c,[[p[0]-7,p[1]-7],[p[0]+7,p[1]+7]],'#dfc995',1.2);});}
function engineering(c,u){
 label(c,'02','ENGINEERING PRECISION');text(c,'形体之外，',94,342,56);text(c,'更难的是精准。',94,438,56,'#b8eade');
 const items=['尺寸一致','孔位同轴','连接正确'];items.forEach((s,i)=>fade(c,out((u-.35-i*.25)/.35),()=>{const y=626+i*98;ring(c,106,y-10,5,'#d8c28f',1.4);path(c,[[127,y-10],[160,y-10]],'#5b8792',1);text(c,s,183,y,34,'#c4dce1',400);}));
 const opts={cx:1455,cy:550,scale:3.5};sourceWire(c,{...opts,progress:ease((u-.15)/1.5)});orbit(c,1455,898,1,256);
 const a=nodeAt(0,opts),b=nodeAt(61,opts),pa=[1720,a[1]],pb=[1720,b[1]],q=ease((u-.4)/.8);dimension(c,pa,pb,q);fade(c,q,()=>{path(c,[a,pa],'#688e98',.8);path(c,[b,pb],'#688e98',.8);});
 const joint=nodeAt(33,opts);fade(c,ease((u-.9)/.65),()=>{ring(c,...joint,33,'#8cddd5',1.3);ring(c,...joint,19,'#d5c28d',1.3);path(c,[[joint[0]-49,joint[1]],[joint[0]+49,joint[1]]],'#88b6be',1);path(c,[[joint[0],joint[1]-49],[joint[0],joint[1]+49]],'#88b6be',1);});
 [14,51].forEach((index,i)=>reticle(c,nodeAt(index,opts),ease((u-1.15-i*.2)/.5),17));
}
function question(c,u){
 label(c,'03','THE PRODUCT QUESTION');text(c,'如何让 AI，',94,320,51);text(c,'从“漂亮的模型”',94,468,51);text(c,'走向“正确精准的模型”？',94,616,51,'#b7eadd');
 path(c,[[96,716],[171,716]],'#79aca9',1.5);text(c,'从图纸生成高精度、100%正确的3D模型？',96,815,29,'#bfd2dc',400);
 const q=ease((u-.15)/1.7),opts={cx:1625,cy:550,scale:3.1,flat:1-q,yaw:mix(-Math.PI/2,-.74,q),elev:mix(0,.18,q)};sheet(c,930,245,420,630,ease((u-.15)/.7));sourceWire(c,{...opts,progress:1});orbit(c,1625,871,1,190);
 const source=[1372,535],target=nodeAt(2,opts),elbow=[1420,535];partial(c,[source,elbow,target],ease((u-.6)/1.25),'#cebf8c',1.4);
 fade(c,ease((u-1.25)/.65),()=>{corners(c,1464,240,322,617,'#82cfc2',24);reticle(c,target,1,12);text(c,'DRAWING',930,921,15,'#b0c8d0',500);text(c,'PRECISION / 3D',1539,921,15,'#a8d9d3',500);});
}
function draw(c,t){
 t=Math.max(0,Math.min(DURATION,t));c.save();c.globalCompositeOperation='source-over';c.filter='none';c.globalAlpha=1;c.beginPath();c.rect(0,60,W,H-120);c.clip();c.fillStyle='#06131f';c.fillRect(0,60,W,H-120);
 const bg=c.createRadialGradient(1480,550,25,1190,550,1120);bg.addColorStop(0,'#183848');bg.addColorStop(.65,'#0a1d2c');bg.addColorStop(1,'#05111b');c.fillStyle=bg;c.fillRect(0,60,W,960);
 fade(c,.22,()=>{for(let x=70;x<W;x+=62)path(c,[[x,60],[x,H-60]],'#244252',.65);for(let y=88;y<1020;y+=62)path(c,[[0,y],[W,y]],'#244252',.65);});
 if(ink)fade(c,.1*out(t/.8),()=>c.drawImage(ink,846,172,987,697));const shade=c.createLinearGradient(60,0,945,0);shade.addColorStop(0,'#06131ff5');shade.addColorStop(.7,'#06131fe8');shade.addColorStop(1,'#06131f00');c.fillStyle=shade;c.fillRect(60,210,870,690);
 const phases=[{start:0,end:8.5,name:'通用 AI → 仝心圆',fn:introduction},{start:8.5,end:11.5,name:'工程难点',fn:engineering},{start:11.5,end:16,name:'产品问题',fn:question}];
 phases.forEach(s=>fade(c,phaseAlpha(t,s.start,s.end),()=>s.fn(c,t-s.start)));
 phases.forEach((s,i)=>{const x=112+i*584,active=t>=s.start&&t<s.end,q=clamp((t-s.start)/(s.end-s.start));text(c,s.name,x,963,15,active?'#c9e2e4':'#85a8b7',400);path(c,[[x,983],[x+516,983]],'#254554',1);partial(c,[[x,983],[x+516,983]],q,'#84bebd',1.7);});
 const end=ease((t-(DURATION-.24))/.24);if(end){c.fillStyle=`rgba(6,19,31,${end})`;c.fillRect(0,60,W,960);}c.restore();
}
window.ProblemFilm={load,draw};
})();
