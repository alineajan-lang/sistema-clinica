// Prontuário: anamneses, relatos de sessão e documentos — tudo com SALVAMENTO AUTOMÁTICO enquanto o profissional escreve
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const E = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const V = id => { const e = $(id); return e ? e.value : ""; };
  const opt = (v, l, sel) => '<option value="' + E(v) + '"' + (sel ? " selected" : "") + ">" + E(l) + "</option>";
  const PR = { tab: "anamnese", doc: {}, pendentes: 0 };
  const agoraHM = () => new Date().toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  window.addEventListener("beforeunload", e => { if (PR.pendentes > 0) { e.preventDefault(); e.returnValue = ""; } });

  // ---------- salvamento automático ----------
  // Vigia o bloco: a cada alteração espera ~1,2 s sem digitar e salva sozinho. Se a internet cair, guarda uma cópia no aparelho e tenta de novo.
  function autoSalvar(bloco, salvar, backupKey, coletar) {
    const st = $("asStatus"); let t, ocupado = false, de_novo = false;
    const bk = () => { if (backupKey && coletar) { try { localStorage.setItem("pr-" + backupKey, JSON.stringify({ em: Date.now(), dados: coletar() })); } catch (e) {} } };
    const rodar = async () => {
      if (ocupado) { de_novo = true; return; } ocupado = true;
      try { if (st) { st.textContent = "Salvando…"; st.className = "as"; } await salvar(); PR.pendentes = 0; if (st) { st.textContent = "✓ Salvo automaticamente às " + agoraHM(); st.className = "as ok"; } if (backupKey) { try { localStorage.removeItem("pr-" + backupKey); } catch (e) {} } }
      catch (e) { if (st) { st.textContent = "Sem conexão ou erro ao salvar. Seu texto está guardado neste aparelho e será enviado assim que possível."; st.className = "as err"; } setTimeout(rodar, 10000); }
      ocupado = false; if (de_novo) { de_novo = false; rodar(); }
    };
    const disparo = () => { PR.pendentes = 1; bk(); if (st) { st.textContent = "Escrevendo…"; st.className = "as"; } clearTimeout(t); t = setTimeout(rodar, 1200); };
    bloco.addEventListener("input", disparo); bloco.addEventListener("change", disparo);
    return { agora: () => { clearTimeout(t); return rodar(); }, parar: () => clearTimeout(t) };
  }
  const lerBackup = k => { try { const j = JSON.parse(localStorage.getItem("pr-" + k) || "null"); return j; } catch (e) { return null; } };
  const aviso = '<div id="asStatus" class="as"></div>';

  // ---------- contexto ----------
  function contexto(p) {
    const gestao = ehGestao(), prof = ehProf(), pro = prof ? S.profs.find(x => x.id === S.perfil.profissional_id) : null;
    const emp = (S.emps.find(e => e.id === p.empresa_id) || {}).codigo === "atlas" ? "atlas" : "essencia";
    return { p, gestao, prof, pro, emp };
  }
  const registroDe = pr => pr && pr.registro ? ((pr.conselho ? pr.conselho + " " : "") + pr.registro).trim() : "";
  const idadeTxt = n => idade(n);

  // ================= ANAMNESE =================
  const modeloCampo = f => {
    const id = f[0];
    if (f[2] === "sel") return '<div class="field"><label for="' + id + '">' + E(f[1]) + '</label><select id="' + id + '"><option value="">—</option>' + f[3].map(o => opt(o, o)).join("") + "</select></div>";
    if (f[2] === "chk") return '<div class="field"><span class="lbl">' + E(f[1]) + '</span><input type="hidden" id="' + id + '"><div class="chks" data-chk="' + id + '"' + (f[4] && f[4].total ? ' data-total="' + E(f[4].total) + '"' : "") + ' style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:6px 12px">' + f[3].map(o => { const l = Array.isArray(o) ? o[0] : o, w = Array.isArray(o) ? o[1] : 0; return '<label class="chk"><input type="checkbox" data-w="' + w + '" value="' + E(l) + '"> <span>' + E(l) + (w > 1 ? " <small>(" + w + " pontos)</small>" : "") + "</span></label>"; }).join("") + "</div></div>";
    if (f[2] === "text") return '<div class="field"><label for="' + id + '">' + E(f[1]) + '</label><input id="' + id + '" type="text"></div>';
    return '<div class="field"><label for="' + id + '">' + E(f[1]) + '</label><textarea id="' + id + '"></textarea></div>';
  };
  const camposDe = m => ANAMS[m].grupos.flatMap(g => g.c);
  function chkSync(box) { const nomes = []; let pts = 0; box.querySelectorAll("input[type=checkbox]:checked").forEach(c => { nomes.push(c.value); pts += Number(c.getAttribute("data-w")) || 0; }); const h = $(box.getAttribute("data-chk")); if (h) h.value = nomes.join("; "); const tt = box.getAttribute("data-total"); if (tt && $(tt)) $(tt).value = nomes.length ? String(pts) : ""; }
  function chkLoad(box) { const h = $(box.getAttribute("data-chk")), marc = String(h && h.value || "").split("; ").filter(Boolean); box.querySelectorAll("input[type=checkbox]").forEach(c => { c.checked = marc.includes(c.value); }); }

  async function viewAnamnese(ctx, corpo) {
    const { p, pro, prof, gestao } = ctx;
    if (!prof) { // administração: só consulta o que os profissionais registraram
      const lista = await ok(sb.from("anamneses").select("id,modelo,data,profissional_id,dados").eq("paciente_id", p.id).order("data", { ascending: false }));
      corpo.innerHTML = lista.length ? '<div class="tbl">' + lista.map(a => '<div class="tr" style="grid-template-columns:90px 1fr;min-width:0"><div>' + E(fmtData(a.data + "T12:00:00-04:00")) + "</div><div><b>" + E((ANAMS[a.modelo] || {}).nome || a.modelo) + "</b> · " + E(nomeCurto(profNome(a.profissional_id))) + "</div></div>").join("") + "</div>" : '<div class="empty">Nenhuma anamnese registrada.</div>';
      return;
    }
    const modelos = anamModelosDaArea(pro.area, pro.pode_prescrever);
    if (!modelos.length) { corpo.innerHTML = '<div class="empty">Não há modelo de anamnese para a sua área.</div>'; return; }
    let m = PR.modelo && modelos.includes(PR.modelo) ? PR.modelo : modelos[0];
    corpo.innerHTML = '<div class="field"><label for="anModelo">Modelo de anamnese</label><select id="anModelo">' + modelos.map(k => opt(k, ANAMS[k].nome, k === m)).join("") + "</select></div>" + '<div id="anForm"></div>';
    $("anModelo").onchange = () => { PR.modelo = $("anModelo").value; viewAnamnese(ctx, corpo); };
    const rows = await ok(sb.from("anamneses").select("*").eq("paciente_id", p.id).eq("profissional_id", pro.id).eq("modelo", m).order("criado_em", { ascending: false }).limit(1));
    let row = rows[0] || null, dados = row ? Object.assign({}, row.dados) : {};
    const bkKey = "anam-" + p.id + "-" + m, bk = lerBackup(bkKey);
    if (bk && bk.dados && (!row || bk.em > new Date(row.criado_em).getTime())) dados = Object.assign(dados, bk.dados);
    const M = ANAMS[m];
    $("anForm").innerHTML = aviso + M.grupos.map((g, i) => '<details class="agx"' + (i === 0 ? " open" : "") + "><summary>" + E(g.t) + '<span class="agc" data-g="' + i + '"></span></summary><div class="agb">' + g.c.map(modeloCampo).join("") + "</div></details>").join("") +
      '<div class="row" style="margin-top:12px"><button class="btn btn-primary" id="anSalvar">Salvar agora</button><button class="btn btn-ghost" id="anPdf">Baixar PDF</button><button class="btn btn-ghost" id="anImp">Imprimir</button></div>';
    camposDe(m).forEach(f => { const e = $(f[0]); if (e && dados[f[0]] != null) e.value = dados[f[0]]; });
    $("anForm").querySelectorAll(".chks").forEach(chkLoad);
    const contar = () => M.grupos.forEach((g, i) => { const n = g.c.filter(f => { const e = $(f[0]); return e && String(e.value).trim(); }).length, el = document.querySelector('.agc[data-g="' + i + '"]'); if (el) el.textContent = " · " + n + " de " + g.c.length; });
    contar();
    $("anForm").addEventListener("change", e => { const b = e.target.closest(".chks"); if (b) chkSync(b); });
    $("anForm").addEventListener("input", e => { contar(); const mm = /^(cd|nr|gn)(Peso|Alt)$/.exec(e.target.id || ""); if (mm && $(mm[1] + "Imc")) { const pe = parseFloat(String($(mm[1] + "Peso").value).replace(",", ".")); let al = parseFloat(String($(mm[1] + "Alt").value).replace(",", ".")); if (al > 3) al /= 100; $(mm[1] + "Imc").value = (pe > 0 && al > 0.5) ? (pe / (al * al)).toFixed(1).replace(".", ",") : ""; } });
    const coletar = () => { const o = {}; camposDe(m).forEach(f => { const e = $(f[0]); if (e) o[f[0]] = e.value; }); return o; };
    const salvar = async () => {
      const d = coletar();
      if (row) { await ok(sb.from("anamneses").update({ dados: d, data: hojeISO() }).eq("id", row.id)); }
      else { const n = await ok(sb.from("anamneses").insert({ paciente_id: p.id, profissional_id: pro.id, modelo: m, data: hojeISO(), dados: d }).select().single()); row = n; }
    };
    const as = autoSalvar($("anForm"), salvar, bkKey, coletar);
    if (bk && bk.dados) as.agora().catch(() => {});
    $("anSalvar").onclick = () => as.agora();
    const gerar = async () => { const d = coletar(); const grupos = M.grupos.map(g => ({ t: g.t, itens: g.c.map(f => [f[1], d[f[0]]]) })); return PDFDOC.gerar({ tipo: "anamnese", empresa: ctx.emp, data: hojeISO(), pac: pacDados(p), pro: proDados(pro), anam: { titulo: "Anamnese — " + M.nome.replace(/^Anamnese\s*/i, "").replace(/^./, c => c.toUpperCase()), grupos } }); };
    $("anPdf").onclick = async () => { try { await as.agora(); const b = await gerar(); PDFDOC.baixar(b, "Anamnese - " + p.nome + ".pdf"); } catch (e) { toast(e.message, true); } };
    $("anImp").onclick = async () => { try { await as.agora(); PDFDOC.imprimir(await gerar()); } catch (e) { toast(e.message, true); } };
  }
  const pacDados = p => ({ nome: p.nome, nasc: p.nascimento || "", tel: p.telefone || "", cpf: p.cpf || "", end: p.endereco ? [p.endereco.rua, p.endereco.bairro, p.endereco.cidade].filter(Boolean).join(", ") : "" });
  const proDados = pr => ({ nome: pr.nome, area: pr.area || "", registro: registroDe(pr), rqe: pr.rqe || "" });

  // ================= RELATOS DE SESSÃO =================
  async function viewRelatos(ctx, corpo) {
    const { p, pro, prof } = ctx;
    const evs = await ok(sb.from("evolucoes").select("*").eq("paciente_id", p.id).order("data", { ascending: false }).limit(300));
    const nowLocal = () => new Date().toLocaleString("sv-SE", { timeZone: TZ }).slice(0, 16).replace(" ", "T");
    let html = "";
    if (prof) html += '<div class="sect">' + aviso + '<div class="two"><div class="field"><label for="rlData">Data e hora</label><input id="rlData" type="datetime-local" value="' + nowLocal() + '"></div><div class="field"><label for="rlTipo">Tipo</label><select id="rlTipo">' + opt("relato", "Relato da sessão") + opt("retorno", "Retorno") + opt("outro", "Outro") + '</select></div></div><div class="field"><label for="rlTxt">Relato</label><textarea id="rlTxt" style="min-height:170px" placeholder="Escreva o relato. Tudo é salvo automaticamente enquanto você digita."></textarea></div><div class="row"><button class="btn btn-primary" id="rlNovo">Concluir e começar outro relato</button></div></div>';
    html += evs.length ? evs.map(e => '<div class="evo"><div class="meta">' + E(fmtDataHora(e.data)) + (ctx.gestao ? " · " + E(nomeCurto(profNome(e.profissional_id))) : "") + " · " + E(e.tipo) + (prof && e.profissional_id === pro.id ? ' · <a href="#" data-edit="' + E(e.id) + '">editar</a>' : "") + '</div><div class="corpo" data-ev="' + E(e.id) + '"></div></div>').join("") : '<div class="empty">Nenhum relato registrado.</div>';
    corpo.innerHTML = html;
    corpo.querySelectorAll("[data-ev]").forEach(el => { const e = evs.find(x => x.id === el.dataset.ev); el.innerHTML = DOMPurify.sanitize(e.conteudo || ""); });
    if (!prof) return;
    let relId = null; const esc2 = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const paraHtml = t => t.split(/\n{2,}/).map(x => "<p>" + esc2(x).replace(/\n/g, "<br>") + "</p>").join("");
    const bkKey = "relato-" + p.id, bk = lerBackup(bkKey);
    if (bk && bk.dados && bk.dados.txt) { $("rlTxt").value = bk.dados.txt; if (bk.dados.data) $("rlData").value = bk.dados.data; $("asStatus").textContent = "Texto recuperado do aparelho; será salvo agora."; }
    const coletar = () => ({ txt: V("rlTxt"), data: V("rlData") });
    const salvar = async () => {
      const txt = V("rlTxt").trim(); if (!txt) return;
      const row = { paciente_id: p.id, profissional_id: pro.id, data: new Date(V("rlData") + ":00-04:00").toISOString(), tipo: V("rlTipo"), conteudo: paraHtml(txt) };
      if (relId) await ok(sb.from("evolucoes").update(row).eq("id", relId)); else { const n = await ok(sb.from("evolucoes").insert(row).select("id").single()); relId = n.id; }
    };
    const as = autoSalvar(corpo.querySelector(".sect"), salvar, bkKey, coletar); if (bk && bk.dados && bk.dados.txt) as.agora().catch(() => {});
    $("rlNovo").onclick = async () => { await as.agora(); relId = null; PR.pendentes = 0; try { localStorage.removeItem("pr-" + bkKey); } catch (e) {} viewRelatos(ctx, corpo); };
    corpo.querySelectorAll("[data-edit]").forEach(a => a.onclick = ev => { ev.preventDefault(); const e = evs.find(x => x.id === a.dataset.edit); relId = e.id; $("rlTxt").value = (e.conteudo || "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>\s*<p>/gi, "\n\n").replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"); $("rlTipo").value = e.tipo; $("rlData").value = new Date(e.data).toLocaleString("sv-SE", { timeZone: TZ }).slice(0, 16).replace(" ", "T"); window.scrollTo({ top: 0, behavior: "smooth" }); toast("Editando — as alterações são salvas sozinhas."); });
  }

  // ================= DOCUMENTOS =================
  const EXAMES = {
    cardiologia: ["Eletrocardiograma de repouso", "Ecocardiograma transtorácico com Doppler", "Teste ergométrico", "Holter de 24 horas", "MAPA de 24 horas", "Colesterol total e frações (HDL, LDL, VLDL)", "Triglicerídeos", "Glicemia de jejum", "Hemoglobina glicada", "Ureia e creatinina", "Sódio e potássio", "TSH", "Hemograma completo"],
    neurologia: ["Ressonância magnética de crânio", "Eletroencefalograma (EEG)", "Eletroneuromiografia de membros", "Doppler de carótidas e vertebrais", "Polissonografia", "Hemograma completo", "Glicemia de jejum", "Hemoglobina glicada", "TSH", "Vitamina B12", "Vitamina D (25-OH)", "VHS e PCR", "Colesterol total e frações", "Cálcio, sódio e potássio"],
    psiquiatria: ["Hemograma completo", "Glicemia de jejum", "Perfil lipídico", "TSH e T4 livre", "Função hepática (TGO, TGP, GGT)", "Função renal (ureia e creatinina)", "Vitamina B12", "Vitamina D (25-OH)", "Eletrocardiograma de repouso", "Sódio, potássio e cálcio"],
    ginecologia: ["Citologia oncótica (preventivo)", "Colposcopia", "Ultrassonografia transvaginal", "Ultrassonografia de mamas", "Mamografia bilateral", "Densitometria óssea", "Hemograma completo", "Glicemia de jejum", "TSH", "Prolactina", "FSH, LH e estradiol", "Beta-hCG", "Pesquisa de HPV", "Sorologias (HIV, sífilis, hepatites B e C)", "Cultura de secreção vaginal", "Vitamina D (25-OH)", "Colesterol total e frações"],
    geral: ["Hemograma completo", "Glicemia de jejum", "Hemoglobina glicada", "Colesterol total e frações", "Triglicerídeos", "Ureia e creatinina", "TGO e TGP", "TSH", "Urina tipo 1", "Parasitológico de fezes"]
  };
  const REL_MODELOS = {
    psico: "Descrição da demanda:\n\nProcedimento:\n\nAnálise:\n\nConclusão e encaminhamento:",
    fono: "Queixa e motivo da avaliação:\n\nProcedimentos e instrumentos utilizados:\n\nAnálise dos achados:\n\nConclusão e recomendações:",
    atendimento: "Motivo do atendimento:\n\nProcedimentos realizados:\n\nEvolução:\n\nConclusão e orientações:",
    acompanhamento: "Paciente em acompanhamento nesta clínica.\n\nHistórico clínico:\n\nExame físico ou avaliação:\n\nHipótese diagnóstica:\n\nConduta e tratamento:\n\nOrientações e retorno:",
    geral: "Relatório médico para os devidos fins.\n\nMotivo da consulta:\n\nHistória clínica:\n\nAchados do exame:\n\nDiagnóstico ou hipótese diagnóstica:\n\nTratamento e conduta:\n\nConclusão:"
  };
  const norm = s => semAcento(s || "");
  const dbr2 = iso => String(iso || "").split("-").reverse().join("/");
  const ehMedico = pr => !!(pr && pr.pode_prescrever);
  function tiposDisponiveis(ctx, pr) {
    if (ctx.gestao) return [["declaracao", "Declaração de comparecimento"], ["encaminhamento", "Encaminhamento"], ["recibo", "Recibo"]];
    const t = []; if (ehMedico(pr)) t.push(["receita", "Receituário"], ["exames", "Solicitação de exames"]);
    t.push(["relatorio", PDFDOC.relTitulo(pr && pr.area)]); if (ehMedico(pr)) t.push(["risco", "Risco cirúrgico"]); t.push(["declaracao", "Declaração de comparecimento"], ["encaminhamento", "Encaminhamento"]); return t;
  }
  const vazioDoc = tipo => ({ tipo, data: hojeISO(), cons: "", ctrl: false, end: "", itens: [{ m: "", p: "", q: "" }], orient: "", exames: "", indic: "", obs: "", urg: false, rel: "", fin: "", dest: "", rc: {}, rg: "", hi: "", hf: "", enc: { para: "", dest: "", motivo: "", resumo: "" } });
  function extenso(v) {
    const un = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"], dz = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"], ce = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
    const ate999 = n => { if (n === 100) return "cem"; const s = [], c = Math.floor(n / 100), r = n % 100; if (c) s.push(ce[c]); if (r) { if (r < 20) s.push(un[r]); else { const d = Math.floor(r / 10), u = r % 10; s.push(dz[d] + (u ? " e " + un[u] : "")); } } return s.join(" e "); };
    v = Math.round(Number(v || 0) * 100) / 100; const reais = Math.floor(v), cent = Math.round((v - reais) * 100), mil = Math.floor(reais / 1000), resto = reais % 1000; let t = "";
    if (reais === 0) t = ""; else { if (mil) t += (mil === 1 ? "mil" : ate999(mil) + " mil"); if (resto) t += (mil ? (resto < 100 || resto % 100 === 0 ? " e " : " ") : "") + ate999(resto); t += reais === 1 ? " real" : (reais % 1000000 === 0 ? " de reais" : " reais"); }
    if (cent) t += (t ? " e " : "") + ate999(cent) + (cent === 1 ? " centavo" : " centavos");
    return t || "zero real";
  }

  async function viewDocumentos(ctx, corpo) {
    const { p, gestao, prof } = ctx; let pro = ctx.pro;
    const [consultas, docs] = await Promise.all([ok(sb.from("agendamentos").select("id,inicio,fim,status,valor,profissional_id,servico:servicos(nome),pagamentos(valor,forma,pago_em)").eq("paciente_id", p.id).order("inicio", { ascending: false }).limit(300)), ok(sb.from("docs_emitidos").select("*").eq("paciente_id", p.id).order("data", { ascending: false }).order("criado_em", { ascending: false }).limit(200))]);
    const profsGestao = S.profs.filter(x => x.ativo);
    if (gestao) pro = pro || profsGestao[0];
    let tipos = tiposDisponiveis(ctx, pro); if (!PR.doc[p.id] || !tipos.some(t => t[0] === PR.doc[p.id].tipo)) PR.doc[p.id] = vazioDoc(tipos[0][0]);
    const D = PR.doc[p.id];
    const consAtivas = consultas.filter(c => !String(c.status).startsWith("cancelada"));

    async function desenha() {
      pro = gestao ? (S.profs.find(x => x.id === D.pro) || profsGestao[0]) : pro; D.pro = pro && pro.id;
      tipos = tiposDisponiveis(ctx, pro);
      const reg = registroDe(pro); const medico = ehMedico(pro); const area = norm(pro && pro.area);
      let h = '<div class="note">Escolha o documento, preencha e use <b>Salvar</b> (guarda no prontuário), <b>Salvar e imprimir</b> ou <b>Baixar PDF</b>. O documento sai com a logo e as cores da ' + (ctx.emp === "atlas" ? "Atlas" : "Essência") + ', pois o paciente é da ' + (ctx.emp === "atlas" ? "Atlas" : "Essência") + ". O que você escreve aqui também é guardado automaticamente como rascunho.</div>";
      h += '<div class="row" style="margin:10px 0">' + tipos.map(([k, t]) => '<button class="btn ' + (D.tipo === k ? "btn-primary" : "btn-ghost") + '" data-tipo="' + k + '">' + E(t) + "</button>").join("") + "</div>";
      h += aviso;
      h += '<div class="two">' + (gestao ? '<div class="field"><label for="dcPro">Profissional' + (D.tipo === "recibo" ? " que fez o atendimento" : " que assina") + '</label><select id="dcPro">' + profsGestao.map(x => opt(x.id, x.nome + (registroDe(x) ? " · " + registroDe(x) : ""), x.id === (pro && pro.id))).join("") + "</select></div>" : '<div class="field"><label>Profissional</label><input value="' + E(pro ? pro.nome + (reg ? " · " + reg : "") : "") + '" disabled></div>') + '<div class="field"><label for="dcData">Data</label><input id="dcData" type="date" value="' + E(D.data) + '"></div></div>';
      if (D.tipo !== "recibo") h += '<div class="field"><label for="dcCons">Consulta (opcional): vincula o documento ao atendimento</label><select id="dcCons">' + opt("", "Sem vínculo com uma consulta", !D.cons) + consAtivas.filter(c => gestao || c.profissional_id === (pro && pro.id)).map(c => opt(c.id, fmtData(c.inicio) + " " + hhmm(c.inicio) + " · " + (c.servico ? c.servico.nome : ""), c.id === D.cons)).join("") + "</select></div>";
      if (!reg && D.tipo !== "recibo") h += '<div class="warn">Este profissional ainda não tem registro (CRP/CRM/CRN…) cadastrado. O documento só sai com o registro: peça à administração para preencher em Profissionais.</div>';
      if (D.tipo === "receita") {
        h += '<div class="field"><label for="dcCtrl">Tipo de receita</label><select id="dcCtrl">' + opt("0", "Receita simples", !D.ctrl) + opt("1", "Receita de controle especial (2 vias: farmácia e paciente)", D.ctrl) + "</select></div>";
        if (D.ctrl) h += '<div class="field"><label for="dcEnd">Endereço do paciente (exigido no controle especial)</label><input id="dcEnd" type="text" value="' + E(D.end || pacDados(p).end) + '"></div>';
        h += D.itens.map((it, i) => '<div class="sect"><div class="field"><label for="dcM' + i + '">Medicamento ' + (i + 1) + '</label><input id="dcM' + i + '" type="text" placeholder="Nome, concentração e forma (ex.: Sertralina 50 mg, comprimido)" value="' + E(it.m) + '"></div><div class="two"><div class="field"><label for="dcP' + i + '">Como usar (posologia)</label><input id="dcP' + i + '" type="text" placeholder="Ex.: 1 comprimido pela manhã, todos os dias" value="' + E(it.p) + '"></div><div class="field"><label for="dcQ' + i + '">Quantidade</label><input id="dcQ' + i + '" type="text" placeholder="Ex.: 1 caixa com 30 comprimidos" value="' + E(it.q) + '"></div></div>' + (D.itens.length > 1 ? '<div><button class="btn btn-ghost btn-sm" data-rm="' + i + '">Remover este medicamento</button></div>' : "") + "</div>").join("");
        h += '<div><button class="btn btn-ghost btn-sm" id="dcAdd">+ Adicionar medicamento</button></div><div class="field"><label for="dcOrient">Orientações (opcional)</label><textarea id="dcOrient">' + E(D.orient) + "</textarea></div>";
      } else if (D.tipo === "declaracao") {
        h += '<div class="note">Escolha a consulta acima para usar a data e o horário dela, ou preencha os horários abaixo.</div><div class="field"><label for="dcRg">RG ou documento do paciente (opcional)</label><input id="dcRg" type="text" value="' + E(D.rg) + '"></div><div class="two"><div class="field"><label for="dcHI">Horário de início</label><input id="dcHI" type="time" step="900" value="' + E(D.hi) + '"></div><div class="field"><label for="dcHF">Horário de término</label><input id="dcHF" type="time" step="900" value="' + E(D.hf) + '"></div></div>';
      } else if (D.tipo === "relatorio") {
        const modelos = /psicolog|neuropsic/.test(area) ? [["psico", "Estrutura de relatório psicológico (demanda, procedimento, análise, conclusão)"], ["atendimento", "Relatório de atendimento"]] : /fono/.test(area) ? [["fono", "Estrutura de relatório fonoaudiológico"], ["atendimento", "Relatório de atendimento"]] : medico ? [["acompanhamento", "Relatório de acompanhamento"], ["geral", "Relatório médico geral"]] : [["atendimento", "Relatório de atendimento"]];
        h += '<div class="field"><label for="dcRelModelo">Começar de uma estrutura pronta (opcional; você edita tudo)</label><select id="dcRelModelo">' + opt("", "Escolher…") + modelos.map(([k, t]) => opt(k, t)).join("") + '</select></div><div class="two"><div class="field"><label for="dcFin">Finalidade</label><input id="dcFin" type="text" placeholder="Ex.: Comprovação de tratamento junto ao plano de saúde" value="' + E(D.fin) + '"></div><div class="field"><label for="dcDest">Destinatário (opcional)</label><input id="dcDest" type="text" placeholder="Ex.: médico assistente, escola, operadora" value="' + E(D.dest) + '"></div></div><div class="field"><label for="dcRel">Relatório</label><textarea id="dcRel" style="min-height:300px" placeholder="Linhas que terminam com dois-pontos viram títulos no PDF.">' + E(D.rel) + '</textarea></div><div class="field"><label for="dcIndic">CID-10 (opcional)</label><input id="dcIndic" type="text" value="' + E(D.indic) + '"></div>';
      } else if (D.tipo === "encaminhamento") {
        h += '<div class="two"><div class="field"><label for="dcEnPara">Encaminhar para (especialidade ou serviço)</label><input id="dcEnPara" type="text" placeholder="Ex.: Psiquiatria, Neurologia, Fonoaudiologia" value="' + E(D.enc.para) + '"></div><div class="field"><label for="dcEnDest">Aos cuidados de (opcional)</label><input id="dcEnDest" type="text" value="' + E(D.enc.dest) + '"></div></div><div class="field"><label for="dcEnMotivo">Motivo do encaminhamento</label><textarea id="dcEnMotivo">' + E(D.enc.motivo) + '</textarea></div><div class="field"><label for="dcEnResumo">Resumo clínico (opcional)</label><textarea id="dcEnResumo">' + E(D.enc.resumo) + '</textarea></div><div class="field"><label for="dcIndic">CID-10 (opcional)</label><input id="dcIndic" type="text" value="' + E(D.indic) + '"></div>';
      } else if (D.tipo === "recibo") {
        const r = D.recibo = D.recibo || { pagador: p.nome, cpf: p.cpf || "", valor: "", forma: "pix", dataPag: hojeISO(), sel: [], obs: "" };
        const elegiveis = consAtivas.filter(c => c.status !== "faltou");
        h += '<div class="two"><div class="field"><label for="rcNome">Nome do pagador (pode ser diferente do paciente)</label><input id="rcNome" type="text" value="' + E(r.pagador) + '"></div><div class="field"><label for="rcCpf">CPF do pagador</label><input id="rcCpf" type="text" inputmode="numeric" placeholder="000.000.000-00" value="' + E(r.cpf) + '"></div></div>';
        h += '<div class="lbl" style="margin-top:6px">Sessões cobertas por este valor (marque as datas)</div><div class="sect" style="max-height:260px;overflow:auto">' + (elegiveis.length ? elegiveis.map(c => '<label class="chk" style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-ses="' + E(c.id) + '"' + (r.sel.includes(c.id) ? " checked" : "") + '> <span><b>' + E(fmtData(c.inicio)) + "</b> às " + E(hhmm(c.inicio)) + " · " + (c.servico ? "<b>" + E(c.servico.nome) + "</b>" : '<span class="chip faltou">sem serviço no agendamento</span>') + " · " + E(profNome(c.profissional_id)) + " · " + E(brl(c.valor)) + " · " + E(STATUS[c.status] || c.status) + ((c.pagamentos || []).length ? " · pago" : "") + "</span></label>").join("") : '<div class="muted">Este paciente não tem sessões lançadas.</div>') + "</div>";
        h += '<div class="three"><div class="field"><label for="rcValor">Valor recebido (R$)</label><input id="rcValor" type="number" step="0.01" value="' + E(r.valor) + '"></div><div class="field"><label for="rcForma">Forma de pagamento</label><select id="rcForma">' + Object.entries(FORMAS).map(([k, t]) => opt(t, t, FORMAS[r.forma] === t || r.forma === t)).join("") + '</select></div><div class="field"><label for="rcData">Data do pagamento</label><input id="rcData" type="date" value="' + E(r.dataPag) + '"></div></div><div class="field"><label for="rcObs">Observações (opcional)</label><input id="rcObs" type="text" value="' + E(r.obs) + '"></div><div class="note">O profissional que fez o atendimento é escolhido acima; o recibo mostra o nome e o registro dele, o pagador e as datas das sessões.</div>';
      } else if (D.tipo === "risco") {
        const rc = D.rc || {}, lee = rc.lee || [], sl = (id, rot, arr, cur) => '<div class="field"><label for="' + id + '">' + rot + '</label><select id="' + id + '">' + opt("", "Escolher…") + arr.map(x => opt(x, x, cur === x)).join("") + "</select></div>", ta = (id, rot, v, hh) => '<div class="field"><label for="' + id + '">' + rot + '</label><textarea id="' + id + '" style="min-height:' + (hh || 70) + 'px">' + E(v || "") + "</textarea></div>";
        h += '<div class="note">Avaliação de risco cirúrgico. O parecer e a classificação de risco são sempre decisão do(a) médico(a); o sistema só organiza as informações e conta os pontos do índice de Lee.</div><div class="field"><label for="dcRProc">Procedimento proposto</label><input id="dcRProc" type="text" value="' + E(rc.proc || "") + '"></div><div class="two"><div class="field"><label for="dcRCir">Cirurgião, equipe ou hospital (opcional)</label><input id="dcRCir" type="text" value="' + E(rc.cir || "") + '"></div><div class="field"><label for="dcRAnest">Anestesia prevista (opcional)</label><input id="dcRAnest" type="text" value="' + E(rc.anest || "") + '"></div></div><div class="three">' + sl("dcRPorte", "Porte da cirurgia", ["Pequeno", "Médio", "Grande"], rc.porte) + sl("dcRCar", "Caráter", ["Eletiva", "Urgência"], rc.carater) + sl("dcRCap", "Capacidade funcional", ["Ruim: menos de 4 METs", "Moderada: 4 a 6 METs", "Boa: 7 a 10 METs", "Excelente: mais de 10 METs", "Não avaliada"], rc.cap) + "</div>" +
          ta("dcRQ", "Queixas cardiovasculares", rc.q, 50) + ta("dcRAntec", "Antecedentes e comorbidades", rc.antec, 80) + ta("dcRAl", "Alergias", rc.al, 50) + ta("dcRMed", "Medicações em uso", rc.med, 70) + '<div class="two"><div class="field"><label for="dcRPA">PA (mmHg)</label><input id="dcRPA" type="text" value="' + E(rc.pa || "") + '"></div><div class="field"><label for="dcRFC">FC (bpm)</label><input id="dcRFC" type="text" value="' + E(rc.fc || "") + '"></div></div>' + ta("dcRFis", "Exame físico", rc.fis, 120) + ta("dcREx", "Exames complementares", rc.ex, 80) +
          '<div class="lbl">Índice de risco cardíaco revisado (Lee): marque o que estiver presente</div><div style="display:flex;flex-direction:column;gap:6px">' + PDFDOC.DOC_LEE.map((t, i) => '<label class="chk"><input type="checkbox" id="dcRL' + i + '"' + (lee[i] ? " checked" : "") + '> <span style="font-weight:600">' + E(t) + "</span></label>").join("") + '</div><div class="two"><div class="field"><label for="dcRAcp">ACP (risco estimado)</label><input id="dcRAcp" type="text" value="' + E(rc.acp || "") + '"></div><div class="field"><label for="dcRLeeP">LEE (risco estimado)</label><input id="dcRLeeP" type="text" value="' + E(rc.leip || "") + '"></div></div><div class="two">' + sl("dcRRisco", "Risco cardiovascular perioperatório", ["Baixo", "Intermediário", "Alto"], rc.risco) + sl("dcRParecer", "Parecer", ["Apto para o procedimento proposto", "Apto para o procedimento proposto, com as recomendações abaixo", "Necessária avaliação adicional antes do procedimento", "Risco elevado: recomenda-se discussão com a equipe cirúrgica e anestésica"], rc.parecer) + "</div>" + ta("dcRRec", "Recomendações perioperatórias", rc.rec, 90) + '<div class="field"><label for="dcRVal">Validade da avaliação (opcional)</label><input id="dcRVal" type="text" value="' + E(rc.val || "") + '"></div>' + ta("dcRObs", "Observações (opcional)", rc.obs, 60) + '<div class="field"><label for="dcIndic">CID-10 (opcional)</label><input id="dcIndic" type="text" value="' + E(D.indic) + '"></div>';
      } else { // exames
        const mk = medico ? norm(pro.area).replace(/.*(cardio|neuro|psiquiat|ginec).*/, "$1") : "", ordem = ["cardiologia", "neurologia", "psiquiatria", "ginecologia", "geral"], nomes = { cardiologia: "Cardiologia", neurologia: "Neurologia", psiquiatria: "Psiquiatria", ginecologia: "Ginecologia", geral: "Check-up geral" };
        h += '<div class="field"><label for="dcModelo">Adicionar uma lista pronta (sugestões que você pode editar)</label><select id="dcModelo">' + opt("", "Escolher…") + ordem.map(k => opt(k, nomes[k] + (norm(nomes[k]).startsWith(mk) && mk ? " (da especialidade do profissional)" : ""))).join("") + '</select></div><div class="field"><label for="dcExames">Exames solicitados (um por linha)</label><textarea id="dcExames" style="min-height:130px">' + E(D.exames) + '</textarea></div><div class="field"><label for="dcIndic">Indicação clínica / CID-10 (opcional)</label><input id="dcIndic" type="text" value="' + E(D.indic) + '"></div><div class="field"><label for="dcObs">Observações (opcional)</label><textarea id="dcObs">' + E(D.obs) + '</textarea></div><label class="chk"><input type="checkbox" id="dcUrg"' + (D.urg ? " checked" : "") + "> Marcar como urgente</label>";
      }
      h += '<div class="row" style="margin-top:14px"><button class="btn btn-primary" id="dcSalvar" style="flex:1">Salvar</button><button class="btn btn-primary" id="dcSalvImp" style="flex:1;filter:brightness(.92)">Salvar e imprimir</button><button class="btn btn-ghost" id="dcPdf" style="flex:1">Baixar PDF</button><button class="btn btn-ghost" id="dcLimpar">Limpar</button></div><div id="dcLista"></div>';
      $("docForm").innerHTML = h; ligar(); lista();
    }
    function ler() {
      if (!$("dcData")) return D;
      D.data = V("dcData") || hojeISO(); if ($("dcPro")) D.pro = V("dcPro"); if ($("dcCons")) D.cons = V("dcCons");
      if (D.tipo === "receita") { D.ctrl = V("dcCtrl") === "1"; if ($("dcEnd")) D.end = V("dcEnd"); D.itens = D.itens.map((it, i) => ({ m: V("dcM" + i), p: V("dcP" + i), q: V("dcQ" + i) })); D.orient = V("dcOrient"); }
      else if (D.tipo === "declaracao") { D.rg = V("dcRg"); D.hi = V("dcHI"); D.hf = V("dcHF"); }
      else if (D.tipo === "relatorio") { D.fin = V("dcFin"); D.dest = V("dcDest"); D.rel = V("dcRel"); D.indic = V("dcIndic"); }
      else if (D.tipo === "encaminhamento") { D.enc = { para: V("dcEnPara"), dest: V("dcEnDest"), motivo: V("dcEnMotivo"), resumo: V("dcEnResumo") }; D.indic = V("dcIndic"); }
      else if (D.tipo === "recibo") { const sel = [...document.querySelectorAll("[data-ses]")].filter(c => c.checked).map(c => c.dataset.ses); D.recibo = { pagador: V("rcNome"), cpf: V("rcCpf"), valor: V("rcValor"), forma: V("rcForma"), dataPag: V("rcData"), sel, obs: V("rcObs") }; }
      else if (D.tipo === "risco") { const lee = []; for (let i = 0; i < 6; i++) lee.push(!!($("dcRL" + i) && $("dcRL" + i).checked)); const g = id => V(id); D.rc = { proc: g("dcRProc"), cir: g("dcRCir"), anest: g("dcRAnest"), porte: g("dcRPorte"), carater: g("dcRCar"), cap: g("dcRCap"), q: g("dcRQ"), antec: g("dcRAntec"), al: g("dcRAl"), med: g("dcRMed"), pa: g("dcRPA"), fc: g("dcRFC"), fis: g("dcRFis"), ex: g("dcREx"), lee, acp: g("dcRAcp"), leip: g("dcRLeeP"), risco: g("dcRRisco"), parecer: g("dcRParecer"), rec: g("dcRRec"), val: g("dcRVal"), obs: g("dcRObs") }; D.indic = V("dcIndic"); }
      else { D.exames = V("dcExames"); D.indic = V("dcIndic"); D.obs = V("dcObs"); D.urg = !!($("dcUrg") && $("dcUrg").checked); }
      return D;
    }
    // monta o documento pronto para o PDF (e para guardar no prontuário)
    function montar() {
      const d = ler(), pr = gestao ? S.profs.find(x => x.id === d.pro) : pro; if (!pr) throw new Error("Escolha o profissional.");
      const doc = { tipo: d.tipo, empresa: ctx.emp, data: d.data, ctrl: !!d.ctrl, pac: Object.assign(pacDados(p), { end: d.end || pacDados(p).end }), pro: proDados(pr), itens: (d.itens || []).filter(i => String(i.m || "").trim()), orient: d.orient, exames: d.exames, indic: d.indic, obs: d.obs, urg: d.urg, rel: d.rel, fin: d.fin, dest: d.dest, rc: d.rc || {}, rg: d.rg, enc: d.enc || {} };
      const kc = d.cons ? consultas.find(c => c.id === d.cons) : null;
      doc.decl = kc ? { data: diaDe(kc.inicio), hi: hhmm(kc.inicio), hf: hhmm(kc.fim) } : { data: d.data, hi: d.hi, hf: d.hf };
      if (d.tipo === "recibo") {
        const r = d.recibo || {}, ses = consultas.filter(c => (r.sel || []).includes(c.id)).sort((a, b) => new Date(a.inicio) - new Date(b.inicio)), valor = Number(r.valor) || 0;
        if (!ses.length) throw new Error("Marque ao menos uma sessão coberta pelo recibo."); if (!(valor > 0)) throw new Error("Informe o valor recebido."); if (!String(r.pagador || "").trim()) throw new Error("Informe o nome do pagador.");
        doc.recibo = { pagador: { nome: r.pagador, cpf: r.cpf }, valor, extenso: extenso(valor), forma: r.forma, dataPag: r.dataPag, sessoes: ses.map(c => ({ data: diaDe(c.inicio), hora: hhmm(c.inicio), servico: c.servico ? c.servico.nome : "" })), servico: [...new Set(ses.map(c => c.servico && c.servico.nome).filter(Boolean))].join(" / "), servicos: Object.entries(ses.reduce((m, c) => { const n = c.servico ? c.servico.nome : "serviço não informado"; m[n] = (m[n] || 0) + 1; return m; }, {})).map(([nome, qtd]) => ({ nome, qtd })), obs: r.obs };
      }
      return doc;
    }
    function valida(doc) {
      if (doc.tipo !== "recibo" && !doc.pro.registro) throw new Error("O profissional não tem registro cadastrado (CRP/CRM/CRN…). Peça à administração para preencher em Profissionais.");
      if (doc.tipo === "recibo") { const sem = (doc.recibo.sessoes || []).filter(s => !s.servico); if (sem.length) throw new Error("Falta o serviço no agendamento de " + sem.map(s => dbr2(s.data)).join(", ") + ". Abra o agendamento na Agenda, informe o serviço e emita o recibo de novo."); }
      if (doc.tipo === "receita" && !doc.itens.length) throw new Error("Informe ao menos um medicamento.");
      if (doc.tipo === "exames" && !String(doc.exames).trim()) throw new Error("Informe ao menos um exame.");
      if (doc.tipo === "relatorio" && !String(doc.rel).trim()) throw new Error("Escreva o relatório.");
      if (doc.tipo === "declaracao" && !(doc.decl.hi && doc.decl.hf) && !D.cons) throw new Error("Escolha a consulta ou informe o horário de início e de término.");
      if (doc.tipo === "encaminhamento" && !String(doc.enc.para || "").trim()) throw new Error("Informe para quem é o encaminhamento.");
      if (doc.tipo === "risco" && !(doc.rc.proc && doc.rc.parecer)) throw new Error("Informe o procedimento proposto e o parecer.");
    }
    async function salvarDoc() {
      const doc = montar(); valida(doc);
      if (doc.tipo === "recibo") { const n = await sb.from("docs_emitidos").select("id", { count: "exact", head: true }).eq("tipo", "recibo"); doc.recibo.numero = new Date().getFullYear() + "-" + String((n.count || 0) + 1).padStart(4, "0"); }
      await ok(sb.from("docs_emitidos").insert({ paciente_id: p.id, profissional_id: gestao ? D.pro : pro.id, empresa_id: p.empresa_id, tipo: doc.tipo, data: doc.data, agendamento_id: D.cons || null, dados: doc }));
      if (prof) { try { await sb.from("rascunhos").delete().eq("paciente_id", p.id).eq("profissional_id", pro.id).eq("chave", "doc:" + D.tipo); } catch (e) {} }
      try { localStorage.removeItem("pr-doc-" + p.id + "-" + D.tipo); } catch (e) {}
      return doc;
    }
    function ligar() {
      document.querySelectorAll("[data-tipo]").forEach(b => b.onclick = () => { ler(); const novo = vazioDoc(b.dataset.tipo); novo.pro = D.pro; PR.doc[p.id] = Object.assign(D, novo); desenha(); restauraRascunho(); });
      document.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => { ler(); D.itens.splice(+b.dataset.rm, 1); desenha(); });
      if ($("dcAdd")) $("dcAdd").onclick = () => { ler(); D.itens.push({ m: "", p: "", q: "" }); desenha(); };
      if ($("dcCtrl")) $("dcCtrl").onchange = () => { ler(); desenha(); };
      if ($("dcPro")) $("dcPro").onchange = () => { ler(); desenha(); };
      if ($("dcCons")) $("dcCons").onchange = () => { ler(); const c = consultas.find(x => x.id === D.cons); if (c) { $("dcData").value = diaDe(c.inicio); if ($("dcHI")) { $("dcHI").value = hhmm(c.inicio); $("dcHF").value = hhmm(c.fim); } } };
      if ($("dcRelModelo")) $("dcRelModelo").onchange = () => { const m = REL_MODELOS[V("dcRelModelo")]; if (m && (!V("dcRel").trim() || confirm("Substituir o texto atual pela estrutura escolhida?"))) { $("dcRel").value = m; $("dcRel").dispatchEvent(new Event("input", { bubbles: true })); } };
      if ($("dcModelo")) $("dcModelo").onchange = () => { const l = EXAMES[V("dcModelo")]; if (l) { const atual = V("dcExames").split(/\r?\n/).map(x => x.trim()).filter(Boolean); $("dcExames").value = [...atual, ...l.filter(x => !atual.includes(x))].join("\n"); $("dcModelo").value = ""; $("dcExames").dispatchEvent(new Event("input", { bubbles: true })); } };
      document.querySelectorAll("[data-ses]").forEach(c => c.onchange = () => { const sel = [...document.querySelectorAll("[data-ses]")].filter(x => x.checked).map(x => x.dataset.ses), soma = consultas.filter(x => sel.includes(x.id)).reduce((s, x) => s + Number(x.valor || 0), 0); if (soma > 0) $("rcValor").value = soma.toFixed(2); const prim = consultas.filter(x => sel.includes(x.id))[0]; if (prim && $("dcPro")) { $("dcPro").value = prim.profissional_id; } });
      $("dcSalvar").onclick = async () => { try { const d = await salvarDoc(); toast("Documento salvo no prontuário."); PR.doc[p.id] = vazioDoc(D.tipo); PR.doc[p.id].pro = D.pro; Object.keys(D).forEach(k => delete D[k]); Object.assign(D, PR.doc[p.id]); desenha(); } catch (e) { toast(e.message, true); } };
      $("dcSalvImp").onclick = async () => { try { const d = await salvarDoc(); const b = await PDFDOC.gerar(d); toast("Salvo. Abrindo a impressão…"); PDFDOC.imprimir(b); const tipo = D.tipo; PR.doc[p.id] = vazioDoc(tipo); PR.doc[p.id].pro = D.pro; Object.keys(D).forEach(k => delete D[k]); Object.assign(D, PR.doc[p.id]); desenha(); } catch (e) { toast(e.message, true); } };
      $("dcPdf").onclick = async () => { try { const d = montar(); valida(d); PDFDOC.baixar(await PDFDOC.gerar(d), PDFDOC.nomeArq(d)); toast("PDF pronto."); } catch (e) { toast(e.message, true); } };
      $("dcLimpar").onclick = async () => { if (!confirm("Limpar o formulário?")) return; const tipo = D.tipo, pr = D.pro; Object.keys(D).forEach(k => delete D[k]); Object.assign(D, vazioDoc(tipo)); D.pro = pr; if (prof) { try { await sb.from("rascunhos").delete().eq("paciente_id", p.id).eq("profissional_id", pro.id).eq("chave", "doc:" + tipo); } catch (e) {} } desenha(); };
      // salvamento automático do rascunho (só profissionais): a cada alteração
      if (prof) { if (PR.asDoc) PR.asDoc.parar(); PR.asDoc = autoSalvar($("docForm"), async () => { const d = ler(); const copia = JSON.parse(JSON.stringify(d)); await ok(sb.from("rascunhos").upsert({ profissional_id: pro.id, paciente_id: p.id, chave: "doc:" + d.tipo, dados: copia, atualizado_em: new Date().toISOString() }, { onConflict: "profissional_id,paciente_id,chave" })); }, "doc-" + p.id + "-" + D.tipo, () => ler()); }
    }
    async function restauraRascunho() {
      if (!prof) return; let rasc = null;
      try { const r = await sb.from("rascunhos").select("dados,atualizado_em").eq("paciente_id", p.id).eq("profissional_id", pro.id).eq("chave", "doc:" + D.tipo).maybeSingle(); rasc = r.data; } catch (e) {}
      const bk = lerBackup("doc-" + p.id + "-" + D.tipo); let dados = rasc && rasc.dados;
      if (bk && bk.dados && (!rasc || bk.em > new Date(rasc.atualizado_em).getTime())) dados = bk.dados;
      if (dados && JSON.stringify(dados) !== JSON.stringify(Object.assign({}, vazioDoc(D.tipo), { pro: D.pro, data: D.data }))) { const pr = D.pro; Object.keys(D).forEach(k => delete D[k]); Object.assign(D, vazioDoc(D.tipo), dados); D.pro = pr || dados.pro; await desenha(); const st = $("asStatus"); if (st) st.textContent = "Rascunho recuperado (salvo automaticamente)."; }
    }
    function lista() {
      const el = $("dcLista"); if (!el) return;
      const nomeDoc = d => PDFDOC.titulo(d);
      el.innerHTML = docs.length ? '<div class="lbl" style="margin:16px 0 8px">Documentos salvos neste prontuário</div><div class="tbl">' + docs.map(x => { const d = x.dados || {}; const res = x.tipo === "recibo" ? (d.recibo ? "R$ " + Number(d.recibo.valor).toFixed(2).replace(".", ",") + " · " + (d.recibo.sessoes || []).length + " sessão(ões) · pagador " + (d.recibo.pagador && d.recibo.pagador.nome || "") : "") : x.tipo === "declaracao" ? "Esteve em consulta em " + fmtData((d.decl && d.decl.data || x.data) + "T12:00:00-04:00") : x.tipo === "receita" ? (d.itens || []).map(m => m.m).join("; ") : x.tipo === "exames" ? String(d.exames || "").split(/\r?\n/).filter(Boolean).slice(0, 3).join("; ") : String(d.rel || (d.enc && d.enc.motivo) || "").replace(/\s+/g, " ").slice(0, 120);
        return '<div class="tr" style="grid-template-columns:84px minmax(0,1fr);min-width:0;align-items:start"><div>' + E(fmtData(x.data + "T12:00:00-04:00")) + '</div><div><div class="name">' + E(nomeDoc(d)) + (d.urg ? ' <span class="chip warn">urgente</span>' : "") + '</div><div class="meta">' + E(nomeCurto(profNome(x.profissional_id)) || (d.pro && d.pro.nome) || "") + (res ? " · " + E(res.length > 140 ? res.slice(0, 140) + "…" : res) : "") + '</div><div class="row" style="margin-top:8px"><button class="btn btn-ghost btn-sm" data-imp="' + E(x.id) + '">Imprimir</button><button class="btn btn-ghost btn-sm" data-dl="' + E(x.id) + '">Baixar PDF</button>' + (prof ? '<button class="btn btn-ghost btn-sm" data-uso="' + E(x.id) + '">Usar como modelo</button>' : "") + (prof || ehAdmin() ? '<button class="btn btn-ghost btn-sm" data-del="' + E(x.id) + '">Excluir</button>' : "") + "</div></div></div>"; }).join("") + "</div>" : '<div class="note" style="margin-top:12px">Nenhum documento salvo ainda.</div>';
      const achar = id => docs.find(x => x.id === id);
      el.querySelectorAll("[data-imp]").forEach(b => b.onclick = async () => { try { PDFDOC.imprimir(await PDFDOC.gerar(achar(b.dataset.imp).dados)); } catch (e) { toast(e.message, true); } });
      el.querySelectorAll("[data-dl]").forEach(b => b.onclick = async () => { try { const d = achar(b.dataset.dl).dados; PDFDOC.baixar(await PDFDOC.gerar(d), PDFDOC.nomeArq(d)); } catch (e) { toast(e.message, true); } });
      el.querySelectorAll("[data-uso]").forEach(b => b.onclick = () => { const x = achar(b.dataset.uso).dados; const n = Object.assign(vazioDoc(x.tipo), { pro: D.pro, rel: x.rel, fin: x.fin, dest: x.dest, rc: x.rc, rg: x.rg, itens: (x.itens && x.itens.length) ? x.itens : [{ m: "", p: "", q: "" }], orient: x.orient, exames: x.exames, indic: x.indic, obs: x.obs, urg: x.urg, ctrl: x.ctrl, enc: x.enc || {} }); Object.keys(D).forEach(k => delete D[k]); Object.assign(D, n); desenha(); toast("Carregado no formulário, com a data de hoje."); });
      el.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => { if (!confirm("Excluir este documento do prontuário?")) return; try { await ok(sb.from("docs_emitidos").delete().eq("id", b.dataset.del)); toast("Excluído."); PR.reabrir && PR.reabrir(); } catch (e) { toast(e.message, true); } });
    }
    corpo.innerHTML = '<div id="docForm"></div>'; await desenha(); await restauraRascunho();
  }

  // ================= TELA =================
  window.prontuario = async function (p) {
    const ctx = contexto(p), wrap = document.createElement("div"), corpo = document.createElement("div");
    const abas = [["anamnese", "Anamnese"], ["relatos", "Relatos de sessão"], ["docs", "Documentos"]];
    const bar = document.createElement("div"); bar.className = "subtabs";
    const mostra = async tab => { PR.tab = tab; if (PR.asDoc) { PR.asDoc.parar(); PR.asDoc = null; } bar.querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.t === tab)); corpo.innerHTML = '<div class="empty">Carregando…</div>'; try { if (tab === "anamnese") await viewAnamnese(ctx, corpo); else if (tab === "relatos") await viewRelatos(ctx, corpo); else await viewDocumentos(ctx, corpo); } catch (e) { console.error(e); corpo.innerHTML = '<div class="warn">Erro: ' + E(e.message) + "</div>"; } };
    PR.reabrir = () => mostra(PR.tab);
    abas.forEach(([k, t]) => { const b = document.createElement("button"); b.className = "subtab"; b.dataset.t = k; b.textContent = t; b.onclick = () => mostra(k); bar.append(b); });
    wrap.append(bar, corpo); setTimeout(() => mostra(PR.tab), 0); return wrap;
  };
})();
