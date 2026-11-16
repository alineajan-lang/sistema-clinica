// Editor de texto do Essária (relatos de sessão e outros textos): formatação, listas, tabela, modelos, tela cheia e limpeza ao colar.
window.RTE = (function () {
  const TAGS = ["p", "br", "b", "strong", "i", "em", "u", "s", "strike", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "hr", "table", "thead", "tbody", "tr", "td", "th", "span", "font", "div", "mark", "sub", "sup", "a"];
  const limpa = (html, comEstilo) => DOMPurify.sanitize(html || "", { ALLOWED_TAGS: TAGS, ALLOWED_ATTR: comEstilo === false ? ["colspan", "rowspan"] : ["style", "color", "size", "colspan", "rowspan", "href", "target", "rel"] });
  const CORES = ["#16181f", "#b3261e", "#c0562b", "#b26a00", "#2e7d32", "#1565c0", "#6a1b9a", "#7a7a72"], REAL = ["#fff3a3", "#ffd6d6", "#d6f5d6", "#d6e8ff", "#f0d9ff", "#ffe3c2"];
  const t = (titulo, itens) => "<h3>" + titulo + "</h3><p><br></p>";
  const sec = (...ts) => ts.map(x => "<h3>" + x + "</h3><p><br></p>").join("");
  const MODELOS = [
    { g: "Psicologia e terapias", n: "Relato estruturado da sessão", h: sec("Como o paciente chegou", "O que foi trabalhado", "Intervenções realizadas", "Evolução e observações", "Combinados e próxima sessão") },
    { g: "Psicologia e terapias", n: "Primeira sessão / acolhimento", h: sec("Queixa e demanda", "Expectativas do paciente", "Histórico resumido", "Combinados do atendimento (frequência, faltas, sigilo)", "Hipóteses iniciais", "Plano e próximos passos") },
    { g: "Psicologia e terapias", n: "Sessão infantil / ludoterapia", h: sec("Recursos e atividades lúdicas", "Comportamento e falas da criança", "Vínculo e interação", "Orientações aos responsáveis", "Observações para a próxima sessão") },
    { g: "Psicologia e terapias", n: "Devolutiva", h: sec("Resumo do processo", "Resultados e compreensão do caso", "Orientações", "Encaminhamentos", "Combinados finais") },
    { g: "Psicologia e terapias", n: "Contato com familiar ou escola", h: sec("Com quem foi o contato", "Motivo", "O que foi conversado", "Combinados") },
    { g: "Formatos conhecidos", n: "SOAP (subjetivo, objetivo, avaliação, plano)", h: sec("S - Subjetivo (relato do paciente)", "O - Objetivo (o que foi observado)", "A - Avaliação", "P - Plano") },
    { g: "Formatos conhecidos", n: "DAP (dados, avaliação, plano)", h: sec("D - Dados", "A - Avaliação", "P - Plano") },
    { g: "Formatos conhecidos", n: "BIRP (comportamento, intervenção, resposta, plano)", h: sec("B - Comportamento", "I - Intervenção", "R - Resposta do paciente", "P - Plano") },
    { g: "Medicina", n: "Consulta médica", h: sec("Queixa principal", "História da doença atual", "Antecedentes e medicações em uso", "Exame físico", "Hipótese diagnóstica", "Conduta e prescrição", "Retorno") },
    { g: "Medicina", n: "Retorno médico", h: sec("Evolução desde a última consulta", "Exames trazidos", "Conduta", "Retorno") },
    { g: "Rápidos", n: "Evolução breve", h: "<p><b>Evolução:</b> </p><p><b>Conduta:</b> </p>" },
    { g: "Rápidos", n: "Falta ou cancelamento", h: "<p><b>Falta/cancelamento:</b> o paciente não compareceu / cancelou. Motivo informado: </p><p><b>Reagendamento:</b> </p>" }
  ];
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch (e) {}

  // opts: { html, placeholder, altura, onChange, modelosPessoais: { listar(), salvar(titulo, html), excluir(id) } | null }
  function criar(opts) {
    opts = opts || {};
    const area = h("div", { class: "rte-area", contenteditable: "true", role: "textbox", "aria-multiline": "true", spellcheck: "true", lang: "pt-BR", "data-ph": opts.placeholder || "Escreva aqui…", style: "min-height:" + (opts.altura || 220) + "px" });
    area.innerHTML = limpa(opts.html || "");
    const raiz = h("div", { class: "rte" }), barra = h("div", { class: "rte-bar" }), pe = h("div", { class: "rte-foot" }), cont = h("span", { class: "rte-count" }, ""), pop = h("div", { class: "rte-pop", hidden: true });
    let tam = 15; try { tam = Number(localStorage.getItem("rte-tam")) || 15; } catch (e) {} area.style.fontSize = tam + "px";
    const mudou = () => { if (!area.textContent.trim() && !area.querySelector("table,hr,img")) { if (area.innerHTML !== "") area.innerHTML = ""; } contar(); opts.onChange && opts.onChange(); };
    const contar = () => { const tx = area.innerText.trim(), pal = tx ? tx.split(/\s+/).length : 0; cont.textContent = pal + " palavra" + (pal === 1 ? "" : "s") + " · " + tx.length + " caracteres"; };
    const exec = (cmd, arg) => { area.focus(); try { document.execCommand("styleWithCSS", false, cmd === "foreColor" || cmd === "hiliteColor"); } catch (e) {} document.execCommand(cmd, false, arg); mudou(); marcar(); };
    const btn = (rot, titulo, fn, cls) => h("button", { type: "button", class: "rte-b " + (cls || ""), title: titulo, "aria-label": titulo, onmousedown: e => e.preventDefault(), onclick: e => { e.preventDefault(); fechaPop(); fn(); } }, rot);
    const estados = [];
    const cmdBtn = (rot, titulo, cmd, arg, st) => { const b = btn(rot, titulo, () => exec(cmd, arg), cmd === "bold" ? "n" : cmd === "italic" ? "i" : cmd === "underline" ? "u" : cmd === "strikeThrough" ? "s" : ""); if (st) estados.push([b, st]); return b; };
    const marcar = () => { estados.forEach(([b, c]) => { let on = false; try { on = document.queryCommandState(c); } catch (e) {} b.classList.toggle("on", on); }); };
    function fechaPop() { pop.hidden = true; pop.replaceChildren(); }
    const abrePop = (ancora, conteudo) => { const mostrado = !pop.hidden && pop._de === ancora; fechaPop(); if (mostrado) return; pop._de = ancora; pop.append(conteudo); pop.hidden = false; const r = ancora.getBoundingClientRect(), rr = raiz.getBoundingClientRect(); pop.style.left = Math.max(0, Math.min(r.left - rr.left, rr.width - 260)) + "px"; pop.style.top = (r.bottom - rr.top + 4) + "px"; };
    const grupo = (...f) => h("span", { class: "rte-g" }, f);
    // estilo e tamanho
    const selEstilo = h("select", { class: "rte-s", title: "Estilo do parágrafo", "aria-label": "Estilo do parágrafo", onchange: e => { const v = e.target.value; e.target.value = ""; area.focus(); document.execCommand("formatBlock", false, v); mudou(); } }, [["", "Estilo"], ["p", "Texto normal"], ["h3", "Título"], ["h4", "Subtítulo"], ["blockquote", "Citação"]].map(([v, l]) => h("option", { value: v }, l)));
    const selTam = h("select", { class: "rte-s", title: "Tamanho da letra", "aria-label": "Tamanho da letra", onchange: e => { const v = e.target.value; e.target.value = ""; if (v) exec("fontSize", v); } }, [["", "Tamanho"], ["2", "Pequeno"], ["3", "Normal"], ["5", "Grande"], ["6", "Enorme"]].map(([v, l]) => h("option", { value: v }, l)));
    // cores
    const cores = (lista, cmd, rot) => { const c = h("div", { class: "rte-cores" }, lista.map(cor => h("button", { type: "button", class: "rte-cor", title: cor, style: "background:" + cor, onmousedown: e => e.preventDefault(), onclick: () => { exec(cmd, cor); fechaPop(); } })), h("button", { type: "button", class: "rte-lim", onmousedown: e => e.preventDefault(), onclick: () => { exec(cmd, cmd === "foreColor" ? "#16181f" : "transparent"); fechaPop(); } }, "Sem " + rot)); return c; };
    const bCor = btn("A", "Cor da letra", () => abrePop(bCor, cores(CORES, "foreColor", "cor")), "cor"), bReal = btn("🖍", "Marca-texto (realce)", () => abrePop(bReal, cores(REAL, "hiliteColor", "realce")), "real");
    bCor.style.setProperty("--c", "#b3261e");
    // inserir
    const dt = () => new Date(), fd = d => d.toLocaleDateString("pt-BR", { timeZone: TZ }), fh = d => d.toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
    const ins = h("div", {}, [["Data de hoje", () => exec("insertText", fd(dt()))], ["Data e hora agora", () => exec("insertText", fd(dt()) + " às " + fh(dt()))], ["Linha divisória", () => exec("insertHorizontalRule")],
      ["Tabela 3 × 3", () => exec("insertHTML", "<table><tbody>" + "<tr><td><br></td><td><br></td><td><br></td></tr>".repeat(3) + "</tbody></table><p><br></p>")], ["Lista de tarefas (☐)", () => exec("insertHTML", "<p>☐ </p><p>☐ </p><p>☐ </p>")]].map(([l, f]) => h("button", { type: "button", class: "rte-it", onmousedown: e => e.preventDefault(), onclick: () => { fechaPop(); f(); } }, l)));
    const bIns = btn("＋ Inserir", "Inserir data, linha, tabela…", () => abrePop(bIns, ins), "txt");
    // modelos
    const bMod = btn("📋 Modelos", "Começar de um modelo pronto ou dos seus modelos", async () => {
      const c = h("div", { class: "rte-mods" }); let grupoAtual = "";
      MODELOS.forEach(m => { if (m.g !== grupoAtual) { grupoAtual = m.g; c.append(h("div", { class: "rte-gl" }, m.g)); } c.append(h("button", { type: "button", class: "rte-it", onmousedown: e => e.preventDefault(), onclick: () => { fechaPop(); usarModelo(m.h); } }, m.n)); });
      if (opts.modelosPessoais) {
        c.append(h("div", { class: "rte-gl" }, "Meus modelos"));
        let meus = []; try { meus = await opts.modelosPessoais.listar(); } catch (e) { meus = null; }
        if (meus === null) c.append(h("div", { class: "rte-vz" }, "Ainda não ativado no banco."));
        else { if (!meus.length) c.append(h("div", { class: "rte-vz" }, "Você ainda não salvou modelos.")); meus.forEach(m => c.append(h("div", { class: "rte-mp" }, h("button", { type: "button", class: "rte-it", onmousedown: e => e.preventDefault(), onclick: () => { fechaPop(); usarModelo(m.html); } }, m.titulo), h("button", { type: "button", class: "rte-x", title: "Excluir este modelo", onmousedown: e => e.preventDefault(), onclick: async () => { if (!confirm("Excluir o modelo “" + m.titulo + "”?")) return; try { await opts.modelosPessoais.excluir(m.id); toast("Modelo excluído."); fechaPop(); } catch (e) { toast(e.message, true); } } }, "✕")))); }
        c.append(h("button", { type: "button", class: "rte-it rte-salva", onmousedown: e => e.preventDefault(), onclick: async () => { fechaPop(); const nome = prompt("Nome do modelo (o texto atual vira modelo para os próximos relatos):"); if (!nome || !nome.trim()) return; if (!area.textContent.trim()) return toast("Escreva o texto do modelo primeiro.", true); try { await opts.modelosPessoais.salvar(nome.trim(), get()); toast("Modelo salvo em “Meus modelos”."); } catch (e) { toast("Não foi possível salvar o modelo: " + e.message, true); } } }, "＋ Salvar o texto atual como modelo"));
      }
      abrePop(bMod, c);
    }, "txt");
    function usarModelo(html) { area.focus(); if (area.textContent.trim() && !confirm("Já existe texto aqui. Inserir o modelo no final, sem apagar o que você escreveu?")) return; if (area.textContent.trim()) area.insertAdjacentHTML("beforeend", limpa(html)); else area.innerHTML = limpa(html); mudou(); const c = document.createRange(); c.selectNodeContents(area); c.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(c); }
    // tela cheia e zoom
    const bTela = btn("⛶", "Tela cheia (Esc para sair)", () => alterna(), "tela");
    function alterna() { const on = raiz.classList.toggle("rte-full"); document.body.classList.toggle("rte-aberto", on); bTela.classList.toggle("on", on); if (on) area.focus(); }
    const zoom = d => { tam = Math.max(12, Math.min(24, tam + d)); area.style.fontSize = tam + "px"; try { localStorage.setItem("rte-tam", String(tam)); } catch (e) {} };
    barra.append(
      grupo(btn("↶", "Desfazer (Ctrl+Z)", () => exec("undo")), btn("↷", "Refazer (Ctrl+Y)", () => exec("redo"))),
      grupo(selEstilo, selTam),
      grupo(cmdBtn("B", "Negrito (Ctrl+B)", "bold", null, "bold"), cmdBtn("I", "Itálico (Ctrl+I)", "italic", null, "italic"), cmdBtn("U", "Sublinhado (Ctrl+U)", "underline", null, "underline"), cmdBtn("S", "Tachado", "strikeThrough", null, "strikeThrough"), bCor, bReal),
      grupo(cmdBtn("• ≡", "Lista com marcadores", "insertUnorderedList", null, "insertUnorderedList"), cmdBtn("1. ≡", "Lista numerada", "insertOrderedList", null, "insertOrderedList"), cmdBtn("⇥", "Aumentar recuo", "indent"), cmdBtn("⇤", "Diminuir recuo", "outdent")),
      grupo(cmdBtn("⬅", "Alinhar à esquerda", "justifyLeft"), cmdBtn("↔", "Centralizar", "justifyCenter"), cmdBtn("➡", "Alinhar à direita", "justifyRight"), cmdBtn("☰", "Justificar", "justifyFull")),
      grupo(bIns, bMod),
      grupo(btn("Tx", "Limpar a formatação do trecho selecionado", () => exec("removeFormat")), btn("A−", "Letra menor", () => zoom(-1)), btn("A+", "Letra maior", () => zoom(1)), bTela));
    pe.append(cont, h("span", { class: "rte-dica" }, "Salva sozinho enquanto você escreve · Ctrl+B negrito, Ctrl+I itálico, Ctrl+U sublinhado"));
    raiz.append(barra, pop, area, pe);
    area.addEventListener("input", mudou); area.addEventListener("keyup", marcar); area.addEventListener("mouseup", marcar);
    document.addEventListener("selectionchange", () => { if (raiz.contains(document.activeElement)) marcar(); });
    document.addEventListener("click", e => { if (!pop.hidden && !pop.contains(e.target) && !barra.contains(e.target)) fechaPop(); });
    area.addEventListener("keydown", e => { if (e.key === "Escape" && raiz.classList.contains("rte-full")) { e.preventDefault(); alterna(); } });
    area.addEventListener("paste", e => { const cd = e.clipboardData; if (!cd) return; e.preventDefault(); const ht = cd.getData("text/html"), tx = cd.getData("text/plain"); if (ht) document.execCommand("insertHTML", false, limpa(ht, false)); else document.execCommand("insertText", false, tx); mudou(); });
    const get = () => (area.textContent.trim() || area.querySelector("table,hr")) ? limpa(area.innerHTML).replace(/<p>\s*<\/p>/g, "") : "";
    const set = html => { area.innerHTML = limpa(html || ""); contar(); };
    contar();
    return { el: raiz, area, get, set, foco: () => area.focus(), vazio: () => !get() };
  }
  // converte o HTML do relato em texto simples (para copiar)
  const paraTexto = html => { const d = document.createElement("div"); d.innerHTML = limpa(html || ""); d.querySelectorAll("p,h2,h3,h4,li,tr,blockquote,div").forEach(n => n.append("\n")); d.querySelectorAll("br").forEach(n => n.replaceWith("\n")); d.querySelectorAll("td,th").forEach(n => n.append("\t")); return d.textContent.replace(/\n{3,}/g, "\n\n").trim(); };
  return { criar, limpa, paraTexto, MODELOS, esc };
})();
