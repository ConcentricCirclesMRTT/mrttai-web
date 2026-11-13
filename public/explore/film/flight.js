/* Deterministic cinema flight through the existing tower; source geometry is never changed. */
(()=>{'use strict';
const DURATION=16,CLIMB_END=10.8,LEGACY_CLIMB_END=12.3,W=1920,H=1080;
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const smoother=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
const mix=(a,b,q)=>a+(b-a)*q;
const blend=(a,b,q)=>a.map((x,i)=>mix(x,b[i],q));
const END={eye:[500,-700,2200],look:[0,0,600],fov:66,up:[0,0,1]};
const END_VELOCITY=[120,-150,200],FINAL_LOOK=[-230,-180,500];
function orbit(target,radius,yaw,elevation){return[target[0]+radius*Math.cos(elevation)*Math.cos(yaw),target[1]+radius*Math.cos(elevation)*Math.sin(yaw),target[2]+radius*Math.sin(elevation)];}
function hermite(a,va,b,vb,q,dt){const q2=q*q,q3=q2*q;return(2*q3-3*q2+1)*a+(q3-2*q2+q)*dt*va+(-2*q3+3*q2)*b+(q3-q2)*dt*vb;}
function hermiteVector(a,va,b,vb,q,dt){return a.map((v,i)=>hermite(v,va[i],b[i],vb[i],q,dt));}
function climb(t){
 const old=t*LEGACY_CLIMB_END/CLIMB_END,x=clamp((old-.65)/(LEGACY_CLIMB_END-.65)),q=x*x*(2-x),settle=smoother(old/1.4);
 // This is the same source-checked interior corridor, with only its clock compressed.
 const eye=[(7+.35*Math.sin(Math.PI*2*q))*settle,(-3+.3*Math.sin(Math.PI*q))*settle,mix(-3,1008,q)];
 return{eye,fov:78+6*Math.sin(Math.PI*q)+4*q};
}
function climbVelocity(){const scale=LEGACY_CLIMB_END/CLIMB_END/(LEGACY_CLIMB_END-.65);return[.35*Math.PI*2*scale,-.3*Math.PI*scale,1011*scale];}
function corePose(THREE,t){
 const p=climb(t),old=t*LEGACY_CLIMB_END/CLIMB_END,yaw=Math.atan2(155,90),pitch=mix(Math.PI/2,-1.45,smoother((old-10)/(LEGACY_CLIMB_END-10))),roll=Math.PI*1.8*smoother((old-.45)/(LEGACY_CLIMB_END-.45));
 const direction=new THREE.Vector3(Math.cos(yaw)*Math.cos(pitch),Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch));
 const up=new THREE.Vector3(-Math.cos(yaw)*Math.sin(pitch),-Math.sin(yaw)*Math.sin(pitch),Math.cos(pitch)).applyQuaternion(new THREE.Quaternion().setFromAxisAngle(direction,roll));
 return{eye:p.eye,look:new THREE.Vector3(...p.eye).addScaledVector(direction,100).toArray(),up:up.toArray(),fov:p.fov};
}
function route(t){
 t=Math.max(0,Math.min(DURATION,t));if(t<=CLIMB_END)return climb(t);
 const q=(t-CLIMB_END)/(DURATION-CLIMB_END),dt=DURATION-CLIMB_END,start=climb(CLIMB_END),df=(4-6*Math.PI)/(LEGACY_CLIMB_END-.65)*LEGACY_CLIMB_END/CLIMB_END;
 return{eye:hermiteVector(start.eye,climbVelocity(),END.eye,END_VELOCITY,q,dt),fov:hermite(start.fov,df,END.fov,0,q,dt)};
}
function pose(THREE,t){
 t=Math.max(0,t);if(t>=DURATION)return{eye:[...END.eye],look:[...END.look],up:[...END.up],fov:END.fov};
 if(t<=CLIMB_END)return corePose(THREE,t);
 const p=route(t),q=(t-CLIMB_END)/(DURATION-CLIMB_END),start=corePose(THREE,CLIMB_END),look=hermiteVector(start.look,climbVelocity(),END.look,[0,0,0],q,DURATION-CLIMB_END);
 const from=new THREE.Vector3(...start.look).sub(new THREE.Vector3(...start.eye)).normalize(),forward=new THREE.Vector3(...look).sub(new THREE.Vector3(...p.eye)).normalize();
 // Transport the existing camera frame, then gently make the rising overview upright.
 const up=new THREE.Vector3(...start.up).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(from,forward));
 const worldUp=new THREE.Vector3(0,0,1).addScaledVector(forward,-forward.z).normalize();
 const angle=Math.atan2(forward.dot(new THREE.Vector3().crossVectors(up,worldUp)),up.dot(worldUp));
 up.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(forward,angle*smoother(q)));
 return{eye:p.eye,look,up:up.toArray(),fov:p.fov};
}
// A single continuous camera transports the viewer from the source connection
// to the existing bottom-center corridor. All keyframes are world coordinates.
const ENTRY_DURATION=7;
function entryStart(){
 const target=[27.9589,-23.5368,771.9212],radius=25.6983,elevation=.14529,u=2/3;
 const yaw=mix(-1.10637,-.95,smoother(u)),yawVelocity=(.15637/3)*30*u*u*(1-u)*(1-u);
 return{eye:orbit(target,radius,yaw,elevation),look:target,up:[0,0,1],fov:38,yaw:yaw+Math.PI,pitch:-elevation,velocity:[-radius*Math.cos(elevation)*Math.sin(yaw)*yawVelocity,radius*Math.cos(elevation)*Math.cos(yaw)*yawVelocity,0],yawVelocity};
}
function entryKeys(start){return[
 {t:0,eye:start.eye,velocity:start.velocity,yaw:start.yaw,yawVelocity:start.yawVelocity,pitch:start.pitch,pitchVelocity:0},
 {t:1.25,eye:[155,-215,795],velocity:[90,-100,-100],yaw:2.195,yawVelocity:.02,pitch:-.4,pitchVelocity:.17},
 {t:3.8,eye:[180,-240,250],velocity:[-20,30,-310],yaw:2.214,yawVelocity:0,pitch:-.1,pitchVelocity:.27},
 {t:5.2,eye:[120,-155,-3],velocity:[-70,90,0],yaw:2.18,yawVelocity:-.35,pitch:.45,pitchVelocity:.7},
 {t:6.2,eye:[35,-45,-3],velocity:[-60,75,0],yaw:1.4,yawVelocity:-.55,pitch:1.2,pitchVelocity:.7},
 {t:7,eye:[0,0,-3],velocity:[0,0,0],yaw:Math.atan2(155,90),yawVelocity:0,pitch:Math.PI/2,pitchVelocity:0}
 ];}
function entryRoute(t){
 t=Math.max(0,Math.min(ENTRY_DURATION,t));const start=entryStart(),keys=entryKeys(start);let i=0;while(i<keys.length-2&&t>keys[i+1].t)i++;
 const a=keys[i],b=keys[i+1],dt=b.t-a.t,q=(t-a.t)/dt;
 return{eye:hermiteVector(a.eye,a.velocity,b.eye,b.velocity,q,dt),yaw:hermite(a.yaw,a.yawVelocity,b.yaw,b.yawVelocity,q,dt),pitch:hermite(a.pitch,a.pitchVelocity,b.pitch,b.pitchVelocity,q,dt),fov:mix(38,78,smoother(t/ENTRY_DURATION))};
}
function entryPose(THREE,t){
 const p=entryRoute(t),forward=new THREE.Vector3(Math.cos(p.yaw)*Math.cos(p.pitch),Math.sin(p.yaw)*Math.cos(p.pitch),Math.sin(p.pitch));
 const up=new THREE.Vector3(-Math.cos(p.yaw)*Math.sin(p.pitch),-Math.sin(p.yaw)*Math.sin(p.pitch),Math.cos(p.pitch));
 return{eye:p.eye,look:new THREE.Vector3(...p.eye).addScaledVector(forward,100).toArray(),up:up.toArray(),fov:p.fov};
}
function closingRoute(t){
 t=Math.max(0,Math.min(9,t));const fullEye=orbit(FINAL_LOOK,2050,-.8,.15);
 if(t<=4){const q=t/4;return{eye:hermiteVector(END.eye,END_VELOCITY,fullEye,[0,0,0],q,4),look:blend(END.look,FINAL_LOOK,smoother(q)),fov:mix(END.fov,34,smoother(q)),up:[0,0,1]};}
 const q=smoother((t-4)/5);return{eye:orbit(FINAL_LOOK,mix(2050,2170,q),mix(-.8,-.95,q),.15),look:[...FINAL_LOOK],fov:34,up:[0,0,1]};
}
function closingPose(THREE,t){return closingRoute(t);}
function overlay(ctx,t){
 if(t<0||t>DURATION)return;
 ctx.save();ctx.globalCompositeOperation='source-over';ctx.beginPath();ctx.rect(0,60,W,H-120);ctx.clip();
 const flow=smooth((t-.7)/1.3)*(1-smooth((t-(CLIMB_END-.8))/.8)),cx=W*.5,cy=H*.5;
 if(flow>.001){
  const halo=ctx.createRadialGradient(cx,cy,20,cx,cy,640);halo.addColorStop(0,`rgba(120,231,224,${.035*flow})`);halo.addColorStop(.23,`rgba(60,169,180,${.012*flow})`);halo.addColorStop(1,'rgba(30,90,110,0)');ctx.fillStyle=halo;ctx.fillRect(0,60,W,H-120);
  for(let i=0;i<30;i++){
   const angle=i*2.3999632297+.11*Math.sin(i*1.1),cycle=(t*(.29+(i%4)*.015)+i*.6180339887)%1,r=.44+cycle*.88,length=.022+.065*cycle,alpha=Math.pow(Math.sin(Math.PI*cycle),2)*flow*(i%5?.24:.32),dx=Math.cos(angle)*1140,dy=Math.sin(angle)*680;
   const x0=cx+dx*(r-length),y0=cy+dy*(r-length),x1=cx+dx*r,y1=cy+dy*r,gradient=ctx.createLinearGradient(x0,y0,x1,y1);gradient.addColorStop(0,'rgba(112,216,221,0)');gradient.addColorStop(1,i%5?`rgba(131,221,225,${alpha})`:`rgba(221,194,137,${alpha})`);ctx.strokeStyle=gradient;ctx.lineWidth=i%6?1:1.5;ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.stroke();if(i%7===0){ctx.fillStyle=i%5?`rgba(175,242,238,${alpha*1.25})`:`rgba(243,214,158,${alpha*1.25})`;ctx.beginPath();ctx.arc(x1,y1,1.5,0,Math.PI*2);ctx.fill();}
  }
 }
 const title=smooth((t-.65)/.55)*(1-smooth((t-4.3)/.65));
 if(title>.001){ctx.save();ctx.globalAlpha=title;const g=ctx.createLinearGradient(0,770,0,1020);g.addColorStop(0,'rgba(2,8,14,0)');g.addColorStop(1,'rgba(2,8,14,.58)');ctx.fillStyle=g;ctx.fillRect(0,770,W,250);ctx.fillStyle='#95c9c7';ctx.fillRect(90,863,41,2);ctx.font='400 12px "PingFang SC",sans-serif';ctx.fillStyle='#91b6c0';ctx.fillText('THROUGH THE STRUCTURE',90,901);ctx.font='300 38px "PingFang SC",sans-serif';ctx.fillStyle='#e0edef';ctx.fillText('穿越结构，直抵塔顶',88,963);ctx.restore();}
 ctx.restore();
}
window.FlightFilm={pose,entryPose,entryRoute,entryStart,closingPose,overlay,route,closingRoute,duration:DURATION,entryDuration:ENTRY_DURATION,climbEnd:CLIMB_END,endPose:END};
})();
