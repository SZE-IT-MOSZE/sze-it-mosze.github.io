---
title: "Modern szoftverfejlesztési eszközök 11. – AI módszerek (LLM, GPT)"
order: 11
date: "11. hét"
slug: "mosze-11-ai-modszerek"
summary: "Transzformer-alapú nagy nyelvi modellek (LLM) áttekintése: tokenizálás, attention, reasoning modellek, tool use és MCP, agentic kódolás, LLM framework-ök (LangChain, LlamaIndex, Haystack, Semantic Kernel), lokális LLM-ek telepítési mintái, kvantálás (GPTQ / AWQ / BitsAndBytes / GGUF) és LoRA / QLoRA adaptáció, biztonság és szabályozás."
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
  - langchain
  - llamaindex
  - haystack
  - semantic-kernel
  - prompt-engineering
  - quantization
  - gguf
  - gptq
  - awq
  - bitsandbytes
  - lora
  - qlora
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

**Fine-tuning** — előtanított modell további tanítása szűkebb célra. Teljes fine-tuning helyett ma leginkább **paraméter-hatékony** módszerek dominálnak: **LoRA**, adapters, prompt tuning. Stílus-, szerepkör-, terminológia-váltásra jó; friss adatra rossz.

### LoRA — Low-Rank Adaptation

A teljes fine-tuning minden súlyt hangol — ez 7B+ modelleken több tíz GB VRAM-ot és hosszú tréninget igényel, és egy teljes új modellpéldányt szül minden feladathoz. A **LoRA** ezt kerüli meg:

- A bázismodell súlyait **befagyasztjuk** (nem tanítjuk).
- Minden nagy súlymátrix mellé teszünk **két kicsi `A` és `B` low-rank adaptert** (`ΔW ≈ A · B`, ahol `A` és `B` rangja `r ≪ d`).
- Csak ezt a két mátrixot tanítjuk — az új paraméterek az eredetinek tipikusan **< 1%-a**.
- A kimenet pár 10–100 MB-os **adapter-fájl**, nem új teljes modell.
- **Gyors tréning**, könnyű verziózás — több feladathoz több adapter ugyanahhoz a bázishoz.

A LoRA **nem "több tudást tölt"** a modellbe, hanem egy **szűk feladatra hangolja** (stílus, formátum, szókincs). Ezért a gyakorlatban **RAG + LoRA** tipikusan erősebb kombináció, mint bármelyik önmagában: a RAG hozza a friss ismeretet, a LoRA adja a szerepet / formátumot.

### QLoRA — LoRA még kisebb VRAM-mal

A **QLoRA** kombinálja a LoRA-t és a kvantálást: a **bázismodellt 4 bites kvantált formában** tartjuk (NF4 formátum), és **csak az adaptereket tanítjuk FP16-ban**. Kiegészítő trükkök: **dupla kvantálás** és **paged optimizer**.

Gyakorlati következmények:

- Egy **70B paraméteres modell** fogyasztói kártyán, **48 GB GPU**-n is fine-tune-olható.
- Minőségileg közel áll a teljes FP16 fine-tune-hoz.
- Könyvtárak: `bitsandbytes` + `peft` (HuggingFace PEFT).

Ökölszabály a három fine-tune minta között: **stílus / domén / formátum** ⟶ LoRA. **Nagyobb modell adaptálása kevés VRAM-mal** ⟶ QLoRA. **Teljesen új viselkedés / capability** ⟶ teljes fine-tune (ritka, drága).

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

## 6. LLM framework-ök — könyvtár-réteg az LLM fölött

Az előző szakaszban látott minták (RAG, tool use, agentic loop) újra és újra megjelennek. Elég sok a "ragasztókód" ahhoz, hogy **keretrendszereket** kezdett kitermelni az ökoszisztéma. 2026-ban a négy leggyakrabban látott:

| Framework | Nyelv | Erőssége | Kinek való |
|---|---|---|---|
| **LangChain** | Python, TS | Gyors prototípus, nagy ökoszisztéma (LangGraph, LangSmith), sok integráció | Kezdők, kutatók, gyors POC |
| **LlamaIndex** | Python | RAG-központú, kifinomult retrieval és indexelési stratégiák | Dokumentum-intenzív, tudásbázis-alapú pipeline |
| **Haystack** (deepset) | Python | Produkciós orientáltság, tipizált pipeline, NLP-gyökerek | Enterprise NLP, strukturált dokumentum-feldolgozás |
| **Semantic Kernel** | C#, Python, Java | .NET-integráció, plugin minta, Microsoft ökoszisztéma | Azure / .NET környezet |

**Trend 2025–2026 fordulóján:** a nagy modellszolgáltatók (OpenAI Agents SDK, Anthropic Claude Agent SDK, Google ADK) kiadták a **natív agent SDK-jaikat**. Ezek közelebb állnak a saját API-jukhoz, kevesebb absztrakcióval — ezzel a framework-ök piaca kettéoszlik: *"tanulni és prototipizálni"* vs. *"produkcióba vinni"*. Amit választasz, gyakran már nem technikai, hanem **csapatismereti** kérdés.

Gyakorlati tanács a hallgatónak: egy projektre **egy** framework-öt válassz, ne keverd. Ha szabványosabb protokollt szeretnél az eszközök felé, a választott framework-öd mellé rétegezd fel az MCP-t.

---

## 7. Prompt engineering 2026-ban

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

## 8. AI kódasszisztensek

Három generáció:

**1. Autocomplete (2021–2023)** — GitHub Copilot, Tabnine, Codeium. Sor- vagy blokk-szintű javaslat. Modellek: Codex, StarCoder, CodeLlama.

**2. Chat asszisztens (2023–2024)** — Copilot Chat, ChatGPT kód módban. Kontextusba emelt fájlok, kérdés-válasz.

**3. Agentic, feladat-szintű (2024–)** — **Cursor** (Composer), **Claude Code** (CLI, MCP-alapú), **Windsurf** (Cascade), **Devin**, **Copilot Workspace** (issue-ból PR). Ezek már nem sor-kiegészítést adnak, hanem *"oldd meg ezt a bug-ot"*, *"írd át ezt a modult"*, *"futtasd a teszteket és javítsd, ami elromlik"* szintű feladatokat visznek ciklusban.

Mit változtat ez a hallgatói munkában? Nem az "használtam AI-t vs. nem" a kérdés 2026-ban. A valós elvárás: *használd, de értsd meg, és dokumentáld, mit csináltál*. Ez érvényes a házi feladatokra is.

---

## 9. Lokális és nyílt súlyú LLM-ek

Miért futtatnánk saját gépen LLM-et? Adatvédelem, költség, latencia, szolgáltató-függetlenség, fine-tune szabadság. **A választás nem (csak) tech-, hanem adat- és jogkérdés:** minél érzékenyebb az input, annál jobbra tolódunk a telepítési mátrixon.

### 9.1 Inferencia motorok és futtatók

- **Ollama** — CLI + REST szerver (`ollama run llama3.2`). Legegyszerűbb belépő.
- **llama.cpp** — C++ inferencia motor, CPU és GPU, GGUF formátum.
- **LM Studio** — GUI, sok modellel.
- **vLLM** — szerver-oldali, nagy throughput, paged attention.
- **HuggingFace Transformers / TGI** — kutatás és produkció.

### 9.2 Kvantálás — miért és hogyan

Minden neurális háló súlyait (élsúlyait, amiket a tanítás hoz létre) valamilyen számformátumban tároljuk. A **kvantálás** ezt a paraméter-reprezentációt **kisebb bitmélységre** alakítja — FP16 helyett INT8-ra vagy 4 bites egészre. Cél: **memória és sebesség** javítása kontrollált pontosságvesztés árán.

#### Bitmélységek — mekkora egy 70B-os modell?

A memóriaigényt egyszerű becsülni: `memória ≈ N_paraméter × bit / 8`.

| Formátum | Bit | Byte / param | 70B modell | Jellemző |
|---|---|---|---|---|
| **FP32** | 32 | 4 B | 280 GB | Tréning alapformátum — GPU-n ritkán futtatjuk |
| **FP16 / BF16** | 16 | 2 B | 140 GB | Referencia inference, "eredeti" minőség |
| **INT8** | 8 | 1 B | 70 GB | 1–2% minőségromlás, produkciós szerver |
| **Q4** | 4 | 0.5 B | 35 GB | Tipikus edge / dev formátum, 2–5% minőségromlás |

Nagyobb modell **jobban tolerálja** a kisebb bitmélységet: a perplexitás növekedése arányaiban kisebb — ezért tud egy 70B-es Q4 jobban teljesíteni, mint egy 7B-es FP16, ha a VRAM megengedné mindkettőt.

#### Kvantálási sémák és formátumok

| Séma | Hol kvantál | Bit | Hardver / cél | Fájlformátum |
|---|---|---|---|---|
| **GPTQ** | Post-training, rétegenként, kalibrációs adattal | 4 | GPU inference | `.safetensors` |
| **AWQ** | Activation-aware weight quantization — a "fontos" súlyokat védi | 4 | GPU inference, gyakran jobb minőség mint GPTQ | `.safetensors` |
| **BitsAndBytes** (`bnb`) | On-the-fly, futás közben dekvantál | 4 / 8 | PyTorch / HuggingFace, NF4 változat QLoRA-hoz | — |
| **GGUF** (llama.cpp) | Off-line, blokk-szintű skálázás ("K-quants") | 2–8 | CPU **és** GPU, egyetlen fájl metaadattal | `.gguf` |

A GGUF elnevezései: `Q2_K`, `Q3_K`, `Q4_K_M`, `Q5_K_M`, `Q6_K`, `Q8_0`. A `_M` jelentése **mixed** — a fontos rétegek nagyobb bitmélységet kapnak. **Ajánlott alap: `Q4_K_M`** — ez a "jó ár-érték arány".

#### Hardverigény — gyors tábla

| Modellméret | FP16 | Q8 | Q4_K_M | Jellemzően futtatható |
|---|---|---|---|---|
| **1B** (Llama 3.2-1B) | 2 GB | 1 GB | 0.7 GB | Telefon, Raspberry Pi |
| **3B** (Phi-3 mini) | 6 GB | 3 GB | 2 GB | CPU-n elfogadhatóan |
| **7B** (Llama 3.1-8B) | 16 GB | 8 GB | 4.5 GB | 8 GB-os GPU |
| **13B** | 26 GB | 13 GB | 7.5 GB | 16 GB-os GPU |
| **70B** (Llama 3.1-70B) | 140 GB | 70 GB | 40 GB | 2× A100 / Mac Studio 128 GB |
| **405B** (Llama 3.1-405B) | 810 GB | 405 GB | 230 GB | Több GPU-s szerver |

**Ökölszabály**: 1 milliárd paraméter ≈ **0.5–1 GB VRAM** Q4-en. Ehhez jön a **KV-cache** a kontextusablakhoz (nagyobb ablak ⟶ nagyobb cache, jellemzően 1–2 GB). Mindig hagyj **~20% fejtérnek** a GPU-n, különben OOM.

#### Mit válasszak a három szituációra?

- **Laptop / otthoni gép** ⟶ **GGUF + llama.cpp** (vagy Ollama, ami ennek csomagolt kliense).
- **Szerver GPU, több párhuzamos kérés** ⟶ **AWQ / GPTQ + vLLM**.
- **Fine-tuning / adaptáció kevés VRAM-mal** ⟶ **bitsandbytes + QLoRA**.

### 9.3 Telepítési minták

Három tipikus deployment pattern, amivel hallgatóként és mérnökként találkozni fogsz:

| Minta | Ki? | Tipikus stack | Modell |
|---|---|---|---|
| **Dev laptop** | 1 fejlesztő, kísérletezés | Ollama vagy LM Studio, integrált vagy 1 dGPU (8–24 GB VRAM), lokálhoszt port 11434 | 3–14B, Q4–Q8 |
| **Csapatszerver** | Több fejlesztő, megosztott inferencia | vLLM vagy TGI szerver, reverse proxy (nginx/traefik) + auth token, 1–2× 24–48 GB GPU | 14–70B, Q4 |
| **Air-gapped / enterprise** | Zárt hálózat, audit-követelmény | Docker + GPU passthrough, saját modell-registry (MinIO/Artifactory), hash-ellenőrzött súlyok, prompt + output log retenciós szabállyal | EU AI Act / GDPR / pénzügyi szabályozás világa |

Dev laptop **előnye**: gyors, privát. **Korlátja**: nincs több egyidejű kérés, nincs robusztus failover. Csapatszerveren a *paged attention* révén a vLLM nagyobb throughput-ot tud kihozni. Air-gapped környezetben a **modell-súly mint artifact** kezelése (verziózás, integritás-ellenőrzés) ugyanolyan fontos, mint a kód.

### 9.4 Mit futtassak helyben 2026-ban?

Egy 24 GB-os dGPU (pl. RTX 4090 vagy A5000) a jelenlegi "édes pont" — ezen elfér:

| Modell | Paraméter | Q4 VRAM | Célfeladat |
|---|---|---|---|
| Gemma 3 4B | 4 B | ~3 GB | Laptop, edge — gyors asszisztens |
| Phi-4 | 14 B | ~8 GB | Kompakt chat, erős okoskodás a súlyához képest |
| Llama 3.2 8B | 8 B | ~5 GB | Általános chat, baseline |
| Qwen 2.5 Coder 7B | 7 B | ~5 GB | Kód-autocomplete, IDE-integráció |
| DeepSeek-R1 distill 14B | 14 B | ~9 GB | Reasoning — matek, logika, kód (lassabb) |
| Qwen 2.5 72B | 72 B | ~42 GB | Erős chat — 2× 24 GB GPU (Q4) |
| Llama 3.3 70B | 70 B | ~40 GB | Enterprise — 1× H100 vagy 2× A6000 |

**Pedagógiai tipp:** ne a legnagyobb modellel kezdj. Futtasd először a Gemma 3 4B-t Ollamán, nézd meg, hogy mire elég. A legtöbb kódasszisztens-jellegű feladatot egy 7–14B-os modell *meglepően* jól old meg, ha a promptot rendesen megírod.

---

## 10. Kódpéldák

### 10.1 OpenAI chat completion — Python

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

### 10.2 Strukturált kimenet Pydantic-kal

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

### 10.3 HuggingFace Transformers — lokális szentiment analízis

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

### 10.4 Ollama REST API — lokális LLM Rustban

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

### 10.5 Tool use — egyszerű function calling

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

### 10.6 GitHub Action — LLM-es kódreview PR-re

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

## 11. Értékelés és benchmarkok

Amit egy MOSZE-hallgatónak tudnia kell a modellek összehasonlításáról:

- **HumanEval** (OpenAI, 2021) — 164 Python feladat, unit teszttel.
- **MBPP** — Mostly Basic Python Problems, 974 feladat.
- **SWE-Bench** — 2294 valós GitHub issue 12 nagy Python repoból; *megoldható-e PR-rel*.
- **LiveCodeBench** — időhöz kötött, szivárgás-ellenálló kód benchmark.
- **MMLU / GPQA** — általános, illetve PhD-szintű tudás.
- **TruthfulQA** — hallucinációs mérőszám.

---

## 12. Biztonság, etika, szabályozás

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

## 13. Híd a 12. előadásba — MLOps / LLMOps

A mai óra **egyetlen LLM-ről** szólt: hogyan működik, hogyan hívjuk meg, hogyan kódolunk vele. Amit ma építettünk (LLM hívás, RAG, prompt minták, tool use, lokális futtatás) — azt a 12. órán **üzemeltetni** fogjuk. Kérdések, amiket a következő óra körbejár:

- Hogyan tesztelünk egy LLM-alapú alkalmazást, ha a válasz **nem determinisztikus**?
- Milyen **teszt-rétegek** kellenek: prompt-regression, golden-output, guardrail, éles monitoring?
- **Observability** eszközök: LangSmith, Phoenix (Arize), Helicone, Langfuse — mit naplóznak, mit értékelnek?
- **Eval-keretrendszerek**: Ragas (RAG minőség), DeepEval, promptfoo — hogyan mérnek hallucinációt és driftet?
- Mi történik, ha a modell új verziója jobb benchmarkon, de rosszabb a mi feladatunkra? (*Model drift*)
- Hogyan illeszkedik a **CI/CD** az ML modell életciklusába? (Modell mint artifact, *canary / shadow deploy*)
- Hogyan tartunk auditálható tanítóadat- és modell-katasztert? (*Data lineage*, MLflow, DVC)

---

## 14. Gyakorló kérdések

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

## 15. Irodalom, linkek

### Alap

- Vaswani et al. (2017): *Attention Is All You Need* — <https://arxiv.org/abs/1706.03762>
- Jay Alammar: *The Illustrated Transformer* — <https://jalammar.github.io/illustrated-transformer/>
- Prompt Engineering Guide — <https://www.promptingguide.ai/>
- OpenAI API dokumentáció — <https://platform.openai.com/docs/>

### Tool use, agent, MCP

- Model Context Protocol — <https://modelcontextprotocol.io/>
- OpenAI function calling — <https://platform.openai.com/docs/guides/function-calling>
- ReAct paper — <https://arxiv.org/abs/2210.03629>

### Framework-ök

- LangChain — <https://python.langchain.com/>
- LlamaIndex — <https://docs.llamaindex.ai/>
- Haystack (deepset) — <https://haystack.deepset.ai/>
- Semantic Kernel — <https://learn.microsoft.com/en-us/semantic-kernel/>
- OpenAI Agents SDK — <https://platform.openai.com/docs/guides/agents>
- Anthropic Claude Agent SDK — <https://docs.anthropic.com/>

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
