function ready(){
    return window.Lampa && window.Lampa.SettingsApi && window.AndroidJS && typeof window.AndroidJS.changeServerUrl === 'function'
}

function init(){
    let L = window.Lampa
    let url = ''

    try{ url = window.AndroidJS.getServerUrl ? window.AndroidJS.getServerUrl() : '' }
    catch(e){}

    L.SettingsApi.addComponent({
        component: 'moovies_server',
        before: 'interface',
        name: 'Сервер',
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="6" rx="2" stroke="currentColor" stroke-width="2"/><rect x="3" y="14" width="18" height="6" rx="2" stroke="currentColor" stroke-width="2"/><circle cx="7" cy="7" r="1" fill="currentColor"/><circle cx="7" cy="17" r="1" fill="currentColor"/></svg>'
    })

    L.SettingsApi.addParam({
        component: 'moovies_server',
        param: {name: 'moovies_server_url', type: 'button'},
        field: {name: 'Адрес сервера', description: url || 'Изменить адрес, с которого загружается приложение'},
        onChange: function(){ window.AndroidJS.changeServerUrl() }
    })
}

function initTs(){
    let A = window.AndroidJS, L = window.Lampa
    if(typeof A.tsState !== 'function') return
    let TX = {
        not_installed: ['Сервер не установлен', '#9ca3af'],
        stopped: ['Сервер остановлен', '#ef4444'],
        error: ['Ошибка запуска сервера', '#ef4444'],
        port_busy: ['Порт 8090 занят другим приложением', '#ef4444'],
        starting: ['Запуск сервера…', '#f59e0b'],
        running: ['Сервер работает', '#22c55e']
    }
    function st(){
        try{ return JSON.parse(A.tsState()) }catch(e){ return {state: 'error', pct: 0} }
    }
    function paint(el, s){
        let t = TX[s.state] || TX.error, label = t[0], col = t[1]
        if(s.state == 'installing'){ label = 'Загрузка сервера ' + s.pct + '%'; col = '#f59e0b' }
        if(el.getAttribute('data-name') == 'moovies_ts_install'){
            label = s.state == 'not_installed' ? 'Установить сервер' : 'Обновить сервер'
            col = ''
        }
        let n = el.querySelector('.settings-param__name')
        if(n){ n.textContent = label; n.style.color = col }
        el.style.boxShadow = col ? 'inset 0.3em 0 0 ' + col : ''
    }
    function tick(){
        let els = document.querySelectorAll('[data-name="moovies_ts"],[data-name="moovies_ts_install"]')
        if(!els.length) return
        let s = st()
        els.forEach(function(e){ paint(e, s) })
    }
    function say(t){ L.Noty.show(t) }
    function go(what){
        let s = st().state, on = s == 'running' || s == 'starting' || s == 'installing'
        if(what == 'toggle'){
            if(s == 'installing') return say('Идёт загрузка')
            what = s == 'not_installed' ? 'install' : on ? 'stop' : 'start'
        }
        if(what == 'install'){
            if(s == 'installing') return say('Идёт загрузка')
            A.tsInstall(); say(s == 'not_installed' ? 'Загрузка сервера…' : 'Обновление сервера…')
        }
        if(what == 'start'){
            if(s == 'not_installed') return say('Сначала установите сервер')
            if(on) return say('Сервер уже запущен')
            A.tsStart(); say('Запуск сервера…')
        }
        if(what == 'stop'){
            if(!on) return say('Сервер не запущен')
            A.tsStop(); say('Сервер остановлен')
        }
        if(what == 'remove'){
            if(s == 'not_installed') return say('Сервер не установлен')
            let en = L.Controller.enabled().name
            return L.Select.show({
                title: 'Удалить сервер?',
                items: [{title: 'Да, удалить', value: 'y'}, {title: 'Нет', value: 'n'}],
                onBack: function(){ L.Controller.toggle(en) },
                onSelect: function(a){
                    L.Controller.toggle(en)
                    if(a.value == 'y'){ A.tsRemove(); say('Сервер удалён'); setTimeout(tick, 400) }
                }
            })
        }
        setTimeout(tick, 400)
    }
    function add(name, title, what){
        let live = what == 'toggle' || what == 'install'
        L.SettingsApi.addParam({
            component: 'moovies_server',
            param: {name: name, type: 'button'},
            field: {name: title},
            onRender: live ? function(item){ paint(item[0], st()) } : undefined,
            onChange: function(){ go(what) }
        })
    }
    add('moovies_ts', 'Сервер', 'toggle')
    add('moovies_ts_install', 'Установить сервер', 'install')
    add('moovies_ts_start', 'Запустить', 'start')
    add('moovies_ts_stop', 'Остановить', 'stop')
    add('moovies_ts_remove', 'Удалить сервер', 'remove')
    setInterval(tick, 1000)
}

let tries = 0
let timer = setInterval(function(){
    if(ready()){
        clearInterval(timer)
        try{ init() }catch(e){}
        try{ initTs() }catch(e){}
    }
    else if(++tries > 120) clearInterval(timer)
}, 500)

export default {}
