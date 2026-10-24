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

export default {build, clean, update}
