// World Cup 2026 — 48 teams across 12 groups (A–L), with notable players
// used for the Top Scorer pick. Codes are ISO 3166-1 alpha-2 (for flag emoji).
export type TeamSeed = {
  name: string;
  code: string;
  group: string;
  players: string[];
};

export const TEAMS: TeamSeed[] = [
  // Group A
  { name: "Mexico", code: "MX", group: "A", players: ["Santiago Giménez", "Raúl Jiménez", "Hirving Lozano"] },
  { name: "Canada", code: "CA", group: "A", players: ["Jonathan David", "Alphonso Davies", "Cyle Larin"] },
  { name: "Croatia", code: "HR", group: "A", players: ["Andrej Kramarić", "Bruno Petković", "Luka Modrić"] },
  { name: "Ecuador", code: "EC", group: "A", players: ["Enner Valencia", "Kendry Páez", "Moisés Caicedo"] },
  // Group B
  { name: "United States", code: "US", group: "B", players: ["Christian Pulisic", "Folarin Balogun", "Ricardo Pepi"] },
  { name: "Wales", code: "GB", group: "B", players: ["Harry Wilson", "Brennan Johnson", "Kieffer Moore"] },
  { name: "Senegal", code: "SN", group: "B", players: ["Sadio Mané", "Nicolas Jackson", "Ismaïla Sarr"] },
  { name: "Japan", code: "JP", group: "B", players: ["Takefusa Kubo", "Kaoru Mitoma", "Ayase Ueda"] },
  // Group C
  { name: "Argentina", code: "AR", group: "C", players: ["Lionel Messi", "Julián Álvarez", "Lautaro Martínez"] },
  { name: "Poland", code: "PL", group: "C", players: ["Robert Lewandowski", "Piotr Zieliński", "Krzysztof Piątek"] },
  { name: "Morocco", code: "MA", group: "C", players: ["Youssef En-Nesyri", "Hakim Ziyech", "Brahim Díaz"] },
  { name: "Saudi Arabia", code: "SA", group: "C", players: ["Salem Al-Dawsari", "Firas Al-Buraikan", "Saleh Al-Shehri"] },
  // Group D
  { name: "France", code: "FR", group: "D", players: ["Kylian Mbappé", "Antoine Griezmann", "Ousmane Dembélé"] },
  { name: "Denmark", code: "DK", group: "D", players: ["Rasmus Højlund", "Christian Eriksen", "Jonas Wind"] },
  { name: "Nigeria", code: "NG", group: "D", players: ["Victor Osimhen", "Ademola Lookman", "Samuel Chukwueze"] },
  { name: "Australia", code: "AU", group: "D", players: ["Mathew Leckie", "Jackson Irvine", "Mitchell Duke"] },
  // Group E
  { name: "Spain", code: "ES", group: "E", players: ["Lamine Yamal", "Álvaro Morata", "Nico Williams"] },
  { name: "Sweden", code: "SE", group: "E", players: ["Alexander Isak", "Viktor Gyökeres", "Dejan Kulusevski"] },
  { name: "Egypt", code: "EG", group: "E", players: ["Mohamed Salah", "Omar Marmoush", "Mostafa Mohamed"] },
  { name: "South Korea", code: "KR", group: "E", players: ["Son Heung-min", "Hwang Hee-chan", "Lee Kang-in"] },
  // Group F
  { name: "Brazil", code: "BR", group: "F", players: ["Vinícius Júnior", "Rodrygo", "Endrick"] },
  { name: "Switzerland", code: "CH", group: "F", players: ["Breel Embolo", "Granit Xhaka", "Dan Ndoye"] },
  { name: "Ghana", code: "GH", group: "F", players: ["Mohammed Kudus", "Iñaki Williams", "Antoine Semenyo"] },
  { name: "Qatar", code: "QA", group: "F", players: ["Akram Afif", "Almoez Ali", "Hassan Al-Haydos"] },
  // Group G
  { name: "England", code: "GB", group: "G", players: ["Harry Kane", "Jude Bellingham", "Bukayo Saka"] },
  { name: "Netherlands", code: "NL", group: "G", players: ["Cody Gakpo", "Memphis Depay", "Xavi Simons"] },
  { name: "Iran", code: "IR", group: "G", players: ["Mehdi Taremi", "Sardar Azmoun", "Alireza Jahanbakhsh"] },
  { name: "Uruguay", code: "UY", group: "G", players: ["Darwin Núñez", "Federico Valverde", "Facundo Pellistri"] },
  // Group H
  { name: "Portugal", code: "PT", group: "H", players: ["Cristiano Ronaldo", "Bruno Fernandes", "Rafael Leão"] },
  { name: "Belgium", code: "BE", group: "H", players: ["Romelu Lukaku", "Kevin De Bruyne", "Jérémy Doku"] },
  { name: "Tunisia", code: "TN", group: "H", players: ["Wahbi Khazri", "Youssef Msakni", "Hannibal Mejbri"] },
  { name: "Costa Rica", code: "CR", group: "H", players: ["Joel Campbell", "Manfred Ugalde", "Anthony Contreras"] },
  // Group I
  { name: "Germany", code: "DE", group: "I", players: ["Florian Wirtz", "Jamal Musiala", "Kai Havertz"] },
  { name: "Colombia", code: "CO", group: "I", players: ["Luis Díaz", "James Rodríguez", "Jhon Durán"] },
  { name: "Cameroon", code: "CM", group: "I", players: ["Vincent Aboubakar", "Bryan Mbeumo", "Karl Toko Ekambi"] },
  { name: "New Zealand", code: "NZ", group: "I", players: ["Chris Wood", "Ben Waine", "Kosta Barbarouses"] },
  // Group J
  { name: "Italy", code: "IT", group: "J", players: ["Federico Chiesa", "Gianluca Scamacca", "Mateo Retegui"] },
  { name: "Austria", code: "AT", group: "J", players: ["Marko Arnautović", "Christoph Baumgartner", "Michael Gregoritsch"] },
  { name: "Algeria", code: "DZ", group: "J", players: ["Riyad Mahrez", "Islam Slimani", "Baghdad Bounedjah"] },
  { name: "Panama", code: "PA", group: "J", players: ["Ismael Díaz", "José Fajardo", "Cecilio Waterman"] },
  // Group K
  { name: "Bolivia", code: "BO", group: "K", players: ["Marcelo Moreno Martins", "Carmelo Algarañaz", "Henry Vaca"] },
  { name: "Norway", code: "NO", group: "K", players: ["Erling Haaland", "Martin Ødegaard", "Alexander Sørloth"] },
  { name: "Ivory Coast", code: "CI", group: "K", players: ["Sébastien Haller", "Simon Adingra", "Franck Kessié"] },
  { name: "Paraguay", code: "PY", group: "K", players: ["Miguel Almirón", "Antonio Sanabria", "Julio Enciso"] },
  // Group L
  { name: "Turkey", code: "TR", group: "L", players: ["Arda Güler", "Kenan Yıldız", "Hakan Çalhanoğlu"] },
  { name: "Serbia", code: "RS", group: "L", players: ["Aleksandar Mitrović", "Dušan Vlahović", "Dušan Tadić"] },
  { name: "Peru", code: "PE", group: "L", players: ["Gianluca Lapadula", "Paolo Guerrero", "André Carrillo"] },
  { name: "Jamaica", code: "JM", group: "L", players: ["Michail Antonio", "Leon Bailey", "Demarai Gray"] },
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
