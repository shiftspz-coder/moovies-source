const MK = 'imdbb_vsync1'

let busy = false
let timer = null
let last = 0

function L(){
    return window.Lampa
}

function url(){
    try{
        let u = localStorage.getItem('imdbb_sync_url') || ''

        return u ? u + (u.indexOf('?') >= 0 ? '&' : '?') + 'v=1' : ''
    }
    catch(e){ return '' }
}

function meta(){
    try{
        let m = JSON.parse(localStorage.getItem(MK) || 'null')

        return m && typeof m.t === 'number' ? m : null
    }
    catch(e){ return null }
}

function metaSet(t){
    try{ localStorage.setItem(MK, JSON.stringify({t: t})) }
    catch(e){}
}

function apply(vs){
    let Lp = L()
    let name = Lp.Timeline.filename()
    let cur = Lp.Storage.get(name, {})
    let ch = 0
    let mx = 0

    if(!cur || typeof cur !== 'object') cur = {}

    Object.keys(vs).forEach(function(h){
        let x = vs[h]

        if(!x || typeof x.t !== 'number') return

        let r = cur[h]
        let lt = r && typeof r === 'object' ? (r.updated || 0) : 0

        if(r !== undefined && (x.t <= lt || x.t === 1)) return

        cur[h] = {duration: x.d || 0, time: x.s || 0, percent: x.p || 0, profile: x.r || 0, updated: x.t}
        ch++

        if(x.t > mx) mx = x.t
    })

    if(!ch) return 0

    Lp.Storage.set(name, cur)

    try{ Lp.Timeline.read() }
    catch(e){}

    try{ Lp.Noty.show('Просмотр: обновлено ' + ch) }
    catch(e){}

    return mx
}

function collect(cur, from, first){
    let out = {}
    let max = from

    Object.keys(cur).forEach(function(h){
        let r = cur[h]
        let u = 0, p = 0, s = 0, d = 0, pr = 0

        if(r && typeof r === 'object'){ u = r.updated || 0; p = r.percent || 0; s = r.time || 0; d = r.duration || 0; pr = r.profile || 0 }
        else if(typeof r === 'number') p = r
        else return

        if(first ? !p : u <= from) return

        out[h] = {t: u || 1, p: p, s: s, d: d, r: pr}

        if(u > max) max = u
    })

    return {views: out, max: max}
}
function sync(){
    let Lp = L()
    let u = url()

    if(busy || !u || !Lp) return

    let m = meta()
    let cur = {}
    let pack = null

    try{ cur = Lp.Storage.get(Lp.Timeline.filename(), {}) }
    catch(e){ return }

    pack = collect(cur || {}, m ? m.t : 0, !m)
    busy = true
    last = Date.now()

    let x = new XMLHttpRequest()
    x.open('POST', u, true)
    x.setRequestHeader('Content-Type', 'text/plain')
    x.timeout = 20000
    x.onload = function(){
        busy = false

        if(x.status !== 200) return

        try{
            let st = JSON.parse(x.responseText)

            if(!st || !st.views) return

            metaSet(Math.max(pack.max, apply(st.views)))
        }
        catch(e){}
    }
    x.onerror = x.ontimeout = function(){ busy = false }
    x.send(JSON.stringify({views: pack.views}))
}

function schedule(ms){
    clearTimeout(timer)

    timer = setTimeout(sync, ms)
}

function init(){
    let Lp = L()

    let start = function(){
        try{ Lp.Timeline.listener.follow('update', function(){ schedule(20000) }) }
        catch(e){}

        document.addEventListener('visibilitychange', function(){
            if(document.hidden) schedule(500)
            else if(Date.now() - last > 30000) schedule(1500)
        })

        setInterval(function(){ if(!document.hidden) sync() }, 180000)
        setTimeout(sync, 12000)
    }

    if(window.appready) start()
    else Lp.Listener.follow('app', function(e){ if(e.type === 'ready') start() })
}

export default {init, sync}
