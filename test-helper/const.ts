export const SELECTION = {
  Left: {
    left: {}
  },
  Right: {
    right: {}
  }
}

export type Selection = (typeof SELECTION)[keyof typeof SELECTION]
