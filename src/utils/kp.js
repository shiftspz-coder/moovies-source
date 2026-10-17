const KEY = 'kp_rating_cache1'
const TTL = 3 * 24 * 3600 * 1000
const TTL_MISS = 12 * 3600 * 1000
const MAX_ENTRIES = 1500

let cache = null
let timer = null
let waiting = {}

function base(){
    try{
        let p = localStorage.getItem('imdb_proxy') || ''

        return /omdb\/?$/.test(p) ? p.replace(/omdb\/?$/, 'kp') : ''
    }
    catch(e){ return '' }
}

function load(){
    if(cache) return cache

    try{ cache = JSON.parse(localStorage.getItem(KEY) || '{}') }
    catch(e){ cache = {} }

    return cache
}

function save(){
    clearTimeout(timer)

    timer = setTimeout(function(){
        try{
            let keys = Object.keys(cache)

            if(keys.length > MAX_ENTRIES){
                keys.sort(function(a, b){ return cache[a].t - cache[b].t })
                    .slice(0, keys.length - MAX_ENTRIES)
                    .forEach(function(k){ delete cache[k] })
            }

            localStorage.setItem(KEY, JSON.stringify(cache))
        }
        catch(e){}
    }, 1000)
}

function getc(k){
    let c = load()[k]

    return c && c.t + c.l > Date.now() ? c : null
}

function setc(k, v, l){
    load()[k] = {v: v, t: Date.now(), l: l}

    save()
}

function isRu(d, info){
    try{
        if(d && d.original_language === 'ru') return true
        if(info && info.original_language === 'ru') return true

        let oc = (info && info.origin_country) || (d && d.origin_country) || []

        if(oc.indexOf('RU') > -1) return true

        let pc = info && info.production_countries && info.production_countries[0]

        return !!(pc && pc.iso_3166_1 === 'RU')
    }
    catch(e){ return false }
}

function rating(d, kind, cb){
    let p = base()

    if(!p || !d || !d.id) return cb(null)

    let key = kind + ':' + d.id
    let c = getc(key)

    if(c) return cb(c.v)
    if(waiting[key]) return waiting[key].push(cb)

    waiting[key] = [cb]

    let title = d.title || d.name || ''
    let orig = d.original_title || d.original_name || ''
    let year = ((d.release_date || d.first_air_date || '') + '').slice(0, 4)
    let url = d.imdb_id
        ? p + '?i=' + encodeURIComponent(d.imdb_id)
        : p + '?title=' + encodeURIComponent(title) + '&orig=' + encodeURIComponent(orig) + '&year=' + year

    let finish = function(v){
        let list = waiting[key]

        delete waiting[key]

        list.forEach(function(f){ f(v) })
    }

    let x = new XMLHttpRequest()

    x.open('GET', url, true)
    x.timeout = 15000
    x.onload = function(){
        let r = null
        let ok = false

        try{
            let j = JSON.parse(x.responseText)

            ok = !j.error && !j.limit
            r = j.kp > 0 ? parseFloat(j.kp) : null
        }
        catch(e){}

        if(ok) setc(key, r, r ? TTL : TTL_MISS)

        finish(r)
    }
    x.onerror = x.ontimeout = function(){ finish(null) }
    x.send()
}

export default {rating, isRu}
