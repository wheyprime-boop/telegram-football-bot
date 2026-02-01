# Deploy no Railway

Guia passo a passo para fazer deploy do bot de previsões de futebol no Railway.

## Pré-requisitos

- Conta GitHub (gratuita)
- Conta Railway (gratuita em https://railway.app)
- O repositório do bot no GitHub

## Passo 1: Fazer Push do Código para GitHub

### 1.1 Criar um repositório no GitHub

1. Acede a https://github.com/new
2. Nome do repositório: `telegram-football-bot`
3. Descrição: "Bot de Telegram para previsões de futebol"
4. Clica em "Create repository"

### 1.2 Fazer Push do Código

No terminal, executa:

```bash
cd /home/ubuntu/telegram-football-bot

# Adicionar remote do GitHub
git remote add origin https://github.com/SEU_USERNAME/telegram-football-bot.git

# Fazer push do código
git branch -M main
git push -u origin main
```

## Passo 2: Deploy no Railway

### 2.1 Conectar Railway ao GitHub

1. Acede a https://railway.app
2. Clica em "Login" e escolhe "Login with GitHub"
3. Autoriza o Railway a aceder ao teu GitHub
4. Clica em "Create New Project"
5. Escolhe "Deploy from GitHub repo"
6. Seleciona o repositório `telegram-football-bot`
7. Clica em "Deploy"

### 2.2 Configurar Variáveis de Ambiente

1. No dashboard do Railway, vai para "Variables"
2. Adiciona as seguintes variáveis:

```
TELEGRAM_BOT_TOKEN=8564354616:AAFPjyYeYjDDy8zsLPabg4v45_t_EFJz1tI
TELEGRAM_CHAT_ID=6668033414
SEND_TIME=07:00
TIMEZONE=Europe/Lisbon
```

3. Clica em "Save"

### 2.3 Iniciar o Serviço

1. No dashboard, clica em "Deploy"
2. Aguarda o deploy completar (2-3 minutos)
3. Quando terminar, o bot estará a correr 24/7

## Passo 3: Verificar se Está a Funcionar

1. Abre o Telegram
2. Procura pelo bot `@Seixasprevisaobot`
3. Aguarda a próxima execução agendada (07:00)
4. Deverás receber as previsões automaticamente

## Troubleshooting

### "Build failed"

- Verifica se o `package.json` está correto
- Verifica se não há erros de sintaxe no código

### "Bot não envia mensagens"

- Verifica se as variáveis de ambiente estão corretas
- Verifica se o `TELEGRAM_BOT_TOKEN` é válido
- Verifica se o `TELEGRAM_CHAT_ID` é válido

### "Erro ao conectar ao GitHub"

- Verifica se tens permissões no repositório
- Tenta fazer logout e login novamente no Railway

## Atualizar o Bot

Para atualizar o bot com novas funcionalidades:

1. Faz as alterações no código local
2. Faz commit e push para GitHub:

```bash
git add .
git commit -m "Descrição das alterações"
git push
```

3. O Railway fará deploy automático das alterações

## Parar o Bot

1. No dashboard do Railway, clica em "Settings"
2. Clica em "Delete Service"
3. Confirma a eliminação

## Custos

- Railway oferece **$5 de créditos gratuitos por mês**
- Este bot consome muito pouco (menos de $1 por mês)
- Portanto, é **totalmente gratuito** durante muito tempo

## Suporte

Para problemas com o Railway, consulta a documentação em https://docs.railway.app
