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
        field: {name: 'Адрес сайта (откуда грузится MoovieS)', description: url || 'Изменить адрес, с которого загружается приложение'},
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

function initAddr(){
    let L = window.Lampa
    const EMB = '127.0.0.1:8090'
    function cur(){
        let one = L.Storage.get('torrserver_url', '') || ''
        let two = L.Storage.get('torrserver_url_two', '') || ''
        return L.Storage.field('torrserver_use_link') == 'two' ? two || one : one || two
    }
    function label(){
        let a = cur()
        if(!a) return 'Не задан'
        return a.replace(/^https?:\/\//, '') == EMB ? EMB + ' (встроенный)' : a
    }
    function paint(){
        let d = document.querySelector('[data-name="moovies_tsaddr1"] .settings-param__descr')
        if(d) d.textContent = label()
    }
    function put(v){
        v = (v || '').trim().replace(/\/+$/, '')
        if(!v) v = EMB
        L.Storage.set('torrserver_url', v)
        L.Storage.set('torrserver_use_link', 'one')
        L.Noty.show('Адрес TorrServer: ' + v)
        paint()
    }
    L.SettingsApi.addParam({
        component: 'moovies_server',
        param: {name: 'moovies_tsaddr1', type: 'button'},
        field: {name: 'Адрес TorrServer', description: label()},
        onRender: function(){ paint() },
        onChange: function(){
            let en = L.Controller.enabled().name
            L.Select.show({
                title: 'Адрес TorrServer',
                items: [
                    {title: 'Встроенный', subtitle: EMB, value: 'emb'},
                    {title: 'Свой адрес…', subtitle: label(), value: 'own'}
                ],
                onBack: function(){ L.Controller.toggle(en) },
                onSelect: function(a){
                    L.Controller.toggle(en)
                    if(a.value == 'emb') return put(EMB)
                    let before = cur()
                    L.Input.edit({title: 'Адрес TorrServer', value: before, free: true}, function(v){ if((v || '') !== before) put(v) })
                }
            })
        }
    })
    setInterval(paint, 1000)
}

function initCache(){
    let L = window.Lampa, cur = {}
    let base = function(){ let a = L.Storage.get('torrserver_url', '') || '127.0.0.1:8090'; return /^https?:/.test(a) ? a : 'http://' + a }
    let call = function(b){ return fetch(base() + '/settings', {method: 'POST', body: JSON.stringify(b)}).then(r => r.text()).then(t => { try{ return JSON.parse(t) }catch(e){ return {} } }) }
    let load = function(){ return call({action: 'get'}).then(j => { if(j && j.CacheSize) cur = j; return cur }) }
    let save = function(k, v, paint){
        load().then(j => {
            if(!j || !j.CacheSize) return L.Noty.show('Сервер не отвечает')
            let s = Object.assign({}, j); s[k] = v
            return call({action: 'set', sets: s}).then(load).then(n => { paint(); L.Noty.show(n[k] === v ? 'Сохранено' : 'Сервер не принял значение') })
        }).catch(() => L.Noty.show('Сервер не отвечает'))
    }
    let mk = function(name, title, key, vals, show){
        let paint = function(){ let d = document.querySelector('[data-name="' + name + '"] .settings-param__descr'); if(d) d.textContent = cur[key] ? show(cur[key]) : 'Нет связи с сервером' }
        L.SettingsApi.addParam({
            component: 'moovies_server',
            param: {name: name, type: 'button'},
            field: {name: title, description: 'Загрузка…'},
            onRender: function(){ load().then(paint).catch(paint) },
            onChange: function(){
                let en = L.Controller.enabled().name
                L.Select.show({
                    title: title,
                    items: vals.map(v => ({title: show(v), subtitle: cur[key] === v ? 'Сейчас' : '', value: v})),
                    onBack: function(){ L.Controller.toggle(en) },
                    onSelect: function(a){ L.Controller.toggle(en); save(key, a.value, paint) }
                })
            }
        })
    }
    mk('moovies_tscache', 'Размер кэша', 'CacheSize', [64, 100, 200, 300, 400].map(m => m * 1048576), b => Math.round(b / 1048576) + ' МБ')
    mk('moovies_tspre', 'Предзагрузка кэша', 'PreloadCache', [20, 40, 60, 80], v => v + ' %')
    mk('moovies_tsconn', 'Лимит соединений', 'ConnectionsLimit', [25, 50, 75, 100], v => String(v))
    try{
        if(!L.Storage.get('moovies_conn50', '')) load().then(j => {
            if(!j || !j.CacheSize) return
            L.Storage.set('moovies_conn50', '1')
            if(j.ConnectionsLimit !== 50) save('ConnectionsLimit', 50, function(){})
        }).catch(() => {})
    }catch(e){}
}

function initLs(){
    let L = window.Lampa
    const NAMES = {1: 'Сиды крупно', 2: 'Плитки', 3: 'Скорость крупно', 4: 'Шкалы пиров', 5: 'Короткая фраза'}
    let get = function(){ let v = parseInt(L.Storage.get('moovies_ls', '2')); return NAMES[v] ? v : 2 }
    let paint = function(){ let d = document.querySelector('[data-name="moovies_ls"] .settings-param__descr'); if(d) d.textContent = get() + ' · ' + NAMES[get()] }
    L.SettingsApi.addParam({
        component: 'moovies_server',
        param: {name: 'moovies_ls', type: 'button'},
        field: {name: 'Экран загрузки', description: get() + ' · ' + NAMES[get()]},
        onRender: function(){ paint() },
        onChange: function(){
            let en = L.Controller.enabled().name
            L.Select.show({
                title: 'Экран загрузки',
                items: [1, 2, 3, 4, 5].map(v => ({title: v + ' · ' + NAMES[v], subtitle: get() === v ? 'Сейчас' : '', value: v})),
                onBack: function(){ L.Controller.toggle(en) },
                onSelect: function(a){ L.Controller.toggle(en); L.Storage.set('moovies_ls', String(a.value)); paint(); L.Noty.show('Экран загрузки: ' + a.value) }
            })
        }
    })
}

let tries = 0
let timer = setInterval(function(){
    if(ready()){
        clearInterval(timer)
        try{ init() }catch(e){}
        try{ initAddr() }catch(e){}
        try{ initCache() }catch(e){}
        try{ initLs() }catch(e){}
        try{ initTs() }catch(e){}
    }
    else if(++tries > 120) clearInterval(timer)
}, 500)

export default {}
