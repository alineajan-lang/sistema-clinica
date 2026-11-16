// Pacotes (como "Pacotes especiais" do Doctoralia): lista geral com filtros e totais.
async function vPacotes(q) {
  if (!ehGestao()) return vazio("Os pacotes gerais são da administração e da recepção.");
  const busca = q.get("q") || "", est = q.get("s") || "uso", tipo = q.get("t") || "", pagto = q.get("pg") || "", pag = Math.max(1, Number(q.get("n")) || 1);
  const go = (novo) => { const p = new URLSearchParams({ q: busca, s: est, t: tipo, pg: pagto }); Object.entries(novo || {}).forEach(([k, v]) => p.set(k, v)); if (!novo || novo.n === undefined) p.delete("n"); [...p.keys()].forEach(k => { if (p.get(k) === "") p.delete(k); }); location.hash = "#/pacotes?" + p; };
  const [pcs, sess] = await Promise.all([
    todosOsDados(() => { let x = sb.from("pacotes").select("id,empresa_id,paciente_id,profissional_id,numero,tipo,sessoes_total,valor,valor_pago,vendido_em,paciente:pacientes!paciente_id(nome)").order("numero", { ascending: false }); if (S.emp) x = x.eq("empresa_id", S.emp); return x; }),
    todosOsDados(() => { let x = sb.from("agendamentos").select("id,pacote_id,inicio,status").not("pacote_id", "is", null).order("inicio"); if (S.emp) x = x.eq("empresa_id", S.emp); return x; })
  ]);
  const porPac = {}; sess.forEach(s => (porPac[s.pacote_id] = porPac[s.pacote_id] || []).push(s));
  const linhas = pcs.map(p => { const st = pkStats(p.sessoes_total, porPac[p.id]), saldo = Math.max(0, Number(p.valor || 0) - Number(p.valor_pago || 0)); return { p, st, saldo, emUso: st.faltam > 0, pago: saldo <= 0.005 ? "pago" : Number(p.valor_pago || 0) > 0 ? "parcial" : "pendente" }; });
  const tipos = [...new Set(pcs.map(p => p.tipo).filter(Boolean))].sort();
  const filtradas = linhas.filter(l => (est === "todos" || (est === "uso" ? l.emUso : !l.emUso)) && (!tipo || l.p.tipo === tipo) && (!pagto || (pagto === "pago" ? l.pago === "pago" : l.pago !== "pago")) &&
    (!busca || semAcento((l.p.paciente ? l.p.paciente.nome : "") + " " + (l.p.numero || "")).includes(semAcento(busca))));
  const empTxt = !S.emp ? "Essência e Atlas" : (empCod(S.emp) === "atlas" ? "Atlas" : "Essência");
  const inBusca = h("input", { placeholder: "Buscar por paciente ou nº do pacote…", value: busca, style: "min-width:240px;flex:1", onkeydown: e => e.key === "Enter" && go({ q: e.target.value }) });
  const seg = h("div", { class: "seg" }, [["uso", "Em uso"], ["concl", "Concluídos"], ["todos", "Todos"]].map(([k, t]) => h("button", { class: est === k ? "on" : "", onclick: () => go({ s: k }) }, t, h("span", { class: "c" }, " " + linhas.filter(l => k === "todos" || (k === "uso" ? l.emUso : !l.emUso)).length))));
  const selTipo = sel([["", "Todos os tipos"]].concat(tipos.map(t => [t, t])), tipo, { style: "width:auto", onchange: e => go({ t: e.target.value }) });
  const selPg = sel([["", "Todos os pagamentos"], ["pago", "Pagos"], ["pend", "Com saldo a receber"]], pagto, { style: "width:auto", onchange: e => go({ pg: e.target.value }) });
  const POR = 100, ini = (pag - 1) * POR, vis = filtradas.slice(ini, ini + POR);
  const abrir = l => { location.hash = "#/paciente/" + l.p.paciente_id + "?t=financeiro"; };
  const chipPg = l => h("span", { class: "chip " + (l.pago === "pago" ? "realizada" : l.pago === "parcial" ? "faltou" : "rosa") }, l.pago === "pago" ? "Pago" : l.pago === "parcial" ? "Parcial · saldo " + brl(l.saldo) : "Pendente · " + brl(l.saldo));
  const tabela = vis.length ? h("div", { class: "tw" }, h("table", { class: "stack" }, h("thead", {}, h("tr", {}, ["Nº", "Paciente", "Profissional", "Tipo", "Sessões", "Valor", "Pagamento", "Vendido em"].map(t => h("th", {}, t)))),
    h("tbody", {}, vis.map(l => h("tr", { class: "click", onclick: () => abrir(l) },
      h("td", { class: "nowrap" }, h("b", {}, "#" + (l.p.numero || "—")), " ", empBadge(l.p.empresa_id)), h("td", {}, l.p.paciente ? l.p.paciente.nome : ""), h("td", { class: "small" }, nomeCurto(profNome(l.p.profissional_id))), h("td", {}, l.p.tipo || ""),
      h("td", { style: "min-width:130px" }, h("div", { html: pkBarraHtml(l.st) }), h("span", { class: "small muted" }, l.st.real + " de " + l.st.total + " realizada(s)" + (l.st.porMarcar ? " · falta marcar " + l.st.porMarcar : ""))),
      h("td", { class: "nowrap" }, brl(l.p.valor)), h("td", {}, chipPg(l)), h("td", { class: "nowrap small" }, l.p.vendido_em ? fmtData(l.p.vendido_em + "T12:00:00-04:00") : ""))))))
    : vazio("Nenhum pacote com esses filtros.");
  const pags = Math.ceil(filtradas.length / POR);
  const exportar = () => baixarCSV("pacotes.csv", [["Nº", "Paciente", "Profissional", "Tipo", "Sessões realizadas", "Sessões do pacote", "Falta marcar", "Valor", "Pago", "Saldo", "Vendido em", "Clínica"]].concat(filtradas.map(l => [l.p.numero, l.p.paciente ? l.p.paciente.nome : "", profNome(l.p.profissional_id), l.p.tipo || "", l.st.real, l.st.total, l.st.porMarcar, numCSV(l.p.valor), numCSV(l.p.valor_pago), numCSV(l.saldo), l.p.vendido_em || "", empCod(l.p.empresa_id) === "atlas" ? "Atlas" : "Essência"])));
  return h("div", {}, h("div", { class: "card" }, h("div", { class: "row" }, h("h1", { class: "grow" }, "Pacotes"), h("button", { onclick: exportar }, "⬇ Exportar planilha")),
    h("div", { class: "small muted" }, empTxt + ". Para vender um pacote novo, abra a ficha do paciente (Pacotes e pagamentos) ou escolha o pacote ao agendar a consulta."),
    h("div", { class: "kpis", style: "margin-top:10px" }, kpi("Pacotes em uso", linhas.filter(l => l.emUso).length, "ainda têm sessão a realizar"), kpi("A receber em pacotes", brl(sum(linhas, l => l.saldo)), linhas.filter(l => l.saldo > 0.005).length + " pacote(s) com saldo"), kpi("Recebido em pacotes", brl(sum(pcs, p => p.valor_pago)), pcs.length + " pacotes no total")),
    h("div", { class: "row" }, seg), h("div", { class: "row", style: "margin-top:8px" }, inBusca, selTipo, selPg, h("button", { onclick: () => go({ q: inBusca.value }) }, "Buscar"))),
    h("div", { class: "card" }, tabela, pags > 1 && h("div", { class: "row", style: "margin-top:10px" }, h("button", { disabled: pag <= 1, onclick: () => go({ n: pag - 1 }) }, "‹ Anterior"), h("span", { class: "small muted" }, "Página " + pag + " de " + pags + " · " + filtradas.length + " pacotes"), h("button", { disabled: pag >= pags, onclick: () => go({ n: pag + 1 }) }, "Próxima ›"))));
}
