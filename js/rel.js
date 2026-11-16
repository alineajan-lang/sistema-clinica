// Relatórios (como no Doctoralia): Resumo das consultas, Receitas, Repasse por profissional e Estatísticas da agenda.
// Só a gestão (administração e recepção) vê. Os números vêm das consultas e dos pagamentos do próprio Essária.

// busca todas as linhas de uma consulta, de 1000 em 1000
async function todosOsDados(montar) {
  const out = [];
  for (let ini = 0; ; ini += 1000) {
    const r = await ok(montar().range(ini, ini + 999));
    out.push(...r);
    if (r.length < 1000) break;
  }
  return out;
}
function baixarCSV(nome, linhas) {
  const cel = c => { c = String(c == null ? "" : c).replace(/"/g, '""'); return /[;"\n]/.test(c) ? '"' + c + '"' : c; };
  const csv = "﻿" + linhas.map(l => l.map(cel).join(";")).join("\r\n");
  const a = h("a", { href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })), download: nome });
  document.body.append(a); a.click(); a.remove();
}
const numCSV = v => String(Math.round(Number(v || 0) * 100) / 100).replace(".", ",");
function periodoRel(q) {
  const hoje = hojeISO(), p = q.get("p") || "mes";
  const d = new Date(hoje + "T12:00:00-04:00");
  const ult = (ano, mes) => new Date(Date.UTC(ano, mes + 1, 0)).toISOString().slice(0, 10);
  let de, ate;
  if (p === "custom" && q.get("de") && q.get("ate")) { de = q.get("de"); ate = q.get("ate"); }
  else if (p === "mes_ant") { const m = d.getUTCMonth() - 1, a = d.getUTCFullYear() + (m < 0 ? -1 : 0), mm = (m + 12) % 12; de = a + "-" + String(mm + 1).padStart(2, "0") + "-01"; ate = ult(a, mm); }
  else if (p === "30d") { ate = hoje; de = addDias(hoje, -29); }
  else if (p === "ano") { de = hoje.slice(0, 4) + "-01-01"; ate = hoje.slice(0, 4) + "-12-31"; }
  else { de = hoje.slice(0, 8) + "01"; ate = ult(d.getUTCFullYear(), d.getUTCMonth()); }
  return { p: ["custom", "mes_ant", "30d", "ano"].includes(p) ? p : "mes", de, ate };
}
const REL_ABAS = [["resumo", "Resumo das consultas"], ["receitas", "Receitas"], ["repasse", "Repasse por profissional"], ["stats", "Estatísticas da agenda"]];
const STATUS_ORD = ["realizada", "agendada", "confirmada", "faltou", "cancelada_paciente", "cancelada_clinica"];
const kpi = (t, v, s) => h("div", { class: "kpi" }, h("div", { class: "kpi-t" }, t), h("div", { class: "kpi-v" }, v), s && h("div", { class: "small muted" }, s));
function barrasRel(itens, fmt) {
  const max = Math.max(1, ...itens.map(i => i[1]));
  return h("div", { class: "rbars" }, itens.map(([rot, v]) => h("div", { class: "rbar" }, h("span", { class: "rbl" }, rot), h("span", { class: "rbt" }, h("i", { style: "width:" + Math.round(v / max * 100) + "%" })), h("span", { class: "rbv" }, fmt ? fmt(v) : v))));
}
const tabelaRel = (cab, linhas, vazioTxt, dir) => linhas.length
  ? h("div", { class: "tw" }, h("table", {}, h("thead", {}, h("tr", {}, cab.map((t, i) => h("th", { class: (dir || []).includes(i) ? "right" : "" }, t)))), h("tbody", {}, linhas.map(l => h("tr", {}, l.map((c, i) => h("td", { class: (dir || []).includes(i) ? "right nowrap" : "" }, c)))))))
  : vazio(vazioTxt || "Nada neste período.");

async function vRelatorios(q) {
  if (!ehGestao()) return vazio("Os relatórios são da administração e da recepção.");
  const aba = REL_ABAS.some(a => a[0] === q.get("a")) ? q.get("a") : "resumo";
  const per = periodoRel(q), profF = q.get("f") || "";
  const go = (novo) => { const p = new URLSearchParams({ a: aba, p: per.p, de: per.de, ate: per.ate }); if (profF) p.set("f", profF); Object.entries(novo || {}).forEach(([k, v]) => { if (v === "" || v == null) p.delete(k); else p.set(k, v); }); location.hash = "#/relatorios?" + p; };
  const de = per.de + "T00:00:00-04:00", ate = addDias(per.ate, 1) + "T00:00:00-04:00";
  const [ags, pgs] = await Promise.all([
    todosOsDados(() => { let x = sb.from("agendamentos").select("id,inicio,status,valor,profissional_id,empresa_id,paciente_id,pacote_id,paciente:pacientes(nome),servico:servicos(nome)").gte("inicio", de).lt("inicio", ate).order("inicio"); if (S.emp) x = x.eq("empresa_id", S.emp); if (profF) x = x.eq("profissional_id", profF); return x; }),
    todosOsDados(() => { let x = sb.from("pagamentos").select("id,valor,forma,pago_em,taxa,empresa_id,paciente_id,agendamento_id,pacote_id,paciente:pacientes(nome),agendamento:agendamentos(profissional_id,inicio),pacote:pacotes(profissional_id,numero)").gte("pago_em", de).lt("pago_em", ate).order("pago_em"); if (S.emp) x = x.eq("empresa_id", S.emp); return x; })
  ]);
  const profDoPgto = p => (p.agendamento && p.agendamento.profissional_id) || (p.pacote && p.pacote.profissional_id) || "";
  const pgsF = profF ? pgs.filter(p => profDoPgto(p) === profF) : pgs;
  const nomeProf = id => id ? nomeCurto(profNome(id)) : "Sem profissional";
  const empTxt = !S.emp ? "Essência e Atlas" : (empCod(S.emp) === "atlas" ? "Atlas" : "Essência");

  // ---- barra de controles ----
  const selPer = sel([["mes", "Este mês"], ["mes_ant", "Mês passado"], ["30d", "Últimos 30 dias"], ["ano", "Este ano"], ["custom", "Escolher datas"]], per.p, { style: "width:auto", onchange: e => go({ p: e.target.value }) });
  const iDe = h("input", { type: "date", value: per.de, style: "width:auto", onchange: e => go({ p: "custom", de: e.target.value }) });
  const iAte = h("input", { type: "date", value: per.ate, style: "width:auto", onchange: e => go({ p: "custom", ate: e.target.value }) });
  const selProf = sel([["", "Todos os profissionais"]].concat(S.profs.filter(p => p.ativo || p.id === profF).map(p => [p.id, nomeCurto(p.nome)])), profF, { style: "width:auto;max-width:230px", onchange: e => go({ f: e.target.value }) });
  const tabs = h("div", { class: "tabs" }, REL_ABAS.map(([k, t]) => h("button", { class: aba === k ? "on" : "", onclick: () => go({ a: k }) }, t)));

  let corpo, exportar = null;
  const conta = st => ags.filter(a => a.status === st).length;
  if (aba === "resumo") {
    const real = ags.filter(a => a.status === "realizada"), pend = ags.filter(a => ["agendada", "confirmada"].includes(a.status));
    const canc = ags.filter(a => a.status.startsWith("cancelada")), falt = conta("faltou");
    const rec = sum(pgsF, p => p.valor);
    const porProf = {}; ags.forEach(a => { const k = a.profissional_id; const r = porProf[k] || (porProf[k] = { n: 0, real: 0, falt: 0, canc: 0, val: 0 }); r.n++; if (a.status === "realizada") { r.real++; r.val += Number(a.valor || 0); } if (a.status === "faltou") r.falt++; if (a.status.startsWith("cancelada")) r.canc++; });
    const lin = Object.entries(porProf).sort((a, b) => b[1].n - a[1].n);
    corpo = h("div", {}, h("div", { class: "kpis" }, kpi("Consultas", ags.length, empTxt), kpi("Realizadas", real.length), kpi("Agendadas / confirmadas", pend.length), kpi("Faltas", falt), kpi("Canceladas", canc.length), kpi("Valor das realizadas", brl(sum(real, a => a.valor)), "preço das consultas"), kpi("Recebido no período", brl(rec), "pagamentos registrados")),
      h("div", { class: "card" }, h("h2", {}, "Por profissional"), tabelaRel(["Profissional", "Consultas", "Realizadas", "Faltas", "Canceladas", "Valor das realizadas"], lin.map(([id, r]) => [h("b", {}, nomeProf(id)), r.n, r.real, r.falt, r.canc, brl(r.val)]), "Nenhuma consulta neste período.", [1, 2, 3, 4, 5])),
      h("div", { class: "card" }, h("h2", {}, "Consultas do período"), tabelaRel(["Data", "Hora", "Paciente", "Profissional", "Serviço", "Situação", "Valor"], ags.slice(0, 300).map(a => [fmtData(a.inicio), hhmm(a.inicio), a.paciente ? a.paciente.nome : "", nomeProf(a.profissional_id), a.servico ? a.servico.nome : "", h("span", { class: "chip " + a.status }, STATUS[a.status] || a.status), brl(a.valor)]), "Nenhuma consulta neste período.", [6]),
        ags.length > 300 && h("div", { class: "small muted", style: "margin-top:8px" }, "Mostrando as 300 primeiras de " + ags.length + ". Use Exportar para ver todas.")));
    exportar = () => baixarCSV("consultas_" + per.de + "_a_" + per.ate + ".csv", [["Data", "Hora", "Paciente", "Profissional", "Serviço", "Situação", "Valor", "Clínica"]].concat(ags.map(a => [fmtData(a.inicio), hhmm(a.inicio), a.paciente ? a.paciente.nome : "", nomeProf(a.profissional_id), a.servico ? a.servico.nome : "", STATUS[a.status] || a.status, numCSV(a.valor), empCod(a.empresa_id) === "atlas" ? "Atlas" : "Essência"])));
  } else if (aba === "receitas") {
    const total = sum(pgsF, p => p.valor), taxas = sum(pgsF, p => p.taxa);
    const porForma = {}; pgsF.forEach(p => { porForma[p.forma] = (porForma[p.forma] || 0) + Number(p.valor || 0); });
    const itens = Object.entries(porForma).sort((a, b) => b[1] - a[1]).map(([f, v]) => [FORMAS[f] || f, v]);
    const ref = p => p.pacote && p.pacote.numero ? "Pacote #" + p.pacote.numero : p.agendamento ? "Consulta de " + fmtData(p.agendamento.inicio) : "";
    const ordenados = pgsF.slice().sort((a, b) => new Date(b.pago_em) - new Date(a.pago_em));
    corpo = h("div", {}, h("div", { class: "kpis" }, kpi("Recebido", brl(total), empTxt), kpi("Pagamentos", pgsF.length), kpi("Taxas de cartão", brl(taxas), "quando informadas"), kpi("Líquido", brl(total - taxas))),
      itens.length > 0 && h("div", { class: "card" }, h("h2", {}, "Por forma de pagamento"), barrasRel(itens, brl)),
      h("div", { class: "card" }, h("h2", {}, "Pagamentos"), tabelaRel(["Data", "Paciente", "Profissional", "Forma", "Referência", "Valor"], ordenados.slice(0, 300).map(p => [fmtData(p.pago_em), p.paciente ? p.paciente.nome : "", nomeProf(profDoPgto(p)), FORMAS[p.forma] || p.forma, ref(p), brl(p.valor)]), "Nenhum pagamento neste período.", [5]),
        ordenados.length > 300 && h("div", { class: "small muted", style: "margin-top:8px" }, "Mostrando os 300 mais recentes de " + ordenados.length + ". Use Exportar para ver todos.")));
    exportar = () => baixarCSV("receitas_" + per.de + "_a_" + per.ate + ".csv", [["Data", "Paciente", "Profissional", "Forma", "Referência", "Valor", "Taxa", "Clínica"]].concat(ordenados.map(p => [fmtData(p.pago_em), p.paciente ? p.paciente.nome : "", nomeProf(profDoPgto(p)), FORMAS[p.forma] || p.forma, ref(p), numCSV(p.valor), numCSV(p.taxa), empCod(p.empresa_id) === "atlas" ? "Atlas" : "Essência"])));
  } else if (aba === "repasse") {
    const linhas = S.profs.filter(p => p.ativo || pgs.some(x => profDoPgto(x) === p.id)).map(p => {
      const recebido = sum(pgs.filter(x => profDoPgto(x) === p.id), x => x.valor);
      const feitas = ags.filter(a => a.profissional_id === p.id && a.status === "realizada").length;
      const regra = p.repasse_tipo === "percentual" ? Number(p.repasse_valor || 0) + "% do recebido" : p.repasse_tipo === "fixo" ? brl(p.repasse_valor) + " por consulta" : "Sem repasse";
      const repasse = p.repasse_tipo === "percentual" ? recebido * Number(p.repasse_valor || 0) / 100 : p.repasse_tipo === "fixo" ? feitas * Number(p.repasse_valor || 0) : 0;
      return { p, recebido, feitas, regra, repasse };
    }).filter(l => (!profF || l.p.id === profF) && (l.recebido || l.feitas)).sort((a, b) => b.recebido - a.recebido);
    const semProf = sum(pgs.filter(x => !profDoPgto(x)), x => x.valor);
    corpo = h("div", {}, h("div", { class: "kpis" }, kpi("Recebido", brl(sum(pgs, x => x.valor)), empTxt), kpi("Repasse estimado", brl(sum(linhas, l => l.repasse)), "pela regra cadastrada"), kpi("Sem profissional", brl(semProf), "pagamento sem consulta/pacote")),
      h("div", { class: "card" }, h("h2", {}, "Repasse por profissional"), tabelaRel(["Profissional", "Regra", "Consultas realizadas", "Recebido", "Repasse estimado"], linhas.map(l => [h("b", {}, nomeCurto(l.p.nome)), l.regra, l.feitas, brl(l.recebido), h("b", {}, brl(l.repasse))]), "Nenhum recebimento neste período.", [2, 3, 4]),
        h("div", { class: "small muted", style: "margin-top:10px" }, "É uma estimativa pela regra cadastrada em Profissionais. Combinados especiais (por exemplo, primeira consulta sem repasse) e o dia do pagamento (8 e 20) não entram no cálculo.")));
    exportar = () => baixarCSV("repasse_" + per.de + "_a_" + per.ate + ".csv", [["Profissional", "Regra", "Consultas realizadas", "Recebido", "Repasse estimado"]].concat(linhas.map(l => [l.p.nome, l.regra, l.feitas, numCSV(l.recebido), numCSV(l.repasse)])));
  } else {
    const vivas = ags.filter(a => !a.status.startsWith("cancelada"));
    const porSem = [0, 0, 0, 0, 0, 0, 0]; vivas.forEach(a => { const d = new Date(diaDe(a.inicio) + "T12:00:00-04:00").getUTCDay(); porSem[d]++; });
    const nomesSem = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const porServ = {}; vivas.forEach(a => { const k = a.servico ? a.servico.nome : "Sem serviço"; porServ[k] = (porServ[k] || 0) + 1; });
    const porProf = {}; ags.forEach(a => { const r = porProf[a.profissional_id] || (porProf[a.profissional_id] = { real: 0, falt: 0, canc: 0, n: 0 }); r.n++; if (a.status === "realizada") r.real++; if (a.status === "faltou") r.falt++; if (a.status.startsWith("cancelada")) r.canc++; });
    const taxa = (r) => (r.real + r.falt) ? Math.round(r.real / (r.real + r.falt) * 100) + "%" : "—";
    const totalR = { real: conta("realizada"), falt: conta("faltou") };
    corpo = h("div", {}, h("div", { class: "kpis" }, kpi("Consultas marcadas", vivas.length, "sem as canceladas"), kpi("Comparecimento", taxa(totalR), "realizadas ÷ (realizadas + faltas)"), kpi("Cancelamentos", ags.length - vivas.length), kpi("Pacientes atendidos", new Set(ags.filter(a => a.status === "realizada").map(a => a.paciente_id)).size)),
      h("div", { class: "grid2" },
        h("div", { class: "card" }, h("h2", {}, "Por dia da semana"), barrasRel(nomesSem.map((n, i) => [n, porSem[i]]))),
        h("div", { class: "card" }, h("h2", {}, "Serviços mais marcados"), barrasRel(Object.entries(porServ).sort((a, b) => b[1] - a[1]).slice(0, 8)))),
      h("div", { class: "card" }, h("h2", {}, "Por profissional"), tabelaRel(["Profissional", "Consultas", "Realizadas", "Faltas", "Canceladas", "Comparecimento"], Object.entries(porProf).sort((a, b) => b[1].n - a[1].n).map(([id, r]) => [h("b", {}, nomeProf(id)), r.n, r.real, r.falt, r.canc, taxa(r)]), "Nenhuma consulta neste período.", [1, 2, 3, 4, 5])));
    exportar = () => baixarCSV("estatisticas_" + per.de + "_a_" + per.ate + ".csv", [["Profissional", "Consultas", "Realizadas", "Faltas", "Canceladas", "Comparecimento"]].concat(Object.entries(porProf).map(([id, r]) => [nomeProf(id), r.n, r.real, r.falt, r.canc, taxa(r)])));
  }
  return h("div", {}, h("div", { class: "card" }, h("div", { class: "row" }, h("h1", { class: "grow" }, "Relatórios"), exportar && h("button", { onclick: exportar }, "⬇ Exportar planilha")),
    h("div", { class: "small muted" }, empTxt + " · " + fmtData(per.de + "T12:00:00-04:00") + " a " + fmtData(per.ate + "T12:00:00-04:00") + ". Para trocar de clínica, use o seletor no topo."),
    tabs, h("div", { class: "row" }, selPer, per.p === "custom" && iDe, per.p === "custom" && iAte, selProf)), corpo,
    h("div", { class: "small muted" }, "Despesas, taxas e o resultado de cada empresa ficam no financeiro da Essência e da Atlas (planilha), que recebem os pagamentos daqui automaticamente."));
}
const sum = (lista, f) => lista.reduce((s, x) => s + Number(f ? f(x) : x || 0), 0);
