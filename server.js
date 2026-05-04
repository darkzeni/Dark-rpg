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

// ===== GLOBAL =====
let worldEvent = null;
let lastEvent = Date.now();

// ===== CONTENT POOLS =====

// ORES (FILLER + EXPANSION BASE)
const ores = [
  "stone","iron","coal","copper","nickel","tin"
];

// ENEMIES (EARLY GAME VARIANTS)
const enemies = {
  slime:{hp:20,atk:[4,6]},
  "red slime":{hp:25,atk:[5,7]},
  goblin:{hp:30,atk:[6,8]},
  lizard:{hp:35,atk:[7,9]},
  serpent:{hp:40,atk:[8,10]}
};

// BOSSES
const bosses = {
  cave_guardian:{
    hp:200,
    atk:[12,15],
    phase2:{hp:100,atk:[18,22]}
  }
};

// ITEMS
const items = {
  "iron sword":{type:"weapon",dmg:5},
  "iron armour":{type:"armor",def:5}
};

// BASE RECIPES
const recipes = {
  "iron sword":{iron:5},
  "iron armour":{iron:8}
};

// ABILITIES
const abilityTiers = {F:1,E:1.2,D:1.5,C:2};

const abilitiesData = {
  punch:{tier:"F",scaling:"strength",base:1},
  kick:{tier:"F",scaling:"strength",base:2},
  slam:{tier:"E",scaling:"strength",base:4},
  dash:{tier:"E",scaling:"speed",base:3}
};

// ===== PLAYER =====
function getPlayer(id){
  if(!players[id]){
    players[id]={
      name:null,
      tutorial:true,

      level:1,
      xp:0,
      xpNeeded:50,
      sp:0,

      baseStats:{strength:5,defense:2,stamina:5,intelligence:1,speed:3},
      stats:{},

      hp:100,maxHp:100,

      inventory:{stone:20,iron:10},

      equipment:{weapon:null,armor:null},

      abilities:["punch"],
      abilityXP:{},

      limitBreak:{strength:10,defense:10},

      queue:[],
      activeTask:null,

      combat:null,

      memory:[],
      discoveredRecipes:{},

      mobIndex:{},

      zone:"plains",
      dimension:"overworld"
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

// ===== XP =====
function addXP(p,amt){
  p.xp+=amt;
  let msg=`+${amt} XP`;

  while(p.xp>=p.xpNeeded){
    p.xp-=p.xpNeeded;
    p.level++;
    p.sp+=5;
    p.xpNeeded=Math.floor(p.xpNeeded*1.5);
    msg+=`\nLEVEL UP → ${p.level} (+5 SP)`;
  }

  return msg;
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

// ===== TASK COMPLETE =====
function completeTask(p,t){

  // TRAIN
  if(t.type==="train"){
    if(p.baseStats[t.data]>=p.limitBreak[t.data]){
      return "Limit reached";
    }

    p.baseStats[t.data]+=1;
    return `${t.data} increased\n${addXP(p,5)}`;
  }

  // EXPLORE
  if(t.type==="explore"){
    let r=Math.random();

    if(r<0.4){
      let ore=ores[Math.floor(Math.random()*ores.length)];
      p.inventory[ore]=(p.inventory[ore]||0)+2;
      return `Mined ${ore}\n${addXP(p,8)}`;
    }

    if(r<0.8){
      let names=Object.keys(enemies);
      let e=names[Math.floor(Math.random()*names.length)];
      return `Encountered ${e}`;
    }

    return "Nothing found";
  }

  // CRAFT
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

  // DISCOVER
  if(t.type==="discover"){
    let name=t.data;
    let mats=["stone","iron","coal","copper"];
    let req={};

    for(let i=0;i<3;i++){
      let m=mats[Math.floor(Math.random()*mats.length)];
      req[m]=(req[m]||0)+Math.floor(Math.random()*3)+1;
    }

    p.discoveredRecipes[name]=req;

    return `Discovered recipe for ${name}`;
  }

  // BOSS
  if(t.type==="boss"){
    let b=bosses.cave_guardian;

    p.combat={
      name:"Cave Guardian",
      hp:b.hp,
      atk:b.atk,
      phase:1,
      data:b
    };

    return "Boss spawned";
  }

  return "Done";
}

// ===== ABILITIES =====
function useAbility(name,p){
  let ab=abilitiesData[name];
  if(!ab) return 0;

  let stat=p.stats[ab.scaling]||1;
  let tier=abilityTiers[ab.tier]||1;
  let xp=p.abilityXP[name]||0;

  return Math.floor((ab.base+stat)*tier*(1+xp/20));
}

// ===== COMBAT =====
function combat(input,p){
  let c=p.combat;

  if(input.startsWith("use")){
    let ab=input.replace("use ","");

    if(!p.abilities.includes(ab)) return "No ability";

    let dmg=useAbility(ab,p);
    c.hp-=dmg;

    p.abilityXP[ab]=(p.abilityXP[ab]||0)+1;

    // PHASE CHANGE
    if(c.data && c.hp<=c.data.phase2.hp && c.phase===1){
      c.phase=2;
      c.atk=c.data.phase2.atk;
      return "Boss entered phase 2";
    }

    if(c.hp<=0){
      p.mobIndex[c.name]=true;
      p.combat=null;
      return `${c.name} defeated\n${addXP(p,100)}`;
    }

    let taken=Math.max(0,c.atk[Math.floor(Math.random()*c.atk.length)]-p.stats.defense);
    p.hp-=taken;

    return `${ab} dealt ${dmg}\nEnemy dealt ${taken}`;
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

  applyStats(p);

  // NAME
  if(!p.name){
    if(input.startsWith("name")){
      p.name=input.replace("name ","");
      return `Welcome ${p.name}`;
    }
    return "Set name using: name yourname";
  }

  // TUTORIAL
  if(p.tutorial){
    p.tutorial=false;
    return `
WELCOME

Everything takes time

Train 60s
Explore 60s
Craft 45s

Level up = SP
Use SP with add stat

Start:
explore
train strength
fight

Type info anytime
`;
  }

  let t=processTask(p);
  if(t) return t;

  if(p.combat) return combat(input,p);

  if(p.activeTask) return "Busy";

  // COMMANDS
  if(input==="explore"){
    startTask(p,"explore",null,60000);
    return "Exploring...";
  }

  if(input.startsWith("train")){
    let s=input.split(" ")[1];
    startTask(p,"train",s,60000);
    return "Training...";
  }

  if(input==="fight"){
    let names=Object.keys(enemies);
    let n=names[Math.floor(Math.random()*names.length)];
    let e=enemies[n];

    p.combat={name:n,hp:e.hp,atk:e.atk};
    return `${n} appeared`;
  }

  if(input.startsWith("craft")){
    let item=input.replace("craft ","");
    startTask(p,"craft",item,45000);
    return "Crafting...";
  }

  if(input.startsWith("discover")){
    let item=input.replace("discover ","");
    startTask(p,"discover",item,90000);
    return "Researching...";
  }

  if(input==="boss"){
    startTask(p,"boss",null,60000);
    return "Preparing boss...";
  }

  if(input.startsWith("add")){
    let stat=input.split(" ")[1];
    if(p.sp<=0) return "No SP";
    p.baseStats[stat]++;
    p.sp--;
    return `${stat} increased`;
  }

  if(input==="info"){
    return `
Train 60s small XP
Explore 60s medium XP
Boss huge XP

Level gives SP
Use add strength

Boss fastest leveling
`;
  }

  if(input==="inventory") return JSON.stringify(p.inventory,null,2);
  if(input==="stats") return JSON.stringify(p.stats,null,2);
  if(input==="abilities") return p.abilities.join(", ");
  if(input==="index") return Object.keys(p.mobIndex).join(", ")||"None";

  return "Unknown command";
}

// ===== ROUTES =====
app.get("/",(req,res)=>{
  res.sendFile(path.join(__dirname,"index.html"));
});

app.post("/command",(req,res)=>{
  const {user,command}=req.body;
  let p=getPlayer(user||"temp");

  let msg=run(command,p);

  save();

  res.json({msg,player:p,worldEvent});
});

app.listen(process.env.PORT||3000);
