"""White editorial homepage: fills src/home.tpl.html with the shared data from build.py."""
import json, re
def build_home(GAMES, DE, upd_html, LD, ROBLOX, TIKTOK, GOAT, ico, esc):
    CREW4=[("fs","FreshStatue","Founder","#E8A400","Runs the label and builds the games. Yes, he's made of marble.","Führt das Label und baut die Games. Ja, er ist aus Marmor."),
           ("andrin","Andrin","Creator","#E2202E","Black and red, crown on top. Remember this avatar, the crown is coming to your feed.","Schwarz und Rot, Krone obendrauf. Merk dir diesen Avatar, die Krone kommt bald in deinen Feed."),
           ("gino","Gino","Creator","#2450FF","Black hat, white hair, ROCKSTAR jacket. You'll spot him in any lobby.","Schwarzer Hut, weisse Haare, ROCKSTAR-Jacke. Den findest du in jeder Lobby."),
           ("excess","excess","Creator","#7B45F5","Purple aviators and a bee that never leaves his side.","Lila Pilotenbrille und eine Biene, die nie von seiner Seite weicht.")]
    cards=[]
    for i,(k,n,r,c,en,de) in enumerate(CREW4):
        DE[f"cr4.{k}"]=de; DE[f"cr4r.{k}"]=r
        cards.append(f'\n      <article class="card" style="--c:{c}" data-k="{k}">'
                     f'<span class="c-no">{i+1:02d}</span>'
                     f'<img class="c-img" src="assets/crew4/p_{k}.webp" alt="{esc(n)} as a Roblox avatar" loading="lazy" decoding="async">'
                     f'<div class="c-txt"><span class="c-role" data-i18n="cr4r.{k}">{r}</span><h3>{esc(n)}</h3><p data-i18n="cr4.{k}">{esc(en)}</p></div></article>')
    rows=[]
    for i,g in enumerate(GAMES):
        k=g['key']
        rows.append(f'\n      <li><a class="grow" href="games/{k}/" style="--a:{g["accent"]}" data-img="assets/games/{k}-800.webp">'
                    f'<span class="g-no">{i+1:02d}</span>'
                    f'<img class="g-thumb" src="assets/games/{k}-800.webp" alt="" width="800" height="450" loading="lazy" decoding="async">'
                    f'<span class="g-t"><b>{esc(g["title"])}</b><span class="g-tag" data-i18n="g.{k}.tag">{esc(g["tag"][0])}</span></span>'
                    f'<span class="g-gen">{ico(g["icon"])}<span data-i18n="g.{k}.genre">{esc(g["genre"][0])}</span></span>'
                    f'<span class="g-st {g["st"]}"><i></i><span data-i18n="g.{k}.status">{esc(g["status"][0])}</span></span>'
                    f'<span class="g-go">{ico("arrow-up-right")}</span></a></li>')
    reel=[]
    for i,g in enumerate(GAMES):
        k=g['key']
        reel.append(f'\n        <a class="rc" href="games/{k}/" style="--a:{g["accent"]}">'
                    f'<div class="rc-img"><img src="assets/games/{k}.webp" alt="{esc(g["title"])} key art" width="1460" height="812" loading="lazy" decoding="async"></div>'
                    f'<div class="rc-meta"><span class="rc-no">{i+1:02d}</span><div class="rc-t"><b>{esc(g["title"])}</b><em data-i18n="g.{k}.tag">{esc(g["tag"][0])}</em></div>'
                    f'<div class="rc-side"><span class="rc-gen">{ico(g["icon"])}<span data-i18n="g.{k}.genre">{esc(g["genre"][0])}</span></span>'
                    f'<span class="rc-st"><i></i><span data-i18n="g.{k}.status">{esc(g["status"][0])}</span></span></div>'
                    f'<span class="rc-go">{ico("arrow-up-right")}</span></div></a>')
    DE["w.hint"]="weiter scrollen"; DE["ft.about"]="Eine Roblox-Crew aus vier Creatorn aus der Schweiz und Deutschland. Wir bauen, bis es mehr als nur gut genug ist."; DE["ft.h1"]="Studio"; DE["ft.h3"]="Community"; DE["ft.up"]="Nach oben"
    cols=["#E2202E","#E8A400","#2450FF","#7B45F5"]
    tick=''.join(f'<span>{esc(g["title"])}</span><i style="--c:{cols[i%4]}"></i>' for i,g in enumerate(GAMES))
    DE.update({"n.apply":"Ins Team","h.m1":"Roblox-Gamestudio","h.m2":"Seit 2026","h.hint":"klick einen Creator an",
     "h.lede":"Vier Roblox-Creator, sieben Games in der Werkstatt. Jedes wird so lange gebaut, bis es <em>mehr</em> als nur gut genug ist.",
     "f.2":"Creator in der Crew","lu.t0a":"Das sind","lu.t0b":"die Grinder.","cr.p":"Vier Creator aus der Schweiz und Deutschland, ein Label. Hier baut jeder mit, und jeder spielt, was wir veröffentlichen.",
     "lu.t4":"Dieser Platz gehört dir.","lu.p4":"Builder, Scripter, Modeler, Designer: Bühne frei.",
     "w.ta":"Sieben Welten.","w.tb":"Eine Crew.","w.p2":"Jedes Game hat seinen eigenen Look, eigene Regeln und ein eigenes Team. Öffne eins und schau, woran wir bauen.",
     "r.ta":"Was als","r.tb":"Nächstes kommt.","v.ta":"Hinter dem","v.tb":"Grind.",
     "s.st":"Ein Label, viele Creator. Wir veröffentlichen nicht die erste Version, die funktioniert. Sondern die, die wir selbst spielen würden: nach der Schule, nach der Arbeit, um zwei Uhr nachts.",
     "a.ta":"Lust, mit uns","a.tb":"zu grinden?"})
    hs=open('src/home.tpl.html').read()
    rep={'{{CREWCARDS}}':''.join(cards),'{{GAMEROWS}}':''.join(rows),'{{REELCARDS}}':''.join(reel),'{{FTGAMES}}':''.join(f'<a href="games/{g["key"]}/">{esc(g["title"])}</a>' for g in GAMES),'{{TICKER}}':tick*3,'{{UPDATES}}':''.join(upd_html[:1]),'{{ROBLOX}}':ROBLOX,'{{TIKTOK}}':TIKTOK,'{{GOAT}}':GOAT,
         '{{LDJSON}}':json.dumps(LD,ensure_ascii=False).replace('</','<\\/'),'{{DEJSON}}':json.dumps(DE,ensure_ascii=False)}
    for a,b in rep.items(): hs=hs.replace(a,b)
    hs=re.sub(r'\{\{i:([a-z0-9-]+)\}\}',lambda m:ico(m.group(1)),hs)
    import hashlib
    V=hashlib.md5((open('src/home.css').read()+open('home.js').read()+open('gear3d.js').read()).encode()).hexdigest()[:8]
    hs=hs.replace('href="assets/home.css"','href="assets/home.css?v='+V+'"').replace('src="home.js"','src="home.js?v='+V+'"').replace('src="gear3d.js"','src="gear3d.js?v='+V+'"')
    assert '{{' not in hs, re.findall(r'\{\{[^}]*\}\}',hs)
    open('index.html','w').write(hs); print('home',len(hs)//1024,'KB')
    open('assets/home.css','w').write(open('src/home.css').read())
