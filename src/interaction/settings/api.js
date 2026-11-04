import Template from '../template'
import Params from './params'

let components = {}
let params = {}

/**
 * Добавить компонент
 * @param {{component:string, icon:string, name:string}} data 
 */
function addComponent(data){
    components[data.component] = data

    Template.add('settings_'+data.component, '<div></div>')
}

/**
 * Получить компонент
 * @param {string} component 
 * @returns {{component:string, icon:string, name:string}}
 */
function getComponent(component){
    return components[component]
}

/**
 * Удалить компонент
 * @param {string} component
 */
function removeComponent(component){
    delete components[component]
    delete params[component]
}

/**
 * Добавить параметр
 * @param {{component:string, param:{name:string, type:string, values:string|object, default:string|boolean}, field:{name:string, description:string|undefined}, onRender:((item)=>void)|undefined, onChange?:((e)=>void)|undefined}} data 
 */
function addParam(data){
    if(!params[data.component]) params[data.component] = []

    params[data.component].push(data)

    if(data.param.type == 'select' || data.param.type == 'input') Params.select(data.param.name, data.param.values, data.param.default)
    if(data.param.type == 'trigger') Params.trigger(data.param.name, data.param.default)
}

/**
 * Получить параметры
 * @param {string} component 
 * @returns {[{component:string, param:{name:string, type:string, values:string|object, default:string|boolean}, field:{name:string, description:string|undefined}, onRender:((item)=>void)|undefined, onChange?:((e)=>void)|undefined}]}
 */
// imdbb-setord: порядок и заголовки раздела IMDb+ (не зависит от порядка загрузки модулей)
const IMDBB_ORD = [
    ['Главная и карточки', ['imdbb_infinite', 'imdbb_swipe', 'imdbb_visible']],
    ['Внешний вид', ['imdbb_lgx']],
    ['Трейлеры', ['imdbb_tr_mode', 'imdbb_tr_full', 'imdbb_tr_delay', 'imdbb_tr_zoom', 'imdbb_tr_q', 'imdbb_tr_sound', 'imdbb_tr_noty']],
    ['Качество и фильтры', ['imdbb_flt', 'imdbb_trk', 'imdbb_kp_both', 'imdbb_lgbt_block']]
]

function imdbbOrder(list){
    try{
        let used = {}
        let out  = []
        let head = (i, name)=>({component: 'imdbb', param: {name: 'imdbb_grp_' + i, type: 'title'}, field: {name: name}})

        IMDBB_ORD.forEach((g, gi)=>{
            let items = []

            g[1].forEach(n=>{
                list.forEach(e=>{
                    if(e && e.param && e.param.name === n){
                        used[n] = true
                        items.push(e)
                    }
                })
            })

            if(items.length){
                out.push(head(gi, g[0]))
                out = out.concat(items)
            }
        })

        let rest = list.filter(e=>!(e && e.param && used[e.param.name]))

        if(rest.length){
            out.push(head('rest', 'Прочее'))
            out = out.concat(rest)
        }

        return out
    }
    catch(e){
        return list
    }
}

// imdbb-subs: вложенные подэкраны
IMDBB_ORD.forEach((g, i)=>addComponent({component: 'imdbb_g' + i, icon: '', name: g[0], hidden: true}))
addComponent({component: 'imdbb_grest', icon: '', name: 'Прочее', hidden: true})

function imdbbGroups(list){
    let used = {}
    let out  = IMDBB_ORD.map((g, i)=>{
        let items = []
        g[1].forEach(n=>list.forEach(e=>{
            if(e && e.param && e.param.name === n){
                used[n] = true
                items.push(e)
            }
        }))
        return {key: 'imdbb_g' + i, title: g[0], items: items}
    })
    out.push({key: 'imdbb_grest', title: 'Прочее', items: list.filter(e=>!(e && e.param && used[e.param.name]))})
    return out
}

function imdbbFolders(list){
    try{
        let out = []
        imdbbGroups(list).forEach(g=>{
            if(!g.items.length) return
            let pos = out.length
            out.push({
                component: 'imdbb',
                param: {name: 'imdbb_dir_' + g.key, type: 'button'},
                field: {name: g.title, description: 'Пунктов: ' + g.items.length},
                onChange: ()=>{
                    let S = window.Lampa.Settings
                    S.create(g.key, {onBack: ()=>S.create('imdbb', {last_index: pos})})
                }
            })
        })
        return out
    }
    catch(e){
        return imdbbOrder(list)
    }
}

function getParam(component){
    let l = params.imdbb
    if(component === 'imdbb' && l) return imdbbFolders(l)
    let g = l && /^imdbb_g/.test(component) ? imdbbGroups(l).filter(x=>x.key === component)[0] : null
    return g ? g.items : params[component]
}
/**
 * Удалить параметры
 * @param {string} component 
 */
function removeParams(component){
    delete params[component]
}

/**
 * Получить все компоненты
 * @returns {{name:{component:string, icon:string, name:string}}}
 */
function allComponents(){
    return components
}

/**
 * Получить все параметры
 * @returns {{component:[{component:string, param:{name:string, type:string, values:string|object, default:string|boolean}, field:{name:string, description:string|undefined}, onRender:((item)=>void)|undefined, onChange?:((e)=>void)|undefined}]}}
 */
function allParams(){
    return params
}

export default {
    allComponents,
    allParams,

    addComponent,
    addParam,

    getParam,
    getComponent,
    
    removeComponent,
    removeParams
}