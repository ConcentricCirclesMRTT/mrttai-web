/* A deterministic, real-geometry film. Presentation transforms never change source data. */
(()=>{'use strict';
const $=id=>document.getElementById(id),W=1920,H=1080,DURATION=192,FPS=30;
const output=$('screen'),ctx=output.getContext('2d',{alpha:false}),models=[],materials=[],partMap=new Map();
// The same cover and fixed-font brand used in the MP4 remain part of the rendered canvas.
const brandCover=new Image();
brandCover.src='cover-background-v20.png?v=v25-continuous-20261101';
function brandFrame(t){
 ctx.save();ctx.globalCompositeOperation='source-over';ctx.filter='none';ctx.globalAlpha=1;
 if(t<1){ctx.globalAlpha=t<=.8?1:(1-t)/.2;ctx.drawImage(brandCover,0,0,W,H);
  spaced('MEIRI TONGTAI',138,267,20,'#bed0d9',8);
  ctx.fillStyle='#c5ad7e';ctx.fillRect(138,287,62,2);
  ctx.font='300 26px "PingFang SC",sans-serif';ctx.fillStyle='#dce9ee';ctx.fillText('每日仝泰',138,359);
  ctx.font='300 86px "PingFang SC",sans-serif';const gold=ctx.createLinearGradient(0,385,0,485);gold.addColorStop(0,'#fff0cc');gold.addColorStop(1,'#bd9358');ctx.fillStyle=gold;ctx.fillText('仝心圆',138,476);
  precisionTitle(132,660,64,0);ctx.fillStyle='#d4b680';ctx.fillRect(138,694,62,2);
  ctx.font='300 26px "PingFang SC",sans-serif';ctx.fillStyle='#dce9ee';ctx.fillText('从二维蓝图，到三维CAD模型',138,748);
  ctx.globalAlpha=1;
 }
 ctx.fillStyle='rgba(1,6,11,.98)';ctx.fillRect(1450,0,470,60);
 spaced('每日仝泰 / 仝心圆',W-84,38,16,'#658594',2,'right');ctx.restore();
}

// Native type guarantees the uncommon brand character 仝 and identical 26px cover labels.
function precisionTitle(x,y,size,t){
 ctx.save();ctx.font=`300 ${size}px "PingFang SC",sans-serif`;ctx.textAlign='left';
 const prefix='AI',lead=ctx.measureText(prefix).width,px=x+lead,pw=ctx.measureText('100%').width,q=Math.max(0,Math.min(1,(t-1.1)/2.3)),pulse=t>1&&t<4.1?Math.sin(Math.PI*q):0;
 ctx.fillStyle='#e5eff2';ctx.fillText(prefix,x,y);
 const shimmer=ctx.createLinearGradient(px-80+q*(pw+160),0,px+q*(pw+160),0);
 shimmer.addColorStop(0,'#d4b276');shimmer.addColorStop(.48,'#fff3c9');shimmer.addColorStop(1,'#d9b780');
 ctx.fillStyle=t===0?'#ebcd96':shimmer;ctx.shadowColor='#e9c781';ctx.shadowBlur=8+18*pulse;ctx.fillText('100%',px,y);
 ctx.shadowBlur=0;ctx.fillStyle='#e5eff2';ctx.fillText('精准建模',px+pw,y);
 if(t>1&&t<4.1){ctx.globalAlpha*=.5*pulse;const gl=ctx.createLinearGradient(px-20,0,px+pw+20,0);gl.addColorStop(0,'#e9c78100');gl.addColorStop(.5,'#fff3c9');gl.addColorStop(1,'#e9c78100');ctx.fillStyle=gl;ctx.fillRect(px-20,y+13,pw+40,1.4);}
 ctx.restore();
}

function showLoadFailure(message){$('loading').hidden=false;$('loading').classList.add('failed');$('loadStatus').textContent=message;$('studioStatus').textContent='实时画面暂未准备完成；可以重新载入，或观看完整影片。';$('loadRecovery').hidden=false;document.body.dataset.error=message;}
$('retryStudio').onclick=()=>window.location.reload();
if(!window.THREE||!ctx){showLoadFailure('当前浏览器无法准备三维画面。');return;}
window.addEventListener('error',()=>{if(!ready)showLoadFailure('三维画面载入失败，请重新载入或观看完整影片。');});
const v=a=>new THREE.Vector3(...a),mix=(a,b,t)=>a+(b-a)*t,clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);},smoother=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
const lerp=(a,b,t)=>a.map((x,i)=>mix(x,b[i],t));
let processDirector=null;
let ready=false,playing=false,playStart=0,playFrom=0,current=0,raf=0;
const legacyChapters=[{"t": 0, "end": 8, "name": "结构之美", "title": "构造之间", "en": "FROM DRAWING TO STRUCTURE"}, {"t": 8, "end": 19, "name": "图纸解构", "title": "每一道线，都定义着结构", "en": "READ THE DRAWING"}, {"t": 19, "end": 28, "name": "空间线架", "title": "让平面关系，进入三维空间", "en": "LIFTING IDEAS INTO SPACE"}, {"t": 28, "end": 38, "name": "角钢截面", "title": "线有了截面，结构有了形体", "en": "FROM LINE TO ANGLE STEEL"}, {"t": 38, "end": 48, "name": "总装生成", "title": "由构件，到完整结构", "en": "ASSEMBLED AS ONE"}, {"t": 48, "end": 55, "name": "进入连接", "title": "跨越尺度，抵达连接", "en": "A JOURNEY ACROSS SCALES"}, {"t": 55, "end": 72, "name": "360° 节点环绕", "title": "一处拼接，连接上下主材", "en": "WHERE MEMBERS MEET"}, {"t": 72, "end": 80, "name": "沿结构上升", "title": "沿着结构，向上延伸", "en": "FOLLOW THE STRUCTURE"}, {"t": 80, "end": 87, "name": "连接的秩序", "title": "每一处连接，承接结构的力量", "en": "THE ORDER OF CONNECTION"}, {"t": 87, "end": 96, "name": "从图纸到结构", "title": "从图纸，到结构", "en": "FROM DRAWING TO STRUCTURE"}];
const camera=new THREE.PerspectiveCamera(35,W/H,.08,6000);camera.up.set(0,0,1);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance',logarithmicDepthBuffer:true});renderer.setPixelRatio(1);renderer.setSize(W,H,false);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
const scene=new THREE.Scene();scene.background=new THREE.Color('#07121e');scene.fog=new THREE.FogExp2('#07121e',.00016);
const hemi=new THREE.HemisphereLight('#dbf2ff','#263641',.8);scene.add(hemi);
const key=new THREE.DirectionalLight('#deefff',1.5);key.position.set(500,-800,1200);scene.add(key);
const rim=new THREE.DirectionalLight('#65bcd2',1.2);rim.position.set(-600,600,800);scene.add(rim);
const warm=new THREE.DirectionalLight('#ffe1b0',.55);warm.position.set(500,100,400);scene.add(warm);
const cameraLight=new THREE.DirectionalLight('#f0f5ff',.35);scene.add(cameraLight,cameraLight.target);
const env=new THREE.Scene();env.add(new THREE.Mesh(new THREE.BoxGeometry(40,40,40),new THREE.MeshBasicMaterial({color:'#243a4c',side:THREE.BackSide})));
for(const [pos,size,color] of [[[0,16,0],[25,2,30],'#b6d5e9'],[[19,0,2],[1,18,22],'#dbe8ef'],[[-19,0,4],[1,10,24],'#4c97b1'],[[0,-19,4],[16,1,12],'#cbad7b']]){const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshBasicMaterial({color}));mesh.position.set(...pos);env.add(mesh);}
const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(env,.035,.1,100).texture;pmrem.dispose();
const floor=new THREE.Mesh(new THREE.CircleGeometry(390,128),new THREE.MeshStandardMaterial({color:'#101e2a',metalness:.28,roughness:.78}));floor.position.z=-12;scene.add(floor);
const grid=new THREE.GridHelper(680,40,'#36556a','#1b394b');grid.rotation.x=Math.PI/2;grid.position.z=-11.9;grid.material.transparent=true;grid.material.opacity=.24;grid.material.depthWrite=false;scene.add(grid);
const rings=[];for(const radius of [155,225,315]){const m=new THREE.Mesh(new THREE.RingGeometry(radius,radius+.55,160),new THREE.MeshBasicMaterial({color:'#547f8d',transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide}));m.position.z=-11.7;scene.add(m);rings.push(m);}
const uniforms={reveal:{value:2000},scan:{value:-100},scanPower:{value:0},edge:{value:0},scanWidth:{value:7},lower:{value:-10000}};
let referenceLines=null,referenceOriginal=null,referenceNodes=null,memberRoot=null,memberMesh=null,memberEdge=null,memberLine=null;
// Legacy component details are retained for source-linked connection shots.
const drawingCrops=[
 {url:'assets/evidence/m6-detail-618-1.webp',title:'角钢 / 618',subtitle:'截面 · 排孔 · 长度'},
 {url:'assets/evidence/m8-detail-820-1.webp',title:'外贴板 / 820',subtitle:'轮廓 · 厚度 · 孔位'},
 {url:'assets/evidence/m6-detail-637-1.webp',title:'垫板 / 637',subtitle:'尺寸 · 孔径 · 层次'}
].map(entry=>{const image=new Image();image.src='../'+entry.url;return {...entry,image,ink:null};});
let drawingLinework=[];
const schematicBounds={minX:-400,maxX:400,minZ:0,maxZ:1100};
let profileConfig=null,memberAxis=[],memberCenter=[],memberEnds=[],sectionCap=null;
function makeBlueprint(){for(const crop of drawingCrops){const c=document.createElement('canvas');c.width=crop.image.naturalWidth;c.height=crop.image.naturalHeight;const dc=c.getContext('2d');dc.drawImage(crop.image,0,0);const pixels=dc.getImageData(0,0,c.width,c.height);for(let i=0;i<pixels.data.length;i+=4){const ink=1-pixels.data[i]/255;pixels.data[i]=141;pixels.data[i+1]=228;pixels.data[i+2]=228;pixels.data[i+3]=Math.round(ink*255);}dc.putImageData(pixels,0,0);crop.ink=c;}}
function buildMember(m,raw){const p=m.parts.find(p=>p.id===profileConfig.partId);if(!p)return;const q=new Uint16Array(raw,p.stream.p,p.vertexCount*3),pos=new Float32Array(p.vertexCount*3),matrix=new THREE.Matrix4().fromArray(profileConfig.worldToLocalMatrix4);for(let i=0;i<p.vertexCount;i++){const pt=v([0,1,2].map(k=>p.min[k]+q[i*3+k]*p.step[k]+m.translation[k])).applyMatrix4(matrix);pos.set(pt.toArray(),i*3);}const ix=p.stream.width===2?new Uint16Array(raw,p.stream.i,p.indexCount):new Uint32Array(raw,p.stream.i,p.indexCount),geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setIndex(new THREE.BufferAttribute(new Uint32Array(ix),1));geo.computeVertexNormals();geo.computeBoundingBox();memberRoot=new THREE.Group();memberRoot.position.set(-1.7544,-1.7544,500);scene.add(memberRoot);memberMesh=new THREE.Mesh(geo,baseMat(6,'angle'));memberRoot.add(memberMesh);
 // This face is a plane/mesh section of the actual long angle; the body remains the original mesh.
 const shape=new THREE.Shape();profileConfig.polygon.forEach((p,i)=>i?shape.lineTo(...p):shape.moveTo(...p));shape.closePath();sectionCap=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshStandardMaterial({color:'#bdced7',metalness:.76,roughness:.27,envMapIntensity:1.1,side:THREE.DoubleSide}));sectionCap.position.z=.001;memberRoot.add(sectionCap);memberEdge=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(profileConfig.polygon.map(p=>v([...p,.004]))),new THREE.LineBasicMaterial({color:'#a9eee3',transparent:true,opacity:.7,depthWrite:false,toneMapped:false}));memberRoot.add(memberEdge);memberRoot.visible=false;
}
const state={camera:null,explode:0,chapter:0,loaded:0,renderedFrames:0,entities:0};
// Display-only light field: no source geometry is changed.
const fxRoot=new THREE.Group();scene.add(fxRoot);
let randomSeed=21731;const seeded=()=>{randomSeed=(randomSeed*1664525+1013904223)>>>0;return randomSeed/4294967296;};
const dustBase=new Float32Array(260*3),dustPos=new Float32Array(260*3);
for(let i=0;i<260;i++){const a=seeded()*Math.PI*2,r=100+seeded()*330;dustBase.set([Math.cos(a)*r,Math.sin(a)*r,seeded()*1120],i*3);}
const dustGeometry=new THREE.BufferGeometry();dustGeometry.setAttribute('position',new THREE.BufferAttribute(dustPos,3));
const dustMaterial=new THREE.PointsMaterial({color:'#90ddd7',size:3.2,transparent:true,opacity:.2,blending:THREE.AdditiveBlending,depthWrite:false,sizeAttenuation:true});
const dust=new THREE.Points(dustGeometry,dustMaterial);dust.frustumCulled=false;fxRoot.add(dust);
const scanRing=new THREE.Mesh(new THREE.TorusGeometry(1,.025,8,180),new THREE.MeshBasicMaterial({color:'#7ceee0',transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));fxRoot.add(scanRing);
const scanTextureCanvas=document.createElement('canvas');scanTextureCanvas.width=scanTextureCanvas.height=256;const stc=scanTextureCanvas.getContext('2d');const stg=stc.createRadialGradient(128,128,10,128,128,128);stg.addColorStop(0,'rgba(80,220,210,0)');stg.addColorStop(.75,'rgba(80,220,210,0.035)');stg.addColorStop(.93,'rgba(100,245,225,0.14)');stg.addColorStop(1,'rgba(80,220,210,0)');stc.fillStyle=stg;stc.fillRect(0,0,256,256);const scanPlane=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(scanTextureCanvas),transparent:true,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,depthWrite:false}));fxRoot.add(scanPlane);
const flightCurve=new THREE.CatmullRomCurve3([v([65,-60,435.53754873]),v([60,-65,495]),v([48,-53,559]),v([42,-45,635])]);
const flightGeometry=new THREE.BufferGeometry().setFromPoints(flightCurve.getPoints(100));
const flightLine=new THREE.Line(flightGeometry,new THREE.LineBasicMaterial({color:'#75e7d6',transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));fxRoot.add(flightLine);
const flightSpark=new THREE.Mesh(new THREE.SphereGeometry(.65,12,8),new THREE.MeshBasicMaterial({color:'#e3ffef',transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));fxRoot.add(flightSpark);
const glowCanvas=document.createElement('canvas');glowCanvas.width=384;glowCanvas.height=216;const glowContext=glowCanvas.getContext('2d',{willReadFrequently:true});
function legacyCinematicFX(t){
 const wide=(t<48||t>87)&&!(t>=28&&t<38);dustMaterial.opacity=wide?.28:0;dust.visible=wide;
 if(wide){for(let i=0;i<260;i++){dustPos[i*3]=dustBase[i*3]+Math.sin(t*.17+i*.7)*4;dustPos[i*3+1]=dustBase[i*3+1]+Math.cos(t*.13+i*.5)*4;dustPos[i*3+2]=(dustBase[i*3+2]+t*1.4)%1120;}dustGeometry.attributes.position.needsUpdate=true;}
 const scanning=t>=38&&t<44;scanRing.visible=scanPlane.visible=scanning;
 if(scanning){const z=uniforms.scan.value,r=mix(152,29,clamp(z/1030));scanRing.position.z=z;scanRing.scale.set(r,r,r);scanPlane.position.z=z;scanPlane.scale.set(r*1.4,r*1.4,1);scanRing.material.opacity=.75*Math.sin(Math.PI*clamp((t-38)/6));}
 const ascent=t>=72&&t<80,u=clamp((t-72)/8),envelope=Math.sin(Math.PI*u);flightLine.visible=flightSpark.visible=ascent;
 if(ascent){flightLine.material.opacity=envelope*.35;flightGeometry.setDrawRange(Math.max(0,Math.floor(u*100)-25),26);flightSpark.position.copy(flightCurve.getPoint(u));const cp=flightSpark.position.clone().applyMatrix4(camera.matrixWorldInverse),depth=-cp.z;flightSpark.visible=depth>camera.near*4;flightSpark.scale.setScalar(Math.min(1,Math.max(0,depth)*Math.tan(camera.fov*Math.PI/360)*17/H/.65));flightSpark.material.opacity=envelope*.7;}
 uniforms.edge.value=scanning?.6:t>=28&&t<38?.22:t>=55&&t<72?.12:.03;
}
function legacyCompositeFX(t){
 glowContext.drawImage(renderer.domElement,0,0,384,216);const pixels=glowContext.getImageData(0,0,384,216),d=pixels.data;
 for(let i=0;i<d.length;i+=4){const brightness=.21*d[i]+.72*d[i+1]+.07*d[i+2];d[i+3]=Math.round(clamp((brightness-130)/95)*185);}glowContext.putImageData(pixels,0,0);ctx.save();ctx.globalCompositeOperation='screen';ctx.filter='blur(9px)';ctx.globalAlpha=.34;ctx.drawImage(glowCanvas,0,0,W,H);ctx.filter='blur(25px)';ctx.globalAlpha=.14;ctx.drawImage(glowCanvas,0,0,W,H);ctx.restore();
 if(t>=55&&t<72){const q=smoother((t-55)/15),a=Math.min(smooth((t-55)/1.1),smooth((72-t)/1.1));ctx.save();ctx.globalAlpha=a*.75;const x=W-145,y=248,r=33;ctx.strokeStyle='#3d6977';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#dfc48d';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r,-Math.PI/2,-Math.PI/2+Math.PI*2*q);ctx.stroke();for(let i=0;i<24;i++){const a=i/24*Math.PI*2;ctx.strokeStyle=i/24<q?'#b0d4cf':'#294d5d';ctx.beginPath();ctx.moveTo(x+Math.cos(a)*(r+6),y+Math.sin(a)*(r+6));ctx.lineTo(x+Math.cos(a)*(r+10),y+Math.sin(a)*(r+10));ctx.stroke();}ctx.fillStyle='#e2d1ab';ctx.textAlign='center';ctx.font='400 13px monospace';ctx.fillText('360°',x,y+5);ctx.fillStyle='#7296a7';ctx.font='400 9px monospace';ctx.fillText('ORBIT',x,y+62);ctx.restore();}
 // Restrained peripheral streaks, tied to the logarithmic push rather than random flashes.
 if(t>=49&&t<54.5){const intensity=Math.pow(Math.sin(Math.PI*(t-49)/5.5),2);ctx.save();ctx.globalCompositeOperation='screen';ctx.lineWidth=1;for(let i=0;i<32;i++){const a=i*2.399963,r=650+(i%5)*60,phase=(t*.65+i*.173)%1;const len=45+phase*130;ctx.strokeStyle=`rgba(102,205,224,${intensity*.12*(1-phase)})`;ctx.beginPath();ctx.moveTo(960+Math.cos(a)*r,540+Math.sin(a)*r*.65);ctx.lineTo(960+Math.cos(a)*(r+len),540+Math.sin(a)*(r+len)*.65);ctx.stroke();}ctx.restore();}
}

function baseMat(module,kind){
 const color=kind==='hardware'?'#8c815b':kind==='plate'?'#8cabb8':kind==='accessory'?'#a5b9c0':'#7f9daa';
 const mat=new THREE.MeshStandardMaterial({color,metalness:kind==='hardware'?.60:.48,roughness:kind==='hardware'?.43:.39,envMapIntensity:.95,side:THREE.DoubleSide});
 mat.userData={base:new THREE.Color(color),kind,module};
 mat.onBeforeCompile=shader=>{shader.uniforms.uReveal=uniforms.reveal;shader.uniforms.uScan=uniforms.scan;shader.uniforms.uScanPower=uniforms.scanPower;shader.uniforms.uEdge=uniforms.edge;shader.uniforms.uScanWidth=uniforms.scanWidth;shader.uniforms.uLower=uniforms.lower;shader.vertexShader='varying float vFilmZ;varying vec3 vFilmN;varying vec3 vFilmV;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvFilmZ=(modelMatrix*vec4(transformed,1.0)).z;vFilmN=normalize(normalMatrix*objectNormal);vFilmV=normalize(-mvPosition.xyz);');shader.fragmentShader='varying float vFilmZ;uniform float uReveal;uniform float uLower;uniform float uScan;uniform float uScanPower;uniform float uEdge;uniform float uScanWidth;varying vec3 vFilmN;varying vec3 vFilmV;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(vFilmZ>uReveal||vFilmZ<uLower)discard;');shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(0.12,0.55,0.75)*exp(-pow((vFilmZ-uScan)/uScanWidth,2.0))*uScanPower;totalEmissiveRadiance+=vec3(0.12,0.56,0.66)*pow(1.0-abs(dot(normalize(vFilmN),normalize(vFilmV))),3.0)*uEdge;');};
 materials.push(mat);return mat;
}
async function readGeometry(spec){const arrays=[];for(const ch of spec.chunks){const r=await fetch('../'+ch.url);if(!r.ok)throw Error('无法载入实体资源');const bytes=await r.arrayBuffer();let raw;if(bytes.byteLength===ch.bytes)raw=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();else if(bytes.byteLength===ch.rawBytes)raw=bytes;else throw Error('模型分块长度不完整');if(raw.byteLength!==ch.rawBytes)throw Error('模型分块解码失败');arrays.push(new Uint8Array(raw));}const joined=new Uint8Array(spec.bytes);let at=0;for(const a of arrays){joined.set(a,at);at+=a.byteLength;}return joined.buffer;}
function build(m,raw){
 const pos=new Float32Array(m.geometry.vertices*3),norm=new Int16Array(m.geometry.vertices*3),indices=new Uint32Array(m.geometry.indices),groups=new Map();
 for(const p of m.parts){partMap.set(p.id,{...p,module:m.id});const n=p.vertexCount*3,q=new Uint16Array(raw,p.stream.p,n),ns=new Int16Array(raw,p.stream.n,n),ix=p.stream.width===2?new Uint16Array(raw,p.stream.i,p.indexCount):new Uint32Array(raw,p.stream.i,p.indexCount);for(let i=0;i<n;i++)pos[p.vertexStart*3+i]=p.min[i%3]+q[i]*p.step[i%3];norm.set(ns,p.vertexStart*3);for(let i=0;i<ix.length;i++)indices[p.indexStart+i]=ix[i]+p.vertexStart;const side=m.id===3?(p.bounds[0][0]+p.bounds[1][0]<0?-1:1):0,k=p.kind+'|'+side;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(p);}
 const root=new THREE.Group();root.position.set(...m.translation);scene.add(root);m.root=root;m.meshes=[];const pa=new THREE.BufferAttribute(pos,3),na=new THREE.BufferAttribute(norm,3,true);
 for(const [k,ps] of groups){const ix=new Uint32Array(ps.reduce((n,p)=>n+p.indexCount,0));let at=0;const bb=new THREE.Box3();for(const p of ps){ix.set(indices.subarray(p.indexStart,p.indexStart+p.indexCount),at);at+=p.indexCount;bb.expandByPoint(v(p.bounds[0]));bb.expandByPoint(v(p.bounds[1]));}bb.translate(v(m.translation).negate());const g=new THREE.BufferGeometry();g.setAttribute('position',pa);g.setAttribute('normal',na);g.setIndex(new THREE.BufferAttribute(ix,1));g.boundingBox=bb;g.boundingSphere=bb.getBoundingSphere(new THREE.Sphere());const [kind,side]=k.split('|');const mesh=new THREE.Mesh(g,baseMat(m.id,kind));mesh.userData.side=Number(side);root.add(mesh);m.meshes.push(mesh);}
 models.push(m);state.entities+=m.parts.length;if(m.id===6){buildMember(m,raw);processDirector.build(m);}buildConnection(m,raw);
}
function spline(points,u){const curve=new THREE.CatmullRomCurve3(points.map(v),false,'centripetal');return curve.getPoint(clamp(u)).toArray();}
function orbit(target,radius,yaw,elevation){return [target[0]+radius*Math.cos(elevation)*Math.cos(yaw),target[1]+radius*Math.cos(elevation)*Math.sin(yaw),target[2]+radius*Math.sin(elevation)];}
// Deliberate match cuts at 28s and 38s move between the topology and the actual source member.
function legacyCameraAt(t){let eye,look,fov=36;
 const hero=[52.62286435,-52.60549844,438.94484873],orbitStart=-.7853981633974483,orbitRadius=16.4,orbitElevation=.258;
 if(t<9.2){const u=smoother(t/8),yaw=mix(-1.14,-.84,u);look=[-Math.sin(-yaw)*270,-Math.cos(yaw)*270,500];eye=orbit(look,mix(2160,2050,u),yaw,.13);fov=34;}
 else if(t<19){look=[0,0,500];eye=orbit(look,2050,-Math.PI/2,.035);fov=35;}
 else if(t<28){const u=smoother((t-19)/9);look=[0,0,500];eye=orbit(look,mix(2050,2010,u),mix(-Math.PI/2,-.62,u),mix(.035,.19,u));fov=35;}
 else if(t<38){const u=smoother((t-30.4)/6.6),yaw=mix(.78,1.1,u),depth=mix(.105,profileConfig.maxDepth,u),radius=Math.exp(mix(Math.log(9.8),Math.log(82),u)),shift=radius*.18;look=[Math.sin(yaw)*shift,-Math.cos(yaw)*shift,500-depth*.43];eye=orbit(look,radius,yaw,mix(1.18,.3,u));fov=35;}
 else if(t<48){const u=smoother((t-44)/4);look=[0,0,mix(575,500,u)];eye=orbit(look,mix(2450,1980,u),mix(-.95,-.963,u),.16);fov=36;}
 else if(t<55){
 // One continuous camera path: descend through the complete splice and curve back into the original orbit.
 // A strictly decreasing logarithmic radius keeps forward motion throughout the overview; no intermediate holds.
 const u=clamp((t-48)/7),q=smoother(u),aim=smoother(1-Math.pow(1-u,2));
 look=lerp([0,0,500],hero,aim);look[2]-=16*Math.pow(Math.sin(Math.PI*u),4);
 const radius=Math.exp(mix(Math.log(1980),Math.log(orbitRadius),q));
 eye=orbit(look,radius,mix(-.963,orbitStart,q),mix(.16,orbitElevation,q));fov=36+2*q;
 }
 else if(t<70){const s=smoother((t-55)/15);look=hero;eye=orbit(look,orbitRadius,orbitStart+Math.PI*2*s,orbitElevation);fov=38;}
 else if(t<72){const s=smoother((t-70)/2);look=hero;eye=orbit(look,mix(orbitRadius,21.2,s),orbitStart,orbitElevation);fov=mix(38,39,s);}
 else if(t<80){const u=smooth((t-72)/8);eye=spline([orbit(hero,21.2,orbitStart,orbitElevation),[74,-74,465],[62,-62,548],[55,-65,619]],u);look=spline([hero,[49.5,-49.5,480],[40,-40,568],[32,-32,628]],u);fov=39+4*Math.sin(Math.PI*u)+2*u;}
 else if(t<87){const u=smooth((t-80)/7);eye=spline([[55,-65,619],[170,-170,755],[40,-188,805],[-175,-155,785]],u);look=spline([[32,-32,628],[80,0,746],[0,0,748],[-85,0,748]],u);fov=mix(41,40,u);}
 else{const s=smoother((t-87)/5),u=smoother((t-92)/4),endLook=[-230,-180,500];look=lerp([-85,0,748],endLook,s);eye=lerp([-175,-155,785],orbit(endLook,mix(2050,2170,u),mix(-.8,-.95,u),.15),s);fov=mix(40,34,s);}
 return {eye,look,fov};
}
function explodeAt(t){return t<38||t>=48?0:t<43?.8:t<44?.8: .8*(1-smoother((t-44)/4));}
function legacyEffects(t){
 const explode=explodeAt(t);state.explode=explode;
 for(const m of models){const parent=m.id<3?4:m.id===3?6:m.id;m.root.visible=!(t>=9&&t<38);m.root.position.set(...m.translation);m.root.position.z+=(9-parent)*32*explode;if(m.id<3)m.root.position.x+=(m.id===1?-1:1)*155*explode;for(const mesh of m.meshes)mesh.position.x=mesh.userData.side*150*explode;}
 const gold=t>=48&&t<87?1:0;for(const mat of materials){mat.color.copy(mat.userData.base);if(mat.userData.kind==='hardware'){mat.color.lerp(new THREE.Color('#91825b'),gold);mat.emissive.set('#3c3828');mat.emissiveIntensity=gold*.04;}else{mat.emissive.set('#000000');mat.emissiveIntensity=0;}}
 uniforms.lower.value=-10000;uniforms.scanWidth.value=7;uniforms.reveal.value=t>=38&&t<44?mix(-30,1280,smooth((t-38)/6)):2000;uniforms.scan.value=t>=38&&t<44?uniforms.reveal.value:-100;uniforms.scanPower.value=t>=38&&t<44?2.8:0;
 if(memberRoot){memberRoot.visible=t>=28&&t<38;memberRoot.rotation.z=0;if(memberRoot.visible){const u=smoother((t-30.4)/6.6),depth=mix(.105,profileConfig.maxDepth,u);uniforms.lower.value=500-depth;uniforms.reveal.value=500.0015;uniforms.scanWidth.value=.08;uniforms.scan.value=uniforms.lower.value;uniforms.scanPower.value=1.15;memberEdge.material.opacity=.72*(1-smooth((t-32.5)/2.5));memberEdge.geometry.setDrawRange(0,Math.ceil(profileConfig.polygon.length*smooth((t-28)/1.5)));}}
 if(referenceLines){referenceLines.visible=(t>=18&&t<28)||(t>=38&&t<44);const flat=1-smoother((t-20)/5),topology=t<28;referenceLines.material.opacity=topology?.85*smooth((t-18)/1.5):.2*(1-smooth((t-38)/6));referenceLines.geometry.setDrawRange(0,topology?Math.floor(referenceOriginal.length/6*smooth((t-18.4)/3.5))*2:Infinity);const pa=referenceLines.geometry.attributes.position;for(let i=0;i<pa.array.length;i+=3){pa.array[i]=referenceOriginal[i];pa.array[i+1]=referenceOriginal[i+1]*(1-flat);pa.array[i+2]=referenceOriginal[i+2];}pa.needsUpdate=true;referenceNodes.visible=topology&&t>=20;referenceNodes.material.opacity=.8*smooth((t-20)/2)*(1-smooth((t-26.5)/1.5));const np=referenceNodes.geometry.attributes.position;for(let i=0;i<np.array.length;i+=3){np.array[i]=referenceOriginal[i];np.array[i+1]=referenceOriginal[i+1]*(1-flat);np.array[i+2]=referenceOriginal[i+2];}np.needsUpdate=true;}
 scene.fog.density=t>=48&&t<87?.000055:.00012;floor.visible=grid.visible=!(t>=28&&t<38);for(let i=0;i<rings.length;i++){rings[i].visible=floor.visible;rings[i].material.opacity=.14+.04*Math.sin(t*.4+i);}
}
function spaced(text,x,y,size,color,spacing=3,align='left'){ctx.font=`500 ${size}px -apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif`;ctx.fillStyle=color;const widths=[...text].map(c=>ctx.measureText(c).width);const width=widths.reduce((a,b)=>a+b,0)+(text.length-1)*spacing;if(align==='right')x-=width;for(let i=0;i<text.length;i++){ctx.fillText(text[i],x,y);x+=widths[i]+spacing;}return width;}
function frameCorners(x,y,w,h,color){ctx.strokeStyle=color;ctx.lineWidth=1.5;for(const [a,b,sx,sy] of [[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]]){ctx.beginPath();ctx.moveTo(a+sx*22,b);ctx.lineTo(a,b);ctx.lineTo(a,b+sy*22);ctx.stroke();}}
function drawingRect(t){const u=smoother((t-15.4)/4);return {x:mix(970,510,u),y:mix(224,165,u),w:mix(780,900,u),h:mix(620,690,u)};}
function diagramPoint(point,t){const r=drawingRect(t),b=schematicBounds,scale=Math.min(r.w/(b.maxX-b.minX),r.h/(b.maxZ-b.minZ));return [r.x+r.w/2+(point[0]-(b.minX+b.maxX)/2)*scale,r.y+r.h/2- (point[2]-(b.minZ+b.maxZ)/2)*scale];}
function drawingSequence(t){if(t<7.8||t>20.5)return;const fade=smooth((t-7.8)/1.3)*(1-smooth((t-18.4)/2.1)),digital=smooth((t-10.4)/3.7),lift=smoother((t-15.4)/4);ctx.save();ctx.globalAlpha=fade;ctx.fillStyle='#06131f';ctx.fillRect(0,60,W,H-120);ctx.beginPath();ctx.rect(0,60,W,H-120);ctx.clip();
 ctx.strokeStyle='#112d3c';ctx.lineWidth=.8;for(let i=0;i<34;i++){ctx.beginPath();ctx.moveTo(i*60,60);ctx.lineTo(i*60,H-60);ctx.stroke();}for(let i=0;i<16;i++){ctx.beginPath();ctx.moveTo(0,60+i*60);ctx.lineTo(W,60+i*60);ctx.stroke();}
 ctx.save();ctx.globalAlpha*=1-lift;spaced('DRAWING FRAGMENTS / SPATIAL RELATIONSHIPS',98,148,12,'#9acaca',2.5);ctx.font='300 44px "PingFang SC",sans-serif';ctx.fillStyle='#e3eff1';ctx.fillText('从构件的细节，读懂结构。',94,217);ctx.font='300 17px "PingFang SC",sans-serif';ctx.fillStyle='#8aabb8';ctx.fillText('局部图纸 · 尺寸与孔位的可视化阅读',98,259);
 drawingCrops.forEach((crop,i)=>{const x=98+i*268,y=322,w=238,h=456,appear=smooth((t-8.1-i*.18)/1);ctx.save();ctx.globalAlpha*=appear;ctx.fillStyle='#0a2331';ctx.fillRect(x-9,y-9,w+18,h+18);frameCorners(x-9,y-9,w+18,h+18,'#456d7e');const ar=crop.image.naturalWidth/crop.image.naturalHeight,ih=Math.min(h,w/ar),iw=ih*ar,dx=x+(w-iw)/2,dy=y+(h-ih)/2;
 ctx.fillStyle='#f0f4f1';ctx.globalAlpha*=1-digital*.92;ctx.fillRect(x,y,w,h);ctx.drawImage(crop.image,dx,dy,iw,ih);ctx.restore();ctx.save();ctx.globalAlpha*=appear*digital;ctx.drawImage(crop.ink,dx,dy,iw,ih);ctx.restore();ctx.save();ctx.globalAlpha*=appear;const scan=(t-9.4-i*.45)/5.6;if(scan>0&&scan<1){const yy=y+scan*h,g=ctx.createLinearGradient(0,yy-38,0,yy);g.addColorStop(0,'rgba(137,244,228,0)');g.addColorStop(1,'rgba(137,244,228,.22)');ctx.fillStyle=g;ctx.fillRect(x,yy-38,w,38);ctx.fillStyle='#c0fff0';ctx.fillRect(x,yy,w,1.2);}spaced('0'+(i+1)+' / LOCAL DETAIL',x,y+h+39,10,'#729aa7',1.4);ctx.font='300 24px "PingFang SC",sans-serif';ctx.fillStyle='#d2e5e7';ctx.fillText(crop.title,x,y+h+76);ctx.font='400 14px "PingFang SC",sans-serif';ctx.fillStyle='#7c9faa';ctx.fillText(crop.subtitle,x,y+h+108);ctx.restore();});ctx.restore();
 const r=drawingRect(t),progress=smooth((t-9.7)/5.8),n=Math.floor(drawingLinework.length*progress);ctx.save();ctx.globalAlpha*=.2+.8*digital;frameCorners(r.x-26,r.y-28,r.w+52,r.h+56,'#406c7b');spaced('CAD-DERIVED / STRUCTURE DIAGRAM',r.x+8,r.y-50,11,'#82c4cc',2);ctx.lineWidth=.9;ctx.strokeStyle='#74cbd4';ctx.beginPath();for(let i=0;i<n;i++){const line=drawingLinework[i];line.points.forEach((p,j)=>{const q=diagramPoint(p,t);j?ctx.lineTo(...q):ctx.moveTo(...q);});}ctx.stroke();
 const sweep=(t-10.6)/5.8;if(sweep>0&&sweep<1){const yy=r.y+r.h*(1-sweep);ctx.strokeStyle='#c5f5df';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(r.x,yy);ctx.lineTo(r.x+r.w,yy);ctx.stroke();ctx.fillStyle='rgba(93,223,215,.08)';ctx.fillRect(r.x,yy,r.w,26);}
 ctx.font='400 15px "PingFang SC",sans-serif';ctx.fillStyle='#93b9c4';ctx.fillText('结构示意 · 由当前 CAD 派生参考线绘制',r.x+6,r.y+r.h+65);ctx.restore();
 ctx.font='400 12px "PingFang SC",sans-serif';ctx.fillStyle='#648b9a';ctx.fillText('局部裁图与结构示意的流程表达 · 非正式总图',98,977);ctx.restore();}
function legacyProcessRail(t){if(t<8||t>48)return;const a=smooth((t-8)/1)*(1-smooth((t-47)/1));ctx.save();ctx.globalAlpha=a;const labels=['图纸解构','空间线架','角钢截面','总装生成'],index=t<19?0:t<28?1:t<38?2:3;for(let i=0;i<4;i++){const x=1100+i*180;ctx.fillStyle=i<=index?'#a4ebe3':'#385a6b';ctx.beginPath();ctx.arc(x,108,3,0,Math.PI*2);ctx.fill();ctx.font='400 14px "PingFang SC",sans-serif';ctx.fillText(labels[i],x+14,113);if(i<3){ctx.strokeStyle=i<index?'#609caa':'#243e4e';ctx.beginPath();ctx.moveTo(x+105,108);ctx.lineTo(x+160,108);ctx.stroke();}}ctx.restore();}
function memberInfo(t){if(t<28||t>=38)return;const a=smooth((t-28)/.7)*(1-smooth((t-37)/1));ctx.save();ctx.globalAlpha=a;spaced('ANGLE STEEL / L100 × 8',130,242,13,'#83c9cf',3);ctx.font='300 50px "PingFang SC",sans-serif';ctx.fillStyle='#e3eff2';ctx.fillText('从截面，',126,330);ctx.fillText('定义构件。',126,396);ctx.font='400 20px "PingFang SC",sans-serif';ctx.fillStyle='#8eacba';ctx.fillText('两肢、厚度与圆角，构成真实形体。',131,452);
 const x=140,y=555,scale=43;ctx.strokeStyle='#355967';ctx.lineWidth=1;ctx.strokeRect(x-15,y-15,181,181);ctx.fillStyle='rgba(126,220,215,.20)';ctx.strokeStyle='#9ce3d8';ctx.lineWidth=1.5;ctx.beginPath();profileConfig.polygon.forEach((p,i)=>i?ctx.lineTo(x+p[0]*scale,y+151-p[1]*scale):ctx.moveTo(x+p[0]*scale,y+151-p[1]*scale));ctx.closePath();ctx.fill();ctx.stroke();ctx.font='400 16px monospace';ctx.fillStyle='#abc8d2';ctx.fillText('100 × 100 × 8 mm',x+210,y+40);ctx.font='400 16px "PingFang SC",sans-serif';ctx.fillText('内根圆角 / 肢端圆弧',x+210,y+82);ctx.font='400 13px "PingFang SC",sans-serif';ctx.fillStyle='#6d94a4';ctx.fillText('M6.602.01 · 实体截面局部放大',130,770);
 if(t<32.6){const alpha=1-smooth((t-31.4)/1.2);ctx.globalAlpha*=alpha;const point=v([.404-1.7544,.404-1.7544,500.006]).project(camera),px=(point.x*.5+.5)*W,py=(.5-point.y*.5)*H,tx=Math.min(W-235,px+240),ty=Math.min(830,py+75);ctx.strokeStyle='#d6bf88';ctx.beginPath();ctx.arc(px,py,9,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#6e9eab';ctx.beginPath();ctx.moveTo(px+12,py);ctx.lineTo(tx-24,ty-7);ctx.lineTo(tx+100,ty-7);ctx.stroke();ctx.font='400 16px "PingFang SC",sans-serif';ctx.fillStyle='#d9ceb2';ctx.fillText('内根圆角',tx-18,ty+20);}
 ctx.restore();}
function projectionPoint(a){const p=v(a).project(camera);return [(p.x*.5+.5)*W,(.5-p.y*.5)*H];}
function bridgeFX(t){if(t<17.3||t>21)return;const q=smoother((t-17.3)/3.2),source=[[0,0,schematicBounds.maxZ],[0,0,schematicBounds.minZ]],dest=source.map(projectionPoint),points=source.map((p,i)=>lerp(diagramPoint(p,t),dest[i],q));ctx.save();ctx.globalAlpha=smooth((t-17.3)/.7)*(1-smooth((t-20.2)/.8));glowLine(points,'#ddcf9e',1.6);for(const pt of points)circleAt(pt,4,'#e5fff8');ctx.restore();}
function topologyFX(t){if(t<21||t>27.6)return;const a=smooth((t-21)/1)*(1-smooth((t-26.8)/.8));ctx.save();ctx.globalAlpha=a;const points=memberEnds.map(projectionPoint);ctx.strokeStyle='#dfc98e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(...points[0]);ctx.lineTo(...points[1]);ctx.stroke();const p=points[1];ctx.beginPath();ctx.arc(p[0],p[1],7+3*Math.sin(t*2),0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#477b89';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p[0]-15,p[1]);ctx.lineTo(p[0]-80,p[1]+40);ctx.lineTo(p[0]-310,p[1]+40);ctx.stroke();spaced('MEMBER 602',p[0]-307,p[1]+25,12,'#d8c797',2);ctx.font='400 17px "PingFang SC",sans-serif';ctx.fillStyle='#9bbdc8';ctx.fillText('角钢主材参考线',p[0]-307,p[1]+68);ctx.restore();}
function legacyCaption(t){let index=legacyChapters.findIndex(s=>t>=s.t&&t<s.end);if(index<0)index=legacyChapters.length-1;state.chapter=index;const shot=legacyChapters[index],elapsed=t-shot.t,remaining=shot.end-t;let opacity=Math.min(smooth(elapsed/.8),smooth(remaining/.65));
 drawingSequence(t);bridgeFX(t);memberInfo(t);ctx.save();ctx.fillStyle='rgba(1,6,11,.90)';ctx.fillRect(0,0,W,60);ctx.fillRect(0,H-60,W,60);const gradient=ctx.createRadialGradient(W*.51,H*.42,H*.16,W*.5,H*.48,W*.7);gradient.addColorStop(0,'rgba(0,5,10,0)');gradient.addColorStop(.6,'rgba(0,5,10,.02)');gradient.addColorStop(1,'rgba(0,5,10,.68)');ctx.fillStyle=gradient;ctx.fillRect(0,60,W,H-120);spaced('STRUCTURE / CINEMA',84,38,11,'#8aa7b8',3);spaced('FROM DRAWING TO STRUCTURE',W-84,38,9,'#658594',2,'right');ctx.globalAlpha=opacity;
 if(index===0){spaced('AI-POWERED / DRAWING TO CAD',126,340,14,'#97bdbf',3);precisionTitle(120,450,74,t);ctx.font='300 26px "PingFang SC",sans-serif';ctx.fillStyle='#9eb8c5';ctx.fillText('从二维蓝图，到三维 CAD 模型',126,512);ctx.fillStyle='#d4b680';ctx.fillRect(126,548,66,2);ctx.font='400 15px "PingFang SC",sans-serif';ctx.fillStyle='#7d9aa9';ctx.fillText('图纸解析    /    三维重建',126,605);}
 else if(index===9){const a=smooth((t-89.5)/1.5);ctx.globalAlpha*=a;spaced('AI PRECISION / FROM 2D TO 3D',126,360,13,'#9dcac9',3);ctx.font='300 58px "PingFang SC",sans-serif';ctx.fillStyle='#e1edf0';ctx.fillText('从二维蓝图，',120,465);ctx.fillText('到100%精准3D模型。',120,550);ctx.font='300 23px "PingFang SC",sans-serif';ctx.fillStyle='#92acb9';ctx.fillText('以100%精准为目标',126,625);ctx.font='300 18px "PingFang SC",sans-serif';ctx.fillStyle='#819fac';ctx.fillText('AI 精准建模，让工程关系有据可循。',126,718);ctx.fillStyle='#c9b180';ctx.fillRect(126,673,62,2);}
 else if(index!==1&&index!==3){const g=ctx.createLinearGradient(0,H-340,0,H-60);g.addColorStop(0,'rgba(2,8,14,0)');g.addColorStop(1,'rgba(2,8,14,.75)');ctx.fillStyle=g;ctx.fillRect(0,H-340,W,280);ctx.fillStyle='#9fc9c7';ctx.fillRect(88,870,38,2);spaced(shot.en,88,908,11,'#82acb5',2);ctx.fillStyle='#e0ebef';ctx.font='300 39px "PingFang SC",sans-serif';ctx.fillText(shot.title,86,968);}
 ctx.restore();ctx.save();spaced(String(index+1).padStart(2,'0')+' / 10',W-84,H-28,10,'#8ca9b7',2,'right');ctx.font='400 12px "PingFang SC",sans-serif';ctx.fillStyle='#718d9c';ctx.fillText(t>=8&&t<48?'图纸 → 结构线 → 实体 · 流程可视化':'',84,H-26);ctx.fillStyle='#20313d';ctx.fillRect(670,H-30,650,1);ctx.fillStyle='#9dbfbf';ctx.fillRect(670,H-30,650*clamp(t/DURATION),1);
 if(t>=19&&t<28){ctx.font='400 13px "PingFang SC",sans-serif';ctx.fillStyle='#7fa0af';ctx.fillText('空间单线表达 · CAD 派生参考线',88,150);}
 if(t>=55&&t<72){const a=Math.min(smooth((t-55)/.7),smooth((72-t)/.7));ctx.globalAlpha=a;spaced('M20 / CONNECTION DETAIL',W-88,148,12,'#dfc698',2,'right');ctx.font='400 13px "PingFang SC",sans-serif';ctx.fillStyle='#789eae';ctx.textAlign='right';ctx.fillText('角钢 · 连接板 · 螺栓 · 垫圈',W-88,180);ctx.textAlign='left';}ctx.restore();
 // Short, soft exposure blooms motivate the two scale-changing match cuts.
 const flash=Math.max(Math.exp(-Math.pow((t-28)/.18,2)),Math.exp(-Math.pow((t-38)/.18,2)))*.36;if(flash>.001){ctx.fillStyle=`rgba(118,220,228,${flash})`;ctx.fillRect(0,60,W,H-120);}const fade=t<.55?1-smooth(t/.55):t>95?smooth((t-95)):0;if(fade>0){ctx.fillStyle=`rgba(3,8,13,${fade})`;ctx.fillRect(0,0,W,H);}
}
// Intercut detail studies with one fixed, cumulative module build.
function fusionShot(t){
 // Preserve the complete prior film; insert a true interior flight before its final pullback.
 if(t>=160&&t<167)return {kind:'entry',entry:t-160,story:112+3*smoother((t-160)/7)};
 if(t>=167&&t<183)return {kind:'flight',flight:t-167,story:115};
 if(t>=183)t-=20;
 if(t>=8&&t<24)return {kind:'problem',intro:t-8,story:7.5};
 if(t>=24)t-=16;
 if(t<8)return {kind:'story',story:t};
 if(t<32)return {kind:'process',phase:t};
 if(t<44)return {kind:'detail',story:t-4,stage:2,label:'构件特写 / 模块六 602 主材'};
 if(t<54)return {kind:'process',phase:t-12};
 if(t<66)return {kind:'detail',story:t-14,stage:3,label:'连接详例 / 模块七—八接口'};
 if(t<74)return {kind:'process',phase:t-24};
 if(t<88)return {kind:'detail',story:t-22,stage:4,label:'同轴装配详例 / 模块七—八接口'};
 if(t<98)return {kind:'process',phase:t-38};
 if(t<108)return {kind:'bridge',phase:t-38,story:t-32};
 return {kind:'story',story:t-32};
}
function fusionRail(stage,label){
 ctx.save();ctx.fillStyle='rgba(5,16,26,.96)';ctx.fillRect(470,76,1210,56);const labels=['一套图纸','单线骨架','角钢生成','节点板生成','紧固件装配'];
 labels.forEach((s,i)=>{const x=500+i*230;ctx.fillStyle=i<=stage?'#a3dfd5':'#355361';ctx.beginPath();ctx.arc(x,102,3,0,Math.PI*2);ctx.fill();ctx.font='300 15px "PingFang SC",sans-serif';ctx.fillStyle=i===stage?'#e6f1f1':i<stage?'#8ab8bc':'#597584';ctx.fillText(s,x+15,108);if(i<4){ctx.strokeStyle=i<stage?'#608b93':'#263f4e';ctx.beginPath();ctx.moveTo(x+130,102);ctx.lineTo(x+205,102);ctx.stroke();}});
 ctx.font='400 15px "PingFang SC",sans-serif';ctx.fillStyle='#b8c8bd';ctx.fillText(label,110,174);ctx.restore();
}
function renderFrame(frame,t){
 current=clamp(t,0,DURATION);const editTime=current<8?current:current<24?8:current-16;const shot=fusionShot(current),process=shot.kind==='process',bridge=shot.kind==='bridge',detail=shot.kind==='detail',flight=shot.kind==='flight',entry=shot.kind==='entry',phase=shot.phase??-1,story=shot.story??0;
 let pose=entry?FlightFilm.entryPose(THREE,shot.entry):flight?FlightFilm.pose(THREE,shot.flight):current>=183?FlightFilm.closingPose(THREE,current-183):process?processDirector.camera(phase):cameraAt(story);
 if(bridge){const a=processDirector.camera(60),b=cameraAt(76),q=smoother((phase-60)/10);pose={eye:lerp(a.eye,b.eye,q),look:lerp(a.look,b.look,q),fov:mix(a.fov,b.fov,q)};}
 state.camera=pose;camera.fov=pose.fov;camera.position.set(...pose.eye);camera.up.set(...(pose.up||[0,0,1]));camera.lookAt(v(pose.look));camera.updateMatrixWorld(true);camera.near=.08;camera.far=6000;camera.updateProjectionMatrix();cameraLight.position.copy(camera.position);cameraLight.target.position.set(...pose.look);renderer.toneMappingExposure=.95+.27*smooth((camera.position.distanceTo(v(pose.look))-80)/1000);
 effects(process?0:story);cinematicFX(process?0:story);fxRoot.visible=!process&&!flight&&!entry;
 if(flight||entry){scene.fog.density=.000055;uniforms.edge.value=entry?mix(.03,.055,smoother((shot.entry-5)/2)):.055;}
 if(entry){const q=smoother((shot.entry-4)/3);for(const mat of materials)if(mat.userData.kind==='hardware'){mat.color.copy(mat.userData.base).lerp(new THREE.Color('#91825b'),1-q);mat.emissiveIntensity=.04*(1-q);}}
 if(process){for(const m of models)m.root.visible=false;memberRoot.visible=connectionRoot.visible=false;referenceLines.visible=referenceNodes.visible=false;sectionGhosts.forEach(g=>g.visible=false);floor.visible=grid.visible=false;rings.forEach(r=>r.visible=false);scene.fog.density=0;}
 if(bridge){for(const m of models){m.root.position.set(...m.translation);m.meshes.forEach(mesh=>mesh.position.x=0);if(m.id===6&&phase<66)m.root.visible=false;}state.explode=0;}
 processDirector.set(phase);renderer.render(scene,camera);ctx.globalAlpha=1;ctx.drawImage(renderer.domElement,0,0,W,H);
 if(process){processDirector.detail(renderer,ctx,scene,phase,projectionPoint);processDirector.overlay(ctx,phase,projectionPoint);
  if(editTime>=28&&editTime<32){ctx.save();ctx.globalAlpha=smooth((editTime-28)/.7);const ps=memberEnds.map(projectionPoint);glowLine(ps,'#e2c88b',2.4);ps.forEach(p=>circleAt(p,5,'#e2c88b'));const p=ps[1];glowLine([p,[p[0]+70,p[1]+80],[p[0]+245,p[1]+80]],'#749fa9',1);ctx.font='400 17px "PingFang SC",sans-serif';ctx.fillStyle='#d9c78f';ctx.fillText('602 / 从这一根主材开始',p[0]+80,p[1]+65);ctx.restore();}
 }else if(flight){compositeFX(story);FlightFilm.overlay(ctx,shot.flight);ctx.save();ctx.fillStyle='rgba(1,6,11,.94)';ctx.fillRect(0,0,W,60);spaced('STRUCTURE / CINEMA',84,38,11,'#8aa7b8',3);ctx.restore();}
 else{compositeFX(story);caption(story);if(detail)fusionRail(shot.stage,shot.label);}
 // Entry uses the same renderer and the same physical scene as every other shot.
 // A brief exposure link signals a deliberate change of scale, then returns to the same module anchors.
 if(shot.kind==='problem')ProblemFilm.draw(ctx,shot.intro);
 const cuts=[48,60,70,82,90,104],flash=Math.max(...cuts.map(c=>Math.exp(-Math.pow((current-c)/.18,2))))*.2;if(flash>.001){ctx.fillStyle=`rgba(129,215,222,${flash})`;ctx.fillRect(0,60,W,H-120);}
 state.chapter=Math.max(0,chapters.findIndex(c=>current>=c.t&&current<c.end));if(current===DURATION)state.chapter=chapters.length-1;
 ctx.save();ctx.globalAlpha=1;ctx.fillStyle='#02080e';ctx.fillRect(0,H-60,W,60);ctx.font='400 12px "PingFang SC",sans-serif';ctx.fillStyle='#718d9c';spaced(String(state.chapter+1).padStart(2,'0')+' / 18',W-84,H-28,10,'#8ca9b7',2,'right');ctx.fillStyle='#20313d';ctx.fillRect(870,H-30,450,1);ctx.fillStyle='#9dbfbf';ctx.fillRect(870,H-30,450*clamp(current/DURATION),1);ctx.restore();
 brandFrame(current);state.renderedFrames++;output.dataset.time=current.toFixed(3);output.dataset.frame=String(frame);output.dataset.entities=String(state.entities);output.dataset.chapter=String(state.chapter+1);output.dataset.depth=renderer.capabilities.logarithmicDepthBuffer?'logarithmic':'standard';output.dataset.scanY=plateBuild.value.toFixed(3);output.dataset.revision='v25-continuous';output.dataset.shot=shot.kind;output.dataset.processBuild=processDirector.uniform.value.toFixed(4);updateUI();
}
function updateUI(){const secs=Math.floor(current);$('time').textContent=`${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')} / 03:12`;$('timeline').value=current;$('chapterBadge').textContent=String(state.chapter+1).padStart(2,'0')+' / '+chapters[state.chapter].name;document.querySelectorAll('button[data-time]').forEach((b,i)=>{b.classList.toggle('active',i===state.chapter);if(i===state.chapter)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');});$('timeline').setAttribute('aria-valuetext',Math.floor(current)+'秒，共192秒');}
function pause(){playing=false;cancelAnimationFrame(raf);$('play').textContent='▶';$('play').setAttribute('aria-label','播放');$('score').pause();$('centerPlay').classList.remove('hidden');}
function tick(now){if(!playing)return;const t=playFrom+(now-playStart)/1000;if(t>=DURATION){renderFrame(DURATION*FPS,DURATION);pause();return;}renderFrame(Math.round(t*FPS),t);raf=requestAnimationFrame(tick);}
function play(){if(!ready)return;if(current>DURATION-.1)current=0;playFrom=current;playStart=performance.now();playing=true;$('play').textContent='Ⅱ';$('play').setAttribute('aria-label','暂停');$('centerPlay').classList.add('hidden');$('score').currentTime=current;if(!$('score').muted)$('score').play().catch(()=>{$('studioStatus').textContent='三维镜头继续播放；音轨暂未播放，请再次开启声音。';});raf=requestAnimationFrame(tick);}
function seek(t){if(!ready)return;const resume=playing;pause();renderFrame(Math.round(t*FPS),t);$('score').currentTime=t;if(resume)play();}
$('play').onclick=()=>playing?pause():play();
$('centerPlay').onclick=play;
$('restart').onclick=()=>{pause();seek(0);play();};
$('timeline').oninput=e=>seek(Number(e.target.value));
document.querySelectorAll('button[data-time]').forEach(b=>b.onclick=()=>seek(Number(b.dataset.time)));
$('sound').onclick=()=>{$('score').muted=!$('score').muted;$('sound').textContent=$('score').muted?'声音关':'声音开';$('sound').setAttribute('aria-label',$('score').muted?'开启声音':'关闭声音');$('sound').setAttribute('aria-pressed',String($('score').muted));if(playing&&!$('score').muted){$('score').currentTime=current;$('score').play().catch(()=>{$('studioStatus').textContent='三维镜头继续播放；音轨暂未播放，请再次开启声音。';});}};
$('score').muted=false;$('score').volume=.8;
async function toggleFullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.film-shell').requestFullscreen();}catch(error){$('studioStatus').textContent='全屏暂未开启；仍可正常观看实时镜头或完整影片。';}}
$('fullscreen').onclick=toggleFullscreen;
document.addEventListener('fullscreenchange',()=>{$('fullscreen').setAttribute('aria-label',document.fullscreenElement?'退出全屏':'全屏播放');});
window.addEventListener('pagehide',pause);
renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();pause();ready=false;for(const id of ['play','restart','timeline','centerPlay'])$(id).disabled=true;showLoadFailure('三维画面暂时中断，请重新载入或直接观看影片。');});
document.addEventListener('keydown',e=>{if(e.target.matches('input,button,a'))return;if(e.code==='Space'){e.preventDefault();playing?pause():play();}if(e.code==='ArrowRight'){e.preventDefault();seek(Math.min(DURATION,current+5));}if(e.code==='ArrowLeft'){e.preventDefault();seek(Math.max(0,current-5));}if(e.code==='KeyF'){e.preventDefault();void toggleFullscreen();}});
async function load(){try{processDirector=await ProcessFilm.create(THREE,scene);await brandCover.decode();await ProblemFilm.load();connectionConfig=await (await fetch('connection-scene.json')).json();lineExamples=await (await fetch('line-examples.json')).json();connectionDrawing.src='../'+connectionConfig.evidenceUrl;connectionSectionDrawing.src='../'+connectionConfig.sectionEvidenceUrl;await Promise.all([connectionDrawing.decode().then(()=>connectionDrawingReady=true),connectionSectionDrawing.decode().then(()=>connectionSectionReady=true)]);profileConfig=await (await fetch('profile-section.json')).json();memberAxis=profileConfig.axisWorld;memberCenter=profileConfig.originWorld;memberEnds=profileConfig.referenceLineWorld;await Promise.all(drawingCrops.map(crop=>crop.image.decode()));makeBlueprint();const response=await fetch('../assets/model.json?r=v25-continuous-20261101');if(!response.ok)throw Error('模型索引未载入');const model=await response.json();const lineResponse=await fetch('../assets/lines.json');if(lineResponse.ok){const lines=await lineResponse.json(),pts=[];drawingLinework=lines.lines;const allPoints=lines.lines.flatMap(line=>line.points);schematicBounds.minX=Math.min(...allPoints.map(p=>p[0]));schematicBounds.maxX=Math.max(...allPoints.map(p=>p[0]));schematicBounds.minZ=Math.min(...allPoints.map(p=>p[2]));schematicBounds.maxZ=Math.max(...allPoints.map(p=>p[2]));for(const l of lines.lines)for(let i=1;i<l.points.length;i++)pts.push(...l.points[i-1],...l.points[i]);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));referenceLines=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:'#75e8ec',transparent:true,opacity:.28,depthWrite:false,toneMapped:false}));scene.add(referenceLines);referenceOriginal=new Float32Array(pts);const ng=new THREE.BufferGeometry();ng.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));referenceNodes=new THREE.Points(ng,new THREE.PointsMaterial({color:'#b9fff2',size:3.2,transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false}));scene.add(referenceNodes);}let at=0;async function worker(){while(at<model.modules.length){const m=model.modules[at++],raw=await readGeometry(m.geometry);build(m,raw);state.loaded++;$('loadStatus').textContent=`实体已载入 ${state.loaded}/9`;$('loadBar').style.width=state.loaded/9*100+'%';await new Promise(r=>setTimeout(r,0));}}await Promise.all([worker(),worker()]);if(state.entities!==8759)throw Error('实体数量与已发布模型不一致');ready=true;document.body.dataset.ready='true';$('loadStatus').textContent='模型已就绪';renderFrame(0,0);updateUI();$('loading').hidden=true;for(const id of ['play','restart','timeline','centerPlay'])$(id).disabled=false;$('studioStatus').textContent='模型已就绪 · 点击播放，开始结构生成之旅';}catch(error){showLoadFailure(error.message);}}
// V5: three source-geometry examples, reconstructed as an explanatory film.
const chapters=[[0, 8, "AI100%精准建模"], [8, 24, "为什么需要工程 AI"], [24, 32, "整套图纸解析"], [32, 40, "视图入空间"], [40, 48, "单线骨架"], [48, 60, "角钢截面"], [60, 70, "模块角钢生成"], [70, 82, "孔位与节点板"], [82, 90, "节点板生成"], [90, 104, "同轴紧固装配"], [104, 114, "模块紧固生成"], [114, 124, "汇入总装"], [124, 131, "看见完整连接"], [131, 148, "360°节点环绕"], [148, 156, "沿结构上升"], [156, 167, "连接的秩序"], [167, 183, "穿越结构，直抵塔顶"], [183, 192, "从二维蓝图，到100%精准3D模型"]].map(([t,end,name])=>({t,end,name}));
let connectionConfig=null,lineExamples=[],connectionRoot=null,connectionParts=[],plateWire=null,plateMesh=null,plateEntry=null;
const connectionDrawing=new Image(),connectionSectionDrawing=new Image();
let connectionDrawingReady=false,connectionSectionReady=false;
const storyTime=t=>t<28?t:t<40?28+(t-28)/1.2:t<66?38:t-28;
const connectionStage=t=>t>=40&&t<66;
const connectionBase=[0,0,500];
const sectionGhosts=[];
let axisGuide=null;const plateBuild={value:1000},plateClip=new THREE.Plane(v([0,-1,0]),1000);
function buildConnection(m,raw){
 const cfg=connectionConfig;
 if(!connectionRoot){connectionRoot=new THREE.Group();connectionRoot.position.set(...connectionBase);scene.add(connectionRoot);connectionRoot.visible=false;
  const g=new THREE.BufferGeometry().setFromPoints([v([0,0,-5]),v([0,0,9])]);axisGuide=new THREE.Line(g,new THREE.LineDashedMaterial({color:'#83dddf',dashSize:.25,gapSize:.16,transparent:true,opacity:.32,depthWrite:false}));axisGuide.computeLineDistances();connectionRoot.add(axisGuide);
 }
 for(const entry of cfg.parts){const p=m.parts.find(p=>p.id===entry.id);if(!p)continue;
  const q=new Uint16Array(raw,p.stream.p,p.vertexCount*3),pos=new Float32Array(p.vertexCount*3),matrix=new THREE.Matrix4().fromArray(cfg.worldToLocalMatrix4);
  for(let i=0;i<p.vertexCount;i++){const pt=v([0,1,2].map(k=>p.min[k]+q[i*3+k]*p.step[k]+m.translation[k])).applyMatrix4(matrix);pos.set(pt.toArray(),i*3);}
  const ix=p.stream.width===2?new Uint16Array(raw,p.stream.i,p.indexCount):new Uint32Array(raw,p.stream.i,p.indexCount),geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setIndex(new THREE.BufferAttribute(new Uint32Array(ix),1));geo.computeVertexNormals();geo.computeBoundingBox();const center=geo.boundingBox.getCenter(new THREE.Vector3());geo.translate(-center.x,-center.y,-center.z);
  const hardware=['bolt','washer','nut','locknut'].includes(entry.role),mat=new THREE.MeshStandardMaterial({color:hardware?'#8c815b':entry.role==='plate'?'#9db8c7':entry.role==='member'?'#7d8d9b':'#407f88',metalness:hardware?.60:.65,roughness:hardware?.43:.31,envMapIntensity:hardware?.82:1.1,side:THREE.DoubleSide,transparent:true,opacity:1});
  if(entry.role==='plate'){mat.clippingPlanes=[plateClip];renderer.localClippingEnabled=true;mat.onBeforeCompile=shader=>{shader.uniforms.uPlateBuild=plateBuild;shader.vertexShader='varying float vPlateY;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvPlateY=(modelMatrix*vec4(transformed,1.0)).y;');shader.fragmentShader='varying float vPlateY;uniform float uPlateBuild;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(vPlateY>uPlateBuild)discard;');shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(0.15,0.85,0.85)*exp(-pow((vPlateY-uPlateBuild)/0.12,2.0))*2.4;');};}
  if(entry.role==='member'){mat.clippingPlanes=[new THREE.Plane(v([0,1,0]),3.5),new THREE.Plane(v([0,-1,0]),3.5),new THREE.Plane(v([1,0,0]),5),new THREE.Plane(v([-1,0,0]),5)];renderer.localClippingEnabled=true;}
  const mesh=new THREE.Mesh(geo,mat);mesh.position.copy(center);connectionRoot.add(mesh);const item={...entry,mesh,center:center.clone(),bounds:geo.boundingBox.clone(),hardware};connectionParts.push(item);
  if(entry.role==='plate'){plateMesh=mesh;plateEntry=item;const edges=new THREE.EdgesGeometry(geo,24);plateWire=new THREE.LineSegments(edges,new THREE.LineBasicMaterial({color:'#8beddf',transparent:true,opacity:1,depthWrite:false,toneMapped:false}));mesh.add(plateWire);}
 }
}
function ensureSectionGhosts(){if(sectionGhosts.length||!memberRoot)return;for(let i=0;i<7;i++){const geo=new THREE.BufferGeometry().setFromPoints(profileConfig.polygon.map(p=>v([...p,0])));const ln=new THREE.LineLoop(geo,new THREE.LineBasicMaterial({color:i===0?'#efffe9':'#82e2d9',transparent:true,opacity:0,depthWrite:false,toneMapped:false}));memberRoot.add(ln);sectionGhosts.push(ln);}}
function repairedConnectionCamera(t){
 const target=[27.9589,-23.5368,771.9212],radius=25.6983,elevation=.14529;
 const close=yaw=>({eye:orbit(target,radius,yaw,elevation),look:target,fov:38});
 if(t<110){const u=smoother((t-108)/2),end=close(-1.10637);return {eye:spline([[55,-65,619],[90,-105,740],end.eye],u),look:lerp([32,-32,628],target,u),fov:mix(41,38,u)};}
 if(t<113)return close(mix(-1.10637,-.95,smoother((t-110)/3)));
 const u=smoother((t-113)/2),start=close(-.95);return {eye:spline([start.eye,[85,-110,803],[-65,-150,807],[-175,-155,785]],u),look:lerp(target,[-85,0,748],u),fov:mix(38,40,u)};
}
function cameraAt(t){
 if(t>=108&&t<115)return repairedConnectionCamera(t);
 if(!connectionStage(t))return legacyCameraAt(storyTime(t));
 const pc=connectionConfig.plateCenterLocal||[0,0,0],zoom=smoother((t-48)/6),settle=smoother((t-56)/8),u=smoother((t-54)/11),radius=mix(Math.exp(mix(Math.log(36),Math.log(24),zoom)),9.5,settle);
 const target=lerp(pc,[0,0,.8],zoom),yaw=mix(-Math.PI/2,-.62,zoom)+u*.34,elev=mix(1.31,.44,zoom),direction=v(orbit([0,0,0],1,yaw,elev)),right=new THREE.Vector3().crossVectors(v([0,1,0]),direction).normalize();
 target[0]-=right.x*radius*.19;target[2]+=500-right.z*radius*.19;
 return {eye:orbit(target,radius,yaw,elev),look:target,fov:35,up:[0,1,0]};
}
function effects(t){
 const old=storyTime(t);legacyEffects(old);ensureSectionGhosts();
 for(const ln of sectionGhosts){ln.visible=t>=28&&t<40;if(ln.visible){const u=smoother((old-30.4)/6.6),depth=mix(.105,profileConfig.maxDepth,u),i=sectionGhosts.indexOf(ln),d=depth-i*.42;ln.position.z=-d;ln.visible=d>0;ln.material.opacity=(i===0?.9:.2*(1-i/8))*smooth((t-30)/1.6)*(1-smooth((t-38.6)/1.4));}}
 plateBuild.value=t>=40&&t<48?mix(-14.4,4.8,smoother((t-44.1)/3.6)):1000;plateClip.constant=plateBuild.value;connectionRoot.visible=connectionStage(t);axisGuide.visible=t>=51&&t<64.5;axisGuide.material.opacity=.32*(1-smooth((t-63)/1.5));
 if(connectionStage(t)){
  for(const m of models)m.root.visible=false;memberRoot.visible=false;if(referenceLines)referenceLines.visible=referenceNodes.visible=false;
  floor.visible=grid.visible=false;rings.forEach(r=>r.visible=false);uniforms.lower.value=-10000;uniforms.reveal.value=2000;uniforms.scanPower.value=0;
  for(const p of connectionParts){const mesh=p.mesh;mesh.position.copy(p.center);mesh.rotation.set(0,0,0);mesh.scale.set(1,1,1);mesh.material.emissive.set('#000000');mesh.material.emissiveIntensity=0;mesh.material.depthWrite=true;mesh.material.opacity=1;mesh.visible=true;
   if(p.role==='plate'){const body=smooth((t-43.8)/3.4);mesh.scale.z=mix(.015,1,body);mesh.material.opacity=mix(.035,1,body);mesh.material.depthWrite=body>.8;plateWire.material.opacity=1-smooth((t-48)/3)*.83;plateWire.geometry.setDrawRange(0,Math.floor(plateWire.geometry.attributes.position.count/2*smooth((t-40)/2.2))*2);mesh.material.emissive.set('#37a7c0');mesh.material.emissiveIntensity=(1-body)*.5;}
   else if(!p.hardware){mesh.visible=t>=51.5;mesh.material.opacity=smooth((t-51.5)/2.5)*.84;mesh.material.depthWrite=t>54;}
   else{const phase={bolt:[52.4,56.3,-4.0],washer:[56.1,58.8,2.3],nut:[58.6,61.5,4],locknut:[61,63.5,5.8]}[p.role],arrival=smoother((t-phase[0])/(phase[1]-phase[0]));mesh.visible=t>=53;mesh.material.opacity=smooth((t-53)/.8);mesh.position.z+=phase[2]*(1-arrival);if(p.role==='nut'||p.role==='locknut')mesh.rotation.z=(1-arrival)*Math.PI*4;mesh.material.emissive.set('#3c3828');mesh.material.emissiveIntensity=.025+.055*Math.sin(Math.PI*arrival);}
  }
  scene.fog.density=0;
 }
}
function cinematicFX(t){legacyCinematicFX(storyTime(t));if(connectionStage(t)){dust.visible=scanRing.visible=scanPlane.visible=flightLine.visible=flightSpark.visible=false;}}
function compositeFX(t){legacyCompositeFX(storyTime(t));}
function glowLine(points,color,width=1.5){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.shadowColor=color;ctx.shadowBlur=9;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();ctx.shadowBlur=0;}
function circleAt(p,r,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.arc(p[0],p[1],r,0,Math.PI*2);ctx.stroke();}
function drawingToLines(t){if(t<15.5||t>=28)return;const r=drawingRect(Math.min(t,19.5)),a=smooth((t-15.5)/1.1)*(1-smooth((t-26.8)/1.2)),q=smoother((t-17.6)/5.2),flat=1-smoother((t-20)/5);
 ctx.save();ctx.globalAlpha=a;
 lineExamples.forEach((ex,index)=>{const ends=[ex.points[0],ex.points.at(-1)],target=ends.map(p=>projectionPoint([p[0],p[1]*(1-flat),p[2]])),source=ends.map(p=>diagramPoint(p,Math.min(t,19.5))),pts=source.map((p,i)=>lerp(p,target[i],q));glowLine(pts,ex.color,2.4);for(const p of pts)circleAt(p,5,ex.color);
  for(let i=0;i<3;i++){const u=(t*.48+index*.21+i/3)%1,pt=lerp(pts[0],pts[1],u);ctx.fillStyle='#ecfff4';ctx.beginPath();ctx.arc(...pt,2.8,0,Math.PI*2);ctx.fill();}
  if(t>19.3){const ca=smooth((t-19.3-index*.5)/.8);ctx.save();ctx.globalAlpha*=ca;const x=110,y=300+index*145;ctx.fillStyle='rgba(9,28,40,.83)';ctx.fillRect(x,y,336,104);frameCorners(x,y,336,104,ex.color);spaced(`0${index+1} / REFERENCE`,x+21,y+26,10,ex.color,2);ctx.fillStyle='#e0edf0';ctx.font='300 25px "PingFang SC",sans-serif';ctx.fillText(ex.label,x+20,y+66);ctx.font='400 12px "PingFang SC",sans-serif';ctx.fillStyle='#81a4b5';ctx.fillText('平面定位 → 空间方向',x+20,y+89);const mid=lerp(pts[0],pts[1],.5);ctx.globalAlpha*=.4;glowLine([[x+336,y+54],[x+390,y+54],mid],ex.color,.8);ctx.restore();}
 });ctx.restore();
}
function holePoints(){return connectionConfig.holesLocal||[];}
function connectionOverlay(t){
 const a=smooth((t-40)/.65)*(1-smooth((t-65.2)/.8)),fast=t>=52;ctx.save();ctx.globalAlpha=a;
 const grad=ctx.createLinearGradient(0,0,800,0);grad.addColorStop(0,'rgba(3,12,21,.88)');grad.addColorStop(.8,'rgba(3,12,21,.65)');grad.addColorStop(1,'rgba(3,12,21,0)');ctx.fillStyle=grad;ctx.fillRect(0,60,800,960);
 if(fast){spaced('CONNECTION / LOCAL DETAIL',W-110,177,10,'#81a6b5',2,'right');ctx.textAlign='right';ctx.font='400 13px "PingFang SC",sans-serif';ctx.fillStyle='#7599a9';ctx.fillText('局部连接 · 主材局部剖显',W-110,206);ctx.textAlign='left';}spaced(fast?'CASE 03 / COAXIAL ASSEMBLY':'CASE 02 / CONNECTION PLATE',110,218,13,'#92dbd7',2.7);
 ctx.fillStyle='#edf3f4';ctx.font='300 54px "PingFang SC",sans-serif';ctx.fillText(fast?'沿一条轴线，':'生成孔位，',106,302);ctx.fillText(fast?'建立一处连接。':'成为连接。',106,374);
 ctx.font='300 21px "PingFang SC",sans-serif';ctx.fillStyle='#a4bdc8';ctx.fillText(fast?'螺栓、垫圈、主螺母与扣紧螺母。':'轮廓、孔位与厚度，逐一进入空间。',110,430);
 const steps=fast?['螺栓穿入','垫圈就位','螺母旋入','扣紧就位']:['描绘轮廓','定位十孔','生成厚度'];const starts=fast?[52.4,56.1,58.6,61]:[40,42.1,44.2];
 steps.forEach((label,i)=>{const y=493+i*49,p=smooth((t-starts[i])/(fast?2:1.5));ctx.fillStyle=p>.05?'#aee9dd':'#365767';ctx.beginPath();ctx.arc(117,y-5,4,0,Math.PI*2);ctx.fill();ctx.font='400 18px "PingFang SC",sans-serif';ctx.fillStyle=p>.05?'#d1e4e9':'#526f7d';ctx.fillText(label,139,y);ctx.fillStyle='#143140';ctx.fillRect(295,y-8,200,2);ctx.fillStyle=fast?'#d1b77d':'#86d4ce';ctx.fillRect(295,y-8,200*p,2);});
 const img=fast?connectionSectionDrawing:connectionDrawing,ok=fast?connectionSectionReady:connectionDrawingReady;
 if(ok){const box=fast?{x:110,y:704,w:184,h:184}:{x:650,y:245,w:250,h:628},ar=img.naturalWidth/img.naturalHeight,iw=Math.min(box.w,box.h*ar),ih=iw/ar;ctx.fillStyle='#d1e0df';ctx.fillRect(box.x,box.y,box.w,box.h);ctx.drawImage(img,box.x+(box.w-iw)/2,box.y+(box.h-ih)/2,iw,ih);frameCorners(box.x-7,box.y-7,box.w+14,box.h+14,'#61899a');if(!fast&&t>42){const j=Math.min(9,Math.floor((t-42)*2)),dp=connectionConfig.drawingHolePixels[j],hp=holePoints()[j],sp=[box.x+(box.w-iw)/2+dp[0]/img.naturalWidth*iw,box.y+(box.h-ih)/2+dp[1]/img.naturalHeight*ih],tp=projectionPoint([hp[0],hp[1],hp[2]+500]),q=(t*2)%1;circleAt(sp,8,'#b58a32',2);ctx.save();ctx.globalAlpha*=.6*(1-smooth((t-49)/2));glowLine([sp,[960,sp[1]],tp],'#83d5d2',1);const pt=lerp(sp,tp,q);ctx.fillStyle='#dcf9e7';ctx.beginPath();ctx.arc(...pt,3,0,Math.PI*2);ctx.fill();ctx.restore();}}
 if(fast){[['819 · 内包角','#407f88'],['701 · 主材','#7d8d9b'],['820 · 外贴板','#9db8c7']].forEach(([label,color],i)=>{ctx.fillStyle=color;ctx.fillRect(322,733+i*48,5,23);ctx.font='400 16px "PingFang SC",sans-serif';ctx.fillStyle='#b1c9d0';ctx.fillText(label,342,751+i*48);});}ctx.font='400 12px "PingFang SC",sans-serif';ctx.fillStyle='#729eae';ctx.fillText(fast?'对应局部剖面 · 原模型连接组':'对应构件详图 · M8.820.2',fast?110:650,900);
 ctx.font='400 16px monospace';ctx.fillStyle='#d9c695';ctx.fillText(fast?'M20 × 55   /   8 + 8 + 8 mm':'105 × 530 × 8 mm    /    10 × Ø21.5',110,930);
 if(!fast){const scan=clamp((t-41.8)/3.7),holes=holePoints();holes.forEach((p,i)=>{const progress=smooth((scan*holes.length-i)/1.4);if(!progress)return;const pt=projectionPoint([p[0],p[1],p[2]+500+.01]);ctx.save();ctx.globalAlpha*=progress*(1-smooth((t-49.5)/2));circleAt(pt,14,'#e8cb86',1.2);ctx.strokeStyle='#a6e3e0';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pt[0]-22,pt[1]);ctx.lineTo(pt[0]+22,pt[1]);ctx.moveTo(pt[0],pt[1]-22);ctx.lineTo(pt[0],pt[1]+22);ctx.stroke();spaced(String(i+1).padStart(2,'0'),pt[0]+24,pt[1]+4,10,'#b0c9c9',1);ctx.restore();});}
 else{const q=smooth((t-63.3)/1),pt=projectionPoint([0,0,500+1]);if(q>0){ctx.save();ctx.globalAlpha*=q;circleAt(pt,52+12*(1-q),'#b0e8cd',1);circleAt(pt,62+17*(1-q),'#547f86',.7);spaced('COAXIAL / CONNECTED',1180,876,12,'#acd4cb',2);ctx.restore();}
  const axis0=projectionPoint([0,0,496]),axis1=projectionPoint([0,0,508]);ctx.globalAlpha*=.45*(1-smooth((t-63)/1.5));glowLine([axis0,axis1],'#78bbc7',1);
 }
 ctx.restore();
}
function processRailV5(t){if(current>=48&&current<114)return;if(t<8||t>=76)return;const labels=['图纸','线架','角钢','板件','紧固','总装'],starts=[8,19,28,40,52,66],alpha=smooth((t-8)/1)*(1-smooth((t-75)/1));ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='rgba(4,15,25,.64)';ctx.fillRect(1117,88,700,39);for(let i=0;i<6;i++){const x=1140+i*116,active=t>=starts[i];ctx.fillStyle=active?'#a2e7dd':'#365562';ctx.beginPath();ctx.arc(x,108,3,0,Math.PI*2);ctx.fill();ctx.font='400 13px "PingFang SC",sans-serif';ctx.fillText(labels[i],x+13,113);if(i<5){ctx.strokeStyle=active?'#578e99':'#233d4b';ctx.beginPath();ctx.moveTo(x+58,108);ctx.lineTo(x+94,108);ctx.stroke();}}ctx.restore();}
function generationParticles(t){if(t<28||t>=40)return;const old=storyTime(t),depth=mix(.105,profileConfig.maxDepth,smoother((old-30.4)/6.6)),env=smooth((t-31)/1.8)*(1-smooth((t-38)/2));ctx.save();ctx.globalAlpha=env;for(let i=0;i<80;i++){const ph=(i*.618033+t*.38)%1,p=profileConfig.polygon[Math.floor((i*.414213%1)*profileConfig.polygon.length)],pt=projectionPoint([p[0]-1.7544+(1-ph)*Math.sin(i*2.4)*.3,p[1]-1.7544+(1-ph)*Math.cos(i*2.4)*.3,500-depth-(1-ph)*1.6]);ctx.globalAlpha=env*ph*.55;ctx.fillStyle=i%3?'#8ce8df':'#f6d9a0';ctx.fillRect(pt[0],pt[1],1.8,1.8);}ctx.restore();}
function assemblySignals(t){if(t<66||t>75.5)return;const a=smooth((t-66)/1)*(1-smooth((t-74)/1.5));ctx.save();ctx.globalAlpha=a;const names=['角钢','连接板','紧固件'];names.forEach((name,i)=>{const x=110+i*175;ctx.strokeStyle='#3e6a79';ctx.strokeRect(x,180,151,47);ctx.fillStyle='#b7d7d9';ctx.font='400 16px "PingFang SC",sans-serif';ctx.fillText(name,x+21,210);const dest=projectionPoint([0,0,500+i*180]),q=(t*.33+i*.29)%1,p0=[x+75,240],p1=lerp(p0,dest,q);ctx.globalAlpha=a*.24;glowLine([p0,dest],'#80c7ca',.7);ctx.globalAlpha=a;ctx.fillStyle='#d7f6e9';ctx.beginPath();ctx.arc(...p1,3,0,Math.PI*2);ctx.fill();});ctx.restore();}
function caption(t){
 if(!connectionStage(t)){legacyCaption(storyTime(t));drawingToLines(t);generationParticles(t);assemblySignals(t);}
 else{ctx.save();ctx.fillStyle='rgba(1,6,11,.94)';ctx.fillRect(0,0,W,60);ctx.fillRect(0,H-60,W,60);spaced('STRUCTURE / CINEMA',84,38,11,'#8aa7b8',3);spaced('FROM DRAWING TO STRUCTURE',W-84,38,9,'#658594',2,'right');ctx.restore();connectionOverlay(t);const flash=Math.exp(-Math.pow((t-40)/.21,2))*.25;if(flash>.001){ctx.fillStyle=`rgba(118,220,228,${flash})`;ctx.fillRect(0,60,W,H-120);}}
 processRailV5(t);state.chapter=Math.max(0,chapters.findIndex(c=>t>=c.t&&t<c.end));if(t===DURATION)state.chapter=chapters.length-1;
 ctx.save();ctx.fillStyle='#02080e';ctx.fillRect(0,H-60,W,60);ctx.font='400 12px "PingFang SC",sans-serif';ctx.fillStyle='#718d9c';ctx.fillText(t>=8&&t<76?'图纸 → 线架 → 构件 → 连接 · 流程可视化':'',84,H-26);spaced(String(state.chapter+1).padStart(2,'0')+' / 12',W-84,H-28,10,'#8ca9b7',2,'right');ctx.fillStyle='#20313d';ctx.fillRect(670,H-30,650,1);ctx.fillStyle='#9dbfbf';ctx.fillRect(670,H-30,650*clamp(t/DURATION),1);ctx.restore();
}

load();
})();
