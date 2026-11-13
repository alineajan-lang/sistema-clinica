// Calendário (estilo Doctoralia / Sistema Atlas) ligado ao Supabase
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = n => String(n).padStart(2, "0");
  const toMin = h => { if (!h) return 0; const p = String(h).split(":"); return (+p[0]) * 60 + (+p[1] || 0); };
  const fromMin = m => pad(Math.floor(m / 60)) + ":" + pad(m % 60);
  const norm = s => semAcento(s);
  const DOW = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"], MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const MESL = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const diaN = iso => +iso.slice(8, 10);
  const dowOf = iso => new Date(iso + "T12:00:00-04:00").getUTCDay(); // 12:00-04:00 = 16:00 UTC, mesmo dia
  const monday = iso => addDias(iso, -((dowOf(iso) + 6) % 7));
  const HSTART = 6, HEND = 22;
  const PALETA = ["#2F6DB5", "#C46E85", "#7A5BB0", "#0E8F8A", "#C0562B", "#5A6B7B", "#8A5A44", "#2F7F9E", "#A04F8F", "#4E6F9C", "#B0476A", "#5B5FA8"];
  const CANC = s => String(s || "").indexOf("cancelada") === 0;
  const STCHIP = { agendada: "info", confirmada: "info", realizada: "ok", faltou: "late", cancelada_paciente: "", cancelada_clinica: "" };
  const prefs = (() => { try { return JSON.parse(localStorage.getItem("calprefs") || "{}"); } catch (e) { return {}; } })();
  const salvaPrefs = () => { try { localStorage.setItem("calprefs", JSON.stringify({ hideP: C.hideP, hh: C.hh, view: C.view })); } catch (e) {} };
  const C = { anchor: hojeISO(), view: prefs.view || "prof", hideP: prefs.hideP || {}, hh: prefs.hh || 64, cons: [], blq: [], range: null, cq: "", allCols: false, sideOpen: false, miniM: null, modal: null };
  window.CAL = C;

  const visP = id => !C.hideP[id];
  const profsAtivos = () => S.profs.filter(p => p.ativo && atendeEm(p));
  const corProf = id => { const p = S.profs.find(x => x.id === id); if (p && p.cor) return p.cor; const i = S.profs.findIndex(x => x.id === id); return PALETA[(i < 0 ? 0 : i) % PALETA.length]; };
  const iniciais = nome => { const n = String(nome || "?").trim().split(" ").filter(Boolean); return ((n[0] || "?").charAt(0) + (n.length > 1 ? n[n.length - 1].charAt(0) : (n[0] || "").charAt(1))).toUpperCase(); };
  const avatar = p => '<span class="avatar" style="--c:' + corProf(p.id) + '">' + esc(iniciais(p.nome)) + "</span>";
  const statusIcone = st => ({ agendada: "○", confirmada: "✓", realizada: "✓✓", faltou: "✕", cancelada_paciente: "–", cancelada_clinica: "–" }[st] || "");
  const pagoTotal = c => (c.pagamentos || []).reduce((s, x) => s + (Number(x.valor) || 0), 0);
  const saldoC = c => c.pacoteId ? 0 : Math.max(0, Math.round(((Number(c.valor) || 0) - pagoTotal(c)) * 100) / 100);
  const quitado = c => (Number(c.valor) || 0) <= 0 || saldoC(c) <= 0;
  const pagBadge = c => { if (c.pacoteId) return { cls: "", txt: "pacote" }; if (quitado(c)) return { cls: "", txt: "pago" }; return pagoTotal(c) > 0 ? { cls: " pend", txt: "parcial" } : { cls: " pend", txt: "a receber" }; };
  const proNome = id => (S.profs.find(p => p.id === id) || {}).nome || "Profissional";
  const dentro = (c) => !S.emp || c.empresaId === S.emp;
  const profAtivo = id => { const p = S.profs.find(x => x.id === id); return !p || p.ativo; };
  const empCods = p => (p.empresas || []).map(id => (S.emps.find(e => e.id === id) || {}).codigo);
  const empTipo = p => { const c = empCods(p), e = c.includes("essencia"), a = c.includes("atlas"); return e && a ? "ea" : (a ? "a" : "e"); };
  const empRot = p => ({ e: "Essência", a: "Atlas", ea: "Essência + Atlas" }[empTipo(p)]);
  const etag = p => '<span class="etag ' + empTipo(p) + '">' + empRot(p) + "</span>";
  const emk = c => '<i class="emk ' + (empDoCons(c) === "Atlas" ? "a" : "e") + '" title="' + empDoCons(c) + '">' + (empDoCons(c) === "Atlas" ? "A" : "E") + "</i>";
  const tagEmp = id => { const at = (S.emps.find(e => e.id === id) || {}).codigo === "atlas"; return '<span class="etag ' + (at ? "a" : "e") + '">' + (at ? "Atlas" : "Essência") + "</span>"; };
  const empDoCons = c => (S.emps.find(e => e.id === c.empresaId) || {}).codigo === "atlas" ? "Atlas" : "Essência";

  // ---------- dados ----------
  function mapAg(r) {
    const ini = new Date(r.inicio), fim = new Date(r.fim);
    return { id: r.id, empresaId: r.empresa_id, profissionalId: r.profissional_id, pacienteId: r.paciente_id, pacienteNome: r.paciente ? r.paciente.nome : "Paciente", data: diaDe(r.inicio), hora: hhmm(r.inicio),
      duracao: Math.max(5, Math.round((fim - ini) / 60000)), servico: r.servico ? r.servico.nome : "", servicoId: r.servico_id, valor: Number(r.valor) || 0, status: r.status,
      pagamentos: (r.pagamentos || []).map(p => ({ id: p.id, valor: Number(p.valor), forma: p.forma, data: diaDe(p.pago_em) })), obs: r.comentario || "", pacoteId: r.pacote_id, pacoteNum: r.pacote ? r.pacote.numero : null };
  }
  async function carrega(force) {
    const m0 = C.anchor.slice(0, 7) + "-01", ini = monday(addDias(m0, -7)), fim = addDias(ini, 49);
    if (!force && C.range && C.anchor >= C.range[0] && addDias(C.anchor, 7) < C.range[1]) return;
    // mês do anchor (+ margens da semana) — recarrega quando sair dele
    const a = toISO(ini, "00:00"), b = toISO(fim, "00:00");
    const [ags, bl] = await Promise.all([
      ok(sb.from("agendamentos").select("id,empresa_id,paciente_id,profissional_id,servico_id,pacote_id,inicio,fim,status,valor,comentario,paciente:pacientes(nome),servico:servicos(nome),pacote:pacotes(numero),pagamentos(id,valor,forma,pago_em)").gte("inicio", a).lt("inicio", b).order("inicio").limit(3000)),
      ok(sb.from("bloqueios").select("*").lt("inicio", b).gt("fim", a).limit(3000))]);
    C.cons = ags.map(mapAg); C.blq = bl; C.range = [ini, fim];
    await carregaPk(ags);
  }
  async function carregaPk(ags) {
    const ids = [...new Set(ags.filter(a => a.pacote_id).map(a => a.pacote_id))]; C.pk = {};
    for (let i = 0; i < ids.length; i += 60) {
      const ch = ids.slice(i, i + 60);
      const [pcs, ss] = await Promise.all([ok(sb.from("pacotes").select("id,numero,tipo,sessoes_total,valor,valor_pago,vendido_em").in("id", ch)), ok(sb.from("agendamentos").select("id,pacote_id,inicio,status").in("pacote_id", ch).order("inicio").limit(2000))]);
      pcs.forEach(p => { const st = pkStats(p.sessoes_total, ss.filter(x => x.pacote_id === p.id)); C.pk[p.id] = Object.assign({ numero: p.numero, tipo: p.tipo, valor: p.valor }, st); });
    }
  }
  const pkDe = c => c.pacoteId && C.pk && C.pk[c.pacoteId];
  const consVis = () => C.cons.filter(c => dentro(c) && profAtivo(c.profissionalId) && !CANC(c.status));
  function blqDia(b, d) {
    const ds = new Date(toISO(d, "00:00")).getTime(), de = ds + 86400000, s = new Date(b.inicio).getTime(), e = new Date(b.fim).getTime();
    if (e <= ds || s >= de) return null;
    if (b.dia_todo) return { a: 0, b: 1440 };
    return { a: Math.max(0, Math.round((s - ds) / 60000)), b: Math.min(1440, Math.round((e - ds) / 60000)) };
  }

  // ---------- layout dos eventos (colunas lado a lado quando se sobrepõem) ----------
  function layoutDay(evs) {
    evs = evs.slice().sort((a, b) => toMin(a.hora) - toMin(b.hora) || (b.duracao || 60) - (a.duracao || 60));
    const out = []; let cluster = [], end = -1;
    function flush() {
      const lanes = []; cluster.forEach(e => { const s = toMin(e.hora); let l = 0; while (lanes[l] !== undefined && lanes[l] > s) l++; lanes[l] = s + (e.duracao || 60); e._lane = l; });
      const cs = Math.min(...cluster.map(e => toMin(e.hora))), ce = Math.max(...cluster.map(e => toMin(e.hora) + (e.duracao || 60)));
      cluster.forEach(e => { e._n = lanes.length; e._cs = cs; e._ce = ce; e._cn = cluster.length; out.push(e); }); cluster = []; end = -1;
    }
    evs.forEach(e => { const s = toMin(e.hora), f = s + (e.duracao || 60); if (cluster.length && s >= end) flush(); cluster.push(e); end = Math.max(end, f); });
    if (cluster.length) flush();
    return out;
  }
  const rangeDays = () => (C.view === "prof") ? [C.anchor] : (function () { const m = monday(C.anchor), o = []; for (let i = 0; i < 7; i++) o.push(addDias(m, i)); return o; })();

  // ---------- peças ----------
  function miniCal() {
    if (C.miniFor !== C.anchor) { C.miniM = C.anchor.slice(0, 7); C.miniFor = C.anchor; }
    const y = +C.miniM.slice(0, 4), m = +C.miniM.slice(5, 7), off = (dowOf(C.miniM + "-01") + 6) % 7, hoje = hojeISO(), has = {}, cells = [];
    consVis().forEach(c => { if (!CANC(c.status) && visP(c.profissionalId)) has[c.data] = 1; });
    for (let i = 0; i < 42; i++) { const iso = addDias(C.miniM + "-01", i - off), out = iso.slice(0, 7) !== C.miniM;
      cells.push('<button type="button" data-act="minipick" data-d="' + iso + '" class="' + (out ? "out " : "") + (iso === hoje ? "today " : "") + (iso === C.anchor ? "sel " : "") + (has[iso] ? "has" : "") + '">' + diaN(iso) + "</button>"); }
    return '<div class="minihead"><button type="button" class="xbtn" data-act="minav" data-n="-1" aria-label="Mês anterior">‹</button><span>' + MESL[m - 1] + " " + y + '</span><button type="button" class="xbtn" data-act="minav" data-n="1" aria-label="Próximo mês">›</button></div>' +
      '<div class="minigrid">' + ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"].map(x => '<div class="dw">' + x + "</div>").join("") + cells.join("") + "</div>";
  }
  function agList() {
    if (ehProf()) return "";
    const lista = profsAtivos(), oc = lista.some(p => C.hideP[p.id]);
    const grupo = (tipo, titulo) => { const ps = lista.filter(p => empTipo(p) === tipo); if (!ps.length) return "";
      return '<div class="grp"><span class="etag ' + tipo + '">' + titulo + "</span></div>" + ps.map(p => '<label style="--c:' + corProf(p.id) + '"><input type="checkbox" data-act="agtoggle" data-id="' + esc(p.id) + '"' + (visP(p.id) ? " checked" : "") + ">" + avatar(p) + '<span class="agn"><b>' + esc(p.nome) + "</b><small>" + esc(p.area || "") + "</small></span></label>").join(""); };
    return '<div class="lbl" style="margin:16px 0 6px;display:flex;justify-content:space-between;align-items:center"><span>Agendas</span>' + (oc ? '<button type="button" class="btn btn-ghost btn-sm" data-act="agall">Marcar todas</button>' : "") + '</div><div class="agl">' +
      grupo("e", "Essência") + grupo("a", "Atlas") + grupo("ea", "Essência + Atlas") + "</div>";
  }
  function listaHtml(cons) {
    const rows = cons.slice().sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
    if (!rows.length) return '<div class="empty">Nenhuma consulta neste período.</div>';
    let out = '<div class="tbl"><div class="tr th cols-lista"><div>Horário</div><div>Paciente</div><div>Serviço</div><div>Profissional</div><div>Situação</div><div class="num">Pagamento</div></div>', cur = "";
    rows.forEach(c => {
      if (c.data !== cur) { cur = c.data; out += '<div class="tr foot" style="grid-template-columns:1fr;min-width:0;text-transform:capitalize">' + esc(diaSemana(c.data)) + (c.data === hojeISO() ? " · hoje" : "") + "</div>"; }
      const pr = S.profs.find(p => p.id === c.profissionalId) || { nome: "Profissional", id: c.profissionalId }, pb = pagBadge(c);
      out += '<div class="tr click cols-lista" data-act="cons" data-id="' + esc(c.id) + '"><div>' + esc(c.hora) + " – " + esc(fromMin(toMin(c.hora) + c.duracao)) + '</div><div><div class="name">' + esc(c.pacienteNome) + "</div>" + (c.obs ? '<div class="meta">📝 ' + esc(c.obs) + "</div>" : "") + "</div><div>" + esc(c.servico) + (c.pacoteNum ? '<div class="meta">Pacote #' + c.pacoteNum + ' ' + (pkDe(c) ? pkValHtml(pkDe(c).valor) + (pkDe(c).pos[c.id] ? ' · sessão ' + pkDe(c).pos[c.id] + '/' + pkDe(c).total : '') : '') + '</div>' : '') + '</div><div style="display:flex;align-items:center;gap:8px;min-width:0">' + avatar(pr) + "<span>" + esc(pr.nome) + '</span></div><div><span class="chip ' + (STCHIP[c.status] || "") + '">' + esc(STATUS[c.status] || c.status) + '</span></div><div class="num">' +
        ((c.valor > 0 && !CANC(c.status) && c.status !== "faltou") ? '<span class="chip ' + ((pb.txt === "pago" || pb.txt === "pacote") ? "ok" : "warn") + '">' + pb.txt + " · " + brl(c.valor) + "</span>" : "—") + "</div></div>";
    });
    return out + "</div>";
  }

  function html() {
    const HH = C.hh; document.documentElement.style.setProperty("--hh", HH + "px");
    const days = rangeDays(), hoje = hojeISO(), dia1 = C.view === "prof", cqn = norm(C.cq);
    const title = dia1 ? diaSemana(days[0]) : (diaN(days[0]) + " " + MES[+days[0].slice(5, 7) - 1] + " – " + diaN(days[6]) + " " + MES[+days[6].slice(5, 7) - 1] + " " + days[6].slice(0, 4));
    const gestao = ehGestao();
    const wk = (function () { const m = monday(C.anchor), o = []; for (let i = 0; i < 7; i++) o.push(addDias(m, i)); return o; })();
    const strip7 = C.view === "lista" ? "" : '<div class="daystrip">' + wk.map(d => '<button type="button" data-act="goday" data-d="' + d + '" class="' + (dia1 && d === C.anchor ? "sel " : "") + (d === hoje ? "today" : "") + '"><small>' + DOW[dowOf(d)] + "</small>" + diaN(d) + "</button>").join("") + "</div>";
    const tb = '<div class="toolbar"><button class="btn btn-ghost only-narrow tb-ag" data-act="sidetoggle">Agendas</button><button class="btn btn-ghost tb-hoje" data-act="hoje">Hoje</button><button class="btn btn-ghost tb-prev" data-act="nav" data-n="-1" aria-label="Anterior">‹</button><button class="btn btn-ghost tb-next" data-act="nav" data-n="1" aria-label="Próximo">›</button>' +
      '<div class="range tb-range">' + esc(title) + '</div><span class="grow"></span><input type="search" id="cqIn" class="tb-search" placeholder="Buscar paciente na agenda" value="' + esc(C.cq) + '" style="width:min(230px,100%)">' +
      (C.view === "lista" ? "" : '<div class="seg tb-zoom"><button data-act="zoom" data-n="-1" aria-label="Diminuir">−</button><button data-act="zoom" data-n="1" aria-label="Ampliar">+</button></div>') +
      '<div class="seg tb-view"><button data-act="view" data-v="prof" class="' + (C.view === "prof" ? "on" : "") + '">Dia</button><button data-act="view" data-v="semana" class="' + (C.view === "semana" ? "on" : "") + '">Semana</button><button data-act="view" data-v="lista" class="' + (C.view === "lista" ? "on" : "") + '">Lista</button></div>' +
      (C.view === "prof" && !ehProf() ? '<button class="btn btn-ghost tb-all" data-act="allcols">' + (C.allCols ? "Só com consultas" : "Mostrar todos") + "</button>" : "") +
      (gestao || ehProf() ? '<button class="btn btn-primary tb-new" data-act="newcons">+ Nova consulta</button>' : "") + strip7 + "</div>";
    const side = '<aside class="agside' + (C.sideOpen ? " open" : "") + '">' + '<div class="lgd"><span class="lgc e">E</span> Essência <span class="lgc a">A</span> Atlas</div>' + miniCal() + (gestao ? '<div class="agk"><button type="button" class="lk" data-act="newblq">🔒 Bloquear horário</button></div>' : "") + agList() + "</aside>";
    const cons = consVis().filter(c => days.indexOf(c.data) !== -1 && visP(c.profissionalId));
    const vis = cons.filter(c => !CANC(c.status)), recv = vis.reduce((a, c) => a + pagoTotal(c), 0), aber = vis.filter(c => c.status === "realizada").reduce((a, c) => a + saldoC(c), 0);
    const achou = cqn ? vis.filter(c => norm(c.pacienteNome).indexOf(cqn) !== -1).length : 0;
    const strip = '<div class="strip"><span><b>' + vis.length + "</b> consulta" + (vis.length === 1 ? "" : "s") + " no período</span>" + (gestao ? "<span>Recebido <b>" + brl(recv) + "</b></span><span>A receber (realizadas) <b>" + brl(aber) + "</b></span>" : "") + (cqn ? "<span><b>" + achou + "</b> encontrada(s) para “" + esc(C.cq) + "”</span>" : (gestao ? "<span>Clique em um horário vazio para agendar.</span>" : "")) + "</div>";
    let corpo;
    if (C.view === "lista") corpo = listaHtml(cqn ? cons.filter(c => norm(c.pacienteNome).indexOf(cqn) !== -1) : cons);
    else {
      let defs;
      if (C.view === "prof") {
        const base = S.profs.filter(p => p.ativo && visP(p.id) && (atendeEm(p) || cons.some(c => c.profissionalId === p.id)));
        const com = base.filter(p => cons.some(c => c.profissionalId === p.id));
        defs = ((C.allCols || !com.length) ? base : com).map(p => ({ d: days[0], p }));
      } else defs = days.map(d => ({ d, p: null }));
      if (!defs.length) corpo = '<div class="empty"><b>Nenhuma agenda marcada.</b><br>Marque ao menos um profissional em <b>Agendas</b>.</div>';
      else {
        const n = defs.length, total = (HEND - HSTART) * HH, mob = window.innerWidth < 700, minc = mob ? (C.view === "prof" ? Math.min(360, window.innerWidth - 70) : 112) : (C.view === "prof" ? 190 : 150), grid = (mob ? "42px" : "52px") + " repeat(" + n + ",minmax(" + minc + "px,1fr))";
        const head = '<div class="calhead" style="grid-template-columns:' + grid + '"><div></div>' + defs.map(df => {
          if (df.p) return '<div class="dh prof" style="--c:' + corProf(df.p.id) + '" title="' + esc(df.p.nome) + '">' + avatar(df.p) + '<span class="pn"><b>' + esc(df.p.nome) + "</b><small>" + esc(df.p.area || "") + " " + etag(df.p) + "</small></span></div>";
          return '<div class="dh' + (df.d === hoje ? " today" : "") + '" data-act="goday" data-d="' + df.d + '"><small>' + DOW[dowOf(df.d)] + "</small>" + (df.d === hoje ? "<b>" + diaN(df.d) + "</b>" : diaN(df.d)) + "</div>";
        }).join("") + "</div>";
        const gutter = '<div class="gutter" style="height:' + total + 'px">' + Array.from({ length: HEND - HSTART }, (_, i) => '<div class="hl" style="top:' + (i * HH) + 'px">' + pad(HSTART + i) + ":00</div>").join("") + "</div>";
        const agora = new Date(), nowMin = +agora.toLocaleTimeString("sv-SE", { timeZone: TZ, hour: "2-digit" }) * 60 + +agora.toLocaleTimeString("sv-SE", { timeZone: TZ, minute: "2-digit" });
        const unico = profsAtivos().filter(p => visP(p.id)).length === 1 ? profsAtivos().find(p => visP(p.id)).id : null;
        const cols = defs.map(df => {
          const d = df.d, evs = layoutDay(cons.filter(c => c.data === d && (!df.p || c.profissionalId === df.p.id))), vistos = {};
          const blHtml = C.blq.filter(b => df.p ? b.profissional_id === df.p.id : (unico && b.profissional_id === unico)).map(b => {
            const r = blqDia(b, d); if (!r) return ""; const a0 = Math.max(r.a, HSTART * 60), z0 = Math.min(r.b, HEND * 60); if (z0 <= a0) return "";
            const faixa = (r.a === 0 && r.b === 1440) ? "Dia todo" : (fromMin(r.a) + " - " + fromMin(r.b));
            return '<div class="bl" data-act="blq" data-id="' + esc(b.id) + '" style="top:' + ((a0 - HSTART * 60) / 60 * HH) + "px;height:" + Math.max(22, (z0 - a0) / 60 * HH - 2) + 'px" title="' + esc(ehProf() ? "Horário bloqueado" : (b.comentario || "Bloqueio")) + '"><span class="blh">🔒 ' + faixa + "</span><b>" + esc(ehProf() ? "Horário bloqueado" : (b.comentario || "Bloqueio")) + "</b></div>";
          }).join("");
          const evHtml = evs.map(e => {
            if (C.view === "semana" && e._n >= 4) { if (vistos[e._cs]) return ""; vistos[e._cs] = 1; const grp = evs.filter(x => x._cs === e._cs).sort((x, y) => toMin(x.hora) - toMin(y.hora)), nomes = [...new Set(grp.map(x => String(proNome(x.profissionalId)).split(" ")[0]))]; return '<div class="ev many" data-act="goday" data-d="' + d + '" style="--c:var(--accent);top:' + ((e._cs - HSTART * 60) / 60 * HH) + "px;height:" + Math.max(58, (e._ce - e._cs) / 60 * HH - 2) + 'px;left:1px;width:calc(100% - 3px)" title="' + esc(grp.map(x => x.hora + " · " + proNome(x.profissionalId) + " · " + x.pacienteNome).join("\n")) + '"><b class="evn">' + e._cn + ' atendimentos</b><span class="evm" style="max-height:none"><span>' + esc(nomes.join(", ")) + '</span></span><span class="evm" style="max-height:none;font-weight:700"><span>clique: ver por profissional</span></span></div>'; }
            const s = toMin(e.hora), top = (s - HSTART * 60) / 60 * HH, hgt = Math.max(26, e.duracao / 60 * HH - 2), w = 100 / e._n, left = e._lane * w, fim = fromMin(s + e.duracao), pb = pagBadge(e), nome = e.pacienteNome;
            const pay = (e.valor > 0 && !CANC(e.status) && e.status !== "faltou" && gestao) ? '<i class="pay' + pb.cls + '">' + pb.txt + "</i>" : "";
            const nm2 = (e._n >= 3) ? String(nome).split(" ")[0] : nome, dim = (cqn && norm(nome).indexOf(cqn) === -1); let inner;
            if (hgt < 34) inner = '<b class="evn">' + esc(nm2) + "</b>";
            else if (hgt < 52) inner = '<b class="evn"><small>' + esc(e.hora) + "</small>" + esc(nm2) + "</b>";
            else inner = '<div class="evt"><span>' + (e._n >= 2 ? esc(e.hora) : esc(e.hora) + " – " + esc(fim)) + "</span>" + (e._n >= 3 ? "" : '<span class="evi">' + (e.obs ? "📝 " : "") + statusIcone(e.status) + "</span>") + '</div><b class="evn">' + esc(nm2) + '</b><span class="evm">' + (hgt >= 70 ? "<span>" + esc(e.servico) + "</span>" : "") + (e.pacoteNum ? "<span>Pacote #" + e.pacoteNum + " " + (pkDe(e) ? pkValHtml(pkDe(e).valor) : "") + (pkDe(e) && pkDe(e).pos[e.id] ? " sessão " + pkDe(e).pos[e.id] + "/" + pkDe(e).total : "") + "</span>" : "") + (!S.emp && hgt >= 70 ? '<span class="etag ' + (empDoCons(e) === "Atlas" ? "a" : "e") + '">' + empDoCons(e) + "</span>" : "") + pay + "</span>";
            return '<div class="ev c' + (empDoCons(e) === "Atlas" ? "A" : "E") + ' ' + (CANC(e.status) ? "cancelada" : esc(e.status)) + (hgt < 34 ? " one" : "") + (e._n > 1 ? " nar" : "") + (dim ? " dim" : "") + '" data-act="cons" data-id="' + esc(e.id) + '" style="--c:' + corProf(e.profissionalId) + ";top:" + top + "px;height:" + hgt + "px;left:calc(" + left + "% + 1px);width:calc(" + w + '% - 3px)" title="' + esc(e.hora + " · " + nome + " · " + e.servico + " · " + proNome(e.profissionalId) + " · " + (STATUS[e.status] || "")) + '">' + emk(e) + inner + "</div>";
          }).join("");
          const line = (d === hoje && nowMin >= HSTART * 60 && nowMin < HEND * 60) ? '<div class="nowline" style="top:' + ((nowMin - HSTART * 60) / 60 * HH) + 'px"></div>' : "";
          return '<div class="col' + (d === hoje ? " today" : "") + '" data-act="slot" data-d="' + d + '"' + (df.p ? ' data-p="' + esc(df.p.id) + '"' : "") + ' style="height:' + total + 'px">' + blHtml + evHtml + line + "</div>";
        }).join("");
        corpo = '<div class="calwrap" id="calwrap"><div class="cal" style="min-width:' + (52 + n * minc) + 'px">' + head + '<div class="calbody" style="grid-template-columns:' + grid + '">' + gutter + cols + "</div></div></div>";
      }
    }
    return '<div class="agwrap">' + side + '<div class="agmain">' + tb + strip + corpo + "</div></div>";
  }
  function pinta() {
    const raiz = $("calroot"); if (!raiz) return;
    const f = document.activeElement, kid = f && f.id === "cqIn" ? f.selectionStart : null, cw = $("calwrap"), sc = cw ? { t: cw.scrollTop, l: cw.scrollLeft } : null;
    raiz.innerHTML = html();
    if (kid !== null && $("cqIn")) { $("cqIn").focus(); try { $("cqIn").setSelectionRange(kid, kid); } catch (e) {} }
    const w = $("calwrap"); if (w) { if (sc) { w.scrollTop = sc.t; w.scrollLeft = sc.l; } else w.scrollTop = Math.max(0, (8 - HSTART) * C.hh - 10); }
  }
  async function recarrega(force) { try { await carrega(force); } catch (e) { toast(e.message, true); } pinta(); }

  // ---------- janela lateral (consulta) ----------
  function drawer(titulo, corpo, rodape) {
    $("drtitle").textContent = titulo; $("drbody").innerHTML = corpo; $("drfoot").innerHTML = rodape || "";
    $("drw").classList.add("open"); $("dscrim").classList.add("open"); document.body.classList.add("drawer-open");
  }
  function fecha() { $("drw").classList.remove("open"); $("dscrim").classList.remove("open"); document.body.classList.remove("drawer-open"); C.modal = null; }
  const val = id => { const e = $(id); return e ? e.value.trim() : ""; };
  const opt = (v, l, sel) => '<option value="' + esc(v) + '"' + (sel ? " selected" : "") + ">" + esc(l) + "</option>";
  const payRow = x => { x = x || {}; return '<div class="prow" data-pid="' + esc(x.id || "") + '" data-orig="' + esc(x.data || "") + '"><input class="pv" type="number" step="0.01" value="' + esc(x.valor == null ? "" : x.valor) + '" aria-label="Valor"><select class="pf" aria-label="Forma"><option value="">Forma…</option>' + Object.entries(FORMAS).map(([k, t]) => opt(k, t, x.forma === k)).join("") + '</select><input class="pd" type="date" value="' + esc(x.data || hojeISO()) + '"><button type="button" class="xbtn" data-act="paydel" aria-label="Remover">✕</button></div>'; };
  const readPays = () => Array.from(document.querySelectorAll("#payBox .prow")).map(r => ({ id: r.dataset.pid || null, orig: r.dataset.orig || "", valor: Number(r.querySelector(".pv").value) || 0, forma: r.querySelector(".pf").value, data: r.querySelector(".pd").value || hojeISO() }));
  function updPaySum() { const el = $("paySum"); if (!el) return; const v = Number(val("fValor")) || 0, t = readPays().reduce((a, x) => a + x.valor, 0), sd = Math.round((v - t) * 100) / 100; el.textContent = v <= 0 ? "Sem valor a cobrar." : (t <= 0 ? "Nada recebido. Saldo " + brl(v) + "." : "Recebido " + brl(t) + " de " + brl(v) + (sd > 0 ? " · saldo " + brl(sd) : (sd < 0 ? " · " + brl(-sd) + " a mais" : " · quitado"))); }
  function conflito(selfId, pro, dd, hora, dur) {
    if (!pro || !dd || !hora) return null; const ini = toMin(hora), fim = ini + (Number(dur) || 60);
    return C.cons.find(c => c.id !== selfId && c.profissionalId === pro && c.data === dd && !CANC(c.status) && toMin(c.hora) < fim && ini < toMin(c.hora) + c.duracao) || null;
  }
  function aviso() {
    const el = $("fConf"); if (!el || !C.modal) return; const st = val("fSt") || "agendada", c = CANC(st) ? null : conflito(C.modal.id, val("fPro"), val("fData"), val("fHora"), val("fDur"));
    const bk = (!c && !CANC(st)) ? C.blq.find(b => b.profissional_id === val("fPro") && blqDiaHora(b, val("fData"), val("fHora"), val("fDur"))) : null;
    el.hidden = !(c || bk);
    if (c) { el.textContent = proNome(val("fPro")) + " já atende " + c.pacienteNome + " das " + c.hora + " às " + fromMin(toMin(c.hora) + c.duracao) + ". Só um paciente por horário: escolha outro horário."; el.style.background = "var(--late-soft)"; el.style.color = "var(--late)"; }
    else if (bk) { el.textContent = "Horário bloqueado" + (bk.comentario ? ": " + bk.comentario : "") + ". Dá para agendar mesmo assim."; el.style.background = "var(--warn-soft)"; el.style.color = "var(--warn)"; }
  }
  function blqDiaHora(b, d, hora, dur) { const r = blqDia(b, d); if (!r || !hora) return false; const ini = toMin(hora), fim = ini + (Number(dur) || 60); return r.a < fim && ini < r.b; }
  const limpaNome = n => String(n || "").replace(/\s*R\$\s*\d+/, "");
  async function fillPacotes(pid, sel) {
    const el = $("fPac"); if (!el) return;
    if (!C.modelos) { try { C.modelos = await ok(sb.from("pacote_modelos").select("*").eq("ativo", true).order("ordem")); } catch (e) { C.modelos = []; } }
    let pcs = []; if (pid) pcs = await ok(sb.from("pacotes").select("id,numero,tipo,sessoes_total,valor").eq("paciente_id", pid).order("numero", { ascending: false }));
    const grpPac = pcs.length ? '<optgroup label="Pacotes já contratados pelo paciente">' + pcs.map(p => opt(p.id, pkReais(p.valor) + " — #" + p.numero + " " + (p.tipo || "") + " (" + p.sessoes_total + " sessões)", p.id === sel)).join("") + "</optgroup>" : "";
    const grpNovo = (C.modelos || []).length ? '<optgroup label="Vender novo pacote (escolha pelo valor)">' + C.modelos.map(m => opt("novo:" + m.id, pkReais(m.valor) + " — " + limpaNome(m.nome) + " · NOVO")).join("") + "</optgroup>" : "";
    el.innerHTML = opt("", "— sem pacote —", !sel) + grpPac + grpNovo;
    if (sel) el.value = sel;
  }
  async function abreCons(id, preset) {
    const c = id ? C.cons.find(x => x.id === id) : null; preset = preset || {}; const gestao = ehGestao(), prof = ehProf();
    if (!id && !gestao && !prof) return;
    const defPro = c ? c.profissionalId : (preset.pro || profsAtivos().filter(p => visP(p.id))[0]?.id || profsAtivos()[0]?.id);
    const d = { profissionalId: defPro, pacienteId: c ? c.pacienteId : (preset.pid || ""), pacienteNome: c ? c.pacienteNome : (preset.nome || ""), data: c ? c.data : (preset.data || hojeISO()), hora: c ? c.hora : (preset.hora || "08:00"), duracao: c ? c.duracao : 60, servicoId: c ? c.servicoId : "", servico: c ? c.servico : "", valor: c ? c.valor : 0, status: c ? c.status : "agendada", pags: c ? c.pagamentos : [], obs: c ? c.obs : "" };
    C.modal = { id: id || null, pid: d.pacienteId, emp: c ? c.empresaId : null };
    const pro0 = S.profs.find(p => p.id === d.profissionalId) || { id: d.profissionalId, nome: "Profissional" }, vv = Number(d.valor) || 0, tot = d.pags.reduce((a, x) => a + x.valor, 0), pst = vv <= 0 ? "Sem valor" : (tot >= vv ? "Paga" : (tot > 0 ? "Pagamento parcial" : "Não paga"));
    const bloqPac = (prof && c) ? " disabled" : "", bloqPro = prof ? " disabled" : "", bloq = "";
    const servs = S.servs.filter(s => s.ativo);
    const body = (c ? '<div class="fbanner ' + (empDoCons(c) === "Atlas" ? "a" : "e") + '">PACIENTE ' + (empDoCons(c) === "Atlas" ? "DA ATLAS" : "DA ESSÊNCIA") + "</div>" : "") + (c ? '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="chip ' + (STCHIP[d.status] || "") + '">' + esc(STATUS[d.status]) + "</span>" + (gestao ? '<span class="chip ' + (pst === "Paga" ? "ok" : (pst === "Sem valor" ? "" : "warn")) + '">' + pst + "</span>" : "") + '<span style="display:inline-flex;align-items:center;gap:6px;font-weight:700;font-size:13px">' + avatar(pro0) + esc(pro0.nome) + "</span></div>" : "") +
      '<div class="sect"><h3>Paciente</h3><div class="field"><label for="fPacQ">Nome</label><input id="fPacQ" type="text" autocomplete="off" placeholder="Buscar paciente" value="' + esc(d.pacienteNome) + '"' + bloqPac + '><div class="sug" id="sug" hidden></div></div>' + (c && d.pacienteId ? '<div><a class="btn btn-ghost btn-sm" href="#/paciente/' + esc(d.pacienteId) + (prof ? "?t=prontuario" : "") + '">Ver ficha e prontuário</a></div>' : "") + "</div>" +
      '<div class="sect"><h3>Detalhes da consulta</h3>' + (c ? '<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-ghost btn-sm" data-act="quick" data-s="confirmada">Confirmar</button><button class="btn btn-ghost btn-sm" data-act="quick" data-s="realizada">Marcar realizada</button><button class="btn btn-ghost btn-sm" data-act="quick" data-s="faltou">Faltou</button><button class="btn btn-ghost btn-sm" data-act="quick" data-s="cancelada_paciente">Cancelou</button><button class="btn btn-ghost btn-sm" data-act="quick" data-s="cancelada_clinica">Clínica cancelou</button></div>' : "") +
      '<div class="two"><div class="field"><label for="fPro">Profissional</label><select id="fPro"' + bloqPro + ">" + S.profs.filter(p => p.ativo).map(p => opt(p.id, p.nome, p.id === d.profissionalId)).join("") + '</select></div><div class="field"><label for="fSt">Situação</label><select id="fSt">' + Object.entries(STATUS).map(([k, t]) => opt(k, t, d.status === k)).join("") + "</select></div></div>" +
      '<div class="three"><div class="field"><label for="fData">Data</label><input id="fData" type="date" value="' + esc(d.data) + '"' + bloq + '></div><div class="field"><label for="fHora">Hora</label><input id="fHora" type="time" step="900" value="' + esc(d.hora) + '"' + bloq + '></div><div class="field"><label for="fDur">Duração (min)</label><input id="fDur" type="number" step="5" min="5" value="' + esc(d.duracao) + '"' + bloq + "></div></div>" +
      '<div class="note" id="fConf" hidden style="font-weight:700"></div>' +
      '<div class="two"><div class="field"><label for="fServ">Serviço</label><input id="fServ" type="text" list="servList" value="' + esc(d.servico) + '"' + bloq + '></div><div class="field"><label for="fValor">Valor (R$)</label><input id="fValor" type="number" step="0.01" value="' + esc(d.valor) + '"' + bloq + "></div></div></div>" +
      (gestao ? '<div class="sect"><h3>Pagamento</h3><div class="field"><label for="fPac">Pacote</label><select id="fPac"><option value="">— sem pacote —</option></select></div><div id="payBox">' + d.pags.map(payRow).join("") + '</div><div id="paySum" class="meta"></div><div><button type="button" class="btn btn-ghost btn-sm" data-act="payadd">+ Registrar pagamento</button></div></div>' : "") +
      pacoteBloco(c) +
      '<div class="sect"><h3>Notas</h3><div class="field"><textarea id="fObs" placeholder="Adicionar notas">' + esc(d.obs) + "</textarea></div></div>" + (c && gestao ? '<div><button class="btn btn-danger btn-sm" data-act="delcons">Excluir consulta</button></div>' : "");
    $("servList").innerHTML = servs.map(s => '<option value="' + esc(s.nome) + '">').join("");
    drawer(c ? d.pacienteNome : "Nova consulta", body, '<button class="btn btn-ghost" data-act="closemodal">Fechar</button><button class="btn btn-primary" data-act="savecons" style="flex:1">' + (c ? "Salvar" : "Agendar") + "</button>");
    if (gestao) { fillPacotes(d.pacienteId, c ? c.pacoteId : "").catch(() => {}); updPaySum(); }
    aviso();
    const q = $("fPacQ"), sug = $("sug"); let t;
    q.addEventListener("input", () => { C.modal.pid = ""; clearTimeout(t); t = setTimeout(async () => {
      const txt = q.value.trim(); if (txt.length < 2) { sug.hidden = true; return; }
      const { data } = await sb.rpc("buscar_pacientes", { q: txt, lim: 8 }); C.sugs = data || [];
      sug.innerHTML = C.sugs.map(p => '<button type="button" data-act="pickpat" data-id="' + esc(p.id) + '">' + esc(p.nome) + " " + tagEmp(p.empresa_id) + "</button>").join("") + (C.sugs.some(p => norm(p.nome) === norm(txt)) || !ehGestao() ? "" : '<button type="button" data-act="pickpat" data-id="">+ Cadastrar “' + esc(txt) + "” como novo</button>"); sug.hidden = !sug.innerHTML; }, 250); });
    $("fServ").addEventListener("change", () => { const s = servs.find(x => norm(x.nome) === norm($("fServ").value)); if (s && !c) { $("fValor").value = s.valor_padrao; if (s.duracao_min) $("fDur").value = s.duracao_min; } });
    ["fPro", "fData", "fHora", "fDur", "fSt"].forEach(i => $(i) && $(i).addEventListener("change", aviso));
    ["fValor"].forEach(i => $(i) && $(i).addEventListener("input", updPaySum));
  }
  function pacoteBloco(c) {
    const pk = c && pkDe(c); if (!pk) return "";
    const pos = pk.pos[c.id], sem = pk.semana(c.id);
    return '<div class="sect"><h3>Pacote #' + esc(pk.numero) + " · " + esc(pk.tipo || "") + " " + pkValHtml(pk.valor) + "</h3>" +
      '<div style="font-size:15px;font-weight:800">' + (pos ? "Sessão " + pos + " de " + pk.total + (sem ? " <span class=\"muted\" style=\"font-weight:600\">· semana " + sem + " do pacote</span>" : "") : (c.status === "faltou" ? "Faltou (não conta como sessão do pacote)" : "Fora da contagem")) + "</div>" +
      pkBarraHtml(pk) + '<div class="meta">' + esc(pkResumo(pk)) + "</div>" + pkSlotsHtml(pk) +
      '<div class="meta"><b>Faltam ' + pk.faltam + "</b> sessão(ões) para concluir o pacote.</div></div>";
  }
  async function salvaCons(statusOverride) {
    const M = C.modal; if (!M) return;
    if (ehProf()) { // profissional agenda e remarca apenas os próprios pacientes, na própria agenda
      const st0 = statusOverride || val("fSt") || "agendada";
      if (!val("fData") || !val("fHora")) return toast("Informe a data e a hora.", true);
      if (!CANC(st0)) { const cf0 = conflito(M.id, S.perfil.profissional_id, val("fData"), val("fHora"), val("fDur")); if (cf0) { aviso(); return toast("Você já tem um paciente nesse horário.", true); } }
      const s0 = S.servs.find(x => norm(x.nome) === norm(val("fServ"))), ini0 = new Date(toISO(val("fData"), val("fHora"))), fim0 = new Date(ini0.getTime() + (Number(val("fDur")) || 60) * 60000);
      const base = { servico_id: s0 ? s0.id : null, inicio: ini0.toISOString(), fim: fim0.toISOString(), status: st0, valor: Number(val("fValor")) || 0, comentario: val("fObs") || null };
      if (M.id) await ok(sb.from("agendamentos").update(base).eq("id", M.id));
      else {
        const pid0 = M.pid; if (!pid0) return toast("Escolha um paciente da sua lista (digite o nome e clique no resultado).", true);
        await ok(sb.from("agendamentos").insert(Object.assign({ empresa_id: M.emp, paciente_id: pid0, profissional_id: S.perfil.profissional_id }, base)));
      }
      C.anchor = val("fData"); toast("Agendamento salvo."); fecha(); return recarrega(true);
    }
    const nome = val("fPacQ"); if (!nome) return toast("Informe o paciente.", true);
    if (!val("fData") || !val("fHora")) return toast("Informe a data e a hora.", true);
    const st = statusOverride || val("fSt") || "agendada";
    if (!CANC(st)) { const cf = conflito(M.id, val("fPro"), val("fData"), val("fHora"), val("fDur")); if (cf) { aviso(); return toast("Horário já ocupado para este profissional.", true); } }
    const pags = readPays().filter(x => x.valor > 0); if (pags.some(x => !x.forma)) return toast("Escolha a forma de cada pagamento.", true);
    let pid = M.pid, emp = M.emp;
    if (!pid) { const ex = (C.sugs || []).find(p => norm(p.nome) === norm(nome)); if (ex) { pid = ex.id; emp = ex.empresa_id; } }
    if (!pid) {
      if (!confirm("Cadastrar “" + nome + "” como novo paciente?")) return;
      const emp0 = S.emp || (S.emps.find(e => e.codigo === "essencia") || {}).id; const np = await ok(sb.from("pacientes").insert({ nome, empresa_id: emp0 }).select().single()); pid = np.id; emp = np.empresa_id;
      await ok(sb.from("paciente_profissional").insert({ paciente_id: pid, profissional_id: val("fPro"), principal: true }));
    }
    if (!emp) { const r = await ok(sb.from("pacientes").select("empresa_id").eq("id", pid).single()); emp = r.empresa_id; }
    const s = S.servs.find(x => norm(x.nome) === norm(val("fServ"))), ini = new Date(toISO(val("fData"), val("fHora"))), fim = new Date(ini.getTime() + (Number(val("fDur")) || 60) * 60000);
    let pacoteId = val("fPac") || null, valorSessao = null;
    if (pacoteId && pacoteId.indexOf("novo:") === 0) {
      const m = (C.modelos || []).find(x => x.id === pacoteId.slice(5)); if (!m) return toast("Modelo de pacote não encontrado.", true);
      if (!confirm("Vender o pacote " + pkReais(m.valor) + " — " + limpaNome(m.nome) + " para " + nome + "?")) return;
      const mx = await ok(sb.from("pacotes").select("numero").order("numero", { ascending: false }).limit(1));
      const np2 = await ok(sb.from("pacotes").insert({ empresa_id: emp, paciente_id: pid, profissional_id: val("fPro"), numero: ((mx[0] || {}).numero || 0) + 1, tipo: m.tipo, sessoes_total: m.sessoes_total, valor: m.valor, valor_pago: 0, vendido_em: hojeISO() }).select("id").single());
      pacoteId = np2.id; valorSessao = Math.round(Number(m.valor) / Number(m.sessoes_total) * 100) / 100;
    }
    const row = { empresa_id: emp, paciente_id: pid, profissional_id: val("fPro"), servico_id: s ? s.id : null, pacote_id: pacoteId, inicio: ini.toISOString(), fim: fim.toISOString(), status: st, valor: (valorSessao != null && !(Number(val("fValor")) > 0)) ? valorSessao : (Number(val("fValor")) || 0), comentario: val("fObs") || null };
    let aid = M.id;
    if (aid) await ok(sb.from("agendamentos").update(row).eq("id", aid)); else { const n = await ok(sb.from("agendamentos").insert(row).select("id").single()); aid = n.id; }
    // pagamentos da sessão
    const existentes = M.id ? (C.cons.find(x => x.id === M.id).pagamentos) : [], mantidos = new Set(pags.filter(x => x.id).map(x => x.id));
    for (const e of existentes) if (!mantidos.has(e.id)) await ok(sb.from("pagamentos").delete().eq("id", e.id));
    for (const p of pags) {
      const base = { forma: p.forma, valor: p.valor };
      if (p.id) { const upd = Object.assign({}, base); if (p.data !== p.orig) upd.pago_em = new Date(p.data + "T12:00:00-04:00").toISOString(); await ok(sb.from("pagamentos").update(upd).eq("id", p.id)); }
      else await ok(sb.from("pagamentos").insert(Object.assign({ empresa_id: emp, paciente_id: pid, agendamento_id: aid, pago_em: new Date(p.data + "T" + (p.data === hojeISO() ? hhmm(new Date()) : "12:00") + ":00-04:00").toISOString() }, base)));
    }
    C.anchor = val("fData"); toast(CANC(st) ? "Consulta cancelada: saiu do calendário e ficou registrada na ficha do paciente." : "Salvo."); fecha(); await recarrega(true);
  }
  async function excluiCons() { if (!C.modal || !C.modal.id) return; if (!confirm("Excluir esta consulta definitivamente? (Para só cancelar, use a situação.)")) return;
    await ok(sb.from("pagamentos").delete().eq("agendamento_id", C.modal.id)); await ok(sb.from("agendamentos").delete().eq("id", C.modal.id)); toast("Consulta excluída."); fecha(); await recarrega(true); }

  // ---------- bloqueios ----------
  function abreBlq(id, preset) {
    preset = preset || {}; const b = id ? C.blq.find(x => x.id === id) : null; if (!ehGestao()) return;
    const ini = b ? new Date(b.inicio) : null, fim = b ? new Date(b.fim) : null;
    const corpo = '<div class="sect"><div class="field"><label>Profissional</label><select id="bPro">' + S.profs.filter(p => p.ativo).map(p => opt(p.id, p.nome, p.id === (b ? b.profissional_id : preset.pro))).join("") + "</select></div>" +
      '<div class="three"><div class="field"><label>Data</label><input id="bData" type="date" value="' + esc(b ? diaDe(b.inicio) : (preset.data || C.anchor)) + '"></div><div class="field"><label>Início</label><input id="bIni" type="time" value="' + esc(b ? hhmm(b.inicio) : (preset.hora || "08:00")) + '"></div><div class="field"><label>Fim</label><input id="bFim" type="time" value="' + esc(b ? hhmm(b.fim) : fromMin(toMin(preset.hora || "08:00") + 60)) + '"></div></div>' +
      '<label class="chk" style="display:flex;gap:8px;align-items:center;font-weight:700"><input type="checkbox" id="bDia"' + (b && b.dia_todo ? " checked" : "") + '> Dia todo</label><div class="field"><label>Motivo</label><input id="bMot" value="' + esc(b ? b.comentario : "") + '" placeholder="Reunião, almoço, férias, sublocação…"></div></div>';
    C.modal = { blq: id || null };
    drawer(b ? "Editar bloqueio" : "Bloquear horário", corpo, '<button class="btn btn-ghost" data-act="closemodal">Fechar</button>' + (b ? '<button class="btn btn-danger" data-act="delblq">Excluir</button>' : "") + '<button class="btn btn-primary" data-act="saveblq" style="flex:1">Salvar</button>');
  }
  async function salvaBlq() {
    const dia = val("bData"), t = $("bDia").checked, row = { profissional_id: val("bPro"), inicio: new Date(toISO(dia, t ? "00:00" : val("bIni"))).toISOString(), fim: new Date(toISO(t ? addDias(dia, 1) : dia, t ? "00:00" : val("bFim"))).toISOString(), dia_todo: t, comentario: val("bMot") || null };
    if (!t && toMin(val("bFim")) <= toMin(val("bIni"))) return toast("O fim deve ser depois do início.", true);
    await ok(C.modal.blq ? sb.from("bloqueios").update(row).eq("id", C.modal.blq) : sb.from("bloqueios").insert(row)); toast("Bloqueio salvo."); fecha(); await recarrega(true);
  }

  // ---------- eventos ----------
  const acoes = {
    hoje() { C.anchor = hojeISO(); recarrega(); }, nav(el) { const n = +el.dataset.n; C.anchor = addDias(C.anchor, C.view === "prof" ? n : n * 7); recarrega(); },
    view(el) { C.view = el.dataset.v; salvaPrefs(); recarrega(); }, goday(el) { C.anchor = el.dataset.d; C.view = "prof"; recarrega(); },
    zoom(el) { C.hh = Math.min(112, Math.max(40, C.hh + (+el.dataset.n) * 12)); salvaPrefs(); pinta(); }, allcols() { C.allCols = !C.allCols; pinta(); },
    sidetoggle() { C.sideOpen = !C.sideOpen; pinta(); }, minipick(el) { C.anchor = el.dataset.d; recarrega(); },
    minav(el) { const [y, m] = C.miniM.split("-").map(Number), d = new Date(Date.UTC(y, m - 1 + (+el.dataset.n), 1)); C.miniM = d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1); C.miniFor = C.anchor; pinta(); },
    agtoggle(el) { C.hideP[el.dataset.id] = !el.checked; salvaPrefs(); pinta(); }, agall() { C.hideP = {}; salvaPrefs(); pinta(); },
    cons(el, ev) { ev.stopPropagation(); abreCons(el.dataset.id); }, newcons() { abreCons(null, { data: C.anchor }); }, newblq() { abreBlq(null, { pro: profsAtivos()[0]?.id }); },
    blq(el, ev) { ev.stopPropagation(); abreBlq(el.dataset.id); },
    slot(el, ev) { if (!(ehGestao() || ehProf()) || ev.target.closest(".ev,.bl")) return; const r = el.getBoundingClientRect(), y = ev.clientY - r.top, mins = Math.round((HSTART * 60 + y / C.hh * 60) / 15) * 15; abreCons(null, { data: el.dataset.d, hora: fromMin(Math.max(0, Math.min(1425, mins))), pro: el.dataset.p || undefined }); },
    closemodal() { fecha(); }, savecons() { salvaCons().catch(e => toast(e.message, true)); }, quick(el) { const s = el.dataset.s; if ($("fSt")) $("fSt").value = s; salvaCons(s).catch(e => toast(e.message, true)); },
    payadd() { const v = Number(val("fValor")) || 0, t = readPays().reduce((a, x) => a + x.valor, 0), box = $("payBox"), tmp = document.createElement("div"); tmp.innerHTML = payRow({ valor: Math.max(0, Math.round((v - t) * 100) / 100) }); box.appendChild(tmp.firstChild); updPaySum(); },
    paydel(el) { el.closest(".prow").remove(); updPaySum(); }, delcons() { excluiCons().catch(e => toast(e.message, true)); }, saveblq() { salvaBlq().catch(e => toast(e.message, true)); },
    delblq() { if (!confirm("Excluir este bloqueio?")) return; ok(sb.from("bloqueios").delete().eq("id", C.modal.blq)).then(() => { fecha(); toast("Bloqueio excluído."); return recarrega(true); }).catch(e => toast(e.message, true)); },
    pickpat(el) { const id = el.dataset.id, p = (C.sugs || []).find(x => x.id === id); C.modal.pid = id; C.modal.emp = p ? p.empresa_id : null; $("fPacQ").value = p ? p.nome : $("fPacQ").value; $("sug").hidden = true; if (id && ehGestao()) fillPacotes(id, "").catch(() => {}); }
  };
  document.addEventListener("click", ev => { const el = ev.target.closest("[data-act]"); if (!el || (el.tagName === "INPUT" && el.type === "checkbox" && ev.type === "click" && el.dataset.act !== "agtoggle")) return; if (el.dataset.act === "agtoggle") return; const f = acoes[el.dataset.act]; if (f) f(el, ev); });
  document.addEventListener("change", ev => { const el = ev.target.closest('[data-act="agtoggle"]'); if (el) acoes.agtoggle(el); });
  document.addEventListener("input", ev => { if (ev.target.id === "cqIn") { C.cq = ev.target.value; pinta(); } if (ev.target.classList && (ev.target.classList.contains("pv"))) updPaySum(); });
  document.addEventListener("keydown", ev => { if (ev.key === "Escape" && C.modal) fecha(); });

  document.addEventListener("click", ev => { if (ev.target.id === "drclose" || ev.target.id === "dscrim") fecha(); });
  C.html = html; C.pinta = pinta;
  window.calMontar = async function () {
    const raiz = document.createElement("div"); raiz.id = "calroot"; raiz.innerHTML = '<div class="empty">Carregando agenda…</div>';
    C.range = null; setTimeout(async () => { try { await carrega(true); } catch (e) { toast(e.message, true); } pinta(); }, 0);
    return raiz;
  };
})();
