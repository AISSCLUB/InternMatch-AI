export const motionTokens = {
  // Perceptual Durations (ms)
  durations: {
    instant: 50,
    fast: 150,
    normal: 250,
    reveal: 320,
    scoreRing: 850,
    pulse: 1800,
    loaderRotation: 2400,
  },

  // Stagger Sequencing (ms)
  stagger: {
    fast: 40,
    normal: 60,
    slow: 80,
  },

  // Spring Physics Configurations (Critically Damped / Apple-style)
  spring: {
    press: {
      damping: 20,
      stiffness: 300,
      mass: 0.8,
    },
    selection: {
      damping: 18,
      stiffness: 260,
      mass: 0.8,
    },
    status: {
      damping: 15,
      stiffness: 220,
      mass: 0.9,
    },
    reveal: {
      damping: 20,
      stiffness: 220,
      mass: 0.9,
    },
    hero: {
      damping: 22,
      stiffness: 180,
      mass: 1.0,
    },
  },

  // Restrained Scale Tokens (No extreme scales < 0.94)
  scales: {
    buttonPressed: 0.98,
    cardPressed: 0.985,
    chipPressed: 0.97,
    iconPressed: 0.94,
    tabSelected: 1.06,
    orbSettleStart: 0.96,
  },

  // Opacity Tokens
  opacities: {
    pressed: 0.88,
    subtlePressed: 0.94,
    inactive: 0.6,
    pulseLow: 0.55,
    pulseHigh: 1.0,
  },
};

export default motionTokens;
