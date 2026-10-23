/*! imdbb-trailer-v4 */
const BAD = 'imdbb_tr_bad'
let S = {id: null, key: null, ctx: null, comp: null, root: null, frame: null, t0: 0, playing: false, pend: null, done: null, doneAt: 0, tpend: null, tfail: null, tend: null, poll: null, shown: false}
let vc = {}
let CSS = '.imdbb-tr{position:absolute;left:0;top:0;width:100%;height:100%;overflow:hidden;opacity:0;transition:opacity .7s ease;pointer-events:none}.imdbb-tr.on{opacity:1}.imdbb-tr iframe{position:absolute;left:50%;top:50%;border:0;transform:translate(-50%,-50%);pointer-events:none}'

function get(k, d){ try{ let v = window.Lampa.Storage.get(k, d); return v === undefined || v === null || v === '' ? d : v }catch(e){ return d } }
function mode(){ return String(get('imdbb_tr_mode', 'off')) }
function delay(){ let v = parseInt(get('imdbb_tr_delay', '0'), 10); return (v >= 0 && v <= 10 ? v : 0) * 1000 }
function active(){ try{ return window.Lampa.Activity.active() }catch(e){ return null } }
function noty(t){ try{ let n = get('imdbb_tr_noty', 'true'); if(n === false || n === 'false') return; window.Lampa.Noty.show(t) }catch(e){} }
function bad(){ try{ return JSON.parse(localStorage.getItem(BAD) || '{}') }catch(e){ return {} } }
function markBad(key, ms){ try{ let b = bad(), n = Date.now(); for(let k in b) if(b[k] < n) delete b[k]; b[key] = n + ms; localStorage.setItem(BAD, JSON.stringify(b)) }catch(e){} }
function isBad(key){ let b = bad(); return !!(b[key] && b[key] > Date.now()) }
function zoom(){ let v = parseFloat(get('imdbb_tr_zoom', '1.3')); return v >= 1 && v <= 1.8 ? v : 1.3 }
function qual(){ let v = String(get('imdbb_tr_q', 'hd1080')); return v == 'hd720' || v == 'hd1080' ? v : '' }
function qs(){ let q = qual(); return q ? '&vq=' + q : '' }
function sound(){ let v = get('imdbb_tr_sound', 'false'); return v === true || v === 'true' }

function pick(list){
  let lg = ''
  try{ lg = window.Lampa.Storage.field('tmdb_lang') }catch(e){}
  let a = (list || []).filter(r => r && r.key && (!r.site || String(r.site).toLowerCase() == 'youtube') && (!r.type || r.type == 'Trailer' || r.type == 'Teaser') && !isBad(r.key))
  let sc = r => (r.type == 'Teaser' ? 100 : 0) + (r.iso_639_1 == lg ? 0 : r.iso_639_1 == 'en' ? 10 : 20) + (r.official ? 0 : 5)
  a.sort((x, y) => sc(x) - sc(y) || new Date(y.published_at || 0) - new Date(x.published_at || 0))
  return a.length ? a[0].key : null
}

function cancelPend(){ clearTimeout(S.tpend); S.pend = null }

function stop(instant){
  clearTimeout(S.tfail); clearTimeout(S.tend); clearInterval(S.poll)
  window.removeEventListener('message', onMsg)
  let root = S.root
  S.root = null; S.frame = null; S.id = null; S.key = null; S.ctx = null; S.comp = null; S.playing = false
  if(!root) return
  if(instant){ try{ root.remove() }catch(e){} }
  else{ root.classList.remove('on'); setTimeout(function(){ try{ root.remove() }catch(e){} }, 800) }
}

function fail(why, ms){
  let k = S.key
  if(k && ms > 0) markBad(k, ms)
  noty('Трейлер не запустился: ' + why)
  stop(true)
}

function talk(){
  try{
    let w = S.frame && S.frame.contentWindow
    if(!w) return
    w.postMessage(JSON.stringify({event: 'listening', id: 1, channel: 'widget'}), '*')
    ;['onStateChange', 'onError'].forEach(n => w.postMessage(JSON.stringify({event: 'command', func: 'addEventListener', args: [n], id: 1, channel: 'widget'}), '*'))
    let cmd = (f, a) => w.postMessage(JSON.stringify({event: 'command', func: f, args: a || [], id: 1, channel: 'widget'}), '*')
    cmd('unloadModule', ['captions']); cmd('unloadModule', ['cc'])
    let q = qual()
    if(q){ cmd('setPlaybackQuality', [q]); cmd('setPlaybackQualityRange', [q, q]) }
    if(S.playing && sound()){ cmd('unMute'); cmd('setVolume', [70]) }
  }catch(e){}
}

function playing(){
  if(S.playing) return
  S.playing = true
  clearTimeout(S.tfail)
  S.root.classList.add('on')
  try{ talk(); setTimeout(talk, 1500) }catch(e){}
  if(!S.shown){ S.shown = true; noty('Трейлер запущен за ' + (Date.now() - S.t0) + ' мс') }
  S.tend = setTimeout(function(){ S.done = S.id; S.doneAt = Date.now(); stop(false) }, 45000)
}

function onMsg(e){
  try{
    if(!S.frame || e.source !== S.frame.contentWindow) return
    let d = typeof e.data == 'string' ? JSON.parse(e.data) : e.data
    if(!d) return
    if(d.event == 'onError') return fail('ошибка ' + d.info, [101, 150, 153].indexOf(d.info) >= 0 ? 604800000 : 86400000)
    let st = d.event == 'onStateChange' ? d.info : (d.event == 'infoDelivery' && d.info && typeof d.info.playerState == 'number' ? d.info.playerState : null)
    if(st === 1) playing()
    else if(st === 0 && S.playing){ S.done = S.id; S.doneAt = Date.now(); stop(false) }
  }catch(x){}
}

function watch(){
  try{
    let L = window.Lampa, a = active(), m = mode()
    if(document.hidden || (L.Player && L.Player.opened && L.Player.opened()) || document.body.classList.contains('menu--open')) return stop(true)
    if(!a) return
    let isCard = a.component == 'full' && String(a.id) == String(S.id)
    if(S.ctx == 'home'){
      if(a.component == S.comp && (m == 'main' || m == 'all')) return
      if(isCard && (m == 'card' || m == 'all')){ S.ctx = 'full'; S.comp = 'full'; return }
      return stop(true)
    }
    if(!(isCard && (m == 'card' || m == 'all'))) stop(true)
  }catch(e){}
}

function start(id, key, ctx, comp){
  stop(true)
  let bg = document.querySelector('.background')
  if(!bg){ noty('Трейлер: не найден слой фона'); return }
  if(!document.getElementById('imdbb-tr-css')){ let s = document.createElement('style'); s.id = 'imdbb-tr-css'; s.textContent = CSS; document.head.appendChild(s) }
  let w = window.innerWidth, h = window.innerHeight, W = w, H = w * 9 / 16
  if(H < h){ H = h; W = h * 16 / 9 }
  let root = document.createElement('div')
  root.className = 'imdbb-tr'
  let fr = document.createElement('iframe')
  fr.setAttribute('tabindex', '-1')
  fr.setAttribute('allow', 'autoplay; encrypted-media')
  fr.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin')
  let z = zoom()
  fr.style.width = Math.ceil(W * z) + 'px'
  fr.style.height = Math.ceil(H * z) + 'px'
  fr.style.transform = 'translate(-50%,-' + (z > 1.15 ? 52.5 : 50) + '%)'
  root.appendChild(fr)
  bg.appendChild(root)
  S.id = id; S.key = key; S.ctx = ctx; S.comp = comp; S.root = root; S.frame = fr; S.t0 = Date.now(); S.playing = false
  window.addEventListener('message', onMsg)
  fr.onload = function(){ talk(); setTimeout(talk, 400); setTimeout(talk, 1200) }
  fr.src = 'https://www.youtube.com/embed/' + key + '?autoplay=1&mute=1&cc_load_policy=0' + qs() + '&controls=0&disablekb=1&fs=0&iv_load_policy=3&modestbranding=1&rel=0&playsinline=1&enablejsapi=1&origin=' + encodeURIComponent(location.origin)
  S.tfail = setTimeout(function(){ fail('нет ответа за 15 с', 0) }, 15000)
  S.poll = setInterval(watch, 700)
}

function fetchVideos(d, cb){
  let L = window.Lampa, method = d.original_name ? 'tv' : 'movie', pk = method + ':' + d.id
  if(vc[pk]) return cb(vc[pk])
  if(!L.Api || !L.Api.full) return
  L.Api.full({id: d.id, method: method, card: d, url: '', component: 'full', source: d.source || L.Storage.field('source'), page: 1}, function(data){
    vc[pk] = (data && data.videos && data.videos.results) || []
    cb(vc[pk])
  }, function(){})
}

function schedule(id, ctx, comp, getList){
  cancelPend()
  if(S.id) stop(true)
  S.pend = id
  S.tpend = setTimeout(function(){
    if(S.pend !== id) return
    getList(function(list){
      if(S.pend !== id) return
      S.pend = null
      let a = active(), key = pick(list)
      if(!key || !a || a.component !== comp) return
      if(ctx == 'full' && String(a.id) !== id) return
      start(id, key, ctx, comp)
    })
  }, delay())
}

function focus(d){
  try{
    let m = mode()
    if(m != 'main' && m != 'all'){ cancelPend(); return }
    if(!d || !d.id || d.episode_number !== undefined || d.still_path !== undefined) return
    let id = String(d.id), a = active()
    if(!a) return
    if(id === String(S.id) || id === S.pend) return
    if(id === S.done && Date.now() - S.doneAt < 120000) return
    S.done = null
    schedule(id, 'home', a.component, function(cb){ fetchVideos(d, cb) })
  }catch(e){}
}

function onFull(e){
  try{
    if(!e || e.type != 'build') return
    let m = mode()
    if(m != 'card' && m != 'all') return
    let data = e.data, mv = data && data.movie
    if(!mv || !mv.id) return
    let id = String(mv.id)
    if(id === String(S.id)) return
    if(id === S.done && Date.now() - S.doneAt < 120000) return
    S.done = null
    schedule(id, 'full', 'full', function(cb){ cb((data.videos && data.videos.results) || []) })
  }catch(x){}
}

function settings(){
  let A = window.Lampa.SettingsApi
  A.addParam({component: 'imdbb', param: {name: 'imdbb_tr_mode', type: 'select', values: {off: 'Выкл', card: 'Только карточка', main: 'Только главная', all: 'Везде'}, default: 'off'}, field: {name: 'Трейлер на фоне', description: 'Беззвучный трейлер YouTube вместо фона после паузы на фильме. Нужен доступ к YouTube'}})
  A.addParam({component: 'imdbb', param: {name: 'imdbb_tr_delay', type: 'select', values: {'0': 'Сразу', '2': '2 с', '4': '4 с', '6': '6 с', '8': '8 с'}, default: '0'}, field: {name: 'Трейлер: задержка', description: 'Сколько ждать на фильме до запуска трейлера. «Сразу» грузит плеер при каждой остановке, на слабом ТВ выбери 2 с'}})
  A.addParam({component: 'imdbb', param: {name: 'imdbb_tr_noty', type: 'trigger', default: true}, field: {name: 'Трейлер: показывать результат', description: 'Уведомление, если трейлер не запустился'}})
  A.addParam({component: 'imdbb', param: {name: 'imdbb_tr_zoom', type: 'select', values: {'1.1': 'Мало (x1.1)', '1.3': 'Средний (x1.3)', '1.5': 'Сильный (x1.5)'}, default: '1.3'}, field: {name: 'Трейлер: масштаб', description: 'Увеличение кадра: убирает чёрные полосы, вшитые субтитры и надписи YouTube по краям, но обрезает края'}})
  A.addParam({component: 'imdbb', param: {name: 'imdbb_tr_q', type: 'select', values: {auto: 'Авто', hd720: '720p', hd1080: '1080p'}, default: 'hd1080'}, field: {name: 'Трейлер: качество', description: 'Желаемое качество видео. YouTube может не послушаться; на слабом ТВ выбери 720p или Авто'}})
  A.addParam({component: 'imdbb', param: {name: 'imdbb_tr_sound', type: 'trigger', default: false}, field: {name: 'Трейлер: звук', description: 'Включать звук трейлера (громкость 70%). Стартует беззвучно, звук включается, когда видео пошло'}})
}

let tries = 0
let boot = setInterval(function(){
  tries++
  let L = window.Lampa
  if(L && L.Listener && L.SettingsApi && L.Storage && L.Activity){
    clearInterval(boot)
    try{ settings() }catch(e){}
    try{ L.Listener.follow('full', onFull) }catch(e){}
  }
  else if(tries > 120) clearInterval(boot)
}, 500)

window.__imdbbTr = {focus: focus, stop: function(){ cancelPend(); stop(true) }, v: 'imdbb_tr4'}

export default {focus, stop}
