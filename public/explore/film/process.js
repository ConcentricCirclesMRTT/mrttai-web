/* One registered CAD module, built in place. Source geometry remains unchanged. */
(()=>{'use strict';
const C=[0,-.5727100037691883,715.6678053203382],W=1920,H=1080;
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);},smoother=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);},mix=(a,b,q)=>a+(b-a)*q;
const font='"PingFang SC",sans-serif';
function text(c,s,x,y,n=26,color='#dbe9ed',align='center'){c.fillStyle=color;c.textAlign=align;c.font=`300 ${n}px ${font}`;c.fillText(s,x,y);}
function line(c,p,col,w=1){c.strokeStyle=col;c.lineWidth=w;c.beginPath();p.forEach((v,i)=>i?c.lineTo(...v):c.moveTo(...v));c.stroke();}
function corners(c,x,y,w,h,col){for(const [a,b,sx,sy]of[[x,y,1,1],[x+w,y,-1,1],[x+w,y+h,-1,-1],[x,y+h,1,-1]])line(c,[[a+sx*18,b],[a,b],[a,b+sy*18]],col,1.2);}
function trace(c,points,q,color,width=1){const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));let remaining=lengths.reduce((a,b)=>a+b,0)*clamp(q);const path=[points[0]];for(let i=0;i<lengths.length&&remaining>0;i++){const f=Math.min(1,remaining/Math.max(lengths[i],.0001));path.push([mix(points[i][0],points[i+1][0],f),mix(points[i][1],points[i+1][1],f)]);remaining-=lengths[i];}line(c,path,color,width);return path[path.length-1];}
class Director{
 constructor(T,scene){this.T=T;this.scene=scene;this.root=new T.Group();scene.add(this.root);this.root.visible=false;this.uniform={value:0};this.planes=[];this.state={stage:0,visibleEntities:0};}
 async load(){this.paper=new Image();this.paper.src='process/module6-full-technical-sheet.webp';this.config=await(await fetch('process/module6-lines.json')).json();await this.paper.decode();const T=this.T,loader=new T.TextureLoader();
  for(const [name,box,center,axis]of[['front',[200,431,576,995],375.5,'x'],['side',[576,430,852,995],719,'y']]){
   const tex=await loader.loadAsync(`process/${name}-projection.png`);tex.colorSpace=T.SRGBColorSpace;
   const pixelsPerUnit=428.5/(4000/28.5),pt=(px,py)=>{const z=631.578947368421+(966.5-py)/pixelsPerUnit,s=(px-center)/pixelsPerUnit,face=31.578947368421-(z-631.578947368421)*.039;return axis==='x'?[s,-face,z]:[face,s,z];};
   const [x0,y0,x1,y1]=box,ps=[...pt(x0,y0),...pt(x1,y0),...pt(x0,y1),...pt(x1,y1)];
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(ps,3));g.setAttribute('uv',new T.Float32BufferAttribute([0,1,1,1,0,0,1,0],2));g.setIndex([0,2,1,1,2,3]);g.computeVertexNormals();
   const mat=new T.MeshBasicMaterial({map:tex,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide,toneMapped:false});const mesh=new T.Mesh(g,mat);mesh.visible=false;this.scene.add(mesh);this.planes.push(mesh);
  }
  const p=[];for(const l of this.config.lines)for(let i=1;i<l.points.length;i++)p.push(...l.points[i-1],...l.points[i]);const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));this.lines=new T.LineSegments(geo,new T.LineBasicMaterial({color:'#8cdbdf',transparent:true,opacity:0,depthWrite:false,toneMapped:false}));this.lines.visible=false;this.scene.add(this.lines);
  const ng=geo.clone();this.nodes=new T.Points(ng,new T.PointsMaterial({color:'#dcf7e9',size:1,transparent:true,opacity:0,depthWrite:false,sizeAttenuation:true,toneMapped:false}));this.scene.add(this.nodes);this.nodes.visible=false;
 }
 build(m){const T=this.T;this.root.position.set(...m.translation);this.module=m;const pos=m.meshes[0].geometry.attributes.position,stage=new Float32Array(pos.count),order=new Float32Array(pos.count),along=new Float32Array(pos.count);const lineMap=new Map(this.config.lines.map(l=>[l.partId,l.points]));
  for(const p of m.parts){const k=p.kind==='angle'?1:p.kind==='plate'?2:3;const z=(p.bounds[0][2]+p.bounds[1][2])/2,rank=clamp((z-631.92)/167.5),ends=lineMap.get(p.id);const span=p.bounds[1].map((x,i)=>x-p.bounds[0][i]);const axis=span.indexOf(Math.max(...span));let d,len2;if(ends){d=ends[1].map((x,i)=>x-ends[0][i]);len2=d.reduce((s,x)=>s+x*x,0);}
   for(let j=0;j<p.vertexCount;j++){const i=p.vertexStart+j;stage[i]=k;order[i]=rank;const world=[pos.getX(i)+m.translation[0],pos.getY(i)+m.translation[1],pos.getZ(i)+m.translation[2]];along[i]=ends?clamp(world.reduce((s,x,i)=>s+(x-ends[0][i])*d[i],0)/len2):clamp((world[axis]-p.bounds[0][axis])/Math.max(.0001,span[axis]));}
  }
  for(const original of m.meshes){const g=original.geometry.clone();g.setAttribute('processStage',new T.BufferAttribute(stage,1));g.setAttribute('processOrder',new T.BufferAttribute(order,1));g.setAttribute('processAlong',new T.BufferAttribute(along,1));const kind=original.material.userData.kind,hardware=kind==='hardware'||kind==='accessory';const mat=new T.MeshStandardMaterial({color:hardware?'#8c815b':kind==='plate'?'#9bb7c5':'#7897a9',metalness:hardware?.60:.53,roughness:hardware?.43:.36,envMapIntensity:hardware?.82:1,side:T.DoubleSide});
   mat.onBeforeCompile=s=>{s.uniforms.uProcessBuild=this.uniform;s.vertexShader='attribute float processStage;attribute float processOrder;attribute float processAlong;uniform float uProcessBuild;varying float vProcessProgress;varying float vProcessAlong;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvProcessProgress=clamp((uProcessBuild-processStage-processOrder*.35)/.65,0.0,1.0);vProcessAlong=processStage>2.5?.5:processAlong;');s.fragmentShader='varying float vProcessProgress;varying float vProcessAlong;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(vProcessProgress<0.0001||vProcessAlong>vProcessProgress)discard;');s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nfloat band=exp(-pow((vProcessAlong-vProcessProgress)/.028,2.0))*(1.0-step(.9999,vProcessProgress));totalEmissiveRadiance+=vec3(.2,.7,.75)*band*1.5;');};
   const mesh=new T.Mesh(g,mat);mesh.frustumCulled=false;this.root.add(mesh);
  }
 }
 camera(t){const q=smooth((t-18)/10),yaw=mix(-Math.PI/2,-.79,q),e=mix(0,.16,q),r=400;
  // Translate both camera and target along the camera's horizontal axis: the CAD stays fixed.
  // The right-hand composition persists through the match cut to the final module build.
  const offset=80*smoother((t-40.5)/1.5)*(1-smoother((t-60)/6)),right=[-Math.sin(yaw),Math.cos(yaw),0],look=[C[0]-right[0]*offset,C[1]-right[1]*offset,C[2]-9];
  return {look,eye:[look[0]+r*Math.cos(e)*Math.cos(yaw),look[1]+r*Math.cos(e)*Math.sin(yaw),look[2]+r*Math.sin(e)],fov:35};}
 set(t){const active=t>=8&&t<60;this.root.visible=t>=8&&t<66;this.lines.visible=this.nodes.visible=active;
  for(const p of this.planes){p.visible=active;p.material.opacity=smooth((t-16)/2)*(1-smooth((t-22)/5))*.85;}
  if(!active){this.uniform.value=4;return;}this.uniform.value=t<32?0:t<42?1+smooth((t-32)/9):t<50?2+smooth((t-42)/7):3+smooth((t-50)/8);
  const lp=smooth((t-20)/7);this.lines.geometry.setDrawRange(0,Math.floor(this.config.lines.length*lp)*2);this.nodes.geometry.setDrawRange(0,Math.floor(this.config.lines.length*lp)*2);this.lines.material.opacity=.82*lp*(1-.9*smooth((t-32)/10));this.nodes.material.opacity=.45*lp*(1-smooth((t-32)/5));
  this.state.stage=t<24?0:t<32?1:t<42?2:t<50?3:4;this.state.visibleEntities=t<32?0:t<42?76:t<50?132:1672;
 }
 sheet(c,t){const op=smooth((t-8)/.8)*(1-smooth((t-16)/2.4));if(!op)return;c.save();c.globalAlpha=op;c.fillStyle='#07121e';c.fillRect(0,60,W,960);
  const z=smooth((t-10.5)/5),sx=mix(0,180,z),sy=mix(0,215,z),sw=mix(1800,1600,z),sh=mix(1271.5,785,z);const scale=Math.min(1690/sw,795/sh),w=sw*scale,h=sh*scale,x=(W-w)/2,y=148+(795-h)/2;
  c.shadowColor='#0009';c.shadowBlur=35;c.drawImage(this.paper,sx*2,sy*2,sw*2,sh*2,x,y,w,h);c.shadowBlur=0;corners(c,x-6,y-6,w+12,h+12,'#709cac');
  const boxes=[[200,431,376,564,'正视 / 侧视','#68b9cb'],[576,430,276,565,'','#68b9cb'],[855,431,315,545,'断面关系','#bc9861'],[1520,21,259,602,'构件明细','#bc9861']];
  c.save();c.beginPath();c.rect(x,y,w,h);c.clip();boxes.forEach(([bx,by,bw,bh,label,col],i)=>{const q=smooth((t-10.2-i*.5)/.9);if(!q)return;c.save();c.globalAlpha*=q*.8;const xx=x+(bx-sx)*scale,yy=y+(by-sy)*scale,ww=bw*scale,hh=bh*scale;corners(c,xx,yy,ww,hh,col);if(label){c.fillStyle='#102839';c.fillRect(xx,yy,126,27);text(c,label,xx+63,yy+19,14,'#d4e7e9');}c.restore();});
  const scan=(t-8)/10,yy=y+scan*h;const g=c.createLinearGradient(0,yy-55,0,yy+12);g.addColorStop(0,'#5ccacc00');g.addColorStop(.8,'#5ccacc30');g.addColorStop(1,'#5ccacc00');c.fillStyle=g;c.fillRect(x,yy-55,w,67);c.restore();c.restore();
 }
 detail(renderer,c,scene,t,project){
  if(t<42||t>=60)return;
  // Each return from a connection study establishes its own node before the inset pulls out.
  const start=t<50?42:50,end=t<50?50:60,local=t-start,fade=1-smooth((t-(end-.6))/.6),lock=smooth((local-.18)/.42),pull=smoother((local-.55)/.85),unfold=smoother((local-1.0)/1.0),settled=smooth((local-1.65)/.45),x=110,y=310,w=570,h=456;
  if(!lock||!fade)return;
  const p=project([31,-30,675.5]),dock=[x+w+18,y+h*.55],elbow=[x+w+94,dock[1]],path=[p,[p[0]-58,p[1]],elbow,dock];
  c.save();c.globalAlpha=fade*lock;
  // A restrained lock ring and moving luminous tip make the magnification originate on the model.
  c.strokeStyle='#92d8d1';c.lineWidth=1.2;c.beginPath();c.arc(p[0],p[1],9+10*(1-lock),0,Math.PI*2);c.stroke();
  c.strokeStyle='#4a7f8c';c.beginPath();c.arc(p[0],p[1],18,-Math.PI*.25+local*.35,Math.PI*1.05+local*.35);c.stroke();
  line(c,[[p[0]-4,p[1]],[p[0]+4,p[1]]],'#dcf7e9',1);line(c,[[p[0],p[1]-4],[p[0],p[1]+4]],'#dcf7e9',1);
  const tip=trace(c,path,pull,'#527d8a',1.1);c.fillStyle='#b6f2e2';c.shadowColor='#67dddb';c.shadowBlur=11;c.beginPath();c.arc(tip[0],tip[1],2.6,0,Math.PI*2);c.fill();c.shadowBlur=0;
  if(unfold<=0){c.restore();return;}
  if(!this.detailCamera){this.detailCamera=new this.T.PerspectiveCamera(39,1.25,.08,6000);this.detailCamera.up.set(0,0,1);this.detailCamera.position.set(48.3,-47.3,681);this.detailCamera.lookAt(31,-30,675.5);}
  renderer.setViewport(0,0,700,560);renderer.setScissor(0,0,700,560);renderer.setScissorTest(true);renderer.render(scene,this.detailCamera);
  const cx=mix(dock[0],x+w/2,unfold),cy=mix(dock[1],y+h/2,unfold),ww=w*unfold,hh=h*unfold,xx=cx-ww/2,yy=cy-hh/2;
  c.globalAlpha*=smooth(unfold/.24);c.shadowColor='#0009';c.shadowBlur=26;c.fillStyle='#102432';c.fillRect(xx-2,yy-2,ww+4,hh+4);c.shadowBlur=0;
  c.save();c.beginPath();c.rect(xx,yy,ww,hh);c.clip();c.drawImage(renderer.domElement,0,H-560,700,560,xx,yy,ww,hh);
  if(unfold<1){const sy=yy+hh*unfold,g=c.createLinearGradient(0,sy-26,0,sy+5);g.addColorStop(0,'rgba(126,230,225,0)');g.addColorStop(1,'rgba(126,230,225,.22)');c.fillStyle=g;c.fillRect(xx,sy-26,ww,31);line(c,[[xx,sy],[xx+ww,sy]],'#baf3e6',1.3);}c.restore();
  corners(c,xx-7,yy-7,ww+14,hh+14,'#83b3bd');c.globalAlpha*=settled;
  text(c,'节点放大',x,y-36,22,'#d7e8eb','left');text(c,t<50?'NODE PLATE / CONNECTION':'FASTENER / CONNECTION',x+w,y-36,11,'#6f9aa8','right');
  text(c,t<50?'板件轮廓 / 孔组 / 贴合关系':'螺栓 / 垫圈 / 螺母 / 垫片',x,y+h+38,15,'#89a8b8','left');
  line(c,[[x,y+h+65],[x+w,y+h+65]],'#244652',1);line(c,[[x,y+h+65],[x+72,y+h+65]],'#6ca9aa',1.5);c.restore();
  renderer.setScissorTest(false);renderer.setViewport(0,0,W,H);
 }
 overlay(c,t,project){if(t<8||t>=60)return;this.sheet(c,t);const stage=this.state.stage,labels=['整套图纸','单线骨架','角钢生成','节点板生成','紧固件装配'];c.save();c.fillStyle='#040a10';c.fillRect(0,0,W,60);text(c,'STRUCTURE / CINEMA',84,38,11,'#8aa7b8','left');
  labels.forEach((s,i)=>{const x=500+i*230;c.fillStyle=i<=stage?'#a3dfd5':'#355361';c.beginPath();c.arc(x,102,3,0,Math.PI*2);c.fill();text(c,s,x+15,108,15,i===stage?'#e6f1f1':i<stage?'#8ab8bc':'#597584','left');if(i<4)line(c,[[x+130,102],[x+205,102]],i<stage?'#608b93':'#263f4e');});
  const captions=t<16?['一套图纸，交织着整座模块的关系','密集标注 / 多个视图 / 构件明细']:t<24?['把不同视图，映射到同一个空间','同一根构件，出现在正视、侧视与断面之中']:t<32?['从一整套图纸，提取空间骨架','每处尺寸、每个交点，都要在空间中相互对应']:t<42?['让每条结构线，长出真实角钢','截面、朝向与端部几何，共同决定连接面']:t<50?['节点板逐步生成，连接关系逐步清晰','轮廓、孔组与贴合层次，都要相互对应']:['紧固件逐组生成，完成模块构造','螺栓 / 垫圈 / 螺母 / 垫片'];
  const gg=c.createLinearGradient(0,820,0,1020);gg.addColorStop(0,'rgba(3,10,17,0)');gg.addColorStop(1,'rgba(3,10,17,.96)');c.fillStyle=gg;c.fillRect(0,820,W,200);
  text(c,captions[0],W/2,932,33,'#dce9ed');text(c,captions[1],W/2,978,17,'#84a7b8');
  if(t>=24){text(c,'MODULE 06',130,174,12,'#7a9eae','left');text(c,stage===1?'76 条构件参考线':stage===2?'76 件角钢':stage===3?'加入 56 件板件':'1,672 个实体逐步成形',130,208,18,'#a8c8cf','left');}
  // Short annotation evidence remains adjacent to the building, not in explanatory slides.
  if(t>=33&&t<39){const point=project([30.25,30.24,710.8]),a=smooth((t-33)/.6)*(1-smooth((t-38)/1));c.globalAlpha=a;line(c,[point,[point[0]+90,point[1]-50],[point[0]+245,point[1]-50]],'#a1d5d1');text(c,'602 / L100 × 8',point[0]+100,point[1]-65,18,'#ddc58d','left');}
  c.restore();
 }
}
window.ProcessFilm={create:async(T,scene)=>{const d=new Director(T,scene);await d.load();return d;}};
})();
