import axios from 'axios';
import telegramService from './telegram.js';

/**
 * Serviço de Monitoramento em Tempo Real
 * Monitora mudanças significativas nas odds e envia notificações
 */
class RealtimeMonitorService {
  constructor() {
    this.previousOdds = new Map();
    this.monitoringActive = false;
    this.oddChangeThreshold = 0.15; // 15% de mudança
  }

  /**
   * Iniciar monitoramento em tempo real
   */
  startMonitoring() {
    if (this.monitoringActive) {
      console.log('⚠️ Monitoramento já está ativo');
      return;
    }

    this.monitoringActive = true;
    console.log('🔍 Iniciando monitoramento em tempo real...');

    // Monitorar a cada 30 minutos
    setInterval(() => this.checkForSignificantChanges(), 30 * 60 * 1000);
  }

  /**
   * Parar monitoramento
   */
  stopMonitoring() {
    this.monitoringActive = false;
    console.log('🛑 Monitoramento parado');
  }

  /**
   * Verificar mudanças significativas nas odds
   */
  async checkForSignificantChanges() {
    try {
      console.log('🔍 Verificando mudanças nas odds...');

      // Aqui seria feita a recolha de odds em tempo real
      // Por enquanto, é um placeholder
      const currentOdds = await this.fetchCurrentOdds();

      if (!currentOdds || currentOdds.length === 0) {
        return;
      }

      for (const odd of currentOdds) {
        const key = `${odd.homeTeam}|${odd.awayTeam}|${odd.type}`;
        const previousOdd = this.previousOdds.get(key);

        if (previousOdd) {
          const changePercentage = Math.abs((odd.value - previousOdd) / previousOdd);

          if (changePercentage > this.oddChangeThreshold) {
            await this.sendOddChangeNotification(odd, previousOdd, changePercentage);
          }
        }

        this.previousOdds.set(key, odd.value);
      }
    } catch (error) {
      console.error('❌ Erro ao verificar mudanças:', error.message);
    }
  }

  /**
   * Recolher odds atuais (placeholder)
   */
  async fetchCurrentOdds() {
    try {
      // Isto seria integrado com APIs de odds em tempo real
      // Por enquanto, retorna um array vazio
      return [];
    } catch (error) {
      console.error('Erro ao recolher odds:', error.message);
      return [];
    }
  }

  /**
   * Enviar notificação de mudança de odds
   */
  async sendOddChangeNotification(odd, previousOdd, changePercentage) {
    const direction = odd.value > previousOdd ? '📈 SUBIU' : '📉 DESCEU';
    const changePercent = Math.round(changePercentage * 100);

    const message = `⚡ <b>ALERTA DE MUDANÇA DE ODDS</b>\n\n` +
      `🎯 ${odd.homeTeam} vs ${odd.awayTeam}\n` +
      `📊 Tipo: ${odd.type}\n` +
      `${direction} ${changePercent}%\n` +
      `📍 De: ${previousOdd.toFixed(2)} → Para: ${odd.value.toFixed(2)}\n\n` +
      `⏰ ${new Date().toLocaleTimeString('pt-PT')}`;

    try {
      await telegramService.sendMessage(message);
    } catch (error) {
      console.error('Erro ao enviar notificação:', error.message);
    }
  }

  /**
   * Enviar notificação de jogo próximo
   */
  async sendMatchNotification(match, minutesUntilStart = 60) {
    const message = `⏰ <b>JOGO COMEÇANDO EM ${minutesUntilStart} MINUTOS</b>\n\n` +
      `⚽ ${match.homeTeam} vs ${match.awayTeam}\n` +
      `🏆 ${match.league}\n` +
      `🕐 ${match.startTime}\n\n` +
      `🎯 Previsão: ${match.prediction}\n` +
      `📈 Confiança: ${match.confidence}%\n` +
      `🤝 Acordo: ${match.agreement}%`;

    try {
      await telegramService.sendMessage(message);
    } catch (error) {
      console.error('Erro ao enviar notificação de jogo:', error.message);
    }
  }

  /**
   * Enviar notificação de resultado
   */
  async sendResultNotification(match, result, prediction) {
    const isCorrect = result === prediction;
    const emoji = isCorrect ? '✅' : '❌';

    const message = `${emoji} <b>RESULTADO FINAL</b>\n\n` +
      `⚽ ${match.homeTeam} vs ${match.awayTeam}\n` +
      `📊 Resultado: ${result}\n` +
      `🎯 Previsão: ${prediction}\n` +
      `${isCorrect ? '✅ PREVISÃO CORRETA!' : '❌ Previsão incorreta'}`;

    try {
      await telegramService.sendMessage(message);
    } catch (error) {
      console.error('Erro ao enviar notificação de resultado:', error.message);
    }
  }
}

export default new RealtimeMonitorService();
