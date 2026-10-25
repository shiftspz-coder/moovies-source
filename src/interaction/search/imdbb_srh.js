import ImdbbHome from '../items/main/imdbb_home'

let S = {layer: null, inner: null, up: null}

function clean(){
    try{ if(S.layer && S.layer.parentNode) S.layer.parentNode.removeChild(S.layer) }catch(e){}
    try{ if(S.timer) clearInterval(S.timer) }catch(e){}
    S.timer = null
    try{ if(S.t2) clearInterval(S.t2); S.t2 = null; ['line', 'chips', 'three', 'hide', 'cf'].forEach(function(k){ document.body.classList.remove('imdbb-sh-' + k) }) }catch(e){}
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
        window.__imdbbSrhBg = 0
        let hv = 'off'
        try{ hv = window.Lampa.Storage.get('imdbb_srh_hist', 'off') }catch(e){}
        let bcl = document.body.classList
        ;['line', 'chips', 'three', 'hide'].forEach(function(k){ bcl.toggle('imdbb-sh-' + k, hv === k) })
        bcl.remove('imdbb-sh-cf')
        if(hv === 'hide') S.t2 = setInterval(function(){ try{ bcl.toggle('imdbb-sh-cf', !!(S.layer && S.layer.querySelector('.card.focus'))) }catch(e){} }, 200)
        let bgm = 'dark'
        try{ bgm = window.Lampa.Storage.get('imdbb_srh_bg', 'dark') }catch(e){}
        if(bgm === 'dark' || bgm === 'gray'){
            let cv = document.createElement('div')
            cv.className = 'imdbb-srh-empty'
            cv.setAttribute('data-m', bgm)
            cv.innerHTML = '<img src="img/logo.svg" alt="">'
            layer.insertBefore(cv, layer.firstChild)
            window.__imdbbSrhFast = 1; S.timer = setInterval(function(){ try{ if(S.layer) S.layer.classList.toggle('imdbb-srh-has', !!S.layer.querySelector('.card')) }catch(e){} }, 100)
        }
        return true
    }
    catch(e){ return false }
}

export default {build, clean, update}
