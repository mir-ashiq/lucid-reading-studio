// Audit: run the VERBATIM engine extracted from index.html over the
// 10,000 most frequent English words. Writes JSON {word: [parts]}.
// Extraction: sed -n '454,562p' index.html  (engineExtract.js = same bytes + export)
"use strict";
const fs = require("fs");
const { syllabify } = require("./engine_extract.js");

const words = fs.readFileSync("data/google10k.txt", "utf8")
  .split("\n").map(w => w.trim().toLowerCase())
  .filter(w => /^[a-z]{4,14}$/.test(w));            // alpha only, readable lengths

const out = {};
for (const w of words) {
  try { out[w] = syllabify(w); } catch (e) { out[w] = ["__ERROR__"]; }
}
fs.writeFileSync("data/engine_output.json", JSON.stringify(out));
console.log("engine ran on", Object.keys(out).length, "words");
