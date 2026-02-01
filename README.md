# Bot de Previsões de Futebol para Telegram

Um bot de Telegram que envia previsões de futebol de múltiplas fontes todos os dias a uma hora específica.

## Funcionalidades

- 📅 **Envio Diário**: Previsões enviadas automaticamente todos os dias às 7 da manhã
- ⚽ **Todas as Ligas**: Suporta previsões de todas as ligas de futebol disponíveis
- 🎯 **Múltiplas Fontes**: Recolhe dados de Predictz, Betexplorer, FlashScore, SofaScore e ESPN
- 📊 **Análise Consolidada**: Agrupa previsões de diferentes sites para melhor análise
- 🔄 **Sem API Key Necessária**: Usa web scraping de fontes públicas
- 🚀 **Atualização em Tempo Real**: Dados sempre atualizados

## Fontes de Dados

O bot recolhe previsões de:

| Fonte | Tipo | Descrição |
|-------|------|-----------|
| **Predictz** | Web Scraping | Previsões de especialistas |
| **Betexplorer** | Web Scraping | Odds e análise de apostas |
| **FlashScore** | Web Scraping | Dados de jogos e ligas |
| **SofaScore** | API Pública | Informações de eventos em tempo real |
| **ESPN** | Web Scraping | Análise e previsões |

## Requisitos

- Node.js 16+
- npm ou yarn
- Token de Bot do Telegram

## Instalação

### 1. Clonar o Repositório

```bash
git clone <repo-url>
cd telegram-football-bot
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Configurar Variáveis de Ambiente

Copia o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edita o arquivo `.env` com as tuas credenciais:

```env
# Telegram Bot Token
TELEGRAM_BOT_TOKEN=seu_token_aqui

# Telegram Chat ID
TELEGRAM_CHAT_ID=seu_chat_id_aqui

# Horário de envio (formato HH:mm)
SEND_TIME=07:00

# Timezone (ex: Europe/Lisbon)
TIMEZONE=Europe/Lisbon
```

## Obter Credenciais

### Token do Telegram Bot

1. Abre o Telegram e procura por `@BotFather`
2. Envia `/newbot` e segue as instruções
3. Copia o token fornecido

### Chat ID do Telegram

1. Envia uma mensagem para o teu bot
2. Acede a `https://api.telegram.org/bot<TOKEN>/getUpdates`
3. Procura pelo `chat.id` na resposta

## Executar

### Modo Desenvolvimento

```bash
npm run dev
```

### Modo Produção

```bash
npm start
```

## Estrutura do Projeto

```
telegram-football-bot/
├── src/
│   ├── index.js                 # Arquivo principal
│   └── services/
│       ├── scraper.js           # Serviço de web scraping
│       └── telegram.js          # Serviço de Telegram
├── .env.example                 # Variáveis de exemplo
├── package.json                 # Dependências
└── README.md                    # Este arquivo
```

## Como Funciona

1. **Inicialização**: O bot valida as variáveis de ambiente e envia uma mensagem de teste
2. **Agendamento**: Usa `node-cron` para agendar o envio diário
3. **Web Scraping**: Conecta-se a múltiplas fontes para recolher previsões
4. **Consolidação**: Agrupa previsões por jogo
5. **Formatação**: Formata as previsões em mensagens legíveis
6. **Envio**: Envia as previsões via Telegram

## Personalização

### Alterar Horário de Envio

Edita a variável `SEND_TIME` no arquivo `.env`:

```env
SEND_TIME=09:00  # 9 da manhã
```

### Alterar Timezone

Edita a variável `TIMEZONE` no arquivo `.env`:

```env
TIMEZONE=Europe/London    # Londres
TIMEZONE=America/New_York # Nova Iorque
```

### Adicionar Novas Fontes

Adiciona novos métodos em `src/services/scraper.js`:

```javascript
async getNewSource() {
  // Implementar web scraping
  return predictions;
}
```

## Troubleshooting

### "Variáveis de ambiente não definidas"

Certifica-te de que o arquivo `.env` existe e contém todas as variáveis obrigatórias.

### "Erro ao enviar mensagem"

Verifica se:
- O `TELEGRAM_BOT_TOKEN` está correto
- O `TELEGRAM_CHAT_ID` está correto
- O bot tem permissão para enviar mensagens

### "Sem previsões disponíveis"

Isto pode acontecer se:
- Os sites estão offline ou bloqueando requests
- Não há jogos agendados para hoje
- Há problemas de conectividade

## Deploy

### Heroku

1. Cria uma conta em https://www.heroku.com/
2. Instala o Heroku CLI
3. Executa:

```bash
heroku login
heroku create seu-app-name
heroku config:set TELEGRAM_BOT_TOKEN=seu_token
heroku config:set TELEGRAM_CHAT_ID=seu_chat_id
git push heroku main
```

### Railway

1. Cria uma conta em https://railway.app/
2. Conecta o teu repositório
3. Define as variáveis de ambiente no dashboard
4. Deploy automático

### VPS (Linux)

1. SSH para o servidor
2. Clona o repositório
3. Instala Node.js
4. Configura `.env`
5. Usa `pm2` para manter o bot a correr:

```bash
npm install -g pm2
pm2 start src/index.js --name "football-bot"
pm2 startup
pm2 save
```

## Limitações

- O web scraping pode ser mais lento que APIs diretas
- Alguns sites podem bloquear requests automatizados
- As previsões dependem da disponibilidade dos sites

## Melhorias Futuras

- [ ] Cache de previsões para melhor performance
- [ ] Filtros por liga específica
- [ ] Notificações de resultados após os jogos
- [ ] Interface web para configuração
- [ ] Suporte para múltiplos utilizadores

## Licença

MIT

## Suporte

Para problemas ou sugestões, cria uma issue no repositório.

## Aviso Legal

Este bot é apenas para fins informativos. As previsões não garantem ganhos. Joga com responsabilidade!
