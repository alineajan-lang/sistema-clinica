// Documentos em PDF — layout do Sistema Atlas, com a identidade visual da empresa do paciente (Essência ou Atlas)
window.PDFDOC = (function () {
  const TEMAS = {
    atlas: { nome: "Clínica Atlas", logo: "img/logo-atlas.png", logoW: 34, fundo: [246, 242, 234], tinta: [28, 30, 38], suave: [95, 97, 112], dest: [153, 125, 72], rot: [153, 125, 72], borda: [214, 206, 190], cartao: [250, 247, 240], marca: [228, 220, 200], marcaTipo: "globo",
      contato: ["Telefone (92) 98494-6232"] },
    essencia: { nome: "Clínica Essência", logo: "img/logo-essencia.png", logoW: 52, fundo: [255, 249, 237], tinta: [43, 43, 43], suave: [110, 110, 100], dest: [111, 138, 82], rot: [201, 111, 132], borda: [228, 223, 210], cartao: [255, 252, 244], marca: [236, 242, 228], marcaTipo: "folhas",
      contato: ["Telefone (92) 98841-1244"] }
  };
  const cache = {};
  async function binB64(url) { if (cache[url]) return cache[url]; const b = new Uint8Array(await (await fetch(url)).arrayBuffer()); let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return (cache[url] = btoa(s)); }
  async function imgData(url) { if (cache[url]) return cache[url]; const blob = await (await fetch(url)).blob(); return (cache[url] = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); })); }
  const dataExtensa = iso => { const p = String(iso || "").split("-"); const M = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]; return +p[2] + " de " + M[+p[1] - 1] + " de " + p[0]; };
  const dbr = iso => String(iso || "").split("-").reverse().join("/");
  const idadeDe = n => { if (!n) return ""; const a = new Date(n + "T12:00:00"), h = new Date(); let i = h.getFullYear() - a.getFullYear(); if (h.getMonth() < a.getMonth() || (h.getMonth() === a.getMonth() && h.getDate() < a.getDate())) i--; return i >= 0 && i < 130 ? i + " anos" : ""; };
  function relTitulo(area) { const e = (area || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); if (e.includes("fonoaud")) return "Relatório fonoaudiológico"; if (e.includes("psicopedag")) return "Relatório psicopedagógico"; if (e.includes("neuropsic")) return "Relatório neuropsicológico"; if (e.includes("psicolog")) return "Relatório psicológico"; if (/psiquiat|cardio|neuro|gineco|cirurg|medic/.test(e)) return "Relatório médico"; return "Relatório de atendimento"; }
  function titulo(d) { return { receita: d.ctrl ? "Receituário de controle especial" : "Receituário", exames: "Solicitação de exames", relatorio: relTitulo(d.pro.area), declaracao: "Declaração de comparecimento", encaminhamento: "Encaminhamento", recibo: "Recibo" + (d.recibo && d.recibo.numero ? " nº " + d.recibo.numero : ""), risco: "Avaliação de risco cirúrgico", anamnese: d.anam ? d.anam.titulo : "Anamnese", termo: "Termo de consentimento", contrato: "Contrato de prestação de serviços" }[d.tipo] || "Documento"; }
  const DOC_LEE = ["Cirurgia de alto risco (intraperitoneal, intratorácica ou vascular suprainguinal)", "Doença arterial coronariana (infarto prévio, angina, teste de isquemia positivo, uso de nitrato ou onda Q)", "Insuficiência cardíaca", "Doença cerebrovascular (AVC ou AIT)", "Diabetes em uso de insulina", "Creatinina pré-operatória acima de 2 mg/dL"];

  async function gerar(d) {
    const JsPDF = window.jspdf.jsPDF, T = TEMAS[d.empresa] || TEMAS.essencia, doc = new JsPDF({ unit: "mm", format: "a4", compress: true }), ML = 18, MR = 192, LW = MR - ML;
    const [fM, fS, fB, logo] = await Promise.all([binB64("fonts/Marcellus_400.ttf"), binB64("fonts/Mulish_400.ttf"), binB64("fonts/Mulish_700.ttf"), imgData(T.logo)]);
    doc.addFileToVFS("Marcellus.ttf", fM); doc.addFont("Marcellus.ttf", "Marcellus", "normal"); doc.addFileToVFS("Mulish.ttf", fS); doc.addFont("Mulish.ttf", "Mulish", "normal"); doc.addFileToVFS("MulishB.ttf", fB); doc.addFont("Mulish.ttf", "Mulish", "normal"); doc.addFont("MulishB.ttf", "Mulish", "bold");
    const lp = doc.getImageProperties(logo), lh = T.logoW * lp.height / lp.width;
    const cor = c => doc.setTextColor(c[0], c[1], c[2]), fonte = (f, e, t, c) => { doc.setFont(f, e); doc.setFontSize(t); cor(c || T.tinta); }, linhaH = t => t * 0.3528 * 1.42;
    const rotulo = (txt, x, y, al) => { fonte("Mulish", "bold", 7, T.rot); doc.text(String(txt).toUpperCase(), x, y, { charSpace: 0.9, align: al || "left" }); };
    function marca() {
      doc.setDrawColor(T.marca[0], T.marca[1], T.marca[2]); doc.setLineWidth(0.3);
      if (T.marcaTipo === "globo") { const cx = 105, cy = 168, r = 64; doc.circle(cx, cy, r, "S"); doc.ellipse(cx, cy, r * 0.46, r, "S"); doc.ellipse(cx, cy, r * 0.78, r, "S"); doc.line(cx, cy - r, cx, cy + r); [-0.66, -0.33, 0.33, 0.66].forEach(k => { const dy = r * k, hx = Math.sqrt(r * r - dy * dy); doc.line(cx - hx, cy + dy, cx + hx, cy + dy); }); }
      else { const cx = 105, cy = 170; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; doc.ellipse(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30, 30, 12, "S"); } doc.circle(cx, cy, 8, "S"); }
    }
    function cabecalho() {
      doc.setFillColor(T.fundo[0], T.fundo[1], T.fundo[2]); doc.rect(0, 0, 210, 40, "F"); doc.addImage(logo, "PNG", 14, Math.max(2, (40 - lh) / 2), T.logoW, lh);
      fonte("Mulish", "normal", 9.5, T.suave); doc.text(T.contato[0], MR, 21, { align: "right" });
      doc.setDrawColor(T.dest[0], T.dest[1], T.dest[2]); doc.setLineWidth(0.6); doc.line(0, 40, 210, 40);
    }
    function rodape() { doc.setDrawColor(T.borda[0], T.borda[1], T.borda[2]); doc.setLineWidth(0.3); doc.line(ML, 284, MR, 284); fonte("Mulish", "normal", 7.6, T.suave); doc.text(T.nome, 105, 289, { align: "center" }); }
    function novaPagina(primeira) { if (!primeira) doc.addPage(); marca(); cabecalho(); rodape(); }
    const ctrl = d.tipo === "receita" && d.ctrl, vias = ctrl ? ["1ª via · Farmácia", "2ª via · Paciente"] : [""];
    vias.forEach((via, vi) => {
      novaPagina(vi === 0); let y = 50;
      fonte("Marcellus", "normal", 22, T.tinta); doc.text(titulo(d), ML, y + 4); doc.setDrawColor(T.dest[0], T.dest[1], T.dest[2]); doc.setLineWidth(0.7); doc.line(ML, y + 8, ML + 22, y + 8);
      if (via) { doc.setLineWidth(0.3); doc.roundedRect(MR - 58, y - 3, 58, 8, 1.5, 1.5, "S"); rotulo(via, MR - 29, y + 2.1, "center"); }
      y += 17;
      const alt = ctrl ? 32 : 22; doc.setFillColor(T.cartao[0], T.cartao[1], T.cartao[2]); doc.setDrawColor(T.borda[0], T.borda[1], T.borda[2]); doc.setLineWidth(0.3); doc.roundedRect(ML, y, LW, alt, 1.5, 1.5, "FD");
      rotulo("Paciente", ML + 5, y + 6); fonte("Mulish", "bold", 11.5, T.tinta); doc.text(d.pac.nome || "—", ML + 5, y + 12.2);
      const sub = []; if (d.pac.nasc) sub.push("Nascimento " + dbr(d.pac.nasc) + (idadeDe(d.pac.nasc) ? " (" + idadeDe(d.pac.nasc) + ")" : "")); if (d.pac.tel) sub.push("Tel. " + d.pac.tel); fonte("Mulish", "normal", 9, T.suave); doc.text(sub.join("  ·  ") || " ", ML + 5, y + 17.6);
      rotulo("Data", MR - 5, y + 6, "right"); fonte("Mulish", "bold", 10.5, T.tinta); doc.text(dbr(d.data), MR - 5, y + 12.2, { align: "right" });
      if (ctrl) { rotulo("Endereço", ML + 5, y + 23.4); fonte("Mulish", "normal", 9.5, T.tinta); doc.text(doc.splitTextToSize(d.pac.end || "—", LW - 34)[0] || "—", ML + 5, y + 28.2); }
      y += alt + 11; const limite = ctrl ? 210 : 256;
      const garante = h => { if (y + h > limite) { novaPagina(false); y = 50; } };
      const bloco = (rot, txt) => { if (!String(txt || "").trim()) return; garante(18); rotulo(rot, ML, y); y += 5.2; fonte("Mulish", "normal", 10.2, T.tinta); doc.splitTextToSize(String(txt).trim(), LW).forEach(l => { garante(6); doc.text(l, ML, y); y += linhaH(10.2); }); y += 4; };
      const paragrafos = txt => String(txt || "").split(/\r?\n/).forEach(par => { const t = par.trim(); if (!t) { y += 3; return; } const tit = /^[^.!?\n]{2,70}:$/.test(t); if (tit) y += 1.5; doc.splitTextToSize(t, LW).forEach(l => { garante(6); fonte("Mulish", tit ? "bold" : "normal", 10.4, T.tinta); doc.text(l, ML, y); y += linhaH(10.4); }); y += 1.6; });
      if (d.tipo === "receita") {
        let n = 0; (d.itens || []).forEach(it => { if (!String(it.m || "").trim()) return; n++; const pl = doc.splitTextToSize(String(it.p || "").trim() || " ", LW - 12); garante(16 + pl.length * 5);
          fonte("Marcellus", "normal", 14, T.dest); doc.text(String(n), ML, y + 1); fonte("Mulish", "bold", 11.4, T.tinta); const ml = doc.splitTextToSize(String(it.m).trim(), LW - 12); ml.forEach((l, i) => doc.text(l, ML + 10, y + i * 5.4)); y += 5.4 * Math.max(1, ml.length);
          fonte("Mulish", "normal", 10.2, T.tinta); pl.forEach(l => { doc.text(l, ML + 10, y); y += linhaH(10.2); });
          if (String(it.q || "").trim()) { fonte("Mulish", "normal", 9.2, T.suave); doc.text("Quantidade: " + String(it.q).trim(), ML + 10, y); y += linhaH(9.2); }
          y += 3; doc.setDrawColor(T.borda[0], T.borda[1], T.borda[2]); doc.setLineWidth(0.2); doc.line(ML + 10, y, MR, y); y += 6.5; });
        if (!n) { fonte("Mulish", "normal", 10, T.suave); doc.text("(nenhum medicamento informado)", ML, y); y += 8; } y += 2; bloco("Orientações", d.orient);
      } else if (d.tipo === "declaracao") {
        const dc = d.decl || {}, txt = "Declaro, para os devidos fins que se fizerem necessários, que o(a) Sr(a). " + (d.pac.nome || "") + (d.rg ? ", RG " + d.rg : "") + ", compareceu a esta clínica no dia " + dbr(dc.data || d.data) + (dc.hi && dc.hf ? ", no período das " + dc.hi + " às " + dc.hf : "") + ", para fins de atendimento na área da saúde.";
        y += 4; fonte("Mulish", "normal", 12, T.tinta); doc.splitTextToSize(txt, LW).forEach(l => { garante(8); doc.text(l, ML, y); y += linhaH(12) + 1.2; });
      } else if (d.tipo === "relatorio") {
        bloco("Finalidade", d.fin); bloco("Destinatário", d.dest); paragrafos(d.rel); y += 2; bloco("CID-10", d.indic);
        if (/psicolog|fonoaud|psicopedag/.test((d.pro.area || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase())) { fonte("Mulish", "normal", 8.8, T.suave); doc.splitTextToSize("Este documento é sigiloso e destina-se exclusivamente à finalidade acima. É vedada a reprodução ou o uso para outros fins.", LW).forEach(l => { garante(5); doc.text(l, ML, y); y += 4.6; }); y += 2; }
      } else if (d.tipo === "recibo") {
        const rc = d.recibo || {}, ses = rc.sessoes || [], datas = ses.map(s => dbr(s.data) + (s.hora ? " às " + s.hora : "")), n = ses.length;
        const txt = "Recebi de " + (rc.pagador && rc.pagador.nome || "—") + (rc.pagador && rc.pagador.cpf ? ", CPF " + rc.pagador.cpf : "") + ", a quantia de R$ " + Number(rc.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + " (" + (rc.extenso || "") + ")" + (n ? ", referente a " + n + " sessão" + (n > 1 ? "ões" : "") + (rc.servico ? " de " + rc.servico : "") : "") + ", realizada" + (n > 1 ? "s" : "") + " em favor de " + (d.pac.nome || "") + ", pelo(a) profissional " + (d.pro.nome || "") + (d.pro.registro ? " (" + [d.pro.area, d.pro.registro].filter(Boolean).join(" · ") + ")" : "") + (datas.length ? ", nos dias " + datas.join("; ") : "") + ".";
        y += 2; fonte("Mulish", "normal", 11.5, T.tinta); doc.splitTextToSize(txt, LW).forEach(l => { garante(7); doc.text(l, ML, y); y += linhaH(11.5) + 1; }); y += 4;
        bloco("Pagador", (rc.pagador && rc.pagador.nome || "—") + (rc.pagador && rc.pagador.cpf ? "  ·  CPF " + rc.pagador.cpf : ""));
        bloco("Valor recebido", "R$ " + Number(rc.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + " (" + (rc.extenso || "") + ")" + (rc.forma ? "  ·  " + rc.forma : "") + (rc.dataPag ? "  ·  em " + dbr(rc.dataPag) : ""));
        if ((rc.servicos || []).length) bloco(rc.servicos.length > 1 ? "Serviços agendados" : "Serviço agendado", rc.servicos.map(s => s.nome + (s.qtd > 1 ? "  ×  " + s.qtd + " sessões" : "")).join("\n"));
        bloco("Profissional responsável pelo atendimento", (d.pro.nome || "") + (d.pro.registro ? "  ·  " + [d.pro.area, d.pro.registro].filter(Boolean).join(" · ") : ""));
        if (ses.length) { garante(14); rotulo("Sessões cobertas por este valor (" + n + ")", ML, y); y += 5.5; ses.forEach(s => { garante(6); fonte("Mulish", "normal", 10.2, T.tinta); doc.text("•  " + dbr(s.data) + (s.hora ? " às " + s.hora : "") + "  —  " + (s.servico || "serviço não informado"), ML + 2, y); y += linhaH(10.2) + 0.6; }); y += 3; }
        bloco("Observações", rc.obs);
      } else if (d.tipo === "termo" || d.tipo === "contrato") {
        y += 1; paragrafos(d.texto);
      } else if (d.tipo === "encaminhamento") {
        y += 2; fonte("Mulish", "normal", 11.5, T.tinta); const t1 = "Encaminho o(a) paciente " + (d.pac.nome || "") + " para avaliação e conduta em " + (d.enc.para || "—") + (d.enc.dest ? ", aos cuidados de " + d.enc.dest : "") + "."; doc.splitTextToSize(t1, LW).forEach(l => { garante(7); doc.text(l, ML, y); y += linhaH(11.5) + 1; }); y += 4;
        bloco("Motivo do encaminhamento", d.enc.motivo); bloco("Resumo clínico", d.enc.resumo); bloco("CID-10", d.indic);
      } else if (d.tipo === "anamnese") {
        (d.anam.grupos || []).forEach(g => { garante(16); y += 1; fonte("Marcellus", "normal", 13, T.dest); doc.text(g.t, ML, y + 1); y += 6; (g.itens || []).forEach(([r, v]) => { if (!String(v || "").trim()) return; garante(14); fonte("Mulish", "bold", 8.8, T.suave); doc.splitTextToSize(r, LW).forEach(l => { garante(5); doc.text(l, ML, y); y += 4.2; }); fonte("Mulish", "normal", 10.2, T.tinta); doc.splitTextToSize(String(v).trim(), LW).forEach(l => { garante(6); doc.text(l, ML, y); y += linhaH(10.2); }); y += 3; }); });
      } else if (d.tipo === "risco") {
        const rc = d.rc || {};
        bloco("Procedimento proposto", [rc.proc, rc.porte ? "Porte " + rc.porte.toLowerCase() : "", rc.carater || "", rc.anest ? "Anestesia prevista: " + rc.anest : "", rc.cir ? "Equipe ou local: " + rc.cir : ""].filter(Boolean).join(" · "));
        bloco("Queixas cardiovasculares", rc.q); bloco("Antecedentes pessoais", rc.antec); bloco("Alergia", rc.al); bloco("Medicações em uso", rc.med);
        bloco("Exame físico", [(rc.pa || rc.fc) ? "PA: " + (rc.pa || "—") + " mmHg · FC: " + (rc.fc || "—") + " bpm" : "", rc.fis || ""].filter(Boolean).join("\n")); bloco("Exames complementares", rc.ex); bloco("Capacidade funcional", rc.cap);
        const marc = (rc.lee || []).map((v, i) => v ? DOC_LEE[i] : "").filter(Boolean); bloco("Índice de risco cardíaco revisado (Lee)", marc.length + " ponto" + (marc.length === 1 ? "" : "s") + ". " + (marc.length ? "Critérios presentes: " + marc.join("; ") + "." : "Nenhum critério presente."));
        bloco("Risco cardiovascular", [rc.risco ? "Perioperatório: " + rc.risco : "", rc.acp ? "ACP: " + rc.acp : "", rc.leip ? "LEE: " + rc.leip : ""].filter(Boolean).join("\n"));
        if (rc.parecer) { const pl2 = doc.splitTextToSize(rc.parecer, LW - 10), hb = pl2.length * 5.6 + 6; garante(hb + 14); rotulo("Parecer", ML, y); y += 3.6; doc.setDrawColor(T.dest[0], T.dest[1], T.dest[2]); doc.setLineWidth(0.5); doc.roundedRect(ML, y, LW, hb, 1.5, 1.5, "S"); fonte("Mulish", "bold", 11, T.tinta); pl2.forEach((l, i) => doc.text(l, ML + 5, y + 6 + i * 5.6)); y += hb + 7; }
        bloco("Recomendações perioperatórias", rc.rec); bloco("Validade da avaliação", rc.val); bloco("Observações", rc.obs); bloco("CID-10", d.indic);
      } else { // exames
        const lista = String(d.exames || "").split(/\r?\n/).map(x => x.trim()).filter(Boolean), k = lista.length;
        if (k > 8) { const cw = (LW - 8) / 2, linhas = Math.ceil(k / 2); for (let r2 = 0; r2 < linhas; r2++) { const cel = [r2, r2 + linhas].filter(ix => ix < k).map(ix => { fonte("Mulish", "normal", 10.2, T.tinta); return { i: ix, ls: doc.splitTextToSize(lista[ix], cw - 9) }; }); const hh = Math.max(...cel.map(c => c.ls.length)) * 5 + 2.8; garante(hh + 2); cel.forEach((c, ci) => { const x = ML + ci * (cw + 8); fonte("Marcellus", "normal", 12, T.dest); doc.text(String(c.i + 1), x, y + 0.8); fonte("Mulish", "normal", 10.2, T.tinta); c.ls.forEach((t2, li) => doc.text(t2, x + 8, y + li * 5)); }); y += hh; } }
        else lista.forEach((l, ix) => { const ls = doc.splitTextToSize(l, LW - 12); garante(8 + ls.length * 5); fonte("Marcellus", "normal", 13, T.dest); doc.text(String(ix + 1), ML, y + 0.8); fonte("Mulish", "normal", 10.8, T.tinta); ls.forEach((t2, i) => doc.text(t2, ML + 10, y + i * 5.2)); y += 5.2 * ls.length + 3.2; });
        if (!k) { fonte("Mulish", "normal", 10, T.suave); doc.text("(nenhum exame informado)", ML, y); y += 8; } y += 3;
        if (d.urg) { garante(12); doc.setDrawColor(T.dest[0], T.dest[1], T.dest[2]); doc.setLineWidth(0.3); doc.roundedRect(ML, y - 4, 30, 7, 1.5, 1.5, "S"); rotulo("Urgente", ML + 15, y + 0.4, "center"); y += 9; }
        bloco("Indicação clínica / CID-10", d.indic); bloco("Observações", d.obs);
      }
      // assinatura (com espaço para assinatura Gov.br) e, no controle especial, quadros de comprador e fornecedor
      let yb = ctrl ? 222 : 246; if (y > yb - 6) { novaPagina(false); }
      const duasAss = d.tipo === "termo" || d.tipo === "contrato", ga = !!(d.assin && d.assin.tipo === "gestao");
      fonte("Mulish", "normal", 10, T.tinta); doc.text("Manaus, " + dataExtensa(d.data) + ".", ML, duasAss ? yb - 3 : yb + 9);
      doc.setDrawColor(T.tinta[0], T.tinta[1], T.tinta[2]); doc.setLineWidth(0.3); doc.line(112, yb + 9, MR, yb + 9);
      const poeAss = (img, cx) => { try { if (!img || !img.t || !img.r) return; const hh = Math.min(16, 54 / img.r), w = hh * img.r, x0 = cx - w / 2, y0 = yb + 8 - hh; doc.setDrawColor(22, 24, 31); doc.setLineWidth(0.38); doc.setLineCap("round"); doc.setLineJoin("round");
        img.t.forEach(st => { if (st.length === 1) { doc.circle(x0 + st[0][0] * w, y0 + st[0][1] * hh, 0.2, "F"); return; } for (let i = 1; i < st.length; i++) doc.line(x0 + st[i - 1][0] * w, y0 + st[i - 1][1] * hh, x0 + st[i][0] * w, y0 + st[i][1] * hh); }); doc.setLineWidth(0.3); } catch (e) {} };
      if (d.assin) poeAss(d.assin.imagem, 152);
      if (duasAss) {
        doc.line(ML, yb + 9, 100, yb + 9); if (d.assinPac) poeAss(d.assinPac.imagem, (ML + 100) / 2);
        fonte("Mulish", "bold", 10.5, T.tinta); doc.text(((d.resp && d.resp.nome) || d.pac.nome || "Paciente"), (ML + 100) / 2, yb + 14.2, { align: "center" });
        fonte("Mulish", "normal", 8.8, T.suave); doc.text((d.resp && d.resp.nome ? "Responsável legal" + (d.resp.par ? " (" + d.resp.par + ")" : "") + (d.resp.cpf ? " · CPF " + d.resp.cpf : "") : "Paciente"), (ML + 100) / 2, yb + 18.6, { align: "center" });
      }
      const rec = d.tipo === "recibo"; fonte("Mulish", "bold", 10.5, T.tinta); doc.text(ga ? d.assin.nome : (rec ? "Administração" : (d.pro.nome || "")), 152, yb + 14.2, { align: "center" });
      const cred = (rec || ga) ? T.nome : [d.pro.area, d.pro.registro, d.pro.rqe ? "RQE " + String(d.pro.rqe).replace(/^RQE\s*/i, "") : ""].filter(Boolean).join(" · "); fonte("Mulish", "normal", 8.8, T.suave); if (cred) doc.text(cred, 152, yb + 18.6, { align: "center" });
      if (d.assin && d.assin.codigo) {
        const dt = new Date(d.assin.em), quando = dt.toLocaleDateString("pt-BR", { timeZone: "America/Manaus" }) + " " + dt.toLocaleTimeString("pt-BR", { timeZone: "America/Manaus", hour: "2-digit", minute: "2-digit" });
        fonte("Mulish", "normal", 6.8, T.suave);
        const carimbo = "Assinado eletronicamente por " + d.assin.nome + " em " + quando + " (Manaus). Código " + d.assin.codigo + (ctrl ? "." : ". Confira em " + ASSIN.urlVerificar(d.assin.codigo));
        doc.splitTextToSize(carimbo, ctrl ? 92 : 84).forEach((l, i) => doc.text(l, 152, yb + 23 + i * 2.9, { align: "center" }));
      }
      if (ctrl) { const by = yb + 28, bh = 32, bw = (LW - 6) / 2; doc.setDrawColor(T.borda[0], T.borda[1], T.borda[2]); doc.setLineWidth(0.3); doc.roundedRect(ML, by, bw, bh, 1.5, 1.5, "S"); doc.roundedRect(ML + bw + 6, by, bw, bh, 1.5, 1.5, "S");
        rotulo("Identificação do comprador", ML + 4, by + 5.5); rotulo("Identificação do fornecedor", ML + bw + 10, by + 5.5); fonte("Mulish", "normal", 8.4, T.suave);
        ["Nome:", "RG:", "Endereço:", "Cidade/UF:    Telefone:"].forEach((t3, i) => { doc.text(t3, ML + 4, by + 12 + i * 5.6); doc.setLineWidth(0.2); doc.line(ML + 4 + (i === 3 ? 0 : doc.getTextWidth(t3) + 1.5), by + 12.8 + i * 5.6, ML + bw - 4, by + 12.8 + i * 5.6); });
        ["Data:     /     /", "Assinatura do farmacêutico:"].forEach((t4, i) => { doc.text(t4, ML + bw + 10, by + 14 + i * 9); doc.line(ML + bw + 10 + (i === 0 ? 30 : doc.getTextWidth(t4) + 1.5), by + 14.8 + i * 9, ML + 2 * bw + 2, by + 14.8 + i * 9); }); }
    });
    return doc.output("blob");
  }
  const nomeArq = d => (titulo(d).normalize("NFD").replace(/[̀-ͯ]/g, "") + " - " + String(d.pac.nome || "").replace(/[\\\/:*?"<>|]/g, "") + " - " + dbr(d.data).replace(/\//g, "-") + ".pdf");
  function baixar(blob, nome) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nome; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
  // Abre o PDF numa aba nova (aberta NO CLIQUE, para o navegador não bloquear) e chama a impressão. Se não der, baixa o arquivo.
  function janelaImpressao() { try { const w = window.open("", "_blank"); if (w) { w.document.write("<p style='font:16px sans-serif;padding:24px'>Preparando o documento para impressão…</p>"); } return w; } catch (e) { return null; } }
  function imprimir(blob, w, nome) {
    const url = URL.createObjectURL(blob);
    if (w && !w.closed) { w.location.href = url; setTimeout(() => { try { w.focus(); w.print(); } catch (e) {} }, 1800); setTimeout(() => URL.revokeObjectURL(url), 120000); return true; }
    baixar(blob, nome || "documento.pdf"); toast("O navegador bloqueou a janela de impressão. O PDF foi baixado: abra o arquivo e imprima.", true); return false;
  }
  return { gerar, baixar, imprimir, janelaImpressao, nomeArq, titulo, relTitulo, TEMAS, DOC_LEE, dataExtensa };
})();
