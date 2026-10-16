export type Fact = { id: string; title: string; body: string };

export const FACTS: Fact[] = [
  {
    id: "sessile",
    title: "Stuck on purpose",
    body: "An oyster cements its left shell to a rock, or to another oyster, while it is still a tiny larva called spat. After that it never moves. Sessile means fixed in one place. Food, danger, and dirty water all have to come to you.",
  },
  {
    id: "filter",
    title: "The daily filter",
    body: "A grown oyster pumps water across its gills and strains out plankton. One healthy adult can clear about 30 to 50 gallons a day. A whole reef of them can make cloudy water clearer. In this game, time is sped up, but the tradeoff is the real one: open to eat, shut to survive.",
  },
  {
    id: "nacre",
    title: "How a pearl starts",
    body: "The inside of the shell is nacre: paper-thin layers of calcium carbonate and protein. If grit gets inside, the oyster coats it with the same material. That coat is a pearl. In the wild this can take years. Here, a season is a few breaths long.",
  },
  {
    id: "sex",
    title: "Male, and then not",
    body: "Many oysters are protandrous hermaphrodites. They often spawn first as males, then become female as they grow. A larger body can pour more eggs into the water than a small one, so the switch pays off later in life.",
  },
  {
    id: "tide",
    title: "Low tide, closed tight",
    body: "At low tide an oyster may sit in the air for hours. It clamps shut, stops filtering, and lives on stored energy with very little oxygen. That works until the sun is hot, or until too many closed tides empty the reserves.",
  },
  {
    id: "predators",
    title: "What wants you open",
    body: "Mud crabs chip and pry at the lip. Ochre stars pull with tube feet, slowly. Gulls stab whatever is soft at low tide. Closing is the whole defense against them. Some real predators, like the oyster drill snail, can bore a shut shell. This game leaves that one out so the choice stays readable: open, or shut.",
  },
  {
    id: "pollution",
    title: "You are what you filter",
    body: "Silt can smother gills. Street runoff, oil, and some algal blooms poison a reef, and an open oyster takes that water straight across its body. Shutting is a short shield, not a cure. Whatever you filter is what you are made of.",
  },
  {
    id: "spawn",
    title: "Millions, then a few",
    body: "Eastern oysters are broadcast spawners. Males release sperm and females release eggs into the water on a cue like a spring tide. Fertilization happens outside the body. Almost every larva is eaten. The rare one that settles cements itself and starts this life over.",
  },
  {
    id: "reef",
    title: "What a reef does",
    body: "Oysters are ecosystem engineers. Piled shells soften waves, hold mud in place, and give crabs, fish, and worms a place to live. When a spawn actually settles nearby, the reef gets a little bigger. Most larvae drift much farther than the rock you are stuck to.",
  },
];

export function pearlTitle(mm: number) {
  if (mm < 0.4) return "Grit";
  if (mm < 1.5) return "Seed";
  if (mm < 3.5) return "Pea";
  if (mm < 6) return "Marble";
  if (mm < 9) return "Keeper";
  return "Moon";
}

export type EpitaphInput = {
  age: number;
  year: number;
  season: string;
  pearl: number;
  pearlTitle: string;
  gallons: number;
  eggSpawns: number;
  miltSpawns: number;
  female: boolean;
  cause: string;
};

const LESSONS: Record<string, { title: string; lesson: string }> = {
  crab: {
    title: "Pried open",
    lesson: "Crabs work the lip of the shell. A shut oyster gives them nothing to pull.",
  },
  star: {
    title: "Wrapped by a star",
    lesson: "Sea stars are slow, but their tube feet can force a shell that is even a little open.",
  },
  gull: {
    title: "Found at low tide",
    lesson: "Once the water drops, birds can reach the soft body. The shell only helps if it is closed.",
  },
  dry: {
    title: "Sun-dried on the rock",
    lesson: "Out of water, an open oyster loses moisture fast. Heat turns a low tide into a real threat.",
  },
  starve: {
    title: "The pantry ran out",
    lesson: "Shut, an oyster lives on stored fuel. Stay closed through too many tides and there is nothing left to burn.",
  },
  runoff: {
    title: "The water came in dirty",
    lesson: "You filter whatever the tide brings. Runoff crosses the gills only if the shell is open.",
  },
  hand: {
    title: "Harvested",
    lesson: "A glinting pearl shows a diver where you are. In the dark of a closed shell, you are another rock.",
  },
  old: {
    title: "A long life on the reef",
    lesson: "Shells tire with age. Old oysters still eat the same way. They just survive fewer mistakes.",
  },
};

export function epitaph(h: EpitaphInput) {
  const known = LESSONS[h.cause] ?? {
    title: "The reef keeps the shell",
    lesson: "Something on the tide finished the job. Open was food. Shut was survival.",
  };
  const spawns = h.eggSpawns + h.miltSpawns;
  const sex =
    h.female
      ? "You began as a male and later became female, the way many oysters do."
      : "You were still male. Given more time, a lot of oysters switch and start releasing eggs.";
  const spawnLine =
    spawns === 0
      ? "You never spawned."
      : h.eggSpawns > 0
        ? `You released milt ${h.miltSpawns === 1 ? "once" : `${h.miltSpawns} times`} and eggs ${h.eggSpawns === 1 ? "once" : `${h.eggSpawns} times`}.`
        : `You released milt ${h.miltSpawns === 1 ? "once" : `${h.miltSpawns} times`}, still as a male.`;
  return {
    title: known.title,
    lesson: known.lesson,
    detail: `Year ${h.year}, ${h.season.toLowerCase()}. ${sex} ${spawnLine}`,
  };
}

export const SEASON_LINES = [
  "Spring. The water is rich, and spawn tides come with it.",
  "Summer. Watch the low tide. Heat dries an open shell fast.",
  "Autumn. Plenty of plankton, and plenty of silt.",
  "Winter. Food thins out. You spend less, but you cannot nap forever.",
];
