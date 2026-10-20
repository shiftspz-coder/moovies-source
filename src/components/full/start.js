import {cert as imdbbCert, HERO_HTML, metaHtml, subLine} from '../../interaction/items/main/imdbb_info'
import {lgcached, lgput} from '../../interaction/card/module/ratting'
import Template from '../../interaction/template'
import Controller from '../../core/controller'
import Utils from '../../utils/utils'
import Api from '../../core/api/api'
import Arrays from '../../utils/arrays'
import Storage from '../../core/storage/storage'
import Lang from '../../core/lang'
import Emit from '../../utils/emit'
import TMDB from '../../core/api/sources/tmdb'
import Permit from '../../core/account/permit'
import IMDb from '../../utils/imdb'
import KP from '../../utils/kp'

import Options from './start/options'
import Torrents from './start/torrents'
import Subscribed  from './start/subscribed'
import Trailers from './start/trailers'
import Poster from './start/poster'
import Reactions from './start/reactios'
import Translations from './start/translations'
import Bookmarks from './start/bookmarks'
import Buttons from './start/buttons'
import ovx from '../../utils/imdbb_ov'
import Tracks from '../../core/imdbb_tracks'

const QKEY = 'imdbb_q2'
const kpBoth = ()=>{ try{ return localStorage.getItem('imdbb_kp_both') === 'true' }catch(e){ return false } }

function gate(h, k){
    let e = h && h[0]

    if(!e) return

    e.__w = e.__w || {}

    if(k) e.__w[k] = 1

    if(!k || (e.__w.l && e.__w.r && e.__w.q)) h.removeClass('imdbb-fwait')
    if(e.__imdbbHu) setTimeout(e.__imdbbHu, 0)
}
const DUB = '<span><svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-.15em"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/></svg></span>'

class Start extends Emit {
    constructor(data) {
        super()

        this.data  = data
        this.card  = data.movie

        Arrays.extend(this.card,{
            title: this.card.name,
            original_title: this.card.original_name,
            runtime: 0,
            img: this.card.poster_path ? Api.img(this.card.poster_path, Storage.field('poster_size')).replace(/\/w\d{1,4}/,'/w500') : './img/img_broken.svg'
        })

        Utils.canWatchChildren(TMDB.parsePG(data.movie), Permit.profile.age) && this.use(Torrents)

        this.use(Options)
        this.use(Subscribed)
        this.use(Trailers)
        this.use(Poster)
        this.use(Translations)
        this.use(Bookmarks)
        this.use(Reactions)
        this.use(Buttons)

        this.emit('init')
    }


    qualityChip(){
        let card = this.card
        let kind = card.first_air_date || card.number_of_seasons !== undefined ? 'tv' : 'movie'
        let key  = kind + ':' + card.id

        let show = (v)=>{
            if(!v || !v.q) return

            let t = v.q === '1080' ? 'FHD' : v.q
            let d = ''

            if(v.q !== 'TS' && v.dub) d = DUB

            this.html.find('.imdbb-cq').remove()

            let ml = document.body.classList.contains('imdbb-compact') && window.__imdbbQl ? window.__imdbbQl(v) : null
            let el = ml && ml.length ? $('<div class="imdbb-cq imdbb-cqm">' + ml.map(function(x){ return '<span data-b="' + (window.__imdbbBk ? window.__imdbbBk(x) : '') + '">' + x + '</span>' }).join('') + '</div>') : $('<div class="imdbb-cq">' + t + (d ? ' ' + d : '') + '</div>')
            let im = this.html.find('.rate--imdb')

            if(this.html.find('.full-start-new__rate-line').length) this.html.find('.full-start-new__rate-line').append(el)
            else if(im.length) el.insertAfter(im)
            else this.html.find('.full-start-new__rate-line').append(el)
        }

        let verify = (v)=>{
            if(!v || (v.q !== '4K' && v.q !== '1080') || !v.tops || !v.tops.length) return

            let le = card.last_episode_to_air
            let ep = kind === 'tv' && le && le.season_number && le.episode_number ? {s: le.season_number, e: le.episode_number} : null

            Tracks.run(v.tops, ep, (ok)=>{
                if(ok && this.html && this.html[0] && document.body.contains(this.html[0])) show(Tracks.apply(v))
            })
        }

        let store = null

        try{ store = JSON.parse(localStorage.getItem(QKEY) || '{}') }
        catch(e){ store = {} }

        let c = store[key]

        if(c && c.t + c.l > Date.now() && !(c.v && (c.v.q === '4K' || c.v.q === '1080') && c.v.tops === undefined)){
            show(Tracks.apply(c.v))
            verify(c.v)
            gate(this.html, 'q')

            return
        }

        let proxy = ''

        try{ proxy = localStorage.getItem('imdb_proxy') || '' }
        catch(e){}

        if(!proxy){ gate(this.html, 'q'); return }

        let title = card.title || card.name || ''
        let orig  = card.original_title || card.original_name || ''
        let year  = ((card.release_date || card.first_air_date || '') + '').slice(0, 4)
        let x     = new XMLHttpRequest()

        x.open('GET', proxy + '?title=' + encodeURIComponent(title) + '&year=' + year + '&orig=' + encodeURIComponent(orig) + '&kind=' + kind, true)
        x.timeout = 30000
        x.onload = ()=>{
            let v = null

            try{ v = JSON.parse(x.responseText) }
            catch(e){}

            if(!v || typeof v !== 'object'){ gate(this.html, 'q'); return }

            let val = {q: v.q || null, dub: v.dub || null, dubq: v.dubq || null, hdr: v.hdr || null, dv: v.dv || null, tops: Array.isArray(v.tops) ? v.tops : []}

            try{
                let s = JSON.parse(localStorage.getItem(QKEY) || '{}')

                s[key] = {v: val, t: Date.now(), l: val.q === 'TS' ? 3600e3 : (val.q ? 6 * 3600e3 : 3 * 3600e3)}

                localStorage.setItem(QKEY, JSON.stringify(s))
            }
            catch(e){}

            show(Tracks.apply(val))
            verify(val)
            gate(this.html, 'q')
        }
        x.onerror = x.ontimeout = ()=>{ gate(this.html, 'q') }
        x.send()
    }

    create(){
        let genres      = (this.card.genres || ['---']).slice(0,3).map(a => Utils.capitalizeFirstLetter(a.name)).join(', ')
        let countries   = TMDB.parseCountries(this.card)
        let seasons     = Utils.countSeasons(this.card)
        let tmdb_rating = parseFloat((this.card.vote_average || 0) +'').toFixed(1)

        let relise  = (this.card.release_date || this.card.first_air_date || '') + ''
        let year    = relise ? relise.slice(0,4) : ''
        let quality = !this.card.first_air_date ? this.card.release_quality || this.card.quality : false
        let pg      = TMDB.parsePG(this.card) || imdbbCert(this.card, (this.card.first_air_date || this.card.number_of_seasons !== undefined) ? 'tv' : 'movie')
        let head    = []
        let info    = []

        if(tmdb_rating >= 10) tmdb_rating = 10

        this.html = Template.get('full_start_new',{
            title: this.card.title,
            original_title: this.card.original_title,
            descr: Utils.substr(this.card.overview || Lang.translate('full_notext'), 420),
            time: Utils.secondsToTime(this.card.runtime * 60, true),
            genres: Utils.substr(genres, 30),
            rating: tmdb_rating,
            seasons: seasons,
            countries: countries.join(', '),
            episodes: this.card.number_of_episodes,
            tagline: this.card.tagline
        })

        !window.lampa_settings.torrents_use && this.html.find('.view--torrent').addClass('hide')

        this.card.name && this.html.find('.full-start-new__poster').addClass('card--tv').append('<div class="card__type">TV</div>')
        this.card.adult && this.html.find('.full-start-new__poster').addClass('card--adult').append('<div class="card__type">ADULT</div>')

        if(year){
            this.html.find('.tag--year').removeClass('hide').find('> div').text(year)

            head.push('<span>' + year + '</span>')
        }

        countries.length && head.push(countries.slice(0,5).join(' | '))

        !this.card.tagline && this.html.find('.full--tagline').remove()
        ;window.__imdbbTg = 1;(()=>{ let t = this.html.find('.full-start-new__title'), g = this.html.find('.full--tagline'); if(g.length && t.length) t.after(g) })()

        if(!this.card.tagline && this.card.title.length > 25) this.html.find('.full-start-new__title').addClass('twolines')

        let ibw = this.html

        if(document.body.classList.contains('imdbb-compact')){
            ibw.addClass('imdbb-fwait');window.__imdbbUnif = 1;(()=>{ try{ if(localStorage.getItem('imdbb_hero_card') === 'false') return; let rg = this.html.find('.full-start-new__right'); if(!rg.length) return; let hero = $('<div class="imdbb-hero imdbb-hero--card">' + HERO_HTML + '</div>'), card = this.card; rg.prepend(hero); this.html.addClass('imdbb-unif'); let up = ()=>{ try{ let r = this.html.find('.rate--imdb:not(.hide) > div').eq(0).text().trim(), qc = this.html.find('.imdbb-cq').first(), on = this.html.find('.imdbb-fav.on').length, pl; hero.find('.imdbb-hero__tag').text(card.tagline || ''); hero.find('.imdbb-hero__meta').html(metaHtml(card, card, {rate: r, kp: (!r && KP.isRu(card, card)) ? this.html.find('.rate--kp:not(.hide) > div').eq(0).text().trim() : '', kp2: (r && kpBoth()) ? this.html.find('.rate--kp:not(.hide) > div').eq(0).text().trim() : '', ql: qc.length ? (qc[0].classList.contains('imdbb-cqm') ? Array.prototype.map.call(qc[0].children, function(n){ return n.innerHTML }) : qc.html()) : '', ct: pg || ''})); pl = hero.find('.imdbb-hero__pl'); on && (window.__imdbbFavM = 1) && hero.find('.imdbb-hero__meta').append('<span class="imdbb-hero__fav"><svg viewBox="0 0 24 24" width="1em" height="1em"><path d="M6 3h12v18l-6-4-6 4z" fill="currentColor"/></svg></span>'); hero.find('.imdbb-hero__s').text(''); hero.find('.imdbb-hero__d').text(ovx.pick(card, card.overview) || '') }catch(e){} }; this.html[0].__imdbbHu = up; up(); ovx.refresh(card, function(t){ hero.find('.imdbb-hero__d').text(t) }) }catch(e){} })();
            setTimeout(function(){ gate(ibw) }, 1000)
        }

        let logoOff = window.Lampa.Storage.get('logo_card', 'true')

        if(!(logoOff === false || logoOff === 'false') && this.card.id){
            let L = window.Lampa
            let lt = this.html.find('.full-start-new__title')
            let lg = this.html.find('.full--tagline')
            let lang = L.Storage.get('language', 'ru')
            let ibh = this.html
            let ibc = this.card
            let ibl = lgcached(ibc)
            let ruOn = L.Storage.get('imdbb_logo_ru', 'false'); ruOn = ruOn === true || ruOn === 'true'
            if(ibl && ibl.l === undefined && ruOn) ibl = null
            let back = function(){ lt.css('visibility', ''); lg.css('visibility', ''); try{ let hl = ibh.find('.imdbb-hero__logo'); if(hl.length && !hl.children().length) hl.html($('<div class="imdbb-hero__t"></div>').text(ibc.title || ibc.name || '')) }catch(e){} gate(ibh, 'l') }
            let url = L.TMDB.api((this.card.name ? 'tv' : 'movie') + '/' + this.card.id + '/images?api_key=' + L.TMDB.key() + '&include_image_language=' + lang + ',en,null')

            lt.css('visibility', 'hidden')
            lg.css('visibility', 'hidden')

            let getter = ibl ? function(ok){ ok({logos: ibl.p ? [{iso_639_1: (ibl.l === undefined ? lang : ibl.l), file_path: ibl.p}] : []}) } : function(ok, bad){ $.get(url, ok).fail(bad) }

            getter(function(r){
                let all = r && r.logos ? r.logos : []
                let pick = all.filter(function(x){ return x.iso_639_1 === lang })[0] || all.filter(function(x){ return x.iso_639_1 === 'en' })[0] || all[0]

                if(!ibl) lgput(ibc, pick && pick.file_path ? pick.file_path.replace('.svg', '.png') : '', pick ? (pick.iso_639_1 || '') : '')

                if(!pick || !pick.file_path) return back()

                let st = window.innerWidth > 585 ? 'margin-top:0.3em;margin-bottom:0.1em;max-height:1.8em;max-width:100%;' : 'margin-top:0.3em;margin-bottom:0.1em;max-height:2.8em;max-width:100%;'
                let img = $('<img style="' + st + '" />')

                img.on('load', function(){
                    lt.removeClass('twolines').html('').append(img).css('visibility', ''); try{ let hl = ibh.find('.imdbb-hero__logo')[0]; if(hl){ hl.innerHTML = '<img alt="">'; hl.firstChild.src = img.attr('src'); if(window.__imdbbLgDark) window.__imdbbLgDark.watch(hl.firstChild); try{ let c0 = ibc.title || ibc.name || '', o0 = ibc.original_title || ibc.original_name || ''; if(ruOn && (pick.iso_639_1 || '') !== lang && c0 && c0 !== o0){ let e0 = document.createElement('div'); e0.className = 'imdbb-hero__ru'; e0.textContent = c0; hl.appendChild(e0) } }catch(e){} } }catch(e){}
                    try{ ibh.find('.imdbb-rutl').remove(); let ct = ibc.title || ibc.name || ''; let co = ibc.original_title || ibc.original_name || ''; if(ruOn && (pick.iso_639_1 || '') !== lang && ct && ct !== co){ let w = document.createElement('div'); w.className = 'imdbb-rutl'; let t2 = document.createElement('div'); t2.className = 'imdbb-rutl__t'; t2.textContent = ct; w.appendChild(t2); if(lt[0] && lt[0].parentNode) lt[0].parentNode.insertBefore(w, lt[0]) } }catch(e){}
                    lg.css('visibility', '')
                    gate(ibh, 'l')
                })
                img.on('error', back)
                img.attr('src', L.TMDB.image('t/p/w500' + pick.file_path.replace('.svg', '.png'))); if(window.__imdbbLgDark) window.__imdbbLgDark.watch(img[0])
            }, back)
        }

        if(logoOff === false || logoOff === 'false' || !this.card.id){ try{ let hl = this.html.find('.imdbb-hero__logo'); hl.length && hl.html($('<div class="imdbb-hero__t"></div>').text(this.card.title || this.card.name || '')) }catch(e){}; gate(this.html, 'l') }

        let compact = document.body.classList.contains('imdbb-compact')
        let meta = []
        if(year) meta.push(year)
        if(countries.length) meta.push(countries[0])
        if(this.card.runtime > 0){
            let rt = Utils.secondsToTime(this.card.runtime * 60, true)
            meta.push((()=>{ let r = this.card.runtime; return (r >= 60 ? Math.floor(r / 60) + ' ч ' : '') + (r % 60 ? (r % 60) + ' мин' : '') })()); info.push('<span class="imdbb-dup">' + rt + '</span>')
        }

        seasons && info.push('<span>' + Lang.translate('title_seasons') + ': ' + seasons + '</span>')

        pg && this.html.find('.full-start__pg').removeClass('hide').text(pg)

        this.card.number_of_episodes && info.push('<span>'+Lang.translate('title_episodes') + ': ' + this.card.number_of_episodes + '</span>')

        !this.card.runtime && $('.tag--time', this.html).remove()
        
        this.card.number_of_seasons && this.html.find('.is--serial').removeClass('hide')

        this.card.vote_average == 0 && this.html.find('.rate--tmdb').addClass('hide')

        this.card.status && this.html.find('.full-start__status').removeClass('hide').text(Lang.translate('tv_status_' + this.card.status.toLowerCase().replace(/ /g,'_')))

        try{ let ic = IMDb.cached(this.card); if(ic > 0) this.card.imdb_rating = ic }catch(e){} if(this.card.imdb_rating && parseFloat(this.card.imdb_rating) > 0){
            this.html.find('.rate--imdb').removeClass('hide').find('> div').eq(0).text(parseFloat(this.card.imdb_rating) >= 10 ? 10 : this.card.imdb_rating)
        }

        if(this.card.kp_rating && parseFloat(this.card.kp_rating) > 0){
            this.html.find('.rate--kp').removeClass('hide').find('> div').eq(0).text(parseFloat(this.card.kp_rating) >= 10 ? 10 : this.card.kp_rating)
        }

        this.html.find('.rate--tmdb, .full-start__status').addClass('hide')

        let kpFb = ()=>{ try{ let c = this.card; if(!KP.isRu(c, c) && !kpBoth()) return; let kind = (c.media_type === 'tv' || (c.name && !c.title) || c.first_air_date) ? 'tv' : 'movie'; KP.rating(c, kind, (v)=>{ try{ if(!(v > 0) || (this.html.find('.rate--imdb:not(.hide)').length && !kpBoth())) return; this.html.find('.rate--kp').removeClass('hide').find('> div').eq(0).text(v.toFixed(1)); let u = this.html[0] && this.html[0].__imdbbHu; u && u() }catch(e){} }) }catch(e){} }

        if(!(parseFloat(this.card.imdb_rating) > 0)){
            IMDb.rating(this.card, (r)=>{
                r = parseFloat(r)
                gate(this.html, 'r')

                if(!(r > 0)) return kpFb()

                this.html.find('.rate--imdb').removeClass('hide').find('> div').eq(0).text(r >= 10 ? 10 : r.toFixed(1))
            })
        }

        if(parseFloat(this.card.imdb_rating) > 0) gate(this.html, 'r')

        this.qualityChip(); if(kpBoth()) kpFb()

        if(this.card.genres){
            genres = this.card.genres.slice(0,5).map((a)=>{
                return Utils.capitalizeFirstLetter(a.name)
            }).join(' | ')

            meta.push(this.card.genres.slice(0,3).map((a)=>Utils.capitalizeFirstLetter(a.name)).join(', '))
            info.push('<span class="imdbb-dup">' + genres + '</span>')
        }

        if(quality){
            this.html.find('.tag--quality').removeClass('hide').find('> div').text(quality)
            
            info.push('<span>' + Lang.translate('player_quality') + ': ' + quality.toUpperCase() + '</span>')
        }

        if(this.card.next_episode_to_air){
            let air = Utils.parseToDate(this.card.next_episode_to_air.air_date)
            let now = Date.now()

            let day = Math.ceil((air.getTime() - now) / (24*60*60*1000))
            let txt = Lang.translate('full_next_episode')+': ' + Utils.parseTime(this.card.next_episode_to_air.air_date).short + ' / '+Lang.translate('full_episode_days_left')+': ' + day

            if(day > 0){
                $('.tag--episode', this.html).removeClass('hide').find('div').text(txt)

                info.push('<span>'+txt+'</span>')
            } 
        }

        $('.full-start-new__buttons', this.html).find('.selector').on('hover:focus hover:enter hover:hover hover:touch', (e)=>{
            this.last = e.target
        })
        
        this.html.find('.full-start-new__head').toggleClass('hide',!head.length).html(head.join(', '))
        let imdbbDet = this.html.find('.full-start-new__details'), imdbbSp = '<span class="full-start-new__split">●</span>'
        imdbbDet.html(info.join(imdbbSp))
        imdbbDet.after(imdbbDet.clone().addClass('imdbb-details-c').html(info.filter((x)=>x.indexOf('imdbb-dup')<0).join('<span class="full-start-new__split imdbb-bul">•</span>')))
        ;window.__imdbbSep = 1;(()=>{ let rl = this.html.find('.full-start-new__rate-line')[0]; if(!rl) return; let fix = ()=>{ let first = null, x = 1e9; Array.prototype.forEach.call(rl.children, (c)=>{ c.removeAttribute('data-imdbb-first'); if(c.classList.contains('hide') || !c.offsetWidth) return; let l = c.getBoundingClientRect().left; if(l < x){ x = l; first = c } }); if(first) first.setAttribute('data-imdbb-first', '1') }; new MutationObserver(()=>{ clearTimeout(rl.__imdbbT); rl.__imdbbT = setTimeout(fix, 50) }).observe(rl, {childList: true, subtree: true, attributes: true, attributeFilter: ['class']}); setTimeout(fix, 100) })();;window.__imdbbRx = 1;(()=>{ let b = this.html.find('.full-start-new__buttons')[0], r = this.html.find('.full-start-new__reactions')[0]; if(b && r) b.appendChild(r) })();window.__imdbbFix1 = 1;(()=>{ let rl = this.html.find('.full-start-new__rate-line'), bt = this.html.find('.full-start-new__buttons'), gl = (this.card.genres || []).slice(0,3).map((a)=>Utils.capitalizeFirstLetter(a.name)).join(', '), parts = [(()=>{ let d = relise.match(/^(\d{4})-(\d{2})-(\d{2})/); return d ? d[3] + '.' + d[2] + '.' + d[1] : year })(), countries[0], this.card.runtime > 0 ? Utils.secondsToTime(this.card.runtime * 60, true) : '', gl].filter(Boolean); let imdbbTx = parts.filter((x)=>x !== gl), imdbbMr = $('<div class="imdbb-meta imdbb-mrow"></div>'); imdbbTx.forEach((x, i)=>{ if(i) imdbbMr.append('<em class="imdbb-dot">·</em>'); imdbbMr.append($('<span></span>').text(x)) }); imdbbTx.length && imdbbMr.appendTo(rl); gl && $('<div class="imdbb-meta imdbb-grow"></div>').text(gl).appendTo(rl); this.card.budget > 0 && !this.card.name && this.html.find('.imdbb-details-c').append($('<span class="imdbb-budl"></span>').text('Бюджет $ ' + Utils.numberWithSpaces(this.card.budget))); { let ovE = $('<div class="imdbb-ov"></div>').text(ovx.pick(this.card, this.card.overview) || '').insertBefore(bt); if(document.body.classList.contains('imdbb-compact')) ovx.refresh(this.card, function(t){ ovE.text(t) }) } })();window.__imdbbPpl = 1;;(()=>{ try{ if(!(this.card && this.card.name)) return; let id = this.card.id, t = '', c = null; try{ c = JSON.parse(localStorage.getItem('imdbb_ep_f1') || '{}')[id] }catch(e){} if(c && c.s && Date.now() - c.t < 43200000) t = c.s; else t = (this.card.status === 'Ended' || this.card.status === 'Canceled') ? 'Завершён' : 'Идёт'; let det = this.html.find('.imdbb-details-c').first(); if(!det.length) return; if(det.children().length) det.append($('<span class="full-start-new__split imdbb-bul">•</span>')); det.append($('<span class="imdbb-st"></span>').text(t)) }catch(e){} })();window.__imdbbSt2 = 1;
        try{ let bt = this.html.find('.full-start-new__buttons'); if(bt.length && !bt.parent().hasClass('imdbb-band')) bt.wrap('<div class="imdbb-band"></div>') }catch(e){}
        try{
            let pr = (this.data && this.data.persons) || {}, dir = (pr.crew || []).filter((x)=>x.job === 'Director')[0], cast = (pr.cast || []).slice(0, 30)
            let list = (dir ? [[dir, 'Режиссёр']] : []).concat(cast.map((x)=>[x, x.character || 'Актёр'])), box = $('<div class="imdbb-ppl"></div>')
            list.forEach((it, i)=>{
                let o = it[0], av = $('<div class="imdbb-av"></div>')
                if(o.profile_path) av.css('background-image', 'url(' + window.Lampa.TMDB.image('t/p/w185' + o.profile_path) + ')')
                else av.text((o.name || '?').split(' ').map((w)=>w[0]).slice(0, 2).join(''))
                if(dir && i === 1) box.append('<div class="imdbb-psep"></div>')
                box.append($('<div class="imdbb-p selector"></div>').on('hover:focus', (e)=>{ window.__imdbbPs = 1; try{ let t = e.target.closest ? e.target.closest('.imdbb-p') : e.target, b = box[0]; b.scrollLeft = t.offsetLeft - (b.clientWidth - t.offsetWidth) / 2 }catch(x){} }).on('hover:enter', ()=>{ try{ Lampa.Activity.push({url: '', title: Lampa.Lang.translate('title_person'), component: 'actor', id: o.id, source: 'tmdb'}) }catch(e){} }).append(av).append($('<div class="imdbb-pn"></div>').text(o.name || '')).append($('<div class="imdbb-pr"></div>').text(it[1])))
            })
            list.length && box.insertAfter(this.html.find('.full-start-new__buttons'))
        }
        catch(e){}
        window.__imdbbB2 = 1;
        let imdbbFav = $('<div class="imdbb-meta imdbb-fav"><svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z" fill="currentColor"/></svg></div>').appendTo(this.html.find('.full-start-new__rate-line'))
        try{ new MutationObserver(()=>{ let u = this.html[0] && this.html[0].__imdbbHu; u && u() }).observe(imdbbFav[0], {attributes: true, attributeFilter: ['class']}) }catch(e){}
        let imdbbFavUpd = ()=>{ try{ imdbbFav.toggleClass('on', !!window.Lampa.Favorite.check(this.card).book) }catch(e){} }
        imdbbFavUpd()
        this.html.on('hover:long', '.button--play', ()=>{
            if(!document.body.classList.contains('imdbb-compact')) return
            try{
                window.Lampa.Favorite.toggle('book', this.card)
                imdbbFavUpd()
                window.Lampa.Noty.show(window.Lampa.Favorite.check(this.card).book ? 'Добавлено в закладки' : 'Убрано из закладок')
            }
            catch(e){}
        })

        if(window.localStorage.getItem('imdbb_no_tr') !== 'false') this.html.find('.view--trailer').remove()
        if(window.localStorage.getItem('imdbb_no_more') !== 'false') this.html.find('.button--options').remove();
        if(document.body.classList.contains('imdbb-compact') && !document.body.classList.contains('imdbb-sh-sub')){ window.__imdbbSub = 1; this.html.find('.button--subscribe').remove() }
        if(window.lampa_settings.read_only) this.html.find('.button--play').remove()

        try{
            let pp = this.card.poster_path || this.card.backdrop_path
            if(pp){
                let im = new Image()
                im.crossOrigin = 'anonymous'
                im.onload = ()=>{
                    try{
                        let W = 32, H = 48, cv = document.createElement('canvas')
                        cv.width = W; cv.height = H
                        let cx = cv.getContext('2d')
                        cx.drawImage(im, 0, 0, W, H)
                        let px = cx.getImageData(0, 0, W, H).data, bins = {}
                        for(let i = 0; i < px.length; i += 4){
                            let r = px[i] / 255, g = px[i+1] / 255, b = px[i+2] / 255
                            let mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2
                            if(d < 0.12 || l < 0.15 || l > 0.9) continue
                            let s = d / (1 - Math.abs(2 * l - 1))
                            let h = mx == r ? ((g - b) / d + (g < b ? 6 : 0)) : mx == g ? ((b - r) / d + 2) : ((r - g) / d + 4)
                            h = h * 60
                            let k = Math.floor(h / 20) % 18
                            let w = s * (1 - Math.abs(2 * l - 1)) + 0.05
                            let o = bins[k] || (bins[k] = {w: 0, h: 0, s: 0})
                            o.w += w; o.h += h * w; o.s += s * w
                        }
                        let best = null
                        Object.keys(bins).forEach((k)=>{ if(!best || bins[k].w > best.w) best = bins[k] })
                        if(!best) return
                        let hh = Math.round(best.h / best.w)
                        let ss = Math.min(78, Math.max(55, Math.round(best.s / best.w * 100)))
                        let ll = (hh > 40 && hh < 190) ? 33 : 46
                        this.html[0].style.setProperty('--imdbb-accent', 'hsl(' + hh + ', ' + ss + '%, ' + ll + '%)')
                        this.html[0].style.setProperty('--imdbb-accent-soft', 'hsla(' + hh + ', ' + ss + '%, ' + ll + '%, 0.38)');this.html[0].style.setProperty('--imdbb-btn', 'hsl(' + hh + ', ' + Math.min(+ss, 70) + '%, ' + Math.max(22, Math.min(+ll, 38)) + '%)');this.html[0].style.setProperty('--imdbb-on', '#fff')
                    }
                    catch(e){}
                }
                im.src = window.Lampa.TMDB.image('t/p/w154' + pp)
            }
        }
        catch(e){}
        this.emit('create')
    }

    toggle(){
        let controller = {
            link: this,
            toggle: ()=>{
                this.emit('groupButtons')
                
                Controller.collectionSet(this.html)
                Controller.collectionFocus(this.last || false, this.html)

                this.emit('toggle')
            },
            right: ()=>{
                Navigator.move('right')
            },
            left: ()=>{
                if(Navigator.canmove('left')) Navigator.move('left')
                else this.emit('left')
            },
            down: ()=>{
                if(Navigator.canmove('down')) Navigator.move('down')
                else this.emit('down')
            },
            up: ()=>{
                if(Navigator.canmove('up')) Navigator.move('up')
                else this.emit('up')
            },
            back: this.emit.bind(this, 'back'),
        }

        this.emit('controller', controller)

        Controller.add('full_start', controller)

        Controller.toggle('full_start')
    }

    render(js){
        return js ? this.html[0] : this.html
    }

    destroy(){
        this.html.remove()

        this.emit('destroy')
    }
}

export default Start