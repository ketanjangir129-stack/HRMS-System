const db = require("../config/firebase");

/*
|--------------------------------------------------------------------------
| Live Mirror
|--------------------------------------------------------------------------
| Garam (baar-baar padhe jaane wale) Firebase paths ki server par ek zinda
| copy — wahi tareeka jo frontend onValue se karta hai, bas server par.
|
| Pehli baar path maanga gaya to ek on("value") listener lagta hai aur
| poora node ek baar aata hai. Uske baad Firebase sirf badlaav bhejta hai,
| aur har read memory se — har request par ~300ms ka round trip aur poore
| node ka download khatam.
|
| Sahi kyun rehta hai:
|   - Apne writes: Admin SDK apna likha listener ko turant deta hai, isliye
|     commit ke baad padha hua hamesha naya hota hai.
|   - Doosre server / Console ke writes: listener ~100ms mein le aata hai.
|     Pehle bhi "padho phir likho" mein yahi faasla tha — usse bura nahi.
|   - Listener toote (cancel) to copy hat jaati hai aur read seedha
|     once() par chala jaata hai — request kabhi fail nahi hoti.
|
| Jo path IDLE_MS tak na padha jaaye uska listener hat jaata hai — jis
| company ka koi online nahi, uska data memory mein nahi baithta.
|
| Snapshot hi lautata hai (once() jaisa), isliye val() har baar nayi copy
| deta hai — koi caller doosre ka data badal nahi sakta.
|--------------------------------------------------------------------------
*/

const IDLE_MS = 30 * 60 * 1000;
const SWEEP_MS = 5 * 60 * 1000;

const mirrors = new Map();
let sweeper = null;

const startSweeper = () => {
  if (sweeper) return;

  sweeper = setInterval(() => {
    const now = Date.now();
    mirrors.forEach((mirror, path) => {
      if (now - mirror.usedAt >= IDLE_MS) drop(path);
    });
  }, SWEEP_MS);

  // Server band karte waqt ye timer use roke na rakhe
  sweeper.unref?.();
};

function drop(path) {
  const mirror = mirrors.get(path);
  if (!mirror) return;

  mirrors.delete(path);
  try {
    mirror.ref.off("value", mirror.onValue);
  } catch (error) {
    console.error(`Live mirror detach failed (${path}):`, error);
  }
}

const attach = (path) => {
  const ref = db.ref(path);
  const mirror = { ref, snapshot: null, usedAt: Date.now() };

  mirror.ready = new Promise((resolve, reject) => {
    mirror.onValue = (snapshot) => {
      mirror.snapshot = snapshot;
      resolve();
    };

    ref.on("value", mirror.onValue, (error) => {
      // Listener toota — copy hatao; agla read naya listener lagayega
      console.error(`Live mirror cancelled (${path}):`, error);
      if (mirrors.get(path) === mirror) mirrors.delete(path);
      reject(error);
    });
  });

  // Koi await na kare tab bhi "unhandled rejection" na bane
  mirror.ready.catch(() => {});

  mirrors.set(path, mirror);
  startSweeper();
  return mirror;
};

/*
| once("value") ki jagah. Copy taiyaar ho to memory se, warna pehli sync
| ka intezaar (ek saath aaye saare reads usi ek download par ruktey hain).
*/
const snapshot = async (path) => {
  const mirror = mirrors.get(path) || attach(path);
  mirror.usedAt = Date.now();

  try {
    await mirror.ready;
    return mirror.snapshot;
  } catch {
    return db.ref(path).once("value");
  }
};

const read = async (path) => (await snapshot(path)).val();

// Tests aur shutdown ke liye — saare listener hatao
const reset = () => {
  [...mirrors.keys()].forEach(drop);
  if (sweeper) {
    clearInterval(sweeper);
    sweeper = null;
  }
};

const size = () => mirrors.size;

module.exports = { snapshot, read, reset, size, IDLE_MS };
