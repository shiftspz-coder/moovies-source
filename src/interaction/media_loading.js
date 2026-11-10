import Api from '../core/api/api'
import Storage from '../core/storage/storage'
import {selectLogo} from './media_loading_data'

function imageUrl(path, size){
    if(!path) return ''
    if(/^(https?:)?\/\//i.test(path) || /^(data|blob):/i.test(path)) return path

    return Api.img(path, size)
}

function mediaData(data = {}){
    let card = data.card || data.movie || data
    let logo = selectLogo(card.images && card.images.logos, Storage.field('tmdb_lang'))

    return {
        title: data.first_title || card.title || card.name || data.title || '',
        background: imageUrl(card.backdrop_path, 'original') || card.background_image || card.background || data.background || data.img || data.thumbnail || '',
        logo: logo ? imageUrl(logo.file_path, 'w500') : card.logo || data.logo || ''
    }
}

function createMark(media, class_name){
    let mark = $('<div class="media-loading__mark-content '+class_name+'"></div>')

    if(media.logo){
        mark.append($('<img class="media-loading__logo" alt="">').attr('src', media.logo))
    }
    else{
        mark.append($('<div class="media-loading__title"></div>').text(media.title))
    }

    return mark
}

const ML_ACC = '#5DCAA5'

function sidWord(n){
    let a = n % 100, b = n % 10

    if(a > 10 && a < 15) return 'сидов'
    if(b == 1) return 'сид'
    if(b > 1 && b < 5) return 'сида'

    return 'сидов'
}

function renderBox(st, s){
    let toN = v=>parseInt(v)
    let has = v=>!isNaN(v)
    let dash = v=>has(v) ? v : '—'
    let seeds = toN(s.seeds), act = toN(s.active_peers), pend = toN(s.pending), half = toN(s.half)
    let speed = s.speed || '', up = s.up || ''
    let mb = v=>(v / 1048576).toFixed(1)
    let size = s.ps > 0 ? mb(s.pb || 0) + ' / ' + mb(s.ps) + ' МБ' : ''
    let eta = ''
    let join = a=>a.filter(Boolean).join(' · ')
    let sw = has(seeds) ? sidWord(seeds) : 'сидов'
    let dim = 'font-size:.85em;opacity:.7;line-height:1.6'
    let peers = has(act)

    if(s.ps > 0 && s.dl > 0){
        let left = Math.max(0, Math.round((s.ps - (s.pb || 0)) / s.dl))

        eta = 'осталось ~' + Math.floor(left / 60) + ':' + ('0' + (left % 60)).slice(-2)
    }

    if(st == 1){
        let l1 = join([speed && '↓ ' + speed, up && '↑ ' + up, size, eta])
        let l2 = join([peers && act + ' активных', half > 0 && half + ' подключаются', pend > 0 && pend + ' в очереди'])

        return '<div style="font-size:3em;font-weight:500;line-height:1;color:' + ML_ACC + '">' + dash(seeds) + '</div><div style="opacity:.85;margin-bottom:.6em">' + sw + ' в раздаче</div><div style="' + dim + '">' + l1 + '<br>' + l2 + '</div>'
    }

    if(st == 3){
        let chip = (c, t)=>'<div style="background:rgba(255,255,255,0.08);border-radius:1.2em;padding:.3em .8em;text-align:left;white-space:nowrap"><span style="color:' + c + '">●</span> ' + t + '</div>'

        return '<div style="font-size:2.2em;font-weight:500;line-height:1.1;color:' + ML_ACC + '">' + (speed || '0.0') + '</div><div style="font-size:.85em;opacity:.7;margin:.3em 0 .7em">' + join([size, eta]) + '</div>' + (peers ? '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.5em">' + chip(ML_ACC, dash(seeds) + ' ' + sw) + chip('#85B7EB', act + ' активных') + chip('#EF9F27', dash(half) + ' подключаются') + chip('#888780', dash(pend) + ' в очереди') + '</div>' : '')
    }

    if(st == 4){
        let mx = Math.max(seeds || 0, act || 0, half || 0, pend || 0, 1)
        let row = (c, n, v)=>'<div style="display:flex;align-items:center;gap:.6em;margin-bottom:.4em"><span style="width:6.5em;text-align:left;white-space:nowrap;font-size:.85em">' + n + '</span><span style="flex:1;height:.4em;background:rgba(255,255,255,0.18);border-radius:.2em"><span style="display:block;height:.4em;border-radius:.2em;background:' + c + ';width:' + (has(v) ? Math.max(v > 0 ? 3 : 0, Math.round(v * 100 / mx)) : 0) + '%"></span></span><span style="width:2.4em;text-align:right;font-size:.85em">' + dash(v) + '</span></div>'

        return '<div style="display:flex;gap:1.2em;align-items:center"><div style="width:8em;flex:none;text-align:left"><div style="font-size:1.8em;font-weight:500;line-height:1.1;color:' + ML_ACC + '">' + (speed || '0.0') + '</div>' + (up ? '<div style="font-size:.8em;opacity:.6">↑ ' + up + '</div>' : '') + '<div style="font-size:.8em;opacity:.6;margin-top:.5em">' + size + '<br>' + eta + '</div></div><div style="flex:1">' + (peers ? row(ML_ACC, 'Сиды', seeds) + row('#85B7EB', 'Активные', act) + row('#EF9F27', 'Подключаются', half) + row('#888780', 'В очереди', pend) : '') + '</div></div>'
    }

    if(st == 5){
        let ph = has(seeds) && seeds > 0 ? 'Нашли <span style="font-weight:500;color:' + ML_ACC + '">' + seeds + ' ' + sw + '</span>' + (half > 0 ? ',<br>подключаемся к ' + half : '') : 'Ищем сидов…'

        return '<div style="font-size:1.4em;line-height:1.4;margin-bottom:.5em">' + ph + '</div><div style="' + dim + '">' + join([speed, size, eta]) + '<br>' + join([peers && act + ' активных', pend > 0 && pend + ' в очереди', up && 'отдача ' + up]) + '</div>'
    }

    let tile = (n, v, hi)=>'<div style="background:' + (hi ? 'rgba(29,158,117,0.28)' : 'rgba(255,255,255,0.08)') + ';border-radius:.5em;padding:.4em .6em;text-align:left"><div style="font-size:.8em;white-space:nowrap;color:' + (hi ? '#9FE1CB' : 'rgba(255,255,255,0.6)') + '">' + n + '</div><div style="font-weight:500;white-space:nowrap;color:' + (hi ? ML_ACC : '#fff') + '">' + v + '</div></div>'

    return '<div style="font-size:.85em;opacity:.8;margin-bottom:.5em">' + join([size, eta]) + '</div>' + (peers ? '<div style="display:grid;grid-template-columns:1fr 1fr 1.35fr;gap:.5em">' + tile('Скачивание', speed || '0.0') + tile('Отдача', up || '0') + tile('Сидов в раздаче', dash(seeds), 1) + tile('Активные', dash(act)) + tile('В очереди', dash(pend)) + tile('Подключаются', dash(half)) + '</div>' : '')
}

function create(){
    let html = $(`<div class="media-loading hide">
        <img class="media-loading__backdrop" alt="">
        <div class="media-loading__shade"></div>
        <div class="media-loading__content">
            <div class="media-loading__mark">
                <div class="media-loading__mark-background"></div>
                <div class="media-loading__mark-fill"></div>
            </div>
            <div class="media-loading__status" style="display:none">
                <span class="media-loading__peers">
                    <svg class="media-loading__peers-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 3v12m0 0 5-5m-5 5-5-5M5 19h14"></path>
                    </svg>
                    <span class="media-loading__peers-value"></span>
                </span>
                <span class="media-loading__separator media-loading__peers-separator"></span>
                <span class="media-loading__speed"></span>
                <span class="media-loading__separator media-loading__speed-separator"></span>
                <span class="media-loading__percent">0%</span>
            </div>
            <div class="ml2-extra" style="margin-top:.8em;text-align:center"><div class="ml2-box" style="width:26em;max-width:90vw;margin:0 auto"></div></div>
        </div>
    </div>`)
    let media = {}
    let hide_timer

    function set(data){
        media = mediaData(data)

        let backdrop = html.find('.media-loading__backdrop')
        let background = html.find('.media-loading__mark-background')
        let fill = html.find('.media-loading__mark-fill')

        if(media.background) backdrop.attr('src', media.background).removeClass('hide')
        else backdrop.attr('src', '').addClass('hide')

        background.empty().append(createMark(media, 'media-loading__mark-content--background'))
        fill.empty().append(createMark(media, 'media-loading__mark-content--foreground'))

        html.toggleClass('media-loading--text', !media.logo)
    }

    function update(value, detail){
        let progress = Math.max(0, Math.min(100, parseFloat(value) || 0))
        let stats = typeof detail == 'object' && detail ? detail : {speed: detail}
        let st = parseInt(Storage.get('moovies_ls', '2')) || 2
        let box = renderBox(st, stats)

        html.find('.media-loading__mark-fill').css('width', progress + '%')
        html.find('.media-loading__percent').text(Math.round(progress) + '%')
        html.find('.ml2-box').html(box).toggleClass('hide', !box)
    }

    function show(data){
        clearTimeout(hide_timer)

        if(data) set(data)

        html.removeClass('hide media-loading--leaving')
    }

    function hide(immediate){
        clearTimeout(hide_timer)

        if(immediate){
            html.addClass('hide').removeClass('media-loading--leaving')
        }
        else{
            html.addClass('media-loading--leaving')

            hide_timer = setTimeout(()=>{
                html.addClass('hide').removeClass('media-loading--leaving')
            },300)
        }
    }

    function destroy(){
        clearTimeout(hide_timer)
        html.remove()
    }

    return {
        render: ()=>html,
        set,
        update,
        show,
        hide,
        destroy
    }
}

export default {
    create
}
