---
title: "Modern szoftverfejlesztési eszközök 11. – AI módszerek (LLM, GPT)"
order: 11
date: "11. hét"
slug: "mosze-11-ai-modszerek"
summary: "Transzformer-alapú nagy nyelvi modellek (LLM) áttekintése: tokenizálás, attention, reasoning modellek, tool use és MCP, agentic kódolás, lokális LLM-ek, biztonság és szabályozás."
tags:
  - llm
  - gpt
  - transformer
  - attention
  - rag
  - mcp
  - agentic
  - ollama
  - huggingface
  - prompt-engineering
  - ai-act
---

# Modern szoftverfejlesztési eszközök 11.

## AI módszerek — LLM, GPT

## Leírás

Ez a lecke a **sztochasztikus, tanult valószínűségi modelleken alapuló** kódgenerálásról és szöveggenerálásról szól — az LLM-ek (Large Language Models) belső működéséről, gyakorlati használatáról, és arról, hogyan illeszkednek egy modern szoftverfejlesztési folyamatba.

A lecke a [10. előadásra](/lectures/mosze-10-modell-orientalt-kodgeneralas/) épít, ahol a kódgenerálás még **determinisztikus** volt: metamodellből (AUTOSAR, OPC UA, MOF) szabály-alapú transzformációval kódot állítottunk elő. Itt ugyanazt a problémát közelítjük meg másik oldalról: a "szabályrendszer" helyét egy **tanult valószínűségi eloszlás** veszi át, a kontextust pedig nem metamodell, hanem a **tanítókorpusz és a prompt** definiálja.

## Tanulási célok

A lecke végére a hallgató:

- tudja, hogy mi a token, az embedding és a self-attention — és miért váltotta le a transzformer az LSTM-et,
- átlát egy transzformer alapú generatív pipeline-t a tokenizálástól a dekódolásig,
- ismeri a 2026-os modellpalettát (klasszikus chat, reasoning, multimodális, nyílt súlyú),
- meg tudja különböztetni a prompt engineering alapmintáit (zero/few-shot, CoT, ReAct, structured output),
- érti a tool use / function calling szerepét és az MCP (Model Context Protocol) alapgondolatát,
- tud írni egyszerű Python és Rust klienst OpenAI és Ollama API-hoz,
- ismeri a hallucináció, prompt injection és excessive agency fogalmát,
- tájékozódik az EU AI Act alapstruktúrájában (risk-tier, GPAI).

## Előismeretek

A lecke feltételezi a következő fogalmak alapszintű ismeretét:

- neurális háló, backpropagation, gradiens leszállás (gépi tanulás alapok),
- vektor, mátrix, softmax (lineáris algebra),
- REST API, JSON, környezeti változók (webes alapok),
- Python és egy compiled nyelv (C++ vagy Rust) alapszintű olvasása.

---

## 1. Miért nem működött a naiv megközelítés?

A 2010-es évek közepén a gondolat egyszerű volt: *"a kód is szöveg, adjunk be egy szöveggenerálónak millió repót"*. A korai kísérletek:

- **GAN-ok** — teljesen sztochasztikus generálás. A kimenet szintaktikailag helyes, szemantikailag értelmetlen volt. A "majom írógépen Hamletet gépel" analógia.
- **LSTM** — rekurzív feldolgozás, szekvenciálisan tanul. Három nagy gond volt vele: *elhalványuló gradiens*, *nem párhuzamosítható tanítás*, és hogy hosszabb kontextusban elveszti a fonalat.

A valódi áttörést két dolog együttese hozta:

1. **Attention mechanizmus** (Bahdanau et al., 2014) — ne csak az utolsó rejtett állapot vigye a kontextust, hanem minden állapot legyen elérhető **súlyozottan**.
2. **Transzformer** (Vaswani et al., 2017 — *"Attention Is All You Need"*) — csak attention, rekurzió nélkül. Ez tette **párhuzamosíthatóvá** a tanítást, és ez nyitotta meg az utat a skálázás felé.

---

## 2. A transzformer pipeline

Egy input szöveg útja a modellen keresztül:

1. **Tokenizálás** — BPE (Byte-Pair Encoding) vagy SentencePiece. A "kutya" lehet egy token, a "kutyámasszony" lehet két-három token attól függően, melyik tokenizert használja a modell.
2. **Embedding** — minden tokenhez egy `d`-dimenziós vektor (pl. `d = 4096`). Ez **tanulható paraméter**; a tanítás során a szemantikailag hasonló tokenek közel kerülnek egymáshoz (koszinusz-hasonlóság szerint).
3. **Pozíció-kódolás** — mivel nincs rekurzió, a modell nem "tudja", hányadik helyen áll egy token. Megoldás: sinusoidal vagy **RoPE (Rotary Position Embedding)**.
4. **Attention blokkok** — `N` darab egymás utáni blokk, mindegyik: multi-head self-attention + feed-forward háló + layer norm + reziduális kapcsolat.
5. **Softmax + logitok** — a kimenet egy valószínűségi eloszlás a teljes vokabulárium felett.
6. **Dekódolás** — greedy, beam search, vagy mintavétel (`temperature`, `top-k`, `top-p`/nucleus).

### Self-attention képlet

```
Attention(Q, K, V) = softmax(Q · Kᵀ / √dₖ) · V
```

- **Q** (query), **K** (key), **V** (value) — három tanult projektál a bemeneti embeddingből.
- A `√dₖ`-val osztás a gradiens stabilitásáért van.
- **Multi-head**: több független `(Q, K, V)` "fej" párhuzamosan, különböző figyelmi mintákat tanulva.

### Enkóder-dekóder variánsok

| Architektúra | Példamodell | Tipikus feladat |
|---|---|---|
| Enkóder-only (N→1) | BERT | Osztályozás, NER |
| Dekóder-only (1→N) | GPT | Szöveggenerálás |
| Enkóder-dekóder (N→N) | T5, BART | Fordítás, összefoglalás |

---

## 3. A 2026-os modellpaletta

| Modell család | Szolgáltató | Jelleg | Kontextus | Megjegyzés |
|---|---|---|---|---|
| GPT-4o, o1, o3 | OpenAI | Reasoning, multimodális | 128k–200k | o-modellek: beépített gondolkodási lánc |
| Claude Opus 4.x / Sonnet 4.x | Anthropic | Agentic, kódra erős | 200k | Claude Code CLI natív |
| Gemini 1.5 / 2 | Google | Multimodális, long-context | 1M–2M | Óriási kontextusablak |
| Llama 3.x / 4 | Meta | Nyílt súlyú | 128k | On-prem deployment |
| DeepSeek V3 / R1 | DeepSeek | Reasoning, nyílt súlyú | 128k | Olcsó tanítás, R1 = o1 alternatíva |
| Qwen 2.5, Mistral Large | Alibaba / Mistral | Nyílt vagy hibrid | 128k+ | Erős többnyelvű |

### Reasoning modellek

A klasszikus LLM egy fix számú "gondolkodási lépéssel" válaszol (minden token egy forward pass). A **reasoning modellek** (OpenAI o1/o3, DeepSeek-R1, Claude thinking mode) ezt megtörik: a modellt úgy tanítják (gyakran reinforcement learning-gel), hogy **belső gondolkodási láncot** generáljon, mielőtt válaszol.

Gyakorlati következmények:

- Matek-, logika- és kód-benchmarkokon jelentősen jobb eredmény.
- **Drágább**: a "thinking tokens" is számolnak a számlázásban.
- **Lassabb**: 10–60 másodperces válaszidő nem ritka.
- Nem minden feladatra kell — egy egyszerű átfogalmazásra overkill.

---

## 4. Fine-tuning és RAG

**Fine-tuning** — előtanított modell további tanítása szűkebb célra. Teljes fine-tuning helyett ma leginkább paraméter-hatékony módszerek: **LoRA**, adapters, prompt tuning. Stílus-, szerepkör-, terminológia-váltásra jó; friss adatra rossz.

**RAG (Retrieval-Augmented Generation)** — a modell a válaszolás előtt külső forrásból (vektoradatbázis) lekér releváns kontextust, amit a promptba injektál. A négy fő lépés:

1. **Chunk**: a dokumentumot darabokra vágjuk (500–1500 token).
2. **Embed**: minden darabhoz embedding vektor.
3. **Retrieve**: a felhasználói kérdést is embeddeljük, és a vektoradatbázisból kihozzuk a top-`k` legközelebbi darabot.
4. **Generate**: ezeket a darabokat beillesztjük a promptba, és az LLM-et kérjük válaszra.

Eszközök: LangChain, LlamaIndex, FAISS, Qdrant, pgvector, `bge-base` vagy `all-MiniLM` embedding modellek.

**Mikor melyiket?** Friss / változó / privát adatra RAG. Új stílus vagy szerepkör betanítására fine-tune. A kettő kombinálható.

---

## 5. Tool use, function calling és MCP

Az önmagában álló LLM **csak szöveget** termel. Ha azt akarjuk, hogy *cselekedjen* — pl. olvasson fájlt, futtasson tesztet, lekérdezzen adatbázist —, eszközöket kell adnunk neki.

### Function calling

1. A kliens küld a modellnek egy lista *eszközleírást* (név, paraméterek JSON schema-ban).
2. A modell, ha úgy dönt, hogy hívni akar egy eszközt, **strukturált JSON** választ ad (nem szabad szöveget).
3. A kliens futtatja az eszközt, az eredményt visszatáplálja a beszélgetésbe.
4. A modell folytatja a választ a friss kontextussal.

### Model Context Protocol (MCP)

Az Anthropic által 2024 novemberében kezdeményezett **nyílt, szabványos protokoll** az LLM kliens és eszköz/adatforrás között. Analógia: *"USB-C az AI-nak"*.

- **MCP szerver** = egy szolgáltatás (pl. Slack, GitHub, fájlrendszer) MCP-kompatibilis felülete.
- **MCP kliens** = LLM-et futtató alkalmazás (Claude Code, Cursor, VS Code Copilot, stb.).
- Bármelyik kliens tud bármelyik szerverrel beszélni — nincs N×M integráció.

### Agentic loop

A **cél → terv → eszközhívás → megfigyelés → újratervez** iteratív ciklus. Ez az, amit egy Claude Code vagy Cursor Composer session futtat. Kockázat: **excessive agency** — túl sok jogot adtunk az ügynöknek. Védekezés: legkisebb jogosultság mindig, emberi jóváhagyás kritikus lépésnél (delete, commit, payment), audit-trail.

---

## 6. Prompt engineering 2026-ban

A *prompt engineering* mint diszciplína 2022–2023-ban született. Sokat felváltottak azóta jobb modellek (zero-shot gyakran működik, amire régen few-shot kellett), de a minták még mindig hasznosak:

- **Persona + kontextus + feladat + formátum** — klasszikus 4-részes séma.
- **Few-shot** — akkor használd, ha a kimeneti formátum nagyon specifikus.
- **Chain-of-Thought (CoT)** — reasoning-modellnél felesleges (ők maguktól csinálják); klasszikus modellnél ingyen nyereség.
- **Self-consistency** — `N` darab CoT, szavazás. Drága, de megbízhatóbb.
- **ReAct** — `Thought → Action → Observation → Thought → ...` séma, tool use-hoz.
- **Tree-of-Thought (ToT)** — elágazó gondolkodás backtracking-gel.
- **Structured output** — JSON schema, Pydantic, `response_format={"type": "json_schema"}`. Ha kódból akarod parse-olni, *sose* bízz a szabad szövegben.
- **Prompt injection elleni védelem** — soha ne keverd a felhasználói bemenetet a rendszerutasítással; használj külön szerepköröket (`system` / `user` / `tool`).

---

## 7. AI kódasszisztensek

Három generáció:

**1. Autocomplete (2021–2023)** — GitHub Copilot, Tabnine, Codeium. Sor- vagy blokk-szintű javaslat. Modellek: Codex, StarCoder, CodeLlama.

**2. Chat asszisztens (2023–2024)** — Copilot Chat, ChatGPT kód módban. Kontextusba emelt fájlok, kérdés-válasz.

**3. Agentic, feladat-szintű (2024–)** — **Cursor** (Composer), **Claude Code** (CLI, MCP-alapú), **Windsurf** (Cascade), **Devin**, **Copilot Workspace** (issue-ból PR). Ezek már nem sor-kiegészítést adnak, hanem *"oldd meg ezt a bug-ot"*, *"írd át ezt a modult"*, *"futtasd a teszteket és javítsd, ami elromlik"* szintű feladatokat visznek ciklusban.

Mit változtat ez a hallgatói munkában? Nem az "használtam AI-t vs. nem" a kérdés 2026-ban. A valós elvárás: *használd, de értsd meg, és dokumentáld, mit csináltál*. Ez érvényes a házi feladatokra is.

---

## 8. Lokális és nyílt súlyú LLM-ek

Miért futtatnánk saját gépen LLM-et? Adatvédelem, költség, latencia, szolgáltató-függetlenség, fine-tune szabadság.

**Mai eszközök:**

- **Ollama** — CLI + REST szerver (`ollama run llama3.2`). Legegyszerűbb belépő.
- **llama.cpp** — C++ inferencia motor, CPU és GPU, GGUF formátum.
- **LM Studio** — GUI, sok modellel.
- **vLLM** — szerver-oldali, nagy throughput, paged attention.
- **HuggingFace Transformers / TGI** — kutatás és produkció.

**Kvantálás** — a modell súlyait alacsonyabb precízióra konvertáljuk (fp16 → int8 → int4). Tipikus formátumok: **GGUF** (`Q4_K_M` a "jó ár-érték arány"), AWQ, GPTQ. Durván: **1 milliárd paraméter ≈ 0.5–1 GB** Q4-ben. Egy 7B modell Q4-ben elfér egy 8 GB-os GPU-n, kontextussal együtt.

---

## 9. Kódpéldák

### 9.1 OpenAI chat completion — Python

```python
# pip install openai
from openai import OpenAI

client = OpenAI()  # API kulcs automatikusan a környezetből

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "Te egy szigorú szoftvertechnológia oktató vagy."},
        {"role": "user", "content": "Mondd el 3 mondatban, mi a különbség BERT és GPT között."},
    ],
    temperature=0.3,
    max_tokens=200,
)

print(response.choices[0].message.content)
print(f"Tokenek: prompt={response.usage.prompt_tokens}, "
      f"completion={response.usage.completion_tokens}")
```

### 9.2 Strukturált kimenet Pydantic-kal

```python
from openai import OpenAI
from pydantic import BaseModel

class KodReview(BaseModel):
    sulyossag: str          # "alacsony" | "kozepes" | "magas"
    sor: int
    uzenet: str
    javaslat: str

class KodReviewValasz(BaseModel):
    reviews: list[KodReview]

client = OpenAI()
kod = "def div(a, b):\n    return a / b\n"

response = client.beta.chat.completions.parse(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "Kódreview asszisztens vagy. Csak strukturált választ adsz."},
        {"role": "user", "content": f"Review-zd le:\n```python\n{kod}\n```"},
    ],
    response_format=KodReviewValasz,
)

for r in response.choices[0].message.parsed.reviews:
    print(f"[{r.sulyossag}] sor {r.sor}: {r.uzenet} ⟶ {r.javaslat}")
```

### 9.3 HuggingFace Transformers — lokális szentiment analízis

```python
# pip install transformers torch
from transformers import pipeline

sentiment = pipeline(
    "sentiment-analysis",
    model="distilbert-base-uncased-finetuned-sst-2-english",
)

mondatok = [
    "Ez a vizsga kifejezetten nehéz volt.",
    "A MOSZE tárgy végre kezd összeállni.",
    "Ez a labor totál használhatatlan.",
]

for m in mondatok:
    out = sentiment(m)[0]
    print(f"{m!r:55s} ⟶ {out['label']} ({out['score']:.2f})")
```

### 9.4 Ollama REST API — lokális LLM Rustban

Ollama alapértelmezésben a `11434`-es porton fut. Modell előtöltve: `ollama pull llama3.2`.

```rust
// Cargo.toml:
//   reqwest = { version = "0.12", features = ["json"] }
//   serde = { version = "1", features = ["derive"] }
//   tokio = { version = "1", features = ["full"] }

use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct OllamaKeres {
    model: String,
    prompt: String,
    stream: bool,
}

#[derive(Deserialize, Debug)]
struct OllamaValasz {
    response: String,
    eval_count: u32,
    eval_duration: u64, // ns
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let keres = OllamaKeres {
        model: "llama3.2".into(),
        prompt: "Magyarázd el röviden, mi a transzformer attention.".into(),
        stream: false,
    };

    let valasz: OllamaValasz = reqwest::Client::new()
        .post("http://localhost:11434/api/generate")
        .json(&keres)
        .send()
        .await?
        .json()
        .await?;

    println!("{}", valasz.response);
    let tps = valasz.eval_count as f64 / (valasz.eval_duration as f64 / 1e9);
    println!("\n⟶ {:.1} token/s", tps);
    Ok(())
}
```

### 9.5 Tool use — egyszerű function calling

A modell *dönt*, hogy hívja-e a függvényt; a kliens *végrehajtja*.

```python
from openai import OpenAI
import json

def get_idojaras(varos: str) -> dict:
    # Valójában itt API hívás lenne. Most mock.
    return {"varos": varos, "celsius": 14, "allapot": "borult"}

tools = [{
    "type": "function",
    "function": {
        "name": "get_idojaras",
        "description": "Aktuális időjárás lekérése egy városra",
        "parameters": {
            "type": "object",
            "properties": {"varos": {"type": "string"}},
            "required": ["varos"],
        },
    },
}]

client = OpenAI()
uzenetek = [{"role": "user", "content": "Milyen az idő ma Győrben?"}]

# 1. kör — a modell valószínűleg tool hívást ad vissza
response = client.chat.completions.create(
    model="gpt-4o-mini", messages=uzenetek, tools=tools,
)
msg = response.choices[0].message
uzenetek.append(msg)

if msg.tool_calls:
    for hivas in msg.tool_calls:
        args = json.loads(hivas.function.arguments)
        eredmeny = get_idojaras(**args)
        uzenetek.append({
            "role": "tool",
            "tool_call_id": hivas.id,
            "content": json.dumps(eredmeny),
        })

    # 2. kör — a modell a tool eredményét beépítve ad választ
    final = client.chat.completions.create(
        model="gpt-4o-mini", messages=uzenetek,
    )
    print(final.choices[0].message.content)
```

### 9.6 GitHub Action — LLM-es kódreview PR-re

`OPENAI_API_KEY` secret-ként a repo beállításai között.

```yaml
# .github/workflows/ai-review.yml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Diff kinyerése
        id: diff
        run: |
          git diff origin/${{ github.base_ref }}...HEAD > diff.patch
          echo "meret=$(wc -c < diff.patch)" >> "$GITHUB_OUTPUT"

      - name: LLM review
        if: steps.diff.outputs.meret > 0
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          pip install --quiet openai
          python <<'PY'
          from openai import OpenAI
          diff = open("diff.patch").read()[:30000]
          resp = OpenAI().chat.completions.create(
              model="gpt-4o-mini",
              messages=[
                  {"role": "system", "content":
                   "Kódreview asszisztens. Csak valós hibákat és biztonsági problémákat jelents."},
                  {"role": "user", "content": f"Review:\n{diff}"},
              ],
          )
          with open("review.md", "w") as f:
              f.write(resp.choices[0].message.content)
          PY

      - name: Komment posztolása
        if: steps.diff.outputs.meret > 0
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          path: review.md
```

---

## 10. Értékelés és benchmarkok

Amit egy MOSZE-hallgatónak tudnia kell a modellek összehasonlításáról:

- **HumanEval** (OpenAI, 2021) — 164 Python feladat, unit teszttel.
- **MBPP** — Mostly Basic Python Problems, 974 feladat.
- **SWE-Bench** — 2294 valós GitHub issue 12 nagy Python repoból; *megoldható-e PR-rel*.
- **LiveCodeBench** — időhöz kötött, szivárgás-ellenálló kód benchmark.
- **MMLU / GPQA** — általános, illetve PhD-szintű tudás.
- **TruthfulQA** — hallucinációs mérőszám.

---

## 11. Biztonság, etika, szabályozás

### OWASP Top 10 for LLM Applications

1. Prompt injection (közvetlen és indirekt)
2. Érzékeny adat szivárgás
3. Supply chain (rossz szándékú modell súlyok)
4. Data / Model poisoning
5. Improper output handling
6. **Excessive agency** — túl sok jogot adtunk az ügynöknek
7. System prompt leak
8. Vektor és embedding gyengeségek
9. Misinformation
10. Unbounded consumption

### EU AI Act (2024 elfogadva, 2025–2027 fokozatos hatály)

| Kockázati szint | Példa | Kötelezettség |
|---|---|---|
| **Tilos** | Social scoring, manipulatív AI, munkavállaló/diák érzelem-monitoring | Tilalom |
| **Magas** | Életkritikus rendszerek (orvosi, jogi, kritikus infra) | Szigorú megfelelőség |
| **Korlátozott** | Chatbot | Átláthatóság (tudd, hogy MI-vel beszélsz) |
| **Minimális** | Spam szűrő, játék | Nincs kötelezettség |
| **GPAI** | Általános célú modellek (LLM-ek) | Külön szabálykör; szisztémás kockázat fölött még szigorúbb |

### Történeti tanulópénzek

- **Microsoft Tay** (2016, Twitter) — 16 óra alatt rasszista botrány. Tanulság: ne tanulj éles felhasználói bemenetből felügyelet nélkül.
- **Galactica** (Meta, 2022) — 3 nap után kivonva hallucináció miatt.
- **Bing / Sydney** (2023) — manipulatív chatbot-perszona; korai RLHF problémák.
- **Gemini képgenerálás** (2024 február) — túlkompenzáló diverzitás történelmi képeknél.
- **NYT vs. OpenAI** (2023–) — copyright per tanítóadat miatt; iparági precedens.

---

## 12. Híd a 12. előadásba

A mai óra **egyetlen LLM-ről** szólt: hogyan működik, hogyan hívjuk meg, hogyan kódolunk vele. A következő órán arról lesz szó, hogyan **üzemeltetünk** egy AI-t tartalmazó rendszert — **MLOps**. Kérdések, amiket a 12. óra megválaszol:

- Hogyan tesztelünk egy LLM-alapú alkalmazást, ha a válasz nem determinisztikus?
- Hogyan monitorozunk hallucinációt éles forgalomban?
- Mi történik, ha a modell új verziója jobb benchmarkon, de rosszabb a mi feladatunkon? (*Model drift*)
- Hogyan tartunk tanítóadat-kataszteres, auditálható pipeline-t?
- Hogyan illeszkedik a CI/CD az ML modell életciklusába?

---

## 13. Gyakorló kérdések

### Fogalmi

1. Miért volt szükség a transzformer architektúrára az LSTM helyett? Nevezz meg két konkrét problémát, amit megold.
2. Magyarázd el saját szavakkal, mi a különbség a tokenizálás és az embedding között.
3. Mi a self-attention képlete? `Attention(Q, K, V) = ?`
4. Nevezz meg három enkóder-dekóder variánst és egy-egy tipikus feladatot, amire használjuk.
5. Miben más egy reasoning modell (o1, R1), mint egy klasszikus GPT-4o?
6. Mi a hallucináció, és miért *strukturális* probléma, nem pedig bug?
7. Mi a function calling / tool use szerepe az agentic működésben?
8. Mi az MCP, és milyen problémát old meg?
9. Hasonlítsd össze a fine-tuning-ot és a RAG-ot. Mikor melyiket válaszd?
10. Mit jelent a prompt injection, és hogy lehet ellene védekezni?

### Gyakorlati

11. Adott: 7 milliárd paraméteres LLM, Q4 kvantálás. Becsüld meg a VRAM igényt.
12. Mit csinál a `temperature=0` és `temperature=1.0` beállítás? Mikor melyiket?
13. Adj egy példát zero-shot, few-shot és chain-of-thought promptra ugyanarra a feladatra.
14. Tervezz egy RAG pipeline-t: mi a 4 fő lépés, és melyikhez milyen eszközt használnál?
15. A Copilot javaslata szerinted hibás. Hogy tudod *biztosan* validálni? (2 technika)
16. Hogy strukturálnál egy promptot úgy, hogy a válasz JSON-ban jöjjön vissza, és biztos tudd parse-olni?
17. Miért nem elég a unit teszt egy LLM-alapú funkcióra? Milyen tesztelési rétegek kellenek még?
18. A házi feladatra használtál ChatGPT-t. Az EU AI Act alapján ez milyen kockázati kategóriába esik, és van-e átláthatósági kötelezettséged?

---

## 14. Irodalom, linkek

### Alap

- Vaswani et al. (2017): *Attention Is All You Need* — <https://arxiv.org/abs/1706.03762>
- Jay Alammar: *The Illustrated Transformer* — <https://jalammar.github.io/illustrated-transformer/>
- Prompt Engineering Guide — <https://www.promptingguide.ai/>
- OpenAI API dokumentáció — <https://platform.openai.com/docs/>

### Tool use, agent, MCP

- Model Context Protocol — <https://modelcontextprotocol.io/>
- OpenAI function calling — <https://platform.openai.com/docs/guides/function-calling>
- ReAct paper — <https://arxiv.org/abs/2210.03629>

### Lokális LLM

- Ollama — <https://ollama.com/>
- llama.cpp — <https://github.com/ggerganov/llama.cpp>
- HuggingFace Hub — <https://huggingface.co/>

### Biztonság és szabályozás

- OWASP Top 10 for LLM Applications — <https://owasp.org/www-project-top-10-for-large-language-model-applications/>
- EU AI Act áttekintő — <https://artificialintelligenceact.eu/>

### Benchmark

- HumanEval — <https://github.com/openai/human-eval>
- SWE-Bench — <https://www.swebench.com/>
- LiveCodeBench — <https://livecodebench.github.io/>
