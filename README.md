# ZUME - Plataforma de Estudos e Produtividade

## Sobre o Projeto

O **ZUME** é uma plataforma web desenvolvida como Trabalho de Discente Efetivo (TDE) da disciplina de **Introdução à Linguagem de Programação**.

O projeto tem como objetivo auxiliar estudantes na organização dos estudos, promovendo foco, produtividade e aprendizado ativo por meio de ferramentas integradas em um único ambiente.

A plataforma reúne funcionalidades como gerenciamento de sessões Pomodoro, metas de estudo, autenticação de usuários, processamento de materiais didáticos e integração com Inteligência Artificial para geração de conteúdo educacional.

Projeto é para fins educacionais e os dados estão salvos em um servidor compartilhado (Render/SQLite).
Para sua segurança, não utilize a mesma senha do seu e-mail institucional ou de sistemas bancários.

---

## Objetivos

- Melhorar a produtividade durante os estudos.
- Auxiliar na gestão eficiente do tempo.
- Incentivar técnicas de aprendizagem ativa.
- Centralizar ferramentas acadêmicas em uma única plataforma.
- Explorar conceitos de desenvolvimento Full Stack utilizando linguagem C no backend.

---

## Funcionalidades

### Autenticação de Usuários

- Cadastro de novos usuários.
- Login com e-mail e senha.
- Persistência de dados utilizando SQLite.
- Gerenciamento de contas.

### Pomodoro Inteligente

- Cronômetro Pomodoro integrado.
- Modos de estudo pré-configurados:
  - 25 minutos (Pomodoro clássico)
  - 30 minutos
  - 50 minutos
  - 60 minutos
- Iniciar, pausar e reiniciar sessões.
- Barra de progresso em tempo real.
- Alerta sonoro ao término da sessão.

### Metas e Produtividade

- Controle de pomodoros concluídos.
- Registro de minutos estudados.
- Metas diárias de produtividade.
- Sistema de sequência de estudos (streak).

### Ferramentas de Estudo

- Upload de arquivos para análise.
- Campo para inserção de textos e anotações.
- Geração de materiais de apoio.
- Suporte à renderização de fórmulas matemáticas com MathJax.

### Integração com Inteligência Artificial

- Geração automática de resumos.
- Criação de roteiros de estudo.
- Estrutura preparada para futuras funcionalidades:
  - Flashcards automáticos;
  - Questões de revisão;
  - Conteúdo personalizado;
  - Recomendações de estudo.

### Interface Responsiva

- Design moderno e intuitivo.
- Compatibilidade com computadores e dispositivos móveis.
- Navegação simplificada para estudantes.

---

## Tecnologias Utilizadas

### Frontend

- HTML5
- CSS3
- JavaScript (ES6+)

### Bibliotecas Frontend

- PDF.js
- Marked.js
- MathJax
- Web Audio API

### Backend

- Linguagem C
- GNU Make

### Banco de Dados

- SQLite3

### Bibliotecas do Backend

- libmicrohttpd
- libcurl
- OpenSSL
- pthread

### Controle de Versão

- Git
- GitHub

---

## Estrutura do Projeto

```text
tde2.0/
│
├── backend/
│   ├── server.c
│   └── Makefile
│
├── frontend/
│   ├── login.html
│   ├── conta.html
│   ├── teste.html
│   ├── script02.js
│   └── style02.css
│
├── pomodoro/
│   ├── pomodoro.html
│   ├── pomodoro.js
│   └── pomodoro.css
│
├── assets/
├── logos_google/
├── fonts_google/
├── .env.example
├── .gitignore
└── README.md
```

---

## Requisitos

### Linux (Ubuntu/Debian)

Instale as dependências necessárias:

```bash
sudo apt update

sudo apt install \
gcc \
make \
sqlite3 \
libsqlite3-dev \
libmicrohttpd-dev \
libcurl4-openssl-dev \
libssl-dev
```

---

## Instalação

### 1. Clonar o Repositório

```bash
git clone <URL_DO_REPOSITORIO>
cd tde2.0
```

### 2. Configurar Variáveis de Ambiente

Crie o arquivo `.env` a partir do modelo:

```bash
cp .env.example .env
```

Edite o arquivo e informe sua chave da API:

```env
GROQ_API_KEY=SUA_CHAVE_AQUI
```

> Importante: nunca envie seu arquivo `.env` para o GitHub.

---

## Compilação

Entre na pasta do backend:

```bash
cd backend
```

Compile o servidor:

```bash
make
```

Isso gerará o executável:

```text
server
```

---

## Execução

Defina a variável de ambiente da API (caso não utilize um carregador de `.env`):

```bash
export GROQ_API_KEY="SUA_CHAVE"
```

Execute o servidor:

```bash
./server
```

O backend ficará disponível em:

```text
http://localhost:8080
```

---

## Utilização do Frontend

Abra os arquivos do frontend em um navegador ou utilize um servidor local.

Exemplo utilizando Python:

```bash
cd frontend
python3 -m http.server 5500
```

Depois acesse:

```text
http://localhost:5500
```

---

## Segurança

Para proteger informações sensíveis:

- O arquivo `.env` não é versionado.
- Chaves de API não devem ser armazenadas diretamente no código-fonte.
- Bancos de dados locais não são distribuídos no repositório.
- Arquivos binários compilados são ignorados pelo Git.

---

## Funcionalidades Futuras

- Flashcards inteligentes.
- Dashboard avançado de produtividade.
- Estatísticas detalhadas de desempenho.
- Recomendações personalizadas por IA.
- Sistema de gamificação.
- Aplicativo mobile.
- Sincronização em nuvem.

---

## Autores
Samuel Santana

Projeto desenvolvido como Trabalho de Discente Efetivo (TDE) da disciplina de Introdução à Linguagem de Programação.

---

## Licença

Projeto desenvolvido para fins acadêmicos e educacionais.
