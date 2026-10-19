const KEY_ON = 'imdbb_snow'
const KEY_KIND = 'imdbb_snow_kind'
const GL = ['\u2744\uFE0E', '\u2745\uFE0E', '\u2746\uFE0E']

const PRESETS = {
    storm: {k: 'dot', n: 100, a: 1, b: 3, v1: 70, v2: 130, wind: 60, sway: 8},
    fluff: {k: 'dot', n: 70, a: 1, b: 2.2, v1: 12, v2: 28, wind: 6, sway: 10},
    flakes: {k: 'soft', n: 34, a: 2.5, b: 5, v1: 25, v2: 50, wind: 10, sway: 18},
    glyphs: {k: 'glyph', n: 22, a: 12, b: 24, v1: 18, v2: 40, wind: 8, sway: 16, rot: 0.6, col: '255,255,255', ch: [GL[0]]},
    crystals: {k: 'glyph', n: 30, a: 9, b: 20, v1: 22, v2: 48, wind: 12, sway: 14, rot: 1.4, col: '190,225,255', ch: GL},
    mix: {k: 'mix', n: 64, a: 1, b: 2.6, v1: 16, v2: 40, wind: 8, sway: 12, rot: 0.8, col: '255,255,255', ch: [GL[0], GL[1]]}
}

let cv = null
let ctx = null
let cur = null
let fl = []
let W = 0
let H = 0
let sz = 1
let vs = 1
let last = 0
let chk = 0
let blocked = false
let raf = 0
let timer = 0
let rt = 0

function L(){
    return window.Lampa
}

function flag(key, def){
    let v = L().Storage.get(key, def)

    return v === true || v === 'true'
}

function rnd(a, b){
    return a + Math.random() * (b - a)
}

function playerOpen(){
    try{
        let P = L().Player

        if(P && typeof P.opened === 'function') return Boolean(P.opened())
    }
    catch(e){}

    let el = document.querySelector('.player')

    return Boolean(el && el.offsetWidth > 0 && el.offsetHeight > 0)
}

function ensure(){
    if(cv) return

    cv = document.createElement('canvas')
    cv.id = 'imdbb-snow'
    cv.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:9000;display:none'
    document.body.appendChild(cv)
    ctx = cv.getContext('2d')
}

function resize(){
    W = window.innerWidth || 1280
    H = window.innerHeight || 720

    let q = W > 1280 ? 1280 / W : 1

    cv.width = Math.round(W * q)
    cv.height = Math.round(H * q)
    ctx.setTransform(q, 0, 0, q, 0, 0)

    sz = Math.max(1, W / 900)
    vs = Math.max(1, H / 300)
}

function build(){
    let p = cur
    let mult = Math.min(p.k === 'dot' || p.k === 'soft' ? 3 : 2, Math.max(1, W / 700))
    let n = Math.round(p.n * mult)

    fl = []

    for(let i = 0; i < n; i++){
        let r = rnd(p.a, p.b)
        let k = (r - p.a) / (p.b - p.a + 0.001)
        let ch = null
        let fs = 0

        if(p.k === 'glyph'){
            ch = p.ch[i % p.ch.length]
            fs = r
        }

        if(p.k === 'mix' && i % 5 === 0){
            ch = p.ch[(i / 5 | 0) % p.ch.length]
            fs = rnd(11, 17)
        }

        fl.push({x: rnd(0, W), y: rnd(0, H), r: r, v: p.v1 + (p.v2 - p.v1) * k, ph: rnd(0, 6.28), al: 0.45 + 0.5 * k, ch: ch, fs: fs, ang: rnd(0, 6.28), rs: rnd(-1, 1) * (p.rot || 0)})
    }
}

function loop(ts){
    raf = 0

    if(!cur) return

    if(ts - chk > 500){
        chk = ts
        blocked = document.hidden || playerOpen()
        cv.style.display = blocked ? 'none' : 'block'
    }

    if(blocked){
        timer = setTimeout(function(){
            timer = 0
            raf = requestAnimationFrame(loop)
        }, 500)

        return
    }

    raf = requestAnimationFrame(loop)

    if(ts - last < 33) return

    let dt = Math.min((ts - last) / 1000, 0.1)
    let t = ts / 1000

    last = ts

    ctx.clearRect(0, 0, W, H)

    for(let i = 0; i < fl.length; i++){
        let f = fl[i]

        f.y += f.v * vs * dt
        f.x += (cur.wind * vs * (f.r / cur.b) + Math.sin(t * 0.9 + f.ph) * cur.sway * sz) * dt

        if(f.y > H + 40) {
            f.y = -40
            f.x = rnd(0, W)
        }

        if(f.x > W + 40) f.x = -40
        if(f.x < -40) f.x = W + 40

        if(f.ch){
            f.ang += f.rs * dt

            ctx.save()
            ctx.translate(f.x, f.y)
            ctx.rotate(f.ang)
            ctx.fillStyle = 'rgba(' + (cur.col || '255,255,255') + ',' + f.al + ')'
            ctx.font = Math.round(f.fs * sz) + 'px sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(f.ch, 0, 0)
            ctx.restore()
        }
        else if(cur.k === 'soft'){
            let rr = f.r * sz
            let g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, rr)

            g.addColorStop(0, 'rgba(255,255,255,' + f.al + ')')
            g.addColorStop(1, 'rgba(255,255,255,0)')

            ctx.fillStyle = g
            ctx.beginPath()
            ctx.arc(f.x, f.y, rr, 0, 6.283)
            ctx.fill()
        }
        else{
            ctx.fillStyle = 'rgba(255,255,255,' + f.al + ')'
            ctx.beginPath()
            ctx.arc(f.x, f.y, f.r * sz, 0, 6.283)
            ctx.fill()
        }
    }
}

function start(){
    if(raf || timer) return

    last = 0
    chk = 0
    raf = requestAnimationFrame(loop)
}

function stop(){
    cur = null

    if(raf) cancelAnimationFrame(raf)
    if(timer) clearTimeout(timer)

    raf = 0
    timer = 0

    if(cv) cv.style.display = 'none'
}

function apply(){
    try{
        if(!flag(KEY_ON, 'false')) return stop()

        let kind = String(L().Storage.get(KEY_KIND, 'storm'))

        if(!PRESETS[kind]) kind = 'storm'

        ensure()
        resize()

        cur = PRESETS[kind]

        build()

        blocked = false
        cv.style.display = 'block'

        start()
    }
    catch(e){}
}

function init(){
    let Lp = window.Lampa

    if(!Lp) return

    try{
        Lp.SettingsApi.addParam({
            component: 'imdbb',
            param: {name: KEY_ON, type: 'trigger', default: false},
            field: {name: 'Снег', description: 'Падающий снег поверх интерфейса. Во время просмотра видео отключается'},
            onChange: function(){ setTimeout(apply, 60) }
        })

        Lp.SettingsApi.addParam({
            component: 'imdbb',
            param: {
                name: KEY_KIND,
                type: 'select',
                values: {storm: 'Метель', fluff: 'Пух', flakes: 'Хлопья', glyphs: '❄ Крупные', crystals: '❄ Кристаллы', mix: '❄ Микс'},
                default: 'storm'
            },
            field: {name: 'Вид снега', description: 'Работает, когда снег включён'},
            onChange: function(){ setTimeout(apply, 60) }
        })

        Lp.SettingsApi.addParam({
            component: 'imdbb',
            param: {name: 'imdbb_kp_both', type: 'trigger', default: false},
            field: {name: 'Рейтинг Кинопоиска рядом с IMDb', description: 'Показывает оценку Кинопоиска справа от IMDb на главной и в карточке. Выключено: КП только вместо IMDb у русских фильмов'}
        })

        Lp.SettingsApi.addParam({
            component: 'imdbb',
            param: {name: 'imdbb_dim_off', type: 'trigger', default: false},
            field: {name: 'Убрать затемнение фона', description: 'Полностью убирает затемнение фона везде: на главной, в рядах и в карточке'}
        })

        Lp.SettingsApi.addParam({
            component: 'imdbb',
            param: {name: 'imdbb_dim_main', type: 'select', values: {'0': 'Нет', '25': '25%', '50': '50%', '75': '75%', '100': 'Стандартное'}, default: '100'},
            field: {name: 'Затемнение: главная и ряды', description: 'Не действует, если включено «Убрать затемнение фона»'}
        })

        Lp.SettingsApi.addParam({
            component: 'imdbb',
            param: {name: 'imdbb_dim_card', type: 'select', values: {'0': 'Нет', '25': '25%', '50': '50%', '75': '75%', '100': 'Стандартное'}, default: '0'},
            field: {name: 'Затемнение: карточка', description: 'Не действует, если включено «Убрать затемнение фона»'}
        })

        window.__imdbbProbe = 3
        window.__imdbbProbeV = 'pv3x'
        let aviTracks = function(b){
            let u = new Uint8Array(b), n = u.length, out = {a: [], v: 0, s: 0, ok: false}, cur = null
            let s4 = function(p){ return String.fromCharCode(u[p], u[p + 1], u[p + 2], u[p + 3]) }
            let l32 = function(p){ return u[p] + u[p + 1] * 256 + u[p + 2] * 65536 + u[p + 3] * 16777216 }
            let l16 = function(p){ return u[p] + u[p + 1] * 256 }
            let walk = function(p, end){
                while(p + 8 <= end && p + 8 <= n){
                    let id = s4(p), sz = l32(p + 4), d = p + 8
                    if(id === 'LIST'){
                        let lt = s4(d)
                        if(lt === 'movi') return
                        if(lt === 'hdrl' || lt === 'strl'){ if(lt === 'hdrl') out.ok = true; walk(d + 4, Math.min(d + sz, end)) }
                    }
                    else if(id === 'strh'){
                        let ty = s4(d)
                        if(ty === 'vids'){ out.v++; cur = null }
                        else if(ty === 'auds'){ cur = {num: out.a.length + 1}; out.a.push(cur) }
                        else cur = null
                    }
                    else if(id === 'strf' && cur){ cur.codec = '0x' + l16(d).toString(16); cur.ch = l16(d + 2) }
                    else if(id === 'strn' && cur){ let s = ''; for(let i = d; i < d + sz && i < n && u[i]; i++) s += String.fromCharCode(u[i]); cur.name = s }
                    p = d + sz + (sz & 1)
                }
            }
            walk(12, n)
            return out
        }
        let mp4Tracks = function(b){
            let u = new Uint8Array(b), n = u.length, out = {a: [], v: 0, s: 0, ok: false}, cur = null
            let s4 = function(p){ return String.fromCharCode(u[p], u[p + 1], u[p + 2], u[p + 3]) }
            let b32 = function(p){ return ((u[p] * 256 + u[p + 1]) * 256 + u[p + 2]) * 256 + u[p + 3] }
            let b16 = function(p){ return u[p] * 256 + u[p + 1] }
            let fin = function(){
                if(!cur) return
                if(cur.k === 'vide') out.v++
                else if(cur.k === 'soun'){ cur.num = out.a.length + 1; out.a.push(cur) }
                else if(cur.k === 'sbtl' || cur.k === 'text' || cur.k === 'subt') out.s++
                cur = null
            }
            let walk = function(p, end){
                while(p + 8 <= end && p + 8 <= n){
                    let sz = b32(p), t = s4(p + 4), d = p + 8
                    if(sz === 1){ sz = b32(p + 8) * 4294967296 + b32(p + 12); d = p + 16 }
                    else if(sz === 0) sz = n - p
                    if(sz < 8) break
                    let e = Math.min(p + sz, end)
                    if(t === 'moov'){ out.ok = true; walk(d, e) }
                    else if(t === 'trak'){ cur = {k: ''}; walk(d, e); fin() }
                    else if((t === 'mdia' || t === 'minf' || t === 'stbl') && cur) walk(d, e)
                    else if(t === 'mdhd' && cur){
                        let l = b16(d + (u[d] === 1 ? 32 : 20))
                        cur.lang = String.fromCharCode(((l >> 10) & 31) + 96, ((l >> 5) & 31) + 96, (l & 31) + 96)
                    }
                    else if(t === 'hdlr' && cur){
                        cur.k = s4(d + 8)
                        let s = ''; for(let i = d + 24; i < e && u[i]; i++) s += String.fromCharCode(u[i])
                        try{ cur.name = decodeURIComponent(escape(s)) }catch(x){ cur.name = s }
                    }
                    else if(t === 'stsd' && cur){ cur.codec = s4(d + 12); cur.ch = b16(d + 32) }
                    p += sz
                }
            }
            walk(0, n)
            return out
        }
        let sniffTracks = function(b){
            let u = new Uint8Array(b)
            let s4 = function(p){ return String.fromCharCode(u[p], u[p + 1], u[p + 2], u[p + 3]) }
            if(u[0] === 0x1a && u[1] === 0x45 && u[2] === 0xdf && u[3] === 0xa3) return mkvTracks(b)
            if(s4(0) === 'RIFF' && s4(8) === 'AVI ') return aviTracks(b)
            if(s4(4) === 'ftyp') return mp4Tracks(b)
            return {ok: false, a: [], v: 0, s: 0}
        }
        let mkvTracks = function(buf){
            let u = new Uint8Array(buf), n = u.length, out = {a: [], v: 0, s: 0, ok: false}
            let rid = function(p){
                let b = u[p]; if(b === undefined) return null
                let l = 1, m = 0x80
                while(l <= 4 && !(b & m)){ l++; m = m >> 1 }
                if(l > 4) return null
                let v = 0
                for(let i = 0; i < l; i++){ if(u[p + i] === undefined) return null; v = v * 256 + u[p + i] }
                return {v: v, l: l}
            }
            let rsz = function(p){
                let b = u[p]; if(b === undefined) return null
                let l = 1, m = 0x80
                while(l <= 8 && !(b & m)){ l++; m = m >> 1 }
                if(l > 8) return null
                let v = b & (m - 1), all = (v === m - 1)
                for(let i = 1; i < l; i++){ let c = u[p + i]; if(c === undefined) return null; if(c !== 255) all = false; v = v * 256 + c }
                return {v: all ? -1 : v, l: l}
            }
            let uint = function(a, b){ let v = 0; for(let i = a; i < b; i++) v = v * 256 + u[i]; return v }
            let str = function(a, b){ let s = ''; for(let i = a; i < b && u[i]; i++) s += String.fromCharCode(u[i]); return s }
            let utf = function(a, b){ try{ return decodeURIComponent(escape(str(a, b))) }catch(e){ return str(a, b) } }
            let entry = function(a, b){
                let t = {}, p = a
                while(p < b){
                    let id = rid(p); if(!id) break
                    let sz = rsz(p + id.l); if(!sz || sz.v < 0) break
                    let ds = p + id.l + sz.l, de = Math.min(ds + sz.v, b)
                    if(id.v === 0xD7) t.num = uint(ds, de)
                    else if(id.v === 0x83) t.type = uint(ds, de)
                    else if(id.v === 0x86) t.codec = str(ds, de)
                    else if(id.v === 0x22B59C) t.lang = str(ds, de)
                    else if(id.v === 0x22B59D) t.bcp = str(ds, de)
                    else if(id.v === 0x536E) t.name = utf(ds, de)
                    else if(id.v === 0xE1){
                        let q = ds
                        while(q < de){
                            let i2 = rid(q); if(!i2) break
                            let s2 = rsz(q + i2.l); if(!s2 || s2.v < 0) break
                            let d2 = q + i2.l + s2.l
                            if(i2.v === 0x9F) t.ch = uint(d2, Math.min(d2 + s2.v, de))
                            q = d2 + s2.v
                        }
                    }
                    p = ds + sz.v
                }
                return t
            }
            let p = 0
            while(p < n){
                let id = rid(p); if(!id) break
                let sz = rsz(p + id.l); if(!sz) break
                let ds = p + id.l + sz.l
                if(id.v === 0x18538067){ p = ds; continue }
                if(id.v === 0x1F43B675) break
                if(id.v === 0x1654AE6B){
                    out.ok = true
                    let end = sz.v < 0 ? n : Math.min(ds + sz.v, n), q = ds
                    while(q < end){
                        let i2 = rid(q); if(!i2) break
                        let s2 = rsz(q + i2.l); if(!s2 || s2.v < 0) break
                        let d2 = q + i2.l + s2.l, e2 = Math.min(d2 + s2.v, end)
                        if(i2.v === 0xAE){
                            let t = entry(d2, e2)
                            if(t.type === 2) out.a.push(t)
                            else if(t.type === 1) out.v++
                            else if(t.type === 17) out.s++
                        }
                        q = d2 + s2.v
                    }
                    break
                }
                if(sz.v < 0) break
                p = ds + sz.v
            }
            return out
        }
        let probeHead = function(url, cb){
            let fin = false
            let once = function(a, b){ if(fin) return; fin = true; clearTimeout(tm); cb(a, b) }
            let ctl = window.AbortController ? new AbortController() : null
            let tm = setTimeout(function(){ if(ctl) ctl.abort(); once(null, 'timeout 90 c') }, 90000)
            fetch(url, {headers: {Range: 'bytes=0-'}, signal: ctl ? ctl.signal : undefined}).then(function(r){
                if(!r.body || !r.body.getReader) return once(null, 'нет потокового чтения, статус ' + r.status)
                let rd = r.body.getReader(), chunks = [], got = 0, LIM = 1048576
                let step = function(){
                    rd.read().then(function(x){
                        if(x.value){ chunks.push(x.value); got += x.value.length }
                        if(x.done || got >= LIM){
                            try{ rd.cancel() }catch(e){}
                            let all = new Uint8Array(got), o = 0
                            chunks.forEach(function(c){ all.set(c, o); o += c.length })
                            once(all.buffer, r.status)
                        } else step()
                    }).catch(function(e){ once(null, String(e)) })
                }
                step()
            }).catch(function(e){ once(null, String(e)) })
        }
        let probeRun = function(){
            let box = document.createElement('div')
            box.style.cssText = 'position:fixed;left:2%;top:2%;width:96%;height:96%;z-index:2147483000;background:rgba(0,0,0,.92);color:#fff;font:15px/1.35 monospace;padding:14px;white-space:pre-wrap;overflow:hidden;box-sizing:border-box'
            document.body.appendChild(box)
            let lines = []
            let log = function(s){ lines.push(s); if(lines.length > 40) lines.shift(); box.textContent = lines.join('\n') }
            let done = false
            let onKey = function(e){ if(!done) return; e.stopPropagation(); e.preventDefault(); window.removeEventListener('keydown', onKey, true); if(box.parentNode) box.parentNode.removeChild(box) }
            window.addEventListener('keydown', onKey, true)
            let finish = function(m){ log('\n--- ' + m + ' ---\nНажмите любую кнопку пульта, чтобы закрыть'); done = true }
            let preq = function(method, url, body, tmo, cb){
                let x = new XMLHttpRequest()
                x.open(method, url, true)
                x.timeout = tmo
                x.onload = function(){ cb(x.status, x.responseText) }
                x.onerror = function(){ cb(0, 'network error') }
                x.ontimeout = function(){ cb(0, 'timeout') }
                try{ x.send(body) }catch(e){ cb(0, String(e)) }
            }
            let hashes = ['05f389934e08d4d3caddb3fb49e0fdf61d1db8a6', '64098e4bf5458d460dc294c98251913e3bf5200f', '7c1e870a06f29f68573648edd7d097f5c200f58c']
            let base = String(window.Lampa.Storage.get('torrserver_url', '') || 'http://127.0.0.1:8090').replace(/\/+$/, '')
            if(!/^https?:\/\//.test(base)) base = 'http://' + base
            log('Проба озвучек (тест, MKV)\nTorrServer: ' + base)
            let run = function(h, cb){
                let tag = h.slice(0, 8)
                let clean = function(){
                    preq('POST', base + '/torrents', JSON.stringify({action: 'rem', hash: h}), 15000, function(){ log('[' + tag + '] удалена из TorrServer'); cb() })
                }
                let got = function(j){
                    let fs = j.file_stats, pick = null
                    for(let k = 0; k < fs.length; k++){
                        let p = String(fs[k].path || '')
                        if(/\.(mkv|mp4|m4v|avi)$/i.test(p) && (!pick || (fs[k].length || 0) > (pick.length || 0))){ pick = fs[k] }
                    }
                    if(!pick){
                        log('[' + tag + '] файлов: ' + fs.length + ', видео 10-й серии 4 сезона не найдено. Последние:')
                        fs.slice(-10).forEach(function(f){ log('  ' + String(f.path).slice(-75)) })
                        return clean()
                    }
                    let nm = String(pick.path).split('/').pop()
                    log('[' + tag + '] файл id ' + pick.id + ': ' + nm.slice(-60))
                    
                    let t1 = Date.now()
                    probeHead(base + '/stream/' + encodeURIComponent(nm) + '?link=' + h + '&index=' + pick.id + '&play', function(buf, st){
                        if(!buf){ log('[' + tag + '] чтение начала файла: ' + st); return clean() }
                        let u8 = new Uint8Array(buf)
                        let hex = ''; for(let i = 0; i < 12 && i < u8.length; i++) hex += (u8[i] < 16 ? '0' : '') + u8[i].toString(16) + ' '
                        log('[' + tag + '] прочитано ' + u8.length + ' байт за ' + Math.round((Date.now() - t1) / 1000) + ' c, статус ' + st + ', начало ' + hex)
                        let r = sniffTracks(buf)
                        if(!r.ok){ log('[' + tag + '] блок дорожек (Tracks) в этих байтах не найден'); return clean() }
                        log('[' + tag + '] видео: ' + r.v + ', субтитров: ' + r.s + ', аудио: ' + r.a.length)
                        r.a.forEach(function(t){
                            log('  аудио #' + t.num + ' ' + (t.lang || '?') + (t.bcp ? '/' + t.bcp : '') + ' | ' + (t.name || '-') + ' | ' + (t.codec || '') + ' ' + (t.ch || '') + 'ch')
                        })
                        clean()
                    })
                }
                log('\n[' + tag + '] добавляю раздачу')
                preq('POST', base + '/torrents', JSON.stringify({action: 'add', link: 'magnet:?xt=urn:btih:' + h, title: '[PROBE] ted lasso', save_to_db: false}), 70000, function(st, tx){
                    log('[' + tag + '] add: ' + st + ' ' + (st ? '' : tx))
                    if(st === 0 && tx === 'network error') return clean()
                    let t0 = Date.now()
                    let poll = function(){
                        preq('POST', base + '/torrents', JSON.stringify({action: 'get', hash: h}), 8000, function(st2, tx2){
                            let j = null; try{ j = JSON.parse(tx2) }catch(e){}
                            if(j && j.file_stats && j.file_stats.length) got(j)
                            else if(Date.now() - t0 > 60000){ log('[' + tag + '] нет списка файлов за 60 с'); clean() }
                            else setTimeout(poll, 2000)
                        })
                    }
                    poll()
                })
            }
            let next = function(i){ if(i >= hashes.length) return finish('готово'); run(hashes[i], function(){ next(i + 1) }) }
            preq('GET', base + '/echo', null, 5000, function(st, tx){
                log('/echo: ' + st + ' ' + String(tx).slice(0, 60))
                if(st !== 200) return finish('нет связи с TorrServer')
                next(0)
            })
        }

        Lp.SettingsApi.addParam({
            component: 'imdbb',
            param: {name: 'imdbb_probe', type: 'trigger', default: false},
            field: {name: 'Проба озвучек (тест)', description: 'Временный тест: читает дорожки 10-й серии «Теда Лассо» 4 сезона из начала MKV-файла через TorrServer. Включите и ждите результат на экране'},
            onChange: function(){ setTimeout(function(){ try{ if(String(window.Lampa.Storage.get('imdbb_probe', 'false')) === 'true'){ window.Lampa.Storage.set('imdbb_probe', 'false'); probeRun() } }catch(e){} }, 120) }
        })

        let rsApply = function(){ try{ let v = parseInt(window.Lampa.Storage.get('imdbb_rate_style', '1'), 10); if(!(v >= 1 && v <= 20)) v = 1; let cl = document.body && document.body.classList; if(!cl) return; for(let n = 1; n <= 20; n++) cl.remove('imdbb-rs-' + n); cl.add('imdbb-rs-' + v) }catch(e){} }
        rsApply(); setTimeout(rsApply, 800)
        Lp.Listener.follow('app', function(e){ if(e.type === 'ready') rsApply() })

        Lp.SettingsApi.addParam({
            component: 'imdbb',
            param: {name: 'imdbb_rate_style', type: 'select', values: {'1': '1. Кромка слева (как сейчас)', '2': '2. Подчёркивание цветом', '3': '3. Стекло', '4': '4. Одна рамка с разделителем', '5': '5. Кольца', '6': '6. Метка-значок сверху', '7': '7. Шкала под числом', '8': '8. Контурные рамки', '9': '9. Кромка сверху', '10': '10. Минимал: точка и линия', '11': '11. Стекло и точка', '12': '12. Тонкая линия, крупное число', '13': '13. Сплошная заливка', '14': '14. Дуга', '15': '15. Звезда в цвете', '16': '16. Метка вертикально сбоку', '17': '17. Число с /10', '18': '18. Капсула', '19': '19. Общая плашка, двухцветная кромка', '20': '20. Тонированные плашки'}, default: '1'},
            field: {name: 'Вид оценок', description: 'Оформление блока оценок IMDb и КиноПоиск на главной и в карточке'},
            onChange: function(){ rsApply() }
        })

        let bsApply = function(){ try{ let v = String(window.Lampa.Storage.get('imdbb_badge_style', '0')); let cl = document.body && document.body.classList; if(!cl) return; if(v === 'a' || v === 'b' || v === 'c'){ v = 'd'; try{ window.Lampa.Storage.set('imdbb_badge_style', 'd') }catch(e){} } ['a', 'b', 'c', 'd', 'e'].forEach(function(k){ cl.remove('imdbb-bs-' + k) }); if(v === 'd' || v === 'e') cl.add('imdbb-bs-' + v) }catch(e){} }
        bsApply(); setTimeout(bsApply, 800)
        Lp.Listener.follow('app', function(e){ if(e.type === 'ready') bsApply() })

        Lp.SettingsApi.addParam({
            component: 'imdbb',
            param: {name: 'imdbb_badge_style', type: 'select', values: {'0': 'Как сейчас', 'd': 'Тонкая рамка', 'e': 'Мягкая заливка'}, default: '0'},
            field: {name: 'Плашки качества', description: 'Оформление плашек качества, HDR, Dolby Vision, дубляжа и возраста. HDR и Dolby Vision показываются только при выбранном оформлении (не «Как сейчас»)'},
            onChange: function(){ bsApply() }
        })

        Lp.SettingsApi.addParam({
            component: 'imdbb',
            param: {name: 'imdbb_lgbt_block', type: 'trigger', default: false},
            field: {name: 'Блокировка ЛГБТ-контента', description: 'Выключено: все карточки открываются как обычно. Включено: показывается заглушка «Контент ограничен»'}
        })
    }
    catch(e){}

    window.addEventListener('resize', function(){
        if(!cur) return

        clearTimeout(rt)

        rt = setTimeout(function(){
            resize()
            build()
        }, 300)
    })

    if(window.appready) apply()
    else Lp.Listener.follow('app', function(e){ if(e.type === 'ready') apply() })
}

export default {init}
