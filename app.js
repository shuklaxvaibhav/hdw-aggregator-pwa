// HDW Aggregator - first prototype (offline-first collection logging)
// TODO: replace localStorage with IndexedDB / SQLite (wa-sqlite) for the real outbox
// TODO: farmer list should come from the FPO database, hardcoded for now

const SYNC_URL = "http://localhost:8000/api/collections"; // FastAPI backend (not built yet)
const MOCK_SYNC = true; // true = fake the server call so the demo works without a backend

const TEXT = {
  en: {
    form: "Crop Collection Log", farmer: "Farmer ID", crop: "Crop Type", weight: "Weight (kg)",
    time: "Timestamp", save: "Save Collection", queue: "Offline Sync Queue",
    offlineMode: "Simulate 4G dead-zone", online: "Connected", offline: "Offline",
    pending: "Pending", synced: "Synced", empty: "Nothing saved yet",
    clear: "Clear synced", needWeight: "Enter a weight first",
    saved: "Saved on phone", crops: { Tomato: "Tomato", Onion: "Onion", Potato: "Potato" }
  },
  hi: {
    form: "फसल संग्रह प्रविष्टि", farmer: "किसान आईडी", crop: "फसल का प्रकार", weight: "वज़न (किग्रा)",
    time: "समय", save: "संग्रह सहेजें", queue: "ऑफ़लाइन सिंक कतार",
    offlineMode: "4G डेड-ज़ोन चालू करें", online: "जुड़ा हुआ", offline: "ऑफ़लाइन",
    pending: "लंबित", synced: "सिंक हुआ", empty: "अभी कुछ सहेजा नहीं गया",
    clear: "सिंक हुए हटाएं", needWeight: "पहले वज़न डालें",
    saved: "फ़ोन में सहेजा गया", crops: { Tomato: "टमाटर", Onion: "प्याज़", Potato: "आलू" }
  }
};

let lang = localStorage.getItem("hdw_lang") || "en";
let outbox = JSON.parse(localStorage.getItem("hdw_outbox") || "[]");
let forceOffline = false;
let syncing = false;

const $ = (id) => document.getElementById(id);

function isOffline() {
  return forceOffline || !navigator.onLine;
}

function saveOutbox() {
  localStorage.setItem("hdw_outbox", JSON.stringify(outbox));
}

function nowLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function drawLabels() {
  const t = TEXT[lang];
  $("formTitle").textContent = t.form;
  $("lblFarmer").textContent = t.farmer;
  $("lblCrop").textContent = t.crop;
  $("lblWeight").textContent = t.weight;
  $("lblTime").textContent = t.time;
  $("saveBtn").textContent = t.save;
  $("queueTitle").textContent = t.queue;
  $("offlineLabel").textContent = t.offlineMode;
  $("clearBtn").textContent = t.clear;
  for (const opt of $("crop").options) opt.textContent = t.crops[opt.value];
  document.documentElement.lang = lang;
}

function drawStatus() {
  const t = TEXT[lang];
  const el = $("netStatus");
  el.textContent = isOffline() ? "● " + t.offline : "● " + t.online;
  el.className = isOffline() ? "off" : "on";
}

function drawQueue() {
  const t = TEXT[lang];
  const ul = $("queue");
  ul.innerHTML = "";
  if (outbox.length === 0) {
    ul.innerHTML = "<li>" + t.empty + "</li>";
    return;
  }
  for (const r of outbox) {
    const li = document.createElement("li");
    const icon = r.status === "pending" ? "🕒" : "✅";
    li.innerHTML =
      "<span>" + icon + " " + t.crops[r.crop] + " - " + r.weight + " kg" +
      "<small>" + r.farmer.split(" - ")[0] + " | " + r.time.replace("T", " ") + "</small></span>" +
      "<span class='" + r.status + "'>" + t[r.status] + "</span>";
    ul.appendChild(li);
  }
}

function drawAll() {
  drawLabels();
  drawStatus();
  drawQueue();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function sendOne(rec) {
  if (MOCK_SYNC) {
    await sleep(600);
    return true;
  }
  const res = await fetch(SYNC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rec)
  });
  return res.ok;
}

async function flush() {
  if (syncing || isOffline()) return;
  const todo = outbox.filter((r) => r.status === "pending");
  if (todo.length === 0) return;

  syncing = true;
  $("bar").hidden = false;
  $("barFill").style.width = "0%";

  let done = 0;
  for (const rec of todo) {
    if (isOffline()) break; // lost network again, stop and try later
    try {
      const ok = await sendOne(rec);
      if (ok) rec.status = "synced";
    } catch (err) {
      console.log("sync failed, will retry", err);
      break;
    }
    done++;
    $("barFill").style.width = Math.round((done / todo.length) * 100) + "%";
    saveOutbox();
    drawQueue();
  }

  await sleep(300);
  $("bar").hidden = true;
  syncing = false;
}

$("form").addEventListener("submit", (e) => {
  e.preventDefault();
  const t = TEXT[lang];
  const weight = Number($("weight").value);
  if (!weight || weight <= 0) {
    $("msg").textContent = t.needWeight;
    return;
  }
  $("msg").textContent = "";
  outbox.unshift({
    id: Date.now(),
    farmer: $("farmer").value,
    crop: $("crop").value,
    weight: weight,
    time: $("time").value || nowLocal(),
    status: "pending"
  });
  saveOutbox();
  $("weight").value = "";
  $("time").value = nowLocal();
  drawQueue();
  flush(); // does nothing if offline
});

$("langBtn").addEventListener("click", () => {
  lang = lang === "en" ? "hi" : "en";
  localStorage.setItem("hdw_lang", lang);
  drawAll();
});

$("offlineToggle").addEventListener("change", (e) => {
  forceOffline = e.target.checked;
  drawStatus();
  flush();
});

$("clearBtn").addEventListener("click", () => {
  outbox = outbox.filter((r) => r.status === "pending");
  saveOutbox();
  drawQueue();
});

window.addEventListener("online", () => { drawStatus(); flush(); });
window.addEventListener("offline", drawStatus);

$("time").value = nowLocal();
drawAll();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch((err) => console.log("sw error", err));
}
