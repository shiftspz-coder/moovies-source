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

const ML_K = 'font-size:.8em;opacity:.6'
const ML_N = 'font-weight:500'
const ML_GL = 'background:rgba(255,255,255,0.09)'
const ML_DV = 'border-left:1px solid rgba(255,255,255,0.18)'

function sidWord(n){
    let a = n % 100, b = n % 10

    if(a > 10 && a < 15) return 'сидов'
    if(b == 1) return 'сид'
    if(b > 1 && b < 5) return 'сида'

    return 'сидов'
}

function renderBox(st, s, progress){
    let nn = v=>parseInt(v)
    let has = v=>!isNaN(v)
    let dash = v=>has(v) ? v : '—'
    let seeds = nn(s.seeds), act = nn(s.active_peers), tot = nn(s.total_peers), pend = nn(s.pending), half = nn(s.half)
    let speed = s.speed || '', up = s.up || ''
    let mb = v=>(v / 1048576).toFixed(1)
    let size = s.ps > 0 ? mb(s.pb || 0) + ' / ' + mb(s.ps) + ' МБ' : ''
    let etav = ''
    let join = a=>a.filter(Boolean).join(' · ')
    let sw = has(seeds) ? sidWord(seeds) : 'сидов'
    let K = (t, x)=>'<div style="' + ML_K + (x || '') + '">' + t + '</div>'

    if(s.ps > 0 && s.dl > 0){
        let left = Math.max(0, Math.round((s.ps - (s.pb || 0)) / s.dl))

        etav = '~' + Math.floor(left / 60) + ':' + ('0' + (left % 60)).slice(-2)
    }

    let eta = etav ? 'осталось ' + etav : ''
    let peers = has(act)
    let pl = join([peers && act + ' активных', half > 0 && half + ' подключаются', pend > 0 && pend + ' в очереди'])

    if(!peers) return K(join([speed && '↓ ' + speed, size, eta]), ';font-size:.95em')

    if(st == 1){
        let seg = (n, t, d)=>'<div style="padding:0 .7em;' + (d ? ML_DV : '') + '"><span style="' + ML_N + ';font-size:1.15em">' + n + '</span> ' + t + '</div>'

        return '<div style="' + ML_GL + ';border-radius:1.4em;display:flex;justify-content:center;padding:.55em .3em;font-size:.95em">' + seg(dash(seeds), sw) + seg(act, 'активных', 1) + seg(dash(half), 'подкл.', 1) + seg(speed || '0.0', '', 1) + '</div>' + K(join([size, eta, pend > 0 && 'в очереди ' + pend, up && 'отдача ' + up]), ';margin-top:.6em')
    }

    if(st == 2){
        return '<div style="margin-bottom:.5em"><span style="' + ML_GL + ';border-radius:1.4em;display:inline-block;padding:.45em 1.4em"><span style="' + ML_N + ';font-size:1.7em">' + dash(seeds) + '</span> <span style="opacity:.85">' + sw + ' в раздаче</span></span></div><div style="margin-bottom:.4em"><span style="' + ML_GL + ';border-radius:1.2em;display:inline-block;padding:.3em 1em;font-size:.9em;opacity:.9">' + join([speed && '↓ ' + speed, size, eta]) + '</span></div>' + K(pl)
    }

    if(st == 4){
        return '<div style="display:grid;grid-template-columns:1fr 1fr"><div><div style="' + ML_N + ';font-size:1.8em;line-height:1.1">' + (speed || '0.0') + '</div>' + K(up ? 'отдача ' + up : 'скорость загрузки') + '</div><div style="' + ML_DV + '"><div style="' + ML_N + ';font-size:1.8em;line-height:1.1">' + dash(seeds) + '</div>' + K(sw + ' в раздаче') + '</div></div>' + K(join([size, eta]) + '<br>' + pl, ';margin-top:.7em;line-height:1.6')
    }

    if(st == 5){
        let row = (n, v)=>'<div style="display:flex;align-items:baseline;gap:.5em;margin-bottom:.35em"><span>' + n + '</span><span style="flex:1;border-bottom:1px dotted rgba(255,255,255,0.35)"></span><span style="' + ML_N + '">' + v + '</span></div>'

        return '<div style="width:80%;margin:0 auto .5em;font-size:.95em;text-align:left">' + row('Сиды', dash(seeds)) + row('Активные', act) + row('Подключаются', dash(half)) + row('Скорость', speed || '0.0') + '</div>' + K(join([size, eta]))
    }

    if(st == 6){
        return '<div style="display:flex;align-items:center;justify-content:center;gap:1.4em"><div style="position:relative;width:4.6em;height:4.6em"><svg viewBox="0 0 64 64" style="width:100%;height:100%;transform:rotate(-90deg)"><circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="4"></circle><circle cx="32" cy="32" r="26" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + (progress * 1.634).toFixed(1) + ' 163.4"></circle></svg><div style="position:absolute;left:0;top:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;' + ML_N + '">' + Math.round(progress) + '%</div></div><div style="text-align:left"><div><span style="' + ML_N + ';font-size:1.8em">' + dash(seeds) + '</span> ' + sw + '</div>' + K(join([speed && '↓ ' + speed, eta]) + '<br>' + join([peers && act + ' активных', half > 0 && half + ' подключаются']), ';line-height:1.5') + '</div></div>'
    }

    if(st == 7){
        let ph = has(seeds) && seeds > 0 ? '<span style="' + ML_N + ';border-bottom:1px solid rgba(255,255,255,0.6);padding-bottom:.05em">' + seeds + ' ' + sw + '</span> в раздаче' + (half > 0 ? ',<br><span style="opacity:.7">подключаемся к ' + half + '</span>' : '') : 'Ищем сидов…'

        return '<div style="font-size:1.5em;line-height:1.4;margin-bottom:.5em">' + ph + '</div>' + K(join([speed, size, eta]) + '<br>' + join([act + ' активных', pend > 0 && pend + ' в очереди']), ';line-height:1.6')
    }

    if(st == 8){
        let fill = has(tot) && tot > 0 ? Math.max(act > 0 ? 1 : 0, Math.round(act * 20 / tot)) : 0
        let segs = ''

        for(let i = 0; i < 20; i++) segs += '<span style="height:.45em;border-radius:.15em;background:' + (i < fill ? '#fff' : 'rgba(255,255,255,0.18)') + '"></span>'

        return '<div style="margin-bottom:.6em"><span style="' + ML_N + ';font-size:1.6em">' + dash(seeds) + '</span> ' + sw + ' <span style="' + ML_K + '">· ' + join([speed && '↓ ' + speed, eta]) + '</span></div><div style="width:84%;margin:0 auto"><div style="display:grid;grid-template-columns:repeat(20,1fr);gap:.2em;margin-bottom:.4em">' + segs + '</div><div style="' + ML_K + ';display:flex;justify-content:space-between"><span>' + act + ' активных' + (has(tot) ? ' из ' + tot : '') + '</span><span>' + (half > 0 ? half + ' подключаются' : '') + '</span></div></div>'
    }

    if(st == 9){
        return '<div style="margin-bottom:.5em"><span style="display:inline-block;background:#f2f2f2;color:#141414;border-radius:1.5em;padding:.4em 1.5em"><span style="font-size:1.6em;font-weight:500">' + dash(seeds) + '</span> ' + sw + ' в раздаче</span></div><div style="font-size:.95em;opacity:.85;margin-bottom:.3em">' + pl + '</div>' + K(join([speed && '↓ ' + speed, up && '↑ ' + up, size, eta]))
    }

    if(st == 10){
        let cell = (n, t, d)=>'<div style="' + (d ? ML_DV : '') + '"><div style="' + ML_N + ';font-size:1.25em;line-height:1.1">' + n + '</div>' + K(t) + '</div>'

        return '<div style="' + ML_GL + ';border-radius:.8em;display:grid;grid-template-columns:repeat(4,1fr);padding:.6em 0">' + cell(dash(seeds), sw) + cell(act, 'активных', 1) + cell(speed || '0.0', 'скорость', 1) + cell(etav || '—', 'осталось', 1) + '</div>' + K(join([size, half > 0 && 'подключаются ' + half, pend > 0 && 'в очереди ' + pend, up && 'отдача ' + up]), ';margin-top:.5em')
    }

    let col = (n, t, d)=>'<div style="' + (d ? ML_DV : '') + '"><div style="' + ML_N + ';font-size:2em;line-height:1.1">' + n + '</div>' + K(t) + '</div>'

    return '<div style="display:grid;grid-template-columns:repeat(3,1fr)">' + col(dash(seeds), sw) + col(act, 'активных', 1) + col(dash(half), 'подключаются', 1) + '</div>' + K(join([speed && '↓ ' + speed, size, eta]), ';margin-top:.7em')
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
            <div class="ml2-extra" style="margin-top:.8em;text-align:center"><div class="ml2-box" style="width:26em;max-width:90vw;margin:0 auto"></div><div class="ml2-warn hide" style="margin-top:.8em"></div></div>
        </div>
    </div>`)
    let media = {}
    let hide_timer
    let last_pb = 0
    let last_ch = Date.now()

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

        last_pb = 0
        last_ch = Date.now()
    }

    function update(value, detail){
        let progress = Math.max(0, Math.min(100, parseFloat(value) || 0))
        let stats = typeof detail == 'object' && detail ? detail : {speed: detail}
        let st = parseInt(Storage.get('moovies_ls', '3')) || 3
        let box = renderBox(st, stats, progress)
        let now = Date.now()
        let pb = stats.pb || 0
        let warn = ''

        if(pb !== last_pb){
            if(pb > last_pb) last_ch = now
            last_pb = pb
        }

        if(stats.ps > 0){
            let idle = now - last_ch
            let wait = stats.dl > 0 ? (stats.ps - pb) / stats.dl : 0

            if(idle >= 20000) warn = 'Сиды отдают медленно: буфер не растёт ' + Math.round(idle / 1000) + ' с.'
            else if(wait > 600) warn = 'Низкая скорость сидов: ожидание ~' + Math.round(wait / 60) + ' мин.'
        }

        html.find('.media-loading__mark-fill').css('width', progress + '%')
        html.find('.media-loading__percent').text(Math.round(progress) + '%')
        html.find('.ml2-box').html(box).toggleClass('hide', !box)
        html.find('.ml2-warn').html(warn ? '<span style="display:inline-flex;align-items:center;gap:.7em;background:rgba(255,255,255,0.09);border-radius:1em;padding:.5em 1.1em;font-size:.9em;text-align:left"><span style="flex:none;width:1.4em;height:1.4em;border:.1em solid #fff;border-radius:50%;text-align:center;line-height:1.3em;font-weight:500">!</span><span>' + warn + '</span></span>' : '').toggleClass('hide', !warn)
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
