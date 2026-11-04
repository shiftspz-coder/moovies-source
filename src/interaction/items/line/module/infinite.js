window.imdbbInf = function(){
    return true
}

export default {
    onScroll: function(){
        let d = this.data

        if(!(window.imdbbInf() || (d && d.imdbb_next)) || this.imdbb_wait || !d || !((d.url && d.source) || d.imdbb_next) || !(d.total_pages > 1)) return

        let page = d.page || 1

        if(page >= d.total_pages || page >= 500) return

        let near = false

        if(this.tv) near = this.active >= d.results.length - 8
        else{
            let last = this.items[this.items.length - 1]
            let el = last && last.render(true)
            let r = el && el.getBoundingClientRect && el.getBoundingClientRect()

            near = !!(r && r.width > 0 && r.left < window.innerWidth * 1.4)
        }

        if(!near) return

        this.imdbb_wait = true

        let nx = d.imdbb_next ? (cb, er)=>{ d.imdbb_next(page + 1, (list)=>{ cb({results: list}) }, er) } : (cb, er)=>{ window.Lampa.Api.list({url: d.url, page: page + 1, source: d.source}, cb, er) }

        nx((res)=>{
            this.imdbb_wait = false

            if(this.destroyed || !res || !res.results) return

            d.page = page + 1

            let ids = {}

            d.results.forEach((x)=>{ ids[x.id] = 1 })
            let f0 = d.results[0]; let wd = !!(d.imdbb_wrow || (f0 && f0.params && f0.params.style && f0.params.style.name === 'wide'))
            res.results.forEach((x)=>{ if(!ids[x.id]){ if(wd) x.params = Object.assign({}, x.params, {style: {name: 'wide'}, imdbb_infw: 1}); d.results.push(x) } })

            this.emit('scroll')
        }, ()=>{ this.imdbb_wait = false })
    }
}
