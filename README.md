# Audio Player Studio

Este é um projeto de um player de áudio interativo focado no estudo e isolamento de faixas musicais. Ele permite separar vocais, bateria, baixo e outros instrumentos de qualquer música e tocá-los em um estúdio web de forma sincronizada, alterando o volume de cada um, mutando faixas e monitorando os principais acordes da música em tempo real.

## 🚀 Funcionalidades Atuais

- **Download de Músicas do YouTube:** Cole o link de um clipe ou música do YouTube, e o backend baixará o áudio (MP3).
- **Separação de Faixas (Stems):** Utilizando o modelo de Inteligência Artificial **Spleeter**, a música pode ser separada em até 5 faixas (Vocal, Bateria, Baixo, Piano, Outros).
- **Mixer Web Profissional:** Uma interface em **Vue.js + Tailwind CSS + PrimeVue** que permite controlar o volume independentemente, fazer solo de instrumentos e mutá-los em tempo real sem "engasgos".
- **Identificação de Acordes por IA (Librosa):** Através de um script avançado em **Python** utilizando a biblioteca de processamento de áudio `librosa`, os acordes são mapeados na própria interface, seguindo de perto a posição e o timing do áudio que está tocando.
- **Mudança de Tom (Pitch Shift) - _Em Breve/Configuração Externa_:** Recurso de alteração de tom da música (Pitch Shifter).

---

## 🛠️ Tecnologias Utilizadas

**Backend:**

- **Node.js** (Express)
- **yt-dlp-exec** (Para extração dos áudios do YouTube)
- **fluent-ffmpeg** (Manipulação de formatos de áudio/Pitch Shift)
- **Python / Librosa / Numpy** (Para detecção de acordes através das classes de pitch/chromagram)
- **Spleeter by Deezer** (Para isolar e separar os instrumentos)

**Frontend:**

- **Vue.js 3**
- **Vite**
- **Tailwind CSS** (Para layouts modernos de interface de estúdio glassmorphism)
- **PrimeVue** (Botões e controles visuais com PrimeIcons)

---

## ⚙️ Pré-requisitos do Sistema

Como este projeto utiliza aprendizado de máquina e processamento avançado de áudio por baixo dos panos, seu sistema precisa ter algumas bibliotecas instaladas de forma global para funcionar.

### 1. Node.js e NPM

Certifique-se de que o **Node.js** (v18+) esteja instalado na sua máquina (`node -v`).

### 2. FFmpeg e Yt-dlp

O backend usa o FFmpeg para converter e analisar os áudios e `yt-dlp` globalmente:

```sh
brew install ffmpeg
brew install yt-dlp
```

### 3. Python 3 (Librosa e Ferramentas Matemáticas)

O sistema de leitura de acordes utiliza a versão local do Python com os pacotes matemáticos necessários:

```sh
pip install librosa numpy scipy
```

### 4. Spleeter

O projeto roda a linha de comando do [Spleeter](https://github.com/deezer/spleeter).
Para o macOS, a melhor forma de instalação é utilizando o PIP (ou um ambiente virtual Python):

```sh
pip install spleeter
```

_Os modelos de treinamento (ex: `5stems`) devem estar presentes ou ser baixados pela primeira vez pelo backend em `/backend/pretrained_models` para que o isolamento de faixas da música funcione sem conexão com a internet ou atrasos maiores._

---

## 🏃 Como Rodar a Aplicação

A aplicação possui um arquivo `Makefile` na pasta raiz para facilitar a inicialização.

### Instalação (Primeira Vez)

Para garantir que as sub-pastas instalaram as dependências corretas (packages.json), utilize:

```bash
make install
```

Isso fará o `npm install` automaticamente nas pastas `/backend` e `/frontend`.

### Rodando o Servidor Simultaneamente

O sistema executa todos os componentes integrados com apenas um comando (compilando a versão do Vue através do Vite e em seguida subindo o `server.js` na porta **3000** conectando-se aos arquivos estáticos do frontend).

```bash
make all
```

**(Ou caso queira iniciar sem dar "build" novamente do frontend)**:

```bash
make start
```

Após ver `Server running on port 3000`, você pode acessar no seu navegador:
👉 **[http://localhost:3000](http://localhost:3000)**

_(Nota: como todo o roteamento do API e estáticos rodam sob a mesma porta para resolver problemas de CORS, o front-end está incluído na mesma porta NodeJS. Se for desenvolver focado no front-end, você pode ir para `cd frontend` e rodar `npm run dev` para usar a porta default Vite com Hot Reload)._
