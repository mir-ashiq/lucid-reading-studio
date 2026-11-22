# Unseen-word audit of the syllabification engine

The 16 in-app unit tests lock canonical demo words. This audit answers the
harder question: **how does the engine behave on thousands of words it has
never seen?**

Method: the engine is extracted *verbatim* from `index.html` (lines 454-562,
`engine_extract.js` — same bytes, plus a module export) and run over the
10,000 most frequent English words (8,892 after filtering to pure-alpha,
4-14 letters). Each split is compared against two independent references:

- **pyphen** (TeX hyphenation patterns, `en_US`) — same orthographic
  convention as the engine
- **CMUdict** phonetic transcriptions — syllable count from stress marks

## Results (after the silent-e fix, commit 2)

See `results.txt` for the full measured output.

| metric | before fix | after fix |
|---|---|---|
| count agreement vs CMUdict (all words) | 75.4% | **81.4%** |
| count agreement vs pyphen (all words) | 62.4% | **68.0%** |
| count agreement vs CMUdict (words the app visibly chunks) | 64.2% | **72.9%** |
| exact boundaries vs pyphen | 41.4% | **46.2%** |

The audit *found* a systematic defect: final silent-e words ("on·li·ne",
"ser·vi·ce", "mes·sa·ge") were over-split into an extra syllable. The fix
(one rule: a single-consonant+e final syllable after a short vowel-final
syllable merges back; "-le" stays syllabic) lifted every metric above.

Known remaining failure classes (documented, not hidden):
- "-ed" after non-t/d consonants ("re·ser·ved" = 3 vs 2)
- unstressed vowels ("business", "every")
- short-vowel VCV words ("manage" → "ma·na·ge" vs "man·age")
- hiatuses like "graduate" / "appreciate" (-iate/-uate)

These are dictionary problems, not rule problems — English orthography is
genuinely irregular there. The exception list grows with real usage.

## Reproduce

```sh
pip install pyphen                                   # reference hyphenator
curl -so data/google10k.txt https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english.txt
curl -so data/cmudict.dict https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict
node run_engine.js          # runs the verbatim engine, writes data/engine_output.json
python3 audit_compare.py    # prints all metrics + failure examples
```

References: Google 10k English word list; CMUdict (Carnegie Mellon
University); pyphen (TeX hyphenation patterns).
