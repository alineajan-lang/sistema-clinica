// Utilitários de interface (sem innerHTML com dados externos, exceto conteúdo passado por DOMPurify)
const TZ = CFG.TZ;
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === false || v == null) continue;
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "html") e.innerHTML = DOMPurify.sanitize(v);
    else if (k === "value") e.value = v;
    else e.setAttribute(k, v === true ? "" : v);
  }
  (function add(list) {
    for (const c of list) {
      if (Array.isArray(c)) add(c);
      else if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
  })(kids);
  return e;
}
function toast(msg, err) {
  const t = h("div", { class: "toast" + (err ? " err" : "") }, msg);
  document.getElementById("toasts").append(t);
  setTimeout(() => t.remove(), err ? 7000 : 3500);
}
// ---- datas (fuso de Manaus, sem horário de verão: UTC-4) ----
const fmtData = d => new Date(d).toLocaleDateString("pt-BR", { timeZone: TZ });
const fmtHora = d => new Date(d).toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const fmtDataHora = d => fmtData(d) + " " + fmtHora(d);
function hojeISO() { return new Date().toLocaleDateString("sv-SE", { timeZone: TZ }); }
function addDias(iso, n) { const d = new Date(iso + "T12:00:00-04:00"); d.setUTCDate(d.getUTCDate() + n); return d.toLocaleDateString("sv-SE", { timeZone: TZ }); }
const diaSemana = iso => new Date(iso + "T12:00:00-04:00").toLocaleDateString("pt-BR", { timeZone: TZ, weekday: "long", day: "2-digit", month: "long", year: "numeric" });
const toISO = (dia, hora) => dia + "T" + hora + ":00-04:00";
const hhmm = d => new Date(d).toLocaleTimeString("sv-SE", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const diaDe = d => new Date(d).toLocaleDateString("sv-SE", { timeZone: TZ });
const brl = v => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
function idade(n) { if (!n) return ""; const a = new Date(n), t = new Date(); let i = t.getFullYear() - a.getFullYear(); if (t < new Date(t.getFullYear(), a.getMonth(), a.getDate())) i--; return i + " anos"; }
const STATUS = { agendada: "Agendada", confirmada: "Confirmada", realizada: "Realizada", faltou: "Faltou", cancelada_paciente: "Cancelada (paciente)", cancelada_clinica: "Cancelada (clínica)" };
const FORMAS = { pix: "Pix", credito: "Crédito", debito: "Débito", dinheiro: "Dinheiro", transferencia: "Transferência", boleto: "Boleto", outro: "Outro" };
const semAcento = s => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
// ---- modal ----
function modal(titulo, corpo, botoes, largura) {
  const mask = h("div", { class: "mask", onmousedown: e => { if (e.target === mask) fechar(); } });
  const box = h("div", { class: "modal", style: largura ? "max-width:" + largura : null }, h("h2", {}, titulo), corpo,
    h("div", { class: "foot" }, (botoes || [{ t: "Fechar" }]).map(b => h("button", { class: b.p ? "btn-p" : b.d ? "btn-d" : "", onclick: async ev => {
      if (b.f) { ev.target.disabled = true; try { const r = await b.f(); if (r === false) { ev.target.disabled = false; return; } } catch (e) { ev.target.disabled = false; toast(e.message || String(e), true); return; } }
      fechar();
    } }, b.t))));
  mask.append(box); document.body.append(mask);
  function fechar() { mask.remove(); }
  return { fechar, box };
}
function campo(rotulo, el) { return h("div", {}, h("label", {}, rotulo), el); }
function sel(opcoes, valor, props) { const s = h("select", props || {}, opcoes.map(([v, t]) => h("option", { value: v ?? "", selected: String(v ?? "") === String(valor ?? "") }, t))); return s; }
const vazio = (txt) => h("div", { class: "empty" }, txt);
// "digitar para buscar paciente"
function buscaPaciente(onPick, inicial) {
  const inp = h("input", { placeholder: "Digite o nome do paciente…", value: inicial ? inicial.nome : "" });
  const lista = h("div", {}); let escolhido = inicial || null; let t;
  inp.addEventListener("input", () => { escolhido = null; clearTimeout(t); t = setTimeout(async () => {
    lista.replaceChildren(); if (inp.value.trim().length < 2) return;
    const { data } = await sb.rpc("buscar_pacientes", { q: inp.value.trim(), lim: 8 });
    lista.append(h("div", { class: "sug" }, (data || []).map(p => h("div", { onclick: () => { escolhido = p; inp.value = p.nome; lista.replaceChildren(); onPick && onPick(p); } }, p.nome))));
  }, 250); });
  return { el: h("div", {}, inp, lista), get: () => escolhido };
}

// ---- progresso de pacote (como no Doctoralia): sessão N de M, quantas faltam, semana do pacote ----
function pkStats(total, lista) {
  const ord = (lista || []).slice().sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
  const ativos = ord.filter(x => !String(x.status).startsWith("cancelada") && x.status !== "faltou");
  const pos = {}; ativos.forEach((x, i) => { pos[x.id] = i + 1; });
  const real = ativos.filter(x => x.status === "realizada").length, t = Number(total) || ativos.length;
  const ini = ativos[0] ? diaDe(ativos[0].inicio) : null;
  const semana = id => { const x = ativos.find(a => a.id === id); if (!x || !ini) return null; return Math.floor((new Date(diaDe(x.inicio) + "T12:00:00-04:00") - new Date(ini + "T12:00:00-04:00")) / (7 * 864e5)) + 1; };
  const slots = []; for (let i = 0; i < Math.max(t, ativos.length); i++) slots.push(ativos[i] || null);
  return { pos, real, ag: ativos.length - real, faltas: ord.filter(x => x.status === "faltou").length, total: t, porMarcar: Math.max(0, t - ativos.length), faltam: Math.max(0, t - real), slots, semana, ativos };
}
const _esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function pkBarraHtml(st) {
  const t = Math.max(st.total, 1), a = Math.round(st.real / t * 100), b = Math.round(Math.min(st.ag, Math.max(0, t - st.real)) / t * 100);
  return '<div class="pk-bar" title="' + st.real + " realizada(s), " + st.ag + ' agendada(s)"><i class="r" style="width:' + a + '%"></i><i class="a" style="width:' + b + '%"></i></div>';
}
function pkSlotsHtml(st) {
  const n = ["1ª", "2ª", "3ª", "4ª", "5ª", "6ª", "7ª", "8ª", "9ª", "10ª"];
  return '<div class="pk-slots">' + st.slots.map((x, i) => x
    ? '<span class="pk-s ' + (x.status === "realizada" ? "ok" : "ag") + '"><b>' + (n[i] || (i + 1) + "ª") + "</b> " + fmtData(x.inicio).slice(0, 5) + " " + hhmm(x.inicio) + (x.status === "realizada" ? " ✓" : "") + "</span>"
    : '<span class="pk-s vz"><b>' + (n[i] || (i + 1) + "ª") + "</b> a marcar</span>").join("") + "</div>";
}
function pkResumo(st) { return st.real + " de " + st.total + " realizada(s)" + (st.ag ? " · " + st.ag + " agendada(s)" : "") + (st.porMarcar ? " · falta marcar " + st.porMarcar : " · todas marcadas") + (st.faltas ? " · " + st.faltas + " falta(s)" : ""); }

const pkReais = v => "R$ " + Number(v || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const pkCls = v => ({ 360: "v360", 450: "v450", 720: "v720", 900: "v900" }[Math.round(Number(v))] || "vx");
const pkValHtml = v => v ? '<span class="pkv ' + pkCls(v) + '">' + pkReais(v) + "</span>" : "";
