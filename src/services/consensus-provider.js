import axios from 'axios';

/**
 * Serviço de Previsões com Consenso de 3 Fontes
 * API-Football + ESPN + FlashScore
 */
class ConsensusProvider {
  constructor() {
    this.apiFootballKey = process.env.FOOTBALL_API_KEY || '00c5d48862ad98ab709caa3163b56867';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'x-rapidapi-key': this.apiFootballKey,
      'x-rapidapi-host': 'api-football-v3.p.rapidapi.com'
    };
  }

  /**
   * Obter TODOS os jogos (até 100) com consenso de 3 fontes
   */
  async getAllGamesWithConsensus() {
    try {
      console.log('\n🔄 Recolhendo previsões de 3 fontes em simultâneo...\n');

      // Recolher de 3 fontes em paralelo
      const [apiFootballGames, espnGames, flashscoreGames] = await Promise.all([
        this.getApiFootballGames(),
        this.getEspnGames(),
        this.getFlashscoreGames()
      ]);

      console.log(`\n📊 Dados recolhidos:`);
      console.log(`   API-Football: ${apiFootballGames.length} jogos`);
      console.log(`   ESPN: ${espnGames.length} jogos`);
      console.log(`   FlashScore: ${flashscoreGames.length} jogos\n`);

      // Consolidar e calcular consenso
      const consolidated = this.consolidateWithConsensus(apiFootballGames, espnGames, flashscoreGames);
      
      // Limitar a 100 jogos
      const limited = consolidated.slice(0, 100);
      
      console.log(`✅ Total de jogos consolidados: ${limited.length}\n`);
      
      return limited;
    } catch (error) {
      console.error('❌ Erro ao recolher previsões:', error.message);
      return [];
    }
  }

  /**
   * Recolher jogos de API-Football
   */
  async getApiFootballGames() {
    try {
      console.log('📊 Recolhendo jogos de API-Football...');
      
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];

      const response = await axios.get('https://api-football-v3.p.rapidapi.com/fixtures', {
        headers: this.headers,
        params: {
          date: dateStr,
          league: '-1', // Todas as ligas
          season: today.getFullYear()
        },
        timeout: 15000
      });

      const games = (response.data?.response || []).map(fixture => ({
        homeTeam: fixture.teams.home.name,
        awayTeam: fixture.teams.away.name,
        league: fixture.league.name,
        date: fixture.fixture.date,
        time: fixture.fixture.date.split('T')[1]?.substring(0, 5),
        fixtureId: fixture.fixture.id,
        source: 'API-Football',
        predictions: this.parseApiFootballPredictions(fixture),
        markets: ['1X2', 'GG', 'O/U', 'DC', 'HT/FT']
      }));

      console.log(`✅ API-Football: ${games.length} jogos`);
      return games;
    } catch (error) {
      console.error('❌ Erro ao recolher API-Football:', error.message);
      return [];
    }
  }

  /**
   * Parser de previsões da API-Football
   */
  parseApiFootballPredictions(fixture) {
    const predictions = fixture.predictions || {};
    
    return {
      win_home: predictions.win_home || 0,
      win_draw: predictions.win_draw || 0,
      win_away: predictions.win_away || 0,
      goals_more_than_2_5: predictions.goals_more_than_2_5 || 0,
      goals_less_than_2_5: predictions.goals_less_than_2_5 || 0,
      both_teams_scored: predictions.both_teams_scored || 0,
      advice: predictions.advice || 'Sem recomendação',
      percent: predictions.percent || {}
    };
  }

  /**
   * Recolher jogos de ESPN
   */
  async getEspnGames() {
    try {
      console.log('📊 Recolhendo jogos de ESPN...');
      
      const response = await axios.get('https://www.espn.com/soccer/schedule', {
        headers: { 'User-Agent': this.headers['User-Agent'] },
        timeout: 10000
      });

      const games = this.parseEspnHtml(response.data);
      console.log(`✅ ESPN: ${games.length} jogos`);
      return games;
    } catch (error) {
      console.error('❌ Erro ao recolher ESPN:', error.message);
      return [];
    }
  }

  /**
   * Parser de HTML ESPN
   */
  parseEspnHtml(html) {
    const games = [];
    
    try {
      // Padrão simplificado para encontrar jogos
      const gamePattern = /<tr[^>]*>[\s\S]*?<\/tr>/g;
      const matches = html.match(gamePattern) || [];

      matches.forEach(match => {
        try {
          const timeMatch = match.match(/(\d{1,2}:\d{2}[AP]M)/);
          const teamsMatch = match.match(/<a[^>]*href="[^"]*">([^<]+)<\/a>[\s\S]*?<a[^>]*href="[^"]*">([^<]+)<\/a>/);
          
          if (timeMatch && teamsMatch) {
            games.push({
              homeTeam: teamsMatch[1].trim(),
              awayTeam: teamsMatch[2].trim(),
              time: timeMatch[1],
              league: 'Soccer',
              source: 'ESPN',
              predictions: { advice: 'Sem recomendação' },
              markets: ['1X2', 'GG', 'O/U']
            });
          }
        } catch (e) {
          // Ignorar erros de parsing
        }
      });
    } catch (error) {
      console.error('Erro ao fazer parse ESPN:', error.message);
    }

    return games;
  }

  /**
   * Recolher jogos de FlashScore
   */
  async getFlashscoreGames() {
    try {
      console.log('📊 Recolhendo jogos de FlashScore...');
      
      const response = await axios.get('https://www.flashscore.com/soccer/', {
        headers: { 'User-Agent': this.headers['User-Agent'] },
        timeout: 10000
      });

      const games = this.parseFlashscoreHtml(response.data);
      console.log(`✅ FlashScore: ${games.length} jogos`);
      return games;
    } catch (error) {
      console.error('❌ Erro ao recolher FlashScore:', error.message);
      return [];
    }
  }

  /**
   * Parser de HTML FlashScore
   */
  parseFlashscoreHtml(html) {
    const games = [];
    
    try {
      // Padrão simplificado para encontrar jogos
      const gamePattern = /<div[^>]*class="[^"]*event[^"]*"[^>]*>[\s\S]*?<\/div>/g;
      const matches = html.match(gamePattern) || [];

      matches.slice(0, 50).forEach(match => {
        try {
          const teamsMatch = match.match(/<span[^>]*>([^<]+)<\/span>[\s\S]*?<span[^>]*>([^<]+)<\/span>/);
          const timeMatch = match.match(/(\d{1,2}:\d{2})/);
          
          if (teamsMatch && timeMatch) {
            games.push({
              homeTeam: teamsMatch[1].trim(),
              awayTeam: teamsMatch[2].trim(),
              time: timeMatch[1],
              league: 'Football',
              source: 'FlashScore',
              predictions: { advice: 'Sem recomendação' },
              markets: ['1X2', 'GG', 'O/U']
            });
          }
        } catch (e) {
          // Ignorar erros de parsing
        }
      });
    } catch (error) {
      console.error('Erro ao fazer parse FlashScore:', error.message);
    }

    return games;
  }

  /**
   * Consolidar e calcular consenso entre 3 fontes
   */
  consolidateWithConsensus(apiFootballGames, espnGames, flashscoreGames) {
    const matchMap = new Map();

    // Adicionar jogos de API-Football (fonte principal)
    apiFootballGames.forEach(game => {
      const key = this.generateMatchKey(game.homeTeam, game.awayTeam);
      matchMap.set(key, {
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        league: game.league,
        date: game.date,
        time: game.time,
        sources: {
          'API-Football': {
            found: true,
            predictions: game.predictions,
            markets: game.markets
          },
          'ESPN': { found: false },
          'FlashScore': { found: false }
        },
        consensus: this.calculateConsensus(game.predictions)
      });
    });

    // Adicionar/validar com ESPN
    espnGames.forEach(game => {
      const key = this.generateMatchKey(game.homeTeam, game.awayTeam);
      if (matchMap.has(key)) {
        const existing = matchMap.get(key);
        existing.sources.ESPN = { found: true, markets: game.markets };
      } else {
        matchMap.set(key, {
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          league: game.league,
          time: game.time,
          sources: {
            'API-Football': { found: false },
            'ESPN': { found: true, markets: game.markets },
            'FlashScore': { found: false }
          },
          consensus: { prediction: 'Sem consenso', confidence: 0 }
        });
      }
    });

    // Adicionar/validar com FlashScore
    flashscoreGames.forEach(game => {
      const key = this.generateMatchKey(game.homeTeam, game.awayTeam);
      if (matchMap.has(key)) {
        const existing = matchMap.get(key);
        existing.sources.FlashScore = { found: true, markets: game.markets };
      } else {
        matchMap.set(key, {
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          league: game.league,
          time: game.time,
          sources: {
            'API-Football': { found: false },
            'ESPN': { found: false },
            'FlashScore': { found: true, markets: game.markets }
          },
          consensus: { prediction: 'Sem consenso', confidence: 0 }
        });
      }
    });

    // Ordenar por consenso (confiança)
    return Array.from(matchMap.values()).sort((a, b) => {
      return (b.consensus?.confidence || 0) - (a.consensus?.confidence || 0);
    });
  }

  /**
   * Gerar chave única para jogo
   */
  generateMatchKey(homeTeam, awayTeam) {
    return `${homeTeam.toLowerCase().trim()}_${awayTeam.toLowerCase().trim()}`;
  }

  /**
   * Calcular consenso baseado em previsões
   */
  calculateConsensus(predictions) {
    if (!predictions || !predictions.percent) {
      return { prediction: 'Sem dados', confidence: 0 };
    }

    const percent = predictions.percent;
    const homeWin = percent.home || 0;
    const draw = percent.draw || 0;
    const awayWin = percent.away || 0;

    // Determinar melhor previsão
    let prediction = 'Empate';
    let confidence = draw;

    if (homeWin > draw && homeWin > awayWin) {
      prediction = 'Vitória em Casa';
      confidence = homeWin;
    } else if (awayWin > draw && awayWin > homeWin) {
      prediction = 'Vitória Fora';
      confidence = awayWin;
    }

    return {
      prediction: prediction,
      confidence: Math.round(confidence),
      homeWin: Math.round(homeWin),
      draw: Math.round(draw),
      awayWin: Math.round(awayWin),
      advice: predictions.advice || 'Sem recomendação'
    };
  }

  /**
   * Formatar mensagem com consenso
   */
  formatConsensusMessage(games) {
    if (!games || games.length === 0) {
      return `📅 <b>PREVISÕES COM CONSENSO - ${new Date().toLocaleDateString('pt-PT')}</b>\n\n⚠️ Sem jogos disponíveis para hoje.`;
    }

    let message = `📅 <b>PREVISÕES COM CONSENSO - ${new Date().toLocaleDateString('pt-PT')}</b>\n`;
    message += `📊 Análise de 3 Fontes (API-Football, ESPN, FlashScore)\n`;
    message += `🎯 ${games.length} Jogos Analisados\n`;
    message += `💡 Consenso = Acordo entre múltiplas fontes\n\n`;

    games.slice(0, 50).forEach((game, index) => {
      const sourcesCount = Object.values(game.sources).filter(s => s.found).length;
      const consensusLevel = sourcesCount === 3 ? '🟢 ALTO' : sourcesCount === 2 ? '🟡 MÉDIO' : '🔴 BAIXO';

      message += `⚽ <b>${index + 1}. ${game.homeTeam} vs ${game.awayTeam}</b>\n`;
      message += `🏆 ${game.league}\n`;
      message += `⏰ ${game.time || 'TBD'}\n`;
      message += `🎯 Previsão: <b>${game.consensus.prediction}</b>\n`;
      message += `📈 Confiança: <b>${game.consensus.confidence}%</b>\n`;
      message += `🤝 Consenso: ${consensusLevel} (${sourcesCount}/3 fontes)\n`;
      message += `💡 Recomendação: ${game.consensus.advice}\n\n`;
    });

    message += `\n📊 <b>Total de Jogos:</b> ${games.length}\n`;
    message += `📍 <b>Fontes:</b> API-Football, ESPN, FlashScore\n`;
    message += `💡 <i>Consenso = Maior confiabilidade nas previsões</i>`;

    return message;
  }
}

export default new ConsensusProvider();
