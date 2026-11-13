/* Modelos de anamnese (do Sistema Atlas + modelos adulto, casal e infantil/adolescente da Essência). Campos: [id, rótulo, tipo(text|area|sel|chk), opções] */
  var RISCO_PSI=["Não informado","Nunca teve","Teve no passado","Tem atualmente, sem plano","Tem atualmente, com plano ou intenção"];
  var INSIGHT=["Não avaliado","Ausente","Parcial","Adequado"];
  var OP_RISCO=["Não avaliado","Baixo","Intermediário","Alto","Muito alto"];
  var CD_FR=["Hipertensão arterial","Diabetes","Dislipidemia","Tabagismo","Obesidade","Sedentarismo","Menopausa precoce","Doença renal crônica","Apneia do sono","Doença da tireoide","Estresse crônico"];
  var CD_ANT=["Infarto prévio","Angioplastia ou stent","Cirurgia de revascularização","Valvopatia","Fibrilação atrial ou outra arritmia","AVC ou AIT","Insuficiência cardíaca","Doença arterial periférica","Cardiopatia congênita","Febre reumática","Doença de Chagas","Marcapasso ou CDI","Miocardiopatia","Pericardite ou miocardite"];
  var NR_FR=["Hipertensão arterial","Diabetes","Dislipidemia","Tabagismo","Obesidade","Sedentarismo","Apneia do sono","Fibrilação atrial ou outra arritmia","Doença da tireoide","Doença renal crônica","Deficiência de vitamina B12 ou D","Depressão ou ansiedade"];
  var NR_ANT=["AVC ou AIT","Epilepsia ou crise convulsiva","Enxaqueca","Traumatismo cranioencefálico","Meningite ou encefalite","Cirurgia de crânio ou coluna","Neuropatia periférica","Doença de Parkinson ou parkinsonismo","Demência ou comprometimento cognitivo","Esclerose múltipla ou doença desmielinizante","Doença neuromuscular","Câncer"];
  var CHAD=[["Insuficiência cardíaca ou disfunção de VE",1],["Hipertensão",1],["Idade de 75 anos ou mais",2],["Diabetes",1],["AVC, AIT ou tromboembolismo",2],["Doença vascular (infarto, doença arterial periférica, placa aórtica)",1],["Idade de 65 a 74 anos",1],["Sexo feminino",1]];
  var HASB=[["Hipertensão não controlada (PAS acima de 160)",1],["Doença renal grave",1],["Doença hepática grave",1],["AVC prévio",1],["Sangramento prévio ou predisposição",1],["INR lábil",1],["Idade acima de 65 anos",1],["Uso de drogas que favorecem sangramento",1],["Álcool em excesso",1]];
  var GN_FR=["Hipertensão arterial","Diabetes","Dislipidemia","Tabagismo","Obesidade","Trombofilia ou trombose venosa prévia","Enxaqueca com aura","Doença da tireoide","Endometriose","Síndrome dos ovários policísticos","Miomatose uterina","Câncer de mama","Câncer de colo do útero, ovário ou endométrio"];
  var ANAMS={
    psicologia:{nome:"Psicologia",grupos:[
      {t:"1. Demanda e motivo da busca",c:[
        ["psMotivo","Motivo da busca, nas palavras do paciente","area"],
        ["psInicio","Quando começou e o que acontecia na vida da pessoa nessa época","area"],
        ["psAgrava","O que piora e o que alivia","area"],
        ["psImpacto","Impacto no trabalho ou estudo, nas relações, no sono e na saúde","area"],
        ["psExpect","O que o paciente espera do atendimento e seus objetivos","area"],
        ["psOrigem","Como chegou à Atlas (indicação, serviço público, parceiro, outro)","text"]]},
      {t:"2. Histórico de saúde mental",c:[
        ["psTrat","Tratamentos psicológicos ou psiquiátricos anteriores (quando, por quanto tempo, resultado e motivo de parar)","area"],
        ["psDiag","Diagnósticos já recebidos","area"],
        ["psMed","Medicamentos em uso e já usados (nome, dose, quem prescreveu)","area"],
        ["psInt","Internações ou atendimentos de urgência em saúde mental","area"],
        ["psRisco","Pensamentos de morte ou de se machucar","sel",RISCO_PSI],
        ["psRiscoDet","Detalhes do risco: quando, com que frequência, plano, tentativas anteriores, autolesão","area"],
        ["psProt","Fatores de proteção (família, filhos, fé, projetos, vínculo com a terapia)","area"]]},
      {t:"3. Saúde geral e hábitos",c:[
        ["psSaude","Doenças, cirurgias, dores crônicas, alergias, gestação","area"],
        ["psSono","Sono: horário, horas por noite, dificuldade para dormir ou acordar, pesadelos","area"],
        ["psAlim","Alimentação e apetite","text"],
        ["psAtiv","Atividade física e lazer","text"],
        ["psSubst","Álcool, tabaco, cannabis e outras substâncias (tipo, quantidade, frequência)","area"],
        ["psTelas","Uso de telas, jogos ou apostas","text"]]},
      {t:"4. Família e história de vida",c:[
        ["psMora","Com quem mora e como é a convivência","area"],
        ["psFam","Família de origem: pais, irmãos, relação e dinâmica","area"],
        ["psFamPsi","Casos de transtorno mental, suicídio ou dependência na família","area"],
        ["psInfancia","Infância e adolescência: escola, eventos marcantes","area"],
        ["psTrauma","Perdas, lutos, violência, abuso ou outros eventos difíceis","area"]]},
      {t:"5. Vida social, trabalho e contexto",c:[
        ["psRel","Relacionamento afetivo, filhos, amizades e rede de apoio","area"],
        ["psTrab","Trabalho ou estudo: ocupação, carga, satisfação, conflitos","area"],
        ["psFin","Situação financeira e de moradia","area"],
        ["psEsp","Religião ou espiritualidade, e como isso ajuda ou pesa","text"]]},
      {t:"6. Criança e adolescente (preencher quando for o caso)",c:[
        ["psResp","Responsável que acompanha e contato","text"],
        ["psGest","Gestação, parto e desenvolvimento (fala, andar, controle dos esfíncteres)","area"],
        ["psEscola","Escola: desempenho, comportamento e relação com colegas","area"],
        ["psCasa","Em casa: comportamento, limites, rotina, telas, alimentação e sono","area"]]},
      {t:"7. Avaliação do profissional",c:[
        ["psAparencia","Aparência, comportamento e postura na sessão","area"],
        ["psHumor","Humor, afeto, pensamento, linguagem e atenção","area"],
        ["psInsight","Consciência do problema (insight)","sel",INSIGHT],
        ["psEscalas","Escalas ou instrumentos aplicados (nome, data, pontuação)","area"],
        ["psHip","Hipótese e formulação do caso","area"],
        ["psRiscoClass","Classificação de risco","sel",["Não avaliado","Baixo","Moderado","Alto"]],
        ["psPlanoSeg","Plano de segurança e encaminhamentos urgentes (quando houver risco)","area"],
        ["psPlano","Plano terapêutico: abordagem, frequência, objetivos e metas","area"],
        ["psEnc","Encaminhamentos (psiquiatria, médico, serviço social, outros)","area"],
        ["psObs","Observações do profissional","area"]]}
    ]},
    psiquiatria:{nome:"Psiquiatria",grupos:[
      {t:"1. Queixa e história da doença atual",c:[
        ["pqQueixa","Queixa principal, nas palavras do paciente","area"],
        ["pqHda","História da doença atual: início, curso, fatores desencadeantes, duração e gravidade","area"],
        ["pqFunc","Prejuízo funcional: trabalho ou estudo, relações e autocuidado","area"],
        ["pqInform","Informantes presentes (paciente, familiar) e como chegou à Atlas","text"]]},
      {t:"2. Revisão de sintomas",c:[
        ["pqDep","Humor deprimido: tristeza, perda de interesse, culpa, desesperança, lentificação","area"],
        ["pqMania","Euforia, irritabilidade, menor necessidade de sono, grandiosidade, gastos excessivos","area"],
        ["pqAnsi","Ansiedade, pânico, fobias, obsessões e compulsões, preocupação excessiva","area"],
        ["pqTept","Evento traumático, lembranças intrusivas, pesadelos, evitação","area"],
        ["pqPsic","Alucinações, delírios, desconfiança, alterações do pensamento","area"],
        ["pqAten","Atenção, hiperatividade e impulsividade (desde a infância?)","area"],
        ["pqSono","Sono, apetite, peso, energia e libido","area"],
        ["pqCog","Memória, concentração e orientação","area"],
        ["pqAlim","Comportamento alimentar e imagem corporal","area"],
        ["pqImpul","Impulsividade, agressividade, apostas, compras e comportamento sexual de risco","area"]]},
      {t:"3. Avaliação de risco",c:[
        ["pqIdeac","Ideação suicida","sel",["Não avaliado","Nega","Passiva","Ativa, sem plano","Ativa, com plano","Com intenção"]],
        ["pqTent","Tentativas anteriores e autolesão (quando, método, desfecho)","area"],
        ["pqHomic","Ideação de agredir outras pessoas","sel",["Não avaliado","Nega","Presente"]],
        ["pqMeios","Acesso a meios letais (armas, medicamentos) e rede de apoio","area"],
        ["pqProt","Fatores de proteção","area"],
        ["pqRiscoClass","Classificação de risco","sel",["Não avaliado","Baixo","Moderado","Alto","Iminente"]],
        ["pqRiscoCond","Conduta frente ao risco (plano de segurança, familiar, urgência, internação)","area"]]},
      {t:"4. Antecedentes psiquiátricos e tratamentos",c:[
        ["pqDiag","Diagnósticos anteriores e idade de início","area"],
        ["pqInter","Internações e urgências psiquiátricas","area"],
        ["pqPsico","Psicoterapia anterior ou atual","area"],
        ["pqMedAt","Medicamentos psiquiátricos atuais: nome, dose, horário, tempo de uso, adesão e efeitos colaterais","area"],
        ["pqMedAnt","Medicamentos anteriores: dose, tempo, resposta e motivo da troca ou suspensão","area"],
        ["pqRam","Alergias e reações adversas a medicamentos","area"],
        ["pqOutros","Eletroconvulsoterapia, estimulação magnética, fitoterápicos, suplementos e automedicação","area"]]},
      {t:"5. Antecedentes médicos",c:[
        ["pqClin","Doenças crônicas (hipertensão, diabetes, tireoide, epilepsia, cardiopatia, trauma de crânio, outras)","area"],
        ["pqMedClin","Medicamentos não psiquiátricos em uso","area"],
        ["pqCirurgia","Cirurgias e internações","area"],
        ["pqGest","Gestação, amamentação, contraceptivo e ciclo menstrual (quando for o caso)","area"],
        ["pqExames","Exames recentes (laboratório, imagem, eletrocardiograma)","area"]]},
      {t:"6. Uso de substâncias",c:[
        ["pqAlcool","Álcool: tipo, quantidade, frequência e último uso","area"],
        ["pqTabaco","Tabaco ou vape: quantidade e tempo de uso","text"],
        ["pqDrogas","Cannabis, cocaína, crack e outras: padrão e último uso","area"],
        ["pqCafe","Cafeína e energéticos","text"],
        ["pqTratSub","Tratamentos anteriores para uso de substâncias","area"]]},
      {t:"7. História pessoal e familiar",c:[
        ["pqFamPsi","Família, psiquiátrico: humor, psicose, suicídio, dependência, demência e resposta a medicamentos de parentes","area"],
        ["pqFamMed","Família, clínico: epilepsia, doenças do coração e metabólicas","area"],
        ["pqDes","Gestação, parto, desenvolvimento e escolaridade","area"],
        ["pqVida","Eventos marcantes, perdas, violência ou abuso","area"],
        ["pqSocial","Moradia, com quem vive, trabalho, renda, benefício ou afastamento, rede de apoio, religião","area"]]},
      {t:"8. Exame do estado mental",c:[
        ["pqEemApar","Aparência, atitude e comportamento","area"],
        ["pqEemCons","Consciência e orientação","text"],
        ["pqEemAten","Atenção e memória","text"],
        ["pqEemHumor","Humor e afeto","area"],
        ["pqEemPens","Pensamento: curso, forma e conteúdo","area"],
        ["pqEemPerc","Sensopercepção: alucinações e ilusões","area"],
        ["pqEemLing","Linguagem e psicomotricidade","area"],
        ["pqEemReal","Juízo de realidade","sel",["Não avaliado","Preservado","Comprometido"]],
        ["pqEemInsight","Crítica e insight","sel",INSIGHT]]},
      {t:"9. Exame físico e escalas",c:[
        ["pqPa","Pressão arterial (mmHg)","text"],
        ["pqFc","Frequência cardíaca (bpm)","text"],
        ["pqPeso","Peso (kg) e altura (m)","text"],
        ["pqCirc","Circunferência abdominal (cm)","text"],
        ["pqSinais","Tremor, sinais extrapiramidais e outros achados","area"],
        ["pqEscalas","Escalas aplicadas (PHQ-9, GAD-7, MDQ, ASRS, AUDIT, MoCA, outras) com data e pontuação","area"]]},
      {t:"10. Avaliação e conduta",c:[
        ["pqHip","Hipótese diagnóstica (CID) e diagnósticos diferenciais","area"],
        ["pqFormul","Formulação do caso","area"],
        ["pqConduta","Conduta: medicamentos prescritos (nome, dose, posologia, quantidade)","area"],
        ["pqExSol","Exames solicitados","area"],
        ["pqOrient","Orientações dadas: efeitos esperados, adesão, sinais de alerta, álcool e outras substâncias","area"],
        ["pqEnc","Encaminhamentos (psicoterapia, outros especialistas)","area"],
        ["pqConsent","Consentimento informado e entendimento do paciente","area"],
        ["pqRetorno","Data do retorno e o que reavaliar","text"],
        ["pqObs","Observações do profissional","area"]]}
    ]},
    cardiologia:{nome:"Cardiologia",grupos:[
      {t:"1. Motivo e história",c:[
        ["cdQueixa","Queixa principal, nas palavras do paciente","area"],
        ["cdHda","História da doença atual: início, evolução, o que piora e melhora","area"],
        ["cdDor","Dor torácica","sel",["Não avaliada","Ausente","Típica (anginosa)","Atípica","Não anginosa"]],
        ["cdDorDet","Detalhes da dor: local, caráter, irradiação, duração, relação com esforço e alívio","area"],
        ["cdDisp","Dispneia (classe funcional NYHA)","sel",["Não avaliada","Ausente","Classe I","Classe II","Classe III","Classe IV"]],
        ["cdSint","Palpitações, síncope ou pré-síncope, edema, ortopneia, dispneia paroxística noturna, claudicação, tontura, fadiga","area"],
        ["cdInterc","O que mudou desde a última consulta (internações, urgências, novos exames, efeitos colaterais)","area"]]},
      {t:"2. Fatores de risco, antecedentes e medicamentos",c:[
        ["cdFr","Fatores de risco (marque os que se aplicam)","chk",CD_FR],
        ["cdAnt","Antecedentes cardiovasculares (marque os que se aplicam)","chk",CD_ANT],
        ["cdHistFam","História familiar: doença coronariana precoce, morte súbita, cardiomiopatia, dislipidemia","area"],
        ["cdMed","Medicamentos em uso (nome, dose, posologia) e adesão","area"],
        ["cdAlerg","Alergias e reações adversas a medicamentos","area"],
        ["cdCirurg","Cirurgias e outras doenças relevantes","area"]]},
      {t:"3. Hábitos",c:[
        ["cdAlcool","Álcool (tipo, quantidade, frequência)","text"],
        ["cdTabaco","Tabaco ou vape (maços-ano, parou quando)","text"],
        ["cdSubst","Outras substâncias (cocaína, anabolizantes, estimulantes, energéticos)","text"],
        ["cdAtiv","Atividade física (tipo, frequência, limitações)","text"],
        ["cdDieta","Alimentação e consumo de sal","text"],
        ["cdSono","Sono e estresse","text"]]},
      {t:"4. Exame físico",c:[
        ["cdPa","Pressão arterial (mmHg), ex.: 120/80","text"],
        ["cdPaE","PA no outro braço ou em pé (mmHg)","text"],
        ["cdFc","Frequência cardíaca (bpm)","text"],
        ["cdFresp","Frequência respiratória (irpm)","text"],
        ["cdSat","Saturação de O2 (%)","text"],
        ["cdPeso","Peso (kg)","text"],
        ["cdAlt","Altura (m ou cm)","text"],
        ["cdImc","IMC (calculado)","text"],
        ["cdCint","Circunferência abdominal (cm)","text"],
        ["cdAusC","Ausculta cardíaca: ritmo, bulhas, sopros, estalidos, atrito","area"],
        ["cdAusP","Ausculta pulmonar","area"],
        ["cdPulsos","Pulsos, perfusão periférica e extremidades","area"],
        ["cdCong","Estase jugular, hepatomegalia, edema, ascite","area"],
        ["cdExOut","Outros achados do exame físico","area"]]},
      {t:"5. Exames complementares",c:[
        ["cdEcg","Eletrocardiograma: ritmo, FC, eixo, PR, QRS, QT, alterações","area"],
        ["cdEco","Ecocardiograma: fração de ejeção, cavidades, valvas, pericárdio, pressão pulmonar","area"],
        ["cdOutrosM","Holter, MAPA ou MRPA, teste ergométrico, cintilografia, angiotomografia, escore de cálcio, ressonância, cateterismo","area"],
        ["cdLabData","Data dos exames laboratoriais (dd/mm/aaaa)","text"],
        ["cdColT","Colesterol total (mg/dL)","text"],["cdLdl","LDL (mg/dL)","text"],["cdHdl","HDL (mg/dL)","text"],["cdTg","Triglicerídeos (mg/dL)","text"],
        ["cdGlic","Glicemia de jejum (mg/dL)","text"],["cdHba1c","Hemoglobina glicada (%)","text"],["cdCreat","Creatinina (mg/dL)","text"],["cdTfg","Filtração glomerular (mL/min)","text"],
        ["cdK","Potássio (mEq/L)","text"],["cdNa","Sódio (mEq/L)","text"],["cdTsh","TSH (mUI/L)","text"],["cdHemo","Hemoglobina (g/dL)","text"],
        ["cdUrico","Ácido úrico (mg/dL)","text"],["cdBnp","NT-proBNP ou BNP (pg/mL)","text"],["cdTrop","Troponina","text"],["cdInr","INR (se usa varfarina)","text"],
        ["cdLabOutros","Outros exames e observações","area"]]},
      {t:"6. Escores e risco cardiovascular",c:[
        ["cdChaItens","CHA₂DS₂-VASc (risco de AVC na fibrilação atrial): marque o que se aplica","chk",CHAD,{total:"cdCha"}],
        ["cdCha","CHA₂DS₂-VASc: pontuação (calculada)","text"],
        ["cdHbItens","HAS-BLED (risco de sangramento com anticoagulante): marque o que se aplica","chk",HASB,{total:"cdHb"}],
        ["cdHb","HAS-BLED: pontuação (calculada)","text"],
        ["cdRcv","Risco cardiovascular global","sel",OP_RISCO],
        ["cdRcvM","Método e resultado (ex.: escore de risco global, % em 10 anos, escore de cálcio)","text"]]},
      {t:"7. Avaliação e conduta",c:[
        ["cdHip","Hipóteses diagnósticas (CID-10)","area"],
        ["cdForm","Raciocínio clínico e diagnósticos diferenciais","area"],
        ["cdConduta","Conduta e medicamentos prescritos (nome, dose, posologia, duração)","area"],
        ["cdExSol","Exames solicitados","area"],
        ["cdOrient","Orientações: dieta, sal, atividade física, sinais de alerta e quando procurar urgência","area"],
        ["cdEnc","Encaminhamentos","area"],
        ["cdRetorno","Retorno em (data)","text"],
        ["cdObs","Observações","area"]]}
    ]},
    neurologia:{nome:"Neurologia",grupos:[
      {t:"1. Motivo e história",c:[
        ["nrQueixa","Queixa principal, nas palavras do paciente","area"],
        ["nrHda","História da doença atual: início, evolução, curso (agudo, progressivo, episódico), o que piora e melhora","area"],
        ["nrSint","Sintoma principal","sel",["Não informado","Cefaleia","Tontura ou vertigem","Crises convulsivas ou epilepsia","Perda de memória ou alteração cognitiva","Distúrbio do sono","Fraqueza, formigamento ou dormência","Tremor ou movimentos anormais","Dor neuropática ou lombociatalgia","Alteração de marcha ou equilíbrio","Síncope ou perda de consciência","Outro"]],
        ["nrCefal","Se cefaleia: localização, caráter, intensidade (0 a 10), frequência, duração, náusea, foto e fonofobia, aura, uso de analgésicos por mês","area"],
        ["nrCrise","Se crises ou perda de consciência: descrição, frequência, duração, pródromos, estado pós-crítico, gatilhos, relato de testemunhas","area"],
        ["nrAssoc","Outros sintomas: visão, fala, deglutição, força, sensibilidade, esfíncteres, humor, sono, cognição","area"],
        ["nrImpacto","Impacto funcional: trabalho, estudo, atividades diárias, direção, qualidade de vida","area"],
        ["nrInterc","O que mudou desde a última consulta (internações, urgências, novos exames, efeitos colaterais)","area"]]},
      {t:"2. Fatores de risco, antecedentes e medicamentos",c:[
        ["nrFr","Fatores de risco (marque os que se aplicam)","chk",NR_FR],
        ["nrAnt","Antecedentes neurológicos e clínicos (marque os que se aplicam)","chk",NR_ANT],
        ["nrHistFam","História familiar: AVC, demência, epilepsia, Parkinson, enxaqueca, doença neuromuscular","area"],
        ["nrMed","Medicamentos em uso (nome, dose, posologia) e adesão","area"],
        ["nrAlerg","Alergias e reações adversas a medicamentos","area"],
        ["nrCirurg","Cirurgias e outras doenças relevantes","area"]]},
      {t:"3. Hábitos e contexto",c:[
        ["nrAlcool","Álcool (tipo, quantidade, frequência)","text"],
        ["nrTabaco","Tabaco ou vape (maços-ano, parou quando)","text"],
        ["nrSubst","Outras substâncias (maconha, estimulantes, benzodiazepínicos sem prescrição)","text"],
        ["nrCafe","Cafeína (xícaras por dia)","text"],
        ["nrAtiv","Atividade física (tipo, frequência, limitações)","text"],
        ["nrDieta","Alimentação","text"],
        ["nrSono","Sono: horas, qualidade, ronco, pausas respiratórias, sonolência diurna","text"],
        ["nrOcup","Ocupação, exposições (solventes, agrotóxicos, metais) e estresse","text"]]},
      {t:"4. Exame físico e neurológico",c:[
        ["nrPa","Pressão arterial (mmHg), ex.: 120/80","text"],
        ["nrFc","Frequência cardíaca (bpm)","text"],
        ["nrSat","Saturação de O2 (%)","text"],
        ["nrPeso","Peso (kg)","text"],
        ["nrAlt","Altura (m ou cm)","text"],
        ["nrImc","IMC (calculado)","text"],
        ["nrMental","Estado mental: consciência, orientação, atenção, memória, linguagem, humor","area"],
        ["nrPares","Pares cranianos: campos visuais, fundo de olho, pupilas, movimentos oculares, face, audição, deglutição, língua","area"],
        ["nrForca","Força muscular (graduação de 0 a 5 em cada segmento) e trofismo","area"],
        ["nrTonus","Tônus e movimentos involuntários: rigidez, espasticidade, tremor, bradicinesia, distonia","area"],
        ["nrReflex","Reflexos profundos e cutâneo-plantar (Babinski)","area"],
        ["nrSensib","Sensibilidade: tátil, dolorosa, térmica, vibratória, posicional","area"],
        ["nrCoord","Coordenação e cerebelo: índex-nariz, calcanhar-joelho, diadococinesia","area"],
        ["nrMarcha","Marcha e equilíbrio: Romberg, marcha em tandem, teste de empurrão","area"],
        ["nrMening","Sinais meníngeos e de irritação radicular (Kernig, Brudzinski, Lasègue)","area"],
        ["nrVasc","Ausculta de carótidas, pulsos e outros achados do exame geral","area"]]},
      {t:"5. Exames complementares",c:[
        ["nrImg","Neuroimagem (TC ou RM de crânio e coluna, angiorressonância): data e achados","area"],
        ["nrEeg","Eletroencefalograma (EEG)","area"],
        ["nrEnmg","Eletroneuromiografia","area"],
        ["nrDopp","Doppler de carótidas e vertebrais, ecocardiograma, Holter","area"],
        ["nrOutrosM","Polissonografia, líquor, avaliação neuropsicológica, potenciais evocados, outros","area"],
        ["nrLabData","Data dos exames laboratoriais (dd/mm/aaaa)","text"],
        ["nrHemo","Hemoglobina (g/dL)","text"],["nrGlic","Glicemia de jejum (mg/dL)","text"],["nrHba1c","Hemoglobina glicada (%)","text"],["nrCreat","Creatinina (mg/dL)","text"],
        ["nrTsh","TSH (mUI/L)","text"],["nrB12","Vitamina B12 (pg/mL)","text"],["nrVitD","Vitamina D 25-OH (ng/mL)","text"],["nrLdl","LDL (mg/dL)","text"],
        ["nrNa","Sódio (mEq/L)","text"],["nrK","Potássio (mEq/L)","text"],["nrCa","Cálcio (mg/dL)","text"],["nrVhs","VHS ou PCR","text"],
        ["nrLabOutros","Outros exames e observações","area"]]},
      {t:"6. Escalas e escores",c:[
        ["nrMoca","MoCA (pontos, de 30)","text"],
        ["nrMeem","Mini-Exame do Estado Mental (pontos, de 30)","text"],
        ["nrEpw","Escala de sonolência de Epworth (pontos, de 24)","text"],
        ["nrMidas","MIDAS ou HIT-6 (impacto da enxaqueca)","text"],
        ["nrPhq","PHQ-9 e GAD-7 (pontos)","text"],
        ["nrRankin","Escala de Rankin modificada (mRS)","sel",["Não avaliada","0 – Sem sintomas","1 – Sem incapacidade significativa","2 – Incapacidade leve","3 – Incapacidade moderada","4 – Incapacidade moderadamente grave","5 – Incapacidade grave","6 – Óbito"]],
        ["nrHy","Hoehn e Yahr (doença de Parkinson)","sel",["Não avaliada","Estágio 1","Estágio 1,5","Estágio 2","Estágio 2,5","Estágio 3","Estágio 4","Estágio 5"]],
        ["nrNihss","NIHSS (pontos, se evento agudo)","text"],
        ["nrChaItens","CHA₂DS₂-VASc (prevenção de AVC na fibrilação atrial): marque o que se aplica","chk",CHAD,{total:"nrCha"}],
        ["nrCha","CHA₂DS₂-VASc: pontuação (calculada)","text"],
        ["nrHbItens","HAS-BLED (risco de sangramento com anticoagulante): marque o que se aplica","chk",HASB,{total:"nrHb"}],
        ["nrHb","HAS-BLED: pontuação (calculada)","text"],
        ["nrRcv","Risco vascular global","sel",OP_RISCO]]},
      {t:"7. Avaliação e conduta",c:[
        ["nrHip","Hipóteses diagnósticas (CID-10)","area"],
        ["nrTopog","Localização topográfica e síndrome neurológica","area"],
        ["nrForm","Raciocínio clínico e diagnósticos diferenciais","area"],
        ["nrConduta","Conduta e medicamentos prescritos (nome, dose, posologia, duração)","area"],
        ["nrExSol","Exames solicitados","area"],
        ["nrOrient","Orientações: sinais de alerta de AVC, higiene do sono, gatilhos, dieta, atividade física, direção veicular (se crises)","area"],
        ["nrEnc","Encaminhamentos","area"],
        ["nrRetorno","Retorno em (data) e o que reavaliar","text"],
        ["nrObs","Observações","area"]]}
    ]},
    ginecologia:{nome:"Ginecologia",grupos:[
      {t:"1. Motivo e história",c:[
        ["gnQueixa","Queixa principal, nas palavras da paciente","area"],
        ["gnHda","História da doença atual: início, evolução, o que piora e melhora","area"],
        ["gnSint","Motivo da consulta","sel",["Não informado","Consulta de rotina ou preventivo","Alteração menstrual","Dor pélvica","Corrimento ou prurido","Contracepção","Climatério ou menopausa","Infertilidade","Alteração ou dor nas mamas","Incontinência urinária","Outro"]],
        ["gnSang","Sangramento: padrão, volume, duração, relação com as relações sexuais, dor associada","area"],
        ["gnDor","Dor pélvica ou mamária: local, caráter, intensidade (0 a 10), relação com o ciclo","area"],
        ["gnSec","Corrimento, prurido, odor, ardência ao urinar","area"],
        ["gnInterc","O que mudou desde a última consulta (urgências, novos exames, efeitos colaterais)","area"]]},
      {t:"2. História ginecológica",c:[
        ["gnMenarca","Menarca (idade)","text"],
        ["gnDum","Data da última menstruação (dd/mm/aaaa)","text"],
        ["gnCiclo","Ciclo menstrual: duração, intervalo, regularidade, volume","text"],
        ["gnDismen","Dismenorreia","sel",["Não avaliada","Ausente","Leve","Moderada","Intensa"]],
        ["gnTpm","Sintomas pré-menstruais","text"],
        ["gnGpa","Gestações, partos normais, cesáreas e abortos prévios (ex.: G3 P2 A1)","text"],
        ["gnAnticoncep","Método contraceptivo","sel",["Não informado","Nenhum","Pílula combinada","Pílula só de progestágeno","DIU de cobre","DIU hormonal","Implante","Injetável","Preservativo","Laqueadura","Vasectomia do parceiro","Outro"]],
        ["gnSexual","Vida sexual: atividade, dispareunia, libido, número de parceiros","text"],
        ["gnIst","Infecções sexualmente transmissíveis, HPV e vacinação","text"],
        ["gnCito","Último preventivo (citologia): data e resultado","text"],
        ["gnMamo","Última mamografia ou ultrassom de mamas: data e resultado","text"],
        ["gnMeno","Menopausa: idade, sintomas, uso de terapia hormonal","text"]]},
      {t:"3. Antecedentes, fatores de risco e medicamentos",c:[
        ["gnFr","Antecedentes e fatores de risco (marque os que se aplicam)","chk",GN_FR],
        ["gnHistFam","História familiar: câncer de mama, ovário ou colo do útero, trombose, osteoporose","area"],
        ["gnMed","Medicamentos em uso (nome, dose, posologia) e adesão","area"],
        ["gnAlerg","Alergias e reações adversas a medicamentos","area"],
        ["gnCirurg","Cirurgias e outras doenças relevantes","area"]]},
      {t:"4. Hábitos",c:[
        ["gnAlcool","Álcool (tipo, quantidade, frequência)","text"],
        ["gnTabaco","Tabaco ou vape (maços-ano, parou quando)","text"],
        ["gnSubst","Outras substâncias","text"],
        ["gnAtiv","Atividade física (tipo, frequência, limitações)","text"],
        ["gnDieta","Alimentação","text"],
        ["gnSono","Sono e estresse","text"]]},
      {t:"5. Exame físico e ginecológico",c:[
        ["gnPa","Pressão arterial (mmHg), ex.: 120/80","text"],
        ["gnFc","Frequência cardíaca (bpm)","text"],
        ["gnPeso","Peso (kg)","text"],
        ["gnAlt","Altura (m ou cm)","text"],
        ["gnImc","IMC (calculado)","text"],
        ["gnCint","Circunferência abdominal (cm)","text"],
        ["gnMamas","Mamas: inspeção, palpação, nódulos, descarga papilar, axilas","area"],
        ["gnAbd","Abdome: inspeção, palpação, massas, dor","area"],
        ["gnVulva","Vulva, períneo e vagina (inspeção)","area"],
        ["gnEspec","Exame especular: colo do útero, conteúdo vaginal, lesões","area"],
        ["gnToque","Toque bimanual: útero (posição, tamanho, mobilidade), anexos, fundos de saco","area"],
        ["gnExOut","Outros achados do exame físico","area"]]},
      {t:"6. Exames complementares",c:[
        ["gnCitoEx","Citologia oncótica, colposcopia e biópsias","area"],
        ["gnUsg","Ultrassonografia pélvica ou transvaginal e de mamas","area"],
        ["gnMamoEx","Mamografia (classificação BI-RADS)","text"],
        ["gnDensi","Densitometria óssea","text"],
        ["gnHpv","Pesquisa de HPV, culturas e sorologias","area"],
        ["gnLabData","Data dos exames laboratoriais (dd/mm/aaaa)","text"],
        ["gnHemo","Hemoglobina (g/dL)","text"],["gnGlic","Glicemia de jejum (mg/dL)","text"],["gnTsh","TSH (mUI/L)","text"],["gnPrl","Prolactina (ng/mL)","text"],
        ["gnHorm","FSH, LH, estradiol e progesterona","text"],["gnBhcg","Beta-hCG","text"],["gnLdl","LDL (mg/dL)","text"],["gnVitD","Vitamina D 25-OH (ng/mL)","text"],["gnFerr","Ferritina (ng/mL)","text"],
        ["gnLabOutros","Outros exames e observações","area"]]},
      {t:"7. Avaliação e conduta",c:[
        ["gnHip","Hipóteses diagnósticas (CID-10)","area"],
        ["gnForm","Raciocínio clínico e diagnósticos diferenciais","area"],
        ["gnConduta","Conduta e medicamentos prescritos (nome, dose, posologia, duração)","area"],
        ["gnExSol","Exames solicitados","area"],
        ["gnOrient","Orientações e sinais de alerta (quando procurar urgência)","area"],
        ["gnEnc","Encaminhamentos","area"],
        ["gnRetorno","Retorno em (data) e o que reavaliar","text"],
        ["gnObs","Observações","area"]]}
    ]}
  };
  ANAMS.psicologia_adulto={nome:"Psicologia: adulto",grupos:[
    {t:"1. Dados de identificação",c:[
      ["adData","Data da anamnese","text"],
      ["adCpf","CPF ou CNPJ","text"],
      ["adEstCivil","Estado civil","text"],
      ["adFilhos","Filhos","sel",["Não","Sim"]],
      ["adFilhosDet","Quantos filhos e idades","text"],
      ["adProf","Profissão","text"],
      ["adEscol","Escolaridade","text"],
      ["adReligiao","Religião","text"],
      ["adEnd","Endereço, bairro e CEP","text"]]},
    {t:"2. Já se submeteu a psicoterapia?",c:[
      ["adTerap","Já fez psicoterapia","sel",["Não","Sim"]],
      ["adTerapQuando","Há quanto tempo atrás","text"],
      ["adTerapDur","Duração do tratamento","text"]]},
    {t:"3. História da doença atual",c:[
      ["adHda","Sintomas principais, tempo de duração, cronologia dos fatos, tratamentos anteriores, fatores desencadeantes, etc.","area"]]},
    {t:"4. Dados pessoais",c:[
      ["adInfancia","4.1 Infância: condições da gravidez, parto e pós-parto, aleitamento, desmame, vacinação, desenvolvimento psicomotor, traços de neurose, eventos significativos, doenças infantis, posição familiar","area"],
      ["adEscolar","4.2 Escolaridade: início, reprovações, desempenho, comportamento, cursos, etc.","area"],
      ["adSexual","4.3 Vida sexual: menarca, experiência sexual, masturbação, libido","area"],
      ["adSocial","4.4 Vida social e relacionamentos: atividades sociais, relacionamentos interpessoais com familiares e com outras pessoas, namoro, casamento, separação, condições de moradia, etc.","area"],
      ["adHabitos","4.5 Hábitos: fumo, alcoolismo, drogas, jogos, etc.","area"],
      ["adTrabalho","4.6 Vida profissional: serviços exercidos, grau de satisfação, carga horária, etc.","area"],
      ["adFamNuc","4.7 Família nuclear: relacionamento conjugal, relacionamento com filhos, constituição familiar, características das interações do núcleo familiar, etc.","area"]]},
    {t:"5. Saúde física, antecedentes e exame psicológico",c:[
      ["adSaude","5. Saúde física: traumatismo, enfermidades crônicas, medicações, cirurgias, internações, etc.","area"],
      ["adAntFam","5.1 Antecedentes familiares: características das interações no núcleo familiar, antecedentes orgânicos e psicológicos na família","area"],
      ["adExame","5.2 Exame psicológico: descrição geral do paciente e situação da entrevista, afetividade, linguagem, pensamento, sensopercepção, atenção, orientação, memória, capacidade intelectual, psicomotricidade","area"]]},
    {t:"6. Impressão diagnóstica e plano terapêutico",c:[
      ["adDiag","6) Impressão diagnóstica","area"],
      ["adPlano","7) Plano terapêutico","area"]]}]};
  ANAMS.psicologia_casal={nome:"Psicologia: casal",grupos:[
    {t:"1. Primeiro(a) parceiro(a)",c:[
      ["caData","Data da anamnese","text"],
      ["ca1Nome","Nome","text"],
      ["ca1Nasc","Data de nascimento e idade","text"],
      ["ca1Tel","Telefone","text"],
      ["ca1Rel","Religião","text"],
      ["ca1Esc","Escolaridade","text"],
      ["ca1Prof","Profissão","text"],
      ["ca1Trab","Local de trabalho","text"],
      ["ca1End","Endereço da residência","text"]]},
    {t:"2. Segundo(a) parceiro(a)",c:[
      ["ca2Nome","Nome","text"],
      ["ca2Nasc","Data de nascimento e idade","text"],
      ["ca2Tel","Telefone","text"],
      ["ca2Rel","Religião","text"],
      ["ca2Esc","Escolaridade","text"],
      ["ca2Prof","Profissão","text"],
      ["ca2Trab","Local de trabalho","text"],
      ["ca2End","Endereço da residência","text"]]},
    {t:"3. Queixa principal e relacionamento",c:[
      ["caQueixa","Queixa principal","area"],
      ["caEstCivil","Estado civil","text"],
      ["caTempo","Tempo de relacionamento","text"],
      ["caSepar","Já separaram alguma vez? (motivo)","area"],
      ["caMoram","Moram juntos?","text"],
      ["caFilhos","Têm filhos? (nome e idade de cada um)","area"]]},
    {t:"4. Vida do casal",c:[
      ["caRotina","Rotina do casal","area"],
      ["caSexual","Vida sexual do casal","area"],
      ["caFinanc","Situação financeira","area"],
      ["caAmigos","Círculo de amizades e familiar","area"],
      ["caHistoria","História do casal (como se conheceram, como se apaixonaram)","area"],
      ["caPalavra","Defina a relação atual em uma palavra","text"]]},
    {t:"5. Terapia de casal",c:[
      ["caObjetivos","O que trouxe o casal para a terapia de casal? (objetivos)","area"],
      ["caTempoProb","Há quanto tempo vem acontecendo o problema? E por que resolveram buscar a terapia agora?","area"],
      ["caQuemDecidiu","Quem decidiu procurar a terapia de casal e por quê?","area"],
      ["caExpect","Expectativas sobre a terapia","area"]]}]};
  ANAMS.psicologia_infantil={nome:"Psicologia: infantil e adolescente",grupos:[
    {t:"1. Dados de identificação",c:[
      ["inData","Data da anamnese","text"],
      ["inNasc","Data de nascimento e idade","text"],
      ["inEscol","Escolaridade (série ou ano)","text"],
      ["inEnd","Endereço, bairro e CEP","text"],
      ["inTel","Telefone(s)","text"],
      ["inTerap","Já se submeteu a psicoterapia?","sel",["Não","Sim"]],
      ["inTerapQuando","Há quanto tempo atrás","text"],
      ["inTerapDur","Duração do tratamento","text"]]},
    {t:"2. Identificação dos pais",c:[
      ["inSitConj","Situação conjugal","text"],
      ["inIrmaos","Irmãos (nome, sexo e idade)","area"],
      ["inMae","Mãe: nome e idade","text"],
      ["inMaeProf","Mãe: profissão e local de trabalho","text"],
      ["inPai","Pai: nome e idade","text"],
      ["inPaiProf","Pai: profissão e local de trabalho","text"]]},
    {t:"3. Queixa e desenvolvimento",c:[
      ["inDesenvCr","Desenvolvimento da criança","area"],
      ["inQueixa","Queixa principal","area"],
      ["inDesenv","Desenvolvimento","area"]]},
    {t:"4. Antecedentes pessoais e parto",c:[
      ["inAntec","Antecedentes pessoais: a. casal (história do casal; namoro ou casamento); b. criança (concepção desejada ou não, planejada ou não, adoção); c. momento emocional e financeiro na época da gestação; d. gestação e espera pela criança (aspectos orgânicos e emocionais); e. aborto(s) e gestações anteriores; f. pré-natal","area"],
      ["inParto","Parto: a. local, situação e fatos relevantes, tempo de duração, tipo, a termo ou prematuro; b. aspectos do bebê (aparência, choro); c. reação do casal e da família; d. reações do bebê (sono, humor, choro)","area"]]},
    {t:"5. Escolaridade e dinâmica familiar",c:[
      ["inEscolar","Escolaridade: a. início (idade, adaptação, mudanças); b. escola atual (tipo, relacionamento e participação dos pais); c. aprendizagem (rendimento, dificuldades, potencialidades); d. atitude dos pais; e. atividades extras (cursos, esportes, aulas particulares ou reforço, artes)","area"],
      ["inDinamica","Dinâmica familiar: a. relato de um dia típico da criança (manhã, tarde, noite, fins de semana); b. ambiente familiar (moradia, relação familiar); c. com quem é mais ligado afetivamente; d. relação pais e filho atual; e. história do nome da criança; f. expectativas em relação ao futuro da criança","area"]]},
    {t:"6. Comportamento e saúde",c:[
      ["inSocio","Comportamento sócio afetivo: a. na família (pais, irmãos, outros familiares); b. em outros espaços; c. relacionamento com outras crianças (prefere brincar sozinho ou acompanhado); d. na escola (relação com professores e colegas); e. nomes de colegas do filho; f. brincadeiras, jogos e sociabilidade (quais, onde, com quem)","area"],
      ["inManif","Manifestações comportamentais: a. humor; b. limites e frustrações (quem, motivos recorrentes, reações); c. fatos e histórias que a criança costuma contar; d. medos e fobias (reações e atitudes); e. tiques","area"],
      ["inSaude","Saúde geral: a. doenças (alergias, internações e reações); b. medicamentos (eventuais e constantes); c. atendimentos especializados anteriores (psicoterápico, psiquiátrico, neurológico, etc.); d. doenças na família (físicas e mentais)","area"],
      ["inPerdas","Mudanças e perdas significativas: a. quem ou qual; b. reação da criança; c. atitude dos pais","area"]]},
    {t:"7. Atendimento psicológico e hipóteses",c:[
      ["inAtend","Quanto ao atendimento psicológico: a. expectativas dos pais; b. conhecimento da criança sobre o assunto (o que sabe, o que lhe foi dito, reações ao saber); c. atendimentos anteriores (reações e posturas da criança)","area"],
      ["inDiag","Hipóteses diagnósticas (CID-10 ou DSM-5, opcional)","area"]]}]};

ANAMS.psicopedagogia={nome:"Anamnese psicopedagógica",grupos:[
    {t:"1. Dados de identificação",c:[
      ["paNasc","Data e local de nascimento","text"],
      ["paIdade","Idade","text"],
      ["paResp","Responsáveis","text"],
      ["paRespProf","Profissão dos responsáveis","text"],
      ["paIrmaos","Irmãos","text"],
      ["paEscola","Série e escola","text"]]},
    {t:"2. Queixa",c:[
      ["paMotivo","Motivo da procura. Queixa (se dá apenas em um ambiente?)","area"],
      ["paInicio","A partir de quando começou a perceber. Quando surgiu a queixa (início do problema). Como ele(a) era no(s) ano(s) anterior(es)","area"],
      ["paLidar","Como você (responsável) tem lidado com isso? Como a criança tem lidado com isso?","area"]]},
    {t:"3. Rotina e escola",c:[
      ["paMora","A criança mora com quem?","area"],
      ["paRotina","A criança possui uma rotina? Como é estruturada? Quem cuida quando está em casa?","area"],
      ["paHorEstudo","Tem horário para realizar as atividades escolares em casa?","area"],
      ["paQueixaEsc","Se queixa de algo da escola?","area"],
      ["paEscolariz","Escolarização (quando iniciou a vida escolar, quantas escolas já frequentou, quando a queixa surgiu, repetências)","area"]]},
    {t:"4. Socialização e comportamento",c:[
      ["paBrincar","Socialização/brincar: como é o momento de brincadeira? Brinca sozinho(a)? Tem amigos?","area"],
      ["paBrincaPais","Brinca com os pais?","area"],
      ["paGosta","Do que mais gosta de brincar?","area"],
      ["paRelFam","Socialização/relacionamento familiar (com e entre os pais)","area"],
      ["paNecess","Em seu convívio social, criam-se necessidades para se desenvolver? Por exemplo, a comunicação. Tem autonomia?","area"],
      ["paTela","Quanto tempo fica na televisão? Faz uso de celular, videogame ou tablet? Com qual frequência?","area"],
      ["paDisciplina","Como e quem costuma aplicar a disciplina em casa?","area"],
      ["paComport","Comportamento em casa (limites, regras etc.)","area"]]},
    {t:"5. Gestação",c:[
      ["paIdMae","Idade da mãe na gestação","text"],
      ["paIdPai","Idade do pai","text"],
      ["paPlanej","A criança foi planejada/desejada?","sel",["Sim","Não"]],
      ["paAborto","Já teve algum aborto?","sel",["Sim","Não"]],
      ["paFumou","Fumou durante a gravidez?","sel",["Sim","Não"]],
      ["paBebeu","Bebeu durante a gravidez?","sel",["Sim","Não"]],
      ["paSaudeGest","Saúde durante a gestação (traumas, emocional, internações)","area"]]},
    {t:"6. Parto e desenvolvimento",c:[
      ["paParto","Parto","sel",["Normal","Cesária"]],
      ["paPrem","Prematuro","sel",["Sim","Não"]],
      ["paComplic","Complicações no parto","sel",["Sim","Não"]],
      ["paApgar","APGAR","text"],
      ["paDnpm","Desenvolvimento neuropsicomotor (apoio da cabeça, pegar objetos, sentar, engatinhar, pular, correr, saltar)","area"],
      ["paLing","Linguagem/fala (primeiras palavras, frases compreensíveis, gagueira)","area"],
      ["paLingAtual","Como é a linguagem atualmente? (troca letras, fala com dificuldade)","area"],
      ["paLateral","Lateralidade","sel",["Destro","Canhoto"]]]},
    {t:"7. Sono e atividades",c:[
      ["paSono","Sono (tranquilo, agitado, enurese noturna, sonambulismo)","area"],
      ["paQuarto","Divide o quarto com outras pessoas?","text"],
      ["paDorme","Horário em que a criança dorme","text"],
      ["paAcorda","Horário em que a criança acorda","text"],
      ["paFisica","Realiza alguma atividade física?","sel",["Sim","Não"]],
      ["paFisicaQual","Qual atividade física?","text"],
      ["paExtra","Realiza atividades extracurriculares?","area"]]},
    {t:"8. Saúde e antecedentes",c:[
      ["paMedic","Uso de medicamentos (se já tomou ou ainda toma)","area"],
      ["paFamilia","Parentes com problemas (antecedentes familiares)","area"],
      ["paInfecto","Doenças infectocontagiosas (nome das doenças, tempo de internação, consequências)","area"],
      ["paTraumas","Traumas (perda de familiares, animais de estimação, acidentes, situações constrangedoras na escola)","area"],
      ["paNeuro","Presença de fatores neurológicos (tremores, paralisia cerebral, anóxia, tics, familiar com antecedente de dislexia, desatenção, impulsividade)","area"]]},
    {t:"9. Alimentação e acompanhamentos",c:[
      ["paRestr","Possui alguma restrição alimentar?","text"],
      ["paAmament","Foi amamentado(a) no seio?","sel",["Sim","Não"]],
      ["paAlim","Como é a alimentação? (quais alimentos costuma comer, se alimenta sozinho(a))","area"],
      ["paAlergia","Possui alguma alergia?","sel",["Sim","Não"]],
      ["paAlergiaQual","Se sim, qual alergia?","text"],
      ["paAcomp","Já fez acompanhamento com outro profissional? Por quanto tempo?","area"],
      ["paObs","Observações complementares (outras informações importantes)","area"]]}]};

// Quais modelos cada área usa (fono: só adulto e infantil/adolescente; psicologia: adulto, casal e infantil)
ANAMS.psicologia_adulto.nome = "Anamnese adulto"; ANAMS.psicologia_casal.nome = "Anamnese de casal"; ANAMS.psicologia_infantil.nome = "Anamnese infantil e adolescente";
function anamModelosDaArea(area, prescreve) {
  var a = (area || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(), out = [];
  if (/psicopedag/.test(a)) out = ["psicopedagogia", "psicologia_infantil"];
  else if (/psicolog|neuropsic/.test(a)) out = ["psicologia_adulto", "psicologia_casal", "psicologia_infantil"];
  else if (/fono/.test(a)) out = ["psicologia_adulto", "psicologia_infantil"];
  else if (/psiquiat/.test(a)) out = ["psiquiatria"];
  else if (/cardio/.test(a)) out = ["cardiologia"];
  else if (/neurolog/.test(a)) out = ["neurologia"];
  else if (/ginec/.test(a)) out = ["ginecologia"];
  else if (prescreve) out = ["cardiologia", "neurologia", "psiquiatria", "ginecologia"];
  return out.filter(function (k) { return ANAMS[k]; });
}
