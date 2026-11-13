// Sistema Clínica Essência / Atlas — aplicação principal
const sb = supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
const S = { perfil: null, profs: [], emps: [], servs: [], emp: (function () { try { return localStorage.getItem("emp2") || ""; } catch (e) { return ""; } })() };
function setEmp(id) { S.emp = id; try { localStorage.setItem("emp2", id); } catch (e) {} rota(); }
const root = document.getElementById("app");
const ehGestao = () => S.perfil && (S.perfil.papel === "admin" || S.perfil.papel === "recepcao");
const ehAdmin = () => S.perfil && S.perfil.papel === "admin";
const ehProf = () => S.perfil && S.perfil.papel === "profissional";
const empBadge = id => h("span", { class: "etag " + (empCod(id) === "atlas" ? "a" : "e"), title: empCod(id) === "atlas" ? "Paciente da Atlas" : "Paciente da Essência" }, empCod(id) === "atlas" ? "Atlas" : "Essência");
const empCod = id => (S.emps.find(e => e.id === id) || {}).codigo;
const profNome = id => (S.profs.find(p => p.id === id) || {}).nome || "";
const atendeEm = p => !S.emp || !p.empresas || !p.empresas.length || p.empresas.includes(S.emp);
const nomeCurto = n => (n || "").split(" ").slice(0, 2).join(" ");
async function ok(p) { const r = await p; if (r.error) throw new Error(r.error.message.includes("Horário já ocupado") ? "Horário já ocupado para este profissional." : r.error.message); return r.data; }

function boasVindas(card) {
  root.replaceChildren(h("div", { class: "wl2" },
    h("div", { class: "wl2-hero" }, h("img", { class: "wl2-ico", src: "img/icon-512.png", alt: "Essária" }), h("b", {}, "Essária"), h("small", {}, "Sistema do grupo"),
      h("div", { class: "wl2-tags" }, h("span", { class: "etag e" }, "Essência"), h("span", { class: "etag a" }, "Atlas"))),
    h("div", { class: "wl-body" }, h("div", { class: "wl-card" }, card), h("p", { class: "small", style: "text-align:center;color:#8a8577;margin-top:16px" }, "Acesso restrito à equipe"))));
}
// ================= ACESSOS (login do profissional = nome; senha provisória = nome + 2026) =================
const DOMINIO_LOGIN = "acesso.invalid"; // domínio reservado: nenhum e-mail é entregue
const emailDeLogin = v => { v = (v || "").trim(); return v.includes("@") ? v : semAcento(v).replace(/\s+/g, "") + "@" + DOMINIO_LOGIN; };
const COMPOSTOS = ["ana barbara", "ana cristina", "ana beatriz", "ana paula", "luis filipe", "juliana carolina"];
function regraAcesso(nome) {
  const ts = semAcento(nome).replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w && !["de", "da", "do", "dos", "das", "e", "dra", "dr"].includes(w));
  if (!ts.length) return { login: "", senha: "" };
  if (ts.length > 1 && COMPOSTOS.includes(ts[0] + " " + ts[1])) return { login: ts[0] + "-" + ts[1], senha: ts[0] + ts[1] + "2026" };
  const sob = ts[0] === "angela" ? "gomes" : ts[ts.length - 1];
  return { login: ts[0] + (ts.length > 1 ? "-" + sob : ""), senha: ts[0] + "2026" };
}
async function acessoApi(body) {
  const { data, error } = await sb.functions.invoke("admin-usuarios", { body });
  if (error) { let m = error.message; try { const j = await error.context.json(); m = j.erro || m; } catch (e) {} throw new Error(m); }
  if (data && data.erro) throw new Error(data.erro);
  return data;
}
// ================= LOGIN =================
function telaLogin(msg) {
  const em = h("input", { type: "text", placeholder: "E-mail ou login", autocomplete: "username", autocapitalize: "none", spellcheck: "false" });
  const pw = h("input", { type: "password", placeholder: "Senha", autocomplete: "current-password" });
  const err = h("div", { class: "warn", style: "display:none" });
  const entrar = async () => {
    err.style.display = "none";
    const { error } = await sb.auth.signInWithPassword({ email: emailDeLogin(em.value), password: pw.value });
    if (error) { err.textContent = "Login ou senha incorretos."; err.style.display = ""; }
  };
  pw.addEventListener("keydown", e => { if (e.key === "Enter") entrar(); });
  boasVindas(h("div", {}, h("h2", {}, "Entrar"), msg && h("div", { class: "warn" }, msg), campo("E-mail ou login", em), campo("Senha", pw), err,
      h("div", { class: "row", style: "margin-top:14px" }, h("button", { class: "btn-p grow", onclick: entrar }, "Entrar")),
      h("p", { class: "small muted", style: "margin:12px 0 0" }, h("a", { href: "#", onclick: async e => { e.preventDefault(); if (!em.value.trim()) return toast("Digite seu e-mail acima.", true);
        if (!em.value.includes("@")) return toast("Profissionais: peça à administração para redefinir a sua senha.", true);
        const { error } = await sb.auth.resetPasswordForEmail(em.value.trim(), { redirectTo: location.origin + location.pathname }); toast(error ? error.message : "Enviamos um link para redefinir a senha, se o e-mail existir.", !!error); } }, "Esqueci minha senha"))));
}
function telaNovaSenha() {
  const a = h("input", { type: "password", placeholder: "Nova senha (mín. 8 caracteres)" });
  boasVindas(h("div", {}, h("h2", {}, "Definir nova senha"), campo("Nova senha", a),
    h("div", { class: "row", style: "margin-top:14px" }, h("button", { class: "btn-p grow", onclick: async () => {
      if (a.value.length < 8) return toast("Use pelo menos 8 caracteres.", true);
      const { error } = await sb.auth.updateUser({ password: a.value, data: { trocar_senha: false } }); if (error) return toast(error.message, true);
      toast("Senha alterada."); RECUPERANDO = false; history.replaceState(null, "", location.pathname + "#/agenda"); iniciar(); } }, "Salvar"))));
}

// ================= BASE / ROTAS =================
async function carregarBase() {
  const { data: { user } } = await sb.auth.getUser();
  const { data: perfil } = await sb.from("perfis").select("*").eq("id", user.id).maybeSingle();
  if (!perfil || !perfil.ativo) { await sb.auth.signOut(); return telaLogin("Seu usuário ainda não tem acesso ao sistema. Fale com a administração."); }
  S.perfil = perfil; S.trocar = false; // a senha padrão (nome + 2026) é a senha definitiva: nunca exigir troca
  [S.profs, S.emps, S.servs] = await Promise.all([ok(sb.from("profissionais").select("*").order("nome")), ok(sb.from("empresas").select("*")), ok(sb.from("servicos").select("*").order("nome"))]);
  if (ehProf()) S.profs = S.profs.filter(p => p.id === S.perfil.profissional_id); // profissional nunca guarda a lista dos colegas (defesa extra, além das regras do banco)
  return true;
}
const TAB_ICO = {
  agenda: '<path d="M3.5 10h17M8 3v4M16 3v4"/><rect x="3.5" y="5" width="17" height="15" rx="2.5"/>',
  pacientes: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14c2.8 0 4.5 1.8 4.5 4.5"/>',
  profissionais: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="11" r="2"/><path d="M6.5 16c.6-1.6 1.6-2.3 2.5-2.3s1.9.7 2.5 2.3M14 10h4M14 13.5h3"/>'
};
function svgIco(k) { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", "1.8"); s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round"); s.innerHTML = TAB_ICO[k]; return s; }
function shell(conteudo, ativo) {
  const nav = [["agenda", "Agenda"], ["pacientes", "Pacientes"]].concat(ehGestao() ? [["profissionais", "Profissionais"]] : []);
  const eid = c => (S.emps.find(e => e.codigo === c) || {}).id || "";
  const ctx = S.emp && S.emp === eid("atlas") ? "atlas" : S.emp ? "essencia" : "todas";
  document.body.dataset.emp = ctx;
  const logos = h("div", { class: "brand3", title: "Essária" }, h("img", { src: "img/icon-192.png", alt: "Essária" }), h("span", {}, "Essária"));
  const sw = h("div", { class: "semp" }, [["Essência", eid("essencia")], ["Atlas", eid("atlas")], ["Todas", ""]].map(([t, id]) => h("button", { class: (S.emp || "") === id ? "on" : "", onclick: () => setEmp(id) }, t)));
  const wide = ativo === "agenda";
  root.replaceChildren(h("div", { class: "app" },
    h("header", { class: "topbar" }, h("div", { class: "topin" }, logos,
      h("nav", { class: "stabs" }, nav.map(([k, t]) => h("a", { href: "#/" + k, class: "stab" + (ativo === k ? " active" : "") }, svgIco(k), h("span", {}, t)))),
      h("div", { class: "sfoot" }, sw, h("div", {}, S.perfil.nome, h("br"), h("a", { href: "#", onclick: e => { e.preventDefault(); RECUPERANDO = true; telaNovaSenha(); } }, "Alterar senha"), " · ", h("a", { href: "#", onclick: async e => { e.preventDefault(); await sb.auth.signOut(); } }, "Sair"))))),
    h("main", { id: "main", class: "mainx" + (wide ? " wide" : "") }, conteudo)));
}
function parseHash() { const [p, q] = (location.hash.slice(1) || "/agenda").split("?"); return { partes: p.split("/").filter(Boolean), q: new URLSearchParams(q || "") }; }
async function rota() {
  if (!S.perfil) return;
  const { partes, q } = parseHash(); const v = partes[0] || "agenda";
  shell(vazio("Carregando…"), v);
  try {
    let el;
    if (v === "agenda") el = await vAgenda(q);
    else if (v === "pacientes") el = await vPacientes(q);
    else if (v === "paciente") el = await vFicha(partes[1], q);
    else if (v === "profissionais" && ehGestao()) el = await vProfissionais();
    else el = vazio("Página não encontrada.");
    shell(el, v === "paciente" ? "pacientes" : v);
  } catch (e) { console.error(e); shell(h("div", { class: "warn" }, "Erro: " + e.message), v); }
}
async function iniciar() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return telaLogin();
  if (await carregarBase() === true) { if (S.trocar) { RECUPERANDO = true; return telaNovaSenha(); } rota(); }
}
let RECUPERANDO = /type=recovery/.test(location.hash + location.search);
sb.auth.onAuthStateChange((ev) => {
  if (ev === "PASSWORD_RECOVERY") { RECUPERANDO = true; return telaNovaSenha(); }
  if (RECUPERANDO) return;
  if (ev === "SIGNED_OUT") { S.perfil = null; telaLogin(); }
  if (ev === "SIGNED_IN" && !S.perfil) iniciar();
});
window.addEventListener("hashchange", () => { if (!RECUPERANDO) rota(); });
if (RECUPERANDO) telaNovaSenha(); else iniciar();

async function vAgenda() { return await calMontar(); }
async function agModal(a, def) {
  def = def || {};
  const ini = a ? new Date(a.inicio) : null;
  let paciente = a ? a.paciente : (def.paciente || null);
  const pacSel = h("select", {}); const profs = S.profs.filter(p => p.ativo || (a && p.id === a.profissional_id));
  const fpac = buscaPaciente(async p => { paciente = p; await carregaPacotes(); }, paciente);
  const fprof = sel(profs.map(p => [p.id, p.nome]), a ? a.profissional_id : (def.profissional_id || (profs[0] || {}).id));
  const fserv = sel([["", "— serviço —"]].concat(S.servs.filter(s => s.ativo).map(s => [s.id, s.nome + (s.valor_padrao > 0 ? " (" + brl(s.valor_padrao) + ")" : "")])), a ? a.servico_id : "");
  const fdia = h("input", { type: "date", value: a ? diaDe(a.inicio) : (def.dia || hojeISO()) });
  const fhora = h("input", { type: "time", value: a ? hhmm(a.inicio) : "08:00" });
  const fdur = h("input", { type: "number", min: 10, step: 5, value: a ? Math.round((new Date(a.fim) - ini) / 60000) : 60 });
  const fval = h("input", { type: "number", step: "0.01", value: a ? a.valor : 0 });
  const fst = sel(Object.entries(STATUS), a ? a.status : "agendada");
  const fcom = h("textarea", { style: "min-height:60px" }, a && a.comentario || "");
  async function carregaPacotes() {
    pacSel.replaceChildren(h("option", { value: "" }, "— sem pacote —"));
    if (!paciente) return;
    const pcs = await ok(sb.from("pacotes").select("id,numero,tipo,sessoes_total").eq("paciente_id", paciente.id).order("numero", { ascending: false }));
    pcs.forEach(p => pacSel.append(h("option", { value: p.id, selected: a && a.pacote_id === p.id }, "#" + p.numero + " " + (p.tipo || "") + " (" + p.sessoes_total + " sessões)")));
  }
  await carregaPacotes();
  fserv.addEventListener("change", () => { const s = S.servs.find(x => x.id === fserv.value); if (s) { fdur.value = s.duracao_min; if (!pacSel.value) fval.value = s.valor_padrao; } });
  const corpo = h("div", {}, campo("Paciente", fpac.el), h("div", { class: "g2" }, campo("Profissional", fprof), campo("Serviço", fserv)),
    h("div", { class: "g3" }, campo("Data", fdia), campo("Hora", fhora), campo("Duração (min)", fdur)), h("div", { class: "g3" }, campo("Valor (R$)", fval), campo("Status", fst), campo("Pacote", pacSel)), campo("Observação", fcom));
  modal(a ? "Editar agendamento" : "Novo agendamento", corpo, [{ t: "Cancelar" }, { t: "Salvar", p: true, f: async () => {
    const p = fpac.get(); if (!p) { toast("Escolha o paciente na lista.", true); return false; }
    const inicio = new Date(toISO(fdia.value, fhora.value)); const fim = new Date(inicio.getTime() + Number(fdur.value) * 60000);
    const iso = d => d.toISOString();
    const row = { empresa_id: p.empresa_id, paciente_id: p.id, profissional_id: fprof.value, servico_id: fserv.value || null, pacote_id: pacSel.value || null, inicio: iso(inicio), fim: iso(fim), status: fst.value, valor: Number(fval.value || 0), comentario: fcom.value || null };
    await ok(a ? sb.from("agendamentos").update(row).eq("id", a.id) : sb.from("agendamentos").insert(row));
    toast("Agendamento salvo."); rota();
  } }]);
}

// ================= PACIENTES =================
async function vPacientes(q) {
  const termo = q.get("q") || "", emp = q.has("e") ? q.get("e") : S.emp, pf = ehProf() ? "" : (q.get("p") || "");
  const go = (e2) => { const p = new URLSearchParams(); if (busca.value) p.set("q", busca.value); p.set("e", e2 === undefined ? emp : e2); if (fp && fp.value) p.set("p", fp.value); location.hash = "#/pacientes?" + p; };
  const busca = h("input", { placeholder: "Buscar por nome…", value: termo, onkeydown: e => e.key === "Enter" && go(), style: "min-width:220px" });
  const fp = !ehProf() && sel([["", "Todos os profissionais"]].concat(S.profs.filter(p => p.ativo).map(p => [p.id, p.nome])), pf, { style: "width:auto;max-width:240px", onchange: () => go() });
  const abas = [["", "Todos"]].concat(S.emps.map(e => [e.id, e.nome]));
  const conts = await Promise.all(abas.map(async ([id]) => { let qq = sb.from("pacientes").select("id", { count: "exact", head: true }).eq("ativo", true); if (id) qq = qq.eq("empresa_id", id); const r = await qq; return r.count || 0; }));
  const seg = h("div", { class: "segp" }, abas.map(([id, t], k) => h("button", { class: "segp-" + (id ? (empCod(id) === "atlas" ? "a" : "e") : "t") + ((emp || "") === id ? " on" : ""), onclick: () => { S.emp = id; go(id); } }, t, h("span", {}, " " + conts[k]))));
  const pacs = await ok(sb.rpc("buscar_pacientes", { q: termo, lim: 80, emp: emp || null, prof: pf || null }));
  const vinc = pacs.length ? await ok(sb.from("paciente_profissional").select("paciente_id,profissional_id").in("paciente_id", pacs.map(p => p.id))) : [];
  const porPac = {}; vinc.forEach(v => (porPac[v.paciente_id] = porPac[v.paciente_id] || []).push(v.profissional_id));
  const recentes = pacs.length ? await ok(sb.from("agendamentos").select("paciente_id").in("paciente_id", pacs.map(p => p.id)).in("status", ["cancelada_paciente", "cancelada_clinica"]).gte("inicio", new Date(Date.now() - 14 * 86400000).toISOString())) : [];
  const comCanc = new Set(recentes.map(r => r.paciente_id));
  return h("div", {}, h("div", { class: "card" }, h("div", { class: "row" }, h("h1", { class: "grow" }, "Pacientes"), ehGestao() && h("button", { class: "btn-p", onclick: () => pacModal(null) }, "+ Novo paciente")),
    h("div", { class: "row", style: "margin-top:10px" }, seg), h("div", { class: "row", style: "margin-top:10px" }, busca, fp, h("button", { onclick: () => go() }, "Buscar"))),
    h("div", { class: "card" }, pacs.length ? h("table", {}, h("thead", {}, h("tr", {}, (ehProf() ? ["Nome", "Clínica", "Telefone"] : ["Nome", "Clínica", "Telefone", "Profissionais"]).map(t => h("th", {}, t)))),
      h("tbody", {}, pacs.map(p => h("tr", { class: "click emp-" + (empCod(p.empresa_id) === "atlas" ? "a" : "e"), onclick: () => location.hash = "#/paciente/" + p.id }, h("td", {}, h("b", {}, p.nome), !p.ativo && h("span", { class: "chip" }, "inativo"), comCanc.has(p.id) && h("span", { class: "chip faltou", title: "Tem consulta cancelada nos últimos 14 dias" }, "⚠ cancelamento")), h("td", {}, empBadge(p.empresa_id)), h("td", {}, p.telefone || ""), !ehProf() && h("td", { class: "small" }, (porPac[p.id] || []).map(id => nomeCurto(profNome(id))).join(", ")))))) : vazio("Nenhum paciente encontrado."),
      pacs.length >= 80 && h("div", { class: "small muted", style: "margin-top:8px" }, "Mostrando os 80 primeiros. Refine a busca.")));
}
function pacModal(p) {
  const f = {
    nome: h("input", { value: p ? p.nome : "" }), nasc: h("input", { type: "date", value: p && p.nascimento || "" }), sexo: sel([["", "—"], ["F", "Feminino"], ["M", "Masculino"], ["O", "Outro"]], p && p.sexo),
    cpf: h("input", { value: p && p.cpf || "" }), tel: h("input", { value: p && p.telefone || "" }), email: h("input", { type: "email", value: p && p.email || "" }), resp: h("input", { value: p && p.responsavel || "" }),
    origem: h("input", { value: p && p.origem || "", placeholder: "Google, indicação, Instagram, OAB…" }), parc: h("input", { value: p && p.parceria || "" }),
    obs: h("textarea", {}, p && p.observacoes || ""), emp: sel(S.emps.map(e => [e.id, e.nome]), p ? p.empresa_id : (S.emp || (S.emps.find(e => e.codigo === "essencia") || {}).id)),
    ativo: h("input", { type: "checkbox", checked: p ? p.ativo : true }), prof: sel([["", "— profissional —"]].concat(S.profs.filter(x => x.ativo).map(x => [x.id, x.nome])), "")
  };
  const corpo = h("div", {}, campo("Nome completo", f.nome), h("div", { class: "g3" }, campo("Nascimento", f.nasc), campo("Sexo", f.sexo), campo("CPF", f.cpf)),
    h("div", { class: "g2" }, campo("Telefone", f.tel), campo("E-mail", f.email)), campo("Responsável (se menor)", f.resp), h("div", { class: "g2" }, campo("Como nos conheceu", f.origem), campo("Parceria", f.parc)),
    h("div", { class: "g2" }, campo("Empresa", f.emp), !p && campo("Profissional", f.prof)), campo("Observações", f.obs), p && h("label", {}, f.ativo, " Paciente ativo"));
  modal(p ? "Editar paciente" : "Novo paciente", corpo, [{ t: "Cancelar" }, { t: "Salvar", p: true, f: async () => {
    if (!f.nome.value.trim()) { toast("Informe o nome.", true); return false; }
    const row = { nome: f.nome.value.trim(), nascimento: f.nasc.value || null, sexo: f.sexo.value || null, cpf: f.cpf.value || null, telefone: f.tel.value || null, email: f.email.value || null, responsavel: f.resp.value || null, origem: f.origem.value || null, parceria: f.parc.value || null, observacoes: f.obs.value || null, empresa_id: f.emp.value, ativo: p ? f.ativo.checked : true };
    if (p) { await ok(sb.from("pacientes").update(row).eq("id", p.id)); toast("Dados salvos."); rota(); }
    else { const novo = await ok(sb.from("pacientes").insert(row).select().single()); if (f.prof.value) await ok(sb.from("paciente_profissional").insert({ paciente_id: novo.id, profissional_id: f.prof.value, principal: true })); toast("Paciente cadastrado."); location.hash = "#/paciente/" + novo.id; }
  } }]);
}

// ================= FICHA =================
async function vFicha(id, q) {
  const tab = q.get("t") || "dados";
  const [p] = await ok(sb.from("pacientes").select("*").eq("id", id));
  if (!p) return vazio("Paciente não encontrado ou sem acesso.");
  const vinc = await ok(sb.from("paciente_profissional").select("*").eq("paciente_id", id));
  const abas = [["dados", "Dados"], ["consultas", "Consultas"]].concat(ehGestao() ? [["financeiro", "Pacotes e pagamentos"]] : []).concat([["prontuario", "Prontuário"], ["documentos", "Anexos"]]);
  const faixa = h("div", { class: "fbanner " + (empCod(p.empresa_id) === "atlas" ? "a" : "e") }, empCod(p.empresa_id) === "atlas" ? "PACIENTE DA ATLAS" : "PACIENTE DA ESSÊNCIA");
  const cab = h("div", { class: "card ficha-" + (empCod(p.empresa_id) === "atlas" ? "a" : "e") }, h("div", { class: "row" }, h("div", { class: "grow" }, h("h1", {}, p.nome, " ", empBadge(p.empresa_id), !p.ativo && h("span", { class: "chip" }, "inativo")),
    h("div", { class: "muted" }, [idade(p.nascimento), p.telefone, p.email].filter(Boolean).join(" · "))), ehGestao() && h("button", { onclick: () => pacModal(p) }, "Editar"),
    ehGestao() && h("button", { class: "btn-p", onclick: () => agModal(null, { paciente: p, profissional_id: (vinc.find(v => v.principal) || vinc[0] || {}).profissional_id }) }, "Agendar")));
  const desde = new Date(Date.now() - 30 * 86400000).toISOString();
  const canc = await ok(sb.from("agendamentos").select("id,inicio,status,profissional_id,servico:servicos(nome)").eq("paciente_id", id).in("status", ["cancelada_paciente", "cancelada_clinica"]).gte("inicio", desde).order("inicio", { ascending: false }).limit(10));
  const aviso = canc.length ? h("div", { class: "card", style: "border-left:5px solid #c0562b;background:color-mix(in srgb,#c0562b 9%,var(--card))" },
    h("h3", { style: "margin:0 0 6px" }, "⚠ Consulta cancelada" + (canc.length > 1 ? " (" + canc.length + ")" : "")),
    canc.map(x => h("div", { class: "small", style: "padding:2px 0" }, h("b", {}, fmtData(x.inicio) + " às " + hhmm(x.inicio)), " · " + nomeCurto(profNome(x.profissional_id)) + (x.servico ? " · " + x.servico.nome : "") + " · ", h("span", { class: "chip " + x.status }, x.status === "cancelada_paciente" ? "cancelada pelo paciente" : "cancelada pela clínica")),
    h("div", { class: "small muted", style: "margin-top:4px" }, "Aparecem aqui por 30 dias e não ocupam mais o calendário."))) : null;
  const tabs = h("div", { class: "tabs" }, abas.map(([k, t]) => h("button", { class: tab === k ? "on" : "", onclick: () => location.hash = "#/paciente/" + id + "?t=" + k }, t)));
  let corpo;
  if (tab === "dados") corpo = await tDados(p, vinc);
  else if (tab === "consultas") corpo = await tConsultas(p);
  else if (tab === "financeiro" && ehGestao()) corpo = await tFinanceiro(p);
  else if (tab === "prontuario") corpo = await prontuario(p);
  else corpo = await tDocumentos(p);
  return h("div", {}, faixa, cab, aviso, tabs, corpo);
}
async function tDados(p, vinc) {
  const chips = vinc.map(v => h("span", { class: "chip" }, profNome(v.profissional_id), v.principal && " ★", ehGestao() && h("a", { href: "#", style: "margin-left:6px;text-decoration:none", title: "Remover vínculo", onclick: async e => { e.preventDefault(); if (!confirm("Remover vínculo com " + profNome(v.profissional_id) + "?")) return; await ok(sb.from("paciente_profissional").delete().eq("paciente_id", p.id).eq("profissional_id", v.profissional_id)); rota(); } }, "×")));
  const add = ehGestao() && sel([["", "+ vincular profissional"]].concat(S.profs.filter(x => x.ativo && !vinc.some(v => v.profissional_id === x.id)).map(x => [x.id, x.nome])), "", { style: "width:auto;max-width:260px", onchange: async e => { if (!e.target.value) return; await ok(sb.from("paciente_profissional").insert({ paciente_id: p.id, profissional_id: e.target.value, principal: !vinc.length })); rota(); } });
  const kv = [["CPF", p.cpf], ["Nascimento", p.nascimento && fmtData(p.nascimento + "T12:00:00-04:00")], ["Sexo", p.sexo], ["Responsável", p.responsavel], ["Como nos conheceu", p.origem], ["Parceria", p.parceria], ["Observações", p.observacoes]].filter(x => x[1]);
  return h("div", { class: "card" }, ehGestao() && h("h2", {}, "Profissionais que atendem"), ehGestao() && h("div", { class: "row" }, chips, add), h("h2", { style: ehGestao() ? "margin-top:18px" : "" }, "Dados cadastrais"), h("div", { class: "kv" }, kv.map(([k, v]) => [h("div", {}, k), h("div", {}, v)])));
}
async function tConsultas(p) {
  const _pkc = {};
  const ags = await ok(sb.from("agendamentos").select("*,profissional:profissionais(nome),servico:servicos(nome),pacote:pacotes(numero,valor)").eq("paciente_id", p.id).order("inicio", { ascending: false }).limit(300));
  return h("div", { class: "card" }, ags.length ? h("table", {}, h("thead", {}, h("tr", {}, ["Data", "Hora", "Profissional", "Serviço", "Status"].map(t => h("th", {}, t)))),
    h("tbody", {}, ags.map(a => h("tr", {}, h("td", { class: "nowrap" }, fmtData(a.inicio)), h("td", {}, hhmm(a.inicio)), h("td", {}, nomeCurto(a.profissional.nome)), h("td", {}, a.servico && a.servico.nome, a.pacote && h("span", { class: "chip rosa" }, "Pacote #" + a.pacote.numero + " ", h("span", { class: "pkv " + pkCls(a.pacote.valor) }, pkReais(a.pacote.valor)))), h("td", {}, h("span", { class: "chip " + a.status }, STATUS[a.status])))))) : vazio("Sem consultas."));
}
async function tFinanceiro(p) {
  const [pcs, pgs, ags] = await Promise.all([ok(sb.from("pacotes").select("*").eq("paciente_id", p.id).order("numero", { ascending: false })), ok(sb.from("pagamentos").select("*").eq("paciente_id", p.id).order("pago_em", { ascending: false })),
    ok(sb.from("agendamentos").select("id,inicio,valor,status,pacote_id,profissional_id").eq("paciente_id", p.id).order("inicio", { ascending: false }).limit(400))]);
  const extra = await ok(sb.from("pacote_pacientes").select("pacote_id").eq("paciente_id", p.id));
  if (extra.length) { const cp = await ok(sb.from("pacotes").select("*").in("id", extra.map(x => x.pacote_id))); cp.forEach(c => { c._comp = true; pcs.push(c); }); }
  const usadas = {};
  const doPacote = pcs.length ? await ok(sb.from("agendamentos").select("id,pacote_id,inicio,status").in("pacote_id", pcs.map(c => c.id)).order("inicio").limit(2000)) : [];
  const stPk = {}; pcs.forEach(c => { stPk[c.id] = pkStats(c.sessoes_total, doPacote.filter(x => x.pacote_id === c.id)); });
  const pagoSess = new Set(pgs.filter(x => x.agendamento_id).map(x => x.agendamento_id));
  const pend = ags.filter(a => !a.pacote_id && a.valor > 0 && ["realizada"].includes(a.status) && !pagoSess.has(a.id));
  return h("div", {}, h("div", { class: "card" }, h("div", { class: "row" }, h("h2", { class: "grow", style: "margin:0" }, "Pacotes"), h("button", { onclick: () => pctModal(p) }, "+ Novo pacote"), h("button", { class: "btn-p", onclick: () => pgModal(p, pcs, pend) }, "+ Registrar pagamento")),
    pcs.length ? h("table", {}, h("thead", {}, h("tr", {}, ["Nº", "Tipo", "Sessões", "Valor", "Pago", ""].map(t => h("th", {}, t)))), h("tbody", {}, pcs.map(c => {
      const dev = Number(c.valor) - Number(c.valor_pago);
      return h("tr", {}, h("td", {}, "#" + c.numero, c._comp && h("div", { class: "small muted" }, "compartilhado")), h("td", {}, c.tipo + " ", h("span", { class: "pkv " + pkCls(c.valor) }, pkReais(c.valor)), h("div", { class: "small muted" }, nomeCurto(profNome(c.profissional_id)), " · ", c.vendido_em && fmtData(c.vendido_em + "T12:00:00-04:00"))), h("td", { class: "pk-cell" }, h("b", {}, stPk[c.id].real + "/" + c.sessoes_total), " realizadas", h("div", { html: pkBarraHtml(stPk[c.id]) }), h("div", { class: "small" }, pkResumo(stPk[c.id])), h("div", { html: pkSlotsHtml(stPk[c.id]) }), stPk[c.id].faltam > 0 && h("div", { class: "small", style: "font-weight:700;margin-top:3px" }, "Faltam " + stPk[c.id].faltam + " para concluir")), h("td", {}, brl(c.valor)),
        h("td", {}, brl(c.valor_pago), " ", dev > 0.009 ? h("span", { class: "chip faltou" }, "falta " + brl(dev)) : h("span", { class: "chip realizada" }, "pago")), h("td", {}));
    }))) : vazio("Sem pacotes.")),
    pend.length > 0 && h("div", { class: "card" }, h("h2", {}, "Sessões avulsas realizadas sem pagamento"), pend.map(a => h("div", { class: "row", style: "padding:4px 0" }, fmtDataHora(a.inicio), " · ", nomeCurto(profNome(a.profissional_id)), " · ", brl(a.valor), h("span", { class: "grow" }), h("button", { class: "btn-s", onclick: () => pgModal(p, pcs, pend, a.id) }, "Receber")))),
    h("div", { class: "card" }, h("h2", {}, "Pagamentos"), pgs.length ? h("table", {}, h("thead", {}, h("tr", {}, ["Data", "Valor", "Forma", "Ref."].map(t => h("th", {}, t)))), h("tbody", {}, pgs.map(x => h("tr", {}, h("td", { class: "nowrap" }, fmtDataHora(x.pago_em)), h("td", {}, brl(x.valor)), h("td", {}, FORMAS[x.forma] + (x.final_cartao ? " ••" + x.final_cartao : "")), h("td", { class: "small muted" }, x.pacote_id ? "Pacote" : x.agendamento_id ? "Sessão" : "", x.observacao && " · " + x.observacao))))) : vazio("Sem pagamentos.")));
}
async function pctModal(p) {
  const modelos = await ok(sb.from("pacote_modelos").select("*").eq("ativo", true).order("ordem"));
  const f = { modelo: sel(modelos.map(m => [m.id, pkReais(m.valor) + " — " + String(m.nome).replace(/\s*R\$\s*\d+/, "")]).concat([["", "Personalizado"]]), modelos[0] ? modelos[0].id : ""), tipo: sel([["Quinzenal", "Quinzenal"], ["Semanal", "Semanal"], ["Integral", "Integral"], ["Avulso", "Avulso"]], "Quinzenal"),
    n: h("input", { type: "number", value: 2, min: 1 }), v: h("input", { type: "number", step: "0.01", value: 0 }), pf: sel(S.profs.filter(x => x.ativo).map(x => [x.id, x.nome]), (S.profs.find(x => x.ativo) || {}).id), d: h("input", { type: "date", value: hojeISO() }) };
  const aplica = () => { const m = modelos.find(x => x.id === f.modelo.value); if (m) { f.tipo.value = m.tipo; f.n.value = m.sessoes_total; f.v.value = m.valor; } };
  f.modelo.addEventListener("change", aplica); aplica();
  modal("Novo pacote", h("div", {}, campo("Modelo de pacote", f.modelo), h("div", { class: "g2" }, campo("Tipo", f.tipo), campo("Profissional", f.pf)), h("div", { class: "g3" }, campo("Nº de sessões", f.n), campo("Valor (R$)", f.v), campo("Data da venda", f.d))), [{ t: "Cancelar" }, { t: "Salvar", p: true, f: async () => {
    const mx = await ok(sb.from("pacotes").select("numero").order("numero", { ascending: false }).limit(1));
    await ok(sb.from("pacotes").insert({ empresa_id: p.empresa_id, paciente_id: p.id, profissional_id: f.pf.value, numero: ((mx[0] || {}).numero || 0) + 1, tipo: f.tipo.value, sessoes_total: Number(f.n.value), valor: Number(f.v.value), vendido_em: f.d.value }));
    toast("Pacote criado."); rota(); } }]);
}
function pgModal(p, pcs, pend, sessId) {
  const tipoRef = sel([["sessao", "Sessão avulsa"], ["pacote", "Pacote"], ["", "Sem vínculo"]], sessId ? "sessao" : (pcs.length && !pend.length ? "pacote" : "sessao"));
  const refSel = h("select", {});
  const montaRef = () => { refSel.replaceChildren(); if (tipoRef.value === "sessao") pend.forEach(a => refSel.append(h("option", { value: a.id, selected: a.id === sessId }, fmtDataHora(a.inicio) + " — " + brl(a.valor)))); else if (tipoRef.value === "pacote") pcs.forEach(c => refSel.append(h("option", { value: c.id }, pkReais(c.valor) + " — #" + c.numero + " " + c.tipo + " · falta " + brl(c.valor - c.valor_pago)))); };
  tipoRef.addEventListener("change", () => { montaRef(); sugere(); }); montaRef();
  const f = { v: h("input", { type: "number", step: "0.01", value: 0 }), forma: sel(Object.entries(FORMAS), "pix"), d: h("input", { type: "datetime-local", value: new Date().toLocaleString("sv-SE", { timeZone: TZ }).slice(0, 16).replace(" ", "T") }), fc: h("input", { maxlength: 4, placeholder: "últimos 4 dígitos" }), obs: h("input", {}) };
  function sugere() { if (tipoRef.value === "sessao") { const a = pend.find(x => x.id === refSel.value); if (a) f.v.value = a.valor; } else if (tipoRef.value === "pacote") { const c = pcs.find(x => x.id === refSel.value); if (c) f.v.value = Math.max(0, c.valor - c.valor_pago); } }
  refSel.addEventListener("change", sugere); sugere();
  modal("Registrar pagamento", h("div", {}, h("div", { class: "g2" }, campo("Referente a", tipoRef), campo("Qual", refSel)), h("div", { class: "g3" }, campo("Valor (R$)", f.v), campo("Forma", f.forma), campo("Data e hora", f.d)), h("div", { class: "g2" }, campo("Final do cartão", f.fc), campo("Observação", f.obs))), [{ t: "Cancelar" }, { t: "Salvar", p: true, f: async () => {
    if (!(Number(f.v.value) > 0)) { toast("Informe o valor.", true); return false; }
    const row = { empresa_id: p.empresa_id, paciente_id: p.id, valor: Number(f.v.value), forma: f.forma.value, pago_em: new Date(f.d.value + ":00-04:00").toISOString(), final_cartao: f.fc.value || null, observacao: f.obs.value || null };
    if (tipoRef.value === "sessao" && refSel.value) row.agendamento_id = refSel.value; if (tipoRef.value === "pacote" && refSel.value) row.pacote_id = refSel.value;
    await ok(sb.from("pagamentos").insert(row));
    if (row.pacote_id) { const t = await ok(sb.from("pagamentos").select("valor").eq("pacote_id", row.pacote_id)); await ok(sb.from("pacotes").update({ valor_pago: t.reduce((s, x) => s + Number(x.valor), 0) }).eq("id", row.pacote_id)); }
    toast("Pagamento registrado."); rota(); } }]);
}

// ================= PRONTUÁRIO =================
function htmlSeguro(s) { return DOMPurify.sanitize(s || ""); }
async function tProntuario(p) {
  const evs = await ok(sb.from("evolucoes").select("*").eq("paciente_id", p.id).order("data", { ascending: false }).limit(300));
  const podeEscrever = ehProf();
  const nova = podeEscrever && h("button", { class: "btn-p", onclick: () => evModal(p) }, "+ Nova evolução");
  return h("div", {}, h("div", { class: "card" }, h("div", { class: "row" }, h("h2", { class: "grow", style: "margin:0" }, "Evoluções e relatos"), nova),
    !podeEscrever && h("div", { class: "small muted", style: "margin-top:6px" }, "Somente o profissional responsável registra evoluções."),
    evs.length ? evs.map(e => h("div", { class: "evo" }, h("div", { class: "meta" }, fmtDataHora(e.data), " · ", nomeCurto(profNome(e.profissional_id)), " · ", e.tipo), h("div", { class: "corpo", html: e.conteudo }))) : vazio("Nenhuma evolução registrada.")));
}
function evModal(p) {
  const d = h("input", { type: "datetime-local", value: new Date().toLocaleString("sv-SE", { timeZone: TZ }).slice(0, 16).replace(" ", "T") });
  const t = sel([["relato", "Relato da sessão"], ["retorno", "Retorno"], ["outro", "Outro"]], "relato"); const c = h("textarea", { style: "min-height:220px", placeholder: "Escreva o relato…" });
  modal("Nova evolução", h("div", {}, h("div", { class: "g2" }, campo("Data e hora", d), campo("Tipo", t)), campo("Texto", c)), [{ t: "Cancelar" }, { t: "Salvar", p: true, f: async () => {
    if (!c.value.trim()) { toast("Escreva o texto.", true); return false; }
    const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    await ok(sb.from("evolucoes").insert({ paciente_id: p.id, profissional_id: S.perfil.profissional_id, data: new Date(d.value + ":00-04:00").toISOString(), tipo: t.value, conteudo: c.value.split(/\n{2,}/).map(x => "<p>" + esc(x).replace(/\n/g, "<br>") + "</p>").join("") }));
    toast("Evolução salva."); rota(); } }], "720px");
}
async function tDocumentos(p) {
  const docs = await ok(sb.from("documentos").select("*").eq("paciente_id", p.id).order("enviado_em", { ascending: false, nullsFirst: false }).limit(300));
  const arq = h("input", { type: "file" });
  const enviar = h("button", { class: "btn-p", onclick: () => {
    const tit = h("input", {}), tp = sel([["anexo", "Anexo"], ["exame", "Resultado de exame"], ["laudo", "Laudo / relatório"], ["outro", "Outro"]], "anexo");
    modal("Enviar documento", h("div", {}, campo("Arquivo", arq), campo("Título", tit), campo("Tipo", tp)), [{ t: "Cancelar" }, { t: "Enviar", p: true, f: async () => {
      const f = arq.files[0]; if (!f) { toast("Escolha o arquivo.", true); return false; }
      const ext = (f.name.match(/\.[A-Za-z0-9]+$/) || [""])[0]; const path = "pacientes/" + p.id + "/" + Date.now() + "_" + semAcento(f.name).replace(/[^a-z0-9.]+/g, "_");
      const up = await sb.storage.from("documentos").upload(path, f); if (up.error) throw new Error(up.error.message);
      await ok(sb.from("documentos").insert({ paciente_id: p.id, profissional_id: S.perfil.profissional_id || null, titulo: tit.value || f.name, tipo: tp.value, arquivo_path: path, extensao: ext, origem: "sistema", enviado_em: new Date().toISOString() }));
      toast("Documento enviado."); rota(); } }]); } }, "+ Enviar documento");
  const abrir = async d => { const { data, error } = await sb.storage.from("documentos").createSignedUrl(d.arquivo_path, 120); if (error) return toast(error.message, true); window.open(data.signedUrl, "_blank"); };
  return h("div", { class: "card" }, h("div", { class: "row" }, h("h2", { class: "grow", style: "margin:0" }, "Documentos e anexos"), enviar),
    docs.length ? h("table", {}, h("thead", {}, h("tr", {}, ["Título", "Tipo", "Enviado em", ""].map(t => h("th", {}, t)))), h("tbody", {}, docs.map(d => h("tr", {}, h("td", {}, d.titulo), h("td", {}, d.tipo), h("td", { class: "nowrap" }, d.enviado_em ? fmtData(d.enviado_em) : ""), h("td", { class: "right" }, d.arquivo_path && h("button", { class: "btn-s", onclick: () => abrir(d) }, "Abrir")))))) : vazio("Nenhum documento."));
}

// ================= PROFISSIONAIS =================
async function vProfissionais() {
  const todos = await ok(sb.from("profissionais").select("*").order("ativo", { ascending: false }).order("nome"));
  S.profs = todos; const lista = todos.filter(atendeEm);
  const perfis = ehAdmin() ? await ok(sb.from("perfis").select("profissional_id,login,ativo").not("profissional_id", "is", null)) : [];
  S.acessos = Object.fromEntries(perfis.map(p => [p.profissional_id, p]));
  return h("div", { class: "card" }, h("div", { class: "row" }, h("h1", { class: "grow" }, "Profissionais"), ehAdmin() && h("button", { onclick: () => criarTodosAcessos(lista) }, "Criar acessos de todos"), ehAdmin() && h("button", { class: "btn-p", onclick: () => profModal(null) }, "+ Novo profissional")),
    h("table", {}, h("thead", {}, h("tr", {}, ["Nome", "Área", "Atende em", "Registro", "Acesso", ""].map(t => h("th", {}, t)))), h("tbody", {}, lista.map(x => { const ac = S.acessos[x.id]; return h("tr", { class: "click", onclick: () => ehAdmin() && profModal(x) },
      h("td", {}, h("b", {}, x.nome), !x.ativo && h("span", { class: "chip" }, "inativo")), h("td", {}, x.area),
      h("td", {}, (x.empresas || []).map(id => h("span", { class: "chip " + (empCod(id) === "atlas" ? "atlas" : "") }, empCod(id) === "atlas" ? "Atlas" : "Essência"))),
      h("td", {}, x.registro ? h("span", {}, x.conselho + " " + x.registro, x.rqe && " · RQE " + x.rqe) : h("span", { class: "chip faltou" }, "sem registro")),
      h("td", { class: "small" }, ac ? h("span", { class: "chip " + (ac.ativo ? "realizada" : "") }, ac.login || "acesso", !ac.ativo && " (desativado)") : h("span", { class: "chip" }, "sem acesso")),
      h("td", { class: "small muted" }, x.pode_prescrever ? "prescreve" : "")); }))),
    !ehAdmin() && h("div", { class: "small muted", style: "margin-top:8px" }, "Somente o administrador edita profissionais e acessos."));
}
function mostraCredenciais(linhas) {
  const txt = linhas.map(l => l.nome + " — login: " + l.login + " — senha padrão: " + l.senha).join("\n");
  modal("Dados de acesso", h("div", {}, h("div", { class: "warn" }, "Esta é a senha padrão de cada profissional; não é pedida troca no primeiro acesso. Entregue estes dados só à própria pessoa."),
    h("table", {}, h("thead", {}, h("tr", {}, ["Profissional", "Login", "Senha padrão"].map(t => h("th", {}, t)))), h("tbody", {}, linhas.map(l => h("tr", {}, h("td", {}, l.nome), h("td", {}, h("b", {}, l.login)), h("td", {}, l.senha)))))),
    [{ t: "Copiar tudo", f: async () => { try { await navigator.clipboard.writeText(txt); toast("Copiado."); } catch (e) { toast("Não consegui copiar.", true); } return false; } }, { t: "Fechar", p: true }], "720px");
}
async function criarAcesso(x) {
  const r = regraAcesso(x.nome); if (!r.login) throw new Error("Nome inválido.");
  const res = await acessoApi({ acao: "criar", login: r.login, senha: r.senha, profissional_id: x.id, nome: x.nome });
  return Object.assign({ nome: x.nome, ac: res.acao }, r);
}
async function criarTodosAcessos(lista) {
  const alvo = lista.filter(x => x.ativo && !(S.acessos && S.acessos[x.id]));
  if (!alvo.length) return toast("Todos os profissionais ativos já têm acesso.");
  if (!confirm("Criar acesso para " + alvo.length + " profissional(is) ativo(s)?\nLogin = nome; senha padrão = nome + 2026.")) return;
  const feitos = [], falhas = [];
  for (const x of alvo) { try { feitos.push(await criarAcesso(x)); } catch (e) { falhas.push(x.nome + ": " + e.message); } }
  if (falhas.length) toast("Falharam: " + falhas.join(" | "), true);
  rota(); if (feitos.length) mostraCredenciais(feitos);
}
function profModal(x) {
  const f = { nome: h("input", { value: x ? x.nome : "" }), area: h("input", { value: x ? x.area : "Psicologia" }), con: h("input", { value: x && x.conselho || "", placeholder: "CRP, CRM, CRN, CREFITO…" }), reg: h("input", { value: x && x.registro || "" }), rqe: h("input", { value: x && x.rqe || "" }),
    email: h("input", { value: x && x.email || "" }), tel: h("input", { value: x && x.telefone || "" }), pr: h("input", { type: "checkbox", checked: x ? x.pode_prescrever : false }), at: h("input", { type: "checkbox", checked: x ? x.ativo : true }),
    rt: sel([["nenhum", "Sem repasse"], ["percentual", "Percentual"], ["fixo", "Valor fixo"]], x ? x.repasse_tipo : "nenhum"), rv: h("input", { type: "number", step: "0.01", value: x ? x.repasse_valor : 0 }) };
  modal(x ? "Editar profissional" : "Novo profissional", h("div", {}, campo("Nome", f.nome), h("div", { class: "g2" }, campo("Área", f.area), campo("Conselho", f.con)), h("div", { class: "g2" }, campo("Número do registro", f.reg), campo("RQE (médicos)", f.rqe)),
    h("div", { class: "g2" }, campo("E-mail", f.email), campo("Telefone", f.tel)), h("div", { class: "g2" }, campo("Repasse", f.rt), campo("Valor / %", f.rv)), h("div", { class: "row", style: "margin-top:10px" }, h("label", {}, f.pr, " Pode emitir receituário"), h("label", {}, f.at, " Ativo")),
    x && acessoBloco(x)),
    [{ t: "Cancelar" }, { t: "Salvar", p: true, f: async () => {
      const row = { nome: f.nome.value.trim(), area: f.area.value.trim(), conselho: f.con.value || null, registro: f.reg.value || null, rqe: f.rqe.value || null, email: f.email.value || null, telefone: f.tel.value || null, pode_prescrever: f.pr.checked, ativo: f.at.checked, repasse_tipo: f.rt.value, repasse_valor: Number(f.rv.value || 0) };
      if (!row.nome) { toast("Informe o nome.", true); return false; }
      await ok(x ? sb.from("profissionais").update(row).eq("id", x.id) : sb.from("profissionais").insert(row)); toast("Salvo."); rota(); } }]);
}

function acessoBloco(x) {
  const r = regraAcesso(x.nome), ac = (S.acessos || {})[x.id];
  return h("div", { class: "card", style: "margin-top:14px;background:var(--verde-cl)" }, h("h3", {}, "Acesso ao sistema"),
    h("div", { class: "small" }, ac ? ["Login: ", h("b", {}, ac.login), ac.ativo ? "" : " (desativado)"] : ["Sem acesso ainda. Será criado com login ", h("b", {}, r.login), " e senha padrão ", h("b", {}, r.senha), "."]),
    h("div", { class: "row", style: "margin-top:8px" },
      !ac && h("button", { class: "btn-s btn-p", onclick: async () => { try { const c = await criarAcesso(x); toast("Acesso criado."); rota(); mostraCredenciais([c]); } catch (e) { toast(e.message, true); } } }, "Criar acesso"),
      ac && h("button", { class: "btn-s", onclick: async () => { if (!confirm("Redefinir a senha de " + x.nome + " para a padrão (" + r.senha + ")?")) return; try { await acessoApi({ acao: "redefinir", profissional_id: x.id, senha: r.senha }); toast("Senha redefinida."); mostraCredenciais([{ nome: x.nome, login: ac.login, senha: r.senha }]); } catch (e) { toast(e.message, true); } } }, "Redefinir senha"),
      ac && ac.ativo && h("button", { class: "btn-s btn-d", onclick: async () => { if (!confirm("Desativar o acesso de " + x.nome + "?")) return; try { await acessoApi({ acao: "desativar", profissional_id: x.id }); toast("Acesso desativado."); rota(); } catch (e) { toast(e.message, true); } } }, "Desativar acesso")));
}
