# OttoMatic Comandas - Template Factory 🚀

Este repositório é uma **fábrica de aplicativos white-label** para gerenciamento de comandas e caixas de restaurantes, lanchonetes e bares. A partir deste template base, você consegue gerar instâncias independentes, customizadas e publicadas para cada novo cliente em menos de 1 minuto.

---

## 📋 Pré-requisitos na Máquina

Antes de começar a usar o gerador de clientes, certifique-se de ter instalado:
1. **Node.js** (versão 18 ou superior).
2. **Git** (configurado com sua conta do GitHub).
3. **Vercel CLI** (instalado globalmente e autenticado):
   ```bash
   npm install -g vercel
   vercel login
   ```

---

## 🛠️ Como Criar um Novo Cliente (Passo a Passo)

Para criar um novo aplicativo do zero para um cliente:

### 1. Preparação dos Serviços
1. **GitHub**: Crie um novo repositório vazio no seu perfil do GitHub (ex: `https://github.com/seu-usuario/comandas-chicogrill.git`). Não adicione README, `.gitignore` ou licença.
2. **Firebase**:
   * Crie um projeto no [Firebase Console](https://console.firebase.google.com/).
   * Ative o **Authentication** (Provedor E-mail/Senha).
   * Ative o **Firestore Database** (Crie em Modo de Teste ou Modo de Produção).
   * Crie um aplicativo **Web** (`</>`) nas configurações do projeto e copie as chaves de configuração geradas.

### 2. Executando o Script Gerador
1. Abra o terminal na pasta deste template (`otto-comandas-template`).
2. Execute o assistente de criação:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\criar-cliente.ps1
   ```
3. Preencha as informações solicitadas no terminal:
   * **Nome do Cliente** (ex: `Chico Grill`).
   * **Subtítulo do App** (ex: `Comandas & Caixa` - Pressione Enter para o padrão).
   * **Nome da Pasta** (Pressione Enter para gerar automaticamente com base no nome do cliente).
   * **URL do Repositório GitHub** (A URL que você criou no Passo 1).
   * **Chaves do Firebase** (Insira as 6 chaves que você copiou do Firebase Console).

**Pronto!** O script irá duplicar o template, configurar o nome do cliente, gerar o arquivo `.env.local` localmente, subir o código para o novo repositório no GitHub e publicar a versão de produção na Vercel com todas as variáveis de ambiente cadastradas.

---

## 💻 Como Dar Manutenção em um Cliente Existente

Se você precisar ajustar o cardápio, cores ou funcionalidades de um aplicativo de cliente que já foi gerado:

1. Abra a pasta do cliente gerado no seu editor de código (ex: `ottomatic-comandas-chicogrill`).
2. Para alterar o cardápio, cores ou nome do restaurante, edite apenas o arquivo:
   👉 **`src/data/config.js`**
3. Para testar localmente:
   * Instale as dependências (necessário apenas na primeira vez): `npm install`.
   * Inicie o servidor local:
     ```bash
     node node_modules/vite/bin/vite.js
     ```
   * Abra o navegador e adicione `?beta=true` no fim da URL para conectar o app ao banco do Firebase do cliente (ex: `http://localhost:5173/?beta=true`).
4. Para salvar e publicar as atualizações no site de produção do cliente, execute no terminal da pasta do cliente:
   ```bash
   git add .
   git commit -m "Ajuste de preços no cardápio"
   git push
   ```
   *A Vercel identificará o push e atualizará o site oficial do cliente em poucos segundos.*

---

## ⚠️ Dica Importante (Windows e Caminhos com Espaços)

Se o caminho da sua pasta no Windows contiver espaços, parênteses ou caracteres especiais (ex: `03_LAB (Testes & IA Studio Free)`), comandos como `npm run dev` ou `npm run build` podem apresentar erros do tipo:
`'IA' não é reconhecido como um comando interno ou externo...`

Para contornar este comportamento e rodar o projeto localmente sem erros, chame o arquivo do Vite diretamente com o Node:
* **Executar Servidor Local:** `node node_modules/vite/bin/vite.js`
* **Rodar Compilação (Build):** `node node_modules/vite/bin/vite.js build`
*(Essa limitação ocorre apenas no terminal Windows local. No servidor de produção da Vercel, o build funciona automaticamente sem a necessidade de nenhuma modificação).*
