// Assinatura eletrônica no Essária: cada login (recepção e cada profissional) cadastra a própria assinatura desenhada;
// os documentos saem com a assinatura e um carimbo (quem assinou, quando, código de verificação) e podem ser conferidos pelo código.
window.ASSIN = (function () {
  let cache;
  // ---- desenhar a assinatura (mouse, caneta ou dedo) ----
  function pad(titulo, dica) {
    return new Promise(resolve => {
      const cv = h("canvas", { width: 900, height: 300, style: "width:100%;height:190px;border:1px dashed var(--bd);border-radius:10px;background:#fff;touch-action:none;display:block;cursor:crosshair" });
      const c = cv.getContext("2d"); let desenhando = false, tem = false, b = { x0: 1e9, y0: 1e9, x1: -1, y1: -1 }, ult = null;
      c.lineCap = "round"; c.lineJoin = "round"; c.lineWidth = 4; c.strokeStyle = "#16181f";
      const pos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; };
      cv.addEventListener("pointerdown", e => { e.preventDefault(); cv.setPointerCapture(e.pointerId); desenhando = true; ult = pos(e); c.beginPath(); c.arc(ult.x, ult.y, 1.6, 0, 6.3); c.fillStyle = "#16181f"; c.fill(); tem = true; marca(ult); });
      cv.addEventListener("pointermove", e => { if (!desenhando) return; const p = pos(e); c.beginPath(); c.moveTo(ult.x, ult.y); c.lineTo(p.x, p.y); c.stroke(); ult = p; marca(p); });
      const fim = () => { desenhando = false; }; cv.addEventListener("pointerup", fim); cv.addEventListener("pointercancel", fim); cv.addEventListener("pointerleave", fim);
      function marca(p) { b.x0 = Math.min(b.x0, p.x); b.y0 = Math.min(b.y0, p.y); b.x1 = Math.max(b.x1, p.x); b.y1 = Math.max(b.y1, p.y); }
      function exportar() {
        const m = 8, x0 = Math.max(0, b.x0 - m), y0 = Math.max(0, b.y0 - m), w = Math.min(cv.width, b.x1 + m) - x0, hh = Math.min(cv.height, b.y1 + m) - y0;
        const esc = Math.min(1, 520 / w), o = document.createElement("canvas"); o.width = Math.max(1, Math.round(w * esc)); o.height = Math.max(1, Math.round(hh * esc));
        const oc = o.getContext("2d"), src = c.getImageData(x0, y0, w, hh), t = document.createElement("canvas"); t.width = w; t.height = hh; const tc = t.getContext("2d"), px = src.data;
        for (let i = 0; i < px.length; i += 4) { const claro = (px[i] + px[i + 1] + px[i + 2]) / 3; px[i + 3] = Math.max(0, Math.min(255, 255 - claro)); px[i] = 22; px[i + 1] = 24; px[i + 2] = 31; }
        tc.putImageData(src, 0, 0); oc.drawImage(t, 0, 0, o.width, o.height); return o.toDataURL("image/png");
      }
      const limpar = () => { c.clearRect(0, 0, cv.width, cv.height); tem = false; b = { x0: 1e9, y0: 1e9, x1: -1, y1: -1 }; };
      modal(titulo || "Assinatura", h("div", {}, h("div", { class: "small muted", style: "margin-bottom:8px" }, dica || "Desenhe a assinatura na área abaixo, com o dedo, a caneta ou o mouse."), cv),
        [{ t: "Limpar", f: async () => { limpar(); return false; } }, { t: "Cancelar", f: async () => { resolve(null); } },
          { t: "Usar esta assinatura", p: true, f: async () => { if (!tem) { toast("Desenhe a assinatura primeiro.", true); return false; } resolve(exportar()); } }], "560px");
    });
  }
  // ---- assinatura guardada de cada login ----
  async function minha(force) {
    if (cache !== undefined && !force) return cache;
    const r = await sb.from("assinaturas").select("imagem").eq("perfil_id", S.perfil.id).maybeSingle();
    cache = r.error ? null : (r.data ? r.data.imagem : null); return cache;
  }
  async function telaMinha(depois) {
    const atual = await minha(true);
    const prev = atual ? h("img", { src: atual, alt: "Sua assinatura", style: "max-width:100%;max-height:120px;background:#fff;border:1px solid var(--bd);border-radius:8px;padding:6px" }) : h("div", { class: "muted" }, "Nenhuma assinatura cadastrada ainda.");
    modal("Minha assinatura", h("div", {}, h("p", { class: "small muted" }, "Esta assinatura é usada nos documentos que você assina eletronicamente no Essária. Ela fica guardada só para o seu login (" + S.perfil.nome + ")."), prev),
      [{ t: "Fechar" }].concat(atual ? [{ t: "Remover", d: true, f: async () => { const r = await sb.from("assinaturas").delete().eq("perfil_id", S.perfil.id); if (r.error) throw new Error(r.error.message); cache = null; toast("Assinatura removida."); if (depois) depois(); } }] : [],
        [{ t: atual ? "Desenhar de novo" : "Desenhar a assinatura", p: true, f: async () => {
          const img = await pad("Minha assinatura"); if (!img) return;
          const r = await sb.from("assinaturas").upsert({ perfil_id: S.perfil.id, imagem: img, atualizado_em: new Date().toISOString() }, { onConflict: "perfil_id" });
          if (r.error) throw new Error(r.error.message.includes("assinaturas") ? "A tabela de assinaturas ainda não foi criada no banco (falta rodar o SQL)." : r.error.message);
          cache = img; toast("Assinatura salva."); if (depois) depois();
        } }]));
  }
  // ---- carimbo e código de verificação ----
  async function sha256(txt) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join(""); }
  const urlVerificar = cod => location.origin + location.pathname.replace(/index\.html$/, "") + "#/verificar/" + cod;
  async function assinar(doc, quem) {
    const img = await minha(); if (!img) throw new Error("Você ainda não cadastrou a sua assinatura. Use “Minha assinatura” no topo da página.");
    const em = new Date().toISOString(), base = JSON.parse(JSON.stringify(doc)); delete base.assin; if (base.assinPac) base.assinPac = { nome: base.assinPac.nome, em: base.assinPac.em };
    const hash = await sha256(JSON.stringify(base) + "|" + quem.nome + "|" + em);
    doc.assin = { nome: quem.nome, registro: quem.registro || "", tipo: quem.tipo, em, hash, codigo: hash.slice(0, 12).toUpperCase(), imagem: img };
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
  return { pad, minha, telaMinha, assinar, urlVerificar, telaVerificar, sha256 };
})();
