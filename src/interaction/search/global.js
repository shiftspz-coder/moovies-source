import Sources from './sources'
import History from './history'
import Template from '../template'
import ImdbbSrh from './imdbb_srh'
import Controller from '../../core/controller'
import Keybord from '../keyboard/keyboard'
import Storage from '../../core/storage/storage'
import Lang from '../../core/lang'
import Scroll from '../scroll'
import Arrays from '../../utils/arrays'
import Layer from '../../core/layer'
import HeadBackward from '../head/backward'
import Head from '../head/head'
import Filter from '../content_filter/menu'
import Subscribe from '../../utils/subscribe'



let html = Template.elem('div', {class: 'main-search'}),
    search,
    history,
    sources,
    keyboard,
    scroll,
    input = '',
    params = {},
    additional = [],
    listener = Subscribe()

/* возврат из карточки обратно в поиск */
let imdbbArm = null, imdbbArmSub = false

function imdbbSrhBackReset(){ imdbbArm = null }

function imdbbSrhBackArm(q, ok){
    imdbbArm = null
    let A = window.Lampa && window.Lampa.Activity
    if(!ok || !q || !A || !A.all || !A.active) return
    let base = A.all().length
    if(!imdbbArmSub && A.listener){
        imdbbArmSub = true
        window.__imdbbSrhBackOn = true
        A.listener.follow('backward', function(){
            try{
                let a = imdbbArm, AA = window.Lampa.Activity
                if(!a || !a.obj) return
                if(AA.active() === a.obj){
                    imdbbArm = null
                    ;(function(f){ try{ (window.requestAnimationFrame||setTimeout)(f) }catch(e){ setTimeout(f,0) } })(function(){ try{ open({input: a.q}) }catch(err){} }) /* __imdbbSrhBackRaf */
                }
                else if(AA.all().indexOf(a.obj) < 0) imdbbArm = null
            }
            catch(err){}
        })
    }
    setTimeout(function(){
        try{ if(A.all().length === base + 1) imdbbArm = {q: q, obj: A.active()} }catch(err){}
    }, 800)
}

function init(){
    let imdbbSe = Head.addIcon(Template.string('icon_search'), open).addClass('open--search')

    // imdbb-filterbtn: кнопка «Фильтр» в шапке после поиска
    let imdbbFe = Head.addIcon('<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linejoin="round"><path d="M3 5h18l-7 8v6l-4 2v-8z"/></svg>', ()=>{ Filter.show() }).addClass('open--filter')

    if(imdbbSe && imdbbSe.after && imdbbFe) imdbbSe.after(imdbbFe)
}

function open(use_params = {}){
    try{ imdbbSrhBackReset() }catch(err){}
    params = use_params

    input = use_params.input || ''

    $('body').toggleClass('ambience--enable',true)
    $('body').toggleClass('search--open',true)
    $('body').toggleClass('imdbb-search-wide', document.body.classList.contains('imdbb-compact') && localStorage.getItem('imdbb_wide') !== 'false')

    create()
    toggle()

    Layer.update(html)

    listener.send('open')
}

function toggle(){
    Controller.add('search',{
        invisible: true,
        toggle: ()=>{
            keyboard.toggle()
        },
        update: ()=>{},
        back: destroy
    })

    Controller.toggle('search')
}

function scrollTo(element){
    try{ if(element && document.body.classList.contains('imdbb-search-wide')){ let el0 = element[0] || element; if(el0 && el0.nodeType === 1 && !scroll.render(true).contains(el0)) return } }catch(e){}
    scroll.update(element ? element : search.find('.search__input'),true)
}

function create(){
    search = Template.get('search')

    scroll = new Scroll({step: 300})

    scroll.height()

    scroll.render().addClass('search')

    scroll.append(HeadBackward(Lang.translate('search')))

    scroll.append(search)

    html.append(scroll.render(true))

    scroll.onScroll = (step)=>{
        Layer.visible(scroll.render(true))
    }

    if(Storage.field('keyboard_type') !== 'lampa') search.find('.search__input').hide()

    createKeyboard()
    createHistory()
    createSources()

    keyboard.value(input)
}

function createSources(){
    sources = new Sources({sources: params.sources, additional})

    listener.send('sources',{sources})

    sources.create()

    sources.listener.follow('back',destroy)

    sources.listener.follow('up',()=>{
        if(history.any()) history.toggle()
        else keyboard.toggle()

        scrollTo()
    })

    sources.listener.follow('toggle',(e)=>{
        scrollTo(e.element)
    })

    sources.listener.follow('select',(e)=>{
        if(input) history.add(input)

        let sb_q = input, sb_ok = !params.onBack
        destroy()
        try{ imdbbSrhBackArm(sb_q, sb_ok) }catch(err){}
    })

    search.find('.search__sources').append(sources.tabs())
    if(!ImdbbSrh.build(html, sources)) search.find('.search__results').append(sources.render())
}

function createHistory(){
    history = new History()
    history.create()

    history.listener.follow('down',()=>{
        sources.toggle(true)
    })

    history.listener.follow('up',()=>{
        keyboard.toggle()
    })

    history.listener.follow('enter',(event)=>{
        keyboard.value(event.value)

        sources.search(event.value, true)
    })

    history.listener.follow('back',destroy)

    search.find('.search__history').append(history.render())
}

function createKeyboard(){
    keyboard = new Keybord({
        layout: 'search'
    })

    keyboard.create()
    
    keyboard.listener.follow('change',(event)=>{
        input = event.value

        if(input){
            search.find('.search__input').toggleClass('filled', true).html(input.replace(/\s/g,'&nbsp;'))

            sources.search(input)
        }
        else{
            search.find('.search__input').toggleClass('filled', false).text(Lang.translate('search_input') + '...')

            sources.search('')
        }
    })

    keyboard.listener.follow('down',()=>{
        if(history.any()) history.toggle()
        else sources.toggle()
    })

    keyboard.listener.follow('hover',()=>{
        input.length <= 2 ? sources.cancel() : sources.search(input)
    })

    keyboard.listener.follow('back',destroy)
}

function addSource(source){
    additional.push(source)
}

function removeSource(source){
    Arrays.remove(additional,source)
}

function render(js){
    return js ? html : $(html)
}

function destroy(){
    keyboard.destroy()
    history.destroy()
    sources.destroy()

    search.remove()

    html.empty()

    $('body').toggleClass('ambience--enable',false)
    $('body').toggleClass('search--open',false)
    try{ ImdbbSrh.clean() }catch(e){}
    $('body').toggleClass('imdbb-search-wide',false)

    if(params.onBack) params.onBack()
    else Controller.toggle('content')

    params = {}

    input = ''

    listener.send('close')
}

function close(){
    destroy()
}

export default {
    init,
    listener,
    open,
    render,
    addSource,
    removeSource,
    close
}