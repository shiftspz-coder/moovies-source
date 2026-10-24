import ImdbbHome from '../items/main/imdbb_home'

let S = {layer: null, inner: null, up: null}

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
        return true
    }
    catch(e){ return false }
}


function imdbbSrhDbg3(){
    try{
        if(!document.body.classList.contains('search--open')){ window.__imdbbCornDone = 0; return }
        if(window.__imdbbCornDone) return
        window.__imdbbCornDone = 1
        var W = innerWidth, H = innerHeight, L = ['ПОИСК угол 40x30, экран ' + W + 'x' + H], n = 0
        var nm = function(e){ var c = e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className; return e.tagName.toLowerCase() + '.' + String(c || '').slice(0, 30) }
        var all = document.querySelectorAll('html, html *')
        for(var i = 0; i < all.length && n < 14; i++){
            var e = all[i], b = e.getBoundingClientRect()
            if(b.width <= 0 || b.height <= 0 || b.left > 40 || b.right < 0 || b.top > H || b.bottom < H - 30) continue
            var cs = getComputedStyle(e), ps = '', pp = ['::before', '::after']
            for(var z = 0; z < 2; z++){
                var st = getComputedStyle(e, pp[z])
                if(st.content && st.content !== 'none' && st.content !== 'normal' && st.display !== 'none') ps += pp[z] + ' w' + st.width + ' h' + st.height + ' bg' + st.backgroundColor + ' '
            }
            if((b.width > 300 || b.height > 200) && !ps) continue
            L.push(nm(e) + ' ' + Math.round(b.left) + ',' + Math.round(b.top) + ' ' + Math.round(b.width) + 'x' + Math.round(b.height) + ' bg ' + cs.backgroundColor + ' op ' + cs.opacity + ' pe ' + cs.pointerEvents + ' ' + cs.position + (ps ? ' ' + ps : ''))
            n++
        }
        if(!n) L.push('ничего')
        var o = document.getElementById('imdbb-srh-dbg3')
        if(!o){
            o = document.createElement('div')
            o.id = 'imdbb-srh-dbg3'
            o.style.cssText = 'position:fixed;top:30%;right:1%;max-width:75%;z-index:99999;background:rgba(0,0,0,.9);color:#fff;font:15px/1.25 monospace;padding:6px 10px;white-space:pre-wrap;word-break:break-all'
            document.body.appendChild(o)
        }
        o.textContent = L.join('\n')
        clearTimeout(window.__imdbbCornT)
        window.__imdbbCornT = setTimeout(function(){ try{ o.parentNode && o.parentNode.removeChild(o) }catch(e){} }, 30000)
    }
    catch(e){}
}
setInterval(imdbbSrhDbg3, 2000)

export default {build, clean, update}
