import Arrays from '../utils/arrays'
import Settings from '../interaction/settings/api'
import Storage from '../core/storage/storage'
import Lang from '../core/lang'
import TMDB from './api/sources/tmdb'

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

    add(yearRow())
    add(newRelRow())

    // imdbb-mainrows: выключатели встроенных рядов главной (TMDB), ряды строит tmdb.js
    let imdbbMainRows = [['now_watch','title_now_watch'],['trend_day','title_trend_day'],['trend_week','title_trend_week'],['upcoming','title_upcoming'],['popular_movie','title_popular_movie'],['popular_tv','title_popular_tv'],['top_movie','title_top_movie'],['top_tv','title_top_tv']]

    imdbbMainRows.forEach(r=>add({name: 'tmdb_' + r[0], title: Lang.translate(r[1]), call: ()=>{}}))

    Lampa.Settings.listener.follow('open', (e) => {
        if (e.name == 'main') settings()
    })
}

function yearRow(){
    let rx = /^\d{4}-\d{2}-\d{2}$/
    let val = (k, d)=>{
        let v = String(Storage.get(k, d)).trim()

        return rx.test(v) ? v : d
    }

    return {
        name: 'year_releases',
        title: 'Релизы по дате выхода',
        index: 0,
        screen: ['main'],
        settings: [
            {param: {name: 'year_releases_from', type: 'input', values: '', default: '2026-01-01', placeholder: '2026-01-01'}, field: {name: 'Релизы: дата от', description: 'Формат ГГГГ-ММ-ДД, например 2026-12-31'}},
            {param: {name: 'year_releases_to', type: 'input', values: '', default: '2026-12-31', placeholder: '2026-12-31'}, field: {name: 'Релизы: дата до', description: 'Формат ГГГГ-ММ-ДД, например 2026-12-31'}}
        ],
        call: (params)=>{
            let from = val('year_releases_from', '2026-01-01')
            let to   = val('year_releases_to', '2026-12-31')
            let full = from.slice(0,4) == to.slice(0,4) && from.slice(5) == '01-01' && to.slice(5) == '12-31'

            return function(call){
                TMDB.get('discover/movie?primary_release_date.gte=' + from + '&primary_release_date.lte=' + to + '&sort_by=primary_release_date.desc', params, (json)=>{
                    json.title = full ? 'Релизы ' + from.slice(0,4) : 'Релизы ' + from + ' — ' + to

                    call(json)
                }, call)
            }
        }
    }
}

// imdbb-newrel: новинки по дате выхода, от сегодняшнего дня назад
function newRelRow(){
    return {
        name: 'new_releases',
        title: 'Новинки по дате',
        index: 0,
        screen: ['main'],
        call: (params)=>{
            let d = new Date()
            let to = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2)

            return function(call){
                TMDB.get('discover/movie?primary_release_date.lte=' + to + '&sort_by=primary_release_date.desc&vote_count.gte=50', params, (json)=>{
                    json.title = 'Новинки по дате'

                    call(json)
                }, call)
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