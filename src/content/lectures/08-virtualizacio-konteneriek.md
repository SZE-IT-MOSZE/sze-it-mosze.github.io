---
title: "Modern szoftverfejlesztési eszközök 8. – Virtualizáció és konténerek (Docker, Compose, Kubernetes)"
order: 8
date: "8. hét"
slug: "mosze-08-virtualizacio-konteneriek"
summary: "Virtualizációs szintek az ISA-tól az alkalmazás-virtuális gépig, Docker és Compose alapok, Podman/OCI, multi-stage és distroless image-ek, devcontainerek, CNCF ökoszisztéma, Kubernetes áttekintés, konténer-megfigyelhetőség és WebAssembly kitekintés."
tags:
  - virtualization
  - docker
  - docker-compose
  - podman
  - oci
  - kubernetes
  - devcontainer
  - multi-stage
  - distroless
  - prometheus
  - grafana
  - webassembly
  - wasm
  - wasi
---

# Modern szoftverfejlesztési eszközök 8.

## Virtualizáció és konténerek — Docker, Compose, Kubernetes

## Leírás

Ez a lecke arról szól, hogyan tesszük egy szoftver **futtatási környezetét** ugyanolyan hordozhatóvá és ismételhetővé, mint amilyen maga a forráskód. A "nálam fut" probléma ugyanaz a szoftvermérnöki szégyenfolt, amit a [6. előadás](/lectures/mosze-06-cicd/) a buildoldalon kezelt: akkor a build-artefaktum volt az egység, most a **futtatható környezet** az.

Két utat járunk be egymás mellett: a klasszikus **virtualizációs** rétegeket (ISA, HAL, OS, könyvtár, alkalmazás szint), és a modern **OS-szintű virtualizációt** — Docker, Podman, OCI. A végén rövid kitekintéssel a **Kubernetes**-re és a **WebAssembly**-re, amelyek a konténerek következő két iránya.

## Tanulási célok

A lecke végére a hallgató:

- el tudja különíteni az emuláció és a virtualizáció fogalmát, és meg tudja nevezni a virtualizáció öt szintjét,
- érti, hogy a Docker miért OS-szintű virtualizáció, és mit nyerünk vele a teljes VM-hez képest,
- ismeri a Docker ökoszisztéma fő komponenseit (daemon, CLI, image, container, registry, volume, network),
- tud írni egy minimális `Dockerfile`-t, és ismer egy `multi-stage` példát,
- tud egy Compose stacket definiálni több service-szel, healthcheck-kel, named volume-mal és környezeti változókkal,
- ismeri az OCI szabvány és a Podman szerepét,
- tud érvelni a `distroless` image és a `devcontainer` minta mellett,
- átlátja a Kubernetes alapfogalmait (pod, service, deployment) és a managed / serverless konténerszolgáltatásokat,
- tudja, mit jelent a konténerek **megfigyelhetősége** (metrics, logs, traces), és milyen eszközökkel valósítható meg,
- ismeri a WebAssembly (WASM/WASI) helyét a konténeres jövőképben.

## Előismeretek

A lecke feltételezi a következő fogalmak alapszintű ismeretét:

- operációs rendszer alapok (process, fájlrendszer, felhasználó, jog),
- Linux kernel fogalma, parancssor,
- YAML és JSON olvasási szint,
- hálózat alapok (IP, port, DNS),
- verziókezelés Git-tel, CI/CD alapjai.

---

## 1. Emuláció és virtualizáció — alapfogalmak

A szoftvert **minél több platformon** szeretnénk futtatni. A lefordított állomány más gépen, más OS-en nem biztos, hogy fut; a célkörnyezet gyakran különbözik a fejlesztőétől. Klasszikus "nálam fut" — és ilyenkor a fejlesztő legtöbben kardhoz nyúlnának.

Két irány áll rendelkezésre:

- **Keresztfordítás**: a céleszköz utasításkészletére fordítunk.
- **Virtualizáció**: a rendszer egy részkomponensét *köztes rétegként* reprodukáljuk a szoftver számára — a komponens "mockolása" a futtatókörnyezet szintjén.

### Nomenklatúra

- **Emulálás** — egy meglévő rendszer *viselkedésének* reprodukálása egy adott hardveres-szoftveres környezetben. Példa: DosBox, QEMU, játékkonzol-emulátorok. Tipikus felhasználás: keresztfordítás, keresztplatformos tesztelés.
- **Virtualizálás** — egy *egység* absztrahálása és reprodukálása. Példa: Linux futtatása Windowson belül (VMware, Hyper-V, WSL, Xen, Docker).
- **Gazda (host)** — a környezet, amelyben a célpéldányt üzemeltetjük.
  - **Hypervisor** — a példányokat létrehozó és kezelő egység.
- **Vendég (guest)** — a gazdában futtatott célkörnyezet.
- **Migráció** — a célpéldány költöztetése egyik környezetből egy másikba.

### Emuláció vs. virtualizáció — mit reprodukálunk?

| Szempont | Emuláció | Virtualizáció |
|---|---|---|
| Mit reprodukál | A teljes rendszert (CPU, memória, HDD) | Csak bizonyos részelemeket, a többit a gazdarendszer adja |
| Teljesítmény | Jelentős overhead | Közel natív (különösen HW-támogatással) |
| Tipikus eszközök | QEMU, DosBox, konzol-emulátorok | VMware, Hyper-V, KVM, Xen, Docker |

A modern processzorok **hardveres virtualizációs támogatással** (Intel VT-x, AMD-V) gyakorlatilag natív sebességre gyorsítják a virtualizációt — ez tette szélesebb körben elterjedtté.

---

## 2. A virtualizáció öt szintje

A virtualizációt azon különböztetjük meg, **hol húzódik a gazda–vendég határ**:

| Szint | Mit absztrahál | Példa |
|---|---|---|
| **ISA-szint** (Instruction Set Architecture) | A processzor utasításkészlete — más architektúra emulálható | QEMU |
| **HAL-szint** (Hardware Abstraction Layer) | A teljes hardver, OS-ek példányosíthatók fölötte | VMware, Hyper-V, KVM, Xen |
| **OS-szint** | A fájlrendszer és felhasználói tér — egy kernelen több izolált környezet | **Docker**, LXC, chroot |
| **Könyvtárszint** (API-level) | Felhasználói könyvtárak API-ja | WINE (Windows API Linuxon) |
| **Alkalmazás-szintű** | Bájtkód-szintű virtuális gép | JVM, .NET CLR |

Minél feljebb vagyunk a listán, annál **kevesebb** hardvert reprodukálunk, és annál **kisebb** az overhead. A Docker az OS-szinten dolgozik — a kernelt megosztja, csak a felhasználói teret izolálja.

---

## 3. Kitérő: a felhőhöz és a szolgáltatási modellekhez

A felhőszolgáltatások alapja a virtualizáció: több gép összekapcsolása **egységes erőforrás-poolként**. Három tipizálás párhuzamosan él:

**Tulajdonlás szerint**: privát (egy szervezet kizárólagosan), publikus (külső szereplők által lefoglalható) és hibrid (vegyes). **A hozzáférés-korlátozás nem azonos a privát felhő fogalmával!** Egy publikus felhő is lehet titkosított és erős ACL-lel védett — a különbség az üzemeltetés tulajdonjogában van.

**Szolgáltatási réteg szerint**:

| Modell | Mit kapunk | Példa |
|---|---|---|
| **IaaS** — Infrastructure as a Service | VM-ek, hálózat, tárolás | AWS EC2, Azure VM, OpenStack |
| **PaaS** — Platform as a Service | Futtatókörnyezet (OS + runtime) | Azure App Service, Google App Engine |
| **SaaS** — Software as a Service | Kész alkalmazás | Gmail, Teams, Webmail |

A **példányosítás** a felhőn gyakorlatilag egy új VM létrehozása (vagy egy futó gépre munkaterhelés telepítése). Saját privát felhőt nyílt forráskódú eszközökkel is lehet építeni — a legismertebb az [OpenStack](https://www.openstack.org/).

---

## 4. OS-szintű virtualizáció — a konténer

**Alapötlet**: egymástól izolált **felhasználói környezetek** ugyanazt a kernelt használják. Az erőforrások minden környezet számára láthatók (hálózat, perifériák), de a könyvtárak, környezeti változók és folyamatok eltérők.

**Előnye**: hatékony erőforrás-használat, kisebb terhelés, mint az emulációnál vagy az ISA-virtualizációnál. A **konténer** egy ilyen izolált környezet *példánya*.

### Miért volt rá igény?

Sokszor csak a szoftverre és a közvetlen környezetére van szükségünk — nem indokolt egy teljes OS telepítése. A konténer **egy jól körülhatárolt funkciót** valósít meg (webszolgáltatás, karakterfelismerő, migrációs batch), és *teljesen hordozható*: csak a konténert kell átvinni.

### Linux kernel sajátosságai

A Linux-kernel **monolitikus, multitasking, moduláris** felépítésű, és már jóval a Docker előtt megengedte különálló felhasználói terek futtatását:

- **chroot** (1979) — felhasználói területek váltása (beágyazott rendszerek, keresztfordítás, honeypot).
- **LXC** (Linux Containers, 2013 óta a kernel része) — teljes konténer-izoláció namespace-ekkel és cgroup-okkal.

A Docker ezt a kernel-szintű képességet csomagolta fejlesztőbarát API-ba.

---

## 5. Docker — az OS-szintű virtualizáció gyakorlatban

**Docker** — OS-szintű virtualizációs platform, Go-ban implementálva, open-source (`github.com/moby/moby`). Cél: egymástól teljesen izolált felhasználói terek létrehozása úgy, hogy az erőforrások változatlanok maradjanak, és az OS-kernelhez továbbra is hozzáférünk.

### Miért kiváló fejlesztésre?

- Különböző verziók párhuzamos kezelése ugyanazon a gazdán.
- Különböző konfigurációk, fájlrendszerek használata.
- Könnyű verifikáció, futtatás és reprodukálás.

### Virtualizáció vs. Docker — a különbség

| Szempont | Teljes VM | Docker konténer |
|---|---|---|
| Mit emulál | Teljes hardver + OS | Csak a felhasználói teret |
| Kernel | Saját vendég-kernel | Megosztott a gazdával |
| Indulási idő | Percek | Másodpercek |
| Méret | GB-os nagyságrend | MB-os nagyságrend |
| Izoláció | Erős | Gyengébb — namespace + cgroup |

### Docker komponensek

- **Docker daemon** (`dockerd`, más néven *Docker Engine*) — perzisztens háttérszolgáltatás, a konténerek életciklusát kezeli.
- **Docker CLI** — felhasználói program a daemon vezérlésére.
- **Image (képfájl)** — csak olvasható sablon, amiből konténerek példányosíthatók. A leírása a `Dockerfile`.
- **Container (konténer)** — az image egy futó példánya; ide lehet belépni, parancsot futtatni, fájlt másolni.
- **Service** — konténerek skálázásának absztrakciója.
- **Registry** — image-ek tárhelye (lokális vagy távoli, pl. Docker Hub, GHCR, ECR).

### Fontosabb Docker CLI parancsok

| Parancs | Mit csinál |
|---|---|
| `docker pull` | image letöltése registryből |
| `docker run` | konténer indítása egy image-ből |
| `docker ps` | futó konténerek listázása |
| `docker stop` / `kill` | konténer kérelmezett / azonnali leállítása |
| `docker exec` | parancs futtatása futó konténerben |
| `docker images` | lokális image-ek listázása |
| `docker build` | Dockerfile-ból image készítése |
| `docker commit` | futó konténer állapotának új image-ként mentése |
| `docker tag` | image átcímkézése |

---

## 6. Dockerfile — az image leírása kódban

A `Dockerfile` egy **szöveges recept** az image felépítéséhez: réteges (layer-alapú), deklaratív, és minden sor egy új immutable réteget eredményez.

### Minimális példa

```dockerfile
# syntax=docker/dockerfile:1
FROM ubuntu:22.04               # szülő image — ebből indulunk
COPY . /app                     # másolás a gazdáról a képfájlba
RUN make /app                   # parancs futtatása build közben (új réteg)
CMD python /app/app.py          # alapértelmezett indító parancs
```

Fontosabb direktívák:

- `FROM` — alap image (egy minimális Debian/Ubuntu/Alpine, vagy egy alkalmazás-specifikus).
- `COPY` / `ADD` — fájlok bemásolása a gazdából.
- `RUN` — shell parancs futtatása build időben (új réteget hoz létre).
- `CMD` / `ENTRYPOINT` — amit a konténer indulásakor futtat.
- `ENV` — környezeti változó beállítása.
- `ARG` — build-argumentum (build időben).
- `WORKDIR` — munkakönyvtár a következő parancsokhoz.
- `USER` — melyik felhasználóként fut a konténer.
- `EXPOSE` — dokumentálja, melyik porton hallgat (nem publikálja önmagában).

### Layer gyorstár

Minden `RUN` / `COPY` / `ADD` új réteget generál. Ha egy réteg nem változik, a Docker a build-cache-ből veszi — ezért érdemes a **ritkán változó** részt (pl. `apt install`) előre tenni, a **gyakran változó** részt (saját forráskód) a végére.

---

## 7. Perzisztencia — volumes

A konténer önmagában **nem tárol semmit perzisztensen**: ha törlődik, az adatbázisa, logjai mind eltűnnek. Ezt **volume-ok** oldják meg — mount pointok, amiket indításkor a `-v` kapcsolóval adunk meg.

Három típus:

- **Bind mount** — gazdarendszer egy könyvtárát "becsatoljuk" a konténerbe. *Fejlesztéshez ideális* (live reload forráskódra).
- **Named volume** — Docker kezelte, névvel hivatkozott adatverem. *Produkcióban adatbázishoz*.
- **tmpfs** — csak memóriában él, újraindítás után üres.

Tipikus példa:

```bash
docker run -v ./config:/etc/app:ro \
           -v app_data:/var/lib/app \
           myapp:1.0
```

---

## 8. Docker hálózatok

A konténerek között a Docker belső **virtuális hálózatot** épít — IP-szintű kommunikáció és névtér-leképzés egyszerre. Öt hálózattípus:

| Típus | Jellemző | Megjegyzés |
|---|---|---|
| **Bridge** (alapértelmezett) | Izolált virtuális hálózat, konténernév alapú DNS névfeloldás (user-defined bridge-en) | A leggyakoribb |
| **Host** | A konténer közvetlenül a gazda hálózatát használja | Nincs port mapping — nincs izoláció sem. Csak Linuxon natív |
| **None** | Teljesen izolált, hálózat nélkül | Biztonsági sandbox |
| **Overlay** | Több Docker engine / Swarm node között, VXLAN-alapú beágyazás | Kubernetes / Swarm multi-host |
| **Macvlan** | Konténer saját MAC-címmel, közvetlen L2 hozzáférés | Legacy alkalmazás, broadcast |

A portok **publikálása** explicit a `-p host:container` kapcsolóval — enélkül a szolgáltatás nem érhető el kívülről.

---

## 9. Docker Compose — több konténer együtt

**Probléma**: a legtöbb valós alkalmazás **több konténerből** áll — webszerver, adatbázis, cache, üzenetsor. Ezeket kézzel `docker run`-olni hibára hajlamos és ismétlős.

**Megoldás**: a **Docker Compose** egyetlen YAML fájlban írja le a teljes stack-et, és egy paranccsal el is indítja.

Két verzió él egymás mellett:

- `docker-compose` (v1) — Python-alapú, önálló bináris, *deprecated*.
- `docker compose` (v2) — Go-alapú CLI plugin, **ez az aktuális**.

### A `compose.yaml` felépítése

```yaml
services:        # az alkalmazás konténerei — ez a kötelező
networks:        # egyedi hálózatok (opcionális)
volumes:         # named volume-ok (opcionális)
configs:         # konfigurációk (opcionális)
secrets:         # titkok (opcionális)
```

Fájlnév: **`compose.yaml`** (új szabvány) vagy `docker-compose.yml`. A YAML érzékeny az indentációra — **mindig 2 szóköz, soha tab**.

### Minimális példa — Flask + Redis

```yaml
services:
  web:
    build: .
    ports:
      - "5000:5000"
    environment:
      - REDIS_HOST=redis
    depends_on:
      - redis
  redis:
    image: redis:7-alpine
```

A Compose automatikusan létrehoz egy bridge hálózatot, és a `redis` hostnév elérhetővé válik a `web` konténerből.

### Teljes három-rétegű példa (nginx + app + postgres)

```yaml
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80"]
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro

  app:
    build: .
    environment:
      DATABASE_URL: postgres://user:${DB_PASSWORD}@db/mydb
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  db_data:
```

### Indítási sorrend — `depends_on` és `healthcheck`

A `depends_on` alapból **csak** az indítási sorrendet garantálja, nem azt, hogy a szolgáltatás már **fogad-e kapcsolatokat**. A valódi készenlétet a `healthcheck` kombinálva a `condition: service_healthy` opcióval adja.

Elfogadott `condition` értékek: `service_started` (alapértelmezett), `service_healthy`, `service_completed_successfully` (migrációs konténerhez hasznos).

### Környezeti változók és titkok

**Soha ne tároljunk jelszavakat plaintextben a `compose.yaml`-ban.** Három bevált minta:

1. **`.env` fájl** — Compose automatikusan betölti, `${VAR}` referenciával hivatkozzuk. `.gitignore`-ba kerül!
2. **`env_file` direktíva** — külön fájlból tölti.
3. **Docker secrets** — titkosított titkok (Compose v2.4+ vagy Swarm).

### Compose override és profilok

- `compose.override.yaml` — automatikusan merge-elődik, fejlesztői kiegészítéseket (live reload, debug env) tartalmaz.
- Explicit fájlok: `docker compose -f compose.yaml -f compose.prod.yaml up`.
- `profiles: ["debug"]` — csak `--profile debug` kapcsolóval indul (pl. `adminer`, `mailhog`).

### Compose CI/CD-ben

A Compose ideális integrációs tesztelésre — ugyanaz a stack fut a fejlesztőgépen és a CI-ben:

```yaml
- name: Start services
  run: docker compose up -d
- name: Wait for healthy
  run: docker compose wait db
- name: Run tests
  run: docker compose run --rm app pytest
- name: Teardown
  run: docker compose down -v
```

### Compose best practices

- `compose.yaml` a fájlnév, nem `docker-compose.yml`.
- Titok soha nincs a Compose fájlban — `.env` vagy `secrets`.
- Minden adatbázishoz tartozzon `healthcheck`, és minden felső réteg `depends_on`-ja feltételezze a `service_healthy`-t.
- Adatbázishoz, feltöltésekhez **named volume**; forráskódhoz, konfighoz **bind mount**.
- Hálózat szegmentálás (`frontend` / `backend` szeparáció): a DB ne legyen elérhető a reverse proxy hálózatából.
- **Soha ne használj `latest` tag-et** — mindig konkrét verzió (`postgres:16.2`).
- A `compose.yaml` mellé `README.md` a stack leírásával.

---

## 10. Podman és az OCI szabvány

### Miért Podman?

A Docker egyetlen **daemon folyamatra** (`dockerd`) épül, ami *root jogokkal* fut — minden konténer ezen keresztül indul. Ez biztonsági kockázat: egy daemon-kompromittáció az egész host-on root-ot ad.

**Podman** — daemon nélküli, rootless konténer-manager. A Red Hat / RHEL ökoszisztéma preferált eszköze, **OCI-kompatibilis** (ugyanaz az image-formátum).

- **Drop-in replacement**: `alias docker=podman`, kompatibilis parancsok (`podman run`, `podman build`, `podman ps`).
- **Podman Compose** — a `docker-compose` helyett.
- **`podman play kube`** — Kubernetes YAML futtatása lokálisan.
- **Systemd integráció** — konténerek mint systemd service-ek (`podman generate systemd`).

### Az OCI szabvány

**Motiváció**: a Docker monopolhelyzetének elkerülése és iparági szabványosítás. Alapítók (2015): Docker, CoreOS, Google, Microsoft, Red Hat. Fenntartó: Linux Foundation.

Három fő specifikáció:

- **Image Spec** — az image-rétegek és a manifest formátuma.
- **Runtime Spec** (`runc`) — a konténer-futtató alacsony szintű API-ja.
- **Distribution Spec** — a registry push/pull protokoll.

OCI-kompatibilis eszközök: **Docker, Podman, containerd, CRI-O, Buildah**, `skopeo` (image másolás), `umoci` (image manipuláció).

**Miért fontos ez?** Egy OCI image **bárhol** fut, nem csak Dockerben. A Kubernetes is OCI runtime-ot vár, nem Docker-specifikusat.

---

## 11. Docker a gyakorlatban — gyakori buktatók

- A Docker alapvetően **egyszálú alkalmazásokra** koncentrál. Webszerverként NGINX ajánlott (eseményvezérelt, egyszálú), nem Apache. Többszálú futtatáshoz `supervisor` vagy Compose.
- Konténereket és image-eket **nevezzük el** — különben minden futáskor új példány jön létre, és gyorsan elfogy a disk.
- Konfigurációt és erőforrásokat **volume-al** csatoljuk — GPG kulcsok, tanúsítványok soha ne legyenek az image-ben.
- Portokat expliciten `-p`-vel kell megnyitni kifelé.

### Konténer-biztonság

A konténerek **nem adnak teljes izolációt** alapból. Fontosabb védvonalak:

- **Image scanning** — CVE-k detektálása (Trivy, Snyk, Grype, Docker Scout).
- **Rootless konténer** — Docker `--user` flag, `USER` direktíva; Podman natívan rootless.
- **Linux kernel biztonsági modulok**:
  - **Seccomp** — rendszerhívások szűrése.
  - **AppArmor / SELinux** — kötelező hozzáférés-szabályozás.
  - *Least privilege*: `--cap-drop ALL`, `--read-only`.
- **Image provenance** — aláírt image-ek (Docker Content Trust, Sigstore / Cosign).
- **Titkok kezelése** — semmi jelszó, kulcs a Dockerfile-ban; külső secret manager.

---

## 12. Multi-stage build és distroless image

### Multi-stage build

**Probléma**: a fordítókörnyezet (`gcc`, `cargo`, `javac`) nem kell a futtatáshoz, csak duzzasztja és támadhatóvá teszi az image-et.

**Megoldás**: több `FROM` egy Dockerfile-ban, és csak a szükséges bináris kerül át a végső stage-be.

```dockerfile
# --- build stage ---
FROM rust:1.75 AS builder
WORKDIR /app
COPY . .
RUN cargo build --release

# --- runtime stage ---
FROM debian:bookworm-slim
COPY --from=builder /app/target/release/myapp /usr/local/bin/myapp
CMD ["myapp"]
```

Best practice: `--mount=type=cache` a Cargo / npm gyorsítótár megtartásához a build között.

### Distroless image-ek

A tipikus alap OS image (Ubuntu, Debian) rengeteg **felesleges csomagot** tartalmaz: shell, package manager, libc utilok. Ezek a **támadási felületet** növelik.

**Distroless** (Google) — csak az alkalmazás futtatásához minimálisan szükséges fájlok. Nincs shell, nincs package manager, rootként nem lehet belépni.

Változatok: `gcr.io/distroless/static`, `/base`, `/java`, `/python3`, `/nodejs`.

**Alternatívák kisméretű image-re**:

- **Alpine Linux** — ~5 MB, `musl libc` alapú, széles körben elterjedt.
- **Scratch** — teljesen üres image; csak statikusan linkelt binárisokhoz (Go, Rust).
- **Chainguard Images** — folyamatosan frissített, CVE-mentes distroless image-ek.

**Méretbeli nagyságrend** (statikusan linkelt Rust bináris):

| Alap | Méret |
|---|---|
| `ubuntu:22.04` | ~70 MB |
| `debian:bookworm-slim` | ~30 MB |
| `alpine` | ~5 MB + alk. |
| `gcr.io/distroless/static` | ~2 MB + alk. |

---

## 13. Devcontainerek — a fejlesztői környezet konténerben

**Probléma**: a fejlesztői környezet is "nálam fut" jellegű lehet — különböző gépeken más a toolchain, a linter, a formatter, a nyelvi verzió.

**Megoldás**: a teljes fejlesztőkörnyezet kódban definiálva, egy `.devcontainer/` mappában:

```json
{
  "name": "Rust project",
  "image": "mcr.microsoft.com/devcontainers/rust:1.75",
  "customizations": {
    "vscode": {
      "extensions": ["rust-lang.rust-analyzer", "vadimcn.vscode-lldb"]
    }
  },
  "forwardPorts": [8080]
}
```

Kliensek:

- **VS Code Remote — Containers** — közvetlen fejlesztés a konténerben.
- **GitHub Codespaces** — felhős Dev Container böngészőből.
- **JetBrains Gateway** — IntelliJ / CLion / RustRover Dev Container támogatás.

**Előnyök**:

- Új csapattag: `git clone` + *Reopen in Container* = kész.
- Mindenkinél azonos toolchain, linter, formatter verzió.
- CI/CD és lokális fejlesztés ugyanazt az image-et használhatja.

Specifikáció: [containers.dev](https://containers.dev) — nyílt szabvány.

---

## 14. Cloud Native Computing Foundation (CNCF)

A **CNCF**-et a Linux Foundation hozta létre 2015-ben a konténertechnológiák fejlesztésére és terjesztésére. Nyílt technológiákat és szabványokat gondoz a cluster-menedzsment és a cloud-native alkalmazások területén.

Fontosabb CNCF-projektek, amikkel a lecke során találkoztunk vagy fogunk:

- **containerd** — konténer futtatási környezet (a Docker is ezt használja a motorháztető alatt).
- **gRPC** — Remote Procedure Call konténerek között.
- **CRI-O** — Kubernetes-natív futtató.
- **CoreDNS** — DNS szerver konténerek között, névtér-leképzés.
- **Prometheus**, **Jaeger**, **OpenTelemetry** (lásd a megfigyelhetőségi szakaszt).

---

## 15. GPU-virtualizáció — a sötét folt

CPU-t aránylag könnyű emulálni vagy virtualizálni, mert az ISA ismert és jól dokumentált. A **GPU** ezzel szemben sokáig gyenge pont volt:

- **Gyártói nézeteltérések** (NVIDIA vs. AMD).
- **Architektúra-beli különbség** — CPU: ~16 mag; GPU: ezer fölötti ALU-mag, vektor-architektúra.
- A játékipar később vette fel a fonalat, nem ez volt a fő fókusz.

A gépi tanulás robbanása igényli a GPU-erőforrások virtualizálását:

- **NVIDIA vGPU** — egy fizikai GPU időosztásos megosztása több VM között.
- **NVIDIA Container Toolkit** (`--gpus all`) — Docker számára GPU passthrough.
- Alapfeltétel: megfelelő *hardver* jelenléte a gazdán.

---

## 16. Kitekintő — Kubernetes alapok

A **Kubernetes** (rövidítve K8s, inspiráció: *Star Trek Borg*, valamint a Google belső **Borg** rendszere) a konténerek **telepítésének és felügyeletének** automatizálásáért felel. Együttműködik `containerd`-vel, CRI-O-val, és OCI-runtime-ot vár.

### Architektúra főbb egységei

- **Master (control plane)** — a fő vezérlő.
- **Node** — számítási egység, futtat egy **kubelet**-et, ami felügyel.
- **Pod** — egy vagy több szorosan összetartozó konténer egy node-on, közös hálózat és storage.
- **Service** — pod-ok halmaza egy funkcióhoz, stabil hálózati végponttal.
- **Workload / ReplicaSet / Deployment** — pod-ok halmaza.
- **Volume** — csatolható tárhely.

Kliens API-k: C, .NET, Java, Python, Ruby.

### Deklaratív modell

A Kubernetes alapvetően **deklaratív**: leírjuk a *kívánt állapotot*, nem a *folyamatot*. A `kubectl apply -f deployment.yaml` parancs beküldi, a controller pedig addig konvergál, amíg el nem éri.

**Deployment** — pod-replikák kezelése és frissítése:

- `spec.replicas` — kívánt példányszám.
- `spec.strategy` — `RollingUpdate` vagy `Recreate`.
- `spec.template` — a pod sablonja (image, portok, erőforráskorlátok).

**Service** — stabil hálózati végpont a pod-ok elé:

- **ClusterIP** — csak clusteren belül (alapértelmezett).
- **NodePort** — node-porton kívülről is elérhető.
- **LoadBalancer** — felhőszolgáltató load balancer (AWS ELB, Azure LB).

Alapparancsok: `kubectl apply`, `kubectl get pods`, `kubectl describe`, `kubectl logs`, `kubectl exec`.

**Helm** — Kubernetes package manager; egy *chart* = paraméterezhető deployment sablon.

---

## 17. Konténer-megfigyelhetőség (observability)

A produkciós rendszer csak akkor megbízható, ha **látjuk, mi történik benne**. Ez a "nálam fut" probléma runtime-megfelelője: ha baj van, egyetlen kérés **több szolgáltatáson, hálózaton, adatbázison** halad át, és a hiba oka nem triviálisan lokalizálható.

### A megfigyelhetőség három pillére

- **Metrics** — aggregált numerikus adatok az idő függvényében (CPU, memória, req/s).
- **Logs** — diszkrét, időbélyegzett események (strukturált, lehetőleg JSON).
- **Traces** — egyetlen kérés teljes útja a service-eken keresztül; a **distributed tracing** koncepciója.

### Eszközök

| Pillér | Eszközök |
|---|---|
| Metrics | **Prometheus** (scrape-alapú idősoros DB) + **Grafana** (dashboard) + **cAdvisor** (konténer-szintű metrikák) |
| Logs | `docker logs`, **Loki** (Grafana ökoszisztéma), **ELK** stack (Elasticsearch + Logstash + Kibana) |
| Traces | **Jaeger**, **Zipkin**, **OpenTelemetry** |

**Alerting** — Prometheus Alertmanager → email, Slack, PagerDuty integráció.

Egy minimális Compose-stack: `prometheus + grafana + cadvisor` már produkció előtti "observability in a box"-nak megfelel.

---

## 18. Felhőspecifikus konténer-szolgáltatások

Saját Kubernetes cluster üzemeltetése komplex és erőforrásigényes. **Managed Kubernetes** szolgáltatások — a felhőszolgáltató viseli a control plane-t:

| Szolgáltatás | Szolgáltató | Jellemző |
|---|---|---|
| **EKS** (Elastic Kubernetes Service) | AWS | A legelterjedtebb managed K8s |
| **AKS** (Azure Kubernetes Service) | Azure | Beépített Entra ID integráció |
| **GKE** (Google Kubernetes Engine) | GCP | Az eredeti Kubernetes-szülő platform |

### Serverless konténerek

Nincs cluster menedzsment, nem kell kapacitást tervezni — csak a konténert adjuk meg:

- **AWS Fargate** — konténer futtatása pod / task szinten, kapacitás nélkül.
- **Azure Container Instances (ACI)** — egyedi konténer másodpercek alatt.
- **Google Cloud Run** — HTTP-alapú, autoscaling konténer-service.

### Container registry — privát image-tárolók

- **AWS ECR** (Elastic Container Registry)
- **Azure ACR** (Azure Container Registry)
- **GHCR** (`ghcr.io`) — GitHub Container Registry
- **Docker Hub** — a publikus alap

---

## 19. Kitekintés — a virtualizáció jövője és a WebAssembly

A Docker már **meghaladott** abban az értelemben, hogy egyre több helyen nem a legkisebb, leggyorsabb megoldás — bár továbbra is ipari szabvány a CI/CD-ben és a fejlesztői munkában.

A következő lépés: **WebAssembly (WASM)** — bináris utasításformátum, platformfüggetlen köztes réteg, eredetileg böngészőkbe (OpenGL, játékok, CAD), ma már szerver oldalra is.

### WASM szerver oldalon

- **WASI** (WebAssembly System Interface) — OS-szintű hozzáférés szerveren (fájlrendszer, hálózat, óra, random), sandbox-olva.
- **Futtatókörnyezetek**: [Wasmtime](https://wasmtime.dev/), [Wasmer](https://wasmer.io/), [WasmEdge](https://wasmedge.org/).
- **Docker integráció**: `docker run --runtime=io.containerd.wasmtime.v1`.
- **Fermyon Spin** — WASM-alapú microservice keretrendszer.
- **Nyelvek**: Rust és C/C++ (LLVM), Go, Python, .NET egyre szélesedő támogatással. Tipikus target: `cargo build --target wasm32-wasi`.

### Előnyök és hátrányok

| Előny | Hátrány |
|---|---|
| Gyorsabb indulás (ms nagyságrend) | Korlátozott OS-interfész |
| Kisebb méret (KB nagyságrend) | GPU-támogatás még gyenge |
| Erős sandbox (capability alapú) | Szálkezelés limitált |

A WASM a Dockert valószínűleg nem leváltja, hanem **kiegészíti** — ahol az extrém gyors hidegindulás és a kis méret kritikus (edge, serverless, pluginek), ott a WASM nyer; ahol teljes OS-környezet kell, ott a konténer marad.

---

## 20. Híd a 9–11. előadásokhoz

A következő előadások arra építenek, hogy a konténer mint "hordozható futtatási környezet" fogalom ismert:

- A **9. előadás** a kódminőséget és a statikus elemzést veszi elő — a CI-ban ezek konténerben futnak.
- A **10. előadás** a modell-alapú kódgenerálást mutatja be — ahol a generált kódhoz a build-környezet is gyakran konténerizált.
- A **11. előadás** az LLM-ek gyakorlatát tárgyalja — ahol a **lokális és air-gapped futtatás** közvetlenül Docker- / Podman-alapú.
- A **12. előadás** az LLMOps oldaláról nézi ezt: hogyan **üzemeltetünk** egy AI-vezérelt rendszert — és ez ugyanazokat a Kubernetes / Prometheus / Grafana / Jaeger eszközöket hozza vissza, amiket ma megismertünk.

---

## 21. Gyakorló kérdések

### Fogalmi

1. Mi a különbség emuláció és virtualizáció között? Mondj egy-egy példát.
2. Nevezd meg a virtualizáció öt szintjét, és mindegyikhez egy eszközt.
3. Miért OS-szintű virtualizáció a Docker? Mit oszt meg a gazdával, mit nem?
4. Mi a különbség egy **image** és egy **container** között?
5. Mi a `depends_on` és miért nem elég önmagában? Milyen mintával egészíted ki?
6. Mi az OCI, és miért fontos, hogy a Docker és a Podman is OCI-kompatibilis?
7. Mi a multi-stage build, és miért csökkenti a támadási felületet?
8. Mi a különbség egy **bind mount**, egy **named volume** és egy **tmpfs** között?
9. Mi a **distroless** image? Milyen alap image-ből épül Rust/Go esetén?
10. Sorold fel a megfigyelhetőség három pillérét, és eszközt mindegyikhez.

### Gyakorlati

11. Adott egy `compose.yaml` egy webalkalmazáshoz (`app`) és egy PostgreSQL adatbázishoz (`db`). Írj rá healthcheck-et úgy, hogy az `app` csak akkor induljon, ha a `db` készen áll.
12. Miért rossz ötlet `latest` tag-et használni produkcióban? Mi a jobb minta?
13. Hogyan futtatsz le egy Rust tesztet egy **dev container**-ben, miközben a CI is ugyanazt az image-et használja?
14. Egy multi-stage Dockerfile-ban mitől lesz 70 MB helyett 2 MB a végső image? Nevezz meg két-három tényezőt.
15. Melyik Kubernetes service-típust választod, ha a szolgáltatás csak a clusteren belülről érhető el, és melyiket, ha kívülről is?
16. A GDPR érzékeny alkalmazásod air-gapped környezetben kell fusson. Milyen Docker-elemekre kell külön figyelned (volume, registry, secret, image provenance)?
17. Hogyan integrálsz Docker Compose-t egy GitHub Actions pipeline-ba integrációs tesztelésre? Mi a `docker compose wait` szerepe?
18. Mely feladatokat migrálnád **WASM + WASI** alá Docker helyett, és melyeket hagynád mindenképp konténerben? Indokold.

---

## 22. Irodalom, linkek

### Alap

- Docker Get Started — <https://docs.docker.com/get-started/>
- Docker Compose spec — <https://docs.docker.com/compose/compose-file/>
- OCI — <https://opencontainers.org/>

### Podman és alternatívák

- Podman — <https://podman.io/>
- Buildah — <https://buildah.io/>

### Multi-stage, distroless, devcontainer

- Multi-stage builds — <https://docs.docker.com/build/building/multi-stage/>
- Distroless — <https://github.com/GoogleContainerTools/distroless>
- Chainguard Images — <https://www.chainguard.dev/chainguard-images>
- Dev Containers specifikáció — <https://containers.dev/>

### Kubernetes és megfigyelhetőség

- Kubernetes docs — <https://kubernetes.io/docs/home/>
- Helm — <https://helm.sh/>
- Prometheus — <https://prometheus.io/>
- Grafana — <https://grafana.com/>
- OpenTelemetry — <https://opentelemetry.io/>
- Jaeger — <https://www.jaegertracing.io/>

### WebAssembly

- WebAssembly — <https://webassembly.org/>
- WASI — <https://wasi.dev/>
- Wasmtime — <https://wasmtime.dev/>
- Fermyon Spin — <https://www.fermyon.com/spin>

### CNCF ökoszisztéma

- CNCF Landscape — <https://landscape.cncf.io/>
