import Utils from '../../../utils/utils'
const MAP = {US:'США',GB:'Великобритания',RU:'Россия',FR:'Франция',DE:'Германия',JP:'Япония',KR:'Южная Корея',CA:'Канада',CN:'Китай',IN:'Индия',ES:'Испания',IT:'Италия',AU:'Австралия',SE:'Швеция',TR:'Турция',UA:'Украина',BR:'Бразилия',MX:'Мексика',PL:'Польша',DK:'Дания',NO:'Норвегия',IE:'Ирландия',NL:'Нидерланды',BE:'Бельгия',HK:'Гонконг',TH:'Таиланд'}

function esc(s){ return String(s || '').replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] }) }
function kindOf(d){ return d.media_type === 'tv' || (d.name && !d.title) || d.first_air_date ? 'tv' : 'movie' }
function vv(x){ let n = parseFloat(x); return n > 0 ? Math.min(10, n) : 0 }

export const HERO_HTML = '<div class="imdbb-hero__logo"></div><div class="imdbb-hero__tag"></div><div class="imdbb-hero__meta"></div><div class="imdbb-hero__s"></div><div class="imdbb-hero__d"></div><div class="imdbb-hero__st"></div>'

function mg(ps){
    if(!ps.length) return ''
    let r = '', pl = '', tx = [], g = '', sl = ''
    ps.forEach(function(x){
        if(x.indexOf('<span class="imdbb-hero__r"') === 0) r = x
        else if(x.indexOf('<span class="imdbb-hero__q"') === 0 || x.indexOf('<span class="imdbb-hero__c"') === 0) pl += x
        else if(x.indexOf('<span class="imdbb-hero__g"') === 0) g = x
        else if(x.indexOf('<span class="imdbb-hero__sl"') === 0) sl = x
        else tx.push(x.replace(/^<span>/, '').replace(/<\/span>$/, ''))
    })
    if(r){
        let rv = [], rx = /<b>([^<]*)<\/b><i>([^<]*)<\/i>/g, m
        while((m = rx.exec(r))) rv.push('<span class="imdbb-hero__rv' + (m[2] === 'IMDb' ? '' : ' imdbb-hero__rvk') + '"><i>' + (m[2] === 'IMDb' ? 'IMDb' : 'КП') + '</i><b>' + m[1] + '</b></span>')
        let st0 = sl ? sl.replace(/^<span class="imdbb-hero__sl">/, '').replace(/<\/span>$/, '') : ''
        sl = '<span class="imdbb-hero__sl">' + (st0 ? [st0] : []).concat(rv).join('<em class="imdbb-dot">·</em>') + '</span>'
        r = ''
    }
    if(sl && r){ let n = (pl ? 1 : 0) + (tx.length ? 1 : 0) + (g ? 1 : 0) + 1; if(n > 1) r = r.replace('<span class="imdbb-hero__r"', '<span class="imdbb-hero__r" data-rn="' + n + '"') }
    return r + (tx.length ? '<span class="imdbb-hero__tx">' + tx.join('<em class="imdbb-dot">·</em>') + '</span>' : '') + g + sl + (pl ? '<span class="imdbb-hero__pl">' + pl + '</span>' : '')
}

// o: {rate: '7.6' строкой, ql: html значка качества (запасной), ct: возраст}
export function metaHtml(d, info, o){
    let parts = []
    if(o.rate && o.kp2) parts.push('<span class="imdbb-hero__r" data-two="1"><span class="imdbb-hero__rp" style="--v:' + vv(o.rate) + '"><b>' + esc(o.rate) + '</b><i>IMDb</i></span><span class="imdbb-hero__rp imdbb-hero__rk" style="--v:' + vv(o.kp2) + '"><b>' + esc(o.kp2) + '</b><i>КиноПоиск</i></span></span>')
    else if(o.rate) parts.push('<span class="imdbb-hero__r" style="--v:' + vv(o.rate) + '"><b>' + esc(o.rate) + '</b><i>IMDb</i></span>')
    else if(o.kp) parts.push('<span class="imdbb-hero__r" data-kp="1" style="--v:' + vv(o.kp) + '"><b>' + esc(o.kp) + '</b><i>КиноПоиск</i></span>')
    let qm = window.__imdbbQm ? window.__imdbbQm(d) : []
    if(qm.length) qm.forEach(function(x){ parts.push('<span class="imdbb-hero__q" data-b="' + (window.__imdbbBk ? window.__imdbbBk(x) : '') + '">' + x + '</span>') })
    else if(o.ql) (Array.isArray(o.ql) ? o.ql : [o.ql]).forEach(function(x){ parts.push('<span class="imdbb-hero__q" data-qs="1">' + x + '</span>') })
    if(o.ct && !(info && info.genres && info.genres.length)) parts.push('<span class="imdbb-hero__c">' + esc(o.ct) + '</span>')
    let date = (info && (info.release_date || info.first_air_date)) || d.release_date || d.first_air_date || ''
    let dm = date.match(/^(\d{4})-(\d\d)-(\d\d)$/)
    let ds = dm ? dm[3] + '.' + dm[2] + '.' + dm[1] : date.slice(0, 4)
    if(ds) parts.push('<span>' + esc(ds) + '</span>')
    if(info){
        let c = (info.production_countries && info.production_countries[0] && info.production_countries[0].iso_3166_1) || (info.origin_country && info.origin_country[0]) || ''
        if(c) parts.push('<span>' + esc(MAP[c] || c) + '</span>')
        if(info.runtime > 0){ let rm = info.runtime; parts.push('<span>' + ('0' + Math.floor(rm / 60)).slice(-2) + ':' + ('0' + (rm % 60)).slice(-2) + '</span>') }
        let g = (info.genres || []).slice(0, 3).map(function(x){ let n = x.name + ''; return n.charAt(0).toUpperCase() + n.slice(1) }).join(', ')
        if(g) parts.push('<span class="imdbb-hero__g">' + esc((window.__imdbbAgeA = 1) && g + (o.ct ? ' · ' + o.ct : '')) + '</span>')
    }
    let sl0 = subLine(d, info, !!(o.rate && o.kp2))
    if(sl0) parts.push('<span class="imdbb-hero__sl">' + esc(sl0) + '</span>')
    return mg(parts)
}

export function stFill(el, info){
    try{
        if(!el) return
        let L = window.Lampa
        let st = 'p'
        let pcs = (info && info.production_companies) || []
        let key = st + '|' + pcs.map(function(x){ return x.name }).join(',')
        if(el.__imdbbSt === key) return
        el.__imdbbSt = key
        if(st === '0' || !pcs.length){ el.innerHTML = ''; return }
        let h = ''
        pcs.slice(0, 4).forEach(function(x){
            let lp = x.logo_path
            if(lp && st !== 't') h += '<span class="imdbb-st__i"><img decoding="sync" src="' + esc(L.TMDB.image('t/p/w154' + lp)) + '" alt="' + esc(x.name) + '"></span>'
            else h += '<span class="imdbb-st__i imdbb-st__t">' + esc(x.name) + '</span>'
        })
        el.innerHTML = h
        window.__imdbbStW = 1
        try{ Array.prototype.forEach.call(el.querySelectorAll('.imdbb-st__i img'), function(im){ let p = new Image(); p.onload = function(){ try{ let c = document.createElement('canvas'); c.width = c.height = 24; let g = c.getContext('2d'); g.drawImage(p, 0, 0, 24, 24); let dd = g.getImageData(0, 0, 24, 24).data, sm = 0, n = 0; for(let i = 0; i < dd.length; i += 4){ if(dd[i + 3] > 128){ sm += (dd[i] * 299 + dd[i + 1] * 587 + dd[i + 2] * 114) / 1000; n++ } } if(n > 8) im.parentNode.setAttribute('data-sl', sm / n > 170 ? 'w' : 'd') }catch(e){} }; p.src = im.src.replace(/^https?:\/\/image\.tmdb\.org\//, location.origin + '/p/3849c2cf/tmdbimg/') }) }catch(e){}
        let imgs = Array.prototype.slice.call(el.querySelectorAll('img')).filter(function(i){ return !i.complete })
        if(!imgs.length){ el.classList.remove('imdbb-st--w'); return }
        el.classList.add('imdbb-st--w')
        let left = imgs.length
        let done = function(){ if(el.__imdbbSt === key) el.classList.remove('imdbb-st--w') }
        imgs.forEach(function(i){ let f = function(){ left--; if(left <= 0) done() }; i.addEventListener('load', f); i.addEventListener('error', f) })
        setTimeout(done, 1200)
    }
    catch(e){}
}

export function subLine(d, info, short){
    let kind = kindOf(d)
    let sl = ''
    if(info && kind === 'tv' && info.number_of_seasons){
        let st = (info.status === 'Ended' || info.status === 'Canceled') ? 'Завершён' : 'Идёт'
        sl = 'Сезоны: ' + info.number_of_seasons + ' • Серии: ' + (info.number_of_episodes || '') + ' • ' + st
    }
    if(!sl && info && kind !== 'tv' && info.budget >= 1e6) sl = 'Бюджет $ ' + (Math.round(info.budget / 1e5) / 10 + '').replace('.', ',') + ' млн'
    if(!sl && info && kind !== 'tv' && info.budget > 0) sl = 'Бюджет $ ' + String(info.budget).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    return sl
}

if(typeof window !== 'undefined') window.__imdbbInfo = 1
if(typeof window !== 'undefined') window.__imdbbOrdA = 1
if(typeof window !== 'undefined') window.__imdbbBudS = 1

export function cert(info, kind){
    try{
        if(info && info._cert !== undefined) return info._cert
        let cd = String(window.Lampa.Storage.get('language', 'ru') || 'ru').toUpperCase()
        let codes = cd === 'US' ? ['US'] : [cd, 'US']
        if(kind === 'tv'){
            let rs = (info.content_ratings && info.content_ratings.results) || []
            for(let n = 0; n < codes.length; n++){
                let r = rs.filter(function(x){ return x.iso_3166_1 === codes[n] && x.rating })[0]
                if(r) return Utils.decodePG(r.rating)
            }
            return ''
        }
        let rd = (info.release_dates && info.release_dates.results) || []
        for(let n = 0; n < codes.length; n++){
            let r2 = rd.filter(function(x){ return x.iso_3166_1 === codes[n] })[0]
            if(!r2) continue
            let c = (r2.release_dates || []).filter(function(x){ return x.certification })[0]
            if(c) return Utils.decodePG(c.certification)
        }
        return ''
    }
    catch(e){ return '' }
}

if(typeof window !== 'undefined') window.__imdbbCert = cert



if(typeof window !== "undefined") window.__imdbbTfAlign = 1
if(typeof window !== "undefined") window.__imdbbRl = 1
