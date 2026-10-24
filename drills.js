'use strict';
// Generated-number drills. Each generator returns a numeric question object:
// {b,t,d,num:true,q,ans,unit,tol(rel)|abs,sol}
const R_=(a,b)=>a+Math.random()*(b-a);
const RI=(a,b)=>Math.floor(R_(a,b+1));
const PK=a=>a[Math.floor(Math.random()*a.length)];
const r3=x=>{if(x===0)return '0';const e=Math.floor(Math.log10(Math.abs(x)));const p=Math.pow(10,2-e);let v=Math.round(x*p)/p;return Math.abs(e)>=4?v.toExponential(2):String(v)};
const GEN={
dilution(){const c1=PK([2,6,12,18]),c2=PK([0.1,0.25,0.5,1.0]),v2=PK([100,250,500,1000]);const a=c2*v2/c1;
 return{b:'cts',t:'stoich',d:1,q:`How many mL of ${c1} M stock solution are needed to prepare ${v2} mL of ${c2} M solution?`,ans:a,unit:'mL',tol:0.02,sol:`C₁V₁ = C₂V₂ → V₁ = (${c2})(${v2})/${c1} = ${r3(a)} mL`};},
limiting(){if(Math.random()<.5){const a=RI(10,60),b=RI(3,12);const nN=a/28.014,nH=b/2.016;const lim=nH/3<nN?'H₂':'N₂';const mol=Math.min(nH/3,nN)*2;const ans=mol*17.031;
 return{b:'cts',t:'stoich',d:3,q:`N₂ + 3H₂ → 2NH₃. ${a} g N₂ react with ${b} g H₂. What is the maximum mass of NH₃ formed (g)? (M: N₂ 28.014, H₂ 2.016, NH₃ 17.031)`,ans,unit:'g',tol:0.02,sol:`n(N₂)=${r3(nN)} mol, n(H₂)=${r3(nH)} mol; H₂ needs 3× so ${lim} is limiting. n(NH₃)=${r3(mol)} mol × 17.031 = ${r3(ans)} g`};}
 const a=RI(5,40),b=RI(10,60);const nAl=a/26.982,nCl=b/70.906;const lim=nCl/3<nAl/2?'Cl₂':'Al';const mol=Math.min(nAl/2,nCl/3)*2;const ans=mol*133.34;
 return{b:'cts',t:'stoich',d:3,q:`2Al + 3Cl₂ → 2AlCl₃. ${a} g Al react with ${b} g Cl₂. What is the maximum mass of AlCl₃ (g)? (M: Al 26.982, Cl₂ 70.906, AlCl₃ 133.34)`,ans,unit:'g',tol:0.02,sol:`n(Al)=${r3(nAl)} mol (needs 2), n(Cl₂)=${r3(nCl)} mol (needs 3); ${lim} is limiting. n(AlCl₃)=${r3(mol)} mol × 133.34 = ${r3(ans)} g`};},
yield(){const m=RI(10,80),f=R_(0.6,0.95);const th=m*56.077/100.087;const act=Math.round(th*f*100)/100;const ans=act/th*100;
 return{b:'cts',t:'stoich',d:2,q:`CaCO₃ → CaO + CO₂. Heating ${m} g CaCO₃ gives ${act} g CaO. What is the percent yield? (M: CaCO₃ 100.087, CaO 56.077)`,ans,unit:'%',tol:0.02,sol:`Theoretical CaO = ${m}/100.087 × 56.077 = ${r3(th)} g; % yield = ${act}/${r3(th)} × 100 = ${r3(ans)}%`};},
gas(){const n=R_(0.5,3).toFixed(2),T=RI(0,100),P=R_(0.5,3).toFixed(2);const V=n*0.082057*(T+273.15)/P;
 return{b:'cts',t:'thermo',d:2,q:`What volume (L) does ${n} mol of ideal gas occupy at ${T} °C and ${P} atm? (R = 0.082057 L·atm/mol·K)`,ans:V,unit:'L',tol:0.02,sol:`V = nRT/P = (${n})(0.082057)(${(T+273.15).toFixed(2)})/${P} = ${r3(V)} L`};},
crossover(){const H=RI(20,150),S=RI(60,300);const T=H*1000/S;
 return{b:'pchem',t:'gibbs',d:2,q:`A reaction has ΔH = +${H} kJ/mol and ΔS = +${S} J/(mol·K). Above what temperature (K) does it become spontaneous (assume ΔH, ΔS constant)?`,ans:T,unit:'K',tol:0.02,sol:`ΔG = ΔH − TΔS = 0 → T = ΔH/ΔS = ${H*1000}/${S} = ${r3(T)} K`};},
logK(){const G=RI(-40,40);const ans=-G*1000/(8.314*298.15*Math.LN10);
 return{b:'pchem',t:'gibbs',d:3,q:`ΔG° = ${G} kJ/mol at 298.15 K. What is log₁₀K? (R = 8.314 J/mol·K)`,ans,unit:'',abs:0.05,sol:`ln K = −ΔG°/RT = ${-G*1000}/(8.314×298.15) = ${r3(ans*Math.LN10)}; log₁₀K = ${r3(ans)}`};},
firstOrder(){const k=R_(1,9).toFixed(2),e=PK([-2,-3,-4]);const kk=k*Math.pow(10,e);const frac=PK([90,99,50]);const t=Math.log(100/(100-frac))/kk;
 return{b:'pchem',t:'kin',d:2,q:`A first-order reaction has k = ${k}×10^${e} s⁻¹. How long (s) until ${frac}% of the reactant has reacted?`,ans:t,unit:'s',tol:0.02,sol:`t = ln(1/(1−${frac/100}))/k = ${r3(Math.log(100/(100-frac)))}/${kk.toExponential(2)} = ${r3(t)} s`};},
arrhenius(){const Ea=RI(30,110),T1=PK([280,298,300,320]),T2=T1+PK([10,20,30]);const ans=Math.exp(Ea*1000/8.314*(1/T1-1/T2));
 return{b:'pchem',t:'kin',d:3,q:`A reaction has E_a = ${Ea} kJ/mol. By what factor does k increase from ${T1} K to ${T2} K? (R = 8.314)`,ans,unit:'×',tol:0.03,sol:`k₂/k₁ = exp[(E_a/R)(1/T₁ − 1/T₂)] = exp[(${Ea*1000}/8.314)(${r3(1/T1)} − ${r3(1/T2)})] = ${r3(ans)}`};},
weakacid(){const pka=R_(3,6).toFixed(2),C=PK([0.01,0.05,0.10,0.50]);const Ka=Math.pow(10,-pka);const x=(-Ka+Math.sqrt(Ka*Ka+4*Ka*C))/2;const ans=-Math.log10(x);
 return{b:'cts',t:'equil',d:3,q:`What is the pH of a ${C} M solution of a weak acid with pKa = ${pka}? (use the exact quadratic)`,ans,unit:'',abs:0.03,sol:`Ka = 10^−${pka} = ${Ka.toExponential(2)}; x²/(C−x)=Ka → x = ${x.toExponential(3)} M; pH = ${r3(ans)}`};},
beer(){const e=PK([1200,5500,12000,18000]),A=R_(0.1,0.9).toFixed(3);const c=A/e;
 return{b:'skoog',t:'beer',d:2,q:`A = ${A}, ε = ${e} L mol⁻¹ cm⁻¹, path length 1.00 cm. What is the concentration (mol/L)?`,ans:c,unit:'M',tol:0.02,sol:`c = A/(εb) = ${A}/(${e}×1.00) = ${c.toExponential(3)} M`};},
nernst(){const E0=R_(0.3,1.2).toFixed(2),n=PK([1,2,3]),Q=PK([0.001,0.01,10,100]);const E=E0-0.05916/n*Math.log10(Q);
 return{b:'cts',t:'redox',d:3,q:`A cell has E° = ${E0} V, n = ${n} electrons and Q = ${Q} at 25 °C. What is E (V)?`,ans:E,unit:'V',abs:0.005,sol:`E = E° − (0.05916/n) log Q = ${E0} − (0.05916/${n})(${r3(Math.log10(Q))}) = ${r3(E)} V`};},
cstr(){const k=R_(0.05,0.5).toFixed(2),X=PK([0.5,0.8,0.9]),v=PK([5,10,20]);const V=v*X/(k*(1-X));const Vp=v*(-Math.log(1-X))/k;
 return{b:'fogler',t:'design',d:3,q:`First-order liquid reaction, k = ${k} min⁻¹, feed v₀ = ${v} L/min. What CSTR volume (L) gives X = ${X}?`,ans:V,unit:'L',tol:0.02,sol:`V = v₀X/[k(1−X)] = ${v}×${X}/(${k}×${r3(1-X)}) = ${r3(V)} L (a PFR would need only ${r3(Vp)} L)`};},
lmtd(){const a=RI(40,120),b=RI(10,35);const ans=(a-b)/Math.log(a/b);
 return{b:'towler',t:'heat',d:3,q:`A heat exchanger has terminal temperature differences ΔT₁ = ${a} K and ΔT₂ = ${b} K. What is the log-mean temperature difference (K)?`,ans,unit:'K',tol:0.02,sol:`ΔT_lm = (${a} − ${b})/ln(${a}/${b}) = ${r3(ans)} K`};},
dbe(){const C=RI(3,12),N=RI(0,2),X=RI(0,2),D=RI(1,Math.min(6,C));const H=2*C+2+N-X-2*D;if(H<1)return GEN.dbe();const O=RI(0,2);
 const f=`C${C}H${H}${N?'N'+(N>1?N:''):''}${O?'O'+(O>1?O:''):''}${X?'Br'+(X>1?X:''):''}`;
 return{b:'silverstein',t:'combined',d:2,q:`How many degrees of unsaturation (rings + π bonds) does ${f} have?`,ans:D,unit:'',abs:0.01,sol:`DBE = C − (H+X)/2 + N/2 + 1 = ${C} − ${(H+X)/2} + ${N/2} + 1 = ${D}`};},
plates(){const t=R_(4,25).toFixed(1),w=R_(0.2,1.2).toFixed(2);const N=16*(t/w)*(t/w);
 return{b:'skoog',t:'chrom',d:2,q:`A peak has t_R = ${t} min and baseline width w = ${w} min. What is the plate number N (N = 16(t_R/w)²)?`,ans:N,unit:'',tol:0.02,sol:`N = 16(${t}/${w})² = ${r3(N)}`};},
sixtenths(){const C1=RI(2,9)*10,S1=PK([100,200,500]),S2=S1*PK([2,3,5,0.5]);const C2=C1*Math.pow(S2/S1,0.6);
 return{b:'towler',t:'cost',d:2,q:`A vessel of capacity ${S1} m³ costs $${C1}k. Using the six-tenths rule, what is the cost ($k) of a ${S2} m³ vessel?`,ans:C2,unit:'$k',tol:0.02,sol:`C₂ = C₁(S₂/S₁)^0.6 = ${C1}(${S2/S1})^0.6 = ${r3(C2)}k`};},
twa(){const c1=RI(20,80),t1=RI(2,5),c2=RI(5,40),t2=RI(1,2),c3=RI(0,10);const t3=8-t1-t2;const ans=(c1*t1+c2*t2+c3*t3)/8;
 return{b:'safety',t:'tox',d:3,q:`An 8-hour shift has exposures of ${c1} ppm for ${t1} h, ${c2} ppm for ${t2} h and ${c3} ppm for the remaining ${t3} h. What is the 8-h time-weighted average (ppm)?`,ans,unit:'ppm',tol:0.02,sol:`TWA = Σ(C·t)/8 = (${c1}×${t1} + ${c2}×${t2} + ${c3}×${t3})/8 = ${r3(ans)} ppm`};},
adiab(){const H=RI(40,200),C=PK([0.5,1,2]);const ans=H*1000*C/4180;
 return{b:'safety',t:'runaway',d:3,q:`A water-like solution (4.18 J/mL·K) at ${C} mol/L undergoes a reaction with −ΔH = ${H} kJ/mol. Estimate the adiabatic temperature rise (K).`,ans,unit:'K',tol:0.03,sol:`ΔT_ad = (−ΔH)C/(ρc_p) = (${H*1000} J/mol × ${C} mol/L)/(4180 J/L·K) = ${r3(ans)} K`};},
lelmix(){const l1=PK([5,2.1,1.2]),l2=PK([3.0,1.4,0.9]),x=RI(2,8)/10;const ans=100/(x*100/l1+(1-x)*100/l2);
 return{b:'safety',t:'flam',d:4,q:`A fuel-vapor mixture is ${Math.round(x*100)} mol% component A (LEL ${l1} vol%) and ${Math.round((1-x)*100)} mol% component B (LEL ${l2} vol%). Using Le Chatelier's mixing rule, what is the mixture LEL (vol%)?`,ans,unit:'vol%',tol:0.03,sol:`LEL_mix = 1/Σ(xᵢ/LELᵢ) = 1/(${x}/${l1} + ${r3(1-x)}/${l2}) = ${r3(ans)} vol%`};},
calorimetry(){const m=RI(20,200),dT=RI(3,40);const q=m*4.184*dT;
 return{b:'cts',t:'thermo',d:1,q:`How much heat (J) is needed to warm ${m} g of water by ${dT} °C? (c = 4.184 J/g·°C)`,ans:q,unit:'J',tol:0.02,sol:`q = mcΔT = ${m}×4.184×${dT} = ${r3(q)} J`};}
};
const DRILL_SETS={
 chem:{name:'Stoichiometry & general chemistry',gens:['dilution','limiting','yield','gas','calorimetry','weakacid','nernst']},
 phys:{name:'Thermo, kinetics & equilibrium',gens:['crossover','logK','firstOrder','arrhenius','weakacid','gas']},
 anal:{name:'Analytical & spectroscopy numbers',gens:['dbe','beer','plates']},
 safe:{name:'Safety numbers (exposure, runaway, flammability)',gens:['twa','adiab','lelmix']},
 eng:{name:'Reaction & process engineering',gens:['cstr','lmtd','sixtenths']}
};
function makeDrill(setId,n){const set=DRILL_SETS[setId];const out=[];for(let i=0;i<n;i++){const g=GEN[set.gens[i%set.gens.length]];const q=g();q.id='gen-'+Date.now().toString(36)+i;q.gen=true;q.k=q.b+'.'+q.t;out.push(q)}return out.sort(()=>Math.random()-.5)}
if(typeof module!=='undefined')module.exports={GEN,DRILL_SETS,makeDrill};
