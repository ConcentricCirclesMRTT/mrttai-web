/* Public interactive structure viewer. */
(()=>{'use strict';
const DATA_REVISION='r12-m5-axis-20261029';
let wheelAnchor=null,navigationRevision=0;
function fetchMetadata(path){return fetch(path+'?r='+DATA_REVISION,{cache:'no-cache'});}
const $=id=>document.getElementById(id),escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),format=x=>Number(x).toLocaleString('en-US'),icon=id=>`<svg><use href="#${id}"/></svg>`,types={angle:'角钢',plate:'连接板',hardware:'紧固件',accessory:'连接配件'},reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const state={ready:false,module:null,part:null,isolate:false,hardware:true,grid:true,colored:true,ortho:false,view:'iso',mode:'solid',explode:0,section:100,tour:false,tab:'modules',theme:'light',context:false,overlayWeight:0.65,loaded:0,hardwareFocus:false,orbit:false,orbitSpeed:0.22,sectionAxis:'z',stage:false,inspection:null};let data,renderer,scene,camera,perspective,orthographic,ground,cutPlane,cutSurface,highlight,frame=0,tween=null,toastTimer,animation=null,tourIndex=0,tourStart=0,lastFrame=0,lastModule=null,lastModuleTime=0,lastNarrow=null;const modules=new Map(),parts=new Map(),batches=[],lines=[],neighborMeshes=[]; let detailsData={parts:{}},downloadData={files:[]},detailsLoaded=false,detailsStatus='loading',detailsRequest=null,downloadsLoaded=false,downloadTask=null,neighbors=[],inspectionData=null,inspectionStatus='loading',inspectionParts=[];let sceneBounds=null,orbitLast=0;let target=new THREE.Vector3(0,0,500),distance=1700,yaw=-1.08,elevation=.14;
const boxOf=b=>new THREE.Box3(new THREE.Vector3(...b[0]),new THREE.Vector3(...b[1]));function notify(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2400);}function dialog(html){$('dialogContent').innerHTML=html;$('dialog').showModal();}
function moduleOffset(m){const n=m.id,parent=n<=2?4:n===3?6:n,s=state.explode;return new THREE.Vector3(n===1?-s*1.754386:n===2?s*1.754386:0,0,(9-parent)*s*.221053);}function side(p){return p.module===3?(p.bounds[0][0]+p.bounds[1][0]<0?-1:1):0;}function extra(p){return moduleOffset(modules.get(p.module)).add(new THREE.Vector3(side(p)*state.explode*1.473684,0,0));}function partBox(p){return boxOf(p.bounds).translate(extra(p));}function moduleBox(m){
  if(!m.boundsBySide){
    m.boundsBySide=new Map();
    for(const p of m.parts){const k=side(p);if(!m.boundsBySide.has(k))m.boundsBySide.set(k,new THREE.Box3());m.boundsBySide.get(k).union(boxOf(p.bounds));}
  }
  const box=new THREE.Box3(),offset=moduleOffset(m);
  for(const [k,local] of m.boundsBySide){const t=offset.clone();t.x+=k*state.explode*1.473684;box.union(local.clone().translate(t));}
  return box;
}
function allBox(){const b=new THREE.Box3();for(const m of modules.values())if(m.visible!==false)b.union(moduleBox(m));return b;}
function setup(){renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:false,powerPreference:'high-performance',logarithmicDepthBuffer:true});renderer.setPixelRatio(1);if('outputColorSpace'in renderer)renderer.outputColorSpace=THREE.SRGBColorSpace;else renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;renderer.setClearColor(0xedf3f7,0);renderer.localClippingEnabled=true;renderer.domElement.tabIndex=0;renderer.domElement.dataset.depthMode=renderer.capabilities.logarithmicDepthBuffer?'logarithmic':'adaptive';renderer.domElement.setAttribute('aria-label','交互式钢结构：拖动旋转，右键平移，滚轮围绕鼠标缩放，点击选择');$('canvasWrap').append(renderer.domElement);scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xffffff,0x94a6b4,1.35));for(const [p,v] of [[[386,-456,1298],1.25],[[-421,316,877],.8],[[105,596,175],.5]]){const light=new THREE.DirectionalLight(0xffffff,v);light.position.set(...p);scene.add(light);}perspective=new THREE.PerspectiveCamera(38,1,.1,6000);orthographic=new THREE.OrthographicCamera(-100,100,100,-100,.1,6000);perspective.up.set(0,0,1);orthographic.up.set(0,0,1);camera=perspective;ground=new THREE.GridHelper(912,52,0xb8cbd6,0xd4e0e8);ground.rotation.x=Math.PI/2;ground.position.z=-.6;ground.material.transparent=true;ground.material.opacity=.54;ground.material.depthWrite=false;scene.add(ground);cutPlane=new THREE.Plane(new THREE.Vector3(0,0,-1),1e8);cutSurface=new THREE.Mesh(new THREE.PlaneGeometry(475,475),new THREE.MeshBasicMaterial({color:0x24a5a1,opacity:.085,transparent:true,side:THREE.DoubleSide,depthWrite:false}));cutSurface.visible=false;scene.add(cutSurface);new ResizeObserver(resize).observe($('canvasWrap'));pointerControls();resize();}
function resize(){const w=$('canvasWrap').clientWidth,h=$('canvasWrap').clientHeight,narrow=w<600;const ratio=Math.min(devicePixelRatio||1,1.5,Math.sqrt((narrow?950000:1900000)/Math.max(1,w*h)));if(renderer.getPixelRatio()!==ratio)renderer.setPixelRatio(ratio);renderer.setSize(w,h,false);syncCamera();if(state.ready&&lastNarrow!==null&&lastNarrow!==narrow&&!state.part&&!state.module)fit(allBox(),35,false);lastNarrow=narrow;}
function syncCamera(){
  const aspect=$('canvasWrap').clientWidth/Math.max(1,$('canvasWrap').clientHeight),hh=distance*Math.tan(38*Math.PI/360);
  camera=state.ortho?orthographic:perspective;
  const eye=new THREE.Vector3(target.x+distance*Math.cos(elevation)*Math.cos(yaw),target.y+distance*Math.cos(elevation)*Math.sin(yaw),target.z+distance*Math.sin(elevation));
  const outward=eye.clone().sub(target).normalize();let nearest=Infinity,farthest=distance+1000;
  if(sceneBounds&&!sceneBounds.isEmpty())for(const x of [sceneBounds.min.x,sceneBounds.max.x])for(const y of [sceneBounds.min.y,sceneBounds.max.y])for(const z of [sceneBounds.min.z,sceneBounds.max.z]){const depth=eye.clone().sub(new THREE.Vector3(x,y,z)).dot(outward);nearest=Math.min(nearest,depth);farthest=Math.max(farthest,depth);}
  // A tight depth interval plus logarithmic perspective depth preserves close face separation.
  const near=Number.isFinite(nearest)&&nearest>0?Math.max(.05,nearest*.65):Math.max(.05,Math.min(80,distance*.025));
  for(const c of [perspective,orthographic]){c.near=near;c.far=Math.max(near+10,farthest+200);}
  perspective.aspect=aspect;perspective.updateProjectionMatrix();orthographic.left=-hh*aspect;orthographic.right=hh*aspect;orthographic.top=hh;orthographic.bottom=-hh;orthographic.updateProjectionMatrix();
  camera.position.copy(eye);camera.lookAt(target);camera.updateMatrixWorld();renderer.domElement.dataset.cameraNear=near.toFixed(5);renderer.domElement.dataset.cameraFar=camera.far.toFixed(3);render();queueDetail();
}
function render(){if(frame||!renderer||closing||document.hidden)return;frame=requestAnimationFrame(now=>{frame=0;if(animation){const t=Math.min(1,(now-animation.start)/animation.duration);setExplode(animation.from+(animation.to-animation.from)*(1-Math.pow(1-t,3)));if(t===1)animation=null;}if(state.tour)tourTick(now);if(state.orbit&&!state.tour&&!tween){const dt=Math.min(50,now-(orbitLast||now));yaw+=dt*.001*state.orbitSpeed;syncCamera();}orbitLast=now;if(tween){const t=Math.min(1,(now-tween.start)/420),s=1-Math.pow(1-t,3);target.lerpVectors(tween.from,tween.to,s);distance=tween.a+(tween.b-tween.a)*s;if(t===1)tween=null;syncCamera();}renderer.render(scene,camera);if(tween||animation||state.tour||state.orbit)render();});}
function fit(box,min=3,animate=true){if(box.isEmpty())return;const center=box.getCenter(new THREE.Vector3()),aspect=$('canvasWrap').clientWidth/Math.max(1,$('canvasWrap').clientHeight),narrow=$('canvasWrap').clientWidth<600,tv=Math.tan(38*Math.PI/360),th=tv*aspect,mv=narrow?.67:.78,mh=narrow?.76:.82,out=new THREE.Vector3(Math.cos(elevation)*Math.cos(yaw),Math.cos(elevation)*Math.sin(yaw),Math.sin(elevation)),right=new THREE.Vector3(-Math.sin(yaw),Math.cos(yaw),0),up=new THREE.Vector3().crossVectors(out,right);let d=min/(2*tv*mv);for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new THREE.Vector3(x,y,z).sub(center),depth=state.ortho?0:p.dot(out);d=Math.max(d,depth+Math.abs(p.dot(right))/(th*mh),depth+Math.abs(p.dot(up))/(tv*mv));}d=Math.max(min,d);if(animate&&!reduced){tween={from:target.clone(),to:center,a:distance,b:d,start:performance.now()};render();}else{tween=null;target.copy(center);distance=d;syncCamera();}}
function material(m,kind){const color=state.colored?new THREE.Color(m.color):new THREE.Color(kind==='hardware'?'#aab6c1':kind==='plate'?'#a5b9c7':'#7895a9');if(state.colored&&kind==='hardware')color.lerp(new THREE.Color('#c0c9d0'),.62);if(state.colored&&kind==='accessory')color.lerp(new THREE.Color('#d0d7dc'),.25);return new THREE.MeshStandardMaterial({color,metalness:kind==='hardware'?.42:.23,roughness:kind==='hardware'?.45:.57,side:THREE.DoubleSide,clippingPlanes:[cutPlane]});}
// Each batch owns one set of attributes and one index. Geometry records refer to
// canonical component IDs; the representation changes, never the part inventory.
function makeLayer(m,spec,raw){
  const lookup=new Map(spec.parts.map(p=>[p.id,p])), groups=new Map();
  const layer={meshes:[],refs:new Map(),bytes:0};
  for(const p of m.parts){
    const r=lookup.get(p.id);
    if(!r||!r.vertexCount||!r.indexCount||r.indexCount%3)throw Error('构件显示索引不完整');
    const key=p.kind+'|'+side(p);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);
  }
  function batch(ps){
    const nv=ps.reduce((v,p)=>v+lookup.get(p.id).vertexCount,0),ni=ps.reduce((v,p)=>v+lookup.get(p.id).indexCount,0);
    const pos=new Float32Array(nv*3),nor=new Int16Array(nv*3),idx=nv<=65535?new Uint16Array(ni):new Uint32Array(ni);
    let v=0,i=0;const ranges=[],box=new THREE.Box3(),translation=new THREE.Vector3(...m.translation).negate();
    for(const p of ps){
      const r=lookup.get(p.id),n=r.vertexCount*3,s=r.stream;
      const q=new Uint16Array(raw,s.p,n), ns=new Int16Array(raw,s.n,n), indices=s.width===2?new Uint16Array(raw,s.i,r.indexCount):new Uint32Array(raw,s.i,r.indexCount);
      const min=p.min,step=p.step;for(let k=0;k<n;k+=3){pos[v*3+k]=min[0]+q[k]*step[0];pos[v*3+k+1]=min[1]+q[k+1]*step[1];pos[v*3+k+2]=min[2]+q[k+2]*step[2];}
      nor.set(ns,v*3);for(let k=0;k<indices.length;k++)idx[i+k]=indices[k]+v;
      ranges.push({start:i,end:i+indices.length,part:p,base:v,vertices:r.vertexCount});
      box.union(boxOf(p.bounds).translate(translation));v+=r.vertexCount;i+=indices.length;
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('normal',new THREE.BufferAttribute(nor,3,true));g.setIndex(new THREE.BufferAttribute(idx,1));g.boundingBox=box;g.boundingSphere=box.getBoundingSphere(new THREE.Sphere());
    const kind=ps[0].kind,mat=material(m,kind),mesh=new THREE.Mesh(g,mat);
    mesh.userData={module:m.id,kind,side:side(ps[0]),ranges,mat,partitionKey:''};layer.meshes.push(mesh);
    for(const r of ranges)layer.refs.set(r.part.id,{mesh,r});layer.bytes+=pos.byteLength+nor.byteLength+idx.byteLength;
  }
  try{
    for(const ps of groups.values()){
      let chunk=[],nv=0;for(const p of ps){const count=lookup.get(p.id).vertexCount;if(chunk.length&&nv+count>65535){batch(chunk);chunk=[];nv=0;}chunk.push(p);nv+=count;}if(chunk.length)batch(chunk);
    }
    return layer;
  }catch(e){disposeLayer(layer);throw e;}
}
function disposeLayer(layer){
  if(!layer)return;
  for(const mesh of layer.meshes){mesh.removeFromParent();mesh.geometry.dispose();mesh.userData.mat.dispose();}
  layer.refs.clear();layer.meshes.length=0;
}
function activateLayer(m,layer){
  if(m.active===layer)return;
  if(!m.root){m.root=new THREE.Group();m.root.position.set(...m.translation);scene.add(m.root);}
  for(const mesh of m.meshes||[]){m.root.remove(mesh);const i=batches.indexOf(mesh);if(i!==-1)batches.splice(i,1);}
  m.active=layer;m.meshes=layer?.meshes||[];m.loaded=!!layer;
  for(const mesh of m.meshes){m.root.add(mesh);batches.push(mesh);}
  if(state.part&&parts.get(state.part).module===m.id)mark(parts.get(state.part));
  if(state.context)refreshNeighborhood();
  visibility();
}
function partGeometry(p){
  const ref=modules.get(p.module).active?.refs.get(p.id);if(!ref)return null;
  const {mesh,r}=ref,g=mesh.geometry,sub=new THREE.BufferGeometry(),pos=g.attributes.position.array,norm=g.attributes.normal.array;
  // These are component-sized GPU uploads; disposing a highlight can no longer invalidate a batch's GPU buffers.
  const a=r.base*3,b=(r.base+r.vertices)*3;
  sub.setAttribute('position',new THREE.BufferAttribute(pos.subarray(a,b),3));sub.setAttribute('normal',new THREE.BufferAttribute(norm.subarray(a,b),3,true));
  const I=r.vertices<=65535?Uint16Array:Uint32Array,ix=new I(r.end-r.start),src=g.index.array;
  for(let i=0;i<ix.length;i++)ix[i]=src[r.start+i]-r.base;
  sub.setIndex(new THREE.BufferAttribute(ix,1));sub.boundingBox=boxOf(p.bounds).translate(new THREE.Vector3(...modules.get(p.module).translation).negate());sub.boundingSphere=sub.boundingBox.getBoundingSphere(new THREE.Sphere());
  return sub;
}
function partitionBatch(mesh,excluded){
  const u=mesh.userData,g=mesh.geometry,skip=excluded.size?u.ranges.filter(r=>excluded.has(r.part.id)):[];
  const key=skip.map(r=>r.part.id).join('|');if(u.partitionKey===key)return;u.partitionKey=key;
  // Subranges skip the selected triangles. Their original face indices remain stable for picking.
  g.clearGroups();
  if(!skip.length){mesh.material=u.mat;g.setDrawRange(0,Infinity);return;}
  mesh.material=[u.mat];let at=0;
  for(const r of skip){if(at<r.start)g.addGroup(at,r.start-at,0);at=r.end;}
  if(at<g.index.count)g.addGroup(at,g.index.count-at,0);
  g.setDrawRange(0,g.groups.length?Infinity:0);
}
function styleSurface(mat,module,kind){
  const color=state.colored?new THREE.Color(module.color):new THREE.Color(kind==='hardware'?'#b7c6cf':kind==='plate'?'#a5b9c7':'#7895a9');
  if(state.colored&&kind==='hardware')color.lerp(new THREE.Color('#d0d9df'),.72);
  if(state.colored&&kind==='accessory')color.lerp(new THREE.Color('#d0d7dc'),.25);
  if(state.hardwareFocus){if(kind==='hardware')color.set('#f5c56b');else color.lerp(new THREE.Color(state.theme==='night'?'#526778':'#aab8c1'),.72);}
  if(state.mode==='overlay')color.lerp(new THREE.Color(state.theme==='night'?'#557483':'#d6e6eb'),1-state.overlayWeight);
  if(state.theme==='night')color.lerp(new THREE.Color('#c8dfed'),.13);
  mat.color.copy(color);mat.opacity=1;mat.transparent=false;mat.depthWrite=true;
  mat.emissive.set(state.hardwareFocus&&kind==='hardware'?'#8c4d12':'#000000');mat.emissiveIntensity=state.hardwareFocus&&kind==='hardware'?.28:0;
}
function updateSectionPlane(){
  const axis=state.sectionAxis,normal=new THREE.Vector3();normal[axis]=-1;
  const bounds=sceneBounds||new THREE.Box3(new THREE.Vector3(-500,-500,0),new THREE.Vector3(500,500,1000));
  const position=bounds.min[axis]+(bounds.max[axis]-bounds.min[axis])*state.section/100;
  cutPlane.normal.copy(normal);cutPlane.constant=state.section<100?position:1e8;
  cutSurface.position.copy(bounds.getCenter(new THREE.Vector3()));cutSurface.position[axis]=position;
  cutSurface.rotation.set(axis==='y'?Math.PI/2:0,axis==='x'?Math.PI/2:0,0);
  const size=bounds.getSize(new THREE.Vector3());cutSurface.scale.set((axis==='x'?size.z:size.x)/475*1.05,(axis==='y'?size.z:size.y)/475*1.05,1);
  cutSurface.visible=state.section<100;
}
function visibility() {
  navigationRevision++;
  const excluded=new Set(state.part&&highlight?[state.part]:[]);if(state.context)for(const mesh of neighborMeshes)excluded.add(mesh.userData.part);
  sceneBounds=data?allBox():null;
  for (const m of modules.values()) {
    if (!m.root) continue;
    m.root.visible = m.visible !== false;
    m.root.position.set(...m.translation).add(moduleOffset(m));
    for (const mesh of m.meshes) {
      partitionBatch(mesh,excluded);
      mesh.position.x = mesh.userData.side * state.explode * 1.473684;
      let show = state.mode !== 'line' && (state.hardware || mesh.userData.kind !== 'hardware');
      if (state.isolate && state.part) show = false;
      else if (state.isolate && state.module !== null) show = show && m.id === state.module;
      mesh.visible = show && !state.context;
      styleSurface(mesh.userData.mat,m,mesh.userData.kind);
    }
  }
  for (const line of lines) {
    const p = parts.get(line.userData.part), m = modules.get(p.module);
    line.position.copy(extra(p));
    // Unloaded solids remain explorable as structure lines during progressive loading.
    line.visible = (state.mode !== 'solid' || !m.loaded || state.context) && m.visible !== false &&
      (!state.isolate || (state.part ? p.id === state.part : m.id === state.module));
    line.material.color.set(p.id === state.part ? '#efb568' : state.mode === 'overlay' ? (state.theme==='night'?'#73f1d9':'#087e85') : state.colored ? m.color : state.theme==='night'?'#a3d9ee':'#3a6c83');
    line.material.opacity = state.context && p.id !== state.part ? .16 : .92;
    line.material.depthWrite = false;
    line.material.depthTest = state.mode !== 'overlay';
    line.renderOrder = state.mode === 'overlay' ? 2 : 0;
  }
  if (highlight && state.part) {
    const p = parts.get(state.part),m = modules.get(p.module);
    highlight.visible = state.mode !== 'line' && m.visible !== false && (state.hardware || p.kind!=='hardware');
    highlight.position.set(...m.translation).add(extra(p));
  }
  for (const mesh of neighborMeshes) {
    const p=parts.get(mesh.userData.part),m=modules.get(p.module);
    mesh.visible=state.context&&state.mode!=='line'&&m.visible!==false&&(state.hardware||p.kind!=='hardware');
    mesh.position.set(...m.translation).add(extra(p));
    styleSurface(mesh.material,m,p.kind);
  }
  ground.visible = state.grid;
  updateSectionPlane();
  $('isolationBadge').classList.toggle('hidden',!state.isolate);
  $('contextBtn').classList.toggle('active',state.context);
  $('contextBtn').disabled=!state.part;
  $('overlayBtn').classList.toggle('active',state.mode==='overlay');
  $('overlaySetting').classList.toggle('hidden',state.mode!=='overlay');
  const labels=[];
  if(state.mode==='line') labels.push('结构线模型');
  if(state.mode==='overlay') labels.push('虚实叠加 · 结构线与实体对照');
  if(state.context) labels.push('空间邻域 '+neighbors.length+' 件 · 非连接判定');
  if(state.explode) labels.push('展开视图 · 仅用于观察');
  if(state.section<100) labels.push(state.sectionAxis.toUpperCase()+' 向剖切 '+Math.round(state.section)+'%');
  if(state.hardwareFocus)labels.push('紧固件聚光 · 仅显示已有实体');
  if(state.inspection)labels.push('已登记接口 · '+state.inspection);
  $('hardwareFocusBtn').classList.toggle('active',state.hardwareFocus);
  $('displayBadge').textContent=labels.join(' · ');
  $('displayBadge').classList.toggle('hidden',!labels.length);
  footer();render();queueDetail();
}
function footer() {
  if(!data)return;
  let n=0;
  for(const p of parts.values()) if(modules.get(p.module).visible!==false&&(state.hardware||p.kind!=='hardware')&&(!state.isolate||(state.part?p.id===state.part:p.module===state.module)))n++;
  const loading=state.loaded<modules.size?' · 实体 '+state.loaded+'/9 已载入':'';
  $('footerStatus').textContent=(state.mode==='line'?'结构线视图':state.mode==='overlay'?'虚实叠加':format(n)+' 件构件参与展示')+loading;
}
function removeHighlight(){if(highlight){scene.remove(highlight);highlight.geometry.dispose();highlight.material.dispose();highlight=null;}}
function mark(p){removeHighlight();const geometry=partGeometry(p);if(!geometry)return;highlight=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0x20a69c,emissive:0x117b73,emissiveIntensity:.2,metalness:.16,roughness:.4,side:THREE.DoubleSide,clippingPlanes:[cutPlane]}));highlight.renderOrder=3;scene.add(highlight);}
function renderModules(){$('moduleList').innerHTML=[...modules.values()].map(m=>`<div class="module-row ${state.module===m.id?'active':''} ${m.visible===false?'off':''}" role="button" tabindex="0" data-module="${m.id}" style="--color:${m.color}"><span class="module-number">${String(m.id).padStart(2,'0')}</span><span class="module-text"><strong>${escape(m.name)} · ${escape(m.role)}</strong><small>${format(m.parts.length)} 件构件</small></span><button class="eye" data-visibility="${m.id}" aria-label="切换模块显隐">${icon('eye')}</button></div>`).join('');}
function renderParts(){
  const q=$('search').value.trim().toLowerCase(),matched=[...parts.values()].filter(p=>!q||(p.label+' '+(detailsData.parts[p.id]?.label||'')+' '+(detailsData.parts[p.id]?.spec||'')+' '+p.id+' '+modules.get(p.module).name+' '+types[p.kind]).toLowerCase().includes(q));
  const summary=detailsStatus==='loading'
    ?'构件资料载入中…来源构件号与规格搜索会在资料到达后自动更新。可先按展示编号选择。'
    :detailsStatus==='error'
      ?'构件资料暂未载入，请重试或刷新页面。当前仅能按展示编号选择。<button class="wide-action" data-retry-details>重试构件资料</button>'
      :`找到 ${format(matched.length)} 件构件${matched.length>160?'，显示前 160 件':''}。支持构件号、规格与展示编号。`;
  $('partList').innerHTML=`<div class="empty-note" role="status">${summary}</div>`+matched.slice(0,160).map(p=>`<button class="part-row ${state.part===p.id?'active':''}" data-part="${p.id}" style="--color:${modules.get(p.module).color}"><i></i><span><strong>${escape(detailsData.parts[p.id]?.label||p.label)}</strong><small>${escape(modules.get(p.module).name)} · ${escape(p.id)}</small></span></button>`).join('');
}
function detailsAvailability(retry=true){
  if(detailsStatus==='loading')return '<p role="status">构件资料载入中…来源参数与局部图纸证据将在资料到达后自动显示。</p>';
  if(detailsStatus==='error')return '<p role="status">构件资料暂未载入，请重试或刷新页面。</p>'+(retry?'<button class="wide-action" data-action="retry-details">重试构件资料</button>':'');
  return '<p>该构件的来源参数尚未确认。</p>';
}
function overview(){if(!data)return;const counts={};for(const p of parts.values())counts[p.kind]=(counts[p.kind]||0)+1;$('details').innerHTML=`<section class="detail-section"><small>FROM OUTLINE TO DETAIL</small><h2>一座结构，<br>无数值得探索的细节。</h2><p>从九个模块的空间关系，<br>走近每一根杆件与每一处连接。</p><span class="tag">可旋转 · 可展开 · 可探索</span><div class="detail-grid"><div><span>结构模块</span><strong>09</strong></div><div><span>展示构件</span><strong>${format(parts.size)}</strong></div></div></section><section class="detail-section"><h3>观察结构的不同方式</h3><p>实体模式看见材料与连接；结构线模式读懂整体关系。模块展开与高度剖切，让内部细节逐层显现。</p><div class="kind-list">${Object.keys(counts).map(k=>`<span><i></i>${types[k]}</span>`).join('')}</div></section><section class="detail-section"><h3>从这里开始</h3><p>点击「演示导览」，跟随六个镜头认识这座结构。也可以直接拖动模型，自由寻找感兴趣的细节。</p><div class="feature-note">这是交互展示模型，包含演示性与条件性内容，不能作为制作、安装或施工依据。</div></section>`;}
function moduleDetails(m){$('details').innerHTML=`<section class="detail-section"><small>MODULE ${String(m.id).padStart(2,'0')}</small><h2>${escape(m.name)}<br>${escape(m.role)}</h2><span class="tag">独立模块</span><div class="detail-grid"><div><span>展示构件</span><strong>${format(m.parts.length)}</strong></div><div><span>观察模式</span><strong>${state.mode==='line'?'结构线':'实体'}</strong></div></div><div class="detail-actions"><button data-action="focus">${icon('target')}聚焦模块</button><button data-action="isolate">${icon('cube')}${state.isolate?'恢复全景':'隔离查看'}</button></div></section><section class="detail-section"><button class="wide-action" data-action="download-module">${icon('download')}下载总装 STEP</button></section><section class="detail-section"><h3>让结构关系更清晰</h3><p>切换结构线，观察杆件之间的空间关系；使用模块展开，把相邻模块分开。所有展示操作都可以随时复位。</p><div class="feature-note">选中构件后可查看来源参数、CAD测量与已核对的局部图纸裁图。当前仍为条件性展示模型。</div></section>`;}
function partDetails(p) {
  const m=modules.get(p.module), d=detailsData.parts[p.id], ev=d?.evidence||[];
  const value=(v,suffix='')=>v===null||v===undefined||v===''?'未确认':escape(typeof v==='number'?Number(v.toFixed(3)):v)+suffix;
  const row=(label,v)=>`<div><dt>${label}</dt><dd>${v}</dd></div>`;
  const dims=d?.dimensionsMm;
  const lengthLabel=d?.lengthRole==='型号名义长度'?(Number.isFinite(d?.lengthMm)?'螺栓名义长度':'名义长度'):d?.lengthRole==='图纸材料表统计长度'?'材料表长度':'登记长度';
  $('details').innerHTML=`
    <section class="detail-section component-heading">
      <small>COMPONENT DOSSIER / M${p.module}</small>
      <h2>${escape(d?.label||p.label)}</h2>
      <span class="tag">${types[p.kind]}</span><span class="tag muted-tag">${d?.state==='conditional'?'条件模型':escape(d?.state||'展示实体')}</span>
      <p>${escape(m.name)} · ${escape(m.role)}</p>
      <div class="detail-actions"><button data-action="focus">${icon('target')}聚焦</button><button data-action="isolate">${icon('cube')}${state.isolate?'恢复全景':'隔离'}</button></div>
      <button class="wide-action ${state.context?'active':''}" data-action="context">${icon('orbit')}${state.context?'关闭空间邻域':'观察周边构件'}</button>
      <p class="loading-inline">${state.mode==='line'?'当前显示结构线。':m.precise?'当前显示原精度实体。':m.lastDetailFailure?'原精度实体暂未载入。':m.loaded?'当前显示总览精度，正在载入原精度实体。':'实体正在载入，可先查看结构线与构件资料。'}</p>
    </section>
    <section class="detail-section"><div class="section-title"><h3>构件信息</h3><span>来源登记</span></div>
      ${d?`<dl class="facts">${row('构件号',value(d.label))}${row('规格',value(d.spec))}${row('材质',value(d.material))}${row(lengthLabel,value(d.lengthMm,' mm'))}${row('登记孔数',value(d.holeCount))}${row('来源标识',value(d.sourceId))}</dl>`:detailsAvailability()}
    </section>
    <section class="detail-section"><div class="section-title"><h3>实体测量</h3><span>模型包围盒</span></div>
      <div class="dimension-triplet">${['X','Y','Z'].map((axis,i)=>`<div><small>${axis}</small><strong>${dims&&Number.isFinite(dims[i])?Number(dims[i].toFixed(2)):'—'}</strong><span>mm</span></div>`).join('')}</div>
      <p>以上为世界坐标方向的包围盒尺寸，不能代替杆件下料长度。</p>
    </section>
    <section class="detail-section"><div class="section-title"><h3>局部图纸证据</h3><span>${ev.length?ev.length+' 项':detailsStatus==='loading'?'载入中':detailsStatus==='error'?'未载入':'待核对'}</span></div>
      ${ev.length?ev.map((e,i)=>`<button class="evidence-card" data-evidence="${i}">${e.image&&safeAsset(e.image)?`<img src="${escape(e.image)}" alt="${escape(e.title||'构件局部图纸')}" loading="lazy">`:''}<span><strong>${escape(e.title||'局部证据')}</strong><small>${escape(e.drawing||'图号待确认')}${e.page?' · 第 '+escape(e.page)+' 页':''}</small><em>${escape(e.caption||'点击放大局部证据')}</em></span></button>`).join(''):detailsStatus!=='ready'?detailsAvailability(false):'<div class="feature-note">尚无已核对并可公开的对应局部裁图。未以其他构件或完整图纸替代。</div>'}
      ${ev.length?'<p>仅展示对应局部；裁图说明支持范围，不能单独证明安装关系已闭合。</p>':''}
    </section>
    ${d?.notes?.length?`<section class="detail-section"><h3>状态与说明</h3>${d.notes.map(n=>`<p>${escape(n)}</p>`).join('')}</section>`:''}
    ${d?.historyNotes?.length?`<section class="detail-section"><details><summary>此前版本记录</summary>${d.historyNotes.map(n=>`<p>${escape(n)}</p>`).join('')}</details></section>`:''}
    <section class="detail-section"><button class="wide-action" data-action="download-module">${icon('download')}下载总装 STEP</button><p class="subtle-id">展示索引 ${escape(p.id)}</p></section>`;
}
function showEvidence(index) {
  const p=parts.get(state.part),d=p&&detailsData.parts[p.id],e=d?.evidence?.[index];
  if(!e)return;
  dialog(`<div class="evidence-view"><small>DRAWING EXCERPT</small><h2>${escape(e.title||d.label)}</h2><p>${escape(e.drawing||'')}${e.page?' · 第 '+escape(e.page)+' 页':''}</p>${e.image&&safeAsset(e.image)?`<a href="${escape(e.image)}" target="_blank" rel="noopener"><img src="${escape(e.image)}" alt="${escape(e.title||d.label)}"></a>`:''}<p>${escape(e.caption||'')}</p><div class="feature-note">${escape(e.authority||'局部图纸证据')} · 仅公开对应局部，完整图纸未提供。</div></div>`);
}
function safeAsset(url){return typeof url==='string'&&/^assets\/(?:evidence|downloads)\//.test(url)&&!url.includes('..');}
function openInspector(){document.body.classList.remove('details-hidden');if(state.stage)setStage(false);if(innerWidth<=1040){$('inspector').classList.add('open');$('explorer').classList.remove('open');}$('details').scrollTop=0;}

function selectModule(id,focus=false){lastHitModule=0;const m=modules.get(Number(id));if(!m)return;state.module=m.id;state.part=null;state.isolate=false;state.context=false;state.inspection=null;inspectionParts=[];clearNeighborhood();removeHighlight();$('selectionChip').classList.add('hidden');$('viewTitle').textContent=m.name+' · '+m.role;$('viewSubtitle').innerHTML='<i></i>观察模块与周围结构的空间关系';moduleDetails(m);openInspector();renderModules();visibility();if(focus){m.visible=true;visibility();fit(moduleBox(m));}if(innerWidth<721)$('explorer').classList.remove('open');}
function selectPart(id,focus=false){const p=parts.get(id);if(!p)return;lastHitModule=0;if(!detailsLoaded)loadDetails();state.inspection=null;inspectionParts=[];if(state.mode==='line'&&!lines.some(l=>l.userData.part===id))setMode('solid');state.part=id;state.module=p.module;const m=modules.get(p.module);m.visible=true;if(p.kind==='hardware'){state.hardware=true;$('hardware').checked=true;}mark(p);if(state.context)refreshNeighborhood();$('selectionChip').classList.remove('hidden');$('selectionChip').querySelector('span').textContent=(detailsData.parts[p.id]?.label||p.label)+' · '+m.name;$('viewTitle').textContent=m.name+' · '+m.role;$('viewSubtitle').innerHTML='<i></i>单件观察 · 展示编号 '+escape(p.id);partDetails(p);openInspector();renderModules();if(state.tab==='parts')renderParts();visibility();if(focus)fit(partBox(p),5.5);if(innerWidth<721)$('explorer').classList.remove('open');}
function reset(full=false){lastHitModule=0;animation=null;stopOrbit();if(full)stopTour();state.module=null;state.part=null;state.isolate=false;state.context=false;state.inspection=null;inspectionParts=[];clearNeighborhood();removeHighlight();$('selectionChip').classList.add('hidden');$('viewTitle').textContent='九模块 · 结构全景';$('viewSubtitle').innerHTML='<i></i>自由旋转 · 走近每一处细节';clearTimeout(toastTimer);$('toast').classList.remove('visible');if(full){state.hardwareFocus=false;setSectionAxis('z');for(const m of modules.values())m.visible=true;setExplode(0);setSection(100);view('iso',false);}overview();renderModules();visibility();if(full)fit(allBox(),35);}
function focus(){fit(state.part?partBox(parts.get(state.part)):state.module?moduleBox(modules.get(state.module)):allBox(),state.part?5.5:20);}
function view(name,refit=true){state.view=name;({iso:()=>{yaw=-1.08;elevation=.14;},front:()=>{yaw=-Math.PI/2;elevation=0;},side:()=>{yaw=0;elevation=0;},top:()=>{yaw=-Math.PI/2;elevation=Math.PI/2-.0001;}}[name]||(()=>{}))();document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));if(refit)focus();syncCamera();}
function setExplode(v){state.explode=Math.max(0,Math.min(100,Number(v)));$('explode').value=state.explode;$('explodeValue').textContent=Math.round(state.explode)+'%';visibility();}function setSection(v){state.section=Math.max(0,Math.min(100,Number(v)));$('section').value=state.section;$('sectionValue').textContent=state.section===100?'完整':Math.round(state.section)+'%';visibility();}function setMode(mode){if(mode!=='solid'&&!lines.length){notify('结构线视图仍在准备中');return;}state.mode=mode;$('modelMode').classList.toggle('active',mode==='line');$('modelMode').querySelector('span').textContent=mode==='line'?'结构线':mode==='overlay'?'叠加对照':'实体模型';visibility();}
function changeTab(tab){state.tab=tab;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));$('moduleList').classList.toggle('hidden',tab!=='modules');$('partList').classList.toggle('hidden',tab!=='parts');if(tab==='parts'){if(!detailsLoaded)loadDetails();renderParts();}}
function zoomAtPointer(event,canvas) {
  const rect=canvas.getBoundingClientRect();
  const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?rect.height:1);
  if(!rect.width||!rect.height||!Number.isFinite(delta)||delta===0)return;
  const nextDistance=Math.max(1.5,Math.min(7000,distance*Math.exp(Math.max(-.45,Math.min(.45,delta*.001)))));
  if(nextDistance===distance)return;
  const now=performance.now();
  // Reuse the same anchor throughout a wheel gesture instead of raycasting every frame.
  const reuse=wheelAnchor&&now-wheelAnchor.time<220&&
    event.clientX===wheelAnchor.x&&event.clientY===wheelAnchor.y&&
    rect.left===wheelAnchor.rect.left&&rect.top===wheelAnchor.rect.top&&
    rect.width===wheelAnchor.rect.width&&rect.height===wheelAnchor.rect.height&&
    navigationRevision===wheelAnchor.revision&&
    camera.matrixWorld.equals(wheelAnchor.camera)&&camera.projectionMatrix.equals(wheelAnchor.projection);
  let anchor=reuse?wheelAnchor.point:null;
  if(!anchor){
    const mouse=new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);
    const ray=new THREE.Raycaster(),forward=camera.getWorldDirection(new THREE.Vector3());
    const visible=object=>{for(let node=object;node;node=node.parent)if(!node.visible)return false;return true;};
    scene.updateMatrixWorld(true);
    ray.setFromCamera(mouse,camera);
    ray.params.Line.threshold=Math.max(.2,distance*.0018);
    const candidates=state.mode==='line'?lines.filter(visible):
      (state.context?neighborMeshes:batches).filter(visible);
    if(state.mode!=='line'){
      if(state.context||state.mode==='overlay')candidates.push(...lines.filter(visible));
      else if(state.loaded<modules.size)candidates.push(...lines.filter(line=>visible(line)&&!modules.get(parts.get(line.userData.part).module).loaded));
      if(highlight&&visible(highlight))candidates.push(highlight);
    }
    const relative=new THREE.Vector3();
    const hit=ray.intersectObjects(candidates,false).find(hit=>{
      const depth=relative.copy(hit.point).sub(camera.position).dot(forward);
      return depth>=camera.near&&depth<=camera.far&&(state.section===100||cutPlane.distanceToPoint(hit.point)>=0);
    });
    lastHitModule=hit?(hit.object.userData.module||parts.get(hit.object.userData.part||state.part)?.module||0):0;
    // Project line hits back onto the cursor ray; blank space uses the current focus plane.
    const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(forward,hit?hit.point:target);
    anchor=ray.ray.intersectPlane(plane,new THREE.Vector3());
    if(!anchor)return;
  }
  // Scale both the target and camera distance around the anchor. This preserves its
  // screen position in perspective and orthographic views without crossing the surface.
  target.sub(anchor).multiplyScalar(nextDistance/distance).add(anchor);
  distance=nextDistance;
  syncCamera();
  wheelAnchor={point:anchor,time:now,x:event.clientX,y:event.clientY,rect,revision:navigationRevision,
    camera:camera.matrixWorld.clone(),projection:camera.projectionMatrix.clone()};
}
function pointerControls(){const canvas=renderer.domElement,ray=new THREE.Raycaster(),mouse=new THREE.Vector2(),pointers=new Map();let gesture;canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('pointerdown',e=>{wheelAnchor=null;stopTour();stopOrbit();canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});gesture={x:e.clientX,y:e.clientY,pan:e.button===2||e.shiftKey,moved:false};tween=null;});canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId)||!gesture)return;const old=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const dx=e.clientX-old.x,dy=e.clientY-old.y;if(Math.abs(e.clientX-gesture.x)+Math.abs(e.clientY-gesture.y)>4)gesture.moved=true;if(pointers.size===2){const other=[...pointers.entries()].find(p=>p[0]!==e.pointerId)[1],a=Math.hypot(old.x-other.x,old.y-other.y),b=Math.hypot(e.clientX-other.x,e.clientY-other.y);if(b>5)distance*=a/b;pan(dx/2,dy/2);}else if(gesture.pan)pan(dx,dy);else{yaw-=dx*.006;elevation=Math.max(-1.52,Math.min(1.52,elevation+dy*.005));document.querySelectorAll('[data-view]').forEach(b=>b.classList.remove('active'));}syncCamera();});canvas.addEventListener('pointerup',e=>{const click=gesture&&!gesture.moved&&!gesture.pan&&pointers.size===1;pointers.delete(e.pointerId);if(click){const rect=canvas.getBoundingClientRect();mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(mouse,camera);ray.params.Line.threshold=Math.max(.2,distance*.0018);const candidates=state.mode==='line'?lines.filter(l=>l.visible):state.context?neighborMeshes.filter(b=>b.visible):batches.filter(b=>b.visible&&b.parent.visible);if(state.mode!=='line'&&state.loaded<modules.size)candidates.push(...lines.filter(l=>l.visible&&!modules.get(parts.get(l.userData.part).module).loaded));if(highlight?.visible)candidates.push(highlight);const hits=ray.intersectObjects(candidates,false).filter(h=>state.section===100||cutPlane.distanceToPoint(h.point)>=0);if(hits.length){const hit=hits[0];if(hit.object.userData.part)selectPart(hit.object.userData.part);else if(hit.object===highlight)selectPart(state.part);else{const k=hit.faceIndex*3,ranges=hit.object.userData.ranges;let lo=0,hi=ranges.length-1;while(lo<=hi){const mid=(lo+hi)>>1,r=ranges[mid];if(k<r.start)hi=mid-1;else if(k>=r.end)lo=mid+1;else{selectPart(r.part.id);break;}}}}}if(!pointers.size)gesture=null;});canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);gesture=null;});canvas.addEventListener('dblclick',focus);canvas.addEventListener('wheel',e=>{e.preventDefault();stopTour();stopOrbit();tween=null;zoomAtPointer(e,canvas);},{passive:false});function pan(dx,dy){const scale=distance*Math.tan(38*Math.PI/360)*2/Math.max(1,canvas.clientHeight),right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0),up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1);target.addScaledVector(right,-dx*scale).addScaledVector(up,dy*scale);}}
const scenes=[{title:'先看轮廓，再看细节',caption:'结构线勾勒出整座结构的空间关系。',duration:6000,run(){reset();setExplode(0);setSection(100);setMode('line');view('iso',false);fit(allBox(),35);}},{title:'每一件，都值得走近',caption:'切换实体模型，观察材料形状与连接细节。',duration:6000,run(){setMode('solid');fit(allBox(),35);}},{title:'九个模块，一次展开',caption:'横担向左右展开，塔身沿高度分层。',duration:6500,run(){setExplode(70);fit(allBox(),35);setExplode(0);if(reduced)setExplode(70);else animation={from:0,to:70,start:performance.now(),duration:1800};}},{title:'逐层看见内部空间',caption:'高度剖切，让隐藏在结构内部的细节显现。',duration:6500,run(){setExplode(0);fit(allBox(),35);setSection(90);}},{title:'走近一个模块',caption:'可以选择、聚焦，也可以隔离观察每一件构件。',duration:6500,run(){setSection(100);selectModule(6,true);}},{title:'把视角交给你',caption:'拖动旋转，滚轮缩放。开始你的自由探索。',duration:6000,run(){reset();setSection(100);setExplode(0);view('iso',false);fit(allBox(),35);}}];
function startTour(){if(!state.ready)return;stopOrbit();clearTimeout(toastTimer);$('toast').classList.remove('visible');state.tour=true;tourIndex=0;tourStart=performance.now();lastFrame=tourStart;$('tourPanel').classList.remove('hidden');$('tourBtn').classList.add('active');$('tourBtn').querySelector('span').textContent='停止导览';tourScene();render();}function tourScene(){animation=null;const s=scenes[tourIndex];s.run();$('tourTitle').textContent=s.title;$('tourCaption').textContent=s.caption;$('tourCounter').textContent=String(tourIndex+1).padStart(2,'0')+' / 06';}function stopTour(){if(!state.tour)return;state.tour=false;animation=null;$('tourPanel').classList.add('hidden');$('tourBtn').classList.remove('active');$('tourBtn').querySelector('span').textContent='演示导览';render();}function nextTour(){animation=null;if(++tourIndex>=scenes.length){stopTour();return;}tourStart=performance.now();tourScene();}function tourTick(now){const progress=Math.min(1,(now-tourStart)/scenes[tourIndex].duration);$('tourProgress').style.width=(progress*100)+'%';if(!reduced&&tourIndex!==3&&!tween){yaw+=Math.min(50,now-lastFrame)*.000028;syncCamera();}if(tourIndex===3)setSection(90-progress*58);lastFrame=now;if(progress===1)nextTour();}
// Studio controls deliberately affect presentation only; source solids stay unchanged.
function setTheme(theme) {
  state.theme=theme==='night'?'night':'light';
  document.body.dataset.theme=state.theme;
  $('themeBtn').querySelector('span').textContent=state.theme==='night'?'日光展厅':'夜间展厅';
  $('themeBtn').setAttribute('aria-label',state.theme==='night'?'切换日光展厅':'切换夜间展厅');
  renderer.toneMappingExposure=state.theme==='night'?1.62:1.22;
  const lights=scene.children.filter(x=>x.isLight);
  lights.forEach((light,i)=>{if(light.isHemisphereLight){light.color.set(state.theme==='night'?'#c4e9ff':'#ffffff');light.groundColor.set(state.theme==='night'?'#718692':'#94a6b4');}else light.intensity=(i===1?1.25:i===2?.8:.5)*(state.theme==='night'?1.16:1);});
  ground.material.opacity=state.theme==='night'?.23:.54;
  try{localStorage.setItem('assembly-theme-r4',state.theme);}catch{}
  visibility();
}
function clearNeighborhood(){
  for(const mesh of neighborMeshes){scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}
  neighborMeshes.length=0;neighbors=[];
}
function refreshNeighborhood(){
  clearNeighborhood();
  const selected=parts.get(state.part);if(!state.context||!selected)return;
  const selectedBox=boxOf(selected.bounds),region=selectedBox.clone().expandByScalar(6),center=selectedBox.getCenter(new THREE.Vector3());
  neighbors=[...parts.values()].filter(p=>p.id!==selected.id&&(inspectionParts.includes(p.id)||boxOf(p.bounds).intersectsBox(region))).sort((a,b)=>(inspectionParts.includes(b.id)?1:0)-(inspectionParts.includes(a.id)?1:0)||boxOf(a.bounds).distanceToPoint(center)-boxOf(b.bounds).distanceToPoint(center)).slice(0,48);
  for(const p of neighbors){
    const m=modules.get(p.module),geometry=partGeometry(p);if(!geometry)continue;
    const mat=material(m,p.kind);
    const mesh=new THREE.Mesh(geometry,mat);mesh.userData.part=p.id;mesh.renderOrder=2;scene.add(mesh);neighborMeshes.push(mesh);
  }
}
function toggleContext(){
  if(!state.part){notify('先选择一件构件，再观察周边空间。');return;}
  stopTour();state.context=!state.context;state.isolate=false;
  if(state.context){setMode('solid');refreshNeighborhood();const box=partBox(parts.get(state.part));for(const p of neighbors)box.union(partBox(p));fit(box,12);notify('显示空间邻近构件，不表示连接关系已确认。');}
  else clearNeighborhood();
  visibility();partDetails(parts.get(state.part));
}
function captureView(){
  return {v:1,target:target.toArray().map(n=>+n.toFixed(4)),distance:+distance.toFixed(4),yaw:+yaw.toFixed(5),elevation:+elevation.toFixed(5),mode:state.mode,theme:state.theme,explode:state.explode,section:state.section,part:state.part,module:state.module,visible:[...modules.values()].filter(m=>m.visible!==false).map(m=>m.id),hardware:state.hardware,ortho:state.ortho,grid:state.grid,colored:state.colored,isolate:state.isolate,context:state.context,sectionAxis:state.sectionAxis,hardwareFocus:state.hardwareFocus,overlayWeight:state.overlayWeight,inspection:state.inspection,inspectionParts};
}
function applyView(v){
  if(!v||v.v!==1||!Array.isArray(v.target)||v.target.length!==3||!v.target.every(Number.isFinite)||!Number.isFinite(v.distance)||!Number.isFinite(v.yaw)||!Number.isFinite(v.elevation))throw Error('视角数据不可用');
  stopTour();reset();animation=null;tween=null;
  for(const m of modules.values())m.visible=!Array.isArray(v.visible)||v.visible.includes(m.id);
  state.hardware=v.hardware!==false;$('hardware').checked=state.hardware;
  state.grid=v.grid!==false;$('ground').checked=state.grid;
  state.ortho=!!v.ortho;$('projection').textContent=state.ortho?'正交':'透视';
  if(typeof v.colored==='boolean'&&v.colored!==state.colored)$('colorMode').click();
  state.hardwareFocus=!!v.hardwareFocus;state.overlayWeight=Number.isFinite(v.overlayWeight)?Math.max(.12,Math.min(.88,v.overlayWeight)):.65;$('overlayWeight').value=state.overlayWeight*100;$('overlayWeightValue').textContent=Math.round(state.overlayWeight*100)+'%';setSectionAxis(v.sectionAxis||'z');setTheme(v.theme);setExplode(v.explode||0);setSection(Number.isFinite(v.section)?v.section:100);setMode(['solid','line','overlay'].includes(v.mode)?v.mode:'solid');
  if(v.part&&parts.has(v.part))selectPart(v.part);else if(modules.has(v.module))selectModule(v.module);
  state.isolate=!!v.isolate&&!!(state.part||state.module);
  state.context=!!v.context&&!!state.part;
  if(state.context){state.isolate=false;state.inspection=typeof v.inspection==='string'?v.inspection:null;inspectionParts=Array.isArray(v.inspectionParts)?v.inspectionParts.filter(id=>parts.has(id)).slice(0,48):[];refreshNeighborhood();}
  if(state.part)partDetails(parts.get(state.part));
  target.fromArray(v.target.map(x=>Math.max(-5000,Math.min(5000,x))));distance=Math.max(1.5,Math.min(7000,v.distance));yaw=v.yaw;elevation=Math.max(-1.52,Math.min(1.52,v.elevation));
  renderModules();visibility();syncCamera();
}
function getViews(){try{const v=JSON.parse(localStorage.getItem('assembly-views-r4')||'[]');return Array.isArray(v)?v.slice(0,8):[];}catch{return[];}}
function writeViews(views){try{localStorage.setItem('assembly-views-r4',JSON.stringify(views));return true;}catch{notify('浏览器未允许保存本地视角。');return false;}}
function showViews(){
  stopTour();const views=getViews(),shareUrl=new URL(location.href);shareUrl.hash='view='+encodeURIComponent(JSON.stringify(captureView()));
  dialog(`<div class="view-library"><small>YOUR VIEWPOINTS</small><h2>收藏一个观察角度</h2><p>保留相机、显示模式、展开和剖切状态。收藏保存在此浏览器；分享链接可以恢复同一视角。</p><div class="view-save-row"><input id="viewName" aria-label="视角名称" maxlength="36" placeholder="例如：模块七节点近景"><button data-studio="save-view">收藏当前视角</button></div><button class="wide-action" data-studio="share-view">${icon('bookmark')}复制当前视角链接</button><div class="view-items">${views.length?views.map((v,i)=>`<div><button data-restore-view="${i}"><span>${String(i+1).padStart(2,'0')}</span><strong>${escape(v.name)}</strong><small>${escape(v.mode==='line'?'结构线':v.mode==='overlay'?'虚实叠加':'实体')} · ${v.part?'构件视角':v.module?'模块视角':'总装全景'}</small></button><button data-remove-view="${i}" aria-label="删除此收藏">${icon('close')}</button></div>`).join(''):'<p class="empty-note">把值得反复观察的细节，收进你的第一张视角卡片。</p>'}</div><div id="shareFallback"><label class="share-fallback">当前视角链接<input id="shareUrl" aria-label="当前视角分享链接" readonly value="${escape(shareUrl.href)}"></label><p id="shareStatus" role="status" aria-live="polite">可选中链接手动复制，或点击上方复制按钮。</p></div></div>`);
}
async function shareView(){
  const url=new URL(location.href);url.hash='view='+encodeURIComponent(JSON.stringify(captureView()));
  $('shareUrl').value=url.href;
  $('shareStatus').textContent='正在复制当前视角链接…';
  try{await navigator.clipboard.writeText(url.href);$('shareStatus').textContent='已复制。若粘贴为空，可选中上方完整链接手动复制。';}
  catch{$('shareStatus').textContent='当前浏览器未允许自动复制，请选中上方完整链接手动复制。';}
}
function restoreSharedView(){
  if(!location.hash.startsWith('#view='))return;
  try{const text=location.hash.slice(6);if(text.length>6000)throw Error();applyView(JSON.parse(decodeURIComponent(text)));notify('已恢复分享视角。');}catch{notify('分享视角无效，已保留默认全景。');}
}
function saveBlob(blob,filename){
  const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=filename;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
function exportPoster(){
  if(!state.ready){notify('结构视图仍在准备中。');return;}
  stopTour();stopOrbit();tween=null;renderer.render(scene,camera);
  const canvas=document.createElement('canvas'),w=2400,h=1800;canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d'),night=state.theme==='night';
  ctx.fillStyle=night?'#091623':'#edf4f7';ctx.fillRect(0,0,w,h);
  const src=renderer.domElement,scale=Math.min((w-180)/src.width,(h-330)/src.height),dw=src.width*scale,dh=src.height*scale;
  ctx.drawImage(src,(w-dw)/2,190+(h-330-dh)/2,dw,dh);
  ctx.fillStyle=night?'#91c5cd':'#567d8c';ctx.font='24px sans-serif';ctx.fillText('ASSEMBLY EXPLORER / STRUCTURE STUDY',90,80);
  ctx.fillStyle=night?'#e5f4ff':'#193e53';ctx.font='48px sans-serif';ctx.fillText(state.part?(detailsData.parts[state.part]?.label||parts.get(state.part).label):state.module?modules.get(state.module).name+' · '+modules.get(state.module).role:'九模块 · 结构全景',90,150);
  ctx.strokeStyle=night?'#263e50':'#c7d9e1';ctx.beginPath();ctx.moveTo(90,h-112);ctx.lineTo(w-90,h-112);ctx.stroke();
  ctx.fillStyle=night?'#a7c1d0':'#6b8b9c';ctx.font='22px sans-serif';ctx.fillText('九模块展示 · 塔腿待补 · 非施工依据',90,h-67);ctx.textAlign='right';ctx.fillText((state.mode==='overlay'?'虚实叠加':state.mode==='line'?'结构线':'实体')+' / '+new Date().toLocaleDateString('zh-CN'),w-90,h-67);
  canvas.toBlob(blob=>{if(blob){saveBlob(blob,'结构漫游-'+(state.module?'模块'+state.module:'总装')+'.png');notify('2400 × 1800 展示海报已生成。');}},'image/png');
}
function validDownloadManifest(d){
  if(!d||!Array.isArray(d.files)||!d.files.length)return false;
  const ids=new Set();
  return d.files.every(f=>{
    if(!f||typeof f.id!=='string'||ids.has(f.id)||typeof f.filename!=='string'||!f.filename.endsWith('.zip')||/[\\/]/.test(f.filename)||!Number.isSafeInteger(f.bytes)||f.bytes<=0||!/^([a-f0-9]{64})$/.test(f.sha256)||!Array.isArray(f.chunks)||!f.chunks.length)return false;
    if(f.directUrl!==undefined&&(!safeAsset(f.directUrl)||!/^assets\/downloads\/[A-Za-z0-9._-]+\.zip$/.test(f.directUrl)))return false;
    ids.add(f.id);
    return f.chunks.every(c=>safeAsset(c.url)&&Number.isSafeInteger(c.bytes)&&c.bytes>0&&/^[a-f0-9]{64}$/.test(c.sha256))&&f.chunks.reduce((n,c)=>n+c.bytes,0)===f.bytes;
  });
}
function bytesLabel(n){return n>=1e6?(n/1e6).toFixed(1)+' MB':Math.round(n/1000)+' KB';}
function openDownloads(moduleId=null){
  moduleId=null; // Public hosting keeps one complete assembly download.
  stopTour();const files=downloadData.files||[],selected=moduleId?files.filter(f=>f.module===moduleId):files;
  const canVerify=!!globalThis.crypto?.subtle;
  const directNotice=canVerify?'':'<div class="feature-note" role="status">当前环境无法执行浏览器自动校验。可使用完整 ZIP 直链；文件在服务器发布时已核对，下载后可按下列 SHA-256 自行复核。</div>';
  const directAction=f=>safeAsset(f.directUrl)&&/^assets\/downloads\/[A-Za-z0-9._-]+\.zip$/.test(f.directUrl)?`<a class="wide-action" href="${escape(f.directUrl)}" download="${escape(f.filename)}">${icon('download')}直接下载 ZIP（服务器已校验）</a><small>SHA-256<br><code class="subtle-id">${escape(f.sha256)}</code></small>`:'<small role="status">完整 ZIP 直链尚未准备好，请使用 HTTPS 入口进行校验下载。</small>';
  dialog(`<div class="download-center"><small>ENGINEERING MODEL LIBRARY</small><h2>${moduleId?'模块 '+moduleId+' · STEP':'带走完整的三维模型'}</h2><p>下载包内为 STEP 实体模型，不包含完整图纸。ZIP 解压后可在支持 STEP 的 CAD 软件中打开。</p>${directNotice}<div class="download-list">${selected.length?selected.map(f=>`<article><div><strong>${escape(f.label)}</strong><span>${format(f.entityCount||0)} 个实体 · ZIP ${bytesLabel(f.bytes)}</span><small>${escape(f.note||'条件性展示模型，塔腿待补。')}</small>${directAction(f)}</div>${canVerify?`<button data-download="${escape(f.id)}" ${downloadTask?'disabled':''}>${icon('download')}在浏览器内校验并下载</button>`:''}</article>`).join(''):`<p>${downloadsLoaded?'下载清单暂不可用，请刷新后重试。':'下载清单正在载入，请稍后重新打开。'}</p>`}</div><div id="downloadProgress" class="download-progress ${downloadTask?'':'hidden'}" role="status"><strong id="downloadTitle"></strong><div class="progress"><i id="downloadBar"></i></div><p id="downloadStatus"></p><button id="cancelDownload" data-studio="cancel-download">取消下载</button></div><div class="feature-note">模型保留现有实体与条件性状态，尚有接口相交及未闭合项目，不能作为直接制作、安装或施工依据。</div>${moduleId?'<button class="wide-action" data-studio="all-downloads">查看总装与全部模块</button>':''}</div>`);
  updateDownloadProgress();
}

function updateDownloadProgress(){
  if(!$('downloadProgress')||!downloadTask)return;
  $('downloadProgress').classList.remove('hidden');$('downloadTitle').textContent=downloadTask.file.label;
  $('downloadBar').style.width=Math.min(100,100*downloadTask.loaded/downloadTask.file.bytes)+'%';
  $('downloadStatus').textContent=downloadTask.message||bytesLabel(downloadTask.loaded)+' / '+bytesLabel(downloadTask.file.bytes)+' · 正在接收模型';
  $('cancelDownload').hidden=false;$('cancelDownload').disabled=downloadTask.phase==='verify';
}
async function sha256(bytes){const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('');}
async function startDownload(id){
  if(downloadTask){notify('已有模型正在下载，请等待或取消。');return;}
  const file=downloadData.files.find(f=>f.id===id);if(!file){notify('未找到对应的下载项，请刷新下载清单后重试。');return;}
  if(!crypto.subtle){notify('当前环境无法校验下载文件，请使用 HTTPS 或 localhost。');return;}
  const task={file,controller:new AbortController(),loaded:0,phase:'receive',message:''};downloadTask=task;
  document.querySelectorAll('[data-download]').forEach(b=>b.disabled=true);updateDownloadProgress();
  try{
    const chunks=[];
    for(const chunk of file.chunks){
      if(!safeAsset(chunk.url))throw Error('下载资源地址无效');
      const response=await fetch(chunk.url,{signal:task.controller.signal});if(!response.ok)throw Error('模型资源暂时无法下载');
      const reader=response.body?.getReader(),pieces=[];let bytes=0;
      if(reader){while(true){const {done,value}=await reader.read();if(done)break;pieces.push(value);bytes+=value.byteLength;task.loaded+=value.byteLength;updateDownloadProgress();}}
      else{const value=new Uint8Array(await response.arrayBuffer());pieces.push(value);bytes=value.byteLength;task.loaded+=bytes;updateDownloadProgress();}
      if(bytes!==chunk.bytes)throw Error('下载数据长度不匹配，请重试');
      const joined=new Uint8Array(bytes);let offset=0;for(const piece of pieces){joined.set(piece,offset);offset+=piece.byteLength;}
      if(await sha256(joined)!==chunk.sha256)throw Error('模型文件校验未通过，请重试');
      chunks.push(joined);
    }
    if(task.controller.signal.aborted)throw new DOMException('Aborted','AbortError');
    task.phase='verify';task.message='文件接收完成，正在校验完整下载包…';updateDownloadProgress();
    const blob=new Blob(chunks,{type:'application/zip'});
    if(blob.size!==file.bytes||await sha256(await blob.arrayBuffer())!==file.sha256)throw Error('完整模型校验未通过，请重试');
    saveBlob(blob,file.filename);task.message='校验完成，已交给浏览器保存。解压 ZIP 即可获得 STEP。';updateDownloadProgress();notify('模型校验通过，已开始保存下载包。');
  }catch(error){task.message=error.name==='AbortError'?'下载已取消，可随时重新开始。':error.message;updateDownloadProgress();notify(task.message);}
  finally{downloadTask=null;document.querySelectorAll('[data-download]').forEach(b=>b.disabled=false);if($('cancelDownload'))$('cancelDownload').hidden=true;}
}
function stopOrbit(){state.orbit=false;orbitLast=0;if($('orbitBtn')){$('orbitBtn').classList.remove('active');$('orbitBtn').querySelector('span').textContent='环绕镜头';$('orbitBtn').setAttribute('aria-label','环绕镜头');}}
function setStage(value){state.stage=!!value;document.body.classList.toggle('focus-stage',state.stage);$('focusStage').classList.toggle('active',state.stage);$('focusStage').setAttribute('aria-label',state.stage?'退出专注舞台':'专注舞台');if(state.stage){$('inspector').classList.remove('open');$('explorer').classList.remove('open');}requestAnimationFrame(resize);}
function setSectionAxis(axis){state.sectionAxis=['x','y','z'].includes(axis)?axis:'z';document.querySelectorAll('[data-section-axis]').forEach(b=>b.classList.toggle('active',b.dataset.sectionAxis===state.sectionAxis));if(cutPlane)visibility();}
function showInspections(){
  stopTour();stopOrbit();
  const summary=inspectionData?.summary,rows=inspectionData?.interfaces||[];
  dialog(`<div class="inspection-library"><small>CONNECTION REVIEW</small><h2>走近每一个接口</h2><p>从已登记的实体相交记录，直接进入连接近景。此清单用于观察与复核，不是实时碰撞检测，也不代表所有空孔都应安装紧固件。</p>${inspectionStatus==='loading'?'<div class="feature-note">接口记录正在载入，请稍后重新打开。</div>':inspectionStatus==='error'?'<div class="feature-note">接口记录暂不可用，请刷新页面重试。</div>':`<div class="inspection-summary"><strong>${format(summary?.knownCrossModulePairs||0)}</strong><span>已登记的跨模块相交对<br><small>${escape(summary?.scope||'按现有实体核验记录')}</small></span></div><div class="inspection-list">${rows.map((r,i)=>`<article><button class="inspection-open" data-inspect="${i}"><span>${String(i+1).padStart(2,'0')}</span><div><strong>${escape(r.title)}</strong><small>${escape(r.description||'查看该接口的实体关系')}</small></div><b>${format(r.pairCount||0)}<small>对</small></b></button>${r.examples?.length?`<div class="inspection-examples">${r.examples.slice(0,3).map((e,j)=>`<button data-inspect="${i}" data-example="${j}">${escape((e.labels||[]).join(' / ')||'查看相交构件 '+(j+1))}<span>→</span></button>`).join('')}${r.examples.length>3?`<details class="inspection-all"><summary>展开其余 ${format(r.examples.length-3)} 对 <small>共 ${format(r.examples.length)} 对</small></summary>${r.examples.slice(3).map((e,j)=>`<button data-inspect="${i}" data-example="${j+3}">${escape((e.labels||[]).join(' / ')||'查看相交构件 '+(j+4))}<span>→</span></button>`).join('')}</details>`:''}</div>`:''}</article>`).join('')}</div>`}</div>`);
}
function focusInspection(index,exampleIndex){
  const entry=inspectionData?.interfaces?.[index];if(!entry)return;
  const pair=Number.isInteger(exampleIndex)?entry.examples?.[exampleIndex]:entry.examples?.[0];
  const ids=(pair?.partIds||entry.parts||[]).filter(id=>parts.has(id)),point=pair?.point||entry.point;
  $('dialog').close();stopOrbit();reset();setExplode(0);setSection(100);setMode('solid');state.hardware=true;$('hardware').checked=true;
  if(ids.length){selectPart(ids[0]);state.inspection=entry.title;inspectionParts=ids.slice(0,48);state.context=true;refreshNeighborhood();visibility();partDetails(parts.get(ids[0]));}
  if(Array.isArray(point)&&point.length===3&&point.every(Number.isFinite)){const center=new THREE.Vector3(...point),region=new THREE.Box3().setFromCenterAndSize(center,new THREE.Vector3(34,34,34));fit(region,35);}
  else if(ids.length){const region=new THREE.Box3();ids.forEach(id=>region.union(partBox(parts.get(id))));fit(region,20);}
  notify('已定位登记接口。可切换紧固件聚光，检查已有螺栓与垫圈。');
}
function workbenchControls(){
  $('inspectionBtn').onclick=showInspections;
  $('hardwareFocusBtn').onclick=()=>{stopTour();state.hardwareFocus=!state.hardwareFocus;state.hardware=true;$('hardware').checked=true;if(state.mode==='line')setMode('solid');visibility();};
  $('orbitBtn').onclick=()=>{if(!state.ready)return;stopTour();if(state.orbit){stopOrbit();return;}state.orbit=true;orbitLast=0;$('orbitBtn').classList.add('active');$('orbitBtn').querySelector('span').textContent='停止环绕';$('orbitBtn').setAttribute('aria-label','停止环绕');render();};
  $('orbitSpeed').oninput=e=>{state.orbitSpeed=Number(e.target.value)/100;$('orbitSpeedValue').textContent=(state.orbitSpeed/.22).toFixed(1)+'×';};
  $('focusStage').onclick=()=>setStage(!state.stage);
  document.querySelectorAll('[data-section-axis]').forEach(b=>b.onclick=()=>{stopTour();setSectionAxis(b.dataset.sectionAxis);if(state.section===100)setSection(65);});
  $('dialogContent').addEventListener('click',e=>{const b=e.target.closest('[data-inspect]');if(b)focusInspection(Number(b.dataset.inspect),b.hasAttribute('data-example')?Number(b.dataset.example):undefined);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stopOrbit();stopTour();}});
}
function studioControls(){
  workbenchControls();
  $('themeBtn').onclick=()=>{stopTour();setTheme(state.theme==='night'?'light':'night');};
  $('overlayBtn').onclick=()=>{stopTour();setMode(state.mode==='overlay'?'solid':'overlay');};
  $('overlayWeight').oninput=e=>{state.overlayWeight=Number(e.target.value)/100;$('overlayWeightValue').textContent=e.target.value+'%';visibility();};
  $('contextBtn').onclick=toggleContext;$('viewsBtn').onclick=showViews;$('posterBtn').onclick=exportPoster;$('downloadsBtn').onclick=()=>openDownloads();
  $('dialogContent').addEventListener('click',e=>{
    if(e.target.id==='shareUrl'){e.target.select();return;}
    const download=e.target.closest('[data-download]');if(download){startDownload(download.dataset.download);return;}
    const restore=e.target.closest('[data-restore-view]');if(restore){try{applyView(getViews()[Number(restore.dataset.restoreView)]);$('dialog').close();notify('视角已恢复。');}catch{notify('视角数据不可用。');}return;}
    const remove=e.target.closest('[data-remove-view]');if(remove){const views=getViews();views.splice(Number(remove.dataset.removeView),1);if(writeViews(views))showViews();return;}
    const action=e.target.closest('[data-studio]')?.dataset.studio;
    if(action==='save-view'){const views=getViews();if(views.length>=8){notify('最多保留 8 个视角，请先删除一个收藏。');return;}views.unshift({...captureView(),name:$('viewName').value.trim()||'观察视角 '+(views.length+1)});if(writeViews(views))showViews();}
    if(action==='share-view')shareView();
    if(action==='cancel-download')downloadTask?.controller.abort();
    if(action==='all-downloads')openDownloads();
  });
  try{setTheme(localStorage.getItem('assembly-theme-r4')||'light');}catch{setTheme('light');}
}

function controls(){studioControls();document.querySelector('.workspace').addEventListener('click',e=>{if(state.tour&&e.target.closest('button')&&!e.target.closest('#tourBtn,#tourNext,#tourStop'))stopTour();},true);document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>changeTab(b.dataset.tab));document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));$('search').oninput=()=>{stopTour();changeTab('parts');renderParts();};$('moduleList').onclick=e=>{const toggle=e.target.closest('[data-visibility]');if(toggle){const m=modules.get(Number(toggle.dataset.visibility));m.visible=!m.visible;visibility();renderModules();return;}const row=e.target.closest('[data-module]');if(row){stopTour();const id=Number(row.dataset.module),now=performance.now(),twice=lastModule===id&&now-lastModuleTime<400;lastModule=id;lastModuleTime=now;selectModule(id,twice);}};$('moduleList').onkeydown=e=>{if(e.key==='Enter'){stopTour();const row=e.target.closest('[data-module]');if(row)selectModule(row.dataset.module,true);}};$('partList').onclick=e=>{if(e.target.closest('[data-retry-details]')){loadDetails();return;}const p=e.target.closest('[data-part]');if(p)selectPart(p.dataset.part,true);};$('details').onclick=e=>{const evidence=e.target.closest('[data-evidence]');if(evidence){showEvidence(Number(evidence.dataset.evidence));return;}const b=e.target.closest('[data-action]');if(!b)return;if(b.dataset.action==='retry-details'){loadDetails();return;}if(b.dataset.action==='context'){toggleContext();return;}if(b.dataset.action==='download-module'){openDownloads(state.module);return;}if(b.dataset.action==='focus')focus();if(b.dataset.action==='isolate'){state.isolate=!state.isolate;if(state.isolate){state.context=false;clearNeighborhood();}visibility();if(state.part)partDetails(parts.get(state.part));else if(state.module)moduleDetails(modules.get(state.module));focus();}};$('resetView').onclick=()=>reset(true);$('clearSelection').onclick=()=>reset();$('exitIsolate').onclick=()=>{state.isolate=false;visibility();if(state.part)partDetails(parts.get(state.part));else if(state.module)moduleDetails(modules.get(state.module));};$('allVisible').onclick=()=>{for(const m of modules.values())m.visible=true;state.isolate=false;visibility();renderModules();};$('hardware').onchange=e=>{stopTour();state.hardware=e.target.checked;if(!state.hardware)state.hardwareFocus=false;if(!state.hardware&&parts.get(state.part)?.kind==='hardware')reset();visibility();};$('ground').onchange=e=>{stopTour();state.grid=e.target.checked;visibility();};$('explode').oninput=e=>{stopTour();setExplode(e.target.value);};$('explode').onchange=()=>fit(allBox(),35);$('section').oninput=e=>{stopTour();setSection(e.target.value);};$('sectionReset').onclick=()=>setSection(100);$('modelMode').onclick=()=>setMode(state.mode==='solid'?'line':'solid');$('projection').onclick=()=>{state.ortho=!state.ortho;$('projection').textContent=state.ortho?'正交':'透视';syncCamera();};$('colorMode').onclick=()=>{state.colored=!state.colored;for(const m of modules.values())for(const mesh of m.meshes||[]){mesh.material.dispose();mesh.material=material(m,mesh.userData.kind);}$('colorMode').querySelector('span').textContent=state.colored?'模块色':'钢材色';visibility();};$('fullscreen').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.querySelector('.viewport').requestFullscreen().catch(()=>notify('当前环境未允许全屏'));$('mobileExplorer').onclick=()=>{if(state.stage){setStage(false);document.body.classList.remove('nav-hidden');if(innerWidth<=720){$('explorer').classList.add('open');$('inspector').classList.remove('open');}return;}if(innerWidth>720){document.body.classList.toggle('nav-hidden');}else{$('explorer').classList.toggle('open');$('inspector').classList.remove('open');}};$('mobileInspector').onclick=()=>{if(state.stage){setStage(false);document.body.classList.remove('details-hidden');if(innerWidth<=1040){$('inspector').classList.add('open');$('explorer').classList.remove('open');}return;}if(innerWidth>1040)document.body.classList.toggle('details-hidden');else{$('inspector').classList.toggle('open');$('explorer').classList.remove('open');}};$('closeExplorer').onclick=()=>{if(innerWidth>720)document.body.classList.add('nav-hidden');else $('explorer').classList.remove('open');};$('closeInspector').onclick=()=>{if(innerWidth>1040)document.body.classList.add('details-hidden');else $('inspector').classList.remove('open');};$('tourBtn').onclick=()=>state.tour?stopTour():startTour();$('tourStop').onclick=stopTour;$('tourNext').onclick=nextTour;$('about').onclick=()=>{stopTour();dialog('<h2>从整体轮廓，到每一处连接</h2><p>这是一座由九个模块组成的钢结构交互展示，塔腿待补。你可以查看实体形状、切换结构线、展开模块，或通过高度剖切观察内部。</p><p>构件资料包括来源登记、实体测量与已核对的局部图纸裁图。模型包含演示性与条件性内容，不作为制作、安装、工程计算或施工依据。</p><p>三维显示资源会载入浏览器，以支持自由旋转和观察。</p><p><a href="../#/product">了解仝心圆如何从图纸建模 →</a></p>');};$('help').onclick=()=>{stopTour();dialog('<h2>自由探索结构</h2><ul><li>拖动旋转；右键或 Shift 拖动平移；滚轮围绕鼠标指向的位置缩放。触屏双指缩放和平移。</li><li>点击构件选择，双击聚焦；F 聚焦，I 隔离，Esc 恢复全景。</li><li>左侧模块双击聚焦，眼睛按钮控制显隐；按 / 搜索构件号、规格或展示编号。</li><li>T 切换结构线与实体。结构线用于展示空间关系，不代表施工定位依据。</li><li>模块展开和高度剖切仅用于观察。空格开始或停止演示导览。</li></ul>');};$('closeDialog').onclick=()=>$('dialog').close();$('dialog').onclick=e=>{if(e.target===$('dialog'))$('dialog').close();};document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select')||$('dialog').open||e.target.closest('button,a'))return;if(['/','f','i','t','escape','?'].includes(e.key.toLowerCase()))stopTour();if(e.key==='/'&&!$('dialog').open){e.preventDefault();$('search').focus();if(innerWidth<721)$('explorer').classList.add('open');}if(e.key.toLowerCase()==='f')focus();if(e.key.toLowerCase()==='i'&&(state.part||state.module)){state.isolate=!state.isolate;if(state.isolate){state.context=false;clearNeighborhood();}visibility();}if(e.key.toLowerCase()==='t')setMode(state.mode==='solid'?'line':'solid');if(e.key==='Escape'&&!$('dialog').open)reset(true);if(e.key===' '){e.preventDefault();state.tour?stopTour():startTour();}if(e.key==='?')$('help').click();});}
// Decompress into a single bounded destination; do not retain arrays for all chunks
// and then copy them into a second full-sized module buffer.
async function readGeometry(spec,signal){
  const out=new Uint8Array(spec.bytes);let offset=0;
  for(const chunk of spec.chunks){
    if(signal?.aborted)throw new DOMException('Aborted','AbortError');
    const response=await fetch(chunk.url,{signal});if(!response.ok||!response.body)throw Error('显示资源暂时无法载入');
    const source=response.body.getReader(),prefix=[];let n=0;
    while(n<2){const block=await source.read();if(block.done)throw Error('显示资源传输未完成');if(block.value.length){prefix.push(block.value);n+=block.value.length;}}
    const gzip=!/\bgzip\b/i.test(response.headers.get('Content-Encoding')||'')&&Number(response.headers.get('Content-Length'))!==chunk.rawBytes&&prefix[0][0]===31&&(prefix[0].length>1?prefix[0][1]:prefix[1][0])===139;
    const stream=new ReadableStream({async pull(controller){if(prefix.length){controller.enqueue(prefix.shift());return;}const b=await source.read();if(b.done)controller.close();else controller.enqueue(b.value);},cancel(reason){return source.cancel(reason);}});
    const decoded=(gzip?stream.pipeThrough(new DecompressionStream('gzip')):stream).getReader();
    const end=offset+chunk.rawBytes;if(end>out.length)throw Error('显示索引长度不匹配');
    try{while(true){const block=await decoded.read();if(block.done)break;if(offset+block.value.length>end)throw Error('显示资源大小不符');out.set(block.value,offset);offset+=block.value.length;}if(offset!==end)throw Error('显示资源解码未完成');}catch(e){await decoded.cancel(e).catch(()=>{});throw e;}
  }
  if(offset!==out.byteLength)throw Error('显示资源传输未完成');return out.buffer;
}
const exactLimit=2;let detailTimer=0,exactJob=null,overviewReady=false,lastHitModule=0,closing=false;
function nearModule(){
  if(distance>350||!modules.size)return null;
  if(lastHitModule&&modules.get(lastHitModule)?.visible!==false)return lastHitModule;
  let id=null,best=Infinity;
  for(const m of modules.values()){
    if(m.visible===false)continue;
    const d=moduleBox(m).distanceToPoint(target);
    if(d<best){id=m.id;best=d;}
  }
  return best<distance? id:null;
}
function desiredDetails(){
  if(closing||document.hidden||!overviewReady||state.mode==='line')return [];
  const ids=[],add=id=>{const m=modules.get(id);if(m&&m.visible!==false&&!ids.includes(id))ids.push(id);};
  add(state.module);
  if(state.context){for(const id of inspectionParts)add(parts.get(id)?.module);for(const p of neighbors)add(p.module);}
  add(nearModule());
  return ids.slice(0,exactLimit);
}
function updateDetailStatus(){
  if(!renderer||!state.ready)return;
  const resident=[...modules.values()].filter(m=>m.precise).map(m=>m.id);
  const c=renderer.domElement;c.dataset.overviewModules=String(state.loaded);c.dataset.detailModules=resident.join(',');
  c.dataset.geometryBytes=String([...modules.values()].reduce((n,m)=>n+(m.overview?.bytes||0)+(m.precise?.bytes||0),0));
  if(state.loaded===modules.size&&modules.size){
    $('loadStatus').textContent=exactJob?'正在载入模块 '+exactJob.id+' 的原精度实体':resident.length?'原精度实体 · 模块 '+resident.join('、'):'全塔总览 · 走近查看原精度';
  }
}
function dropDetail(m){
  const layer=m.precise;if(!layer)return;m.precise=null;
  activateLayer(m,m.overview||null);disposeLayer(layer);
}
function queueDetail(){
  if(detailTimer||!state.ready||!overviewReady||closing)return;
  detailTimer=setTimeout(()=>{detailTimer=0;reconcileDetails();},150);
}
async function reconcileDetails(){
  if(closing||!renderer||!state.ready)return;
  const ids=desiredDetails();
  if(exactJob&&!ids.includes(exactJob.id))exactJob.controller.abort();
  for(const m of modules.values())if(m.precise&&!ids.includes(m.id))dropDetail(m);
  updateDetailStatus();
  if(exactJob)return;
  const m=ids.map(id=>modules.get(id)).find(m=>!m.precise&&(!m.lastDetailFailure||Date.now()-m.lastDetailFailure>15000));
  if(!m)return;
  const job={id:m.id,controller:new AbortController()};exactJob=job;updateDetailStatus();
  try{
    const raw=await readGeometry(m.geometry,job.controller.signal);
    if(job.controller.signal.aborted||!desiredDetails().includes(m.id))return;
    const layer=makeLayer(m,m,raw);m.precise=layer;m.lastDetailFailure=0;activateLayer(m,layer);
  }catch(e){if(e.name!=='AbortError'){m.lastDetailFailure=Date.now();notify('模块 '+m.id+' 的原精度实体暂未载入，可稍后再试');}}
  finally{exactJob=null;updateDetailStatus();if(state.part)partDetails(parts.get(state.part));queueDetail();}
}
async function load() {
  try {
    if(typeof DecompressionStream!=='function')throw new Error('请使用支持三维显示的新版本 Chrome、Edge 或 Safari 浏览器');
    const response=await fetchMetadata('assets/model.json');
    if(!response.ok)throw new Error('展示索引暂时无法载入');
    data=await response.json();
    for(const raw of data.modules){const m={...raw,visible:true,loaded:false};modules.set(m.id,m);for(const p of m.parts){p.module=m.id;parts.set(p.id,p);}}
    $('partCount').textContent=format(parts.size);renderModules();overview();fit(allBox(),35,false);
    const lineResponse=await fetchMetadata('assets/lines.json');
    if(!lineResponse.ok)throw new Error('结构线视图暂时无法载入');
    const layer=await lineResponse.json();
    for(const record of layer.lines){
      const p=parts.get(record.partId);if(!p)continue;const vertices=[];
      for(let i=1;i<record.points.length;i++)vertices.push(...record.points[i-1],...record.points[i]);
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
      const line=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:modules.get(p.module).color,toneMapped:false,transparent:true,opacity:.95,clippingPlanes:[cutPlane]}));
      line.userData.part=p.id;scene.add(line);lines.push(line);
    }
    state.ready=true;visibility();$('loading').classList.add('hidden');$('streamNotice').classList.remove('hidden');
    $('loadStatus').textContent='结构线已就绪 · 正在载入全塔总览';
    loadSupplemental();restoreSharedView();
    const responseLOD=await fetchMetadata('assets/lod/manifest-v26.json');
    if(!responseLOD.ok)throw Error('总览模型索引暂未载入');
    const manifest=await responseLOD.json();if(manifest.schema!=='overview-v26'||!Array.isArray(manifest.modules)||manifest.modules.length!==modules.size)throw Error('总览模型索引不可用');
    const ids=new Set();
    for(const spec of manifest.modules){
      const m=modules.get(spec.id);if(!m||ids.has(m.id)||!Array.isArray(spec.parts)||spec.parts.length!==m.parts.length)throw Error('总览模型构件清单不完整');ids.add(m.id);
      try{const raw=await readGeometry(spec.geometry);m.overview=makeLayer(m,spec,raw);activateLayer(m,m.overview);state.loaded++;}
      catch(error){m.loadError=error.message;}
      $('streamText').textContent='全塔总览 '+state.loaded+' / 9 · 可先探索结构线';
      $('streamProgress').style.width=state.loaded/9*100+'%';
      $('loadStatus').textContent='总览实体 '+state.loaded+' / 9 已载入';
      footer();if(state.part?.startsWith('module'+m.id+'-'))partDetails(parts.get(state.part));
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    overviewReady=true;updateDetailStatus();queueDetail();
    if(state.loaded===9){$('streamNotice').classList.add('hidden');}
    else{$('streamText').textContent='总览已载入 '+state.loaded+'/9 · 缺失模块可点选查看原精度，刷新可重试';$('streamNotice').classList.add('load-error');}
    visibility();
  }catch(error){$('loadingText').textContent=error.message;$('loadingDetail').textContent='刷新页面可重新尝试。';$('loadStatus').textContent='载入尚未完成';$('loading').classList.remove('hidden');$('loading').style.opacity=1;}
}
function refreshDetailsUI(){
  if(state.part)partDetails(parts.get(state.part));
  if(state.tab==='parts')renderParts();
  if(state.part)$('selectionChip').querySelector('span').textContent=(detailsData.parts[state.part]?.label||parts.get(state.part).label)+' · '+modules.get(parts.get(state.part).module).name;
}
function loadDetails(){
  if(detailsRequest)return detailsRequest;
  detailsStatus='loading';detailsLoaded=false;refreshDetailsUI();
  detailsRequest=fetchMetadata('assets/component-details.json').then(r=>{if(!r.ok)throw Error('构件资料未载入');return r.json();}).then(d=>{
    if(!d||!d.parts||typeof d.parts!=='object'||Array.isArray(d.parts))throw Error('构件资料格式不可用');
    detailsData=d;detailsStatus='ready';detailsLoaded=true;refreshDetailsUI();
  }).catch(()=>{detailsStatus='error';detailsLoaded=false;refreshDetailsUI();}).finally(()=>{detailsRequest=null;});
  return detailsRequest;
}
async function loadSupplemental(){
  fetchMetadata('assets/inspection.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{if(!Array.isArray(d.interfaces))throw Error();inspectionData=d;inspectionStatus='ready';$('inspectionCount').textContent=Number.isFinite(d.summary?.knownCrossModulePairs)?format(d.summary.knownCrossModulePairs):'查看';}).catch(()=>{inspectionStatus='error';$('inspectionCount').textContent='待载入';});
  fetchMetadata('assets/downloads.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{if(!validDownloadManifest(d))throw Error('下载清单格式不可用');downloadData=d;downloadsLoaded=true;}).catch(()=>{downloadsLoaded=true;});
}

document.addEventListener('visibilitychange',()=>{if(document.hidden){exactJob?.controller.abort();if(frame){cancelAnimationFrame(frame);frame=0;}reconcileDetails();}else{queueDetail();render();}});
window.addEventListener('pagehide',e=>{exactJob?.controller.abort();if(e.persisted){for(const m of modules.values())if(m.precise)dropDetail(m);return;}closing=true;clearTimeout(detailTimer);downloadTask?.controller.abort();if(frame)cancelAnimationFrame(frame);removeHighlight();clearNeighborhood();for(const m of modules.values()){disposeLayer(m.precise);disposeLayer(m.overview);}renderer?.dispose();});
window.addEventListener('pageshow',e=>{if(e.persisted){queueDetail();render();}});
try{setup();controls();load();}catch(error){$('loadingText').textContent='当前浏览器无法开启三维视图';$('loadingDetail').textContent='请开启硬件加速，或使用新版本浏览器。';}
})();
