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
if (fs.existsSync(SAVE)) {
  players = JSON.parse(fs.readFileSync(SAVE));
}

function save() {
  fs.writeFileSync(SAVE, JSON.stringify(players, null, 2));
}

// ===== DATA =====
const ores = ["stone","iron","coal","copper"];

const enemies = {
  slime:{hp:20,atk:[4,6]},
  goblin:{hp:30,atk:[6,8]},
  lizard:{hp:35,atk:[7,9]}
};

const items = {
  "iron sword":{type:"weapon",dmg:5},
  "iron armour":{type:"armor",def:5}
};

const recipes = {
  "iron sword":{iron:5},
  "iron armour":{iron:8}
};

const abilities = {
  punch:{stat:"strength",base:2},
  kick:{stat:"strength",base:3}
};

// ===== PLAYER =====
function getPlayer(id){
  if(!players[id]){
    players[id]={
      name:id,

      level:1,
      xp:0,
      xpNeeded:50,
      sp:0,

      baseStats:{strength:5,defense:2,stamina:5,speed:3},
      stats:{},

      hp:100,
      maxHp:100,

      inventory:{stone:20,iron:10},
      equipment:{weapon:null,armor:null},

      abilities:["punch"],

      activeTask:null,
      queue:[],

      combat:null,
      mobIndex:{}
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
    msg+=`\nLEVEL UP → ${p.level}`;
  }

  return msg;
}

// ===== TASK SYSTEM =====
function startTask(p,type,data,duration){
  p.activeTask={type,data,start:Date.now(),duration};
}

function processTask(p){
  if(p.activeTask){
    if(Date.now()-p.activeTask.start>=p.activeTask.duration){
      let t=p.activeTask;
      p.activeTask=null;
      return completeTask(p,t);
    }
  }
  return null;
}

function completeTask(p,t){

  if(t.type==="train"){
    p.baseStats[t.data]++;
    return `${t.data} increased\n${addXP(p,5)}`;
  }

  if(t.type==="explore"){
    let r=Math.random();

    if(r<0.5){
      let ore=ores[Math.floor(Math.random()*ores.length)];
      p.inventory[ore]=(p.inventory[ore]||0)+2;
      return `Found ${ore}\n${addXP(p,8)}`;
    } else {
      let names=Object.keys(enemies);
      let e=names[Math.floor(Math.random()*names.length)];
      return `Encountered ${e}`;
    }
  }

  if(t.type==="craft"){
    let item=t.data;
    let r=recipes[item];

    if(!r) return "No recipe";

    for(let k in r){
      if((p.inventory[k]||0)<r[k]) return "Missing mats";
    }

    for(let k in r) p.inventory[k]-=r[k];

    p.inventory[item]=(p.inventory[item]||0)+1;

    return `${item} crafted`;
  }

  return "Done";
}

// ===== COMBAT =====
function combat(input,p){
  let c=p.combat;

  if(input.startsWith("use")){
    let ab=input.replace("use ","");
    if(!abilities[ab]) return "No ability";

    let dmg=abilities[ab].base + p.stats[abilities[ab].stat];
    c.hp-=dmg;

    if(c.hp<=0){
      p.mobIndex[c.name]=true;
      p.combat=null;
      return `${c.name} defeated\n${addXP(p,20)}`;
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

  let t=processTask(p);
  if(t) return t;

  if(p.combat) return combat(input,p);

  if(p.activeTask && input !== "cancel"){
    return "Busy... type cancel";
  }

  if(input==="cancel"){
    p.activeTask=null;
    return "Cancelled";
  }

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

  if(input.startsWith("equip")){
    let item=input.replace("equip ","");

    if(items[item]?.type==="weapon"){
      p.equipment.weapon=item;
      return `${item} equipped`;
    }

    if(items[item]?.type==="armor"){
      p.equipment.armor=item;
      return `${item} equipped`;
    }

    return "Can't equip";
  }

  if(input.startsWith("add")){
    let stat=input.split(" ")[1];
    if(p.sp<=0) return "No SP";
    p.baseStats[stat]++;
    p.sp--;
    return `${stat} increased`;
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

  if(!user){
    return res.json({msg:"No user"});
  }

  let p=getPlayer(user);
  let msg=run(command,p);

  save();

  res.json({msg,player:p});
});

app.listen(process.env.PORT||3000,()=>{
  console.log("Server running");
});
