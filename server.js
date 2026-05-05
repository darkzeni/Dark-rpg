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

function save(){
  fs.writeFileSync(SAVE, JSON.stringify(players,null,2));
}

// ===== GLOBAL =====
let worldEvent = null;

// ===== RARITY =====
const rarity = {
  common:{multi:1},
  rare:{multi:1.5},
  epic:{multi:2},
  legendary:{multi:3}
};

// ===== ZONES =====
const zones = {
  plains:{level:1,enemies:["slime","goblin"]},
  forest:{level:3,enemies:["wolf","lizard"]},
  cave:{level:5,enemies:["serpent","black serpent"]}
};

// ===== ORES =====
const ores = ["stone","iron","coal","copper","silver","gold"];

// ===== ENEMIES =====
const enemies = {
  slime:{hp:30,atk:[5,7]},
  goblin:{hp:50,atk:[8,11]},
  wolf:{hp:55,atk:[9,12]},
  lizard:{hp:60,atk:[10,13]},
  serpent:{hp:75,atk:[12,16]},
  "black serpent":{hp:95,atk:[15,20]}
};

// ===== BOSS =====
const bosses = {
  cave_guardian:{
    hp:250,
    atk:[12,16],
    phase2:{hp:120,atk:[18,24]},
    phase3:{hp:60,atk:[25,32]}
  }
};

// ===== ITEMS =====
const items = {
  "iron sword":{type:"weapon",dmg:8},
  "iron armour":{type:"armor",def:6}
};

// ===== ABILITIES =====
const abilitiesData = {
  punch:{scaling:"strength",base:1},
  kick:{scaling:"strength",base:2},
  slam:{scaling:"strength",base:3}
};

// ===== PLAYER =====
function getPlayer(id){
  if(!players[id]){
    players[id]={
      name:null,
      tutorial:true,

      level:1,xp:0,xpNeeded:50,sp:0,

      baseStats:{strength:5,defense:2,stamina:5,intelligence:1,speed:3},
      stats:{},

      hp:100,maxHp:100,

      gold:0,
      inventory:{stone:20,iron:10},

      equipment:{weapon:null,armor:null},
      upgrades:{},

      skillTree:{strength:0,defense:0,speed:0,intelligence:0},

      abilities:["punch"],

      combat:null,
      zone:"plains",

      memory:[]
    };
  }
  return players[id];
}

// ===== APPLY STATS =====
function applyStats(p){
  let s={...p.baseStats};

  // skill tree
  s.strength += p.skillTree.strength*2;
  s.defense += p.skillTree.defense*2;

  // weapon
  if(p.equipment.weapon){
    let w = items[p.equipment.weapon];
    let up = p.upgrades[p.equipment.weapon]||0;
    if(w) s.strength += w.dmg + up*2;
  }

  // armor
  if(p.equipment.armor){
    let a = items[p.equipment.armor];
    let up = p.upgrades[p.equipment.armor]||0;
    if(a) s.defense += a.def + up*2;
  }

  p.stats=s;
}

// ===== XP =====
function addXP(p,amt){
  amt = Math.floor(amt*0.6);
  p.xp+=amt;

  let msg=`+${amt} XP`;

  while(p.xp>=p.xpNeeded){
    p.xp-=p.xpNeeded;
    p.level++;
    p.sp+=2;
    p.xpNeeded=Math.floor(p.xpNeeded*1.8);
    msg+=`\nLEVEL UP ${p.level}`;
  }

  return msg;
}

// ===== BOSS DROP =====
function bossDrop(p){
  if(Math.random()<0.5) return "No drop";

  let tierRand=Math.random();
  let tier = tierRand<0.5?"common":tierRand<0.8?"rare":tierRand<0.95?"epic":"legendary";

  let base = {name:"fang blade",type:"weapon",dmg:12};

  let finalName = `${tier} ${base.name}`;
  let multi = rarity[tier].multi;

  items[finalName] = {
    type:"weapon",
    dmg:Math.floor(base.dmg*multi)
  };

  p.inventory[finalName]=(p.inventory[finalName]||0)+1;

  return finalName;
}

// ===== COMBAT =====
function combat(input,p){
  let c=p.combat;

  if(input.startsWith("use")){
    let ab=input.replace("use ","");

    let data=abilitiesData[ab];
    if(!data) return "No ability";

    let dmg = data.base + (p.stats[data.scaling]||1);
    c.hp -= dmg;

    let log = `${ab} → ${dmg}`;

    // phase change
    if(c.data && c.hp<=c.data.phase2.hp && c.phase===1){
      c.phase=2;
      c.atk=c.data.phase2.atk;
      return "Boss Phase 2";
    }

    if(c.data && c.hp<=c.data.phase3.hp && c.phase===2){
      c.phase=3;
      c.atk=c.data.phase3.atk;
      return "Boss Phase 3";
    }

    if(c.hp<=0){
      let drop = c.boss ? bossDrop(p) : null;

      p.combat=null;
      p.gold+=10;

      return `${c.name} defeated\n${drop?`Drop: ${drop}\n`:""}${addXP(p,50)}`;
    }

    let taken = Math.max(0,c.atk[Math.floor(Math.random()*c.atk.length)]-p.stats.defense);
    p.hp -= taken;

    if(p.hp<=0){
      p.hp=p.maxHp;
      p.combat=null;
      return "You died and recovered";
    }

    return log + `\nEnemy hit ${taken}`;
  }

  if(input==="run"){
    p.combat=null;
    return "Escaped";
  }

  return "use ability or run";
}

// ===== AI =====
function aiResponse(p){
  if(p.hp < p.maxHp*0.4) return "[Guide] You're low HP";
  if(!p.equipment.weapon) return "[Guide] Equip a weapon";
  if(p.sp>0) return "[Guide] Use your SP";
  return "[Guide] Keep progressing";
}

// ===== CORE =====
function run(input,p){
  input=input.toLowerCase();

  applyStats(p);

  if(!p.name){
    if(input.startsWith("name")){
      p.name=input.replace("name ","");
      return `Welcome ${p.name}`;
    }
    return "Set name: name yourname";
  }

  if(p.combat) return combat(input,p);

  if(input==="explore"){
    let z = zones[p.zone];
    let e = z.enemies[Math.floor(Math.random()*z.enemies.length)];
    return `You encountered ${e}`;
  }

  if(input==="fight"){
    let z = zones[p.zone];
    let e = z.enemies[Math.floor(Math.random()*z.enemies.length)];
    let data = enemies[e];
    p.combat={name:e,hp:data.hp,atk:data.atk};
    return `${e} appeared`;
  }

  if(input==="boss"){
    if(p.level<5) return "Too weak";
    let b=bosses.cave_guardian;
    p.combat={name:"Boss",hp:b.hp,atk:b.atk,data:b,phase:1,boss:true};
    return "Boss fight started";
  }

  if(input.startsWith("equip")){
    let item=input.replace("equip ","");
    if(!p.inventory[item]) return "Don't have it";

    let d=items[item];
    if(!d) return "Invalid";

    if(d.type==="weapon") p.equipment.weapon=item;
    if(d.type==="armor") p.equipment.armor=item;

    return `${item} equipped`;
  }

  if(input.startsWith("skill")){
    let s=input.split(" ")[1];
    if(p.sp<=0) return "No SP";
    p.skillTree[s]++;
    p.sp--;
    return `${s} upgraded`;
  }

  if(input==="skills"){
    return JSON.stringify(p.skillTree,null,2);
  }

  if(input==="shop"){
    return "iron sword 50g\niron armour 60g";
  }

  if(input.startsWith("buy")){
    let item=input.replace("buy ","");
    let prices={"iron sword":50,"iron armour":60};

    if(!prices[item]) return "Not for sale";
    if(p.gold<prices[item]) return "Not enough gold";

    p.gold-=prices[item];
    p.inventory[item]=(p.inventory[item]||0)+1;

    return `Bought ${item}`;
  }

  if(input.startsWith("go")){
    let z=input.replace("go ","");
    if(!zones[z]) return "Unknown";
    if(p.level<zones[z].level) return "Too weak";
    p.zone=z;
    return `Moved to ${z}`;
  }

  return "Unknown command\n" + aiResponse(p);
}

// ===== ROUTES =====
app.get("/",(req,res)=>{
  res.sendFile(path.join(__dirname,"index.html"));
});

app.post("/command",(req,res)=>{
  let {user,command}=req.body;

  let p=getPlayer(user||"temp");

  let msg=run(command,p);

  save();

  res.json({msg,player:p,worldEvent});
});

app.listen(3000,()=>console.log("Running on 3000"));
