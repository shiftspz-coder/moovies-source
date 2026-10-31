const KEY = 'imdbb_bell1'
const RANK = {'TS': 1, '1080': 2, '4K': 3}
const RN = {1: 'TS', 2: 'FHD', 3: '4K'}
const EVERY = 20 * 60 * 1000

let running = false

function L(){
    return window.Lampa
}

function on(){
    return true
}

function proxy(){
    try{ return localStorage.getItem('imdb_proxy') || '' }
    catch(e){ return '' }
}

function load(){
    try{
        let s = JSON.parse(localStorage.getItem(KEY) || '{}')

        return {t: s.t || 0, items: s.items || {}}
    }
    catch(e){ return {t: 0, items: {}} }
}

function save(s){
    try{ localStorage.setItem(KEY, JSON.stringify(s)) }
    catch(e){}
}

function kindOf(m){
    return m.media_type === 'tv' || (m.name && !m.title) || m.first_air_date ? 'tv' : 'movie'
}

function dcode(d){
    return d ? 1 : 0
}

function dtext(c){
    return '🗣️ Появился дубляж'
}

function fetchQ(card, cb){
    let p = proxy()

    if(!p) return cb(null)

    let title = card.title || card.name || ''
    let orig = card.original_title || card.original_name || ''
    let year = ((card.release_date || card.first_air_date || '') + '').slice(0, 4)
    let x = new XMLHttpRequest()

    x.open('GET', p + '?title=' + encodeURIComponent(title) + '&year=' + year + '&orig=' + encodeURIComponent(orig) + '&kind=' + kindOf(card), true)
    x.timeout = 30000
    x.onload = function(){
        let v = null

        try{ v = JSON.parse(x.responseText) }
        catch(e){}

        cb(v && typeof v === 'object' ? {q: v.q || null, dub: v.dub || null} : null)
    }
    x.onerror = x.ontimeout = function(){ cb(null) }
    x.send()
}

function cardFor(card){
    let c = Object.assign({}, card)

    if(kindOf(c) === 'tv' && !c.number_of_seasons && !c.seasons) c.number_of_seasons = 1

    return c
}

function notify(card, key, title, parts, cur){
    let year = ((card.release_date || card.first_air_date || '') + '').slice(0, 4)
    let name = (card.title || card.name || '') + (year ? ' (' + year + ')' : '')

    try{
        L().Notice.pushNotice('lampa', {
            id: 'imdbb:' + key + ':' + cur.r + ':' + cur.d,
            from: 'imdbb',
            time: Date.now(),
            title: title,
            text: name + '<br>' + parts.join('<br>'),
            poster: card.poster_path,
            card: cardFor(card)
        })
    }
    catch(e){}
}

function handle(card, snap, items, done){
    let key = kindOf(card) + ':' + card.id
    let old = snap.items[key]

    fetchQ(card, function(v){
        if(!v){
            if(old) items[key] = old

            return done()
        }

        let nr = RANK[v.q] || 0
        let nd = dcode(v.dub)
        let cur = {r: Math.max(nr, old ? old.r : 0), d: Math.max(nd, old ? old.d : 0)}

        items[key] = cur

        if(old){
            let up = nr > old.r
            let dn = nd > old.d
            let parts = []

            if(up) parts.push(old.r ? 'Качество: ' + RN[old.r] + ' → ' + RN[nr] : 'Качество: ' + RN[nr])
            if(dn) parts.push(dtext(nd))

            if(parts.length) notify(card, key, up && dn ? 'Новое качество и дубляж' : up ? 'Новое качество' : 'Дубляж', parts, cur)
        }

        done()
    })
}

function check(force){
    if(running || !on()) return

    let Lp = L()

    if(!Lp.Favorite || !Lp.Notice || !proxy()) return

    let snap = load()

    if(!force && Date.now() - snap.t < EVERY) return

    let list = []

    try{ list = (Lp.Favorite.get({type: 'book'}) || []).slice(0, 100) }
    catch(e){ return }

    running = true

    let items = {}
    let i = 0
    let active = 0
    let step = function(){
        while(active < 3 && i < list.length){
            let card = list[i++]

            if(!card || !card.id) continue

            active++

            handle(card, snap, items, function(){
                active--
                step()
            })
        }

        if(active === 0 && i >= list.length && running){
            running = false
            snap.items = items
            snap.t = Date.now()
            save(snap)
        }
    }

    step()
}

function cleanTest(){
    try{
        let lp = L().Notice.classes.lampa

        if(!lp || !lp.db) return

        let bad = (lp.notices || []).filter(function(n){ return n && typeof n.id === 'string' && n.id.indexOf('imdbb:test') === 0 })

        if(!bad.length) return

        Promise.all(bad.map(function(n){ return lp.db.deleteData('all', n.id) })).then(function(){ lp.update() }).catch(function(){})
    }
    catch(e){}
}

function only(){
    let N = L().Notice

    if(!N || !N.classes || !N.classes.lampa) return false
    if(N.imdbbOnly) return true

    let lp = N.classes.lampa
    let cub = N.classes.cub
    let mine = function(n){ return n && n.from === 'imdbb' }
    let items = lp.items.bind(lp)

    N.imdbbOnly = true

    if(cub){
        let get = N.get.bind(N)

        N.get = function(name){ return name === 'cub' ? cub : get(name) }

        delete N.classes.cub
    }

    lp.items = function(){ return items().filter(mine) }
    lp.count = function(){ return (lp.notices || []).filter(function(n){ return mine(n) && n.time > lp.time }).length }
    lp.name = 'MoovieS'

    N.drawCount()

    return true
}

function init(){
    let Lp = L()

    try{
    }
    catch(e){}

    let start = function(){
        let tries = 0
        let p = function(){
            let done = false

            try{ done = only() }
            catch(e){}

            if(!done && tries++ < 20) setTimeout(p, 500)
        }

        p()

        setTimeout(cleanTest, 4000)
        setTimeout(cleanTest, 12000)

        setTimeout(function(){ check(false) }, 8000)

        document.addEventListener('visibilitychange', function(){
            if(!document.hidden) setTimeout(function(){ check(false) }, 1500)
        })
    }

    if(window.appready) start()
    else Lp.Listener.follow('app', function(e){ if(e.type === 'ready') start() })
}

export default {init, check}

// rebuild
