<p align="center">
  <img src="assets/brand/capitulando-logo.png" alt="Logo do CapituLando" width="240" />
</p>

# CapituLando Mobile

Aplicativo para escritores organizarem histórias, capítulos, personagens e os universos de suas obras. Desenvolvido com React Native e Expo, oferece espaço de escrita, acompanhamento de metas e ferramentas para planejar e preservar o trabalho do autor.

Este repositório contém o **frontend mobile**, com execução em Android e iOS pelo Expo Go. A aplicação utiliza uma API Express separada e compartilha contas e dados com o projeto CapituLando web.

## Equipe

| Integrante | RA |
| --- | --- |
| João Vitor Cruz de Menezes | 00000859900 |
| Márcio Henrique dos Santos | 00000860052 |
| Jamilly Vitória Dos Santos Silva | 00000860055 |
| Elidiane Moniky Vitória Nunes da Silva | 00000859928 |
| Nerisson Valdomiro da Silva | 00000860154 |

### Divisão das responsabilidades no frontend

| Integrante | Área |
| --- | --- |
| João Vitor | Autenticação, confirmação de e-mail, recuperação de senha, perfil, configurações, sessão e estrutura de navegação. |
| Márcio | Personagens, relacionamentos, vínculos com raças e organizações, eventos, participantes e cronologia. |
| Jamilly | Espaço de escrita, capítulos, rascunhos, modo foco, recuperação da escrita e conflitos entre sessões. |
| Elidiane Moniky | Início, painel de progresso, histórias/livros, ideias e metas. |
| Nerisson | Enciclopédia, tema, componentes visuais e página Sobre. |

## Funcionalidades

### Conta e preferências

- Cadastro, login, confirmação de e-mail e recuperação de senha.
- Renovação da sessão e encerramento de acesso.
- Consulta e edição do perfil, foto, biografia, gêneros e site do autor.
- Temas claro, escuro e do sistema, tamanho de fonte e preferências de avisos.
- Lembrete diário local de escrita no celular, mediante permissão.
- Exportação e restauração de backup, além da exclusão dos dados da conta com confirmação.

### Planejamento das obras

- Painel com indicadores de progresso e resumo dos livros recentes.
- Cadastro, edição e exclusão de histórias.
- Ideias com categorias, filtro por livro e sugestões por gênero que podem ser salvas.
- Metas com unidade de medida, progresso, conclusão e reabertura.

### Escrita

- Listagem e leitura individual de capítulos, com acesso ao editor.
- Capítulos e rascunhos com formatação: negrito, itálico, sublinhado, títulos H1/H2, citação e lista.
- Contagem de palavras e caracteres, estimativa de leitura e modo foco.
- Cópia, compartilhamento e exportação em TXT e PDF.
- Recuperação da escrita e tratamento de versões em conflito, com opções para comparar, mesclar ou preservar uma cópia.

### Construção do universo

- Enciclopédia de raças, criaturas, itens, locais, organizações e regras do universo.
- Imagens e anotações para organizar informações da obra.
- Personagens, relacionamentos e vínculos com outros elementos do universo.
- Eventos com participantes e organização da cronologia.

## Tecnologias

| Tecnologia | Uso |
| --- | --- |
| Expo SDK 58 e React Native 0.88 | Execução mobile e acesso aos recursos do dispositivo. |
| React 19 e TypeScript 6 | Interface e tipagem do frontend. |
| Expo Router | Rotas por arquivos, proteção de telas, abas nativas no Android/iOS e transições do Stack. |
| React Native Paper e componentes compartilhados | Botões, campos, diálogos e identidade visual. |
| TanStack Query e Axios | Comunicação com a API e gerenciamento dos dados recebidos. |
| Zustand, AsyncStorage e SecureStore | Estado da aplicação e armazenamento local conforme a plataforma. |
| React Native WebView | Editor de escrita no aplicativo nativo. |
| Módulos Expo | Arquivos, imagens, impressão, compartilhamento, notificações locais e atualizações. |

## Integração com o projeto web

O aplicativo acessa a API Express por HTTP. A API é responsável pelas regras de negócio e pelo acesso ao banco compartilhado com o projeto web; o frontend não se conecta diretamente ao banco.

Ao entrar com a mesma conta, o usuário acessa os dados persistidos nesse banco, inclusive os criados pelo navegador. Para carregar e sincronizar alterações, a API precisa estar disponível e o dispositivo deve ter conexão. A recuperação local da escrita não equivale a suporte completo ao uso offline.

Os links de confirmação de e-mail e recuperação de senha enviados pelo fluxo mobile abrem no navegador. Após concluir o procedimento, o usuário retorna manualmente ao Expo Go. O encaminhamento desses links para a API correspondente é configurado no backend e no frontend web.

## Como executar

### Pré-requisitos

- Node.js compatível com as dependências do projeto: `^22.13.0`, `^24.3.0` ou `>=26.0.0`.
- npm e Git.
- Expo Go compatível com o SDK 58 para executar no celular.
- Acesso à API configurada em `EXPO_PUBLIC_API_URL`.

### Instalação

```sh
git clone https://github.com/JvCruzM/CapituLando-Mobile.git
cd CapituLando-Mobile
npm ci
```

### Configuração do ambiente

Copie o arquivo [.env.example](.env.example) para `.env` na raiz do projeto. No PowerShell:

```powershell
Copy-Item .env.example .env
```

Configure o endereço da API:

```dotenv
EXPO_PUBLIC_API_URL=https://capitu-lando-mobile-backend.vercel.app
```

| Variável | Descrição |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | URL base da API Express utilizada pelo aplicativo. |

O arquivo `.env` é ignorado pelo Git; o modelo de configuração é versionado em `.env.example`. Variáveis com prefixo `EXPO_PUBLIC_` ficam disponíveis no aplicativo distribuído. Credenciais do banco, chaves JWT e senhas de e-mail pertencem ao backend.

Para usar uma API local no celular, informe o endereço de rede do computador, com a porta da API. `localhost` no celular aponta para o próprio celular. Reinicie o Expo após mudar a configuração.

### Abrir no Expo Go

```sh
npm start
```

Mantenha o computador e o celular na mesma rede. Leia o QR Code com o Expo Go no Android ou com a câmera no iOS. O servidor de desenvolvimento deve continuar em execução.

Se a rede impedir a conexão direta, use:

```sh
npm run goTunnel
```

O túnel do Expo disponibiliza o servidor de desenvolvimento; uma API executada localmente também precisa estar acessível ao celular.

### Outros comandos de execução

| Comando | Finalidade |
| --- | --- |
| `npm run android` | Inicia o Expo e solicita abertura no Android conectado ou emulador disponível. |
| `npm run ios` | Inicia o Expo e solicita abertura no simulador iOS, que exige macOS e Xcode. |
| `npm run web` | Executa a versão do aplicativo para navegador. |
| `npx expo start --go --clear` | Reinicia o servidor de desenvolvimento limpando o cache do Metro. |

### Navegação inicial

Após cadastrar e confirmar a conta ou fazer login, as abas principais organizam o acesso:

- **Painel:** resumo do progresso e atalhos para continuar escrevendo.
- **Livros:** histórias e acesso aos capítulos.
- **Universo:** enciclopédia, personagens e planejamento do universo da obra.
- **Conta:** perfil, configurações e backups.

Selecione uma história para trabalhar nos conteúdos associados a ela. No Android e iOS, as abas usam Native Tabs; no navegador, há uma implementação de abas apropriada para web.

## Verificações do projeto

```sh
npm test
npm run check
```

`npm test` executa os testes automatizados em `tests/`. `npm run check` verifica os tipos TypeScript e a compatibilidade das versões dos pacotes com o Expo. Para verificar somente os tipos, use `npm run typecheck`.

Os testes automatizados devem ser complementados pela validação no dispositivo:

1. Cadastrar uma conta, confirmar o e-mail no navegador, entrar e recuperar a senha.
2. Editar o perfil, trocar o tema e configurar o lembrete diário.
3. Criar uma história, uma ideia e uma meta; conferir filtros e progresso.
4. Escrever, formatar, salvar e reabrir um capítulo; testar leitura, rascunhos e exportações.
5. Editar o mesmo capítulo em duas sessões e validar as opções de resolução de conflito.
6. Criar elementos da enciclopédia, personagens e eventos, verificando imagens e vínculos.
7. Exportar um backup e testar a restauração em uma conta de testes.
8. Conferir os dados no web e no mobile usando a mesma conta e o mesmo ambiente de banco.

## Particularidades das plataformas

- **Lembretes:** são notificações locais no aplicativo nativo, sujeitas às permissões do sistema. A versão para navegador não agenda esses lembretes.
- **Arquivos:** salvar, escolher pasta e compartilhar dependem das opções disponíveis no sistema. No navegador, as exportações utilizam o download do browser.
- **Imagens:** a seleção depende do seletor de arquivos ou da galeria, conforme a plataforma.
- **Editor:** há implementações específicas para aplicativo nativo e navegador, mantendo o conteúdo formatado compatível entre eles.
- **Validação:** recursos nativos e permissões precisam ser conferidos separadamente em Android e iOS.

## Organização do repositório

```text
assets/                 Imagens e identidade visual
src/
  app/                  Rotas e layouts do Expo Router
    (tabs)/             Abas principais e suas telas
    (account)/          Rotas da conta
  features/             Funcionalidades organizadas por domínio
  shared/
    api/                Cliente HTTP e configuração de consultas
    components/         Componentes reutilizáveis
    navigation/         Recursos compartilhados de navegação
    storage/            Persistência local
    store/              Estado compartilhado
    theme/              Paleta e temas
tests/                  Testes automatizados
app.json                Configuração do aplicativo e vínculo EAS
eas.json                Configuração da CLI EAS
.env.example            Modelo da configuração local
```

## Licença

Este projeto utiliza a licença [MIT](LICENSE).
