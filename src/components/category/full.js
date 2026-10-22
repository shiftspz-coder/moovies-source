import Api from '../../core/api/api'
import Category from '../../interaction/items/category'
import CategoryModule from '../../interaction/items/category/module/module'
import Background from '../../interaction/background'
import Utils from '../../utils/utils'
import Router from '../../core/router'
import IMDb from '../../utils/imdb'
import imdbbRows, {imdbbOn} from '../imdbb_rows'

const MIN_KEEP = 8
const MAX_PAGES = 3
const MAX_PAGES_Q = 5

function qrank(v){
    return v && v.q === '4K' ? 3 : (v && v.q === '1080' ? 2 : (v && v.q === 'TS' ? 1 : 0))
}

function dubOf(v){
    return v && v.q !== 'TS' && v.dub && (typeof v.dub !== 'object' || Object.keys(v.dub).length) ? 1 : 0
}

function qfetch(m, cb){
    if(typeof window.__imdbbQf === 'function') window.__imdbbQf(m, cb)
    else cb(null)
}

function imdbLister(object){
    let mn = parseFloat(object.imdb_min) || 0
    let mx = parseFloat(object.imdb_max) || 10

    let hasRange = mn > 0 || mx < 10
    let sortOn = !!object.imdb_sort

    let qmin = object.q_min || ''
    let qdub = !!object.q_dub
    let qsort = object.q_sort || ''
    let needQ = !!(qmin || qdub || qsort)
    let qneed = qmin == '4K' ? 3 : (qmin == 'FHD' ? 2 : 0)
    let qpass = function(v){ return (!qneed || qrank(v) >= qneed) && (!qdub || dubOf(v)) }

    if(!(hasRange || sortOn || needQ)) return null

    let starts = {1: 1}

    return function(page, ok, err){
        let kept = []
        let tries = 0
        let last = null

        let finish = function(end){
            starts[page + 1] = end + 1

            if(!kept.length) return err && err()

            if(qsort) kept.sort(function(a, b){
                let k = qsort == 'dub' ? (b.d - a.d) || (b.q - a.q) : (b.q - a.q) || (b.d - a.d)

                return k || (b.r - a.r)
            })
            else if(sortOn) kept.sort(function(a, b){ return object.imdb_dir == 'asc' ? (a.r || 99) - (b.r || 99) : b.r - a.r })

            ok(Object.assign({}, last, {results: kept.map(function(x){ return x.m }), page: page}))
        }

        let step = function(cur){
            Api.list(Object.assign({}, object, {page: cur}), function(data){
                last = data

                let list = (data && data.results) || []
                let total = (data && data.total_pages) || 1
                let left = list.length
                let flags = []
                let rates = []
                let qv = []

                let after = function(){
                    list.forEach(function(m, i){ if(flags[i]) kept.push({m: m, r: rates[i], q: qrank(qv[i]), d: dubOf(qv[i])}) })

                    tries++

                    if(kept.length >= MIN_KEEP || tries >= (needQ ? MAX_PAGES_Q : MAX_PAGES) || cur >= total) finish(cur)
                    else step(cur + 1)
                }

                if(!left) return after()

                list.forEach(function(m, i){
                    IMDb.rating(m, function(r){
                        rates[i] = parseFloat(r) || 0
                        flags[i] = hasRange ? (rates[i] > 0 && rates[i] >= mn && rates[i] <= mx) : true

                        let fin = function(){
                            left -= 1

                            if(left === 0) after()
                        }

                        if(!needQ || !flags[i]) return fin()

                        qfetch(m, function(v){
                            qv[i] = v

                            if(!qpass(v)) flags[i] = false

                            fin()
                        })

                        
                    })
                })
            }, function(){
                if(kept.length) finish(cur - 1)
                else if(err) err()
            })
        }

        step(starts[page] || page)
    }
}

function component(object){
    let lister = imdbLister(object)

    if(imdbbOn()) return imdbbRows(object, lister || ((page, ok, err)=>{ Api.list(Object.assign({}, object, {page: page}), ok, err) }))

    let comp = Utils.createInstance(Category, object, {
        module: CategoryModule.toggle(CategoryModule.MASK.base, 'Pagination')
    })

    comp.use({
        onCreate: function(){
            if(lister) lister(object.page || 1, this.build.bind(this), this.empty.bind(this))
            else Api.list(object, this.build.bind(this), this.empty.bind(this))
        },
        onNext: function(resolve, reject){
            if(lister) lister(object.page || 1, resolve.bind(this), reject.bind(this))
            else Api.list(object, resolve.bind(this), reject.bind(this))
        },
        onInstance: function(item, data){
            item.use({
                onEnter: Router.call.bind(Router, 'full', data),
                onFocus: function(){
                    Background.change(Utils.cardImgBackground(data))
                }
            })
        }
    })

    return comp
}

export default component
