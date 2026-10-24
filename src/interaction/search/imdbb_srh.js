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

export default {build, clean, update}
