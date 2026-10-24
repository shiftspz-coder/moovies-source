import Arrays from '../utils/arrays'
import Settings from '../interaction/settings/api'
import Storage from '../core/storage/storage'
import Lang from '../core/lang'
import TMDB from './api/sources/tmdb'
import Favorite from './favorite'

let rows = []
let component = 'content_rows'

function init(){
    Settings.addComponent({
        component,
        after: 'interface',
        icon: `<svg width="39" height="39" viewBox="0 0 39 39" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1.5" y="12.3496" width="35.501" height="13.8008" rx="4.5" stroke="white" stroke-width="3"/>
            <rect x="6.82227" width="25.3564" height="3.87305" rx="1.93652" fill="white"/>
            <rect x="6.82227" y="34.6274" width="25.3564" height="3.87305" rx="1.93652" fill="white"/>
        </svg>`,
        name: Lang.translate('title_channels'),
    })

    add(newRelRow())
    add(bookmarksRow())
    add(fireTopRow())

    // imdbb-mainrows: выключатели встроенных рядов главной (TMDB), ряды строит tmdb.js
    let imdbbMainRows = [['now_watch','title_now_watch'],['trend_day','title_trend_day'],['trend_week','title_trend_week'],['upcoming','title_upcoming'],['popular_movie','title_popular_movie'],['popular_tv','title_popular_tv'],['top_movie','title_top_movie'],['top_tv','title_top_tv']]

    imdbbMainRows.forEach(r=>add({name: 'tmdb_' + r[0], title: Lang.translate(r[1]), call: ()=>{}}))

    // imdbb-rowtoggle2: выключатели рядов «по актёрам» и «по жанрам» главной TMDB
    ;[['persons', 'Ряд «Актёры» (фильмы по актёрам)'], ['genres', 'Ряды по жанрам'], ['keywords', 'Ряды по темам (сиквелы, зомби, детективы и др.)']].forEach(r=>add({name: 'tmdb_' + r[0], title: r[1], call: ()=>{}}))

    Lampa.Settings.listener.follow('open', (e) => {
        if (e.name == 'main') settings()
    })
}

// imdbb-newrel: новинки по дате выхода, от сегодняшнего дня назад
function newRelRow(){
    return {
        name: 'new_releases',
        settings: [
            {param: {name: 'new_releases_votes', type: 'select', values: {'0': 'Без порога', '10': '10', '20': '20', '50': '50', '75': '75', '100': '100', '200': '200', '500': '500'}, default: '50'}, field: {name: 'Новинки: минимум голосов', description: 'Сколько оценок в TMDB должно быть у фильма, чтобы попасть в ряд «Новинки по дате»'}}
        ],
        title: 'Новинки по дате',
        index: 0,
        screen: ['main'],
        call: (params)=>{
            let d = new Date()
            let to = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2)
            let vc = parseInt(Storage.get('new_releases_votes', '50'))

            if(isNaN(vc)) vc = 50

            return function(call){
                TMDB.get('discover/movie?primary_release_date.lte=' + to + '&sort_by=primary_release_date.desc&vote_count.gte=' + vc, params, (json)=>{
                    json.title = 'Новинки по дате'

                    json.url = 'discover/movie?primary_release_date.lte=' + to + '&sort_by=primary_release_date.desc&vote_count.gte=' + vc
                    json.source = 'tmdb'

                    call(json)
                }, call)
            }
        }
    }
}

// imdbb-firetop: ряд «Топ по огонькам»: топ фильмов за 3 года по реакции «огонь» CUB (fire_top.json собирает VPS раз в сутки)
function fireTopLoad(ok, fail){
    let C = window.__imdbbFt

    if(C && Date.now() - C.t < 1800000) return ok(C.d)

    let base = location.origin + location.pathname.replace(/[^\/]*$/, '')
    let x = new XMLHttpRequest()

    x.open('GET', base + 'fire_top.json?t=' + Math.floor(Date.now() / 3600000), true)
    x.timeout = 8000
    x.onload = ()=>{
        try{
            let d = JSON.parse(x.responseText)

            if(!d || !d.results || !d.results.length) return fail()

            window.__imdbbFt = {t: Date.now(), d: d}

            ok(d)
        }
        catch(e){ fail() }
    }
    x.onerror = ()=>fail()
    x.ontimeout = ()=>fail()
    x.send()
}

function fireTopRow(){
    return {
        name: 'fire_top',
        title: 'Топ по огонькам',
        index: 2,
        screen: ['main'],
        call: (params)=>{
            return function(call){
                fireTopLoad((d)=>{
                    let N = 20
                    let inf = typeof window.imdbbInf === 'function' ? window.imdbbInf() : true
                    let list = d.results.map((m, i)=>{
                        let r = JSON.parse(JSON.stringify(m))

                        r.source = 'tmdb'
                        r.imdbb_fire = m.fire
                        r.imdbb_fr = i < 3 ? i + 1 : 0

                        return r
                    })
                    let dd = {title: 'Топ по огонькам', results: list.slice(0, N), page: 1, total_pages: Math.ceil(list.length / N)}

                    if(inf && dd.total_pages > 1) dd.imdbb_next = (page, ok2, er)=>{ ok2(list.slice((page - 1) * N, page * N)) }

                    call(dd)
                }, ()=>call())
            }
        }
    }
}

// imdbb-favrow: ряд «Закладки» на главной (подгрузка по настройке imdbb_infinite)
function bookmarksRow(){
    return {
        name: 'bookmarks_row',
        title: 'Закладки',
        index: 1,
        screen: ['main'],
        call: (params)=>{
            return function(call){
                let list = []

                try{ list = Favorite.get({type: 'book'}) || [] }
                catch(e){}

                if(!list.length) return call()

                let N = 20
                let inf = typeof window.imdbbInf === 'function' ? window.imdbbInf() : true
                let d = {title: 'Закладки', results: list.slice(0, N), page: 1, total_pages: Math.ceil(list.length / N)}

                if(inf && d.total_pages > 1) d.imdbb_next = (page, ok, er)=>{ ok(list.slice((page - 1) * N, page * N)) }

                call(d)
            }
        }
    }
}

function settings(){
    Settings.removeParams(component)

    rows.filter(r => r.name).forEach(row=>{
        let name = component + '_' + (row.name || 'unknown')

        Settings.addParam({
            component,
            param: {
                name: name,
                type: 'trigger',
                default: true
            },
            field: {
                name: row.title || Lang.translate('extensions_no_name'),
            }
        })

        if(Arrays.isArray(row.settings)){
            row.settings.forEach(x=>Settings.addParam({component, param: x.param, field: x.field}))
        }
    })
}

function add(row){
    if(typeof row == 'object' && typeof row.call == 'function'){
        if(rows.indexOf(row) == -1){
            rows.push(row)

            if(!row.name || !row.title){
                console.warn('Content row must have name and title', row)
            }
        }
    }
    else {
        console.warn('Content row must be an object with a call function', row)
    }
}

function remove(row){
    let index = rows.indexOf(row)

    if(index > -1){
        rows.splice(index, 1)
    }
}

function call(screen, params, calls){
    let stop = ['genres', 'keywords']

    if(stop.find(a=>params[a])) return

    rows.filter(row=>{
        return row.screen ? (Arrays.isArray(row.screen) ? row.screen.indexOf(screen) >= 0 : row.screen == screen) : false
    }).filter(row=>{
        return Storage.get(component + '_' + (row.name || 'unknown'), 'true')
    }).forEach((row)=>{
        let result = row.call(params, screen)

        if(Arrays.isArray(result)){
            result.forEach((callback, i)=>{
                if(typeof callback == 'function'){
                    Arrays.insert(calls, (row.index || 0) + i, callback)
                }
                else if(Arrays.isObject(callback)){
                    Arrays.insert(calls, (row.index || 0) + i, callback)
                }
            })
        }
        else if(Arrays.isObject(result)){
            Arrays.insert(calls, row.index || 0, result)
        }
        else if(typeof result == 'function'){
            Arrays.insert(calls, row.index || 0, result)
        }
    })
}

export default {
    init,
    add,
    remove,
    call
}