let socket = null;
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
const nameinp = document.querySelector("input");
const errorel = document.querySelector("p.error");

let w = canvas.width = window.innerWidth,
  h = canvas.height = window.innerHeight;

let view = "login";
let me = {};
let ping = [];
let players = [];
let camera = [0, 0];

function drawbread(x, y, l, a) {

}

function update() {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#070707";
  ctx.fillRect(0, 0, w, h);
  switch (view) {
    case "loading":
      ctx.font = "20px Silkscreen";
      ctx.textAlign = "center";
      ctx.fillText("Loading...", w / 2, h / 2);
      break;
    case "game":
      ctx.fillStyle = "#070707";
      ctx.fillRect(0, 0, w, h);
      camera = me.data.pos;
      [...players, me].forEach(p => {
        console.log(p);
      })
  }
  requestAnimationFrame(update);
}
update();

async function newplayer() {
  players = await socket.list();
}
async function playerleft() {
  players = await socket.list();
}

function login(name) {
  document.querySelector(".login").style.display = "none";
  view = "loading";
  if (!socket) socket = new Client("perma", name);
  socket.on("connect", async () => {
    me = await socket.pingws();
    ping = me.ping[0] + me.ping[1];
    view = "game";
  });
  socket.on("clientjoin", newplayer);
  socket.on("clientleft", playerleft);
  socket.on("disconnect", () => {
    socket = null;
    view = "login";
    errorel.innerHTML = "You were kicked for inactivity."
    document.querySelector(".login").style.display = "";
  });
}

function resize() {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
}
document.addEventListener("resize", resize);
nameinp.addEventListener("input", e => {
  let name = nameinp.value;
  errorel.innerHTML = "";
  if (name.length < 3) return errorel.innerHTML = "Name must be longer than 2 characters."
  if (name.length > 15) return errorel.innerHTML = "Name must be shorter than 16 characters."
  if (!/^[a-zA-Z0-9\-_ ]+$/.test(name)) return errorel.innerHTML = "Name must only consist of a-z, A-Z, 0-9, -, _ and spaces."
  if (e.key == "Enter") login(name);
})
nameinp.addEventListener("keypress", e => {
  if (errorel.innerHTML) return;
  if (e.key == "Enter") login(nameinp.value);
})
document.querySelector("button.play").addEventListener("click", e => {
  if (errorel.innerHTML) return;
  login(nameinp.value);
})