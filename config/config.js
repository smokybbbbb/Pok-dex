const CONFIG = {
  api: {
    base:    'https://pokeapi.co/api/v2',
    sprites: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon',
  },
  pagination: {
    perPage: 40,
  },
  scroll: {
    goTopThreshold:  400,    // px from top to show go-top button
    scrollDuration:  600,    // max ms for scroll-to-top animation
    scrollFactor:    0.35,   // duration = min(max, scrollY * factor)
    sentinelMargin: '200px', // IntersectionObserver rootMargin
  },
  typeColors: {
    normal:   '#A8A77A',
    fire:     '#EE8130',
    water:    '#6390F0',
    electric: '#F7D02C',
    grass:    '#7AC74C',
    ice:      '#96D9D6',
    fighting: '#C22E28',
    poison:   '#A33EA1',
    ground:   '#E2BF65',
    flying:   '#A98FF3',
    psychic:  '#F95587',
    bug:      '#A6B91A',
    rock:     '#B6A136',
    ghost:    '#735797',
    dragon:   '#6F35FC',
    dark:     '#705746',
    steel:    '#B7B7CE',
    fairy:    '#D685AD',
  },
  statLabels: {
    hp:               'HP',
    attack:           'Atk',
    defense:          'Def',
    'special-attack': 'SpAtk',
    'special-defense':'SpDef',
    speed:            'Speed',
  },
};
