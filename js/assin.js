// Assinatura eletrônica no Essária: cada login (recepção e cada profissional) cadastra a própria assinatura desenhada;
// os documentos saem com a assinatura e um carimbo (quem assinou, quando, código de verificação) e podem ser conferidos pelo código.
window.ASSIN = (function () {
  // ---- desenhar a assinatura (mouse, caneta ou dedo) ----
  function pad(titulo, dica) {
    return new Promise(resolve => {
      const cv = h("canvas", { width: 900, height: 300, style: "width:100%;height:190px;border:1px dashed var(--bd);border-radius:10px;background:#fff;touch-action:none;display:block;cursor:crosshair" });
      const c = cv.getContext("2d"); let desenhando = false, tem = false, b = { x0: 1e9, y0: 1e9, x1: -1, y1: -1 }, ult = null, tracos = [];
      c.lineCap = "round"; c.lineJoin = "round"; c.lineWidth = 4; c.strokeStyle = "#16181f";
      const pos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; };
      cv.addEventListener("pointerdown", e => { e.preventDefault(); cv.setPointerCapture(e.pointerId); desenhando = true; ult = pos(e); c.beginPath(); c.arc(ult.x, ult.y, 1.6, 0, 6.3); c.fillStyle = "#16181f"; c.fill(); tem = true; marca(ult); tracos.push([[ult.x, ult.y]]); });
      cv.addEventListener("pointermove", e => { if (!desenhando) return; const p = pos(e); c.beginPath(); c.moveTo(ult.x, ult.y); c.lineTo(p.x, p.y); c.stroke(); ult = p; marca(p); if (tracos.length && Math.hypot(p.x - tracos[tracos.length - 1].slice(-1)[0][0], p.y - tracos[tracos.length - 1].slice(-1)[0][1]) > 1.5) tracos[tracos.length - 1].push([p.x, p.y]); });
      const fim = () => { desenhando = false; }; cv.addEventListener("pointerup", fim); cv.addEventListener("pointercancel", fim); cv.addEventListener("pointerleave", fim);
      function marca(p) { b.x0 = Math.min(b.x0, p.x); b.y0 = Math.min(b.y0, p.y); b.x1 = Math.max(b.x1, p.x); b.y1 = Math.max(b.y1, p.y); }
      function exportar() {
        const m = 8, x0 = Math.max(0, b.x0 - m), y0 = Math.max(0, b.y0 - m), w = Math.min(cv.width, b.x1 + m) - x0, hh = Math.min(cv.height, b.y1 + m) - y0;
        const esc = Math.min(1, 520 / w), o = document.createElement("canvas"); o.width = Math.max(1, Math.round(w * esc)); o.height = Math.max(1, Math.round(hh * esc));
        const oc = o.getContext("2d"), src = c.getImageData(x0, y0, w, hh), t = document.createElement("canvas"); t.width = w; t.height = hh; const tc = t.getContext("2d"), px = src.data;
        for (let i = 0; i < px.length; i += 4) { const claro = (px[i] + px[i + 1] + px[i + 2]) / 3; px[i + 3] = Math.max(0, Math.min(255, 255 - claro)); px[i] = 22; px[i + 1] = 24; px[i + 2] = 31; }
        tc.putImageData(src, 0, 0); oc.drawImage(t, 0, 0, o.width, o.height);
        const ww = Math.max(1, b.x1 - b.x0), hh2 = Math.max(1, b.y1 - b.y0), r3 = v => Math.round(v * 1000) / 1000;
        return { png: o.toDataURL("image/png"), r: r3(ww / hh2), t: tracos.map(s => s.map(([x, y]) => [r3((x - b.x0) / ww), r3((y - b.y0) / hh2)])) };
      }
      const limpar = () => { c.clearRect(0, 0, cv.width, cv.height); tem = false; tracos = []; b = { x0: 1e9, y0: 1e9, x1: -1, y1: -1 }; };
      modal(titulo || "Assinatura", h("div", {}, h("div", { class: "small muted", style: "margin-bottom:8px" }, dica || "Desenhe a assinatura na área abaixo, com o dedo, a caneta ou o mouse."), cv),
        [{ t: "Limpar", f: async () => { limpar(); return false; } }, { t: "Cancelar", f: async () => { resolve(null); } },
          { t: "Usar esta assinatura", p: true, f: async () => { if (!tem) { toast("Desenhe a assinatura primeiro.", true); return false; } resolve(exportar()); } }], "560px");
    });
  }
  // ---- enviar foto ou PDF da assinatura: limpa o fundo, recorta e guarda ----
  function escolherArquivo() {
    return new Promise(resolve => { const i = h("input", { type: "file", accept: "image/*,application/pdf", style: "position:fixed;left:-9999px" }); i.addEventListener("change", () => { resolve(i.files[0] || null); i.remove(); }); document.body.append(i); i.click(); });
  }
  function carregaScript(src) { return new Promise((ok2, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok2; s.onerror = () => no(new Error("Não consegui carregar o leitor de PDF.")); document.head.append(s); }); }
  async function arquivoParaCanvas(file) {
    const cv = document.createElement("canvas"), c = cv.getContext("2d");
    if (/pdf/i.test(file.type) || /\.pdf$/i.test(file.name)) {
      if (!window.pdfjsLib) await carregaScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise, pg = await pdf.getPage(1), vp0 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: Math.min(3, 1800 / vp0.width) });
      cv.width = Math.round(vp.width); cv.height = Math.round(vp.height); c.fillStyle = "#fff"; c.fillRect(0, 0, cv.width, cv.height); await pg.render({ canvasContext: c, viewport: vp }).promise; return cv;
    }
    const url = URL.createObjectURL(file), im = await new Promise((ok2, no) => { const i = new Image(); i.onload = () => ok2(i); i.onerror = () => no(new Error("Não consegui abrir essa imagem.")); i.src = url; });
    const k = Math.min(1, 1800 / Math.max(im.naturalWidth, im.naturalHeight)); cv.width = Math.round(im.naturalWidth * k); cv.height = Math.round(im.naturalHeight * k); c.fillStyle = "#fff"; c.fillRect(0, 0, cv.width, cv.height); c.drawImage(im, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url); return cv;
  }
  // deixa o fundo branco e a tinta escura; devolve um canvas do mesmo tamanho (sem recorte)
  function limpaFundo(cv) {
    const w = cv.width, hh = cv.height, c = cv.getContext("2d"), im = c.getImageData(0, 0, w, hh), px = im.data, lum = new Float32Array(w * hh), amostra = [];
    for (let i = 0, k = 0; i < px.length; i += 4, k++) { lum[k] = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]; if (k % 7 === 0) amostra.push(lum[k]); }
    amostra.sort((a, b) => a - b); const bg = amostra[Math.floor(amostra.length * 0.9)] || 255, faixa = Math.max(50, bg - 70);
    for (let i = 0, k = 0; i < px.length; i += 4, k++) { let t = (bg - lum[k]) / faixa; t = t < 0.2 ? 0 : Math.min(1, (t - 0.2) / 0.5); const g = Math.round(255 - t * (255 - 24)); px[i] = g; px[i + 1] = g; px[i + 2] = Math.min(255, g + (t ? 6 : 0)); px[i + 3] = 255; }
    const o = document.createElement("canvas"); o.width = w; o.height = hh; o.getContext("2d").putImageData(im, 0, 0); return o;
  }
  function recorta(cv, r) { // r: {x,y,w,h} em pixels do canvas, ou nulo = achar sozinho a área com tinta
    const c = cv.getContext("2d"); let x0 = 0, y0 = 0, x1 = cv.width, y1 = cv.height;
    if (r) { x0 = Math.max(0, r.x); y0 = Math.max(0, r.y); x1 = Math.min(cv.width, r.x + r.w); y1 = Math.min(cv.height, r.y + r.h); }
    const d = c.getImageData(x0, y0, x1 - x0, y1 - y0), p = d.data, W = x1 - x0; let a = 1e9, b = 1e9, e = -1, f = -1;
    for (let i = 0; i < p.length; i += 4) { if (p[i] < 200) { const k = i / 4, x = k % W, y = (k - x) / W; if (x < a) a = x; if (x > e) e = x; if (y < b) b = y; if (y > f) f = y; } }
    if (e < 0) throw new Error("Não encontrei uma assinatura nessa imagem. Tente uma foto com a assinatura mais escura, em fundo claro.");
    const m = 8, sx = Math.max(0, x0 + a - m), sy = Math.max(0, y0 + b - m), sw = Math.min(cv.width - sx, e - a + 2 * m), sh = Math.min(cv.height - sy, f - b + 2 * m), k = Math.min(1, 520 / sw);
    const o = document.createElement("canvas"); o.width = Math.max(1, Math.round(sw * k)); o.height = Math.max(1, Math.round(sh * k)); const oc = o.getContext("2d"); oc.fillStyle = "#fff"; oc.fillRect(0, 0, o.width, o.height); oc.drawImage(cv, sx, sy, sw, sh, 0, 0, o.width, o.height);
    return { png: o.toDataURL("image/png"), r: Math.round(sw / sh * 1000) / 1000 };
  }
  // abre o arquivo, limpa e deixa a pessoa marcar só a assinatura (se houver mais coisas na imagem); devolve { png, r } ou nulo
  async function converterArquivo(file) {
    const limpo = limpaFundo(await arquivoParaCanvas(file));
    return new Promise((resolve, reject) => {
      const vis = h("canvas", { width: limpo.width, height: limpo.height, style: "width:100%;border:1px solid var(--bd);border-radius:8px;background:#fff;touch-action:none;cursor:crosshair" }), vc = vis.getContext("2d"); let ini = null, ret = null;
      const desenha = () => { vc.drawImage(limpo, 0, 0); if (ret) { vc.strokeStyle = "#c0562b"; vc.lineWidth = Math.max(2, limpo.width / 300); vc.strokeRect(ret.x, ret.y, ret.w, ret.h); } };
      const pos = e => { const r = vis.getBoundingClientRect(); return { x: (e.clientX - r.left) * vis.width / r.width, y: (e.clientY - r.top) * vis.height / r.height }; };
      vis.addEventListener("pointerdown", e => { vis.setPointerCapture(e.pointerId); ini = pos(e); ret = null; });
      vis.addEventListener("pointermove", e => { if (!ini) return; const p = pos(e); ret = { x: Math.min(ini.x, p.x), y: Math.min(ini.y, p.y), w: Math.abs(p.x - ini.x), h: Math.abs(p.y - ini.y) }; desenha(); });
      vis.addEventListener("pointerup", () => { ini = null; if (ret && (ret.w < 20 || ret.h < 20)) { ret = null; desenha(); } });
      desenha();
      modal("Conferir a assinatura", h("div", {}, h("p", { class: "small muted" }, "Se a imagem tem mais coisa além da assinatura, arraste o mouse (ou o dedo) para marcar só a assinatura. Se estiver só ela, é só usar."), vis),
        [{ t: "Cancelar", f: async () => { resolve(null); } }, { t: ret ? "Usar a área marcada" : "Usar a assinatura", p: true, f: async () => { try { resolve(recorta(limpo, ret)); } catch (e) { reject(e); } } }], "720px");
    });
  }
  async function salvarImagem(perfilId, nome, img) {
    const r = await sb.from("assinaturas").upsert({ perfil_id: perfilId, nome: nome || "", imagem: JSON.stringify(img), atualizado_em: new Date().toISOString() }, { onConflict: "perfil_id,nome" });
    if (r.error) throw new Error(r.error.message.includes("row-level") ? "Sem permissão para salvar essa assinatura." : r.error.message);
    if (perfilId === S.perfil.id) cache[nome || ""] = img;
  }
  // fluxo completo: escolher o arquivo, converter, conferir e salvar para (perfilId, nome)
  async function enviarArquivo(perfilId, nome, rot, depois) {
    const f = await escolherArquivo(); if (!f) return;
    try { toast("Lendo o arquivo…"); const img = await converterArquivo(f); if (!img) return; await salvarImagem(perfilId, nome, img); toast("Assinatura de " + rot + " salva."); if (depois) depois(); }
    catch (e) { toast(e.message || String(e), true); }
  }
  // ---- assinatura guardada: profissional = 1 por login; recepção = 1 por nome escolhido (Aline, Shirlem...) ----
  const cache = {};
  async function nomesRecepcao() {
    if (nomesRecepcao.v) return nomesRecepcao.v;
    let l = null; try { const r = await sb.from("configuracoes").select("valor").eq("chave", "assinantes_recepcao").maybeSingle(); l = r.data && r.data.valor; } catch (e) {}
    nomesRecepcao.v = Array.isArray(l) && l.length ? l : [{ nome: "Aline Araújo", cargo: "Administração" }, { nome: "Shirlem", cargo: "Recepção" }]; return nomesRecepcao.v;
  }
  async function minha(nome, force) {
    nome = nome || ""; if (cache[nome] !== undefined && !force) return cache[nome];
    const r = await sb.from("assinaturas").select("imagem").eq("perfil_id", S.perfil.id).eq("nome", nome).maybeSingle();
    let v = r.error || !r.data ? null : r.data.imagem; try { v = v && v.charAt(0) === "{" ? JSON.parse(v) : null; } catch (e) { v = null; } cache[nome] = v; return v;
  }
  async function telaMinha(depois, nomeIn) {
    const gest = ehGestao();
    if (gest && nomeIn === undefined) {
      const L = await nomesRecepcao(), est = await Promise.all(L.map(x => minha(x.nome, true)));
      modal("Assinaturas da recepção", h("div", {}, h("p", { class: "small muted" }, "Na recepção, cada pessoa que assina tem a sua assinatura desenhada. Na hora de assinar um documento, escolha o nome que deve aparecer."),
        L.map((x, k) => h("div", { class: "row", style: "margin:8px 0;align-items:center" }, h("b", { class: "grow" }, x.nome, h("span", { class: "muted small" }, " (" + x.cargo + ")")), est[k] ? h("span", { class: "chip realizada" }, "cadastrada") : h("span", { class: "chip faltou" }, "falta"),
          h("button", { class: "btn-s", onclick: () => { const m = document.querySelector(".mask"); if (m) m.remove(); telaMinha(depois, x.nome); } }, est[k] ? "Refazer" : "Desenhar"), h("button", { class: "btn-s", onclick: () => { const m = document.querySelector(".mask"); if (m) m.remove(); enviarArquivo(S.perfil.id, x.nome, x.nome, () => telaMinha(depois)); } }, "Enviar foto ou PDF")))), [{ t: "Fechar" }]); return;
    }
    const nome = gest ? nomeIn : "", rot = gest ? nomeIn : S.perfil.nome, atual = await minha(nome, true);
    const prev = atual ? h("img", { src: atual.png, alt: "Assinatura", style: "max-width:100%;max-height:120px;background:#fff;border:1px solid var(--bd);border-radius:8px;padding:6px" }) : h("div", { class: "muted" }, "Nenhuma assinatura cadastrada ainda.");
    modal("Assinatura de " + rot, h("div", {}, h("p", { class: "small muted" }, "Esta assinatura é usada nos documentos que " + rot + " assina eletronicamente no Essária."), prev),
      [{ t: "Fechar" }].concat(atual ? [{ t: "Remover", d: true, f: async () => { const r = await sb.from("assinaturas").delete().eq("perfil_id", S.perfil.id).eq("nome", nome); if (r.error) throw new Error(r.error.message); cache[nome] = null; toast("Assinatura removida."); if (depois) depois(); } }] : [],
        [{ t: "Enviar foto ou PDF", f: async () => { await enviarArquivo(S.perfil.id, nome, rot, depois); } }, { t: atual ? "Desenhar de novo" : "Desenhar a assinatura", p: true, f: async () => {
          const img = await pad("Assinatura de " + rot); if (!img) return;
          const r = await sb.from("assinaturas").upsert({ perfil_id: S.perfil.id, nome, imagem: JSON.stringify(img), atualizado_em: new Date().toISOString() }, { onConflict: "perfil_id,nome" });
          if (r.error) throw new Error(r.error.message.includes("assinaturas") ? "A tabela de assinaturas ainda não foi criada no banco (falta rodar o SQL)." : r.error.message);
          cache[nome] = img; toast("Assinatura salva."); if (depois) depois();
        } }]));
  }
  // ---- carimbo e código de verificação ----
  async function sha256(txt) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join(""); }
  const urlVerificar = cod => location.origin + location.pathname.replace(/index\.html$/, "") + "#/verificar/" + cod;
  // quem: { nome, tipo: "profissional" | "gestao", registro, area, cargo }
  async function assinar(doc, quem) {
    const img = await minha(quem.tipo === "gestao" ? quem.nome : ""); if (!img) throw new Error("Falta a assinatura de " + quem.nome + ". Cadastre em “Minha assinatura”, no topo da página.");
    const em = new Date().toISOString(), base = JSON.parse(JSON.stringify(doc)); delete base.assin;
    const hash = await sha256(JSON.stringify(base) + "|" + quem.nome + "|" + em);
    doc.assin = { nome: quem.nome, registro: quem.registro || "", area: quem.area || "", cargo: quem.cargo || "", tipo: quem.tipo, em, hash, codigo: hash.slice(0, 12).toUpperCase(), imagem: img.t ? { t: img.t, r: img.r } : { png: img.png, r: img.r } };
    return doc;
  }
  // ---- conferência pública por código ----
  function telaVerificar(cod) {
    const inp = h("input", { placeholder: "Código do documento (12 letras e números)", value: cod || "", style: "text-transform:uppercase" }), res = h("div", { style: "margin-top:12px" });
    const conferir = async () => {
      const c = inp.value.trim().toUpperCase(); if (c.length < 8) return toast("Digite o código completo.", true);
      res.replaceChildren(h("div", { class: "muted" }, "Conferindo…"));
      const r = await sb.rpc("verificar_documento", { p_codigo: c });
      const x = r.data && r.data[0];
      if (r.error || !x) { res.replaceChildren(h("div", { class: "warn" }, r.error ? "Não foi possível conferir agora." : "Código não encontrado. Confira se digitou certo.")); return; }
      const tit = { receita: "Receituário", exames: "Solicitação de exames", relatorio: "Relatório", declaracao: "Declaração de comparecimento", encaminhamento: "Encaminhamento", recibo: "Recibo", risco: "Avaliação de risco cirúrgico", termo: "Termo de consentimento", contrato: "Contrato de prestação de serviços" }[x.tipo] || x.tipo;
      res.replaceChildren(h("div", { class: "card", style: "border-left:5px solid var(--ok);margin:0" }, h("b", { style: "color:var(--ok)" }, "✓ Documento emitido e assinado eletronicamente por este sistema"),
        h("div", { class: "kv", style: "margin-top:8px" }, h("div", {}, "Documento"), h("div", {}, tit), h("div", {}, "Data"), h("div", {}, fmtData(x.data + "T12:00:00-04:00")), h("div", {}, "Assinado por"), h("div", {}, x.assinante + (x.registro ? " · " + x.registro : "")), h("div", {}, "Clínica"), h("div", {}, x.empresa), h("div", {}, "Assinado em"), h("div", {}, fmtDataHora(x.assinado_em)), h("div", {}, "Impressão digital"), h("div", { style: "font-size:11px;word-break:break-all" }, x.hash))));
    };
    inp.addEventListener("keydown", e => { if (e.key === "Enter") conferir(); });
    boasVindas(h("div", {}, h("h2", {}, "Conferir documento"), h("p", { class: "small muted" }, "Digite o código que aparece no rodapé da assinatura do documento. Por privacidade, o nome do paciente não aparece aqui."), campo("Código", inp), h("div", { class: "row", style: "margin-top:10px" }, h("button", { class: "btn-p grow", onclick: conferir }, "Conferir")), res));
    if (cod) conferir();
  }
  return { pad, minha, nomesRecepcao, telaMinha, assinar, urlVerificar, telaVerificar, sha256, enviarArquivo };
})();
