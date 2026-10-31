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
    if(typeof A.tsSet !== 'function') return
    L.SettingsApi.addParam({
        component: 'moovies_server',
        param: {name: 'moovies_ts', type: 'button'},
        field: {name: 'Встроенный TorrServer', description: 'Свой сервер вместо MatriX'},
        onChange: function(){
            let en = L.Controller.enabled().name
            L.Select.show({
                title: 'TorrServer',
                items: [{title: 'Включить встроенный', value: 'on'}, {title: 'Выключить (открыть MatriX)', value: 'off'}, {title: 'Статус', value: 'st'}],
                onBack: function(){ L.Controller.toggle(en) },
                onSelect: function(a){
                    L.Controller.toggle(en)
                    if(a.value == 'on') A.tsSet(true)
                    if(a.value == 'off') A.tsSet(false)
                    L.Noty.show('TorrServer: ' + A.tsStatus())
                }
            })
        }
    })
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
