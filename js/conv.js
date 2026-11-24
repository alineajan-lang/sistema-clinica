// Conversas do WhatsApp (API oficial da Meta). Só administração e recepção.
// As mensagens chegam sozinhas pela função "whatsapp-webhook" e ficam nas tabelas wa_contatos e wa_mensagens.
const CV_ETAPAS = [["novo", "Novo"], ["contato", "Em contato"], ["agendado", "Agendado"], ["paciente", "Virou paciente"], ["perdido", "Perdido"]];
const CV_TIPOS = { image: "Foto", audio: "Áudio", video: "Vídeo", document: "Documento", sticker: "Figurinha", location: "Localização", contacts: "Contato", reaction: "Reação" };
let CV_TIMER = null;

// DDD + 8 últimos dígitos: o mesmo celular com ou sem o nono dígito (igual à função do banco)
function cvChave(t) {
  let d = String(t || "").replace(/\D/g, "");
  if (/^55/.test(d) && (d.length === 12 || d.length === 13)) d = d.slice(2);
  if (/^0/.test(d)) d = d.slice(1);
  return d.length === 10 || d.length === 11 ? d.slice(0, 2) + d.slice(-8) : null;
}
function cvTelefone(waId) {
  let d = String(waId || "").replace(/\D/g, "");
  if (/^55/.test(d) && d.length >= 12) d = d.slice(2); else return "+" + d;
  const ddd = d.slice(0, 2); let r = d.slice(2);
  if (r.length === 8 && /^[6-9]/.test(r)) r = "9" + r; // celular salvo pela Meta sem o nono dígito
  return "(" + ddd + ") " + (r.length === 9 ? r.slice(0, 5) + "-" + r.slice(5) : r.slice(0, 4) + "-" + r.slice(4));
}
const cvNome = c => (c.paciente && c.paciente.nome) || c.nome_perfil || cvTelefone(c.wa_id);
const cvEtapa = e => (CV_ETAPAS.find(x => x[0] === e) || [e, e])[1];
const cvPrevia = m => !m ? "" : (m.tipo !== "text" ? "📎 " + (CV_TIPOS[m.tipo] || "Anexo") + (m.texto ? ": " : "") : "") + (m.texto || "");
function cvQuando(d) {
  if (!d) return "";
  const dia = diaDe(d), hoje = hojeISO();
  if (dia === hoje) return fmtHora(d);
  if (dia === addDias(hoje, -1)) return "Ontem";
  return fmtData(d).slice(0, 5);
}

async function cvCandidatos(waId) {
  const chave = cvChave(waId); if (!chave) return [];
  const { data } = await sb.from("pacientes").select("id,nome,telefone,ativo,empresa_id,nascimento").ilike("telefone", "%" + chave.slice(-4) + "%").limit(50);
  return (data || []).filter(p => cvChave(p.telefone) === chave).sort((a, b) => Number(b.ativo) - Number(a.ativo));
}

async function cvVincular(c, pacienteId) {
  await ok(sb.from("wa_contatos").update({ paciente_id: pacienteId, vinculo_ambiguo: false }).eq("id", c.id));
  toast(pacienteId ? "Conversa ligada à ficha." : "Ligação com a ficha removida."); rota();
}
function cvEscolherFicha(c) {
  const b = buscaPaciente();
  modal("Ligar conversa a uma ficha", h("div", {}, h("p", { class: "small muted" }, "Procure o paciente pelo nome. A conversa passa a aparecer com o nome da ficha."), b.el),
    [{ t: "Cancelar" }, { t: "Ligar", p: 1, f: async () => { const p = b.get(); if (!p) { toast("Escolha um paciente da lista.", true); return false; } await cvVincular(c, p.id); } }]);
}

async function vConversas(q) {
  if (!ehGestao()) return vazio("Esta tela é da administração e da recepção.");
  clearTimeout(CV_TIMER);
  const selId = q.get("c") || "", filtro = q.get("f") || "todas", busca = q.get("q") || "";
  const go = novo => { const p = new URLSearchParams({ c: selId, f: filtro, q: busca }); Object.entries(novo || {}).forEach(([k, v]) => p.set(k, v)); [...p.keys()].forEach(k => { if (!p.get(k) || (k === "f" && p.get(k) === "todas")) p.delete(k); }); location.hash = "#/conversas" + (p.toString() ? "?" + p : ""); };

  const [contatos, recentes] = await Promise.all([
    ok(sb.from("wa_contatos").select("id,wa_id,nome_perfil,paciente_id,vinculo_ambiguo,etapa,nao_lidas,ultima_mensagem_em,paciente:pacientes(id,nome,empresa_id)").order("ultima_mensagem_em", { ascending: false, nullsFirst: false }).limit(300)),
    ok(sb.from("wa_mensagens").select("contato_id,tipo,texto,enviada_em").order("enviada_em", { ascending: false }).limit(600))
  ]);
  const ultima = {}; recentes.forEach(m => { if (!ultima[m.contato_id]) ultima[m.contato_id] = m; });
  const naoLidas = contatos.reduce((s, c) => s + (c.nao_lidas || 0), 0);
  const semFicha = contatos.filter(c => !c.paciente_id).length;

  let lista = contatos;
  if (filtro === "naolidas") lista = lista.filter(c => c.nao_lidas > 0);
  else if (filtro === "semficha") lista = lista.filter(c => !c.paciente_id);
  else if (filtro.startsWith("e:")) lista = lista.filter(c => c.etapa === filtro.slice(2));
  if (busca) { const b = semAcento(busca), dig = busca.replace(/\D/g, ""); lista = lista.filter(c => semAcento(cvNome(c)).includes(b) || (dig.length >= 4 && String(c.wa_id).includes(dig))); }

  // ---- lista de conversas ----
  const inBusca = h("input", { placeholder: "Buscar nome ou telefone…", value: busca, onkeydown: e => e.key === "Enter" && go({ q: e.target.value, c: "" }) });
  const selF = sel([["todas", "Todas"], ["naolidas", "Não lidas"], ["semficha", "Sem ficha"]].concat(CV_ETAPAS.map(([k, t]) => ["e:" + k, "Etapa: " + t])), filtro, { onchange: e => go({ f: e.target.value, c: "" }) });
  const itens = lista.map(c => {
    const m = ultima[c.id];
    return h("button", { class: "cv-item" + (c.id === selId ? " on" : "") + (c.nao_lidas ? " nl" : ""), onclick: () => go({ c: c.id }) },
      h("div", { class: "cv-l1" }, h("b", { class: "cv-nome" }, cvNome(c)), h("span", { class: "cv-hora" }, cvQuando(c.ultima_mensagem_em))),
      h("div", { class: "cv-l2" }, h("span", { class: "cv-prev" }, cvPrevia(m)), c.nao_lidas > 0 && h("span", { class: "cv-bolha" }, c.nao_lidas)),
      h("div", { class: "cv-l3" }, h("span", { class: "chip" }, cvEtapa(c.etapa)), !c.paciente_id && h("span", { class: "chip rosa" }, c.vinculo_ambiguo ? "Escolher ficha" : "Sem ficha")));
  });
  const painelLista = h("div", { class: "cv-lista" },
    h("div", { class: "cv-filtros" }, inBusca, selF),
    itens.length ? h("div", { class: "cv-itens" }, itens) : vazio(contatos.length ? "Nenhuma conversa neste filtro." : "Ainda não chegou nenhuma mensagem."));

  // ---- conversa aberta ----
  let painelChat = h("div", { class: "cv-chat cv-vazio" }, vazio("Escolha uma conversa."));
  const c = contatos.find(x => x.id === selId);
  if (c) {
    const msgs = await ok(sb.from("wa_mensagens").select("id,direcao,tipo,texto,status,enviada_em").eq("contato_id", c.id).order("enviada_em").limit(500));
    if (c.nao_lidas > 0) { await ok(sb.from("wa_contatos").update({ nao_lidas: 0 }).eq("id", c.id)); c.nao_lidas = 0; }
    const selEtapa = sel(CV_ETAPAS, c.etapa, { class: "cv-etapa", onchange: async e => { await ok(sb.from("wa_contatos").update({ etapa: e.target.value }).eq("id", c.id)); toast("Etapa: " + cvEtapa(e.target.value) + "."); } });
    const ficha = c.paciente_id
      ? h("div", { class: "row" }, h("a", { class: "btn btn-s", href: "#/paciente/" + c.paciente_id }, "Abrir ficha"), h("button", { class: "btn-s", onclick: () => cvEscolherFicha(c) }, "Trocar ficha"), h("button", { class: "btn-s", onclick: () => cvVincular(c, null) }, "Desligar"))
      : h("div", { class: "row" }, h("button", { class: "btn-s btn-p", onclick: () => cvEscolherFicha(c) }, "Ligar a uma ficha"));
    const aviso = h("div");
    if (!c.paciente_id && c.vinculo_ambiguo) {
      const cands = await cvCandidatos(c.wa_id);
      if (cands.length) aviso.append(h("div", { class: "warn" }, h("div", {}, "Este telefone aparece em " + cands.length + " cadastros. Escolha a ficha certa:"),
        h("div", { class: "row", style: "margin-top:6px" }, cands.map(p => h("button", { class: "btn-s", onclick: () => cvVincular(c, p.id) }, p.nome + (p.ativo ? "" : " (inativo)") + (p.nascimento ? " · " + idade(p.nascimento) : ""))))));
    }
    const bolhas = msgs.map((m, i) => {
      const dia = diaDe(m.enviada_em), novoDia = i === 0 || diaDe(msgs[i - 1].enviada_em) !== dia;
      const rotulo = m.tipo !== "text" ? h("div", { class: "cv-anexo" }, "📎 " + (CV_TIPOS[m.tipo] || m.tipo)) : null;
      return [novoDia && h("div", { class: "cv-dia" }, dia === hojeISO() ? "Hoje" : fmtData(m.enviada_em)),
        h("div", { class: "cv-msg " + (m.direcao === "saida" ? "out" : "in") }, rotulo, m.texto && h("div", { class: "cv-txt" }, m.texto), h("div", { class: "cv-meta" }, fmtHora(m.enviada_em)))];
    });
    const corpo = h("div", { class: "cv-corpo" }, bolhas.length ? bolhas : vazio("Sem mensagens."));
    painelChat = h("div", { class: "cv-chat" },
      h("div", { class: "cv-topo" },
        h("button", { class: "cv-voltar btn-s", onclick: () => go({ c: "" }), "aria-label": "Voltar para a lista" }, "← Conversas"),
        h("div", { class: "grow" }, h("div", { class: "cv-titulo" }, cvNome(c)), h("div", { class: "small muted" }, cvTelefone(c.wa_id) + (c.paciente && c.nome_perfil ? " · WhatsApp: " + c.nome_perfil : ""))),
        selEtapa),
      h("div", { class: "cv-acoes" }, ficha), aviso, corpo,
      h("div", { class: "cv-rodape small muted" }, "Para responder, use o WhatsApp por enquanto. Responder por aqui será liberado quando o número brasileiro estiver conectado."));
    setTimeout(() => { corpo.scrollTop = corpo.scrollHeight; }, 0);
  }

  // ---- atualização automática a cada 30 s (só redesenha se chegou algo novo e ninguém está digitando) ----
  const vigiar = () => { CV_TIMER = setTimeout(async () => {
    if (!location.hash.startsWith("#/conversas")) return;
    const digitando = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (document.visibilityState !== "visible" || digitando || document.querySelector(".mask")) return vigiar();
    const { data } = await sb.from("wa_contatos").select("id,ultima_mensagem_em,nao_lidas").order("ultima_mensagem_em", { ascending: false, nullsFirst: false }).limit(300);
    const nova = (data || []).map(x => x.id + ":" + x.ultima_mensagem_em + ":" + (x.id === selId ? 0 : x.nao_lidas)).join("|");
    const atual = contatos.map(x => x.id + ":" + x.ultima_mensagem_em + ":" + (x.id === selId ? 0 : x.nao_lidas)).join("|");
    if (data && nova !== atual) rota(); else vigiar();
  }, 30000); };
  vigiar();

  return h("div", {},
    h("div", { class: "card" }, h("div", { class: "row" }, h("h1", { class: "grow" }, "Conversas"), h("button", { onclick: () => rota() }, "↻ Atualizar")),
      h("div", { class: "small muted" }, "Mensagens do WhatsApp da clínica, recebidas automaticamente. Visível só para a administração e a recepção."),
      h("div", { class: "kpis", style: "margin:10px 0 0" }, kpi("Conversas", contatos.length), kpi("Não lidas", naoLidas), kpi("Sem ficha", semFicha))),
    h("div", { class: "card cv" + (c ? " cv-sel" : "") }, painelLista, painelChat));
}
