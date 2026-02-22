# Audio Player Studio (Serverless Edition)

Este é um projeto de um player de áudio interativo focado no estudo e isolamento de faixas musicais. Ele permite separar vocais, bateria, baixo e outros instrumentos de qualquer música e tocá-los em um estúdio web de forma sincronizada, alterando o volume de cada um, mutando faixas e monitorando os principais acordes da música em tempo real.

O projeto foi modernizado para uma **Arquitetura Serverless no Google Cloud Platform (GCP)** visando escalabilidade e redução drástica de custos (paga apenas quando o backend estiver processando requisições).

## 🚀 Funcionalidades Atuais

- **Download de Músicas do YouTube:** Cole o link de um clipe ou música do YouTube, e o backend baixará o áudio (MP3).
- **Separação de Faixas (Stems):** Utilizando o modelo de Inteligência Artificial **Spleeter**, a música pode ser separada em até 5 faixas (Vocal, Bateria, Baixo, Piano, Outros).
- **Mixer Web Profissional:** Uma interface em **Vue.js + Tailwind CSS + PrimeVue** que permite controlar o volume independentemente, fazer solo de instrumentos e mutá-los em tempo real.
- **Identificação de Acordes por IA (Librosa):** Através de um script avançado em **Python** utilizando a biblioteca de processamento de áudio `librosa`, os acordes são mapeados na própria interface, sincronizados com o áudio.
- **Mudança de Tom (Pitch Shift):** Recurso de alteração de tom da música (Pitch Shifter) integrado no mixer utilizando o `rubberband-cli` via `ffmpeg`.

---

## ☁️ Arquitetura Serverless (GCP)

- **Backend (Google Cloud Run):** Onde o código Node.js executa. Ele escala para zero quando não há acesso. Ele baixa os vídeos temporariamente no `/tmp` da nuvem, processa e exclui, enviando a versão final para o Storage.
- **Storage (Google Cloud Storage - GCS):** Armazenamento de todos os arquivos MP3, WAV (Stems), imagens (thumbnails) e metadados JSON. O acesso pelo Frontend se dá via streaming por `Signed URLs` (URLs temporárias seguras de altíssima performance).
- **Banco de Dados (Firestore Native):** Banco NoSQL Serverless para registrar os IDs dos Grupos e as metadados completos de cada arquivo de áudio presente na biblioteca.
- **CI / CD (Cloud Build):** Orquestração automatizada para construir o Vite, empacotar a imagem Docker (juntando Node, Python e FFmpeg) e fazer o envio automático para o Artifact Registry.

---

## 🛠️ Tecnologias Utilizadas

**Backend:**

- **Node.js** (Express)
- **Firebase Admin SDK** (Conexão direta com Firestore e Storage)
- **@google-cloud/storage** & **@google-cloud/firestore**
- **yt-dlp-exec** (Para extração dos áudios do YouTube)
- **fluent-ffmpeg** / **rubberband-cli** (Manipulação de formatos de áudio/Pitch Shift)
- **Python / Librosa / Numpy** (Para detecção de acordes)
- **Spleeter by Deezer** (Para isolar e separar os instrumentos)

**Frontend:**

- **Vue.js 3**
- **Vite**
- **Tailwind CSS** (Para layouts modernos de interface de estúdio glassmorphism)
- **PrimeVue** (Botões e controles visuais com PrimeIcons)

---

## 🏃 Como Rodar a Aplicação

### Pré-requisitos (Desenvolvimento Local)

Para testar a aplicação no seu computador (com o backend Node conectando nos recursos remotos da GCP), você precisa:

1. Das credenciais de API do projeto do Google: `sa-key.json` salva na pasta `/backend`.
2. FFmpeg, yt-dlp, Python 3.11, Spleeter (`pip install spleeter`) e Librosa instalados na sua máquina localmente para processamento das mídias.

```bash
# Iniciar o ambiente (Instalar pacotes, buildar o frontend, exportar a API KEY do GCP e rodar na :3000)
export GOOGLE_APPLICATION_CREDENTIALS="sa-key.json"
make all
```

### 🚀 Deploy para Produção (GCP)

O processo de deploy na nuvem foi simplificado utilizando o Google Cloud Build (`cloudbuild.yaml`). Cuidará da compilação, estruturação Docker, do push para o Artifact Registry e da criação da nova Revisão no Cloud Run.

Basta logar na sua conta do GCloud e executar o Makefile:

```bash
make deploy
```

O console te devolverá com a nova URL pública da sua aplicação (Ex: `https://sonic-stream-app-xxxxx.us-central1.run.app`).
