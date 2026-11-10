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

function create(){
    let html = $(`<div class="media-loading hide">
        <img class="media-loading__backdrop" alt="">
        <div class="media-loading__shade"></div>
        <div class="media-loading__content">
            <div class="media-loading__mark">
                <div class="media-loading__mark-background"></div>
                <div class="media-loading__mark-fill"></div>
            </div>
            <div class="media-loading__status">
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
            <div class="ml2-extra" style="margin-top:.6em;font-size:1.05em;line-height:1.5;text-align:center;opacity:.85"><div class="ml2-l1"></div><div class="ml2-l2"></div></div>
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
        let speed = stats.speed || ''
        let active = parseInt(stats.active_peers)
        let total = parseInt(stats.total_peers)
        let show_peers = !isNaN(active)

        html.find('.media-loading__mark-fill').css('width', progress + '%')
        html.find('.media-loading__percent').text(Math.round(progress) + '%')
        html.find('.media-loading__speed').text(speed).toggleClass('hide', !speed)
        html.find('.media-loading__peers-separator').toggleClass('hide', !show_peers)
        html.find('.media-loading__speed-separator').toggleClass('hide', !speed)
        html.find('.media-loading__peers').toggleClass('hide', !show_peers)
        html.find('.media-loading__peers-value').text(show_peers ? active + ' / ' + (isNaN(total) ? '—' : total) : '')

        let mb = v=>(v/1048576).toFixed(1)
        let l1 = [], l2 = []
        if(speed) l1.push('\u2193 ' + speed)
        if(stats.up) l1.push('\u2191 ' + stats.up)
        if(stats.ps > 0) l1.push(mb(stats.pb || 0) + ' / ' + mb(stats.ps) + ' \u041c\u0411')
        if(stats.ps > 0 && stats.dl > 0){
            let left = Math.max(0, Math.round((stats.ps - (stats.pb || 0)) / stats.dl))
            l1.push('\u043e\u0441\u0442\u0430\u043b\u043e\u0441\u044c ~' + Math.floor(left / 60) + ':' + ('0' + (left % 60)).slice(-2))
        }
        if(show_peers){
            l2.push(active + ' \u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0445')
            if(!isNaN(stats.seeds)) l2.push(stats.seeds + ' \u0441\u0438\u0434\u043e\u0432')
            if(stats.half > 0) l2.push(stats.half + ' \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0430\u044e\u0442\u0441\u044f')
            if(stats.pending > 0) l2.push(stats.pending + ' \u0436\u0434\u0443\u0442')
            if(!isNaN(total)) l2.push(total + ' \u0432\u0441\u0435\u0433\u043e')
        }
        html.find('.ml2-l1').text(l1.join(' \u00b7 ')).toggleClass('hide', !l1.length)
        html.find('.ml2-l2').text(l2.join(' \u00b7 ')).toggleClass('hide', !l2.length)
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
