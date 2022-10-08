const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
const nameinp = document.querySelector("input");
const errorel = document.querySelector("p.error");
const colors = {
  bread1: "#d39d82",
  bread2: "#fbe8b6",
  bg: "#070707",
  gridcol: "#222"
}

let w = canvas.width = window.innerWidth,
  h = canvas.height = window.innerHeight;

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

// TODO: Bread rendering
function drawbread(x, y, l, a) {
  // switch (a) {
  // console.log("drawing bread at", x, y);
  ctx.fillStyle = colors.bread1;
  ctx.fillRect(x - l / 2, y - 50, l, 100);
  ctx.fillStyle = colors.bread2;
  ctx.fillRect(x - l / 3, y - 40, l / 1.5, 80);
}

function drawingr(x, y, type) {
  ctx.fillStyle = ["#f00", "#ff0", "#0f0", "#0ff", "#00f"][type];
  ctx.fillRect(x - 20, y - 20, 40, (40));
  // Sugar
  // Salt
  // Yeast
  // Water
  // Flour
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
        drawbread(p.data.pos[0] - camera[0], p.data.pos[1] - camera[1], 100, moving);
        if (p.data.moving > -1 && i) {
          p.data.pos[0] += Math.sin(p.data.moving / 4 * Math.PI) * td / 10;
          p.data.pos[1] -= Math.cos(p.data.moving / 4 * Math.PI) * td / 10;
        }
      })
      if (inpchange) {
        inpchange = false;
        if (!Object.keys(inp).find(x => inp[x])) moving = -1;
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
        me.data.pos[0] += Math.sin(moving / 4 * Math.PI) * td / 10;
        me.data.pos[1] -= Math.cos(moving / 4 * Math.PI) * td / 10;
      }
      ingrs = ingrs.filter(x => t - x.spawned < 60000);
      ingrs.forEach((e, i) => {
        if (Math.abs(e.x - me.data.pos[0]) + Math.abs(e.y - me.data.pos[1]) < 40) {
          socket.send("all", { type: "foodcoll", x: e.x, y: e.y });
          ingrs.splice(i, 1);
        }
        drawingr(e.x - camera[0], e.y - camera[1], e.type);
      })
  }
  lastinp = JSON.parse(JSON.stringify(inp));
  lt = t;
  requestAnimationFrame(update);
}

async function newplayer() {
  alert("new player!");
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
        ping = me.ping[0] + me.ping[1];
        view = "game";
        console.log(me);
      })
    })
  });
  socket.on("foodspawn", d => {
    ingrs.push({ type: d.ingr, x: d.pos[0], y: d.pos[1], spawned: lt });
  });
  socket.on("foodcoll", d => {
    ingrs.splice(ingrs.findIndex(e => e.x == d.x && e.y == d.y), 1);
  })
  socket.on("usermove", c => {
    console.log("user moved", c);
    let send = players.find(x => x.id == c.sender);
    send.data.moving = c.direction;
    send.data.pos = c.pos;
  })
  socket.on("clientjoin", newplayer);
  socket.on("clientleft", playerleft);
  socket.on("disconnect", connectionerror);
}

document.addEventListener("resize", () => {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
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

  }
})

function connectionerror() {
  socket = null;
  view = "login";
  connectable = false;
  errorel.innerHTML =
    `Uh Oh! It seems the server has unexpectedly shut down.<br>
    Please be aware that I host the server with my own limited time and resources.<br>
    This will be fixed as soon as possible!`;
  document.querySelector(".login").style.display = "";
}