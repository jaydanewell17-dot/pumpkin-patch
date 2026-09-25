const state={money:500,day:25,month:"September",time:7*60+12,selected:null,seeds:2,plots:Array(8).fill(null),inventory:{},saveKey:"pumpkin-patch-save"};

function money(){document.querySelector("#money").textContent="$"+state.money}
function clock(){let h=Math.floor(state.time/60)%24,m=state.time%60;let ap=h>=12?"PM":"AM";let hh=h%12||12;document.querySelector("#time").textContent=`${hh}:${String(m).padStart(2,"0")} ${ap}`}
function save(){localStorage.setItem(state.saveKey,JSON.stringify(state))}
function render(){
  money();clock();
  const grid=document.querySelector("#farmGrid"); if(!grid)return;
  grid.innerHTML="";
  state.plots.forEach((p,i)=>{
    const b=document.createElement("button"); b.className="plot"+(state.selected===i?" selected":"");
    b.textContent=p?.ready?"🎃":p?"🌱":"·"; b.onclick=()=>{state.selected=i;render()};
    grid.appendChild(b)
  });
}
function show(id){document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));document.querySelector("#"+id).classList.add("active");render()}
document.querySelectorAll("[data-action]").forEach(b=>b.onclick=()=>show(b.dataset.action));

document.querySelector("#seedBtn").onclick=()=>{if(state.money>=10){state.money-=10;state.seeds++;msg("farmMessage","You bought a pumpkin seed.");}else msg("farmMessage","You don't have enough money.");save();render()}
document.querySelector("#plantBtn").onclick=()=>{let i=state.selected;if(i===null)return msg("farmMessage","Choose a plot first.");if(state.plots[i])return msg("farmMessage","That plot is already growing something.");if(!state.seeds)return msg("farmMessage","You need a seed.");state.seeds--;state.plots[i]={age:0,ready:false};msg("farmMessage","A tiny pumpkin seed is in the soil.");save();render()}
document.querySelector("#waterBtn").onclick=()=>{let i=state.selected;if(i===null||!state.plots[i])return msg("farmMessage","Choose a planted plot.");state.plots[i].watered=true;msg("farmMessage","You watered the soil.");save()}
document.querySelector("#harvestBtn").onclick=()=>{let i=state.selected,p=state.plots[i];if(!p?.ready)return msg("farmMessage","That pumpkin isn't ready yet.");state.money+=8;state.plots[i]=null;msg("farmMessage","You harvested a pumpkin and sold it for $8.");save();render()}
document.querySelector("#searchForest").onclick=()=>{const found=Math.random()<.35;msg("houseMessage",found?"You found a bright maple leaf tucked beneath a stone.":"You hear an owl somewhere in the trees.");}

document.querySelectorAll("[data-game]").forEach(b=>b.onclick=()=>{
 const game=b.dataset.game;
 const out=document.querySelector("#festivalMessage");
 if(game==="apples"){state.money+=Math.floor(Math.random()*8)+3;out.textContent="You bobbed for apples and won a little prize money."}
 if(game==="rings"){out.textContent=Math.random()<.45?"You landed a ring! A festival worker gives you $15.":"So close. Try again later.";if(out.textContent.includes("$15"))state.money+=15}
 if(game==="pie"){out.textContent="The baker says your patch has exactly the right kind of pumpkins for a future pie."}
 if(game==="fortune"){const fortunes=["A warm evening is waiting for you.","Something golden will cross your path.","An old friend will remember you.","The forest is hiding something."];out.textContent=fortunes[Math.floor(Math.random()*fortunes.length)]}
 save();render();
});

document.querySelectorAll("[data-house]").forEach(b=>b.onclick=()=>{
 const a=b.dataset.house,out=document.querySelector("#houseMessage");
 if(a==="kitchen")out.textContent="You have flour, eggs, butter, sugar, cinnamon, and a few pumpkins in the pantry.";
 if(a==="journal")out.textContent=`September ${state.day}: The air finally feels different today. I think fall is actually here.`;
 if(a==="wardrobe")out.textContent="Your wardrobe is small for now. Seasonal clothes will unlock later.";
 if(a==="sleep"){state.time=7*60+12;state.day++;state.plots.forEach(p=>{if(p){p.age++;if(p.age>=3)p.ready=true;p.watered=false}});out.textContent="You slept. A new autumn morning begins.";save();render();}
});

function msg(id,t){document.querySelector("#"+id).textContent=t}
const old=localStorage.getItem(state.saveKey);if(old){try{Object.assign(state,JSON.parse(old))}catch{}}
render();
