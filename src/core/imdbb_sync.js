const LISTS = ['book', 'like', 'wath', 'history']
const MK = 'imdbb_sync1'
const BK = 'imdbb_sync_bak'

let busy = false
let applying = false
let timer = null
let last = 0

function L(){
    return window.Lampa
}

function on(){
    return true
}

function url(){
    try{ return localStorage.getItem('imdbb_sync_url') || '' }
    catch(e){ return '' }
}

function lsGet(k, d){
    try{
        let v = localStorage.getItem(k)

        return v ? JSON.parse(v) : d
    }
    catch(e){ return d }
}

function lsSet(k, v){
    try{ localStorage.setItem(k, JSON.stringify(v)) }
    catch(e){}
}

function fav(){
    let f = L().Storage.get('favorite', '{}')

    return f && typeof f === 'object' ? f : {}
}

function ids(f, l){
    return Array.isArray(f[l]) ? f[l] : []
}

function toSet(a){
    let o = {}

    a.forEach(function(x){ o[String(x)] = 1 })

    return o
}

function cardMap(f){
    let m = {}

    ;(Array.isArray(f.card) ? f.card : []).forEach(function(c){
        if(c && c.id !== undefined) m[String(c.id)] = c
    })

    return m
}

function sync(){
    let U = url()

    if(busy || applying || !on() || !U || !L().Favorite) return

    busy = true
    last = Date.now()

    let meta = lsGet(MK, null)
    let first = !meta
    let f = fav()
    let cm = cardMap(f)
    let now = Date.now()
    let send = {items: {}, cards: {}}

    if(!meta) meta = {snap: {}}

    LISTS.forEach(function(l){
        let cur = toSet(ids(f, l))
        let old = toSet(meta.snap[l] || [])
        let tt = meta.snap[l] === undefined ? 1 : now
        let id

        for(id in cur){
            if(old[id]) continue

            send.items[l + ':' + id] = {t: tt, on: true}

            if(cm[id]) send.cards[id] = cm[id]
        }

        for(id in old){
            if(cur[id]) continue

            send.items[l + ':' + id] = {t: now, on: false}
        }
    })

    let x = new XMLHttpRequest()

    x.open('POST', U, true)
    x.setRequestHeader('Content-Type', 'text/plain')
    x.timeout = 20000
    x.onload = function(){
        busy = false

        if(x.status !== 200) return

        let st

        try{ st = JSON.parse(x.responseText) }
        catch(e){ return }

        apply(st, first)
    }
    x.onerror = x.ontimeout = function(){ busy = false }
    x.send(JSON.stringify(send))
}

function apply(st, first){
    let Lp = L()
    let items = st && st.items || {}
    let cards = st && st.cards || {}
    let f = fav()
    let have = {}
    let add = []
    let del = []
    let plus = 0
    let minus = 0

    LISTS.forEach(function(l){ have[l] = toSet(ids(f, l)) })

    Object.keys(items).forEach(function(k){
        let p = k.indexOf(':')

        if(p < 1) return

        let l = k.slice(0, p)
        let id = k.slice(p + 1)

        if(!have[l]) return

        if(items[k].on && !have[l][id] && cards[id]) add.push([l, cards[id]])
        else if(!items[k].on && have[l][id]) del.push([l, id])
    })

    if(add.length || del.length){
        lsSet(BK, f)

        applying = true

        try{
            del.forEach(function(d){
                let n = Number(d[1])

                Lp.Favorite.remove(d[0], {id: isNaN(n) ? d[1] : n})

                minus++
            })

            add.forEach(function(a){
                Lp.Favorite.add(a[0], a[1])

                plus++
            })
        }
        catch(e){}

        applying = false
    }

    let f2 = fav()
    let snap = {}

    LISTS.forEach(function(l){ snap[l] = ids(f2, l).slice() })

    lsSet(MK, {snap: snap})

    try{
        if(plus || minus) Lp.Noty.show('Синхронизация: +' + plus + ' / -' + minus)
        else if(first) Lp.Noty.show('Синхронизация подключена')
    }
    catch(e){}
}

function schedule(ms){
    if(applying) return

    clearTimeout(timer)

    timer = setTimeout(sync, ms)
}

function init(){
    let Lp = L()

    try{
    }
    catch(e){}

    let start = function(){
        try{
            Lp.Favorite.listener.follow('add', function(){ schedule(3000) })
            Lp.Favorite.listener.follow('remove', function(){ schedule(3000) })
        }
        catch(e){}

        document.addEventListener('visibilitychange', function(){
            if(!document.hidden && Date.now() - last > 30000) schedule(1500)
        })

        setInterval(function(){ if(!document.hidden) sync() }, 180000)
        setTimeout(sync, 9000)
    }

    if(window.appready) start()
    else Lp.Listener.follow('app', function(e){ if(e.type === 'ready') start() })
}

export default {init, sync}
