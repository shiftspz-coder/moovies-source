const KEY_ON = 'imdbb_snow'
const KEY_KIND = 'imdbb_snow_kind'
const GL = ['\u2744\uFE0E', '\u2745\uFE0E', '\u2746\uFE0E']

const PRESETS = {
    storm: {k: 'dot', n: 100, a: 1, b: 3, v1: 70, v2: 130, wind: 60, sway: 8},
    fluff: {k: 'dot', n: 70, a: 1, b: 2.2, v1: 12, v2: 28, wind: 6, sway: 10},
    flakes: {k: 'soft', n: 34, a: 2.5, b: 5, v1: 25, v2: 50, wind: 10, sway: 18},
    glyphs: {k: 'glyph', n: 22, a: 12, b: 24, v1: 18, v2: 40, wind: 8, sway: 16, rot: 0.6, col: '255,255,255', ch: [GL[0]]},
    crystals: {k: 'glyph', n: 30, a: 9, b: 20, v1: 22, v2: 48, wind: 12, sway: 14, rot: 1.4, col: '190,225,255', ch: GL},
    mix: {k: 'mix', n: 64, a: 1, b: 2.6, v1: 16, v2: 40, wind: 8, sway: 12, rot: 0.8, col: '255,255,255', ch: [GL[0], GL[1]]}
}

let cv = null
let ctx = null
let cur = null
let fl = []
let W = 0
let H = 0
let sz = 1
let vs = 1
let last = 0
let chk = 0
let blocked = false
let raf = 0
let timer = 0
let rt = 0

function L(){
    return window.Lampa
}

function flag(key, def){
    let v = L().Storage.get(key, def)

    return v === true || v === 'true'
}

function rnd(a, b){
    return a + Math.random() * (b - a)
}

function playerOpen(){
    try{
        let P = L().Player

        if(P && typeof P.opened === 'function') return Boolean(P.opened())
    }
    catch(e){}

    let el = document.querySelector('.player')

    return Boolean(el && el.offsetWidth > 0 && el.offsetHeight > 0)
}

function ensure(){
    if(cv) return

    cv = document.createElement('canvas')
    cv.id = 'imdbb-snow'
    cv.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:9000;display:none'
    document.body.appendChild(cv)
    ctx = cv.getContext('2d')
}

function resize(){
    W = window.innerWidth || 1280
    H = window.innerHeight || 720

    let q = W > 1280 ? 1280 / W : 1

    cv.width = Math.round(W * q)
    cv.height = Math.round(H * q)
    ctx.setTransform(q, 0, 0, q, 0, 0)

    sz = Math.max(1, W / 900)
    vs = Math.max(1, H / 300)
}

function build(){
    let p = cur
    let mult = Math.min(p.k === 'dot' || p.k === 'soft' ? 3 : 2, Math.max(1, W / 700))
    let n = Math.round(p.n * mult)

    fl = []

    for(let i = 0; i < n; i++){
        let r = rnd(p.a, p.b)
        let k = (r - p.a) / (p.b - p.a + 0.001)
        let ch = null
        let fs = 0

        if(p.k === 'glyph'){
            ch = p.ch[i % p.ch.length]
            fs = r
        }

        if(p.k === 'mix' && i % 5 === 0){
            ch = p.ch[(i / 5 | 0) % p.ch.length]
            fs = rnd(11, 17)
        }

        fl.push({x: rnd(0, W), y: rnd(0, H), r: r, v: p.v1 + (p.v2 - p.v1) * k, ph: rnd(0, 6.28), al: 0.45 + 0.5 * k, ch: ch, fs: fs, ang: rnd(0, 6.28), rs: rnd(-1, 1) * (p.rot || 0)})
    }
}

function loop(ts){
    raf = 0

    if(!cur) return

    if(ts - chk > 500){
        chk = ts
        blocked = document.hidden || playerOpen()
        cv.style.display = blocked ? 'none' : 'block'
    }

    if(blocked){
        timer = setTimeout(function(){
            timer = 0
            raf = requestAnimationFrame(loop)
        }, 500)

        return
    }

    raf = requestAnimationFrame(loop)

    if(ts - last < 33) return

    let dt = Math.min((ts - last) / 1000, 0.1)
    let t = ts / 1000

    last = ts

    ctx.clearRect(0, 0, W, H)

    for(let i = 0; i < fl.length; i++){
        let f = fl[i]

        f.y += f.v * vs * dt
        f.x += (cur.wind * vs * (f.r / cur.b) + Math.sin(t * 0.9 + f.ph) * cur.sway * sz) * dt

        if(f.y > H + 40) {
            f.y = -40
            f.x = rnd(0, W)
        }

        if(f.x > W + 40) f.x = -40
        if(f.x < -40) f.x = W + 40

        if(f.ch){
            f.ang += f.rs * dt

            ctx.save()
            ctx.translate(f.x, f.y)
            ctx.rotate(f.ang)
            ctx.fillStyle = 'rgba(' + (cur.col || '255,255,255') + ',' + f.al + ')'
            ctx.font = Math.round(f.fs * sz) + 'px sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(f.ch, 0, 0)
            ctx.restore()
        }
        else if(cur.k === 'soft'){
            let rr = f.r * sz
            let g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, rr)

            g.addColorStop(0, 'rgba(255,255,255,' + f.al + ')')
            g.addColorStop(1, 'rgba(255,255,255,0)')

            ctx.fillStyle = g
            ctx.beginPath()
            ctx.arc(f.x, f.y, rr, 0, 6.283)
            ctx.fill()
        }
        else{
            ctx.fillStyle = 'rgba(255,255,255,' + f.al + ')'
            ctx.beginPath()
            ctx.arc(f.x, f.y, f.r * sz, 0, 6.283)
            ctx.fill()
        }
    }
}

function start(){
    if(raf || timer) return

    last = 0
    chk = 0
    raf = requestAnimationFrame(loop)
}

function stop(){
    cur = null

    if(raf) cancelAnimationFrame(raf)
    if(timer) clearTimeout(timer)

    raf = 0
    timer = 0

    if(cv) cv.style.display = 'none'
}

function apply(){
    try{
        if(!flag(KEY_ON, 'false')) return stop()

        let kind = String(L().Storage.get(KEY_KIND, 'storm'))

        if(!PRESETS[kind]) kind = 'storm'

        ensure()
        resize()

        cur = PRESETS[kind]

        build()

        blocked = false
        cv.style.display = 'block'

        start()
    }
    catch(e){}
}

function init(){
    let Lp = window.Lampa

    if(!Lp) return

    try{
        Lp.SettingsApi.addParam({
            component: 'imdbb',
            param: {name: KEY_ON, type: 'trigger', default: false},
            field: {name: 'Снег', description: 'Падающий снег поверх интерфейса. Во время просмотра видео отключается'},
            onChange: function(){ setTimeout(apply, 60) }
        })

        Lp.SettingsApi.addParam({
            component: 'imdbb',
            param: {
                name: KEY_KIND,
                type: 'select',
                values: {storm: 'Метель', fluff: 'Пух', flakes: 'Хлопья', glyphs: '❄ Крупные', crystals: '❄ Кристаллы', mix: '❄ Микс'},
                default: 'storm'
            },
            field: {name: 'Вид снега', description: 'Работает, когда снег включён'},
            onChange: function(){ setTimeout(apply, 60) }
        })

        Lp.SettingsApi.addParam({
            component: 'imdbb',
            param: {name: 'imdbb_kp_both', type: 'trigger', default: false},
            field: {name: 'Рейтинг Кинопоиска рядом с IMDb', description: 'Показывает оценку Кинопоиска справа от IMDb на главной и в карточке. Выключено: КП только вместо IMDb у русских фильмов'}
        })

        Lp.SettingsApi.addParam({
            component: 'imdbb',
            param: {name: 'imdbb_dim_off', type: 'trigger', default: false},
            field: {name: 'Убрать затемнение фона', description: 'Полностью убирает затемнение фона везде: на главной, в рядах и в карточке'}
        })

        Lp.SettingsApi.addParam({
            component: 'imdbb',
            param: {name: 'imdbb_srh_bg', type: 'select', values: {'dark': 'Тёмный', 'gray': 'Серый', 'off': 'Как раньше'}, default: 'dark'},
            field: {name: 'Фон пустого поиска', description: 'Фон с логотипом, пока в поиске нет результатов'}
        })

        Lp.SettingsApi.addParam({
            component: 'imdbb',
            param: {name: 'imdbb_dim_main', type: 'select', values: {'0': 'Нет', '25': '25%', '50': '50%', '75': '75%', '100': 'Стандартное'}, default: '100'},
            field: {name: 'Затемнение: главная и ряды', description: 'Не действует, если включено «Убрать затемнение фона»'}
        })

        Lp.SettingsApi.addParam({
            component: 'imdbb',
            param: {name: 'imdbb_dim_card', type: 'select', values: {'0': 'Нет', '25': '25%', '50': '50%', '75': '75%', '100': 'Стандартное'}, default: '0'},
            field: {name: 'Затемнение: карточка', description: 'Не действует, если включено «Убрать затемнение фона»'}
        })

        Lp.SettingsApi.addParam({
            component: 'imdbb',
            param: {name: 'imdbb_trk', type: 'trigger', default: false},
            field: {name: 'Проверка дорожек по файлу', description: 'Карточка: через TorrServer на устройстве читает начало файла лучшей раздачи и уточняет качество и дубляж'}
        })

        let rsApply = function(){ try{ let v = parseInt(window.Lampa.Storage.get('imdbb_rate_style', '1'), 10); if(!(v >= 1 && v <= 20)) v = 1; let cl = document.body && document.body.classList; if(!cl) return; for(let n = 1; n <= 20; n++) cl.remove('imdbb-rs-' + n); cl.add('imdbb-rs-' + v) }catch(e){} }
        rsApply(); setTimeout(rsApply, 800)
        Lp.Listener.follow('app', function(e){ if(e.type === 'ready') rsApply() })

        Lp.SettingsApi.addParam({
            component: 'imdbb',
            param: {name: 'imdbb_rate_style', type: 'select', values: {'1': '1. Кромка слева (как сейчас)', '2': '2. Подчёркивание цветом', '3': '3. Стекло', '4': '4. Одна рамка с разделителем', '5': '5. Кольца', '6': '6. Метка-значок сверху', '7': '7. Шкала под числом', '8': '8. Контурные рамки', '9': '9. Кромка сверху', '10': '10. Минимал: точка и линия', '11': '11. Стекло и точка', '12': '12. Тонкая линия, крупное число', '13': '13. Сплошная заливка', '14': '14. Дуга', '15': '15. Звезда в цвете', '16': '16. Метка вертикально сбоку', '17': '17. Число с /10', '18': '18. Капсула', '19': '19. Общая плашка, двухцветная кромка', '20': '20. Тонированные плашки'}, default: '1'},
            field: {name: 'Вид оценок', description: 'Оформление блока оценок IMDb и КиноПоиск на главной и в карточке'},
            onChange: function(){ rsApply() }
        })

        let bsApply = function(){ try{ let v = String(window.Lampa.Storage.get('imdbb_badge_style', '0')); let cl = document.body && document.body.classList; if(!cl) return; if(v === 'a' || v === 'b' || v === 'c'){ v = 'd'; try{ window.Lampa.Storage.set('imdbb_badge_style', 'd') }catch(e){} } ['a', 'b', 'c', 'd', 'e'].forEach(function(k){ cl.remove('imdbb-bs-' + k) }); if(v === 'd' || v === 'e') cl.add('imdbb-bs-' + v) }catch(e){} }
        let stApply = function(){ try{ let cl = document.body && document.body.classList; if(!cl) return; let v = String(Lp.Storage.get('imdbb_st_style', '0')), p = String(Lp.Storage.get('imdbb_st_pos', '1')); ['0', 'p', 'w', 'f', 't'].forEach(function(x){ cl.remove('imdbb-st-' + x) }); ['1', '2', '3'].forEach(function(x){ cl.remove('imdbb-sp-' + x) }); if(['p', 'w', 'f', 't'].indexOf(v) < 0) v = '0'; if(['1', '2', '3'].indexOf(p) < 0) p = '1'; cl.add('imdbb-st-' + v); cl.add('imdbb-sp-' + p) }catch(e){} }
        stApply(); setTimeout(stApply, 800)
        Lp.Listener.follow('app', function(e){ if(e.type === 'ready') stApply() })

        Lp.SettingsApi.addParam({
            component: 'imdbb',
            param: {name: 'imdbb_st_style', type: 'select', values: {'0': 'Выкл', 'p': 'Светлая плашка', 'w': 'Белые силуэты', 'f': 'Силуэты в рамке', 't': 'Названия текстом'}, default: '0'},
            field: {name: 'Значки студий', description: 'Логотипы студий в герое главной и карточки. Новый вид виден при следующем открытии карточки'},
            onChange: function(){ stApply() }
        })

        Lp.SettingsApi.addParam({
            component: 'imdbb',
            param: {name: 'imdbb_st_pos', type: 'select', values: {'1': 'Под описанием', '2': 'Под метой', '3': 'Правый верхний угол'}, default: '1'},
            field: {name: 'Размещение значков студий', description: 'Где показывать значки студий в герое'},
            onChange: function(){ stApply() }
        })

        bsApply(); setTimeout(bsApply, 800)
        Lp.Listener.follow('app', function(e){ if(e.type === 'ready') bsApply() })

        Lp.SettingsApi.addParam({
            component: 'imdbb',
            param: {name: 'imdbb_badge_style', type: 'select', values: {'0': 'Как сейчас', 'd': 'Тонкая рамка', 'e': 'Мягкая заливка'}, default: '0'},
            field: {name: 'Плашки качества', description: 'Оформление плашек качества, HDR, Dolby Vision, дубляжа и возраста. HDR и Dolby Vision показываются только при выбранном оформлении (не «Как сейчас»)'},
            onChange: function(){ bsApply() }
        })

        Lp.SettingsApi.addParam({
            component: 'imdbb',
            param: {name: 'imdbb_lgbt_block', type: 'trigger', default: false},
            field: {name: 'Блокировка ЛГБТ-контента', description: 'Выключено: все карточки открываются как обычно. Включено: показывается заглушка «Контент ограничен»'}
        })
    }
    catch(e){}

    window.addEventListener('resize', function(){
        if(!cur) return

        clearTimeout(rt)

        rt = setTimeout(function(){
            resize()
            build()
        }, 300)
    })

    if(window.appready) apply()
    else Lp.Listener.follow('app', function(e){ if(e.type === 'ready') apply() })
}

export default {init}
