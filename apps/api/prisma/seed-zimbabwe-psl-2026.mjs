import client from '@prisma/client';

const { PrismaClient } = client;
const db = new PrismaClient();

const prefix = 'psl2026';
const date = value => new Date(value);
const slugify = value => value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const venues = [
  ['national-sports-stadium', 'National Sports Stadium', 'Harare'],
  ['rufaro-stadium', 'Rufaro Stadium', 'Harare'],
  ['barbourfields-stadium', 'Barbourfields Stadium', 'Bulawayo'],
  ['luveve-stadium', 'Luveve Stadium', 'Bulawayo'],
  ['baobab-stadium', 'Baobab Stadium', 'Ngezi'],
  ['mandava-stadium', 'Mandava Stadium', 'Zvishavane'],
  ['wadzanai-stadium', 'Wadzanai Stadium', 'Shamva'],
  ['sakubva-stadium', 'Sakubva Stadium', 'Mutare'],
  ['gibbo-stadium', 'Gibbo Stadium', 'Triangle'],
  ['nyamhunga-stadium', 'Nyamhunga Stadium', 'Kariba'],
  ['ascot-stadium', 'Ascot Stadium', 'Gweru'],
  ['ngoni-stadium', 'Ngoni Stadium', 'Norton'],
];

const teams = [
  { name: 'Scottland FC', shortName: 'SCO', city: 'Mabvuku', venue: 'national-sports-stadium', foundedYear: 2023, primaryColor: '#102a43', secondaryColor: '#f5c542', strength: 94 },
  { name: 'Hardrock FC', shortName: 'HAR', city: 'Harare', venue: 'national-sports-stadium', foundedYear: 2019, primaryColor: '#1f2937', secondaryColor: '#f97316', strength: 88 },
  { name: 'Ngezi Platinum', shortName: 'NGE', city: 'Ngezi', venue: 'baobab-stadium', foundedYear: 2001, primaryColor: '#e86732', secondaryColor: '#111827', strength: 84 },
  { name: 'Herentals FC', shortName: 'HER', city: 'Harare', venue: 'national-sports-stadium', foundedYear: 2000, primaryColor: '#2563eb', secondaryColor: '#ffffff', strength: 82 },
  { name: 'Dynamos FC', shortName: 'DYN', city: 'Harare', venue: 'rufaro-stadium', foundedYear: 1963, primaryColor: '#1769aa', secondaryColor: '#ffffff', strength: 81 },
  { name: 'CAPS United', shortName: 'CAP', city: 'Harare', venue: 'rufaro-stadium', foundedYear: 1973, primaryColor: '#16834f', secondaryColor: '#ffffff', strength: 79 },
  { name: 'Highlanders', shortName: 'HIG', city: 'Bulawayo', venue: 'barbourfields-stadium', foundedYear: 1926, primaryColor: '#111827', secondaryColor: '#ffffff', strength: 77 },
  { name: 'Simba Bhora', shortName: 'SIM', city: 'Shamva', venue: 'wadzanai-stadium', foundedYear: 2008, primaryColor: '#d6a719', secondaryColor: '#12261e', strength: 70 },
  { name: 'MWOS FC', shortName: 'MWO', city: 'Norton', venue: 'ngoni-stadium', foundedYear: 2018, primaryColor: '#0f766e', secondaryColor: '#f8fafc', strength: 68 },
  { name: 'FC Platinum', shortName: 'FCP', city: 'Zvishavane', venue: 'mandava-stadium', foundedYear: 1995, primaryColor: '#1f7fc1', secondaryColor: '#ffffff', strength: 67 },
  { name: 'Bulawayo Chiefs', shortName: 'BUC', city: 'Bulawayo', venue: 'luveve-stadium', foundedYear: 2012, primaryColor: '#f59e0b', secondaryColor: '#111827', strength: 61 },
  { name: 'Chicken Inn', shortName: 'CHI', city: 'Bulawayo', venue: 'luveve-stadium', foundedYear: 1997, primaryColor: '#dc2626', secondaryColor: '#facc15', strength: 60 },
  { name: 'Triangle FC', shortName: 'TRI', city: 'Triangle', venue: 'gibbo-stadium', foundedYear: 1972, primaryColor: '#14532d', secondaryColor: '#ffffff', strength: 57 },
  { name: 'Manica Diamonds', shortName: 'MAN', city: 'Mutare', venue: 'sakubva-stadium', foundedYear: 2017, primaryColor: '#60a5fa', secondaryColor: '#111827', strength: 55 },
  { name: 'ZPC Kariba', shortName: 'ZPC', city: 'Kariba', venue: 'nyamhunga-stadium', foundedYear: 2009, primaryColor: '#0ea5e9', secondaryColor: '#ffffff', strength: 54 },
  { name: 'TelOne FC', shortName: 'TEL', city: 'Gweru', venue: 'ascot-stadium', foundedYear: 2012, primaryColor: '#f97316', secondaryColor: '#111827', strength: 52 },
  { name: 'Agama FC', shortName: 'AGA', city: 'Beitbridge', venue: 'gibbo-stadium', foundedYear: 2020, primaryColor: '#7c2d12', secondaryColor: '#fed7aa', strength: 49 },
  { name: 'Hunters FC', shortName: 'HUN', city: 'Harare', venue: 'national-sports-stadium', foundedYear: 2021, primaryColor: '#334155', secondaryColor: '#e2e8f0', strength: 46 },
].map(team => ({ ...team, slug: slugify(team.name) }));

const firstNames = ['Tawanda', 'Blessing', 'Takunda', 'Kuda', 'Tafadzwa', 'Tinotenda', 'Farai', 'Brian', 'Walter', 'Denver', 'Godknows', 'Thando', 'Bhekimpilo', 'Partson', 'Gift', 'Tendai', 'Leeroy', 'Elvis'];
const lastNames = ['Moyo', 'Ndlovu', 'Musona', 'Banda', 'Mvula', 'Murwira', 'Benhura', 'Mukamba', 'Mahachi', 'Jaure', 'Bello', 'Ncube', 'Dube', 'Sibanda', 'Chirinda', 'Madhanhanga', 'Mushure', 'Mapuranga'];
const positions = ['Goalkeeper', 'Defender', 'Midfielder', 'Winger', 'Forward', 'Forward'];

function playerName(teamIndex, playerIndex) {
  return `${firstNames[(teamIndex * 3 + playerIndex) % firstNames.length]} ${lastNames[(teamIndex * 5 + playerIndex * 2) % lastNames.length]}`;
}

function rotateRound(slugs) {
  const list = [...slugs];
  const rounds = [];
  for (let round = 0; round < list.length - 1; round++) {
    const pairs = [];
    for (let i = 0; i < list.length / 2; i++) {
      const a = list[i];
      const b = list[list.length - 1 - i];
      if ((round + i) % 2 === 0) pairs.push([a, b]);
      else pairs.push([b, a]);
    }
    rounds.push(pairs);
    list.splice(1, 0, list.pop());
  }
  return rounds;
}

function score(home, away, round, index) {
  const diff = home.strength - away.strength + 4; // small home edge
  const rhythm = (round * 7 + index * 5 + home.slug.length + away.slug.length) % 11;
  if (diff > 22) return [2 + (rhythm % 3 === 0 ? 1 : 0), rhythm % 5 === 0 ? 1 : 0];
  if (diff > 12) return [2, rhythm % 4 === 0 ? 1 : 0];
  if (diff > 5) return rhythm % 5 === 0 ? [1, 1] : [1 + (rhythm % 3 === 0 ? 1 : 0), 0];
  if (diff > -5) return rhythm % 3 === 0 ? [1, 1] : rhythm % 3 === 1 ? [0, 0] : [1, 0];
  if (diff > -12) return rhythm % 4 === 0 ? [1, 1] : [0, 1 + (rhythm % 5 === 0 ? 1 : 0)];
  return [rhythm % 4 === 0 ? 1 : 0, 2 + (rhythm % 6 === 0 ? 1 : 0)];
}

async function reset() {
  await db.matchFact.deleteMany({ where: { id: { startsWith: prefix } } });
  await db.observation.deleteMany({ where: { id: { startsWith: prefix } } });
  await db.assignment.deleteMany({ where: { id: { startsWith: prefix } } });
  await db.matchParticipant.deleteMany({ where: { matchId: { startsWith: prefix } } });
  await db.transfer.deleteMany({ where: { id: { startsWith: prefix } } });
  await db.transferContribution.deleteMany({ where: { id: { startsWith: prefix } } });
  await db.marketValuation.deleteMany({ where: { id: { startsWith: prefix } } });
  await db.articlePlayer.deleteMany({ where: { articleId: { startsWith: prefix } } });
  await db.article.deleteMany({ where: { id: { startsWith: prefix } } });
  await db.playerAlias.deleteMany({ where: { id: { startsWith: prefix } } });
  await db.playerRegistration.deleteMany({ where: { id: { startsWith: prefix } } });
  await db.match.deleteMany({ where: { id: { startsWith: prefix } } });
  await db.seasonTeam.deleteMany({ where: { seasonId: `${prefix}-season` } });
  await db.player.deleteMany({ where: { id: { startsWith: prefix } } });
  await db.team.deleteMany({ where: { id: { startsWith: prefix } } });
  await db.venue.deleteMany({ where: { id: { startsWith: prefix } } });
  await db.contributorProfile.deleteMany({ where: { userId: { startsWith: prefix } } });
  await db.user.deleteMany({ where: { id: { startsWith: prefix } } });
}

async function main() {
  await reset();

  const competition = await db.competition.upsert({
    where: { name_countryCode: { name: 'Castle Lager Premier Soccer League', countryCode: 'ZW' } },
    update: {},
    create: { id: `${prefix}-competition`, name: 'Castle Lager Premier Soccer League', countryCode: 'ZW' },
  });

  const season = await db.season.upsert({
    where: { competitionId_label: { competitionId: competition.id, label: '2026' } },
    update: { startsAt: date('2026-03-06T00:00:00Z'), endsAt: date('2026-11-23T00:00:00Z') },
    create: { id: `${prefix}-season`, competitionId: competition.id, label: '2026', startsAt: date('2026-03-06T00:00:00Z'), endsAt: date('2026-11-23T00:00:00Z') },
  });

  const venueBySlug = {};
  for (const [slug, name, city] of venues) {
    venueBySlug[slug] = await db.venue.create({ data: { id: `${prefix}-venue-${slug}`, slug, name, city, countryCode: 'ZW' } });
  }

  const teamBySlug = {};
  for (const team of teams) {
    const item = await db.team.create({
      data: {
        id: `${prefix}-team-${team.slug}`,
        slug: team.slug,
        name: team.name,
        shortName: team.shortName,
        city: team.city,
        foundedYear: team.foundedYear,
        primaryColor: team.primaryColor,
        secondaryColor: team.secondaryColor,
        homeVenueId: venueBySlug[team.venue].id,
      },
    });
    teamBySlug[team.slug] = item;
    await db.seasonTeam.create({ data: { seasonId: season.id, teamId: item.id } });
  }

  const playersByTeam = {};
  for (let t = 0; t < teams.length; t++) {
    const team = teams[t];
    playersByTeam[team.slug] = [];
    for (let p = 0; p < positions.length; p++) {
      const legalName = playerName(t, p);
      const slug = `${team.slug}-${slugify(legalName)}`;
      const player = await db.player.create({
        data: {
          id: `${prefix}-player-${slug}`,
          legalName,
          knownAs: p === 4 ? `${legalName.split(' ')[0]} ${team.shortName}` : null,
          slug,
          position: positions[p],
          nationalityCode: 'ZW',
          preferredFoot: p % 3 === 0 ? 'Left' : 'Right',
        },
      });
      playersByTeam[team.slug].push(player);
      await db.playerRegistration.create({
        data: { id: `${prefix}-registration-${slug}`, playerId: player.id, teamId: teamBySlug[team.slug].id, seasonId: season.id, shirtNumber: [1, 4, 8, 11, 9, 10][p], startsAt: season.startsAt },
      });
      await db.playerAlias.create({ data: { id: `${prefix}-alias-${slug}`, playerId: player.id, name: legalName, normalizedName: legalName.toLowerCase(), source: 'demo-seed' } });
    }
  }

  const schedule = rotateRound(teams.map(team => team.slug));
  const rounds = [...schedule, ...schedule.slice(0, 4).map(pairs => pairs.map(([home, away]) => [away, home]))];
  const start = date('2026-03-07T13:00:00Z').getTime();
  let matchCount = 0;
  let factCount = 0;
  for (let round = 0; round < rounds.length; round++) {
    for (let index = 0; index < rounds[round].length; index++) {
      const [homeSlug, awaySlug] = rounds[round][index];
      const home = teams.find(team => team.slug === homeSlug);
      const away = teams.find(team => team.slug === awaySlug);
      const [homeScore, awayScore] = score(home, away, round, index);
      const kickoffAt = new Date(start + round * 7 * 86400000 + (index % 3) * 86400000 + 13 * 3600000);
      const id = `${prefix}-match-r${String(round + 1).padStart(2, '0')}-${homeSlug}-${awaySlug}`;
      const match = await db.match.create({
        data: {
          id,
          seasonId: season.id,
          homeTeamId: teamBySlug[homeSlug].id,
          awayTeamId: teamBySlug[awaySlug].id,
          venueId: venueBySlug[home.venue].id,
          kickoffAt,
          round: `Matchday ${round + 1}`,
          status: 'FINISHED',
          homeScore,
          awayScore,
        },
      });
      matchCount++;
      for (const side of [homeSlug, awaySlug]) {
        for (const player of playersByTeam[side]) {
          await db.matchParticipant.create({
            data: { matchId: match.id, playerId: player.id, teamId: teamBySlug[side].id, shirtNumber: [1, 4, 8, 11, 9, 10][playersByTeam[side].indexOf(player)], source: 'SEASON_REGISTRATION', confirmed: playersByTeam[side].indexOf(player) < 5 },
          });
        }
      }
      const goalEvents = [
        ...Array.from({ length: homeScore }, (_, n) => ({ slug: homeSlug, second: 420 + n * 1040 + (round % 7) * 30 })),
        ...Array.from({ length: awayScore }, (_, n) => ({ slug: awaySlug, second: 720 + n * 990 + (index % 5) * 45 })),
      ];
      for (let g = 0; g < goalEvents.length; g++) {
        const event = goalEvents[g];
        const scorer = playersByTeam[event.slug][4 + (g % 2)];
        await db.matchFact.create({
          data: {
            id: `${prefix}-fact-${match.id}-goal-${g}`,
            matchId: match.id,
            factType: 'GOAL',
            subjectId: scorer.id,
            matchSecond: event.second,
            value: { teamId: teamBySlug[event.slug].id, playerId: scorer.id, scoringMethod: g % 4 === 0 ? 'HEADER' : g % 3 === 0 ? 'LEFT_FOOT' : 'RIGHT_FOOT', distanceMeters: 6 + ((g + round + index) % 18), isPenalty: g % 17 === 0 },
            confidence: 0.86,
            sourceCount: 2,
            publishedAt: new Date(),
          },
        });
        factCount++;
        if (g % 2 === 0) {
          const assister = playersByTeam[event.slug][2 + (g % 2)];
          await db.matchFact.create({
            data: { id: `${prefix}-fact-${match.id}-assist-${g}`, matchId: match.id, factType: 'ASSIST', subjectId: assister.id, matchSecond: Math.max(0, event.second - 8), value: { teamId: teamBySlug[event.slug].id, playerId: assister.id }, confidence: 0.8, sourceCount: 2, publishedAt: new Date() },
          });
          factCount++;
        }
      }
      for (const [cardIndex, side] of [homeSlug, awaySlug].entries()) {
        if ((round + index + cardIndex) % 3 === 0) {
          const booked = playersByTeam[side][1 + ((round + index) % 4)];
          await db.matchFact.create({
            data: { id: `${prefix}-fact-${match.id}-yellow-${cardIndex}`, matchId: match.id, factType: 'YELLOW_CARD', subjectId: booked.id, matchSecond: 2100 + cardIndex * 900, value: { teamId: teamBySlug[side].id, playerId: booked.id, reason: 'tactical-foul' }, confidence: 0.78, sourceCount: 2, publishedAt: new Date() },
          });
          factCount++;
        }
      }
    }
  }

  const upcoming = [
    ['caps-united', 'ngezi-platinum', '2026-07-11T13:00:00Z', 'Matchday 22'],
    ['fc-platinum', 'highlanders', '2026-07-11T13:00:00Z', 'Matchday 22'],
    ['mwos-fc', 'dynamos-fc', '2026-07-12T13:00:00Z', 'Matchday 22'],
    ['herentals-fc', 'scottland-fc', '2026-07-12T13:00:00Z', 'Matchday 22'],
    ['simba-bhora', 'hardrock-fc', '2026-07-13T13:00:00Z', 'Matchday 22'],
  ];
  for (const [homeSlug, awaySlug, kickoffAt, round] of upcoming) {
    await db.match.create({
      data: {
        id: `${prefix}-fixture-${homeSlug}-${awaySlug}`,
        seasonId: season.id,
        homeTeamId: teamBySlug[homeSlug].id,
        awayTeamId: teamBySlug[awaySlug].id,
        venueId: venueBySlug[teams.find(team => team.slug === homeSlug).venue].id,
        kickoffAt: date(kickoffAt),
        round,
        status: 'SCHEDULED',
      },
    });
  }

  const contributorData = [
    ['psl-data-harare', 'Harare Match Centre', 'COLLECTOR', 'Harare', ['Live events', 'Lineups', 'Possession intervals']],
    ['psl-data-bulawayo', 'Bulawayo Data Desk', 'COLLECTOR', 'Bulawayo', ['Cards', 'Substitutions', 'Player actions']],
    ['psl-review-desk', 'TechnSports Review Desk', 'REVIEWER', 'National', ['Verification', 'Conflict resolution']],
  ];
  const liveMatch = `${prefix}-fixture-caps-united-ngezi-platinum`;
  for (let i = 0; i < contributorData.length; i++) {
    const [username, displayName, role, province, specialties] = contributorData[i];
    const user = await db.user.create({ data: { id: `${prefix}-user-${username}`, email: `${username}@technsports.co.zw`, username, displayName, role, emailVerifiedAt: new Date(), reputation: 70 + i * 8 } });
    await db.contributorProfile.create({ data: { userId: user.id, publicSlug: username, bio: `${displayName} profile seeded for the 2026 Zimbabwe PSL demo workflow.`, coverageProvince: province, specialties, publicVisible: true, verifiedAt: new Date() } });
    await db.assignment.create({ data: { id: `${prefix}-assignment-${username}`, matchId: liveMatch, userId: user.id, scope: i === 1 ? 'PLAYER_ACTIONS' : 'TIMELINE', acceptedAt: new Date() } });
  }

  const transferPlayers = [
    playersByTeam['caps-united'][4],
    playersByTeam['highlanders'][4],
    playersByTeam['fc-platinum'][2],
    playersByTeam['simba-bhora'][5],
  ];
  const transferRows = [
    [transferPlayers[0], 'caps-united', 'highlanders', 'PERMANENT', '2026-07-02T09:00:00Z'],
    [transferPlayers[1], 'highlanders', 'scottland-fc', 'LOAN', '2026-07-04T09:00:00Z'],
    [transferPlayers[2], 'fc-platinum', 'ngezi-platinum', 'FREE_AGENT', '2026-07-06T09:00:00Z'],
    [transferPlayers[3], 'simba-bhora', 'mwos-fc', 'PERMANENT', '2026-07-07T09:00:00Z'],
  ];
  for (let i = 0; i < transferRows.length; i++) {
    const [player, from, to, type, announcedAt] = transferRows[i];
    await db.transfer.create({
      data: {
        id: `${prefix}-transfer-${i + 1}`,
        playerId: player.id,
        fromTeamId: teamBySlug[from].id,
        toTeamId: teamBySlug[to].id,
        type,
        announcedAt: date(announcedAt),
        effectiveAt: date('2026-07-15T00:00:00Z'),
        verified: true,
        feeDisclosed: false,
        sourceUrl: 'https://www.sofascore.com/football/tournament/zimbabwe/premier-soccer-league/11033',
      },
    });
  }

  const articles = [
    ['psl-2026-title-race', 'Scottland set the pace in the 2026 PSL title race', 'A data-led overview of the leading pack after the winter matchdays.', 'ANALYSIS'],
    ['psl-2026-fixture-watch', 'Fixture watch: CAPS United host Ngezi Platinum', 'The upcoming round puts top-six momentum and away records under the microscope.', 'FIXTURES'],
    ['psl-2026-transfer-window', 'Transfer notebook: verified mid-season moves', 'TechnSports tracks verified movement across the Zimbabwe Premier Soccer League window.', 'TRANSFERS'],
    ['psl-2026-data-methodology', 'How TechnSports separates verified facts from crowd reports', 'A short guide to consensus scoring, contributor roles and match event verification.', 'DATA'],
  ];
  for (const [slug, title, excerpt, category] of articles) {
    await db.article.create({
      data: {
        id: `${prefix}-article-${slug}`,
        slug,
        title,
        excerpt,
        category,
        authorName: 'TechnSports Data Desk',
        body: { format: 'plain_text', text: `${excerpt}\n\nThis production demo article is generated from the seeded 2026 Zimbabwe PSL dataset and is intended to showcase the platform workflow while live collection coverage is being built.` },
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
  }

  console.log(`Seeded ${teams.length} teams, ${Object.values(playersByTeam).flat().length} players, ${matchCount + upcoming.length} matches, ${factCount} verified facts for ${competition.name} ${season.label}.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => db.$disconnect());
