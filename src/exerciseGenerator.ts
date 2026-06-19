import { ExercisePractice, ExerciseShadow, ExerciseReverse } from './types';

export const verbsDB: Record<string, { v1: string; v2: string; v3: string }> = {
  go: { v1: 'go', v2: 'went', v3: 'gone' },
  play: { v1: 'play', v2: 'played', v3: 'played' },
  eat: { v1: 'eat', v2: 'ate', v3: 'eaten' },
  sleep: { v1: 'sleep', v2: 'slept', v3: 'slept' },
  buy: { v1: 'buy', v2: 'bought', v3: 'bought' },
  watch: { v1: 'watch', v2: 'watched', v3: 'watched' },
  study: { v1: 'study', v2: 'studied', v3: 'studied' },
  read: { v1: 'read', v2: 'read', v3: 'read' },
  travel: { v1: 'travel', v2: 'travelled', v3: 'travelled' },
  work: { v1: 'work', v2: 'worked', v3: 'worked' },
  write: { v1: 'write', v2: 'wrote', v3: 'written' },
  visit: { v1: 'visit', v2: 'visited', v3: 'visited' },
  drink: { v1: 'drink', v2: 'drank', v3: 'drunk' },
  find: { v1: 'find', v2: 'found', v3: 'found' },
  lose: { v1: 'lose', v2: 'lost', v3: 'lost' },
  meet: { v1: 'meet', v2: 'met', v3: 'met' },
  cook: { v1: 'cook', v2: 'cooked', v3: 'cooked' },
  drive: { v1: 'drive', v2: 'drove', v3: 'driven' },
  draw: { v1: 'draw', v2: 'drew', v3: 'drawn' },
  clean: { v1: 'clean', v2: 'cleaned', v3: 'cleaned' },
  wash: { v1: 'wash', v2: 'washed', v3: 'washed' },
  practice: { v1: 'practice', v2: 'practiced', v3: 'practiced' },
  sing: { v1: 'sing', v2: 'sang', v3: 'sung' },
  pack: { v1: 'pack', v2: 'packed', v3: 'packed' },
  prepare: { v1: 'prepare', v2: 'prepared', v3: 'prepared' }
};

export function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function generateAllExercises() {
  const subjects = [
    { s: 'I', q: 'you', bePast: 'was' },
    { s: 'He', q: 'he', bePast: 'was' }, 
    { s: 'She', q: 'she', bePast: 'was' },
    { s: 'They', q: 'they', bePast: 'were' }, 
    { s: 'We', q: 'we', bePast: 'were' },
    { s: 'You', q: 'you', bePast: 'were' },
    { s: 'The children', q: 'the children', bePast: 'were' },
    { s: 'My sister', q: 'your sister', bePast: 'was' },
    { s: 'Our team', q: 'your team', bePast: 'was' },
    { s: 'The students', q: 'the students', bePast: 'were' }
  ];

  const pastActions = [
    { v: 'go', comp: 'to Paris last December', wh: 'Where' },
    { v: 'play', comp: 'the piano yesterday evening', wh: 'What' },
    { v: 'eat', comp: 'a delicious burger for lunch', wh: 'What' },
    { v: 'buy', comp: 'a new car last week', wh: 'What' },
    { v: 'travel', comp: 'to London last year', wh: 'Where' },
    { v: 'write', comp: 'an email to the client', wh: 'What' },
    { v: 'visit', comp: 'the beautiful museum on Sunday', wh: 'What' },
    { v: 'drink', comp: 'a hot cup of tea', wh: 'What' },
    { v: 'find', comp: 'some lost keys in the office', wh: 'What' },
    { v: 'meet', comp: 'the new teacher at school', wh: 'Who' }
  ];

  const continuousActions = [
    { v: 'sleep', comp: 'soundly in the bed', wh: 'Where' },
    { v: 'watch', comp: 'the football match last night', wh: 'What' },
    { v: 'cook', comp: 'a great dinner in the kitchen', wh: 'What' },
    { v: 'clean', comp: 'the dirty house yesterday morning', wh: 'What' },
    { v: 'practice', comp: 'the guitar after class', wh: 'What' },
    { v: 'study', comp: 'French for two hours', wh: 'What' },
    { v: 'read', comp: 'the daily newspaper', wh: 'What' },
    { v: 'draw', comp: 'a funny comic character', wh: 'What' },
    { v: 'wash', comp: 'their dirty clothes yesterday', wh: 'What' },
    { v: 'prepare', comp: 'the lunch when the guests came', wh: 'What' }
  ];

  interface CoordinatedTriple {
    pct: ExercisePractice;
    sdw: ExerciseShadow;
    rvs: ExerciseReverse;
  }

  const listSimplePast: CoordinatedTriple[] = [];
  const listContinuous: CoordinatedTriple[] = [];

  // Generate Simple Past (10 subjects x 10 pastActions = 100 options)
  subjects.forEach(sub => {
    pastActions.forEach(act => {
      const verbObj = verbsDB[act.v];
      if (verbObj) {
        let opts = shuffle([verbObj.v1, verbObj.v2, verbObj.v3, act.v + 'ed']);
        if (!opts.includes(verbObj.v2)) {
          opts[0] = verbObj.v2;
        }
        opts = shuffle(opts);

        const practiceItem: ExercisePractice = {
          type: 'Simple Past',
          q: `${sub.s} ___ (${act.v}) ${act.comp}.`,
          ans: verbObj.v2,
          options: opts.slice(0, 4),
          verbBase: act.v
        };

        const shadowItem: ExerciseShadow = {
          text: `${sub.s} ${verbObj.v2} ${act.comp}.`,
          verbBase: act.v
        };

        const reverseItem: ExerciseReverse = {
          statement: `${sub.s} ${verbObj.v2} ${act.comp}.`,
          targetQ: `${act.wh} did ${sub.q} ${act.v}?`,
          wh: act.wh,
          verbBase: act.v
        };

        listSimplePast.push({ pct: practiceItem, sdw: shadowItem, rvs: reverseItem });
      }
    });

    // Generate Past Continuous (10 subjects x 10 continuousActions = 100 options)
    continuousActions.forEach(act => {
      const verbObj = verbsDB[act.v];
      if (verbObj) {
        const correctAns = `${sub.bePast} ${act.v}ing`;
        let opts = shuffle([correctAns, `was ${act.v}ing`, `were ${act.v}ing`, verbObj.v1]);
        if (!opts.includes(correctAns)) {
          opts[0] = correctAns;
        }
        opts = shuffle(opts);

        const practiceItem: ExercisePractice = {
          type: 'Past Continuous',
          q: `${sub.s} ___ (${act.v}) ${act.comp}.`,
          ans: correctAns,
          options: opts.slice(0, 4),
          verbBase: act.v
        };

        const shadowItem: ExerciseShadow = {
          text: `${sub.s} ${sub.bePast} ${act.v}ing ${act.comp}.`,
          verbBase: act.v
        };

        const qBe = (sub.q === 'you' || sub.q === 'they' || sub.q === 'we' || sub.q === 'the students' || sub.q === 'the players') ? 'were' : 'was';
        const reverseItem: ExerciseReverse = {
          statement: `${sub.s} ${sub.bePast} ${act.v}ing ${act.comp}.`,
          targetQ: `${act.wh} ${qBe} ${sub.q} ${act.v}ing?`,
          wh: act.wh,
          verbBase: act.v
        };

        listContinuous.push({ pct: practiceItem, sdw: shadowItem, rvs: reverseItem });
      }
    });
  });

  // Shuffle both sections separately, take exactly 50 of each
  const shuffledPast = shuffle(listSimplePast).slice(0, 50);
  const shuffledCont = shuffle(listContinuous).slice(0, 50);

  // Combine to create exactly 100 coordinated exercises
  const combined = shuffle([...shuffledPast, ...shuffledCont]);

  const practice: ExercisePractice[] = [];
  const shadow: ExerciseShadow[] = [];
  const reverse: ExerciseReverse[] = [];

  combined.forEach(item => {
    practice.push(item.pct);
    shadow.push(item.sdw);
    reverse.push(item.rvs);
  });

  return { practice, shadow, reverse };
}
