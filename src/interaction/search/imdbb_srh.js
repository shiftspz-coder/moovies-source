import ImdbbHome from '../items/main/imdbb_home'

let S = {layer: null, inner: null, up: null}

function imdbbSrhDbg(){
    try{
        if(!S.layer) return
        let q = function(r, x){ return r.querySelector(x) }
        let f = function(e){ if(!e) return 'нет'; let b = e.getBoundingClientRect(); return Math.round(b.top) + '..' + Math.round(b.bottom) + ' h' + Math.round(b.height) + ' x' + Math.round(b.left) + '..' + Math.round(b.right) }
        let L = []
        L.push('экран ' + innerWidth + 'x' + innerHeight + ' html ' + getComputedStyle(document.documentElement).fontSize + ' слой ' + getComputedStyle(S.layer).fontSize)
        L.push('слой ' + f(S.layer))
        L.push('scroll ' + f(q(S.layer, '.scroll')))
        L.push('in ' + f(S.inner) + ' tr ' + (S.inner ? S.inner.style.transform : ''))
        L.push('line ' + f(q(S.layer, '.items-line')))
        let c = q(S.layer, '.card')
        L.push('card ' + f(c))
        if(c) L.push('низ карточки до низа экрана: ' + Math.round(innerHeight - c.getBoundingClientRect().bottom))
        let all = document.body.querySelectorAll('*'), sus = []
        for(let i = 0; i < all.length; i++){
            let e = all[i], b = e.getBoundingClientRect()
            if(b.width > 2 && b.width < 80 && b.height > 0 && b.height < 14 && b.left < innerWidth * 0.15 && b.top > innerHeight * 0.8){
                let cn = e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className
                sus.push(e.tagName.toLowerCase() + '.' + String(cn).slice(0, 40) + ' ' + f(e))
            }
        }
        L.push('угол: ' + (sus.length ? sus.length : 'ничего'))
        for(let j = 0; j < sus.length && j < 5; j++) L.push(sus[j])
        let o = document.getElementById('imdbb-srh-dbg')
        if(!o){
            o = document.createElement('div')
            o.id = 'imdbb-srh-dbg'
            o.style.cssText = 'position:fixed;top:12%;right:1%;max-width:62%;z-index:99999;background:rgba(0,0,0,.88);color:#fff;font:20px/1.3 monospace;padding:8px 12px;white-space:pre-wrap;word-break:break-all'
            document.body.appendChild(o)
        }
        o.textContent = L.join('\n')
        clearTimeout(window.__imdbbSrhDbgT)
        window.__imdbbSrhDbgT = setTimeout(function(){ try{ o.parentNode && o.parentNode.removeChild(o) }catch(e){} }, 25000)
    }
    catch(e){}
}

function clean(){
    try{ if(S.layer && S.layer.parentNode) S.layer.parentNode.removeChild(S.layer) }catch(e){}
    S.layer = null
    S.inner = null
    S.up = null
    window.__imdbbSrhUpd = null
}

function update(card, d){
    try{
        if(!S.layer || !d) return
        if(d.media_type === 'person' || d.profile_path || d.known_for) return
        if(S.up && S.up.onActive) S.up.onActive(card, d)
        clearTimeout(window.__imdbbSrhDbgQ); window.__imdbbSrhDbgQ = setTimeout(imdbbSrhDbg, 700)
        let el = card && card.render ? card.render(true) : null
        let ln = el && el.closest ? el.closest('.items-line') : null
        if(ln && S.inner) S.inner.style.transform = 'translateY(' + (-ln.offsetTop) + 'px)'
    }
    catch(e){}
}

function build(html, sources){
    try{
        clean()
        if(!document.body.classList.contains('imdbb-search-wide')) return false
        let host = html && (html[0] || html)
        if(!host || !host.insertBefore) return false
        let layer = document.createElement('div')
        layer.className = 'imdbb-srh-layer'
        let up = null
        let fake = {use: function(o){ up = o }}
        let main = {object: {component: 'category'}, html: layer, use: function(o){ try{ if(o && o.onInstance) o.onInstance(fake) }catch(e){} }}
        ImdbbHome(main)
        if(!layer.classList.contains('imdbb-home') || !up) return false
        let sc = document.createElement('div')
        sc.className = 'scroll'
        let inner = document.createElement('div')
        inner.className = 'imdbb-srh-in'
        sc.appendChild(inner)
        layer.appendChild(sc)
        host.insertBefore(layer, host.firstChild)
        let rr = sources.render(true)
        inner.appendChild(rr && rr.nodeType ? rr : rr[0])
        S.layer = layer
        S.inner = inner
        S.up = up
        window.__imdbbSrhUpd = update
        setTimeout(imdbbSrhDbg, 1500)
        return true
    }
    catch(e){ return false }
}


function imdbbSrhDbg2(){
    try{
        var W = innerWidth, H = innerHeight, L = []
        var f = function(e){ if(!e) return 'нет'; var b = e.getBoundingClientRect(); return Math.round(b.top) + '..' + Math.round(b.bottom) + ' h' + Math.round(b.height) + ' x' + Math.round(b.left) + '..' + Math.round(b.right) }
        var nm = function(e){ var c = e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className; return e.tagName.toLowerCase() + '.' + String(c || '').slice(0, 36) }
        var search = document.body.classList.contains('search--open')
        var sig = ''
        if(search){
            if(!S.layer) return
            var c0 = S.layer.querySelector('.card.focus') || S.layer.querySelector('.card')
            sig = 'S' + f(c0)
            L.push('ПОИСК угол, экран ' + W + 'x' + H)
            var seen = {}
            var xs = [4, 20, 36, 52, 68, 84, 100], ys = [H - 60, H - 40, H - 26, H - 12]
            for(var i = 0; i < xs.length; i++) for(var j = 0; j < ys.length; j++){
                var e = document.elementFromPoint(xs[i], ys[j])
                if(e){ var k = nm(e); if(!seen[k]){ seen[k] = 1; L.push('pt ' + xs[i] + ',' + ys[j] + ' ' + k) } }
            }
            var all = document.body.querySelectorAll('*'), n = 0
            for(var q = 0; q < all.length && n < 8; q++){
                var el = all[q], b = el.getBoundingClientRect()
                if(b.width <= 0 || b.height <= 0 || b.left > 140 || b.bottom < H - 90 || b.top > H) continue
                var cs = getComputedStyle(el), ps = ['::before', '::after']
                for(var z = 0; z < 2; z++){
                    var st = getComputedStyle(el, ps[z])
                    if(st.content && st.content !== 'none' && st.content !== 'normal' && st.display !== 'none'){ L.push('ps ' + nm(el) + ps[z] + ' w' + st.width + ' h' + st.height + ' bg ' + st.backgroundColor + ' ' + f(el)); n++ }
                }
                var m = /rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/.exec(cs.backgroundColor)
                if(m && (m[4] === undefined || +m[4] > 0.4) && +m[1] > 200 && b.width < 100 && b.height < 16){ L.push('bg ' + nm(el) + ' ' + f(el) + ' ' + cs.backgroundColor); n++ }
            }
        }
        else{
            var h = document.querySelector('.imdbb-home:not(.imdbb-srh-layer)')
            if(!h || !h.offsetParent) return
            var c = h.querySelector('.card.focus') || h.querySelector('.card')
            sig = 'H' + f(c)
            L.push('ГЛАВНАЯ экран ' + W + 'x' + H + ' слой ' + getComputedStyle(h).fontSize)
            L.push('home ' + f(h))
            L.push('scroll ' + f(h.querySelector('.scroll')))
            L.push('line ' + f(h.querySelector('.items-line')))
            L.push('card ' + f(c))
            if(c) L.push('низ карточки до низа экрана: ' + Math.round(H - c.getBoundingClientRect().bottom))
        }
        if(sig === window.__imdbbSrhSig2 && document.getElementById('imdbb-srh-dbg2')) return
        window.__imdbbSrhSig2 = sig
        var o = document.getElementById('imdbb-srh-dbg2')
        if(!o){
            o = document.createElement('div')
            o.id = 'imdbb-srh-dbg2'
            o.style.cssText = 'position:fixed;top:30%;right:1%;max-width:70%;z-index:99999;background:rgba(0,0,0,.88);color:#fff;font:16px/1.25 monospace;padding:6px 10px;white-space:pre-wrap;word-break:break-all'
            document.body.appendChild(o)
        }
        o.textContent = L.join('\n')
        clearTimeout(window.__imdbbSrhDbgT2)
        window.__imdbbSrhDbgT2 = setTimeout(function(){ try{ o.parentNode && o.parentNode.removeChild(o) }catch(e){} }, 25000)
    }
    catch(e){}
}
setInterval(imdbbSrhDbg2, 2000)

export default {build, clean, update}
