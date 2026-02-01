import 'dotenv/config';
import cron from 'node-cron';
import telegramService from './services/telegram.js';
import advancedScraperService from './services/advanced-scraper.js';

/**
 * Bot de Telegram para enviar previsões de futebol diárias consolidadas
 */

// Validar variáveis de ambiente
function validateEnvironment() {
  const required = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Variáveis de ambiente obrigatórias não definidas:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nCria um arquivo .env baseado em .env.example');
    process.exit(1);
  }

  console.log('✅ Variáveis de ambiente validadas');
}

/**
 * Executar envio de previsões consolidadas
 */
async function sendDailyPredictions() {
  console.log(`\n📅 Executando envio de previsões consolidadas às ${new Date().toLocaleTimeString('pt-PT')}`);

  try {
    // Obter previsões consolidadas de múltiplas fontes
    console.log('🔄 Recolhendo e consolidando previsões...');
    const consolidatedMatches = await advancedScraperService.getAllPredictions();

    if (!consolidatedMatches || consolidatedMatches.length === 0) {
      console.log('⚠️ Sem previsões disponíveis para hoje');
      await telegramService.sendMessage(
        `📅 <b>Previsões Consolidadas - ${new Date().toLocaleDateString('pt-PT')}</b>\n\n` +
        `⚠️ Sem previsões disponíveis para hoje.\n\n` +
        `Volte amanhã para novas previsões!`
      );
      return;
    }

    // Formatar e enviar previsões
    console.log('📤 Formatando e enviando previsões consolidadas...');
    const message = advancedScraperService.formatConsolidatedMessage(consolidatedMatches);
    
    if (message) {
      await telegramService.sendLongMessage(message);
      console.log('✅ Previsões consolidadas enviadas com sucesso!');
    } else {
      console.log('⚠️ Nenhuma previsão para enviar');
    }
  } catch (error) {
    console.error('❌ Erro ao enviar previsões:', error.message);
    try {
      await telegramService.sendErrorMessage(error);
    } catch (telegramError) {
      console.error('Erro ao enviar mensagem de erro:', telegramError.message);
    }
  }
}

/**
 * Inicializar bot
 */
async function initialize() {
  console.log('🚀 Iniciando Bot de Previsões Consolidadas de Futebol...\n');

  // Validar ambiente
  validateEnvironment();

  // Obter informações do bot
  await telegramService.getMe();

  // Enviar mensagem de teste
  try {
    await telegramService.sendTestMessage();
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem de teste:', error.message);
    console.error('Verifica se o TELEGRAM_CHAT_ID está correto');
    process.exit(1);
  }

  // Agendar envio diário
  const sendTime = process.env.SEND_TIME || '07:00';
  const timezone = process.env.TIMEZONE || 'Europe/Lisbon';
  const [hours, minutes] = sendTime.split(':');

  console.log(`\n⏰ Agendando envio diário às ${sendTime} (${timezone})`);

  // Expressão cron: minuto hora * * * (todos os dias)
  const cronExpression = `${minutes} ${hours} * * *`;
  console.log(`📋 Expressão cron: ${cronExpression}`);

  cron.schedule(cronExpression, sendDailyPredictions, {
    timezone: timezone
  });

  console.log('✅ Bot iniciado com sucesso!');
  console.log('📌 O bot está a aguardar a próxima execução...\n');

  // Opcional: enviar previsões imediatamente para teste (descomenta se quiseres)
  // await sendDailyPredictions();
}

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejection não tratada:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Exceção não capturada:', error);
  process.exit(1);
});

// Iniciar
initialize().catch(error => {
  console.error('❌ Erro ao inicializar bot:', error);
  process.exit(1);
});
