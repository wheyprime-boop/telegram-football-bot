import 'dotenv/config';
import cron from 'node-cron';
import telegramService from './services/telegram.js';
import consensusProvider from './services/consensus-provider.js';
import statisticsService from './services/statistics.js';
import realtimeMonitorService from './services/realtime-monitor.js';

/**
 * Bot de Telegram para enviar previsões de futebol diárias consolidadas
 * Com consenso de 3 fontes (API-Football, ESPN, FlashScore)
 * Até 100 jogos por dia
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
 * Executar envio de previsões consolidadas com consenso
 */
async function sendDailyPredictions(timeOfDay = 'morning') {
  const timeLabels = {
    'morning': '7h da manhã',
    'afternoon': '12h do meio-dia',
    'evening': '17h da tarde'
  };

  console.log(`\n📅 Executando envio de previsões (${timeLabels[timeOfDay]}) às ${new Date().toLocaleTimeString('pt-PT')}`);

  try {
    // Obter previsões com consenso de 3 fontes
    console.log('🔄 Recolhendo previsões com consenso de 3 fontes...');
    const predictions = await consensusProvider.getAllGamesWithConsensus();

    if (!predictions || predictions.length === 0) {
      console.log('⚠️ Sem previsões disponíveis para hoje');
      await telegramService.sendMessage(
        `📅 <b>Previsões com Consenso - ${new Date().toLocaleDateString('pt-PT')} (${timeLabels[timeOfDay]})</b>\n\n` +
        `⚠️ Sem previsões reais disponíveis para hoje.\n\n` +
        `Volte mais tarde para novas previsões!`
      );
      return;
    }

    // Formatar mensagem com consenso
    const message = consensusProvider.formatConsensusMessage(predictions);

    if (message) {
      console.log('📤 Enviando previsões com consenso...');
      await telegramService.sendLongMessage(message);
      console.log('✅ Previsões enviadas com sucesso!');

      // Registar previsões
      for (const match of predictions.slice(0, 5)) {
        statisticsService.recordPrediction({
          match: `${match.homeTeam} vs ${match.awayTeam}`,
          prediction: match.consensus.prediction,
          confidence: match.consensus.confidence,
          sources: Object.values(match.sources).filter(s => s.found).length
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
  console.log('🚀 Iniciando Bot de Previsões com Consenso de 3 Fontes...\n');

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
  console.log('   📊 Fontes: API-Football, ESPN, FlashScore');
  console.log('   🎯 Até 100 jogos por dia');
  console.log('   🤝 Consenso = Acordo entre múltiplas fontes\n');

  // 7 da manhã - Previsões com Consenso (PRINCIPAL)
  cron.schedule('00 07 * * *', () => sendDailyPredictions('morning'), {
    timezone: timezone
  });
  console.log('   ✅ 07:00 - Previsões com Consenso (até 100 jogos)');

  // 12 do meio-dia - Previsões com Consenso
  cron.schedule('00 12 * * *', () => sendDailyPredictions('afternoon'), {
    timezone: timezone
  });
  console.log('   ✅ 12:00 - Previsões com Consenso');

  // 17 da tarde - Previsões com Consenso
  cron.schedule('00 17 * * *', () => sendDailyPredictions('evening'), {
    timezone: timezone
  });
  console.log('   ✅ 17:00 - Previsões com Consenso');

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
