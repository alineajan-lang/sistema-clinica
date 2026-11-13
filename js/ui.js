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
