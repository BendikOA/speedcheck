export interface TournamentPokemon {
  id:      string;
  name:    string;
  item:    string | null;
  ability: string | null;
  tera:    string | null;
  moves:   string[];
}

export interface TournamentTeam {
  placement: number;
  player:    string;
  country:   string | null;
  pokemon:   TournamentPokemon[];
}

export interface RecentTournament {
  id:      string;
  name:    string;
  date:    string;
  format:  string;
  players: number;
  teams:   TournamentTeam[];
}

export interface RecentTeamsData {
  updated:     string;
  source:      string;
  game:        string;
  format:      string;
  tournaments: RecentTournament[];
}
