#!/usr/bin/env python3
"""Compare Lucid's shipped syllabification engine against two independent
references on the 10,000 most frequent English words:
  1. pyphen (TeX hyphenation patterns, en_US) — orthographic convention
  2. CMUdict (phonetic stress marks)          — phonetic syllable counts
Reports count agreement (primary), exact-boundary agreement (secondary),
and failure classes with examples.
"""
import json, re, sys
from collections import Counter
import pyphen

DATA = "data"
engine = json.load(open(f"{DATA}/engine_output.json"))
dic = pyphen.Pyphen(lang="en_US")

# exception words + the 16 unit-test words are "known" examples -> pure-rule subset
KNOWN = set("""lighthouse through thought neighbour favourite favorite
because beautiful knowledge every different evening water family camera
memory animal ocean nature picture question discovered sustainable
mysterious immediately extraordinary environment comfortable together
instructions photosynthesis biodiversity chloroplasts pancakes""".split())
TEST16 = set("""environment photosynthesis extraordinary biodiversity sustainable
mysterious immediately comfortable together because pancakes chloroplasts
lighthouse instructions favourite discovered""".split())

# CMUdict phonetic syllable counts (stress digits), first pronunciation only
cmu = {}
for line in open(f"{DATA}/cmudict.dict", encoding="latin-1"):
    parts = line.strip().split()
    w = parts[0]
    if "(" in w: continue
    w = w.lower()
    if w not in cmu:
        cmu[w] = sum(1 for p in parts[1:] if p[-1].isdigit())

def ref_parts(w):
    h = dic.inserted(w)
    return h.split("-") if h else [w]

n_all = n_pure = 0
agree_py_all = agree_py_pure = 0
agree_cmu_all = agree_cmu_pure = 0
exact_py_all = exact_py_pure = 0
cmu_seen = cmu_seen_pure = 0
over, under, mismatch_examples = [], [], []

for w, parts in engine.items():
    if parts == ["__ERROR__"]:
        print("ENGINE ERROR ON:", w); continue
    e = len(parts); rp = ref_parts(w); r = len(rp)
    pure = w not in KNOWN and w not in TEST16
    n_all += 1; n_pure += pure
    a = e == r
    agree_py_all += a; agree_py_pure += a and pure
    ex = parts == rp
    exact_py_all += ex; exact_py_pure += ex and pure
    if w in cmu:
        c = cmu[w]; cmu_seen += 1; cmu_seen_pure += pure
        ca = e == c
        agree_cmu_all += ca; agree_cmu_pure += ca and pure
    if not a:
        if e > r: over.append((w, e, r))
        else: under.append((w, e, r))

print(f"words audited:            {n_all}   (pure-rule subset: {n_pure})")
print(f"CMUdict coverage:         {cmu_seen}")
print(f"count agreement vs pyphen: {agree_py_all}/{n_all} = {agree_py_all/n_all:.1%}   "
      f"pure: {agree_py_pure/n_pure:.1%}")
print(f"count agreement vs CMU:    {agree_cmu_all}/{cmu_seen} = {agree_cmu_all/cmu_seen:.1%}   "
      f"pure: {agree_cmu_pure/cmu_seen_pure:.1%}")
print(f"exact boundaries vs pyphen:{exact_py_all}/{n_all} = {exact_py_all/n_all:.1%}   "
      f"pure: {exact_py_pure/n_pure:.1%}")
print(f"disagreements: over-split {len(over)}, under-split {len(under)}")
print("\nunder-split examples (engine < pyphen):",
      ", ".join(f"{w} {e}<{r}" for w, e, r in under[:15]))
print("over-split examples  (engine > pyphen):",
      ", ".join(f"{w} {e}>{r}" for w, e, r in over[:15]))

# error pattern by length band
bands = Counter()
for w, e, r in over + under:
    bands[(len(w) // 4, "over" if e > r else "under")] += 1
print("\nby word-length band (4-7, 8-11, 12-14):",
      dict(sorted(bands.items())))

# ---- product-level subset: words the app ACTUALLY chunks in the UI ----
# (reader + before/after both gate on countSyllables(word) >= 3, alphabetic)
prod = [(w, parts) for w, parts in engine.items()
        if parts != ["__ERROR__"] and len(parts) >= 3]
n_prod = len(prod)
pa = pc = pb = 0
cmu_n = 0
over_p, under_p = [], []
for w, parts in prod:
    e = len(parts); rp = ref_parts(w); r = len(rp)
    pa += e == r
    pb += parts == rp
    if e != r:
        (over_p if e > r else under_p).append((w, e, r))
    if w in cmu:
        cmu_n += 1
        pc += e == cmu[w]
print(f"\n--- PRODUCT-LEVEL (words the app visibly chunks: {n_prod}) ---")
print(f"count agreement vs pyphen: {pa}/{n_prod} = {pa/n_prod:.1%}")
print(f"count agreement vs CMU:    {pc}/{cmu_n} = {pc/cmu_n:.1%}")
print(f"exact boundaries vs pyphen:{pb}/{n_prod} = {pb/n_prod:.1%}")
print(f"disagreements: over-split {len(over_p)}, under-split {len(under_p)}")
print("under-split (product-visible):",
      ", ".join(f"{w} {e}<{r}" for w, e, r in under_p[:10]))
print("over-split  (product-visible):",
      ", ".join(f"{w} {e}>{r}" for w, e, r in over_p[:10]))
