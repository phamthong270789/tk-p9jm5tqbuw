(function () {
  'use strict';
  if (window.__tkDhInstalled) return;
  window.__tkDhInstalled = true;
  const API_RE = /gwtms\.dmx\.vn\/tmsapi\/api\//i;
  const SEARCH_RE = /ShipmentOrder\/SearchShipmentOrder$/i;
  const PAGE_RE = /\/ShipmentRoute/i;
  let searchTemplate = null, apiReq = null, waitCapture = null;
  const _fetch = window.fetch;
  window.fetch = function (input, init) {
    let u = '';
    try { u = typeof input === 'string' ? input : (input && input.url) || ''; } catch (e) {}
    if (API_RE.test(u) && SEARCH_RE.test(u) && init && typeof init.body === 'string') {
      try { searchTemplate = JSON.parse(init.body); apiReq = { url: u, init }; } catch (e) {}
      if (waitCapture) { const w = waitCapture; waitCapture = null; w(); }
    }
    return _fetch.apply(this, arguments);
  };
  function findSearchButton() {
    return [...document.querySelectorAll('button')].find((b) => /Tìm kiếm/.test(b.textContent || '') && b.offsetParent !== null && !b.closest('#tk-host') && !b.closest('#tkdh-host'));
  }
  function ensureApiReq() {
    if (apiReq) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const btn = findSearchButton();
      if (!btn) return reject(new Error('Không thấy nút "Tìm kiếm" trên trang.'));
      const timer = setTimeout(() => { waitCapture = null; reject(new Error('Hết thời gian chờ trang gửi tìm kiếm (30 giây).')); }, 30000);
      waitCapture = () => { clearTimeout(timer); resolve(); };
      btn.click();
    });
  }
  const STALE_RE = /sai lệch|ngày, giờ|ngày giờ|hết hạn|hết phiên|token/i;
  let refreshing = null;
  const refreshApi = () => refreshing || (refreshing = (async () => { apiReq = null; await ensureApiReq(); })().finally(() => { refreshing = null; }));
  async function postApi(body, path) {
    const go = async () => {
      if (!apiReq) await refreshApi();
      const u = path ? apiReq.url.replace(/ShipmentOrder\/SearchShipmentOrder/i, path) : apiReq.url;
      return (await _fetch.call(window, u, Object.assign({}, apiReq.init, { body }))).json();
    };
    let j = await go();
    if (j && j.IsError && STALE_RE.test(j.Message || '')) { await refreshApi(); j = await go(); }
    return j;
  }
  const callApi = (body) => postApi(body);
  const VUNG = 'Vùng HNO+';
  const KHO_LIST = [
    [33095, 'VHN_NAN - Kho Thợ DMX Hoàng Mai (MST mới)'], [10573, 'VHN_NAN - Kho Thợ DMX Hoàng Mai (OFF)'],
    [33186, 'VHN_HBI - Kho Thợ DMX Hòa Bình (MST mới)'], [33119, 'VHN_NDI - Kho Thợ DMX Hải Hậu (MST mới)'],
    [33098, 'ĐBH_HYE - Kho Thợ DMX Văn Lâm (MST mới)'], [33434, 'VHN_HNO - Kho Thợ DMX Sơn Tây (MST mới)'],
    [33188, 'VHN_HNO - Kho Thợ DMX Tam Hiệp (MST mới)'], [33380, 'VHN_HNO - Kho Thợ DMX Thường Tín (MST mới) (Sắp OFF)'],
    [33161, 'VHN_NBI - Kho Thợ DMX Ninh Bình (MST mới)'], [33386, 'VHN_THO - Kho Thợ DMX Thanh Hóa (MST mới)'],
    [33162, 'VHN_THO - Kho Thợ DMX Bỉm Sơn (MST mới)'], [33152, 'VHN_NAN - Kho Thợ DMX Thanh Chương (MST mới)'],
    [33284, 'VHN_HNO - Kho Thợ DMX Hoài Đức (MST mới)'], [36177, 'VHN_HNO - Kho Thợ DMX Thường Tín 2026'],
    [33153, 'VHN_HNO - Kho Thợ DMX Chương Mỹ (MST mới)'], [33247, 'VHN_HNO - Kho Thợ DMX Đông Anh (MST mới)'],
    [33459, 'VHN_NDI - Kho Thợ DMX Nam Định (MST mới)'], [33139, 'VHN_THO - Kho Thợ DMX Thọ Xuân (MST mới)'],
    [33103, 'VHN_HNA - Kho Thợ DMX Phủ Lý (MST mới)'], [33303, 'VHN_NAN - Kho Thợ DMX Vinh (MST mới)']];
  const norm = (s) => (s || '').normalize('NFC').trim();
  const KHO = {};
  KHO_LIST.forEach(([id, full]) => {
    const m = norm(full).match(/^(\S+)\s*-\s*Kho Thợ DMX\s*(.*)$/);
    KHO[id] = (m ? m[2] : norm(full)).replace(/\s*\([^)]*\)/g, '').replace(/\s+\d{4}$/, '').trim();
  });
  const KHO_ORDER = ['Tam Hiệp', 'Đông Anh', 'Hoài Đức', 'Sơn Tây', 'Chương Mỹ', 'Thường Tín', 'Văn Lâm', 'Hòa Bình', 'Phủ Lý',
    'Nam Định', 'Hải Hậu', 'Ninh Bình', 'Bỉm Sơn', 'Thanh Hóa', 'Thọ Xuân', 'Hoàng Mai', 'Vinh', 'Thanh Chương'];
  const ordOf = (n) => { const i = KHO_ORDER.indexOf(norm(n)); return i < 0 ? 999 : i; };
  const XE_NB = { 'Văn Lâm': '50E92331,29E91215,50H64759', 'Hòa Bình': '29E91263,50E91993', 'Phủ Lý': '50H64219,29E89962', 'Chương Mỹ': '29E89963,50E91674',
    'Đông Anh': '50E96114,29E89918,29E91331,50E38208', 'Hoài Đức': '29E89910,50E96881,29E89903,50E96284', 'Sơn Tây': '29E91229',
    'Tam Hiệp': '50E37711,29E89990,50E96851,29E91359,29E91216,50H63559,29E89935,50E57484', 'Thường Tín': '29E89985,50E96858,29E89929',
    'Hoàng Mai': '29E91363,29E89947,29E89915,51D48318', 'Thanh Chương': '29E91240,29E89942', 'Vinh': '50H64150,50E55957,29E89981',
    'Ninh Bình': '50H64340,50E92407,29E91397', 'Hải Hậu': '29E89956,29E89964', 'Nam Định': '29E91319,50H63877',
    'Bỉm Sơn': '50E95946,29E91277', 'Thanh Hóa': '29E91205,29E89909,50H64749,29E91343', 'Thọ Xuân': '29C61094,50H58779,50E96676' };
  const NB_SET = new Set(Object.values(XE_NB).join(',').split(','));
  const bsNorm = (p) => String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const CN_GIO = 48, TB_HQ = 10, THUE_DU = 12, THUE_NGAY = 1550000, THUE_DON = 125000;
  const tienThue = (n) => (n >= THUE_DU ? THUE_NGAY : n * THUE_DON);
  const BS_KEY = 'tk_dh_bsx_cache';
  let bsCache = {}; try { bsCache = JSON.parse(localStorage.getItem(BS_KEY) || '{}'); } catch (e) {}
  const bsMem = new Map();
  async function fetchPlates(sos, onProg) {
    bsMem.clear();
    const t = ymd(today());
    const need = [...new Set(sos.filter((s) => s.rt && !(s.rt in bsCache) && !bsMem.has(s.rt)).map((s) => s.rt))];
    const dayOf = {}; sos.forEach((s) => { if (s.rt) dayOf[s.rt] = s.rd > s.day ? s.rd : s.day; });
    let i = 0, done = 0;
    const worker = async () => {
      while (i < need.length) {
        const id = need[i++];
        try {
          const j = await postApi(JSON.stringify(id), 'ShipmentRoute/GetShipmentOrderRouteLst');
          const p = bsNorm(((j && j.ResultObject) || []).map((x) => x.LicensePlateNumber).find(Boolean));
          if (dayOf[id] < t && p) bsCache[id] = p; else bsMem.set(id, p);
        } catch (e) {}
        done++; onProg && onProg(done, need.length);
      }
    };
    await Promise.all(Array.from({ length: Math.min(8, need.length) }, worker));
    try { localStorage.setItem(BS_KEY, JSON.stringify(bsCache)); } catch (e) {}
    sos.forEach((s) => { if (s.rt) s.bs = bsCache[s.rt] || bsMem.get(s.rt) || ''; });
  }
  let THO = []; try { THO = JSON.parse(localStorage.getItem('tk_dh_tho') || '[]'); } catch (e) {}
  const WARN_BEFORE_MIN = 60;
  const isCancelled = (o) => /^\s*đã\s*hủy/i.test(norm(o.ShipmentOrderStatusName)) || o.IsCancelDelivery === true;
  const isDone = (o) => o.IsCompleteDeliveried || /Kết thúc vận đơn|Hoàn tất dịch vụ/i.test(o.ShipmentOrderStatusName || '');
  const ARRIVED_STEP = 105;
  const isArrived = (o) => !!o.EarliesDeliveryTime || Number(o.CurrentShipmentOrderStepID) >= ARRIVED_STEP;
  const KM_RE = /(^|[^A-Za-z0-9])KM([^A-Za-z0-9]|$)|khuy[eế]n\s*m[aã]i/i;
  const hasKM = (o) => KM_RE.test([o.ShipItemNameList, o.PrimaryShipItemName, o.ShipmentOrderTypeName].join(';'));
  const ML_RE = /máy lạnh|điều hòa|điều hoà/i;
  const isML = (o) => ML_RE.test([o.ShipItemNameList, o.PrimaryShipItemName, o.ShipmentOrderTypeName].join(';'));
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const shift = (s, n) => ymd(addDays(parseYmd(s), n));
  const vn = (s) => s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : '';
  const hm = (s) => String(s || '').slice(11, 16);
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const fmt = (n) => n.toLocaleString('vi-VN');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const range = (a, b) => { const r = []; for (let d = a; d <= b; d = shift(d, 1)) r.push(d); return r; };
  const dayCache = new Map();
  function tplFor(day) {
    const tpl = (searchTemplate || []).map((x) => ({ ...x }));
    const set = (k, v) => { const e = tpl.find((x) => x.SearchKey.toLowerCase() === k.toLowerCase()); if (e) e.SearchValue = v; else tpl.push({ SearchKey: k, SearchValue: v }); };
    set('@Keyword', ''); set('@RECEIVERPHONENUMBER', ''); set('@SHIPMENTORDERTYPEID', '');
    set('@FromDate', day + 'T00:00:00.000'); set('@ToDate', day + 'T23:59:59.000');
    set('@RECEIVERPROVINCEID', -1); set('@RECEIVERWARDID', '-1'); set('@SENDERSTOREID', -1);
    set('@COORDINATORSTOREIDLST', Object.keys(KHO).join(',')); set('@SHIPMENTORDERSTATUSGROUPID', ''); set('@IsCoordinator', -1);
    set('@CARRIERTYPEID', -1); set('@Typename', -1); set('@RequestStoreID', '-1'); set('@IsUnableToContact', -1);
    return { tpl, set };
  }
  const slim = (o) => ({
    id: o.ShipmentOrderID, so: norm(o.PartnerSaleOrderID) || String(o.ShipmentOrderID), exp: o.ExpectedDeliveryDate || '',
    den: o.EarliesDeliveryTime || '', arr: isArrived(o), st: o.ShipmentOrderStatusName || '', done: !!isDone(o), cancel: isCancelled(o), ret: o.IsInputReturn === true, km: hasKM(o), ml: isML(o),
    xt: Number(o.CarrierTypeID) === 2, rt: Number(o.CarrierTypeID) === 2 ? String(o.ShipmentRouteID || '') : '', no: (o.IsOutputGoods || o.OutputGoodsDate) && !isCancelled(o) ? Number(o.TotalUnPaidInMoney) || 0 : 0, xg: String(o.OutputGoodsDate || ''), dd: String(o.EarliesDeliveryTime || o.CompletedDoServiceTime || '').slice(0, 10),
    tho: norm(String(o.DeliverUserFullNameList || '').split(/[,;]/)[0]), kho: KHO[Number(o.CoordinatorStoreID)] || '',
    ht: String(o.CompletedDoServiceTime || o.DeliveryCompletionTime || ''),
  });
  async function fetchDay(day) {
    const isPast = day < ymd(today());
    if (isPast && dayCache.has(day)) return dayCache.get(day);
    const { tpl, set } = tplFor(day);
    const SIZE = 5000; let page = 0, total = 0; const all = [];
    while (page < 20) {
      set('@PAGESIZE', SIZE); set('@PAGEINDEX', page);
      const j = await callApi(JSON.stringify(tpl));
      if (!j || j.IsError) throw new Error((j && j.Message) || 'API báo lỗi');
      const a = j.ResultObject || []; all.push(...a);
      if (a[0]) total = a[0].TotaLRows;
      if (a.length < SIZE || all.length >= total) break;
      page++;
    }
    const uniq = new Map(all.map((o) => [o.ShipmentOrderID, o]));
    if (total && uniq.size < total) throw new Error('Ngày ' + vn(day) + ' chưa tải đủ: ' + uniq.size + '/' + total + '. Anh bấm Thống kê lại.');
    const rows = [...uniq.values()].map(slim);
    if (isPast) dayCache.set(day, rows);
    return rows;
  }
  async function fetchDays(days, onProg) {
    const out = {}; let i = 0, done = 0;
    const worker = async () => { while (i < days.length) { const d = days[i++]; out[d] = await fetchDay(d); done++; onProg && onProg(done, days.length); } };
    await Promise.all(Array.from({ length: Math.min(6, days.length) }, worker));
    return out;
  }
  function toSO(rows) {
    const m = new Map();
    rows.filter((r) => !r.cancel && !r.ret && !r.km).forEach((r) => {
      let s = m.get(r.so);
      if (!s) { s = { so: r.so, vd: 0, done: true, arr: false, den: '', exp: '', day: '', ml: false, tho: '', kho: r.kho, st: r.st, xt: false, rt: '', bs: '', no: 0, xg: '', run: '' }; m.set(r.so, s); }
      if (r.xt && r.dd && (!s.run || r.dd < s.run)) s.run = r.dd;
      if (r.xt) s.xt = true; if (r.rt && !s.rt) s.rt = r.rt; s.no += r.no || 0;
      if (r.no > 0 && r.xg && (!s.xg || r.xg < s.xg)) s.xg = r.xg;
      s.vd++; if (!r.done) { s.done = false; s.st = r.st; }
      if (r.arr) s.arr = true;
      if (r.den && (!s.den || r.den < s.den)) s.den = r.den;
      if (r.ml) s.ml = true;
      if (!s.tho && r.tho) s.tho = r.tho;
      if (!s.kho && r.kho) s.kho = r.kho;
      if (!s.exp || r.exp < s.exp) s.exp = r.exp;
    });
    m.forEach((s) => { s.day = s.exp.slice(0, 10); s.rd = s.run || s.day; });
    return [...m.values()];
  }
  function soStatus(s) {
    if (s.done) return 'h';
    if (s.arr) return 'd';
    const t = ymd(today());
    if (s.day < t) return 'r';
    if (s.day > t) return 'g';
    const now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes(), h = toMin(hm(s.exp) || '23:59');
    return nowMin >= h ? 'r' : nowMin >= h - WARN_BEFORE_MIN ? 'o' : 'g';
  }
  const WL = { r: 'Có ĐH Trễ Hẹn', o: 'Có ĐH Sắp Trễ', g: 'An Toàn', n: 'Chưa có ĐH' };
  const SL = { h: 'Hoàn tất', d: 'Đã đến nhà', g: 'An toàn', o: 'Sắp trễ', r: 'Trễ hẹn' };
  const CSS = [
    ':host{all:initial}',
    '*{box-sizing:border-box;font-family:Roboto,system-ui,Segoe UI,Arial,sans-serif}',
    '.ov{position:fixed;inset:0;background:rgba(15,23,42,.25);z-index:2147483000}',
    '.dr{position:fixed;top:0;right:0;height:100vh;width:min(1280px,100vw);background:#fff;color:#1f2937;z-index:2147483001;box-shadow:-8px 0 28px rgba(15,23,42,.18);display:flex;flex-direction:column;font-size:12px}',
    '.hd{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#1f5bd8}',
    '.hd b{font-size:14px;color:#fff}',
    '.x{background:none;border:0;color:#dbeafe;font-size:20px;cursor:pointer;line-height:1}.x:hover{color:#fff}',
    '.bd{padding:10px 16px 12px;flex:1;display:flex;flex-direction:column;min-height:0}',
    '.tabs{display:flex;margin-bottom:10px;border-bottom:2px solid #1f5bd8}',
    '.tab{padding:6px 16px;font-weight:700;cursor:pointer;border:1px solid #d1d5db;border-bottom:none;background:#f5f7fa;color:#374151;border-radius:5px 5px 0 0;margin-right:4px}',
    '.tab.on{background:#1f5bd8;color:#fff;border-color:#1f5bd8}',
    'label{display:block;color:#374151;font-weight:700;font-size:10.5px;margin-bottom:3px}',
    '.row{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-bottom:8px}',
    'input,select{background:#fff;color:#111827;border:1px solid #cfd5dd;border-radius:4px;padding:4px 7px;font-size:11px;height:26px;color-scheme:light}',
    '.btn{background:#fff;color:#1f2937;border:1px solid #d1d5db;border-radius:4px;padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer;height:26px}',
    '.pri{background:#1f5bd8;border-color:#1f5bd8;color:#fff}.pri:disabled{opacity:.6;cursor:wait}',
    '.q{background:#e9f9ef;border-color:#9fe0b6;color:#16a34a}.q.on{background:#1f5bd8;border-color:#1f5bd8;color:#fff}',
    '.msg{color:#15803d;min-height:15px;font-size:11px;margin-bottom:4px}.msg.err{color:#dc2626}',
    '.cards{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:2px 0 8px} .c5{border-color:#c4b5fd;background:#f3efff}.c5 .n{color:#7c3aed}',
    '.card{border:1px solid #e5e7eb;border-radius:6px;padding:7px 12px;font-size:12px}',
    '.card .n{font-size:22px;font-weight:700;margin-top:2px}',
    '.c1{border-color:#c9d8fb;background:#eaf1ff}.c1 .n{color:#1f5bd8}',
    '.c2{border-color:#9fe0b6;background:#e9f9ef}.c2 .n{color:#16a34a}',
    '.c3{border-color:#f7c873;background:#fff4e0}.c3 .n{color:#d97706}',
    '.c4{border-color:#f3a6a6;background:#fdecec}.c4 .n{color:#dc2626}',
    '.note{color:#6b7280;font-size:11px;margin:0 0 6px}',
    '.tw{overflow:auto;border:1px solid #d1d5db;flex:1;min-height:200px}',
    'table{border-collapse:separate;border-spacing:0;width:100%}',
    'th,td{border-right:1px solid #d1d5db;border-bottom:1px solid #d1d5db;padding:5px 6px;text-align:center;white-space:nowrap}',
    'thead th{background:#f3f6fb;font-weight:700;position:sticky;z-index:2;color:#111827}',
    'thead tr:nth-child(1) th{top:0;height:27px} thead tr:nth-child(2) th{top:27px}',
    'th.day{background:#e2eaf8} th.main{background:#d6e4ff;color:#173a8a}',
    'td.l{text-align:left} td.kho{font-weight:700;background:#fafbfd}',
    'tbody tr.click{cursor:pointer} tbody tr.click:hover td{background:#f4f8ff}',
    'tr.tot td{font-weight:700;background:#f3f6fb;position:sticky;bottom:0;z-index:1}',
    '.sep{border-left:3px solid #5b6b8a} td.sep{font-weight:700;color:#0b2a6b} th.mon{background:#c6efd3;color:#14532d} td.mon{background:#f0fdf4} td.sep.mon{color:#166534} tr.tot td.mon{background:#dcfce7}',
    '.zz{color:#b6bcc6}',
    'th.xt{background:#ffedd5;color:#9a3412} th.cno{background:#fee2e2;color:#991b1b} td.tien{text-align:right;color:#b91c1c;font-weight:700} th.thue{background:#ede9fe;color:#5b21b6} td.tien2{text-align:right;color:#5b21b6;font-weight:700}',
    'thead tr:nth-child(2) th{white-space:normal;line-height:1.25;min-width:60px;width:60px;vertical-align:middle} thead tr:nth-child(2) th.wd{min-width:112px;width:112px} thead tr:nth-child(2) th.wm{min-width:86px;width:86px} .cn48{cursor:pointer;text-decoration:underline} .stk{position:sticky;left:8px;display:inline-block}',
    '.dg-ok{background:#00B0F0;color:#fff}.dg-no{background:#FF0000;color:#fff}',
    '.w{display:block;font-weight:700;font-size:11px;padding:4px 3px;margin:-5px -6px}',
    '.w-g{background:#00B0F0;color:#fff}.w-o{background:#FFFF00;color:#FF0000}.w-r{background:#FF0000;color:#fff}',
    '.w-n{color:#6b7280;font-weight:400;font-style:italic}',
    'tr.det>td{background:#fbfcfe;padding:6px 10px;text-align:left}',
    'tr.det table{width:auto;border:1px solid #d1d5db} tr.det th{position:static;background:#eef2f7}',
    '.bdg{display:inline-block;padding:2px 8px;border-radius:10px;font-weight:700;font-size:10.5px}',
    '.b-g{background:#00B0F0;color:#fff}.b-o{background:#FFFF00;color:#f00}.b-r{background:#FF0000;color:#fff}.b-d{background:#e9f9ef;color:#16a34a}.b-h{background:#e5e7eb;color:#374151}',
    '.empty{color:#6b7280;padding:30px 0;text-align:center}',
    '.pane{display:flex;flex-direction:column;flex:1;min-height:0}',
    '.nlt{font-size:15px;font-weight:800;color:#1e3a8a;margin:0 0 8px}',
    '.nlc{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:4px 0 8px}',
    '.nk{border:1px solid #e5e7eb;border-left:4px solid #1f5bd8;border-radius:6px;padding:7px 12px;font-size:12px;color:#374151}',
    '.nk .n{font-size:22px;font-weight:800;color:#111827;margin:2px 0}.nk .s{color:#6b7280;font-size:11px;line-height:1.5}',
    '.pc{display:inline-block;padding:1px 7px;border-radius:9px;font-weight:700;font-size:11px}',
    '.nk .n .pc{font-size:17px;vertical-align:3px;margin-left:6px}',
    '.p-g{background:#dcfce7;color:#15803d}.p-y{background:#fef3c7;color:#b45309}.p-r{background:#fee2e2;color:#dc2626;border:1px solid #fca5a5}.p-0{color:#9ca3af}',
    '.lg{font-size:11px;color:#4b5563;margin:0 0 6px;line-height:1.7}',
    '#nlo table th{background:#1e3a8a;color:#fff;border-color:#3b5bb5} #nlo th.g1{background:#2346a8} #nlo th.g2{background:#3157c9} #nlo th.g3{background:#6d28d9}',
    '#nlo thead tr:nth-child(2) th{min-width:52px;width:52px;background:#eef2fb;color:#111827;border-color:#d1d5db}',
    '#nlo thead tr:nth-child(2) th.dg{min-width:124px;width:124px}',
    '#nlo td.k,#nlo th.k{position:sticky;left:0;z-index:1;background:#fff;text-align:left;font-weight:700;min-width:96px} #nlo th.k{z-index:3;background:#1e3a8a}',
    '#nlo td.b{font-weight:800;color:#1e3a8a} #nlo .s3{border-left:3px solid #1e3a8a}',
    '#nlo tr.tot td{background:#1e3a8a;color:#fff} #nlo tr.tot td.k{background:#1e3a8a}',
    '#nlo input{width:58px;height:24px;text-align:right;font-size:12px;padding:2px 5px}',
    '@media (max-width:820px){.nlc{grid-template-columns:repeat(2,1fr)}.nk .n{font-size:18px}.dr{font-size:11px}}',
    '@media (max-width:820px){.cards{grid-template-columns:repeat(2,1fr)}}'].join('\n');
  let host, root;
  const state = { view: 'cn', from: '', to: '', preset: 'today', cn: '', warn: '', q: '', open: new Set(), open48: new Set(), data: null };
  function topSlot() {
    const nav = document.querySelector('header.topnav > nav.topnav-menu');
    if (!nav) return null;
    let s = document.getElementById('tk-topbar');
    if (!s) { s = document.createElement('div'); s.id = 'tk-topbar'; s.style.cssText = 'display:flex;align-items:center;gap:8px;margin:0 12px;flex:0 0 auto'; }
    if (s.previousElementSibling !== nav) nav.after(s);
    return s;
  }
  function findStatusField() {
    const tb = document.querySelector('.sr-search .toolbar'); if (!tb) return null;
    return [...tb.children].find((c) => { const t = c.textContent.trim(); return /^Trạng thái/.test(t) && !/^Trạng thái điều phối/.test(t); }) || null;
  }
  function ensureButton() {
    const onPage = PAGE_RE.test(location.pathname);
    let btn = document.getElementById('tkdh-open-btn');
    if (!onPage) { if (btn) btn.remove(); return; }
    if (!document.body) return;
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'tkdh-open-btn'; btn.textContent = '📋 Thống kê Đơn Hàng'; btn.title = 'Thống kê đơn hàng theo chi nhánh / theo thợ + cảnh báo trễ hẹn'; btn.onclick = openPanel;
    }
    const base = 'background:#0f9d58;color:#fff;border:0;border-radius:8px;padding:0 14px;font:600 13px Roboto,system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(15,157,88,.35);';
    const slot = topSlot();
    if (slot) {
      if (btn.parentElement !== slot) { btn.style.cssText = base + 'height:32px;white-space:nowrap;order:2'; slot.appendChild(btn); }
      return;
    }
    const anchor = document.getElementById('tk-open-btn') || findStatusField();
    if (btn.parentElement && anchor && btn.previousElementSibling === anchor) return;
    if (btn.parentElement === document.body && !anchor) return;
    if (anchor && anchor.parentElement !== document.body) { btn.style.cssText = base + 'height:34px;align-self:flex-end;white-space:nowrap;margin-left:8px'; anchor.after(btn); }
    else { btn.style.cssText = base + 'position:fixed;top:12px;right:200px;z-index:2147482999;height:32px'; document.body.appendChild(btn); }
  }
  function setRange(p) {
    const d = today(); let f = d, e = d;
    if (p === 'tomorrow') f = e = addDays(d, 1);
    if (p === 'next7') e = addDays(d, 6);
    if (p === 'mtd') f = new Date(d.getFullYear(), d.getMonth(), 1);
    if (p === 'month') { f = new Date(d.getFullYear(), d.getMonth(), 1); e = new Date(d.getFullYear(), d.getMonth() + 1, 0); }
    state.from = ymd(f); state.to = ymd(e);
  }
  function openPanel() {
    if (!host) { host = document.createElement('div'); host.id = 'tkdh-host'; root = host.attachShadow({ mode: 'open' }); document.body.appendChild(host); }
    if (!state.from) setRange('today');
    const cnOpts = '<option value="">' + VUNG + '</option>' + KHO_ORDER.map((k) => '<option' + (k === state.cn ? ' selected' : '') + '>' + esc(k) + '</option>').join('');
    root.innerHTML = '<style>' + CSS + '</style><div class="ov"></div>' +
      '<div class="dr"><div class="hd"><b>📋 Thống kê Đơn Hàng</b><button class="x" title="Đóng">✕</button></div><div class="bd">' +
      '<div class="tabs"><div class="tab" data-v="cn">Đơn Hàng Theo Chi Nhánh</div><div class="tab" data-v="tho">Đơn Hàng Theo Thợ</div><div class="tab" data-v="nl">⚡ Năng Lực Chi Nhánh</div></div>' +
      '<div class="pane" id="nlp">' + nlHtml() + '</div><div class="pane" id="std">' +
      '<div class="row"><div><label>Từ ngày</label><input type="date" id="f" value="' + state.from + '"></div>' +
      '<div><label>Đến ngày</label><input type="date" id="t" value="' + state.to + '"></div>' +
      '<div><label>Chi nhánh</label><select id="cn">' + cnOpts + '</select></div>' +
      '<div><label>Cảnh báo trễ hẹn</label><select id="fw"><option value="">Tất cả</option><option value="r">Có ĐH trễ hẹn</option><option value="o">Có ĐH sắp trễ</option><option value="g">An toàn</option><option value="n">Chưa có ĐH</option></select></div>' +
      '<div id="qs"><label>Tìm thợ</label><input id="q" placeholder="Mã / tên thợ" value="' + esc(state.q) + '"></div>' +
      '<button class="btn pri" id="go">Thống kê</button><button class="btn" id="csv">⬇ Xuất CSV</button></div>' +
      '<div class="row"><button class="btn q" data-p="today">Hôm nay</button><button class="btn q" data-p="tomorrow">Ngày mai</button>' +
      '<button class="btn q" data-p="next7">7 ngày tới</button><button class="btn q" data-p="mtd">Đầu tháng – nay</button><button class="btn q" data-p="month">Cả tháng này</button></div>' +
      '<div class="msg" id="msg"></div><div id="cards"></div><div class="note" id="note"></div>' +
      '<div class="tw" id="out"><div class="empty">Chọn khoảng ngày rồi bấm <b>Thống kê</b>.</div></div></div></div></div>';
    const $ = (s) => root.querySelector(s);
    const close = () => { root.innerHTML = ''; };
    $('.x').onclick = close; $('.ov').onclick = close;
    $('#fw').value = state.warn;
    const mark = () => {
      root.querySelectorAll('[data-p]').forEach((x) => x.classList.toggle('on', x.dataset.p === state.preset));
      root.querySelectorAll('.tab').forEach((x) => x.classList.toggle('on', x.dataset.v === state.view));
      $('#qs').style.display = state.view === 'tho' ? '' : 'none';
      $('#nlp').style.display = state.view === 'nl' ? '' : 'none';
      $('#std').style.display = state.view === 'nl' ? 'none' : '';
    };
    nlBind();
    mark();
    $('#go').onclick = run;
    $('#csv').onclick = csv;
    $('#f').onchange = $('#t').onchange = () => { state.preset = ''; mark(); };
    root.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => { state.preset = b.dataset.p; setRange(b.dataset.p); $('#f').value = state.from; $('#t').value = state.to; mark(); run(); }));
    root.querySelectorAll('.tab').forEach((t) => (t.onclick = () => { state.view = t.dataset.v; state.open.clear(); state.open48.clear(); mark(); if (state.view === 'nl') { if (!nl.data) runNL(); } else if (state.data) render(); else run(); }));
    $('#cn').onchange = () => { state.cn = $('#cn').value; render(); };
    $('#fw').onchange = () => { state.warn = $('#fw').value; render(); };
    $('#q').oninput = () => { state.q = $('#q').value; render(); };
    $('#out').onclick = (e) => { const c = e.target.closest('[data-k48]'); if (c) { const k = c.dataset.k48; state.open48.has(k) ? state.open48.delete(k) : state.open48.add(k); render(); return; } const tr = e.target.closest('tr.click'); if (!tr) return; const k = tr.dataset.k; state.open.has(k) ? state.open.delete(k) : state.open.add(k); render(); };
    if (state.view === 'nl') { if (nl.data) renderNL(); else runNL(); } else if (state.data) render(); else run();
  }
  function setMsg(t, err) { const m = root && root.querySelector('#msg'); if (m) { m.textContent = t; m.className = 'msg' + (err ? ' err' : ''); } }
  async function run() {
    const F = root.querySelector('#f').value, T = root.querySelector('#t').value;
    if (!F || !T || F > T) { setMsg('Khoảng ngày không hợp lệ.', true); return; }
    state.from = F; state.to = T;
    const month0 = T.slice(0, 8) + '01';
    const prev = [1, 2, 3].map((n) => shift(F, -n));
    const all = range([F, month0, prev[2]].sort()[0], T);
    root.querySelector('#go').disabled = true;
    const t0 = Date.now();
    try {
      setMsg('Đang tải dữ liệu…');
      await ensureApiReq();
      const byDay = await fetchDays([...all, shift(T, 1)], (d, n) => setMsg('Đang tải dữ liệu… ' + d + '/' + n + ' ngày'));
      const sos = toSO(Object.values(byDay).flat());
      await fetchPlates(sos.filter((s) => s.xt && s.rd >= F && s.rd <= T), (d, n) => setMsg('Đang lấy biển số xe tải… ' + d + '/' + n + ' tuyến'));
      const vdCount = range(F, T).reduce((a, d) => a + byDay[d].length, 0);
      state.data = { F, T, month0, prev, sos, vdCount };
      render();
      setMsg('✔ Đã tải ' + all.length + ' ngày dữ liệu (' + vn(all[0]) + ' → ' + vn(T) + ') · ' + ((Date.now() - t0) / 1000).toFixed(1) + ' giây · cập nhật lúc ' + new Date().toLocaleTimeString('vi-VN') + '. Cảnh báo tự tính lại mỗi phút.');
    } catch (e) { setMsg(e.message || String(e), true); }
    finally { const g = root.querySelector('#go'); if (g) g.disabled = false; }
  }
  function build() {
    const D = state.data; if (!D) return null;
    const inMain = (s) => s.day >= D.F && s.day <= D.T;
    const inMon = (s) => s.day >= D.month0 && s.day <= D.T;
    const sos = D.sos.filter((s) => !state.cn || s.kho === state.cn);
    sos.forEach((s) => { s.ss = soStatus(s); });
    const blank = () => ({ m: { tong: 0, ml: 0, dhk: 0 }, c: { h: 0, d: 0, g: 0, o: 0, r: 0 }, mon: { tong: 0, ml: 0, dhk: 0 }, pv: D.prev.map(() => ({ tong: 0, ml: 0, dhk: 0 })), list: [], xt: 0, non: 0, not: 0, no48: 0, l48: [], bsx: new Map() });
    const now = Date.now();
    const add = (x, s) => {
      const t = (o) => { o.tong++; s.ml ? o.ml++ : o.dhk++; };
      if (inMain(s)) { t(x.m); x.c[s.ss]++; if (s.ss !== 'h') x.list.push(s); }
      if (s.xt && s.rd >= D.F && s.rd <= D.T) { x.xt++; if (s.bs) { const k = s.bs + '|' + s.rd; x.bsx.set(k, (x.bsx.get(k) || 0) + 1); } }
      if (s.no > 0 && s.day <= D.T) { x.non++; x.not += s.no; if (s.xg && now - new Date(s.xg).getTime() > CN_GIO * 3600000) { x.no48++; x.l48.push(s); } }
      if (inMon(s)) t(x.mon);
      const i = D.prev.indexOf(s.day); if (i >= 0) t(x.pv[i]);
    };
    const rows = new Map();
    if (state.view === 'cn') {
      KHO_ORDER.filter((k) => !state.cn || k === state.cn).forEach((k) => rows.set(k, Object.assign({ key: 'k:' + k, kho: k }, blank())));
      sos.forEach((s) => { const r = rows.get(s.kho); if (r) add(r, s); });
    } else {
      THO.filter(([k]) => !state.cn || k === state.cn).sort((a, b) => ordOf(a[0]) - ordOf(b[0]))
        .forEach(([kho, nm, vt]) => rows.set(nm.split('-')[0].trim(), Object.assign({ key: 't:' + nm, kho, tho: nm, vt }, blank())));
      sos.forEach((s) => {
        const code = s.tho ? s.tho.split('-')[0].trim() : '';
        const id = code || '__none__' + s.kho;
        let r = rows.get(id);
        if (!r) { r = Object.assign({ key: 't:' + id, kho: s.kho, tho: s.tho || '(Chưa gán thợ)', vt: '' }, blank()); rows.set(id, r); }
        add(r, s);
      });
    }
    let list = [...rows.values()];
    if (state.view === 'tho') list.sort((a, b) => ordOf(a.kho) - ordOf(b.kho));
    list.forEach((x) => { x.chua = x.c.d + x.c.g + x.c.o + x.c.r; x.warn = x.c.r ? 'r' : x.c.o ? 'o' : x.m.tong ? 'g' : 'n'; });
    if (state.warn) list = list.filter((x) => x.warn === state.warn);
    const q = norm(state.q).toLowerCase();
    if (state.view === 'tho' && q) list = list.filter((x) => x.tho.toLowerCase().includes(q));
    const S = blank(); S.chua = 0;
    list.forEach((x) => {
      ['tong', 'ml', 'dhk'].forEach((k) => { S.m[k] += x.m[k]; S.mon[k] += x.mon[k]; x.pv.forEach((p, i) => (S.pv[i][k] += p[k])); });
      Object.keys(S.c).forEach((k) => (S.c[k] += x.c[k])); S.chua += x.chua;
      S.xt += x.xt; S.non += x.non; S.not += x.not; S.no48 += x.no48; if (x.no48) S.th48 = (S.th48 || 0) + 1;
      x.bsx.forEach((n, k) => S.bsx.set(k, (S.bsx.get(k) || 0) + n));
    });
    const fin = (o) => {
      let nb = 0, th = 0, dh = 0, thDH = 0, tien = 0;
      o.bsx.forEach((n, k) => { dh += n; if (NB_SET.has(k.split('|')[0])) nb++; else { th++; thDH += n; tien += tienThue(n); } });
      Object.assign(o, { nb, th, thDH, tien, xe: nb + th });
      o.tb = o.xe ? dh / o.xe : null;
      o.dg = o.tb == null ? '' : o.tb >= TB_HQ ? 'Hiệu Quả' : 'Chưa Hiệu Quả';
    };
    list.forEach(fin); fin(S);
    return { D, list, S };
  }
  function render() {
    const out = root && root.querySelector('#out'); if (!out) return;
    const B = build(); if (!B) return;
    const { D, list, S } = B, tho = state.view === 'tho';
    const mainLabel = D.F === D.T ? 'Ngày ' + vn(D.T) : 'Từ ' + vn(D.F) + ' đến ' + vn(D.T);
    root.querySelector('#cards').innerHTML = '<div class="cards">' +
      '<div class="card c1"><div>Tổng Đơn Hàng</div><div class="n">' + fmt(S.m.tong) + '</div></div>' +
      '<div class="card c2"><div>ĐH Hoàn tất</div><div class="n">' + fmt(S.c.h) + '</div></div>' +
      '<div class="card c5"><div>ĐH Chưa hoàn tất</div><div class="n">' + fmt(S.chua) + '</div></div>' +
      '<div class="card c3"><div>Có ĐH sắp trễ</div><div class="n">' + fmt(S.c.o) + '</div></div>' +
      '<div class="card c4"><div>Có ĐH trễ hẹn</div><div class="n">' + fmt(S.c.r) + '</div></div></div>';
    root.querySelector('#note').textContent = mainLabel + ': ' + fmt(D.vdCount) + ' vận đơn → ' + fmt(D.sos.filter((s) => s.day >= D.F && s.day <= D.T).length) + ' SO sau khi bỏ trùng (đã bỏ đơn hủy, nhập trả, khuyến mãi). Bấm vào 1 dòng để xem SO chưa hoàn tất. Công nợ = ĐH đã xuất hàng còn tiền chưa nộp (mọi ngày đã tải đến ' + vn(D.T) + '), tuổi nợ tính từ giờ xuất hàng. Xe tải / xe thuê tính theo ngày xe chạy thật (ngày đến nhà khách), đơn chưa chạy tính theo ngày hẹn.';
    const ext = tho ? 3 : 10, lead = tho ? 3 : 1, cols = lead + 18 + ext;
    const VND = (v) => (v ? fmt(Math.round(v)) : '<span class="zz">-</span>');
    const DG = (o) => (o.dg ? '<span class="w ' + (o.tb >= TB_HQ ? 'dg-ok' : 'dg-no') + '">' + o.dg + '</span>' : '<span class="zz">-</span>');
    const TB = (o) => (o.tb == null ? '<span class="zz">-</span>' : o.tb.toLocaleString('vi-VN', { maximumFractionDigits: 1 }));
    const CNW = (x) => (x === S ? (S.no48 ? '<span style="color:#dc2626">' + fmt(S.no48) + ' ĐH trên 48h</span>' : '')
      : x.no48 ? '<span class="w w-r cn48" data-k48="' + esc(x.key) + '" title="Bấm để xem ĐH quá 48h">Có ' + x.no48 + ' ĐH Trên 48h</span>' : x.non ? '<span class="w w-g">CN Dưới 48h</span>' : '<span class="zz">-</span>');
    const cnH1 = '<th colspan="3" class="cno sep">Công Nợ</th>';
    const cnH2 = '<th class="cno sep">SL ĐH Còn Công Nợ</th><th class="cno wd">Số Tiền</th><th class="cno wd" title="Tính từ giờ xuất hàng">Đánh Giá Công Nợ</th>';
    const cnD = (x) => '<td class="sep">' + Z(x.non) + '</td><td class="tien">' + VND(x.not) + '</td><td>' + CNW(x) + '</td>';
    const extH1 = tho ? cnH1 : '<th colspan="5" class="xt sep">Xe Tải</th><th colspan="2" class="thue sep">Xe Thuê</th>' + cnH1;
    const extH2 = tho ? cnH2
      : '<th class="xt sep">Tổng ĐH Xe Tải</th><th class="xt" title="Số xe nội bộ đã chạy (cộng theo ngày)">Xe Nội Bộ</th><th class="xt" title="Biển số không có trong danh sách xe nội bộ (cộng theo ngày)">Xe Thuê</th><th class="xt">Trung Bình Xe</th><th class="xt wm">Đánh Giá</th>' +
        '<th class="thue sep">SL ĐH Xe Thuê</th><th class="thue wm" title="1 xe/ngày: từ 12 đơn = 1.550.000; dưới 12 đơn = số đơn × 125.000">Tiền Xe Thuê</th>' + cnH2;
    const extD = (x) => tho ? cnD(x)
      : '<td class="sep">' + Z(x.xt) + '</td><td>' + Z(x.nb) + '</td><td>' + Z(x.th) + '</td><td>' + TB(x) + '</td><td>' + DG(x) + '</td>' +
        '<td class="sep">' + Z(x.thDH) + '</td><td class="tien2">' + VND(x.tien) + '</td>' + cnD(x);
    const Z = (v) => (v ? fmt(v) : '<span class="zz">-</span>');
    const trioM = (o) => '<td class="sep mon">' + Z(o.tong) + '</td><td class="mon">' + Z(o.ml) + '</td><td class="mon">' + Z(o.dhk) + '</td>';
    const trio = (o) => '<td class="sep">' + Z(o.tong) + '</td><td>' + Z(o.ml) + '</td><td>' + Z(o.dhk) + '</td>';
    let h = '<table><thead><tr><th rowspan="2">Kho</th>' + (tho ? '<th rowspan="2">Họ Và Tên</th><th rowspan="2">Vị Trí</th>' : '') +
      '<th colspan="6" class="main sep">' + esc(mainLabel) + '</th>' + extH1 + '<th colspan="3" class="mon sep">Tổng Tháng ' + Number(D.T.slice(5, 7)) + '</th>' +
      D.prev.map((d) => '<th colspan="3" class="day sep">Ngày ' + vn(d) + '</th>').join('') + '</tr>' +
      '<tr><th class="main sep">Tổng ĐH</th><th class="main">ML</th><th class="main">ĐHK</th><th class="main">Hoàn Tất</th><th class="main">Chưa HT</th><th class="main wm">Cảnh Báo Trễ Hẹn</th>' + extH2 +
      '<th class="sep mon">Tổng ĐH</th><th class="mon">ML</th><th class="mon">ĐHK</th>' + [1, 2, 3].map(() => '<th class="sep">Tổng ĐH</th><th>ML</th><th>ĐHK</th>').join('') + '</tr></thead><tbody>';
    if (!list.length) h += '<tr><td colspan="' + cols + '" class="empty">Không có dữ liệu phù hợp.</td></tr>';
    list.forEach((x) => {
      h += '<tr class="click" data-k="' + esc(x.key) + '"><td class="l kho">' + esc(x.kho) + '</td>' + (tho ? '<td class="l">' + esc(x.tho) + '</td><td>' + esc(x.vt) + '</td>' : '') +
        '<td class="sep"><b>' + Z(x.m.tong) + '</b></td><td>' + Z(x.m.ml) + '</td><td>' + Z(x.m.dhk) + '</td><td>' + Z(x.c.h) + '</td><td>' + Z(x.chua) + '</td>' +
        '<td><span class="w w-' + x.warn + '">' + ((x.c.r || x.c.o) ? 'Có ' + [x.c.r ? x.c.r + ' ĐH trễ' : '', x.c.o ? x.c.o + ' ĐH sắp trễ' : ''].filter(Boolean).join(', ') : WL[x.warn]) + '</span></td>' + extD(x) + trioM(x.mon) + x.pv.map(trio).join('') + '</tr>';
      if (state.open48.has(x.key) && x.l48.length) {
        const l = x.l48.slice().sort((a, b) => a.xg.localeCompare(b.xg));
        h += '<tr class="det"><td colspan="' + cols + '"><div class="stk"><b style="color:#dc2626">ĐH công nợ quá ' + CN_GIO + 'h – ' + esc(x.tho || x.kho) + '</b><table><thead><tr><th>Mã SO</th>' + (tho ? '' : '<th>Thợ</th>') + '<th>Ngày hẹn</th><th>Giờ xuất hàng</th><th>Quá (giờ)</th><th>Số tiền</th><th>Trạng thái TMS</th></tr></thead><tbody>' +
          l.map((s) => '<tr><td>' + esc(s.so) + '</td>' + (tho ? '' : '<td class="l">' + esc(s.tho || '(Chưa gán thợ)') + '</td>') + '<td>' + vn(s.day) + '</td><td>' + vn(s.xg.slice(0, 10)) + ' ' + hm(s.xg) + '</td><td><b style="color:#dc2626">' + Math.floor((Date.now() - new Date(s.xg).getTime()) / 3600000) + 'h</b></td><td class="tien">' + fmt(Math.round(s.no)) + '</td><td class="l">' + esc(s.st) + '</td></tr>').join('') +
          '</tbody></table></div></td></tr>';
      }
      if (state.open.has(x.key)) {
        const ls = x.list.slice().sort((a, b) => 'roagd'.indexOf(a.ss) - 'roagd'.indexOf(b.ss) || a.exp.localeCompare(b.exp));
        h += '<tr class="det"><td colspan="' + cols + '">' + (ls.length ? '<table><thead><tr><th>Mã SO</th><th>Số VĐ</th><th>Loại</th>' + (tho ? '' : '<th>Thợ</th>') + '<th>Ngày hẹn</th><th>Giờ hẹn</th><th>Giờ đến nhà</th><th>Trạng thái TMS</th><th>Cảnh báo</th></tr></thead><tbody>' +
          ls.map((s) => '<tr><td>' + esc(s.so) + '</td><td>' + s.vd + '</td><td>' + (s.ml ? 'ML' : 'ĐHK') + '</td>' + (tho ? '' : '<td class="l">' + esc(s.tho || '(Chưa gán thợ)') + '</td>') + '<td>' + vn(s.day) + '</td><td>' + hm(s.exp) + '</td><td>' + (hm(s.den) || (s.arr ? 'Đã tới' : '—')) + '</td><td class="l">' + esc(s.st) + '</td><td><span class="bdg b-' + s.ss + '">' + SL[s.ss] + '</span></td></tr>').join('') +
          '</tbody></table>' : '<i>Không có SO chưa hoàn tất.</i>') + '</td></tr>';
      }
    });
    h += '<tr class="tot"><td colspan="' + lead + '">Tổng cộng</td><td class="sep">' + Z(S.m.tong) + '</td><td>' + Z(S.m.ml) + '</td><td>' + Z(S.m.dhk) + '</td><td>' + Z(S.c.h) + '</td><td>' + Z(S.chua) + '</td>' +
      '<td><span style="color:#dc2626">' + (S.c.r ? S.c.r + ' trễ' : '') + '</span>' + (S.c.r && S.c.o ? ' · ' : '') + '<span style="color:#d97706">' + (S.c.o ? S.c.o + ' sắp trễ' : '') + '</span></td>' + extD(S) +
      trioM(S.mon) + S.pv.map(trio).join('') + '</tr>';
    out.innerHTML = h + '</tbody></table>';
  }
  function csv() {
    const B = build(); if (!B) return;
    const { D, list } = B, tho = state.view === 'tho';
    const r = [[...(tho ? ['Kho', 'Họ Và Tên', 'Vị Trí'] : ['Kho']), 'Tổng ĐH', 'ML', 'ĐHK', 'Hoàn Tất', 'Chưa HT', 'Cảnh Báo Trễ Hẹn',
      ...(tho ? ['SL ĐH Còn Công Nợ', 'Số Tiền Công Nợ', 'Đánh Giá Công Nợ'] : ['Tổng ĐH Xe Tải', 'Xe Nội Bộ', 'Xe Thuê', 'Trung Bình Xe', 'Đánh Giá', 'SL ĐH Xe Thuê', 'Tiền Xe Thuê', 'SL ĐH Còn Công Nợ', 'Số Tiền Công Nợ', 'Đánh Giá Công Nợ']),
      'Tổng T' + Number(D.T.slice(5, 7)), 'ML', 'ĐHK', ...D.prev.flatMap((d) => ['Ngày ' + vn(d), 'ML', 'ĐHK'])]];
    list.forEach((x) => r.push([...(tho ? [x.kho, x.tho, x.vt] : [x.kho]), x.m.tong, x.m.ml, x.m.dhk, x.c.h, x.chua, WL[x.warn],
      ...(tho ? [x.non, x.not, x.no48 ? 'Có ' + x.no48 + ' ĐH Trên 48h' : x.non ? 'CN Dưới 48h' : ''] : [x.xt, x.nb, x.th, x.tb == null ? '' : Math.round(x.tb * 10) / 10, x.dg, x.thDH, x.tien, x.non, x.not, x.no48 ? 'Có ' + x.no48 + ' ĐH Trên 48h' : x.non ? 'CN Dưới 48h' : '']),
      x.mon.tong, x.mon.ml, x.mon.dhk, ...x.pv.flatMap((p) => [p.tong, p.ml, p.dhk])]));
    const text = '﻿' + r.map((a) => a.map((c) => { const s = String(c == null ? '' : c); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = 'thongke_' + state.view + '_' + D.F + '_' + D.T + '.csv'; document.body.appendChild(a); a.click(); a.remove();
  }
  /* ===== TAB NĂNG LỰC CHI NHÁNH ===== */
  const NL_STD = { 'Đông Anh': [20, 200], 'Sơn Tây': [7, 110], 'Hoài Đức': [15, 190], 'Chương Mỹ': [10, 90], 'Thường Tín': [10, 140], 'Tam Hiệp': [30, 340],
    'Văn Lâm': [15, 125], 'Hòa Bình': [8, 105], 'Phủ Lý': [10, 90], 'Nam Định': [15, 125], 'Hải Hậu': [8, 160], 'Ninh Bình': [20, 260],
    'Bỉm Sơn': [15, 180], 'Thọ Xuân': [10, 110], 'Thanh Hóa': [15, 250], 'Hoàng Mai': [10, 260], 'Vinh': [10, 160], 'Thanh Chương': [10, 160] };
  const NL_ORDER = KHO_ORDER.filter((k) => k in NL_STD).concat(Object.keys(NL_STD).filter((k) => KHO_ORDER.indexOf(k) < 0));
  const NL_KEY = 'tk_nl_cap', SP_KEY = 'tk_nl_sp2', SP_TTL = 3 * 3600000, SP_KEEP = 4 * 86400000;
  const SV_RE = /dịch vụ|bảo hành|bảo trì|vệ sinh|vật tư|phiếu|khuyến mãi|thẻ nhớ|gói cước|công lắp|khung treo|giá đỡ|lõi lọc/i;
  let nlCap = {}; try { nlCap = JSON.parse(localStorage.getItem(NL_KEY) || '{}'); } catch (e) {}
  NL_ORDER.forEach((k) => { if (!Array.isArray(nlCap[k])) nlCap[k] = NL_STD[k].slice(); });
  const saveCap = () => { try { localStorage.setItem(NL_KEY, JSON.stringify(nlCap)); } catch (e) {} };
  let spCache = {}; try { spCache = JSON.parse(localStorage.getItem(SP_KEY) || '{}'); } catch (e) {}
  const nl = { base: '', show: '', data: null, busy: false, msg: '', err: false };
  const dm = (d) => d.slice(8, 10) + '/' + d.slice(5, 7);
  function nlHtml() {
    const opts = '<option value="">Tất cả kho</option><option value="hot"' + (nl.show === 'hot' ? ' selected' : '') + '>Kho từ 80% trở lên</option>' +
      NL_ORDER.map((k) => '<option' + (k === nl.show ? ' selected' : '') + '>' + esc(k) + '</option>').join('');
    return '<div class="nlt" id="nlt"></div>' +
      '<div class="row"><div><label>Ngày gốc (hôm nay)</label><input type="date" id="nlb" value="' + (nl.base || ymd(today())) + '"></div>' +
      '<div><label>Khu vực</label><select><option>' + VUNG + '</option></select></div>' +
      '<div><label>Hiển thị</label><select id="nls">' + opts + '</select></div>' +
      '<button class="btn" id="nlbulk">Đặt năng lực hàng loạt</button><button class="btn" id="nlstd" title="Trả năng lực về bảng chuẩn của Vùng">↺ Năng lực chuẩn</button>' +
      '<button class="btn pri" id="nlgo">⚡ Tính toán</button></div>' +
      '<div class="msg" id="nlm"></div><div id="nlc"></div>' +
      '<div class="lg"><span class="pc p-g">&lt;80%</span> còn dư · <span class="pc p-y">80–100%</span> sát năng lực · <span class="pc p-r">&gt;100%</span> vượt năng lực · ML = Máy lạnh · SPK = Sản phẩm khác · Tổng SP = ML + SPK, tính theo sản phẩm (1 SO có Máy giặt + Tủ lạnh + Tivi = 3; bỏ khuyến mãi/quà tặng, thẻ nhớ, bảo hành, dịch vụ ngoài). Ô năng lực ML/SPK gõ trực tiếp, tự lưu.</div>' +
      '<div class="tw" id="nlo"></div>';
  }
  function nlSetMsg(t, err) { nl.msg = t; nl.err = !!err; const m = root && root.querySelector('#nlm'); if (m) { m.textContent = t; m.className = 'msg' + (err ? ' err' : ''); } }
  function nlBind() {
    const $ = (s) => root.querySelector(s);
    $('#nlgo').onclick = runNL;
    $('#nls').onchange = () => { nl.show = $('#nls').value; renderNL(); };
    $('#nlb').onchange = () => { nl.data = null; renderNL(); };
    $('#nlstd').onclick = () => { if (!confirm('Trả năng lực tất cả kho về bảng chuẩn của Vùng?')) return; NL_ORDER.forEach((k) => (nlCap[k] = NL_STD[k].slice())); saveCap(); renderNL(); };
    $('#nlbulk').onclick = () => {
      const ks = nlKhos();
      const v = prompt('Đặt năng lực cho ' + ks.length + ' kho đang hiển thị.\nNhập theo dạng ML,SPK (ví dụ 10,150):');
      if (!v) return;
      const m = v.match(/^\s*(\d+)\s*[,;\s]\s*(\d+)\s*$/);
      if (!m) { alert('Sai định dạng. Ví dụ đúng: 10,150'); return; }
      ks.forEach((k) => (nlCap[k] = [Number(m[1]), Number(m[2])])); saveCap(); renderNL();
    };
    $('#nlo').addEventListener('change', (e) => {
      const i = e.target.closest('input[data-k]'); if (!i) return;
      const c = nlCap[i.dataset.k]; c[Number(i.dataset.i)] = Math.max(0, Number(i.value) || 0); saveCap(); renderNL();
    });
    if (nl.msg) nlSetMsg(nl.msg, nl.err);
    renderNL();
  }
  async function fetchSP(rows, onProg) {
    const now = Date.now(), t = ymd(today());
    const need = [...new Set(rows.filter((r) => { const c = spCache[r.id]; return !c || (r.exp.slice(0, 10) >= t && now - c[2] > SP_TTL); }).map((r) => r.id))];
    let i = 0, done = 0, fail = 0;
    const worker = async () => {
      while (i < need.length) {
        const id = need[i++];
        try {
          const j = await postApi(JSON.stringify(id), 'ShipmentOrder/LoadPrintData');
          const R = j && !j.IsError && j.ResultObject;
          if (!R) { fail++; } else {
            let ml = 0, spk = 0;
            (R.ShipmentOrder_ItemList || []).forEach((x) => {
              if (x.IsVirtualProduct || x.IsPromotionProduct || !(Number(x.Price) > 0) || SV_RE.test((x.SubGroupName || '') + ' ' + (x.ProductName || ''))) return;
              const q = Number(x.Quantity) || 0;
              if (ML_RE.test((x.SubGroupName || '') + ' ' + (x.ProductName || ''))) ml += q; else spk += q;
            });
            spCache[id] = [ml, spk, Date.now()];
          }
        } catch (e) { fail++; }
        done++; onProg && onProg(done, need.length);
      }
    };
    await Promise.all(Array.from({ length: Math.min(12, need.length) }, worker));
    Object.keys(spCache).forEach((k) => { if (now - spCache[k][2] > SP_KEEP) delete spCache[k]; });
    try { localStorage.setItem(SP_KEY, JSON.stringify(spCache)); } catch (e) { try { localStorage.removeItem(SP_KEY); } catch (e2) {} }
    return fail;
  }
  async function runNL() {
    if (nl.busy || !root || !root.querySelector('#nlgo')) return;
    const base = root.querySelector('#nlb').value || ymd(today());
    const days = [base, shift(base, 1), shift(base, 2)];
    nl.busy = true; root.querySelector('#nlgo').disabled = true;
    const t0 = Date.now();
    try {
      nlSetMsg('Đang tải danh sách đơn…');
      await ensureApiReq();
      const fd = range(shift(base, -5), shift(base, 3));
      const dayOf = (r) => ((r.done && r.ht) ? r.ht : r.exp).slice(0, 10);
      const byDay = await fetchDays(fd, (d, n) => nlSetMsg('Đang tải danh sách đơn… ' + d + '/' + n + ' ngày'));
      const uniq = new Map(); Object.values(byDay).flat().forEach((r) => uniq.set(r.id, r));
      const pick = [...uniq.values()].filter((r) => {
        if (r.cancel || r.ret || r.km || !r.kho) return false;
        const d = dayOf(r), i = days.indexOf(d);
        return i === 0 || (i > 0 && !r.done);
      });
      const fail = await fetchSP(pick, (d, n) => nlSetMsg('Đang đếm sản phẩm từng đơn… ' + d + '/' + n));
      nl.base = base;
      nl.data = { days, rows: pick.map((r) => ({ so: r.so, kho: r.kho, d: dayOf(r), sp: spCache[r.id] || null })) };
      const miss = nl.data.rows.filter((r) => !r.sp).length;
      renderNL();
      nlSetMsg('✔ Đã tải ' + vn(days[0]) + ' → ' + vn(days[2]) + ' · ' + ((Date.now() - t0) / 1000).toFixed(1) + ' giây · lúc ' + new Date().toLocaleTimeString('vi-VN') +
        '. Tính theo sản phẩm; đơn đã hoàn tất tính theo ngày hoàn tất, đơn chưa hoàn tất tính theo ngày hẹn giao; bỏ khuyến mãi, thẻ nhớ, bảo hành, dịch vụ ngoài, đơn hủy, nhập trả.' + (miss ? ' ⚠ ' + miss + ' đơn chưa lấy được số lượng, anh bấm Tính toán lại.' : ''), miss > 0);
    } catch (e) { nlSetMsg(e.message || String(e), true); }
    finally { nl.busy = false; const g = root && root.querySelector('#nlgo'); if (g) g.disabled = false; }
  }
  function nlKhos() { return NL_ORDER.filter((k) => !nl.show || nl.show === 'hot' || k === nl.show); }
  function renderNL() {
    const out = root && root.querySelector('#nlo'); if (!out) return;
    const base = nl.data ? nl.data.days[0] : (root.querySelector('#nlb').value || ymd(today()));
    const days = nl.data ? nl.data.days : [base, shift(base, 1), shift(base, 2)];
    root.querySelector('#nlt').textContent = '⚡ ĐƠN HÀNG & NĂNG LỰC CHI NHÁNH – ' + dm(base);
    const z = () => ({ ml: 0, spk: 0, tong: 0, so: new Set() });
    const agg = {}; NL_ORDER.forEach((k) => (agg[k] = days.map(z)));
    if (nl.data) nl.data.rows.forEach((r) => {
      const a = agg[r.kho]; if (!a || !r.sp) return; const i = days.indexOf(r.d); if (i < 0) return;
      const o = a[i], n = r.sp[0] + r.sp[1]; o.ml += r.sp[0]; o.spk += r.sp[1]; o.tong += n; if (n) o.so.add(r.so);
    });
    const pct = (v, c) => (c ? Math.round(v / c * 100) : null);
    const PC = (p) => (p == null ? '<span class="pc p-0">-</span>' : '<span class="pc ' + (p < 80 ? 'p-g' : p <= 100 ? 'p-y' : 'p-r') + '">' + p + '%</span>');
    let ks = nlKhos();
    if (nl.show === 'hot' && nl.data) ks = ks.filter((k) => { const c = nlCap[k], o = agg[k][0]; return Math.max(pct(o.tong, c[0] + c[1]) || 0, pct(o.ml, c[0]) || 0, pct(o.spk, c[1]) || 0) >= 80; });
    const S = days.map(z), C = [0, 0];
    ks.forEach((k) => { C[0] += nlCap[k][0]; C[1] += nlCap[k][1]; agg[k].forEach((o, i) => { S[i].ml += o.ml; S[i].spk += o.spk; S[i].tong += o.tong; o.so.forEach((x) => S[i].so.add(x)); }); });
    const CT = C[0] + C[1], has = !!nl.data;
    const nset = ks.filter((k) => nlCap[k][0] + nlCap[k][1] > 0).length;
    const LB = ['Hôm nay ' + dm(days[0]) + ' – tổng sản phẩm', 'Ngày mai ' + dm(days[1]) + ' – chờ giao', 'Ngày kia ' + dm(days[2]) + ' – chờ giao'];
    root.querySelector('#nlc').innerHTML = '<div class="nlc"><div class="nk"><div>Năng lực – Tổng SP (ML + SPK)</div><div class="n">' + fmt(CT) + '</div><div class="s">ML ' + fmt(C[0]) + ' · SPK ' + fmt(C[1]) + '<br>' + nset + '/' + ks.length + ' kho đã nhập năng lực</div></div>' +
      S.map((o, i) => '<div class="nk"><div>' + LB[i] + '</div><div class="n">' + (has ? fmt(o.tong) + PC(pct(o.tong, CT)) : '–') + '</div><div class="s">' +
        (has ? 'ML ' + fmt(o.ml) + ' ' + PC(pct(o.ml, C[0])) + ' · SPK ' + fmt(o.spk) + ' ' + PC(pct(o.spk, C[1])) + '<br>' + fmt(o.so.size) + ' đơn thực' : 'Bấm ⚡ Tính toán') + '</div></div>').join('') + '</div>';
    const Z = (v) => (has ? (v ? fmt(v) : '<span class="zz">0</span>') : '<span class="zz">-</span>');
    const DH = ['Hôm nay ' + dm(days[0]) + '<br>(tổng SP)', 'Ngày mai ' + dm(days[1]) + '<br>(chờ giao)', 'Ngày kia ' + dm(days[2]) + '<br>(chờ giao)'];
    const sub = '<th class="s3">Tổng SP</th><th>ML</th><th>SPK</th>';
    let h = '<table><thead><tr><th rowspan="2" class="k">Chi nhánh</th><th colspan="3" class="s3">Năng lực<br>(SP/ngày)</th>' +
      DH.map((t) => '<th colspan="3" class="s3 g1">' + t + '</th>').join('') +
      '<th colspan="3" class="s3 g3">Tỷ lệ hôm nay ' + dm(days[0]) + '</th><th colspan="2" class="s3 g3" title="Tỷ lệ hôm nay ≤ 100% năng lực: giao trong vòng 6h; trên 100%: giao trong vòng 8h">Đánh giá năng lực ' + dm(days[0]) + '</th></tr><tr>' + sub.repeat(5) +
      '<th class="s3 dg">ML</th><th class="dg">SPK</th></tr></thead><tbody>';
    if (!ks.length) h += '<tr><td colspan="18" class="empty">Không có kho phù hợp.</td></tr>';
    const DG6 = (p) => (p == null ? '<span class="zz">-</span>' : p > 100 ? '<span class="pc p-r">Giao trong vòng 8h</span>' : '<span class="pc p-g">Giao trong vòng 6h</span>');
    const rowH = (name, c, a, tot) => '<tr' + (tot ? ' class="tot"' : '') + '><td class="k">' + name + '</td>' +
      '<td class="s3 b">' + fmt(c[0] + c[1]) + '</td>' + (tot ? '<td>' + fmt(c[0]) + '</td><td>' + fmt(c[1]) + '</td>'
        : '<td><input type="number" min="0" data-k="' + esc(name) + '" data-i="0" value="' + c[0] + '"></td><td><input type="number" min="0" data-k="' + esc(name) + '" data-i="1" value="' + c[1] + '"></td>') +
      a.map((o) => '<td class="s3 b">' + Z(o.tong) + '</td><td>' + Z(o.ml) + '</td><td>' + Z(o.spk) + '</td>').join('') +
      (has ? '<td class="s3">' + PC(pct(a[0].tong, c[0] + c[1])) + '</td><td>' + PC(pct(a[0].ml, c[0])) + '</td><td>' + PC(pct(a[0].spk, c[1])) + '</td>' +
        '<td class="s3">' + DG6(pct(a[0].ml, c[0])) + '</td><td>' + DG6(pct(a[0].spk, c[1])) + '</td>'
        : '<td class="s3"><span class="zz">-</span></td><td><span class="zz">-</span></td><td><span class="zz">-</span></td><td class="s3"><span class="zz">-</span></td><td><span class="zz">-</span></td>') + '</tr>';
    ks.forEach((k) => { h += rowH(k, nlCap[k], agg[k], false); });
    if (ks.length) h += rowH('TỔNG CỘNG', C, S, true);
    out.innerHTML = h + '</tbody></table>';
  }
  window.__tkdhOpen = (v) => { if (v) state.view = v; openPanel(); };
  setInterval(() => { if (root && root.querySelector('#out') && state.data) render(); }, 60000);
  setInterval(ensureButton, 1000);
  ensureButton();
})();