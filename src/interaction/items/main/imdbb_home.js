import {metaHtml, subLine, HERO_HTML, cert} from './imdbb_info'
import {lgcached, lgput} from '../../card/module/ratting'
import Utils from '../../../utils/utils'
import ovx from '../../../utils/imdbb_ov'
import '../../../utils/imdbb_lgdark'
import '../../../utils/imdbb_rus'
import KP from '../../../utils/kp'

const HKEY = 'imdbb_hd3'
const HTTL = 7 * 864e5
let hdisk = null
let hsave

function hload(){
    if(hdisk) return hdisk

    try{ hdisk = JSON.parse(localStorage.getItem(HKEY) || '{}') }
    catch(e){ hdisk = {} }

    return hdisk
}

function hget(k){
    let c = hload()[k]

    return c && c.t + HTTL > Date.now() ? c.i : null
}

function hput(k, j, ct){
    try{
        let ls = (j.images && j.images.logos) || []
        let pick = ls.filter(function(x){ return x.iso_639_1 === 'ru' })[0] || ls.filter(function(x){ return x.iso_639_1 === 'en' })[0] || ls[0]
        let pc = j.production_countries && j.production_countries[0] ? [{iso_3166_1: j.production_countries[0].iso_3166_1}] : []

        hload()[k] = {t: Date.now(), i: {
            id: j.id,
            tagline: j.tagline || '',
            release_date: j.release_date,
            first_air_date: j.first_air_date,
            production_countries: pc,
            origin_country: j.origin_country && j.origin_country[0] ? [j.origin_country[0]] : [],
            genres: (j.genres || []).slice(0, 3).map(function(x){ return {name: x.name} }),
            status: j.status,
            number_of_seasons: j.number_of_seasons,
            number_of_episodes: j.number_of_episodes,
            budget: j.budget,
            runtime: j.runtime || 0,
            overview: j.overview || '',
            images: {logos: pick ? [{iso_639_1: pick.iso_639_1, file_path: pick.file_path}] : []},
            _cert: ct || ''
        }}

        clearTimeout(hsave)

        hsave = setTimeout(function(){
            try{
                let ks = Object.keys(hdisk)

                if(ks.length > 600){
                    ks.sort(function(a, b){ return hdisk[a].t - hdisk[b].t })
                        .slice(0, ks.length - 600)
                        .forEach(function(x){ delete hdisk[x] })
                }

                localStorage.setItem(HKEY, JSON.stringify(hdisk))
            }
            catch(e){}
        }, 1000)
    }
    catch(e){}
}

export default function(main){
    try{
        let o = main.object || {}
        if(['main','category','bookmarks','relise','favorite','category_full','myperson','actor'].indexOf(o.component) < 0) return
        if(!document.body.classList.contains('imdbb-compact')) return
        if(localStorage.getItem('imdbb_wide') === 'false') return

        let L = window.Lampa
        let isBm = ['bookmarks','relise','favorite','category_full','myperson','actor'].indexOf(o.component) > -1
        let hero = document.createElement('div')
        hero.className = 'imdbb-hero'
        hero.innerHTML = HERO_HTML
        main.html.classList.add('imdbb-home')
        if(o.component === 'actor') main.html.classList.add('imdbb-act')
        main.html.classList.toggle('imdbb-nobadge', localStorage.getItem('imdbb_hide_badges') === 'true')
        main.html.insertBefore(hero, main.html.firstChild)

        let q = function(s){ return hero.querySelector(s) }
        let cache = {}
        let cur = null
        let curEl = null
        let timer, timer2
        let esc = function(s){ return String(s || '').replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] }) }
        let kindOf = function(d){ return d.media_type === 'tv' || (d.name && !d.title) || d.first_air_date ? 'tv' : 'movie' }
        let ckey = function(d){ return kindOf(d) + d.id }

        let render = function(d, info, el, wait){
            let kind = kindOf(d)
            let title = d.title || d.name || ''

            let logo = ''
            let known = false
            let pl = null
            if(info && info.images && info.images.logos){
                known = true
                let ls = info.images.logos
                let pick = ls.filter(function(x){ return x.iso_639_1 === 'ru' })[0] || ls.filter(function(x){ return x.iso_639_1 === 'en' })[0] || ls[0]
                if(pick && pick.file_path) logo = L.TMDB.image('t/p/w500' + pick.file_path)
                pl = pick ? (pick.iso_639_1 || '') : null
                if(!lgcached(d) || lgcached(d).l === undefined) lgput(d, pick && pick.file_path ? pick.file_path.replace('.svg', '.png') : '', pick ? (pick.iso_639_1 || '') : '')
            }
            else if(!info){
                let cp = lgcached(d)
                if(cp){
                    known = true
                    if(cp.p) logo = L.TMDB.image('t/p/w500' + cp.p)
                    pl = cp.l === undefined ? null : cp.l
                }
            }
            let lg = q('.imdbb-hero__logo')
            if(logo){
                if(lg.getAttribute('data-src') !== logo){
                    lg.setAttribute('data-src', logo)
                    lg.innerHTML = '<img alt="">'
                    let im = lg.firstChild
                    im.onerror = function(){ lg.innerHTML = '<div class="imdbb-hero__t">' + esc(title) + '</div>' }
                    im.src = logo; if(window.__imdbbLgDark) window.__imdbbLgDark.watch(im)
                }
            }
            else if(wait && !known){
                if(lg.getAttribute('data-src') !== 'imdbb-wait:' + title){
                    lg.setAttribute('data-src', 'imdbb-wait:' + title)
                    lg.innerHTML = ''
                }
            }
            else if(lg.getAttribute('data-src') !== 'T:' + title){
                lg.setAttribute('data-src', 'T:' + title)
                lg.innerHTML = '<div class="imdbb-hero__t">' + esc(title) + '</div>'
            }

            try{
                let ru = L.Storage.get('imdbb_logo_ru', 'false')
                let old = lg.querySelector('.imdbb-hero__ru')
                if(old) old.remove()
                if((ru === true || ru === 'true') && logo && pl !== null && pl !== 'ru' && title && title !== (d.original_title || d.original_name || '')){
                    let c = document.createElement('div')
                    c.className = 'imdbb-hero__ru'
                    c.textContent = title
                    lg.appendChild(c)
                }
            }catch(e){}

            q('.imdbb-hero__tag').textContent = (info && info.tagline) || ''

            let rate = ''
            let qh = ''
            if(el){
                let v = el.querySelector('.card__vote')
                if(v && /IMDb/i.test(v.textContent || '')){
                    let m = (v.textContent || '').match(/\d+(?:[.,]\d+)?/)
                    if(m) rate = m[0].replace(',', '.')
                }
                let qq = el.querySelector('.imdbb-q')
                if(qq) qh = qq.innerHTML
            }
            q('.imdbb-hero__meta').innerHTML = metaHtml(d, info, {rate: rate, ql: qh, ct: info ? cert(info, kind) : ''})
            try{
                let kpk = kind + ':' + d.id

                q('.imdbb-hero__meta').setAttribute('data-kpk', kpk)

                if(!rate && KP.isRu(d, info)) KP.rating(d, kind, function(v){
                    try{
                        let mm = q('.imdbb-hero__meta')

                        if(!v || !mm || mm.getAttribute('data-kpk') !== kpk || mm.querySelector('.imdbb-hero__r')) return

                        mm.innerHTML = metaHtml(d, info, {rate: '', kp: v.toFixed(1), ql: qh, ct: info ? cert(info, kind) : ''})
                    }
                    catch(e){}
                })
            }
            catch(e){}

            q('.imdbb-hero__s').textContent = subLine(d, info)
            q('.imdbb-hero__d').textContent = ovx.pick(d, info && info.overview, d.overview)
            try{
                let dd = q('.imdbb-hero__d')
                if(dd && dd.textContent){
                    clearTimeout(window.__imdbbHdT)
                    window.__imdbbHdT = setTimeout(function(){
                        try{
                            let r = dd.getBoundingClientRect()
                            if(!r.height || !dd.offsetParent) return
                            let fp = parseFloat(getComputedStyle(document.body).fontSize) || 16
                            let v = (window.innerHeight - r.bottom) / fp
                            if(v > 5 && v < 40) localStorage.setItem('imdbb_home_d', v.toFixed(2))
                        }
                        catch(e){}
                    }, 400)
                }
            }
            catch(e){}
        }

        let load = function(d, cb){
            if(d.episode_number !== undefined || d.still_path !== undefined) return /* imdbb_ep_guard */
            let k = ckey(d)
            if(cache[k]) return cb(cache[k])
            let hc = hget(k)
            if(hc && !ovx.old(hc.overview, (hload()[k] || {}).t) && !(!hc.tagline && Date.now() - ((hload()[k] || {}).t || 0) > 864e5)){ cache[k] = hc; return cb(hc) } ;window.__imdbbTgFresh = 1
            let kind = kindOf(d)
            let app = kind === 'tv' ? 'images,content_ratings' : 'images,release_dates'
            let url = L.TMDB.api(kind + '/' + d.id + '?api_key=' + L.TMDB.key() + '&language=ru&append_to_response=' + app + '&include_image_language=ru,en,null')
            fetch(url).then(function(r){ return r.json() }).then(function(j){
                if(j && j.id){
                    let done = function(){ cache[k] = j; hput(k, j, cert(j, kind)); cb(j) }
                    if(String(j.overview || '').trim()) done()
                    else fetch(L.TMDB.api(kind + '/' + d.id + '?api_key=' + L.TMDB.key() + '&language=en')).then(function(r2){ return r2.json() }).then(function(e){ if(e && e.overview) j.overview = e.overview }, function(){}).then(done)
                }
            }).catch(function(){})
        }

        let pf = {}
        let prefetch = function(el){
            try{
                if(!el) return
                let box = el.closest('.items-line') || el.parentNode
                let all = Array.prototype.slice.call(box.querySelectorAll('.card'))
                let ix = all.indexOf(el)
                if(ix < 0) return
                let list = all.slice(ix + 1, ix + 4)
                if(ix > 0) list.push(all[ix - 1])
                list.forEach(function(x, n){
                    let d2 = x.card_data || (window.$ ? window.$(x).data('card') : null)
                    if(!d2 || !d2.id || !(d2.title || d2.name)) return
                    if(d2.episode_number !== undefined || d2.still_path !== undefined) return
                    let k2 = ckey(d2)
                    if(cache[k2] || pf[k2] || hget(k2)) return
                    pf[k2] = 1
                    setTimeout(function(){ load(d2, function(){}) }, 500 + n * 350)
                })
            }
            catch(e){}
        }

        let upd = function(card, d){
            if(!d) return
            if(!d.id){
                if(isBm){
                    cur = null
                    clearTimeout(timer)
                    clearTimeout(timer2)
                    hero.setAttribute('data-imdbb-bm', '1')
                    hero.classList.add('imdbb-hero--wait')
                }
                return
            }
            if(!(d.title || d.name)) return
            let el = null
            try{ el = card.render(true) }catch(e){}
            cur = d
            curEl = el
            let kk = ckey(d)
            let ci = cache[kk] || hget(kk)
            if(ci) cache[kk] = ci
            let ep = d.episode_number !== undefined || d.still_path !== undefined
            let wait = !ci && !ep
            hero.classList.toggle('imdbb-hero--wait', wait)
            render(d, ci || null, el, wait)
            try{ if(d.backdrop_path && L.Background && !isBm) L.Background.change(L.TMDB.image('t/p/w1280' + d.backdrop_path)) }catch(e){}
            clearTimeout(timer)
            clearTimeout(timer2)
            timer = setTimeout(function(){
                if(cur !== d) return
                try{
                    if(d.backdrop_path && L.Background && !isBm) L.Background.change(L.TMDB.image('t/p/w1280' + d.backdrop_path))
                }
                catch(e){}
                load(d, function(info){ if(cur === d){ render(d, info, curEl); hero.classList.remove('imdbb-hero--wait') } })
                prefetch(curEl)
                timer2 = setTimeout(function(){ if(cur === d){ render(d, cache[ckey(d)] || null, curEl); hero.classList.remove('imdbb-hero--wait') } }, 1800)
            }, 250)
        }

        main.use({
            onInstance: function(item){
                item.use({
                    onActive: function(card, d){ upd(card, d) }
                })
            }
        })
    }
    catch(e){ console.warn('imdbb_home', e.message) }
}
