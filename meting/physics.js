const Phys=(()=>{
const BR=.11,GW=3.66,GH=2.44,GR=9.81,PR=.06,KZ=.25,WZ=9.15,WOFF=[-.83,-.28,.28,.83];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,eo=t=>1-(1-t)*(1-t);
function seeded(s){return()=>{s=(s*16807)%2147483647;return s/2147483647}}
function gauss(r){let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function keeperPose(K,t){
 const s=clamp((t-K.react)/K.tD,0,1),e=s*s*(3-2*s);
 const p={x:lerp(K.x0,K.hf.x,e),hipY:lerp(.95,K.hf.y,e)+K.jump*Math.sin(Math.PI*s),ang:K.theta*e,arms:e};
 let mn=9;for(const c of keeperCaps(p,0))for(const q of[c.a,c.b])mn=Math.min(mn,q[1]-c.r);
 if(mn<0)p.hipY-=mn; // voeten en lichaam nooit onder de grond
 return p;
}
// lichaam van de keeper als capsules (zelfde maten als de tekening)
function keeperCaps(p,Z){
 const cs=Math.cos(p.ang),sn=Math.sin(p.ang);
 const T=(lx,ly)=>[p.x+lx*cs+ly*sn,p.hipY-lx*sn+ly*cs,Z];
 const caps=[{a:T(0,.12),b:T(0,.5),r:.2,n:'romp'},{a:T(0,.78),b:T(0,.78),r:.14,n:'hoofd'},
  {a:T(-.1,-.05),b:T(-.1,-.86),r:.09,n:'been'},{a:T(.1,-.05),b:T(.1,-.86),r:.09,n:'been'}];
 for(const s of[-1,1]){const hx=lerp(s*.56,s*.14,p.arms),hy=lerp(.22,1.22,p.arms);
  caps.push({a:T(s*.24,.5),b:T(hx,hy),r:.09,n:'arm'},{a:T(hx,hy),b:T(hx,hy),r:.12,n:'hand'});}
 return caps;
}
function wallCaps(wx,lift){return WOFF.map(o=>({a:[wx+o,lift+.25,WZ],b:[wx+o,lift+1.55,WZ],r:.25,n:'muur'}))}
// speler die achter de muur op de grond ligt (sc.wallLie): houdt lage ballen tegen die onder een springende muur door gaan
function lieCap(wx){return{a:[wx-.9,.18,WZ+.7],b:[wx+.9,.18,WZ+.7],r:.18,n:'muur'}}
function frameCaps(D){return[
 {a:[-GW,0,D],b:[-GW,GH,D],r:PR,n:'paal'},{a:[GW,0,D],b:[GW,GH,D],r:PR,n:'paal'},{a:[-GW,GH,D],b:[GW,GH,D],r:PR,n:'lat'}]}
function closest(p,a,b){
 const abx=b[0]-a[0],aby=b[1]-a[1],abz=b[2]-a[2],l=abx*abx+aby*aby+abz*abz;
 let t=l>1e-12?((p[0]-a[0])*abx+(p[1]-a[1])*aby+(p[2]-a[2])*abz)/l:0;t=clamp(t,0,1);
 return[a[0]+abx*t,a[1]+aby*t,a[2]+abz*t];
}
function planKeeper(sc,x1,y1,x0,rng,T,tW){
 const kp=sc.kp;let rx,ry;
 if(rng()<kp.skill){rx=x1+gauss(rng)*kp.sigma;ry=y1+gauss(rng)*kp.sigma;}
 else{rx=(rng()*2-1)*GW*.85;ry=.3+rng()*2;}
 rx=clamp(rx,-(GW-.2),GW-.2);ry=clamp(ry,.3,2.3);
 const dx=rx-x0,dy=ry-.95;
 let th=Math.abs(dx)<.3?0:clamp(Math.atan2(dx,dy),-1.65,1.65);
 let hx=rx-1.25*Math.sin(th),hy=Math.max(.3,ry-1.25*Math.cos(th));
 hx=x0+clamp(hx-x0,-2.2,2.2);
 const tVis=sc.wall?(tW!=null?tW:WZ/sc.D*T):0; // achter de muur ziet de keeper de bal pas als die voorbij de muur is (tW = moment waarop de bal de muur passeert)
 const travel=Math.abs(hx-x0),tD=Math.max(kp.tD*.75,travel/3.4,Math.abs(th)/4.5); // duik duurt langer naarmate hij verder moet
 return{x0,react:kp.react+tVis,tD,theta:th,hf:{x:hx,y:hy},jump:Math.abs(th)<.4?.35:.12,target:{x:rx,y:ry}};
}
// optionele level-velden (alle weg = gedrag ongewijzigd): sc.xs (schotpositie opzij, m), sc.kz (keeper staat zo ver voor de lijn),
// sc.kPos (0..1: keeper staat op de bissectrice i.p.v. met afwijking), sc.extras ([{f,off}] losse veldspelers), sc.wind (m/s2 zijwaarts)
function keeperStart(sc,j){
 const q=sc.kPos||0;if(!q)return j;
 const D=sc.D,xs=sc.xs||0,kz=sc.kz||KZ,d1=Math.hypot(-GW-xs,D),d2=Math.hypot(GW-xs,D);
 const xb=-GW+2*GW*d1/(d1+d2),xk=xs+(xb-xs)*(D-kz)/D;
 return xk*q+j*(1-q);
}
function extraCaps(sc){const xs=sc.xs||0;return(sc.extras||[]).map(e=>({a:[xs*(1-e.f)+e.off,.25,e.f*sc.D],b:[xs*(1-e.f)+e.off,.25+(e.h||1.3),e.f*sc.D],r:.25,n:'veldspeler'}))} // e.h = lichaamshoogte (standaard 1,3; verdedigersrij 2,0 = met armen omhoog)
const ACC_A=1.5,ACC_H=.10; // afwijking bij volle kracht: 1,5 graad richting, 0,10 (x doelhoogte) hoogte; groeit met kracht^2; sc.acc = schaal (weg = 0)
// schotsoorten: NORMAAL (zoals altijd), PLAT (harde lage streep onder kniehoogte), LOB (onderaan geraakt: hoog en traag)
const NORMAAL=0,PLAT=1,LOB=2;
const EFF_MAX=8,    // bocht bij de fader helemaal opzij (m/s2 zijwaarts)
 EFF_SIG=1.2,       // afwijking op die bocht bij de fader helemaal opzij (m/s2, 1 sigma); groeit lineair met de faderuitslag => ca. 15% van de bocht
 EFF_D0=16,         // boven deze afstand (m) krimpt de effectafwijking met D0/D: de misser groeit dan evenredig met de afstand i.p.v. kwadratisch
 LOB_K=.25,         // een lob krijgt maar een kwart van de bocht; de afwijking blijft die van de volle faderuitslag
 LOB_TH0=30,LOB_TH1=60, // lob: hoe verder je trekt, hoe hoger de boog (vertrekhoek 30 tot 60 graden)
 LOB_V0=8,LOB_V1=20,  // lob: de kracht bepaalt hoe ver de bal gaat (8 tot 20 m/s); te veel = over de lat, te weinig = te kort
 KEEPER_TERUG=3.5,   // een keeper die een lob ziet komen, loopt achteruit naar zijn lijn (m/s)
 KEEPER_DRAAI=0,     // extra tijd voor hij begint terug te lopen (s), bovenop zijn reactietijd
 PLAT_H=.18,        // plat schot: hoogste punt van de eerste vlucht boven de grond (m); balmiddelpunt blijft onder 0,29 m
 EFF_TAU=.12,       // eens de bal de grond raakt, valt de bocht weg met deze tijdconstante (s)
 ROL_V=.8,ROL_K=.05; // onder 0,8 m/s neerwaarts botst de bal niet meer maar rolt hij; rollen remt met 5% per seconde
// droog parcours van een plat schot, zonder hindernissen, met dezelfde stappen als step(); de zijwaartse beweging is lineair in
// vx, bocht en wind, dus volgen we drie basisbewegingen tegelijk (vx=1 | bocht=1 | wind=1) en lossen we daarna vx op
function baan(D,v,vy0,zkF){ // zkF(t) = vlak van de keeper op tijdstip t (kan bewegen bij een lob); weg = niet nodig
 const dt=1/480;let t=0,tg=null,tW=null,k=null,y=BR,vy=vy0,z=0,vz=v,xa=0,va=1,xb=0,vb=0,xw=0,vw=0;
 while(z<D&&t<8){
  t+=dt;const f=tg==null?1:Math.exp(-(t-tg)/EFF_TAU);
  xa+=va*dt;xb+=vb*dt+.5*f*dt*dt;vb+=f*dt;xw+=vw*dt+.5*dt*dt;vw+=dt;
  y+=vy*dt-.5*GR*dt*dt;vy-=GR*dt;z+=vz*dt;
  if(tW==null&&z>=WZ)tW=t;
  if(k==null&&zkF&&z>=zkF(t))k={A:xa,Bc:xb,Bw:xw,y,t}; // stand van de bal in het vlak van de keeper (botsen inbegrepen)
  if(y<BR){y=BR;if(tg==null)tg=t;if(vy<-ROL_V){vy=-vy*.55;va*=.92;vb*=.92;vw*=.92;vz*=.92;}else{const k=Math.exp(-ROL_K*dt);vy=0;va*=k;vb*=k;vw*=k;vz*=k;}}
 }
 return{A:xa,Bc:xb,Bw:xw,T:t,tW:tW==null?t:tW,y,k:k||{A:xa,Bc:xb,Bw:xw,y,t}};
}
function platBaan(D,v,vy0,zk){return baan(D,v,vy0,zk==null?null:()=>zk)}
// curl = faderstand -1..+1 (traploos); soort = NORMAAL / PLAT / LOB (weg = NORMAAL)
function create(sc,aim,power,curl,rng,keeperX0,soort){
 soort=soort===PLAT||soort===LOB?soort:NORMAAL;
 const D=sc.D,xs=sc.xs||0,wind=sc.wind||0,ac=Math.abs(curl);
 let gx=aim.gx,gy=aim.gy;
 if(sc.acc){const p2=power*power,ph=Math.atan(gx*GW/D)+gauss(rng)*sc.acc*ACC_A*p2*Math.PI/180;gx=D*Math.tan(ph)/GW;gy+=gauss(rng)*sc.acc*ACC_H*p2;}
 // x1 = waar de bal zonder effect zou uitkomen: de sleep bepaalt de vertrekrichting, het effect buigt de bal daarvan weg
 const x1=xs+gx*GW,c=EFF_MAX*curl*(soort===LOB?LOB_K:1),dc=ac?gauss(rng)*EFF_SIG*ac*Math.min(1,EFF_D0/D):0; // dc = afwijking door effect (enkel als de fader niet in het midden staat)
 const kz=sc.kz||KZ,zk=D-kz;let v,vz,T,vx,vy,y1,tW,xr,xk,yk,terug=null,tc=null; // xk,yk = waar de bal het vlak van de keeper kruist (dat leest de keeper)
 if(soort===PLAT){
  v=lerp(12,27,power);vy=Math.sqrt(2*GR*PLAT_H);
  const P=platBaan(D,v,vy,zk);vx=(x1-xs)/P.A;T=P.T;tW=P.tW;y1=P.y;xr=x1+P.Bc*(c+dc)+P.Bw*wind; // hoogte uit de trek telt niet: altijd laag
  xk=xs+P.k.A*vx+P.k.Bc*(c+dc)+P.k.Bw*wind;yk=P.k.y;vz=v;
 }else if(soort===LOB){
  // richting zoals altijd; hoogte van de boog uit de trek, afstand uit de kracht: waar de bal de lijn kruist hangt af van de dosering
  const th=lerp(LOB_TH0,LOB_TH1,clamp(gy/1.6,0,1))*Math.PI/180;v=lerp(LOB_V0,LOB_V1,power);vz=v*Math.cos(th);vy=v*Math.sin(th);
  // keeper ziet de lob en loopt terug naar zijn lijn (na zijn reactietijd; achter een muur pas als hij de bal ziet)
  const t0=sc.kp.react+KEEPER_DRAAI+(sc.wall?WZ/vz:0);
  if(kz>KZ)terug={z0:zk,z1:D-KZ,t0,v:KEEPER_TERUG};
  const zkF=terug?t=>Math.min(terug.z1,terug.z0+terug.v*Math.max(0,t-terug.t0)):()=>zk;
  const B=baan(D,vz,vy,zkF); // droog parcours: een lob die te kort valt, botst; de keeper leest ook dat
  vx=(x1-xs)/B.A;T=B.T;tW=B.tW;y1=B.y;xr=x1+B.Bc*(c+dc)+B.Bw*wind;tc=B.k.t;
  xk=xs+B.k.A*vx+B.k.Bc*(c+dc)+B.k.Bw*wind;yk=B.k.y;
 }else{
  v=lerp(12,27,power);vz=v;T=D/v;
  y1=Math.max(BR,gy*GH);vx=(x1-xs)/T;vy=(y1-BR+.5*GR*T*T)/T;tW=WZ/D*T;xr=x1+.5*(c+dc+wind)*T*T;
  const tk=zk/v;xk=xs+vx*tk+.5*(c+dc+wind)*tk*tk;yk=BR+vy*tk-.5*GR*tk*tk;
 }
 const K=planKeeper(soort===LOB?{...sc,kp:{...sc.kp,skill:1}}:sc,xk,yk,keeperStart(sc,keeperX0),rng,T,tW); // een lob ziet hij komen: geen gok, hij leest de bal
 if(soort===LOB){K.terug=terug;K.tc=tc;K.react=Math.max(K.react,tc-K.tD);} // bij een lob duikt hij niet meteen, maar zo dat hij er is als de bal hem voorbijkomt
 return{sc,D,t:0,T,v,x1,y1,xl:xr,power,soort,curl:c+dc,tg:null,kz,kzNu:kz,extra:extraCaps(sc),
  ball:{X:xs,Y:BR,Z:0,vx,vy,vz,rot:0,spin:6+10*power},
  result:null,cause:null,touch:null,lastTouch:-9,tDecided:null,wallX:-.3+xs*(1-WZ/D),wallLift:0,touches:0,slowT:0,
  K}; // keeper leest waar de echte bal (wind en effectafwijking inbegrepen) zijn eigen vlak kruist: bij een keeper ver voor zijn doel is dat niet de doellijn
}
function collide(S,cap,e){
 const b=S.ball,p=[b.X,b.Y,b.Z],c=closest(p,cap.a,cap.b);
 const dx=p[0]-c[0],dy=p[1]-c[1],dz=p[2]-c[2],d=Math.hypot(dx,dy,dz),m=cap.r+BR;
 if(d>=m)return false;
 let nx,ny,nz;if(d<1e-6){nx=0;ny=0;nz=-1}else{nx=dx/d;ny=dy/d;nz=dz/d}
 b.X=c[0]+nx*m;b.Y=c[1]+ny*m;b.Z=c[2]+nz*m;
 const vn=b.vx*nx+b.vy*ny+b.vz*nz;
 if(vn<0){b.vx-=(1+e)*vn*nx;b.vy-=(1+e)*vn*ny;b.vz-=(1+e)*vn*nz;}
 if(!S.touch||S.touch==='grond'){S.touch=cap.n==='paal'||cap.n==='lat'||cap.n==='muur'||cap.n==='veldspeler'?cap.n:'keeper';}
 if(S.tTouch0==null)S.tTouch0=S.t;S.lastTouch=S.t;S.touches++;return true;
}
function step(S,dt){
 const b=S.ball,D=S.D;S.t+=dt;
 S.kp=keeperPose(S.K,S.t);
 const u=(S.t-.15)/.6;S.wallLift=(S.sc.wall&&S.sc.wallJump!==0&&u>0&&u<1)?.5*Math.sin(Math.PI*u):0; // sc.wallJump = 0: muur blijft staan
 const pz=b.Z,f=S.tg==null?1:Math.exp(-(S.t-S.tg)/EFF_TAU),cu=S.touch?0:S.curl*f+(S.sc.wind||0); // bocht valt weg eens de bal over de grond gaat
 b.X+=b.vx*dt+.5*cu*dt*dt;b.vx+=cu*dt;
 b.Y+=b.vy*dt-.5*GR*dt*dt;b.vy-=GR*dt;b.Z+=b.vz*dt;b.rot+=b.spin*dt;
 if(S.sc.wall)for(const c of wallCaps(S.wallX,S.wallLift))collide(S,c,.25);
 if(S.sc.wall&&S.sc.wallLie)collide(S,lieCap(S.wallX),.25);
 for(const c of S.extra)collide(S,c,.25);
 const tr=S.K.terug,zk=tr?Math.min(tr.z1,tr.z0+tr.v*Math.max(0,S.t-tr.t0)):D-S.kz;S.kzNu=D-zk; // keeper loopt eventueel terug (lob)
 for(const c of keeperCaps(S.kp,zk))collide(S,c,.35);
 for(const c of frameCaps(D))collide(S,c,.55);
 if(b.Y<BR){b.Y=BR;if(S.tg==null)S.tg=S.t; // grond: botsen bij een echte val, anders rollen met lichte remming
  if(b.vy<-ROL_V){b.vy=-b.vy*.55;b.vx*=.92;b.vz*=.92;}else{const k=Math.exp(-ROL_K*dt);b.vy=0;b.vx*=k;b.vz*=k;}}
 if(b.Z>D&&Math.abs(b.X)<GW&&b.Y<GH+.3){ // net
  const f=Math.exp(-7*dt);b.vx*=f;b.vz*=f;
  if(b.Z>D+1){b.Z=D+1;b.vz=0}
  if(Math.abs(b.X)>GW-BR){b.X=Math.sign(b.X)*(GW-BR);b.vx*=-.2}
 }
 S.slowT=(Math.hypot(b.vx,b.vy,b.vz)<.5)?S.slowT+dt:0;
 if(!S.result){
  if(pz<D+BR&&b.Z>=D+BR){
   if(Math.abs(b.X)<GW&&b.Y<GH)S.result='goal';
   else{S.result='nogoal';S.cause=Math.abs(b.X)>=GW?'naast':'over'}
   S.tDecided=S.t;
  }else if(b.vz<=0&&S.touch&&(S.t-S.lastTouch>.4||S.slowT>.35)){S.result='nogoal';S.cause=S.touch;S.tDecided=S.t}
  else if(S.touch&&S.tTouch0!=null&&S.t-S.tTouch0>2){S.result='nogoal';S.cause=S.touch;S.tDecided=S.t}
  else if(S.t>7){S.result='nogoal';S.cause='tijd';S.tDecided=S.t}
 }
}
return{baan,NORMAAL,PLAT,LOB,EFF_MAX,EFF_SIG,EFF_D0,LOB_K,LOB_TH0,LOB_TH1,LOB_V0,LOB_V1,KEEPER_TERUG,PLAT_H,platBaan,keeperStart,extraCaps,lieCap,ACC_A,ACC_H,BR,GW,GH,KZ,WZ,WOFF,seeded,create,step,keeperCaps,wallCaps,frameCaps,closest,keeperPose,clamp,lerp};
})();
if(typeof module!=='undefined')module.exports=Phys;
