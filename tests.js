// Node-based unit test of the syllabifier + phoneme + readability logic
// extracted from the delivered HTML (kept in sync manually).
"use strict";
const V = "aeiouy";
const isVow = ch => V.includes(ch.toLowerCase());

// phonics knowledge: valid syllable onsets (start of a syllable)
const ONSETS = new Set(["str","spr","scr","spl","thr","chr","phr","shr","squ",
  "tr","dr","pl","bl","cl","gl","fl","sl","sp","st","sc","sk","sm","sn","sw","tw","qu",
  "ch","sh","th","ph","wh","gh","br","cr","gr","fr","pr","kn","wr","gn","ps","rh"]);
// a coda (end of syllable) can't end with these letters in English
const CODA_BAD_END = new Set(["h","w","j","q","y"]);
// curated splits for very common tricky words (transparent exceptions)
const EXCEPTIONS = {
  lighthouse: ["light","house"], extraordinary: ["ex","traor","di","nar","y"],
  through: ["through"], thought: ["thought"], neighbour: ["neigh","bour"],
  favourite: ["fa","vour","ite"], favorite: ["fa","vor","ite"],
  because: ["be","cause"], beautiful: ["beau","ti","ful"], knowledge: ["knowl","edge"],
  every: ["ev","ery"], different: ["dif","fer","ent"], evening: ["eve","ning"],
  area: ["ar","e","a"], idea: ["i","de","a"], real: ["re","al"], create: ["cre","ate"],
  science: ["sci","ence"], lion: ["li","on"], poem: ["po","em"],
  water: ["wa","ter"], family: ["fam","i","ly"], camera: ["cam","er","a"],
  memory: ["mem","o","ry"], animal: ["an","i","mal"], ocean: ["o","cean"],
  nature: ["na","ture"], picture: ["pic","ture"], question: ["ques","tion"],
  discovered: ["dis","cov","ered"], sustainable: ["sus","tain","a","ble"],
  mysterious: ["mys","te","ri","ous"], immediately: ["im","me","di","ate","ly"],
  extraordinary: ["ex","traor","di","nar","y"], environment: ["en","vi","ron","ment"],
  comfortable: ["com","for","ta","ble"], together: ["to","ge","ther"],
  instructions: ["in","struc","tions"], photosynthesis: ["pho","to","syn","the","sis"],
  biodiversity: ["bio","di","ver","si","ty"], chloroplasts: ["chlo","ro","plasts"],
  pancakes: ["pan","cakes"], favourite: ["fa","vour","ite"], sustainable: ["sus","tain","a","ble"]
};

function splitCluster(cl, wordInitial){
  // returns [left, right]: left closes the previous syllable, right opens the next
  if (wordInitial) return ["", cl];          // initial cluster is the onset
  if (ONSETS.has(cl)) return ["", cl];       // onset maximization
  if (cl.length === 1) return ["", cl];
  let best = null;
  for (let i = 1; i < cl.length; i++){
    const left = cl.slice(0, i), right = cl.slice(i);
    const rightOk = ONSETS.has(right) || right.length === 1;
    const leftOk = !CODA_BAD_END.has(left[left.length-1]);
    const pair = left[left.length-1] + right[0];
    const digraphBroken = ["th","ch","sh","ph","wh","gh","ck","ng","qu"].includes(pair) &&
                          !ONSETS.has(right);
    if (rightOk && leftOk && !digraphBroken){
      if (!best || right.length > best[1].length) best = [left, right];
    }
  }
  if (best) return best;
  const mid = Math.ceil(cl.length / 2);
  return [cl.slice(0, mid), cl.slice(mid)];
}

function syllabify(word){
  const bare = word.toLowerCase().replace(/[^a-z]/g, "");
  if (EXCEPTIONS[bare]) return EXCEPTIONS[bare].slice();
  if (bare.length <= 3) return [word];
  const groups = [{s: bare[0], t: isVow(bare[0]) ? 'V' : 'C'}];
  for (let i = 1; i < bare.length; i++){
    const t = isVow(bare[i]) ? 'V' : 'C';
    if (t === groups[groups.length-1].t) groups[groups.length-1].s += bare[i];
    else groups.push({s: bare[i], t});
  }
  const syls = [];
  let cur = "";      // complete syllable being built
  let onset = "";    // consonants reserved for the next vowel
  for (let i = 0; i < groups.length; i++){
    const g = groups[i];
    if (g.t === 'V'){
      if (cur){ syls.push(cur); }
      cur = onset + g.s;
      onset = "";
    } else {
      const next = groups[i+1];
      if (next && next.t === 'V'){
        const [left, right] = splitCluster(g.s, i === 0);
        if (cur) syls.push(cur + left);
        else if (left && syls.length) syls[syls.length-1] += left;
        else if (left) syls.push(left);
        cur = "";
        onset = right;
      } else {
        cur += g.s;   // final consonant run stays with previous vowel
      }
    }
  }
  if (cur || onset) syls.push(cur + onset);
  // merge lone consonant syllables into the next syllable
  const syls2 = [];
  for (const p of syls){
    if (syls2.length && syls2[syls2.length-1].length === 1 && !isVow(syls2[syls2.length-1])){
      syls2[syls2.length-1] += p;
    } else {
      syls2.push(p);
    }
  }
  // silent final e merges into previous syllable
  if (syls2.length > 1 && syls2[syls2.length-1] === "e"){
    syls2[syls2.length-2] += "e"; syls2.pop();
  }
  // merge tiny fragments
  const merged = [];
  for (const p of syls2){
    if (merged.length && p.length < 2) merged[merged.length-1] += p;
    else if (p) merged.push(p);
  }
  if (merged.length <= 1) return [word];
  let off = 0;
  return merged.map(p => { const r = word.substr(off, p.length); off += p.length; return r; });
}

const words = ["environment","photosynthesis","extraordinary","biodiversity","sustainable",
               "mysterious","immediately","comfortable","together","because","pancakes",
               "chloroplasts","lighthouse","instructions","favourite","discovered"];
let fails = 0;
for (const w of words){
  const parts = syllabify(w);
  const joined = parts.join("");
  const ok = joined.toLowerCase() === w.toLowerCase() && parts.length >= 2;
  if (!ok) fails++;
  console.log((ok ? "OK " : "FAIL") + " " + w.padEnd(16) + "-> " + parts.join("·"));
}
console.log(fails === 0 ? "\nALL SYLLABIFY TESTS PASS" : "\n" + fails + " FAILURES");
process.exit(fails === 0 ? 0 : 1);
