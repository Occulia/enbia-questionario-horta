// Definição das 4 secções, 52 perguntas, valores pré-preenchidos da reunião e exportadores
// (Texto, JSON app Levantamentos Enbia v3, e HTML autónomo preenchido).

const DIAS_UTEIS = 21;

const SECS = [
  {n:1, slug:'emails', nav:'Triagem de emails', title:'Triagem de emails',
   lead:'Como entram, circulam e são respondidos os emails dirigidos ao Município. As respostas assinaladas foram dadas na reunião: confirme-as ou corrija-as.',
   qs:[
    {id:'1.1', t:'text', q:'Qual o servidor de email?', pre:'Microsoft Office (Outlook)'},
    {id:'1.2', t:'num', q:'Quantas caixas de correio entram na triagem?', unit:'caixas', hint:'Ficou por responder na reunião.'},
    {id:'1.3', t:'one', q:'As caixas de correio são pessoais ou partilhadas?', opts:['Pessoais','Partilhadas','Ambas'], extra:{label:'Quais são as caixas?', ph:'Ex.: geral@… (partilhada), expediente@… (partilhada)'}},
    {id:'1.4', t:'num', q:'Quantos emails são analisados por mês, em média, no conjunto dessas caixas?', unit:'emails por mês', pre:'2000'},
    {id:'1.5', t:'long', q:'Qual é o processo atual, desde a chegada do email até à resposta ao remetente?', hint:'Se puder, acrescente quem lê, como escolhe o destino, se fica registado e como se sabe que o pedido foi respondido.', pre:'5 pessoas reencaminham emails diariamente.'},
    {id:'1.6', t:'one', q:'Os emails recebidos ficam registados num sistema de gestão documental (registo de entrada)?', opts:['Sim, todos','Só alguns','Não'], extra:{label:'Que sistema?', ph:'Nome do software'}},
    {id:'1.7', t:'multi', q:'Que tipos de mensagem predominam?', opts:['Pedidos e requerimentos de munícipes','Pedidos de informação','Fornecedores e faturas','Entidades públicas','Comunicação interna','Publicidade e spam','Outro'], other:'Outro', extra:{label:'Percentagem aproximada de cada tipo, se souber', ph:'Ex.: 40% munícipes, 25% fornecedores'}},
    {id:'1.8', t:'multi', q:'Que informações determinam a pessoa para quem o email deve ser encaminhado?', opts:['Assunto','Remetente','Palavras-chave no texto','Tipo de pedido','Local ou freguesia','Anexos','Outro'], other:'Outro', extra:{label:'Descreva o critério com um ou dois exemplos', long:true, ph:'Ex.: pedidos sobre iluminação pública seguem para as Obras; pedidos de certidões seguem para o Atendimento'}},
    {id:'1.9', t:'one', q:'Como é atribuído cada pedido a um departamento?', opts:['Por uma lista escrita de assuntos por serviço','Pelo conhecimento de quem faz a triagem','Por despacho de um dirigente','Outro'], other:'Outro', hint:'Se existir uma lista de assuntos por serviço, envie-a junto com as respostas.'},
    {id:'1.10', t:'long', q:'Que informações devem ser recolhidas para complementar cada pedido?', hint:'Se variar por tipo de pedido, indique os tipos mais frequentes e o que falta habitualmente em cada um.', ph:'Ex.: identificação do requerente, local da ocorrência, n.º de processo, documentos em falta'},
    {id:'1.11', t:'num', q:'Para quantos serviços ou pessoas são reencaminhados os emails?', unit:'destinos'},
    {id:'1.12', t:'calc', q:'Mensalmente, quanto tempo é gasto neste processo?', hint:'Na reunião o tempo ficou por apurar. Indique quanto tempo dedica cada pessoa por dia; o total mensal é calculado com ' + DIAS_UTEIS + ' dias úteis.', pre:{p:'5'}},
    {id:'1.13', t:'text', q:'Quantas pessoas estão envolvidas no processo, incluindo os serviços que respondem?', hint:'Se possível, substitua por uma estimativa.', pre:'Número indeterminado'},
    {id:'1.14', t:'text', q:'Quanto tempo demora até darem resposta a um pedido?', hint:'Indique se o valor é medido ou estimado.', pre:'2 a 3 dias'},
    {id:'1.15', t:'multi', q:'Qual é o resultado esperado da automação?', opts:['Reencaminhamento automático para o serviço certo','Resposta automática e interação com o remetente','Rascunho de resposta para um funcionário validar','Registo automático no sistema de gestão documental','Indicadores de volume e prazos de resposta'], pre:{arr:[0,1]}},
    {id:'1.16', t:'long', q:'Que pedidos poderiam receber resposta automática, sem intervenção de um funcionário?', ph:'Ex.: horários, documentos necessários para um pedido, estado de um processo'},
    {id:'1.17', t:'one', q:'As respostas automáticas podem seguir diretamente ou devem ser sempre validadas antes do envio?', opts:['Podem seguir diretamente nos casos definidos','Validação humana sempre obrigatória','A decidir']},
    {id:'1.18', t:'one', q:'Pretendem que o munícipe tenha acesso ao estado do pedido na sua área pessoal dentro do site?', opts:['Sim','Não','A avaliar'], extra:{label:'O site já tem área pessoal do munícipe? Em que plataforma?', ph:'Ex.: portal do munícipe do fornecedor do ERP, site próprio sem área pessoal'}}
   ]},
  {n:2, slug:'compras', nav:'Compras e orçamento', title:'Processo de compra e orçamento anual',
   lead:'Do pedido de compra ao pagamento da fatura, e a informação que alimenta o orçamento do ano seguinte. Idealmente respondida pela contabilidade ou pelo aprovisionamento.',
   qs:[
    {id:'2.1', t:'text', q:'Que software utilizam (ERP, CRM ou outros) e com que módulos?', ph:'Fornecedor e módulos em uso', hint:'Ex.: contabilidade, aprovisionamento, armazém, obras, gestão de fornecedores.'},
    {id:'2.2', t:'one', q:'Têm servidor interno? Onde está alojado esse software?', opts:['Servidor interno do Município','Cloud do fornecedor','Misto','Não sei']},
    {id:'2.3', t:'one', q:'É possível extrair dados desse software?', opts:['Por API ou ligação à base de dados','Exportação para Excel ou CSV','Apenas relatórios em PDF','Não sei'], hint:'Define se os dados podem ser lidos automaticamente ou se é preciso exportá-los.'},
    {id:'2.4', t:'multi', q:'Como e onde são armazenadas as ordens de compra (requisições externas)?', opts:['No ERP','PDF em pasta partilhada','Email','Papel','Outro'], other:'Outro'},
    {id:'2.5', t:'multi', q:'E as faturas, como e onde são armazenadas?', opts:['No ERP','Plataforma de faturação eletrónica','PDF em pasta partilhada','Email','Papel','Outro'], other:'Outro'},
    {id:'2.6', t:'long', q:'Qual é o processo atual, desde a necessidade de compra até ao pagamento da fatura?', hint:'Ex.: pedido do serviço, cabimento, compromisso, requisição externa, receção do material, conferência da fatura, pagamento. Indique quem faz cada passo.'},
    {id:'2.7', t:'one', q:'As faturas mencionam sempre a OC ou o número da requisição externa?', opts:['Sempre','Na maioria dos casos','Raramente','Não sei'], extra:{label:'O que fazem quando a referência falta?', ph:'Ex.: pedimos nova fatura, procuramos manualmente'}},
    {id:'2.8', t:'multi', q:'Em que formato chegam as faturas?', opts:['Fatura eletrónica (XML)','PDF por email','Papel','Portal ou plataforma de faturação','Outro'], other:'Outro', extra:{label:'Percentagem aproximada de cada formato, se souber', ph:'Ex.: 60% PDF, 30% XML, 10% papel'}},
    {id:'2.9', t:'num', q:'Quantas requisições externas emitem por mês, em média?', unit:'requisições por mês'},
    {id:'2.10', t:'num', q:'Quantas faturas de fornecedores recebem por mês, em média?', unit:'faturas por mês'},
    {id:'2.11', t:'long', q:'Como medem os consumos em obra?', hint:'Ex.: guias de remessa, requisições ao armazém, autos de medição, folhas de obra.'},
    {id:'2.12', t:'multi', q:'Onde registam esses consumos?', opts:['No ERP','Em Excel','Em papel','Outro','Não'], other:'Outro', none:'Não'},
    {id:'2.13', t:'multi', q:'Que dashboards de análise gostariam de ter?', opts:['Por obra','Por fornecedor','Por material','Por tipologia de investimento','Por rubrica orçamental','Por serviço ou centro de custo','Outra'], other:'Outra'},
    {id:'2.14', t:'text', q:'Quantas pessoas intervêm no processo e em que serviços?'},
    {id:'2.15', t:'num', q:'Mensalmente, quanto tempo é gasto neste processo, somando todas as pessoas?', unit:'horas por mês', hint:'Basta uma estimativa.'},
    {id:'2.16', t:'text', q:'Quanto tempo gastam à procura de informação para definir o orçamento anual?', ph:'Ex.: 3 pessoas durante 2 semanas'},
    {id:'2.17', t:'long', q:'Que informação é mais difícil de reunir para o orçamento?'}
   ]},
  {n:3, slug:'epi', nav:'EPI', title:'Equipamentos de proteção individual (EPI)',
   lead:'Requisição, entrega, recolha e registo dos EPI. Idealmente respondida por quem gere a segurança no trabalho ou o armazém.',
   qs:[
    {id:'3.1', t:'long', q:'Como funciona o processo atual?', hint:'Quem pede, quem aprova, quem entrega e como se controla o stock.'},
    {id:'3.2', t:'one', q:'Há requisições de material ao expediente? Por que circuito são pedidos os EPI?', opts:['Requisição ao expediente','Requisição ao armazém','Pedido direto ao responsável de segurança','Outro','Não'], other:'Outro'},
    {id:'3.3', t:'one', q:'Há folhas de entrega e recolha dos EPI assinadas pelos colaboradores?', opts:['Sim, na entrega e na recolha','Só na entrega','Às vezes','Não']},
    {id:'3.4', t:'multi', q:'Onde ficam guardados esses registos?', opts:['Em papel','Digitalizados','No ERP ou noutro software','Outro','Não'], other:'Outro', none:'Não'},
    {id:'3.5', t:'one', q:'O processo é manual ou informatizado?', opts:['Totalmente manual','Parcialmente informatizado','Informatizado','Não'], extra:{label:'Que ferramentas usam?', ph:'Ex.: Excel, módulo de armazém do ERP'}},
    {id:'3.6', t:'num', q:'Quantos colaboradores recebem EPI?', unit:'colaboradores'},
    {id:'3.7', t:'one', q:'Todos os colaboradores têm número mecanográfico?', opts:['Sim','Não','Só alguns']},
    {id:'3.8', t:'text', q:'A lista de colaboradores está disponível em que plataforma?', ph:'Ex.: módulo de recursos humanos do ERP, Excel'},
    {id:'3.9', t:'num', q:'Quantas entregas de EPI fazem por mês, em média?', unit:'entregas por mês'},
    {id:'3.10', t:'one', q:'Controlam prazos de validade e de substituição dos EPI?', opts:['Sim','Parcialmente','Não']},
    {id:'3.11', t:'text', q:'Quantas pessoas intervêm no processo e em que serviços?'},
    {id:'3.12', t:'one', q:'Querem uma aplicação para este propósito?', opts:['Sim','Não','A avaliar'], extra:{label:'O que deveria fazer?', long:true, ph:'Ex.: pedido pelo colaborador, aprovação, assinatura digital na entrega e na recolha, alertas de substituição, controlo de stock'}}
   ]},
  {n:4, slug:'prioridades', nav:'Prioridades', title:'Prioridades e documentos', noWho:true,
   lead:'Para planearmos o trabalho e prepararmos a sessão com exemplos reais.',
   qs:[
    {id:'4.1', t:'one', q:'Qual destes processos tem maior prioridade para o Município?', opts:['Triagem de emails','Compras e orçamento anual','EPI']},
    {id:'4.2', t:'long', q:'O que torna esse processo prioritário?'},
    {id:'4.3', t:'long', q:'Há prazos, orçamento ou financiamento associados a este trabalho?', hint:'Ex.: candidatura a fundos, calendário do orçamento, compromissos do executivo.'},
    {id:'4.4', t:'multi', q:'Que documentos de exemplo podem partilhar, sem dados pessoais?', opts:['Requisição externa','Fatura de fornecedor','Folha de entrega ou recolha de EPI','Exemplos de emails recebidos','Lista de assuntos por serviço usada na triagem','Organograma dos serviços'], hint:'Envie-os por email junto com o ficheiro de respostas.'},
    {id:'4.5', t:'long', q:'Observações'}
   ]}
];

const IDF = [
  {k:'nome', label:'Nome', req:true, ph:'Nome completo', ac:'name', pre:'João Paulo Pereira'},
  {k:'cargo', label:'Cargo', ph:'Ex.: Chefe de Divisão', pre:'Chefe do Gabinete'},
  {k:'servico', label:'Serviço ou unidade orgânica', wide:true, pre:'Gabinete da Presidência'},
  {k:'email', label:'Email', type:'email', ac:'email', pre:'jpereira@cmhorta.pt'},
  {k:'tel', label:'Telefone', type:'tel', ac:'tel'}
];

const QS = {};
SECS.forEach(s => s.qs.forEach(q => { QS[q.id] = q; }));
const TOTAL = Object.keys(QS).length;

const str = v => v == null ? '' : String(v).trim();
const parseN = v => {
  const n = parseFloat(String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.'));
  return isFinite(n) ? n : null;
};
const fmt1 = n => n.toLocaleString('pt-PT', { maximumFractionDigits: 1 });

function defaults() {
  const d = {};
  IDF.forEach(f => { if (f.pre) d['id_' + f.k] = f.pre; });
  Object.values(QS).forEach(q => {
    if (q.pre == null) return;
    if (typeof q.pre === 'string') d[q.id] = q.pre;
    else if (q.pre.p != null) d[q.id + '_p'] = q.pre.p;
    else if (q.pre.arr) d[q.id] = q.pre.arr.map(i => q.opts[i]);
  });
  return d;
}

function calcHours(q, A) {
  const p = parseN(A[q.id + '_p']);
  const m = parseN(A[q.id + '_m']);
  return (p != null && m != null) ? (p * m * DIAS_UTEIS / 60) : null;
}

function answered(q, A) {
  if (q.t === 'calc') return parseN(A[q.id + '_p']) != null && parseN(A[q.id + '_m']) != null;
  const v = A[q.id];
  if (Array.isArray(v)) return v.length > 0;
  return !!str(v) || !!str(A[q.id + '_x']);
}

function answerText(q, A) {
  const parts = [];
  if (q.t === 'calc') {
    const p = str(A[q.id + '_p']);
    const m = str(A[q.id + '_m']);
    const hrs = calcHours(q, A);
    if (hrs != null) parts.push(p + ' pessoas × ' + m + ' min por dia ≈ ' + fmt1(hrs) + ' h por mês (' + DIAS_UTEIS + ' dias úteis)');
    else if (p) parts.push(p + ' pessoas (tempo diário por indicar)');
    else if (m) parts.push(m + ' min por dia por pessoa (n.º de pessoas por indicar)');
  } else if (q.t === 'one' || q.t === 'multi') {
    let sel = A[q.id];
    sel = Array.isArray(sel) ? sel : (str(sel) ? [str(sel)] : []);
    const o = str(A[q.id + '_o']);
    sel = sel.map(v => (q.other && v === q.other && o) ? v + ': ' + o : v);
    if (sel.length) parts.push(sel.join('; '));
  } else {
    const v = str(A[q.id]);
    if (v) parts.push(v + (q.unit && /^[\d\s.,]+$/.test(v) ? ' ' + q.unit : ''));
  }
  const x = str(A[q.id + '_x']);
  if (x && q.extra) parts.push(q.extra.label.replace(/, se (souber|existir)$/, '') + ': ' + x);
  return parts.join(' | ');
}

function computeStats(A) {
  let answeredCount = 0;
  const sections = SECS.map(s => {
    const done = s.qs.filter(q => answered(q, A)).length;
    answeredCount += done;
    return {
      n: s.n,
      slug: s.slug,
      title: s.title,
      nav: s.nav,
      who: s.noWho ? null : str(A['r' + s.n]),
      answered: done,
      total: s.qs.length,
      questions: s.qs.map(q => ({
        id: q.id,
        q: q.q,
        answered: answered(q, A),
        answerText: answerText(q, A),
        pre: q.pre != null,
      })),
    };
  });
  return {
    answeredCount,
    totalCount: TOTAL,
    sections,
  };
}

function who(A) {
  return [str(A.id_nome), str(A.id_cargo)].filter(Boolean).join(', ');
}

function plainText(A) {
  const lines = [
    'Questionário de levantamento de processos · Município da Horta',
    'Coordenação das respostas: ' + who(A) + (str(A.id_servico) ? ' · ' + str(A.id_servico) : ''),
  ];
  const c = [str(A.id_email), str(A.id_tel)].filter(Boolean).join(' · ');
  if (c) lines.push('Contacto: ' + c);
  lines.push('Gerado em ' + new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' }));
  lines.push('');

  SECS.forEach(s => {
    lines.push(s.n + '. ' + s.title.toUpperCase());
    if (str(A['r' + s.n])) lines.push('Respondido por: ' + str(A['r' + s.n]));
    lines.push('');
    s.qs.forEach(q => {
      lines.push(q.id + ' ' + q.q);
      lines.push('R: ' + (answerText(q, A) || '(sem resposta)'));
      lines.push('');
    });
  });
  return lines.join('\n');
}

function levantamentosJson(A) {
  const T = Date.now();
  const docs = {};
  SECS.forEach(s => {
    const resp = str(A['r' + s.n]) || who(A);
    s.qs.forEach((q, i) => {
      const rid = 'Q-CMH-' + (s.n * 100 + i + 1);
      const a = answerText(q, A);
      const f = {
        questao: q.id + ' ' + s.title + '. ' + q.q,
        resposta: a,
        responsavel: 'Município',
        nome: resp,
        estado: a ? 'Fechada' : 'Aberta',
      };
      const t = { criado: T };
      Object.keys(f).forEach(k => { t[k] = T; });
      docs['q~' + rid] = { sec: 'q', rid, f, t, upd: T };
    });
  });
  return {
    formato: 'enbia-levantamento',
    versao: 3,
    exportado: new Date(T).toISOString(),
    origem: 'questionario-horta',
    docs,
  };
}

function buildFilledHtml(A, pristineHtml) {
  const snap = Object.assign({}, A, { _upd: A._upd || Date.now() });
  const jsonSafe = JSON.stringify(snap).replace(/</g, '\\u003c');
  return pristineHtml.replace(
    /<script type="application\/json" id="respostas" data-q>[\s\S]*?<\/script>/,
    `<script type="application/json" id="respostas" data-q>${jsonSafe}</script>`
  );
}

module.exports = {
  SECS,
  IDF,
  TOTAL,
  str,
  defaults,
  answered,
  answerText,
  computeStats,
  plainText,
  levantamentosJson,
  buildFilledHtml,
};
