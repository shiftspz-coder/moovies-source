import FONT from './imdbb_lgtx_font'

const KEY = 'imdbb_lc1'
let mem = null
let tm = 0
let pend = {}
let fontOn = false

function load(){
    if(mem) return mem
    try{ mem = JSON.parse(localStorage.getItem(KEY) || '{}') || {} }catch(e){ mem = {} }
    return mem
}

function save(){
    clearTimeout(tm)
    tm = setTimeout(function(){
        try{
            let m = load(), ks = Object.keys(m)
            if(ks.length > 800) ks.sort(function(a, b){ return m[a].t - m[b].t }).slice(0, ks.length - 800).forEach(function(k){ delete m[k] })
            localStorage.setItem(KEY, JSON.stringify(m))
        }catch(e){}
    }, 1000)
}

function lang(){
    try{ return String(window.Lampa.Storage.get('language', 'ru') || 'ru') }catch(e){ return 'ru' }
}

function on(){
    try{ let v = window.Lampa.Storage.get('imdbb_logo_tx', 'false'); return v === true || v === 'true' }catch(e){ return false }
}

function fname(s){
    let m = /\/([^\/?#]+)$/.exec(s || '')
    return m ? m[1] : ''
}

function font(){
    if(fontOn) return
    fontOn = true
    try{
        let s = document.createElement('style')
        s.textContent = '@font-face{font-family:"ImdbbCond";font-weight:700;font-style:normal;font-display:swap;src:url(' + FONT + ') format("woff")}'
        document.head.appendChild(s)
    }catch(e){}
}

function measure(src, cb){
    let im = new Image()
    im.onload = function(){
        try{
            if(!im.naturalWidth) return cb('')
            let w = Math.min(48, im.naturalWidth), h = Math.max(1, Math.round(im.naturalHeight * w / im.naturalWidth))
            let c = document.createElement('canvas')
            c.width = w
            c.height = h
            let x = c.getContext('2d')
            x.drawImage(im, 0, 0, w, h)
            let p = x.getImageData(0, 0, w, h).data
            let bins = [], n = 0, ar = 0, ag = 0, ab = 0, i
            for(i = 0; i < 12; i++) bins.push({w: 0, r: 0, g: 0, b: 0})
            for(i = 0; i < p.length; i += 4){
                if(p[i + 3] < 128) continue
                let r = p[i], g = p[i + 1], b = p[i + 2]
                n++
                ar += r
                ag += g
                ab += b
                let mx = Math.max(r, g, b), d = mx - Math.min(r, g, b)
                if(mx < 40 || d < 40) continue
                let hh = mx === r ? ((g - b) / d + 6) % 6 : (mx === g ? (b - r) / d + 2 : (r - g) / d + 4)
                let q = bins[Math.min(11, Math.floor(hh * 2))], wt = d * mx / 255
                q.w += wt
                q.r += r * wt
                q.g += g * wt
                q.b += b * wt
            }
            if(!n) return cb('')
            let best = bins[0]
            bins.forEach(function(q){ if(q.w > best.w) best = q })
            let R, G, B
            if(best.w > n * 12){ R = best.r / best.w; G = best.g / best.w; B = best.b / best.w }
            else { R = ar / n; G = ag / n; B = ab / n }
            let top = Math.max(R, G, B)
            if(top < 8){ R = G = B = 255; top = 255 }
            if(top < 200){ let k = 200 / top; R *= k; G *= k; B *= k }
            cb('rgb(' + Math.min(255, Math.round(R)) + ',' + Math.min(255, Math.round(G)) + ',' + Math.min(255, Math.round(B)) + ')')
        }catch(e){ cb('') }
    }
    im.onerror = function(){ cb('') }
    im.src = src
}

function color(src, cb){
    let k = fname(src)
    if(!k) return cb('')
    let m = load()
    if(m[k] && m[k].c) return cb(m[k].c)
    if(pend[k]){ pend[k].push(cb); return }
    pend[k] = [cb]
    let u = String(src).replace(/^https?:\/\/image\.tmdb\.org\//, location.origin + '/p/3849c2cf/tmdbimg/')
    measure(u, function(c){
        let l = pend[k] || []
        delete pend[k]
        if(c){ m[k] = {c: c, t: Date.now()}; save() }
        l.forEach(function(f){ f(c || '') })
    })
}

function node(title, cls, src){
    font()
    let t = document.createElement('div')
    t.className = 'imdbb-lgtx' + (cls ? ' ' + cls : '')
    t.textContent = title
    color(src, function(c){ if(c) t.style.color = c })
    return t
}

function use(d, logo, pl, title){
    if(!on() || !logo || pl === null || pl === undefined || pl === lang() || !title) return false
    let o = (d && (d.original_title || d.original_name)) || ''
    return title !== o
}

function paint(el, d, title, src){
    let sig = 'TX:' + src + '|' + title
    if(el.getAttribute('data-src') === sig) return
    el.setAttribute('data-src', sig)
    el.innerHTML = ''
    el.appendChild(node(title, '', src))
}

function card(lt, ibh, title, src, done){
    try{
        ibh.find('.imdbb-rutl').remove()
        let hl = ibh.find('.imdbb-hero__logo')[0]
        lt.removeClass('twolines').html('').append(node(title, '', src)).css('visibility', '')
        if(hl){ hl.innerHTML = ''; hl.appendChild(node(title, '', src)) }
    }catch(e){}
    done()
}

function row(w, c, d, name){
    try{
        if(!on() || !c || !c.p || c.l === undefined || c.l === lang()) return false
        let o = (d && (d.original_title || d.original_name)) || ''
        if(!name || name === o) return false
        w.append(node(name, 'imdbb-lgt', window.Lampa.TMDB.image('t/p/w300' + c.p)))
        return true
    }catch(e){ return false }
}

window.__imdbbLgTx = {on: on, use: use, paint: paint, card: card, row: row}
