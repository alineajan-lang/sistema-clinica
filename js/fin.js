// A receber (como o "Pagamentos / A receber" do Doctoralia e do Sistema Atlas): consultas realizadas e ainda não pagas, por paciente.
async function vAReceber(q) {
  if (!ehGestao()) return vazio("Esta tela é da administração e da recepção.");
  const busca = q.get("q") || "", desdeSel = q.get("d") || "jul", pf = q.get("f") || "";
  const hoje = hojeISO();
  const desde = desdeSel === "tudo" ? "2000-01-01" : desdeSel === "mes" ? hoje.slice(0, 8) + "01" : "2026-07-01";
  const go = (novo) => { const p = new URLSearchParams({ q: busca, d: desdeSel, f: pf }); Object.entries(novo || {}).forEach(([k, v]) => p.set(k, v)); [...p.keys()].forEach(k => { if (p.get(k) === "") p.delete(k); }); location.hash = "#/areceber?" + p; };
  const [ags, pcs] = await Promise.all([
    todosOsDados(() => { let x = sb.from("agendamentos").select("id,inicio,valor,profissional_id,empresa_id,paciente_id,paciente:pacientes(nome,telefone),servico:servicos(nome),pagamentos(valor)").eq("status", "realizada").is("pacote_id", null).gt("valor", 0).gte("inicio", desde + "T00:00:00-04:00").order("inicio"); if (S.emp) x = x.eq("empresa_id", S.emp); if (pf) x = x.eq("profissional_id", pf); return x; }),
    todosOsDados(() => { let x = sb.from("pacotes").select("id,numero,valor,valor_pago,paciente_id,empresa_id,profissional_id,vendido_em,paciente:pacientes!paciente_id(nome,telefone)").order("numero", { ascending: false }); if (S.emp) x = x.eq("empresa_id", S.emp); if (pf) x = x.eq("profissional_id", pf); return x; })
  ]);
  const porPac = {};
  ags.forEach(a => {
    const saldo = Math.round((Number(a.valor) - sum(a.pagamentos || [], x => x.valor)) * 100) / 100; if (saldo <= 0.005) return;
    const g = porPac[a.paciente_id] || (porPac[a.paciente_id] = { id: a.paciente_id, nome: a.paciente ? a.paciente.nome : "", tel: a.paciente ? a.paciente.telefone : "", itens: [], total: 0, profs: new Set() });
    g.itens.push({ data: diaDe(a.inicio), servico: a.servico ? a.servico.nome : "Consulta", saldo }); g.total += saldo; g.profs.add(a.profissional_id);
  });
  let lista = Object.values(porPac).filter(g => !busca || semAcento(g.nome).includes(semAcento(busca))).sort((a, b) => b.total - a.total);
  const pacSaldo = pcs.map(p => ({ p, saldo: Math.max(0, Number(p.valor || 0) - Number(p.valor_pago || 0)) })).filter(x => x.saldo > 0.005 && (!busca || semAcento(x.p.paciente ? x.p.paciente.nome : "").includes(semAcento(busca)))).sort((a, b) => b.saldo - a.saldo);
  const total = sum(lista, g => g.total), totPk = sum(pacSaldo, x => x.saldo);
  const maisAntigo = lista.length ? Math.max(...lista.map(g => Math.round((new Date(hoje + "T12:00:00-04:00") - new Date(g.itens[0].data + "T12:00:00-04:00")) / 864e5))) : 0;
  const waMsg = g => "Olá, " + String(g.nome).split(" ")[0] + "! Tudo bem? Passando para lembrar dos valores em aberto:\n" + g.itens.slice(0, 8).map(i => "- " + fmtData(i.data + "T12:00:00-04:00").slice(0, 5) + " (" + i.servico + "): " + brl(i.saldo)).join("\n") + (g.itens.length > 8 ? "\n- e mais " + (g.itens.length - 8) + " sessão(ões)" : "") + "\nTotal: " + brl(g.total) + ". Pode me confirmar o pagamento? Obrigada!";
  const waLink = (tel, msg) => { let d = String(tel || "").replace(/\D/g, ""); if (d.length < 10) return ""; if (d.length <= 11) d = "55" + d; return "https://wa.me/" + d + "?text=" + encodeURIComponent(msg); };
  const inBusca = h("input", { placeholder: "Buscar paciente…", value: busca, style: "min-width:220px;flex:1", onkeydown: e => e.key === "Enter" && go({ q: e.target.value }) });
  const selD = sel([["jul", "Desde 01/07/2026"], ["mes", "Só este mês"], ["tudo", "Todo o histórico"]], desdeSel, { style: "width:auto", onchange: e => go({ d: e.target.value }) });
  const selP = sel([["", "Todos os profissionais"]].concat(S.profs.filter(p => p.ativo || p.id === pf).map(p => [p.id, nomeCurto(p.nome)])), pf, { style: "width:auto;max-width:230px", onchange: e => go({ f: e.target.value }) });
  const empTxt = !S.emp ? "Essência e Atlas" : (empCod(S.emp) === "atlas" ? "Atlas" : "Essência");
  const linhas = lista.slice(0, 200).map(g => {
    const wa = waLink(g.tel, waMsg(g)), ab = () => { location.hash = "#/paciente/" + g.id + "?t=financeiro"; };
    return h("tr", { class: "click", onclick: ab }, h("td", {}, h("b", {}, g.nome), h("div", { class: "small muted" }, g.itens.slice(0, 3).map(i => fmtData(i.data + "T12:00:00-04:00").slice(0, 5)).join(", ") + (g.itens.length > 3 ? " e mais " + (g.itens.length - 3) : ""))),
      h("td", { class: "small" }, [...g.profs].map(id => nomeCurto(profNome(id))).join(", ")), h("td", { class: "right" }, g.itens.length), h("td", { class: "nowrap small" }, fmtData(g.itens[0].data + "T12:00:00-04:00")),
      h("td", { class: "right nowrap" }, h("b", {}, brl(g.total))), h("td", { class: "nowrap" }, wa ? h("a", { class: "btn btn-s", href: wa, target: "_blank", rel: "noopener", onclick: e => e.stopPropagation() }, "WhatsApp") : h("span", { class: "small muted" }, "sem telefone")));
  });
  const tab = lista.length ? h("div", { class: "tw" }, h("table", {}, h("thead", {}, h("tr", {}, ["Paciente", "Profissional", "Sessões", "Mais antiga", "Saldo", "Cobrar"].map((t, i) => h("th", { class: i === 2 || i === 4 ? "right" : "" }, t)))), h("tbody", {}, linhas))) : vazio("Nada a receber de consultas avulsas neste filtro.");
  const exportar = () => baixarCSV("a_receber.csv", [["Paciente", "Telefone", "Sessões", "Mais antiga", "Saldo"]].concat(lista.map(g => [g.nome, g.tel || "", g.itens.length, g.itens[0].data, numCSV(g.total)])));
  return h("div", {}, h("div", { class: "card" }, h("div", { class: "row" }, h("h1", { class: "grow" }, "A receber"), h("button", { onclick: exportar }, "⬇ Exportar planilha")),
    h("div", { class: "small muted" }, empTxt + ". Consultas realizadas e ainda não pagas (sem pacote). Para registrar o pagamento, abra a ficha do paciente."),
    h("div", { class: "kpis", style: "margin-top:10px" }, kpi("Total a receber", brl(total), "consultas avulsas"), kpi("Pacientes com saldo", lista.length), kpi("Mais antigo", maisAntigo + " dias", "da sessão mais velha"), kpi("Saldo de pacotes", brl(totPk), pacSaldo.length + " pacote(s)")),
    h("div", { class: "row" }, selD, selP, inBusca, h("button", { onclick: () => go({ q: inBusca.value }) }, "Buscar"))),
    h("div", { class: "card" }, tab, lista.length > 200 && h("div", { class: "small muted", style: "margin-top:8px" }, "Mostrando os 200 maiores saldos de " + lista.length + ". Use Exportar para ver todos.")),
    pacSaldo.length > 0 && h("div", { class: "card" }, h("h2", {}, "Pacotes com saldo"), h("div", { class: "small muted", style: "margin-bottom:8px" }, "Os 15 maiores saldos. A lista completa, com filtros, está em Pacotes."),
      h("div", { class: "tw" }, h("table", {}, h("thead", {}, h("tr", {}, ["Nº", "Paciente", "Vendido em", "Saldo"].map((t, i) => h("th", { class: i === 3 ? "right" : "" }, t)))), h("tbody", {}, pacSaldo.slice(0, 15).map(x => h("tr", { class: "click", onclick: () => { location.hash = "#/paciente/" + x.p.paciente_id + "?t=financeiro"; } }, h("td", {}, "#" + (x.p.numero || "—")), h("td", {}, x.p.paciente ? x.p.paciente.nome : ""), h("td", { class: "small nowrap" }, x.p.vendido_em ? fmtData(x.p.vendido_em + "T12:00:00-04:00") : ""), h("td", { class: "right nowrap" }, h("b", {}, brl(x.saldo))))))),
      h("div", { style: "margin-top:8px" }, h("a", { href: "#/pacotes?s=todos&pg=pend" }, "Ver todos os pacotes com saldo →")))));
}
