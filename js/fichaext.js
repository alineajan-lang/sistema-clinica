// Barra lateral da ficha (como a do Doctoralia): comentários e "outras informações médicas" (alergias, prescrições, antecedentes, outros).
// Salva sozinha ao sair do campo. Fica na tabela paciente_info, que segue as mesmas regras de acesso do prontuário.
async function fichaLateral(p) {
  let info = {}, ativo = true;
  try {
    const r = await sb.from("paciente_info").select("*").eq("paciente_id", p.id).maybeSingle();
    if (r.error) ativo = false; else info = r.data || {};
  } catch (e) { ativo = false; }
  if (!ativo) return null; // tabela ainda não criada ou sem acesso: a ficha segue sem a barra
  const nasc = p.nascimento ? idade(p.nascimento) : "";
  const campos = [["comentarios", "Comentários", "Adicione suas notas sobre este paciente"], ["alergias", "Alergias", ""], ["prescricoes", "Prescrições", ""], ["antecedentes", "Antecedentes", ""], ["outros", "Outros", ""]];
  const estado = h("div", { class: "small muted", style: "min-height:18px" }, "");
  const salvar = async (campo, valor) => {
    estado.textContent = "Salvando…";
    const r = await sb.from("paciente_info").upsert({ paciente_id: p.id, [campo]: valor || null, atualizado_em: new Date().toISOString() }, { onConflict: "paciente_id" });
    estado.textContent = r.error ? "Não foi possível salvar: " + r.error.message : "Salvo às " + hhmm(new Date());
    if (r.error) toast("Não foi possível salvar: " + r.error.message, true); else info[campo] = valor;
  };
  const ta = ([k, rot, ph]) => { const t = h("textarea", { placeholder: ph || "Nada informado", rows: k === "comentarios" ? 4 : 2, style: "min-height:0" }); t.value = info[k] || ""; t.addEventListener("blur", () => { if ((t.value || "") !== (info[k] || "")) salvar(k, t.value.trim()); }); return h("div", {}, h("label", {}, rot), t); };
  return h("aside", { class: "card ficha-lat" },
    h("div", { class: "ficha-av" }, (p.nome || "?").split(" ").filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase()),
    h("div", { class: "right", style: "text-align:center" }, h("b", {}, p.nome), nasc && h("div", { class: "small muted" }, nasc)),
    h("div", { class: "small", style: "margin:10px 0" }, p.email && h("div", {}, "✉ " + p.email), p.telefone && h("div", {}, "☎ " + p.telefone)),
    ta(campos[0]), h("h3", { style: "margin-top:14px" }, "Outras informações médicas"), campos.slice(1).map(ta), estado);
}
