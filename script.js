const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
const nameinp = document.querySelector("input");
const errorel = document.querySelector("p.error");
const colors = {
  bread1: "#d39d82",
  bread2: "#fbe8b6",
  bg: "#070707"
}

let w = canvas.width = window.innerWidth,
  h = canvas.height = window.innerHeight;

let socket = null;
let view = "login";
let me = {};
let ping = [];
let players = [];
let camera = [0, 0];
let loadstage = "Connecting...";

let inp = {};
let lastinp = {};
let inpchange = false;
let moving = -1;

// TODO: Bread rendering
function drawbread(x, y, l, a) {
  // switch (a) {
  // console.log("drawing bread at", x, y);
  ctx.fillStyle = colors.bread1;
  ctx.fillRect(x - l / 2, y - 50, l, 100);
  ctx.fillStyle = colors.bread2;
  ctx.fillRect(x - l / 3, y - 40, l / 1.5, 80);
}

function update() {
  ctx.clearRect(0, 0, w, h);
  // ctx.fillStyle = colors.bg;
  // ctx.fillRect(0, 0, w, h);
  switch (view) {
    case "loading":
      ctx.font = "20px Silkscreen";
      ctx.fillStyle = "white"
      ctx.textAlign = "center";
      ctx.fillText(loadstage, w / 2, h / 2);
      break;
    case "game":
      camera = [me.data.pos[0] - w / 2, me.data.pos[1] - h / 2];
      [me, ...players].forEach((p, i) => {
        if (i && p.id == me.id) return;
        if (!p.data?.pos) return;
        drawbread(p.data.pos[0] - camera[0], p.data.pos[1] - camera[1], 100, moving);
        if (p.data.moving > -1 && i) {
          p.data.pos[0] += Math.sin(p.data.moving / 4 * Math.PI);
          p.data.pos[1] -= Math.cos(p.data.moving / 4 * Math.PI);
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
        socket.send("all", { type: "usermove", direction: moving });
      }
      if (moving > -1) {
        me.data.pos[0] += Math.sin(moving / 4 * Math.PI);
        me.data.pos[1] -= Math.cos(moving / 4 * Math.PI);
      }
  }
  lastinp = JSON.parse(JSON.stringify(inp));
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
  socket.on("usermove", c => {
    console.log("user moved",c);
    players.find(x => x.id == c.sender).data.moving = c.direction;
  })
  socket.on("clientjoin", newplayer);
  socket.on("clientleft", playerleft);
  socket.on("disconnect", () => {
    socket = null;
    view = "login";
    errorel.innerHTML = "You were kicked for inactivity.";
    document.querySelector(".login").style.display = "";
  });
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