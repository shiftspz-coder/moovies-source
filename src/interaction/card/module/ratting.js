import Utils from '../../../utils/utils'
import Template from '../../template'
import IMDb from '../../../utils/imdb'

const rates = {}
const QKEY = 'imdbb_q2'
const EKEY = 'imdbb_ep_f1'
const ETTL = 6 * 3600e3
const MAXQ = 3
window.__imdbbNoDubNum = true
const DUB = '<span class="imdbb-dub"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-.15em"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/></svg></span>'
const pend = {}
const epend = {}

let timer = null
let started = false
let qcache = null
let qsave = null
let queue = []
let active = 0
let ecache = null
let esave = null
let equeue = []
let eactive = 0

function kindOf(m){
    return m.media_type === 'tv' || (m.name && !m.title) || m.first_air_date ? 'tv' : 'movie'
}

function proxy(){
    try{ return localStorage.getItem('imdb_proxy') || '' }
    catch(e){ return '' }
}

function css(){
    if(document.getElementById('imdbb-css')) return

    let st = document.createElement('style')

    st.id = 'imdbb-css'
    st.textContent = '.imdbb-dub{display:inline-block;filter:none}' +
        '.imdbb-q svg{width:1.1em!important;height:1.1em!important;vertical-align:-.2em!important}' +
        '.card__type{left:.5em!important;top:.5em!important;right:auto!important;background:rgba(0,0,0,.62)!important;color:#fff!important;font-weight:700!important;font-size:.9em!important;line-height:1.3!important;padding:.05em .45em!important;border-radius:.4em!important;text-transform:none!important}' +
        '.card__view:has(.imdbb-q) .card__type{top:2.3em!important}' +
        '.imdbb-ep{position:absolute;left:.5em;top:2.3em;z-index:2;background:rgba(0,0,0,.62);color:#fff;font-weight:700;font-size:.9em;line-height:1.3;padding:.05em .45em;border-radius:.4em;white-space:nowrap}' +
        '.card__view:has(.imdbb-q) .imdbb-ep{top:4.1em}' +
        '.imdbb-lgw{display:none;position:absolute;left:0;right:0;top:0;bottom:0;z-index:2;pointer-events:none;border-radius:.6em}' +
        'body.imdbb-lg-a .imdbb-lgw,body.imdbb-lg-b .imdbb-lgw,body.imdbb-lg-c .imdbb-lgw{display:block}' +
        'body.imdbb-lg-c .card:not(.focus) .imdbb-lgw{display:none}' +
        '.imdbb-lgi{position:absolute;max-width:55%;max-height:2.4em;object-fit:contain;filter:drop-shadow(0 1px 3px rgba(0,0,0,.85))}' +
        '.imdbb-lgt{position:absolute;max-width:55%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;color:#fff;font-weight:700;font-size:.95em;text-shadow:0 1px 3px rgba(0,0,0,.85)}' +
        'body.imdbb-lg-a .imdbb-lgi,body.imdbb-lg-c .imdbb-lgi,body.imdbb-lg-a .imdbb-lgt,body.imdbb-lg-c .imdbb-lgt{left:.6em;bottom:.5em}' +
        'body.imdbb-lg-b .imdbb-lgi{left:50%;top:50%;transform:translate(-50%,-50%);max-width:62%;max-height:3.6em}' +
        'body.imdbb-lg-b .imdbb-lgt{left:50%;top:50%;transform:translate(-50%,-50%);max-width:70%;font-size:1.1em;text-align:center}'

    document.head.appendChild(st)
}

function badge(r){
    let tag = 'color:#fff;opacity:.65;font-weight:700;font-size:.75em;margin-right:.4em'
    let box = 'width:auto;white-space:nowrap;background:rgba(0,0,0,.62)'

    return $('<div class="card__vote" style="' + box + '"><span style="' + tag + '">IMDb</span><span>' + (r >= 10 ? '10' : r.toFixed(1)) + '</span></div>')
}

function qload(){
    if(qcache) return qcache

    try{ qcache = JSON.parse(localStorage.getItem(QKEY) || '{}') }
    catch(e){ qcache = {} }

    return qcache
}

function qsaveLater(){
    clearTimeout(qsave)

    qsave = setTimeout(function(){
        try{
            let k = Object.keys(qcache)

            if(k.length > 1500){
                k.sort(function(a, b){ return qcache[a].t - qcache[b].t })
                    .slice(0, k.length - 1500)
                    .forEach(function(x){ delete qcache[x] })
            }

            localStorage.setItem(QKEY, JSON.stringify(qcache))
        }
        catch(e){}
    }, 1000)
}

function qget(k){
    let c = qload()[k]

    return c && c.t + c.l > Date.now() ? c : null
}

function qset(k, v, l){
    qload()[k] = {v: v, t: Date.now(), l: l}

    qsaveLater()
}

function qttl(v){
    return v && v.q === 'TS' ? 3600e3 : (v && v.q ? 6 * 3600e3 : 3 * 3600e3)
}

function qnext(){
    if(active >= MAXQ || !queue.length) return

    let j = queue.shift()
    let x = new XMLHttpRequest()
    let fin = false

    active++

    let end = function(v){
        if(fin) return

        fin = true
        active--

        delete pend[j.k]

        if(v) qset(j.k, v, qttl(v))
        else qset(j.k, {q: null}, 300e3)

        setTimeout(run, 50)
        setTimeout(qnext, 50)
    }

    x.open('GET', j.u, true)
    x.timeout = 30000
    x.onload = function(){
        let v = null

        try{ v = JSON.parse(x.responseText) }
        catch(e){}

        end(v && typeof v === 'object' ? {q: v.q || null, dub: v.dub || null, dubq: v.dubq || null} : null)
    }
    x.onerror = x.ontimeout = function(){ end(null) }
    x.send()
}

function eload(){
    if(ecache) return ecache

    try{ ecache = JSON.parse(localStorage.getItem(EKEY) || '{}') }
    catch(e){ ecache = {} }

    return ecache
}

function esaveLater(){
    clearTimeout(esave)

    esave = setTimeout(function(){
        try{
            let k = Object.keys(ecache)

            if(k.length > 1000){
                k.sort(function(a, b){ return ecache[a].t - ecache[b].t })
                    .slice(0, k.length - 1000)
                    .forEach(function(x){ delete ecache[x] })
            }

            localStorage.setItem(EKEY, JSON.stringify(ecache))
        }
        catch(e){}
    }, 1000)
}

function eget(id){
    let c = eload()[id]

    return c && Date.now() - c.t < ETTL ? c : null
}

function ebuild(d){
    if(d.status === 'Ended' || d.status === 'Canceled') return 'Завершён'

    let l = d.last_episode_to_air

    if(!l) return ''

    let n = 0
    let ss = d.seasons || []

    for(let i = 0; i < ss.length; i++){
        if(ss[i].season_number === l.season_number) n = ss[i].episode_count || 0
    }

    return 'S' + l.season_number + ' · E' + l.episode_number + (n >= l.episode_number ? ' из ' + n : '')
}

function enext(){
    if(eactive >= 3 || !equeue.length) return
    if(!window.Lampa || !window.Lampa.TMDB) return

    let id = equeue.shift()
    let x = new XMLHttpRequest()
    let fin = false

    eactive++

    let end = function(ok, s){
        if(fin) return

        fin = true
        eactive--

        if(ok){
            eload()[id] = {t: Date.now(), s: s}

            delete epend[id]

            esaveLater()
        }
        else setTimeout(function(){ delete epend[id] }, 60000)

        setTimeout(run, 50)
        setTimeout(enext, 50)
    }

    x.open('GET', window.Lampa.TMDB.api('tv/' + id + '?api_key=' + window.Lampa.TMDB.key() + '&language=ru'), true)
    x.timeout = 30000
    x.onload = function(){
        let d = null

        try{ d = JSON.parse(x.responseText) }
        catch(e){}

        if(d && d.id) end(true, ebuild(d))
        else end(false)
    }
    x.onerror = x.ontimeout = function(){ end(false) }
    x.send()
}

function epPaint(el, view, d){
    let c = eget(d.id)

    if(c){
        let ex = view.find('.imdbb-ep')

        if(!c.s) ex.remove()
        else if(ex.length){
            if(ex.text() !== c.s) ex.text(c.s)
        }
        else view.append($('<div class="imdbb-ep"></div>').text(c.s))
    }
    else if(!epend[d.id] && visible(el)){
        epend[d.id] = 1

        equeue.push(d.id)

        enext()
    }
}

function label(v){
    if(!v || !v.q) return ''

    let t = v.q === '1080' ? 'FHD' : v.q

    if(v.q !== 'TS' && v.dub) t += ' ' + DUB

    return t
}

function visible(el){
    let r = el.getBoundingClientRect()

    return r.width > 0 && r.right > -150 && r.left < window.innerWidth + 150 && r.bottom > -250 && r.top < window.innerHeight + 250
}

function run(){
    try{
        let p = proxy()
        let list = document.querySelectorAll('.card')

        for(let i = 0; i < list.length; i++){
            let el = list[i]
            let d = el.card_data || $(el).data('card')

            if(!d || !d.id) continue

            let view = $(el).find('.card__view')

            if(!view.length) continue

            let kind = kindOf(d)
            let key = kind + ':' + d.id
            let r = rates[key]

            if(r && !view.find('.card__vote').length) view.append(badge(r))

            let c = qget(key)

            if(c){
                let t = label(c.v)
                let ex = view.find('.imdbb-q')

                if(!t) ex.remove()
                else if(ex.length){
                    if(ex.attr('data-t') !== t) ex.html(t).attr('data-t', t)
                }
                else view.append($('<div class="imdbb-q" data-t="' + t.replace(/"/g, '&quot;') + '" style="position:absolute;left:.5em;top:.5em;z-index:2;background:rgba(0,0,0,.62);color:#fff;font-weight:700;font-size:.9em;line-height:1.3;padding:.05em .45em;border-radius:.4em;white-space:nowrap">' + t + '</div>'))
            }
            else if(p && !pend[key] && visible(el)){
                pend[key] = 1

                let title = d.title || d.name || ''
                let orig = d.original_title || d.original_name || ''
                let year = ((d.release_date || d.first_air_date || '') + '').slice(0, 4)

                queue.push({k: key, u: p + '?title=' + encodeURIComponent(title) + '&year=' + year + '&orig=' + encodeURIComponent(orig) + '&kind=' + kind})

                qnext()
            }

            if(kind === 'tv') epPaint(el, view, d)

            lgPaint(el, view, d, kind)
        }

        let types = document.querySelectorAll('.card__type')

        for(let i = 0; i < types.length; i++){
            if(types[i].textContent.trim() === 'TV') types[i].textContent = 'Сериал'
        }
    }
    catch(e){}
}

const LKEY = 'imdbb_lg1'
const LTTL = 7 * 864e5
const LTTL1 = 864e5
let lcache = null
let lsave = null
let lq = []
let lact = 0
const lpend = {}

function lload(){
    if(lcache) return lcache

    try{ lcache = JSON.parse(localStorage.getItem(LKEY) || '{}') }
    catch(e){ lcache = {} }

    return lcache
}

function lsaveLater(){
    clearTimeout(lsave)

    lsave = setTimeout(function(){
        try{
            let k = Object.keys(lcache)

            if(k.length > 1500){
                k.sort(function(a, b){ return lcache[a].t - lcache[b].t })
                    .slice(0, k.length - 1500)
                    .forEach(function(x){ delete lcache[x] })
            }

            localStorage.setItem(LKEY, JSON.stringify(lcache))
        }
        catch(e){}
    }, 1000)
}

function lget(k){
    let c = lload()[k]

    return c && c.t + (c.l === 'ru' ? LTTL : LTTL1) > Date.now() ? c : null
}

function lgMode(){
    let m = 'a'

    try{ m = window.Lampa.Storage.get('imdbb_logo_mode', 'a') }
    catch(e){}

    ;['a', 'b', 'c'].forEach(function(x){ document.body.classList.toggle('imdbb-lg-' + x, m === x) })

    return m
}

function lnext(){
    if(lact >= 3 || !lq.length) return

    let j = lq.shift()
    let L = window.Lampa
    let lang = L.Storage.get('language', 'ru')
    let x = new XMLHttpRequest()

    lact++

    let done = function(p, bad, l){
        lact--

        delete lpend[j.k]

        lload()[j.k] = {p: p, t: bad ? Date.now() - LTTL1 + 300e3 : Date.now(), l: l}

        lsaveLater()

        setTimeout(run, 50)
        setTimeout(lnext, 50)
    }

    x.open('GET', L.TMDB.api(j.kind + '/' + j.id + '/images?api_key=' + L.TMDB.key() + '&include_image_language=' + lang + ',en,null'), true)
    x.timeout = 15000
    x.onload = function(){
        let p = ''

        try{
            let all = JSON.parse(x.responseText).logos || []
            let pick = all.filter(function(a){ return a.iso_639_1 === lang })[0] || all.filter(function(a){ return a.iso_639_1 === 'en' })[0] || all[0]

            if(pick && pick.file_path){ p = pick.file_path.replace('.svg', '.png'); x.__imdbbLl = pick.iso_639_1 || '' }
        }
        catch(e){}

        done(p, false, x.__imdbbLl)
    }
    x.onerror = x.ontimeout = function(){ done('', true) }
    x.send()
}

function lgPaint(el, view, d, kind){
    let m = lgMode()
    let ex = view.find('.imdbb-lgw')

    let ok = $(el).closest('.imdbb-home, .imdbb-prow').length || $(el).hasClass('imdbb-wc') || ($(el).hasClass('card--wide') && $(el).closest('.imdbb-nodescr').length)

    if(m === 'off' || !ok){
        $(el).removeClass('imdbb-lgd')
        ex.remove()
        return
    }

    let k = kind + ':' + d.id
    let c = lget(k)

    if(!c){
        if(!lpend[k] && visible(el)){
            lpend[k] = 1
            lq.push({k: k, kind: kind, id: d.id})
            lnext()
        }

        return
    }

    let name = d.title || d.name || ''
    let sig = c.p || ('T:' + name)

    $(el).addClass('imdbb-lgd')

    if(ex.length && ex.attr('data-s') === sig) return

    ex.remove()

    let w = $('<div class="imdbb-lgw"></div>').attr('data-s', sig)

    if(c.p){ let li = $('<img class="imdbb-lgi">').attr('src', window.Lampa.TMDB.image('t/p/w300' + c.p)); w.append(li); if(window.__imdbbLgDark) window.__imdbbLgDark.watch(li[0]) }
    else w.append($('<span class="imdbb-lgt"></span>').text(name))

    view.append(w)
}

function schedule(){
    clearTimeout(timer)

    timer = setTimeout(run, 250)
}

function start(){
    if(started) return

    started = true

    css()

    try{ new MutationObserver(schedule).observe(document.body, {childList: true, subtree: true}) }
    catch(e){}

    setInterval(run, 2000)

    schedule()
}

export function qcached(m){
    if(!m || !m.id) return null

    let c = qget(kindOf(m) + ':' + m.id)

    return c && c.v && c.v.q ? c.v.q : null
}

export function qlabel(m){
    if(!m || !m.id) return ''

    let c = qget(kindOf(m) + ':' + m.id)

    return c && c.v ? label(c.v) : ''
}

function mlabels(v){
    if(!v || !v.q) return []

    let out = [v.q === '1080' ? 'FHD' : v.q]

    if(v.q === 'TS' || !v.dub) return out

    let dq = v.dubq && typeof v.dubq === 'object' ? v.dubq : null
    let has = function(k){
        let e = dq ? dq[k] : null

        return e && (typeof e !== 'object' || Object.keys(e).length) ? true : false
    }

    out.push(dq && v.q === '4K' && !has('4K') && has('1080') ? 'Дубляж FHD' : 'Дубляж')

    return out
}

window.__imdbbQl = mlabels

window.__imdbbQm = function(m){
    if(!document.body.classList.contains('imdbb-compact') || !m || !m.id) return []

    let c = qget(kindOf(m) + ':' + m.id)

    return c && c.v ? mlabels(c.v) : []
}

export function lgcached(m){
    if(!m || !m.id) return null

    return lget(kindOf(m) + ':' + m.id)
}

export function lgput(m, p, l){
    if(!m || !m.id) return

    let k = kindOf(m) + ':' + m.id

    let e0 = lget(k)

    if(e0 && (e0.l !== undefined || l === undefined)) return

    lload()[k] = {p: p || '', t: Date.now(), l: l}

    lsaveLater()
}

export default {
    onCreate: function(){
        start()

        if(this.data.cub_hundred_fire){
            let vote = parseFloat((this.data.cub_hundred_rating || this.data.vote_average || 0) + '').toFixed(1)

            if(vote > 0){
                this.html.find('.card__view').append(Template.elem('div', {class: 'card__vote', text: Utils.bigNumberToShort(this.data.cub_hundred_fire)}))
            }

            return
        }

        let key = kindOf(this.data) + ':' + this.data.id

        IMDb.rating(this.data, function(r){
            r = parseFloat(r)

            if(!(r > 0)) return

            rates[key] = r

            schedule()
        })
    }
}