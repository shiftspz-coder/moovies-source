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

function getParam(component){
    return component === 'imdbb' && params[component] ? imdbbOrder(params[component]) : params[component]
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