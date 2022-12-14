const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
const nameinp = document.querySelector("input");
const errorel = document.querySelector("p.error");
const leadel = document.querySelector(".lead");
const colors = {
  bread1: "#d39d82",
  bread2: "#fbe8b6",
  bread3: "#cc927a",
  gridcol: "#222"
}
const { PI, sin, cos, tan, asin, acos, atan, sqrt, floor, random, abs, round, min, max } = Math;

const actx = new (window.AudioContext || window.webkitAudioContext)();
const collsource = document.getElementsByTagName("audio")[0];
const slicesource = document.getElementsByTagName("audio")[1];
const colltrack = actx.createMediaElementSource(collsource);
const slicetrack = actx.createMediaElementSource(slicesource);
const gain = actx.createGain();
gain.gain.value = 1;

colltrack.connect(gain).connect(actx.destination);
slicetrack.connect(gain).connect(actx.destination);

let w = canvas.width = window.innerWidth,
  h = canvas.height = window.innerHeight;
ctx.imageSmoothingEnabled = false;

let socket = null;
let view = "login";
let me = {};
let ping = [];
let players = [];
let ingrs = [];
let camera = [0, 0];
let loadstage = "Connecting...";
let connectable = true;

let inp = {};
let lastinp = {};
let inpchange = false;
let moving = -1;
let lt = 0;
let collected = [0, 0, 0, 0, 0];
let lasta = 0;
let sliceto = 0;
let damageind = 0;

let ingrsrc = [
  "src/sugar.png",
  "src/salt.png",
  "src/yeast.png",
  "src/water.png",
  "src/flour.png"
];
let ingrtext = "     ".split("").map((_, n) => {
  let i = new Image(16, 16);
  i.src = ingrsrc[n];
  return i;
});
let breadcuttext = new Image();
breadcuttext.src = "src/breadcut.png";
let breadcutfilltext = new Image();
breadcutfilltext.src = "src/breadcutfill.png";
let breadsidetext = new Image();
breadsidetext.src = "src/breadside.png";

let breadcutfillrighttext = new Image();
breadcutfillrighttext.src = "src/breadcutfillright.png";
let breadcutrighttext = new Image();
breadcutrighttext.src = "src/breadcutright.png";
let breadcutfilllefttext = new Image();
breadcutfilllefttext.src = "src/breadcutfillleft.png";
let breadcutlefttext = new Image();
breadcutlefttext.src = "src/breadcutleft.png";

let knifetext = new Image();
knifetext.src = "src/knife.png";

function breadpatt(x, y) {
  ctx.moveTo(x - 50, y);
  ctx.lineTo(x - 50, y - 30);
  ctx.lineTo(x + 50, y - 30);
  ctx.moveTo(x + 50, y);
  ctx.closePath();
}

function drawbread(x, y, l, a, n) {
  if (a == 0 || a == 4) {
    ctx.drawImage(breadcutfilltext, x - 50, y - l / 2, 100, 94);
    ctx.fillStyle = colors.bread1;
    ctx.fillRect(x - 48, y - l / 2 + 27, 96, l);
    ctx.drawImage(breadcuttext, x - 50, y + l / 2, 100, 94);
  } else if (a == 2 || a == 6) {
    y += 20;
    ctx.drawImage(breadsidetext, x - l / 2 - 23, y - 47, 47, 94);
    ctx.drawImage(breadsidetext, x + l / 2 - 23, y - 47, 47, 94);
    ctx.fillStyle = colors.bread1;
    ctx.fillRect(x - l / 2, y - 33, l, 77);
    ctx.fillStyle = colors.bread3;
    ctx.fillRect(x - l / 2, y + 2, l, 4);
  } else if (a == 1 || a == 5) {
    ctx.drawImage(breadcutfilllefttext, x + l / 2 - 47, y - l / 2, 94, 94);
    ctx.fillStyle = colors.bread1;
    l -= 40;
    ctx.beginPath();
    ctx.moveTo(x - 40 - l / 2, y + 40 + l / 2);
    ctx.lineTo(x + 5 + l / 2, y - 5 - l / 2);
    ctx.lineTo(x + 50 + l / 2, y + 70 - l / 2);
    ctx.lineTo(x + 10 - l / 2, y + 110 + l / 2);
    ctx.closePath();
    ctx.fill();
    l += 40;
    ctx.drawImage(breadcutlefttext, x - l / 2 - 47, y + l / 2, 94, 94);
  } else if (a == 3 || a == 7) {
    ctx.drawImage(breadcutfillrighttext, x - l / 2 - 47, y - l / 2, 94, 94);
    ctx.fillStyle = colors.bread1;
    l -= 40;
    ctx.beginPath();
    ctx.moveTo(x - 50 - l / 2, y + 70 - l / 2);
    ctx.lineTo(x - 7 + l / 2, y + 112 + l / 2);
    ctx.lineTo(x + 40 + l / 2, y + 38 + l / 2);
    ctx.lineTo(x - 10 - l / 2, y - 10 - l / 2);
    ctx.closePath();
    ctx.fill();
    l += 40;
    ctx.drawImage(breadcutrighttext, x + l / 2 - 47, y + l / 2, 94, 94);
  }
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.fillText(n, x, y - 70);
}

function drawingr(x, y, type, t) {
  ctx.globalAlpha = (15000 - t) / 3000;
  ctx.drawImage(ingrtext[type], x - 32, y - 32, 64, 64);
}

function checklvlup() {
  if (!collected.every(x => x > 0)) return;
  collected = collected.map(x => x - 1);
  me.data.lvl++;
  socket.send("all", { type: "lvlup", lvl: me.data.lvl });
  me.data.prot = false;
  collsource.play();
}

function update(t) {
  let td = t - lt;
  ctx.clearRect(0, 0, w, h);
  switch (view) {
    case "loading":
      ctx.font = "20px Silkscreen";
      ctx.fillStyle = "white"
      ctx.textAlign = "center";
      ctx.fillText(loadstage, w / 2, h / 2);
      break;
    case "game":
      camera = [me.data.pos[0] - w / 2, me.data.pos[1] - h / 2];
      ctx.fillStyle = colors.gridcol;
      for (i = 0; i < 20; i++) {
        if (w > h) ctx.fillRect(w / 20 * i + (-camera[0] % (w / 20)), 0, 1, h);
        if (w > h) ctx.fillRect(0, w / 20 * i + (-camera[1] % (w / 20)), w, 1);
        if (w < h) ctx.fillRect(h / 20 * i + (-camera[0] % (h / 20)), 0, 1, h);
        if (w < h) ctx.fillRect(0, h / 20 * i + (-camera[1] % (h / 20)), w, 1);
      }
      [me, ...players].forEach((p, i) => {
        if (i && p.id == me.id) return;
        if (!p.data?.pos) return;
        if (p.data.moving > -1 && i) {
          p.data.pos[0] += sin(p.data.moving / 4 * PI) * td / 5;
          p.data.pos[1] -= cos(p.data.moving / 4 * PI) * td / 5;
        }
        if (abs(camera[0] - p.data.pos[0]) > w || abs(camera[1] - p.data.pos[1] > h)) return;
        if (i) drawbread(
          p.data.pos[0] - camera[0],
          p.data.pos[1] - camera[1],
          p.data.lvl * 30 + 40,
          p.data.moving == -1 ? p.data.lastrot : p.data.moving,
          p.name
        );
        if (p.data.sliceanim > 0) {
          p.data.sliceanim -= .02;
          ctx.drawImage(
            knifetext, p.data.pos[0] - camera[0] - 50,
            p.data.pos[1] - camera[1] - cos((1 - p.data.sliceanim) * PI) * 40 - 30,
            100, 100
          )
        }
      })
      drawbread(
        me.data.pos[0] - camera[0],
        me.data.pos[1] - camera[1],
        me.data.lvl * 30 + 40,
        moving == -1 ? lasta : moving, me.name
      );

      if (inpchange) {
        inpchange = false;
        moving = -1;
        if (inp.w) moving = 0;
        if (inp.d) moving = 2;
        if (inp.s) moving = 4;
        if (inp.a) moving = 6;
        if (inp.w && inp.d) moving = 1;
        if (inp.d && inp.s) moving = 3;
        if (inp.s && inp.a) moving = 5;
        if (inp.a && inp.w) moving = 7;
        socket.send("all", { type: "usermove", direction: moving, pos: me.data.pos });
      }
      if (moving > -1) {
        me.data.pos[0] += sin(moving / 4 * PI) * td / 5;
        me.data.pos[1] -= cos(moving / 4 * PI) * td / 5;
        lasta = moving;
      }

      ingrs = ingrs.filter(x => t - x.spawned < 15000);
      ingrs.forEach((e, i) => {
        if (abs(e.x - me.data.pos[0]) + abs(e.y - me.data.pos[1]) < 60) {
          socket.send("all", { type: "foodcoll", id: e.uuid });
          collected[e.type]++;
          checklvlup();
          ingrs.splice(i, 1);
        }
        drawingr(e.x - camera[0], e.y - camera[1], e.type, t - e.spawned);
      })

      if (!me.data.prot) me.data.lvl -= .0001 * td / 20;
      ctx.globalAlpha = 1;
      ctx.font = "40px Silkscreen";
      ctx.filter = "drop-shadow(2px 2px 10px black)";
      for (i = 0; i < 5; i++) {
        drawingr(100 * i + 40, h - 40, i);
        ctx.fillStyle = "white";
        ctx.fillText(collected[i], 100 * i + 90, h - 20);
      }
      ctx.textAlign = "right";
      ctx.fillText(me.data.lvl.toFixed(2), w - 20, h - 20);
      ctx.filter = "none";

      leadel.innerHTML = "<h1>Leaderboard</h1>";
      players.sort((a, b) => a.lvl - b.lvl).slice(0, 9).reverse().forEach(p => {
        let e = document.createElement("div");
        if (p.id == me.id) e.className = "me";
        e.innerHTML =
        `<lvl>${(p.id == me.id ? me.data.lvl : p.data.lvl).toFixed(1)}</lvl>
        <name>${p.name}</name>`;
        leadel.appendChild(e);
      });

      if (damageind > 0) {
        damageind -= .004;
        let grad = ctx.createRadialGradient(w / 2, h / 2, 100, w / 2, h / 2, 800);
        try {
          grad.addColorStop(0, "transparent");
          grad.addColorStop(1 - damageind, "transparent");
          let col = floor(max(0, damageind) * 16).toString(16);
          grad.addColorStop(1, "#900" + col);
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);
        } catch {}
      }
      break;
  }
  if (sliceto > 0) sliceto -= 1;
  lastinp = JSON.parse(JSON.stringify(inp));
  lt = t;
  requestAnimationFrame(update);
}

async function newplayer() {
  players = await socket.list();
}
async function playerleft() {
  players = await socket.list();
}

function login(name) {
  if (!connectable) return;
  document.querySelector(".login").style.display = "none";
  view = "loading";
  update();
  if (!socket) socket = new Client("bread", name);
  socket.on("connect", async () => {
    loadstage = "Joining..."
    let lobby = await socket.search();
    console.log(lobby);
    socket.join(lobby[0].code);
    loadstage = "Spawning...";
  });
  socket.on("spawned", d => {
    socket.pingws().then(m => {
      me = m;
      socket.list().then(l => {
        players = l;
        console.log(m, d);
        me.data = d.data;
        me.data.lvl = 0;
        me.data.prot = true;
        ingrs = d.ingrs.map(i => ({
          type: i.ingr,
          x: i.pos[0],
          y: i.pos[1],
          spawned: i.spawned - lt,
          uuid: i.uuid
        }));
        ping = me.ping[0] + me.ping[1];
        view = "game";
        collsource.play();
        leadel.style.display = "";
        console.log(me);
      })
    })
  });
  socket.on("foodspawn", d => {
    ingrs.push({ type: d.ingr, x: d.pos[0], y: d.pos[1], spawned: lt, uuid: d.uuid });
  });
  socket.on("foodcoll", d => {
    console.log("collected", d);
    console.log(ingrs.findIndex(x => x.uuid == d.id))
    ingrs.splice(ingrs.findIndex(x => x.uuid == d.id), 1);
  });
  socket.on("usermove", c => {
    console.log("user moved", c);
    let send = players.find(x => x.id == c.sender);
    if (c.direction == -1) send.data.lastrot = send.data.moving;
    send.data.moving = c.direction;
    send.data.pos = c.pos;
  });
  socket.on("lvlup", c => {
    console.log("level up:", c)
    players[c.sender].data.lvl = c.lvl;
    players[c.sender].data.prot = false;
  })
  socket.on("slice", d => {
    console.log("sliced", d);
    if (me.id == d.target) {
      slicesource.play();
      me.data.lvl *= sliceremoval(d.dist);
      damageind += sliceremoval(d.dist);
      me.data.sliceanim = 1;
    } else {
      let pl = players.find(p => p.id == d.target);
      pl.data.lvl *= sliceremoval(d.dist);
      pl.data.sliceanim = 1;
    }
  });
  socket.on("kicked", () => {
    tomenu();
  })
  socket.on("clientjoin", newplayer);
  socket.on("clientleft", playerleft);
  socket.on("disconnect", connectionerror);
}

window.addEventListener("resize", () => {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
  ctx.imageSmoothingEnabled = false;
});

nameinp.addEventListener("input", e => {
  let name = nameinp.value;
  errorel.innerHTML = "";
  if (name.trim().length < 3) return errorel.innerHTML = "Name must be longer than 2 characters."
  if (name.trim().length > 15) return errorel.innerHTML = "Name must be shorter than 16 characters."
  if (!/^[a-zA-Z0-9\-_ ]+$/.test(name)) return errorel.innerHTML = "Name must only consist of a-z, A-Z, 0-9, -, _ and spaces."
  if (e.key == "Enter") login(name);
});
nameinp.addEventListener("keypress", e => {
  if (errorel.innerHTML) return;
  if (e.key == "Enter") login(nameinp.value);
});
document.querySelector("button.play").addEventListener("click", e => {
  if (errorel.innerHTML) return;
  login(nameinp.value);
});

document.addEventListener("keydown", e => {
  inp[e.key] = true;
  if (!e.repeat && "wasd".includes(e.key)) inpchange = true;
});
document.addEventListener("keyup", e => {
  inp[e.key] = false;
  if ("wasd".includes(e.key)) inpchange = true;
});
document.addEventListener("click", e => {
  if (view == "game") {
    if (sliceto > 0) return;
    let { x: cx, y: cy } = e;
    let x = me.data.pos[0];
    let y = me.data.pos[1];
    let dist = players.map(p => p.id == me.id ?
      Infinity : sqrt((x - p.data.pos[0]) ** 2 + (y - p.data.pos[1]) ** 2));
    let mind = min(...dist);
    let ind = dist.indexOf(mind);
    console.log("Slicing", dist, mind, ind);
    if (players[ind].data.prot || mind > 500) return;
    if (sqrt(
      (cx - players[ind].data.pos[0]) ** 2 +
      (cy - players[ind].data.pos[1]) ** 2
    ) < 100) return;
    sliceto = 100;
    players[ind].data.lvl *= sliceremoval(mind);
    players[ind].data.sliceanim = 1;
    socket.send("all", { type: "slice", target: players[ind].id, dist: mind });
  }
})

function sliceremoval(dist) {
  return dist < 500 ? (100 - ((dist - 500) ** 2 / 4000)) / 100 : 1;
}

function connectionerror() {
  connectable = false;
  errorel.innerHTML =
    `Uh Oh! It seems the server has unexpectedly shut down.<br>
    Please be aware that I host the server with my own limited time and resources.<br>
    This will be fixed as soon as possible!`;
  tomenu();
}

function tomenu() {
  socket = null;
  view = "login";
  leadel.style.display = "none";
  document.querySelector(".login").style.display = "";
}

// TODO: better bots
// BUG: inconsitency of ingredients lying around (?)