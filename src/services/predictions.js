import axios from 'axios';

/**
 * Serviço para recolher previsões de futebol de múltiplas fontes
 */
class PredictionsService {
  constructor() {
    this.footballApiKey = process.env.FOOTBALL_API_KEY;
    this.footballApiHost = process.env.FOOTBALL_API_HOST || 'api-football-v1.p.rapidapi.com';
    this.baseUrl = 'https://api-football-v1.p.rapidapi.com';
  }

  /**
   * Obter jogos de hoje com previsões
   */
  async getTodayMatches() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const options = {
        method: 'GET',
        url: `${this.baseUrl}/fixtures`,
        params: {
          date: today,
          status: 'NS' // NS = Not Started
        },
        headers: {
          'x-rapidapi-key': this.footballApiKey,
          'x-rapidapi-host': this.footballApiHost
        }
      };

      const response = await axios.request(options);
      return response.data.response || [];
    } catch (error) {
      console.error('Erro ao obter jogos de hoje:', error.message);
      return [];
    }
  }

  /**
   * Obter previsões para um jogo específico
   */
  async getMatchPredictions(fixtureId) {
    try {
      const options = {
        method: 'GET',
        url: `${this.baseUrl}/predictions`,
        params: {
          fixture: fixtureId
        },
        headers: {
          'x-rapidapi-key': this.footballApiKey,
          'x-rapidapi-host': this.footballApiHost
        }
      };

      const response = await axios.request(options);
      return response.data.response?.[0] || null;
    } catch (error) {
      console.error(`Erro ao obter previsões para fixture ${fixtureId}:`, error.message);
      return null;
    }
  }

  /**
   * Obter estatísticas de um jogo
   */
  async getMatchStatistics(fixtureId) {
    try {
      const options = {
        method: 'GET',
        url: `${this.baseUrl}/fixtures/statistics`,
        params: {
          fixture: fixtureId
        },
        headers: {
          'x-rapidapi-key': this.footballApiKey,
          'x-rapidapi-host': this.footballApiHost
        }
      };

      const response = await axios.request(options);
      return response.data.response || [];
    } catch (error) {
      console.error(`Erro ao obter estatísticas para fixture ${fixtureId}:`, error.message);
      return [];
    }
  }

  /**
   * Formatar previsão para mensagem do Telegram
   */
  formatPredictionMessage(fixture, prediction) {
    const homeTeam = fixture.teams.home.name;
    const awayTeam = fixture.teams.away.name;
    const league = fixture.league.name;
    const time = fixture.fixture.date.split('T')[1].substring(0, 5);
    
    let message = `⚽ <b>${homeTeam} vs ${awayTeam}</b>\n`;
    message += `🏆 ${league}\n`;
    message += `🕐 ${time}\n\n`;

    if (prediction) {
      // Previsão de resultado
      if (prediction.predictions?.winner) {
        message += `🎯 <b>Previsão Principal:</b> ${prediction.predictions.winner}\n`;
      }

      // Probabilidades
      if (prediction.predictions?.win_home) {
        message += `\n📊 <b>Probabilidades:</b>\n`;
        message += `🏠 Casa: ${(prediction.predictions.win_home * 100).toFixed(1)}%\n`;
        message += `🤝 Empate: ${(prediction.predictions.win_draw * 100).toFixed(1)}%\n`;
        message += `✈️ Fora: ${(prediction.predictions.win_away * 100).toFixed(1)}%\n`;
      }

      // Over/Under
      if (prediction.predictions?.goals?.over) {
        message += `\n⚽ <b>Golos:</b>\n`;
        message += `Over 2.5: ${(prediction.predictions.goals.over * 100).toFixed(1)}%\n`;
        message += `Under 2.5: ${(prediction.predictions.goals.under * 100).toFixed(1)}%\n`;
      }

      // Ambas marcam
      if (prediction.predictions?.goals?.both_teams) {
        message += `\n🎯 <b>Ambas Marcam:</b>\n`;
        message += `Sim: ${(prediction.predictions.goals.both_teams * 100).toFixed(1)}%\n`;
      }

      // Confiança
      if (prediction.predictions?.percent) {
        message += `\n💪 <b>Confiança:</b> ${prediction.predictions.percent}\n`;
      }
    }

    message += `\n${'─'.repeat(40)}\n`;
    return message;
  }

  /**
   * Obter todas as previsões para hoje
   */
  async getAllTodayPredictions() {
    try {
      const matches = await this.getTodayMatches();
      
      if (matches.length === 0) {
        return null;
      }

      let fullMessage = `📅 <b>PREVISÕES DE FUTEBOL - ${new Date().toLocaleDateString('pt-PT')}</b>\n\n`;
      fullMessage += `Total de jogos: ${matches.length}\n`;
      fullMessage += `${'═'.repeat(40)}\n\n`;

      let matchCount = 0;
      for (const match of matches) {
        try {
          const prediction = await this.getMatchPredictions(match.fixture.id);
          
          if (prediction) {
            fullMessage += this.formatPredictionMessage(match, prediction);
            matchCount++;
          }
        } catch (error) {
          console.error(`Erro ao processar jogo ${match.fixture.id}:`, error.message);
        }

        // Pequeno delay para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (matchCount === 0) {
        return null;
      }

      fullMessage += `\n✅ <b>Total de previsões:</b> ${matchCount}\n`;
      fullMessage += `\n💡 <i>Estas previsões são baseadas em análise estatística.</i>\n`;
      fullMessage += `<i>Joga com responsabilidade!</i>`;

      return fullMessage;
    } catch (error) {
      console.error('Erro ao obter previsões:', error.message);
      return null;
    }
  }
}

export default new PredictionsService();
