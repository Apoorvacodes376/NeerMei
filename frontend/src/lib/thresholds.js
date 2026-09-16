export const THRESHOLDS = {
  pre: {
    label: 'Purifiable',
    ranges: {
      pH: [6, 8.5],
      turbidity: [1, 5],
      TDS: [0, 2000],
    },
  },
  post: {
    label: 'Safe',
    ranges: {
      pH: [6, 8.5],
      turbidity: [0, 1],
      TDS: [0, 500],
    },
  },
}

export function analyzeReading(stage, sensorValues = {}) {
  const definition = THRESHOLDS[stage]
  const outOfRange = Object.entries(definition.ranges)
    .filter(([parameter, [min, max]]) => {
      const value = Number(sensorValues[parameter])
      return !Number.isFinite(value) || value < min || value > max
    })
    .map(([parameter]) => parameter)

  return {
    prediction: outOfRange.length === 0 ? definition.label : `Not ${definition.label}`,
    isWithinRange: outOfRange.length === 0,
    outOfRange,
    ranges: definition.ranges,
  }
}

export function formatRange([min, max]) {
  return `${min}–${max}`
}
