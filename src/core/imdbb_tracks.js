import Storage from './storage/storage'

window.__imdbbTrkV = 'trk1x'

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
                    else if(id.v === 0xE0){
                        let q = ds
                        while(q < de){
                            let i2 = rid(q); if(!i2) break
                            let s2 = rsz(q + i2.l); if(!s2 || s2.v < 0) break
                            let d2 = q + i2.l + s2.l
                            if(i2.v === 0xB0) t.w = uint(d2, Math.min(d2 + s2.v, de))
                            else if(i2.v === 0xBA) t.h = uint(d2, Math.min(d2 + s2.v, de))
                            q = d2 + s2.v
                        }
                    }
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
                            else if(t.type === 1){ out.v++; if(!out.w && t.w){ out.w = t.w; out.h = t.h } }
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
            let tm = setTimeout(function(){ if(ctl) ctl.abort(); once(null, 'timeout 45 c') }, 45000)
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

const TKEY = 'imdbb_tr1'
const OKTTL = 7 * 24 * 3600e3
const BADTTL = 30 * 60e3
let tcache = null
let busy = false

function tload(){
    if(tcache) return tcache

    try{ tcache = JSON.parse(localStorage.getItem(TKEY) || '{}') }
    catch(e){ tcache = {} }

    return tcache
}

function tsave(){
    try{
        let k = Object.keys(tcache)

        if(k.length > 400){
            k.sort(function(a, b){ return tcache[a].t - tcache[b].t })
                .slice(0, k.length - 400)
                .forEach(function(x){ delete tcache[x] })
        }

        localStorage.setItem(TKEY, JSON.stringify(tcache))
    }
    catch(e){}
}

function tget(h){
    let e = tload()[h]

    return e && e.t + e.l > Date.now() ? e : null
}

function enabled(){
    try{ return String(Storage.get('imdbb_trk', 'false')) === 'true' }
    catch(e){ return false }
}

function preq(method, url, body, tmo, cb){
    let x = new XMLHttpRequest()

    x.open(method, url, true)
    x.timeout = tmo
    x.onload = function(){ cb(x.status, x.responseText) }
    x.onerror = function(){ cb(0, 'network error') }
    x.ontimeout = function(){ cb(0, 'timeout') }

    try{ x.send(body) }
    catch(e){ cb(0, String(e)) }
}

function tsBase(){
    let u = ''

    try{
        let one = Storage.get('torrserver_url', '') || ''
        let two = Storage.get('torrserver_url_two', '') || ''

        u = Storage.field('torrserver_use_link') == 'two' ? (two || one) : (one || two)
    }
    catch(e){}

    u = String(u || 'http://127.0.0.1:8090').replace(/\/+$/, '')

    if(!/^https?:\/\//.test(u)) u = 'http://' + u

    return u
}

function check(hash, ep, cb){
    let h = String(hash || '').toLowerCase()

    if(!/^[0-9a-f]{40}$/.test(h)) return cb({ok: false, err: 'hash'})

    let base = tsBase()
    let url = base + '/torrents'
    let fin = false
    let added = false

    let rem = function(next){
        preq('POST', url, JSON.stringify({action: 'rem', hash: h}), 15000, function(){ if(next) next() })
    }

    let finish = function(res){
        if(fin) return

        fin = true
        clearTimeout(dl)

        if(added) rem(function(){ cb(res) })
        else cb(res)
    }

    let dl = setTimeout(function(){ finish({ok: false, err: 'timeout'}) }, 60000)

    let want = null

    if(ep && ep.s && ep.e) want = new RegExp('(^|[^0-9a-z])(s0*' + ep.s + '[ ._-]*e0*' + ep.e + '|0*' + ep.s + 'x0*' + ep.e + ')(?![0-9])', 'i')

    let pick = function(fs){
        let best = null, hit = null

        for(let i = 0; i < fs.length; i++){
            let p = String(fs[i].path || '')
            let len = fs[i].length || 0

            if(!/\.(mkv|avi)$/i.test(p)) continue

            if(want && want.test(p) && (!hit || len > (hit.length || 0))) hit = fs[i]
            if(!best || len > (best.length || 0)) best = fs[i]
        }

        return hit || best
    }

    let read = function(fs){
        let f = pick(fs)

        if(!f) return finish({ok: false, err: 'nofile'})

        let nm = String(f.path).split('/').pop()

        probeHead(base + '/stream/' + encodeURIComponent(nm) + '?link=' + h + '&index=' + f.id + '&play', function(buf, st){
            if(fin) return
            if(!buf) return finish({ok: false, err: String(st).slice(0, 40)})

            let r = sniffTracks(buf)

            if(!r.ok) return finish({ok: false, err: 'noparse'})

            let dub = r.a.some(function(t){
                let l = String(t.lang || t.bcp || '')

                return (/^ru/i.test(l) || !l || /^und/i.test(l)) && /дубл|\bdub/i.test(String(t.name || ''))
            })

            finish({ok: true, w: r.w || 0, h: r.h || 0, dub: dub})
        })
    }

    let poll = function(t0){
        preq('POST', url, JSON.stringify({action: 'get', hash: h}), 8000, function(st, tx){
            if(fin) return

            let j = null

            try{ j = JSON.parse(tx) }
            catch(e){}

            if(j && j.file_stats && j.file_stats.length) return read(j.file_stats)
            if(Date.now() - t0 > 45000) return finish({ok: false, err: 'nofiles'})

            setTimeout(function(){ poll(t0) }, 1500)
        })
    }

    preq('POST', url, JSON.stringify({action: 'list'}), 6000, function(st, tx){
        if(fin) return

        let arr = null

        try{ arr = JSON.parse(tx) }
        catch(e){}

        if(st !== 200 || !Array.isArray(arr)) return finish({ok: false, err: 'ts'})

        let had = arr.some(function(t){ return String(t && t.hash || '').toLowerCase() === h })

        if(had) return poll(Date.now())

        added = true

        preq('POST', url, JSON.stringify({action: 'add', link: 'magnet:?xt=urn:btih:' + h, title: '[CHK]', save_to_db: false}), 55000, function(st2, tx2){
            if(fin){ rem(); return }
            if(st2 === 0 && tx2 === 'network error') return finish({ok: false, err: 'add'})

            poll(Date.now())
        })
    })
}

function run(tops, ep, cb){
    if(!enabled() || busy) return cb(false)

    let todo = []

    ;(tops || []).slice(0, 2).forEach(function(t){
        let h = t && t.h ? String(t.h).toLowerCase() : ''

        if(h && !tget(h)) todo.push(h)
    })

    if(!todo.length) return cb(false)

    busy = true

    let next = function(i){
        if(i >= todo.length){ busy = false; return }

        check(todo[i], ep, function(r){
            tload()[todo[i]] = {t: Date.now(), l: r.ok ? OKTTL : BADTTL, ok: !!r.ok, w: r.w || 0, h: r.h || 0, dub: !!r.dub, err: r.err}
            tsave()

            if(r.ok) cb(true)

            next(i + 1)
        })
    }

    next(0)
}

function apply(v){
    if(!enabled() || !v || !v.tops || !v.tops.length || (v.q !== '4K' && v.q !== '1080')) return v

    let rq = 0, dub = false, seen = 0, unk = false

    v.tops.slice(0, 2).forEach(function(t){
        let e = t && t.h ? tget(String(t.h).toLowerCase()) : null

        if(!e || !e.ok) return

        seen++

        if(!e.w) unk = true

        let q = e.w >= 3200 ? 4 : (e.w >= 1800 ? 1 : 0)

        if(q > rq) rq = q
        if(e.dub) dub = true
    })

    if(!seen) return v

    let o = {}

    for(let k in v) o[k] = v[k]

    if(v.q === '4K' && rq === 1 && !unk){ o.q = '1080'; o.hdr = null; o.dv = null }

    if(dub){
        let dq = {}

        if(!o.dub) o.dub = 1

        for(let k in (v.dubq || {})) dq[k] = v.dubq[k]

        if(!dq[o.q]) dq[o.q] = 1

        o.dubq = dq
    }

    return o
}

export default {run: run, apply: apply}
