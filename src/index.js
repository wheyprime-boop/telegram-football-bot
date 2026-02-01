import 'dotenv/config';
import cron from 'node-cron';
import telegramService from './services/telegram.js';
import rssPredictionsProvider from './services/rss-predictions-provider.js';
import statisticsService from './services/statistics.js';
import realtimeMonitorService from './services/realtime-monitor.js';

/**
 * Bot de Telegram para enviar previsões de futebol diárias consolidadas
 * Com múltiplos horários, filtros de qualidade e estatísticas
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
async function sendDailyPredictions(timeOfDay = 'morning') {
  const timeLabels = {
    'morning': '7h da manhã',
    'afternoon': '12h do meio-dia',
    'evening': '17h da tarde'
  };

  console.log(`\n📅 Executando envio de previsões (${timeLabels[timeOfDay]}) às ${new Date().toLocaleTimeString('pt-PT')}`);

  try {
    // Obter previsões consolidadas
    console.log('🔄 Recolhendo previsões...');
    const predictions = await rssPredictionsProvider.getAllGamesWithPredictions();

    if (!predictions || predictions.length === 0) {
      console.log('⚠️ Sem previsões disponíveis para hoje');
      await telegramService.sendMessage(
        `📅 <b>Previsões Consolidadas - ${new Date().toLocaleDateString('pt-PT')} (${timeLabels[timeOfDay]})</b>\n\n` +
        `⚠️ Sem previsões reais disponíveis para hoje.\n\n` +
        `Volte mais tarde para novas previsões!`
      );
      return;
    }

    // Formatar mensagem profissional
    const message = rssPredictionsProvider.formatMessage(predictions);

    if (message) {
      console.log('📤 Enviando previsões...');
      await telegramService.sendLongMessage(message);
      console.log('✅ Previsões enviadas com sucesso!');

      // Registar previsões
      for (const match of predictions.slice(0, 5)) {
        statisticsService.recordPrediction({
          match: `${match.homeTeam} vs ${match.awayTeam}`,
          prediction: match.bestPrediction,
          confidence: match.confidence,
          agreement: match.agreementPercentage
        });
      }
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
 * Enviar relatório de estatísticas
 */
async function sendStatisticsReport() {
  console.log('\n📊 Enviando relatório de estatísticas...');

  try {
    const report = statisticsService.generateStatisticsReport();
    await telegramService.sendMessage(report);
    console.log('✅ Relatório enviado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao enviar relatório:', error.message);
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

  // Agendar envios diários em 3 horários
  const timezone = process.env.TIMEZONE || 'Europe/Lisbon';

  console.log(`\n⏰ Agendando envios diários (${timezone}):`);

  // TESTE: 21:00 hoje (previsões de hoje com RSS Feeds)
  const now = new Date();
  const testTime = new Date();
  testTime.setHours(21, 0, 0, 0);
  
  if (now < testTime) {
    const timeUntilTest = testTime - now;
    console.log(`   🧪 TESTE: 21:00 - Previsões Reais com RSS Feeds`);
    setTimeout(async () => {
      console.log('\n🧪 EXECUTANDO TESTE ÀS 21:00...');
      try {
        const predictions = await rssPredictionsProvider.getAllGamesWithPredictions();
        if (!predictions || predictions.length === 0) {
          await telegramService.sendMessage('Sem previsões disponíveis');
        } else {
          const message = rssPredictionsProvider.formatMessage(predictions);
          await telegramService.sendLongMessage(message);
        }
      } catch (error) {
        console.error('Erro:', error.message);
      }
    }, timeUntilTest);
  }

  // 7 da manhã - Previsões Profissionais
  cron.schedule('00 07 * * *', () => sendDailyPredictions('morning'), {
    timezone: timezone
  });
  console.log('   ✅ 07:00 - Previsões Profissionais');

  // 12 do meio-dia - Completo
  cron.schedule('00 12 * * *', () => sendDailyPredictions('afternoon'), {
    timezone: timezone
  });
  console.log('   ✅ 12:00 - Previsões Profissionais');

  // 17 da tarde - Completo
  cron.schedule('00 17 * * *', () => sendDailyPredictions('evening'), {
    timezone: timezone
  });
  console.log('   ✅ 17:00 - Previsões Profissionais');

  // Relatório de estatísticas - Diariamente às 20h
  cron.schedule('00 20 * * *', sendStatisticsReport, {
    timezone: timezone
  });
  console.log('   ✅ 20:00 - Relatório de Estatísticas');

  // Iniciar monitoramento em tempo real
  realtimeMonitorService.startMonitoring();

  console.log('\n✅ Bot iniciado com sucesso!');
  console.log('📌 O bot está a aguardar a próxima execução...\n');
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
