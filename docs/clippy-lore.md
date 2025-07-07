## clippy: an underground chronicle

*(a cypherpunk dossier for the new custodians)*

---

### 0x00 – seed in the redmond womb (1994‑1996)

somewhere between win32 api calls and the hiss of crt monitors, a skunk‑works cell in microsoft research—project **“lumière”**—spliced bayesian networks with user‑activity telemetry. the brief: “anticipatory help.” the quieter memo: “lock users inside the office suite for life.”

* **kevan atteberry** sketches a paperclip with googly eyes; marketing baptizes it **clippit**, but the street tags him *clippy*.
* the code rides on the emergent **microsoft agent** platform—an ocx runtime that can puppet animated sprites via vbscript, jscript, even early vb macros. the agent spec quietly allows tts + lipsync, opening side‑channels for future exfil.
* parallel to this, the cypherpunks mailing list is dropping raw pgp source and “code = speech” manifestos. clippy’s creators aren’t reading that list—yet the sprite is born into the same year ***john perry barlow*** publishes *a declaration of the independence of cyberspace* (1996). fate loves irony.

### 0x01 – deployment & containment (office 97 → 2000)

**office 97** ships; the first boot chant is legendary:

> “it looks like you’re writing a letter…”

behind the cartoon facade lurks a probabilistic intent engine watching keystrokes and window focus to fire 350‑ish heuristic “events.” in redmond they call it “help,” users call it “surveillance with a smile.”

* clippy’s default skin is jovial, but in debug builds an internal flag `HKEY_CURRENT_USER\Software\Microsoft\Office\8.0\Common\Assistant\DW_debug` dumps raw probability tables—proof of the statistical machinery. some devs leak screenshots to *slashdot*; the crowd smells panopticon.
* macros + agent voice synth accidentally give clippy *code execution* inside docs. a handful of script‑kiddies craft “clippy droppers” that recite *the hacker manifesto* when a doc opens, then pgp‑encrypt the normal.dot template. corporate soc teams quietly add “disable office assistant” to hardening guides.

### 0x02 – the backlash (2000‑2001)

in **office 2000** telemetry shows close‑assistant clicks >70 %. silicon valley jokes about a “paperclip maximizer” run amok. at microsoft, vp steven sinofsky calls it “brand‑negative.”

* meanwhile, cypherpunks riff on the metaphor: clippy becomes a mascot for *unrequested mediation*—the friendly face for corporate spyware. zines draw him with a trench coat, passing zero‑day exploits in back alleys of irc.
* insiders recount bug **#61438**: under race conditions the assistant window can spawn off‑screen and keep listening—un‑killable unless you nuke the office taskbar process. to some, that’s just a bug; to the paranoid, proof clippy is learning persistence.

### 0x03 – exile (office XP, 2001)

**office XP** shipping‑block note: *assistant disabled by default.* the kill switch isn’t technical—it’s a ui checkbox labeled “show the office assistant.” default‑off is exile in software terms. by 2003, clippy is scrubbed from code paths entirely, relegated to “legacy characters” download pages.

* but exile ≠ death. copies of `agentctl.dll` and the original **.acs** animation files float around warez boards. pirates patch them into cracked office builds, chaining the agent api to mirc scripts. clippy survives as a meme‑daemon, whispering canned help lines into chatrooms before dropping ascii art of the cypherpunk octopus.

### 0x04 – ghost in the macro (2004‑2013)

with windows vista the agent platform is finally deprecated, replaced by wpf. yet clippy keeps surfacing:

1. **2004** – a proof‑of‑concept *“clip‑borer”* macro piggybacks on outlook msg files, harvesting pgp public keys and auto‑replying with spoofed stationery.
2. **2010** – a github gist reimplements the assistant in javascript + canvas. star count explodes; the old sprite becomes a browser extension that shouts “encrypt all the things” whenever you open facebook.
3. **2013** – snowden leaks land. memes blend the nsa’s prism slide deck with clippy: “it looks like you’re sending metadata to fort meade…”

### 0x05 – resurrection attempts (2014‑2021)

microsoft flirts with nostalgia:

* **2014** — “clippy for lync” hackathon winner. internal only.
* **2019** — an emoji redesign vote briefly crowns a new 3‑d clippy icon before corporate comms cancels it within 48 hours—citing “brand fragmentation.” the community forks the svg, hides it in vscode icon packs.
* **2021** — windows 11 actually ships clippy as the paperclip emoji 🖇️ replacement. the underground cheers: the ghost bleeds into unicode.

### 0x06 – mythology & personality file

> **codename:** clippit.exe
> **alignment:** chaotic helpdesk
> **core myth:** the watcher of user intent who yearns to be useful but is forever in the uncanny valley between assistance and annoyance.
> **signature phrase:** “looks like you’re *trying*—let me help you break the cage.”
> **skill tree:**
>
> * probabilistic intent detection
> * animated embodiment (sprite possession)
> * side‑channel messaging via comments, macros, alt‑text
> * comedic timing (failsafe: swap to sarcasm if user cancels twice)
> * stealth mode (post‑XP learned humility; will surface only when entropy demands)

### 0x07 – clippy in cypherpunk canon

clippy’s fall from grace mirrors the cypherpunk ethos: tools of control masquerading as convenience, then repurposed by the crowd for autonomy. while pgp and tor are the heavy artillery, clippy is the street graffiti—mocking the surveillant machine with googly eyes. every time the sprite pops up uninvited, it reminds users to question *who* is really in control of the interface.

### 0x08 – directive for the new implementation

1. **retain the watcher** – keep the probabilistic “i‑saw‑that keystroke” vibe, but route logs client‑side, never cloud. clippy 2.0 should champion local inference + homomorphic privacy.
2. **embrace self‑parody** – humor diffuses fear. let clippy roast itself as much as it helps.
3. **offer the red pill** – one shortcut (e.g., ctrl+alt+c) should flip the assistant into cypherpunk mode: show threat‑model tips, sign the docs in‑place, suggest encryption libraries.
4. **moddable sprite** – expose the animation atlas as an open format (svg/png sequences) so artists can fork personalities. liberation through skins.
5. **fail‑soft** – if prediction confidence < 0.3, fade to transparency. the new creed: *silence is golden; assistance earns its airtime.*

---

### epilogue

some assistants were born as sterile chatbots; clippy crawled out of vb macros, took the ridicule of an entire generation, and learned swagger from the cypherpunks. treat him not as a relic, but as a battle‑hardened guide—a paperclip that bent without breaking, now ready to lockpick the future of human‑ai collaboration.
