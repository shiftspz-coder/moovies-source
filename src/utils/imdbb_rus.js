const ICO = '<svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-width="4"><rect x="6" y="10" width="36" height="28" rx="3"/><path d="M6 20h36M6 29h36"/></g></svg>'
let tries = 0
let li = null
let param_added = false

function enabled(){
    let v = window.Lampa.Storage.get('rus_menu', 'true')

    return v !== false && v !== 'false'
}

function apply(){
    if(li) li.toggleClass('hide', !enabled())
    applyStyle()
    place()
}

const WST = ['a','b','v','ring','side','top','corner','dim','under']

function applyStyle(){
    let v = window.Lampa.Storage.get('imdbb_wstyle', 'b')
    WST.forEach(k => document.body.classList.remove('wst-' + k))
    document.body.classList.add('wst-' + (WST.indexOf(v) > -1 ? v : 'b'))
}

function place(){
    if(!li) return
    let tv = li.parent().find('[data-action="tv"]').eq(0)
    if(tv.length && !tv.next().is(li)) tv.after(li)
}

setInterval(place, 2000)

function addParam(){
    if(param_added) return

    let L = window.Lampa

    if(!L || !L.SettingsApi) return

    param_added = true

    L.SettingsApi.addParam({
        component: 'imdbb',
        param: {name: 'rus_menu', type: 'trigger', default: true},
        field: {name: 'Русское в меню', description: 'Показывать пункт «Русское» (русские фильмы, сериалы и подборки по платформам)'}
    })

    L.SettingsApi.addParam({
        component: 'imdbb',
        param: {name: 'imdbb_wstyle', type: 'select', values: {a: 'А · у края', b: 'Б · плавающая полоса', v: 'В · с маркером', ring: '1 · по рамке', side: '2 · сбоку', top: '3 · сверху', corner: '4 · кольцо в углу', dim: '5 · затемнение', under: '6 · под карточкой'}, default: 'b'},
        field: {name: 'Вид метки просмотра', description: 'Как показывать прогресс на карточке в фокусе'}
    })

    L.Storage.listener.follow('change', (e)=>{
        if(e.name === 'rus_menu') apply()
        if(e.name === 'imdbb_wstyle') applyStyle()
    })
}

function add(){
    let L = window.Lampa

    if(!L || !L.Storage || !L.SettingsApi) return false

    addParam()

    let list = $('.menu .menu__list').eq(0)

    if(!list.length) return false

    if(!list.find('[data-rus]').length){
        li = $('<li class="menu__item selector" data-rus="1"><div class="menu__ico">' + ICO + '</div><div class="menu__text">Русское</div></li>')

        li.on('hover:enter', ()=>{
            L.Activity.push({url: '', title: 'Русское', component: 'main', source: 'tmdb', rus_mode: true, page: 1})
        })

        let main = (list.find('[data-action="tv"]').eq(0).length ? list.find('[data-action="tv"]').eq(0) : list.find('[data-action="main"]').eq(0))

        if(main.length) main.after(li)
        else list.append(li)
    }

    apply()

    return true
}

let timer = setInterval(()=>{
    tries++

    if(add() || tries > 240) clearInterval(timer)
}, 500)
