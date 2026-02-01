import fs from 'fs';
import path from 'path';

/**
 * Serviço de Estatísticas e Histórico de Previsões
 */
class StatisticsService {
  constructor() {
    this.dataDir = './data';
    this.statsFile = path.join(this.dataDir, 'statistics.json');
    this.predictionsFile = path.join(this.dataDir, 'predictions-history.json');
    this.ensureDataDirectory();
  }

  /**
   * Garantir que o diretório de dados existe
   */
  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Carregar estatísticas
   */
  loadStatistics() {
    try {
      if (fs.existsSync(this.statsFile)) {
        const data = fs.readFileSync(this.statsFile, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error.message);
    }

    return this.getDefaultStatistics();
  }

  /**
   * Obter estrutura padrão de estatísticas
   */
  getDefaultStatistics() {
    return {
      sources: {
        'Forebet': { correct: 0, total: 0, accuracy: 0 },
        'Betbrain': { correct: 0, total: 0, accuracy: 0 },
        'eScored': { correct: 0, total: 0, accuracy: 0 }
      },
      monthly: {
        bestPrediction: null,
        worstPrediction: null,
        totalPredictions: 0,
        correctPredictions: 0,
        accuracy: 0
      },
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Guardar estatísticas
   */
  saveStatistics(stats) {
    try {
      fs.writeFileSync(this.statsFile, JSON.stringify(stats, null, 2));
    } catch (error) {
      console.error('Erro ao guardar estatísticas:', error.message);
    }
  }

  /**
   * Registar previsão
   */
  recordPrediction(prediction) {
    try {
      const history = this.loadPredictionHistory();
      history.push({
        ...prediction,
        timestamp: new Date().toISOString()
      });

      fs.writeFileSync(this.predictionsFile, JSON.stringify(history, null, 2));
    } catch (error) {
      console.error('Erro ao registar previsão:', error.message);
    }
  }

  /**
   * Carregar histórico de previsões
   */
  loadPredictionHistory() {
    try {
      if (fs.existsSync(this.predictionsFile)) {
        const data = fs.readFileSync(this.predictionsFile, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error.message);
    }

    return [];
  }

  /**
   * Atualizar taxa de acerto de uma fonte
   */
  updateSourceAccuracy(source, isCorrect) {
    const stats = this.loadStatistics();

    if (stats.sources[source]) {
      stats.sources[source].total++;
      if (isCorrect) {
        stats.sources[source].correct++;
      }
      stats.sources[source].accuracy = Math.round(
        (stats.sources[source].correct / stats.sources[source].total) * 100
      );
    }

    stats.lastUpdated = new Date().toISOString();
    this.saveStatistics(stats);
  }

  /**
   * Obter melhor previsão do mês
   */
  getBestPredictionOfMonth() {
    const stats = this.loadStatistics();
    return stats.monthly.bestPrediction;
  }

  /**
   * Obter pior previsão do mês
   */
  getWorstPredictionOfMonth() {
    const stats = this.loadStatistics();
    return stats.monthly.worstPrediction;
  }

  /**
   * Gerar relatório de estatísticas
   */
  generateStatisticsReport() {
    const stats = this.loadStatistics();
    const history = this.loadPredictionHistory();

    // Calcular estatísticas do mês
    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthlyPredictions = history.filter(p =>
      p.timestamp.substring(0, 7) === currentMonth
    );

    let report = `📊 <b>ESTATÍSTICAS DE PREVISÕES</b>\n\n`;

    // Taxa de acerto por fonte
    report += `<b>Taxa de Acerto por Fonte:</b>\n`;
    for (const [source, data] of Object.entries(stats.sources)) {
      const accuracy = data.total > 0 ? data.accuracy : 0;
      const bar = this.generateAccuracyBar(accuracy);
      report += `   ${source}: ${bar} ${accuracy}% (${data.correct}/${data.total})\n`;
    }

    // Estatísticas do mês
    report += `\n<b>Estatísticas do Mês (${currentMonth}):</b>\n`;
    report += `   Total de Previsões: ${monthlyPredictions.length}\n`;

    if (monthlyPredictions.length > 0) {
      const correctCount = monthlyPredictions.filter(p => p.result === 'correct').length;
      const monthlyAccuracy = Math.round((correctCount / monthlyPredictions.length) * 100);
      report += `   Previsões Corretas: ${correctCount}\n`;
      report += `   Taxa de Acerto: ${monthlyAccuracy}%\n`;
    }

    // Melhor e pior previsão
    if (stats.monthly.bestPrediction) {
      report += `\n<b>Melhor Previsão do Mês:</b>\n`;
      report += `   ${stats.monthly.bestPrediction.match}\n`;
      report += `   Confiança: ${stats.monthly.bestPrediction.confidence}%\n`;
    }

    if (stats.monthly.worstPrediction) {
      report += `\n<b>Pior Previsão do Mês:</b>\n`;
      report += `   ${stats.monthly.worstPrediction.match}\n`;
      report += `   Confiança: ${stats.monthly.worstPrediction.confidence}%\n`;
    }

    return report;
  }

  /**
   * Gerar barra visual de acurácia
   */
  generateAccuracyBar(accuracy) {
    const filled = Math.round(accuracy / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }
}

export default new StatisticsService();
