import IMDb from '../utils/imdb'
import {qcached} from '../interaction/card/module/ratting'

const ASIA = 'ja ko zh th vi hi ta te ml kn bn ur pa gu mr ne si my km lo mn ka hy az kk ky tg tk uz'.split(' ')
const ITEMS = [
    ['asian', 'Фильтр: без азиатского контента', 'Скрываем карточки азиатского происхождения'],
    ['lang', 'Фильтр: без контента на другом языке', 'Скрываем карточки без перевода названия'],
    ['rating', 'Фильтр: без низкого рейтинга', 'Скрываем карточки с оценкой IMDb ниже 6.0'],
    ['history', 'Фильтр: без просмотренного', 'Скрываем брошенное и просмотренное'],
    ['ts', 'Фильтр: без TS', 'Скрываем фильмы с качеством TS']
]

function on(n){
    let v = window.Lampa.Storage.get('imdbb_f_' + n, 'false')

    return v === true || v === 'true'
}

function kind(m){
    return m.media_type === 'tv' || (m.name && !m.title) || m.first_air_date ? 'tv' : 'movie'
}

function minr(){
    return parseFloat(window.Lampa.Storage.get('imdbb_minr', '6')) || 6
}

function filter(list){
    if(!Array.isArray(list)) return list

    let a = on('asian'), l = on('lang'), r = on('rating'), h = on('history'), t = on('ts')

    if(!(a || l || r || h || t)) return list

    let lg = window.Lampa.Storage.get('language', 'ru')

    return list.filter(function(m){
        if(!m) return true

        let ol = m.original_language ? String(m.original_language).toLowerCase() : ''

        if(a && ol && ASIA.indexOf(ol) > -1) return false
        if(l && ol && ol !== lg && (m.title || m.name) === (m.original_title || m.original_name)) return false

        if(r){
            let v = IMDb.cached(m)

            if(v && v < minr()) return false
        }

        if(t && qcached(m) === 'TS') return false

        if(h && ol){
            try{ if(seen(m)) return false }
            catch(e){}
        }

        return true
    })
}

function seen(m){
    let L = window.Lampa
    let fc = L.Favorite.check(m)

    if(fc && (fc.thrown || fc.viewed)) return true
    if(!(fc && fc.history)) return false
    if(kind(m) === 'movie') return true

    let now = new Date()
    let fav = L.Storage.get('favorite', '{}')
    let tt = L.Storage.cache('timetable', 300, [])
    let title = m.original_title || m.original_name
    let eps = {}
    let c = (fav.card || []).filter(function(x){ return x.id === m.id && Array.isArray(x.seasons) })[0]

    if(c) c.seasons.forEach(function(s){
        if(s.season_number > 0 && s.episode_count > 0 && s.air_date && new Date(s.air_date) < now){
            for(let e = 1; e <= s.episode_count; e++) eps[s.season_number + '_' + e] = [s.season_number, e]
        }
    })

    let t = tt.filter(function(x){ return x.id === m.id })[0]

    if(t && Array.isArray(t.episodes)) t.episodes.forEach(function(e){
        if(e.season_number > 0 && e.air_date && new Date(e.air_date) < now) eps[e.season_number + '_' + e.episode_number] = [e.season_number, e.episode_number]
    })

    let list = Object.keys(eps).map(function(k){ return eps[k] })

    if(!list.length) return false

    return list.every(function(p){
        let h = L.Utils.hash([p[0], p[0] > 10 ? ':' : '', p[1], title].join(''))

        return L.Timeline.view(h).percent > 0
    })
}

function init(){
    let L = window.Lampa

    try{
        let noacc = window.lampa_settings && window.lampa_settings.account_use === false

        L.SettingsApi.addComponent({
            component: 'imdbb',
            before: noacc ? 'interface' : 'account',
            name: 'IMDb+',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" stroke-width="2"/><path d="M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
        })

        let FLT = ITEMS.map(function(it){ return [it[0], it[1].replace(/^Фильтр: /, ''), it[2]] }).concat([['nobd', 'Поиск: скрывать карточки без кадра', 'В поиске остаются только широкие карточки с кадром (при следующем поиске)']])
        let NBD = {off: 'Как сейчас', a: 'А: постер обрезан по центру', b: 'Б: постер целиком на фоне'}
        let fltItem = null
        let fltOn = function(k){ let v = L.Storage.get('imdbb_f_' + k, 'false'); return v === true || v === 'true' }
        let fltNbd = function(){ let m = String(L.Storage.get('imdbb_card_nobd', 'off')); return NBD[m] ? m : 'off' }
        let fltText = function(){ return 'Включено: ' + FLT.filter(function(x){ return fltOn(x[0]) }).length + ' из ' + FLT.length + ' · Поиск, карточки без кадра: ' + NBD[fltNbd()] }
        let fltBack = function(){ if(fltItem) fltItem.find('.settings-param__descr').text(fltText()); L.Controller.toggle('settings_component') }
        let fltOpen = function(){
            L.Select.show({
                title: 'Фильтры (галочка: скрывать)',
                items: FLT.map(function(x){ return {title: x[1], subtitle: x[2], key: x[0], checkbox: true, checked: fltOn(x[0])} }).concat([{title: 'Поиск: карточки без кадра', subtitle: 'Сейчас: ' + NBD[fltNbd()], onSelect: function(){ setTimeout(function(){ L.Select.show({title: 'Поиск: карточки без кадра', items: Object.keys(NBD).map(function(k){ return {title: NBD[k], key: k, selected: fltNbd() === k} }), onSelect: function(a){ L.Storage.set('imdbb_card_nobd', a.key); fltBack() }, onBack: fltBack }) }, 50) }}]),
                onCheck: function(a){ L.Storage.set('imdbb_f_' + a.key, a.checked) },
                onBack: fltBack
            })
        }
        L.SettingsApi.addParam({component: 'imdbb', param: {name: 'imdbb_flt', type: 'button'}, field: {name: 'Фильтры', description: fltText()}, onRender: function(item){ fltItem = item; item.find('.settings-param__descr').text(fltText()) }, onChange: fltOpen})

        let LGM = {off: 'Выкл', a: 'А: снизу слева', b: 'Б: по центру', c: 'В: только в фокусе'}
        let lgxItem = null
        let lgxCard = function(){ let v = L.Storage.get('logo_card', 'true'); return !(v === false || v === 'false') }
        let lgxMode = function(){ let m = String(L.Storage.get('imdbb_logo_mode', 'a')); return LGM[m] ? m : 'a' }
        let lgxRu = function(){ let v = L.Storage.get('imdbb_logo_ru', 'false'); return v === true || v === 'true' }
        let lgxText = function(){ return 'В открытой карточке: ' + (lgxCard() ? 'да' : 'нет') + ' · В ряду: ' + LGM[lgxMode()] + ' · Русское название: ' + (lgxRu() ? 'да' : 'нет') }
        let lgxBack = function(){ if(lgxItem) lgxItem.find('.settings-param__descr').text(lgxText()); L.Controller.toggle('settings_component') }
        let lgxOpen = function(){
            L.Select.show({
                title: 'Логотипы',
                items: [
                    {title: 'Логотип вместо названия в открытой карточке', subtitle: 'На карточке фильма', key: 'card', checkbox: true, checked: lgxCard()},
                    {title: 'Русское название над логотипом', subtitle: 'Если логотип не русский', key: 'ru', checkbox: true, checked: lgxRu()},
                    {title: 'Русское название шрифтом вместо логотипа', subtitle: 'Если логотип не русский. Цвет как у логотипа', key: 'tx', checkbox: true, checked: (function(){ let v = L.Storage.get('imdbb_logo_tx', 'false'); return v === true || v === 'true' })()},
                    {title: 'Логотипы на карточках в ряду', subtitle: 'Сейчас: ' + LGM[lgxMode()] + ' (только главная)', onSelect: function(){ setTimeout(function(){ L.Select.show({title: 'Логотипы в ряду (главная)', items: Object.keys(LGM).map(function(k){ return {title: LGM[k], key: k, selected: lgxMode() === k} }), onSelect: function(a){ L.Storage.set('imdbb_logo_mode', a.key); lgxBack() }, onBack: lgxBack }) }, 50) }}
                ],
                onCheck: function(a){ L.Storage.set(a.key === 'ru' ? 'imdbb_logo_ru' : (a.key === 'tx' ? 'imdbb_logo_tx' : 'logo_card'), a.checked) },
                onBack: lgxBack
            })
        }
        L.SettingsApi.addParam({component: 'imdbb', param: {name: 'imdbb_lgx', type: 'button'}, field: {name: 'Логотипы', description: lgxText()}, onRender: function(item){ lgxItem = item; item.find('.settings-param__descr').text(lgxText()) }, onChange: lgxOpen})

        

        L.SettingsApi.addParam({component: 'imdbb', param: {name: 'imdbb_infinite', type: 'trigger', default: true}, field: {name: 'Бесконечные карточки', description: 'Ряды подгружаются до конца вместо кнопки «Ещё»'}})

        L.SettingsApi.addParam({component: 'imdbb', param: {name: 'imdbb_style', type: 'trigger', default: true}, field: {name: 'Стильный интерфейс', description: 'Горизонтальные карточки, блок информации и новая карточка фильма во всех разделах, включая поиск и избранное. ТВ и телефон в горизонтали'}, onChange: function(){ if(window.__imdbbStySync) window.__imdbbStySync() }})


        let cmp = function(){
            try{
                let v = L.Storage.get('imdbb_compact', 'true')
                let on = !(v === false || v === 'false')
                let tv = false

                try{
                    tv = !!(L.Platform && (L.Platform.tv() || (L.Platform.screen('tv') && !/mobile/i.test(navigator.userAgent))))
                }
                catch(e){}

                document.body.dataset.imdbbTv = tv ? '1' : '0'
                let land = false
                try{ land = window.innerWidth > window.innerHeight }catch(e){}
                document.body.classList.toggle('imdbb-compact', on && (tv || land))
            }
            catch(e){}
        }

        window.__imdbbStySync = function(){ try{ let st = L.Storage.get('imdbb_style', 'true'); let on = !(st === false || st === 'false'); try{ L.Storage.set('imdbb_compact', on); L.Storage.set('imdbb_wide', on) }catch(e){} localStorage.setItem('imdbb_compact', on ? 'true' : 'false'); localStorage.setItem('imdbb_wide', on ? 'true' : 'false') }catch(e){} cmp() };

        let VIS = [
            ['imdbb_hide_badges', 'Рейтинг IMDb, качество, сезоны и серии на карточках', 'Значки на постерах и в рядах (по умолчанию показаны)', true],
            ['imdbb_h_prof', 'Профиль в шапке', 'Кнопка профиля вверху'],
            ['imdbb_h_mark', 'Индикаторы связи', 'Значки соединения в шапке'],
            ['imdbb_h_bcast', '«Трансляция»', 'Кнопка в шапке (стильный интерфейс)'],
            ['imdbb_h_logo', 'Логотип Lampa', 'Слева вверху (стильный интерфейс)'],
            ['imdbb_no_tr', 'Трейлеры и Shots', 'Shots: после перезапуска приложения'],
            ['imdbb_no_more', 'Кнопка «Ещё»', 'Три точки в карточке (при следующем открытии карточки)'],
            ['imdbb_h_sub', 'Кнопка подписки', 'В карточке фильма (стильный интерфейс)'],
            ['imdbb_h_qual', 'Старые метки качества', 'Жёлтые метки на карточках (стильный интерфейс)'],
            ['imdbb_h_descr', 'Ряд «Подробно»', 'Описание, жанр, бюджет, страны под карточкой (стильный интерфейс)'],
            ['imdbb_h_disc', 'Комментарии', 'Ряд под карточкой (стильный интерфейс)'],
            ['imdbb_h_pers', 'Ряд актёров', 'Родной ряд под карточкой (стильный интерфейс)'],
            ['imdbb_h_meta', 'Ряды метаданных', 'metadata_chart и metadata_tags (стильный интерфейс)']
        ]
        let visItem = null
        let visShown = function(it){ let v = localStorage.getItem(it[0]); return it[3] ? v !== 'true' : v === 'false' }
        let visText = function(){ return 'Показано: ' + VIS.filter(visShown).length + ' из ' + VIS.length }
        L.SettingsApi.addParam({component: 'imdbb', param: {name: 'imdbb_visible', type: 'button'}, field: {name: 'Показывать элементы', description: visText()}, onRender: function(item){ visItem = item; item.find('.settings-param__descr').text(visText()) }, onChange: function(){ L.Select.show({title: 'Показывать элементы', items: VIS.map(function(it){ return {title: it[1], subtitle: it[2], key: it[0], checkbox: true, checked: visShown(it)} }), onCheck: function(a){ L.Storage.set(a.key, !a.checked) }, onBack: function(){ if(visItem) visItem.find('.settings-param__descr').text(visText()); L.Controller.toggle('settings_component') } }) }})

        

        L.SettingsApi.addParam({
            component: 'imdbb',
            param: {name: 'imdbb_swipe', type: 'trigger', default: true},
            field: {name: 'Свайп (только мобильная версия)', description: 'Свайп пальцем двигает фокус по карточкам и рядам вместо прокрутки. Только телефон в горизонтали, на ТВ и приставках не действует. Работает сразу'}
        })

        

        
        

        cmp()
        try{ if(localStorage.getItem('imdbb_style') === null){ let c0 = L.Storage.get('imdbb_compact', 'true'); let w0 = localStorage.getItem('imdbb_wide'); let on0 = !(c0 === false || c0 === 'false' || w0 === 'false'); L.Storage.set('imdbb_style', on0); window.__imdbbStySync() } }catch(e){}
        window.__imdbbSh = function(){ try{ ['prof','mark','bcast','logo','sub','qual','descr','disc','pers','meta'].forEach(function(k){ document.body.classList.toggle('imdbb-sh-' + k, localStorage.getItem('imdbb_h_' + k) === 'false') }) }catch(e){} }
        window.__imdbbSh(); setTimeout(window.__imdbbSh, 1000)
        try{ L.Storage.listener.follow('change', function(e){ if(e && e.name && e.name.indexOf('imdbb_h_') === 0) window.__imdbbSh() }) }catch(e){}
        window.__imdbbNb = function(){ try{ document.body.classList.toggle('imdbb-nobadge', localStorage.getItem('imdbb_hide_badges') === 'true') }catch(e){} }
        window.__imdbbNb(); setTimeout(window.__imdbbNb, 1000)
        try{ L.Storage.listener.follow('change', function(e){ if(e && e.name === 'imdbb_hide_badges') window.__imdbbNb() }) }catch(e){}
        setTimeout(cmp, 1000)
        window.addEventListener('resize', cmp)
        window.addEventListener('orientationchange', function(){ setTimeout(cmp, 300) })

        try{ L.Storage.listener.follow('change', function(e){ if(e && e.name === 'imdbb_compact') cmp() }) }
        catch(e){}

        L.Listener.follow('request_secuses', function(e){
            try{
                let u = e && e.params && e.params.url

                if(!u || !e.data || !Array.isArray(e.data.results)) return
                if(u.indexOf(L.TMDB.api('')) < 0 || u.indexOf('/search') > -1 || u.indexOf('/person/') > -1) return

                e.data.original_length = e.data.results.length
                e.data.results = filter(e.data.results)
            }
            catch(x){}
        })
    }
    catch(x){}
}

export default {init, filter}
