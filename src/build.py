import json, re, html
import sys, os; sys.path.insert(0, os.path.dirname(__file__))
from games import GAMES, LAB
ICONS = json.load(open('src/icons.json'))
ROBLOX = "https://www.roblox.com/communities/1068137339/Overgrind-Studios"
TIKTOK = "https://www.tiktok.com/@overgrindstudios"
esc = html.escape
def ico(n): return f'<svg class="i" viewBox="0 0 24 24" aria-hidden="true">{ICONS[n]}</svg>'
DE = {
 "ld":"Lade sieben Welten","cur":"ANSEHEN",
 "n.games":"Games","n.road":"Roadmap","n.studio":"Studio","n.join":"Mitmachen","n.cta":"Auf Roblox beitreten",
 "h.eyebrow":"Roblox-Gamestudio · seit 2026",
 "h.lede":"Vier Roblox-Devs, sieben Games in der Werkstatt. Jedes wird so lange gebaut, bis es mehr als nur gut genug ist.","s.crew":"Die Crew","cr.f":"Founder","cr.d":"Developer",
 "h.c1":"Community beitreten","h.c2":"Games ansehen","h.scroll":"Scrollen",
 "f.1":"Games in Entwicklung","f.2":"Devs in der Crew","f.3":"eine Crew aus der Schweiz und Deutschland",
 "m.k":"Warum Overgrind",
 "m.t":"Wir veröffentlichen nicht die erste Version, die funktioniert. Sondern die, die wir selbst spielen würden: nach der Schule, nach der Arbeit, um zwei Uhr nachts. Das ist der Grind.",
 "w.t":"Sieben Welten.<br>Eine Crew.","w.p":"Jedes Game hat seinen eigenen Look, eigene Regeln und ein eigenes Team. Scroll durch alle und lies unten die Details.",
 "w.end":"Und das ist erst der Anfang.","w.endc":"Details lesen",
 "d.k":"Im Detail","d.t":"Woran wir bauen",
 "l.k":"Frühe Konzepte","l.t":"Noch im Labor","l.chip":"Konzept",
 "r.k":"Roadmap","r.t":"Was als Nächstes kommt",
 "r.1s":"Jetzt","r.1h":"Sieben Games in der Werkstatt","r.1p":"Jedes Projekt entsteht gerade in Roblox Studio.",
 "r.2s":"Als Nächstes","r.2h":"Erste Playtests","r.2p":"Nostalgia Recess: Test mit Freunden.","r.2q":"SEEN ONLINE: private Beta.",
 "r.3s":"Winter 2026","r.3h":"Erste Releases","r.3p":"Wyrmquake peilt den Winter an.","r.3q":"Nostalgia Recess bekommt nach dem Start wöchentliche Updates.",
 "r.4s":"Später","r.4h":"Seasons und mehr","r.4p":"Element Clash startet mit Season 1. Season 2 führt in die Unterwelt.",
 "r.note":"Pläne können sich ändern. Tritt der Community bei, dann erfährst du es zuerst.",
 "s.k":"Das Studio","s.t":"Ein Label.<br>Viele Creator.",
 "s.p1":"Overgrind ist eine gemeinsame Roblox-Community. Verschiedene Creator veröffentlichen unter einem Namen und messen sich am gleichen Anspruch.",
 "s.p2":"Keine Copy-Paste-Games, keine ersten Entwürfe auf der Startseite. Jeder Release muss etwas sein, das wir selbst spielen würden.",
 "s.r1":"führt das Label","s.r2":"leitet ein Game","s.r3":"baut mit uns","s.r4":"das bist du",
 "j.1":"Sei dabei vor","j.2":"dem ersten Drop.","j.p":"Tritt der Roblox-Community bei, damit du zuerst erfährst, wenn ein Game aufgeht, und folg uns auf TikTok für Devlogs und Clips.",
 "j.c1":"Auf Roblox beitreten",
 "n.devlog":"Devlog","n.apply":"Ins Team","d.more":"Zur Game-Seite",
 "v.k":"Devlog","v.t":"Hinter dem Grind","v.ep":"Folge 0","v.h":"Das ist Overgrind","v.p":"Wer wir sind, was wir bauen und warum es gleich sieben Games sind. Eine Minute, fünf Welten, ohne Füllstoff.","v.c":"Mehr auf TikTok","v.cr":"Stimme: ElevenLabs","v.soon":"bald",
 "a.k":"Bau mit uns","a.t":"Lust, mit uns zu grinden?","a.p1":"Wir suchen immer Builder, Scripter, Modeler, UI- und VFX-Leute, denen Details genauso wichtig sind wie uns.","a.p2":"Erzähl uns, wer du bist, und schick etwas, das du gebaut hast. Wir lesen jede Bewerbung.",
 "a.f1":"Dein Name","a.f2":"Roblox-Benutzername","a.f3":"Was du am besten kannst","a.f4":"Portfolio oder Game-Link","a.f5":"Ein paar Worte zu dir","a.o":"Etwas anderes","a.send":"Bewerbung senden","a.note":"Öffnet dein Mailprogramm mit allem ausgefüllt. Auf dieser Seite wird nichts gespeichert.",
 "s.vid":"FreshStatue stellt Overgrind vor: wer wir sind, woher der Name kommt und wen wir suchen.","gp.back":"Alle Games","gp.follow":"Entwicklung verfolgen","gp.k1":"Das Game","gp.k2":"Galerie","gp.soon":"Bald mehr Bilder","gp.soonp":"Neue Screenshots und Clips kommen mit jedem Devlog.","gp.next":"Nächste Welt","ft.1":"Gebaut von freshstatue und der Crew","ft.2":"Nicht mit der Roblox Corporation verbunden.",
}
wall_cols, panels, dives, mq = [], [], [], []
keys=[g['key'] for g in GAMES]
for c in range(4):
    imgs=''.join(f'<img src="assets/games/{keys[(c*2+j)%7]}.jpg" alt="" loading="eager">' for j in range(6))
    wall_cols.append(f'<div class="col" data-col="{c}">{imgs}</div>')
for i,g in enumerate(GAMES):
    k=g['key']; n=f"{i+1:02d}"
    for f,(en,de) in [('genre',g['genre']),('tag',g['tag']),('status',g['status']),('desc',g['desc'])]:
        DE[f"g.{k}.{f}"]=de
    for j,(en,de) in enumerate(g['feats']): DE[f"g.{k}.f{j}"]=de
    for j,(l_en,l_de,v_en,v_de) in enumerate(g['facts']): DE[f"g.{k}.fl{j}"]=l_de; DE[f"g.{k}.fv{j}"]=v_de
    chip=f'<span class="chip {g["st"]}"><i></i><span data-i18n="g.{k}.status">{esc(g["status"][0])}</span></span>'
    panels.append(f'''
    <a class="panel{' titled' if k=='seen' else ''}" href="games/{k}/" style="--a:{g['accent']}" data-bg="{g['bg']}" data-accent="{g['accent']}" data-cursor>
      <img src="assets/games/{k}.webp" srcset="assets/games/{k}-800.webp 800w, assets/games/{k}.webp 1600w" sizes="(max-width: 860px) 92vw, 60vw" width="1600" height="900" alt="{esc(g['title'])} key art" loading="lazy" decoding="async">
      <span class="num">{n} / 07</span>
      <div class="meta"><div><div class="gen">{ico(g['icon'])}<span data-i18n="g.{k}.genre">{esc(g['genre'][0])}</span></div><h3>{esc(g['title'])}</h3><p class="tg" data-i18n="g.{k}.tag">{esc(g['tag'][0])}</p></div>{chip}</div>
    </a>''')
    lines=''.join(f'<span class="ln">{esc(w)}</span>' for w in g['title'].split(': ',1)) if ': ' in g['title'] else f'<span class="ln">{esc(g["title"])}</span>'
    feats=''.join(f'<li data-i18n="g.{k}.f{j}">{esc(en)}</li>' for j,(en,de) in enumerate(g['feats']))
    facts=''.join(f'<div><small data-i18n="g.{k}.fl{j}">{esc(l)}</small><b data-i18n="g.{k}.fv{j}">{esc(v)}</b></div>' for j,(l,_,v,__) in enumerate(g['facts']))
    dives.append(f'''
  <article class="dive" id="g-{k}" style="--a:{g['accent']}" data-bg="{g['bg']}" data-accent="{g['accent']}">
    <div class="wrap grid">
      <figure class="art" data-cursor><img src="assets/games/{k}.webp" srcset="assets/games/{k}-800.webp 800w, assets/games/{k}.webp 1600w" sizes="(max-width: 860px) 92vw, 60vw" width="1600" height="900" alt="{esc(g['title'])} key art" loading="lazy" decoding="async"><span class="badge">{chip}</span></figure>
      <div class="txt">
        <div class="idx">{ico(g['icon'])}<span>{n}</span><span data-i18n="g.{k}.genre">{esc(g['genre'][0])}</span></div>
        <h3>{lines}</h3>
        <p class="tag" data-i18n="g.{k}.tag">{esc(g['tag'][0])}</p>
        <p class="desc" data-i18n="g.{k}.desc">{esc(g['desc'][0])}</p>
        <ul>{feats}</ul>
        <div class="fx">{facts}</div>
        <a class="btn ghost mag more" href="games/{k}/"><span data-i18n="d.more">Open the game page</span>{ico('arrow-right')}</a>
      </div>
    </div>
  </article>''')
    mq.append(f'<span>{esc(g["title"])}</span><span class="star">✦</span>' if i%2==0 else f'<span class="o">{esc(g["title"])}</span><span class="star">✦</span>')
lab=''
for j,(t,en,de) in enumerate(LAB):
    DE[f"lab.{j}"]=de
    lab+=f'<div class="lab-card"><span class="chip"><i></i><span data-i18n="l.chip">Concept</span></span><div><b>{esc(t)}</b><p data-i18n="lab.{j}">{esc(en)}</p></div></div>'

CREW=[("FreshStatue","f","assets/crew/freshstatue.png"),("Andrin","d",None),("excess","d",None),("Ginoletsplay","d",None)]
def avatar(name,img):
    if img: return f'<img src="{img}" alt="Roblox avatar of {esc(name)}" loading="lazy">'
    return ('<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="33" y="20" width="34" height="34" rx="8" fill="#2E2E36"/>'
            '<path d="M18 100 V78 Q18 62 34 62 H66 Q82 62 82 78 V100Z" fill="#2E2E36"/>'
            f'<text x="50" y="44" text-anchor="middle" font-family="Unbounded" font-weight="900" font-size="16" fill="#9A948A">{esc(name[0].upper())}</text></svg>')
crew_html=''.join(f'<div class="member" data-tilt>{"<div class=av>"}{avatar(n,i)}</div><b>{esc(n)}</b><span class="{"f" if r=="f" else ""}" data-i18n="cr.{r}">{"Founder" if r=="f" else "Developer"}</span></div>' for n,r,i in CREW)
LD={"@context":"https://schema.org","@type":"Organization","name":"Overgrind Studios","url":"https://overgrindstudio.click/","logo":"https://overgrindstudio.click/icon.png",
    "sameAs":[ROBLOX,TIKTOK],"description":"A small crew of Roblox devs with seven games in the workshop.",
    "subjectOf":[{"@type":"VideoGame","name":g['title'],"genre":g['genre'][0],"description":g['desc'][0],"gamePlatform":"Roblox","image":f"https://overgrindstudio.click/assets/games/{g['key']}.jpg"} for g in GAMES]}

DE.update({"n.crew":"Crew","lu.r0":"Founder","lu.r1":"Creator","lu.r2":"Avatar lädt","lu.r3":"Avatar lädt","lu.you":"Du?","lu.r4":"Freier Platz",
 "lu.k0":"Die Crew","lu.t0":"Das sind<br>die Grinder.","lu.p0":"Vier Devs aus der Schweiz und Deutschland. Beweg die Maus, sie schauen dir nach. Klick einen an und sag Hallo.",
 "lu.k1":"Founder","lu.p1":"Führt das Label und baut die Games. Ja, er ist aus Marmor. Klick ihn an und schau, was passiert.",
 "lu.k2":"Creator","lu.p2":"Noch kein Video, aber merk dir diesen Avatar. Die Krone kommt bald in deinen Feed.",
 "lu.k3":"Developer","lu.p3":"Zwei weitere Devs aus der Crew. Ihre Avatare laden noch. Ihr Code nicht.",
 "lu.k4":"Freier Platz","lu.t4":"Dieser Platz<br>gehört dir.","lu.p4":"Builder, Scripter, Modeler, Designer: Rauf aufs Podest.","lu.c":"Jetzt bewerben","lu.hint":"bewegen · klicken · hallo sagen","lu.fit":"Game-Outfits","lu.p0":"Vier Devs aus der Schweiz und Deutschland. Beweg die Maus, sie schauen dir nach. Klick einen an und sag Hallo, tipp aufs Namensschild für seine Karte."})
DEVLOGS=[("EP 00","Meet Overgrind","Das ist Overgrind","1 min","1 Min."),("EP 01","Wyrmquake devlog","Wyrmquake-Devlog","soon","bald")]
devlogs=''.join(f'<div class="dl-item"><b>{e}</b><span data-i18n="dl.{j}">{esc(t)}</span><em data-i18n="dlw.{j}">{w}</em></div>' for j,(e,t,td,w,wd) in enumerate(DEVLOGS))
for j,(e,t,td,w,wd) in enumerate(DEVLOGS): DE[f"dl.{j}"]=td; DE[f"dlw.{j}"]=wd

DE.update({"ld.t":"Trete Overgrind bei","ld.by":"von freshstatue und der Crew","ld.tip":"Tipp: Auf dieser Seite sind 10 goldene Noppen versteckt.",
 "f.4":"Mitglieder in der Community","n.build":"Builder",
 "tt.h":"Frisch von TikTok","tt.p":"Unsere neusten Clips und Devlogs direkt von TikTok. Sie laden von tiktok.com, dabei kann TikTok Cookies setzen.","tt.c":"TikTok-Videos laden",
 "b.k":"Avatar-Builder","b.t":"Bau deinen<br>Grinder.","b.p":"Wähl Farben, ein Gesicht und ein Game-Outfit. Lade deine Crew-Karte runter, teil sie oder schick sie mit deiner Bewerbung.",
 "b.hint":"ziehen zum Drehen · klicken für ein Emote","b.skin":"Haut","b.shirt":"Shirt","b.pants":"Hose","b.face":"Gesicht","b.fit":"Game-Outfit",
 "b.name":"Name auf der Karte","b.role":"Rolle","b.dl":"Karte runterladen","b.share":"Teilen","b.apply":"Mit diesem Avatar bewerben",
 "gs.role":"Du hast jede goldene Noppe gefunden","gs.r1":"Noppen","gs.r2":"Status","gs.r2v":"Zertifizierter Grinder","gs.q":"„Echte Grinder schauen in jede Ecke.“"})

# update log (edit src/updates.json to add entries, newest first)
UPD = json.load(open('src/updates.json'))
upd_html = []
for i, u in enumerate(UPD):
    DE[f"up.{i}.t"] = u['t'][1]
    lis = ''.join(f'<li data-i18n="up.{i}.{j}">{esc(it[0])}</li>' for j, it in enumerate(u['items']))
    for j, it in enumerate(u['items']): DE[f"up.{i}.{j}"] = it[1]
    new = '<span class="up-new" data-i18n="up.new">NEW</span>' if u.get('new') else ''
    upd_html.append(f'<article class="up{" latest" if i == 0 else ""}"><header><span class="up-v">{esc(u["v"])}</span>{new}<time>{esc(u["date"])}</time></header><h3 data-i18n="up.{i}.t">{esc(u["t"][0])}</h3><ul>{lis}</ul></article>')
DE.update({"lu.pose": "Pose", "lu.snap": "Foto machen", "lu.card": "Sammelkarte", "up.new": "NEU", "up.k": "Update-Log", "up.h": "Was ist neu", "up.p": "Was sich bei Overgrind zuletzt geändert hat."})
GOAT='<script data-goatcounter="https://overgrind.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>'
item='<div class="item">'+''.join(mq)+'</div>'
s=open('src/index.tpl.html').read()
rep={'{{WALL}}':''.join(wall_cols),'{{PANELS}}':''.join(panels),'{{DIVES}}':''.join(dives),'{{LAB}}':lab,'{{MARQUEE}}':item*2,
     '{{DEVLOGS}}':devlogs,'{{UPDATES}}':''.join(upd_html),'{{GOAT}}':GOAT,'{{ROBLOX}}':ROBLOX,'{{CREW}}':crew_html,'{{FITS}}':''.join(f'<button type="button" data-fit="{g["key"]}" title="{esc(g["title"])}" aria-label="{esc(g["title"])} outfit" style="--s:url(crew3d/fit_{g["key"]}.webp)"><i></i></button>' for g in GAMES),'{{LDJSON}}':json.dumps(LD,ensure_ascii=False).replace('</','<\\/'),'{{TIKTOK}}':TIKTOK,'{{GAMESJSON}}':json.dumps([dict(key=g['key'],bg=g['bg'],accent=g['accent']) for g in GAMES]),
     '{{DEJSON}}':json.dumps(DE,ensure_ascii=False)}
for a,b in rep.items(): s=s.replace(a,b)
s=re.sub(r'\{\{i:([a-z0-9-]+)\}\}',lambda m:ico(m.group(1)),s)
assert '{{' not in s, re.findall(r'\{\{[^}]*\}\}',s)
# the previous dark homepage template stays in src/index.tpl.html for reference; it is no longer published
print(len(s)//1024,'KB')
from home_build import build_home
build_home(GAMES, DE, upd_html, LD, ROBLOX, TIKTOK, GOAT, ico, esc)

# shared stylesheet
open('assets/site.css','w').write(open('src/site.css').read())

# one page per game
gt=open('src/game.tpl.html').read()
for i,g in enumerate(GAMES):
    k=g['key']; nx=GAMES[(i+1)%len(GAMES)]
    parts=g['title'].split(': ',1)
    if len(parts)==1 and ' ' in parts[0] and len(parts[0])>11: parts=parts[0].split(' ',1)
    tl=''.join(f'<span class="ln"><span>{esc(w)}</span></span>' for w in parts)
    feats=''.join(f'<div class="feat"><b>{j+1:02d}</b><p data-i18n="g.{k}.f{j}">{esc(en)}</p></div>' for j,(en,de) in enumerate(g['feats']))
    facts=''.join(f'<div><small data-i18n="g.{k}.fl{j}">{esc(l)}</small><b data-i18n="g.{k}.fv{j}">{esc(v)}</b></div>' for j,(l,_,v,__) in enumerate(g['facts']))
    ld={"@context":"https://schema.org","@type":"VideoGame","name":g['title'],"genre":g['genre'][0],"description":g['desc'][0],"gamePlatform":"Roblox",
        "image":f"https://overgrindstudio.click/assets/games/{k}.jpg","publisher":{"@type":"Organization","name":"Overgrind Studios"}}
    s=gt.replace('{{ICON}}',g['icon'])
    rep={'{{TITLE}}':esc(g['title']),'{{DESC}}':esc(g['desc'][0]),'{{DESCR}}':esc(g['desc'][0]),'{{TAG}}':esc(g['tag'][0]),'{{BG}}':g['bg'],'{{ACCENT}}':g['accent'],'{{KEY}}':k,
         '{{NUM}}':f"{i+1:02d}",'{{GENRE}}':esc(g['genre'][0]),'{{TITLELINES}}':tl,'{{NLEN}}':str(max(len(p) for p in parts)),'{{ST}}':g['st'],'{{STATUS}}':esc(g['status'][0]),'{{FEATS}}':feats,'{{FACTS}}':facts,
         '{{NEXTKEY}}':nx['key'],'{{NEXTACCENT}}':nx['accent'],'{{NEXTTITLE}}':esc(nx['title']),'{{ROBLOX}}':ROBLOX,'{{TIKTOK}}':TIKTOK,'{{GOAT}}':GOAT,'{{FTGAMES}}':''.join(f'<a href="../{h["key"]}/"'+(' aria-current="page"' if h['key']==k else '')+f'>{esc(h["title"])}</a>' for h in GAMES),
         '{{LDJSON}}':json.dumps(ld,ensure_ascii=False).replace('</','<\\/'),'{{DEJSON}}':json.dumps(DE,ensure_ascii=False)}
    for a,v in rep.items(): s=s.replace(a,v)
    s=re.sub(r'\{\{i:([a-z0-9-]+)\}\}',lambda m:ico(m.group(1)),s)
    assert '{{' not in s, (k,re.findall(r'\{\{[^}]*\}\}',s))
    import hashlib; _V=hashlib.md5((open('src/site.css').read()+open('portal.js').read()+open('game.js').read()).encode()).hexdigest()[:8]
    s=s.replace('assets/site.css"','assets/site.css?v='+_V+'"').replace('portal.js"','portal.js?v='+_V+'"').replace('game.js"','game.js?v='+_V+'"')
    os.makedirs(f'games/{k}',exist_ok=True); open(f'games/{k}/index.html','w').write(s)
print('game pages ok')
