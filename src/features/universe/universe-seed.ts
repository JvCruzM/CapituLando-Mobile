import type {
  EncyclopediaItem,
  CharacterItem,
  TimelineEventItem,
} from "./types";

export const INITIAL_ENCYCLOPEDIA_ITEMS: EncyclopediaItem[] = [
  // --- RAÇAS ---
  {
    id: "race-1",
    category: "races",
    name: "Sylfos Celestiais",
    subtitle: "Povo Primordial dos Picos Nebulosos",
    description:
      "Nascidos do atrito entre os ventos astrais e as montanhas de Aethelgard. Possuem ossos ocos e olhos translúcidos que refratam a luz do Éter. São os guardiões originais dos manuscritos e das línguas antigas.",
    attributes: {
      "Longevidade": "350 a 500 anos",
      "Afinidade Elemental": "Vento e Luz Estelar",
      "Fisiologia": "Estatura esguia, alta tolerância ao frio rarefeito",
      "Tradição Cultural": "O Culto do Silêncio e a Pintura de Runas Aéreas",
    },
    tags: ["Primordial", "Arcano", "Voador", "Guardiões"],
    createdAt: "2026-01-10T10:00:00Z",
    updatedAt: "2026-01-10T10:00:00Z",
  },
  {
    id: "race-2",
    category: "races",
    name: "Forjadores de Brasa (Kharadun)",
    subtitle: "Habitantes dos Abismos de Obsidiana",
    description:
      "Uma linhagem antiga que vive nas entranhas das caldeiras vulcânicas do sul. Seus corpos absorvem calor e sua pele possui tons de cinza fosco com ranhuras que brilham como brasas vivas quando sob forte emoção.",
    attributes: {
      "Longevidade": "200 a 250 anos",
      "Afinidade Elemental": "Fogo Terrestre e Metalurgia Cinética",
      "Fisiologia": "Densidade óssea incomum, imunes a queimaduras térmicas",
      "Tradição Cultural": "Cada indivíduo forja sua própria lápide de bronze ao atingir a maioridade",
    },
    tags: ["Subterrâneo", "Fogo", "Ferreiros", "Resistência"],
    createdAt: "2026-01-10T10:15:00Z",
    updatedAt: "2026-01-10T10:15:00Z",
  },

  // --- CRIATURAS ---
  {
    id: "creature-1",
    category: "creatures",
    name: "Leviatã das Nuvens (Zephyros)",
    subtitle: "Monstro titânico que habita tempestades elétricas",
    description:
      "Criatura colossal que navega pelas correntes atmosféricas superiores. Seu canto ressoa a centenas de léguas antes de tempestades místicas. Nunca toca o solo terrestre por livre vontade, alimentando-se de vapor ionizado e poeira de meteoros.",
    attributes: {
      "Nível de Ameaça": "Cataclísmico (se perturbado)",
      "Habitat": "Estratosfera e tempestades arcanas",
      "Dieta": "Partículas de Éter e Íons tempestuosos",
      "Domesticabilidade": "Nenhuma; objeto de veneração e desvio de rotas aéreas",
    },
    tags: ["Titânico", "Voador", "Tempestade", "Raro"],
    createdAt: "2026-01-11T14:00:00Z",
    updatedAt: "2026-01-11T14:00:00Z",
  },
  {
    id: "creature-2",
    category: "creatures",
    name: "Quimera de Vidro-Vulcano",
    subtitle: "Predador predestinado das fendas ardentes",
    description:
      "Carnívoro quadrúpede cujo esqueleto e garras são formados por obsidiana pura cristalizada. Caça camuflando-se nas sombras das montanhas vulcânicas e é capaz de quebrar armas de ferro comum com o impacto de suas mandíbulas reforçadas.",
    attributes: {
      "Nível de Ameaça": "Alto",
      "Habitat": "Fissuras de lava e túneis de cinzas",
      "Comportamento": "Solitário e altamente territorial",
      "Fraqueza": "Sons em frequência ultra-aguda fraturam sua armadura vítrea",
    },
    tags: ["Predador", "Obsidiana", "Fogo", "Fera"],
    createdAt: "2026-01-11T14:20:00Z",
    updatedAt: "2026-01-11T14:20:00Z",
  },

  // --- ITENS ---
  {
    id: "item-1",
    category: "items",
    name: "Astrolábio das Cinco Luas",
    subtitle: "Relíquia astronômica de navegação dimensional",
    description:
      "Artefato forjado em prata estelar e latão vivo. Quando alinhado com as fases lunares, permite calcular com precisão as flutuações das marés de éter e antever rupturas na tessitura temporal até 3 dias antes de acontecerem.",
    attributes: {
      "Tipo": "Artefato de Orientação & Profecia",
      "Raridade": "Único / Lendário",
      "Portador Atual": "Ordem dos Tecelões do Destino",
      "Efeito Especial": "Concede vislumbres de rotas seguras através de tempestades místicas",
    },
    tags: ["Relíquia", "Tempo", "Navegação", "Sagrado"],
    createdAt: "2026-01-12T09:00:00Z",
    updatedAt: "2026-01-12T09:00:00Z",
  },
  {
    id: "item-2",
    category: "items",
    name: "Lâmina da Cinza Silenciosa",
    subtitle: "Espada curta forjada no coração do Éter Frio",
    description:
      "Uma lâmina de gume fumegante que absorve qualquer som no raio de dez passos de quem a empunha. Seus cortes não sangram imediatamente; em vez disso, congelam as veias e deixam rastros de pó prateado.",
    attributes: {
      "Tipo": "Arma Arcano-Física",
      "Raridade": "Muito Rara",
      "Forjador": "Mestre Kharadun Vane (séc. III)",
      "Propriedade": "Silêncio absoluto ao golpear e anulação temporária de encantamentos simples",
    },
    tags: ["Arma", "Furtividade", "Gelo", "Assassinos"],
    createdAt: "2026-01-12T09:30:00Z",
    updatedAt: "2026-01-12T09:30:00Z",
  },

  // --- LOCAIS ---
  {
    id: "location-1",
    category: "locations",
    name: "Cidadela Suspensa de Aethelgard",
    subtitle: "Capital mística ancorada sobre as nuvens",
    description:
      "Uma metrópole construída sobre monólitos de pedra antigravitacional que flutuam em equilíbrio perpétuo. Pontes de corda e cabos de cobre ligam as torres pontiagudas, onde convivem diplomatas, bibliotecários e comerciantes de todos os reinos conhecidos.",
    attributes: {
      "População": "Aproximadamente 120.000 habitantes",
      "Clima": "Frio, ventoso e constantemente enevoado",
      "Governo": "Conclave dos Três Arquivistas",
      "Ponto Notável": "O Grande Observatório das Estrelas Cadentes",
    },
    tags: ["Capital", "Flutuante", "Arcano", "Comércio"],
    createdAt: "2026-01-13T11:00:00Z",
    updatedAt: "2026-01-13T11:00:00Z",
  },
  {
    id: "location-2",
    category: "locations",
    name: "O Desfiladeiro dos Murmúrios",
    subtitle: "Garganta de calcário onde ecos guardam segredos",
    description:
      "Um cânion profundo cortado por um rio subterrâneo turquesa. As formações rochosas são repletas de fissuras que transformam a brisa em sussurros audíveis na língua dos viajantes mortos. Aqueles que o cruzam sem tampões de cera arriscam enlouquecer com revelações dolorosas.",
    attributes: {
      "Extensão": "80 quilômetros de terreno escarpado",
      "Perigo": "Moderado a Alto (risco psicológico e desabamentos)",
      "Recurso Natural": "Cristais de Ressonância Sonora",
      "Fama": "Túmulo do Exército Perdido de Lysander",
    },
    tags: ["Perigo", "Cânion", "Ecos", "Mistério"],
    createdAt: "2026-01-13T11:30:00Z",
    updatedAt: "2026-01-13T11:30:00Z",
  },

  // --- ORGANIZAÇÕES ---
  {
    id: "org-1",
    category: "organizations",
    name: "A Ordem dos Tecelões do Destino",
    subtitle: "Irmandade de eruditos e cartógrafos do tempo",
    description:
      "Sociedade acadêmica e secreta dedicada a registrar todas as variáveis de causa e efeito no continente. Acreditam que o futuro é uma tapeçaria já tecida e que interferências mágicas imprudentes desfazem os nós da realidade.",
    attributes: {
      "Liderança": "A Grã-Mestra Elianora Vane",
      "Quartel-General": "Torre do Cronômetro, em Aethelgard",
      "Filosofia": "Conhecer sem intervir; registrar para que nada se perca",
      "Símbolo": "Uma agulha de prata transpassando uma espiral azul",
    },
    tags: ["Erudição", "Segredo", "Tempo", "Neutro"],
    createdAt: "2026-01-14T08:00:00Z",
    updatedAt: "2026-01-14T08:00:00Z",
  },
  {
    id: "org-2",
    category: "organizations",
    name: "A Liga das Brasas Livres",
    subtitle: "Movimento insurgente de artesãos e mineradores",
    description:
      "Coalizão rebelde formada principalmente por forjadores Kharadun e mercadores insatisfeitos com os monopólios tarifários das cidades flutuantes. Defendem que o Éter subterrâneo pertence a quem nele trabalha.",
    attributes: {
      "Liderança": "Comandante Thorgan Mão-de-Ferro",
      "Influência": "Forte nos distritos industriais e forjas do sul",
      "Objetivo": "Autonomia comercial e abolição das taxas sobre minerais arcanos",
      "Símbolo": "Uma bigorna partida com uma chama brotando do centro",
    },
    tags: ["Rebelião", "Política", "Trabalhadores", "Facção"],
    createdAt: "2026-01-14T08:30:00Z",
    updatedAt: "2026-01-14T08:30:00Z",
  },

  // --- REGRAS DO UNIVERSO ---
  {
    id: "rule-1",
    category: "world-rules",
    name: "A Lei do Troco Mnemônico",
    subtitle: "Regra Fundamental do Sistema de Magia",
    description:
      "Toda manifestação mágica de alta escala exige combustível cognitivo: para conjurar uma alteração física na matéria, o mago deve sacrificar permanentemente uma lembrança afetiva proporcional ao feitiço. Grandes prodígios arcanos frequentemente resultam em amnésia seletiva ou despersonalização.",
    attributes: {
      "Âmbito": "Universal (não contornável por amuletos)",
      "Custo Mínimo": "Memórias banais de infância para pequenas faíscas",
      "Custo Máximo": "Identidade e rosto de entes queridos para magias de destruição em massa",
      "Fenômeno Clínico": "Conhecido como 'A Névoa do Conjurador'",
    },
    tags: ["Magia", "Custo", "Memória", "Regra Fundamental"],
    createdAt: "2026-01-15T12:00:00Z",
    updatedAt: "2026-01-15T12:00:00Z",
  },
  {
    id: "rule-2",
    category: "world-rules",
    name: "A Gravidade por Ressonância de Éter",
    subtitle: "Física Metafísica das Terras Flutuantes",
    description:
      "As massas rochosas de Aethelgard flutuam devido a núcleos de aerolito enriquecido. Quando exposto a correntes sonoras harmônicas em determinada frequência, o mineral perde atração pelo solo. O canto coletivo de cidades inteiras mantém as ilhas em altitude estável.",
    attributes: {
      "Natureza": "Físico-Harmônica",
      "Vulnerabilidade": "Silêncio prolongado ou dissonância acústica faz com que a ilha perca sustentação",
      "Instrumento de Controle": "Orgãos astrais gigantescos afinados com precisão matemática",
    },
    tags: ["Física", "Gravidade", "Música", "Mundo"],
    createdAt: "2026-01-15T12:30:00Z",
    updatedAt: "2026-01-15T12:30:00Z",
  },

  // --- TEMA ---
  {
    id: "theme-1",
    category: "theme",
    name: "Tema Central: O Peso do Esquecimento e o Preço do Progresso",
    subtitle: "Diretrizes Narrativas, Estética e Atmosfera",
    description:
      "O universo explora o choque trágico entre o avanço intelectual e a perda das próprias raízes emocionais. Em termos estéticos, combina o charme refinado de alfaiataria vitoriana com arquitetura arcanopunk de bronze polido, pedra translúcida e névoas de montanha.",
    attributes: {
      "Tom Geral": "Lírico, melancólico, com lampejos de aventura heroica",
      "Conflito Filosófico": "Memória versus Poder; Tradição telúrica versus Utopia celeste",
      "Paleta Sensorial": "Cheiro de ozônio e papel envelhecido; tons de vinho, fuligem, âmbar e prata fosca",
      "Perguntas Centrais": "Vale a pena salvar o mundo se você esquecer quem amava no processo?",
    },
    tags: ["Narrativa", "Atmosfera", "Filosofia", "Diretriz"],
    createdAt: "2026-01-16T15:00:00Z",
    updatedAt: "2026-01-16T15:00:00Z",
  },
];

export const INITIAL_CHARACTERS: CharacterItem[] = [
  {
    id: "char-1",
    name: "Aria Vane",
    alias: "A Arquivista Desmemoriada",
    role: "Protagonista",
    race: "Sylfo Celestial",
    organization: "A Ordem dos Tecelões do Destino",
    occupation: "Cronista de Campo & Investigadora de Rupturas",
    archetype: "O Buscador Obcecado / Rebelde Silencioso",
    appearance:
      "Cabelos cor de fumaça presos por agulhas de prata, olhos prateados com íris duplas e sobretudo de couro reforçado com bolsos para pergaminhos e tintas de éter.",
    personality:
      "Perspicaz, meticulosa, mas atormentada pela angústia de esquecer trechos fundamentais da sua própria infância em virtude de um feitiço proibido executado na juventude.",
    motivation:
      "Descobrir quem realmente causou a Grande Ruptura antes que a névoa mental devore suas últimas lembranças de sua irmã.",
    internalConflict:
      "O medo paralisante de usar sua magia para salvar seus amigos e, ao fazê-lo, apagar a lembrança dos nomes deles da sua mente.",
    backstory:
      "Criada na Torre do Cronômetro após ser encontrada nos arredores do Desfiladeiro dos Murmúrios segurando o Astrolábio ainda morno.",
    traits: ["Sagaz", "Leal", "Melancólica", "Perfeccionista"],
    quote: "Escrever é o único feitiço que não me cobra o preço da memória.",
    createdAt: "2026-01-17T10:00:00Z",
    updatedAt: "2026-01-17T10:00:00Z",
  },
  {
    id: "char-2",
    name: "Thorgan Mão-de-Ferro",
    alias: "O Martelo da Revolta",
    role: "Aliado",
    race: "Forjador de Brasa (Kharadun)",
    organization: "A Liga das Brasas Livres",
    occupation: "Líder Operário & Mestre Armeiro",
    archetype: "O Protetor Veterano",
    appearance:
      "Tronco largo, barba trançada com anéis de cobre fumegantes e um braço esquerdo mecânico esculpido em obsidiana e movido a vapor térmico.",
    personality:
      "Voz gutural e acolhedora, honesto até a brutalidade, mas dotado de uma generosidade comovente para com os mais fracos.",
    motivation:
      "Garantir que as próximas gerações de Kharadun não precisem queimar suas vidas no subsolo para sustentar os luxos da nobreza flutuante.",
    internalConflict:
      "Sua aversão à violência desmedida versus a pressão de sua facção por uma revolução armada implacável.",
    backstory:
      "Perdeu o braço durante o resgate de vinte jovens soterrados em uma mina instável de aerolito no Abismo do Sul.",
    traits: ["Corajoso", "Generoso", "Pragmático", "Teimoso"],
    quote: "O metal cede ao calor, a pedra ao tempo, mas a dignidade de um povo não se curva a ninguém.",
    createdAt: "2026-01-17T11:00:00Z",
    updatedAt: "2026-01-17T11:00:00Z",
  },
  {
    id: "char-3",
    name: "Lord Valerius Thorne",
    alias: "O Chanceler de Espelhos",
    role: "Antagonista",
    race: "Humano Imbuído",
    organization: "Conselho Superior das Cidades Altas",
    occupation: "Primeiro-Ministro de Aethelgard",
    archetype: "O Visionário Tirano / O Falso Redentor",
    appearance:
      "Cabelos brancos impecavelmente alinhados, postura aristocrática, manto púrpura debruado a ouro e luvas de seda para esconder suas mãos manchadas de cinza cadavérica.",
    personality:
      "Frio, charmoso, de retórica impecável. Acredita sinceramente que seus atos vis são o remédio amargo necessário para salvar a civilização do colapso gravitacional.",
    motivation:
      "Subjugar os núcleos gravitacionais de todas as ilhas e concentrar o Éter na capital, mesmo que isso condene as províncias inferiores ao abismo.",
    internalConflict:
      "Sabe que o projeto o está matando lentamente por contaminação de éter cristalino, correndo contra o próprio relógio biológico.",
    backstory:
      "Foi discípulo do mesmo grão-mestre que ensinou Aria Vane, mas rompeu com a Ordem quando suas pesquisas sobre magia irrestrita foram censuradas.",
    traits: ["Calculista", "Elocuente", "Implacável", "Orgulhoso"],
    quote: "A história não julga os homens que choram suas dores, ela lembra apenas daqueles que ergueram impérios sobre elas.",
    createdAt: "2026-01-17T11:30:00Z",
    updatedAt: "2026-01-17T11:30:00Z",
  },
  {
    id: "char-4",
    name: "Mestre Corvus",
    alias: "O Velho dos Ecos",
    role: "Mentor",
    race: "Sylfo Celestial",
    organization: "Eremitas do Desfiladeiro",
    occupation: "Ex-Arquivista Real & Guarda dos Segredos Antigos",
    archetype: "O Sábio Excêntrico",
    appearance:
      "Túnica puída repleta de sinos em miniatura, olhar distraído que parece olhar três segundos no futuro, barba comprida salpicada de fuligem de velas.",
    personality:
      "Enigmático, fala por meio de parábolas e anedotas aparentemente sem sentido que se revelam chaves vitais para enigmas complexos.",
    motivation:
      "Guiar Aria no reencontro com sua memória original antes do Grande Alinhamento das Luas.",
    internalConflict:
      "Carrega o remorso de ter ocultado a verdade sobre a origem de Aria por mais de duas décadas.",
    backstory:
      "Abandonou a capital após o julgamento que exilou a família Vane e passou a viver nas cavernas sonoras do Desfiladeiro dos Murmúrios.",
    traits: ["Sábio", "Excêntrico", "Paciente", "Misterioso"],
    quote: "Quando a resposta que você procura doer demais, lembre-se: a cicatriz é o mapa que impede você de se perder no mesmo abismo.",
    createdAt: "2026-01-17T12:00:00Z",
    updatedAt: "2026-01-17T12:00:00Z",
  },
];

export const INITIAL_TIMELINE_EVENTS: TimelineEventItem[] = [
  {
    id: "event-1",
    title: "O Primeiro Acorde e a Elevação dos Monólitos",
    era: "Era dos Ancestrais",
    dateOrder: 100,
    dateDisplay: "Ano 0 da Criação",
    importance: "Crucial",
    summary: "As primeiras notas celestes ressoam e arrancam as montanhas da crosta, formando as ilhas suspensas.",
    description:
      "Os primeiros Sylfos e seres primordiais entoaram o Canto Primordial de ressonância. Enormes platôs rochosos se desprenderam do solo e ascenderam em direção às nuvens, estabelecendo o ecossistema aéreo de Aethelgard e marcando o início do calendário conhecido.",
    location: "Planalto Primordial de Aethelgard",
    charactersInvolved: ["Ancestrais Sylfos", "Mestre Corvus (lenda)"],
    consequences: "Nascimento da civilização das ilhas celestes e separação física entre povos da terra e do ar.",
    createdAt: "2026-01-18T09:00:00Z",
    updatedAt: "2026-01-18T09:00:00Z",
  },
  {
    id: "event-2",
    title: "A Forja do Astrolábio das Cinco Luas",
    era: "Primeira Idade da Luz",
    dateOrder: 240,
    dateDisplay: "Ano 140 da Primeira Idade",
    importance: "Maior",
    summary: "Parceria histórica entre ferreiros Kharadun e magos Sylfos cria o instrumento de profecia temporal.",
    description:
      "Em um raro período de harmonia, os maiores artífices dos dois povos uniram prata estelar e fogo vulcânico para conceber o Astrolábio. A relíquia permitiu mapear pela primeira vez as convergências de marés de Éter e prever calamidades atmosféricas.",
    location: "Grandes Forjas Centrais de Kharad",
    charactersInvolved: ["Mestre Kharadun Vane"],
    consequences: "Séculos de navegação segura entre as frotas celestes e nascimento da Ordem dos Tecelões.",
    createdAt: "2026-01-18T09:30:00Z",
    updatedAt: "2026-01-18T09:30:00Z",
  },
  {
    id: "event-3",
    title: "A Noite da Cinza Silenciosa (A Grande Ruptura)",
    era: "Segunda Idade da Cisão",
    dateOrder: 380,
    dateDisplay: "Ano 312 da Segunda Idade",
    importance: "Crucial",
    summary: "Um experimento mágico proibido colapsa três ilhas menores e apaga a memória coletiva de uma geração.",
    description:
      "Uma tentativa desastrosa conduzida no Observatório Real de manipular o fluxo temporal gerou uma onda de choque que silenciou os órgãos acústicos por três noites. Três províncias despencaram no oceano inferior e centenas de eruditos sofreram amnésia fulminante devido à Lei do Troco Mnemônico.",
    location: "Observatório de Aethelgard e Céus do Sul",
    charactersInvolved: ["Aria Vane (infância)", "Lord Valerius Thorne", "Mestre Corvus"],
    consequences: "Ruptura diplomática irreparável, surgimento de facções rebeldes e proibição total de magias de alteração cronológica.",
    createdAt: "2026-01-18T10:00:00Z",
    updatedAt: "2026-01-18T10:00:00Z",
  },
  {
    id: "event-4",
    title: "A Batalha das Forjas do Sul e o Levante dos Mineradores",
    era: "Era Atual",
    dateOrder: 450,
    dateDisplay: "Ano 22 da Era Atual",
    importance: "Maior",
    summary: "Thorgan Mão-de-Ferro lidera a resistência contra a expropriação de minérios pelas frotas do Chanceler.",
    description:
      "Após o aumento abusivo das taxas decretado por Lord Valerius Thorne, os artesãos do subsolo bloquearam as saídas de aerolito. As tropas da capital tentaram retomar as minas à força, mas foram repelidas pelo terreno estreito e pelo uso de Quimeras de Obsidiana amestradas como defesa.",
    location: "Caldeiras Vulcânicas de Kharadun",
    charactersInvolved: ["Thorgan Mão-de-Ferro", "Lord Valerius Thorne"],
    consequences: "Fundação oficial da Liga das Brasas Livres e cessar-fogo tenso sob ameaça de greve de combustível arcano.",
    createdAt: "2026-01-18T10:30:00Z",
    updatedAt: "2026-01-18T10:30:00Z",
  },
  {
    id: "event-5",
    title: "O Eclipse das Cinco Luas (Presente)",
    era: "Era Atual",
    dateOrder: 500,
    dateDisplay: "Ano 34 da Era Atual (Dias Atuais)",
    importance: "Crucial",
    summary: "O raro alinhamento cósmico aproxima-se, e todos os fios do destino convergem para a Cidadela Suspensa.",
    description:
      "O Astrolábio começa a girar espontaneamente, indicando que as correntes gravitacionais de Aethelgard oscilarão ao ponto crítico. Aria Vane, Thorgan e o Conselho correm contra o tempo para decidir o destino final das cidades flutuantes antes que a música da sustentação se silencie para sempre.",
    location: "Aethelgard e Desfiladeiro dos Murmúrios",
    charactersInvolved: ["Aria Vane", "Thorgan Mão-de-Ferro", "Lord Valerius Thorne", "Mestre Corvus"],
    consequences: "Ponto de clímax onde a história atual se desenvolve.",
    createdAt: "2026-01-18T11:00:00Z",
    updatedAt: "2026-01-18T11:00:00Z",
  },
];
