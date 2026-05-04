const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ===== SAVE =====
const SAVE = "save.json";
let players = {};
if (fs.existsSync(SAVE)) players = JSON.parse(fs.readFileSync(SAVE));

function save() {
  fs.writeFileSync(SAVE, JSON.stringify(players, null, 2));
}

// ===== GLOBAL WORLD =====
let worldEvent = null;
let lastEvent = Date.now();

// ===== DATA =====
const abilityTiers = { F:1, E:1.2, D:1.5, C:2, B:3, A:4, S:6 };

const abilitiesData = {
  punch:{tier:"F",scaling:"strength",base:1},
  kick:{tier:"F",scaling:"strength",base:2},
  slam:{tier:"E",scaling:"strength",base:4}
};

const ores = {
  T1:["stone","iron","coal","copper"]
};

const enemies = {
  slime:{hp:20,atk:[5,6]},
  goblin:{hp:30,atk:[6,8]},
  lizard:{hp:35,atk:[7,9]}
};

const bosses = {
  cave_guardian:{
    hp:200,
    phases:[
      {hp:200,atk:[10,12]},
      {hp:100,atk:[15,18]}
    ]
  }
};

const items = {
  "iron sword":{type:"weapon",dmg:5},
  "iron armour":{type:"armor",def:5}
};

const recipes = {
  "iron sword":{iron:5},
  "iron armour":{iron:8}
};

const zones = {
  plains:{enemies:["slime","goblin"],ores:["stone","iron"]}
};

const dimensions = {
  overworld:{multi:1},
  void:{multi:2}
};

// ===== PLAYER =====
function getPlayer(id){
  if(!players[id]){
    players[id]={
      name:id,

      baseStats:{strength:5,defense:2,stamina:5,intelligence:1},
      stats:{},

      hp:100,maxHp:100,

      inventory:{stone:20,iron:10},

      equipment:{weapon:null,armor:null},

      abilities:["punch"],
      abilityXP:{},

      limitBreak:{strength:10,defense:10},

      mobIndex:{},

      queue:[],
      activeTask:null,

      combat:null,

      memory:[],
      discoveredRecipes:{},

      zone:"plains",
      dimension:"overworld",

      faction:null,
      reputation:{}
    };
  }
  return players[id];
}

// ===== STATS =====
function applyStats(p){
  let s={...p.baseStats};

  if(p.equipment.weapon){
    let w=items[p.equipment.weapon];
    if(w) s.strength+=w.dmg;
  }

  if(p.equipment.armor){
    let a=items[p.equipment.armor];
    if(a) s.defense+=a.def;
  }

  p.stats=s;
}

// ===== TASK SYSTEM =====
function startTask(p,type,data,duration){
  p.activeTask={type,data,start:Date.now(),duration};
}

function processTask(p){
  if(!p.activeTask && p.queue.length>0){
    let n=p.queue.shift();
    startTask(p,n.type,n.data,n.duration);
  }

  if(p.activeTask){
    if(Date.now()-p.activeTask.start>=p.activeTask.duration){
      let r=completeTask(p,p.activeTask);
      p.activeTask=null;
      return r;
    }
  }
  return null;
}

function completeTask(p,t){
  if(t.type==="train"){
    if(p.baseStats[t.data]>=p.limitBreak[t.data]){
      return "Limit reached";
    }
    p.baseStats[t.data]+=1;
    return `${t.data} increased`;
  }

  if(t.type==="explore") return explore(p);

  if(t.type==="craft"){
    let item=t.data;
    let r=p.discoveredRecipes[item]||recipes[item];
    if(!r) return "No recipe";

    for(let k in r){
      if((p.inventory[k]||0)<r[k]) return "Missing mats";
    }

    for(let k in r) p.inventory[k]-=r[k];

    p.inventory[item]=(p.inventory[item]||0)+1;
    return `${item} crafted`;
  }

  if(t.type==="discover"){
    let name=t.data;
    let r=generateRecipe(name,p);
    p.discoveredRecipes[name]=r;
    return `Discovered ${name}`;
  }

  if(t.type==="limitbreak"){
    let stat=t.data;
    if(p.baseStats[stat]<p.limitBreak[stat]) return "Not at limit";
    p.limitBreak[stat]+=10;
    return `${stat} limit increased`;
  }

  if(t.type==="boss"){
    let b=bosses.cave_guardian;
    p.combat={name:"Cave Guardian",hp:b.hp,phase:0,boss:true,data:b};
    return "Boss spawned";
  }

  return "Done";
}

// ===== EXPLORE =====
function explore(p){
  let z=zones[p.zone];
  let r=Math.random();

  if(r<0.4){
    let ore=z.ores[Math.floor(Math.random()*z.ores.length)];
    p.inventory[ore]=(p.inventory[ore]||0)+2;

    if(worldEvent==="ore boost") p.inventory[ore]+=2;

    return `Mined ${ore}`;
  }

  if(r<0.8){
    let e=z.enemies[Math.floor(Math.random()*z.enemies.length)];
    return `Encountered ${e}`;
  }

  return "Nothing found";
}

// ===== ABILITIES =====
function useAbility(name,p){
  let ab=abilitiesData[name];
  if(!ab) return 0;

  let stat=p.stats[ab.scaling]||1;
  let tier=abilityTiers[ab.tier]||1;
  let xp=p.abilityXP[name]||0;

  let growth=1+(xp/20);

  return Math.floor((ab.base+stat)*tier*growth);
}

function levelAbility(p,name){
  p.abilityXP[name]=(p.abilityXP[name]||0)+1;
}

function evolveAbility(p,name){
  let xp=p.abilityXP[name]||0;

  if(name==="punch" && xp>10 && !p.abilities.includes("kick")){
    p.abilities.push("kick");
    return "Punch evolved into Kick";
  }

  if(name==="kick" && xp>20 && !p.abilities.includes("slam")){
    p.abilities.push("slam");
    return "Kick evolved into Slam";
  }

  return null;
}

// ===== AI RECIPE =====
function generateRecipe(name,p){
  let mats=["stone","iron","coal","copper"];
  let req={};

  let count=2+Math.floor(Math.random()*3);

  for(let i=0;i<count;i++){
    let m=mats[Math.floor(Math.random()*mats.length)];
    req[m]=(req[m]||0)+Math.floor(Math.random()*4)+1;
  }

  return req;
}

// ===== COMBAT =====
function combat(input,p){
  let c=p.combat;

  if(input.startsWith("use")){
    let ab=input.replace("use ","");

    if(!p.abilities.includes(ab)) return "No ability";

    let dmg=useAbility(ab,p);
    c.hp-=dmg;

    levelAbility(p,ab);
    let evo=evolveAbility(p,ab);

    if(c.hp<=0){
      p.mobIndex[c.name]=true;
      p.combat=null;
      return `${c.name} defeated`;
    }

    let atk=c.enemy?c.enemy.atk:[10];
    let taken=Math.max(0,atk[Math.floor(Math.random()*atk.length)]-p.stats.defense);

    p.hp-=taken;

    return `${ab} dealt ${dmg}\nEnemy dealt ${taken}\n${evo||""}`;
  }

  if(input==="run"){
    p.combat=null;
    return "Escaped";
  }

  return "use ability or run";
}

// ===== CORE =====
function run(input,p){
  input=input.toLowerCase();

  p.memory.push(input);
  if(p.memory.length>20) p.memory.shift();

  applyStats(p);

  // world event
  if(Date.now()-lastEvent>300000){
    let ev=["ore boost","enemy rage","calm"];
    worldEvent=ev[Math.floor(Math.random()*ev.length)];
    lastEvent=Date.now();
  }

  let t=processTask(p);
  if(t) return t;

  if(p.combat) return combat(input,p);

  if(p.activeTask) return "Busy";

  if(input.startsWith("train")){
    let s=input.split(" ")[1];

    if(!p.activeTask){
      startTask(p,"train",s,60000);
      return "Training...";
    }

    p.queue.push({type:"train",data:s,duration:60000});
    return "Queued";
  }

  if(input==="explore"){
    startTask(p,"explore",null,60000);
    return "Exploring...";
  }

  if(input==="fight"){
    let names=Object.keys(enemies);
    let n=names[Math.floor(Math.random()*names.length)];
    let e=enemies[n];

    p.combat={name:n,hp:e.hp,enemy:e};
    return `${n} appeared`;
  }

  if(input.startsWith("craft")){
    let item=input.replace("craft ","");

    if(!p.activeTask){
      startTask(p,"craft",item,45000);
      return "Crafting...";
    }

    p.queue.push({type:"craft",data:item,duration:45000});
    return "Queued";
  }

  if(input.startsWith("discover")){
    let name=input.replace("discover ","");

    startTask(p,"discover",name,90000);
    return "Researching...";
  }

  if(input.startsWith("limitbreak")){
    let stat=input.split(" ")[1];

    startTask(p,"limitbreak",stat,120000);
    return "Attempting...";
  }

  if(input==="boss"){
    startTask(p,"boss",null,60000);
    return "Preparing boss...";
  }

  if(input.startsWith("equip")){
    let item=input.replace("equip ","");

    if(!p.inventory[item]) return "No item";

    if(items[item].type==="weapon") p.equipment.weapon=item;
    if(items[item].type==="armor") p.equipment.armor=item;

    return `Equipped ${item}`;
  }

  if(input==="abilities") return p.abilities.join(", ");
  if(input==="inventory") return JSON.stringify(p.inventory,null,2);
  if(input==="stats") return JSON.stringify(p.stats,null,2);
  if(input==="index") return Object.keys(p.mobIndex).join(", ")||"None";

  return `
Commands:
explore
train strength
fight
craft iron sword
discover item
boss
abilities
`;
}

// ===== ROUTES =====
app.get("/",(req,res)=>{
  res.sendFile(path.join(__dirname,"index.html"));
});

app.post("/command",(req,res)=>{
  const {user,command}=req.body;

  let p=getPlayer(user||"player1");

  let msg=run(command,p);

  save();

  res.json({msg,player:p});
});

app.listen(process.env.PORT||3000);
