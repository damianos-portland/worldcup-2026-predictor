// World Cup 2026 — 48 teams across 12 groups (A–L), with notable players
// used for the Top Scorer pick. Codes are ISO 3166-1 alpha-2 (for flag emoji).
export type TeamSeed = {
  name: string;
  code: string;
  group: string;
  players: string[];
};

// Official final draw (5 December 2025). All 48 qualified teams in their real groups.
export const TEAMS: TeamSeed[] = [
  // Group A
  { name: "Mexico", code: "MX", group: "A", players: ["Santiago Giménez", "Raúl Jiménez", "Alexis Vega"] },
  { name: "South Korea", code: "KR", group: "A", players: ["Son Heung-min", "Lee Kang-in", "Hwang Hee-chan"] },
  { name: "South Africa", code: "ZA", group: "A", players: ["Lyle Foster", "Oswin Appollis", "Evidence Makgopa"] },
  { name: "Czechia", code: "CZ", group: "A", players: ["Patrik Schick", "Adam Hložek", "Tomáš Souček"] },
  // Group B
  { name: "Canada", code: "CA", group: "B", players: ["Jonathan David", "Alphonso Davies", "Cyle Larin"] },
  { name: "Switzerland", code: "CH", group: "B", players: ["Breel Embolo", "Granit Xhaka", "Dan Ndoye"] },
  { name: "Qatar", code: "QA", group: "B", players: ["Akram Afif", "Almoez Ali", "Hassan Al-Haydos"] },
  { name: "Bosnia and Herzegovina", code: "BA", group: "B", players: ["Edin Džeko", "Ermedin Demirović", "Samed Baždar"] },
  // Group C
  { name: "Brazil", code: "BR", group: "C", players: ["Vinícius Júnior", "Rodrygo", "Raphinha"] },
  { name: "Morocco", code: "MA", group: "C", players: ["Achraf Hakimi", "Youssef En-Nesyri", "Brahim Díaz"] },
  { name: "Scotland", code: "SCO", group: "C", players: ["Scott McTominay", "Che Adams", "John McGinn"] },
  { name: "Haiti", code: "HT", group: "C", players: ["Duckens Nazon", "Wilson Isidor", "Frantzdy Pierrot"] },
  // Group D
  { name: "United States", code: "US", group: "D", players: ["Christian Pulisic", "Folarin Balogun", "Ricardo Pepi"] },
  { name: "Paraguay", code: "PY", group: "D", players: ["Miguel Almirón", "Antonio Sanabria", "Julio Enciso"] },
  { name: "Australia", code: "AU", group: "D", players: ["Mathew Leckie", "Jackson Irvine", "Mitchell Duke"] },
  { name: "Turkey", code: "TR", group: "D", players: ["Arda Güler", "Kenan Yıldız", "Hakan Çalhanoğlu"] },
  // Group E
  { name: "Germany", code: "DE", group: "E", players: ["Florian Wirtz", "Jamal Musiala", "Kai Havertz"] },
  { name: "Ecuador", code: "EC", group: "E", players: ["Enner Valencia", "Kendry Páez", "Kevin Rodríguez"] },
  { name: "Ivory Coast", code: "CI", group: "E", players: ["Sébastien Haller", "Simon Adingra", "Franck Kessié"] },
  { name: "Curaçao", code: "CW", group: "E", players: ["Leandro Bacuna", "Tahith Chong", "Jürgen Locadia"] },
  // Group F
  { name: "Netherlands", code: "NL", group: "F", players: ["Cody Gakpo", "Memphis Depay", "Xavi Simons"] },
  { name: "Japan", code: "JP", group: "F", players: ["Takefusa Kubo", "Kaoru Mitoma", "Ayase Ueda"] },
  { name: "Tunisia", code: "TN", group: "F", players: ["Hannibal Mejbri", "Elias Achouri", "Firas Chaouat"] },
  { name: "Sweden", code: "SE", group: "F", players: ["Alexander Isak", "Viktor Gyökeres", "Dejan Kulusevski"] },
  // Group G
  { name: "Belgium", code: "BE", group: "G", players: ["Romelu Lukaku", "Kevin De Bruyne", "Jérémy Doku"] },
  { name: "Egypt", code: "EG", group: "G", players: ["Mohamed Salah", "Omar Marmoush", "Trezeguet"] },
  { name: "Iran", code: "IR", group: "G", players: ["Mehdi Taremi", "Sardar Azmoun", "Alireza Jahanbakhsh"] },
  { name: "New Zealand", code: "NZ", group: "G", players: ["Chris Wood", "Ben Waine", "Kosta Barbarouses"] },
  // Group H
  { name: "Spain", code: "ES", group: "H", players: ["Lamine Yamal", "Nico Williams", "Álvaro Morata"] },
  { name: "Uruguay", code: "UY", group: "H", players: ["Darwin Núñez", "Federico Valverde", "Facundo Pellistri"] },
  { name: "Saudi Arabia", code: "SA", group: "H", players: ["Salem Al-Dawsari", "Firas Al-Buraikan", "Saleh Al-Shehri"] },
  { name: "Cape Verde", code: "CV", group: "H", players: ["Ryan Mendes", "Dailon Livramento", "Garry Rodrigues"] },
  // Group I
  { name: "France", code: "FR", group: "I", players: ["Kylian Mbappé", "Ousmane Dembélé", "Michael Olise"] },
  { name: "Senegal", code: "SN", group: "I", players: ["Sadio Mané", "Nicolas Jackson", "Ismaïla Sarr"] },
  { name: "Norway", code: "NO", group: "I", players: ["Erling Haaland", "Martin Ødegaard", "Alexander Sørloth"] },
  { name: "Iraq", code: "IQ", group: "I", players: ["Aymen Hussein", "Ali Al-Hamadi", "Mohanad Ali"] },
  // Group J
  { name: "Argentina", code: "AR", group: "J", players: ["Lionel Messi", "Julián Álvarez", "Lautaro Martínez"] },
  { name: "Austria", code: "AT", group: "J", players: ["Marko Arnautović", "Michael Gregoritsch", "Christoph Baumgartner"] },
  { name: "Algeria", code: "DZ", group: "J", players: ["Riyad Mahrez", "Mohamed Amoura", "Amine Gouiri"] },
  { name: "Jordan", code: "JO", group: "J", players: ["Mousa Al-Tamari", "Yazan Al-Naimat", "Ali Olwan"] },
  // Group K
  { name: "Portugal", code: "PT", group: "K", players: ["Cristiano Ronaldo", "Bruno Fernandes", "Rafael Leão"] },
  { name: "Colombia", code: "CO", group: "K", players: ["Luis Díaz", "James Rodríguez", "Jhon Durán"] },
  { name: "Uzbekistan", code: "UZ", group: "K", players: ["Eldor Shomurodov", "Abbosbek Fayzullaev", "Igor Sergeev"] },
  { name: "DR Congo", code: "CD", group: "K", players: ["Yoane Wissa", "Cédric Bakambu", "Fiston Mayele"] },
  // Group L
  { name: "England", code: "ENG", group: "L", players: ["Harry Kane", "Jude Bellingham", "Bukayo Saka"] },
  { name: "Croatia", code: "HR", group: "L", players: ["Andrej Kramarić", "Luka Modrić", "Ante Budimir"] },
  { name: "Panama", code: "PA", group: "L", players: ["Ismael Díaz", "José Fajardo", "Cecilio Waterman"] },
  { name: "Ghana", code: "GH", group: "L", players: ["Mohammed Kudus", "Iñaki Williams", "Antoine Semenyo"] },
];

export const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

// Round-robin pattern for a 4-team group (indices into the group's team list)
export const ROUND_ROBIN: [number, number][][] = [
  [
    [0, 1],
    [2, 3],
  ],
  [
    [0, 2],
    [3, 1],
  ],
  [
    [3, 0],
    [1, 2],
  ],
];

// Knockout rounds with the number of matches in each
export const KNOCKOUT_ROUNDS: { round: string; count: number; baseDay: number }[] = [
  { round: "ROUND_OF_32", count: 16, baseDay: 28 }, // late June
  { round: "ROUND_OF_16", count: 8, baseDay: 34 },
  { round: "QUARTER_FINAL", count: 4, baseDay: 40 },
  { round: "SEMI_FINAL", count: 2, baseDay: 45 },
  { round: "THIRD_PLACE", count: 1, baseDay: 48 },
  { round: "FINAL", count: 1, baseDay: 49 },
];
